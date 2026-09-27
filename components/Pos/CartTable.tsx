import palette from "@/constants/palette";
import { formatMoney, PosLine } from "@/hooks/usePosCart";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

interface Props {
  lines: PosLine[];
  selectedKey: string | null;
  canEditPrice: boolean;
  compact?: boolean;
  onSelect: (key: string) => void;
  onQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onPrice: (key: string, changes: { unitPrice?: number; discount?: number }) => void;
}

export interface CartTableRef {
  /** F4: enfoca la cantidad del renglón seleccionado. */
  focusQuantity: (key: string) => void;
}

/** Carrito: tabla en escritorio, lista compacta en celular. */
const CartTable = forwardRef<CartTableRef, Props>(function CartTable(props, ref) {
  const { lines, selectedKey, canEditPrice, compact } = props;
  const inputs = useRef<Record<string, TextInput | null>>({});

  useImperativeHandle(ref, () => ({
    focusQuantity: (key) => inputs.current[key]?.focus(),
  }));

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="barcode-scan" size={48} color={palette.textMuted} />
        <Text style={styles.emptyText}>Escanea un producto o presiona F2 para buscar</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!compact && (
        <View style={[styles.row, styles.head]}>
          <Text style={[styles.th, styles.colName]}>PRODUCTO</Text>
          <Text style={[styles.th, styles.colQty]}>CANT.</Text>
          <Text style={[styles.th, styles.colPrice]}>PRECIO</Text>
          {canEditPrice && <Text style={[styles.th, styles.colPrice]}>DESC.</Text>}
          <Text style={[styles.th, styles.colTotal]}>TOTAL</Text>
          <View style={styles.colActions} />
        </View>
      )}
      <FlatList
        data={lines}
        keyExtractor={(l) => l.key}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: line }) => {
          const selected = line.key === selectedKey;
          const total = line.quantity * line.unitPrice - line.discount;
          const qty = (
            <View style={styles.qtyBox}>
              <IconButton icon="minus" size={16} onPress={() => props.onQuantity(line.key, line.quantity - 1)} style={styles.qtyBtn} />
              <TextInput
                ref={(r) => { inputs.current[line.key] = r; }}
                defaultValue={String(line.quantity)}
                key={`${line.key}-${line.quantity}`}
                keyboardType="decimal-pad"
                selectTextOnFocus
                onFocus={() => props.onSelect(line.key)}
                onSubmitEditing={(e) => props.onQuantity(line.key, Number(e.nativeEvent.text) || 0)}
                onBlur={(e: any) => {
                  const v = Number(e?.nativeEvent?.text ?? e?.target?.value);
                  if (!Number.isNaN(v) && v !== line.quantity) props.onQuantity(line.key, v);
                }}
                style={styles.qtyInput}
              />
              <IconButton icon="plus" size={16} onPress={() => props.onQuantity(line.key, line.quantity + 1)} style={styles.qtyBtn} />
            </View>
          );

          if (compact) {
            return (
              <Pressable onPress={() => props.onSelect(line.key)} style={[styles.card, selected && styles.selected]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{line.item.name}</Text>
                  <Text style={styles.meta}>{formatMoney(line.unitPrice)} c/u</Text>
                </View>
                {qty}
                <Text style={styles.total}>{formatMoney(total)}</Text>
                <IconButton icon="trash-can-outline" size={18} iconColor={palette.error} onPress={() => props.onRemove(line.key)} />
              </Pressable>
            );
          }

          return (
            <Pressable onPress={() => props.onSelect(line.key)} style={[styles.row, selected && styles.selected]}>
              <View style={styles.colName}>
                <Text style={styles.name} numberOfLines={1}>{line.item.name}</Text>
                <Text style={styles.meta}>{line.item.code}</Text>
              </View>
              <View style={styles.colQty}>{qty}</View>
              {canEditPrice ? (
                <>
                  <MoneyInput style={styles.colPrice} value={line.unitPrice} onChange={(v) => props.onPrice(line.key, { unitPrice: v })} />
                  <MoneyInput style={styles.colPrice} value={line.discount} onChange={(v) => props.onPrice(line.key, { discount: v })} />
                </>
              ) : (
                <Text style={[styles.cell, styles.colPrice]}>{formatMoney(line.unitPrice)}</Text>
              )}
              <Text style={[styles.cell, styles.colTotal, styles.total]}>{formatMoney(total)}</Text>
              <View style={styles.colActions}>
                <IconButton icon="trash-can-outline" size={18} iconColor={palette.error} onPress={() => props.onRemove(line.key)} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
});

function MoneyInput({ value, onChange, style }: { value: number; onChange: (v: number) => void; style: any }) {
  return (
    <View style={style}>
      <TextInput
        defaultValue={value.toFixed(2)}
        key={value.toFixed(2)}
        keyboardType="decimal-pad"
        selectTextOnFocus
        onSubmitEditing={(e) => onChange(Math.max(0, Number(e.nativeEvent.text) || 0))}
        onBlur={(e: any) => onChange(Math.max(0, Number(e?.nativeEvent?.text ?? e?.target?.value) || 0))}
        style={styles.moneyInput}
      />
    </View>
  );
}

export default CartTable;

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  emptyText: { color: palette.textSecondary, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 54, borderBottomWidth: 1, borderBottomColor: palette.border },
  head: { minHeight: 36, backgroundColor: palette.surfaceMuted },
  th: { fontSize: 12, fontWeight: "700", color: palette.textSecondary },
  cell: { fontSize: 15, color: palette.text },
  colName: { flex: 1, paddingRight: 8 },
  colQty: { width: 140, alignItems: "center" },
  colPrice: { width: 100, textAlign: "right" as const, alignItems: "flex-end" },
  colTotal: { width: 110, textAlign: "right" as const },
  colActions: { width: 44, alignItems: "flex-end" },
  selected: { backgroundColor: palette.primarySoft },
  name: { fontSize: 15, color: palette.text },
  meta: { fontSize: 12, color: palette.textSecondary },
  total: { fontWeight: "700", color: palette.text },
  qtyBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: palette.border, borderRadius: 8 },
  qtyBtn: { margin: 0 },
  qtyInput: { width: 44, textAlign: "center", fontSize: 15, paddingVertical: 4, color: palette.text },
  moneyInput: { width: 84, textAlign: "right", borderWidth: 1, borderColor: palette.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6, color: palette.text },
  card: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
});
