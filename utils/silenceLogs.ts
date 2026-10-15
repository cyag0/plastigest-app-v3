/**
 * En producción se callan console.log/info/debug: la app tiene decenas de
 * logs de depuración (algunos con respuestas completas de la API) que en web
 * quedan a la vista en la consola del navegador. warn y error se conservan,
 * pero limpios: muchas pantallas hacen `console.error("…", error)` con el
 * error de axios completo, cuyo config.headers trae el token
 * (Authorization: Bearer …). Ese objeto se reduce a estado, método, ruta y
 * mensaje, y en textos y objetos se ocultan tokens y contraseñas.
 *
 * Se importa primero en app/_layout.tsx.
 */

const SENSITIVE_KEY =
  /^(authorization|access_token|refresh_token|token|password|password_confirmation|current_password|new_password|new_password_confirmation)$/i;
const BEARER = /Bearer\s+[A-Za-z0-9._|~+/=-]+/g;

function summarizeAxiosError(error: any): string {
  const status = error.response?.status ?? error.code ?? "sin respuesta";
  const method = String(error.config?.method ?? "get").toUpperCase();
  const url = String(error.config?.url ?? "").split("?")[0];
  const serverMessage =
    typeof error.response?.data?.message === "string"
      ? error.response.data.message
      : undefined;
  return `[AxiosError ${status}] ${method} ${url}: ${serverMessage ?? error.message}`;
}

function sanitize(value: unknown, depth: number): unknown {
  if (typeof value === "string") return value.replace(BEARER, "Bearer ***");
  if (!value || typeof value !== "object") return value;

  const candidate = value as any;
  if (candidate.isAxiosError || (candidate.config && "request" in candidate)) {
    return summarizeAxiosError(candidate);
  }
  if (value instanceof Error || depth >= 3) return value;

  if (Array.isArray(value)) {
    return value.length > 50 ? value : value.map((item) => sanitize(item, depth + 1));
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of entries) {
    copy[key] = SENSITIVE_KEY.test(key) ? "***" : sanitize(item, depth + 1);
  }
  return copy;
}

function withSanitizedArgs(original: (...args: unknown[]) => void) {
  return (...args: unknown[]) => {
    let cleaned: unknown[];
    try {
      cleaned = args.map((arg) => sanitize(arg, 0));
    } catch {
      // Si algo falla al limpiar, mejor no imprimir el original.
      cleaned = ["[log omitido]"];
    }
    original(...cleaned);
  };
}

if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = withSanitizedArgs(console.warn.bind(console));
  console.error = withSanitizedArgs(console.error.bind(console));
}

export {};
