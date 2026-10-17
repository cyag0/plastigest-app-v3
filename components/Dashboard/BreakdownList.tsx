/**
 * Desgloses de los resúmenes (más vendidos, métodos de pago, sucursales,
 * categorías): una fila por concepto con su cifra y una barra delgada debajo,
 * dentro de un ListGroup. Todas las barras van de un color: el largo ya dice
 * cuánto es, y el color queda libre para los estados.
 *
 *   <BreakdownList items={[{ key, label, value, valueText: "$60.00" }]} />
 *
 * `max` fija la escala: sin él, la barra más larga es el concepto mayor;
 * con el total, cada barra es su parte del total.
 */

import { ListGroup, LIST_TEXT_INSET } from "@/components/App/ListGroup";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface BreakdownItem {
  key: string;
  label: string;
  /** Lo que mide la barra. */
  value: number;
  /** La cifra de la derecha ("$60.00", "15"). */
  valueText: string;
  /** Dato discreto antes de la cifra ("89%"). */
  detail?: string;
}

export default function BreakdownList({
  items,
  max,
  footer,
}: {
  items: BreakdownItem[];
  max?: number;
  /** Última fila del grupo (p. ej. "Ver todas"). */
  footer?: React.ReactNode;
}) {
  const scale = max ?? items.reduce((top, item) => Math.max(top, item.value), 0);
  return (
    <ListGroup inset={LIST_TEXT_INSET}>
      {items.map((item) => (
        <BreakdownRow key={item.key} item={item} scale={scale} />
      ))}
      {footer}
    </ListGroup>
  );
}

function BreakdownRow({ item, scale }: { item: BreakdownItem; scale: number }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const share = scale > 0 ? Math.min(1, Math.max(0, item.value / scale)) : 0;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${item.label}: ${item.valueText}`}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
        {!!item.detail && <Text style={styles.detail}>{item.detail}</Text>}
        <Text style={styles.value}>{item.valueText}</Text>
      </View>
      <View style={styles.track}>
        {share > 0 && (
          <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: colors.primary }]} />
        )}
      </View>
    </View>
  );
}

/** Fila final de un grupo con una acción en texto ("Ver las 13"). */
export function ListFooterAction({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
    >
      <Text style={styles.footerText}>{label}</Text>
    </Pressable>
  );
}

export interface ProportionSegment {
  key: string;
  value: number;
  color: string;
}

/**
 * Una barra partida en tramos que suman el todo (salud del stock). Los tramos
 * se separan con un hueco del color de la superficie, no con bordes. El
 * color nunca va solo: quien la usa pone debajo cada tramo con su nombre.
 */
export function ProportionBar({ segments, height = 10 }: { segments: ProportionSegment[]; height?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.stack, { height, borderRadius: height / 2 }]}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <View
            key={segment.key}
            style={[styles.segment, { flexGrow: segment.value, backgroundColor: segment.color }]}
          />
        ))}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  row: { paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  label: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
  detail: { fontSize: 13, color: c.textMuted, fontVariant: ["tabular-nums"] },
  value: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: c.text,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surfaceMuted,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: tokens.radius.full },

  footer: { paddingVertical: 12, alignItems: "center" },
  footerPressed: { backgroundColor: c.surfaceMuted },
  footerText: { fontSize: 14, fontWeight: "600", color: c.primary },

  stack: { flexDirection: "row", gap: 2, overflow: "hidden" },
  segment: { flexBasis: 0, minWidth: 4, height: "100%" },
}));
