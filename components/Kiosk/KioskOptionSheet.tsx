/**
 * Hoja "¿Cómo lo quieres?" para productos con paquetes: una fila por opción
 * ("Por litro · $65.00", "Paquete 12 · $700.00") con su selector − cantidad +.
 * Las opciones sin existencia (o sin la suficiente para un paquete completo)
 * salen desactivadas con "Agotado".
 *
 * Se edita un borrador y se aplica al pedido con "Agregar" (o "Listo" si el
 * producto ya estaba en el pedido).
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { KioskProduct } from "@/utils/services/kiosk";
import { lineTotalCents, sumCents } from "@/utils/money";
import React, { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { KioskSheet } from "./KioskOverlay";
import KioskQuantityStepper from "./KioskQuantityStepper";
import { formatCents, maxForOption, optionTestId, productOptions } from "./model";

interface Props {
  product: KioskProduct;
  /** Lo que ya lleva en el pedido, por llave de opción. */
  initial: Record<string, number>;
  onConfirm: (quantities: Record<string, number>) => void;
  onClose: () => void;
}

export default function KioskOptionSheet({ product, initial, onConfirm, onClose }: Props) {
  const styles = useThemedStyles((c) => ({
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text },
    subtitle: { fontSize: 18, color: c.textSecondary, marginTop: 4 },
    group: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      backgroundColor: c.surface,
      overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 16 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
    rowSoldOut: { opacity: 0.55 },
    body: { flex: 1, minWidth: 0, gap: 2 },
    label: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: c.text },
    detail: { fontSize: 16, lineHeight: 22, color: c.textSecondary },
    limit: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: c.warning },
    soldOut: { fontSize: 18, color: c.textSecondary, paddingHorizontal: 8 },
    footer: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
    subtotal: { flex: 1, minWidth: 160, fontSize: 18, color: c.textSecondary },
    subtotalValue: { fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
    actions: { flexDirection: "row", gap: 12 },
  }));

  const options = useMemo(() => productOptions(product), [product]);
  const [draft, setDraft] = useState<Record<string, number>>(() => ({ ...initial }));
  const draftRef = useRef(draft);
  const [limit, setLimit] = useState<{ key: string; max: number } | null>(null);

  const inCart = Object.values(initial).some((q) => q > 0);
  const draftCount = options.reduce((sum, option) => sum + (draft[option.key] ?? 0), 0);
  const draftCents = sumCents(
    options.map((option) => lineTotalCents(draft[option.key] ?? 0, option.priceCents / 100)),
  );

  const change = (key: string, delta: number) => {
    const option = options.find((o) => o.key === key);
    if (!option) return;
    // Del borrador ya actualizado: dos toques seguidos suman dos.
    const prev = draftRef.current;
    const next = Math.max(0, (prev[key] ?? 0) + delta);
    if (delta > 0) {
      const max = maxForOption(product, option, prev, options);
      if (next > max) {
        setLimit({ key, max });
        return;
      }
    }
    setLimit(null);
    const updated = { ...prev, [key]: next };
    draftRef.current = updated;
    setDraft(updated);
  };

  return (
    <KioskSheet
      visible
      onDismiss={onClose}
      testID="kiosk-option-sheet"
      accessibilityLabel={`Opciones de ${product.name}`}
    >
      <View>
        <Text style={styles.title} accessibilityRole="header">
          {product.name}
        </Text>
        <Text style={styles.subtitle}>¿Cómo lo quieres?</Text>
      </View>

      <View style={styles.group}>
        {options.map((option, index) => {
          const soldOut = option.stock < 1;
          const testKey = optionTestId(option);
          return (
            <React.Fragment key={option.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={[styles.row, soldOut && styles.rowSoldOut]} testID={`kiosk-option-${testKey}`}>
                <View style={styles.body}>
                  <Text style={styles.label}>
                    {option.label} · {formatCents(option.priceCents)}
                  </Text>
                  {option.detail ? <Text style={styles.detail}>{option.detail}</Text> : null}
                  {limit?.key === option.key ? (
                    <Text style={styles.limit} accessibilityLiveRegion="polite">
                      {limit.max > 0 ? `Solo quedan ${limit.max}` : "Ya no quedan más"}
                    </Text>
                  ) : null}
                </View>
                {soldOut ? (
                  <Text style={styles.soldOut}>Agotado</Text>
                ) : (
                  <KioskQuantityStepper
                    value={draft[option.key] ?? 0}
                    name={`${product.name}, ${option.label}`}
                    onIncrement={() => change(option.key, 1)}
                    onDecrement={() => change(option.key, -1)}
                    testIDPrefix="kiosk-option-qty"
                    testIDKey={testKey}
                  />
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.subtotal}>
          {draftCount > 0 ? (
            <>
              Suman <Text style={styles.subtotalValue}>{formatCents(draftCents)}</Text>
            </>
          ) : (
            "Elige cuántos quieres"
          )}
        </Text>
        <View style={styles.actions}>
          <KioskButton label="Cancelar" variant="secondary" onPress={onClose} testID="kiosk-option-cancel" />
          <KioskButton
            label={inCart ? "Listo" : "Agregar"}
            icon={inCart ? "check" : "plus"}
            onPress={() => onConfirm(draftRef.current)}
            disabled={!inCart && draftCount === 0}
            testID="kiosk-option-confirm"
          />
        </View>
      </View>
    </KioskSheet>
  );
}
