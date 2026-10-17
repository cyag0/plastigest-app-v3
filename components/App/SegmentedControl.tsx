/**
 * Opciones excluyentes siempre a la vista (periodo, alcance): una sola
 * superficie con borde, como ListGroup, y la elegida en el verde suave de la
 * marca (igual que la sección activa del menú).
 *
 *   <SegmentedControl
 *     options={[{ value: "week", label: "Semana" }, …]}
 *     value={period}
 *     onChange={setPeriod}
 *   />
 */

import { tokens } from "@/constants/tokens";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Reparte todo el ancho entre las opciones (teléfono). */
  stretch?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  stretch,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[styles.group, stretch && styles.groupStretch, style]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.segment,
              stretch && styles.segmentStretch,
              selected && styles.segmentSelected,
              !selected && pressed && styles.segmentPressed,
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
  group: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 3,
    gap: 2,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  groupStretch: { alignSelf: "stretch" },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentStretch: { flex: 1, paddingHorizontal: 6 },
  segmentSelected: { backgroundColor: c.primarySoft },
  segmentPressed: { backgroundColor: c.surfaceMuted },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.textSecondary },
  labelSelected: { color: c.primary, fontWeight: "600" },
}));
