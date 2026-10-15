import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosInstance, AxiosResponse, isCancel } from "axios";
import { Platform } from "react-native";
import { API_BASE_URL, API_CONFIG_ERROR } from "./appConfig";

// Configuración base para el cliente axios usando variables de entorno.
// La URL sale de EXPO_PUBLIC_API_URL (ver utils/appConfig): en desarrollo se
// conserva el fallback a localhost; en un build de producción no hay valor
// por defecto y, si falta o es local, no sale ninguna petición.
const BASE_URL = API_BASE_URL;
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || "10000");
// Subidas de archivos (fotos de evidencia, imágenes de producto) y altas de
// venta pueden tardar más de 10 s con datos móviles. Si se cortan por timeout
// el servidor igual puede terminar de guardar y el usuario reintenta: venta o
// movimiento duplicado.
export const LONG_REQUEST_TIMEOUT = parseInt(
  process.env.EXPO_PUBLIC_API_LONG_TIMEOUT || "60000",
);
const AUTH_TOKEN_KEY = process.env.EXPO_PUBLIC_AUTH_TOKEN_KEY || "auth_token";
const USER_DATA_KEY = process.env.EXPO_PUBLIC_USER_DATA_KEY || "user_data";
const SELECTED_COMPANY_KEY = "selected_company";
const SELECTED_LOCATION_KEY = "selected_location";
const COMPANIES_DATA_KEY =
  process.env.EXPO_PUBLIC_COMPANIES_DATA_KEY || "companies_list";
// Cachés que dependen del usuario/empresa: permisos por empresa+sucursal
// (AuthContext) y sucursales por empresa (useSelectedLocation).
const SESSION_CACHE_PREFIXES = ["user_permissions", "locations_list"];

// --- Empresa y sucursal activas, por pestaña -------------------------------
//
// En web AsyncStorage es localStorage, que comparten todas las pestañas. Antes
// cambiar de sucursal en una pestaña cambiaba los headers X-Company-ID /
// X-Location-ID de todas: la otra pestaña seguía mostrando "Centro" pero sus
// ventas, gastos, ajustes y compras se registraban en "Norte". Ahora cada
// pestaña guarda su selección en sessionStorage (es de la pestaña y sobrevive
// a recargarla) y localStorage queda como valor inicial para las pestañas
// nuevas (la última selección hecha en cualquiera). En el teléfono sólo hay
// AsyncStorage.
const TAB_SCOPED_KEYS = [SELECTED_COMPANY_KEY, SELECTED_LOCATION_KEY];
// "Esta pestaña no tiene selección": para no volver a heredar la de
// localStorage después de quitarla o si no había ninguna al abrirla.
const TAB_NO_SELECTION = "__none__";

function getTabStorage(): Storage | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    return window.sessionStorage ?? null;
  } catch {
    // El navegador bloquea el almacenamiento: queda la selección compartida.
    return null;
  }
}

/**
 * Selección vigente en esta pestaña. La primera lectura copia la de
 * localStorage (o la marca de "sin selección"); desde ahí la pestaña ya no ve
 * los cambios de las demás.
 */
async function readSelection(key: string): Promise<string | null> {
  const tab = getTabStorage();
  if (tab) {
    try {
      const own = tab.getItem(key);
      if (own !== null) return own === TAB_NO_SELECTION ? null : own;
    } catch {
      return AsyncStorage.getItem(key);
    }
  }
  const shared = await AsyncStorage.getItem(key);
  if (tab) {
    try {
      tab.setItem(key, shared ?? TAB_NO_SELECTION);
    } catch {
      // sin sessionStorage: se sigue leyendo la compartida
    }
  }
  return shared;
}

/** Guarda la selección de esta pestaña y la deja como inicial para las nuevas. */
async function writeSelection(key: string, value: string | null): Promise<void> {
  const tab = getTabStorage();
  if (tab) {
    try {
      tab.setItem(key, value ?? TAB_NO_SELECTION);
    } catch {
      // sin sessionStorage: sólo la compartida
    }
  }
  if (value === null) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Olvida la selección propia de esta pestaña (al cerrar sesión): la siguiente
 * lectura vuelve a tomar la de localStorage.
 */
export const clearTabSelection = (): void => {
  const tab = getTabStorage();
  if (!tab) return;
  TAB_SCOPED_KEYS.forEach((key) => {
    try {
      tab.removeItem(key);
    } catch {
      // nada que limpiar
    }
  });
};

// Endpoints donde un 401 NO significa "sesión expirada" (credenciales
// incorrectas, recuperación de contraseña) o donde ya se está cerrando sesión.
const UNAUTHORIZED_IGNORED_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/verify-reset-code",
  "/auth/reset-password",
  "/auth/logout",
  "/auth/logout-all",
];

