import {
  getStatusTokens,
  type NotificationStatusKey,
} from "@/components/Notifications/notificationPresentation";
import {
  NOTIFICATION_NEUTRAL,
  NOTIFICATION_TYPOGRAPHY,
} from "@/components/Notifications/notificationTheme";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export interface NotificationBadgeProps {
  status: NotificationStatusKey;
  /**
   * Si true, se omite el dot de color. Util cuando el badge va acompanado
   * de un icono de tipo para no duplicar indicadores visuales.
   */
  hideDot?: boolean;
}

/**
 * Pill pequena que representa el estado de una notificacion. Inspirada en
 * los badges de GitHub: fondo suave, tipografia bold tracking-wide y un
 * dot opcional a la izquierda. Reutilizable en el popover y en la lista
 * completa, ya que la paleta viene de los tokens.
 */
export default function NotificationBadge({
  status,
  hideDot = false,
}: NotificationBadgeProps) {
  const tokens = getStatusTokens(status);

  return (
    <View
      style={[styles.badge, { backgroundColor: tokens.bg }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${tokens.label}`}
    >
      {!hideDot && (
        <View
          style={[styles.dot, { backgroundColor: tokens.dotColor }]}
        />
      )}
      <Text
        style={[styles.text, { color: tokens.text }]}
        numberOfLines={1}
      >
        {tokens.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    ...NOTIFICATION_TYPOGRAPHY.badge,
    color: NOTIFICATION_NEUTRAL.textSecondary,
  },
});
