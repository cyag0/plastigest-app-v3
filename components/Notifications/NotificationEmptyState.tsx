import {
  NOTIFICATION_NEUTRAL,
  NOTIFICATION_TYPOGRAPHY,
} from "@/components/Notifications/notificationTheme";
import { StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";

/**
 * Estado vacio del popover. Inspirado en Notion/Linear: ilustracion
 * minimalista, copy corto y un CTA secundario opcional para configurar
 * las preferencias de notificacion.
 */
export default function NotificationEmptyState() {
  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Icon
          source="bell-check-outline"
          size={32}
          color={NOTIFICATION_NEUTRAL.textTertiary}
        />
      </View>
      <Text variant="titleSmall" style={styles.title}>
        Estas al dia
      </Text>
      <Text variant="bodySmall" style={styles.description}>
        No tienes notificaciones nuevas. Te avisaremos cuando ocurra algo
        importante.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 6,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    ...NOTIFICATION_TYPOGRAPHY.headerTitle,
    color: NOTIFICATION_NEUTRAL.textPrimary,
  },
  description: {
    ...NOTIFICATION_TYPOGRAPHY.cardDescription,
    color: NOTIFICATION_NEUTRAL.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
});
