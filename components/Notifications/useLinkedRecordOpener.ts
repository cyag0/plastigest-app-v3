import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import { returnAfterLocationSwitch } from "@/components/NavigationHandler";
import type {
  LinkedRecordKind,
  NotificationLink,
} from "@/components/Notifications/notificationLinks";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import axiosClient, { isNetworkError, isTimeoutError } from "@/utils/axios";
import { shortLocationName } from "@/utils/locations";
import { router as globalRouter, useRouter } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

/**
 * Abrir el registro de una tarea o una notificación sin caer en una pantalla
 * con error: antes de navegar se revisa el permiso de la ruta (mapa central),
 * que el registro siga existiendo y en qué sucursal está.
 *
 * - Sin permiso, ya no existe o es de una sucursal a la que el usuario no
 *   entra: no se navega; se regresa el mensaje para mostrarlo en su lugar.
 * - De otra sucursal a la que sí entra (y desde aquí no se puede trabajar):
 *   se ofrece cambiarse y, al terminar el cambio, se abre.
 */

/** Por qué no se abrió: el detalle lo muestra en lugar del botón. */
export type LinkedRecordNote = {
  type: "forbidden" | "gone" | "unavailable";
  message: string;
};

export type LinkedRecordOutcome =
  | { type: "opened" }
  /** Se cambió de sucursal; la ruta se abre al terminar el cambio. */
  | { type: "switched" }
  /** El usuario no quiso cambiar de sucursal. */
  | { type: "cancelled" }
  /** Sin conexión / error del servidor: ya se avisó, se puede reintentar. */
  | { type: "error" }
  | LinkedRecordNote;

export function isLinkedRecordNote(
  outcome: LinkedRecordOutcome | null | undefined,
): outcome is LinkedRecordNote {
  return (
    !!outcome &&
    (outcome.type === "forbidden" || outcome.type === "gone" || outcome.type === "unavailable")
  );
}

// "esta compra": para armar los mensajes; `it` es el pronombre ("abrirla").
const NOUNS: Record<LinkedRecordKind, { this: string; it: string }> = {
  task: { this: "esta tarea", it: "la" },
  purchase: { this: "esta compra", it: "la" },
  transfer: { this: "esta transferencia", it: "la" },
  count: { this: "este conteo", it: "lo" },
  adjustment: { this: "este ajuste", it: "lo" },
  product: { this: "este producto", it: "lo" },
  reminders: { this: "los recordatorios", it: "los" },
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function forbiddenLinkNote(link: NotificationLink): LinkedRecordNote {
  return {
    type: "forbidden",
    message: `No tienes permiso para ver ${NOUNS[link.kind].this}.`,
  };
}

// Endpoint del detalle de cada registro (el mismo que carga su pantalla).
const ENDPOINTS: Record<Exclude<LinkedRecordKind, "reminders">, (id: string) => string> = {
  task: (id) => `/auth/admin/tasks/${id}`,
  purchase: (id) => `/auth/admin/purchases-v2/${id}`,
  transfer: (id) => `/auth/admin/inventory-transfers/${id}`,
  count: (id) => `/auth/admin/inventory-counts/${id}`,
  adjustment: (id) => `/auth/admin/inventory-adjustments/${id}`,
  product: (id) => `/auth/admin/products/${id}`,
};

type FetchResult =
  | { status: "ok"; record: Record<string, any> }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "error"; error: unknown };

/** Desenvuelve { data: { data: {...} } } (la compra viene doblemente envuelta). */
function unwrapRecord(body: any): Record<string, any> {
  let current = body;
  for (let i = 0; i < 3; i++) {
    if (current && typeof current === "object" && current.id === undefined && current.data) {
      current = current.data;
    } else {
      break;
    }
  }
  return current && typeof current === "object" ? current : {};
}

async function fetchRecord(kind: Exclude<LinkedRecordKind, "reminders">, id: string): Promise<FetchResult> {
  try {
    // silent: el resultado se explica aquí, sin el aviso global de error.
    const response = await axiosClient.get(ENDPOINTS[kind](id), { silent: true });
    return { status: "ok", record: unwrapRecord(response.data) };
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) return { status: "not_found" };
    if (status === 403) return { status: "forbidden" };
    return { status: "error", error };
  }
}

type Branch = { id: number; name?: string | null };

