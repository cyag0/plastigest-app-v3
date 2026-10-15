import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosInstance, AxiosResponse } from "axios";
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

      // Obtener company y location seleccionados
      const selectedCompanyData =
        await AsyncStorage.getItem(SELECTED_COMPANY_KEY);
      const selectedLocationData = await AsyncStorage.getItem(
        SELECTED_LOCATION_KEY,
      );

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
    console.error("Response error:", error.response?.data || error.message);

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
        await AsyncStorage.multiRemove([
          SELECTED_COMPANY_KEY,
          SELECTED_LOCATION_KEY,
        ]);
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
        await AsyncStorage.removeItem(SELECTED_LOCATION_KEY);
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

// Funciones helper para manejo de empresa seleccionada
export const setSelectedCompany = async (company: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(SELECTED_COMPANY_KEY, JSON.stringify(company));
  } catch (error) {
    console.error("Error saving selected company:", error);
  }
};

export const getSelectedCompany = async (): Promise<any | null> => {
  try {
    const companyData = await AsyncStorage.getItem(SELECTED_COMPANY_KEY);
    return companyData ? JSON.parse(companyData) : null;
  } catch (error) {
    console.error("Error getting selected company:", error);
    return null;
  }
};

export const removeSelectedCompany = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SELECTED_COMPANY_KEY);
  } catch (error) {
    console.error("Error removing selected company:", error);
  }
};

// Funciones helper para manejo de ubicación seleccionada
export const setSelectedLocation = async (location: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(SELECTED_LOCATION_KEY, JSON.stringify(location));
  } catch (error) {
    console.error("Error saving selected location:", error);
  }
};

export const getSelectedLocation = async (): Promise<any | null> => {
  try {
    const locationData = await AsyncStorage.getItem(SELECTED_LOCATION_KEY);
    return locationData ? JSON.parse(locationData) : null;
  } catch (error) {
    console.error("Error getting selected location:", error);
    return null;
  }
};

export const removeSelectedLocation = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SELECTED_LOCATION_KEY);
  } catch (error) {
    console.error("Error removing selected location:", error);
  }
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
