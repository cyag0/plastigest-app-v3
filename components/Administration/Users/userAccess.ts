/**
 * Qué se puede cambiar de un usuario desde Administración, con las mismas
 * reglas que aplica el backend (UserController), para no ofrecer en la app lo
 * que el servidor va a rechazar con 403. Sin dependencias de React Native.
 */

/** Usuario como lo manda UserController (lista y detalle). */
export type AdminUser = App.Entities.User & {
  /** Roles directos (users_roles): aplican en todas sus sucursales. */
  roles?: { id: number; name: string }[];
  /** Cuando el backend lo manda: es administrador del sistema. */
  is_system_admin?: boolean;
  /**
   * Quien consulta puede hacerle cambios protegidos (contraseña, correo,
   * estado, roles, sucursales, quitarlo o eliminarlo): UserController lo manda
   * en la lista, el detalle y la respuesta al guardar.
   */
  can_manage?: boolean;
};

/**
 * ¿Se le ofrecen a quien edita la contraseña, el correo, el estado y los roles
 * de este usuario? Con `can_manage: false` el servidor los rechazaría con 403
 * (tiene permisos que quien edita no tiene); el nombre y la foto sí se pueden
 * cambiar. Si el dato no viene, no se sabe: se ofrecen y decide el servidor.
 */
export function canManageUser(user: AdminUser | null | undefined): boolean {
  return user?.can_manage !== false;
}

/**
 * ¿Es administrador del sistema (o trae un rol que no es de la empresa)?
 * Solo otro administrador del sistema puede cambiarle datos, contraseña,
 * estado o roles: a los demás el backend les responde 403, y en las listas de
 * la sucursal no se muestra (entra a todas).
 *
 * Si el backend manda `is_system_admin`, manda ese. Si no:
 * - tiene roles directos: en la app solo el Super Admin los tiene (los pone
 *   UserSeeder; la app nunca los asigna) y valen en todas las sucursales;
 * - o, cuando se conocen los roles de la empresa, en alguna sucursal de la
 *   empresa tiene un rol que no es de ella (el rol del sistema).
 */
export function isProtectedUser(
  user: AdminUser,
  companyRoleIds?: ReadonlySet<number> | null,
  companyId?: number | null,
): boolean {
  if (typeof user.is_system_admin === "boolean") return user.is_system_admin;
  if ((user.roles ?? []).length > 0) return true;
  if (!companyRoleIds) return false;
  return (user.location_roles ?? []).some(
    (access) =>
      access.role_id != null &&
      (companyId == null || access.company_id == null || access.company_id === companyId) &&
      !companyRoleIds.has(access.role_id),
  );
}

export interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
  avatar?: any;
  /** Solo en la sucursal: su rol en la sucursal actual. */
  location_role_id?: number;
}

export interface LocationRoleValue {
  location_id: number | undefined;
  role_id: number | undefined;
}

interface BuildUserPayloadOptions {
  values: UserFormValues;
  /** Lo que tenía al abrir el formulario; null al crear. */
  initial: UserFormValues | null;
  /** Administración › Esta sucursal: solo su rol aquí (location_role_id). */
  branchMode: boolean;
  canChangePassword: boolean;
  canChangeActive: boolean;
  canChangeRole: boolean;
  /** Empresa: sus sucursales y roles, solo si se tocaron (si no, null). */
  locationRoles?: LocationRoleValue[] | null;
}

/**
 * Lo que se manda al guardar el formulario de usuario.
 *
 * Al editar, el correo, la contraseña, el estado y el rol solo viajan si
 * cambiaron y si quien edita los puede cambiar. Antes se reenviaba todo: el
 * rol que ya tenía (p. ej. el del sistema, que el selector no ofrece)
 * respondía 403 «asignar un rol del sistema» aunque solo se hubiera cambiado
 * el nombre, y un campo sensible sin cambios no debe pasar por las reglas de
 * quién puede cambiar qué.
 *
 * Las sucursales (empresa) van en la misma petición: si el backend rechaza
 * alguna, no se guarda nada a medias.
 */
export function buildUserPayload({
  values,
  initial,
  branchMode,
  canChangePassword,
  canChangeActive,
  canChangeRole,
  locationRoles,
}: BuildUserPayloadOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: (values.name ?? "").trim(),
    avatar: values.avatar ?? [],
  };
  const email = (values.email ?? "").trim();
  const password = values.password ?? "";

  if (!initial) {
    payload.email = email;
    payload.password = password;
    payload.is_active = values.is_active ?? true;
    if (branchMode && values.location_role_id != null) {
      payload.location_role_id = values.location_role_id;
    }
  } else {
    if (email !== (initial.email ?? "").trim()) payload.email = email;
    if (canChangePassword && password) payload.password = password;
    if (canChangeActive && values.is_active !== undefined && !!values.is_active !== !!initial.is_active) {
      payload.is_active = !!values.is_active;
    }
    if (
      branchMode &&
      canChangeRole &&
      values.location_role_id != null &&
      values.location_role_id !== initial.location_role_id
    ) {
      payload.location_role_id = values.location_role_id;
    }
  }

  if (!branchMode && locationRoles) {
    const items = locationRoles
      .filter((lr) => lr.location_id)
      .map((lr) => ({ location_id: lr.location_id, role_id: lr.role_id }));
    // Viaja como multipart y un arreglo vacío no se manda: "" llega como null
    // y el backend lo toma como "sin sucursales".
    payload.location_roles = items.length > 0 ? items : "";
  }

  return payload;
}
