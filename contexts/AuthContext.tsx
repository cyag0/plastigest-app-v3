import { clearSelectDataCache } from "@/components/Form/AppProSelect/cacheBus";
import {
  authAPI,
  clearSessionStorage,
  clearTabSelection,
  describeError,
  getAuthToken,
  getSelectedCompany,
  getSelectedLocation,
  isNetworkError,
  removeSelectedCompany,
  removeSelectedLocation,
  setAuthToken,
  setSelectedCompany as storeSelectedCompany,
  setSelectedLocation as storeSelectedLocation,
  onCompanyForbidden,
  onLocationForbidden,
  onSessionChangedInOtherTab,
  onUnauthorized,
} from "@/utils/axios";
import Services from "@/utils/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Tipos
interface Role {
  id: number;
  name: string;
  description?: string;
  is_system?: boolean;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
  resource?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  roles?: Role[];
  permissions?: Permission[];
}

interface Company {
  id: number;
  name: string;
  business_name: string;
  rfc: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

type LoginResult = {
  success: boolean;
  error?: string;
  // Info de rate limit que el backend envía en headers (X-RateLimit-*)
  // o en el body cuando se devuelve 429. El front usa esto para mostrar
  // "Te quedan X intentos" y un contador regresivo cuando se bloquea.
  rateLimit?: {
    limit: number;
    remaining: number;
    // Segundos hasta que se desbloquee (solo en 429).
    retryAfter?: number;
  };
};

interface AuthContextType {
  user: User | null;
  selectedCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  isSwitchingLocation: boolean;
  isAuthenticated: boolean;
  hasCompanySelected: boolean;
  isLoadingCompanies: boolean;
  unreadNotificationsCount: number;
  permissions: string[];
  /**
   * Error al verificar la sesión al abrir la app sin poder llegar al servidor
   * (sin red, timeout, error 5xx) y sin un usuario guardado con el cual
   * continuar. El NavigationHandler muestra "Reintentar" en vez de mandar a
   * login: el token sigue guardado.
   */
  authError: string | null;
  /**
   * Motivo por el que la sesión se cerró sola (expiró, cuenta desactivada).
   * El NavigationHandler lo muestra como aviso y lo limpia.
   */
  sessionEndMessage: string | null;
  clearSessionEndMessage: () => void;
  hasPermission: (permission: string) => boolean;
  loadUnreadNotificationsCount: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  loadCompanies: () => Promise<void>;
  selectCompany: (company: Company) => Promise<void>;
  clearCompanySelection: () => Promise<void>;
  selectLocation: (location: any | null) => Promise<void>;
  location: App.Entities.Location | null;
  // Estado del permiso de notificaciones push (web principalmente).
  // "default" = nunca se ha pedido, "granted" = aceptado, "denied" = bloqueado,
  // "unsupported" = el navegador no soporta.
  notificationPermission: "default" | "granted" | "denied" | "unsupported";
  // Dispara el dialogo nativo del navegador. Debe llamarse desde un onPress
  // (user gesture) para que los navegadores modernos muestren el prompt.
  requestNotificationPermission: () => Promise<
    "default" | "granted" | "denied" | "unsupported"
  >;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mientras la sesión se restauró desde caché (sin poder verificarla), cada
// cuánto se reintenta /auth/me.
const SESSION_REVERIFY_INTERVAL_MS = 60 * 1000;

// Con la app visible, cada cuánto se refresca el contador de la campana (por
// si llegan avisos sin push: permiso denegado, web sin Firebase, etc.).
const UNREAD_REFRESH_INTERVAL_MS = 60 * 1000;

// Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [location, setLocation] = useState<App.Entities.Location | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingLocation, setIsSwitchingLocation] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  // Aviso para el usuario cuando la sesión se cerró sola (401).
  const [sessionEndMessage, setSessionEndMessage] = useState<string | null>(null);
  // La sesión se restauró desde caché porque no se pudo llegar al servidor.
  const [isSessionUnverified, setIsSessionUnverified] = useState(false);
  // Evita dos logins simultáneos (doble toque en "Iniciar sesión").
  const loginInFlightRef = useRef<Promise<LoginResult> | null>(null);
  // Logout en curso: sus 401 (token ya revocado) no son "sesión expirada".
  const loggingOutRef = useRef(false);

