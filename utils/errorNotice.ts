import { isCancel } from "axios";

/**
 * Aviso de error para el usuario cuando falla una petición al API.
 *
 * Antes, si una pantalla no atrapaba el error, sólo aparecía el aviso rojo de
 * Expo (LogBox, y sólo en desarrollo): el usuario no se enteraba. Ahora el
 * interceptor de axios (utils/axios.ts) avisa de toda petición fallida con el
 * mensaje del servidor, en el snackbar de useAlerts, salvo que:
 *
 * - la petición se haya cancelado;
 * - sea un 401 (lo maneja el cierre de sesión) o un 403 de empresa/sucursal
 *   (company_forbidden, company_required, location_forbidden: AuthContext
 *   pide elegir otra);
 * - quien llamó pida `silent: true` porque muestra su propio error;
 * - la pantalla ya haya mostrado un error en cuanto falló la petición (el
 *   aviso global espera un momento por eso: el de la pantalla dice qué falló);
 * - el mismo mensaje haya salido hace unos segundos (varias peticiones con la
 *   misma falla, o el aviso de la pantalla igual al del servidor).
 *
 * Las pantallas que avisan por su cuenta pueden usar `notifyError(error)`:
 * mismo texto y mismas reglas.
 */

export interface ErrorNotice {
  message: string;
}

type ErrorNoticeListener = (notice: ErrorNotice) => void;

/** Lo que espera el aviso global a que la pantalla muestre el suyo. */
const NOTICE_DELAY_MS = 350;
/** El mismo mensaje no se repite dentro de esta ventana. */
const DEDUPE_WINDOW_MS = 4000;

/** 403 que ya se resuelven pidiendo elegir otra empresa o sucursal. */
const HANDLED_FORBIDDEN_CODES = ["company_forbidden", "company_required", "location_forbidden"];

export const GENERIC_ERROR_MESSAGE = "Ocurrió un error. Inténtalo de nuevo.";

/** Respuestas sin mensaje del servidor (los 5xx sin mensaje van aparte). */
const STATUS_MESSAGES: Record<number, string> = {
  400: "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No se encontró lo que buscas; puede que se haya eliminado.",
  409: "La información cambió mientras tanto. Recarga e inténtalo de nuevo.",
  413: "Los datos o el archivo que mandaste son demasiado grandes.",
  422: "Revisa los datos: hay campos con errores.",
  429: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
};

const listeners = new Set<ErrorNoticeListener>();
/** Mensaje → cuándo se mostró (para no repetirlo). */
const shownAt = new Map<string, number>();
/** Último error que mostró una pantalla (alerts.error o notifyError). */
let lastScreenErrorAt = 0;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Primer mensaje de `errors` de un 422 de Laravel ({ campo: [mensajes] }). */
function firstFieldError(errors: unknown): string {
  if (!errors || typeof errors !== "object") return "";
  for (const value of Object.values(errors as Record<string, unknown>)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (text(first)) return text(first);
  }
  return "";
}

/**
 * Texto para el usuario de un error: el mensaje del servidor
 * (response.data.message, si no data.error), con el primer error de campo en
 * un 422, o el texto en español de la falla de red o tiempo agotado (el
 * interceptor ya lo dejó en error.message). Los errores que no son del API
 * (p. ej. un TypeError) dan `fallback`: su texto no le sirve al usuario.
 */
export function errorMessageOf(error: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  if (typeof error === "string") return error.trim() || fallback;
  const e = error as any;
  if (!e || typeof e !== "object") return fallback;

  const response = e.response;
  if (response) {
    const data = response.data;
    const message = text(data?.message) || text(data?.error);
    const fieldError = firstFieldError(data?.errors);
    if (message && fieldError && !message.includes(fieldError)) {
      return `${message}: ${fieldError}`;
    }
    if (message || fieldError) return message || fieldError;
    const status = Number(response.status);
    if (status >= 500) {
      return `El servidor no está disponible en este momento (error ${status}). Inténtalo de nuevo en unos minutos.`;
    }
    return STATUS_MESSAGES[status] ?? fallback;
  }

  // Sin respuesta: red o tiempo agotado (texto en español del interceptor).
  if (e.isAxiosError) return text(e.message) || fallback;
  return fallback;
}

