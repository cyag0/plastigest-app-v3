import { formatDateTime } from "@/utils/dates";
import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import CloseShiftModal from "@/components/Pos/CloseShiftModal";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { formatMoney } from "@/hooks/usePosCart";
import { printShiftTicket } from "@/utils/printDocument";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";

const METHOD_LABELS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

/** Detalle y corte de un turno. Un supervisor puede cerrar el que quedó abierto. */
export default function CashSessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alerts = useAlerts();
  const { user } = useAuth();
  const { can } = useCan();
  const [session, setSession] = useState<App.Entities.CashRegisterSession | null>(null);
  const [summary, setSummary] = useState<App.Entities.CashRegisterSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  // No se pudo cargar. El turno de otro cajero (sin
  // cash_register_sessions_read) o de otra sucursal: el backend responde 404
  // «Turno no encontrado.»; antes el spinner seguía sin fin.
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProblem(null);
      // show va con silent: el error se explica aquí.
      const res = await Services.cashRegisterSessions.show(Number(id));
      setSession(res.data);
      setSummary(res.summary);
    } catch (e: any) {
      setProblem(recordLoadProblem(e, "No se pudo cargar el turno. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (problem && !loading) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No encontramos este turno"
        notFoundDescription={
          can("cash_register_sessions_read")
            ? "Puede que no exista o que sea de otra sucursal."
            : "Puede que no exista o que sea de otro cajero: solo puedes ver tus propios turnos."
        }
        errorTitle="No se pudo cargar el turno"
        onRetry={load}
      />
    );
  }

  if (loading || !session) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const isOpen = session.status === "open";
  // Como el backend: el propio con sales_pos; el de otro cajero, con cash_registers_update.
  const canClose =
    isOpen && ((session.user_id === user?.id && can("sales_pos")) || can("cash_registers_update"));
  const diff = session.difference;
  const diffColor = diff == null || diff === 0 ? palette.success : diff > 0 ? palette.blue : palette.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleMedium" style={styles.title}>
          {session.cash_register_name} · {isOpen ? "Turno abierto" : "Turno cerrado"}
        </Text>
        <Row label="Sucursal" value={session.location_name ?? "—"} />
        <Row label="Cajero" value={session.user_name ?? "—"} />
        <Row label="Apertura" value={formatDateTime(session.opened_at)} />
        {!isOpen && <Row label="Cierre" value={formatDateTime(session.closed_at)} />}
        {!isOpen && session.closed_by_name && <Row label="Cerró" value={session.closed_by_name} />}
      </Surface>

      {summary && (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.title}>Corte</Text>
          <Row label="Ventas" value={`${summary.sales_count} · ${formatMoney(summary.sales_total)}`} />
          {summary.cancelled_count > 0 && <Row label="Canceladas" value={String(summary.cancelled_count)} />}
          <Row label="Fondo inicial" value={formatMoney(summary.opening_amount)} />
          {Object.entries(summary.by_method).map(([method, t]) => (
            <Row
              key={method}
              label={METHOD_LABELS[method] ?? method}
              value={t.expense > 0 ? `${formatMoney(t.income)} − ${formatMoney(t.expense)} = ${formatMoney(t.net)}` : formatMoney(t.net)}
            />
          ))}
          <View style={styles.divider} />
          <Row label="Efectivo esperado" value={formatMoney(summary.expected_cash)} strong />
          {!isOpen && (
            <>
              <Row label="Efectivo contado" value={formatMoney(session.counted_cash ?? 0)} strong />
              <Row
                label={diff === 0 ? "Cuadra" : (diff ?? 0) > 0 ? "Sobrante" : "Faltante"}
                value={formatMoney(Math.abs(diff ?? 0))}
                strong
                color={diffColor}
              />
            </>
          )}
          {session.notes ? <Text style={styles.notes}>{session.notes}</Text> : null}
        </Surface>
      )}

      <Button
        mode="outlined"
        icon="printer"
        onPress={() => printShiftTicket(session.id).catch(() => alerts.error("No se pudo imprimir el corte"))}
        style={{ borderRadius: 10 }}
      >
        {isOpen ? "Imprimir corte parcial" : "Imprimir corte"}
      </Button>

      {canClose && (
        <Button mode="contained" icon="lock" onPress={() => setClosing(true)} style={{ borderRadius: 10 }}>
          Cerrar turno
        </Button>
      )}

      <CloseShiftModal
        visible={closing}
        sessionId={session.id}
        onClose={() => setClosing(false)}
        onClosed={() => {
          setClosing(false);
          alerts.success("Turno cerrado");
          load();
        }}
      />
    </ScrollView>
  );
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, maxWidth: 720, width: "100%", alignSelf: "center" },
  card: { padding: 16, borderRadius: 12, backgroundColor: palette.surface, gap: 2 },
  title: { fontWeight: "700", marginBottom: 8, color: palette.text },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, gap: 12 },
  label: { color: palette.textSecondary },
  value: { color: palette.text, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  strong: { fontWeight: "800", color: palette.text },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 8 },
  notes: { marginTop: 8, color: palette.textSecondary, fontStyle: "italic" },
});
