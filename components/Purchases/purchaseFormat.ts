/**
 * Lo que muestra el detalle de una compra: la forma del show()
 * (GET purchases-v2/{id}), las cuentas de la recepción y los textos del
 * historial y de los faltantes.
 */

import { paymentMethod, purchaseStatus } from "@/constants/statuses";
import { formatQuantity, parseMoney, parseQuantity } from "@/utils/format";
import { centsToAmount, lineTotalCents, sumCents } from "@/utils/money";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Un renglón de la compra tal como lo manda el show(). */
export interface PurchaseLine {
  id: number;
  product_id: number;
  product_name?: string | null;
  product_code?: string | null;
  product_image?: string | { uri?: string | null } | null;
  package_id?: number | null;
  package_name?: string | null;
  quantity: string | number;
  quantity_received?: string | number | null;
  unit_id: number;
  unit_name?: string | null;
  unit_abbreviation?: string | null;
  unit_price: string | number;
  subtotal?: string | number | null;
  received_at?: string | null;
}

/** Un cambio de estado (PurchaseV2::appendStatusLog). */
export interface PurchaseStatusLog {
  from?: string | null;
  to: string;
  by_user_id?: number | null;
  by_user_name?: string | null;
  /** ISO 8601 con zona. */
  at?: string | null;
  reason?: string | null;
}

/** Cómo se aclaró la diferencia de una recepción con faltantes. */
export interface DiscrepancyResolution {
  task_id?: number;
  resolution?: {
    type?: string | null;
    notes?: string | null;
    resolved_at?: string | null;
  } | null;
  resolved_at?: string | null;
}

export interface PurchaseRecord {
  id: number;
  supplier_id?: number | null;
  supplier_name?: string | null;
  purchase_date?: string | null;
  purchase_number?: string | null;
  notes?: string | null;
  document_number?: string | null;
  status: string;
  total: string | number;
  payment_method?: string | null;
  paid_from_cash?: boolean | null;
  details?: PurchaseLine[];
  /** La metadata de la compra: la lista de cambios de estado. */
  status_history?: unknown;
  discrepancy_resolution?: DiscrepancyResolution | null;
  // Pueden no venir (backend anterior): el detalle los muestra si llegan.
  /** Y-m-d H:i, hora de la sucursal. */
  delivery_date?: string | null;
  /** Y-m-d */
  expected_delivery_date?: string | null;
  created_by_name?: string | null;
  received_by_name?: string | null;
}

export const toNum = (value: unknown): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/** Unidad del renglón: el paquete ("Caja con 12") o la unidad ("pz"). */
export const lineUnit = (line: PurchaseLine): string =>
  line.package_name || line.unit_abbreviation || "";

export function lineImage(line: PurchaseLine): string | null {
  const image = line.product_image;
  if (!image) return null;
  return typeof image === "string" ? image : image.uri || null;
}

/** Método de pago de la compra: "Otro" solo existe en compras. */
export function purchasePaymentMethod(value?: string | null): { label: string; icon: IconName } {
  return value === "other" ? { label: "Otro", icon: "dots-horizontal" } : paymentMethod(value);
}

/**
 * "2026-10-16 13:38" (Y-m-d H:i del show) con la "T" de ISO: así es una hora
 * local que también entiende Hermes; con el espacio puede dar fecha inválida.
 */
export function backendDateTime(value?: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? value.replace(" ", "T") : value;
}

// ── Recepción ──────────────────────────────────────────────────────────────

export interface ReceiveRow {
  line: PurchaseLine;
  ordered: number;
  /** Lo que llegó, ya validado; null si lo capturado no es válido. */
  received: number | null;
  error: string | null;
  /** Precio pagado por unidad (o por paquete), ya validado; null si no es válido. */
  price: number | null;
  priceError: string | null;
  /** El precio pagado no es el del pedido: se manda al recibir. */
  repriced: boolean;
}

/** "1,450": un solo grupo de miles, que parseQuantity rechaza por ambiguo. */
const SINGLE_GROUP = /^([1-9]\d{0,2}),(\d{3})$/;

/** Precio pagado de un renglón al recibirlo: el del pedido si no se escribe otro. */
function receivePrice(line: PurchaseLine, text: string | undefined) {
  const ordered = toNum(line.unit_price);
  if (text === undefined) return { price: ordered, priceError: null, repriced: false };
  // Como el precio del carrito: "$1,250.50" o "25,5" (parseMoney).
  const parsed = parseMoney(text);
  if (parsed === null) return { price: null, priceError: "Escribe el precio que pagaste", repriced: false };
  if (parsed < 0) return { price: null, priceError: "El precio no puede ser negativo", repriced: false };
  // A centavos, como la columna.
  const price = Math.round(parsed * 100) / 100;
  return { price, priceError: null, repriced: Math.abs(price - ordered) >= 0.005 };
}

