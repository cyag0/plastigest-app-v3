/**
 * Lo que muestra el detalle de una transferencia (la forma de
 * InventoryTransferResource, GET inventory-transfers/{id}): en qué paso va y a
 * quién le toca, las cantidades de cada renglón por etapa (pedido o aprobado,
 * enviado, recibido), lo que pasó con un faltante, las fotos de cada paso y
 * el historial.
 *
 * Lo que el recurso no trae: el nombre de quien aprobó, rechazó o canceló
 * (approved_by_user y compañía siempre llegan en null); solo el de quien
 * pidió, envió (workflow.step_2.actor_name) y recibió (workflow.step_3).
 */

import type { UploadedFile } from "@/components/Form/AppUpload";
import { formatQuantity, parseQuantity } from "@/utils/format";
import { resolveImageUri } from "@/utils/imageUtils";
import type { InventoryTransfer, TransferDetail, TransferGeneratedAdjustment } from "@/utils/services/transferService";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const EPS = 1e-9;

export const num = (value: unknown): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** content de la transferencia, sin tipos (cada paso agrega lo suyo). */
const contentOf = (transfer: InventoryTransfer): any => (transfer.content ?? {}) as any;

// ── Paso actual ─────────────────────────────────────────────────────────────

/**
 * Paso en el que va: 1 aprobación, 2 envío, 3 recepción, 4 terminada
 * (completada, rechazada o cancelada).
 */
export function getCurrentStepFromTransfer(transfer: InventoryTransfer): number {
  const status = String(transfer.status || "").toLowerCase();

  if (status === "completed" || status === "closed" || status === "rejected" || status === "cancelled") {
    return 4;
  }

  const fromPayload = Number(transfer.current_step || 0);
  if (fromPayload >= 1 && fromPayload <= 4) return fromPayload;

  if (status === "pending" || status === "ordered") return 1;
  if (status === "approved") return 2;
  if (status === "in_transit") return 3;
  return 3;
}

/** ¿Llegó a aprobarse? (las cantidades del detalle ya son las aprobadas). */
export function wasApproved(transfer: InventoryTransfer): boolean {
  const status = String(transfer.status);
  if (status === "approved" || status === "in_transit" || status === "completed") return true;
  const content = contentOf(transfer);
  if (status === "cancelled") {
    const from = content.cancellation?.from_status;
    if (from) return from !== "pending";
  }
  return content.step_1?.status === "approved" || content.progress?.step_1?.result === "completed";
}

/** ¿Salió mercancía del origen? */
export const wasShipped = (transfer: InventoryTransfer): boolean =>
  (transfer.details ?? []).some((detail) => num(detail.quantity_shipped) > EPS) ||
  !!contentOf(transfer).workflow?.step_2;

/** De qué estado venía una transferencia cancelada (o rechazada: en qué paso). */
export function cancelledFrom(transfer: InventoryTransfer): string | null {
  return contentOf(transfer).cancellation?.from_status ?? null;
}

// Los motivos que pone la app sola (rechazar desde el detalle, cancelar
// desde la lista) no dicen nada: no se muestran como motivo.
const AUTOMATIC_REASONS = ["rechazada desde wizard de transferencias", "cancelada por el usuario"];

/** El motivo que escribió alguien, o null si es uno automático. */
export function realReason(reason?: string | null): string | null {
  const value = text(reason);
  return value && !AUTOMATIC_REASONS.includes(value.toLowerCase()) ? value : null;
}

// ── Renglones ───────────────────────────────────────────────────────────────

/** Un renglón tal como lo manda InventoryTransferDetailResource. */
export type TransferLine = TransferDetail & {
  unit?: { id?: number; name?: string; abbreviation?: string } | null;
  package_id?: number | null;
  package?: { id?: number; package_name?: string; quantity_per_package?: number | string } | null;
};

export const lineName = (line: TransferLine): string => line.product?.name || "Producto";

/** Unidad del renglón ("pz", "kg"); "ud" si no viene. */
export function lineUnit(line: TransferLine): string {
  const anyLine = line as any;
  return anyLine?.unit?.abbreviation || anyLine?.product?.unit?.abbreviation || "ud";
}

