import axiosClient, { getAuthToken } from "@/utils/axios";
import { getAppVersionLabel } from "@/utils/appVersion";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Reportes de errores de la app al servidor (contrato C11:
 * POST auth/admin/client-errors → 204, se guarda en el log con el usuario, la
 * empresa y la sucursal). Antes un error en una caja sólo se sabía si alguien
 * lo contaba.
 *
 * Todo es "mejor esfuerzo": nada de aquí lanza, un reporte que no sale se
 * pierde (salvo el error fatal del teléfono, ver más abajo) y hay límites
 * para no inundar el log si un error se repite en cada render.
 */

const ENDPOINT = "/auth/admin/client-errors";

// Topes de cada campo (el servidor acepta message de hasta 2000).
const LIMITS = {
  message: 2000,
  stack: 4000,
  route: 255,
  platform: 100,
  appVersion: 50,
};

// Como mucho N reportes por minuto y el mismo error una vez cada 5 min.
const MAX_REPORTS_PER_MINUTE = 10;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

// Error fatal en el teléfono: la app se cierra en cuanto pasa al manejador de
// React Native. Se guarda antes y se manda al volver a abrirla si no alcanzó.
const PENDING_FATAL_KEY = "pending_client_error";
const FATAL_SEND_WAIT_MS = 2500;

export interface ErrorReportContext {
  /** Origen: "route-boundary", "root-boundary", "window.onerror"… */
  source?: string;
  /** Ruta donde ocurrió (por defecto la última conocida). */
  route?: string;
  /** Pila de componentes de React (error boundaries). */
  componentStack?: string;
  extra?: Record<string, unknown>;
}

interface ErrorReportPayload {
  message: string;
  stack?: string;
  route?: string;
  platform: string;
  app_version: string;
  extra: Record<string, unknown>;
}

let currentRoute: string | undefined;

/** La raíz de la app avisa la ruta actual para adjuntarla a los reportes. */
export function setErrorReportingRoute(route: string | undefined): void {
  currentRoute = route;
}

const truncate = (value: string | undefined, max: number) =>
  value && value.length > max ? `${value.slice(0, max - 1)}…` : value;

function describe(value: unknown): { message: string; stack?: string; name?: string } {
  if (value instanceof Error) {
    return { message: value.message || value.name || "Error", stack: value.stack, name: value.name };
  }
  if (typeof value === "string") return { message: value };
  if (value && typeof value === "object") {
    const candidate = value as { message?: unknown; stack?: unknown; name?: unknown };
    if (typeof candidate.message === "string") {
      return {
        message: candidate.message,
        stack: typeof candidate.stack === "string" ? candidate.stack : undefined,
        name: typeof candidate.name === "string" ? candidate.name : undefined,
      };
    }
    try {
      return { message: JSON.stringify(value) };
    } catch {
      // objeto circular
    }
  }
  return { message: String(value) };
}

/**
 * Lo que no es un error de la app: fallas del API (las registra el servidor o
 * son de red), peticiones canceladas y ruido del navegador.
 */
function isNoise(value: unknown, message: string, stack?: string): boolean {
  const candidate = value as { isAxiosError?: boolean; name?: string; code?: string } | null;
  if (candidate && typeof candidate === "object") {
    if (candidate.isAxiosError || candidate.name === "AxiosError") return true;
    if (candidate.name === "CanceledError" || candidate.code === "ERR_CANCELED") return true;
  }
  if (message === "Script error." || message === "Script error") return true;
  if (/ResizeObserver loop/i.test(message)) return true;
  if (stack && /(chrome|moz|safari(-web)?)-extension:\/\//.test(stack)) return true;
  return false;
}

function currentPlatform(): string {
  if (Platform.OS === "web" || Platform.Version == null) return Platform.OS;
  return `${Platform.OS} ${Platform.Version}`;
}

function buildPayload(error: unknown, context: ErrorReportContext): ErrorReportPayload | null {
  const { message, stack, name } = describe(error);
  if (isNoise(error, message, stack)) return null;

  const webRoute =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location?.pathname
      : undefined;
  const extra: Record<string, unknown> = { ...context.extra };
  if (context.source) extra.source = context.source;
  if (name && name !== "Error") extra.error_name = name;
  if (context.componentStack) {
    extra.component_stack = truncate(context.componentStack, LIMITS.stack);
  }
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    extra.user_agent = truncate(navigator.userAgent, 300);
  }

  return {
    message: truncate(message || "Error sin mensaje", LIMITS.message) as string,
    stack: truncate(stack, LIMITS.stack),
    route: truncate(context.route ?? currentRoute ?? webRoute, LIMITS.route),
    platform: truncate(currentPlatform(), LIMITS.platform) as string,
    app_version: truncate(getAppVersionLabel(), LIMITS.appVersion) as string,
    extra,
  };
}

