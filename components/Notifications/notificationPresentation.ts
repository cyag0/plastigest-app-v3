import palette from "@/constants/palette";

export function getNotificationSeverityConfig(
  severity: App.Entities.NotificationSeverity,
) {
  switch (severity) {
    case "success":
      return {
        color: palette.success,
        icon: "check-circle-outline",
        softBg: palette.success + "22",
        label: "Exito",
      };
    case "error":
      return {
        color: palette.error,
        icon: "alert-circle-outline",
        softBg: palette.error + "22",
        label: "Error",
      };
    case "warning":
      return {
        color: palette.warning,
        icon: "alert-outline",
        softBg: palette.warning + "26",
        label: "Aviso",
      };
    case "alert":
      return {
        color: palette.red,
        icon: "bell-alert-outline",
        softBg: palette.red + "22",
        label: "Alerta",
      };
    case "info":
    default:
      return {
        color: palette.blue,
        icon: "information-outline",
        softBg: palette.blue + "22",
        label: "Info",
      };
  }
}

export function getNotificationEventConfig(
  eventType: App.Entities.NotificationEventType,
) {
  switch (eventType) {
    case "low_stock":
      return {
        icon: "package-variant-remove",
        label: "Stock bajo",
        color: palette.red,
        softBg: palette.red + "18",
      };
    case "inventory_adjustment":
      return {
        icon: "tune-variant",
        label: "Ajuste de inventario",
        color: palette.warning,
        softBg: palette.warning + "20",
      };
    case "inventory_count_discrepancy":
      return {
        icon: "clipboard-alert-outline",
        label: "Diferencia de conteo",
        color: palette.error,
        softBg: palette.error + "18",
      };
    case "purchase_update":
      return {
        icon: "truck-delivery-outline",
        label: "Compra",
        color: palette.primary,
        softBg: palette.primary + "18",
      };
    case "task_event":
      return {
        icon: "checkbox-marked-circle-outline",
        label: "Tarea",
        color: palette.blue,
        softBg: palette.blue + "18",
      };
    default:
      return {
        icon: "bell-outline",
        label: "Notificacion",
        color: palette.textSecondary,
        softBg: palette.surface,
      };
  }
}

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

export function formatNotificationDate(value: string, long = false) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}
