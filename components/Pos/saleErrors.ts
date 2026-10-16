/**
 * Errores de los cobros (punto de venta, venta de mostrador, kiosko, pedidos
 * y abonos): qué mostrarle al usuario y si la venta pudo haber quedado
 * registrada.
 */

/** `code` de los rechazos de negocio del backend (422 {message, code}). */
export const SALE_ERROR_CODES = {
  /** No alcanza la existencia (details: product_name, available, unit…). */
  insufficientStock: "insufficient_stock",
  /** Cobro en efectivo sin turno de caja abierto en la sucursal. */
  noOpenSession: "no_open_session",
  /** El turno abierto del cajero es de otra sucursal (punto de venta). */
  sessionOtherLocation: "session_other_location",
  /** El movimiento de caja pertenece a un turno ya cerrado. */
  closedSession: "closed_session",
  /**
   * La llave de cobro (client_request_id) ya se usó en otra operación (otra
   * sucursal u otro pedido). No se registró nada: el siguiente intento debe
   * llevar una llave NUEVA, o el servidor lo vuelve a rechazar.
   */
  clientRequestConflict: "client_request_conflict",
  /** El pedido del kiosko que se quería cobrar o cancelar ya se cobró o se canceló. */
  kioskOrderUnavailable: "kiosk_order_unavailable",
} as const;

/** `code` de la respuesta de error, si el backend lo mandó. */
export function apiErrorCode(error: any): string | undefined {
  const code = error?.response?.data?.code;
  return typeof code === "string" && code ? code : undefined;
}

/**
 * ¿No se sabe si el servidor guardó la operación? Pasa cuando no llegó
 * respuesta (sin red, timeout, la app se cerró a medio envío) o llegó un error
 * del servidor (5xx, 408, 409): la venta pudo quedar guardada antes de la
 * falla. Un 4xx con respuesta es un rechazo: el servidor no guardó nada.
 *
 * En ese caso hay que verificar (o reintentar con la MISMA llave
 * client_request_id) antes de dejar cobrar otra vez; si no, se cobra doble.
 */
export function isOutcomeUnknown(error: any): boolean {
  const status: number | undefined = error?.response?.status;
  if (!status) return true;
  return status >= 500 || status === 408 || status === 409;
}

/** El servidor tardó más que el timeout de la app. */
export function isTimeout(error: any): boolean {
  return (
    error?.code === "ECONNABORTED" ||
    error?.code === "ETIMEDOUT" ||
    /timeout/i.test(String(error?.message ?? ""))
  );
}

/**
 * Mensaje para el usuario, en español: el primer error de validación, luego
 * `message` (con el detalle de `error` cuando el backend lo manda aparte) y,
 * sin respuesta, uno según la falla. Nunca el "Network Error" de axios.
 */
export function apiErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data;

  if (data && typeof data === "object") {
    const fieldError =
      data.errors && typeof data.errors === "object"
        ? Object.values(data.errors).flat()[0]
        : undefined;
    if (typeof fieldError === "string" && fieldError) return fieldError;

    const message = typeof data.message === "string" ? data.message.trim() : "";
    const detail = typeof data.error === "string" ? data.error.trim() : "";
    if (message && detail && detail !== message) return `${message}: ${detail}`;
    if (message) return message;
    if (detail) return detail;
  }

  if (!error?.response) {
    return isTimeout(error)
      ? "El servidor tardó demasiado en responder."
      : "No hay conexión con el servidor.";
  }

  return fallback;
}
