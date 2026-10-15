import { AppFormRef } from "@/components/Form/AppForm/AppForm";
import {
  ProductCategory,
  ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { parseQuantity } from "@/utils/format";
import { useGlobalSearchParams } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState, 
} from "react";
import { toLocalDateString } from "@/utils/dates";

type unitType = "mass" | "volume" | "quantity";
type GroupedUnits = Record<unitType, Unit[]>;

interface SelectedProduct {
  id: string | number;
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
  package_id?: number;
  detail_id?: number; // ID del detalle en el backend
  /**
   * Otros renglones del mismo producto en el servidor (el borrador se editó
   * desde dos lugares). Al quitar el producto se borran todos.
   */
  extra_detail_ids?: number[];
}

type SelectedProducts = Record<number | string, SelectedProduct>;

type ItemAction = "increment" | "decrement" | "unit" | "set";

interface ConfirmPurchaseData {
  expected_delivery_date?: string;
  supplier_id?: string;
  purchase_date?: string;
  document_number?: string;
  payment_method?: string;
  paid_from_cash?: boolean;
}

interface PurchaseContextType {
  // Data
  products: ProductListItem[];
  units: Unit[];
  categories: ProductCategory[];
  groupedUnits: GroupedUnits;
  loading: boolean;
  selectedProducts: SelectedProducts;
  cartItems: any[]; // CartItemData[]
  currentPurchaseId: number | null;
  supplierId: number | null;

  // Actions
  loadData: (supplierId?: number | string | null) => Promise<void>;
  handleAddProduct: (product: ProductListItem, unitId: number) => void;
  handleRemoveProduct: (productId: number | string) => void;
  handleItemChange: (
    productId: number | string,
    action: ItemAction,
    data?: any,
  ) => void;
  clearCart: () => void;
  setSupplier: (supplierId: number | null) => void;
  /**
   * Manda los cambios pendientes, verifica que el servidor tenga exactamente
   * lo que muestra el carrito y confirma. Devuelve false si ya había una
   * confirmación en curso; lanza un Error con el motivo si no se pudo.
   */
  confirmPurchase: (data?: ConfirmPurchaseData) => Promise<boolean>;
  /** Ref del formulario de la compra: el contexto lo llena con el borrador. */
  formRef: React.RefObject<AppFormRef<{}> | null>;
  /**
   * Encabezado del borrador ya cargado (proveedor, fecha, forma de pago), o
   * null. Si el borrador cargó antes de montar el formulario (se entró por
   * productos), el formulario arranca con estos valores.
   */
  getDraftHeader: () => Record<string, any> | null;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(
  undefined,
);

/* ───────────────────── Carrito del borrador (sin React) ───────────────────── */

/** Cambios de un renglón que todavía no se mandan al servidor. */
type DetailUpdate = { quantity?: number; unit_id?: number; price?: number };

/** Lo que el carrito usa de una compra, venga de getDraft() o de show(). */
interface DraftData {
  id: number;
  status?: string;
  supplier_id: number | null;
  purchase_date: string | null;
  notes: string | null;
  document_number: string | null;
  payment_method: string | null;
  paid_from_cash: boolean | null;
  details: any[];
}

/** Lo que el carrito usa de Services.purchasesV2 (se inyecta para probarlo). */
type PurchaseDraftApi = Pick<
  typeof Services.purchasesV2,
  "addDetail" | "updateDetail" | "removeDetail" | "getDraft" | "show" | "confirm"
>;

interface PurchaseCartDeps {
  api: PurchaseDraftApi;
  alerts: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
  };
  /** Publican el estado para que React lo pinte. */
  onLinesChange: (lines: SelectedProducts) => void;
  onPurchaseIdChange: (id: number | null) => void;
  onSupplierIdChange: (id: number | null) => void;
  /** Espera antes de mandar el cambio de un renglón (ms). */
  updateDelay?: number;
}

