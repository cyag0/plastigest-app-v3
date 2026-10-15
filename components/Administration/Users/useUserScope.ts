import { useAuth } from "@/contexts/AuthContext";
import { UserScope } from "./userDisplay";

/**
 * Puede entrar a todas las sucursales de la empresa: administrador del
 * sistema o con «Acceso a todas las sucursales» (locations_all). Mismo
 * criterio que CurrentWorker::canAccessAllLocations() en el backend. Antes
 * era locations_list («Ubicaciones › Listar»), que ya solo lista sucursales.
 */
export function useAllLocationsAccess(): boolean {
  const { hasPermission } = useAuth();
  return hasPermission("system_admin") || hasPermission("locations_all");
}

/**
 * Alcance real de las pantallas de usuarios según quién las abre, igual que
 * lo limita el backend:
 * - "Todos los usuarios" es del administrador del sistema; para los demás es
 *   la empresa.
 * - Quien no entra a todas las sucursales solo ve y edita a los de su
 *   sucursal: para él "Usuarios" funciona como el de la sucursal (rol en la
 *   sucursal, quitar de la sucursal) en vez de ofrecerle cambiar sucursales
 *   que no puede tocar.
 */
export function useUserScope(scope: UserScope): UserScope {
  const { hasPermission } = useAuth();
  const allLocations = useAllLocationsAccess();
  let effective = scope;
  if (effective === "global" && !hasPermission("system_admin")) effective = "company";
  if (effective === "company" && !allLocations) effective = "location";
  return effective;
}