/** Presentación ("Charola con 12") de un renglón pedido por paquete. */
export const linePackage = (line: TransferLine): string | null =>
  line.package_id ? text(line.package?.package_name) || "Paquete" : null;

/** Lo que se escribe junto al número: "pz", "kg" o "paq." (en paquetes). */
export const captureUnit = (line: TransferLine): string => (line.package_id ? "paq." : lineUnit(line));

/** "24 pz" · "12.5 kg" · "3 paq." */
export const lineQty = (line: TransferLine, value: number): string =>
  formatQuantity(value, captureUnit(line));

export const lineImage = (line: TransferLine): string | null => resolveImageUri(line.product?.main_image);

/** Existencia disponible en el origen (en la unidad base del producto). */
export const lineStock = (line: TransferLine): number => num(line.available_stock);

/**
 * ¿No alcanza la existencia del origen para mandar `quantity`? Un paquete
 * cuenta como sus piezas (así lo revisa el backend al enviar).
 */
export function exceedsStock(line: TransferLine, quantity: number): boolean {
  const perPackage = line.package_id ? num(line.package?.quantity_per_package) || 1 : 1;
  return quantity * perPackage > lineStock(line) + EPS;
}

export const stockText = (line: TransferLine): string => formatQuantity(lineStock(line), lineUnit(line));

/**
 * Aviso para la confirmación de aprobar o enviar si la existencia del origen
 * no alcanza (al enviar, el backend no deja mandar más de lo que hay).
 */
export function stockWarning(rows: { line: TransferLine; quantity: number }[]): string | null {
  const short = rows.filter((row) => row.quantity > 0 && exceedsStock(row.line, row.quantity));
  if (short.length === 0) return null;
  if (short.length === 1) {
    return `Ojo: de ${lineName(short[0].line)} solo hay ${stockText(short[0].line)} en tu sucursal; al enviar no se puede mandar más de lo que hay.`;
  }
  return `Ojo: no alcanza lo que hay en tu sucursal de ${short.length} productos (${short
    .map((row) => lineName(row.line))
    .join(", ")}); al enviar no se puede mandar más de lo que hay.`;
}

/** La etapa que se ve a la derecha del renglón y su cantidad. */
export interface LineStage {
  label: string;
  value: number;
}

/**
 * Cantidades del renglón por etapa, de la más reciente a la primera. Lo
 * pedido se vuelve "Aprobado" al aprobarse (aprobar reescribe la cantidad
 * pedida con la que se va a enviar).
 */
export function lineStages(transfer: InventoryTransfer, line: TransferLine): LineStage[] {
  const stages: LineStage[] = [];
  const status = String(transfer.status);
  const shipped = wasShipped(transfer);
  // Un renglón que no se envió (aprobado en 0) no tiene nada que recibir.
  const received = status === "completed" && num(line.quantity_shipped) > EPS;
  if (received) stages.push({ label: "Recibido", value: num(line.quantity_received) });
  if (shipped) stages.push({ label: "Enviado", value: num(line.quantity_shipped) });
  stages.push({ label: wasApproved(transfer) ? "Aprobado" : "Pedido", value: num(line.quantity_requested) });
  return stages;
}

/** Faltante de un renglón ya recibido (enviado − recibido). */
export function lineShortage(transfer: InventoryTransfer, line: TransferLine): number {
  if (String(transfer.status) !== "completed") return 0;
  const diff = num(line.quantity_shipped) - num(line.quantity_received);
  return diff > EPS ? diff : 0;
}

// ── Lo que pasó con un faltante ─────────────────────────────────────────────

export const REASON_LABELS: Record<string, string> = {
  loss: "Se perdió",
  damage: "Llegó dañado",
};

export const reasonLabel = (reason?: string | null): string =>
  (reason && REASON_LABELS[reason]) || "Sin motivo";

export interface LineIncident {
  reason: string | null;
  comment: string | null;
  notes: string | null;
  photos: UploadedFile[];
  adjustmentId: number | null;
}

/** Una foto del API ({uri} de formatFile o {url} de saveEvidenceFiles) para AppUpload. */
function toPhoto(file: any, index: number): UploadedFile | null {
  const uri = resolveImageUri(file);
  if (!uri) return null;
  return {
    uri,
    name: text(file?.name) || `foto_${index + 1}.jpg`,
    type: text(file?.type) || text(file?.mime_type) || "image/jpeg",
  };
}

