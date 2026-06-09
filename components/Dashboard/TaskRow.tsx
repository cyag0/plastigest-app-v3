import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppChip from "../App/Chip";

export type TaskRowStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "overdue";

export interface TaskRowProps {
  id: number | string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  meta: string;
  status: TaskRowStatus;
  isUnread?: boolean;
  onPress?: () => void;
  onComplete?: () => void;
}

/**
 * Fila compacta de tarea (64px). Reemplaza el Card actual
 * que era ~120px. Estilo Linear/Notion.
 */
export default function TaskRow({
  id: _id,
  icon,
  title,
  meta,
  status,
  isUnread = false,
  onPress,
  onComplete,
}: TaskRowProps) {
  const borderColor = getBorderColor(status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        { borderLeftColor: borderColor },
        isUnread && styles.unread,
      ]}
    >
      {/* Checkbox circular */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          onComplete?.();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.checkbox}
      >
        {status === "completed" ? (
          <View style={styles.checkboxChecked}>
            <MaterialCommunityIcons
              name="check"
              size={11}
              color={palette.textInverse}
            />
          </View>
        ) : (
          <View style={styles.checkboxEmpty} />
        )}
      </TouchableOpacity>

      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            status === "completed" && styles.titleCompleted,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {isUnread && <View style={styles.unreadDot} />}

      <View style={styles.rightIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={palette.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
}

function getBorderColor(status: TaskRowStatus): string {
  switch (status) {
    case "overdue":
      return palette.error;
    case "pending":
      return palette.warning;
    case "in_progress":
      return palette.info;
    case "completed":
      return palette.success;
    case "cancelled":
      return palette.border;
    default:
      return palette.border;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    paddingLeft: tokens.spacing[3],
    borderLeftWidth: 3,
    minHeight: 64,
    gap: tokens.spacing[3],
    ...tokens.shadow.sm,
  },
  unread: {
    backgroundColor: "rgba(79, 122, 58, 0.04)",
  },
  checkbox: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxEmpty: {
    width: 18,
    height: 18,
    borderRadius: tokens.radius.full,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
  },
  checkboxChecked: {
    width: 18,
    height: 18,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.success,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...tokens.typography.bodyMd,
    color: palette.text,
  },
  titleCompleted: {
    color: palette.textMuted,
    textDecorationLine: "line-through",
  },
  meta: {
    ...tokens.typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  rightIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
