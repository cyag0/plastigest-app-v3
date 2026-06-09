import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export interface QuickAccessCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Tarjeta horizontal de acceso rapido. Sin color saturado:
 * fondo blanco neutro, icono monocromo, hover con borde primary.
 * Inspirado en Linear y Vercel.
 */
export default function QuickAccessCard({
  icon,
  label,
  description,
  onPress,
  disabled = false,
}: QuickAccessCardProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((c) => ({
    card: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: "transparent",
      ...tokens.shadow.sm,
      ...(Platform.OS === "web"
        ? ({
            transitionProperty: "border-color, background-color",
            transitionDuration: "150ms",
          } as any)
        : {}),
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    description: {
      ...tokens.typography.caption,
      color: c.textMuted,
      marginTop: 1,
    },
    disabled: {
      opacity: 0.4,
    },
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.card, disabled && styles.disabled]}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
