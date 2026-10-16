/**
 * En producción se callan console.log/info/debug: la app tiene decenas de
 * logs de depuración (algunos con respuestas completas de la API) que en web
 * quedan a la vista en la consola del navegador. warn y error se conservan,
 * pero limpios: muchas pantallas hacen `console.error("…", error)` con el
 * error de axios completo, cuyo config.headers trae el token
 * (Authorization: Bearer …). Ese objeto se reduce a estado, método, ruta y
 * mensaje, y en textos y objetos se ocultan tokens y contraseñas.
 *
 * En desarrollo (sobre todo en el teléfono) console.error abre el aviso rojo de
 * LogBox. Una falla del API no es un error de la app: el usuario ya la ve en
 * el aviso de la app (utils/errorNotice). Por eso esas fallas se registran con
 * logHandledError y un console.error que trae un error de axios se registra
 * igual; lo demás (errores de verdad) sigue llegando a LogBox.
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

function isAxiosError(value: unknown): boolean {
  const candidate = value as any;
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      (candidate.isAxiosError || (candidate.config && "request" in candidate)),
  );
}

// Referencias propias: console.info se calla en producción más abajo.
const consoleInfo = console.info.bind(console);
let consoleWarn = console.warn.bind(console);

/**
 * Registra una falla esperada (una petición al API que ya se le avisó al
 * usuario) sin abrir LogBox: en desarrollo va a console.info (Metro y la
 * consola del navegador); en producción a console.warn, limpio de tokens.
 */
export function logHandledError(...args: unknown[]): void {
  if (__DEV__) {
    consoleInfo(...args.map((arg) => sanitize(arg, 0)));
  } else {
    consoleWarn(...args);
  }
}

/**
 * Error atrapado en un catch: si es una falla del API va a logHandledError;
 * si es un error de la app (un TypeError, p. ej.) sigue a console.error, que
 * en desarrollo lo muestra en LogBox.
 */
export function logCaughtError(label: string, error: unknown): void {
  if (isAxiosError(error)) {
    logHandledError(label, error);
  } else {
    console.error(label, error);
  }
}

if (!__DEV__) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = withSanitizedArgs(console.warn.bind(console));
  console.error = withSanitizedArgs(console.error.bind(console));
  consoleWarn = console.warn;
} else {
  // Muchas pantallas hacen console.error("…", error) en su catch con el error
  // de axios: en el teléfono eso abría el aviso rojo de LogBox por una falla
  // que la app ya le muestra al usuario.
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.some(isAxiosError)) {
      logHandledError(...args);
      return;
    }
    if (isKnownDevNoise(args[0])) {
      console.debug(...args);
      return;
    }
    consoleError(...args);
  };
}

/**
 * Avisos conocidos que no son errores de la app, pero abrían el aviso rojo de
 * Expo en desarrollo y se confundían con una falla real:
 *
 * - React DOM, por react-native-chart-kit en web (sus gráficas pasan props de
 *   React Native, como onStartShouldSetResponder o transform-origin, a
 *   elementos SVG): cada visita a Ventas, Compras o Transferencias.
 * - React Navigation, "The action 'ROUTE_NAMES_CHANGED' … was not handled":
 *   NavigationHandler desmonta y vuelve a montar la navegación al iniciar
 *   sesión y al cambiar de sucursal (se muestra el loader), y esa acción
 *   interna llega cuando el navegador ya no está.
 */
function isKnownDevNoise(first: unknown): boolean {
  if (typeof first !== "string") return false;
  return (
    first.includes("Unknown event handler property") ||
    first.includes("Invalid DOM property") ||
    first.includes("The action 'ROUTE_NAMES_CHANGED'")
  );
}
