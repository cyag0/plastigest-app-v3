import ShiftCashMovements from "@/components/Cash/ShiftCashMovements";
import AmountPreview from "@/components/Pos/AmountPreview";
import { apiErrorMessage } from "@/components/Pos/saleErrors";
import { useTheme } from "@/contexts/ThemeContext";
import { formatMoney } from "@/hooks/usePosCart";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { parseMoney } from "@/utils/format";
import { amountToCents, centsToAmount } from "@/utils/money";
import Services from "@/utils/services";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, TextInput, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

interface Props {
  visible: boolean;
  sessionId: number;
  /** El cajero del turno: lo que otro sacó o metió a la caja se resalta. */
  cashierId?: number;
  onClose: () => void;
  onClosed: (session: App.Entities.CashRegisterSession) => void;
}

const METHOD_LABELS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

/**
 * Corte del turno: totales por método, efectivo esperado, lo que contó el
 * cajero y la diferencia.
 *
 * El efectivo contado se lee en formato mexicano ("1,500" son mil
 * quinientos; antes se leía 1.5 y el turno cerraba con un faltante falso) y
 * se muestra cómo se leyó. Un turno cerrado no se puede corregir, así que con
 * diferencia se pide confirmar antes de cerrar (Enter ya no lo cierra solo).
 */
export default function CloseShiftModal({ visible, sessionId, cashierId, onClose, onClosed }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [summary, setSummary] = useState<App.Entities.CashRegisterSessionSummary | null>(null);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { submitting: saving, run } = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSummary(null);
    setCounted("");
    setNotes("");
    setConfirming(false);
    setError(null);
    Services.cashRegisterSessions
      .show(sessionId)
      .then((res) => setSummary(res.summary))
      .catch(() => setError("No se pudo cargar el resumen del turno"));
  }, [visible, sessionId]);

  const countedNum = counted.trim() === "" ? null : parseMoney(counted);
  const countedValid = countedNum !== null && countedNum >= 0;
  const differenceCents =
    summary && countedValid ? amountToCents(countedNum) - amountToCents(summary.expected_cash) : null;
  const difference = differenceCents === null ? null : centsToAmount(differenceCents);

  const close = () =>
    run(async () => {
      if (!countedValid) return;
      try {
        setError(null);
        const res = await Services.cashRegisterSessions.close(sessionId, { counted_cash: countedNum, notes: notes || undefined });
        onClosed(res.data);
      } catch (e: any) {
        setConfirming(false);
        setError(apiErrorMessage(e, "No se pudo cerrar el turno"));
      }
    });

  const submit = () => {
    if (saving || !summary) return;
    if (!countedValid) {
      setError(counted.trim() === "" ? "Captura el efectivo contado" : "El efectivo contado no es un monto válido");
      return;
    }
    setError(null);
    // Con diferencia se confirma antes: el corte cerrado ya no se corrige.
    if (difference !== 0) {
      setConfirming(true);
      return;
    }
    close();
  };

  // Mientras se cierra no se puede salir (Esc, botón atrás).
  const requestClose = () => {
    if (saving) return;
    if (confirming) {
      setConfirming(false);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text variant="titleLarge" style={styles.title}>Cerrar turno</Text>
          {!summary && !error ? (
            <ActivityIndicator style={{ margin: 24 }} />
          ) : confirming && summary && countedValid && difference !== null ? (
            <View>
              <Row label="Efectivo esperado" value={formatMoney(summary.expected_cash)} />
              <Row label="Efectivo contado" value={formatMoney(countedNum)} strong />
              <Row
                label={difference > 0 ? "Sobrante" : "Faltante"}
                value={formatMoney(Math.abs(difference))}
                color={colors.error}
                strong
              />
              <Text style={styles.confirmText}>
                El turno se cerrará con {difference > 0 ? "un sobrante" : "un faltante"} de {formatMoney(Math.abs(difference))}. Un
                turno cerrado ya no se puede corregir: si el conteo está mal, vuelve a contar.
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              {summary && (
                <>
                  <Row label="Ventas" value={`${summary.sales_count} · ${formatMoney(summary.sales_total)}`} />
                  {summary.cancelled_count > 0 && <Row label="Canceladas" value={String(summary.cancelled_count)} />}
                  <Row label="Fondo inicial" value={formatMoney(summary.opening_amount)} />
                  {Object.entries(summary.by_method).map(([method, t]) => (
                    <Row key={method} label={METHOD_LABELS[method] ?? method} value={formatMoney(t.net)} />
                  ))}
                  <ShiftCashMovements movements={summary.cash_movements} cashierId={cashierId} />
                  <View style={styles.divider} />
                  <Row label="Efectivo esperado" value={formatMoney(summary.expected_cash)} strong />

                  <Text style={styles.label}>Efectivo contado</Text>
                  <TextInput
                    value={counted}
                    onChangeText={(t) => {
                      setCounted(t);
                      if (error) setError(null);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    editable={!saving}
                    style={styles.input}
                    onSubmitEditing={submit}
                  />
                  <AmountPreview value={counted} label="Contado" />
                  {difference !== null && (
                    <Row
                      label={difference === 0 ? "Cuadra" : difference > 0 ? "Sobrante" : "Faltante"}
                      value={formatMoney(Math.abs(difference))}
                      color={difference === 0 ? colors.success : colors.error}
                      strong
                    />
                  )}
                  <Text style={styles.label}>Notas</Text>
                  <TextInput value={notes} onChangeText={setNotes} multiline editable={!saving} style={[styles.input, styles.notes]} />
                </>
              )}
            </ScrollView>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            {confirming ? (
              <>
                <Button mode="outlined" onPress={() => setConfirming(false)} style={{ flex: 1 }} disabled={saving}>
                  Corregir
                </Button>
                <Button mode="contained" onPress={close} style={{ flex: 1 }} loading={saving} disabled={saving}>
                  Cerrar así
                </Button>
              </>
            ) : (
              <>
                <Button mode="outlined" onPress={requestClose} style={{ flex: 1 }} disabled={saving}>Cancelar</Button>
                <Button mode="contained" onPress={submit} style={{ flex: 1 }} loading={saving} disabled={saving || !summary}>
                  Cerrar turno
                </Button>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 440, backgroundColor: c.surface, borderRadius: 16, padding: 20 },
  title: { fontWeight: "700", marginBottom: 12, color: c.text },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: c.textSecondary },
  rowValue: { color: c.text, fontWeight: "600" },
  strong: { fontWeight: "800", color: c.text, fontSize: 16 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 8 },
  label: { color: c.textSecondary, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, fontSize: 20, marginTop: 6, color: c.text },
  notes: { fontSize: 15, minHeight: 60 },
  confirmText: { color: c.text, marginTop: 12, lineHeight: 20 },
  error: { color: c.error, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
}));
