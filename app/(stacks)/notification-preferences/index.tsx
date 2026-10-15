import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import NotificationPermissionBanner from "@/components/Notifications/NotificationPermissionBanner";
import Services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  Icon,
  Searchbar,
  Switch,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type EventType = App.Entities.NotificationEventType;
type Preference = App.Entities.NotificationPreference;
type ChannelKey = "channel_db" | "channel_push" | "channel_email";

interface EligibleUser {
  id: number;
  name: string;
  email: string;
}

// ─── Modal de selección de usuarios ────────────────────────────────────────

function AssignUsersModal({
  visible,
  allUsers,
  currentIds,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  allUsers: EligibleUser[];
  currentIds: number[] | null; // null = todos
  saving: boolean;
  onSave: (ids: number[] | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  // El modal se monta cada vez que se abre: null → todos seleccionados.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(currentIds ?? allUsers.map((u) => u.id))
  );

  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allUsers.map((u) => u.id)));
  const clearAll = () => setSelected(new Set());

  // Solo cuentan los que siguen siendo elegibles (un usuario pudo perder el
  // permiso desde que se guardó la lista).
  const selectedEligible = allUsers.filter((u) => selected.has(u.id)).length;
  const allChecked = selectedEligible === allUsers.length;

  const handleSave = () => {
    const ids = allUsers.filter((u) => selected.has(u.id)).map((u) => u.id);
    // null = todos los que tengan el permiso (incluidos los que se agreguen después)
    onSave(ids.length === allUsers.length ? null : ids);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text variant="titleMedium" style={modalStyles.title}>
              Seleccionar destinatarios
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Icon source="close" size={22} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text variant="bodySmall" style={modalStyles.hint}>
            Solo aparecen los usuarios con el permiso que pide este aviso.
          </Text>

          {/* Buscador */}
          <Searchbar
            placeholder="Buscar usuario..."
            value={search}
            onChangeText={setSearch}
            style={modalStyles.searchbar}
            inputStyle={{ fontSize: 14 }}
          />

          {/* Seleccionar / deseleccionar todos */}
          <View style={modalStyles.bulkRow}>
            <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
              {selectedEligible} de {allUsers.length} seleccionado{selectedEligible !== 1 ? "s" : ""}
            </Text>
            <TouchableOpacity onPress={allChecked ? clearAll : selectAll}>
              <Text variant="labelSmall" style={{ color: palette.primary, fontWeight: "600" }}>
                {allChecked ? "Quitar todos" : "Seleccionar todos"}
              </Text>
            </TouchableOpacity>
          </View>

          <Divider style={{ marginBottom: 4 }} />

          {/* Lista */}
          <ScrollView style={modalStyles.list} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <View style={modalStyles.emptyRow}>
                <Icon source="account-off-outline" size={20} color={palette.textSecondary} />
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  Sin resultados
                </Text>
              </View>
            ) : (
              filtered.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => toggle(user.id)}
                  style={modalStyles.userRow}
                  activeOpacity={0.7}
                >
                  <View style={modalStyles.avatar}>
                    <Text style={modalStyles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: palette.text, fontWeight: "500" }}>
                      {user.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: palette.textSecondary, fontSize: 12 }}>
                      {user.email}
                    </Text>
                  </View>
                  <Checkbox
                    status={selected.has(user.id) ? "checked" : "unchecked"}
                    onPress={() => toggle(user.id)}
                    color={palette.primary}
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Acciones */}
          <Divider style={{ marginTop: 4 }} />
          <View style={modalStyles.actions}>
            <Button mode="outlined" onPress={onClose} style={{ flex: 1 }} disabled={saving}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={{ flex: 1 }}
              loading={saving}
              disabled={saving}
            >
              Guardar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  sheet:      { backgroundColor: palette.card, borderRadius: 20, padding: 20, maxHeight: "85%", width: "100%", maxWidth: 520 },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title:      { color: palette.text, fontWeight: "700" },
  hint:       { color: palette.textSecondary, marginBottom: 12 },
  closeBtn:   { padding: 4 },
  searchbar:  { backgroundColor: palette.surface, marginBottom: 12, height: 44, elevation: 0 },
  bulkRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  list:       { maxHeight: 320 },
  emptyRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16, justifyContent: "center" },
  userRow:    { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderRadius: 8 },
  avatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primary + "25", justifyContent: "center", alignItems: "center" },
  avatarText: { color: palette.primary, fontWeight: "700", fontSize: 15 },
  actions:    { flexDirection: "row", gap: 12, marginTop: 14 },
});

