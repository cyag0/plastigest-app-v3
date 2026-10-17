import type { Palette } from "@/constants/palette";
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Tono del estado. Qué significa cada uno (y qué estado de cada módulo lleva
 * cuál) está en constants/statuses.ts.
 */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

/**
 * Colores de un tono (fondo suave y texto). Para lo que no es una píldora
 * pero lleva el color del estado: ícono, punto o línea de tiempo.
 */
export function toneColors(c: Palette, tone: BadgeTone) {
  switch (tone) {
    case "success":
      return { bg: c.successSoft, fg: c.successStrong };
    case "warning":
      return { bg: c.warningSoft, fg: c.warningStrong };
    case "danger":
      return { bg: c.errorSoft, fg: c.errorStrong };
    case "info":
      return { bg: c.infoSoft, fg: c.infoStrong };
    default:
      return { bg: c.surfaceMuted, fg: c.textSecondary };
  }
}

/**
 * Estado de un registro (venta, compra, transferencia…) en listas, tablas y
 * detalles: píldora de fondo suave con el texto del mismo tono, en minúsculas
 * normales. Es el único badge de estado de la app (antes cada pantalla pintaba
 * el suyo: sólidos, en mayúsculas, con colores de Material).
 *
 * Solo para estados. Un atributo (método de pago, dirección, tipo) va como
 * texto con ícono: IconLabel.
 */
export default function StatusBadge({ label, tone = "neutral", icon }: StatusBadgeProps) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(colors, tone);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <MaterialCommunityIcons name={icon} size={12} color={fg} />}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});
