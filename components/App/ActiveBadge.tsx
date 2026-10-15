import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ActiveBadgeProps {
  active: boolean;
  /** "Activa"/"Inactiva" (sucursal, categoría…) en lugar de "Activo". */
  feminine?: boolean;
}

/**
 * Estado activo/inactivo de un registro en listas y tarjetas. Discreto a
 * propósito: antes era un Chip verde sólido que parecía un botón.
 */
export default function ActiveBadge({ active, feminine = false }: ActiveBadgeProps) {
  const ending = feminine ? "a" : "o";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: active ? palette.successSoft : palette.surfaceMuted },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: active ? palette.success : palette.textMuted },
        ]}
      />
      <Text style={[styles.label, { color: active ? "#047857" : palette.textSecondary }]}>
        {active ? `Activ${ending}` : `Inactiv${ending}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
