import {
  CartItemData,
  ProductCategory,
  ProductListItem,
} from "@/components/Views/POSV3/components";
import { Unit } from "@/components/Views/POSV3/components/ListProducts";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { parseMoney, parseQuantity } from "@/utils/format";
import { amountToCents, centsToAmount, lineTotalCents, roundMoney } from "@/utils/money";
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
  /**
   * Cómo se ve el renglón cuando su producto no está en el catálogo cargado
   * (se cambió de proveedor o el borrador de Reabastecimiento no tiene
   * proveedor). Antes salía sin nombre. No se mandan al servidor.
   */
  name?: string;
  code?: string;
  unit_name?: string;
  unit_abbreviation?: string;
  main_image?: { uri: string };
}

type SelectedProducts = Record<number | string, SelectedProduct>;

/** "price": el precio unitario que de verdad se pagó (lo escribe el usuario). */
type ItemAction = "increment" | "decrement" | "unit" | "set" | "price";

export type PaymentMethod = "cash" | "card" | "transfer" | "other";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "transfer", "other"];

/**
 * Datos de la compra. Se mandan al confirmar: el borrador nace con el primer
 * producto, sin encabezado. Antes vivían en un formulario aparte (AppForm)
 * que el contexto llenaba por ref.
 */
export interface PurchaseHeader {
  /** YYYY-MM-DD */
  purchase_date: string;
  payment_method: PaymentMethod;
  /** Solo cuenta en efectivo: ¿el dinero salió de la caja? */
  paid_from_cash: boolean;
  notes: string;
  /** No se captura en la pantalla: al confirmar se conserva el del borrador. */
  document_number: string;
}

const newHeader = (): PurchaseHeader => ({
  purchase_date: toLocalDateString(),
  payment_method: "other",
  paid_from_cash: true,
  notes: "",
  document_number: "",
});

interface ConfirmPurchaseData {
  expected_delivery_date?: string;
  supplier_id?: number;
  purchase_date?: string;
  document_number?: string;
  payment_method?: string;
  paid_from_cash?: boolean;
  notes?: string;
  /**
   * La mercancía ya está aquí: la compra pasa a recibida en el mismo paso y
   * entra al inventario. Sin él queda pedida.
   */
  receive_now?: boolean;
}

/** Cómo quedó la compra al confirmarla. */
export interface ConfirmPurchaseResult {
  /** Quedó recibida: ya entró al inventario. */
  received: boolean;
  /** Se le mandó el pedido al proveedor por WhatsApp. */
  whatsappSent: boolean;
  /**
   * Se registró recibida y pagada de la caja, pero quien la registró no tiene
   * turno abierto: el egreso no entra en ningún corte.
   */
  cashOutOfShift: boolean;
}

/** Último error del carrito, para mostrarlo dentro de él. */
export interface CartNotice {
  text: string;
  tone: "error" | "warning";
}

interface PurchaseContextType {
  // Data
  /** Catálogo del proveedor elegido (vacío sin proveedor). */
  products: ProductListItem[];
  /** Las categorías que tiene ese catálogo. */
  categories: ProductCategory[];
  loading: boolean;
  /** El catálogo no se pudo cargar (la pantalla lo dice y ofrece reintentar). */
  catalogError: string | null;
  /** Ya se cargó la compra de la ruta (o el último borrador). */
  ready: boolean;
  selectedProducts: SelectedProducts;
  cartItems: CartItemData[];
  /** Suma de los importes, sumados en centavos como el servidor. */
  total: number;
  currentPurchaseId: number | null;
  /**
   * Folio del borrador que se abrió para seguirlo (PUR000026 o "Compra #26");
   * null en una compra nueva.
   */
  draftLabel: string | null;
  supplierId: number | null;
  /** Nombre del proveedor según el borrador (show() lo trae). */
  draftSupplierName: string | null;
  header: PurchaseHeader;
  notice: CartNotice | null;