const toPhotos = (files: unknown): UploadedFile[] =>
  Array.isArray(files) ? files.map(toPhoto).filter((file): file is UploadedFile => !!file) : [];

/**
 * Motivo, "qué pasó", nota, fotos y ajuste de un renglón que llegó
 * incompleto (de la recepción y del ajuste que generó). null si no hubo.
 */
export function lineIncident(transfer: InventoryTransfer, line: TransferLine): LineIncident | null {
  const items: any[] = contentOf(transfer).workflow?.step_3?.items ?? [];
  const item = Array.isArray(items) ? items.find((entry) => Number(entry?.detail_id) === Number(line.id)) : null;
  const adjustments: TransferGeneratedAdjustment[] = Array.isArray(transfer.generated_adjustments)
    ? transfer.generated_adjustments
    : [];
  const adjustment = adjustments.find(
    (entry) =>
      Number(entry?.content?.transfer_detail_id) === Number(line.id) ||
      (!!item?.adjustment_id && Number(entry?.id) === Number(item.adjustment_id)),
  );
  const reason = adjustment?.reason ?? item?.adjustment_reason ?? null;
  const comment = text(adjustment?.content?.adjustment_comment) || text(item?.adjustment_comment) || null;
  const notes = text(item?.adjustment_notes) || null;
  const photos = toPhotos(
    adjustment?.content?.evidence_files?.length ? adjustment.content.evidence_files : item?.adjustment_evidence,
  );
  const adjustmentId = Number(adjustment?.id ?? item?.adjustment_id) || null;
  if (!reason && !comment && !notes && photos.length === 0 && !adjustmentId) return null;
  return { reason, comment, notes, photos, adjustmentId };
}

// ── Fotos y notas de cada paso ──────────────────────────────────────────────

/** Fotos del envío (step_2) o de la recepción (step_3). */
export function stepPhotos(transfer: InventoryTransfer, step: "step_2" | "step_3"): UploadedFile[] {
  const content = contentOf(transfer);
  const files = content[step]?.evidence_files;
  if (Array.isArray(files) && files.length > 0) return toPhotos(files);
  return toPhotos(content.workflow?.[step]?.evidence);
}

export const shippingNotes = (transfer: InventoryTransfer): string | null =>
  text(contentOf(transfer).step_2?.shipping_notes) || null;

export const receivingNotes = (transfer: InventoryTransfer): string | null =>
  text(contentOf(transfer).step_3?.receiving_notes) || null;

// ── Pasos e historial ───────────────────────────────────────────────────────

const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** "17 oct" (para el indicador de pasos). */
export function shortDay(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("es-MX", DAY_FORMAT).replace(".", "");
}

export const requestedAt = (transfer: InventoryTransfer): string | null =>
  transfer.requested_at || transfer.created_at || null;

export const approvedAt = (transfer: InventoryTransfer): string | null =>
  transfer.approved_at || contentOf(transfer).step_1?.approved_at || null;

export const shippedAt = (transfer: InventoryTransfer): string | null => {
  const content = contentOf(transfer);
  return transfer.shipped_at || content.step_2?.shipped_at || content.workflow?.step_2?.at || null;
};

export const receivedAt = (transfer: InventoryTransfer): string | null => {
  const content = contentOf(transfer);
  return transfer.received_at || content.step_3?.received_at || content.workflow?.step_3?.at || null;
};

const rejectedAt = (transfer: InventoryTransfer): string | null => {
  const content = contentOf(transfer);
  return content.step_1?.rejected_at || content.step_4?.closed_at || transfer.rejected_at || null;
};

const cancelledAt = (transfer: InventoryTransfer): string | null =>
  transfer.cancelled_at || contentOf(transfer).cancellation?.cancelled_at || null;

export type StepState = "done" | "current" | "upcoming" | "failed" | "skipped";

export interface StepInfo {
  key: string;
  label: string;
  state: StepState;
  /** Fecha ("17 oct") o lo que pasó ("Rechazada"). */
  caption: string | null;
}

