import { useCan } from "@/hooks/useCan";
import axiosClient from "@/utils/axios";
import { useEffect, useMemo, useState } from "react";
import { listFrom } from "./userDisplay";

export interface RoleOption {
  id: number;
  name: string;
  description?: string | null;
  permissions_count?: number;
  is_active?: boolean;
  /**
   * ¿El usuario actual puede asignarlo? (la regla de UserController::
   * guardRoles: un rol con permisos que él no tiene responde 403). Si el
   * backend no lo manda, se ofrece y el backend decide.
   */
  assignable?: boolean;
}

// La lista, el detalle, el formulario y el selector de rol piden los roles al
// mismo tiempo: comparten la petición en curso (sin guardarla después, para
// que un rol recién creado aparezca al volver a abrir la pantalla).
let inFlight: Promise<RoleOption[]> | null = null;

function fetchCompanyRoles(): Promise<RoleOption[]> {
  if (!inFlight) {
    // silent: quien la usa decide qué mostrar si falla (el selector de rol lo
    // dice en su lugar; la lista y el detalle siguen sin ella).
    inFlight = axiosClient
      .get("/auth/admin/roles", { params: { all: true }, silent: true })
      .then((response: any) => listFrom<RoleOption>(response?.data))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * Roles de la empresa actual (Administración › Roles y permisos). Requiere
 * roles_list: sin él no se piden (el backend respondería 403), `forbidden`
 * queda en true y `roles` en null.
 */
export function useCompanyRoles(enabled = true) {
  const { can } = useCan();
  const forbidden = !can("roles_list");
  const shouldFetch = enabled && !forbidden;
  const [roles, setRoles] = useState<RoleOption[] | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    fetchCompanyRoles()
      .then((list) => {
        if (cancelled) return;
        setRoles(list);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e ?? true);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch]);

  const roleIds = useMemo(() => (roles ? new Set(roles.map((role) => role.id)) : null), [roles]);

  return { roles, roleIds, error, forbidden };
}
