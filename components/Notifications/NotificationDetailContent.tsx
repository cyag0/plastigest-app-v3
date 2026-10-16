import {
  LIST_TEXT_INSET,
  ListGroup,
  ListSection,
  ListValueRow,
} from "@/components/App/ListGroup";
import LinkedRecordAction from "@/components/Notifications/LinkedRecordAction";
import {
  getNotificationLink,
  type NotificationLink,
} from "@/components/Notifications/notificationLinks";
import {
  getNotificationCategoryLabel,
  getNotificationIcon,
  getNotificationSubTypeLabel,
  notificationToneColor,
} from "@/components/Notifications/notificationPresentation";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDateTime } from "@/utils/dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button } from "react-native-paper";
import type { LinkedRecordNote, LinkedRecordOutcome } from "./useLinkedRecordOpener";

type DetailRow = {
  label: string;
  value: string;
};

function buildDataRows(
  eventType: App.Entities.NotificationEventType,
  data: Record<string, any>,
): DetailRow[] {
  const rows: DetailRow[] = [];
  // En el push los nulos llegan como "": tampoco se muestran.
  const add = (label: string, value: unknown, prefix = "") => {
    if (value === undefined || value === null || value === "") return;
    rows.push({ label, value: `${prefix}${value}` });
  };
  const subTypeLabel = getNotificationSubTypeLabel(eventType, data);

  switch (eventType) {
    case "low_stock":
      add("Producto", data.product);
      add("Sucursal", data.location);
      add("Stock actual", data.current_stock);
      add("Stock mínimo", data.minimum_stock);
      break;
    case "inventory_adjustment":
      add("Ajuste", data.adjustment_id, "#");
      add("Producto", data.product);
      add("Sucursal", data.location);
      add("Cantidad", data.adjustment_qty);
      add("Nuevo stock", data.new_stock);
      add("Razón", data.reason);
      add("Realizado por", data.adjusted_by);
      break;
    case "inventory_count_discrepancy":
      add("Conteo", data.inventory_count_id, "#");
      add("Sucursal", data.location);
      add("Diferencias", data.discrepancies_count);
      break;
    case "purchase_update":
      add("Compra", data.purchase_id, "#");
      add("Proveedor", data.supplier_name);
      add("Estado", subTypeLabel);
      break;
    case "transfer_update":
      add("Transferencia", data.transfer_id, "#");
      add("Estado", subTypeLabel);
      break;
    case "task_event":
      add("Tarea", data.task_id, "#");
      add("Evento", subTypeLabel ?? data.sub_type);
      add("Usuario", data.actor_name);
      break;
    case "reminder":
      add("Recordatorio", data.reminder_id, "#");
      break;
  }

  return rows;
}

/**
 * Detalle de una notificación: en su pantalla (teléfono) o en el modal de la
 * bandeja y la campana (escritorio).
 *
 * `onOpenLink` muestra el botón para abrir el registro relacionado (tarea,
 * compra, transferencia…) cuando el payload trae su id; el padre navega
 * (y cierra su modal si lo tiene). Antes de navegar se revisa permiso,
 * existencia y sucursal (LinkedRecordAction): si no se puede abrir, queda
 * el motivo en lugar del botón.
 */
export default function NotificationDetailContent({
  notification,
  onDelete,
  onOpenLink,
  linkNote = null,
  autoOpenLink = false,
  inModal = false,
}: {
  notification: App.Entities.Notification;
  onDelete?: () => void;
  /** Abre el registro: el `open` de useLinkedRecordOpener del padre. */
  onOpenLink?: (link: NotificationLink) => Promise<LinkedRecordOutcome>;
  /** Por qué no se abrió el registro al tocar el aviso en la lista. */
  linkNote?: LinkedRecordNote | null;
  /** Abrir el registro al cargar (push tocado). */
  autoOpenLink?: boolean;
  /** Dentro de un modal: sin ocupar toda la altura ni limitar el ancho. */
  inModal?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = !inModal && width >= 768;

  const dataRows = notification.data
    ? buildDataRows(notification.event_type, notification.data)
    : [];
  const relatedLink = onOpenLink
    ? getNotificationLink(notification.event_type, notification.data)
    : null;

  return (
    <ScrollView
      style={inModal ? styles.scrollInModal : styles.scroll}
      contentContainerStyle={[styles.content, wide && styles.contentWide]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name={getNotificationIcon(notification.event_type, notification.data)}
            size={16}
            color={notificationToneColor(colors, notification.severity)}
          />
          <Text style={styles.meta} numberOfLines={1}>
            {getNotificationCategoryLabel(notification.event_type)} ·{" "}
            {formatDateTime(notification.created_at)}
          </Text>
        </View>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} selectable>
          {notification.message}
        </Text>
      </View>

      {relatedLink && onOpenLink && (
        <LinkedRecordAction
          key={`${notification.id}:${linkNote?.type ?? ""}`}
          link={relatedLink}
          onOpen={onOpenLink}
          initialNote={linkNote}
          autoOpen={autoOpenLink}
        />
      )}

      {dataRows.length > 0 && (
        <ListSection title="Detalles">
          <ListGroup inset={LIST_TEXT_INSET}>
            {dataRows.map((row) => (
              <ListValueRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
            ))}
          </ListGroup>
        </ListSection>
      )}

      {onDelete && (
        <Button
          mode="text"
          icon="trash-can-outline"
          textColor={colors.error}
          onPress={onDelete}
          style={styles.deleteButton}
        >
          Eliminar notificación
        </Button>
      )}
    </ScrollView>
  );
}

const makeStyles = themedStyles((c) => ({
  scroll: { flex: 1, backgroundColor: c.background },
  // En el modal el contenido define la altura (con tope del modal).
  scrollInModal: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  contentWide: { padding: 24, maxWidth: 760, width: "100%", alignSelf: "center" },

  header: { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, fontWeight: "500", color: c.textSecondary, flexShrink: 1 },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: c.text,
    letterSpacing: -0.2,
  },
  message: { fontSize: 15, lineHeight: 22, color: c.text, marginTop: 4 },

  deleteButton: { alignSelf: "flex-start", marginLeft: -12 },
}));
