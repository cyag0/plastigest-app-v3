import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Portal, Snackbar } from "react-native-paper";

type AlertType = "info" | "warning" | "error" | "success";

interface SnackbarOptions {
  type: AlertType;
  duration: number;
}

interface SnackbarState {
  visible: boolean;
  message: string;
  type: AlertType;
  duration: number;
}

export interface AlertSnackbarRef {
  show: (message: string, options: SnackbarOptions) => void;
}

/**
 * AlertSnackbar
 *
 * Componente de notificación tipo Snackbar que muestra mensajes
 * con diferentes estilos según el tipo (info, warning, error, success).
 *
 * Se muestra en la parte inferior de la pantalla con un ícono y color
 * correspondiente al tipo de alerta.
 * Expone métodos imperativos mediante useImperativeHandle.
 */
const AlertSnackbar = forwardRef<AlertSnackbarRef>((props, ref) => {
  const [state, setState] = useState<SnackbarState>({
    visible: false,
    message: "",
    type: "info",
    duration: 3000,
  });

  useImperativeHandle(ref, () => ({
    show: (message: string, options: SnackbarOptions) => {
      setState({
        visible: true,
        message,
        type: options.type,
        duration: options.duration,
      });
    },
  }));

  const handleDismiss = () => {
    setState({ ...state, visible: false });
  };
  const getConfig = () => {
    switch (state.type) {
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
        visible={state.visible}
        onDismiss={handleDismiss}
        duration={state.duration}
        style={[styles.snackbar, { backgroundColor: config.backgroundColor }]}
        action={{
          label: "Cerrar",
          onPress: handleDismiss,
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
          <Text style={[styles.text, { color: config.color }]}>
            {state.message}
          </Text>
        </View>
      </Snackbar>
    </Portal>
  );
});

AlertSnackbar.displayName = "AlertSnackbar";

export default AlertSnackbar;

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
    maxWidth: 600,
    alignSelf: "center",
    width: "90%",
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
