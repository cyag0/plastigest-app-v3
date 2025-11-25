import { AxiosResponse } from "axios";
import axiosClient from "../axios";

// Tipos base para la respuesta de Laravel
export interface LaravelPaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface LaravelResponse<T> {
  data: T;
  message?: string;
}

// Tipos para los parámetros de consulta
export interface IndexParams {
  search?: string;
  is_active?: boolean;
  company_id?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
  per_page?: number;
  page?: number;
  all?: boolean;
  paginated?: boolean; // Nuevo parámetro para solicitar paginación
  product_unit_id?: number; // Para filtrar unidades por producto
  [key: string]: any; // Permitir parámetros adicionales
}

// Interfaz para el servicio CRUD
export interface CrudService<T> {
  index: (params?: IndexParams) => Promise<
    AxiosResponse<
      | LaravelPaginatedResponse<T>
      | {
          data: T[];
        }
    >
  >;
  show: (id: number | string) => Promise<AxiosResponse<LaravelResponse<T>>>;
  store: (data: Partial<T>) => Promise<AxiosResponse<LaravelResponse<T>>>;
  update: (
    id: number | string,
    data: Partial<T>
  ) => Promise<AxiosResponse<LaravelResponse<T>>>;
  destroy: (id: number | string) => Promise<AxiosResponse<{ message: string }>>;
}

/**
 * Crea un servicio CRUD genérico para interactuar con nuestra API de Laravel
 * @param endpoint - La URL del endpoint (ej: "/users", "/roles", "/products")
 * @returns Objeto con métodos index, show, store, update, destroy
 */
export function createCrudService<T = any>(endpoint: string): CrudService<T> {
  // Asegurar que el endpoint empiece con /
  const baseUrl = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return {
    /**
     * Obtener lista de recursos con filtros opcionales
     * @param params - Parámetros de filtro y paginación
     */
    index: (params?: IndexParams) => {
      return axiosClient.get<LaravelPaginatedResponse<T> | T[]>(baseUrl, {
        params,
      });
    },

    /**
     * Obtener un recurso específico por ID
     * @param id - ID del recurso
     */
    show: (id: number | string) => {
      return axiosClient.get<LaravelResponse<T>>(`${baseUrl}/${id}`);
    },

    /**
     * Crear un nuevo recurso
     * @param data - Datos del recurso a crear
     */
    store: (data: Partial<T>) => {
      return axiosClient.post<LaravelResponse<T>>(baseUrl, data);
    },

    /**
     * Actualizar un recurso existente
     * @param id - ID del recurso
     * @param data - Datos a actualizar
     */
    update: (id: number | string, data: Partial<T>) => {
      if (data instanceof FormData) {
        data.append("_method", "PUT");
      } else {
        data = { ...data, _method: "PUT" };
      }

      return axiosClient.post<LaravelResponse<T>>(`${baseUrl}/${id}`, data);
    },

    /**
     * Eliminar un recurso
     * @param id - ID del recurso a eliminar
     */
    destroy: (id: number | string) => {
      return axiosClient.delete<{ message: string }>(`${baseUrl}/${id}`);
    },
  };
}

// Funciones helper para manejo de errores
export const handleApiError = (error: any) => {
  if (error.response) {
    // Error de respuesta del servidor
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 422:
        // Errores de validación
        return {
          type: "validation",
          message: data.message || "Error de validación",
          errors: data.errors || {},
        };
      case 404:
        return {
          type: "not_found",
          message: data.message || "Recurso no encontrado",
        };
      case 401:
        return {
          type: "unauthorized",
          message: data.message || "No autorizado",
        };
      case 403:
        return {
          type: "forbidden",
          message: data.message || "Acceso denegado",
        };
      case 500:
        return {
          type: "server_error",
          message: data.message || "Error interno del servidor",
        };
      default:
        return {
          type: "unknown",
          message: data.message || "Error desconocido",
        };
    }
  } else if (error.request) {
    // Error de red
    return {
      type: "network",
      message: "Error de conexión",
    };
  } else {
    // Otro tipo de error
    return {
      type: "client",
      message: error.message || "Error en la aplicación",
    };
  }
};

export default createCrudService;