/** Sucursal(es) del registro según su respuesta. */
function recordBranches(kind: LinkedRecordKind, record: Record<string, any>): Branch[] {
  const branch = (id: unknown, name: unknown): Branch | null => {
    const value = Number(id);
    return Number.isInteger(value) && value > 0
      ? { id: value, name: typeof name === "string" ? name : null }
      : null;
  };
  const list =
    kind === "transfer"
      ? [
          branch(record.from_location_id ?? record.from_location?.id, record.from_location?.name),
          branch(record.to_location_id ?? record.to_location?.id, record.to_location?.name),
        ]
      : kind === "purchase" || kind === "count" || kind === "adjustment"
        ? [branch(record.location_id ?? record.location?.id, record.location?.name)]
        : [];
  return list.filter((item): item is Branch => item !== null);
}

// Sucursales a las que el usuario puede cambiarse (GET /locations ya las
// recorta: todas con acceso a todas, si no las suyas). Se guardan un rato.
const LOCATIONS_TTL_MS = 5 * 60 * 1000;
let locationsCache: { companyId: number; at: number; list: App.Entities.Location[] } | null = null;

async function accessibleLocations(companyId: number): Promise<App.Entities.Location[] | null> {
  if (
    locationsCache &&
    locationsCache.companyId === companyId &&
    Date.now() - locationsCache.at < LOCATIONS_TTL_MS
  ) {
    return locationsCache.list;
  }
  try {
    // silent: si falla, se explica con la nota de la sucursal.
    const response: any = await axiosClient.get("/auth/admin/locations", {
      params: { company_id: companyId, all: true },
      silent: true,
    });
    const raw = response?.data;
    const list: App.Entities.Location[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : [];
    const active = list.filter((item: any) => item?.is_active !== false);
    locationsCache = { companyId, at: Date.now(), list: active };
    return active;
  } catch {
    return null;
  }
}

/**
 * Abre `route` cuando termina el cambio de sucursal. El cambio desmonta la
 * navegación y NavigationHandler la reinicia ("/" → login → Inicio o la ruta
 * de returnAfterLocationSwitch); ese regreso a veces se pierde (al volver a
 * montar todavía ve la pantalla anterior y lo borra) y se queda en Inicio.
 * Aquí se espera a que la navegación se asiente y se abre con navigate: si
 * ya está en esa ruta no se duplica.
 */
function openAfterSwitch(route: string, pathBefore: string | null) {
  const startedAt = Date.now();
  const settling = () => {
    if (Date.now() - startedAt > 4000) return false;
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return Date.now() - startedAt < 900;
    }
    const path = window.location.pathname;
    return path === "/" || path === "/login" || path === pathBefore;
  };
  const tick = () => {
    if (settling()) {
      setTimeout(tick, 100);
      return;
    }
    setTimeout(() => {
      returnAfterLocationSwitch(null);
      globalRouter.navigate(route as any);
    }, 150);
  };
  setTimeout(tick, 100);
}

