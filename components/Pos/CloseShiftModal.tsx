import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import Services from "@/utils/services";
import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

interface Props {
  visible: boolean;
  sessionId: number;
  onClose: () => void;
  onClosed: (session: App.Entities.CashRegisterSession) => void;
}

const METHOD_LABELS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

/**
 * Corte del turno: totales por método, efectivo esperado, lo que contó el
 * cajero y la diferencia.
 */
export default function CloseShiftModal({ visible, sessionId, onClose, onClosed }: Props) {
  const [summary, setSummary] = useState<App.Entities.CashRegisterSessionSummary | null>(null);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSummary(null);
    setCounted("");
    setNotes("");
    setError(null);
    Services.cashRegisterSessions
      .show(sessionId)
      .then((res) => setSummary(res.summary))
      .catch(() => setError("No se pudo cargar el resumen del turno"));
  }, [visible, sessionId]);

  // Acepta coma decimal ("1500,50").
  const countedNum = Number(counted.trim().replace(",", "."));
  const difference =
    summary && counted !== "" && Number.isFinite(countedNum)
      ? Math.round((countedNum - summary.expected_cash) * 100) / 100
      : null;

  const submit = async () => {
    if (saving) return;
    if (counted === "" || Number.isNaN(countedNum) || countedNum < 0) {
      setError("Captura el efectivo contado");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await Services.cashRegisterSessions.close(sessionId, { counted_cash: countedNum, notes: notes || undefined });
      onClosed(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo cerrar el turno");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text variant="titleLarge" style={styles.title}>Cerrar turno</Text>
          {!summary && !error ? (
            <ActivityIndicator style={{ margin: 24 }} />
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
                  <View style={styles.divider} />
                  <Row label="Efectivo esperado" value={formatMoney(summary.expected_cash)} strong />

                  <Text style={styles.label}>Efectivo contado</Text>
                  <TextInput
                    value={counted}
                    onChangeText={setCounted}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    style={styles.input}
                    onSubmitEditing={submit}
                  />
                  {difference !== null && (
                    <Row
                      label={difference === 0 ? "Cuadra" : difference > 0 ? "Sobrante" : "Faltante"}
                      value={formatMoney(Math.abs(difference))}
                      color={difference === 0 ? palette.success : palette.error}
                      strong
                    />
                  )}
                  <Text style={styles.label}>Notas</Text>
                  <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, styles.notes]} />
                </>
              )}
            </ScrollView>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onClose} style={{ flex: 1 }} disabled={saving}>Cancelar</Button>
            <Button mode="contained" onPress={submit} style={{ flex: 1 }} loading={saving} disabled={saving || !summary}>
              Cerrar turno
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 440, backgroundColor: palette.surface, borderRadius: 16, padding: 20 },
  title: { fontWeight: "700", marginBottom: 12, color: palette.text },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLabel: { color: palette.textSecondary },
  rowValue: { color: palette.text, fontWeight: "600" },
  strong: { fontWeight: "800", color: palette.text, fontSize: 16 },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 8 },
  label: { color: palette.textSecondary, fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 12, fontSize: 20, marginTop: 6, color: palette.text },
  notes: { fontSize: 15, minHeight: 60 },
  error: { color: palette.error, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
});
