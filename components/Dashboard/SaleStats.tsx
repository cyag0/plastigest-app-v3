import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import KpiCard from "@/components/Dashboard/KpiCard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function SaleStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await Services.sales.stats();
      setStats(response.data);
    } catch (error) {
      console.error("Error loading sales stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon="chart-box-outline"
        title="Sin datos"
        description="No se pudieron cargar las estadísticas de ventas"
      />
    );
  }

  const formatCurrency = (value: number) =>
    (value || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const trendData = {
    labels:
      stats.sales_trend?.map((item: any) => {
        const [, month] = item.month.split("-");
        const monthNames = [
          "Ene", "Feb", "Mar", "Abr", "May", "Jun",
          "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
        ];
        return monthNames[parseInt(month) - 1];
      }) || [],
    datasets: [
      {
        data:
          stats.sales_trend?.map((item: any) => item.total || 0) || [0],
        color: (opacity = 1) => `rgba(79, 122, 58, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const paymentMethodData = {
    labels: Object.values(stats.by_payment_method || {}).map(
      (item: any) => item.label,
    ),
    datasets: [
      {
        data: Object.values(stats.by_payment_method || {}).map(
          (item: any) => item.total,
        ),
      },
    ],
  };

  const hasPaymentMethods =
    Object.keys(stats.by_payment_method || {}).length > 0;
  const hasTrend = stats.sales_trend && stats.sales_trend.length > 0;
  const hasTopProducts =
    stats.top_products && stats.top_products.length > 0;
  const statusEntries = Object.entries(stats.by_status || {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon="cart"
          label="Total Ventas"
          value={String(stats.overview?.total_sales || 0)}
        />
        <KpiCard
          icon="cash-multiple"
          label="Monto Total"
          value={`$${formatCurrency(stats.overview?.total_amount || 0)}`}
        />
        <KpiCard
          icon="chart-line"
          label="Promedio Venta"
          value={`$${formatCurrency(stats.overview?.average_amount || 0)}`}
        />
        <KpiCard
          icon="calendar-today"
          label="Promedio Diario"
          value={`$${formatCurrency(stats.overview?.average_per_day || 0)}`}
        />
        <KpiCard
          icon="calendar-check"
          label="Ventas Hoy"
          value={String(stats.overview?.today_sales || 0)}
        />
        <KpiCard
          icon="cash-check"
          label="Monto Hoy"
          value={`$${formatCurrency(stats.overview?.today_amount || 0)}`}
        />
      </View>

      {/* Status breakdown */}
      {statusEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por estado</Text>
          <View style={styles.statusGrid}>
            {statusEntries.map(([key, value]: [string, any]) => {
              const variant = ((): "primary" | "success" | "warning" | "error" | "info" | "default" => {
                if (key === "completed" || key === "paid") return "success";
                if (key === "pending") return "warning";
                if (key === "cancelled") return "error";
                return "info";
              })();
              return (
                <View key={key} style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <AppChip variant={variant} size="md">
                      {value.label}
                    </AppChip>
                    <Text style={styles.statusCount}>{value.count}</Text>
                  </View>
                  <Text style={styles.statusAmount}>
                    ${formatCurrency(value.total)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Payment methods */}
      {hasPaymentMethods && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por método de pago</Text>
          <View style={styles.card}>
            <BarChart
              data={paymentMethodData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: palette.surface,
                backgroundGradientFrom: palette.surface,
                backgroundGradientTo: palette.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(79, 122, 58, ${opacity})`,
                labelColor: () => palette.textSecondary,
                propsForBackgroundLines: {
                  stroke: palette.border,
                },
              }}
              style={styles.chart}
              yAxisLabel="$"
              yAxisSuffix=""
              showValuesOnTopOfBars
              fromZero
            />
          </View>

          <View style={styles.paymentMethodList}>
            {Object.entries(stats.by_payment_method || {}).map(
              ([key, value]: [string, any]) => {
                const icon =
                  key === "efectivo"
                    ? "cash"
                    : key === "tarjeta"
                      ? "credit-card"
                      : "bank-transfer";
                return (
                  <View key={key} style={styles.paymentMethodItem}>
                    <View style={styles.paymentMethodIcon}>
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={18}
                        color={palette.primary}
                      />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodLabel}>
                        {value.label}
                      </Text>
                      <Text style={styles.paymentMethodSub}>
                        {value.count} {value.count === 1 ? "venta" : "ventas"}
                      </Text>
                    </View>
                    <Text style={styles.paymentMethodTotal}>
                      ${formatCurrency(value.total)}
                    </Text>
                  </View>
                );
              },
            )}
          </View>
        </View>
      )}

      {/* Trend chart */}
      {hasTrend && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tendencia (6 meses)</Text>
          <View style={styles.card}>
            <LineChart
              data={trendData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: palette.surface,
                backgroundGradientFrom: palette.surface,
                backgroundGradientTo: palette.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(79, 122, 58, ${opacity})`,
                labelColor: () => palette.textSecondary,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: palette.primary,
                },
                propsForBackgroundLines: {
                  stroke: palette.border,
                },
              }}
              bezier
              style={styles.chart}
              yAxisLabel="$"
              yAxisSuffix=""
            />
          </View>
        </View>
      )}

      {/* Top products */}
      {hasTopProducts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos más vendidos</Text>
          <View style={styles.card}>
            {stats.top_products.map((product: any, index: number) => (
              <View
                key={product.product_id}
                style={[
                  styles.topItem,
                  index < stats.top_products.length - 1 &&
                    styles.topItemDivider,
                ]}
              >
                <View style={styles.topItemRank}>
                  <Text style={styles.topItemRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topItemInfo}>
                  <Text style={styles.topItemName} numberOfLines={1}>
                    {product.product_name}
                  </Text>
                  <Text style={styles.topItemSub}>
                    {product.quantity_sold} unidades vendidas
                  </Text>
                </View>
                <Text style={styles.topItemTotal}>
                  ${formatCurrency(product.total_amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: tokens.spacing[5],
    gap: tokens.spacing[5],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
    gap: tokens.spacing[3],
  },
  loadingText: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },

  // --- KPI grid ---
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },

  // --- Section ---
  section: {
    gap: tokens.spacing[3],
  },
  sectionTitle: {
    ...tokens.typography.h3,
    color: palette.text,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[4],
    ...tokens.shadow.sm,
  },
  chart: {
    marginVertical: tokens.spacing[2],
    borderRadius: tokens.radius.md,
  },

  // --- Status grid ---
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },
  statusCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusCount: {
    ...tokens.typography.h2,
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  statusAmount: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // --- Payment methods ---
  paymentMethodList: {
    gap: tokens.spacing[2],
  },
  paymentMethodItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    padding: tokens.spacing[3],
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodInfo: {
    flex: 1,
    minWidth: 0,
  },
  paymentMethodLabel: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  paymentMethodSub: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
  paymentMethodTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // --- Top products list ---
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
  },
  topItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  topItemRankText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "700",
  },
  topItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topItemName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  topItemSub: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
  topItemTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