// ─── Catálogo de eventos ────────────────────────────────────────────────────
// La lista de eventos la manda el backend (uno por cada tipo, con valores por
// defecto si la empresa no lo ha configurado); aquí solo va cómo mostrarlos.
// `directRecipients`: avisos que van a personas concretas (sin permiso que
// filtre), por eso no tienen lista de destinatarios.

const EVENT_CONFIG: Record<
  string,
  { label: string; description: string; icon: string; directRecipients?: string }
> = {
  low_stock: {
    label: "Stock bajo",
    description: "Cuando un producto queda por debajo de su stock mínimo en una sucursal.",
    icon: "package-variant-remove",
  },
  inventory_adjustment: {
    label: "Ajustes de inventario",
    description: "Cuando alguien registra un ajuste de existencias (no le llega a quien lo hizo).",
    icon: "tune-variant",
  },
  inventory_count_discrepancy: {
    label: "Diferencias de conteo",
    description: "Cuando un conteo encuentra cantidades distintas al stock esperado.",
    icon: "clipboard-alert-outline",
  },
  purchase_update: {
    label: "Compras",
    description: "Cuando una compra sale en camino o se recibe.",
    icon: "truck-delivery-outline",
  },
  transfer_update: {
    label: "Transferencias",
    description: "Cuando una transferencia se aprueba, rechaza, envía, recibe o cancela.",
    icon: "swap-horizontal",
    directRecipients:
      "Llega a quien pidió la transferencia y, cuando se recibe, también a quien la envió.",
  },
  task_event: {
    label: "Tareas",
    description: "Tarea asignada, completada, comentada, por vencer (menos de un día) y vencida.",
    icon: "clipboard-check-outline",
    directRecipients:
      "Llega a las personas de cada tarea: a quien se le asigna (asignación, por vencer, vencida, comentarios) y a quien la creó (cuando se completa o la comentan).",
  },
  reminder: {
    label: "Recordatorios",
    description: "Cuando se acerca la fecha de un recordatorio con aviso activado y el mismo día.",
    icon: "calendar-clock",
    directRecipients: "Llega al usuario al que está asignado el recordatorio.",
  },
};

const EVENT_ORDER: string[] = [
  "low_stock",
  "inventory_adjustment",
  "inventory_count_discrepancy",
  "purchase_update",
  "transfer_update",
  "task_event",
  "reminder",
];

function getEventConfig(eventType: string) {
  return (
    EVENT_CONFIG[eventType] ?? {
      label: eventType.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      description: "Tipo de aviso nuevo.",
      icon: "bell-outline",
    }
  );
}

function sortPreferences(list: Preference[]) {
  const rank = (eventType: string) => {
    const index = EVENT_ORDER.indexOf(eventType);
    return index === -1 ? EVENT_ORDER.length : index;
  };
  return [...list].sort((a, b) => rank(a.event_type) - rank(b.event_type));
}

const CHANNELS: { key: ChannelKey; label: string; icon: string }[] = [
  { key: "channel_db", label: "Campana", icon: "bell-outline" },
  { key: "channel_push", label: "Push", icon: "cellphone-message" },
  { key: "channel_email", label: "Correo", icon: "email-outline" },
];

function normalizeUsers(response: any): EligibleUser[] {
  const payload = response?.data ?? response;
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((u: any) => u?.id)
    .map((u: any) => ({ id: u.id, name: u.name ?? "Usuario", email: u.email ?? "" }));
}

function errorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

