/**
 * Estados de cada módulo: su etiqueta y su tono de badge (StatusBadge).
 *
 * Un mismo significado lleva el mismo tono en toda la app:
 * - success: terminó bien (Cerrada, Pagado, Completada, Recibido, Entregado…)
 * - info:    en curso, sin que el usuario tenga que hacer algo (Aprobada,
 *            En tránsito, Preparando, En empaque, Turno abierto…)
 * - warning: pendiente o requiere atención (Pendiente, Parcial)
 * - danger:  se anuló o falló (Cancelada, Rechazada, Pago pendiente, Vencido)
 * - neutral: sin juicio (Borrador, Inactivo, Turno cerrado, Planificación)
 *
 * Los valores son los de los enums del backend (app/Enums/*Status.php).
 * Uso: <StatusBadge {...saleStatus(sale.status)} />
 */

import type { BadgeTone } from "@/components/App/StatusBadge";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

export interface StatusInfo {
  label: string;
  tone: BadgeTone;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Estado desconocido: se muestra tal cual llegó, en neutro. */
function lookup(map: Record<string, StatusInfo>) {
  return (value?: string | null): StatusInfo =>
    (value ? map[value] : undefined) ?? { label: value || "—", tone: "neutral" };
}

export const saleStatus = lookup({
  closed: { label: "Cerrada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
});

export const paymentStatus = lookup({
  paid: { label: "Pagado", tone: "success" },
  partial: { label: "Parcial", tone: "warning" },
  pending: { label: "Pendiente", tone: "danger" },
});

export const salesOrderStatus = lookup({
  pending: { label: "Pendiente", tone: "warning" },
  preparing: { label: "Preparando", tone: "info" },
  in_transit: { label: "En tránsito", tone: "info" },
  delivered: { label: "Entregado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
});

export const purchaseStatus = lookup({
  draft: { label: "Borrador", tone: "neutral" },
  ordered: { label: "Pedido", tone: "info" },
  in_transit: { label: "En tránsito", tone: "info" },
  received: { label: "Recibido", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
});

export const transferStatus = lookup({
  pending: { label: "Pendiente", tone: "warning" },
  approved: { label: "Aprobada", tone: "info" },
  in_transit: { label: "En tránsito", tone: "info" },
  completed: { label: "Completada", tone: "success" },
  rejected: { label: "Rechazada", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "danger" },
});

export const adjustmentStatus = lookup({
  draft: { label: "Borrador", tone: "neutral" },
  applied: { label: "Aplicado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
});

export const productionStatus = lookup({
  draft: { label: "Borrador", tone: "neutral" },
  completed: { label: "Producción terminada", tone: "success" },
  packaging: { label: "En empaque", tone: "info" },
  packed: { label: "Empacada", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
});

/** Inventario semanal (conteos). */
export const inventoryCountStatus = lookup({
  planning: { label: "Planificación", tone: "neutral" },
  counting: { label: "Contando", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
});

export const cashSessionStatus = lookup({
  open: { label: "Abierto", tone: "info" },
  closed: { label: "Cerrado", tone: "neutral" },
});

/** Activo / inactivo de un catálogo ("Activa" para sucursal, categoría…). */
export function activeStatus(active: boolean, feminine = false): StatusInfo {
  const ending = feminine ? "a" : "o";
  return active
    ? { label: `Activ${ending}`, tone: "success" }
    : { label: `Inactiv${ending}`, tone: "neutral" };
}

/** Método de pago: es un atributo, va con IconLabel (no es un estado). */
export function paymentMethod(value?: string | null): { label: string; icon: IconName } {
  switch (value) {
    case "cash":
      return { label: "Efectivo", icon: "cash" };
    case "card":
      return { label: "Tarjeta", icon: "credit-card-outline" };
    case "transfer":
      return { label: "Transferencia", icon: "bank-transfer" };
    case "credit":
      return { label: "Crédito", icon: "account-clock-outline" };
    case "mixed":
      return { label: "Mixto", icon: "swap-horizontal" };
    default:
      return { label: value || "—", icon: "cash" };
  }
}
