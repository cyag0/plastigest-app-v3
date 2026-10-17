/**
 * Ventas en el tiempo (por hora o por día) con el trazo de la gráfica de
 * Inicio: barras delgadas de un solo color, la del momento actual resaltada.
 *
 * Arriba va la lectura: por omisión, la barra más alta; al pasar el cursor
 * (o tocar una barra en el teléfono), la de esa barra. Así cada valor se
 * puede leer sin poner un número encima de cada barra.
 */

import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export interface TrendBar {
  key: string;
  /** Texto bajo la barra; sin él la barra no lleva etiqueta. */
  axisLabel?: string;
  /** Para la lectura: "jueves 15 de octubre". */
  label: string;
  value: number;
  /** El periodo en curso (hoy, esta hora): va resaltada. */
  current?: boolean;
}

interface TrendBarsProps {
  bars: TrendBar[];
  formatValue: (value: number) => string;
  /** Lectura por omisión: "Día más alto", "Hora más alta". */
  peakLabel: string;
  emptyText: string;
  height?: number;
}

/** Ancho reservado a cada etiqueta del eje, centrada bajo su barra. */
const AXIS_LABEL_WIDTH = 48;

export default function TrendBars({ bars, formatValue, peakLabel, emptyText, height = 120 }: TrendBarsProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [active, setActive] = useState<string | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  const max = bars.reduce((top, bar) => Math.max(top, bar.value), 0);
  if (max <= 0) return <Text style={styles.empty}>{emptyText}</Text>;

  const peak = bars.find((bar) => bar.value === max);
  const shown = active ? bars.find((bar) => bar.key === active) : undefined;
  const slot = plotWidth / bars.length;

  const barColor = (bar: TrendBar) => {
    if (active) return bar.key === active ? colors.primary : colors.primary + "4D";
    return bar.current ? colors.primary : colors.primary + "A6";
  };

  return (
    <View>
      <Text style={styles.readout} numberOfLines={1}>
        {shown ? (
          <>
            <Text style={styles.readoutValue}>{formatValue(shown.value)}</Text>
            {` · ${shown.label}`}
          </>
        ) : peak ? (
          <>
            {`${peakLabel}: `}
            <Text style={styles.readoutValue}>{formatValue(peak.value)}</Text>
            {` · ${peak.label}`}
          </>
        ) : null}
      </Text>

      <View style={[styles.plot, { height }]} onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)}>
        {bars.map((bar) => (
          <Pressable
            key={bar.key}
            style={styles.slot}
            onPress={() => setActive((current) => (current === bar.key ? null : bar.key))}
            onHoverIn={() => setActive(bar.key)}
            onHoverOut={() => setActive((current) => (current === bar.key ? null : current))}
            accessibilityLabel={`${bar.label}: ${formatValue(bar.value)}`}
          >
            {bar.value > 0 && (
              <View
                style={[
                  styles.bar,
                  { height: `${(bar.value / max) * 100}%`, backgroundColor: barColor(bar) },
                ]}
              />
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.axis}>
        {slot > 0 &&
          bars.map((bar, index) =>
            bar.axisLabel ? (
              <Text
                key={bar.key}
                numberOfLines={1}
                style={[
                  styles.axisLabel,
                  bar.current && styles.axisLabelCurrent,
                  { left: index * slot + slot / 2 - AXIS_LABEL_WIDTH / 2 },
                ]}
              >
                {bar.axisLabel}
              </Text>
            ) : null,
          )}
      </View>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  empty: { fontSize: 14, color: c.textSecondary, paddingVertical: 4 },
  readout: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginBottom: 10 },
  readoutValue: { fontWeight: "600", color: c.text },
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  slot: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center" },
  // Delgadas (a lo más 22 px) y redondeadas solo arriba: crecen desde la base.
  bar: {
    width: "58%",
    maxWidth: 22,
    minHeight: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  axis: { height: 16, marginTop: 5 },
  axisLabel: {
    position: "absolute",
    top: 0,
    width: AXIS_LABEL_WIDTH,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: c.textMuted,
  },
  axisLabelCurrent: { color: c.text, fontWeight: "600" },
}));
