/**
 * El equipo está en modo kiosko pero la cuenta ya no tiene permiso para usar
 * el kiosko: en lugar de una pantalla del personal se muestra "fuera de
 * servicio", con la salida por PIN a la vista.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import KioskExitDialog from "./KioskExitDialog";

export default function KioskUnavailable({ onExited }: { onExited: () => void }) {
  const { colors } = useTheme();
  const [exitOpen, setExitOpen] = useState(false);
  const styles = useThemedStyles((c) => ({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 14,
      backgroundColor: c.background,
    },
    title: { fontSize: 30, fontWeight: "800", color: c.text, textAlign: "center" },
    text: { fontSize: 20, lineHeight: 28, color: c.textSecondary, textAlign: "center", maxWidth: 560 },
    exit: { marginTop: 24 },
  }));

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.screen} testID="kiosk-unavailable">
        <MaterialCommunityIcons name="store-off-outline" size={64} color={colors.textMuted} />
        <Text style={styles.title}>El kiosko no está disponible por ahora</Text>
        <Text style={styles.text}>Pide ayuda en caja.</Text>
        <KioskButton
          label="Salir del modo kiosko (personal)"
          variant="quiet"
          icon="lock-outline"
          onPress={() => setExitOpen(true)}
          testID="kiosk-unavailable-exit"
          style={styles.exit}
        />
      </View>
      {exitOpen ? <KioskExitDialog onCancel={() => setExitOpen(false)} onSuccess={onExited} /> : null}
    </View>
  );
}
