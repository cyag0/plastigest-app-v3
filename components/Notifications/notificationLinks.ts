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
 * IMPORTANTE: mantener las rutas sincronizadas con routeForNotification()
 * de public/firebase-messaging-sw.js (allá van en formato URL web, sin los
 * grupos "(tabs)").
 */

type NotificationData = Record<string, unknown> | null | undefined;

/**
 * Qué registro abre el enlace. Con el tipo se revisa, antes de navegar, que
 * el registro siga existiendo, que el usuario pueda verlo y en qué sucursal
 * está (ver useLinkedRecordOpener). "reminders" abre la lista (no hay
 * detalle de un recordatorio).
 */
export type LinkedRecordKind =
  | "task"
  | "purchase"
  | "transfer"
  | "count"
  | "adjustment"
  | "product"
  | "reminders";

export interface NotificationLink {
  /** Ruta de expo-router, p. ej. "/(tabs)/tasks/12". */
  route: string;
  /** Texto del botón que abre la ruta, p. ej. "Ver tarea". */
  label: string;
  kind: LinkedRecordKind;
  /** Id del registro (sin id en "reminders"). */
  id?: string;
  /**
   * Sucursal donde se trabaja el registro, si se sabe: location_id del aviso
   * o la sucursal de la tarea. En una transferencia pueden ser dos (origen y
   * destino); la primera es la preferida al ofrecer el cambio de sucursal.
   */
  locationIds?: number[];
  /** Nombre de esa sucursal, si se sabe (la tarea lo trae). */
  locationName?: string | null;
  /**
   * Transferencia sin sucursales en el aviso: a qué lado conviene cambiarse
   * si la sucursal actual no es ni el origen ni el destino.
   */
  transferSide?: "from" | "to";
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
 * Detalle de la notificación que abre solo su registro al cargar (push
 * tocado, aviso que no se pudo abrir desde la lista): si el registro ya no
 * existe, es de otra sucursal o no hay permiso, el detalle lo explica en
 * lugar de navegar a una pantalla con error.
 */
export function notificationOpenRoute(id: number | string) {
  return `${notificationDetailRoute(id)}?open=1`;
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

/** Sucursales del aviso (en orden de preferencia), sin repetir ni vacías. */
function readLocationIds(data: NotificationData, keys: string[]): number[] | undefined {
  const ids = keys
    .map((key) => readEntityId(data, key))
    .filter((value): value is string => value !== null)
    .map(Number);
  const unique = [...new Set(ids)];
  return unique.length > 0 ? unique : undefined;
}

// Ruta y texto del botón de cada tipo de registro.
const RECORD_LINKS: Record<
  Exclude<LinkedRecordKind, "reminders">,
  { route: (id: string) => string; label: string }
> = {
  task: { route: (id) => `/(tabs)/tasks/${id}`, label: "Ver tarea" },
  purchase: { route: (id) => `/(tabs)/home/purchases/${id}`, label: "Ver compra" },
  transfer: { route: (id) => `/(tabs)/home/transfers/${id}`, label: "Ver transferencia" },
  count: { route: (id) => `/(tabs)/inventory/weekly-inventory/${id}`, label: "Ver conteo" },
  adjustment: { route: (id) => `/(tabs)/home/adjustment/${id}`, label: "Ver ajuste" },
  product: { route: (id) => `/(tabs)/inventory/products/${id}`, label: "Ver producto" },
};

export const REMINDERS_ROUTE = "/(tabs)/home/reminders";

/** Enlace al registro `kind` con id `id` (y su sucursal, si se sabe). */
export function recordLink(
  kind: Exclude<LinkedRecordKind, "reminders">,
  id: string | number,
  locationIds?: number[],
  locationName?: string | null,
): NotificationLink {
  const config = RECORD_LINKS[kind];
  const value = String(id);
  return {
    route: config.route(value),
    label: config.label,
    kind,
    id: value,
    ...(locationIds && locationIds.length > 0 ? { locationIds } : {}),
    ...(locationName ? { locationName } : {}),
  };
}

const remindersLink = (): NotificationLink => ({
  route: REMINDERS_ROUTE,
  label: "Ver recordatorios",
  kind: "reminders",
});

// Para tipos de evento que esta versión de la app aún no conoce: se intenta
// por la llave del id que traiga el payload.
const GENERIC_KEYS: [string, Exclude<LinkedRecordKind, "reminders">][] = [
  ["task_id", "task"],
  ["transfer_id", "transfer"],
  ["purchase_id", "purchase"],
  ["inventory_count_id", "count"],
  ["adjustment_id", "adjustment"],
  ["product_id", "product"],
];

/**
 * Enlace a una transferencia según el aviso: aprobada/rechazada/en camino le
 * llega a quien la pidió (destino) y recibida, a quien la envió (origen); a
 * ese lado conviene cambiarse. El payload todavía no trae origen ni destino
 * (se leen si algún día llegan); sin ellos el lado se toma del registro.
 */
function transferLink(transferId: string, data: NotificationData): NotificationLink {
  const subType = typeof data?.sub_type === "string" ? data.sub_type : "";
  const side: "from" | "to" | undefined =
    subType === "received"
      ? "from"
      : ["approved", "rejected", "shipped"].includes(subType)
        ? "to"
        : undefined;
  const keys =
    side === "from"
      ? ["from_location_id", "to_location_id"]
      : ["to_location_id", "from_location_id"];
  return {
    ...recordLink("transfer", transferId, readLocationIds(data, keys)),
    ...(side ? { transferSide: side } : {}),
  };
}

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
  // Sucursal del aviso (stock bajo, ajuste, conteo). La compra no la trae.
  const location = readLocationIds(data, ["location_id"]);

  switch (type) {
    case "task_event": {
      const taskId = id("task_id");
      return taskId ? recordLink("task", taskId) : null;
    }
    case "purchase_update": {
      const purchaseId = id("purchase_id");
      return purchaseId ? recordLink("purchase", purchaseId, location) : null;
    }
    case "low_stock": {
      const productId = id("product_id");
      return productId ? recordLink("product", productId, location) : null;
    }
    case "inventory_adjustment": {
      const adjustmentId = id("adjustment_id");
      if (adjustmentId) return recordLink("adjustment", adjustmentId, location);
      // Avisos anteriores solo traen el producto ajustado.
      const productId = id("product_id");
      return productId ? recordLink("product", productId, location) : null;
    }
    case "inventory_count_discrepancy": {
      const countId = id("inventory_count_id");
      return countId ? recordLink("count", countId, location) : null;
    }
    case "transfer_update": {
      const transferId = id("transfer_id");
      return transferId ? transferLink(transferId, data) : null;
    }
    case "reminder":
      // La lista de recordatorios es el destino (no hay pantalla de detalle).
      return remindersLink();
    default: {
      for (const [key, kind] of GENERIC_KEYS) {
        const value = id(key);
        if (value) {
          return kind === "transfer" ? transferLink(value, data) : recordLink(kind, value, location);
        }
      }
      return id("reminder_id") ? remindersLink() : null;
    }
  }
}

/** Id de la entidad a la que lleva la notificación (para logs y el bus). */
export function getNotificationEntityId(
  eventType: string | null | undefined,
  data: NotificationData,
): string | undefined {
  return getNotificationLink(eventType, data)?.id;
}

/**
 * Destino al tocar un push dentro de la app (nativo, o web con la pestaña
 * abierta): si el push trae notification_id, el detalle de esa notificación,
 * que abre solo su registro al cargar (notificationOpenRoute) y, si no se
 * puede abrir (ya no existe, otra sucursal, sin permiso), lo explica ahí. Sin
 * notification_id (el aviso no se guardó en la bandeja): la pantalla del
 * registro o, si el payload no trae su id, la bandeja.
 *
 * El service worker (public/firebase-messaging-sw.js), cuando no hay pestaña
 * abierta, abre directo la URL del registro: ahí la protege el guard de rutas.
 */
export function resolvePushRoute(
  eventType: string | null | undefined,
  data: NotificationData,
): string {
  const notificationId = readEntityId(data, "notification_id");
  const target = getNotificationLink(eventType, data);
  if (notificationId) {
    return target ? notificationOpenRoute(notificationId) : notificationDetailRoute(notificationId);
  }
  return target ? target.route : NOTIFICATIONS_INBOX_ROUTE;
}