/**
 * Lo que llegó de un renglón: entre 0 y lo pedido (los paquetes, enteros), y
 * el precio pagado (por omisión, el del pedido). Antes el precio quedaba fijo
 * al confirmar el pedido: si al entregar era otro, el egreso de caja y el
 * costo de los reportes salían con el del pedido.
 */
export function receiveRow(line: PurchaseLine, text: string, priceText?: string): ReceiveRow {
  const ordered = toNum(line.quantity);
  const parsed = parseQuantity(text);
  let error: string | null = null;
  if (parsed === null) {
    // Igual puede ser 1450 bolsas que 1.45 kg: se pide sin coma, no se adivina.
    const group = SINGLE_GROUP.exec(text.replace(/\s/g, ""));
    error = group
      ? `¿${group[1]}${group[2]} o ${Number(`${group[1]}.${group[2]}`)}? Escríbelo sin coma`
      : "Escribe cuánto llegó";
  } else if (parsed < 0) error = "No puede ser negativo";
  else if (parsed > ordered + 1e-9) error = `No puede ser más de lo pedido (${formatQuantity(ordered)})`;
  else if (line.package_id && !Number.isInteger(parsed)) error = "Los paquetes se reciben enteros";
  return {
    line,
    ordered,
    // Cuatro decimales, como la columna: con tres, 2.5625 pedidos se mandaban
    // como 2.563 (más de lo pedido, el backend lo rechaza) y 0.3333 como 0.333
    // (un faltante que no hubo).
    received: error || parsed === null ? null : Math.round(parsed * 10000) / 10000,
    error,
    ...receivePrice(line, priceText),
  };
}

/** Faltantes y valor de lo que llegó, mientras se captura la recepción. */
export function receiveSummary(rows: ReceiveRow[]) {
  const short = rows.filter((row) => row.received !== null && row.received < row.ordered - 1e-9);
  const orderedCents = sumCents(rows.map((row) => lineTotalCents(row.ordered, row.line.unit_price)));
  // Con el precio que se está capturando: es lo que sale de la caja.
  const receivedCents = sumCents(
    rows.map((row) => lineTotalCents(row.received ?? 0, row.price ?? row.line.unit_price)),
  );
  return {
    short,
    received: centsToAmount(receivedCents),
    difference: centsToAmount(orderedCents - receivedCents),
  };
}

/** ¿Llegó menos de lo pedido? (solo renglones ya recibidos). */
export const isShort = (line: PurchaseLine): boolean =>
  line.quantity_received != null && toNum(line.quantity_received) < toNum(line.quantity) - 1e-9;

/**
 * Lo pedido contra lo que llegó de una compra recibida. El total de la
 * compra se queda como lo pedido; el egreso de caja fue por lo que llegó.
 * Un renglón sin cantidad recibida (compras de antes de capturarla) cuenta
 * como completo: así se recibía entonces.
 */
export function receivedTotals(lines: PurchaseLine[]) {
  const orderedCents = sumCents(lines.map((line) => lineTotalCents(toNum(line.quantity), line.unit_price)));
  const receivedCents = sumCents(
    lines.map((line) =>
      lineTotalCents(toNum(line.quantity_received ?? line.quantity), line.unit_price),
    ),
  );
  return {
    short: lines.filter(isShort),
    received: centsToAmount(receivedCents),
    difference: centsToAmount(orderedCents - receivedCents),
  };
}

// ── Historial y faltantes ──────────────────────────────────────────────────

/**
 * Los cambios de estado, en orden; lo que no tenga la forma esperada se omite.
 * «Registrar compra recibida» deja un solo paso, de borrador a recibida («Se
 * registró como recibida»): no hubo pedido.
 */
export function statusHistory(raw: unknown): PurchaseStatusLog[] {
  const entries = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
  return entries.filter(
    (entry): entry is PurchaseStatusLog =>
      !!entry && typeof entry === "object" && typeof (entry as PurchaseStatusLog).to === "string",
  );
}

/** Qué pasó en un cambio de estado, para el historial. */
export function historyEvent(entry: PurchaseStatusLog): { icon: IconName; title: string } {
  switch (entry.to) {
    case "ordered":
      return { icon: "cart-check", title: "Se hizo el pedido" };
    case "in_transit":
      return { icon: "truck-delivery-outline", title: "Se marcó en tránsito" };
    case "received":
      return {
        icon: "package-variant-closed-check",
        // Sin pasar por pedido: se registró ya con la mercancía.
        title: entry.from === "draft" ? "Se registró como recibida" : "Se registró la recepción",
      };
    case "cancelled":
      return { icon: "close-circle-outline", title: "Se canceló" };
    default:
      return { icon: "circle-medium", title: purchaseStatus(entry.to).label };
  }
}

const RESOLUTION_LABELS: Record<string, string> = {
  credit_note: "El proveedor dio nota de crédito",
  adjustment: "Se hizo un ajuste de inventario",
  no_action: "Se aceptó el faltante",
  other: "Otra solución",
};

export function resolutionLabel(type?: string | null): string {
  return (type && RESOLUTION_LABELS[type]) || "Diferencia aclarada";
}
