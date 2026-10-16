import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Text, useWindowDimensions, View } from "react-native";
import { IconButton, Modal, Portal } from "react-native-paper";
import type { NotificationLink } from "./notificationLinks";
import type { LinkedRecordNote, LinkedRecordOutcome } from "./useLinkedRecordOpener";

/**
 * Detalle de una notificación en un modal (escritorio). Lo abren la bandeja
 * y la campana cuando el aviso no lleva a otra pantalla o su registro no se
 * pudo abrir (`linkNote`: ya no existe, otra sucursal, sin permiso).
 */
export default function NotificationDetailModal({
  notification,
  onDismiss,
  onDelete,
  onOpenLink,
  linkNote = null,
}: {
  /** null = cerrado. */
  notification: App.Entities.Notification | null;
  onDismiss: () => void;
  onDelete?: () => void;
  onOpenLink?: (link: NotificationLink) => Promise<LinkedRecordOutcome>;
  linkNote?: LinkedRecordNote | null;
}) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const styles = useThemedStyles((c) => ({
    modal: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 560,
      backgroundColor: c.background,
      borderRadius: 12,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 20,
      paddingRight: 8,
      paddingVertical: 6,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 15, fontWeight: "600", color: c.text },
  }));

  return (
    <Portal>
      <Modal
        visible={!!notification}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { maxHeight: Math.min(height - 80, 680) }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notificación</Text>
          <IconButton
            icon="close"
            size={20}
            iconColor={colors.textSecondary}
            onPress={onDismiss}
            accessibilityLabel="Cerrar"
          />
        </View>
        {notification && (
          <NotificationDetailContent
            notification={notification}
            inModal
            onDelete={onDelete}
            onOpenLink={onOpenLink}
            linkNote={linkNote}
          />
        )}
      </Modal>
    </Portal>
  );
}
