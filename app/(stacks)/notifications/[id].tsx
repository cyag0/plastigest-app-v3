import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

function getSeverityConfig(severity: App.Entities.NotificationSeverity) {
  switch (severity) {
    case "success":
      return { color: palette.success, icon: "check-circle",  label: "\u00c9xito"  };
    case "error":
      return { color: palette.error,   icon: "alert-circle",  label: "Error"  };
    case "warning":
      return { color: palette.warning, icon: "alert",         label: "Aviso"  };
    case "alert":
      return { color: palette.red,     icon: "bell-alert",    label: "Alerta" };
    case "info":
    default:
      return { color: palette.blue,    icon: "information",   label: "Info"   };
  }
}

const EVENT_TYPE_LABELS: Record<App.Entities.NotificationEventType, string> = {
  low_stock:                   "Stock Bajo",
  inventory_adjustment:        "Ajuste de Inventario",
  inventory_count_discrepancy: "Discrepancia de Conteo",
  purchase_update:             "Actualizaci\u00f3n de Compra",
  task_event:                  "Evento de Tarea",
};

function renderDataSection(
  eventType: App.Entities.NotificationEventType,
  data: Record<string, any>
): JSX.Element | null {
  const rows: Array<{ label: string; value: string }> = [];

  if (eventType === "low_stock") {
    if (data.product)                    rows.push({ label: "Producto",       value: data.product });
    if (data.location)                   rows.push({ label: "Ubicaci\u00f3n",  value: data.location });
    if (data.current_stock !== undefined) rows.push({ label: "Stock Actual",  value: String(data.current_stock) });
    if (data.minimum_stock !== undefined) rows.push({ label: "Stock M\u00ednimo", value: String(data.minimum_stock) });
  } else if (eventType === "inventory_adjustment") {
    if (data.product)                    rows.push({ label: "Producto",       value: data.product });
    if (data.location)                   rows.push({ label: "Ubicaci\u00f3n",  value: data.location });
    if (data.adjustment_qty !== undefined) rows.push({ label: "Cantidad",     value: String(data.adjustment_qty) });
    if (data.new_stock !== undefined)    rows.push({ label: "Nuevo Stock",    value: String(data.new_stock) });
    if (data.reason)                     rows.push({ label: "Raz\u00f3n",     value: data.reason });
    if (data.adjusted_by)               rows.push({ label: "Realizado por",  value: data.adjusted_by });
  } else if (eventType === "inventory_count_discrepancy") {
    if (data.location)                         rows.push({ label: "Ubicaci\u00f3n",    value: data.location });
    if (data.discrepancies_count !== undefined) rows.push({ label: "Discrepancias", value: String(data.discrepancies_count) });
  } else if (eventType === "purchase_update") {
    if (data.supplier_name) rows.push({ label: "Proveedor", value: data.supplier_name });
    if (data.sub_type)      rows.push({ label: "Estado",    value: data.sub_type === "received" ? "Recibida" : "En tr\u00e1nsito" });
  } else if (eventType === "task_event") {
    if (data.actor_name) rows.push({ label: "Usuario", value: data.actor_name });
    if (data.sub_type) {
      const subLabels: Record<string, string> = {
        assigned:  "Tarea asignada",
        completed: "Tarea completada",
        overdue:   "Tarea vencida",
        comment:   "Nuevo comentario",
      };
      rows.push({ label: "Evento", value: subLabels[data.sub_type] ?? data.sub_type });
    }
  }

  if (rows.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={palette.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>Informaci\u00f3n Adicional</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.dataContainer}>
          {rows.map((row, i) => (
            <View key={i} style={styles.dataRow}>
              <Text variant="bodySmall" style={styles.dataLabel}>{row.label}</Text>
              <Text variant="bodyMedium" style={styles.dataValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function NotificationDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const alerts   = useAlerts();
  const { loadUnreadNotificationsCount } = useAuth();

  const [notification, setNotification] = useState<App.Entities.Notification | null>(null);
  const [loading,      setLoading]       = useState(true);

  const loadNotification = async () => {
    try {
      if (!id) return;
      setLoading(true);
      const response = await Services.notifications.show(parseInt(id));
      const notif: App.Entities.Notification = response.data;
      setNotification(notif);
      if (!notif.is_read) {
        await Services.notifications.markAsRead(notif.id);
        loadUnreadNotificationsCount();
      }
    } catch {
      alerts.error("Error al cargar la notificaci\u00f3n");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadNotification(); }, [id]));

  const handleDelete = async () => {
    const confirmed = await alerts.confirm("\u00bfEliminar esta notificaci\u00f3n?", {
      title: "Confirmar eliminaci\u00f3n",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;
    try {
      await Services.notifications.destroy(parseInt(id));
      alerts.success("Notificaci\u00f3n eliminada");
      loadUnreadNotificationsCount();
      router.back();
    } catch {
      alerts.error("Error al eliminar la notificaci\u00f3n");
    }
  };

  if (loading || !notification) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const severityConfig = getSeverityConfig(notification.severity);
  const eventLabel     = EVENT_TYPE_LABELS[notification.event_type] ?? notification.event_type;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={[styles.iconContainer, { backgroundColor: severityConfig.color + "20" }]}>
                  <MaterialCommunityIcons name={severityConfig.icon as any} size={28} color={severityConfig.color} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Chip
                      mode="flat"
                      compact
                      style={{ backgroundColor: severityConfig.color + "20" }}
                      textStyle={{ color: severityConfig.color, fontSize: 11, fontWeight: "600" as const }}
                    >
                      {severityConfig.label}
                    </Chip>
                    <Chip
                      mode="flat"
                      compact
                      style={{ backgroundColor: palette.surface }}
                      textStyle={{ fontSize: 11 }}
                    >
                      {eventLabel}
                    </Chip>
                  </View>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(notification.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <IconButton
                  icon="delete-outline"
                  size={20}
                  iconColor={palette.error}
                  onPress={handleDelete}
                  style={{ margin: 0 }}
                />
              </View>
            </Card.Content>
          </Card>

          {/* Title & Message */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.title}>
                {notification.title}
              </Text>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={styles.message}>
                {notification.message}
              </Text>
            </Card.Content>
          </Card>

          {/* Extra data */}
          {notification.data && renderDataSection(notification.event_type, notification.data)}
        </ScrollView>

        <View style={styles.bottomActions}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.backButton}
            icon="arrow-left"
          >
            Volver
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: palette.background },
  scrollContent:  { padding: 16, paddingBottom: 120 },
  headerCard:     { marginBottom: 16, backgroundColor: palette.surface, borderRadius: 12, elevation: 0 },
  headerRow:      { flexDirection: "row", alignItems: "center", gap: 12 },
  iconContainer:  { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  date:           { color: palette.textSecondary, fontSize: 12 },
  card:           { marginBottom: 16, backgroundColor: palette.surface, borderRadius: 12, elevation: 0 },
  title:          { color: palette.text, fontWeight: "700" as const, lineHeight: 28 },
  divider:        { marginVertical: 12, backgroundColor: palette.border },
  message:        { color: palette.text, lineHeight: 22 },
  sectionHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle:   { color: palette.text, fontWeight: "600" as const },
  dataContainer:  { gap: 12 },
  dataRow:        { gap: 4 },
  dataLabel:      { color: palette.textSecondary, fontWeight: "600" as const, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5 },
  dataValue:      { color: palette.text, fontWeight: "500" as const },
  bottomActions:  { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
  backButton:     { borderColor: palette.primary },
});
