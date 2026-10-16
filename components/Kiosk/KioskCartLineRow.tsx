/**
 * Renglón del pedido (revisión y panel lateral): nombre, opción, selector de
 * 56, importe y "Quitar" con ícono y texto. El "−" no baja de 1: para quitar
 * el renglón está "Quitar" (con "Deshacer" en el aviso).
 */
import { useTheme } from "@/contexts/ThemeContext";
import type { KioskCartEntry } from "@/hooks/useKioskCart";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import KioskQuantityStepper from "./KioskQuantityStepper";
import { formatCents } from "./model";

interface Props {
  entry: KioskCartEntry;
  onIncrement: (entry: KioskCartEntry) => void;
  onDecrement: (entry: KioskCartEntry) => void;
  onRemove: (entry: KioskCartEntry) => void;
  /** Prefijo de los testID: "kiosk" (revisión) o "kiosk-panel". */
  testIDPrefix?: string;
}

export default function KioskCartLineRow({ entry, onIncrement, onDecrement, onRemove, testIDPrefix = "kiosk" }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    row: { paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
    top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    body: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: c.text },
    option: { fontSize: 16, lineHeight: 22, color: c.textSecondary },
    amount: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
    bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    remove: {
      minHeight: 56,
      paddingHorizontal: 14,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    removePressed: { backgroundColor: c.surfaceMuted },
    removeText: { fontSize: 18, fontWeight: "600", color: c.text },
  }));

  const name = entry.product.name;
  // La opción ("Por litro", "Paquete de 6") solo dice algo si hay de dónde
  // elegir; con una sola, "Por mililitro" en un frasco de 180 ml confundía.
  const hasChoices = entry.product.packages.length > 0;
  const optionName = hasChoices ? `${name}, ${entry.option.label}` : name;
  return (
    <View style={styles.row} testID={`${testIDPrefix}-line-${entry.key}`}>
      <View style={styles.top}>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.option}>
            {hasChoices
              ? `${entry.option.label} · ${formatCents(entry.option.priceCents)}`
              : `${formatCents(entry.option.priceCents)} c/u`}
          </Text>
        </View>
        <Text style={styles.amount} testID={`${testIDPrefix}-amount-${entry.key}`}>
          {formatCents(entry.lineTotalCents)}
        </Text>
      </View>
      <View style={styles.bottom}>
        <KioskQuantityStepper
          value={entry.quantity}
          name={optionName}
          canDecrement={entry.quantity > 1}
          onIncrement={() => onIncrement(entry)}
          onDecrement={() => onDecrement(entry)}
          testIDPrefix={`${testIDPrefix}-qty`}
          testIDKey={entry.key}
        />
        <Pressable
          onPress={() => onRemove(entry)}
          style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${optionName}`}
          testID={`${testIDPrefix}-remove-${entry.key}`}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error} />
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>
    </View>
  );
}
