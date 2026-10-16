import type { Palette } from "@/constants/palette";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Cómo se muestra una notificación: categoría (nombre e ícono), tono según
 * la severidad, sub-tipo, fecha relativa y grupo de fecha. La bandeja, la
 * campana y el detalle usan estos mismos helpers.
 *
 * Los colores salen del tema activo (`notificationToneColor`); antes cada
 * categoría tenía su propia gama de Tailwind (índigo, morado, cian…) que no
 * era de la paleta de la app ni cambiaba en modo oscuro.
 */

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// ─── Categoría ──────────────────────────────────────────────────────────────

const CATEGORIES = {
  purchase: { label: "Compra", icon: "truck-delivery-outline" },
  task: { label: "Tarea", icon: "checkbox-marked-circle-outline" },
  inventory: { label: "Inventario", icon: "package-variant" },
  transfer: { label: "Transferencia", icon: "swap-horizontal" },
  reminder: { label: "Recordatorio", icon: "calendar-clock" },
  alert: { label: "Alerta", icon: "alert-circle-outline" },
  system: { label: "Sistema", icon: "cog-outline" },
} satisfies Record<string, { label: string; icon: IconName }>;

type CategoryKey = keyof typeof CATEGORIES;

function categoryKey(eventType: string): CategoryKey {
  switch (eventType) {
    case "purchase_update":
    case "purchase_confirmed":
    case "purchase_received":
      return "purchase";
    case "task_event":
    case "task_assigned":
    case "task_completed":
      return "task";
    case "transfer_update":
    case "inventory_transfer":
    case "transfer_received":
      return "transfer";
    case "reminder":
      return "reminder";
    case "low_stock":
    case "inventory_adjustment":
    case "inventory_count_discrepancy":
      return "inventory";
    case "system_alert":
    case "alert":
    case "permission_required":
      return "alert";
    default:
      return "system";
  }
}

/** "Inventario", "Tarea", "Transferencia"… */
export function getNotificationCategoryLabel(
  eventType: App.Entities.NotificationEventType | string,
): string {
  return CATEGORIES[categoryKey(eventType)].label;
}

// ─── Tono ───────────────────────────────────────────────────────────────────

/**
 * Color del ícono según la severidad. "info" (la mayoría) queda en el gris
 * normal: solo resaltan las alertas, los avisos y los éxitos.
 */
export function notificationToneColor(
  colors: Palette,
  severity: App.Entities.NotificationSeverity | string,
): string {
  switch (severity) {
    case "alert":
    case "error":
      return colors.error;
    case "warning":
      return colors.warning;
    case "success":
      return colors.success;
    default:
      return colors.textSecondary;
  }
}

// ─── Sub-tipos (data.sub_type) ──────────────────────────────────────────────

const SUB_TYPE_LABELS: Record<string, Record<string, string>> = {
  task_event: {
    assigned: "Asignada",
    completed: "Completada",
    comment: "Comentario",
    due_soon: "Por vencer",
    overdue: "Vencida",
  },
  purchase_update: {
    in_transit: "En tránsito",
    received: "Recibida",
  },
  transfer_update: {
    approved: "Aprobada",
    rejected: "Rechazada",
    shipped: "Enviada",
    received: "Recibida",
    cancelled: "Cancelada",
  },
};

const SUB_TYPE_ICONS: Record<string, Record<string, IconName>> = {
  task_event: {
    assigned: "clipboard-account-outline",
    completed: "check-circle-outline",
    comment: "comment-text-outline",
    due_soon: "clock-alert-outline",
    overdue: "calendar-alert",
  },
  purchase_update: {
    in_transit: "truck-delivery-outline",
    received: "package-variant-closed-check",
  },
  transfer_update: {
    approved: "check-decagram-outline",
    rejected: "close-octagon-outline",
    shipped: "truck-fast-outline",
    received: "package-variant-closed-check",
    cancelled: "cancel",
  },
};

const EVENT_ICONS: Record<string, IconName> = {
  low_stock: "package-variant-remove",
  inventory_adjustment: "tune-variant",
  inventory_count_discrepancy: "clipboard-alert-outline",
  reminder: "calendar-clock",
};

function readSubType(data: unknown): string {
  const value = (data as Record<string, unknown> | null | undefined)?.sub_type;
  return typeof value === "string" ? value : "";
}

/**
 * Etiqueta del sub-tipo ("Por vencer", "Rechazada"…) o null si el evento no
 * tiene o es uno que la app aún no conoce.
 */
export function getNotificationSubTypeLabel(
  eventType: App.Entities.NotificationEventType | string,
  data: unknown,
): string | null {
  const subType = readSubType(data);
  if (!subType) return null;
  return SUB_TYPE_LABELS[eventType]?.[subType] ?? null;
}

/**
 * Icono de la notificación: el del sub-tipo si lo hay (tarea por vencer,
 * transferencia rechazada…), si no el del evento y por último el de la
 * categoría.
 */
export function getNotificationIcon(
  eventType: App.Entities.NotificationEventType | string,
  data: unknown,
): IconName {
  const subType = readSubType(data);
  return (
    (subType && SUB_TYPE_ICONS[eventType]?.[subType]) ||
    EVENT_ICONS[eventType] ||
    CATEGORIES[categoryKey(eventType)].icon
  );
}

// ─── Opciones para filtros ──────────────────────────────────────────────────

export const notificationEventOptions: {
  value: "all" | App.Entities.NotificationEventType;
  label: string;
}[] = [
  { value: "all", label: "Todos" },
  { value: "task_event", label: "Tareas" },
  { value: "transfer_update", label: "Transferencias" },
  { value: "purchase_update", label: "Compras" },
  { value: "low_stock", label: "Stock bajo" },
  { value: "inventory_adjustment", label: "Ajustes" },
  { value: "inventory_count_discrepancy", label: "Conteos" },
  { value: "reminder", label: "Recordatorios" },
];

// ─── Fechas ─────────────────────────────────────────────────────────────────

/**
 * Tiempo relativo corto: "ahora", "hace 15 min", "hace 3 h", "ayer",
 * "hace 3 d" y, de una semana para atrás, la fecha ("17 sep").
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

// ─── Agrupación por fecha ───────────────────────────────────────────────────

export type NotificationGroupKey = "today" | "yesterday" | "this_week" | "earlier";

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
  earlier: "Anteriores",
};

/** Grupo de fecha (días de calendario): hoy, ayer, esta semana o antes. */
export function groupNotification(
  value: string,
  now: Date = new Date(),
): NotificationGroupKey {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "earlier";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000; // 7 días contando hoy

  const target = startOfDay(date);

  if (target === todayStart) return "today";
  if (target === yesterdayStart) return "yesterday";
  if (target >= weekStart) return "this_week";
  return "earlier";
}

/** Agrupa una lista (ya ordenada) en Hoy / Ayer / Esta semana / Anteriores. */
export function groupNotifications<T extends { created_at: string }>(
  items: T[],
  now: Date = new Date(),
): { key: NotificationGroupKey; title: string; data: T[] }[] {
  const buckets = new Map<NotificationGroupKey, T[]>();
  for (const item of items) {
    const key = groupNotification(item.created_at, now);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  return NOTIFICATION_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    title: NOTIFICATION_GROUP_LABEL[key],
    data: buckets.get(key)!,
  }));
}
