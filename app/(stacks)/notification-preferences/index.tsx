import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
  // null→ todos seleccionados al abrir
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(currentIds ?? allUsers.map((u) => u.id))
  );


  console.log(allUsers)

  // Resetear al abrir
  useFocusEffect(
    useCallback(() => {
      setSelected(new Set(currentIds ?? allUsers.map((u) => u.id)));
      setSearch("");
    }, [visible])
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

  const handleSave = () => {
    const ids = Array.from(selected);
    // null = todos
    onSave(ids.length === allUsers.length ? null : ids);
  };

  const allChecked = selected.size === allUsers.length;

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
              {selected.size} de {allUsers.length} seleccionado{selected.size !== 1 ? "s" : ""}
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
  sheet:      { backgroundColor: palette.card, borderRadius: 20, padding: 20, maxHeight: "85%", width: "100%" },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title:      { color: palette.text, fontWeight: "700" },
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

const EVENT_CONFIG: Record<
  EventType,
  { label: string; description: string; icon: string; hasPermission: boolean }
> = {
  low_stock: {
    label: "Stock Bajo",
    description: "Usuarios con permiso de inventario que recibirán alertas de stock bajo",
    icon: "package-variant-remove",
    hasPermission: true,
  },
  inventory_adjustment: {
    label: "Ajuste de Inventario",
    description: "Usuarios con permiso de inventario que recibirán notificaciones de ajustes",
    icon: "tune-variant",
    hasPermission: true,
  },
  inventory_count_discrepancy: {
    label: "Discrepancia de Conteo",
    description: "Usuarios con permiso de inventario que recibirán alertas de discrepancias",
    icon: "clipboard-alert-outline",
    hasPermission: true,
  },
  purchase_update: {
    label: "Actualización de Compra",
    description: "Usuarios con permiso de compras que recibirán actualizaciones de órdenes",
    icon: "truck-delivery-outline",
    hasPermission: true,
  },
  task_event: {
    label: "Evento de Tarea",
    description: "Las notificaciones de tareas van al usuario asignado directamente",
    icon: "clipboard-check-outline",
    hasPermission: false,
  },
};

const EVENT_TYPES: EventType[] = [
  "low_stock",
  "inventory_adjustment",
  "inventory_count_discrepancy",
  "purchase_update",
  "task_event",
];

interface PrefData {
  is_active: boolean;
  channel_db: boolean;
  channel_email: boolean;
  channel_push: boolean;
  allowed_user_ids: number[] | null;
}

// ─── Tarjeta de evento ──────────────────────────────────────────────────────

function EventPreferenceCard({
  eventType,
  pref,
  allUsers,
  loadingUsers,
  onToggleActive,
  onOpenModal,
  saving,
}: {
  eventType: EventType;
  pref: PrefData | undefined;
  allUsers: EligibleUser[];
  loadingUsers: boolean;
  onToggleActive: (value: boolean) => void;
  onOpenModal: () => void;
  saving: boolean;
}) {
  const config = EVENT_CONFIG[eventType];
  const isActive = pref?.is_active ?? true;
  const allowedIds = pref?.allowed_user_ids ?? null;

  // Usuarios asignados actualmente
  const assignedUsers =
    allowedIds === null
      ? allUsers
      : allUsers.filter((u) => allowedIds.includes(u.id));

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
            <Text variant="bodySmall" style={styles.eventDescription} numberOfLines={2}>
              {config.description}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={onToggleActive}
            disabled={saving}
            color={palette.primary}
          />
        </View>

        {/* Sección de destinatarios */}
        {isActive && (
          <>
            <Divider style={styles.divider} />

            {!config.hasPermission ? (
              <View style={styles.infoRow}>
                <Icon source="information-outline" size={16} color={palette.textSecondary} />
                <Text variant="bodySmall" style={styles.infoText}>
                  Las notificaciones de tareas se envían automáticamente al usuario asignado y/o al creador.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.assignedHeader}>
                  <Text variant="labelSmall" style={styles.usersLabel}>
                    DESTINATARIOS
                  </Text>
                  <TouchableOpacity onPress={onOpenModal} disabled={loadingUsers || saving}>
                    <Text variant="labelSmall" style={{ color: palette.primary, fontWeight: "600" }}>
                      Gestionar
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingUsers ? (
                  <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 8 }} />
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
                        Todos ({allUsers.length})
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

  const [prefs, setPrefs] = useState<Partial<Record<EventType, PrefData>>>({});
  const [companyUsers, setCompanyUsers] = useState<EligibleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<EventType | null>(null);

  // Modal state
  const [modalEvent, setModalEvent] = useState<EventType | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);

      // Cargar preferencias y usuarios de la empresa en paralelo
      const [prefsRes, usersRes] = await Promise.all([
        Services.notificationPreferences.index(),
        Services.admin.users.index({ by_company: true } as any),
      ]);

      // Mapear preferencias
      const prefsList: App.Entities.NotificationPreference[] = prefsRes.data ?? prefsRes;
      const prefsMap: Partial<Record<EventType, PrefData>> = {};
      for (const p of prefsList) {
        prefsMap[p.event_type] = {
          is_active:        p.is_active,
          channel_db:       p.channel_db,
          channel_email:    p.channel_email,
          channel_push:     p.channel_push,
          allowed_user_ids: p.allowed_user_ids,
        };
      }
      setPrefs(prefsMap);

      // Mapear usuarios de la empresa
      const rawUsers = (usersRes.data || []).data ?? usersRes;

      console.log("rawUsers", rawUsers)
      const userList: EligibleUser[] = (Array.isArray(rawUsers) ? rawUsers : []).map(
        (u: any) => ({ id: u.id, name: u.name, email: u.email })
      );
      setCompanyUsers(userList);
    } catch {
      alerts.error("Error al cargar las preferencias");
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const savePref = async (eventType: EventType, patch: Partial<PrefData>) => {
    setPrefs((prev) => ({
      ...prev,
      [eventType]: { ...(prev[eventType] as PrefData), ...patch },
    }));
    setSaving(eventType);
    try {
      await Services.notificationPreferences.update(eventType, patch);
    } catch {
      alerts.error("Error al guardar la preferencia");
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = (eventType: EventType, value: boolean) =>
    savePref(eventType, { is_active: value });

  // Guardar asignación de usuarios desde el modal
  const handleSaveUsers = async (ids: number[] | null) => {
    if (!modalEvent) return;
    setModalSaving(true);
    try {
      await Services.notificationPreferences.update(modalEvent, { allowed_user_ids: ids });
      setPrefs((prev) => ({
        ...prev,
        [modalEvent]: { ...(prev[modalEvent] as PrefData), allowed_user_ids: ids },
      }));
      alerts.success("Destinatarios guardados");
      setModalEvent(null);
    } catch {
      alerts.error("Error al guardar los destinatarios");
    } finally {
      setModalSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await alerts.confirm(
      "¿Restablecer todas las preferencias a los valores predeterminados?",
      {
        title: "Restablecer preferencias",
        okText: "Restablecer",
        cancelText: "Cancelar",
      }
    );
    if (!confirmed) return;
    try {
      await Services.notificationPreferences.reset();
      alerts.success("Preferencias restablecidas");
      loadAll();
    } catch {
      alerts.error("Error al restablecer las preferencias");
    }
  };

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

  console.log("all users",companyUsers);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyMedium" style={styles.intro}>
          Activa o desactiva cada tipo de notificación y selecciona qué usuarios deben recibirla.
        </Text>

        {EVENT_TYPES.map((eventType) => (
          <EventPreferenceCard
            key={eventType}
            eventType={eventType}
            pref={prefs[eventType]}
            allUsers={companyUsers}
            loadingUsers={loadingUsers}
            saving={saving === eventType}
            onToggleActive={(v) => handleToggleActive(eventType, v)}
            onOpenModal={() => setModalEvent(eventType)}
          />
        ))}

        <Button
          mode="outlined"
          onPress={handleReset}
          style={styles.resetButton}
          icon="refresh"
          textColor={palette.error}
        >
          Restablecer valores predeterminados
        </Button>
      </ScrollView>

      {/* Modal de selección de usuarios */}
      {modalEvent !== null && (
        <AssignUsersModal
          visible={modalEvent !== null}
          allUsers={companyUsers}
          currentIds={prefs[modalEvent]?.allowed_user_ids ?? null}
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
  intro:            { color: palette.textSecondary, marginBottom: 20, lineHeight: 20 },

  card:             { marginBottom: 16, backgroundColor: palette.card, borderRadius: 16, elevation: 0 },
  cardInactive:     { opacity: 0.65 },
  cardHeader:       { flexDirection: "row", alignItems: "center", gap: 12 },
  eventIcon:        { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  eventLabel:       { color: palette.text, fontWeight: "600", marginBottom: 2 },
  eventDescription: { color: palette.textSecondary, fontSize: 12, lineHeight: 16 },

  divider:          { marginVertical: 12, backgroundColor: palette.border },

  assignedHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  usersLabel:       { color: palette.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  chipsRow:         { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:             { backgroundColor: palette.primary + "18" },
  chipText:         { color: palette.primary, fontSize: 12 },

  infoRow:          { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  infoText:         { color: palette.textSecondary, flex: 1, lineHeight: 18 },

  resetButton:      { marginTop: 8, borderColor: palette.error },
});
