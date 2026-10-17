import type { Palette } from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ChipVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

export interface AppChipProps {
  variant?: ChipVariant;
  size?: "sm" | "md";
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

/**
 * Chip semantico con variantes de estado. Reemplaza los chips
 * ad-hoc de Paper con tokens consistentes. Forma de pildora.
 */
export default function AppChip({
  variant = "default",
  size = "md",
  icon,
  children,
  onPress,
  style,
}: AppChipProps) {
  const theme = useTheme();
  const colors = variantColors(theme.colors)[variant];
  const sizing = SIZE[size];
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: colors.bg,
          height: sizing.height,
          paddingHorizontal: sizing.px,
        },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={sizing.iconSize}
          color={colors.fg}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          {
            color: colors.fg,
            fontSize: sizing.fontSize,
            lineHeight: sizing.lineHeight,
            fontWeight: "500",
          },
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </Wrapper>
  );
}

const variantColors = (
  c: Palette,
): Record<ChipVariant, { bg: string; fg: string }> => ({
  default: { bg: c.surfaceMuted, fg: c.text },
  primary: { bg: c.primarySoft, fg: c.primary },
  // Texto *Strong: los colores de estado sobre su fondo suave no contrastan.
  success: { bg: c.successSoft, fg: c.successStrong },
  warning: { bg: c.warningSoft, fg: c.warningStrong },
  error: { bg: c.errorSoft, fg: c.errorStrong },
  info: { bg: c.infoSoft, fg: c.infoStrong },
});

const SIZE = {
  sm: { height: 20, px: 6, fontSize: 11, lineHeight: 14, iconSize: 11 },
  md: { height: 24, px: 8, fontSize: 12, lineHeight: 16, iconSize: 12 },
} as const;

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.full,
    alignSelf: "flex-start",
  },
});
