import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  type NotificationStatusKey,
  type NotificationTypeKey,
} from "@/components/Notifications/notificationTheme";

/**
 * Helpers de presentacion para notificaciones.
 *
 * Se mantienen las firmas originales (getNotificationSeverityConfig y
 * getNotificationEventConfig) por compatibilidad con la pagina completa
 * de notificaciones, pero ahora delegan en los tokens centralizados en
 * notificationTheme.ts. Ademas se anaden helpers que exponen el sistema
 * nuevo (tipo y estado) directamente, pensado para el popover rediseado.
 */

export type { NotificationStatusKey, NotificationTypeKey };

// ─── Severidad → presentacion legacy ────────────────────────────────────────
// Usado por la pagina completa (lista) que muestra badges por severidad.
// Conserva la firma para no romper consumidores.
export function getNotificationSeverityConfig(
  severity: App.Entities.NotificationSeverity,
) {
  switch (severity) {
    case "success":
      return {
        color: NOTIFICATION_TYPES.purchase.text,
        icon: NOTIFICATION_TYPES.purchase.icon,
        softBg: NOTIFICATION_TYPES.purchase.bgSoft,
        label: "Exito",
      };
    case "error":
      return {
        color: NOTIFICATION_TYPES.alert.text,
        icon: NOTIFICATION_TYPES.alert.icon,
        softBg: NOTIFICATION_TYPES.alert.bgSoft,
        label: "Error",
      };
    case "warning":
      return {
        color: NOTIFICATION_TYPES.inventory.text,
        icon: "alert-outline",
        softBg: NOTIFICATION_TYPES.inventory.bgSoft,
        label: "Aviso",
      };
    case "alert":
      return {
        color: NOTIFICATION_TYPES.alert.text,
        icon: "bell-alert-outline",
        softBg: NOTIFICATION_TYPES.alert.bgSoft,
        label: "Alerta",
      };
    case "info":
    default:
      return {
        color: NOTIFICATION_TYPES.system.text,
        icon: "information-outline",
        softBg: NOTIFICATION_TYPES.system.bgSoft,
        label: "Info",
      };
  }
}

// ─── Event type → presentacion legacy ───────────────────────────────────────
// Mapea los event_type del backend al set de tipos del nuevo popover.
// Se mantiene la firma porque la pagina completa sigue leyendolo.
export function getNotificationEventConfig(eventType: App.Entities.NotificationEventType) {
  const key = eventTypeToTypeKey(eventType);
  const tokens = NOTIFICATION_TYPES[key];
  return {
    icon: tokens.icon,
    label: tokens.label,
    color: tokens.text,
    softBg: tokens.bgSoft,
  };
}

// ─── Helpers nuevos para el popover rediseado ──────────────────────────────

/**
 * Traduce un event_type del backend a una de las 5 categorias visuales.
 * Esto nos permite que el mismo dato (event_type) pinte una "Compra" o
 * una "Tarea" con la misma paleta en cualquier superficie.
 */
export function eventTypeToTypeKey(
  eventType: App.Entities.NotificationEventType | string,
): NotificationTypeKey {
  switch (eventType) {
    case "purchase_update":
    case "purchase_confirmed":
    case "purchase_received":
      return "purchase";
    case "task_event":
    case "task_assigned":
    case "task_completed":
      return "task";
    case "low_stock":
    case "inventory_adjustment":
    case "inventory_count_discrepancy":
    case "inventory_transfer":
    case "transfer_received":
      return "inventory";
    case "system_alert":
    case "alert":
    case "permission_required":
      return "alert";
    case "system":
    case "system_update":
    default:
      return "system";
  }
}

/**
 * Devuelve el estado de una notificacion a partir de sus campos semanticos.
 * Prioridad: overdue > pending > new (no leida) > read. Esto permite que
 * el badge refleje la urgencia real sin que el componente padre tenga que
 * calcularla.
 */
export function resolveNotificationStatus(
  notification: Pick<App.Entities.Notification, "is_read" | "data" | "created_at">,
  now: Date = new Date(),
): NotificationStatusKey {
  if (notification.is_read) return "read";

  // Estados que pueden venir en data.{status|state|kind} segun el evento.
  const data = (notification.data ?? {}) as Record<string, unknown>;
  const explicit = (
    data.status ??
    data.state ??
    data.kind
  ) as string | undefined;
  if (explicit === "overdue" || explicit === "vencida") return "overdue";
  if (explicit === "pending" || explicit === "pendiente") return "pending";

  // Si no hay estado explicito, calculamos "overdue" por antiguedad (>7d).
  const created = new Date(notification.created_at);
  if (!Number.isNaN(created.getTime())) {
    const diffMs = now.getTime() - created.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (diffMs > sevenDays) return "overdue";
  }

  return "new";
}

/**
 * Acceso directo a los tokens del tipo: ahorra un import extra en los
 * subcomponentes y deja el acoplamiento centralizado aqui.
 */
export function getTypeTokens(key: NotificationTypeKey) {
  return NOTIFICATION_TYPES[key];
}

export function getStatusTokens(key: NotificationStatusKey) {
  return NOTIFICATION_STATUSES[key];
}

// ─── Opciones para filtros ──────────────────────────────────────────────────
export const notificationEventOptions: {
  value: "all" | App.Entities.NotificationEventType;
  label: string;
  icon: string;
}[] = [
  { value: "all", label: "Todas", icon: "bell-outline" },
  { value: "low_stock", label: "Stock", icon: "package-variant-remove" },
  { value: "inventory_adjustment", label: "Ajustes", icon: "tune-variant" },
  {
    value: "inventory_count_discrepancy",
    label: "Conteos",
    icon: "clipboard-alert-outline",
  },
  { value: "purchase_update", label: "Compras", icon: "truck-delivery-outline" },
  { value: "task_event", label: "Tareas", icon: "checkbox-marked-circle-outline" },
];

// ─── Formateo de fechas ─────────────────────────────────────────────────────
// Formato corto ("hace 15 min") para el popover, formato largo con hora
// para la pagina completa. Mantenemos la firma original por compatibilidad.
export function formatNotificationDate(value: string, long = false) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  if (long) {
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tiempo relativo corto. "hace 15 min", "hace 3 h", "ayer", "hace 3 d".
 * Pensado para el footer de la tarjeta del popover, donde el ancho
 * esta capado a ~120 px.
 */
export function formatRelativeShort(value: string, now: Date = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} d`;

  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ─── Agrupacion por fecha ──────────────────────────────────────────────────
// Devuelve una clave estable ("today" | "yesterday" | "this_week" |
// "earlier") y un label visible, listos para renderizar encabezados de
// seccion al estilo GitHub/Linear.
export type NotificationGroupKey = "today" | "yesterday" | "this_week" | "earlier";

export function groupNotification(
  value: string,
  now: Date = new Date(),
): { key: NotificationGroupKey; label: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: "earlier", label: "Anterior" };

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000; // ventana de 7 dias contando hoy

  const target = startOfDay(date);

  if (target === todayStart) return { key: "today", label: "Hoy" };
  if (target === yesterdayStart) return { key: "yesterday", label: "Ayer" };
  if (target >= weekStart) return { key: "this_week", label: "Esta semana" };
  return { key: "earlier", label: "Anterior" };
}

export const NOTIFICATION_GROUP_ORDER: NotificationGroupKey[] = [
  "today",
  "yesterday",
  "this_week",
  "earlier",
];

export const NOTIFICATION_GROUP_LABEL: Record<NotificationGroupKey, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  this_week: "Esta semana",
  earlier: "Anterior",
};
