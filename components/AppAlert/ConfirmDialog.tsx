import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
}

interface ConfirmState {
  visible: boolean;
  message: string;
  title?: string;
  okText?: string;
  cancelText?: string;
  resolve?: (value: boolean) => void;
}

export interface ConfirmDialogRef {
  show: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialog = forwardRef<ConfirmDialogRef>((props, ref) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [state, setState] = useState<ConfirmState>({
    visible: false,
    message: "",
  });

  useImperativeHandle(ref, () => ({
    show: (message: string, options?: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          visible: true,
          message,
          title: options?.title,
          okText: options?.okText,
          cancelText: options?.cancelText,
          resolve,
        });
      });
    },
  }));

  const handleConfirm = () => {
    if (state.resolve) state.resolve(true);
    setState((s) => ({ ...s, visible: false }));
  };

  const handleCancel = () => {
    if (state.resolve) state.resolve(false);
    setState((s) => ({ ...s, visible: false }));
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="help-circle"
              size={24}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.title}>{state.title || "Confirmar"}</Text>
          </View>

          <Text style={styles.message}>{state.message}</Text>

          <View style={styles.actions}>
            <Button
              onPress={handleCancel}
              textColor={colors.textSecondary}
              style={{ marginRight: 8 }}
            >
              {state.cancelText || "Cancelar"}
            </Button>
            <Button
              onPress={handleConfirm}
              mode="contained"
              buttonColor={colors.primary}
              textColor={colors.background}
            >
              {state.okText || "Aceptar"}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const makeStyles = themedStyles((c) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: c.background,
    borderRadius: 12,
    padding: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: c.text,
  },
  message: {
    fontSize: 16,
    color: c.textSecondary,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
}));

ConfirmDialog.displayName = "ConfirmDialog";

export default ConfirmDialog;
