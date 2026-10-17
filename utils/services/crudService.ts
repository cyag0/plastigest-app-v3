import { AxiosRequestConfig, AxiosResponse } from "axios";
import axiosClient, { describeError } from "../axios";
import { errorMessageOf } from "../errorNotice";
import { logHandledError } from "../silenceLogs";

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

/**
 * Opciones de una consulta: `silent` cuando la pantalla muestra su propio
 * error (en el lugar del registro, debajo de un select…) y no debe salir
 * además el aviso global.
 */
export type RequestOptions = Pick<AxiosRequestConfig, "silent">;

// Interfaz para el servicio CRUD
export interface CrudService<T> {
  index: (params?: IndexParams, options?: RequestOptions) => Promise<
    AxiosResponse<
      | LaravelPaginatedResponse<T>
      | T[]
      | {
          data: T[];
        }
    >
  >;
  show: (
    id: number | string,
    params?: Record<string, any>,
    options?: RequestOptions
  ) => Promise<AxiosResponse<LaravelResponse<T>>>;
  store: (data: Partial<T>, options?: RequestOptions) => Promise<AxiosResponse<LaravelResponse<T>>>;
  update: (
    id: number | string,
    data: Partial<T>,
    options?: RequestOptions
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

  const debug = process.env.EXPO_PUBLIC_DEBUG_MODE === "true";

  const logRequest = (method: string, url: string, data?: any) => {
    if (debug) {
      if (data && !(data instanceof FormData)) {
      }
    }
  };

  const logResponse = (method: string, response: any) => {
    if (debug) {
    }
  };

  // Falla del API: el usuario ya la ve en el aviso de la app (interceptor de
  // axios), así que va a la consola sin el aviso rojo de LogBox.
  const logError = (method: string, error: any) => {
    if (error?.response?.status === 422 && error.response.data?.errors) {
      logHandledError(
        `CRUD ${method.toUpperCase()}:`,
        describeError(error),
        error.response.data.errors,
      );
    } else {
      logHandledError(`CRUD ${method.toUpperCase()}:`, describeError(error));
    }
  };

  return {
    /**
     * Obtener lista de recursos con filtros opcionales
     * @param params - Parámetros de filtro y paginación
     */
    index: (params?: IndexParams, options?: RequestOptions) => {
      logRequest("index", baseUrl, params);
      return axiosClient
        .get<LaravelPaginatedResponse<T> | T[]>(baseUrl, {
          ...options,
          params,
        })
        .then((response) => {
          logResponse("index", response);
          return response;
        })
        .catch((error) => {
          logError("index", error);
          throw error;
        });
    },

    /**
     * Obtener un recurso específico por ID
     * @param id - ID del recurso
     */
    show: (id: number | string, data?: Record<string, any>, options?: RequestOptions) => {
      const url = `${baseUrl}/${id}`;
      logRequest("show", url);
      return axiosClient
        .get<LaravelResponse<T>>(url, { ...options, params: data })
        .then((response) => {
          logResponse("show", response);
          return response;
        })
        .catch((error) => {
          logError("show", error);
          throw error;
        });
    },

    /**
     * Crear un nuevo recurso
     * @param data - Datos del recurso a crear
     */
    store: (data: Partial<T>, options?: RequestOptions) => {
      // options.silent: la pantalla muestra el error ella misma.
      return axiosClient.post<LaravelResponse<T>>(baseUrl, data, options);
    },

    /**
     * Actualizar un recurso existente
     * @param id - ID del recurso
     * @param data - Datos a actualizar
     */
    update: (id: number | string, data: Partial<T>, options?: RequestOptions) => {
      if (data instanceof FormData) {
        data.append("_method", "PUT");
      } else {
        data = { ...data, _method: "PUT" };
      }

      return axiosClient.post<LaravelResponse<T>>(`${baseUrl}/${id}`, data, options);
    },

    /**
     * Eliminar un recurso
     * @param id - ID del recurso a eliminar
     */
    destroy: (id: number | string) => {
      const url = `${baseUrl}/${id}`;
      logRequest("destroy", url);
      return axiosClient
        .delete<{ message: string }>(url)
        .then((response) => {
          logResponse("destroy", response);
          return response;
        })
        .catch((error) => {
          logError("destroy", error);
          throw error;
        });
    },
  };
}

// Funciones helper para manejo de errores
export const handleApiError = (error: any) => {
  // Mismo texto que el aviso global (utils/errorNotice): mensaje del servidor
  // o el de red/tiempo agotado en español.
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data ?? {};

    switch (status) {
      case 422:
        // Errores de validación
        return {
          type: "validation",
          message: errorMessageOf(error, "Error de validación"),
          errors: data.errors || {},
        };
      case 404:
        return {
          type: "not_found",
          message: errorMessageOf(error, "Recurso no encontrado"),
        };
      case 401:
        return {
          type: "unauthorized",
          message: errorMessageOf(error, "No autorizado"),
        };
      case 403:
        return {
          type: "forbidden",
          message: errorMessageOf(error, "Acceso denegado"),
        };
      case 500:
        return {
          type: "server_error",
          message: errorMessageOf(error),
        };
      default:
        return {
          type: "unknown",
          message: errorMessageOf(error, "Error desconocido"),
        };
    }
  } else if (error?.request) {
    // Error de red o tiempo agotado
    return {
      type: "network",
      message: errorMessageOf(error, "Error de conexión"),
    };
  } else {
    // Otro tipo de error
    return {
      type: "client",
      message: error?.message || "Error en la aplicación",
    };
  }
};

export default createCrudService;
