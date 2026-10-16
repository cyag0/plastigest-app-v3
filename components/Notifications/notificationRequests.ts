import axiosClient from "@/utils/axios";

/**
 * Peticiones de notificaciones que corren en segundo plano o cuyo error la
 * pantalla ya explica en línea ("ya no existe", "no se pudieron cargar…"):
 * van con `silent: true` para que no salga además el aviso global de error
 * (utils/errorNotice). Las acciones del usuario (marcar todas, eliminar…)
 * siguen en services.notifications.
 */

const NOTIFICATIONS = "/auth/admin/notifications";
const PREFERENCES = "/auth/admin/notification-preferences";

/** Marca como leída al abrir el aviso, en segundo plano: si falla, nada. */
export async function markNotificationReadQuietly(id: number) {
  const response = await axiosClient.post(`${NOTIFICATIONS}/${id}/mark-as-read`, undefined, {
    silent: true,
  });
  return response.data;
}

/** Detalle de una notificación (el 404 lo explica la pantalla). */
export async function fetchNotification(id: number): Promise<App.Entities.Notification> {
  const response = await axiosClient.get(`${NOTIFICATIONS}/${id}`, { silent: true });
  // El show devuelve la notificación sin envolver y ésta trae su propio
  // campo `data` (el payload del evento): no confundirlo con un wrapper.
  const body = response.data as any;
  return body && body.id !== undefined ? body : body?.data;
}

/** Preferencias de la empresa o de la sucursal (error en línea en la pantalla). */
export async function fetchNotificationPreferences(scope?: "location") {
  const response = await axiosClient.get(PREFERENCES, {
    params: scope ? { scope } : undefined,
    silent: true,
  });
  return response.data;
}

/**
 * Usuarios que pueden recibir un aviso. Se piden en segundo plano: si falla,
 * la pantalla deja el evento sin lista de usuarios.
 */
export async function fetchEligibleUsersQuietly(
  eventType: App.Entities.NotificationEventType,
  params?: { location_id?: number; scope?: "location" },
) {
  const response = await axiosClient.get(`${PREFERENCES}/${eventType}/eligible-users`, {
    params,
    silent: true,
  });
  return response.data;
}
