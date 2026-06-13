import NotificationBadge from "@/components/Notifications/NotificationBadge";
import {
  eventTypeToTypeKey,
  formatNotificationDate,
  getTypeTokens,
  resolveNotificationStatus,
} from "@/components/Notifications/notificationPresentation";
import {
  NOTIFICATION_NEUTRAL,
} from "@/components/Notifications/notificationTheme";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

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

/**
 * Detalle de una notificacion. Adopta el lenguaje visual del popover/lista
 * (tokens neutros, blanco puro, badge de tipo a color y badge de estado)
 * para que la superficie se sienta limpia y consistente. Sin tarjetas
 * crema ni iconos decorativos en los encabezados de seccion.
 */
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
  const typeTokens = getTypeTokens(eventTypeToTypeKey(notification.event_type));
  const status = resolveNotificationStatus(notification);
  const dataRows = notification.data
    ? buildDataRows(notification.event_type, notification.data)
    : [];

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: badge de tipo, etiquetas de tipo/estado, titulo y fecha. */}
        <View style={styles.hero}>
          <View style={[styles.iconBadge, { backgroundColor: typeTokens.bgMedium }]}>
            <Icon source={typeTokens.icon} size={22} color={typeTokens.text} />
          </View>

          <View style={styles.heroText}>
            <View style={styles.chipsRow}>
              <View style={[styles.typeChip, { backgroundColor: typeTokens.bgSoft }]}>
                <Text style={[styles.typeChipText, { color: typeTokens.text }]}>
                  {typeTokens.label}
                </Text>
              </View>
              <NotificationBadge status={status} hideDot />
            </View>

            <Text style={styles.title}>{notification.title}</Text>

            <View style={styles.dateRow}>
              <Icon
                source="clock-outline"
                size={13}
                color={NOTIFICATION_NEUTRAL.textTertiary}
              />
              <Text style={styles.dateText}>
                {formatNotificationDate(notification.created_at, true)}
              </Text>
            </View>
          </View>

          {onDelete && (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityLabel="Eliminar notificacion"
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
            >
              <Icon
                source="trash-can-outline"
                size={18}
                color={NOTIFICATION_NEUTRAL.textTertiary}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* Mensaje */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mensaje</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>

        {/* Detalles */}
        {dataRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Detalles</Text>
            <View style={styles.dataCard}>
              {dataRows.map((row, index) => (
                <View
                  key={`${row.label}-${row.value}`}
                  style={[styles.dataRow, index > 0 && styles.dataRowBordered]}
                >
                  <Text style={styles.dataLabel}>{row.label}</Text>
                  <Text style={styles.dataValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {onBack && (
        <View style={styles.bottomActions}>
          <Button
            mode="outlined"
            onPress={onBack}
            style={styles.backButton}
            icon="arrow-left"
            textColor={NOTIFICATION_NEUTRAL.textSecondary}
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
    backgroundColor: NOTIFICATION_NEUTRAL.background,
  },
  containerCompact: {
    minHeight: 0,
    backgroundColor: "transparent",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 96,
    gap: 20,
  },
  scrollContentCompact: {
    padding: 0,
    paddingBottom: 4,
    gap: 18,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  typeChipText: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    color: NOTIFICATION_NEUTRAL.textPrimary,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: NOTIFICATION_NEUTRAL.textTertiary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deleteButtonPressed: {
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },

  // ── Secciones ─────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: NOTIFICATION_NEUTRAL.textSecondary,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 22,
    color: NOTIFICATION_NEUTRAL.textPrimary,
  },

  // ── Detalles ──────────────────────────────────────────────────────────
  dataCard: {
    borderWidth: 1,
    borderColor: NOTIFICATION_NEUTRAL.border,
    borderRadius: 12,
    backgroundColor: NOTIFICATION_NEUTRAL.surface,
    overflow: "hidden",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  dataRowBordered: {
    borderTopWidth: 1,
    borderTopColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },
  dataLabel: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: NOTIFICATION_NEUTRAL.textSecondary,
    flexShrink: 0,
  },
  dataValue: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "600",
    color: NOTIFICATION_NEUTRAL.textPrimary,
    textAlign: "right",
  },

  // ── Acciones ──────────────────────────────────────────────────────────
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: NOTIFICATION_NEUTRAL.background,
    borderTopWidth: 1,
    borderTopColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },
  backButton: {
    borderColor: NOTIFICATION_NEUTRAL.border,
    borderRadius: 10,
  },
});
