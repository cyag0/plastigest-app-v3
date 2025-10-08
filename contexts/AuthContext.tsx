import {
  authAPI,
  getAuthToken,
  removeAuthToken,
  setAuthToken,
} from "@/utils/axios";
import Services from "@/utils/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

// Tipos
interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
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
  isAuthenticated: boolean;
  hasCompanySelected: boolean;
  isLoadingCompanies: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  loadCompanies: () => Promise<void>;
  selectCompany: (company: Company) => Promise<void>;
  clearCompanySelection: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Variables de entorno
  const USER_DATA_KEY = process.env.EXPO_PUBLIC_USER_DATA_KEY || "user_data";
  const COMPANY_DATA_KEY =
    process.env.EXPO_PUBLIC_COMPANY_DATA_KEY || "selected_company";
  const COMPANIES_DATA_KEY =
    process.env.EXPO_PUBLIC_COMPANIES_DATA_KEY || "companies_list";

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
    } catch (error) {
      console.error("Error selecting company:", error);
    }
  };

  // Limpiar selección de compañía
  const clearCompanySelection = async () => {
    try {
      setSelectedCompany(null);
      await AsyncStorage.removeItem(COMPANY_DATA_KEY);
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

      if (token) {
        // Verificar si el token es válido consultando al servidor
        const response = await authAPI.me();
        const userData = response.data;

        // Guardar datos del usuario
        setUser(userData);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

        // Cargar compañía seleccionada desde caché
        try {
          const cachedCompany = await AsyncStorage.getItem(COMPANY_DATA_KEY);
          if (cachedCompany) {
            setSelectedCompany(JSON.parse(cachedCompany));
          }
        } catch (error) {
          console.error("Error loading cached company:", error);
        }

        // Cargar lista de compañías
        await loadCompanies();
      } else {
        // No hay token, usuario no autenticado
        setUser(null);
        setSelectedCompany(null);
        setCompanies([]);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      // Si hay error (token inválido, servidor no disponible, etc.)
      // Limpiar todo y mostrar login
      await removeAuthToken();
      await AsyncStorage.removeItem(USER_DATA_KEY);
      await AsyncStorage.removeItem(COMPANY_DATA_KEY);
      await AsyncStorage.removeItem(COMPANIES_DATA_KEY);
      setUser(null);
      setSelectedCompany(null);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await authAPI.login({ email, password });
      const { access_token, user: userData } = response.data;

      // Guardar token y datos del usuario
      await setAuthToken(access_token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      setUser(userData);

      // Cargar compañías después del login exitoso
      await loadCompanies();

      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage = "Error de conexión. Inténtalo de nuevo.";

      if (error.response?.status === 401) {
        errorMessage =
          "Credenciales incorrectas. Verifica tu email y contraseña.";
      } else if (error.response?.status === 422) {
        errorMessage = "Datos inválidos. Verifica la información ingresada.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setIsLoading(true);

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
      await AsyncStorage.removeItem(COMPANIES_DATA_KEY);

      setUser(null);
      setSelectedCompany(null);
      setCompanies([]);
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
    isAuthenticated: !!user,
    hasCompanySelected: !!selectedCompany,
    isLoadingCompanies,
    login,
    logout,
    checkAuthStatus,
    loadCompanies,
    selectCompany,
    clearCompanySelection,
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
