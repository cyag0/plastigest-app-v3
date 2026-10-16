/**
 * "¿Sigues ahí?" tras 90 s sin tocar la pantalla con productos en el pedido.
 * Cualquier toque cuenta como respuesta (lo detecta la raíz del kiosko).
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { KioskDialog } from "./KioskOverlay";

interface Props {
  /** Segundos que faltan; null oculta el diálogo. */
  seconds: number | null;
  onStay: () => void;
  onRestart: () => void;
}

export default function KioskIdleDialog({ seconds, onStay, onRestart }: Props) {
  const styles = useThemedStyles((c) => ({
    title: { fontSize: 32, fontWeight: "800", color: c.text, textAlign: "center" },
    text: { fontSize: 20, lineHeight: 28, color: c.textSecondary, textAlign: "center" },
    actions: { gap: 12 },
  }));

  return (
    <KioskDialog visible={seconds !== null} onDismiss={onStay} testID="kiosk-idle-dialog" accessibilityLabel="¿Sigues ahí?">
      <View style={{ gap: 8 }}>
        <Text style={styles.title} accessibilityRole="header">
          ¿Sigues ahí?
        </Text>
        <Text style={styles.text} accessibilityLiveRegion="polite" testID="kiosk-idle-countdown">
          Si no, borramos tu pedido en {seconds ?? 0} s.
        </Text>
      </View>
      <View style={styles.actions}>
        <KioskButton label="Sí, sigo aquí" size="lg" icon="hand-wave" onPress={onStay} testID="kiosk-idle-stay" />
        <KioskButton
          label="Empezar de nuevo"
          variant="secondary"
          icon="restart"
          onPress={onRestart}
          testID="kiosk-idle-restart"
        />
      </View>
    </KioskDialog>
  );
}
