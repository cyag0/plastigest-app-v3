import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import { printSaleTicket } from "@/utils/printDocument";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button, Text } from "react-native-paper";

export type CheckoutMethod = "cash" | "card" | "mixed";
type Payment = App.Entities.PosSalePayload["payments"][number];

interface Props {
  visible: boolean;
  total: number;
  initialMethod: CheckoutMethod;
  onClose: () => void;
  onSubmit: (payments: Payment[]) => Promise<App.Entities.PosSaleResult>;
  /** Tras "Nueva venta": limpiar carrito y volver a buscar. */
  onDone: () => void;
}

const METHODS: { key: CheckoutMethod; label: string; icon: string }[] = [
  { key: "cash", label: "Efectivo", icon: "cash" },
  { key: "card", label: "Tarjeta", icon: "credit-card-outline" },
  { key: "mixed", label: "Mixto", icon: "swap-horizontal" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Monto capturado: acepta coma o punto decimal y separadores de miles. */
const parseAmount = (text: string) => {
  const raw = text.trim().replace(/\s/g, "");
  // "1,234.50" → miles con coma; "12,5" → decimal con coma.
  const normalized = /,\d{1,2}$/.test(raw) && !raw.includes(".")
    ? raw.replace(",", ".")
    : raw.replace(/,/g, "");
  return Number(normalized);
};

/**
 * Cobro: efectivo (recibido → cambio), tarjeta o mixto (parte en efectivo,
 * el resto con tarjeta). Al terminar muestra el cambio en grande.
 */
export default function CheckoutModal({ visible, total, initialMethod, onClose, onSubmit, onDone }: Props) {
  const [method, setMethod] = useState<CheckoutMethod>(initialMethod);
  const [received, setReceived] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<App.Entities.PosSaleResult | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMethod(initialMethod);
      setReceived("");
      setMixedCash("");
      setError(null);
      setResult(null);
      setPrintError(null);
    }
  }, [visible, initialMethod]);

  const printTicket = async () => {
    if (!result || printing) return;
    try {
      setPrinting(true);
      setPrintError(null);
      await printSaleTicket(result.id, result.sale_number);
    } catch (e: any) {
      setPrintError(e?.response?.data?.message || "No se pudo imprimir el ticket");
    } finally {
      setPrinting(false);
    }
  };

  const tendered = received === "" ? total : parseAmount(received) || 0;
  const change = round2(tendered - total);
  const cashPart = round2(parseAmount(mixedCash) || 0);
  const cardPart = round2(total - cashPart);

  const payments: Payment[] | null = (() => {
    if (method === "cash") return tendered >= total ? [{ method: "cash", amount: total, tendered }] : null;
    if (method === "card") return [{ method: "card", amount: total }];
    if (cashPart > 0 && cashPart < total) {
      return [
        { method: "cash", amount: cashPart, tendered: cashPart },
        { method: "card", amount: cardPart },
      ];
    }
    return null;
  })();

  // Guardia síncrona: Enter + clic (o dos Enter) en el mismo instante no
  // deben registrar dos ventas antes de que `saving` llegue al render.
  const submittingRef = useRef(false);

  const confirm = async () => {
    if (!payments || saving || submittingRef.current) return;
    submittingRef.current = true;
    try {
      setSaving(true);
      setError(null);
      setResult(await onSubmit(payments));
    } catch (e: any) {
      const data = e?.response?.data;
      const timedOut = e?.code === "ECONNABORTED" || /timeout/i.test(e?.message ?? "");
      setError(
        (data?.errors && (Object.values(data.errors).flat()[0] as string)) ||
          data?.message ||
          (timedOut
            ? "El servidor tardó en responder. Revisa en Ventas si la venta quedó registrada antes de cobrar de nuevo."
            : "No se pudo registrar la venta"),
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const finish = () => {
    setResult(null);
    onDone();
  };

  // En web, en la pantalla de "Venta registrada": Enter empieza la
  // siguiente y P imprime el ticket.
  useEffect(() => {
    if (!result || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        printTicket();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={result ? finish : onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {result ? (
            <View style={styles.done}>
              <MaterialCommunityIcons name="check-circle" size={56} color={palette.success} />
              <Text variant="titleLarge" style={styles.doneTitle}>Venta registrada</Text>
              <Text style={styles.doneMeta}>{result.sale_number} · {formatMoney(result.total)}</Text>
              {result.change > 0 && (
                <View style={styles.changeBox}>
                  <Text style={styles.changeLabel}>Cambio</Text>
                  <Text style={styles.changeValue}>{formatMoney(result.change)}</Text>
                </View>
              )}
              <Button
                mode="outlined"
                icon="printer"
                onPress={printTicket}
                loading={printing}
                disabled={printing}
                style={styles.printButton}
                contentStyle={{ height: 44 }}
              >
                {Platform.OS === "web" ? "Imprimir ticket (P)" : "Imprimir ticket"}
              </Button>
              {!!printError && <Text style={styles.printError}>{printError}</Text>}
              <Button mode="contained" icon="cart-plus" onPress={finish} style={styles.primary} contentStyle={{ height: 52 }}>
                Nueva venta (Enter)
              </Button>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.totalLabel}>Total a cobrar</Text>
                <Text style={styles.total}>{formatMoney(total)}</Text>
              </View>

              <View style={styles.methods}>
                {METHODS.map((m) => (
                  <Pressable key={m.key} onPress={() => setMethod(m.key)} style={[styles.method, method === m.key && styles.methodActive]}>
                    <MaterialCommunityIcons name={m.icon as any} size={22} color={method === m.key ? palette.primary : palette.textSecondary} />
                    <Text style={[styles.methodText, method === m.key && { color: palette.primary }]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              {method === "cash" && (
                <>
                  <Text style={styles.label}>Recibido</Text>
                  <TextInput
                    value={received}
                    onChangeText={setReceived}
                    placeholder={total.toFixed(2)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    onSubmitEditing={confirm}
                    style={styles.input}
                  />
                  <View style={styles.row}>
                    <Text style={styles.label}>Cambio</Text>
                    <Text style={[styles.change, change < 0 && { color: palette.error }]}>
                      {change < 0 ? `Faltan ${formatMoney(-change)}` : formatMoney(change)}
                    </Text>
                  </View>
                </>
              )}

              {method === "card" && <Text style={styles.hint}>Cobra {formatMoney(total)} en la terminal y confirma.</Text>}

              {method === "mixed" && (
                <>
                  <Text style={styles.label}>Parte en efectivo</Text>
                  <TextInput
                    value={mixedCash}
                    onChangeText={setMixedCash}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    onSubmitEditing={confirm}
                    style={styles.input}
                  />
                  <View style={styles.row}>
                    <Text style={styles.label}>Con tarjeta</Text>
                    <Text style={styles.change}>{cashPart > 0 && cashPart < total ? formatMoney(cardPart) : "—"}</Text>
                  </View>
                </>
              )}

              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                {/* "Cancelar (Esc)" no cabía y se cortaba; el atajo ya está en la barra de atajos. */}
                <Button mode="outlined" onPress={onClose} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button mode="contained" icon="check" onPress={confirm} loading={saving} disabled={!payments || saving} style={{ flex: 2 }} contentStyle={{ height: 48 }}>
                  Cobrar {formatMoney(total)}
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 460, backgroundColor: palette.surface, borderRadius: 16, padding: 20 },
  header: { alignItems: "center", marginBottom: 12 },
  totalLabel: { color: palette.textSecondary },
  total: { fontSize: 36, fontWeight: "800", color: palette.text },
  methods: { flexDirection: "row", gap: 8, marginBottom: 12 },
  method: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: palette.border, gap: 4 },
  methodActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  methodText: { fontWeight: "600", color: palette.textSecondary },
  label: { color: palette.textSecondary, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 12, fontSize: 24, marginTop: 6, color: palette.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  change: { fontSize: 24, fontWeight: "700", color: palette.success },
  hint: { color: palette.textSecondary, textAlign: "center", marginVertical: 16 },
  error: { color: palette.error, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 18 },
  primary: { marginTop: 18, borderRadius: 10, alignSelf: "stretch" },
  done: { alignItems: "center", paddingVertical: 8 },
  doneTitle: { fontWeight: "700", marginTop: 8, color: palette.text },
  doneMeta: { color: palette.textSecondary },
  printButton: { alignSelf: "stretch", marginTop: 16 },
  printError: { color: palette.error, marginTop: 6, textAlign: "center" },
  changeBox: { alignItems: "center", marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: palette.successSoft, alignSelf: "stretch" },
  changeLabel: { color: palette.textSecondary },
  changeValue: { fontSize: 42, fontWeight: "800", color: palette.success },
});
