import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

export interface QuickAccessCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  /** Estilo extra para el contenedor; usado para controlar el ancho/columnas
   * de forma responsiva desde el padre (p. ej. flexBasis en mobile). */
  style?: StyleProp<ViewStyle>;
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
  style,
}: QuickAccessCardProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((c) => ({
    card: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
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
      style={[styles.card, disabled && styles.disabled, style]}
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
