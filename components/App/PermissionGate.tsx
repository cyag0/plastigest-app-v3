/**
 * PermissionGate — muestra la vista "sin permiso" si el usuario no tiene el
 * permiso requerido; si lo tiene, renderiza los children.
 *
 *   <PermissionGate permission="sales_list">…</PermissionGate>
 *   <PermissionGate permission={["sales_read", "sales_pos"]}>…</PermissionGate>   // basta uno
 *   <PermissionGate permission={["a", "b"]} all>…</PermissionGate>                // todos
 *   <PermissionGate permission="reports_view" fallback={null}>…</PermissionGate>  // nada si no
 *
 * Para pantallas completas ya no hace falta: el guard de rutas lo hace con el
 * mapa central (utils/permissions/routePermissions.ts). Sirve para secciones
 * dentro de una pantalla (una pestaña, un bloque) que piden otro permiso.
 */
import NoPermissionView from "@/components/App/NoPermissionView";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import type { PermissionRule } from "@/utils/permissions/permissions";
import React from "react";

interface PermissionGateProps {
  /** Permiso o permisos (basta uno; con `all`, todos). */
  permission: PermissionRule;
  /** Exigir todos los permisos de la lista. */
  all?: boolean;
  /**
   * Qué mostrar sin permiso. Por defecto, la vista "sin permiso" con "Volver"
   * e "Ir al inicio"; `null` para no mostrar nada.
   */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  all,
  fallback,
  children,
}: PermissionGateProps) {
  const { isLoading } = useAuth();
  const { can } = useCan();

  // Mientras se cargan sesión y permisos no se decide (sin parpadeo).
  if (isLoading) return null;

  if (!can(permission, { all })) {
    if (fallback !== undefined) return <>{fallback}</>;
    const list = typeof permission === "string" ? [permission] : permission;
    return <NoPermissionView requiredPermissions={list.join(all ? " y " : " o ")} />;
  }

  return <>{children}</>;
}