/** Motivo que manda el backend; nunca el texto en inglés de axios. */
function apiMessage(error: any, fallback: string): string {
  if (error?.isAxiosError && !error.response) {
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  const data = error?.response?.data;
  if (data?.errors) {
    const fieldError = Object.values(data.errors).flat()[0];
    if (typeof fieldError === "string" && fieldError) return fieldError;
  }
  if (data?.message && data?.error && data.error !== data.message) {
    return `${data.message}: ${data.error}`;
  }
  return (
    data?.message ||
    data?.error ||
    (!error?.response && error?.message) ||
    fallback
  );
}

function toDraftData(raw: any): DraftData | null {
  if (!raw?.id) return null;
  return {
    id: Number(raw.id),
    status: raw.status,
    supplier_id: raw.supplier_id != null ? Number(raw.supplier_id) : null,
    purchase_date:
      typeof raw.purchase_date === "string"
        ? raw.purchase_date.slice(0, 10)
        : null,
    notes: raw.notes ?? null,
    document_number: raw.document_number ?? null,
    payment_method: raw.payment_method ?? null,
    paid_from_cash: raw.paid_from_cash ?? null,
    details: Array.isArray(raw.details) ? raw.details : [],
  };
}

/** Último borrador de la sucursal (lo que abre "Nueva compra"). */
async function fetchLatestDraft(api: PurchaseDraftApi) {
  const response = await api.getDraft();
  return toDraftData(response?.data);
}

/**
 * Una compra por id. show() pide purchases_read; si falla, sirve getDraft()
 * (purchases_list) cuando el borrador pedido es el más reciente.
 */
async function fetchPurchaseById(api: PurchaseDraftApi, id: number) {
  try {
    const response = await api.show(id);
    return toDraftData(response?.data?.data);
  } catch (error) {
    const latest = await fetchLatestDraft(api).catch(() => null);
    if (latest?.id === id) return latest;
    throw error;
  }
}

/** Renglones del carrito a partir de los detalles del servidor: uno por producto o paquete. */
function linesFromDetails(details: any[]): {
  lines: SelectedProducts;
  duplicated: string[];
} {
  const lines: SelectedProducts = {};
  const duplicated: string[] = [];

  details.forEach((detail) => {
    const key = detail.package_id
      ? `package_${detail.package_id}`
      : `product_${detail.product_id}`;
    const existing = lines[key];

    if (existing) {
      existing.extra_detail_ids = [
        ...(existing.extra_detail_ids ?? []),
        Number(detail.id),
      ];
      const name =
        detail.product_name ?? detail.product?.name ?? `#${detail.product_id}`;
      if (!duplicated.includes(name)) duplicated.push(name);
      return;
    }

    lines[key] = {
      id: key,
      product_id: Number(detail.product_id),
      package_id: detail.package_id ? Number(detail.package_id) : undefined,
      quantity: parseFloat(detail.quantity) || 0,
      unit_id: Number(detail.unit_id),
      price: parseFloat(detail.unit_price) || 0,
      detail_id: Number(detail.id),
    };
  });

  return { lines, duplicated };
}

/**
 * ¿El carrito es exactamente lo que guardó el servidor? El precio se compara
 * a centavos (la columna redondea a 2 decimales) y la cantidad a milésimas.
 */
function cartMatches(local: SelectedProducts, server: SelectedProducts): boolean {
  const keys = Object.keys(local);
  if (keys.length !== Object.keys(server).length) return false;

  return keys.every((key) => {
    const mine = local[key];
    const saved = server[key];
    return (
      !!saved &&
      !saved.extra_detail_ids?.length &&
      mine.detail_id === saved.detail_id &&
      Number(mine.unit_id) === Number(saved.unit_id) &&
      Math.abs(mine.quantity - saved.quantity) < 0.0005 &&
      Math.abs(mine.price - saved.price) < 0.0051
    );
  });
}

const roundQuantity = (n: number) => Math.round(n * 1000) / 1000;

const withoutPeriod = (text: string) => text.replace(/\.\s*$/, "");

/**
 * Carrito del borrador de compra. Vive fuera de React para que los handlers
 * siempre trabajen con el carrito actual (antes calculaban sobre el de un
 * render viejo y la UI y el servidor quedaban distintos) y se pueda probar sin
 * pantalla.
 *
 * - Cada renglón espera `updateDelay` ms antes de mandarse y acumula sus
 *   cambios. Antes había UN solo temporizador para todos: escribir 50 en un
 *   producto y tocar + en otro antes de medio segundo dejaba 1 en el servidor.
 * - Las llamadas salen en fila, en el orden en que el usuario hizo los cambios.
 * - Si un cambio falla se recarga lo guardado y se avisa.
 * - Antes de confirmar se manda todo lo pendiente y se compara el carrito con
 *   el servidor: se confirma exactamente lo que se ve.
 */
export function createPurchaseCart(deps: PurchaseCartDeps) {
  const delay = deps.updateDelay ?? 500;

  let lines: SelectedProducts = {};
  let purchaseId: number | null = null;
  let supplierId: number | null = null;
  let products: ProductListItem[] = [];
  // Encabezado del borrador cargado (proveedor, fecha, forma de pago).
  let header: Record<string, any> | null = null;

  const pending = new Map<
    number,
    { timer: ReturnType<typeof setTimeout> | null; data: DetailUpdate }
  >();
  let queue: Promise<unknown> = Promise.resolve();
  // Sube cada vez que el carrito se recarga del servidor: los cambios que
  // esperaban en la fila desde antes ya no aplican.
  let generation = 0;
  // Hubo un cambio que no se guardó desde la última confirmación.
  let failed = false;
  let confirming = false;
  const adding = new Set<string>();
  const removing = new Set<string>();

  const setLines = (next: SelectedProducts) => {
    lines = next;
    deps.onLinesChange(next);
  };

  const setPurchaseId = (id: number | null) => {
    purchaseId = id;
    deps.onPurchaseIdChange(id);
  };

  const setSupplier = (id: number | null) => {
    supplierId = id;
    deps.onSupplierIdChange(id);
  };

  const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    queue = run.catch(() => undefined);
    return run;
  };

  const cancelAllPending = () => {
    pending.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer);
    });
    pending.clear();
  };

  const applyLines = (draft: DraftData): string[] => {
    const { lines: next, duplicated } = linesFromDetails(draft.details);
    setPurchaseId(draft.id);
    setSupplier(draft.supplier_id);
    setLines(next);
    return duplicated;
  };

  /** Muestra lo que tiene el servidor y descarta lo que no se alcanzó a mandar. */
  const reload = async () => {
    generation++;
    cancelAllPending();
    if (!purchaseId) return;
    try {
      const draft = await fetchPurchaseById(deps.api, purchaseId);
      if (draft) applyLines(draft);
    } catch (error) {
      console.error("Error recargando la compra:", error);
    }
  };

  const sendUpdate = (detailId: number): Promise<boolean> => {
    const entry = pending.get(detailId);
    if (!entry) return Promise.resolve(true);
    if (entry.timer) clearTimeout(entry.timer);
    pending.delete(detailId);

    const gen = generation;
    return enqueue(async () => {
      if (gen !== generation) return true;
      try {
        await deps.api.updateDetail(detailId, entry.data);
        return true;
      } catch (error) {
        console.error("Error actualizando detalle:", error);
        failed = true;
        deps.alerts.error(
          `${withoutPeriod(apiMessage(error, "No se pudo guardar el cambio"))}. Se cargó lo guardado en la compra: revisa las cantidades.`,
        );
        await reload();
        return false;
      }
    });
  };

  const scheduleUpdate = (detailId: number, data: DetailUpdate) => {
    const entry = pending.get(detailId) ?? { timer: null, data: {} };
    if (entry.timer) clearTimeout(entry.timer);
    entry.data = { ...entry.data, ...data };
    entry.timer = setTimeout(() => {
      void sendUpdate(detailId);
    }, delay);
    pending.set(detailId, entry);
  };

  /** Manda ya lo pendiente y espera la fila. false si algo no se guardó. */
  const flush = async (): Promise<boolean> => {
    Array.from(pending.keys()).forEach((detailId) => {
      void sendUpdate(detailId);
    });
    let tail: Promise<unknown>;
    do {
      tail = queue;
      await tail;
    } while (tail !== queue);

    const ok = !failed;
    failed = false;
    return ok;
  };

  const removeProduct = async (productId: number | string) => {
    const key = String(productId);
    const line = lines[key];
    if (!line) return;

    if (!line.detail_id) {
      const { [key]: _removed, ...rest } = lines;
      setLines(rest);
      return;
    }

    if (removing.has(key)) return;
    removing.add(key);

    const detailIds = [line.detail_id, ...(line.extra_detail_ids ?? [])];
    // Lo pendiente del renglón sale antes que el borrado: si el borrado
    // falla, el servidor queda con lo que muestra la pantalla.
    detailIds.forEach((detailId) => {
      void sendUpdate(detailId);
    });

    let removed = 0;
    try {
      for (const detailId of detailIds) {
        await enqueue(() => deps.api.removeDetail(detailId));
        removed++;
      }
      const { [key]: _removed, ...rest } = lines;
      setLines(rest);
      deps.alerts.success("Producto eliminado");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      deps.alerts.error(apiMessage(error, "No se pudo quitar el producto"));
      // Con renglones repetidos pudo borrarse una parte: mostrar lo que quedó.
      if (removed > 0) await reload();
    } finally {
      removing.delete(key);
    }
  };

  const changeItem = (
    productId: number | string,
    action: ItemAction,
    data?: any,
  ) => {
    const key = String(productId);
    const current = lines[key];
    if (!current) return;

    let update: DetailUpdate;

    switch (action) {
      case "increment":
        update = { quantity: roundQuantity(current.quantity + 1) };
        break;

      case "decrement":
        if (current.quantity <= 1) {
          void removeProduct(key);
          return;
        }
        update = { quantity: roundQuantity(current.quantity - 1) };
        break;

      case "set": {
        // El carrito ya decide si la unidad admite decimales (kg, L): aquí
        // sólo se descarta lo que no es una cantidad positiva.
        const qty =
          typeof data === "number" ? data : parseQuantity(String(data ?? ""));
        if (qty === null || !Number.isFinite(qty) || qty <= 0) return;
        update = { quantity: qty };
        break;
      }

      case "unit": {
        const unitId =
          typeof data === "number" ? data : Number((data as Unit)?.id);
        if (!unitId) return;

        // Buscar el producto y la unidad para calcular el nuevo precio
        const product = products.find((p) => p.id.toString() === key);
        const newUnit = product?.available_units?.find((u) => u.id === unitId);
        const basePrice = parseFloat(product?.price?.toString() || "0") || 0;
        const factor = Number(newUnit?.factor_to_base) || 0;

        // Calcular precio según la nueva unidad
        const price = newUnit?.is_base_unit || !factor ? basePrice : basePrice * factor;
        update = { unit_id: unitId, price };
        break;
      }

      default:
        return;
    }

    setLines({ ...lines, [key]: { ...current, ...update } });

    // Actualizar en backend: cada renglón con su propia espera
    if (current.detail_id) {
      scheduleUpdate(current.detail_id, update);
    }
  };

  const addProduct = async (product: ProductListItem, unitId: number) => {
    const key = String(product.id);

    // Ya está en el carrito (escáner, doble toque): se suma uno, como con +.
    // Antes se creaba otro renglón del mismo producto en el servidor.
    if (lines[key]) {
      changeItem(key, "increment");
      return;
    }
    if (adding.has(key)) return;

    const defaultUnit = product.available_units?.[0];
    if (!defaultUnit && !product.is_package) return;

    const selectedUnit =
      product.available_units?.find((u) => u.id === unitId) || defaultUnit;
    const basePrice = parseFloat(product.price.toString());
    const factor = Number(selectedUnit?.factor_to_base) || 0;

    // Calcular precio según la unidad seleccionada
    const calculatedPrice =
      selectedUnit?.is_base_unit || !factor ? basePrice : basePrice * factor;

    // Determinar product_id y package_id según si es paquete o producto base
    let productId: number;
    let packageId: number | undefined;

    if (product.is_package) {
      // Para paquetes: product_id es base_product_id, package_id es el ID del paquete
      productId = Number(product.base_product_id);
      packageId = product.package_id;
    } else {
      // Para productos base: product_id es el ID del producto, package_id es undefined
      productId = parseInt(key.replace(/^product_/, ""), 10);
      packageId = undefined;
    }

    // La misma unidad que se guarda en el servidor (en paquetes, la del
    // producto base); si no, el carrito y el servidor no coincidirían.
    const lineUnitId = product.is_package
      ? product.unit_id
      : unitId || defaultUnit?.id || 0;

    adding.add(key);
    try {
      const response: any = await enqueue(() =>
        deps.api.addDetail({
          purchase_id: purchaseId || undefined,
          supplier_id: supplierId || undefined,
          product_id: productId,
          package_id: packageId,
          quantity: 1,
          unit_id: lineUnitId,
          price: calculatedPrice,
        }),
      );

      if (response?.success) {
        // El primer producto puede crear el borrador.
        if (!purchaseId && response.data?.purchase_id) {
          setPurchaseId(Number(response.data.purchase_id));
        }
        setLines({
          ...lines,
          [key]: {
            id: product.id,
            product_id: productId,
            quantity: 1,
            unit_id: lineUnitId,
            price: calculatedPrice,
            package_id: packageId,
            detail_id: Number(response.data.detail_id),
          },
        });
        deps.alerts.success("Producto agregado");
      }
    } catch (error) {
      console.error("Error agregando producto:", error);
      deps.alerts.error(apiMessage(error, "No se pudo agregar el producto"));
    } finally {
      adding.delete(key);
    }
  };

  /**
   * Carga la compra a editar (la de la ruta) o el último borrador de la
   * sucursal. Antes siempre se cargaba el último: "Editar" en un borrador
   * viejo mostraba los productos de otro y se confirmaba ese otro.
   * Devuelve el encabezado para llenar el formulario.
   */
  const loadDraft = async (
    routePurchaseId: number | null,
  ): Promise<{
    supplier_id: number | null;
    header: Record<string, any> | null;
  }> => {
    try {
      const draft = routePurchaseId
        ? await fetchPurchaseById(deps.api, routePurchaseId)
        : await fetchLatestDraft(deps.api);
      if (!draft) return { supplier_id: null, header: null };

      if (draft.status && draft.status !== "draft") {
        deps.alerts.warning(
          "Esta compra ya no está en borrador: sus productos ya no se pueden cambiar.",
        );
        return { supplier_id: null, header: null };
      }

      const duplicated = applyLines(draft);
      if (duplicated.length > 0) {
        deps.alerts.warning(
          `La compra tiene renglones repetidos de ${duplicated.join(", ")}: quita ese producto y vuelve a agregarlo antes de confirmar.`,
        );
      }

      header = {
        supplier_id: draft.supplier_id?.toString() || "",
        purchase_date: draft.purchase_date || toLocalDateString(),
        notes: draft.notes || "",
        document_number: draft.document_number || "",
        payment_method: draft.payment_method || "other",
        paid_from_cash: draft.paid_from_cash ?? true,
      };

      return { supplier_id: draft.supplier_id, header };
    } catch (error) {
      console.error("Error cargando draft:", error);
      if (routePurchaseId) {
        deps.alerts.error(apiMessage(error, "No se pudo cargar la compra"));
      }
      return { supplier_id: null, header: null };
    }
  };

  const clear = () => {
    generation++;
    cancelAllPending();
    setLines({});
    setPurchaseId(null);
    setSupplier(null);
  };

  const confirm = async (data?: ConfirmPurchaseData): Promise<boolean> => {
    if (confirming) return false;
    if (!purchaseId) {
      throw new Error("No hay compra para confirmar");
    }

    confirming = true;
    try {
      // 1. Todo lo que el usuario cambió llega al servidor antes de confirmar.
      if (!(await flush())) {
        throw new Error(
          "No se guardaron todos los cambios de la compra. Revisa las cantidades y vuelve a confirmar.",
        );
      }

      // 2. Se confirma exactamente lo que se ve. El servidor confirma los
      //    renglones que tiene guardados: si son otros (otro dispositivo, un
      //    error que no se vio), se carga lo guardado y no se confirma.
      const server = await fetchPurchaseById(deps.api, purchaseId);
      if (!server || (server.status && server.status !== "draft")) {
        throw new Error(
          "La compra ya no está en borrador: revisa su estado en la lista de compras.",
        );
      }

      const { lines: serverLines, duplicated } = linesFromDetails(
        server.details,
      );
      if (duplicated.length > 0 || !cartMatches(lines, serverLines)) {
        generation++;
        cancelAllPending();
        applyLines(server);
        throw new Error(
          duplicated.length > 0
            ? `La compra tiene renglones repetidos de ${duplicated.join(", ")}. Quita ese producto, vuelve a agregarlo y confirma de nuevo.`
            : "Lo guardado en la compra no coincidía con el carrito. Se cargó lo que tiene el servidor: revisa las cantidades y vuelve a confirmar.",
        );
      }

      await deps.api.confirm(purchaseId, data);
      clear();
      return true;
    } finally {
      confirming = false;
    }
  };

  /** Al salir de la compra: lo que esperaba su turno se manda ya. */
  const dispose = () => {
    Array.from(pending.keys()).forEach((detailId) => {
      void sendUpdate(detailId);
    });
  };

  return {
    loadDraft,
    addProduct,
    removeProduct,
    changeItem,
    confirm,
    flush,
    clear,
    dispose,
    setSupplier,
    getDraftHeader: () => header,
    setProducts: (next: ProductListItem[]) => {
      products = next;
    },
    getLines: () => lines,
  };
}