export function useLinkedRecordOpener() {
  const router = useRouter();
  const alerts = useAlerts();
  const { canAccessRoute } = useCan();
  const { location, selectedCompany, selectLocation } = useAuth();
  const allLocations = useAllLocationsAccess();

  const currentLocationId = location?.id ? Number(location.id) : null;
  const companyId = selectedCompany?.id ? Number(selectedCompany.id) : null;
  const companyName = selectedCompany?.name ?? null;

  const shortName = useCallback(
    (name?: string | null) => (name ? shortLocationName(name, companyName) : null),
    [companyName],
  );

  /**
   * El registro es de otra sucursal: ofrecer cambiarse a la primera de
   * `branches` a la que el usuario entra; al terminar se abre `route`.
   */
  const offerSwitch = useCallback(
    async (link: NotificationLink, branches: Branch[]): Promise<LinkedRecordOutcome> => {
      const noun = NOUNS[link.kind];
      const list = companyId ? await accessibleLocations(companyId) : null;
      const target = branches
        .map((branch) => list?.find((item) => Number(item.id) === branch.id))
        .find((item): item is App.Entities.Location => !!item);

      if (!target) {
        const name = shortName(branches[0]?.name ?? link.locationName);
        return {
          type: "unavailable",
          message: name
            ? `${capitalize(noun.this)} es de ${name} y no tienes acceso a esa sucursal.`
            : `${capitalize(noun.this)} es de otra sucursal y no tienes acceso a ella.`,
        };
      }

      const targetName = shortName(target.name) ?? target.name;
      const currentName = shortName(location?.name);
      const confirmed = await alerts.confirm(
        `${capitalize(noun.this)} es de ${targetName}${
          currentName ? ` y ahora estás en ${currentName}` : ""
        }. Cámbiate a esa sucursal para abrir${noun.it}.`,
        {
          title: "Es de otra sucursal",
          okText: `Cambiar a ${targetName}`,
          cancelText: "Cancelar",
        },
      );
      if (!confirmed) return { type: "cancelled" };

      // El cambio de sucursal reinicia la navegación: al terminar se abre
      // el registro (NavigationHandler y, si ese regreso se pierde,
      // openAfterSwitch).
      const pathBefore =
        Platform.OS === "web" && typeof window !== "undefined" ? window.location.pathname : null;
      returnAfterLocationSwitch(link.route);
      try {
        await selectLocation(target);
        openAfterSwitch(link.route, pathBefore);
        return { type: "switched" };
      } catch {
        returnAfterLocationSwitch(null);
        alerts.error("No se pudo cambiar de sucursal");
        return { type: "error" };
      }
    },
    [alerts, companyId, location?.name, selectLocation, shortName],
  );

  /**
   * Abre el registro del enlace o explica por qué no. `navigate` permite al
   * padre cerrar su modal antes de navegar (por defecto router.push).
   */
  const open = useCallback(
    async (
      link: NotificationLink,
      options: { navigate?: (route: string) => void } = {},
    ): Promise<LinkedRecordOutcome> => {
      const navigate = options.navigate ?? ((route: string) => router.push(route as any));
      const noun = NOUNS[link.kind];

      // 1. Permiso de la pantalla destino (mismo mapa que el guard).
      if (!canAccessRoute(link.route)) return forbiddenLinkNote(link);

      // La lista de recordatorios no tiene registro que revisar.
      if (link.kind === "reminders" || !link.id) {
        navigate(link.route);
        return { type: "opened" };
      }

      // 2. ¿Sigue existiendo y se puede ver desde esta sucursal?
      const result = await fetchRecord(link.kind, link.id);

      if (result.status === "error") {
        const offline = isNetworkError(result.error) || isTimeoutError(result.error);
        alerts.error(
          offline
            ? `No se pudo abrir ${noun.this}. Revisa tu conexión e intenta de nuevo.`
            : `No se pudo abrir ${noun.this}. Intenta de nuevo en un momento.`,
        );
        return { type: "error" };
      }

      if (result.status === "forbidden") return forbiddenLinkNote(link);

      const knownIds = link.locationIds ?? [];
      const knownBranches: Branch[] = knownIds.map((id, index) => ({
        id,
        name: index === 0 ? link.locationName : null,
      }));
      const inKnownBranch = currentLocationId !== null && knownIds.includes(currentLocationId);

      if (result.status === "ok") {
        // La transferencia se trabaja desde su origen o su destino (la
        // pantalla decide qué puede hacer cada lado con la sucursal actual):
        // desde otra solo se vería, sin poder aprobarla, enviarla ni
        // recibirla. La de una tarea, desde la sucursal de la tarea.
        if (link.kind === "transfer" && currentLocationId !== null) {
          const record = recordBranches("transfer", result.record); // [origen, destino]
          const names = new Map(record.map((branch) => [branch.id, branch.name]));
          // Sin sucursal en el enlace: primero el lado al que va dirigido el aviso.
          const byRecord = link.transferSide === "to" ? [...record].reverse() : record;
          const work = knownBranches.length > 0 ? knownBranches : byRecord;
          if (work.length > 0 && !work.some((branch) => branch.id === currentLocationId)) {
            return offerSwitch(
              link,
              work.map((branch) => ({ ...branch, name: branch.name ?? names.get(branch.id) })),
            );
          }
        }
        navigate(link.route);
        return { type: "opened" };
      }

      // 3. 404. Si se sabe que es de otra sucursal, desde aquí no se ve
      // (quien no entra a todas solo ve lo de la sucursal actual).
      if (knownBranches.length > 0 && currentLocationId !== null && !inKnownBranch) {
        return offerSwitch(link, knownBranches);
      }

      const currentName = shortName(location?.name);
      // Las tareas y los productos son de toda la empresa; quien entra a
      // todas las sucursales ve los de cualquiera: un 404 es que ya no está.
      const surelyGone =
        allLocations || inKnownBranch || link.kind === "task" || link.kind === "product";
      return {
        type: "gone",
        message:
          surelyGone || !currentName
            ? `${capitalize(noun.this)} ya no existe.`
            : `No encontramos ${noun.this} en ${currentName}. Puede que ya no exista o que sea de otra sucursal.`,
      };
    },
    [
      alerts,
      allLocations,
      canAccessRoute,
      currentLocationId,
      location?.name,
      offerSwitch,
      router,
      shortName,
    ],
  );

  return { open };
}