// Altas que no deben cortarse a los 10 s (ver LONG_REQUEST_TIMEOUT).
const LONG_TIMEOUT_PATHS: RegExp[] = [
  /^\/auth\/admin\/pos\/sales$/,
  /^\/auth\/admin\/sales$/,
  /^\/auth\/admin\/sales\/[^/]+\/add-payment$/,
  /^\/auth\/admin\/sales-orders$/,
  /^\/auth\/admin\/sales-orders\/quick-checkout$/,
  /^\/auth\/admin\/sales-orders\/[^/]+\/checkout$/,
];

/** Ruta relativa a la API, sin query string ni barra final. */
const normalizePath = (url?: string, baseURL?: string): string => {
  if (!url) return "";
  let path = url;
  const base = baseURL ?? BASE_URL;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length);
  }
  path = path.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};

const isMultipartBody = (data: unknown) =>
  typeof FormData !== "undefined" && data instanceof FormData;

const needsLongTimeout = (config: any): boolean => {
  const method = String(config.method || "get").toLowerCase();
  if (method === "get" || method === "head") return false;
  if (isMultipartBody(config.data)) return true;
  const path = normalizePath(config.url, config.baseURL);
  return LONG_TIMEOUT_PATHS.some((pattern) => pattern.test(path));
};

// Mensajes para el usuario cuando no hubo respuesta del servidor. Antes salía
// el texto de axios en inglés ("Network Error", "timeout of 10000ms
// exceeded"). Para distinguir los casos en código usar isTimeoutError /
// isNetworkError (error.code no cambia).
export const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.";
export const TIMEOUT_ERROR_MESSAGE =
  "El servidor tardó demasiado en responder. Si estabas guardando algo, revisa si quedó registrado antes de intentarlo otra vez.";

/** La petición se cortó por tiempo (el servidor pudo haberla procesado). */
export const isTimeoutError = (error: any): boolean =>
  error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";

/** No hubo respuesta del servidor (sin red, servidor caído, CORS o tiempo agotado). */
export const isNetworkError = (error: any): boolean =>
  Boolean(error?.isAxiosError) && !error.response && !isCancel(error);

// Textos genéricos de Laravel (en inglés) que pueden llegar en
// response.data.message; los mensajes propios del backend no se tocan.
const UNAVAILABLE_FEATURE_MESSAGE =
  "Esta función no está disponible en el servidor. Recarga la página o actualiza la app.";
const GENERIC_SERVER_MESSAGES: [RegExp, string][] = [
  [/^Server Error$/i, "Ocurrió un error en el servidor. Inténtalo de nuevo; si continúa, avisa al administrador."],
  [/^Service Unavailable$/i, "El servidor está en mantenimiento. Inténtalo de nuevo en unos minutos."],
  [/^This action is unauthorized\.?$/i, "No tienes permiso para realizar esta acción."],
  [/^Unauthenticated\.?$/i, "Tu sesión expiró. Inicia sesión de nuevo."],
  [/^No query results for model/i, "No se encontró el registro; puede que se haya eliminado."],
  [/^The route .+ could not be found\.?$/i, UNAVAILABLE_FEATURE_MESSAGE],
  [/^The (GET|HEAD|POST|PUT|PATCH|DELETE) method is not supported/i, UNAVAILABLE_FEATURE_MESSAGE],
  [/^Not Found$/i, "No se encontró lo que buscas."],
  [/^Too Many (Attempts|Requests)\.?$/i, "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo."],
  [/^(Content|Payload|Request Entity) Too Large$/i, "Los datos o el archivo que mandaste son demasiado grandes."],
  [/^(CSRF token mismatch|Page Expired)\.?$/i, "La página expiró. Recárgala e inténtalo de nuevo."],
];

/**
 * Deja en español lo que ve el usuario: el mensaje de axios cuando no hubo
 * respuesta o la respuesta no trae mensaje (p. ej. la página de error 502 del
 * proxy), y los textos genéricos de Laravel. Las pantallas siguen leyendo
 * response.data.message y, si no hay, error.message.
 */
