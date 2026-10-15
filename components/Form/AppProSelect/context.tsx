import { useAuth } from "@/contexts/AuthContext";
import { onMutationSuccess } from "@/utils/axios";
import Services from "@/utils/services";
import { IndexParams } from "@/utils/services/crudService";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { subscribeSelectCache } from "./cacheBus";

// Definir los modelos disponibles basándose en la estructura de Services
type ServicePath =
  | "roles"
  | "users"
  | "admin.companies"
  | "products"
  | "products-raw-materials"
  | "categories"
  | "inventoryTypes"
  | "units"
  | "customers"
  | "suppliers"
  | "admin.locations"
  | "movements"
  | "purchaseOrders"
  | "salesOrders"
  | "admin.roles"
  | "admin.permissions"
  | "home.unidades"
  | "formulas"
  | "productionOrders";

// Interfaz para los datos cacheados
interface CachedData {
  data: any[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga exitosa; null = hay que (re)cargar. */
  lastFetch: number | null;
  /** Momento del último error, para reintentar después de un rato. */
  failedAt?: number | null;
  model?: ServicePath;
}

/**
 * Las opciones se vuelven a pedir pasado este tiempo (otro usuario pudo dar
 * de alta registros). Mientras se recargan se siguen mostrando las anteriores.
 */
export const SELECT_CACHE_TTL_MS = 5 * 60 * 1000;
/** Espera antes de reintentar un catálogo que falló al cargar. */
export const SELECT_CACHE_RETRY_MS = 30 * 1000;

/**
 * Altas/ediciones/bajas que vuelven obsoletas las opciones de un select.
 * Se compara contra la ruta de cada escritura exitosa hecha con axios.
 */
const MUTATION_INVALIDATES: [RegExp, ServicePath[]][] = [
  [/^\/auth\/admin\/products(\/|$)/, ["products", "products-raw-materials"]],
  [/^\/auth\/admin\/product-packages(\/|$)/, ["products", "products-raw-materials"]],
  [/^\/auth\/admin\/categories(\/|$)/, ["categories"]],
  [/^\/auth\/admin\/inventory-types(\/|$)/, ["inventoryTypes"]],
  [/^\/auth\/admin\/units(\/|$)/, ["units", "home.unidades"]],
  [/^\/auth\/admin\/customers(\/|$)/, ["customers"]],
  [/^\/auth\/admin\/suppliers(\/|$)/, ["suppliers"]],
  [/^\/auth\/admin\/users(\/|$)/, ["users"]],
  [/^\/auth\/admin\/companies(\/|$)/, ["admin.companies"]],
  [/^\/auth\/admin\/locations(\/|$)/, ["admin.locations"]],
  [/^\/auth\/admin\/roles(\/|$)/, ["roles", "admin.roles"]],
  [/^\/auth\/admin\/permissions(\/|$)/, ["admin.permissions"]],
  [/^\/auth\/admin\/formulas(\/|$)/, ["formulas"]],
  [/^\/auth\/admin\/production-orders(\/|$)/, ["productionOrders"]],
  [/^\/auth\/admin\/sales-orders(\/|$)/, ["salesOrders"]],
];

const modelsForMutation = (path: string): ServicePath[] => {
  const models = new Set<ServicePath>();
  for (const [pattern, affected] of MUTATION_INVALIDATES) {
    if (pattern.test(path)) affected.forEach((model) => models.add(model));
  }
  return Array.from(models);
};

const matchesModel = (entry: CachedData, models?: ServicePath[]) =>
  !models || (entry.model !== undefined && models.includes(entry.model));

const EMPTY_ENTRY: CachedData = {
  data: [],
  loading: false,
  error: null,
  lastFetch: null,
  failedAt: null,
};

// Interfaz para el contexto
interface SelectDataContextType {
  getCachedData: (model: ServicePath, params?: IndexParams) => CachedData;
  fetchData: (
    model: ServicePath,
    params?: IndexParams,
    force?: boolean
  ) => Promise<void>;
  clearCache: (model?: ServicePath) => void;
  /** Marca como vencidas las opciones (de un modelo o de todos) para recargarlas. */
  invalidate: (models?: ServicePath | ServicePath[]) => void;
  setDependentData: (
    parentModel: ServicePath,
    parentValue: any,
    childModel: ServicePath,
    data: any[]
  ) => void;
}

// Crear el contexto
const SelectDataContext = createContext<SelectDataContextType | null>(null);

// Provider del contexto
interface SelectDataProviderProps {
  children: React.ReactNode;
}

export function SelectDataProvider({ children }: SelectDataProviderProps) {
  const { user, selectedCompany, location } = useAuth();
  // Las opciones dependen del usuario, la empresa y la sucursal (el backend
  // filtra por los headers X-Company-ID / X-Location-ID). Van en la clave para
  // que al cambiar de empresa o de usuario nunca se muestren las anteriores.
  const scope = `${user?.id ?? "anon"}:${selectedCompany?.id ?? "none"}:${location?.id ?? "none"}`;

  const [cache, setCache] = useState<Record<string, CachedData>>({});
  // Copias en ref para leer el valor vigente desde callbacks asíncronos.
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const scopeRef = useRef(scope);
  // Se incrementa en cada invalidación: una carga que empezó antes llega con
  // datos que pueden ser viejos y no se marca como fresca.
  const generationRef = useRef(0);

  // Al cambiar de alcance se descartan las entradas de los anteriores. Las
  // del alcance nuevo (que los selects ya pudieron empezar a pedir) se quedan.
  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    generationRef.current += 1;
    setCache((prev) => {
      const next: Record<string, CachedData> = {};
      Object.keys(prev).forEach((key) => {
        if (key.startsWith(`${scope}|`)) next[key] = prev[key];
      });
      return next;
    });
  }, [scope]);

  // Función para generar la clave del cache
  const getCacheKey = useCallback(
    (model: ServicePath, params?: IndexParams): string => {
      if (!params || Object.keys(params).length === 0) {
        return `${scope}|${model}`;
      }
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
          result[key] = params[key as keyof IndexParams];
          return result;
        }, {} as any);
      return `${scope}|${model}:${JSON.stringify(sortedParams)}`;
    },
    [scope]
  );

  // Función para obtener el servicio basado en el path
  const getService = useCallback((model: ServicePath) => {
    const parts = model.split(".");
    let service = Services as any;

    for (const part of parts) {
      service = service[part];
      if (!service) {
        throw new Error(`Service not found for model: ${model}`);
      }
    }

    return service;
  }, []);

  // Función para obtener datos cacheados
  const getCachedData = useCallback(
    (model: ServicePath, params?: IndexParams): CachedData => {
      const cacheKey = getCacheKey(model, params);
      return cache[cacheKey] ?? EMPTY_ENTRY;
    },
    [cache, getCacheKey]
  );

  // Función para hacer fetch de datos
  const fetchData = useCallback(
    async (
      model: ServicePath,
      params?: IndexParams,
      force = false
    ): Promise<void> => {
      const cacheKey = getCacheKey(model, params);
      const existing = cacheRef.current[cacheKey];

      // Si ya está cargando, no repetir la petición.
      if (existing?.loading) {
        return;
      }

      // Si ya hay datos vigentes y no se fuerza, no hacer nada.
      if (!force && existing && existing.lastFetch) {
        return;
      }

      const requestScope = scope;
      const generation = generationRef.current;

      // Actualizar estado a loading. Se conservan los datos anteriores para
      // que el select siga usable mientras se recarga.
      const loadingEntry: CachedData = {
        ...EMPTY_ENTRY,
        ...existing,
        model,
        loading: true,
        error: null,
      };
      cacheRef.current = { ...cacheRef.current, [cacheKey]: loadingEntry };
      setCache((prev) => ({
        ...prev,
        [cacheKey]: { ...EMPTY_ENTRY, ...prev[cacheKey], model, loading: true, error: null },
      }));

      try {
        const service = getService(model);
        const fetchParams = { ...params, all: true }; // Obtener todos los registros para selects

        const response = await service.index(fetchParams);
        let data = response.data;

        // Si la respuesta es paginada, extraer el array de datos
        if (data && typeof data === "object" && "data" in data) {
          data = data.data;
        }

        // Asegurarse de que data sea un array
        if (!Array.isArray(data)) {
          data = [];
        }

        // Cambió el usuario/empresa/sucursal mientras se cargaba: descartar.
        if (scopeRef.current !== requestScope) return;

        const now = Date.now();
        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            data,
            loading: false,
            error: null,
            // Si hubo una invalidación durante la carga, queda como vencida
            // para que se vuelva a pedir.
            lastFetch: generation === generationRef.current ? now : null,
            failedAt: null,
            model,
          },
        }));
      } catch (error: any) {
        console.error(`Error fetching data for ${model}:`, error);

        if (scopeRef.current !== requestScope) return;

        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            data: prev[cacheKey]?.data ?? [],
            loading: false,
            error: error?.message || "Error loading data",
            lastFetch: null,
            failedAt: Date.now(),
            model,
          },
        }));
      }
    },
    [scope, getCacheKey, getService]
  );

  // Marca entradas como vencidas conservando sus datos (los selects montados
  // las vuelven a pedir y mientras tanto muestran las anteriores).
  const invalidate = useCallback((models?: ServicePath | ServicePath[]) => {
    const list =
      models === undefined ? undefined : Array.isArray(models) ? models : [models];
    generationRef.current += 1;
    setCache((prev) => {
      let changed = false;
      const next: Record<string, CachedData> = {};
      Object.keys(prev).forEach((key) => {
        const entry = prev[key];
        if (!matchesModel(entry, list)) {
          next[key] = entry;
          return;
        }
        changed = true;
        // Las que fallaron se borran para reintentar de inmediato.
        if (entry.error) return;
        next[key] = { ...entry, lastFetch: null };
      });
      return changed ? next : prev;
    });
  }, []);

  // Función para limpiar cache
  const clearCache = useCallback((model?: ServicePath) => {
    generationRef.current += 1;
    if (!model) {
      setCache({});
      return;
    }
    setCache((prev) => {
      const next: Record<string, CachedData> = {};
      Object.keys(prev).forEach((key) => {
        if (prev[key].model !== model) next[key] = prev[key];
      });
      return next;
    });
  }, []);

  // Limpieza/invalidación pedida desde fuera del árbol (AuthContext, pantallas).
  useEffect(
    () =>
      subscribeSelectCache((event) => {
        if (event.type === "clear") {
          clearCache();
        } else {
          invalidate(event.models);
        }
      }),
    [clearCache, invalidate]
  );

  // Toda alta/edición/baja exitosa de un catálogo vuelve a cargar los selects
  // de ese catálogo: el proveedor o la unidad recién creados aparecen sin
  // tener que recargar la app.
  useEffect(
    () =>
      onMutationSuccess(({ path }) => {
        const models = modelsForMutation(path);
        if (models.length > 0) invalidate(models);
      }),
    [invalidate]
  );

  // Función para establecer datos dependientes (para selects que dependen de otros)
  const setDependentData = useCallback(
    (
      parentModel: ServicePath,
      parentValue: any,
      childModel: ServicePath,
      data: any[]
    ) => {
      const cacheKey = getCacheKey(childModel, { [parentModel]: parentValue });
      const now = Date.now();

      setCache((prev) => ({
        ...prev,
        [cacheKey]: {
          data,
          loading: false,
          error: null,
          lastFetch: now,
          failedAt: null,
          model: childModel,
        },
      }));
    },
    [getCacheKey]
  );

  const value = useMemo<SelectDataContextType>(
    () => ({
      getCachedData,
      fetchData,
      clearCache,
      invalidate,
      setDependentData,
    }),
    [getCachedData, fetchData, clearCache, invalidate, setDependentData]
  );

  return (
    <SelectDataContext.Provider value={value}>
      {children}
    </SelectDataContext.Provider>
  );
}

// Hook para usar el contexto
export function useSelectData() {
  const context = useContext(SelectDataContext);

  if (!context) {
    throw new Error("useSelectData must be used within a SelectDataProvider");
  }

  return context;
}

export type { CachedData, ServicePath };
