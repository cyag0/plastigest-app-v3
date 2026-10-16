/**
 * Enviando el pedido, o el aviso si no llegó la respuesta: "Reintentar" usa
 * la misma llave, así que si el primer envío sí entró el servidor devuelve
 * ese mismo pedido y no se crea otro.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import KioskButton from "./KioskButton";

interface Props {
  /** Mensaje si el envío falló sin respuesta (o null mientras se envía). */
  error: string | null;
  retrying: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export default function KioskSending({ error, retrying, onRetry, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 20,
      backgroundColor: c.background,
    },
    title: { fontSize: 28, lineHeight: 36, fontWeight: "700", color: c.text, textAlign: "center", maxWidth: 640 },
    actions: { gap: 12, width: "100%", maxWidth: 420, marginTop: 8 },
  }));

  if (!error) {
    return (
      <View style={styles.screen} testID="kiosk-sending" accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Enviando tu pedido…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="kiosk-send-error">
      <MaterialCommunityIcons name="wifi-off" size={64} color={colors.warning} />
      <Text style={styles.title} role="alert">
        {error}
      </Text>
      <View style={styles.actions}>
        <KioskButton
          label="Reintentar"
          size="lg"
          icon="refresh"
          onPress={onRetry}
          loading={retrying}
          testID="kiosk-send-retry"
        />
        <KioskButton
          label="Volver a mi pedido"
          variant="secondary"
          icon="arrow-left"
          onPress={onBack}
          disabled={retrying}
          testID="kiosk-send-back"
        />
      </View>
    </View>
  );
}