/* ─────────────────────────────── Provider ─────────────────────────────── */

interface PurchaseProviderProps {
  children: React.ReactNode;
}

export function PurchaseProvider({ children }: PurchaseProviderProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<GroupedUnits>(
    {} as GroupedUnits,
  );
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    {},
  );

  const formRef = useRef<AppFormRef<{}>>(null);

  const [currentPurchaseId, setCurrentPurchaseId] = useState<number | null>(
    null,
  );
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const alerts = useAlerts();

  // La compra que se abrió desde la lista ("Editar" → formv2?id=…). Se lee
  // una vez: al pasar a productos o al carrito la ruta ya no trae el id.
  const { id: routeId } = useGlobalSearchParams<{ id?: string }>();
  const [routePurchaseId] = useState<number | null>(() => {
    const parsed = parseInt(String(routeId ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const [cart] = useState(() =>
    createPurchaseCart({
      api: Services.purchasesV2,
      alerts,
      onLinesChange: setSelectedProducts,
      onPurchaseIdChange: setCurrentPurchaseId,
      onSupplierIdChange: setSupplierId,
    }),
  );

  useEffect(() => {
    fetchData();
    // Al salir de la compra no se pierden los cambios que esperaban turno.
    return () => cart.dispose();
  }, []);

  async function fetchData() {
    const res = await cart.loadDraft(routePurchaseId);

    // Cargar datos del formulario usando formRef (si todavía no se monta,
    // arranca con getDraftHeader()).
    if (res.header) {
      formRef.current?.setValues(res.header);
    }

    loadData(res.supplier_id);
  }

  const loadData = async (supplier_id?: number | string | null) => {
    const numericSupplierId =
      typeof supplier_id === "string" ? parseInt(supplier_id, 10) || null : supplier_id ?? null;

    try {
      setLoading(true);

      if (numericSupplierId) {
        cart.setSupplier(numericSupplierId);
      }

      // Cargar unidades y categorías siempre (no dependen del proveedor)
      const [unitsResponse, categoriesResponse] = await Promise.all([
        Services.home.unidades.getGroupedByType(),
        Services.categories.index(),
      ]);

      // Solo cargar productos si hay un proveedor seleccionado
      if (numericSupplierId) {
        const productsResponse = await Services.products.index({
          is_purchasable: 1,
          is_active: true,
          supplier_id: numericSupplierId,
        });

        if (
          productsResponse &&
          "data" in productsResponse &&
          productsResponse.data
        ) {
          const productsData = Array.isArray(productsResponse.data)
            ? productsResponse.data
            : (productsResponse.data as any).data || [];

          const products = productsData as App.Entities.Product[];
          const expandedProducts: ProductListItem[] = [];

          products.forEach((product: App.Entities.Product) => {
            const availableUnits = product.unit?.unit_type
              ? unitsResponse.data[product.unit.unit_type as unitType] || []
              : [];

            expandedProducts.push({
              price: parseFloat(product.purchase_price || "0").toFixed(2),
              unit_id: product.unit_id || 0,
              unit_type: product.unit?.unit_type || null,
              code: product.code || "",
              id: `product_${product.id}`,
              name: product.name,
              current_stock: product.current_stock || undefined,
              category_id: product.category_id || undefined,
              main_image: product.main_image,
              available_units: availableUnits,
              is_package: false,
            });

            product.active_packages?.forEach((pkg) => {
              expandedProducts.push({
                price: parseFloat(pkg.purchase_price || "0").toFixed(2),
                unit_id: product.unit?.id || 0,
                unit_type: product.unit?.unit_type || null,
                code: pkg.barcode,
                id: `package_${pkg.id}`,
                name: `${product.name} - ${pkg.package_name}`,
                current_stock: product.current_stock
                  ? Math.floor(product.current_stock / pkg.quantity_per_package)
                  : 0,
                category_id: product.category_id || undefined,
                main_image: product.main_image,
                package_id: pkg.id,
                base_product_id: product.id,
                quantity_per_package: pkg.quantity_per_package,
                is_package: true,
                available_units: [],
              });
            });
          });

          cart.setProducts(expandedProducts);
          setProducts(expandedProducts);
        }
      } else {
        cart.setProducts([]);
        setProducts([]);
      }

      if (
        categoriesResponse &&
        "data" in categoriesResponse &&
        categoriesResponse.data
      ) {
        const categoriesData = Array.isArray(categoriesResponse.data)
          ? categoriesResponse.data
          : (categoriesResponse.data as any).data || [];

        setCategories(
          categoriesData.map((cat: any) => ({ id: cat.id, name: cat.name })),
        );
      }

      if (unitsResponse.data) {
        setGroupedUnits(unitsResponse.data);
        setUnits(Object.values(unitsResponse.data).flat() as Unit[]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Convertir selectedProducts a formato de CartItemData con indexación optimizada
  const cartItems = useMemo(() => {
    // Crear un Map para búsquedas O(1)
    const productsMap = new Map(products.map((p) => [p.id.toString(), p]));

    return Object.entries(selectedProducts).map(([productId, item]) => {
      const product = productsMap.get(productId);
      const selectedUnit = product?.available_units?.find(
        (u) => u.id === item.unit_id,
      );

      return {
        // Usamos la llave de selectedProducts ("product_68" / "package_5"),
        // que es única por línea. Con item.product_id un producto base y su
        // paquete colisionaban (mismo product_id) → llave duplicada en React
        // y los handlers de quitar/editar (que indexan por esta llave) fallaban.
        id: productId,
        product_id: item.product_id,
        code: product?.code || "",
        name: product?.name || "",
        price: item.price,
        quantity: item.quantity,
        total: item.quantity * item.price,
        unit_id: item.unit_id,
        unit_name: selectedUnit?.name,
        unit_abbreviation: selectedUnit?.abbreviation,
        main_image: product?.main_image,
        available_units: product?.available_units?.map((u) => ({
          id: u.id,
          name: u.name,
          abbreviation: u.abbreviation,
          price: item.price,
        })),
      };
    });
  }, [selectedProducts, products]);

  const value = useMemo(
    () => ({
      products,
      units,
      categories,
      groupedUnits,
      loading,
      selectedProducts,
      cartItems,
      currentPurchaseId,
      supplierId,
      loadData,
      handleAddProduct: cart.addProduct,
      handleRemoveProduct: cart.removeProduct,
      handleItemChange: cart.changeItem,
      clearCart: cart.clear,
      setSupplier: cart.setSupplier,
      confirmPurchase: cart.confirm,
      formRef,
      getDraftHeader: cart.getDraftHeader,
    }),
    [
      products,
      units,
      categories,
      groupedUnits,
      loading,
      selectedProducts,
      cartItems,
      currentPurchaseId,
      supplierId,
    ],
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchase() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error("usePurchase must be used within a PurchaseProvider");
  }
  return context;
}
