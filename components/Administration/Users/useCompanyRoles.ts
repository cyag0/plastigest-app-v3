import Services from "@/utils/services";
import { useEffect, useMemo, useState } from "react";
import { listFrom } from "./userDisplay";

export interface RoleOption {
  id: number;
  name: string;
  description?: string | null;
  permissions_count?: number;
  is_active?: boolean;
}

// La lista, el detalle, el formulario y el selector de rol piden los roles al
// mismo tiempo: comparten la petición en curso (sin guardarla después, para
// que un rol recién creado aparezca al volver a abrir la pantalla).
let inFlight: Promise<RoleOption[]> | null = null;

function fetchCompanyRoles(): Promise<RoleOption[]> {
  if (!inFlight) {
    inFlight = Services.admin.roles
      .index({ all: true } as any)
      .then((response: any) => listFrom<RoleOption>(response?.data))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * Roles de la empresa actual (Administración › Roles y permisos). Requiere
 * roles_list: sin él `error` trae el 403 y `roles` queda en null.
 */
export function useCompanyRoles(enabled = true) {
  const [roles, setRoles] = useState<RoleOption[] | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  const roleIds = useMemo(() => (roles ? new Set(roles.map((role) => role.id)) : null), [roles]);

  return { roles, roleIds, error };
}
