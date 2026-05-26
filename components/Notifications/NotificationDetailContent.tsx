import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, IconButton, Text } from "react-native-paper";
import {
  formatNotificationDate,
  getNotificationEventConfig,
  getNotificationSeverityConfig,
} from "./notificationPresentation";

type DetailRow = {
  label: string;
  value: string;
};

function buildDataRows(
  eventType: App.Entities.NotificationEventType,
  data: Record<string, any>,
): DetailRow[] {
  const rows: DetailRow[] = [];

  if (eventType === "low_stock") {
    if (data.product) rows.push({ label: "Producto", value: String(data.product) });
    if (data.location) rows.push({ label: "Sucursal", value: String(data.location) });
    if (data.current_stock !== undefined) rows.push({ label: "Stock actual", value: String(data.current_stock) });
    if (data.minimum_stock !== undefined) rows.push({ label: "Stock minimo", value: String(data.minimum_stock) });
  } else if (eventType === "inventory_adjustment") {
    if (data.product) rows.push({ label: "Producto", value: String(data.product) });
    if (data.location) rows.push({ label: "Sucursal", value: String(data.location) });
    if (data.adjustment_qty !== undefined) rows.push({ label: "Cantidad", value: String(data.adjustment_qty) });
    if (data.new_stock !== undefined) rows.push({ label: "Nuevo stock", value: String(data.new_stock) });
    if (data.reason) rows.push({ label: "Razon", value: String(data.reason) });
    if (data.adjusted_by) rows.push({ label: "Realizado por", value: String(data.adjusted_by) });
  } else if (eventType === "inventory_count_discrepancy") {
    if (data.location) rows.push({ label: "Sucursal", value: String(data.location) });
    if (data.discrepancies_count !== undefined) rows.push({ label: "Diferencias", value: String(data.discrepancies_count) });
    if (data.inventory_count_id) rows.push({ label: "Conteo", value: `#${data.inventory_count_id}` });
  } else if (eventType === "purchase_update") {
    if (data.purchase_id) rows.push({ label: "Compra", value: `#${data.purchase_id}` });
    if (data.supplier_name) rows.push({ label: "Proveedor", value: String(data.supplier_name) });
    if (data.sub_type) rows.push({ label: "Estado", value: data.sub_type === "received" ? "Recibida" : "En transito" });
  } else if (eventType === "task_event") {
    if (data.task_id) rows.push({ label: "Tarea", value: `#${data.task_id}` });
    if (data.actor_name) rows.push({ label: "Usuario", value: String(data.actor_name) });
    if (data.sub_type) {
      const subLabels: Record<string, string> = {
        assigned: "Tarea asignada",
        completed: "Tarea completada",
        overdue: "Tarea vencida",
        comment: "Nuevo comentario",
      };
      rows.push({ label: "Evento", value: subLabels[data.sub_type] ?? String(data.sub_type) });
    }
  }

  return rows;
}

function DataSection({ notification }: { notification: App.Entities.Notification }) {
  const rows = notification.data
    ? buildDataRows(notification.event_type, notification.data)
    : [];

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color={palette.primary}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Informacion adicional
          </Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.dataGrid}>
          {rows.map((row) => (
            <View key={`${row.label}-${row.value}`} style={styles.dataRow}>
              <Text variant="labelSmall" style={styles.dataLabel}>
                {row.label}
              </Text>
              <Text variant="bodyMedium" style={styles.dataValue}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function NotificationDetailContent({
  notification,
  onBack,
  onDelete,
  compact = false,
}: {
  notification: App.Entities.Notification;
  onBack?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const severityConfig = getNotificationSeverityConfig(notification.severity);
  const eventConfig = getNotificationEventConfig(notification.event_type);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.heroCard} mode="elevated">
          <Card.Content style={styles.heroContent}>
            <View style={[styles.heroIcon, { backgroundColor: eventConfig.softBg }]}>
              <MaterialCommunityIcons
                name={eventConfig.icon as any}
                size={30}
                color={eventConfig.color}
              />
            </View>
            <View style={styles.heroText}>
              <View style={styles.chipsRow}>
                <Chip
                  compact
                  mode="flat"
                  style={[styles.chip, { backgroundColor: eventConfig.softBg }]}
                  textStyle={[styles.chipText, { color: eventConfig.color }]}
                >
                  {eventConfig.label}
                </Chip>
                <Chip
                  compact
                  mode="flat"
                  style={[styles.chip, { backgroundColor: severityConfig.softBg }]}
                  textStyle={[styles.chipText, { color: severityConfig.color }]}
                >
                  {severityConfig.label}
                </Chip>
                {!notification.is_read && (
                  <Chip
                    compact
                    mode="flat"
                    style={styles.unreadChip}
                    textStyle={styles.unreadChipText}
                  >
                    Nueva
                  </Chip>
                )}
              </View>
              <Text variant="headlineSmall" style={styles.title}>
                {notification.title}
              </Text>
              <View style={styles.dateRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={15}
                  color={palette.textSecondary}
                />
                <Text variant="bodySmall" style={styles.dateText}>
                  {formatNotificationDate(notification.created_at, true)}
                </Text>
              </View>
            </View>
            {onDelete && (
              <IconButton
                icon="delete-outline"
                size={21}
                iconColor={palette.error}
                onPress={onDelete}
                style={styles.deleteButton}
              />
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name={severityConfig.icon as any}
                size={20}
                color={severityConfig.color}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Mensaje
              </Text>
            </View>
            <Divider style={styles.divider} />
            <Text variant="bodyLarge" style={styles.message}>
              {notification.message}
            </Text>
          </Card.Content>
        </Card>

        <DataSection notification={notification} />
      </ScrollView>

      {onBack && (
        <View style={styles.bottomActions}>
          <Button
            mode="outlined"
            onPress={onBack}
            style={styles.backButton}
            icon="arrow-left"
            textColor={palette.textSecondary}
          >
            Volver
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  containerCompact: {
    minHeight: 0,
    backgroundColor: "transparent",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  scrollContentCompact: {
    padding: 0,
    paddingBottom: 0,
  },
  heroCard: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 9,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  unreadChip: {
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  unreadChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: palette.text,
    fontWeight: "800",
    lineHeight: 30,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    color: palette.textSecondary,
  },
  deleteButton: {
    margin: 0,
    backgroundColor: palette.error + "12",
  },
  card: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  divider: {
    marginVertical: 12,
    backgroundColor: palette.border,
  },
  message: {
    color: palette.text,
    lineHeight: 24,
  },
  dataGrid: {
    gap: 10,
  },
  dataRow: {
    padding: 11,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  dataLabel: {
    color: palette.textSecondary,
    fontWeight: "700",
    marginBottom: 3,
  },
  dataValue: {
    color: palette.text,
    fontWeight: "600",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#F8F5EF",
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  backButton: {
    borderColor: palette.textSecondary,
    borderRadius: 8,
  },
});