  // Contador de no leídas de la campana. Estable (useCallback) para que las
  // pantallas lo puedan poner en dependencias de useFocusEffect sin recargar
  // en cada render del provider. Si llegan dos respuestas, gana la petición
  // más reciente (p. ej. la que sale justo después de marcar como leída).
  const unreadRequestSeqRef = useRef(0);
  const loadUnreadNotificationsCount = useCallback(async () => {
    const seq = ++unreadRequestSeqRef.current;
    try {
      const response = await Services.notifications.getUnreadCount();
      if (seq !== unreadRequestSeqRef.current) return;
      setUnreadNotificationsCount(Number(response?.data?.count) || 0);
    } catch (error) {
      // Sin red o servidor caído: se conserva el último valor (antes se ponía
      // en 0 y la campana "perdía" los avisos pendientes).
      if (__DEV__) console.log("Error loading unread notifications count:", error);
    }
  }, []);

  // Registrar notificaciones push cuando el usuario esta autenticado
  const {
    deactivateToken,
    permissionStatus,
    requestPermission,
  } = usePushNotifications({
    enabled: Boolean(user),
    onForegroundMessage: () => {
      // Llegó un push con la app abierta (nativo o web): el aviso ya está
      // guardado en la bandeja, así que se pide el número real en vez de
      // sumar 1 (si el canal "campana" está apagado no hay nada que sumar).
      void loadUnreadNotificationsCount();
    },
  });

  // Si el backend rechaza la sucursal guardada (se la quitaron al usuario o
  // se forzó otra), se limpia la selección: la app muestra el selector de
  // sucursal con las que sí tiene, en vez de fallar en cada pantalla.
  useEffect(() => {
    return onLocationForbidden(() => {
      setLocation(null);
      setPermissions([]);
      clearSelectDataCache();
    });
  }, []);

  // Igual con la empresa (403 "company_forbidden"): se quita empresa y
  // sucursal y el NavigationHandler abre el selector de empresa.
  useEffect(() => {
    return onCompanyForbidden(() => {
      setSelectedCompany(null);
      setLocation(null);
      setPermissions([]);
      setUnreadNotificationsCount(0);
      clearSelectDataCache();
    });
  }, []);

  // Sesión expirada o revocada (401 en cualquier petición). El interceptor de
  // axios ya borró el storage de la sesión; aquí se limpia el estado para que
  // el NavigationHandler mande a /login en vez de dejar al usuario en una
  // pantalla donde todo falla.
  useEffect(() => {
    return onUnauthorized((info) => {
      resetSessionState();
      // Durante un logout explícito (p. ej. tras cambiar la contraseña, que
      // revoca el token) el 401 es esperado: sin aviso de "sesión expirada".
      if (loggingOutRef.current) return;
      setSessionEndMessage(
        info.code === "account_inactive"
          ? info.message || "Tu cuenta está desactivada."
          : "Tu sesión expiró. Inicia sesión de nuevo.",
      );
    });
    // resetSessionState solo usa setters estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar el badge del sistema operativo (iOS/Android) con el contador
  // de no leidas. En web no hay badge nativo asi que lo omitimos.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setBadgeCountAsync(Math.max(0, unreadNotificationsCount)).catch(
      (error) => console.warn("No se pudo actualizar el badge:", error),
    );
  }, [unreadNotificationsCount]);

  // Variables de entorno
  const USER_DATA_KEY = process.env.EXPO_PUBLIC_USER_DATA_KEY || "user_data";
  const COMPANIES_DATA_KEY =
    process.env.EXPO_PUBLIC_COMPANIES_DATA_KEY || "companies_list";
  const PERMISSIONS_KEY_PREFIX = "user_permissions";

  const getPermissionsStorageKey = (
    companyId?: number | null,
    locationId?: number | null,
  ) => {
    return [PERMISSIONS_KEY_PREFIX, companyId ?? "none", locationId ?? "none"].join("_");
  };

  const clearPermissionsCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const permissionKeys = keys.filter((key) =>
        key.startsWith(PERMISSIONS_KEY_PREFIX),
      );

