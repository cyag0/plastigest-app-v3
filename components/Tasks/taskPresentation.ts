import palette from "@/constants/palette";

export type TaskStatusFilter = "all" | App.Entities.TaskStatus;
export type TaskPriorityFilter = "all" | App.Entities.TaskPriority;
export type TaskTypeFilter = "all" | App.Entities.TaskType;

export function getTaskPriorityConfig(priority: App.Entities.TaskPriority) {
  switch (priority) {
    case "urgent":
      return {
        label: "Urgente",
        color: palette.error,
        softBg: palette.error + "22",
        icon: "alert-decagram-outline",
      };
    case "high":
      return {
        label: "Alta",
        color: palette.warning,
        softBg: palette.warning + "26",
        icon: "arrow-up-circle-outline",
      };
    case "medium":
      return {
        label: "Media",
        color: palette.blue,
        softBg: palette.blue + "22",
        icon: "minus-circle-outline",
      };
    case "low":
    default:
      return {
        label: "Baja",
        color: palette.textSecondary,
        softBg: palette.surface,
        icon: "arrow-down-circle-outline",
      };
  }
}

export function getTaskStatusConfig(status: App.Entities.TaskStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Pendiente",
        color: palette.warning,
        softBg: palette.warning + "24",
        icon: "clock-outline",
      };
    case "in_progress":
      return {
        label: "En proceso",
        color: palette.blue,
        softBg: palette.blue + "22",
        icon: "progress-clock",
      };
    case "completed":
      return {
        label: "Completada",
        color: palette.success,
        softBg: palette.success + "22",
        icon: "check-circle-outline",
      };
    case "cancelled":
      return {
        label: "Cancelada",
        color: palette.textSecondary,
        softBg: palette.surface,
        icon: "close-circle-outline",
      };
    case "overdue":
      return {
        label: "Vencida",
        color: palette.error,
        softBg: palette.error + "22",
        icon: "calendar-alert",
      };
    default:
      return {
        label: status,
        color: palette.textSecondary,
        softBg: palette.surface,
        icon: "checkbox-marked-circle-outline",
      };
  }
}

export function getTaskTypeConfig(type: App.Entities.TaskType) {
  switch (type) {
    case "inventory_count":
      return {
        label: "Conteo de inventario",
        shortLabel: "Conteo",
        icon: "clipboard-list-outline",
        color: palette.primary,
        softBg: palette.primary + "18",
      };
    case "receive_purchase":
      return {
        label: "Recibir compra",
        shortLabel: "Compra",
        icon: "package-variant-closed-check",
        color: palette.accent,
        softBg: palette.accent + "22",
      };
    case "approve_transfer":
      return {
        label: "Aprobar transferencia",
        shortLabel: "Aprobar",
        icon: "clipboard-check-outline",
        color: palette.success,
        softBg: palette.success + "20",
      };
    case "send_transfer":
      return {
        label: "Enviar transferencia",
        shortLabel: "Enviar",
        icon: "truck-delivery-outline",
        color: palette.blue,
        softBg: palette.blue + "20",
      };
    case "receive_transfer":
      return {
        label: "Recibir transferencia",
        shortLabel: "Recibir",
        icon: "package-down",
        color: palette.primary,
        softBg: palette.primary + "18",
      };
    case "sales_report":
      return {
        label: "Reporte de ventas",
        shortLabel: "Ventas",
        icon: "chart-line",
        color: palette.blue,
        softBg: palette.blue + "20",
      };
    case "stock_check":
      return {
        label: "Verificacion de stock",
        shortLabel: "Stock",
        icon: "magnify-scan",
        color: palette.warning,
        softBg: palette.warning + "24",
      };
    case "adjustment_review":
      return {
        label: "Revisar ajuste",
        shortLabel: "Ajuste",
        icon: "clipboard-edit-outline",
        color: palette.error,
        softBg: palette.error + "18",
      };
    case "custom":
    default:
      return {
        label: "Personalizada",
        shortLabel: "Custom",
        icon: "note-text-outline",
        color: palette.textSecondary,
        softBg: palette.surface,
      };
  }
}

export const taskStatusOptions: { value: TaskStatusFilter; label: string; icon: string }[] = [
  { value: "all", label: "Todas", icon: "format-list-checks" },
  { value: "pending", label: "Pendientes", icon: "clock-outline" },
  { value: "in_progress", label: "En proceso", icon: "progress-clock" },
  { value: "overdue", label: "Vencidas", icon: "calendar-alert" },
  { value: "completed", label: "Completadas", icon: "check-circle-outline" },
];

export const taskPriorityOptions: { value: TaskPriorityFilter; label: string; icon: string }[] = [
  { value: "all", label: "Todas", icon: "flag-outline" },
  { value: "urgent", label: "Urgente", icon: "alert-decagram-outline" },
  { value: "high", label: "Alta", icon: "arrow-up-circle-outline" },
  { value: "medium", label: "Media", icon: "minus-circle-outline" },
  { value: "low", label: "Baja", icon: "arrow-down-circle-outline" },
];

export const taskTypeOptions: { value: TaskTypeFilter; label: string; icon: string }[] = [
  { value: "all", label: "Tipos", icon: "shape-outline" },
  { value: "inventory_count", label: "Conteos", icon: "clipboard-list-outline" },
  { value: "receive_purchase", label: "Compras", icon: "package-variant-closed-check" },
  { value: "approve_transfer", label: "Aprobar", icon: "clipboard-check-outline" },
  { value: "send_transfer", label: "Enviar", icon: "truck-delivery-outline" },
  { value: "receive_transfer", label: "Recibir", icon: "package-down" },
  { value: "stock_check", label: "Stock", icon: "magnify-scan" },
  { value: "adjustment_review", label: "Ajustes", icon: "clipboard-edit-outline" },
  { value: "custom", label: "Custom", icon: "note-text-outline" },
];

export function formatTaskDate(value?: string, long = false) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
    hour: long ? "2-digit" : undefined,
    minute: long ? "2-digit" : undefined,
  });
}

export function getTaskDueDateInfo(task: App.Entities.Task) {
  if (!task.due_date) {
    return null;
  }

  const dueDate = new Date(task.due_date);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (task.is_overdue || task.status === "overdue" || diffDays < 0) {
    return {
      text: `Vencida hace ${Math.abs(diffDays)} dia(s)`,
      color: palette.error,
      softBg: palette.error + "18",
      icon: "calendar-alert",
    };
  }

  if (diffDays === 0) {
    return {
      text: "Vence hoy",
      color: palette.warning,
      softBg: palette.warning + "24",
      icon: "calendar-today",
    };
  }

  if (diffDays === 1) {
    return {
      text: "Vence manana",
      color: palette.warning,
      softBg: palette.warning + "24",
      icon: "calendar-clock",
    };
  }

  if (diffDays <= 7) {
    return {
      text: `Vence en ${diffDays} dias`,
      color: palette.blue,
      softBg: palette.blue + "18",
      icon: "calendar-clock",
    };
  }

  return {
    text: formatTaskDate(task.due_date),
    color: palette.textSecondary,
    softBg: palette.surface,
    icon: "calendar-outline",
  };
}

export function isTaskActionable(task: App.Entities.Task) {
  return task.status !== "completed" && task.status !== "cancelled";
}
