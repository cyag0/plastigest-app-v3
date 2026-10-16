import { useAuth } from "@/contexts/AuthContext";
import {
  checkPermission,
  crudPermission,
  type CanOptions,
  type PermissionRule,
} from "@/utils/permissions/permissions";
import { canAccessRouteWith, type RouteHref } from "@/utils/permissions/routePermissions";
import { useMemo } from "react";

/**
 * Permisos del usuario en la sucursal actual, listos para decidir qué
 * mostrar. Usa la misma lista que el backend (AuthContext.permissions, de
 * /auth/my-permissions) y los mismos nombres.
 *
 *   const { can, canCreate, canAccessRoute } = useCan();
 *   can("sales_discount")                         // un permiso
 *   can(["sales_read", "sales_pos"])              // basta uno
 *   can(["sales_orders_create", "sales_orders_update"], { all: true })
 *   canCreate("products")                         // products_create
 *   canAccessRoute("/(tabs)/home/sales")          // regla del mapa central
 *
 * Ocultar algo en la app es solo para no ofrecer lo que el backend va a
 * rechazar: el backend sigue validando cada petición.
 */
export function useCan() {
  const { permissions } = useAuth();

  return useMemo(() => {
    const granted = new Set(permissions);
    const can = (rule?: PermissionRule | null, options?: CanOptions) =>
      checkPermission(granted, rule, options);

    return {
      /** ¿Tiene el permiso (o uno de la lista; todos con { all: true })? */
      can,
      /** <prefix>_list: ver la lista del recurso. */
      canList: (prefix: string) => can(crudPermission(prefix, "list")),
      /** <prefix>_read: abrir el detalle. */
      canRead: (prefix: string) => can(crudPermission(prefix, "read")),
      /** <prefix>_create: botón "+" / "Nuevo". */
      canCreate: (prefix: string) => can(crudPermission(prefix, "create")),
      /** <prefix>_update: "Editar" / "Guardar cambios". */
      canUpdate: (prefix: string) => can(crudPermission(prefix, "update")),
      /** <prefix>_delete: "Eliminar". */
      canDelete: (prefix: string) => can(crudPermission(prefix, "delete")),
      /**
       * ¿Puede abrir esta ruta? Según el mapa central
       * (utils/permissions/routePermissions.ts). Para menús y enlaces.
       */
      canAccessRoute: (href: RouteHref) => canAccessRouteWith(href, granted),
      /** Los permisos tal cual (para casos raros; prefiere `can`). */
      permissions,
    };
  }, [permissions]);
}

export type Can = ReturnType<typeof useCan>;
