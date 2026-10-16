import {
  recordLink,
  type NotificationLink,
} from "@/components/Notifications/notificationLinks";
import { formatDate } from "@/utils/dates";
import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// "open" = por hacer (pendientes + en proceso, incluidas las vencidas).
export type TaskStatusFilter = "all" | "open" | App.Entities.TaskStatus;
export type TaskPriorityFilter = "all" | App.Entities.TaskPriority;
export type TaskTypeFilter = "all" | App.Entities.TaskType;

/**
 * Tono de un dato de la tarea. El componente lo resuelve con los colores del
 * tema activo (antes cada config traía colores fijos de la paleta clara y en
 * modo oscuro no cambiaban).
 */
export type TaskTone = "error" | "warning" | "success" | "muted" | "default";

export function getTaskPriorityConfig(priority: App.Entities.TaskPriority) {
  switch (priority) {
    case "urgent":
      return { label: "Urgente", icon: "alert-decagram-outline" };
    case "high":
      return { label: "Alta", icon: "arrow-up-circle-outline" };
    case "medium":
      return { label: "Media", icon: "minus-circle-outline" };
    case "low":
    default:
      return { label: "Baja", icon: "arrow-down-circle-outline" };
  }
}

export function getTaskStatusConfig(status: App.Entities.TaskStatus) {
  switch (status) {
    case "pending":
      return { label: "Pendiente", icon: "clock-outline" };
    case "in_progress":
      return { label: "En proceso", icon: "progress-clock" };
    case "completed":
      return { label: "Completada", icon: "check-circle-outline" };
    case "cancelled":
      return { label: "Cancelada", icon: "close-circle-outline" };
    case "overdue":
      return { label: "Vencida", icon: "calendar-alert" };
    default:
      return { label: status, icon: "checkbox-marked-circle-outline" };
  }
}

export function getTaskTypeConfig(type: App.Entities.TaskType): {
  label: string;
  icon: IconName;
} {
  switch (type) {
    case "inventory_count":
      return { label: "Conteo de inventario", icon: "clipboard-list-outline" };
    case "receive_purchase":
      return { label: "Recibir compra", icon: "package-variant-closed-check" };
    case "approve_transfer":
      return { label: "Aprobar transferencia", icon: "clipboard-check-outline" };
    case "send_transfer":
      return { label: "Enviar transferencia", icon: "truck-delivery-outline" };
    case "receive_transfer":
      return { label: "Recibir transferencia", icon: "package-down" };
    case "sales_report":
      return { label: "Reporte de ventas", icon: "chart-line" };
    case "stock_check":
      return { label: "Verificación de stock", icon: "magnify-scan" };
    case "adjustment_review":
      return { label: "Revisar ajuste", icon: "clipboard-edit-outline" };
    case "custom":
    default:
      return { label: "Personalizada", icon: "note-text-outline" };
  }
}

/**
 * Ícono del estado, el mismo en Inicio, la lista y el detalle: vencida
 * (alarma), en proceso, pendiente (círculo vacío), completada o cancelada.
 */
export function getTaskStateIcon(task: App.Entities.Task): {
  icon: IconName;
  tone: TaskTone;
} {
  if (task.status === "completed") return { icon: "check-circle-outline", tone: "success" };
  if (task.status === "cancelled") return { icon: "close-circle-outline", tone: "muted" };
  if (isTaskOverdue(task)) return { icon: "alarm", tone: "error" };
  if (task.status === "in_progress") return { icon: "progress-clock", tone: "default" };
  return { icon: "checkbox-blank-circle-outline", tone: "default" };
}

/**
 * Línea de estado de la tarea: "Pendiente · Urgente" más la fecha límite
 * ("Vencida hace 3 días"), que va aparte para poder resaltarla.
 */
export function getTaskStatusLine(task: App.Entities.Task): {
  text: string;
  due: { text: string; tone: TaskTone } | null;
} {
  const status = getTaskStatusConfig(task.status).label;
  if (task.status === "completed") {
    return {
      text: task.completed_at ? `${status} el ${formatDate(task.completed_at)}` : status,
      due: null,
    };
  }
  if (task.status === "cancelled") return { text: status, due: null };

  const due = getTaskDueDateInfo(task);
  return {
    text: `${status} · ${getTaskPriorityConfig(task.priority).label}`,
    due: due ? { text: due.text, tone: due.tone } : null,
  };
}

// "Vencidas" no es un status: son las pendientes/en proceso con la fecha
// límite pasada (is_overdue). El backend ya no cambia el status a "overdue".
export const taskStatusOptions: { value: TaskStatusFilter; label: string }[] = [
  { value: "open", label: "Por hacer" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En proceso" },
  { value: "overdue", label: "Vencidas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "all", label: "Todas" },
];

export const taskPriorityOptions: { value: TaskPriorityFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export const taskTypeOptions: { value: TaskTypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "inventory_count", label: "Conteos" },
  { value: "receive_purchase", label: "Recibir compra" },
  { value: "approve_transfer", label: "Aprobar transferencia" },
  { value: "send_transfer", label: "Enviar transferencia" },
  { value: "receive_transfer", label: "Recibir transferencia" },
  { value: "stock_check", label: "Verificación de stock" },
  { value: "adjustment_review", label: "Revisar ajuste" },
  { value: "custom", label: "Personalizadas" },
];

export function getTaskDueDateInfo(
  task: App.Entities.Task,
): { text: string; tone: TaskTone } | null {
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
      tone: "error",
    };
  }

  if (diffDays === 0) return { text: "Vence hoy", tone: "warning" };
  if (diffDays === 1) return { text: "Vence mañana", tone: "warning" };
  if (diffDays <= 7) return { text: `Vence en ${diffDays} días`, tone: "default" };
  return { text: `Vence el ${formatDate(task.due_date)}`, tone: "default" };
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

// Modelo del backend (related_type) → tipo de registro que abre la app.
const RELATED_KINDS: Record<string, "purchase" | "transfer" | "count" | "adjustment"> = {
  PurchaseV2: "purchase",
  InventoryTransfer: "transfer",
  InventoryCount: "count",
  // El ajuste de inventario es un renglón: InventoryAdjustmentDetail (la
  // pantalla /home/adjustment/{id} abre ese id).
  InventoryAdjustmentDetail: "adjustment",
  InventoryAdjustment: "adjustment",
};

/**
 * Registro que originó la tarea (compra, transferencia, conteo, ajuste), con
 * la sucursal de la tarea: ahí se trabaja (recibir la compra o la
 * transferencia, revisar el conteo). `gone`: el backend mandó la relación
 * vacía, el registro ya no existe.
 */
export function getTaskRelatedLink(
  task: App.Entities.Task,
): (NotificationLink & { gone: boolean }) | null {
  const id = task.related_id;
  if (!id || !task.related_type) return null;
  const model = task.related_type.split("\\").pop() ?? "";
  const kind = RELATED_KINDS[model];
  if (!kind) return null;
  const locationId = Number(task.location_id ?? task.location?.id);
  const link = recordLink(
    kind,
    id,
    Number.isInteger(locationId) && locationId > 0 ? [locationId] : undefined,
    task.location?.name,
  );
  // "related" solo cuenta si vino en la respuesta (show e index lo cargan).
  const gone = "related" in task && task.related === null;
  return { ...link, gone };
}
