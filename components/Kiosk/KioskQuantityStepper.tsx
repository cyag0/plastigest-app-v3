/**
 * Selector − cantidad + con botones de 56. El "+" sigue activo en el tope:
 * al tocarlo, la pantalla avisa "Solo quedan {n}".
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface Props {
  value: number;
  /** Nombre para los lectores de pantalla ("Agregar uno: Agua de coco"). */
  name: string;
  onIncrement: () => void;
  onDecrement: () => void;
  canDecrement?: boolean;
  /** testID: `${testIDPrefix}-plus-${testIDKey}`, `-minus-` y la cantidad `${testIDPrefix}-${testIDKey}`. */
  testIDPrefix: string;
  testIDKey: string;
}

export default function KioskQuantityStepper({
  value,
  name,
  onIncrement,
  onDecrement,
  canDecrement = value > 0,
  testIDPrefix,
  testIDKey,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    button: {
      width: 56,
      height: 56,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: c.surfaceMuted },
    disabled: { opacity: 0.35 },
    value: {
      minWidth: 48,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
      fontVariant: ["tabular-nums"],
    },
  }));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={canDecrement ? onDecrement : undefined}
        disabled={!canDecrement}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, !canDecrement && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Quitar uno: ${name}`}
        accessibilityState={{ disabled: !canDecrement }}
        testID={`${testIDPrefix}-minus-${testIDKey}`}
      >
        <MaterialCommunityIcons name="minus" size={28} color={colors.text} />
      </Pressable>
      <Text
        style={styles.value}
        testID={`${testIDPrefix}-${testIDKey}`}
        accessibilityLabel={`Cantidad: ${value}`}
        accessibilityLiveRegion="polite"
      >
        {value}
      </Text>
      <Pressable
        onPress={onIncrement}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Agregar uno: ${name}`}
        testID={`${testIDPrefix}-plus-${testIDKey}`}
      >
        <MaterialCommunityIcons name="plus" size={28} color={colors.text} />
      </Pressable>
    </View>
  );
}
