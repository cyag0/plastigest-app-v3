import ActiveBadge from "@/components/App/ActiveBadge";
import AppChip from "@/components/App/Chip";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { goBack } from "@/utils/navigation";
import axiosClient from "@/utils/axios";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";
import RolePicker from "./RolePicker";
import UserAvatar from "./UserAvatar";
import { AdminUser, canManageUser, isProtectedUser } from "./userAccess";
import { useCompanyRoles } from "./useCompanyRoles";
import { useUserScope } from "./useUserScope";
import { UserScope, apiMessage, shortLocationName, userRoutes } from "./userDisplay";

interface ActionRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
  first?: boolean;
}

/** Renglón de la lista de acciones del detalle. */
function ActionRow({ icon, label, hint, danger, disabled, onPress, first }: ActionRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        !first && styles.rowDivider,
        pressed && { backgroundColor: colors.surfaceMuted },
        disabled && { opacity: 0.5 },
      ]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={20} color={danger ? colors.error : colors.textSecondary} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.actionLabel, danger && { color: colors.error }]}>{label}</Text>
        {!!hint && <Text style={styles.actionHint}>{hint}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/**
 * Detalle de un usuario: quién es, a qué sucursales entra y con qué rol, y lo
 * que se puede hacer con él. En la sucursal, el rol y "Quitar de esta
 * sucursal" solo tocan la sucursal actual.
 */
export default function UserDetailScreen({ id, scope: requestedScope }: { id: number; scope: UserScope }) {
  const scope = useUserScope(requestedScope);
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user: me, location, selectedCompany, hasPermission } = useAuth();
  const routes = userRoutes(scope);

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // 403/404 al cargarlo: no existe o quien abre no tiene acceso a él.
  const [loadError, setLoadError] = useState<string | null>(null);
  const { roleIds } = useCompanyRoles();
  const [busy, setBusy] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [newRoleId, setNewRoleId] = useState<number | null>(null);

  const isMe = me?.id === id;
  const canEdit = hasPermission("users_update");
  const canDelete = hasPermission("users_delete");
  const canSeeActivity = hasPermission("users_read");
  // Elegir el nuevo rol pide la lista de roles (roles_list).
  const canPickRole = hasPermission("roles_list");
  const branch = shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name);

  const load = useCallback(async () => {
    try {
      // silent: un 403/404 se explica en la pantalla; los demás errores, con
      // alerts.error.
      const response: any = await axiosClient.get(`/auth/admin/users/${id}`, { silent: true });
      setUser(response?.data?.data ?? null);
      setLoadFailed(false);
      setLoadError(null);
    } catch (error: any) {
      setLoadFailed(true);
      const status = error?.response?.status;
      if (status === 403 || status === 404) {
        setLoadError(
          status === 404
            ? "Este usuario no existe o no tienes acceso a él."
            : apiMessage(error, "No tienes permiso para ver a este usuario."),
        );
      } else {
        alerts.error(apiMessage(error, "No se pudo cargar el usuario"));
      }
    }
    // alerts es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Se recarga al volver de editar.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleActive = async () => {
    if (!user) return;
    const activate = !user.is_active;
    if (!activate) {
      const ok = await alerts.confirm(
        `${user.name} no podrá entrar a la app hasta que lo vuelvas a activar. Se cierran sus sesiones abiertas.`,
        { title: "Desactivar usuario", okText: "Desactivar", cancelText: "Cancelar" },
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      // 1/0: el backend no acepta "true"/"false" como booleano.
      await (Services.admin.users.update as any)(user.id, { is_active: activate ? 1 : 0 });
      alerts.success(activate ? "Usuario activado" : "Usuario desactivado");
      await load();
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo cambiar el estado"));
    } finally {
      setBusy(false);
    }
  };

  const removeFromBranch = async () => {
    if (!user) return;
    const ok = await alerts.confirm(
      `${user.name} ya no podrá entrar a ${branch}. Sigue siendo usuario de la empresa y conserva sus otras sucursales.`,
      { title: "Quitar de esta sucursal", okText: "Quitar", cancelText: "Cancelar" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await Services.admin.users.removeFromCurrentLocation(user.id);
      alerts.success(`${user.name} ya no tiene acceso a ${branch}`);
      goBack();
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo quitar de la sucursal"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!user) return;
    const ok = await alerts.confirm(
      `¿Eliminar a ${user.name}? Esta acción no se puede deshacer. Si ya registró ventas o movimientos, desactívalo en su lugar.`,
      { title: "Eliminar usuario", okText: "Eliminar", cancelText: "Cancelar" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await Services.admin.users.destroy(user.id);
      alerts.success("Usuario eliminado");
      goBack();
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo eliminar el usuario"));
    } finally {
      setBusy(false);
    }
  };

  const saveRole = async () => {
    if (!user || !newRoleId) return;
    setBusy(true);
    try {
      await (Services.admin.users.update as any)(user.id, { location_role_id: newRoleId });
      alerts.success("Rol actualizado");
      setChangingRole(false);
      await load();
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo cambiar el rol"));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        {loadError ? (
          <View style={styles.loadError}>
            <MaterialCommunityIcons name="account-question-outline" size={36} color={colors.textMuted} />
            <Text style={styles.loadErrorText}>{loadError}</Text>
            <Button mode="outlined" icon="arrow-left" onPress={() => goBack()}>
              Volver
            </Button>
          </View>
        ) : loadFailed ? (
          <Button mode="outlined" icon="refresh" onPress={load}>
            Reintentar
          </Button>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  const access = user.location_roles ?? [];
  const branchAccess = user.location_role;
  // Administrador del sistema: solo otro administrador del sistema lo
  // modifica (el backend responde 403 a los demás), así que no se ofrece.
  const locked = !hasPermission("system_admin") && isProtectedUser(user, roleIds, selectedCompany?.id);
  // Tiene permisos que tú no tienes (can_manage: false del backend): solo se
  // le cambian nombre y foto; lo demás respondería 403.
  const restricted = !locked && !canManageUser(user);

  const actions: Omit<ActionRowProps, "first">[] = [];
  if (canEdit && !locked) {
    actions.push({
      icon: "pencil-outline",
      label: "Editar datos",
      hint: restricted
        ? "Nombre y foto"
        : scope !== "location"
          ? "Nombre, correo, contraseña y sucursales"
          : isMe
            ? "Nombre, correo y contraseña"
            : "Nombre, correo, contraseña y rol",
      onPress: () => router.push(routes.edit(user.id) as any),
    });
  }
  if (canSeeActivity) {
    actions.push({
      icon: "history",
      label: "Ver actividad",
      hint: "Lo que ha hecho en la app",
      onPress: () =>
        router.push({ pathname: "/(stacks)/activity", params: { user_id: String(user.id), name: user.name } } as any),
    });
  }
  if (canEdit && !isMe && !locked && !restricted) {
    actions.push({
      icon: user.is_active ? "account-cancel-outline" : "account-check-outline",
      label: user.is_active ? "Desactivar usuario" : "Activar usuario",
      hint: user.is_active ? "No podrá entrar a la app" : "Vuelve a tener acceso",
      onPress: toggleActive,
    });
  }
  if (scope === "location" && canEdit && !isMe && !locked && !restricted && branchAccess) {
    actions.push({
      icon: "account-remove-outline",
      label: "Quitar de esta sucursal",
      hint: "Conserva sus otras sucursales",
      danger: true,
      onPress: removeFromBranch,
    });
  }
  if (scope !== "location" && canDelete && !isMe && !locked && !restricted) {
    actions.push({ icon: "delete-outline", label: "Eliminar usuario", danger: true, onPress: remove });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Quién es */}
        <View style={styles.profile}>
          <UserAvatar name={user.name} uri={user.avatar?.[0]?.uri} size={72} />
          <View style={styles.profileBody}>
            <Text style={styles.name}>{user.name}</Text>
            {/* A todo lo ancho: al lado de la foto el correo se partía en dos renglones. */}
            <Text style={styles.email} selectable numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.badges}>
              <ActiveBadge active={!!user.is_active} />
              {isMe && (
                <AppChip size="sm" variant="default">
                  Tú
                </AppChip>
              )}
            </View>
          </View>
        </View>

        {/* Su acceso */}
        {scope === "location" ? (
          <>
            <Text style={styles.sectionTitle}>En {branch}</Text>
            <View style={styles.card}>
              <View style={styles.accessRow}>
                <MaterialCommunityIcons name="shield-account-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.accessLabel}>Rol</Text>
                  <Text style={styles.accessValue}>
                    {branchAccess ? (branchAccess.role_name ?? "Sin rol") : "Sin acceso a esta sucursal"}
                  </Text>
                </View>
                {canEdit && canPickRole && !isMe && !locked && !restricted && branchAccess && (
                  <Button
                    compact
                    mode="text"
                    onPress={() => {
                      setNewRoleId(branchAccess.role_id);
                      setChangingRole(true);
                    }}
                  >
                    Cambiar
                  </Button>
                )}
              </View>
            </View>
            {access.length > 1 && (
              <Text style={styles.note}>
                También tiene acceso a:{" "}
                {access
                  .filter((a) => a.location_id !== location?.id)
                  .map((a) => shortLocationName(a.location_name, selectedCompany?.name))
                  .join(", ")}
                .
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Sucursales y roles</Text>
            <View style={styles.card}>
              {access.length === 0 ? (
                <View style={styles.accessRow}>
                  <MaterialCommunityIcons name="store-off-outline" size={20} color={colors.warning} />
                  <Text style={[styles.accessValue, { flex: 1, color: colors.warning }]}>
                    Sin sucursales: no puede entrar a ninguna.
                  </Text>
                </View>
              ) : (
                access.map((a, index) => (
                  <View key={a.location_id} style={[styles.accessRow, index > 0 && styles.rowDivider]}>
                    <MaterialCommunityIcons name="store-outline" size={20} color={colors.textSecondary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.accessValue} numberOfLines={1}>
                        {scope === "company"
                          ? shortLocationName(a.location_name, selectedCompany?.name)
                          : a.location_name}
                      </Text>
                      <Text style={styles.accessLabel}>{a.role_name ?? "Sin rol"}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {locked && (
          <View style={styles.lockedNote}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.info} />
            <Text style={styles.lockedNoteText}>
              Es administrador del sistema: entra a todas las sucursales y solo otro administrador del
              sistema puede cambiar sus datos, su contraseña, su acceso o sus roles.
            </Text>
          </View>
        )}
        {restricted && (
          <View style={styles.lockedNote}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.info} />
            <Text style={styles.lockedNoteText}>
              Tiene permisos que tú no tienes: puedes cambiar su nombre y su foto, pero su correo,
              contraseña, estado, rol y sucursales los cambia alguien con esos permisos.
            </Text>
          </View>
        )}

        {/* Qué se puede hacer */}
        {actions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Acciones</Text>
            <View style={styles.card}>
              {actions.map((action, index) => (
                <ActionRow key={action.label} {...action} disabled={action.disabled || busy} first={index === 0} />
              ))}
            </View>
          </>
        )}

        {!!user.created_at && (
          <Text style={styles.meta}>
            Alta: {new Date(user.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        )}
      </ScrollView>

      {/* Cambiar el rol en esta sucursal */}
      {changingRole && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setChangingRole(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Rol de {user.name}</Text>
              <Text style={styles.sheetHint}>Solo cambia su rol en {branch}.</Text>
              <ScrollView style={{ maxHeight: 380 }}>
                <RolePicker value={newRoleId} onChange={setNewRoleId} disabled={busy} />
              </ScrollView>
              <View style={styles.sheetActions}>
                <Button mode="outlined" onPress={() => setChangingRole(false)} disabled={busy} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={saveRole}
                  loading={busy}
                  disabled={busy || !newRoleId || newRoleId === branchAccess?.role_id}
                  style={{ flex: 1 }}
                >
                  Guardar
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  center: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  content: {
    width: "100%" as const,
    maxWidth: 760,
    alignSelf: "center" as const,
    padding: tokens.spacing[4],
    paddingBottom: tokens.spacing[10],
  },
  profile: {
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    padding: tokens.spacing[5],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  profileBody: {
    alignSelf: "stretch" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  name: {
    ...tokens.typography.h3,
    color: c.text,
    textAlign: "center" as const,
  },
  email: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
    textAlign: "center" as const,
  },
  badges: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    fontWeight: "600" as const,
    marginTop: tokens.spacing[5],
    marginBottom: tokens.spacing[2],
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden" as const,
  },
  accessRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
  },
  accessLabel: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  accessValue: {
    ...tokens.typography.bodyMd,
    color: c.text,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  note: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: tokens.spacing[2],
    paddingHorizontal: 2,
  },
  actionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
  },
  actionLabel: {
    ...tokens.typography.bodyMd,
    color: c.text,
  },
  actionHint: {
    ...tokens.typography.caption,
    color: c.textMuted,
  },
  meta: {
    ...tokens.typography.caption,
    color: c.textMuted,
    textAlign: "center" as const,
    marginTop: tokens.spacing[5],
  },
  lockedNote: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: tokens.spacing[3],
    marginTop: tokens.spacing[5],
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.md,
    backgroundColor: c.infoSoft,
  },
  lockedNoteText: {
    ...tokens.typography.bodySm,
    color: c.text,
    flex: 1,
  },
  loadError: {
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    padding: tokens.spacing[6],
    maxWidth: 420,
  },
  loadErrorText: {
    ...tokens.typography.body,
    color: c.textSecondary,
    textAlign: "center" as const,
  },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: tokens.spacing[4],
  },
  sheet: {
    width: "100%" as const,
    maxWidth: 520,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  sheetTitle: {
    ...tokens.typography.h3,
    color: c.text,
  },
  sheetHint: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
  },
  sheetActions: {
    flexDirection: "row" as const,
    gap: tokens.spacing[3],
  },
});
