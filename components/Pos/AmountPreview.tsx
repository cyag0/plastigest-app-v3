import palette from "@/constants/palette";
import { formatMoney, parseMoney } from "@/utils/format";
import React from "react";
import { StyleProp, StyleSheet, TextStyle } from "react-native";
import { Text } from "react-native-paper";

interface Props {
  /** Lo que el usuario escribió en el campo de dinero. */
  value: string;
  /** Texto antes del monto: "Se registrará", "Contado", "Fondo inicial"… */
  label?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Debajo de un campo de dinero: cómo se leyó lo que se escribió ("1,500" →
 * $1,500.00), o que no es un monto válido. Así un "1,500" leído como 1.5 o un
 * "1.500,50" no pasan sin que el usuario lo vea antes de guardar.
 */
export default function AmountPreview({ value, label = "Se registrará", style }: Props) {
  if (value.trim() === "") return null;

  const amount = parseMoney(value);
  if (amount === null) {
    return (
      <Text style={[styles.text, styles.error, style]}>
        Monto no válido: escríbelo como 1500 o 1,500.50
      </Text>
    );
  }
  if (amount < 0) {
    return <Text style={[styles.text, styles.error, style]}>El monto no puede ser negativo</Text>;
  }

  return (
    <Text style={[styles.text, style]}>
      {label}: <Text style={styles.amount}>{formatMoney(amount)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 13, color: palette.textSecondary, marginTop: 4 },
  amount: { fontWeight: "700", color: palette.text },
  error: { color: palette.error },
});
