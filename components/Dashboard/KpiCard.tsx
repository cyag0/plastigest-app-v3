import AppChip from "@/components/App/Chip";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

export interface KpiCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  delta?: {
    value: number;
    period?: string;
  };
  loading?: boolean;
  inverseDelta?: boolean;
  /** Estilo extra para el contenedor; usado para controlar el ancho/columnas
   * de forma responsiva desde el padre (p. ej. flexBasis en mobile). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta KPI compacta: icono + label + valor + delta.
 * Usado en el strip superior del dashboard. Estilo Linear/Stripe.
 */
export default function KpiCard({
  icon,
  label,
  value,
  delta,
  loading = false,
  inverseDelta = false,
  style,
}: KpiCardProps) {
  // IMPORTANTE: useTheme() debe ir ANTES de cualquier return temprano
  // para cumplir con las Rules of Hooks.
  const { colors } = useTheme();

  const styles = useThemedStyles((c) => ({
    card: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      ...tokens.shadow.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    iconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      ...tokens.typography.micro,
      color: c.textSecondary,
      flexShrink: 1,
    },
    value: {
      ...tokens.typography.numeric,
      color: c.text,
      fontVariant: ["tabular-nums"],
      marginBottom: 12,
    },
    deltaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    periodText: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    labelSkeleton: {
      width: 80,
      height: 11,
      borderRadius: 4,
      backgroundColor: c.surfaceMuted,
    },
    valueSkeleton: {
      width: 120,
      height: 28,
      borderRadius: 6,
      backgroundColor: c.surfaceMuted,
      marginBottom: 12,
    },
    deltaSkeleton: {
      width: 60,
      height: 20,
      borderRadius: 9999,
      backgroundColor: c.surfaceMuted,
    },
  }));

  if (loading) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.header}>
          <View style={styles.iconBox} />
          <View style={styles.labelSkeleton} />
        </View>
        <View style={styles.valueSkeleton} />
        <View style={styles.deltaSkeleton} />
      </View>
    );
  }

  let deltaVariant: "success" | "error" | "default" = "default";
  let deltaIcon: keyof typeof MaterialCommunityIcons.glyphMap = "minus";
  if (delta) {
    const isPositive = inverseDelta ? delta.value < 0 : delta.value > 0;
    const isNegative = inverseDelta ? delta.value > 0 : delta.value < 0;
    if (isPositive) {
      deltaVariant = "success";
      deltaIcon = "trending-up";
    } else if (isNegative) {
      deltaVariant = "error";
      deltaIcon = "trending-down";
    } else {
      deltaVariant = "default";
      deltaIcon = "minus";
    }
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={icon}
            size={16}
            color={colors.primary}
          />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {delta && (
        <View style={styles.deltaRow}>
          <AppChip variant={deltaVariant} size="sm" icon={deltaIcon}>
            {delta.value > 0 ? "+" : ""}
            {delta.value.toFixed(1)}%
          </AppChip>
          {delta.period && (
            <Text style={styles.periodText}>{delta.period}</Text>
          )}
        </View>
      )}
    </View>
  );
}
