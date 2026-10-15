import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "react-native-paper";
import RolePicker from "./RolePicker";
import UserAvatar from "./UserAvatar";
import { AdminUser, isProtectedUser } from "./userAccess";
import { useCompanyRoles } from "./useCompanyRoles";
import { accessSummary, apiMessage, listFrom, shortLocationName } from "./userDisplay";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Da acceso a la sucursal actual a alguien que ya es usuario de la empresa
 * (p. ej. un cajero que también cubre turnos aquí): se elige la persona y su
 * rol en esta sucursal. Conserva sus otras sucursales.
 */
export default function AddExistingUserModal({ onClose, onAdded }: Props) {
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { location, selectedCompany } = useAuth();

  const [companyUsers, setCompanyUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const { roleIds } = useCompanyRoles();
  const [roleId, setRoleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Services.admin.users
      .index({ by_company: true } as any)
      .then((response: any) => setCompanyUsers(listFrom<AdminUser>(response?.data)))
      .catch((error) => {
        alerts.error(apiMessage(error, "No se pudieron cargar los usuarios"));
        setCompanyUsers([]);
      });
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los que aún no tienen acceso a esta sucursal. Los administradores del
  // sistema no: ya entran a todas y solo otro administrador los modifica.
  const candidates = useMemo(
    () =>
      companyUsers?.filter(
        (u) => u.is_active && !u.location_role && !isProtectedUser(u, roleIds, selectedCompany?.id),
      ) ?? null,
    [companyUsers, roleIds, selectedCompany?.id],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (candidates ?? [])
      .filter((u) => !term || `${u.name} ${u.email}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [candidates, search]);

  const branch = shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name);

  const save = async () => {
    if (!picked || !roleId) return;
    setSaving(true);
    try {
      await (Services.admin.users.update as any)(picked.id, { location_role_id: roleId });
      alerts.success(`${picked.name} ya tiene acceso a ${branch}`);
      onAdded();
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo agregar a la sucursal"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            {picked && (
              <Pressable onPress={() => setPicked(null)} hitSlop={10} accessibilityLabel="Elegir a otra persona">
                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textSecondary} />
              </Pressable>
            )}
            <Text style={styles.title} numberOfLines={1}>
              {picked ? `Rol en ${branch}` : `Agregar a ${branch}`}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {!picked ? (
            <>
              <Text style={styles.hint}>
                Personas de la empresa que aún no tienen acceso a esta sucursal. Conservan sus otras
                sucursales.
              </Text>
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar por nombre o correo"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {candidates === null ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: tokens.spacing[6] }} />
                ) : filtered.length === 0 ? (
                  <Text style={styles.empty}>
                    {candidates.length === 0
                      ? "Todos los usuarios de la empresa ya tienen acceso a esta sucursal."
                      : "Nadie coincide con la búsqueda."}
                  </Text>
                ) : (
                  filtered.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => {
                        setPicked(u);
                        setRoleId(null);
                      }}
                      style={({ pressed }) => [styles.userRow, pressed && { backgroundColor: colors.surfaceMuted }]}
                    >
                      <UserAvatar name={u.name} uri={u.avatar?.[0]?.uri} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {u.name}
                        </Text>
                        <Text style={styles.userMeta} numberOfLines={1}>
                          {accessSummary(u, selectedCompany?.name)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.pickedRow}>
                <UserAvatar name={picked.name} uri={picked.avatar?.[0]?.uri} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {picked.name}
                  </Text>
                  <Text style={styles.userMeta} numberOfLines={1}>
                    {picked.email}
                  </Text>
                </View>
              </View>
              <ScrollView style={styles.list}>
                <RolePicker value={roleId} onChange={setRoleId} disabled={saving} />
              </ScrollView>
              <View style={styles.actions}>
                <Button mode="outlined" onPress={onClose} disabled={saving} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={save}
                  loading={saving}
                  disabled={!roleId || saving}
                  style={{ flex: 1 }}
                >
                  Dar acceso
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
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
    maxHeight: "88%" as const,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
  },
  title: {
    ...tokens.typography.h3,
    color: c.text,
    flex: 1,
  },
  hint: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
  },
  searchBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
    height: 42,
    paddingHorizontal: tokens.spacing[3],
    backgroundColor: c.surfaceMuted,
    borderRadius: tokens.radius.md,
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.body,
    color: c.text,
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },
  list: {
    maxHeight: 380,
  },
  empty: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
    textAlign: "center" as const,
    paddingVertical: tokens.spacing[6],
  },
  userRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    paddingHorizontal: tokens.spacing[1],
    borderRadius: tokens.radius.sm,
  },
  pickedRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    padding: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    backgroundColor: c.surfaceMuted,
  },
  userName: {
    ...tokens.typography.bodyMd,
    color: c.text,
  },
  userMeta: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  actions: {
    flexDirection: "row" as const,
    gap: tokens.spacing[3],
  },
});
