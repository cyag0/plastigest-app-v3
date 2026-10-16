import axiosClient from "@/utils/axios";

type TaskListParams = Record<string, string | number>;

export interface TaskPage {
  items: App.Entities.Task[];
  /** Total del paginador del backend (no solo lo recibido). */
  total: number;
}

/**
 * Tareas asignadas al usuario (GET /tasks?assigned_to=me&…). Sin aviso
 * global de error: Inicio las refresca en segundo plano y la lista de tareas
 * muestra su propio error.
 */
export async function fetchMyTasks(params: TaskListParams): Promise<TaskPage> {
  const response = await axiosClient.get("/auth/admin/tasks", {
    params: { assigned_to: "me", per_page: 100, ...params },
    silent: true,
  });
  const raw = response.data as any;
  const items: App.Entities.Task[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  const total = Number(raw?.total ?? raw?.meta?.total ?? items.length);
  return { items, total: Number.isFinite(total) ? total : items.length };
}

/**
 * Detalle de una tarea (GET /tasks/{id}) sin el aviso global de error: quien
 * la abre explica el 404 ("ya no existe") con su propio estado.
 */
export async function fetchTask(taskId: number): Promise<App.Entities.Task> {
  const response = await axiosClient.get(`/auth/admin/tasks/${taskId}`, { silent: true });
  const raw = response.data as any;
  return (raw?.data ?? raw) as App.Entities.Task;
}

/** La tarea ya no existe (se borró): el backend responde 404. */
export const isTaskNotFound = (error: any) => error?.response?.status === 404;

/**
 * Crea una tarea de seguimiento sin el aviso global de error (POST /tasks).
 * Para tareas que acompañan otra acción (p. ej. "Preparar pedido" al marcar
 * un pedido como preparando): si no se pudo crear, la acción principal ya se
 * hizo y no hay nada que avisar. Quien llama revisa antes tasks_create.
 */
export async function createFollowUpTask(
  payload: Partial<App.Entities.Task> & Record<string, unknown>,
): Promise<void> {
  await axiosClient.post("/auth/admin/tasks", payload, { silent: true });
}

function dueTime(task: App.Entities.Task) {
  const time = task.due_date ? new Date(task.due_date).getTime() : NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

/** Por fecha límite (las que vencen antes primero; sin fecha al final). */
export function sortByDueDate(tasks: App.Entities.Task[]) {
  return [...tasks].sort((a, b) => dueTime(a) - dueTime(b) || a.id - b.id);
}

export interface OpenTasksResult {
  /** Pendientes + en proceso (incluidas las vencidas), por fecha límite. */
  items: App.Entities.Task[];
  pendingTotal: number;
  inProgressTotal: number;
  /** Solo si se pidió includeOverdue: vencidas según el backend. */
  overdueTotal?: number;
}

/**
 * Tareas "por hacer" del usuario. El backend filtra por un solo status, así
 * que se piden pendientes y en proceso por separado. Una tarea vencida sigue
 * siendo pendiente o en proceso (is_overdue); con includeOverdue también se
 * pide status=overdue, que el backend resuelve por fecha y además trae
 * registros anteriores que aún tengan el status "overdue".
 */
export async function fetchMyOpenTasks({
  perPage = 100,
  includeOverdue = false,
}: { perPage?: number; includeOverdue?: boolean } = {}): Promise<OpenTasksResult> {
  const base = { sort_by: "due_date", sort_order: "asc", per_page: perPage };
  const [pending, inProgress, overdue] = await Promise.all([
    fetchMyTasks({ ...base, status: "pending" }),
    fetchMyTasks({ ...base, status: "in_progress" }),
    includeOverdue
      ? fetchMyTasks({ ...base, status: "overdue" })
      : Promise.resolve(null),
  ]);

  const byId = new Map<number, App.Entities.Task>();
  for (const task of [
    ...pending.items,
    ...inProgress.items,
    ...(overdue?.items ?? []),
  ]) {
    byId.set(task.id, task);
  }

  return {
    items: sortByDueDate([...byId.values()]),
    pendingTotal: pending.total,
    inProgressTotal: inProgress.total,
    overdueTotal: overdue?.total,
  };
}
