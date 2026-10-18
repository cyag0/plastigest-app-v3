/**
 * Ajustes de inventario: los textos, íconos y cálculos que comparten la
 * lista, el detalle y el registro. Antes cada pantalla tenía su propio mapa
 * de motivos y se contradecían ("Vencimiento", "Diferencia de Conteo",
 * "Acción: Daño").
 *
 * Un ajuste es un renglón por producto (no hay encabezado): cantidad en la
 * unidad del producto, existencia de antes y de después, motivo y, desde que
 * se pueden deshacer, de dónde salió y si ya se deshizo.
 */

import { formatDate, formatTime, parseLocalDate } from "@/utils/dates";
import { formatQuantity } from "@/utils/format";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type Direction = "in" | "out";
export type ReasonCode = "damage" | "loss" | "expiry" | "theft" | "found" | "count_diff" | "other" | "production_waste";
export type OriginType = "manual" | "production_order" | "inventory_count" | "transfer";

export interface EvidenceFile {
  name?: string | null;
  path?: string | null;
  uri?: string | null;
  url?: string | null;
  type?: string | null;
}

/** Un ajuste tal como lo manda InventoryAdjustmentDetailResource. */
export interface AdjustmentRecord {
  id: number;
  location_id: number;
  location?: { id: number; name: string } | null;
  created_by_user?: { id: number; name: string } | null;
  product_id: number;
  product?: {
    id: number;
    name: string;
    sku?: string | null;
    code?: string | null;
  } | null;
  direction: Direction;
  /** En la unidad del producto. */
  quantity: number;
  unit?: { id: number; name?: string | null; code?: string | null; abbreviation?: string | null } | null;
  previous_stock?: number | null;
  new_stock?: number | null;
  reason_code?: string | null;
  reason_code_label?: string | null;
  notes?: string | null;
  content?: { reverted_at?: string | null; evidence_files?: EvidenceFile[] | null } | null;
  evidence_files?: EvidenceFile[] | null;
  applied_at?: string | null;
  created_at?: string | null;
  origin?: { type: OriginType; id: number | null; label: string | null } | null;
  reverted_at?: string | null;
  reverted_by_user?: { id: number; name: string } | null;
  can_undo?: boolean;
}

// ─── Motivos ────────────────────────────────────────────────────────────────

export interface ReasonInfo {
  /** En la lista y el detalle: "Daño". */
  label: string;
  /** La respuesta a "¿Qué pasó?" al registrar: "Se dañó". */
  answer: string;
  icon: IconName;
  /** Hacia dónde mueve siempre la existencia; null si puede ser cualquiera. */
  direction: Direction | null;
}

export const REASONS: Record<ReasonCode, ReasonInfo> = {
  damage: { label: "Daño", answer: "Se dañó", icon: "package-variant-remove", direction: "out" },
  loss: { label: "Pérdida", answer: "Se perdió", icon: "map-marker-question-outline", direction: "out" },
  expiry: { label: "Caducidad", answer: "Caducó", icon: "calendar-remove", direction: "out" },
  theft: { label: "Robo", answer: "Robo", icon: "shield-alert-outline", direction: "out" },
  found: { label: "Encontrado", answer: "Sobró / encontré", icon: "magnify", direction: "in" },
  count_diff: {
    label: "Diferencia de conteo",
    answer: "El conteo no cuadra",
    icon: "scale-balance",
    direction: null,
  },
  other: { label: "Otro", answer: "Otro", icon: "dots-horizontal-circle-outline", direction: null },
  production_waste: {
    label: "Merma de producción",
    answer: "Merma de producción",
    icon: "pot-steam-outline",
    direction: "out",
  },
};

/** Lo que se elige al registrar (la merma de producción la genera la orden). */
export const MANUAL_REASONS: ReasonCode[] = ["damage", "loss", "expiry", "theft", "found", "count_diff", "other"];

/** Para estos se sugiere la foto abierta al registrar. */
export const PHOTO_REASONS: ReasonCode[] = ["damage", "theft"];

export function reasonInfo(code?: string | null): ReasonInfo {
  if (code && code in REASONS) return REASONS[code as ReasonCode];
  return { label: code || "Sin motivo", answer: code || "Sin motivo", icon: "help-circle-outline", direction: null };
}

// ─── Origen ─────────────────────────────────────────────────────────────────

export const ORIGINS: Record<OriginType, { label: string; icon: IconName; document: string | null }> = {
  manual: { label: "Registro manual", icon: "account-edit-outline", document: null },
  production_order: { label: "Producción", icon: "pot-steam-outline", document: "production_order" },
  inventory_count: { label: "Conteo de inventario", icon: "clipboard-list-outline", document: "count" },
  transfer: { label: "Transferencia", icon: "truck-delivery-outline", document: "transfer" },
};

export const originOf = (a: AdjustmentRecord): OriginType => a.origin?.type ?? "manual";

// ─── Cantidades ─────────────────────────────────────────────────────────────

/** Abreviatura de la unidad ("pz"); si no viene, su nombre. */
export const unitOf = (a: Pick<AdjustmentRecord, "unit">): string =>
  a.unit?.abbreviation || a.unit?.code || a.unit?.name || "";

/** "−3 pz" · "+2 kg" (signo menos de verdad, no guion). */
export const signedQuantity = (a: AdjustmentRecord): string =>
  `${a.direction === "in" ? "+" : "−"}${formatQuantity(a.quantity, unitOf(a))}`;

export const isReverted = (a: AdjustmentRecord): boolean => !!(a.reverted_at ?? a.content?.reverted_at);

export const revertedAt = (a: AdjustmentRecord): string | null => a.reverted_at ?? a.content?.reverted_at ?? null;

/** Fotos con dirección (la del API autenticado o la pública). */
export function evidenceOf(a: AdjustmentRecord): string[] {
  const files = a.evidence_files ?? a.content?.evidence_files ?? [];
  return files.map((f) => f.uri || f.url || "").filter(Boolean);
}

/** Redondeo para comparar cantidades sin ruido de punto flotante. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ─── Fechas ─────────────────────────────────────────────────────────────────

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseLocalDate(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Hoy" · "Ayer" · "16 oct" · "16 oct 2025". */
export function dayLabel(value?: string | null): string {
  const d = toDate(value);
  if (!d) return "—";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Hoy";
  if (dayKey(d) === dayKey(yesterday)) return "Ayer";
  return d.getFullYear() === today.getFullYear()
    ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    : formatDate(d);
}

/** "Hoy, 10:24 a.m." · "16 oct, 6:05 p.m." */
export const dayTime = (value?: string | null): string => (value ? `${dayLabel(value)}, ${formatTime(value)}` : "—");

/** ¿Se registró otro día del que pasó? (un ajuste con fecha de días atrás). */
export function happenedOnOtherDay(a: AdjustmentRecord): boolean {
  const applied = toDate(a.applied_at);
  const created = toDate(a.created_at);
  return !!applied && !!created && dayKey(applied) !== dayKey(created);
}

/**
 * Cuándo, para la lista: la fecha y hora en que se registró; si se registró
 * con fecha de otro día, ese día sin hora (la hora sería la medianoche, que
 * no dice nada).
 */
export function whenText(a: AdjustmentRecord): string {
  if (happenedOnOtherDay(a)) return dayLabel(a.applied_at);
  return dayTime(a.created_at ?? a.applied_at);
}

/** ¿Es de hoy (fecha local del dispositivo)? */
export function isToday(value?: string | null): boolean {
  const d = toDate(value);
  return !!d && dayKey(d) === dayKey(new Date());
}
