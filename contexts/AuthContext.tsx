import {
  authAPI,
  getAuthToken,
  removeAuthToken,
  setAuthToken,
} from "@/utils/axios";
import Services from "@/utils/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
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
  hasPermission: (permission: string) => boolean;
  loadUnreadNotificationsCount: () => Promise<void>;
  login: (
    email: string,
    password: string
  ) => Promise<{
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
  }>;
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

  // Registrar notificaciones push cuando el usuario esta autenticado
  const {
    fcmToken,
    deactivateToken,
    permissionStatus,
    requestPermission,
  } = usePushNotifications({
    enabled: Boolean(user),
    onForegroundMessage: () => {
      // Incremento optimista: mostramos el badge al instante, la lista se
      // refresca al hacer foco en la pantalla de notificaciones.
      setUnreadNotificationsCount((prev) => prev + 1);
    },
  });

  // Log del token para debugging
  useEffect(() => {
    if (user && fcmToken) {
      console.log('Usuario autenticado con token FCM:', {
        user: user.email,
        token: fcmToken.substring(0, 50) + '...'
      });
    }
  }, [user, fcmToken]);

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
  const COMPANY_DATA_KEY = "selected_company";
  const LOCATION_DATA_KEY = "selected_location";
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

  // Función para verificar si el usuario tiene un permiso
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  // Cargar permisos desde el servidor y guardarlos en AsyncStorage
  const loadPermissions = async (options?: {
    companyId?: number | null;
    locationId?: number | null;
  }) => {
    const companyId = options?.companyId ?? selectedCompany?.id ?? null;
    const locationId = options?.locationId ?? location?.id ?? null;
    const permissionsKey = getPermissionsStorageKey(companyId, locationId);

    try {
      const response = await authAPI.myPermissions();
      const perms: string[] = response.data.permissions ?? [];
      setPermissions(perms);
      await AsyncStorage.setItem(permissionsKey, JSON.stringify(perms));
    } catch (error) {
      console.error("Error loading permissions:", error);
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

  // Cargar contador de notificaciones no leídas
  const loadUnreadNotificationsCount = async () => {
    try {
      const response = await Services.notifications.getUnreadCount();
      console.log("Unread notifications count response:", response);

      setUnreadNotificationsCount(response.data.count || 0);
    } catch (error) {
      console.log("Error loading unread notifications count:", error);
      setUnreadNotificationsCount(0);
    }
  };

  // Cargar compañías disponibles
  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);

      const response = await Services.admin.companies.index();
      let companiesData = response.data;

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
      }
    } catch (error) {
      console.error("Error loading companies:", error);
      // Intentar cargar desde caché local
      try {
        const cachedCompanies = await AsyncStorage.getItem(COMPANIES_DATA_KEY);
        if (cachedCompanies) {
          setCompanies(JSON.parse(cachedCompanies));
        }
      } catch (cacheError) {
        console.error("Error loading cached companies:", cacheError);
      }
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  // Seleccionar compañía
  const selectCompany = async (company: Company) => {
    try {
      setSelectedCompany(company);
      await AsyncStorage.setItem(COMPANY_DATA_KEY, JSON.stringify(company));
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

      if (location) {
        await AsyncStorage.setItem(
          LOCATION_DATA_KEY,
          JSON.stringify(location)
        );
      } else {
        await AsyncStorage.removeItem(LOCATION_DATA_KEY);
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
      setSelectedCompany(null);
      setLocation(null);
      setPermissions([]);
      await AsyncStorage.removeItem(COMPANY_DATA_KEY);
      await AsyncStorage.removeItem(LOCATION_DATA_KEY);
      await clearPermissionsCache();
    } catch (error) {
      console.error("Error clearing company selection:", error);
    }
  };

  // Verificar estado de autenticación al iniciar la app
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // Verificar si hay token guardado
      const token = await getAuthToken();

      if (!token) {
        // No hay token, usuario no autenticado
        setUser(null);
        setSelectedCompany(null);
        setLocation(null);
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      // Verificar si el token es válido consultando al servidor
      const response = await authAPI.me();
      const userData = response.data.user;

      // Guardar datos del usuario
      setUser(userData);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      // Cargar compañía y location desde caché
      try {
        const cachedCompany = await AsyncStorage.getItem(COMPANY_DATA_KEY);
        const cachedLocation = await AsyncStorage.getItem(LOCATION_DATA_KEY);
        const parsedCompany = cachedCompany ? JSON.parse(cachedCompany) : null;
        const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
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

        if (parsedLocation) {
          setLocation(parsedLocation);
        } else {
          setLocation(null);
        }
      } catch (error) {
        console.error("Error loading cached data:", error);
      }

      // Cargar lista de compañías
      await loadCompanies();

      // Cargar contador de notificaciones
      await loadUnreadNotificationsCount();
    } catch (error: any) {
      // Si es un error 401, significa que el token expiró o es inválido
      // No mostramos error porque es un caso esperado
      if (error?.response?.status !== 401) {
        console.error("Error checking auth status:", error);
      }

      // Limpiar todo y mostrar login
      await removeAuthToken();
      await AsyncStorage.removeItem(USER_DATA_KEY);
      await AsyncStorage.removeItem(COMPANY_DATA_KEY);
      await AsyncStorage.removeItem(COMPANIES_DATA_KEY);
      await AsyncStorage.removeItem(LOCATION_DATA_KEY);
      await clearPermissionsCache();
      setUser(null);
      setSelectedCompany(null);
      setCompanies([]);
      setLocation(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    error?: string;
    rateLimit?: { limit: number; remaining: number; retryAfter?: number };
  }> => {
    try {
      // setIsLoading(true);

      const response = await authAPI.login({ email, password });
      const { access_token, user: userData } = response.data;

      // Guardar token y datos del usuario
      await setAuthToken(access_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      setUser(userData);

      // Cargar compañía y location desde caché si existen
      try {
        const cachedCompany = await AsyncStorage.getItem(COMPANY_DATA_KEY);
        const cachedLocation = await AsyncStorage.getItem(LOCATION_DATA_KEY);
        const parsedCompany = cachedCompany ? JSON.parse(cachedCompany) : null;
        const parsedLocation = cachedLocation ? JSON.parse(cachedLocation) : null;
        const permissionsKey = getPermissionsStorageKey(
          parsedCompany?.id,
          parsedLocation?.id,
        );
        const cachedPermissions = await AsyncStorage.getItem(permissionsKey);

        if (parsedCompany) {
          setSelectedCompany(parsedCompany);
        }

        if (parsedLocation) {
          setLocation(parsedLocation);
        }

        if (cachedPermissions) {
          setPermissions(JSON.parse(cachedPermissions));
        }

        if (parsedCompany) {
          await loadPermissions({
            companyId: parsedCompany.id,
            locationId: parsedLocation?.id ?? null,
          });
        }
      } catch (error) {
        console.error("Error loading cached data:", error);
      }

      // Cargar compañías después del login exitoso
      await loadCompanies();

      // Cargar contador de notificaciones
      await loadUnreadNotificationsCount();

      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Error de conexión. Inténtalo de nuevo.";

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
    } finally {
      //setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);

      // IMPORTANTE: desactivar el token FCM ANTES de hacer logout en el
      // servidor, porque authAPI.logout() invalida el access_token y la
      // siguiente peticion a /device-tokens/deactivate regresaria 401.
      try {
        await deactivateToken();
      } catch (error) {
        console.warn("No se pudo desactivar el token FCM:", error);
      }

      // Intentar hacer logout en el servidor
      try {
        await authAPI.logout();
      } catch (error) {
        // Si falla el logout en el servidor, continuar con el logout local
        console.warn(
          "Server logout failed, continuing with local logout:",
          error
        );
      }

      // Limpiar datos locales
      await removeAuthToken();
      await AsyncStorage.removeItem(USER_DATA_KEY);
      await AsyncStorage.removeItem(COMPANY_DATA_KEY);
      await AsyncStorage.removeItem(LOCATION_DATA_KEY);
      await AsyncStorage.removeItem(COMPANIES_DATA_KEY);
      await clearPermissionsCache();

      setUser(null);
      setSelectedCompany(null);
      setLocation(null);
      setCompanies([]);
      setPermissions([]);
      setUnreadNotificationsCount(0);

      // Limpiar badge del sistema
      if (Platform.OS !== "web") {
        Notifications.setBadgeCountAsync(0).catch(() => undefined);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar autenticación al montar el componente
  useEffect(() => {
    checkAuthStatus();
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
