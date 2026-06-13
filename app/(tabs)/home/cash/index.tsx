import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Chip, Text } from "react-native-paper";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_COLORS: Record<string, string> = {
  income: palette.success,
  expense: palette.error,
  adjustment: palette.blue,
};

const TYPE_LABELS: Record<string, string> = {
  income: "Ingreso",
  expense: "Egreso",
  adjustment: "Ajuste",
};

const PAYMENT_META: Record<string, { icon: string; label: string }> = {
  cash:     { icon: "cash",          label: "Efectivo" },
  card:     { icon: "credit-card",   label: "Tarjeta" },
  transfer: { icon: "bank-transfer", label: "Transferencia" },
  other:    { icon: "dots-horizontal", label: "Otro" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stats banner
// ─────────────────────────────────────────────────────────────────────────────

interface CashStats {
  balance_actual: number;
  total_income: number;
  total_expense: number;
  today_income: number;
  today_expense: number;
  today_count: number;
  by_payment_method: Record<
    string,
    { balance: number; total_income: number; total_expense: number; label: string }
  >;
}

function CashStatsBanner() {
  const [stats, setStats] = useState<CashStats | null>(null);

  useEffect(() => {
    Services.cashMovements.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return null;

  const balanceColor = stats.balance_actual >= 0 ? palette.success : palette.error;

  const paymentEntries = Object.entries(stats.by_payment_method);

  return (
    <View style={styles.bannerContainer}>
      {/* Fila principal: saldo + mes */}
      <View style={styles.statsRow}>
        {/* Saldo actual */}
        <View style={[styles.balanceCard, { borderLeftColor: balanceColor }]}>
          <View style={styles.balanceHeader}>
            <MaterialCommunityIcons
              name={balanceColor === palette.success ? "trending-up" : "trending-down"}
              size={18}
              color={balanceColor}
            />
            <Text style={styles.balanceLabel}>Saldo actual</Text>
          </View>
          <Text style={[styles.balanceValue, { color: balanceColor }]}>
            {formatCurrency(stats.balance_actual)}
          </Text>
          <Text style={styles.balanceSub}>
            {stats.today_count} mov. hoy
          </Text>
        </View>

        {/* Ingresos / Egresos del mes */}
        <View style={styles.sideStats}>
          <View style={styles.sideStat}>
            <View style={styles.sideStatHeader}>
              <MaterialCommunityIcons name="arrow-down-circle" size={14} color={palette.success} />
              <Text style={styles.sideStatLabel}>Ingresos mes</Text>
            </View>
            <Text style={[styles.sideStatValue, { color: palette.success }]}>
              {formatCurrency(stats.total_income)}
            </Text>
          </View>
          <View style={[styles.sideStat, { borderTopWidth: 1, borderTopColor: palette.border }]}>
            <View style={styles.sideStatHeader}>
              <MaterialCommunityIcons name="arrow-up-circle" size={14} color={palette.error} />
              <Text style={styles.sideStatLabel}>Egresos mes</Text>
            </View>
            <Text style={[styles.sideStatValue, { color: palette.error }]}>
              {formatCurrency(stats.total_expense)}
            </Text>
          </View>
        </View>
      </View>

      {/* Por método de pago + acceso directo a cierres de caja */}
      {paymentEntries.length > 0 && (
        <View style={styles.methodRow}>
          <View style={styles.methodChips}>
            {paymentEntries.map(([method, data]) => {
              const meta = PAYMENT_META[method] ?? { icon: "cash", label: data.label };
              const color = data.balance >= 0 ? palette.success : palette.error;
              return (
                <View key={method} style={styles.methodChip}>
                  <View style={styles.methodChipHeader}>
                    <MaterialCommunityIcons name={meta.icon as any} size={14} color={color} />
                    <Text style={[styles.methodChipLabel, { color }]} numberOfLines={1}>
                      {data.label || meta.label}
                    </Text>
                  </View>
                  <Text style={[styles.methodChipValue, { color }]} numberOfLines={1}>
                    {formatCurrency(data.balance)}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.closingButton}
            onPress={() => router.push("/(tabs)/home/cash/closing")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cash-register" size={14} color={palette.primary} />
            <Text style={styles.closingButtonText} numberOfLines={1}>
              Cierres de Caja
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={palette.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

const route = "/(tabs)/home/cash" as const;

export default function CashMovementsIndex() {
  const columns: AppListColumn<any>[] = [
    {
      title: "Fecha",
      key: "movement_date",
      width: 110,
      render: (_, item) => item.movement_date ?? "—",
    },
    {
      title: "Tipo",
      key: "type",
      width: 110,
      align: "center",
      render: (_, item) => (
        <Chip
          style={{ backgroundColor: TYPE_COLORS[item.type] ?? palette.surface }}
          textStyle={{ color: "white", fontSize: 11 }}
          compact
        >
          {TYPE_LABELS[item.type] ?? item.type}
        </Chip>
      ),
    },
    { title: "Concepto", dataIndex: "concept", key: "concept", width: 260 },
    {
      title: "Método",
      key: "payment_method",
      width: 130,
      render: (_, item) => item.payment_method_label ?? item.payment_method,
    },
    {
      title: "Monto",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, item) => (
        <Text
          style={{
            fontWeight: "bold",
            color: TYPE_COLORS[item.type] ?? palette.text,
          }}
        >
          {item.type === "expense" ? "-" : "+"}
          {formatCurrency(item.amount)}
        </Text>
      ),
    },
  ];

  return (
    <PermissionGate permission="cash_movements_list">
        <CashStatsBanner />
      <AppList
        title="Caja"
        service={Services.cashMovements}
        columns={columns}
        filters={[
          {
            type: "simple",
            name: "type",
            label: "Tipo",
            options: [
              { label: "Todos", value: "" },
              { label: "Ingresos", value: "income" },
              { label: "Egresos", value: "expense" },
              { label: "Ajustes", value: "adjustment" },
            ],
          },
          {
            type: "simple",
            name: "payment_method",
            label: "Método de Pago",
            options: [
              { label: "Todos", value: "" },
              { label: "Efectivo", value: "cash" },
              { label: "Tarjeta", value: "card" },
              { label: "Transferencia", value: "transfer" },
              { label: "Otro", value: "other" },
            ],
          },
        ]}
        renderCard={({ item }) => ({
          title: item.concept,
          description: item.notes || item.payment_method_label,
          right: (
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color: TYPE_COLORS[item.type] ?? palette.text,
                }}
              >
                {item.type === "expense" ? "-" : "+"}
                {formatCurrency(item.amount)}
              </Text>
              <Chip
                style={{
                  backgroundColor: TYPE_COLORS[item.type] ?? palette.surface,
                }}
                textStyle={{ color: "white", fontSize: 10 }}
                compact
              >
                {TYPE_LABELS[item.type] ?? item.type}
              </Chip>
            </View>
          ),
          bottom: [
            { label: "Fecha", value: item.movement_date ?? "—" },
            { label: "Método", value: item.payment_method_label ?? item.payment_method },
            ...(item.user?.name ? [{ label: "Registrado por", value: item.user.name }] : []),
          ],
        })}
        onItemPress={(item) => {
          if (item.source_url) {
            router.push(item.source_url as any);
          }
        }}
        onPressCreate={() => router.push("/(tabs)/home/cash/form")}
        searchPlaceholder="Buscar movimientos..."
        menu={generateCrudMenu(route)}
      />
    </PermissionGate>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bannerContainer: {
    padding: 12,
    paddingBottom: 4,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    elevation: 1,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  balanceSub: {
    fontSize: 11,
    color: palette.textSecondary,
    marginTop: 2,
  },
  sideStats: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 1,
    overflow: "hidden",
  },
  sideStat: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  sideStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  sideStatValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  sideStatLabel: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginTop: 2,
  },
  methodChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodChip: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    elevation: 1,
  },
  closingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${palette.primary}15`,
    alignSelf: "center",
  },
  closingButtonText: {
    fontSize: 12,
    color: palette.primary,
    fontWeight: "600",
  },
  methodChipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  methodChipLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  methodChipValue: {
    fontSize: 14,
    fontWeight: "700",
  },
});
