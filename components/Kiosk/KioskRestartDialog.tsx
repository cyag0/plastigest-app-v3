/**
 * Confirmación de "Empezar de nuevo" cuando hay algo en el pedido.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { KioskDialog } from "./KioskOverlay";

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function KioskRestartDialog({ visible, onConfirm, onCancel }: Props) {
  const styles = useThemedStyles((c) => ({
    title: { fontSize: 28, fontWeight: "800", color: c.text, textAlign: "center" },
    text: { fontSize: 20, lineHeight: 28, color: c.textSecondary, textAlign: "center" },
    actions: { gap: 12 },
  }));

  return (
    <KioskDialog visible={visible} onDismiss={onCancel} testID="kiosk-restart-dialog" accessibilityLabel="¿Empezar de nuevo?">
      <View style={{ gap: 8 }}>
        <Text style={styles.title} accessibilityRole="header">
          ¿Empezar de nuevo?
        </Text>
        <Text style={styles.text}>Se borrará todo lo que llevas en tu pedido.</Text>
      </View>
      <View style={styles.actions}>
        <KioskButton label="No, seguir con mi pedido" size="lg" onPress={onCancel} testID="kiosk-restart-cancel" />
        <KioskButton
          label="Sí, empezar de nuevo"
          variant="secondary"
          icon="restart"
          onPress={onConfirm}
          testID="kiosk-restart-confirm"
        />
      </View>
    </KioskDialog>
  );
}
