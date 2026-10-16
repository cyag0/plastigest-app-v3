/**
 * Kiosko de autoservicio (contrato de la fase 1, ver la especificación):
 *  - GET  /auth/admin/kiosk/catalog: catálogo de la sucursal para clientes,
 *    sin costos, sin clientes y sin existencias exactas en la interfaz.
 *  - POST /auth/admin/kiosk/orders: pedido pendiente que aparta el stock y
 *    regresa un número corto para pagar en caja.
 *
 * Las dos llamadas son `silent`: el kiosko muestra sus propios mensajes (en
 * palabras para el cliente) y el aviso global de errores no debe salir.
 */
import axiosClient from "@/utils/axios";

export interface KioskCategory {
  id: number;
  name: string;
}

export interface KioskPackage {
  id: number;
  name: string;
  /** Unidades base que trae el paquete. */
  quantity: number;
  price: number;
  /** Paquetes completos disponibles. */
  available: number;
}

export interface KioskProduct {
  id: number;
  name: string;
  category_id: number | null;
  image_url: string | null;
  unit: { name: string; abbreviation: string } | null;
  /** Se vende suelto (por unidad base) con precio mayor a 0. */
  sold_loose: boolean;
  /** Precio suelto; null si no se vende suelto. */
  price: number | null;
  /** Disponible en unidades base (existencia menos apartado). */
  available: number;
  packages: KioskPackage[];
}

export interface KioskCatalog {
  location: { id: number; name: string } | null;
  categories: KioskCategory[];
  products: KioskProduct[];
}

export interface KioskOrderItemInput {
  product_id: number;
  package_id: number | null;
  quantity: number;
}

export interface KioskOrderInput {
  client_request_id: string;
  customer_name?: string;
  items: KioskOrderItemInput[];
}

