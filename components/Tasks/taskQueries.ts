import services from "@/utils/services";

type TaskListParams = Record<string, string | number>;

export interface TaskPage {
  items: App.Entities.Task[];
  /** Total del paginador del backend (no solo lo recibido). */
  total: number;
}

/** Tareas asignadas al usuario (GET /tasks?assigned_to=me&…). */
export async function fetchMyTasks(params: TaskListParams): Promise<TaskPage> {
  const response = await services.tasks.index({
    assigned_to: "me",
    per_page: 100,
    ...params,
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
