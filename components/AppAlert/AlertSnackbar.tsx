import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Text, View } from "react-native";
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

interface AlertSnackbarProps {
  /** El usuario cerró el aviso con "Cerrar" (no cuando se va solo). */
  onClose?: (message: string) => void;
}

const ICONS: Record<AlertType, string> = {
  success: "check-circle",
  error: "alert-circle",
  warning: "alert",
  info: "information",
};

/**
 * AlertSnackbar
 *
 * Aviso breve en la parte inferior de la pantalla (useAlerts y el aviso
 * global de errores del API). Superficie del tema con el ícono en el color
 * del tipo: se lee igual en tema claro y oscuro.
 * Expone métodos imperativos mediante useImperativeHandle.
 */
const AlertSnackbar = forwardRef<AlertSnackbarRef, AlertSnackbarProps>(({ onClose }, ref) => {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    snackbar: {
      marginBottom: 16,
      borderRadius: 10,
      maxWidth: 560,
      alignSelf: "center",
      width: "92%",
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    content: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    icon: {
      marginRight: 10,
      marginTop: 1,
    },
    text: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
      color: c.text,
    },
  }));
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
    setState((current) => ({ ...current, visible: false }));
  };

  const handleClose = () => {
    onClose?.(state.message);
    handleDismiss();
  };

  const iconColor = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  }[state.type];

  return (
    <Portal>
      <Snackbar
        visible={state.visible}
        onDismiss={handleDismiss}
        duration={state.duration}
        style={styles.snackbar}
        action={{
          label: "Cerrar",
          onPress: handleClose,
          textColor: colors.textSecondary,
        }}
      >
        <View style={styles.content}>
          <MaterialCommunityIcons
            name={ICONS[state.type] as any}
            size={20}
            color={iconColor}
            style={styles.icon}
          />
          <Text style={styles.text}>{state.message}</Text>
        </View>
      </Snackbar>
    </Portal>
  );
});

AlertSnackbar.displayName = "AlertSnackbar";

export default AlertSnackbar;
