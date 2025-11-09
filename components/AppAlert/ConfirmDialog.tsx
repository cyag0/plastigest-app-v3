import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  okText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmDialog
 *
 * Componente de diálogo de confirmación que muestra un mensaje
 * con botones de Aceptar y Cancelar.
 *
 * Utiliza Portal de React Native Paper para mostrarse sobre cualquier vista.
 */
export default function ConfirmDialog({
  visible,
  title = "Confirmar",
  message,
  okText = "Aceptar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
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
              {title}
            </Text>
          </View>
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 16, color: palette.textSecondary }}>
            {message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={onCancel}
            textColor={palette.textSecondary}
            style={{ marginRight: 8 }}
          >
            {cancelText}
          </Button>
          <Button
            onPress={onConfirm}
            mode="contained"
            buttonColor={palette.primary}
            textColor={palette.background}
          >
            {okText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
