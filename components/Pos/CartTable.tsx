import palette from "@/constants/palette";
import { allowsDecimalQuantity, formatMoney, lineCents, PosLine } from "@/hooks/usePosCart";
import { parseMoney, parseQuantity } from "@/utils/format";
import { centsToAmount } from "@/utils/money";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, type TextInputInstance, View } from "react-native";
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

/**
 * Cantidad capturada ("1.5", "1,5"); vacío o ambiguo ("1,500": ¿1.5 kg o
 * 1500 piezas?) → NaN y se descarta.
 */
const parseNumber = (text: string) => parseQuantity(text) ?? NaN;

/** Precio o descuento capturado en formato mexicano ("1,500" = mil quinientos). */
const parseAmount = (text: string) => parseMoney(text) ?? NaN;

const formatQuantity = (n: number) => String(Math.round(n * 1000) / 1000);

/** Carrito: tabla en escritorio, lista compacta en celular. */
const CartTable = forwardRef<CartTableRef, Props>(function CartTable(props, ref) {
  const { lines, selectedKey, canEditPrice, compact } = props;
  const inputs = useRef<Record<string, TextInputInstance | null>>({});

  useImperativeHandle(ref, () => ({
    focusQuantity: (key) => inputs.current[key]?.focus(),
  }));

  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="barcode-scan" size={48} color={palette.textMuted} />
        <Text style={styles.emptyText}>
          {compact
            ? "Escanea o busca un producto para empezar"
            : "Escanea un producto o presiona F2 para buscar"}
        </Text>
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
          // Redondeado a centavos como el servidor: la suma de renglones es el total cobrado.
          const total = centsToAmount(lineCents(line));
          const qty = (
            <View style={styles.qtyBox}>
              <IconButton icon="minus" size={16} onPress={() => props.onQuantity(line.key, line.quantity - 1)} style={styles.qtyBtn} />
              <QuantityInput
                ref={(r) => { inputs.current[line.key] = r; }}
                value={line.quantity}
                allowDecimal={allowsDecimalQuantity(line.item)}
                onFocus={() => props.onSelect(line.key)}
                onCommit={(quantity) => props.onQuantity(line.key, quantity)}
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

interface QuantityInputProps {
  value: number;
  allowDecimal: boolean;
  onFocus: () => void;
  onCommit: (quantity: number) => void;
}

/**
 * Cantidad editable. Mientras tiene el foco muestra lo que se escribe y
 * aplica cada valor válido al momento; sin foco muestra siempre la cantidad
 * real del carrito. Antes se leía el texto del
 * evento onBlur, que en Android no lo trae: la cantidad tecleada se ignoraba
 * pero seguía viéndose en el campo y se cobraba la anterior.
 */
const QuantityInput = forwardRef<TextInputInstance, QuantityInputProps>(function QuantityInput(
  { value, allowDecimal, onFocus, onCommit },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(formatQuantity(value));
  // Enter seguido del blur que provoca cerrar el teclado: aplicar una vez.
  const committedRef = useRef<string | null>(null);

  const commit = () => {
    if (committedRef.current === text) return;
    committedRef.current = text;
    const parsed = parseNumber(text);
    // Vacío o inválido: se descarta y vuelve a mostrarse la cantidad actual.
    if (!Number.isFinite(parsed) || parsed === value) return;
    onCommit(parsed);
  };

  // Se aplica mientras se escribe: en Android ocultar el teclado o tocar
  // "Cobrar" no quita el foco al campo, así que esperar a Enter o al blur
  // dejaba la cantidad tecleada en pantalla y se cobraba la anterior.
  const handleChange = (next: string) => {
    setText(next);
    const parsed = parseNumber(next);
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== value) {
      committedRef.current = next;
      onCommit(parsed);
    }
  };

  return (
    <TextInput
      ref={ref}
      value={focused ? text : formatQuantity(value)}
      onChangeText={handleChange}
      keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
      returnKeyType="done"
      selectTextOnFocus
      onFocus={() => {
        committedRef.current = null;
        setText(formatQuantity(value));
        setFocused(true);
        onFocus();
      }}
      onSubmitEditing={commit}
      onBlur={() => {
        commit();
        setFocused(false);
      }}
      style={styles.qtyInput}
    />
  );
});

/** Precio/descuento editable (solo escritorio, con permiso sales_discount). */
function MoneyInput({ value, onChange, style }: { value: number; onChange: (v: number) => void; style: any }) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value.toFixed(2));
  const committedRef = useRef<string | null>(null);

  const commit = () => {
    if (committedRef.current === text) return;
    committedRef.current = text;
    const parsed = parseAmount(text);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(0, Math.round(parsed * 100) / 100);
    if (next !== value) onChange(next);
  };

  return (
    <View style={style}>
      <TextInput
        value={focused ? text : value.toFixed(2)}
        onChangeText={setText}
        keyboardType="decimal-pad"
        returnKeyType="done"
        selectTextOnFocus
        onFocus={() => {
          committedRef.current = null;
          setText(value.toFixed(2));
          setFocused(true);
        }}
        onSubmitEditing={commit}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
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