/**
 * Los cuatro pasos (Solicitud, Aprobación, Envío y Recepción) y cómo va
 * cada uno. Si se rechazó o canceló, el paso en el que se quedó va marcado.
 */
export function transferSteps(transfer: InventoryTransfer): StepInfo[] {
  const status = String(transfer.status);
  const content = contentOf(transfer);
  const dates = [requestedAt(transfer), approvedAt(transfer), shippedAt(transfer), receivedAt(transfer)];
  const labels = ["Solicitud", "Aprobación", "Envío", "Recepción"];
  const keys = ["request", "approve", "ship", "receive"];

  // Índice del paso en curso (0-3) y si terminó mal ahí.
  let current: number;
  let failed: string | null = null;
  switch (status) {
    case "pending":
      current = 1;
      break;
    case "approved":
      current = 2;
      break;
    case "in_transit":
      current = 3;
      break;
    case "completed":
      current = 4;
      break;
    case "rejected": {
      const ended = Number(content.ended_at_step) || 1;
      current = Math.min(Math.max(ended, 1), 3);
      failed = "Rechazada";
      break;
    }
    case "cancelled": {
      const from = cancelledFrom(transfer);
      current = from === "in_transit" ? 3 : from === "approved" ? 2 : from === "pending" ? 1 : Math.min(Math.max(Number(content.current_step) || 1, 1), 3);
      failed = "Cancelada";
      break;
    }
    default:
      current = Math.min(Math.max(getCurrentStepFromTransfer(transfer), 1), 4);
  }

  return labels.map((label, index) => {
    let state: StepState;
    if (index < current) state = "done";
    else if (index === current) state = failed ? "failed" : "current";
    else state = failed ? "skipped" : "upcoming";
    const caption =
      state === "done" ? shortDay(dates[index]) : state === "failed" ? failed : state === "current" ? "Pendiente" : null;
    return { key: keys[index], label, state, caption };
  });
}

export interface HistoryEntry {
  key: string;
  icon: IconName;
  title: string;
  at: string | null;
  by: string | null;
  note: string | null;
  tone?: "danger";
}

/** Lo que pasó y quién lo hizo, en orden. */
export function transferHistory(transfer: InventoryTransfer): HistoryEntry[] {
  const status = String(transfer.status);
  const content = contentOf(transfer);
  const entries: HistoryEntry[] = [
    {
      key: "requested",
      icon: "file-document-edit-outline",
      title: "Se pidió",
      at: requestedAt(transfer),
      by: transfer.requested_by_user?.name ?? null,
      note: null,
    },
  ];

  if (wasApproved(transfer)) {
    entries.push({ key: "approved", icon: "check", title: "Se aprobó", at: approvedAt(transfer), by: null, note: null });
  }
  if (wasShipped(transfer) || content.step_2?.status === "shipped") {
    entries.push({
      key: "shipped",
      icon: "truck-delivery-outline",
      title: "Se envió",
      at: shippedAt(transfer),
      by: text(content.workflow?.step_2?.actor_name) || null,
      note: null,
    });
  }
  if (status === "completed") {
    const short = (transfer.details ?? []).some((line) => lineShortage(transfer, line as TransferLine) > 0);
    entries.push({
      key: "received",
      icon: "package-variant-closed-check",
      title: short ? "Se recibió con diferencias" : "Se recibió completa",
      at: receivedAt(transfer),
      by: text(content.workflow?.step_3?.actor_name) || null,
      note: null,
    });
  }
  if (status === "rejected") {
    entries.push({
      key: "rejected",
      icon: "close-circle-outline",
      title: "Se rechazó",
      at: rejectedAt(transfer),
      by: null,
      note: realReason(content.step_1?.reason ?? transfer.rejection_reason),
      tone: "danger",
    });
  }
  if (status === "cancelled") {
    entries.push({
      key: "cancelled",
      icon: "cancel",
      title: "Se canceló",
      at: cancelledAt(transfer),
      by: null,
      note: realReason(content.cancellation?.reason),
      tone: "danger",
    });
  }
  return entries;
}

// ── A quién le toca ─────────────────────────────────────────────────────────

