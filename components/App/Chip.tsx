import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
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
  const colors = VARIANT_COLORS[variant];
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

const VARIANT_COLORS: Record<
  ChipVariant,
  { bg: string; fg: string }
> = {
  default: { bg: palette.surfaceMuted, fg: palette.text },
  primary: { bg: palette.primarySoft, fg: palette.primary },
  success: { bg: palette.successSoft, fg: palette.success },
  warning: { bg: palette.warningSoft, fg: palette.warning },
  error: { bg: palette.errorSoft, fg: palette.error },
  info: { bg: palette.infoSoft, fg: palette.info },
};

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
