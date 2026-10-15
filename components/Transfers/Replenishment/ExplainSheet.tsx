import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatQuantity } from "@/utils/format";
import React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

export interface ExplainTarget {
  productName: string;
  unit: string | null;
  locationName: string;
  explanation: App.Entities.ReplenishmentExplanation;
  /** Traspasos: de dónde sale y cuánto le sobra al origen. */
  source?: { name: string; explanation: App.Entities.ReplenishmentExplanation };
  quantity: number;
  coverageDays: number;
  /** "mañana (jueves)" o "los próximos 3 días". */
  horizonLabel: string;
}

function factorText(factor: number) {
  return `×${factor.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
}

/**
 * "¿Por qué?": cómo se llegó a la cantidad sugerida, con los mismos números
 * que usó el cálculo (venta diaria, día de la semana, temporada, margen,
 * existencia y lo que viene en camino).
 */
export default function ExplainSheet({ target, onClose }: { target: ExplainTarget; onClose: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const e = target.explanation;
  // Un decimal basta para leer el cálculo ("0.588 L" no aporta).
  const q = (value: number) => formatQuantity(Math.round(value * 10) / 10, target.unit);

  const row = (label: string, value: string, options: { strong?: boolean; muted?: boolean } = {}) => (
    <View style={styles.row}>
      <Text style={[styles.label, options.muted && { color: colors.textMuted }, options.strong && styles.strong]}>
        {label}
      </Text>
      <Text style={[styles.value, options.muted && { color: colors.textMuted }, options.strong && styles.strong]}>
        {value}
      </Text>
    </View>
  );

  const missing = Math.max(0, e.target - e.available);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{target.productName}</Text>
          <Text style={styles.subtitle}>en {target.locationName}</Text>

          <ScrollView style={{ maxHeight: 460 }}>
            {e.stock <= 0 && e.stockout_streak >= 2 && (
              <Text style={styles.soldOut}>
                Lleva {e.stockout_streak} días agotado. Esos días no cuentan para el promedio (no se sabe cuánto se
                habría vendido): se usa lo que vendía cuando tenía.
              </Text>
            )}

            <Text style={styles.section}>Lo que va a necesitar</Text>
            {row("Vende al día (promedio reciente)", q(e.daily_average))}
            {Math.abs(e.weekday_factor - 1) >= 0.05 &&
              target.coverageDays === 1 &&
              row("Ese día de la semana suele vender", `${factorText(e.weekday_factor)} el promedio`, { muted: true })}
            {Math.abs(e.season_factor - 1) >= 0.05 &&
              row("Temporada (lo del año pasado)", factorText(e.season_factor), { muted: true })}
            {e.sold_today > 0 && row("Hoy lleva vendido", q(e.sold_today), { muted: true })}
            {row("Le falta vender hoy", q(e.rest_of_today))}
            {row(`Para ${target.horizonLabel}`, q(e.forecast))}
            {e.safety > 0 && row("Margen por si vende más", q(e.safety))}
            {e.minimum > 0 && row("Existencia mínima capturada", q(e.minimum), { muted: true })}
            <View style={styles.divider} />
            {row("Necesita", q(e.target), { strong: true })}

            <Text style={styles.section}>Lo que tiene</Text>
            {row("En existencia", q(e.stock))}
            {e.incoming > 0 && row("Le llega (pedido o en camino)", q(e.incoming))}
            {e.committed > 0 && row("Ya va a mandar a otra sucursal", `−${q(e.committed)}`)}
            <View style={styles.divider} />
            {row("Cuenta con", q(e.available), { strong: true })}

            <View style={styles.result}>
              <Text style={styles.resultLabel}>{missing > 0 ? "Le falta" : "Le alcanza"}</Text>
              <Text style={styles.resultValue}>{missing > 0 ? q(missing) : "—"}</Text>
            </View>
            {missing > 0 && Math.abs(missing - target.quantity) >= 0.05 && (
              <Text style={styles.note}>
                Se sugiere {q(target.quantity)}
                {target.quantity < missing ? ": es lo que puede mandar el origen o se redondeó." : " (redondeado)."}
              </Text>
            )}

            {target.source && (
              <Text style={styles.note}>
                {target.source.name} tiene {q(target.source.explanation.available)} y necesita{" "}
                {q(target.source.explanation.target)} para sí: le sobran{" "}
                {q(Math.max(0, target.source.explanation.available - target.source.explanation.target))}.
              </Text>
            )}

            <Text style={styles.footnote}>
              Con {e.history_days} {e.history_days === 1 ? "día" : "días"} de historial
              {e.stockout_days > 0
                ? `; ${e.stockout_days} ${e.stockout_days === 1 ? "día" : "días"} que se agotó no se contaron`
                : ""}
              . Pesa más lo reciente y se toma en cuenta qué día de la semana es.
            </Text>
          </ScrollView>

          <Button mode="contained" onPress={onClose} style={{ marginTop: tokens.spacing[2] }}>
            Entendido
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: tokens.spacing[4],
  },
  sheet: {
    width: "100%" as const,
    maxWidth: 480,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
  },
  title: {
    ...tokens.typography.h3,
    color: c.text,
  },
  subtitle: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
    marginBottom: tokens.spacing[2],
  },
  section: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    fontWeight: "600" as const,
    marginTop: tokens.spacing[3],
    marginBottom: tokens.spacing[1],
  },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: tokens.spacing[3],
    paddingVertical: 3,
  },
  label: {
    ...tokens.typography.bodySm,
    color: c.text,
    flex: 1,
  },
  value: {
    ...tokens.typography.bodySm,
    color: c.text,
    fontVariant: ["tabular-nums" as const],
  },
  strong: {
    fontWeight: "700" as const,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: tokens.spacing[1],
  },
  result: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: tokens.spacing[3],
    padding: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    backgroundColor: c.primarySoft,
  },
  resultLabel: {
    ...tokens.typography.bodyMd,
    color: c.primary,
    fontWeight: "700" as const,
  },
  resultValue: {
    ...tokens.typography.bodyMd,
    color: c.primary,
    fontWeight: "700" as const,
  },
  note: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    marginTop: tokens.spacing[2],
  },
  soldOut: {
    ...tokens.typography.caption,
    color: c.warning,
    marginTop: tokens.spacing[1],
  },
  footnote: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: tokens.spacing[3],
  },
});
