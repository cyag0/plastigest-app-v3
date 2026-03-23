import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

type VariantMatchMap = Partial<
  Record<BadgeVariant, string | string[] | readonly string[]>
>;

interface StatusBadgeProps {
  value: string;
  label?: string;
  match?: VariantMatchMap | any;
}

const VARIANT_COLORS: Record<BadgeVariant, string> = {
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.blue,
  neutral: palette.textSecondary,
};

function normalizeToArray(value?: string | string[] | readonly string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function resolveVariant(value: string, match?: VariantMatchMap): BadgeVariant {
  if (!match) return "neutral";

  const safeValue = String(value || "").toLowerCase();
  const orderedVariants: BadgeVariant[] = [
    "success",
    "warning",
    "error",
    "info",
    "neutral",
  ];

  for (const variant of orderedVariants) {
    const candidates = normalizeToArray(match[variant]).map((item) =>
      String(item).toLowerCase(),
    );

    if (candidates.includes(safeValue)) {
      return variant;
    }
  }

  return "neutral";
}

export default function StatusBadge({ value, label, match }: StatusBadgeProps) {
  const variant = resolveVariant(value, match);

  return (
    <View style={[styles.badge, { backgroundColor: VARIANT_COLORS[variant] }]}>
      <Text style={styles.text}>{(label || value).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  text: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export type { BadgeVariant, VariantMatchMap };