  // Actions
  /** Cambia de proveedor: carga su catálogo y sus últimos precios. */
  selectSupplier: (supplierId: number | null) => void;
  reloadCatalog: () => void;
  updateHeader: (patch: Partial<PurchaseHeader>) => void;
  handleAddProduct: (product: ProductListItem, unitId: number) => void;
  handleRemoveProduct: (productId: number | string) => void;
  handleItemChange: (
    productId: number | string,
    action: ItemAction,
    data?: any,
  ) => void;
  dismissNotice: () => void;
  /**
   * Manda los cambios pendientes, verifica que el servidor tenga exactamente
   * lo que muestra el carrito y confirma (o registra recibida, con
   * receive_now). Devuelve null si ya había una confirmación en curso; lanza
   * un Error con el motivo si no se pudo.
   */
  confirmPurchase: (data?: ConfirmPurchaseData) => Promise<ConfirmPurchaseResult | null>;
  /**
   * ¿Puede cambiar cantidad, unidad o precio de un renglón guardado? (POST
   * purchases-v2/details/{id}/update pide purchases_update; agregar pide
   * purchases_create).
   */
  canEditLines: boolean;
  /** ¿Puede quitar renglones? (DELETE purchases-v2/details/{id}: purchases_delete). */
  canRemoveLines: boolean;
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
  purchase_number: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  purchase_date: string | null;
  notes: string | null;
  document_number: string | null;
  payment_method: string | null;
  paid_from_cash: boolean | null;
  details: any[];
}

/** El borrador que se abrió, ya listo para la pantalla. */
interface LoadedDraft {
  supplier_id: number | null;
  supplier_name: string | null;
  header: PurchaseHeader;
  /** Folio para el título. */
  label: string;
}

/** Lo que el carrito usa de Services.purchasesV2 (se inyecta para probarlo). */
type PurchaseDraftApi = Pick<
  typeof Services.purchasesV2,
  | "addDetail"
  | "updateDetail"
  | "removeDetail"
  | "getDraft"
  | "show"
  | "confirm"
  | "lastPrices"
>;

/** Último precio pagado de un producto o paquete (GET purchases-v2/last-prices). */
type LastPurchasePrice = Awaited<
  ReturnType<PurchaseDraftApi["lastPrices"]>
>["data"][number];

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
    purchase_number: raw.purchase_number ?? null,
    supplier_id: raw.supplier_id != null ? Number(raw.supplier_id) : null,
    supplier_name: raw.supplier_name ?? raw.supplier?.name ?? null,
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

