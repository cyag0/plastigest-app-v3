import AppChip from "@/components/App/Chip";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { tokens } from "@/constants/tokens";

export interface SidebarItemBadge {
  value: number;
  variant: "primary" | "success" | "warning" | "error" | "info" | "default";
}

export interface SidebarItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  badge?: SidebarItemBadge;
  onPress?: () => void;
}

/**
 * Item del sidebar con barra activa de 3px a la izquierda,
 * fondo primarySoft cuando activo, badge opcional y modo
 * colapsado (solo icono).
 */
export default function SidebarItem({
  icon,
  label,
  active = false,
  collapsed = false,
  badge,
  onPress,
}: SidebarItemProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((c) => ({
    item: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 10,
      borderRadius: 12,
      minHeight: 36,
      position: "relative",
    },
    itemActive: {
      backgroundColor: c.primarySoft,
    },
    activeBar: {
      position: "absolute",
      left: 0,
      top: 6,
      bottom: 6,
      width: 3,
      borderRadius: 9999,
      backgroundColor: c.primary,
    },
    iconBox: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    label: {
      ...tokens.typography.bodyMd,
      color: c.text,
      flex: 1,
      minWidth: 0,
    },
    labelInactive: {
      color: c.textSecondary,
    },
    badgeWrap: {
      flexShrink: 0,
    },
    collapsedWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
    },
  }));

  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.collapsedWrap}
        accessibilityLabel={label}
      >
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={active ? colors.primary : colors.textSecondary}
          />
        </View>
        {badge && (
          <View style={styles.badgeWrap}>
            <AppChip variant={badge.variant} size="sm">
              {badge.value}
            </AppChip>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.item, active && styles.itemActive]}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {active && <View style={styles.activeBar} />}
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={active ? colors.primary : colors.textSecondary}
        />
      </View>
      <Text
        style={[styles.label, !active && styles.labelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {badge && (
        <View style={styles.badgeWrap}>
          <AppChip variant={badge.variant} size="sm">
            {badge.value}
          </AppChip>
        </View>
      )}
    </TouchableOpacity>
  );
}
