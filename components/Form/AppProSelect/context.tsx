import Services from "@/utils/services";
import { IndexParams } from "@/utils/services/crudService";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

// Definir los modelos disponibles basándose en la estructura de Services
type ServicePath =
  | "roles"
  | "users"
  | "admin.companies"
  | "products"
  | "categories"
  | "units"
  | "customers"
  | "suppliers"
  | "admin.locations"
  | "movements"
  | "purchaseOrders"
  | "salesOrders"
  | "admin.roles"
  | "admin.permissions"
  | "admin.workers";

// Interfaz para los datos cacheados
interface CachedData {
  data: any[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// Interfaz para el contexto
interface SelectDataContextType {
  getCachedData: (model: ServicePath, params?: IndexParams) => CachedData;
  fetchData: (
    model: ServicePath,
    params?: IndexParams,
    force?: boolean
  ) => Promise<void>;
  clearCache: (model?: ServicePath) => void;
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
  children: ReactNode;
  cacheDuration?: number; // Duración del cache en milisegundos (default: 5 minutos)
}

export function SelectDataProvider({
  children,
  cacheDuration = 5 * 60 * 1000,
}: SelectDataProviderProps) {
  const [cache, setCache] = useState<Record<string, CachedData>>({});

  // Función para generar la clave del cache
  const getCacheKey = useCallback(
    (model: ServicePath, params?: IndexParams): string => {
      if (!params || Object.keys(params).length === 0) {
        return model;
      }
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((result, key) => {
          result[key] = params[key as keyof IndexParams];
          return result;
        }, {} as any);
      return `${model}:${JSON.stringify(sortedParams)}`;
    },
    []
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
  const getCachedData = (
    model: ServicePath,
    params?: IndexParams
  ): CachedData => {
    const cacheKey = getCacheKey(model, params);
    const cachedItem = cache[cacheKey];

    if (!cachedItem) {
      return {
        data: [],
        loading: false,
        error: null,
        lastFetch: null,
      };
    }

    // Verificar si el cache ha expirado
    const now = Date.now();
    const isExpired =
      cachedItem.lastFetch && now - cachedItem.lastFetch > cacheDuration;

    if (isExpired) {
      return {
        ...cachedItem,
        data: [],
        error: "Cache expired",
      };
    }

    return cachedItem;
  };

  // Función para hacer fetch de datos
  const fetchData = useCallback(
    async (
      model: ServicePath,
      params?: IndexParams,
      force = false
    ): Promise<void> => {
      const cacheKey = getCacheKey(model, params);
      const existing = cache[cacheKey];

      // Si ya está cargando y no es forzado, no hacer nada
      if (existing?.loading && !force) {
        return;
      }

      // Verificar si necesita hacer fetch
      const now = Date.now();
      const isExpired =
        !existing?.lastFetch || now - existing.lastFetch > cacheDuration;

      if (!force && existing && !isExpired) {
        return;
      }

      // Actualizar estado a loading
      setCache((prev) => ({
        ...prev,
        [cacheKey]: {
          ...prev[cacheKey],
          loading: true,
          error: null,
        },
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

        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            data,
            loading: false,
            error: null,
            lastFetch: now,
          },
        }));
      } catch (error: any) {
        console.error(`Error fetching data for ${model}:`, error);

        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            data: [],
            loading: false,
            error: error.message || "Error loading data",
            lastFetch: null,
          },
        }));
      }
    },
    [cache, getCacheKey, cacheDuration, getService]
  );

  // Función para limpiar cache
  const clearCache = useCallback(
    (model?: ServicePath) => {
      if (model) {
        const keysToDelete = Object.keys(cache).filter((key) =>
          key.startsWith(model)
        );
        setCache((prev) => {
          const newCache = { ...prev };
          keysToDelete.forEach((key) => delete newCache[key]);
          return newCache;
        });
      } else {
        setCache({});
      }
    },
    [cache]
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
        },
      }));
    },
    [getCacheKey]
  );

  const value: SelectDataContextType = {
    getCachedData,
    fetchData,
    clearCache,
    setDependentData,
  };

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

export type { ServicePath };
