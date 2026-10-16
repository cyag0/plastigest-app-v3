/**
 * Botón del kiosko: área táctil de 56 (o 64 en las acciones principales),
 * texto de 18-20 y colores del tema (claro y oscuro).
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface KioskButtonProps {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  /** primary: acción principal; secondary: superficie con borde; quiet: solo texto. */
  variant?: "primary" | "secondary" | "quiet";
  size?: "lg" | "md";
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function KioskButton({
  label,
  onPress,
  onLongPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled,
  loading,
  testID,
  accessibilityLabel,
  style,
}: KioskButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    base: {
      minHeight: 56,
      paddingHorizontal: 20,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    lg: { minHeight: 64, paddingHorizontal: 28, borderRadius: 16 },
    primary: { backgroundColor: c.primary },
    secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong },
    quiet: { backgroundColor: "transparent" },
    pressedPrimary: { backgroundColor: c.primaryHover },
    pressedOther: { backgroundColor: c.surfaceMuted },
    disabled: { opacity: 0.45 },
    label: { fontSize: 18, fontWeight: "600", textAlign: "center", flexShrink: 1 },
    labelLg: { fontSize: 20, fontWeight: "700" },
    labelPrimary: { color: c.primaryForeground },
    labelOther: { color: c.text },
  }));

  const isPrimary = variant === "primary";
  const fg = isPrimary ? colors.primaryForeground : colors.text;
  const iconSize = size === "lg" ? 26 : 22;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      onLongPress={inactive ? undefined : onLongPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === "lg" && styles.lg,
        styles[variant],
        pressed && !inactive && (isPrimary ? styles.pressedPrimary : styles.pressedOther),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={iconSize} color={fg} />
      ) : null}
      <Text
        style={[styles.label, size === "lg" && styles.labelLg, isPrimary ? styles.labelPrimary : styles.labelOther]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {iconRight && !loading ? <MaterialCommunityIcons name={iconRight} size={iconSize} color={fg} /> : null}
    </Pressable>
  );
}