function localizeError(error: any): void {
  if (!error?.isAxiosError || isCancel(error)) return;
  const response = error.response;

  if (!response) {
    error.message = isTimeoutError(error) ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE;
    return;
  }

  const data = response.data;
  if (data && typeof data === "object" && typeof data.message === "string") {
    const generic = GENERIC_SERVER_MESSAGES.find(([pattern]) => pattern.test(data.message.trim()));
    if (generic) {
      data.message = generic[1];
    } else {
      // Resumen de validación sin traducir: "… (and 2 more errors)".
      data.message = data.message.replace(
        /\s*\(and (\d+) more errors?\)$/,
        (_match: string, count: string) => ` (y ${count} ${count === "1" ? "error" : "errores"} más)`,
      );
    }
    return;
  }

  if (response.status >= 500) {
    error.message = `El servidor no está disponible en este momento (error ${response.status}). Inténtalo de nuevo en unos minutos.`;
  }
}

/**
 * Resumen de un error para la consola: estado, método, ruta y mensaje. Nunca
 * el objeto completo: config.headers lleva el token (Authorization: Bearer …).
 */
export const describeError = (error: unknown): string => {
  const e = error as any;
  if (e?.isAxiosError) {
    const status = e.response?.status ?? e.code ?? "sin respuesta";
    const method = String(e.config?.method ?? "get").toUpperCase();
    const path = normalizePath(e.config?.url, e.config?.baseURL);
    const serverMessage =
      typeof e.response?.data?.message === "string" ? e.response.data.message : undefined;
    return `[${status}] ${method} ${path}: ${serverMessage ?? e.message}`;
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
};

// Crear instancia de axios
const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

// Interceptor para requests - agregar token de autenticación
axiosClient.interceptors.request.use(
  async (config: any) => {
    // Build mal configurado: la app muestra la pantalla de configuración
    // (app/_layout.tsx); por si algo pide datos antes, no sale nada.
    if (API_CONFIG_ERROR) {
      throw new Error(API_CONFIG_ERROR);
    }

    // Solo se alarga el timeout por defecto; si la llamada pidió uno propio
    // se respeta.
    if (config.timeout === API_TIMEOUT && needsLongTimeout(config)) {
      config.timeout = LONG_REQUEST_TIMEOUT;
    }

    try {
      // Obtener token desde AsyncStorage usando la variable de entorno
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Se guarda con qué token salió la petición: un 401 tardío de una
      // sesión anterior no debe cerrar la sesión nueva (ver interceptor de
      // respuesta).
      config._authToken = token ?? null;

      // Empresa y sucursal de ESTA pestaña (ver readSelection).
      const selectedCompanyData = await readSelection(SELECTED_COMPANY_KEY);
      const selectedLocationData = await readSelection(SELECTED_LOCATION_KEY);

      if (selectedCompanyData && config.headers) {
        try {
          const company = JSON.parse(selectedCompanyData);
          if (company.id) {
            config.headers["X-Company-ID"] = company.id.toString();
          }
        } catch (parseError) {
          console.error("Error parsing company data:", parseError);
        }
      }

      if (selectedLocationData && config.headers) {
        try {
          const location = JSON.parse(selectedLocationData);
          if (location.id) {
            config.headers["X-Location-ID"] = location.id.toString();
          }
        } catch (parseError) {
          console.error("Error parsing location data:", parseError);
        }
      }

      return config;
    } catch (error) {
      console.error("Error getting data from storage:", error);
      return config;
    }
  },
  (error: any) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// La sucursal guardada ya no es válida para el usuario (se la quitaron o se
// forzó otra). AuthContext se suscribe para limpiar la selección y mostrar el
// selector de sucursal en lugar de dejar la app rota o cerrar la sesión.
type LocationForbiddenListener = () => void;
const locationForbiddenListeners = new Set<LocationForbiddenListener>();

export const onLocationForbidden = (listener: LocationForbiddenListener) => {
  locationForbiddenListeners.add(listener);
  return () => {
    locationForbiddenListeners.delete(listener);
  };
};

// La empresa guardada ya no es accesible para el usuario (backend responde
// 403 con code "company_forbidden"). AuthContext limpia empresa y sucursal y
// el NavigationHandler muestra el selector de empresa.
type CompanyForbiddenListener = () => void;
const companyForbiddenListeners = new Set<CompanyForbiddenListener>();

export const onCompanyForbidden = (listener: CompanyForbiddenListener) => {
  companyForbiddenListeners.add(listener);
  return () => {
    companyForbiddenListeners.delete(listener);
  };
};

// La sesión expiró o la revocaron (cambio de contraseña, logout en otro
// dispositivo, cuenta desactivada). AuthContext se suscribe para limpiar su
// estado y que el NavigationHandler mande a /login; antes solo se borraba el
// storage y la app se quedaba en la pantalla actual con todas las peticiones
// fallando.
export interface UnauthorizedInfo {
  /** `code` del backend, p. ej. "account_inactive". */
  code?: string;
  message?: string;
}
type UnauthorizedListener = (info: UnauthorizedInfo) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export const onUnauthorized = (listener: UnauthorizedListener) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

// Escrituras exitosas (POST/PUT/PATCH/DELETE). Los selects cacheados
// (AppProSelect) se suscriben para volver a pedir sus opciones cuando se crea
// o edita un registro de su catálogo.
type MutationListener = (info: { method: string; path: string }) => void;
const mutationListeners = new Set<MutationListener>();

export const onMutationSuccess = (listener: MutationListener) => {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
};

// Interceptor para responses - manejar errores globalmente
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = String(response.config?.method || "get").toLowerCase();
    if (method !== "get" && method !== "head" && mutationListeners.size > 0) {
      const path = normalizePath(response.config?.url, response.config?.baseURL);
      mutationListeners.forEach((listener) => {
        try {
          listener({ method, path });
        } catch (listenerError) {
          console.error("Mutation listener error:", listenerError);
        }
      });
    }
    return response;
  },
  async (error: any) => {
    localizeError(error);
    if (!isCancel(error)) {
      console.error("Response error:", describeError(error));
    }

    const path = normalizePath(error.config?.url, error.config?.baseURL);

    // Token expirado o revocado: limpiar la sesión local y avisar a
    // AuthContext para que mande a login.
    if (
      error.response?.status === 401 &&
      !UNAUTHORIZED_IGNORED_PATHS.includes(path)
    ) {
      const usedToken: string | null = error.config?._authToken ?? null;
      let currentToken: string | null = null;
      try {
        currentToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      } catch {
        currentToken = null;
      }

      // Solo si la petición salió con la sesión vigente. Sin token no hay
      // sesión que cerrar, y si el token cambió (ya se volvió a iniciar
      // sesión) el 401 es de la sesión anterior.
      if (usedToken && usedToken === currentToken) {
        await clearSessionStorage();
        const info: UnauthorizedInfo = {
          code: error.response?.data?.code,
          message: error.response?.data?.message,
        };
        unauthorizedListeners.forEach((listener) => {
          try {
            listener(info);
          } catch (listenerError) {
            console.error("Unauthorized listener error:", listenerError);
          }
        });
      }
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "company_forbidden"
    ) {
      try {
        await writeSelection(SELECTED_COMPANY_KEY, null);
        await writeSelection(SELECTED_LOCATION_KEY, null);
      } catch (storageError) {
        console.error("Error clearing company:", storageError);
      }
      companyForbiddenListeners.forEach((listener) => listener());
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "location_forbidden"
    ) {
      try {
        await writeSelection(SELECTED_LOCATION_KEY, null);
      } catch (storageError) {
        console.error("Error clearing location:", storageError);
      }
      locationForbiddenListeners.forEach((listener) => listener());
    }

    return Promise.reject(error);
  },
);

