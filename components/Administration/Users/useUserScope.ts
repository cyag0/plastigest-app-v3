import { useAuth } from "@/contexts/AuthContext";
import { UserScope } from "./userDisplay";

/**
 * Alcance real de las pantallas de usuarios según quién las abre, igual que
 * lo limita el backend:
 * - "Todos los usuarios" es del administrador del sistema; para los demás es
 *   la empresa.
 * - Quien no administra todas las sucursales (sin locations_list) solo ve y
 *   edita a los de su sucursal: para él "Usuarios" funciona como el de la
 *   sucursal (rol en la sucursal, quitar de la sucursal) en vez de ofrecerle
 *   cambiar sucursales que no puede tocar.
 */
export function useUserScope(scope: UserScope): UserScope {
  const { hasPermission } = useAuth();
  let effective = scope;
  if (effective === "global" && !hasPermission("system_admin")) effective = "company";
  if (effective === "company" && !hasPermission("locations_list")) effective = "location";
  return effective;
}
