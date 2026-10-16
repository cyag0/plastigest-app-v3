/**
 * Reglas de permisos de la app. Los nombres son los del backend
 * (database/seeders/PermissionSeeder.php y las migraciones que agregan
 * permisos): `<recurso>_list|read|create|update|delete` para los CRUD
 * (CrudController::$permissionPrefix) y especiales como sales_pos,
 * sales_discount, locations_all o system_admin.
 *
 * El backend autoriza con CurrentWorker::hasPermission(), que busca el nombre
 * exacto entre los permisos del usuario en la sucursal actual, y
 * /auth/my-permissions regresa esa misma lista (AuthContext.permissions).
 *
 * system_admin NO abre todo por sí solo: el backend tampoco lo hace. Los roles
 * de sistema reciben todos los permisos (el seeder y las migraciones se los
 * asignan), así que para un administrador del sistema la lista ya viene
 * completa y aquí no hace falta tratarlo aparte.
 *
 * Funciones puras (sin React) para poder probarlas con node.
 */

/**
 * Un permiso o varios. Con varios basta con tener uno (o todos, con
 * `{ all: true }`). Un arreglo vacío, `null` o `undefined` no exigen nada.
 */
export type PermissionRule = string | readonly string[];

export interface CanOptions {
  /** Exigir todos los permisos de la lista en vez de uno. */
  all?: boolean;
}

/** Acciones de un recurso CRUD (CrudController). */
export type CrudAction = "list" | "read" | "create" | "update" | "delete";

/** Nombre del permiso de una acción CRUD: crudPermission("products", "create") → "products_create". */
export function crudPermission(prefix: string, action: CrudAction): string {
  return `${prefix}_${action}`;
}

/**
 * ¿Los permisos `granted` cumplen la regla?
 * - "products_list"                  → ese permiso.
 * - ["sales_read", "sales_pos"]      → cualquiera de los dos.
 * - [...] con { all: true }          → todos.
 * - null / undefined / []            → no exige nada (true).
 */
export function checkPermission(
  granted: ReadonlySet<string>,
  rule: PermissionRule | null | undefined,
  options?: CanOptions,
): boolean {
  if (rule == null) return true;
  const list = typeof rule === "string" ? [rule] : rule;
  if (list.length === 0) return true;
  return options?.all
    ? list.every((permission) => granted.has(permission))
    : list.some((permission) => granted.has(permission));
}
