/**
 * El efectivo que entró o salió del turno sin ser un cobro (gastos, compras,
 * devoluciones, movimientos a mano), con quién lo registró. Va en el corte
 * (al cerrar y en el detalle del turno): si el encargado sacó $500 del cajón
 * para pagar al proveedor, el cajero lo ve ahí con su nombre en lugar de solo
 * un efectivo esperado más bajo.
 *
 *   Otros movimientos de efectivo
 *   Gasto: Hielo                       −$200.00
 *   Lo registró Pedro · 14:20
 */

import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatTime } from "@/utils/dates";
import { formatMoney } from "@/utils/format";
import React from "react";
import { Text, View } from "react-native";

interface Props {
  movements?: App.Entities.CashSessionMovement[];
  /** El cajero del turno: lo que registró otra persona se resalta. */
  cashierId?: number;
}

export default function ShiftCashMovements({ movements, cashierId }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (!movements || movements.length === 0) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.heading}>Otros movimientos de efectivo</Text>
      {movements.map((movement, index) => {
        const byOther = cashierId !== undefined && movement.user_id != null && movement.user_id !== cashierId;
        const when = movement.created_at ? formatTime(movement.created_at) : null;
        return (
          <View key={index} style={styles.item}>
            <View style={styles.line}>
              <Text style={styles.concept} numberOfLines={2}>
                {movement.concept}
              </Text>
              <Text style={styles.amount}>
                {movement.type === "expense" ? "−" : "+"}
                {formatMoney(movement.amount)}
              </Text>
            </View>
            <Text style={[styles.meta, byOther && styles.metaOther]}>
              {`Lo registró ${movement.user_name ?? "—"}`}
              {when ? ` · ${when}` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  block: { marginTop: 8, gap: 6 },
  heading: { color: c.textSecondary, fontWeight: "600", fontSize: 13 },
  item: { gap: 1 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  concept: { color: c.text, flexShrink: 1 },
  amount: { color: c.text, fontWeight: "600", fontVariant: ["tabular-nums"] },
  meta: { color: c.textMuted, fontSize: 12 },
  metaOther: { color: c.warningStrong },
}));
