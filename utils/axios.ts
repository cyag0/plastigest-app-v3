import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosInstance, AxiosResponse } from "axios";

// Configuración base para el cliente axios usando variables de entorno
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || "10000");
const AUTH_TOKEN_KEY = process.env.EXPO_PUBLIC_AUTH_TOKEN_KEY || "auth_token";
const USER_DATA_KEY = process.env.EXPO_PUBLIC_USER_DATA_KEY || "user_data";
const LOG_REQUESTS = process.env.EXPO_PUBLIC_LOG_REQUESTS === "true";

// Crear instancia de axios
const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: "application/json",
  },
});

// Interceptor para requests - agregar token de autenticación
axiosClient.interceptors.request.use(
  async (config: any) => {
    try {
      // Obtener token desde AsyncStorage usando la variable de entorno
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log requests solo si está habilitado en las variables de entorno
      if (LOG_REQUESTS) {
        console.log("Request:", {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
          data: config.data,
        });
      }

      return config;
    } catch (error) {
      console.error("Error getting token from storage:", error);
      return config;
    }
  },
  (error: any) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Interceptor para responses - manejar errores globalmente
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses solo si está habilitado
    if (LOG_REQUESTS) {
      console.log("Response:", {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error: any) => {
    console.error("Response error:", error.response?.data || error.message);

    // Si el token expiró (401), limpiar storage y redirigir a login
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(USER_DATA_KEY);
        // Aquí podrías agregar lógica para redirigir al login
        console.log("Token expired, cleared storage");
      } catch (storageError) {
        console.error("Error clearing storage:", storageError);
      }
    }

    return Promise.reject(error);
  }
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

  changePassword: (passwordData: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => axiosClient.post("/auth/change-password", passwordData),
};

// Función para obtener el usuario autenticado
export const getCurrentUser = () => axiosClient.get("/user");

export default axiosClient;
