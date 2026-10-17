import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface IconLabelProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}

/**
 * Atributo de un registro con su ícono, en texto secundario: método de pago,
 * dirección de una transferencia, tipo de movimiento. No es un estado, así
 * que no lleva color ni píldora (eso es StatusBadge).
 */
export default function IconLabel({ icon, label }: IconLabelProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={14} color={colors.textMuted} />
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
});
