import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Status = "draft" | "completed" | "cancelled";

const COLORS: Record<Status, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#F3F4F6", fg: "#6B7280", label: "Borrador" },
  completed: { bg: "#D1FAE5", fg: "#065F46", label: "Completada" },
  cancelled: { bg: "#FEE2E2", fg: "#991B1B", label: "Cancelada" },
};

interface Props {
  status: Status | string;
  label?: string;
  size?: "small" | "medium";
}

export default function ProductionStatusBadge({
  status,
  label,
  size = "small",
}: Props) {
  const key = (status as Status) in COLORS ? (status as Status) : "draft";
  const c = COLORS[key];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          paddingVertical: size === "small" ? 2 : 4,
          paddingHorizontal: size === "small" ? 8 : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: c.fg, fontSize: size === "small" ? 11 : 13 },
        ]}
      >
        {label ?? c.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "600",
  },
});