/** Nombre, código y unidad de un renglón del servidor (show() los trae planos; getDraft(), en sus relaciones). */
function detailDisplay(detail: any): Partial<SelectedProduct> {
  const productName = detail.product_name ?? detail.product?.name;
  const packageName = detail.package_name ?? detail.package?.package_name;
  const image = detail.product_image ?? detail.product?.main_image;
  return {
    name: productName
      ? packageName
        ? `${productName} - ${packageName}`
        : productName
      : undefined,
    code:
      (detail.package_id ? detail.package?.barcode : undefined) ??
      detail.product_code ??
      detail.product?.code ??
      undefined,
    unit_name: detail.unit_name ?? detail.unit?.name ?? undefined,
    unit_abbreviation:
      detail.unit_abbreviation ?? detail.unit?.abbreviation ?? undefined,
    main_image: image?.uri ? { uri: image.uri } : undefined,
  };
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
      ...detailDisplay(detail),
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

/**
 * Precio por unidad sin el ruido de los flotantes (0.025 / 0.001 =
 * 25.000000000000004). Hasta 4 decimales, como se muestra debajo de $1.
 */
const roundUnitPrice = (n: number) => Math.round(n * 10000) / 10000;

const withoutPeriod = (text: string) => text.replace(/\.\s*$/, "");

const lastPriceKey = (productId: number, packageId?: number | null) =>
  `${productId}:${packageId ?? 0}`;

/** factor_to_base de la unidad, si es un número que sirve. */
function knownFactor(unit?: Unit): number | null {
  const factor = Number(unit?.factor_to_base);
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

/**
 * Un precio por `from` expresado por `to` ($120 la caja de 12 → $10 la pieza).
 * null si falta el factor de alguna de las dos.
 */
function convertUnitPrice(price: number, from?: Unit, to?: Unit): number | null {
  if (!from || !to) return null;
  if (from.id === to.id) return price;
  const fromFactor = knownFactor(from);
  const toFactor = knownFactor(to);
  if (!fromFactor || !toFactor) return null;
  return roundUnitPrice((price * toFactor) / fromFactor);
}

/**
 * Precio de compra del catálogo en la unidad elegida: el del producto (por su
 * unidad) × factor de la elegida ÷ factor de la del producto, como la tarjeta
 * del catálogo. Antes era precio × factor de la elegida, que solo sirve si la
 * unidad del producto es la base de su tipo: a un producto por docena, la
 * pieza se le ponía al precio de la docena. Un paquete tiene su propio precio.
 */
function catalogUnitPrice(product: ProductListItem | undefined, unit?: Unit): number {
  const basePrice = parseFloat(String(product?.price ?? "0")) || 0;
  if (!product || product.is_package || !unit) return basePrice;
  const productUnit = product.available_units?.find(
    (u) => u.id === product.unit_id,
  );
  if (!productUnit) {
    // Sin la unidad del producto en la lista: el cálculo de antes.
    const factor = knownFactor(unit);
    return unit.is_base_unit || !factor ? basePrice : roundUnitPrice(basePrice * factor);
  }
  return convertUnitPrice(basePrice, productUnit, unit) ?? basePrice;
}

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
 * - Un producto nuevo entra con lo último que se le pagó a ese proveedor (si
 *   nunca se le ha comprado, con el precio del catálogo). Antes siempre con el
 *   del catálogo: uno de $0 se compraba a $0 y los reportes valúan el
 *   inventario con el precio de la última compra.
 */
export function createPurchaseCart(deps: PurchaseCartDeps) {
  const delay = deps.updateDelay ?? 500;

  let lines: SelectedProducts = {};
  let purchaseId: number | null = null;
  let supplierId: number | null = null;
  let products: ProductListItem[] = [];
  // Último precio pagado al proveedor elegido, por producto y paquete, y de
  // qué proveedor son (undefined: todavía de ninguno).
  let lastPrices = new Map<string, LastPurchasePrice>();
  let pricesSupplierId: number | null | undefined;
  let pricesRequest = 0;

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

  /**
   * Últimos precios del proveedor. Si fallan no se avisa (silent): el
   * producto entra con el precio del catálogo, como antes.
   */
  const loadLastPrices = (id: number | null) => {
    if (id === pricesSupplierId) return;
    pricesSupplierId = id;
    lastPrices = new Map();
    const request = ++pricesRequest;
    if (!id) return;

    deps.api
      .lastPrices({ supplier_id: id }, { silent: true })
      .then((response) => {
        // Se eligió otro proveedor mientras llegaban.
        if (request !== pricesRequest) return;
        const next = new Map<string, LastPurchasePrice>();
        (Array.isArray(response?.data) ? response.data : []).forEach((row) => {
          const price = Number(row.unit_price);
          if (!Number.isFinite(price) || price <= 0) return;
          next.set(lastPriceKey(Number(row.product_id), row.package_id), {
            ...row,
            unit_id: Number(row.unit_id),
            unit_price: price,
          });
        });
        lastPrices = next;
      })
      .catch((error) => {
        console.error("No se pudieron cargar los últimos precios:", error);
      });
  };

  const setSupplier = (id: number | null) => {
    supplierId = id;
    deps.onSupplierIdChange(id);
    loadLastPrices(id);
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

  /**
   * Muestra los renglones del servidor. El proveedor no se toca: el que se
   * eligió en la pantalla se manda al confirmar (el borrador se queda con el
   * suyo hasta entonces).
   */
  const applyLines = (draft: DraftData): string[] => {
    const { lines: next, duplicated } = linesFromDetails(draft.details);
    setPurchaseId(draft.id);
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
          `${withoutPeriod(apiMessage(error, "No se pudo guardar el cambio"))}. Se cargó lo guardado en la compra: revisa las cantidades y los precios.`,
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
    // Cómo se ve el renglón (no va al servidor).
    let display: Partial<SelectedProduct> = {};

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

      case "price": {
        // Lo que de verdad se pagó por unidad. La columna guarda centavos:
        // se redondea igual que el servidor para que el carrito y la compra
        // digan lo mismo.
        const raw =
          typeof data === "number" ? data : parseMoney(String(data ?? ""));
        if (raw === null || !Number.isFinite(raw) || raw < 0) return;
        const price = roundMoney(raw);
        if (amountToCents(price) === amountToCents(current.price)) return;
        update = { price };
        break;
      }

      case "unit": {
        const unitId =
          typeof data === "number" ? data : Number((data as Unit)?.id);
        if (!unitId || unitId === Number(current.unit_id)) return;

        const product = products.find((p) => p.id.toString() === key);
        const newUnit = product?.available_units?.find((u) => u.id === unitId);
        const oldUnit = product?.available_units?.find(
          (u) => u.id === Number(current.unit_id),
        );

        // Se conserva el precio del renglón (el que escribió el usuario o el
        // último pagado), pasado a la unidad nueva: $120 la caja de 12 son
        // $10 la pieza. Antes se recalculaba con el precio del catálogo y se
        // perdía lo escrito. Sin los factores de las dos, el del catálogo.
        const price =
          convertUnitPrice(current.price, oldUnit, newUnit) ??
          (newUnit ? catalogUnitPrice(product, newUnit) : current.price);
        update = { unit_id: unitId, price };
        if (newUnit) {
          display = {
            unit_name: newUnit.name,
            unit_abbreviation: newUnit.abbreviation,
          };
        }
        break;
      }

      default:
        return;
    }

    setLines({ ...lines, [key]: { ...current, ...update, ...display } });

    // Actualizar en backend: cada renglón con su propia espera
    if (current.detail_id) {
      scheduleUpdate(current.detail_id, update);
    }
  };

  /**
   * Unidad y precio con que entra un producto: la unidad de la tarjeta (la
   * que se ve) y lo último que se le pagó a este proveedor, pasado a esa
   * unidad; si no se puede, el precio del catálogo. Antes, si la tarjeta
   * traía la unidad del producto, entraba en la de la última compra: la
   * tarjeta decía «pz» y el renglón era 1 caja de 12 (que con «Registrar
   * compra recibida» entraba así al inventario).
   */
  const initialLine = (
    product: ProductListItem,
    unitId: number,
    productId: number,
    packageId: number | undefined,
  ): { unitId: number; price: number } => {
    const units = product.available_units ?? [];

    if (product.is_package) {
      // El servidor guarda el paquete en la unidad del producto base; el
      // precio es por paquete.
      const last = lastPrices.get(lastPriceKey(productId, packageId));
      return {
        unitId: product.unit_id,
        price: last ? last.unit_price : catalogUnitPrice(product),
      };
    }

    const lineUnitId = unitId || units[0]?.id || 0;
    const chosenUnit = units.find((u) => u.id === lineUnitId) || units[0];
    const last = lastPrices.get(lastPriceKey(productId));
    const lastUnit = last ? units.find((u) => u.id === last.unit_id) : undefined;

    if (last && lastUnit) {
      if (lineUnitId === lastUnit.id) {
        return { unitId: lastUnit.id, price: last.unit_price };
      }
      const converted = convertUnitPrice(last.unit_price, lastUnit, chosenUnit);
      if (converted !== null) return { unitId: lineUnitId, price: converted };
    }

    return { unitId: lineUnitId, price: catalogUnitPrice(product, chosenUnit) };
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
    const { unitId: lineUnitId, price } = initialLine(
      product,
      unitId,
      productId,
      packageId,
    );
    const lineUnit = product.available_units?.find((u) => u.id === lineUnitId);

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
          price,
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
            price,
            package_id: packageId,
            detail_id: Number(response.data.detail_id),
            name: product.name,
            code: product.code,
            unit_name: lineUnit?.name,
            unit_abbreviation: lineUnit?.abbreviation,
            main_image: product.main_image,
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
   * Devuelve sus datos para la pantalla, o null si no hay borrador.
   */
  const loadDraft = async (
    routePurchaseId: number | null,
  ): Promise<LoadedDraft | null> => {
    try {
      const draft = routePurchaseId
        ? await fetchPurchaseById(deps.api, routePurchaseId)
        : await fetchLatestDraft(deps.api);
      if (!draft) return null;

      if (draft.status && draft.status !== "draft") {
        deps.alerts.warning(
          "Esta compra ya no está en borrador: sus productos ya no se pueden cambiar.",
        );
        return null;
      }

      const duplicated = applyLines(draft);
      setSupplier(draft.supplier_id);
      if (duplicated.length > 0) {
        deps.alerts.warning(
          `La compra tiene renglones repetidos de ${duplicated.join(", ")}: quita ese producto y vuelve a agregarlo antes de confirmar.`,
        );
      }

      const paymentMethod = PAYMENT_METHODS.find(
        (method) => method === draft.payment_method,
      );

      return {
        supplier_id: draft.supplier_id,
        supplier_name: draft.supplier_name,
        label: draft.purchase_number || `Compra #${draft.id}`,
        header: {
          purchase_date: draft.purchase_date || toLocalDateString(),
          payment_method: paymentMethod ?? "other",
          paid_from_cash: draft.paid_from_cash ?? true,
          notes: draft.notes || "",
          document_number: draft.document_number || "",
        },
      };
    } catch (error) {
      console.error("Error cargando draft:", error);
      if (routePurchaseId) {
        deps.alerts.error(apiMessage(error, "No se pudo cargar la compra"));
      }
      return null;
    }
  };

  const clear = () => {
    generation++;
    cancelAllPending();
    setLines({});
    setPurchaseId(null);
    setSupplier(null);
  };

  const confirm = async (
    data?: ConfirmPurchaseData,
  ): Promise<ConfirmPurchaseResult | null> => {
    if (confirming) return null;
    if (!purchaseId) {
      throw new Error("No hay compra para confirmar");
    }

    confirming = true;
    try {
      // 1. Todo lo que el usuario cambió llega al servidor antes de confirmar.
      if (!(await flush())) {
        throw new Error(
          "No se guardaron todos los cambios de la compra. Revisa las cantidades y los precios y vuelve a confirmar.",
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
            : "Lo guardado en la compra no coincidía con el carrito. Se cargó lo que tiene el servidor: revisa las cantidades y los precios y vuelve a confirmar.",
        );
      }

      const response = await deps.api.confirm(purchaseId, data);
      clear();
      return {
        received: response?.received === true,
        whatsappSent: response?.whatsapp_sent === true,
        cashOutOfShift: response?.cash_out_of_shift === true,
      };
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

/** Unidades y categorías: no dependen del proveedor. */
interface CatalogBase {
  groupedUnits: GroupedUnits;
  categories: ProductCategory[];
}

const listData = (response: any): any[] => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
};

export function PurchaseProvider({ children }: PurchaseProviderProps) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  // Todas las unidades (no dependen del proveedor): de ahí sale si un renglón
  // que no está en el catálogo admite decimales.
  const [unitGroups, setUnitGroups] = useState<GroupedUnits | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    {},
  );
  const [header, setHeader] = useState<PurchaseHeader>(newHeader);
  const [draftLabel, setDraftLabel] = useState<string | null>(null);
  const [draftSupplierName, setDraftSupplierName] = useState<string | null>(null);
  const [notice, setNotice] = useState<CartNotice | null>(null);

  const [currentPurchaseId, setCurrentPurchaseId] = useState<number | null>(
    null,
  );
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const alerts = useAlerts();
  const { can } = useCan();
  const canEditLines = can("purchases_update");
  const canRemoveLines = can("purchases_delete");

  // La compra que se abrió desde la lista ("Editar" → formv2?id=…). Se lee
  // una vez, al abrir la compra.
  const { id: routeId, new: routeNew } = useGlobalSearchParams<{
    id?: string;
    new?: string;
  }>();
  const [routePurchaseId] = useState<number | null>(() => {
    const parsed = parseInt(String(routeId ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  // "Nueva compra" (formv2?new=1) arranca vacía: el borrador se crea con el
  // primer producto. Sin id ni new se retoma el último borrador (lo que
  // arma Reabastecimiento).
  const [startsEmpty] = useState(() => !routePurchaseId && routeNew === "1");

  const [cart] = useState(() =>
    createPurchaseCart({
      api: Services.purchasesV2,
      // En el celular el carrito es un modal y los avisos de la app quedan
      // detrás: el último error o advertencia también se muestra dentro.
      alerts: {
        success: (message) => alerts.success(message),
        error: (message) => {
          alerts.error(message);
          setNotice({ text: message, tone: "error" });
        },
        warning: (message) => {
          alerts.warning(message);
          setNotice({ text: message, tone: "warning" });
        },
      },
      onLinesChange: setSelectedProducts,
      onPurchaseIdChange: setCurrentPurchaseId,
      onSupplierIdChange: setSupplierId,
    }),
  );

  const catalogBase = useRef<Promise<CatalogBase> | null>(null);
  const catalogRequest = useRef(0);
  const catalogSupplier = useRef<number | null>(null);

  /**
   * Unidades y categorías, una vez. Las categorías solo filtran: si no se
   * pueden ver (sin categories_list), el catálogo sale igual. Antes, si
   * fallaban, no se cargaban los productos.
   */
  const loadCatalogBase = () => {
    if (!catalogBase.current) {
      const request = Promise.all([
        // silent: si fallan, la pantalla dice que no se pudo cargar el
        // catálogo y ofrece reintentar (antes salía además el aviso global).
        Services.home.unidades.getGroupedByType(undefined, { silent: true }),
        Services.categories.index(undefined, { silent: true }).catch(() => null),
      ]).then(([unitsResponse, categoriesResponse]) => ({
        groupedUnits: (unitsResponse?.data ?? {}) as GroupedUnits,
        categories: listData(categoriesResponse).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
        })),
      }));
      // Si falla, la siguiente carga lo vuelve a pedir.
      request.catch(() => {
        catalogBase.current = null;
      });
      catalogBase.current = request;
    }
    return catalogBase.current;
  };

  /**
   * Catálogo del proveedor: sus productos comprables y sus paquetes. Sin
   * proveedor no hay catálogo. Si se elige otro mientras carga, gana el
   * último.
   */
  const loadCatalog = async (supplier: number | null) => {
    const request = ++catalogRequest.current;
    catalogSupplier.current = supplier;
    setLoading(true);
    setCatalogError(null);

    try {
      const { groupedUnits, categories } = await loadCatalogBase();
      // No dependen del proveedor: sirven aunque gane otra carga.
      setUnitGroups(groupedUnits);
      const expandedProducts: ProductListItem[] = [];

      if (supplier) {
        // silent: si falla, la pantalla lo dice en lugar del catálogo.
        const productsResponse = await Services.products.index(
          {
            is_purchasable: 1,
            is_active: true,
            supplier_id: supplier,
          },
          { silent: true },
        );

        (listData(productsResponse) as App.Entities.Product[]).forEach(
          (product) => {
            const availableUnits = product.unit?.unit_type
              ? groupedUnits[product.unit.unit_type as unitType] || []
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
          },
        );
      }

      if (request !== catalogRequest.current) return;
      cart.setProducts(expandedProducts);
      setProducts(expandedProducts);
      setAllCategories(categories);
    } catch (error) {
      console.error("Error cargando el catálogo de la compra:", error);
      if (request !== catalogRequest.current) return;
      // Sin los productos de otro proveedor a la vista.
      cart.setProducts([]);
      setProducts([]);
      setCatalogError(apiMessage(error, "No se pudo cargar el catálogo del proveedor."));
    } finally {
      if (request === catalogRequest.current) setLoading(false);
    }
  };

  // La compra de la ruta (o el último borrador) y el catálogo de su proveedor.
  useEffect(() => {
    (async () => {
      const draft = startsEmpty ? null : await cart.loadDraft(routePurchaseId);
      if (draft) {
        setHeader(draft.header);
        setDraftLabel(draft.label);
        setDraftSupplierName(draft.supplier_name);
      }
      setReady(true);
      loadCatalog(draft?.supplier_id ?? null);
    })();
    // Al salir de la compra no se pierden los cambios que esperaban turno.
    return () => cart.dispose();
  }, []);

  // Solo las categorías que tiene el catálogo del proveedor.
  const categories = useMemo(() => {
    const used = new Set(products.map((p) => p.category_id));
    return allCategories.filter((cat) => used.has(cat.id));
  }, [products, allCategories]);

  // Convertir selectedProducts a formato de CartItemData con indexación optimizada
  const { cartItems, total } = useMemo(() => {
    // Crear un Map para búsquedas O(1)
    const productsMap = new Map(products.map((p) => [p.id.toString(), p]));
    // Tipo de cada unidad, para los renglones que no están en el catálogo
    // cargado (otro proveedor, o un borrador de Reabastecimiento sin
    // proveedor): sin él no admitían decimales y 2.75 kg se descartaba.
    const unitTypes = new Map<number, string>();
    Object.entries(unitGroups ?? {}).forEach(([type, units]) =>
      (units ?? []).forEach((u) => unitTypes.set(Number(u.id), u.unit_type ?? type)),
    );
    let totalCents = 0;

    const items = Object.entries(selectedProducts).map(([productId, item]) => {
      const product = productsMap.get(productId);
      const selectedUnit = product?.available_units?.find(
        (u) => u.id === item.unit_id,
      );
      // En centavos, como el servidor: 2.489 kg × $25 = $62.23.
      const lineCents = lineTotalCents(item.quantity, item.price);
      const lineTotal = Number.isFinite(lineCents)
        ? centsToAmount(lineCents)
        : item.quantity * item.price;
      totalCents += Number.isFinite(lineCents) ? lineCents : 0;

      const cartItem: CartItemData = {
        // Usamos la llave de selectedProducts ("product_68" / "package_5"),
        // que es única por línea. Con item.product_id un producto base y su
        // paquete colisionaban (mismo product_id) → llave duplicada en React
        // y los handlers de quitar/editar (que indexan por esta llave) fallaban.
        id: productId,
        product_id: item.product_id,
        code: product?.code || item.code || "",
        name: product?.name || item.name || `Producto #${item.product_id}`,
        price: item.price,
        quantity: item.quantity,
        total: lineTotal,
        unit_id: item.unit_id,
        unit_name: selectedUnit?.name ?? item.unit_name,
        unit_abbreviation: selectedUnit?.abbreviation ?? item.unit_abbreviation,
        // Decide si la cantidad admite decimales (kg, L). Antes no llegaba y
        // en la compra no se podían capturar 2.5 kg.
        unit_type:
          selectedUnit?.unit_type ??
          product?.unit_type ??
          unitTypes.get(Number(item.unit_id)) ??
          undefined,
        is_package: !!item.package_id,
        main_image: product?.main_image ?? item.main_image,
        available_units: product?.available_units?.map((u) => ({
          id: u.id,
          name: u.name,
          abbreviation: u.abbreviation,
          price: item.price,
          unit_type: u.unit_type,
        })),
      };
      return cartItem;
    });

    return { cartItems: items, total: centsToAmount(totalCents) };
  }, [selectedProducts, products, unitGroups]);

  const value = useMemo<PurchaseContextType>(
    () => ({
      products,
      categories,
      loading,
      catalogError,
      ready,
      selectedProducts,
      cartItems,
      total,
      currentPurchaseId,
      draftLabel,
      supplierId,
      draftSupplierName,
      header,
      notice,
      selectSupplier: (id: number | null) => {
        cart.setSupplier(id);
        void loadCatalog(id);
      },
      reloadCatalog: () => {
        void loadCatalog(catalogSupplier.current);
      },
      updateHeader: (patch: Partial<PurchaseHeader>) =>
        setHeader((current) => ({ ...current, ...patch })),
      // Sin permiso no se manda la petición que el backend rechazaría: un
      // producto que ya está (escáner, doble toque) sumaría uno al renglón.
      handleAddProduct: (product: ProductListItem, unitId: number) => {
        if (!canEditLines && cart.getLines()[String(product.id)]) {
          alerts.info("Este producto ya está en la compra.");
          return;
        }
        void cart.addProduct(product, unitId);
      },
      handleRemoveProduct: (productId: number | string) => {
        if (canRemoveLines) void cart.removeProduct(productId);
      },
      handleItemChange: (productId: number | string, action: ItemAction, data?: any) => {
        if (!canEditLines) return;
        // Bajar de 1 quita el renglón.
        const line = cart.getLines()[String(productId)];
        if (action === "decrement" && !canRemoveLines && (line?.quantity ?? 0) <= 1) return;
        cart.changeItem(productId, action, data);
      },
      dismissNotice: () => setNotice(null),
      confirmPurchase: cart.confirm,
      canEditLines,
      canRemoveLines,
    }),
    [
      products,
      categories,
      loading,
      catalogError,
      ready,
      selectedProducts,
      cartItems,
      total,
      currentPurchaseId,
      draftLabel,
      supplierId,
      draftSupplierName,
      header,
      notice,
      canEditLines,
      canRemoveLines,
      alerts,
      cart,
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
