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
  /** Bajar es bueno (p. ej. mermas): el color se invierte. */
  inverseDelta?: boolean;
  /** Subir o bajar no es bueno ni malo (p. ej. compras): sin color. */
  neutralDelta?: boolean;
  /** Texto bajo el valor (p. ej. "37% de los productos"); a diferencia de
   * `delta` no es una variación, así que no lleva flecha ni color. */
  caption?: string;
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
  neutralDelta = false,
  caption,
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
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    iconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    // Etiqueta en minúsculas normales, sin cuadrito de ícono: la mayúscula
    // espaciada + ícono en pastel era el sello de "tablero de plantilla".
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500" as const,
      color: c.textSecondary,
      flexShrink: 1,
    },
    value: {
      ...tokens.typography.numeric,
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.5,
      color: c.text,
      fontVariant: ["tabular-nums"],
      marginBottom: 4,
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
    // La flecha sigue al signo; el color, a si el cambio es bueno o malo.
    // Antes la flecha seguía al color: "↗ -100%" en verde.
    deltaIcon = delta.value > 0 ? "trending-up" : delta.value < 0 ? "trending-down" : "minus";
    const good = inverseDelta ? delta.value < 0 : delta.value > 0;
    const bad = inverseDelta ? delta.value > 0 : delta.value < 0;
    deltaVariant = neutralDelta ? "default" : good ? "success" : bad ? "error" : "default";
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name={icon} size={15} color={colors.textMuted} />
        <Text style={styles.label} numberOfLines={2}>
          {label}
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
      {!delta && caption ? (
        <Text style={styles.periodText}>{caption}</Text>
      ) : null}
    </View>
  );
}
