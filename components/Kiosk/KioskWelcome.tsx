/**
 * Bienvenida del kiosko. Tocar cualquier parte también empieza el pedido.
 * Sin tarjetas ni colores fuera de la paleta: texto grande y un botón.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { KioskLocationName } from "./KioskTopBar";

interface Props {
  locationName: string;
  onStart: () => void;
  onExitRequest: () => void;
}

export default function KioskWelcome({ locationName, onStart, onExitRequest }: Props) {
  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    top: { paddingHorizontal: 24, paddingTop: 16, alignItems: "flex-start" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
    title: {
      fontSize: 40,
      lineHeight: 48,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    subtitle: { fontSize: 20, lineHeight: 28, color: c.textSecondary, textAlign: "center" },
    steps: { fontSize: 18, lineHeight: 26, color: c.text, textAlign: "center", marginTop: 8 },
    stepNumber: { fontWeight: "800", color: c.primary },
    button: { marginTop: 24, minWidth: 320 },
  }));

  return (
    <View style={styles.screen} testID="kiosk-welcome">
      {/* Fondo tocable: un toque en cualquier parte empieza el pedido. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="Empezar pedido"
        testID="kiosk-welcome-area"
      />
      <View style={styles.top} pointerEvents="box-none">
        <KioskLocationName name={locationName} onExitRequest={onExitRequest} large />
      </View>
      <View style={styles.center} pointerEvents="box-none">
        <View pointerEvents="none" style={{ gap: 12 }}>
          <Text style={styles.title} accessibilityRole="header">
            Haz tu pedido aquí
          </Text>
          <Text style={styles.subtitle}>Elige tus productos y paga en caja</Text>
          <Text style={styles.steps}>
            <Text style={styles.stepNumber}>1</Text> Elige · <Text style={styles.stepNumber}>2</Text> Confirma ·{" "}
            <Text style={styles.stepNumber}>3</Text> Paga en caja
          </Text>
        </View>
        <KioskButton
          label="Empezar pedido"
          size="lg"
          iconRight="arrow-right"
          onPress={onStart}
          testID="kiosk-start"
          style={styles.button}
        />
      </View>
    </View>
  );
}
