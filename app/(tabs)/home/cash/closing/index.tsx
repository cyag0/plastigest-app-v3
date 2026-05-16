import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number | string) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `$${(n ?? 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CashClosingIndex() {
  return (
    <AppList
      title="Cierres de Caja"
      service={Services.cashClosings}
      columns={[
        {
          key: "closing_date",
          dataIndex: "closing_date",
          width: 100,
          title: "Fecha",
          render: (value) => formatDate(value),
        },
        {
          key: "location",
          dataIndex: "location.name",
          width: 130,
          title: "Ubicacion",
          render: (value) => value ?? "—",
        },
        {
          key: "expected_balance",
          dataIndex: "expected_balance",
          width: 130,
          title: "Saldo esperado",
          render: (value) => formatCurrency(value),
        },
        {
          key: "difference",
          dataIndex: "difference",
          width: 120,
          title: "Diferencia",
          render: (value) => (value == null ? "—" : formatCurrency(value)),
        },
        {
          key: "movements_count",
          dataIndex: "movements_count",
          width: 120,
          title: "Movimientos",
          render: (value) => value ?? 0,
        },
      ]}
      onPressCreate={() => router.push("/(tabs)/home/cash/closing/form" as any)}
      fabLabel="Nuevo Cierre"
      menu={generateCrudMenu("/(tabs)/home/cash/closing" as any, {
        showDelete(item) {
            return false
        },
        showEdit(item) {
            return false
        }
      })}
      renderCard={({ item }: { item: any }) => {
        const diff = parseFloat(item.difference ?? "0");
        const diffColor =
          diff === 0 ? palette.success : diff > 0 ? palette.blue : palette.red;

        return {
          title: formatDate(item.closing_date),
          subtitle: item.location?.name ?? "—",
          description: `${item.movements_count ?? 0} movimientos`,
          right: (
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={{ fontWeight: "700", color: palette.text }}>
                {formatCurrency(item.expected_balance ?? 0)}
              </Text>
              {item.difference != null && (
                <Chip
                  compact
                  style={{ backgroundColor: `${diffColor}20`, height: 22 }}
                  textStyle={{ fontSize: 10, color: diffColor }}
                >
                  {diff >= 0 ? "+" : ""}
                  {formatCurrency(diff)}
                </Chip>
              )}
            </View>
          ),
          bottom: [
            { label: "Ingresos", value: formatCurrency(item.total_income ?? 0) },
            { label: "Egresos", value: formatCurrency(item.total_expense ?? 0) },
          ],
        };
      }}
    />
  );
}
