/**
 * Campo de cantidad para planta: número grande, la unidad al lado y, si se
 * piden, botones − / + para contar piezas sin teclear.
 *
 *   <QuantityField value={text} onChangeText={setText} unit="L" />
 *   <QuantityField value={text} onChangeText={setText} unit="pz" steppers />
 */

import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { toNumber } from "./productionFormat";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  unit?: string | null;
  /** Botones − / + (para contar piezas). */
  steppers?: boolean;
  step?: number;
  /** Solo enteros (piezas). */
  integer?: boolean;
  invalid?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
}

export default function QuantityField({
  value,
  onChangeText,
  unit,
  steppers = false,
  step = 1,
  integer = false,
  invalid = false,
  placeholder = "0",
  accessibilityLabel,
  autoFocus,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    row: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
    // Ancho fijo: en web un TextInput mide unos 20 caracteres y, sin esto,
    // el campo se comía el renglón y el nombre del producto quedaba en una
    // columna de una letra.
    box: {
      flexDirection: "row",
      alignItems: "center",
      width: steppers ? 76 : 128,
      height: 44,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surface,
    },
    boxInvalid: { borderColor: c.error, backgroundColor: c.errorSoft },
    input: {
      flex: 1,
      minWidth: 0,
      width: "100%",
      fontSize: 18,
      fontWeight: "600",
      color: c.text,
      textAlign: "right",
      paddingVertical: 0,
      fontVariant: ["tabular-nums"],
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    unit: { marginLeft: 4, fontSize: 14, color: c.textSecondary },
    stepper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceMuted,
    },
  }));

  const bump = (delta: number) => {
    const current = toNumber(value) ?? 0;
    const next = Math.max(0, current + delta);
    onChangeText(next === 0 ? "" : String(integer ? Math.round(next) : Math.round(next * 1000) / 1000));
  };

  const handleText = (text: string) => {
    const clean = text.replace(",", ".").replace(integer ? /[^0-9]/g : /[^0-9.]/g, "");
    // Un solo punto decimal.
    const [head, ...tail] = clean.split(".");
    onChangeText(tail.length ? `${head}.${tail.join("")}` : head);
  };

  const field = (
    <View style={[styles.box, invalid && styles.boxInvalid]}>
      <TextInput
        value={value}
        onChangeText={handleText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        inputMode={integer ? "numeric" : "decimal"}
        selectTextOnFocus
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
      />
      {!!unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );

  if (!steppers) return <View style={{ flexShrink: 0 }}>{field}</View>;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => bump(-step)}
        style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${step}${accessibilityLabel ? ` de ${accessibilityLabel}` : ""}`}
        hitSlop={4}
      >
        <MaterialCommunityIcons name="minus" size={20} color={colors.text} />
      </Pressable>
      {field}
      <Pressable
        onPress={() => bump(step)}
        style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${step}${accessibilityLabel ? ` a ${accessibilityLabel}` : ""}`}
        hitSlop={4}
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}