// ─── Tarjeta de evento ──────────────────────────────────────────────────────

function EventPreferenceCard({
  pref,
  eligibleUsers,
  loadingUsers,
  canManage,
  saving,
  onChange,
  onOpenModal,
  onRestore,
}: {
  pref: Preference;
  /** null = no se pudo saber (sin permiso para consultarlo). */
  eligibleUsers: EligibleUser[] | null;
  loadingUsers: boolean;
  canManage: boolean;
  saving: boolean;
  onChange: (patch: Partial<Preference>) => void;
  onOpenModal: () => void;
  /** Solo en la sucursal: volver a la configuración de la empresa. */
  onRestore?: () => void;
}) {
  const config = getEventConfig(pref.event_type);
  const isActive = pref.is_active;
  const allowedIds = pref.allowed_user_ids;
  const hasPermissionFilter = Boolean(pref.permission_name);
  const noChannels = !pref.channel_db && !pref.channel_push && !pref.channel_email;
  const disabled = !canManage || saving;

  const assignedUsers =
    eligibleUsers === null
      ? []
      : allowedIds === null
        ? eligibleUsers
        : eligibleUsers.filter((u) => allowedIds.includes(u.id));

  return (
    <Card style={[styles.card, !isActive && styles.cardInactive]}>
      <Card.Content>
        {/* Cabecera */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.eventIcon,
              { backgroundColor: isActive ? palette.primary + "20" : palette.surface },
            ]}
          >
            <Icon
              source={config.icon}
              size={22}
              color={isActive ? palette.primary : palette.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={[styles.eventLabel, !isActive && { color: palette.textSecondary }]}
            >
              {config.label}
            </Text>
            <Text variant="bodySmall" style={styles.eventDescription}>
              {config.description}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={(value) => onChange({ is_active: value })}
            disabled={disabled}
            color={palette.primary}
          />
        </View>

        {/* En la sucursal: si el aviso sigue a la empresa o se personalizó. */}
        {onRestore && (
          <View style={styles.scopeRow}>
            <Icon
              source={pref.is_customized ? "store-edit-outline" : "link-variant"}
              size={14}
              color={pref.is_customized ? palette.primary : palette.textMuted}
            />
            <Text
              variant="bodySmall"
              style={[styles.scopeText, pref.is_customized && { color: palette.primary }]}
            >
              {pref.is_customized ? "Personalizado en esta sucursal" : "Igual que en la empresa"}
            </Text>
            {pref.is_customized && canManage && (
              <TouchableOpacity onPress={onRestore} disabled={saving} hitSlop={8}>
                <Text variant="labelSmall" style={styles.scopeLink}>
                  Usar el de la empresa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isActive && (
          <>
            <Divider style={styles.divider} />

            {/* Canales */}
            <Text variant="labelSmall" style={styles.usersLabel}>
              CANALES
            </Text>
            <View style={styles.channelsRow}>
              {CHANNELS.map((channel) => {
                const on = pref[channel.key];
                return (
                  <Chip
                    key={channel.key}
                    icon={on ? "check" : channel.icon}
                    selected={on}
                    showSelectedCheck={false}
                    onPress={() => onChange({ [channel.key]: !on } as Partial<Preference>)}
                    disabled={disabled}
                    style={[styles.channelChip, on && styles.channelChipOn]}
                    textStyle={[styles.channelChipText, on && styles.channelChipTextOn]}
                    compact
                    accessibilityLabel={`${channel.label}: ${on ? "activado" : "desactivado"}`}
                  >
                    {channel.label}
                  </Chip>
                );
              })}
            </View>
            {noChannels && (
              <View style={styles.infoRow}>
                <Icon source="bell-off-outline" size={16} color={palette.error} />
                <Text variant="bodySmall" style={[styles.infoText, { color: palette.error }]}>
                  Sin canales: este aviso no le llegará a nadie.
                </Text>
              </View>
            )}

            <Divider style={styles.divider} />

            {/* Destinatarios */}
            {!hasPermissionFilter ? (
              <View style={styles.infoRow}>
                <Icon source="information-outline" size={16} color={palette.textSecondary} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {config.directRecipients ??
                    "Este aviso se envía directamente a las personas involucradas."}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.assignedHeader}>
                  <Text variant="labelSmall" style={styles.usersLabel}>
                    DESTINATARIOS
                  </Text>
                  {canManage && eligibleUsers !== null && (
                    <TouchableOpacity onPress={onOpenModal} disabled={loadingUsers || saving}>
                      <Text variant="labelSmall" style={{ color: palette.primary, fontWeight: "600" }}>
                        Gestionar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingUsers ? (
                  <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 8 }} />
                ) : eligibleUsers === null ? (
                  <Text variant="bodySmall" style={styles.infoText}>
                    {allowedIds === null
                      ? "Todos los usuarios con permiso."
                      : `${allowedIds.length} usuario${allowedIds.length === 1 ? "" : "s"} elegido${allowedIds.length === 1 ? "" : "s"}.`}
                  </Text>
                ) : assignedUsers.length === 0 ? (
                  <View style={styles.infoRow}>
                    <Icon source="bell-off-outline" size={16} color={palette.error} />
                    <Text variant="bodySmall" style={[styles.infoText, { color: palette.error }]}>
                      Sin destinatarios — nadie recibirá esta notificación
                    </Text>
                  </View>
                ) : (
                  <View style={styles.chipsRow}>
                    {allowedIds === null ? (
                      <Chip
                        icon="account-group"
                        style={styles.chip}
                        textStyle={styles.chipText}
                        compact
                      >
                        Todos con permiso ({eligibleUsers.length})
                      </Chip>
                    ) : (
                      assignedUsers.map((u) => (
                        <Chip
                          key={u.id}
                          style={styles.chip}
                          textStyle={styles.chipText}
                          compact
                        >
                          {u.name}
                        </Chip>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

export default function NotificationPreferencesScreen() {
  const alerts = useAlerts();
  const { hasPermission, location } = useAuth();
  const navigation = useNavigation();
  // ?scope=location: los avisos de la sucursal actual (Administración › Esta
  // sucursal). Cada aviso usa el de la empresa hasta que se cambia aquí.
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const branchScope = scope === "location" ? ("location" as const) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: branchScope ? `Notificaciones · ${location?.name ?? "sucursal"}` : "Preferencias de Notificaciones",
    });
  }, [navigation, branchScope, location?.name]);
  // GET pide notifications_list; cambiar algo (y ver los usuarios elegibles)
  // pide notifications_manage.
  const canManage = hasPermission("notifications_manage");

  const [prefs, setPrefs] = useState<Preference[]>([]);
  // Usuarios elegibles por permiso (varios eventos comparten permiso).
  const [eligibleByPermission, setEligibleByPermission] = useState<
    Record<string, EligibleUser[]>
  >({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<EventType | null>(null);

  // Modal state
  const [modalEvent, setModalEvent] = useState<EventType | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      setLoadError(null);
      const prefsRes = await Services.notificationPreferences.index(branchScope);
      const list: Preference[] = Array.isArray(prefsRes?.data)
        ? prefsRes.data
        : Array.isArray(prefsRes)
          ? prefsRes
          : [];
      setPrefs(sortPreferences(list));
      setLoading(false);

      if (!canManage) return;

      // Una consulta por permiso (inventory_manage, purchases_manage…), no
      // por evento. Antes se listaban todos los usuarios de la empresa,
      // aunque sin el permiso nunca reciben el aviso.
      const permissions = Array.from(
        new Set(list.map((p) => p.permission_name).filter(Boolean)),
      );
      setLoadingUsers(true);
      const entries = await Promise.all(
        permissions.map(async (permission) => {
          const pref = list.find((p) => p.permission_name === permission)!;
          try {
            const response = await Services.notificationPreferences.eligibleUsers(
              pref.event_type,
              branchScope ? { scope: branchScope } : undefined,
            );
            return [permission, normalizeUsers(response)] as const;
          } catch {
            return null;
          }
        }),
      );
      setEligibleByPermission(
        Object.fromEntries(
          entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        ),
      );
    } catch (error: any) {
      setLoadError(
        error?.response?.status === 403
          ? "No tienes permiso para ver las preferencias de notificaciones."
          : errorMessage(error, "No se pudieron cargar las preferencias."),
      );
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  }, [canManage, branchScope]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const savePref = async (eventType: EventType, patch: Partial<Preference>) => {
    const previous = prefs;
    // En la sucursal, cambiar algo la deja con su propia configuración.
    const customized = branchScope ? { is_customized: true } : {};
    setPrefs((current) =>
      current.map((p) => (p.event_type === eventType ? { ...p, ...patch, ...customized } : p)),
    );
    setSaving(eventType);
    try {
      await Services.notificationPreferences.update(eventType, patch, branchScope);
    } catch (error) {
      // Se regresa al valor anterior: el switch no debe quedar mintiendo.
      setPrefs(previous);
      alerts.error(errorMessage(error, "Error al guardar la preferencia"));
    } finally {
      setSaving(null);
    }
  };

  // Guardar asignación de usuarios desde el modal
  const handleSaveUsers = async (ids: number[] | null) => {
    if (!modalEvent) return;
    setModalSaving(true);
    try {
      await Services.notificationPreferences.update(modalEvent, { allowed_user_ids: ids }, branchScope);
      setPrefs((current) =>
        current.map((p) =>
          p.event_type === modalEvent
            ? { ...p, allowed_user_ids: ids, ...(branchScope ? { is_customized: true } : {}) }
            : p,
        ),
      );
      alerts.success("Destinatarios guardados");
      setModalEvent(null);
    } catch (error) {
      alerts.error(errorMessage(error, "Error al guardar los destinatarios"));
    } finally {
      setModalSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await alerts.confirm(
      branchScope
        ? "¿Usar en todos los avisos de esta sucursal la configuración de la empresa?"
        : "¿Restablecer todas las preferencias a los valores predeterminados?",
      {
        title: branchScope ? "Usar la configuración de la empresa" : "Restablecer preferencias",
        okText: branchScope ? "Usar la de la empresa" : "Restablecer",
        cancelText: "Cancelar",
      }
    );
    if (!confirmed) return;
    try {
      await Services.notificationPreferences.reset(branchScope);
      alerts.success(branchScope ? "La sucursal usa la configuración de la empresa" : "Preferencias restablecidas");
      loadAll();
    } catch (error) {
      alerts.error(errorMessage(error, "Error al restablecer las preferencias"));
    }
  };

  // Un aviso de la sucursal vuelve a la configuración de la empresa.
  const handleRestore = async (eventType: EventType) => {
    setSaving(eventType);
    try {
      await Services.notificationPreferences.restore(eventType, branchScope);
      await loadAll();
    } catch (error) {
      alerts.error(errorMessage(error, "No se pudo volver a la configuración de la empresa"));
    } finally {
      setSaving(null);
    }
  };

  const anyCustomized = prefs.some((p) => p.is_customized);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text variant="bodyMedium" style={{ color: palette.textSecondary, marginTop: 12 }}>
            Cargando preferencias...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const modalPref = modalEvent ? prefs.find((p) => p.event_type === modalEvent) : undefined;
  const modalUsers = modalPref ? eligibleByPermission[modalPref.permission_name] : undefined;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <NotificationPermissionBanner />

        {loadError ? (
          <View style={styles.errorBox}>
            <Icon source="lock-outline" size={20} color={palette.textSecondary} />
            <Text variant="bodyMedium" style={styles.errorText}>
              {loadError}
            </Text>
            <Button mode="outlined" icon="refresh" onPress={loadAll}>
              Reintentar
            </Button>
          </View>
        ) : (
          <>
            {branchScope ? (
              <Text variant="bodyMedium" style={styles.intro}>
                Avisos de lo que pasa en {location?.name ?? "esta sucursal"}. Cada aviso
                funciona como en la empresa hasta que lo cambias aquí; los destinatarios
                son las personas de esta sucursal.
              </Text>
            ) : (
              <Text variant="bodyMedium" style={styles.intro}>
                Activa o desactiva cada aviso de la empresa, elige por dónde llega (campana
                de la app, push al celular/navegador o correo) y, en los avisos por permiso,
                quién lo recibe. Cada sucursal puede cambiarlos en Administración › Esta
                sucursal.
              </Text>
            )}

            {!canManage && (
              <View style={styles.readOnlyNote}>
                <Icon source="lock-outline" size={16} color={palette.textSecondary} />
                <Text variant="bodySmall" style={styles.infoText}>
                  Solo lectura: cambiar estas preferencias requiere el permiso
                  &quot;Gestionar notificaciones&quot;.
                </Text>
              </View>
            )}

            {prefs.map((pref) => (
              <EventPreferenceCard
                key={pref.event_type}
                pref={pref}
                eligibleUsers={
                  pref.permission_name
                    ? eligibleByPermission[pref.permission_name] ?? null
                    : null
                }
                loadingUsers={loadingUsers}
                canManage={canManage}
                saving={saving === pref.event_type}
                onChange={(patch) => savePref(pref.event_type, patch)}
                onOpenModal={() => setModalEvent(pref.event_type)}
                onRestore={branchScope ? () => handleRestore(pref.event_type) : undefined}
              />
            ))}

            {canManage && (!branchScope || anyCustomized) && (
              <Button
                mode="outlined"
                onPress={handleReset}
                style={styles.resetButton}
                icon="refresh"
                textColor={palette.error}
              >
                {branchScope
                  ? "Usar la configuración de la empresa en todo"
                  : "Restablecer valores predeterminados"}
              </Button>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal de selección de usuarios */}
      {modalEvent !== null && modalUsers && (
        <AssignUsersModal
          visible={modalEvent !== null}
          allUsers={modalUsers}
          currentIds={modalPref?.allowed_user_ids ?? null}
          saving={modalSaving}
          onSave={handleSaveUsers}
          onClose={() => setModalEvent(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: palette.background },
  scrollContent:    { padding: 16, paddingBottom: 40 },
  centered:         { flex: 1, justifyContent: "center", alignItems: "center" },
  intro:            { color: palette.textSecondary, marginTop: 12, marginBottom: 16, lineHeight: 20 },
  readOnlyNote:     { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, backgroundColor: palette.surface, marginBottom: 16 },
  errorBox:         { alignItems: "center", gap: 12, padding: 24, marginTop: 12 },
  errorText:        { color: palette.textSecondary, textAlign: "center" },

  card:             { marginBottom: 16, backgroundColor: palette.card, borderRadius: 16, elevation: 0 },
  cardInactive:     { opacity: 0.65 },
  cardHeader:       { flexDirection: "row", alignItems: "center", gap: 12 },
  eventIcon:        { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  eventLabel:       { color: palette.text, fontWeight: "600", marginBottom: 2 },
  eventDescription: { color: palette.textSecondary, fontSize: 12, lineHeight: 16 },

  divider:          { marginVertical: 12, backgroundColor: palette.border },

  channelsRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  channelChip:      { backgroundColor: palette.surface },
  channelChipOn:    { backgroundColor: palette.primary + "22" },
  channelChipText:  { color: palette.textSecondary, fontSize: 12 },
  channelChipTextOn:{ color: palette.primary, fontWeight: "600" },

  assignedHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  usersLabel:       { color: palette.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  chipsRow:         { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:             { backgroundColor: palette.primary + "18" },
  chipText:         { color: palette.primary, fontSize: 12 },

  infoRow:          { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  scopeRow:         { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 10 },
  scopeText:        { color: palette.textMuted, fontSize: 12 },
  scopeLink:        { color: palette.primary, fontWeight: "600", marginLeft: 4 },
  infoText:         { color: palette.textSecondary, flex: 1, lineHeight: 18 },

  resetButton:      { marginTop: 8, borderColor: palette.error },
});