/** La petición se canceló (AbortController, cambio de pantalla…): no es una falla. */
export function isCancelledRequest(error: unknown): boolean {
  const e = error as any;
  if (!e || typeof e !== "object") return false;
  return isCancel(e) || e.code === "ERR_CANCELED" || e.name === "CanceledError" || e.name === "AbortError";
}

/** Falla que ya resuelve otra parte de la app: cancelada, 401 o 403 de empresa/sucursal. */
function isHandledElsewhere(error: unknown): boolean {
  if (isCancelledRequest(error)) return true;
  const response = (error as any)?.response;
  if (!response) return false;
  if (response.status === 401) return true;
  return response.status === 403 && HANDLED_FORBIDDEN_CODES.includes(response.data?.code);
}

/** Falla de una petición al API (con o sin respuesta del servidor). */
export function isApiError(error: unknown): boolean {
  const e = error as any;
  return Boolean(e && typeof e === "object" && (e.isAxiosError || e.name === "AxiosError"));
}

function wasShownRecently(message: string, now: number): boolean {
  const at = shownAt.get(message);
  return at !== undefined && now - at < DEDUPE_WINDOW_MS;
}

function remember(message: string, now: number): void {
  shownAt.set(message, now);
  // La ventana es corta: sólo se guardan los recientes.
  if (shownAt.size > 20) {
    shownAt.forEach((at, key) => {
      if (now - at >= DEDUPE_WINDOW_MS) shownAt.delete(key);
    });
  }
}

function emit(message: string): void {
  const now = Date.now();
  if (wasShownRecently(message, now)) return;
  remember(message, now);
  listeners.forEach((listener) => {
    try {
      listener({ message });
    } catch {
      // Un aviso que no se pudo mostrar no debe romper la petición.
    }
  });
}

/** El host del aviso (AlertsProvider) se suscribe aquí. */
export function subscribeErrorNotices(listener: ErrorNoticeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Lo llama useAlerts al mostrar un error de una pantalla: false si el mismo
 * mensaje acaba de salir (no se repite). Además marca que la pantalla ya
 * avisó, para que el aviso global de esa misma falla no salga encima.
 */
export function claimErrorAlert(message: string): boolean {
  const now = Date.now();
  lastScreenErrorAt = now;
  if (wasShownRecently(message, now)) return false;
  remember(message, now);
  return true;
}

/** El usuario cerró el aviso: si vuelve a fallar, se muestra otra vez. */
export function forgetErrorAlert(message: string): void {
  shownAt.delete(message);
}

/**
 * Muestra el error de una petición en el aviso de la app. Para pantallas que
 * avisan por su cuenta (con `silent: true` o en su catch):
 *
 *   } catch (error) {
 *     notifyError(error, "No se pudo guardar la venta.");
 *   }
 *
 * `fallback` es el texto si el error no trae mensaje del servidor. No muestra
 * nada si la petición se canceló, si es un 401 (se está cerrando la sesión) o
 * un 403 de empresa/sucursal.
 */
export function notifyError(error: unknown, fallback?: string): void {
  if (isHandledElsewhere(error)) return;
  lastScreenErrorAt = Date.now();
  emit(errorMessageOf(error, fallback));
}

/**
 * Aviso global de una petición fallida (lo llama el interceptor de axios).
 * Espera NOTICE_DELAY_MS: si en ese tiempo la pantalla mostró su propio
 * error, no sale.
 */
export function queueRequestErrorNotice(error: unknown): void {
  if (isHandledElsewhere(error) || (error as any)?.config?.silent) return;
  const failedAt = Date.now();
  const message = errorMessageOf(error);
  setTimeout(() => {
    if (lastScreenErrorAt >= failedAt) return;
    emit(message);
  }, NOTICE_DELAY_MS);
}