export interface KioskOrderItem {
  product_id: number;
  package_id: number | null;
  name: string;
  option: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface KioskOrder {
  id: number;
  ticket_number: number | null;
  order_number: string | null;
  customer_name: string | null;
  total: number;
  created_at: string | null;
  expires_at: string | null;
  items: KioskOrderItem[];
}

/**
 * Renglón rechazado por un 422 (`items`, junto a message y code):
 * insufficient_stock o product_unavailable (este con available 0).
 */
export interface KioskShortItem {
  product_id: number;
  package_id: number | null;
  /** Lo que sí hay: unidades base si es suelto, paquetes completos si es paquete. */
  available: number;
}

/** `code` de los rechazos propios del kiosko (los de venta están en components/Pos/saleErrors). */
export const KIOSK_ERROR_CODES = {
  /** La opción ya no se vende (desactivada en la sucursal, a $0, no vendible…). */
  productUnavailable: "product_unavailable",
  /** Demasiados pedidos del kiosko esperando en caja en la sucursal. */
  kioskBusy: "kiosk_busy",
} as const;

/** Al enviar el pedido no se espera el minuto del alta de ventas: el cliente está frente a la pantalla. */
const ORDER_TIMEOUT_MS = 30 * 1000;

// JSON y no multipart (el default del cliente): package_id null y los
// renglones viajan tal cual.
const JSON_HEADERS = { "Content-Type": "application/json" };

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function idOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = num(value, NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeProduct(raw: any): KioskProduct | null {
  const id = idOrNull(raw?.id);
  if (!id) return null;
  const price = raw?.price == null ? null : num(raw.price, 0);
  const packages: KioskPackage[] = (Array.isArray(raw?.packages) ? raw.packages : [])
    .map((pkg: any) => ({
      id: idOrNull(pkg?.id) ?? 0,
      name: text(pkg?.name).trim() || "Paquete",
      quantity: num(pkg?.quantity, 0),
      price: num(pkg?.price, 0),
      available: Math.max(0, Math.floor(num(pkg?.available, 0))),
    }))
    // Nunca se vende nada a $0 (el servidor ya lo excluye; por si acaso).
    .filter((pkg: KioskPackage) => pkg.id > 0 && pkg.quantity > 0 && pkg.price > 0);
  const soldLoose = Boolean(raw?.sold_loose) && price !== null && price > 0;
  if (!soldLoose && packages.length === 0) return null;

  const unitName = text(raw?.unit?.name).trim();
  const unitAbbr = text(raw?.unit?.abbreviation).trim();
  const image = text(raw?.image_url).trim();

  return {
    id,
    name: text(raw?.name).trim() || "Producto",
    category_id: idOrNull(raw?.category_id),
    image_url: image ? image : null,
    unit: unitName || unitAbbr ? { name: unitName, abbreviation: unitAbbr } : null,
    sold_loose: soldLoose,
    price: soldLoose ? price : null,
    available: Math.max(0, num(raw?.available, 0)),
    packages,
  };
}

export function normalizeKioskCatalog(raw: any): KioskCatalog {
  const products = (Array.isArray(raw?.products) ? raw.products : [])
    .map(normalizeProduct)
    .filter((p: KioskProduct | null): p is KioskProduct => p !== null);
  const withProducts = new Set(products.map((p: KioskProduct) => p.category_id).filter((id: number | null) => id !== null));
  const categories: KioskCategory[] = (Array.isArray(raw?.categories) ? raw.categories : [])
    .map((c: any) => ({ id: idOrNull(c?.id) ?? 0, name: text(c?.name).trim() }))
    .filter((c: KioskCategory) => c.id > 0 && c.name && withProducts.has(c.id));
  const locationId = idOrNull(raw?.location?.id);

  return {
    location: locationId ? { id: locationId, name: text(raw?.location?.name).trim() } : null,
    categories,
    products,
  };
}

function normalizeOrder(raw: any): KioskOrder {
  const ticket = num(raw?.ticket_number, NaN);
  return {
    id: num(raw?.id, 0),
    ticket_number: Number.isFinite(ticket) ? ticket : null,
    order_number: raw?.order_number ? text(raw.order_number) : null,
    customer_name: raw?.customer_name ? text(raw.customer_name) : null,
    total: num(raw?.total, 0),
    created_at: raw?.created_at ? text(raw.created_at) : null,
    expires_at: raw?.expires_at ? text(raw.expires_at) : null,
    items: (Array.isArray(raw?.items) ? raw.items : []).map((item: any) => ({
      product_id: num(item?.product_id, 0),
      package_id: idOrNull(item?.package_id),
      name: text(item?.name),
      option: item?.option ? text(item.option) : null,
      quantity: num(item?.quantity, 0),
      unit_price: num(item?.unit_price, 0),
      line_total: num(item?.line_total, 0),
    })),
  };
}

/**
 * Renglones de un 422 insufficient_stock o product_unavailable
 * (`items: [{product_id, package_id, available}]` junto a message y code).
 */
export function kioskShortItems(error: unknown): KioskShortItem[] {
  const items = (error as any)?.response?.data?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any) => ({
      product_id: num(item?.product_id, 0),
      package_id: idOrNull(item?.package_id),
      available: Math.max(0, num(item?.available, 0)),
    }))
    .filter((item) => item.product_id > 0);
}

export const kioskApi = {
  async catalog(): Promise<KioskCatalog> {
    const response = await axiosClient.get("/auth/admin/kiosk/catalog", { silent: true });
    return normalizeKioskCatalog(response.data?.data ?? response.data);
  },

  /**
   * Crea el pedido. Con la misma client_request_id el servidor devuelve el
   * pedido ya creado (200) en lugar de otro: reintentar no lo duplica.
   */
  async createOrder(body: KioskOrderInput): Promise<KioskOrder> {
    const response = await axiosClient.post("/auth/admin/kiosk/orders", body, {
      headers: JSON_HEADERS,
      timeout: ORDER_TIMEOUT_MS,
      silent: true,
    });
    return normalizeOrder(response.data?.data ?? response.data);
  },
};

export default kioskApi;
