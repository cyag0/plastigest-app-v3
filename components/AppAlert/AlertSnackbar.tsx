import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Portal, Snackbar } from "react-native-paper";

interface AlertSnackbarProps {
  visible: boolean;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  duration?: number;
  onDismiss: () => void;
}

/**
 * AlertSnackbar
 *
 * Componente de notificación tipo Snackbar que muestra mensajes
 * con diferentes estilos según el tipo (info, warning, error, success).
 *
 * Se muestra en la parte inferior de la pantalla con un ícono y color
 * correspondiente al tipo de alerta.
 */
export default function AlertSnackbar({
  visible,
  message,
  type = "info",
  duration = 3000,
  onDismiss,
}: AlertSnackbarProps) {
  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "check-circle",
          backgroundColor: palette.success,
          color: palette.background,
        };
      case "error":
        return {
          icon: "alert-circle",
          backgroundColor: palette.red,
          color: palette.background,
        };
      case "warning":
        return {
          icon: "alert",
          backgroundColor: palette.warning,
          color: palette.text,
        };
      case "info":
      default:
        return {
          icon: "information",
          backgroundColor: palette.info,
          color: palette.text,
        };
    }
  };

  const config = getConfig();

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={duration}
        style={[styles.snackbar, { backgroundColor: config.backgroundColor }]}
        action={{
          label: "Cerrar",
          onPress: onDismiss,
          textColor: config.color,
        }}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={20}
            color={config.color}
            style={styles.icon}
          />
          <Text style={[styles.text, { color: config.color }]}>{message}</Text>
        </View>
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
