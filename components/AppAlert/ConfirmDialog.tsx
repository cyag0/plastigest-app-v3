import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";

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

/**
 * ConfirmDialog
 *
 * Componente de diálogo de confirmación que muestra un mensaje
 * con botones de Aceptar y Cancelar.
 *
 * Utiliza Portal de React Native Paper para mostrarse sobre cualquier vista.
 * Expone métodos imperativos mediante useImperativeHandle.
 */
const ConfirmDialog = forwardRef<ConfirmDialogRef>((props, ref) => {
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
    if (state.resolve) {
      state.resolve(true);
    }
    setState({ ...state, visible: false });
  };

  const handleCancel = () => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState({ ...state, visible: false });
  };

  return (
    <Portal>
      <Dialog
        visible={state.visible}
        onDismiss={handleCancel}
        style={{ backgroundColor: palette.background }}
      >
        <Dialog.Title>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="help-circle"
              size={24}
              color={palette.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ fontSize: 18, fontWeight: "bold", color: palette.text }}
            >
              {state.title || "Confirmar"}
            </Text>
          </View>
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 16, color: palette.textSecondary }}>
            {state.message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={handleCancel}
            textColor={palette.textSecondary}
            style={{ marginRight: 8 }}
          >
            {state.cancelText || "Cancelar"}
          </Button>
          <Button
            onPress={handleConfirm}
            mode="contained"
            buttonColor={palette.primary}
            textColor={palette.background}
          >
            {state.okText || "Aceptar"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
});

ConfirmDialog.displayName = "ConfirmDialog";

export default ConfirmDialog;
