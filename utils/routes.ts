import { Href, router } from "expo-router";

/**
 * Genera rutas estándar para un recurso CRUD
 * @param baseRoute - Ruta base del recurso (ej: "/(tabs)/home/companies")
 * @returns Objeto con funciones para generar rutas
 */
export function generateCrudRoutes(baseRoute: Href) {
  return {
    index: baseRoute,
    create: `${baseRoute}/form` as Href,
    edit: (id: number | string) => `${baseRoute}/${id}/edit` as Href,
    detail: (id: number | string) => `${baseRoute}/${id}` as Href,
  };
}

/**
 * Tipo para las rutas CRUD generadas
 */
export type CrudRoutes = ReturnType<typeof generateCrudRoutes>;

/**
 * Genera configuración de menú para AppList con navegación automática
 * @param baseRoute - Ruta base del recurso (ej: "/(tabs)/home/companies")
 * @param options - Opciones adicionales para personalizar el menú
 * @returns Objeto de configuración de menú para AppList
 */
export function generateCrudMenu<T extends { id: number | string }>(
  baseRoute: Href,
  options?: {
    showView?: boolean | ((item: T) => boolean);
    showEdit?: boolean | ((item: T) => boolean);
    showDelete?: boolean | ((item: T) => boolean);
    onDelete?: (item: T) => void;
    customActions?: Array<{
      title: string;
      icon: string;
      onPress: (item: T) => void;
      color?: string;
      show?: boolean | ((item: T) => boolean);
    }>;
  }
) {
  const routes = generateCrudRoutes(baseRoute);

  return {
    onCreate: () => router.push(routes.create),
    onShow: (item: T) => router.push(routes.detail(item.id)),
    onEdit: (item: T) => {
      console.log(routes.edit(item.id));
      router.push(routes.edit(item.id));
    },
    onDelete: options?.onDelete,
    showView: options?.showView,
    showEdit: options?.showEdit,
    showDelete: options?.showDelete,
    customActions: options?.customActions,
  };
}
