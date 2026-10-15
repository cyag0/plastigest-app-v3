import palette from "@/constants/palette";

// "open" = por hacer (pendientes + en proceso, incluidas las vencidas).
export type TaskStatusFilter = "all" | "open" | App.Entities.TaskStatus;
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
        label: "Verificación de stock",
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

// "Vencidas" no es un status: son las pendientes/en proceso con la fecha
// límite pasada (is_overdue). El backend ya no cambia el status a "overdue".
export const taskStatusOptions: { value: TaskStatusFilter; label: string; icon: string }[] = [
  { value: "open", label: "Por hacer", icon: "clipboard-text-clock-outline" },
  { value: "pending", label: "Pendientes", icon: "clock-outline" },
  { value: "in_progress", label: "En proceso", icon: "progress-clock" },
  { value: "overdue", label: "Vencidas", icon: "calendar-alert" },
  { value: "completed", label: "Completadas", icon: "check-circle-outline" },
  { value: "cancelled", label: "Canceladas", icon: "close-circle-outline" },
  { value: "all", label: "Todas", icon: "format-list-checks" },
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

  // Una tarea cerrada ya no "vence": antes salía "Completada" y a la vez
  // "Vencida hace 62 días".
  if (task.status === "completed" || task.status === "cancelled") {
    return null;
  }

  const dueDate = new Date(task.due_date);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  // Días de calendario (no bloques de 24 h): antes una tarea que vencía hoy
  // a las 18:00 salía "Vence mañana".
  const now = new Date();
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(dueDate) - startOfDay(now)) / (1000 * 60 * 60 * 24),
  );

  if (isTaskOverdue(task, now)) {
    const daysLate = Math.max(0, -diffDays);
    return {
      text:
        daysLate === 0
          ? "Vencida hoy"
          : `Vencida hace ${daysLate} ${daysLate === 1 ? "día" : "días"}`,
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
      text: "Vence mañana",
      color: palette.warning,
      softBg: palette.warning + "24",
      icon: "calendar-clock",
    };
  }

  if (diffDays <= 7) {
    return {
      text: `Vence en ${diffDays} días`,
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

/** Abierta = pendiente o en proceso (o el status "overdue" anterior). */
export const isTaskOpen = isTaskActionable;

/**
 * Vencida: abierta y con la fecha límite pasada. El backend lo manda en
 * is_overdue; el status "overdue" solo queda en registros anteriores.
 */
export function isTaskOverdue(task: App.Entities.Task, now: Date = new Date()) {
  if (!isTaskOpen(task)) return false;
  if (task.is_overdue || task.status === "overdue") return true;
  if (!task.due_date) return false;
  const due = new Date(task.due_date);
  return !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
}

/** El backend solo deja iniciar tareas en status "pending". */
export function canStartTask(task: App.Entities.Task) {
  return task.status === "pending";
}

/**
 * Usuario incrustado en la tarea. Laravel serializa las relaciones
 * assignedTo/assignedBy/completedBy en assigned_to/assigned_by/completed_by
 * (el objeto reemplaza al id); se acepta también la forma camelCase.
 */
export function getTaskUser(
  task: App.Entities.Task,
  key: "assigned_to" | "assigned_by" | "completed_by",
): App.Entities.TaskUserRef | null {
  const value = task[key];
  if (value && typeof value === "object" && "name" in value) return value;
  const camel = {
    assigned_to: task.assignedTo,
    assigned_by: task.assignedBy,
    completed_by: task.completedBy,
  }[key];
  return camel ? { id: camel.id, name: camel.name, email: camel.email } : null;
}

/**
 * Qué puede hacer el usuario con la tarea (misma regla que el backend,
 * TaskController::canWorkOn): con tasks_update, todo; quien la tiene asignada
 * o quien la creó puede iniciarla, completarla y comentarla; cancelarla, solo
 * tasks_update o quien la creó.
 */
export function getTaskPermissions(
  task: App.Entities.Task,
  userId: number | null | undefined,
  hasTasksUpdate: boolean,
): { canAct: boolean; canCancel: boolean } {
  if (hasTasksUpdate) return { canAct: true, canCancel: true };
  const isCreator = !!userId && getTaskUser(task, "assigned_by")?.id === userId;
  const isAssignee = !!userId && getTaskUser(task, "assigned_to")?.id === userId;
  return { canAct: isCreator || isAssignee, canCancel: isCreator };
}

export const TASK_ACTION_MESSAGES: Record<
  "start" | "complete" | "cancel",
  { success: string; error: string }
> = {
  start: { success: "Tarea iniciada", error: "No se pudo iniciar la tarea" },
  complete: { success: "Tarea completada", error: "No se pudo completar la tarea" },
  cancel: { success: "Tarea cancelada", error: "No se pudo cancelar la tarea" },
};

/** Mensaje del backend (403 sin permiso, 400 estado inválido…) o el genérico. */
export function getTaskErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/**
 * Une la tarea que devuelve change-status con la que ya se mostraba: esa
 * respuesta no trae comentarios ni el registro relacionado, y antes el
 * detalle se quedaba "Sin comentarios" después de iniciar o completar.
 */
export function mergeUpdatedTask(
  current: App.Entities.Task,
  updated: Partial<App.Entities.Task> | null | undefined,
): App.Entities.Task {
  if (!updated?.id) return current;
  return {
    ...current,
    ...updated,
    comments: updated.comments ?? current.comments,
    related: updated.related ?? current.related,
    location: updated.location ?? current.location,
  };
}

/** Registro que originó la tarea (compra, transferencia, conteo…). */
export function getTaskRelatedLink(
  task: App.Entities.Task,
): { route: string; label: string } | null {
  const id = task.related_id;
  if (!id || !task.related_type) return null;
  const model = task.related_type.split("\\").pop();
  switch (model) {
    case "PurchaseV2":
      return { route: `/(tabs)/home/purchases/${id}`, label: "Ver compra" };
    case "InventoryTransfer":
      return { route: `/(tabs)/home/transfers/${id}`, label: "Ver transferencia" };
    case "InventoryCount":
      return {
        route: `/(tabs)/inventory/weekly-inventory/${id}`,
        label: "Ver conteo",
      };
    case "InventoryAdjustment":
      return { route: `/(tabs)/home/adjustment/${id}`, label: "Ver ajuste" };
    default:
      return null;
  }
}
