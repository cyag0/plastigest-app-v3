import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { View } from "react-native";
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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = themedStyles((c) => ({
  bar: { flexDirection: "row", gap: 18, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.surfaceMuted, borderTopWidth: 1, borderTopColor: c.border },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  key: { fontSize: 12, fontWeight: "700", color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  label: { fontSize: 13, color: c.textSecondary },
}));
