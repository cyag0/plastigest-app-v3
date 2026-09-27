import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import type { CheckoutMethod } from "./CheckoutModal";

interface Props {
  totals: { subtotal: number; discount: number; total: number; items: number };
  customerName: string;
  method: CheckoutMethod;
  onMethod: (m: CheckoutMethod) => void;
  onCustomer: () => void;
  onCheckout: () => void;
}

const METHODS: { key: CheckoutMethod; label: string; icon: string }[] = [
  { key: "cash", label: "EFECTIVO", icon: "cash" },
  { key: "card", label: "TARJETA", icon: "credit-card-outline" },
  { key: "mixed", label: "MIXTO", icon: "cash-plus" },
];

/** Panel derecho: resumen de la venta, método de pago y COBRAR. */
export default function SummaryPanel({ totals, customerName, method, onMethod, onCustomer, onCheckout }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>RESUMEN DE VENTA</Text>
      <Row label={`Subtotal (${totals.items} art.)`} value={formatMoney(totals.subtotal)} />
      <Row label="Descuento" value={`-${formatMoney(totals.discount)}`} />
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.total}>{formatMoney(totals.total)}</Text>
      </View>

      <Pressable onPress={onCustomer} style={styles.customer}>
        <MaterialCommunityIcons name="account-outline" size={18} color={palette.textSecondary} />
        <Text style={styles.customerText} numberOfLines={1}>Cliente: {customerName}</Text>
        <Text style={styles.key}>F6</Text>
      </Pressable>

      <View style={styles.methods}>
        {METHODS.map((m) => (
          <Pressable key={m.key} onPress={() => onMethod(m.key)} style={[styles.method, method === m.key && styles.methodActive]}>
            <MaterialCommunityIcons name={m.icon as any} size={22} color={method === m.key ? palette.primary : palette.textSecondary} />
            <Text style={[styles.methodText, method === m.key && { color: palette.primary }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        mode="contained"
        onPress={onCheckout}
        disabled={totals.items === 0}
        style={styles.cobrar}
        contentStyle={{ height: 58 }}
        labelStyle={{ fontSize: 18, fontWeight: "800" }}
      >
        COBRAR {formatMoney(totals.total)}
      </Button>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 340, backgroundColor: palette.surface, borderLeftWidth: 1, borderLeftColor: palette.border, padding: 18, gap: 8 },
  title: { fontWeight: "800", color: palette.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: palette.textSecondary },
  rowValue: { color: palette.text, fontWeight: "600" },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  totalLabel: { fontWeight: "800", color: palette.text, fontSize: 18 },
  total: { fontWeight: "800", color: palette.text, fontSize: 32 },
  customer: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, backgroundColor: palette.surfaceMuted, marginTop: 8 },
  customerText: { flex: 1, color: palette.text },
  key: { fontSize: 11, color: palette.textSecondary, borderWidth: 1, borderColor: palette.border, borderRadius: 4, paddingHorizontal: 4 },
  methods: { flexDirection: "row", gap: 8, marginTop: 8 },
  method: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: palette.border },
  methodActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  methodText: { fontSize: 12, fontWeight: "700", color: palette.textSecondary },
  cobrar: { marginTop: "auto", borderRadius: 12 },
});
