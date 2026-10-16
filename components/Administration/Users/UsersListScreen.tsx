import AppBar from "@/components/App/AppBar";
import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AddExistingUserModal from "./AddExistingUserModal";
import UserAvatar from "./UserAvatar";
import { AdminUser, isProtectedUser } from "./userAccess";
import { useCompanyRoles } from "./useCompanyRoles";
import { useAllLocationsAccess, useUserScope } from "./useUserScope";
import {
  UserScope,
  accessSummary,
  apiMessage,
  listFrom,
  shortLocationName,
  userRoutes,
} from "./userDisplay";

const PARAMS: Record<UserScope, Record<string, any>> = {
  global: {},
  company: { by_company: true },
  location: { scope: "location" },
};

/**
 * Usuarios de todas las empresas, de la empresa o de la sucursal actual.
 *
 * Pensada primero para celular: cada renglón es nombre, correo (en una línea,
 * cortado si no cabe) y su acceso (rol en la sucursal, o sus sucursales).
 * Los inactivos van al final, aparte.
 */
export default function UsersListScreen({ scope: requestedScope }: { scope: UserScope }) {
  const scope = useUserScope(requestedScope);
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user: me, selectedCompany, location, hasPermission } = useAuth();
  const allLocations = useAllLocationsAccess();
  const { roleIds } = useCompanyRoles();
  const routes = userRoutes(scope);

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [addingExisting, setAddingExisting] = useState(false);

  // En la sucursal el usuario nuevo entra con un rol, y elegirlo pide la
  // lista de roles (roles_list): sin ella el formulario no se podría guardar.
  const canCreate = hasPermission("users_create") && (scope !== "location" || hasPermission("roles_list"));
  // Abrir a alguien pide users_read (sin él el detalle respondería 403).
  const canOpen = hasPermission("users_read");
  // Traer a alguien de otra sucursal: quien entra a todas las sucursales (y
  // puede ver los roles para elegir con cuál entra: roles_list).
  const canAddExisting =
    scope === "location" && hasPermission("users_update") && hasPermission("roles_list") && allLocations;

  const requestId = useRef(0);
  const load = useCallback(
    async (isRefresh = false) => {
      const current = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const response = await Services.admin.users.index(PARAMS[scope] as any);
        if (current !== requestId.current) return;
        setUsers(listFrom<AdminUser>(response?.data));
      } catch (error) {
        if (current !== requestId.current) return;
        alerts.error(apiMessage(error, "No se pudieron cargar los usuarios"));
        setUsers((prev) => prev ?? []);
      } finally {
        if (current === requestId.current) setRefreshing(false);
      }
    },
    // alerts es estable; el alcance no cambia mientras la pantalla vive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope],
  );

  // Al volver de crear/editar se recarga (sin parpadeo).
  useFocusEffect(
    useCallback(() => {
      load();
      navigation.setOptions({
        headerRight: () =>
          canCreate ? (
            <AppBar.Action
              icon="plus"
              iconColor={colors.primary}
              accessibilityLabel="Nuevo usuario"
              onPress={() => router.push(routes.create as any)}
            />
          ) : null,
      });
      // Solo al enfocar.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, canCreate]),
  );

  // Administradores del sistema: entran a todas las sucursales y solo otro
  // administrador del sistema los modifica. En la lista de la sucursal no van
  // (el Super Admin venía en todas); en la de la empresa se marcan.
  const isProtected = useCallback(
    (u: AdminUser) => isProtectedUser(u, roleIds, selectedCompany?.id),
    [roleIds, selectedCompany?.id],
  );
  const listed = useMemo(
    () => (scope === "location" ? (users ?? []).filter((u) => !isProtected(u)) : (users ?? [])),
    [users, scope, isProtected],
  );
  const hiddenAdmins = (users?.length ?? 0) - listed.length;

  const { active, inactive } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = listed.filter((u) => {
      if (!term) return true;
      const haystack = [
        u.name,
        u.email,
        u.location_role?.role_name,
        ...(u.location_roles ?? []).map((a) => `${a.location_name} ${a.role_name ?? ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
    const byName = (a: AdminUser, b: AdminUser) => a.name.localeCompare(b.name, "es");
    return {
      active: matches.filter((u) => u.is_active).sort(byName),
      inactive: matches.filter((u) => !u.is_active).sort(byName),
    };
  }, [listed, search]);

  const total = listed.length;
  const scopeName =
    scope === "location"
      ? shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name)
      : selectedCompany?.name;

  const summary =
    scope === "location"
      ? `${total} ${total === 1 ? "persona tiene" : "personas tienen"} acceso a ${scopeName}`
      : scope === "company"
        ? `${total} ${total === 1 ? "usuario" : "usuarios"} en ${scopeName ?? "la empresa"}`
        : `${total} ${total === 1 ? "usuario" : "usuarios"} en todas las empresas`;

  const renderRow = (u: AdminUser, index: number) => {
    const isMe = me?.id === u.id;
    const systemAdmin = scope !== "location" && isProtected(u);
    let access: React.ReactNode;
    if (scope === "location") {
      const role = u.location_role?.role_name;
      access = role ? (
        <AppChip size="sm" variant="primary">
          {role}
        </AppChip>
      ) : (
        <AppChip size="sm" variant="warning" icon="alert-outline">
          Sin rol
        </AppChip>
      );
    } else if (scope === "global") {
      const companies = (u.companies ?? []).map((c) => c.name).join(", ");
      access = (
        <Text style={styles.access} numberOfLines={1}>
          {companies || "Sin empresa"}
        </Text>
      );
    } else {
      const none = (u.location_roles ?? []).length === 0;
      access = (
        <Text style={[styles.access, none && { color: colors.warning }]} numberOfLines={1}>
          {accessSummary(u, selectedCompany?.name)}
        </Text>
      );
    }

    return (
      <Pressable
        key={u.id}
        onPress={canOpen ? () => router.push(routes.detail(u.id) as any) : undefined}
        disabled={!canOpen}
        style={({ pressed }) => [
          styles.row,
          index > 0 && styles.rowDivider,
          pressed && { backgroundColor: colors.surfaceMuted },
        ]}
        accessibilityRole={canOpen ? "button" : undefined}
        accessibilityLabel={`${u.name}, ${u.email}`}
      >
        <View style={!u.is_active && styles.dimmed}>
          <UserAvatar name={u.name} uri={u.avatar?.[0]?.uri} size={44} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, !u.is_active && styles.mutedText]} numberOfLines={1}>
              {u.name}
            </Text>
            {isMe && (
              <AppChip size="sm" variant="default">
                Tú
              </AppChip>
            )}
            {systemAdmin && (
              <AppChip size="sm" variant="info" icon="shield-crown-outline">
                Admin. del sistema
              </AppChip>
            )}
          </View>
          <Text style={styles.email} numberOfLines={1}>
            {u.email}
          </Text>
          <View style={styles.accessLine}>{access}</View>
        </View>
        {canOpen && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />}
      </Pressable>
    );
  };

  if (users === null) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
        }
      >
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, correo o rol"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summary}>{summary}</Text>
          {canAddExisting && (
            <Pressable onPress={() => setAddingExisting(true)} hitSlop={8} style={styles.linkButton}>
              <MaterialCommunityIcons name="account-arrow-right-outline" size={16} color={colors.primary} />
              <Text style={styles.link}>Agregar de otra sucursal</Text>
            </Pressable>
          )}
        </View>

        {hiddenAdmins > 0 && (
          <Text style={styles.footnote}>
            Los administradores del sistema no aparecen aquí: entran a todas las sucursales.
          </Text>
        )}

        {total === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title={scope === "location" ? "Nadie tiene acceso a esta sucursal" : "Aún no hay usuarios"}
            description={
              scope === "location"
                ? "Crea a las personas que trabajan aquí; quedan con acceso a esta sucursal y el rol que elijas."
                : undefined
            }
            actionLabel={canCreate ? "Nuevo usuario" : undefined}
            onAction={canCreate ? () => router.push(routes.create as any) : undefined}
          />
        ) : active.length + inactive.length === 0 ? (
          <Text style={styles.noResults}>Nadie coincide con “{search.trim()}”.</Text>
        ) : (
          <>
            {active.length > 0 && <View style={styles.group}>{active.map(renderRow)}</View>}

            {inactive.length > 0 && (
              <>
                <Text style={styles.groupTitle}>Inactivos · sin acceso</Text>
                <View style={styles.group}>{inactive.map(renderRow)}</View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {canAddExisting && addingExisting && (
        <AddExistingUserModal
          onClose={() => setAddingExisting(false)}
          onAdded={() => {
            setAddingExisting(false);
            load(true);
          }}
        />
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
  searchBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
    height: 46,
    paddingHorizontal: tokens.spacing[3],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.body,
    color: c.text,
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },
  summaryRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[3],
    marginBottom: tokens.spacing[2],
    paddingHorizontal: 2,
  },
  summary: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    flexShrink: 1,
  },
  linkButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  link: {
    ...tokens.typography.caption,
    color: c.primary,
    fontWeight: "600" as const,
  },
  group: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden" as const,
  },
  groupTitle: {
    ...tokens.typography.caption,
    color: c.textMuted,
    fontWeight: "600" as const,
    marginTop: tokens.spacing[5],
    marginBottom: tokens.spacing[2],
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameLine: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
  },
  name: {
    ...tokens.typography.bodyMd,
    fontWeight: "600" as const,
    color: c.text,
    flexShrink: 1,
  },
  email: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  accessLine: {
    flexDirection: "row" as const,
    marginTop: 4,
  },
  access: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    flexShrink: 1,
  },
  dimmed: {
    opacity: 0.5,
  },
  mutedText: {
    color: c.textSecondary,
  },
  footnote: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginBottom: tokens.spacing[2],
    paddingHorizontal: 2,
  },
  noResults: {
    ...tokens.typography.body,
    color: c.textSecondary,
    textAlign: "center" as const,
    paddingVertical: tokens.spacing[8],
  },
});
