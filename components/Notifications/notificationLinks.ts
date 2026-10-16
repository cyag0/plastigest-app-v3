/**
 * A qué pantalla lleva cada notificación. Lo usan la bandeja, el popover de la
 * campana y los push tocados (nativo y web), para que las tres superficies
 * abran lo mismo.
 *
 * El `data` es el payload del evento: el mismo en la notificación guardada
 * (bandeja/campana) y en el push. En el push FCM todos los valores llegan como
 * string y los nulos como "" (FCM no admite null), por eso los ids se
 * normalizan aquí.
 *
 * IMPORTANTE: mantener sincronizado con routeForNotification() de
 * public/firebase-messaging-sw.js (allá van las mismas rutas pero en formato
 * URL web, sin los grupos "(tabs)").
 */

type NotificationData = Record<string, unknown> | null | undefined;

export interface NotificationLink {
  /** Ruta de expo-router, p. ej. "/(tabs)/tasks/12". */
  route: string;
  /** Texto del botón que abre la ruta, p. ej. "Ver tarea". */
  label: string;
}

export const NOTIFICATIONS_INBOX_ROUTE = "/(tabs)/notifications";

/**
 * Preferencias de notificaciones. Quien no entra a todas las sucursales solo
 * puede cambiar las de su sucursal (el servidor rechaza las de la empresa con
 * company_scope_forbidden): abre esas.
 */
export function notificationPreferencesRoute(allLocations: boolean, hasLocation: boolean): string {
  return !allLocations && hasLocation
    ? "/(stacks)/notification-preferences?scope=location"
    : "/(stacks)/notification-preferences";
}

export function notificationDetailRoute(id: number | string) {
  return `${NOTIFICATIONS_INBOX_ROUTE}/${id}`;
}

/**
 * Id de entidad válido como string, o null si falta ("", "null", 0…).
 * Solo se aceptan enteros positivos: van directo a una ruta.
 */
export function readEntityId(data: NotificationData, key: string): string | null {
  const raw = data?.[key];
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim();
  if (!/^\d+$/.test(value) || Number(value) <= 0) return null;
  return value;
}

const link = (route: string, label: string): NotificationLink => ({
  route,
  label,
});

// Para tipos de evento que esta versión de la app aún no conoce: se intenta
// por la llave del id que traiga el payload.
const GENERIC_LINKS: {
  key: string;
  build: (id: string) => NotificationLink;
}[] = [
  { key: "task_id", build: (id) => link(`/(tabs)/tasks/${id}`, "Ver tarea") },
  {
    key: "transfer_id",
    build: (id) => link(`/(tabs)/home/transfers/${id}`, "Ver transferencia"),
  },
  {
    key: "purchase_id",
    build: (id) => link(`/(tabs)/home/purchases/${id}`, "Ver compra"),
  },
  {
    key: "inventory_count_id",
    build: (id) => link(`/(tabs)/inventory/weekly-inventory/${id}`, "Ver conteo"),
  },
  {
    key: "adjustment_id",
    build: (id) => link(`/(tabs)/home/adjustment/${id}`, "Ver ajuste"),
  },
  {
    key: "product_id",
    build: (id) => link(`/(tabs)/inventory/products/${id}`, "Ver producto"),
  },
  {
    key: "reminder_id",
    build: () => link("/(tabs)/home/reminders", "Ver recordatorios"),
  },
];

/**
 * Pantalla del registro relacionado con la notificación, o null si el payload
 * no trae el id (entonces se muestra el detalle de la notificación).
 */
export function getNotificationLink(
  eventType: string | null | undefined,
  data: NotificationData,
): NotificationLink | null {
  const id = (key: string) => readEntityId(data, key);
  const type =
    eventType || (typeof data?.event_type === "string" ? data.event_type : "");

  switch (type) {
    case "task_event": {
      const taskId = id("task_id");
      return taskId ? link(`/(tabs)/tasks/${taskId}`, "Ver tarea") : null;
    }
    case "purchase_update": {
      const purchaseId = id("purchase_id");
      return purchaseId
        ? link(`/(tabs)/home/purchases/${purchaseId}`, "Ver compra")
        : null;
    }
    case "low_stock": {
      const productId = id("product_id");
      return productId
        ? link(`/(tabs)/inventory/products/${productId}`, "Ver producto")
        : null;
    }
    case "inventory_adjustment": {
      const adjustmentId = id("adjustment_id");
      if (adjustmentId) {
        return link(`/(tabs)/home/adjustment/${adjustmentId}`, "Ver ajuste");
      }
      // Avisos anteriores solo traen el producto ajustado.
      const productId = id("product_id");
      return productId
        ? link(`/(tabs)/inventory/products/${productId}`, "Ver producto")
        : null;
    }
    case "inventory_count_discrepancy": {
      const countId = id("inventory_count_id");
      return countId
        ? link(`/(tabs)/inventory/weekly-inventory/${countId}`, "Ver conteo")
        : null;
    }
    case "transfer_update": {
      const transferId = id("transfer_id");
      return transferId
        ? link(`/(tabs)/home/transfers/${transferId}`, "Ver transferencia")
        : null;
    }
    case "reminder":
      // La lista de recordatorios es el destino (no hay pantalla de detalle).
      return link("/(tabs)/home/reminders", "Ver recordatorios");
    default: {
      for (const candidate of GENERIC_LINKS) {
        const value = id(candidate.key);
        if (value) return candidate.build(value);
      }
      return null;
    }
  }
}

/** Id de la entidad a la que lleva la notificación (para logs y el bus). */
export function getNotificationEntityId(
  eventType: string | null | undefined,
  data: NotificationData,
): string | undefined {
  const target = getNotificationLink(eventType, data);
  if (!target) return undefined;
  const match = target.route.match(/\/(\d+)$/);
  return match?.[1];
}

/**
 * Destino al tocar un push: la pantalla del registro; si el payload no trae
 * el id, el detalle de la notificación (cuando el push incluye
 * notification_id) o, si tampoco, la bandeja.
 */
export function resolvePushRoute(
  eventType: string | null | undefined,
  data: NotificationData,
): string {
  const target = getNotificationLink(eventType, data);
  if (target) return target.route;
  const notificationId = readEntityId(data, "notification_id");
  return notificationId
    ? notificationDetailRoute(notificationId)
    : NOTIFICATIONS_INBOX_ROUTE;
}
