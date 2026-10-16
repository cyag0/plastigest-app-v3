/**
 * Panel derecho "Tu pedido" en pantallas anchas (≥ 1100 y horizontal): la
 * misma lista de la revisión y "Continuar".
 */
import type { KioskCartEntry } from "@/hooks/useKioskCart";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import KioskButton from "./KioskButton";
import KioskCartLineRow from "./KioskCartLineRow";
import { formatCents, plural } from "./model";

export const KIOSK_PANEL_WIDTH = 380;

interface Props {
  entries: KioskCartEntry[];
  count: number;
  totalCents: number;
  onIncrement: (entry: KioskCartEntry) => void;
  onDecrement: (entry: KioskCartEntry) => void;
  onRemove: (entry: KioskCartEntry) => void;
  onContinue: () => void;
}

export default function KioskCartPanel({
  entries,
  count,
  totalCents,
  onIncrement,
  onDecrement,
  onRemove,
  onContinue,
}: Props) {
  const styles = useThemedStyles((c) => ({
    panel: {
      width: KIOSK_PANEL_WIDTH,
      backgroundColor: c.surface,
      borderLeftWidth: 1,
      borderLeftColor: c.border,
    },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 2 },
    title: { fontSize: 24, fontWeight: "700", color: c.text },
    count: { fontSize: 16, color: c.textSecondary },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 16 },
    empty: { padding: 20, gap: 6 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: c.text },
    emptyText: { fontSize: 16, lineHeight: 22, color: c.textSecondary },
    footer: { padding: 20, gap: 14, borderTopWidth: 1, borderTopColor: c.border },
    totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    totalLabel: { fontSize: 20, fontWeight: "600", color: c.text },
    total: { fontSize: 30, fontWeight: "800", color: c.text, fontVariant: ["tabular-nums"] },
  }));

  return (
    <View style={styles.panel} testID="kiosk-cart-panel">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Tu pedido
        </Text>
        {count > 0 ? <Text style={styles.count}>{plural(count, "producto", "productos")}</Text> : null}
      </View>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aún no agregas productos</Text>
          <Text style={styles.emptyText}>Toca un producto para agregarlo a tu pedido.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {entries.map((entry, index) => (
            <View key={entry.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <KioskCartLineRow
                entry={entry}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
                testIDPrefix="kiosk-panel"
              />
            </View>
          ))}
        </ScrollView>
      )}
      {entries.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total} testID="kiosk-panel-total">
              {formatCents(totalCents)}
            </Text>
          </View>
          <KioskButton
            label="Continuar"
            size="lg"
            iconRight="arrow-right"
            onPress={onContinue}
            testID="kiosk-panel-continue"
          />
        </View>
      ) : null}
    </View>
  );
}
