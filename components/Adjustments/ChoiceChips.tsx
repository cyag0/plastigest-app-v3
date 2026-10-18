/**
 * Opciones excluyentes a la vista, en varias líneas si no caben: "¿Qué
 * pasó?" (siete respuestas no caben como segmentos en el teléfono) y "¿Sale
 * o entra?". Sin opción elegida al empezar: antes el motivo arrancaba en
 * "Otro" y casi todo terminaba así. La elegida va en el verde suave de la
 * marca, como en SegmentedControl.
 */

import { tokens } from "@/constants/tokens";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export default function ChoiceChips<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            // `hovered` solo existe en web (react-native-web).
            style={(state) => [
              styles.option,
              selected && styles.optionSelected,
              !selected && (state.pressed || (state as { hovered?: boolean }).hovered) && styles.optionPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    justifyContent: "center",
  },
  optionSelected: { backgroundColor: c.primarySoft, borderColor: c.primary },
  optionPressed: { backgroundColor: c.surfaceMuted },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.text },
  labelSelected: { color: c.primary, fontWeight: "600" },
}));