/** Quién ve la transferencia y qué puede hacer (lo decide la pantalla). */
export interface TransferViewer {
  /** La sucursal actual es el origen (surte). */
  isSource: boolean;
  /** La sucursal actual es el destino (pidió). */
  isTarget: boolean;
  /** Tiene transfers_update (aprobar, rechazar, enviar y recibir). */
  canWorkflow: boolean;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Qué significa el estado para el inventario y a quién le toca (el badge ya
 * dice cuál es). `from`/`to`: nombres cortos de las sucursales; la de quien
 * la ve se dice "tu sucursal".
 */
export function statusHint(
  transfer: InventoryTransfer,
  viewer: TransferViewer,
  names: { from: string; to: string },
): string {
  const status = String(transfer.status);
  const from = viewer.isSource ? "tu sucursal" : names.from;
  const to = viewer.isTarget ? "tu sucursal" : names.to;
  const noPermission = (action: string) =>
    `Le toca a tu sucursal ${action}, pero tu usuario no tiene permiso para hacerlo.`;
  switch (status) {
    case "pending":
      if (viewer.isSource) {
        return viewer.canWorkflow
          ? "Te toca aprobarla: revisa cuánto puedes enviar. Aprobar todavía no mueve inventario."
          : noPermission("aprobarla");
      }
      return `Espera que ${from} la apruebe. Todavía no se mueve inventario.`;
    case "approved":
      if (viewer.isSource) {
        return viewer.canWorkflow
          ? "Te toca enviarla: el inventario sale de tu sucursal al registrar el envío."
          : noPermission("enviarla");
      }
      return `${capitalize(from)} ya la aprobó; falta que envíe los productos. Todavía no se mueve inventario.`;
    case "in_transit":
      if (viewer.isTarget) {
        return viewer.canWorkflow
          ? "Te toca recibirla: lo que llegue en buen estado entra al inventario de tu sucursal."
          : noPermission("recibirla");
      }
      return `Va en camino: ya salió del inventario de ${from} y entra al de ${to} cuando la reciban.`;
    case "completed": {
      const short = (transfer.details ?? []).some((line) => lineShortage(transfer, line as TransferLine) > 0);
      return short
        ? `Entró al inventario de ${to} solo lo que llegó bien; la diferencia quedó registrada como ajuste.`
        : `Llegó completa y entró al inventario de ${to}.`;
    }
    case "rejected": {
      const ended = Number(contentOf(transfer).ended_at_step) || 1;
      if (ended >= 3) return `Se rechazó en camino: lo enviado regresó al inventario de ${from}.`;
      return `${capitalize(from)} la rechazó. No se movió inventario.`;
    }
    case "cancelled":
      return cancelledFrom(transfer) === "in_transit"
        ? `Se canceló en camino: lo enviado regresó al inventario de ${from}.`
        : "Se canceló antes de enviarse. No se movió inventario.";
    default:
      return "";
  }
}

// ── Captura de cantidades ───────────────────────────────────────────────────

/** "1,450": un solo grupo de miles, que parseQuantity rechaza por ambiguo. */
const SINGLE_GROUP = /^([1-9]\d{0,2}),(\d{3})$/;

/**
 * Lee una cantidad escrita: el número, o el error que se muestra debajo del
 * campo. `empty` es lo que se pide si está vacío.
 */
export function readQuantity(value: string, empty: string): { value: number | null; error: string | null } {
  const parsed = parseQuantity(value);
  if (parsed === null) {
    // Igual puede ser 1450 piezas que 1.45 kg: se pide sin coma, no se adivina.
    const group = SINGLE_GROUP.exec(value.replace(/\s/g, ""));
    return {
      value: null,
      error: group ? `¿${group[1]}${group[2]} o ${Number(`${group[1]}.${group[2]}`)}? Escríbelo sin coma` : empty,
    };
  }
  if (parsed < 0) return { value: null, error: "No puede ser negativo" };
  // Cuatro decimales, como la columna.
  return { value: Math.round(parsed * 10000) / 10000, error: null };
}

/** El número como se escribe en un campo ("24", "12.5"). */
export const quantityInput = (value: number): string => String(Math.round(value * 10000) / 10000);

/** Nombre corto para los avisos de la barra ("Coco Entero", "Cocada de Nuez…"). */
export const shortName = (name: string, max = 28): string =>
  name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
