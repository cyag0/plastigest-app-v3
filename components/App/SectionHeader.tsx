import { tokens } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string | number;
  rightSlot?: React.ReactNode;
}

/**
 * Header de seccion reusable: titulo h2 a la izquierda y
 * accion/badge a la derecha. Usado en dashboard, listas, etc.
 */
export default function SectionHeader({
  title,
  actionLabel,
  onAction,
  badge,
  rightSlot,
}: SectionHeaderProps) {
  const styles = useThemedStyles((colors) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      ...tokens.typography.h2,
      color: colors.text,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 9999,
      paddingHorizontal: 6,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      ...tokens.typography.micro,
      color: colors.primary,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    actionLabel: {
      ...tokens.typography.bodyMd,
      color: colors.primary,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {(actionLabel || rightSlot) && (
        <View style={styles.right}>
          {rightSlot}
          {actionLabel && onAction && (
            <TouchableOpacity
              onPress={onAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionLabel}>{actionLabel} →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
