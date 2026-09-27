import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const KEYS: [string, string][] = [
  ["F2", "Buscar"],
  ["F4", "Cantidad"],
  ["F6", "Cliente"],
  ["F8", "Cobrar"],
  ["Supr", "Quitar"],
  ["ESC", "Cancelar"],
];

/** Pie con los atajos de teclado (solo escritorio). */
export default function ShortcutsBar() {
  return (
    <View style={styles.bar}>
      {KEYS.map(([k, label]) => (
        <View key={k} style={styles.item}>
          <Text style={styles.key}>{k}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", gap: 18, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: palette.surfaceMuted, borderTopWidth: 1, borderTopColor: palette.border },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  key: { fontSize: 12, fontWeight: "700", color: palette.text, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  label: { fontSize: 13, color: palette.textSecondary },
});