const recentReports = new Map<string, number>();
let rateWindowStart = 0;
let rateWindowCount = 0;

function shouldSend(payload: ErrorReportPayload): boolean {
  const now = Date.now();
  const firstFrame = payload.stack?.split("\n").find((line) => line.trim())?.trim() ?? "";
  const signature = [payload.extra.source, payload.message, firstFrame, payload.route].join("|");

  const last = recentReports.get(signature);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;

  if (now - rateWindowStart > 60 * 1000) {
    rateWindowStart = now;
    rateWindowCount = 0;
  }
  if (rateWindowCount >= MAX_REPORTS_PER_MINUTE) return false;

  rateWindowCount += 1;
  recentReports.set(signature, now);
  if (recentReports.size > 200) {
    for (const [key, at] of recentReports) {
      if (now - at >= DEDUPE_WINDOW_MS) recentReports.delete(key);
    }
  }
  return true;
}

async function send(payload: ErrorReportPayload): Promise<boolean> {
  try {
    // La ruta requiere sesión; sin token se descarta (p. ej. en login).
    if (!(await getAuthToken())) return false;
    await axiosClient.post(ENDPOINT, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 8000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Reporta un error de la app. Nunca lanza ni espera: se puede llamar en cualquier lado. */
export function reportClientError(error: unknown, context: ErrorReportContext = {}): void {
  try {
    const payload = buildPayload(error, context);
    if (!payload || !shouldSend(payload)) return;
    void send(payload);
  } catch {
    // Reportar nunca debe romper nada.
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function reportFatal(error: unknown): Promise<void> {
  try {
    const payload = buildPayload(error, { source: "fatal" });
    if (!payload) return;
    payload.extra.occurred_at = new Date().toISOString();
    try {
      await AsyncStorage.setItem(PENDING_FATAL_KEY, JSON.stringify(payload));
    } catch {
      // sin almacenamiento: sólo queda el intento directo
    }
    const sent = await Promise.race([send(payload), wait(FATAL_SEND_WAIT_MS).then(() => false)]);
    if (sent) await AsyncStorage.removeItem(PENDING_FATAL_KEY).catch(() => undefined);
  } catch {
    // nada
  }
}

/** Manda el error fatal que quedó guardado de la vez anterior (si hay sesión). */
async function flushPendingFatal(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_FATAL_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as ErrorReportPayload;
    payload.extra = { ...payload.extra, reported_on_next_start: true };
    if (await send(payload)) await AsyncStorage.removeItem(PENDING_FATAL_KEY);
  } catch {
    await AsyncStorage.removeItem(PENDING_FATAL_KEY).catch(() => undefined);
  }
}

let handlersInstalled = false;

/**
 * Errores que ningún try/catch ni error boundary atrapa: en web los de
 * window ("error" y "unhandledrejection"); en el teléfono el manejador
 * global de React Native (ErrorUtils) y, en producción, las promesas
 * rechazadas sin catch (Hermes). Se instala una vez desde app/_layout.tsx.
 */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.addEventListener("error", (event: ErrorEvent) => {
        reportClientError(event.error ?? event.message, {
          source: "window.onerror",
          extra: event.filename
            ? { file: event.filename, line: event.lineno, column: event.colno }
            : undefined,
        });
      });
      window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
        reportClientError(event.reason, { source: "unhandledrejection" });
      });
      return;
    }

    const errorUtils = (globalThis as any).ErrorUtils;
    if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
      const previous = errorUtils.getGlobalHandler();
      errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        if (!isFatal || __DEV__) {
          reportClientError(error, { source: isFatal ? "fatal" : "global" });
          previous?.(error, isFatal);
          return;
        }
        // En producción el manejador original cierra la app: primero se
        // intenta mandar (o guardar) el reporte.
        void reportFatal(error).finally(() => previous?.(error, isFatal));
      });
    }

    // En desarrollo React Native ya registra un rastreador (avisos de LogBox);
    // en producción no hay ninguno.
    const hermes = (globalThis as any).HermesInternal;
    if (!__DEV__ && hermes?.enablePromiseRejectionTracker) {
      hermes.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (_id: number, rejection: unknown) => {
          reportClientError(rejection, { source: "unhandledrejection" });
        },
        onHandled: () => {},
      });
    }

    setTimeout(() => void flushPendingFatal(), 5000);
  } catch {
    // Sin manejadores globales la app funciona igual.
  }
}
