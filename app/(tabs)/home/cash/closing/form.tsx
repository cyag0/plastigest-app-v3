import palette from "@/constants/palette";
import services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Button, Surface, Text } from "react-native-paper";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number | string) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `$${(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const today = () => new Date().toISOString().split("T")[0];

const PAYMENT_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  card:     "Tarjeta",
  transfer: "Transferencia",
  other:    "Otro",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DateStats {
  date: string;
  opening_balance: number;
  date_income: number;
  date_expense: number;
  date_count: number;
  by_payment_method: Record<
    string,
    { total_income: number; total_expense: number }
  >;
  opening_by_method: Record<string, number>;
}

interface FullStats {
  balance_actual: number;
  date_stats: DateStats | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelWrap}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={14}
            color={color ?? palette.textSecondary}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CashClosingForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;

  const [closingDate, setClosingDate] = useState(today());
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [physicalCount, setPhysicalCount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const physicalCountTouchedRef = useRef(isEdit);

  // Load existing record when editing
  useEffect(() => {
    if (!isEdit) return;
    services.cashClosings
      .show(Number(params.id))
      .then((response) => {
        const data = response.data?.data ?? response.data;
        setClosingDate(data.closing_date?.split("T")[0] ?? today());
        setPhysicalCount(data.physical_count?.toString() ?? "");
        setNotes(data.notes ?? "");
        physicalCountTouchedRef.current = true;
      })
      .catch(console.error)
      .finally(() => setLoadingExisting(false));
  }, [isEdit, params.id]);

  // Load stats for the selected date
  const loadStats = useCallback((date: string) => {
    setLoadingStats(true);
    services.cashMovements
      .stats({ date })
      .then((data) => {
        setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    loadStats(closingDate);
  }, [closingDate, loadStats]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const ds = stats?.date_stats;
  // Saldo de apertura real (balance ANTES del día). No usar balance_actual:
  // ese ya incluye los movimientos del día y provocaba doble conteo.
  const openingBalance = ds?.opening_balance ?? 0;
  const dayIncome   = ds?.date_income ?? 0;
  const dayExpense  = ds?.date_expense ?? 0;
  const movCount    = ds?.date_count ?? 0;

  // Saldo de fin de día por método = apertura del método + neto del día.
  // Así la suma de los métodos cuadra con el saldo esperado.
  const byMethod = ds?.by_payment_method ?? {};
  const openingByMethod = ds?.opening_by_method ?? {};
  const methodBalance = (m: string) =>
    (openingByMethod[m] ?? 0) +
    ((byMethod[m]?.total_income ?? 0) - (byMethod[m]?.total_expense ?? 0));

  const totalCash     = methodBalance("cash");
  const totalCard     = methodBalance("card");
  const totalTransfer = methodBalance("transfer");
  const totalOther    = methodBalance("other");

  const activeMethods = (["cash", "card", "transfer", "other"] as const).filter(
    (m) => byMethod[m] || (openingByMethod[m] ?? 0) !== 0
  );

  // El efectivo esperado en caja no puede ser negativo: no sugerir conteos < 0.
  const suggestedPhysicalCount = totalCash >= 0 ? totalCash.toFixed(2) : "";

  const expectedBalance = openingBalance + dayIncome - dayExpense;
  const physCount = physicalCount !== "" ? parseFloat(physicalCount) || 0 : null;
  const difference = physCount !== null ? physCount - totalCash : null;

  useEffect(() => {
    if (isEdit || loadingExisting || physicalCountTouchedRef.current) {
      return;
    }

    setPhysicalCount(suggestedPhysicalCount);
  }, [isEdit, loadingExisting, suggestedPhysicalCount]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        closing_date:    closingDate,
        opening_balance: openingBalance,
        total_income:    dayIncome,
        total_expense:   dayExpense,
        expected_balance: expectedBalance,
        physical_count:  physCount,
        difference:      difference,
        total_cash:      totalCash,
        total_card:      totalCard,
        total_transfer:  totalTransfer,
        total_other:     totalOther,
        movements_count: movCount,
        notes:           notes.trim() || null,
        status:          "closed",
      };

      if (isEdit) {
        await services.cashClosings.update(Number(params.id), payload);
      } else {
        const createdResponse = await services.cashClosings.store(payload);
        const createdEntity = createdResponse.data?.data as
          | { id?: number }
          | undefined;
        const createdId = createdEntity?.id;

        if (createdId) {
          router.replace(`/(tabs)/home/cash/closing/${createdId}` as any);
        }
        return;
      }
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingExisting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── Fecha ─────────────────────────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Fecha de Cierre</Text>
        <TextInput
          style={styles.dateInput}
          value={closingDate}
          onChangeText={setClosingDate}
          onBlur={() => loadStats(closingDate)}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={palette.textSecondary}
        />
      </Surface>

      {/* ─── Estadísticas del día ─────────────────────────────────────── */}
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumen del Día</Text>
          {loadingStats && (
            <ActivityIndicator size="small" color={palette.primary} />
          )}
        </View>

        <StatRow
          label="Saldo inicial (apertura)"
          value={formatCurrency(openingBalance)}
          icon="bank-outline"
        />
        <StatRow
          label="Ingresos del día"
          value={formatCurrency(dayIncome)}
          color={palette.success}
          icon="arrow-down-circle"
        />
        <StatRow
          label="Egresos del día"
          value={formatCurrency(dayExpense)}
          color={palette.error}
          icon="arrow-up-circle"
        />
        <View style={styles.divider} />
        <StatRow
          label="Saldo esperado"
          value={formatCurrency(expectedBalance)}
          color={expectedBalance >= 0 ? palette.success : palette.error}
          icon="calculator"
        />
        <StatRow
          label="Movimientos"
          value={`${movCount}`}
          icon="swap-horizontal"
        />
      </Surface>

      {/* ─── Saldo por método de pago ────────────────────────────────── */}
      {activeMethods.length > 0 && (
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Saldo por Método de Pago</Text>
          {activeMethods.map((m) => {
            const bal = methodBalance(m);
            return (
              <StatRow
                key={m}
                label={PAYMENT_LABELS[m]}
                value={formatCurrency(bal)}
                color={bal >= 0 ? palette.success : palette.error}
              />
            );
          })}
        </Surface>
      )}

      {/* ─── Conteo físico (efectivo) ─────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Conteo Físico (Efectivo)</Text>
        <Text style={styles.fieldHint}>
          Ingrese el total de efectivo contado físicamente en caja.
        </Text>
        <TextInput
          style={styles.amountInput}
          value={physicalCount}
          onChangeText={(value) => {
            physicalCountTouchedRef.current = true;
            setPhysicalCount(value);
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={palette.textSecondary}
        />
        {physCount !== null && (
          <>
            <View style={styles.divider} />
            <StatRow
              label="Efectivo esperado"
              value={formatCurrency(totalCash)}
              icon="cash"
            />
            <StatRow
              label="Efectivo contado"
              value={formatCurrency(physCount)}
              icon="hand-coin"
            />
            <StatRow
              label="Diferencia"
              value={`${difference! >= 0 ? "+" : ""}${formatCurrency(difference!)}`}
              color={
                difference === 0
                  ? palette.success
                  : difference! > 0
                  ? palette.blue
                  : palette.error
              }
              icon="scale-balance"
            />
          </>
        )}
      </Surface>

      {/* ─── Notas ───────────────────────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Observaciones opcionales..."
          placeholderTextColor={palette.textSecondary}
        />
      </Surface>

      {/* ─── Botón guardar ───────────────────────────────────────────── */}
      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving || loadingStats}
        style={styles.saveButton}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEdit ? "Actualizar Cierre" : "Guardar Cierre"}
      </Button>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "transparent" as any },
  container: { padding: 16, gap: 12, paddingBottom: 32, maxWidth: 600, width: "100%", alignSelf: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: palette.surface,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  statLabelWrap: { flexDirection: "row", alignItems: "center" },
  statLabel: { fontSize: 13, color: palette.textSecondary },
  statValue: { fontSize: 13, fontWeight: "600", color: palette.text },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: palette.text,
    backgroundColor: "transparent" as any,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: palette.text,
    backgroundColor: "transparent" as any,
    fontWeight: "700",
    textAlign: "right",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: palette.text,
    backgroundColor: "transparent" as any,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
  },
});
