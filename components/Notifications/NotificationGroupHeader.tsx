import {
  NOTIFICATION_NEUTRAL,
  NOTIFICATION_TYPOGRAPHY,
} from "@/components/Notifications/notificationTheme";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export interface NotificationGroupHeaderProps {
  label: string;
  /**
   * Conteo opcional que aparece a la derecha del label, en un gris
   * discreto. Util cuando la lista es larga y el usuario quiere saber
   * cuantos elementos hay en el grupo sin contarlos.
   */
  count?: number;
}

/**
 * Encabezado de seccion para los grupos de fecha (Hoy, Ayer, Esta semana).
 * Inspirado en las secciones de GitHub Notifications: tracking ancho, texto
 * secundario y un separador sutil a la derecha. Es solo visual, no
 * interactua con el scroll.
 */
export default function NotificationGroupHeader({
  label,
  count,
}: NotificationGroupHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {typeof count === "number" && (
        <View style={styles.countContainer}>
          <Text style={styles.count}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  label: {
    ...NOTIFICATION_TYPOGRAPHY.groupLabel,
    color: NOTIFICATION_NEUTRAL.textTertiary,
  },
  countContainer: {
    minWidth: 18,
    height: 16,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    color: NOTIFICATION_NEUTRAL.textTertiary,
  },
});