      if (permissionKeys.length > 0) {
        await AsyncStorage.multiRemove(permissionKeys);
      }
    } catch (error) {
      console.error("Error clearing permissions cache:", error);
    }
  };

  /** Deja el estado en "sin sesión" (el storage lo limpia quien llama). */
  function resetSessionState() {
    setUser(null);
    setSelectedCompany(null);
    setLocation(null);
    setCompanies([]);
    setPermissions([]);
    setUnreadNotificationsCount(0);
    setIsSwitchingLocation(false);
    setIsSessionUnverified(false);
    setAuthError(null);
    clearSelectDataCache();
    if (Platform.OS !== "web") {
      Notifications.setBadgeCountAsync(0).catch(() => undefined);
    }
  }

  const readCachedUser = async (): Promise<User | null> => {
    try {
      const raw = await AsyncStorage.getItem(USER_DATA_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  };

  // Función para verificar si el usuario tiene un permiso
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  // Cargar permisos desde el servidor y guardarlos en AsyncStorage
  const loadPermissions = async (options?: {
    companyId?: number | null;
    locationId?: number | null;
  }) => {
    // `null` explícito significa "sin empresa/sucursal"; solo si no se pasó la
    // opción se usa la selección actual.
    const companyId =
      options && "companyId" in options
        ? options.companyId ?? null
        : selectedCompany?.id ?? null;
    const locationId =
      options && "locationId" in options
        ? options.locationId ?? null
        : location?.id ?? null;
    const permissionsKey = getPermissionsStorageKey(companyId, locationId);

    try {
      const response = await authAPI.myPermissions();
      const perms: string[] = response.data.permissions ?? [];
      setPermissions(perms);
      await AsyncStorage.setItem(permissionsKey, JSON.stringify(perms));
    } catch (error) {
      console.error("Error loading permissions:", describeError(error));
      // Intentar restaurar desde caché
      try {
        const cached = await AsyncStorage.getItem(permissionsKey);
        if (cached) {
          setPermissions(JSON.parse(cached));
          return;
        }
      } catch {}

      setPermissions([]);
    }
  };

  // Cargar compañías disponibles. Devuelve la lista (del servidor o, si no
  // hay red, de la caché) para que login pueda validar la empresa guardada.
  const fetchCompanies = async (): Promise<Company[]> => {
    try {
      setIsLoadingCompanies(true);

      const response = await Services.admin.companies.index();
      let companiesData: any = response.data;

      // Si la respuesta es paginada, extraer el array de datos
      if (
        companiesData &&
        typeof companiesData === "object" &&
        "data" in companiesData
      ) {
        companiesData = companiesData.data;
      }

      if (Array.isArray(companiesData)) {
        setCompanies(companiesData as Company[]);
        await AsyncStorage.setItem(
          COMPANIES_DATA_KEY,
          JSON.stringify(companiesData)
        );
        return companiesData as Company[];
      }
      return [];
    } catch (error) {
      console.error("Error loading companies:", describeError(error));
      // Intentar cargar desde caché local
      try {
        const cachedCompanies = await AsyncStorage.getItem(COMPANIES_DATA_KEY);
        if (cachedCompanies) {
          const parsed = JSON.parse(cachedCompanies);
          setCompanies(parsed);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch (cacheError) {
        console.error("Error loading cached companies:", cacheError);
      }
      return [];
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadCompanies = async () => {
    await fetchCompanies();
  };

  // Seleccionar compañía
  const selectCompany = async (company: Company) => {
    try {
      clearSelectDataCache();
      setSelectedCompany(company);
      await storeSelectedCompany(company);
      // Las notificaciones son por empresa: el contador de la campana se
      // recarga con la empresa nueva (ya guardada para el header X-Company-ID).
      void loadUnreadNotificationsCount();
      // Cargar permisos para esta empresa (el header X-Company-ID se inyecta
      // automáticamente desde AsyncStorage en el interceptor de axios)
      await loadPermissions({ companyId: company.id, locationId: null });
    } catch (error) {
      console.error("Error selecting company:", error);
    }
  };

  // Seleccionar ubicación
  const selectLocation = async (location: App.Entities.Location | null) => {
    try {
      setIsSwitchingLocation(true);
      clearSelectDataCache();

      // Sólo en esta pestaña (y como inicial para las nuevas): las demás
      // pestañas conservan su sucursal.
      if (location) {
        await storeSelectedLocation(location);
      } else {
        await removeSelectedLocation();
      }

      setLocation(location);

      if (selectedCompany?.id) {
        await loadPermissions({
          companyId: selectedCompany.id,
          locationId: location?.id ?? null,
        });
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error("Error selecting location:", error);
    } finally {
      setIsSwitchingLocation(false);
    }
  };

  // Limpiar selección de compañía
  const clearCompanySelection = async () => {
    try {
      clearSelectDataCache();
      setSelectedCompany(null);
      setLocation(null);
      setPermissions([]);
      setUnreadNotificationsCount(0);
      await removeSelectedCompany();
      await removeSelectedLocation();
      await clearPermissionsCache();
    } catch (error) {
      console.error("Error clearing company selection:", error);
    }
  };

  /**
   * Restaura empresa, sucursal y permisos guardados y refresca los permisos
   * desde el servidor (o desde la caché si no hay red).
   */
  const restoreSavedSelection = async () => {
    try {
      // Selección de esta pestaña (en una nueva, la última que se eligió).
      const parsedCompany = await getSelectedCompany();
      const parsedLocation = await getSelectedLocation();
      const permissionsKey = getPermissionsStorageKey(
        parsedCompany?.id,
        parsedLocation?.id,
      );
      const cachedPermissions = await AsyncStorage.getItem(permissionsKey);

      if (parsedCompany) {
        setSelectedCompany(parsedCompany);
        // Restaurar caché inmediatamente para que la UI no espere
        if (cachedPermissions) {
          setPermissions(JSON.parse(cachedPermissions));
        }
        // Refrescar permisos desde servidor (empresa ya está en AsyncStorage
        // así que el interceptor de axios inyectará X-Company-ID correctamente)
        await loadPermissions({
          companyId: parsedCompany.id,
          locationId: parsedLocation?.id ?? null,
        });
      } else {
        setSelectedCompany(null);
        setPermissions([]);
      }

      // loadPermissions pudo descubrir que la sucursal guardada ya no es
      // válida (location_forbidden): el interceptor la borra del storage.
      // Se relee para no restaurar una sucursal a la que ya no tiene acceso.
      const stillStoredLocation = await getSelectedLocation();
      if (parsedCompany && parsedLocation && stillStoredLocation) {
        setLocation(parsedLocation);
      } else {
        setLocation(null);
      }

      return parsedCompany as Company | null;
    } catch (error) {
      console.error("Error loading cached data:", error);
      return null;
    }
  };

  // Verificar estado de autenticación al iniciar la app (y al "Reintentar"
  // desde la pantalla de error de conexión).
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      // Verificar si hay token guardado
      const token = await getAuthToken();

      if (!token) {
        // Sin sesión. Se borran restos de sesiones anteriores (empresa,
        // sucursal, permisos) para que el siguiente login no los herede.
        await clearSessionStorage();
        resetSessionState();
        return;
      }

      // Verificar si el token es válido consultando al servidor
      let userData: User;
      try {
        const response = await authAPI.me();
        userData = response.data.user;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        setIsSessionUnverified(false);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          // Token expirado o revocado: limpiar todo y mostrar login.
          await clearSessionStorage();
          resetSessionState();
          return;
        }

        // Sin red, timeout o error del servidor: no es motivo para cerrar la
        // sesión. Se continúa con el usuario guardado y se vuelve a verificar
        // en cuanto haya conexión (ver efecto de re-verificación).
        console.warn("No se pudo verificar la sesión:", describeError(error));
        const cachedUser = await readCachedUser();
        if (!cachedUser) {
          setUser(null);
          setAuthError(
            "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
          );
          return;
        }
        userData = cachedUser;
        setIsSessionUnverified(true);
      }

      // Guardar datos del usuario
      setUser(userData);

      // Empresa/sucursal/permisos guardados, lista de compañías y contador de
      // notificaciones son independientes: en paralelo para no sumar esperas.
      await Promise.all([
        restoreSavedSelection(),
        fetchCompanies(),
        loadUnreadNotificationsCount(),
      ]);
    } catch (error: any) {
      // Errores locales inesperados (storage). No se borra el token: el
      // usuario puede reintentar.
      console.error("Error checking auth status:", describeError(error));
      setAuthError(
        "No se pudo restaurar la sesión. Inténtalo de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Mientras la sesión esté restaurada desde caché, reintentar /auth/me al
  // volver a la app y cada minuto. Si el token ya no sirve, el 401 dispara el
  // cierre de sesión (onUnauthorized); si no hay red se sigue esperando.
  useEffect(() => {
    if (!user || !isSessionUnverified) return;

    let cancelled = false;
    const reverify = async () => {
      try {
        const response = await authAPI.me();
        if (cancelled) return;
        const freshUser: User = response.data.user;
        setUser(freshUser);
        setIsSessionUnverified(false);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUser));
        await loadPermissions();
        await fetchCompanies();
        await loadUnreadNotificationsCount();
      } catch {
        // Sin red todavía (el 401 lo maneja el interceptor).
      }
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reverify();
    });
    const interval = setInterval(reverify, SESSION_REVERIFY_INTERVAL_MS);

    return () => {
      cancelled = true;
      subscription.remove();
      clearInterval(interval);
    };
    // Las funciones de carga solo usan setters y el storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSessionUnverified]);

  // Contador de la campana al día sin recargar: al volver a la app (en web,
  // al volver a la pestaña) y cada minuto mientras está visible. Los push
  // recibidos con la app abierta lo refrescan aparte (onForegroundMessage) y
  // las pantallas lo refrescan después de leer/borrar.
  const canRefreshUnread = Boolean(user) && Boolean(selectedCompany);
  useEffect(() => {
    if (!canRefreshUnread) return;

    const isVisible = () =>
      AppState.currentState === "active" &&
      (Platform.OS !== "web" ||
        typeof document === "undefined" ||
        document.visibilityState === "visible");

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadUnreadNotificationsCount();
    });
    const interval = setInterval(() => {
      if (isVisible()) void loadUnreadNotificationsCount();
    }, UNREAD_REFRESH_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [canRefreshUnread, loadUnreadNotificationsCount]);

  // Login
  const performLogin = async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const response = await authAPI.login({ email, password });
      const { access_token, user: userData } = response.data;

      // Guardar token y datos del usuario
      await setAuthToken(access_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      clearSelectDataCache();
      setAuthError(null);
      setSessionEndMessage(null);
      setIsSessionUnverified(false);
      setUser(userData);

      // Empresa/sucursal guardadas, compañías del usuario y contador de
      // notificaciones, en paralelo.
      const [restoredCompany, companyList] = await Promise.all([
        restoreSavedSelection(),
        fetchCompanies(),
        loadUnreadNotificationsCount(),
      ]);

      // La empresa guardada en este equipo debe ser una de las del usuario
      // que acaba de entrar; si no (equipo compartido, sesión anterior que no
      // se cerró bien), se descarta junto con su sucursal y permisos.
      if (
        restoredCompany &&
        !companyList.some((company) => company.id === restoredCompany.id)
      ) {
        await clearCompanySelection();
      }

      return { success: true };
    } catch (error: any) {
      console.error("Login error:", describeError(error));

      // Sin respuesta del servidor: el interceptor ya dejó el motivo en
      // español (sin red o tiempo agotado).
      let errorMessage = isNetworkError(error)
        ? error.message
        : "Error de conexión. Inténtalo de nuevo.";

      // Extraer info de rate limit de los headers de la respuesta.
      // Laravel siempre envía X-RateLimit-Limit y X-RateLimit-Remaining en
      // respuestas del middleware throttle (incluso en 401). En 429 agrega
      // Retry-After. Axios v1 lower-case los nombres de headers.
      const headers = error.response?.headers ?? {};
      const limit = parseInt(headers["x-ratelimit-limit"] ?? "0", 10);
      const remaining = parseInt(headers["x-ratelimit-remaining"] ?? "0", 10);
      const retryAfterHeader = parseInt(headers["retry-after"] ?? "0", 10);

      // Si el body del 429 trae retry_after/rate_limit (nuestro handler
      // personalizado en bootstrap/app.php), preferirlos.
      const bodyRetryAfter = error.response?.data?.retry_after as number | undefined;
      const bodyLimit = error.response?.data?.rate_limit?.limit as number | undefined;
      const bodyRemaining = error.response?.data?.rate_limit?.remaining as number | undefined;

      const rateLimit: { limit: number; remaining: number; retryAfter?: number } | undefined =
        limit > 0 || bodyLimit
          ? {
              limit: bodyLimit ?? limit,
              remaining: bodyRemaining ?? remaining,
              retryAfter: bodyRetryAfter ?? retryAfterHeader ?? undefined,
            }
          : undefined;

      if (error.response?.status === 429) {
        const seconds = rateLimit?.retryAfter ?? 60;
        errorMessage = `Demasiados intentos. Espera ${seconds} segundos antes de intentar de nuevo.`;
      } else if (error.response?.status === 401) {
        errorMessage =
          "Credenciales incorrectas. Verifica tu email y contraseña.";
      } else if (error.response?.status === 422) {
        errorMessage = "Datos inválidos. Verifica la información ingresada.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return { success: false, error: errorMessage, rateLimit };
    }
  };

  const login = (email: string, password: string): Promise<LoginResult> => {
    if (loginInFlightRef.current) return loginInFlightRef.current;
    const attempt = performLogin(email, password).finally(() => {
      loginInFlightRef.current = null;
    });
    loginInFlightRef.current = attempt;
    return attempt;
  };

  // Logout
  const logout = async () => {
    loggingOutRef.current = true;
    try {
      setIsLoading(true);

      // IMPORTANTE: desactivar el token FCM ANTES de hacer logout en el
      // servidor, porque authAPI.logout() invalida el access_token y la
      // siguiente peticion a /device-tokens/deactivate regresaria 401.
      try {
        await deactivateToken();
      } catch (error) {
        console.warn("No se pudo desactivar el token FCM:", describeError(error));
      }

      // Intentar hacer logout en el servidor
      try {
        await authAPI.logout();
      } catch (error) {
        // Si falla el logout en el servidor, continuar con el logout local
        console.warn(
          "Server logout failed, continuing with local logout:",
          describeError(error)
        );
      }

      // Limpiar datos locales: token, usuario, empresa, sucursal y cachés de
      // permisos/sucursales (equipo compartido: el siguiente usuario no debe
      // heredar nada).
      await clearSessionStorage();
      resetSessionState();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      loggingOutRef.current = false;
      setIsLoading(false);
    }
  };

  // Verificar autenticación al montar el componente
  useEffect(() => {
    // Carga asíncrona al montar; los setState de checkAuthStatus son su
    // indicador de carga, no una cascada de renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuthStatus();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Web: el token es de todas las pestañas (la empresa y la sucursal no, ver
  // utils/axios). Si en otra pestaña se cierra la sesión, aquí también; si
  // allá se inicia sesión, esta pestaña (en login) la toma; y si allá se entra
  // con OTRA cuenta, esta se recarga para no seguir operando como el usuario
  // anterior con el token del nuevo.
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    return onSessionChangedInOtherTab((change) => {
      const currentUser = userRef.current;
      if (change.kind === "token") {
        if (change.token === null) {
          if (!currentUser) return;
          clearTabSelection();
          resetSessionState();
          setSessionEndMessage("La sesión se cerró en otra pestaña. Inicia sesión de nuevo.");
        } else if (!currentUser) {
          void checkAuthStatus();
        }
        return;
      }
      if (
        currentUser &&
        change.userId !== null &&
        change.userId !== currentUser.id &&
        typeof window !== "undefined"
      ) {
        clearTabSelection();
        window.alert(
          "Se inició sesión con otra cuenta en otra pestaña. Esta pestaña se va a recargar.",
        );
        window.location.reload();
      }
    });
    // resetSessionState y checkAuthStatus solo usan setters y el storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    user,
    selectedCompany,
    companies,
    isLoading,
    isSwitchingLocation,
    isAuthenticated: !!user,
    hasCompanySelected: !!selectedCompany,
    isLoadingCompanies,
    unreadNotificationsCount,
    permissions,
    authError,
    sessionEndMessage,
    clearSessionEndMessage: () => setSessionEndMessage(null),
    hasPermission,
    loadUnreadNotificationsCount,
    login,
    logout,
    checkAuthStatus,
    loadCompanies,
    selectCompany,
    clearCompanySelection,
    selectLocation,
    location,
    notificationPermission: permissionStatus,
    requestNotificationPermission: requestPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
