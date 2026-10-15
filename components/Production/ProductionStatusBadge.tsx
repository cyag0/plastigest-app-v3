import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Status = "draft" | "completed" | "packaging" | "packed" | "cancelled";

/**
 * El empaque es un paso posterior a la producción, con estado propio:
 * borrador → producción terminada → en empaque → empacada.
 */
const COLORS: Record<Status, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#F0EDE4", fg: "#6E6B5E", label: "Borrador" },
  completed: { bg: "#E4F0DA", fg: "#065F46", label: "Producción terminada" },
  packaging: { bg: "#DFEDF0", fg: "#1E40AF", label: "En empaque" },
  packed: { bg: "#EDE9FE", fg: "#5B21B6", label: "Empacada" },
  cancelled: { bg: "#F8E2DC", fg: "#991B1B", label: "Cancelada" },
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