// Funciones helper para manejo de tokens
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error saving token:", error);
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
  } catch (error) {
    console.error("Error removing token:", error);
  }
};

/**
 * Borra todo lo que pertenece a la sesión: token, usuario, empresa y
 * sucursal seleccionadas, lista de empresas y los cachés de permisos y
 * sucursales. Se usa en logout y cuando la sesión expira, para que en un
 * equipo compartido el siguiente usuario no herede la empresa, la sucursal ni
 * los permisos del anterior. Las preferencias del equipo (tema, sidebar) se
 * conservan.
 */
export const clearSessionStorage = async (): Promise<void> => {
  clearTabSelection();
  const fixedKeys = [
    AUTH_TOKEN_KEY,
    USER_DATA_KEY,
    SELECTED_COMPANY_KEY,
    SELECTED_LOCATION_KEY,
    COMPANIES_DATA_KEY,
  ];
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(
      (key) =>
        fixedKeys.includes(key) ||
        SESSION_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (error) {
    console.error("Error clearing session storage:", error);
    // Al menos lo indispensable para no seguir mandando el token.
    await Promise.all(
      fixedKeys.map((key) => AsyncStorage.removeItem(key).catch(() => undefined)),
    );
  }
};

// Empresa y sucursal seleccionadas en esta pestaña (en el teléfono, en la
// app). AuthContext es quien las cambia; el interceptor las manda en headers.
export const setSelectedCompany = async (company: any): Promise<void> => {
  try {
    await writeSelection(SELECTED_COMPANY_KEY, JSON.stringify(company));
  } catch (error) {
    console.error("Error saving selected company:", error);
  }
};

export const getSelectedCompany = async (): Promise<any | null> => {
  try {
    const companyData = await readSelection(SELECTED_COMPANY_KEY);
    return companyData ? JSON.parse(companyData) : null;
  } catch (error) {
    console.error("Error getting selected company:", error);
    return null;
  }
};

export const removeSelectedCompany = async (): Promise<void> => {
  try {
    await writeSelection(SELECTED_COMPANY_KEY, null);
  } catch (error) {
    console.error("Error removing selected company:", error);
  }
};

export const setSelectedLocation = async (location: any): Promise<void> => {
  try {
    await writeSelection(SELECTED_LOCATION_KEY, JSON.stringify(location));
  } catch (error) {
    console.error("Error saving selected location:", error);
  }
};

export const getSelectedLocation = async (): Promise<any | null> => {
  try {
    const locationData = await readSelection(SELECTED_LOCATION_KEY);
    return locationData ? JSON.parse(locationData) : null;
  } catch (error) {
    console.error("Error getting selected location:", error);
    return null;
  }
};

export const removeSelectedLocation = async (): Promise<void> => {
  try {
    await writeSelection(SELECTED_LOCATION_KEY, null);
  } catch (error) {
    console.error("Error removing selected location:", error);
  }
};

/** Cambio de la sesión hecho en otra pestaña (web). */
export type OtherTabSessionChange =
  /** Token nuevo, o null si allá se cerró la sesión (o expiró). */
  | { kind: "token"; token: string | null }
  /** Usuario que guardó la otra pestaña al iniciar sesión. */
  | { kind: "user"; userId: number | null };

/**
 * Web: el token y el usuario sí son compartidos por todas las pestañas
 * (localStorage). Avisa cuando otra pestaña cierra sesión o entra con otra
 * cuenta, para que esta no siga con la sesión anterior ni actúe como otro
 * usuario sin saberlo. En el teléfono no hace nada.
 */
export const onSessionChangedInOtherTab = (
  listener: (change: OtherTabSessionChange) => void,
): (() => void) => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: StorageEvent) => {
    try {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      // localStorage.clear() en otra pestaña.
      if (event.key === null) {
        listener({ kind: "token", token: null });
        return;
      }
      if (event.key === AUTH_TOKEN_KEY && event.oldValue !== event.newValue) {
        listener({ kind: "token", token: event.newValue });
        return;
      }
      if (event.key === USER_DATA_KEY && event.newValue) {
        const parsed = JSON.parse(event.newValue);
        listener({
          kind: "user",
          userId: typeof parsed?.id === "number" ? parsed.id : null,
        });
      }
    } catch {
      // Datos ilegibles de otra pestaña: se ignoran.
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};

// Función para limpiar toda la información de sesión
export const clearAllStorage = async (): Promise<void> => {
  await clearSessionStorage();
};

// Funciones de API específicas para autenticación
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    axiosClient.post("/auth/login", credentials),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => axiosClient.post("/auth/register", userData),

  logout: () => axiosClient.post("/auth/logout"),

  logoutAll: () => axiosClient.post("/auth/logout-all"),

  me: () => axiosClient.get("/auth/me"),

  myPermissions: () => axiosClient.get("/auth/my-permissions"),

  // El backend valida `new_password` + `new_password_confirmation`
  // (AuthController::changePassword).
  changePassword: (passwordData: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => axiosClient.post("/auth/change-password", passwordData),

  // Recuperación de contraseña (flujo "olvidé mi contraseña") vía código OTP.
  forgotPassword: (email: string) =>
    axiosClient.post("/auth/forgot-password", { email }),

  verifyResetCode: (email: string, code: string) =>
    axiosClient.post("/auth/verify-reset-code", { email, code }),

  resetPassword: (data: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }) => axiosClient.post("/auth/reset-password", data),
};

// Función para obtener el usuario autenticado
export const getCurrentUser = () => axiosClient.get("/user");

export default axiosClient;
