import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Surface, Text } from "react-native-paper";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number | string | null | undefined) => {
  const n =
    value == null
      ? 0
      : typeof value === "string"
      ? parseFloat(value)
      : value;
  return `$${(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "—";
  const [y, m, d] = (dateStr.split("T")[0] ?? dateStr).split("-");
  return `${d}/${m}/${y}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({
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
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={14}
            color={color ?? palette.textSecondary}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CashClosingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Services.cashClosings
      .show(Number(id))
      .then((response) => setItem(response.data?.data ?? response.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: palette.textSecondary }}>
          No se encontró el cierre.
        </Text>
      </View>
    );
  }

  const diff = parseFloat(item.difference ?? "0");
  const diffColor =
    diff === 0 ? palette.success : diff > 0 ? palette.blue : palette.red;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {/* ─── Header card ──────────────────────────────────────────────── */}
      <Surface style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerDate}>{formatDate(item.closing_date)}</Text>
            <Text style={styles.headerLocation}>
              {item.location?.name ?? "—"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Chip
              compact
              style={{ backgroundColor: `${palette.primary}20` }}
              textStyle={{ color: palette.primary, fontSize: 12 }}
            >
              {item.status ?? "closed"}
            </Chip>
          </View>
        </View>

        <View style={styles.balanceBig}>
          <Text style={styles.balanceBigLabel}>Saldo esperado</Text>
          <Text
            style={[
              styles.balanceBigValue,
              {
                color:
                  parseFloat(item.expected_balance) >= 0
                    ? palette.success
                    : palette.red,
              },
            ]}
          >
            {formatCurrency(item.expected_balance)}
          </Text>
        </View>

        {item.difference != null && (
          <View style={styles.diffChipWrap}>
            <Chip
              compact
              style={{ backgroundColor: `${diffColor}20` }}
              textStyle={{ color: diffColor, fontSize: 13 }}
            >
              Diferencia: {diff >= 0 ? "+" : ""}
              {formatCurrency(diff)}
            </Chip>
          </View>
        )}
      </Surface>

      {/* ─── Resumen ──────────────────────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen del Día</Text>
        <InfoRow
          label="Saldo inicial"
          value={formatCurrency(item.opening_balance)}
          icon="bank-outline"
        />
        <InfoRow
          label="Ingresos"
          value={formatCurrency(item.total_income)}
          color={palette.success}
          icon="arrow-down-circle"
        />
        <InfoRow
          label="Egresos"
          value={formatCurrency(item.total_expense)}
          color={palette.red}
          icon="arrow-up-circle"
        />
        <View style={styles.divider} />
        <InfoRow
          label="Saldo esperado"
          value={formatCurrency(item.expected_balance)}
          color={
            parseFloat(item.expected_balance) >= 0
              ? palette.success
              : palette.red
          }
          icon="calculator"
        />
        <InfoRow
          label="Movimientos"
          value={`${item.movements_count ?? 0}`}
          icon="swap-horizontal"
        />
      </Surface>

      {/* ─── Desglose por método ─────────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Por Método de Pago</Text>
        <InfoRow
          label="Efectivo"
          value={formatCurrency(item.total_cash)}
          icon="cash"
        />
        <InfoRow
          label="Tarjeta"
          value={formatCurrency(item.total_card)}
          icon="credit-card"
        />
        <InfoRow
          label="Transferencia"
          value={formatCurrency(item.total_transfer)}
          icon="bank-transfer"
        />
        <InfoRow
          label="Otro"
          value={formatCurrency(item.total_other)}
          icon="dots-horizontal"
        />
      </Surface>

      {/* ─── Conteo físico ───────────────────────────────────────────── */}
      {item.physical_count != null && (
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Conteo Físico</Text>
          <InfoRow
            label="Efectivo contado"
            value={formatCurrency(item.physical_count)}
            icon="hand-coin"
          />
          <InfoRow
            label="Diferencia"
            value={`${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`}
            color={diffColor}
            icon="scale-balance"
          />
        </Surface>
      )}

      {/* ─── Notas ───────────────────────────────────────────────────── */}
      {item.notes && (
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </Surface>
      )}

      {/* ─── Meta ────────────────────────────────────────────────────── */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <InfoRow label="Registrado por" value={item.user?.name ?? "—"} icon="account" />
        <InfoRow
          label="Creado"
          value={item.created_at ? formatDate(item.created_at) : "—"}
          icon="clock-outline"
        />
      </Surface>

      {/* ─── Editar ──────────────────────────────────────────────────── */}
      <Button
        mode="outlined"
        onPress={() =>
          router.push(`/(tabs)/home/cash/closing/form?id=${item.id}`)
        }
        style={{ borderRadius: 10 }}
      >
        Editar Cierre
      </Button>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.background },
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: {
    borderRadius: 14,
    padding: 18,
    backgroundColor: palette.primary,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerDate: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerLocation: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end" },
  balanceBig: { alignItems: "center", marginVertical: 8 },
  balanceBigLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  balanceBigValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
  },
  diffChipWrap: { alignItems: "center", marginTop: 10 },
  section: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: palette.surface,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabelWrap: { flexDirection: "row", alignItems: "center" },
  infoLabel: { fontSize: 13, color: palette.textSecondary },
  infoValue: { fontSize: 13, fontWeight: "600", color: palette.text },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 8,
  },
  notesText: {
    fontSize: 13,
    color: palette.text,
    lineHeight: 20,
  },
});
