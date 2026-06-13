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

interface PurchaseStatsData {
  total_purchases: number;
  total_amount: number;
  average_amount: number;
  received_count: number;
  pending_count: number;
  by_status: Record<string, { count: number; total: number }>;
  top_suppliers: Array<{
    supplier_name: string;
    purchase_count: number;
    total_amount: number;
  }>;
  top_products: Array<{
    product_name: string;
    total_quantity: number;
    total_amount: number;
  }>;
  purchase_trend: Array<{
    month: string;
    count: number;
    total: number;
  }>;
}

export default function PurchaseStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PurchaseStatsData | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await Services.purchasesV2.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Error loading purchase stats:", error);
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
        description="No hay datos de compras disponibles"
      />
    );
  }

  const trendData = {
    labels: (stats.purchase_trend || []).map((item) => {
      const [, month] = item.month.split("-");
      const monthNames = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ];
      return monthNames[parseInt(month) - 1];
    }),
    datasets: [
      {
        data: (stats.purchase_trend || []).map((item) => item.total),
        color: (opacity = 1) => `rgba(79, 122, 58, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const suppliersData = {
    labels: (stats.top_suppliers || []).slice(0, 5).map((s) => {
      const name = s.supplier_name;
      return name.length > 10 ? name.substring(0, 8) + "..." : name;
    }),
    datasets: [
      {
        data: (stats.top_suppliers || [])
          .slice(0, 5)
          .map((s) => s.total_amount),
      },
    ],
  };

  const hasTrend = (stats.purchase_trend || []).length > 0;
  const hasSuppliers = (stats.top_suppliers || []).length > 0;
  const hasTopProducts = (stats.top_products || []).length > 0;

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
          label="Total Compras"
          value={String(stats.total_purchases)}
        />
        <KpiCard
          icon="cash"
          label="Monto Total"
          value={`$${(stats.total_amount || 0).toFixed(0)}`}
        />
        <KpiCard
          icon="package-variant-closed"
          label="Recibidas"
          value={String(stats.received_count)}
        />
        <KpiCard
          icon="clock-outline"
          label="Pendientes"
          value={String(stats.pending_count)}
        />
      </View>

      {/* Trend chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tendencia (6 meses)</Text>
        <View style={styles.card}>
          {hasTrend ? (
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
              formatYLabel={(value) => `$${parseInt(value)}`}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No hay datos suficientes
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Top suppliers chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top 5 proveedores</Text>
        <View style={styles.card}>
          {hasSuppliers ? (
            <BarChart
              data={suppliersData}
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
              showValuesOnTopOfBars
              withInnerLines={false}
              fromZero
              yAxisLabel="$"
              yAxisSuffix=""
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No hay datos de proveedores
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Top products list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productos más comprados</Text>
        <View style={styles.card}>
          {hasTopProducts ? (
            <View>
              {stats.top_products.slice(0, 5).map((product, index) => (
                <View
                  key={`${product.product_name}-${index}`}
                  style={[
                    styles.productItem,
                    index < Math.min(stats.top_products.length, 5) - 1 &&
                      styles.productItemDivider,
                  ]}
                >
                  <View style={styles.productRank}>
                    <Text style={styles.productRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <Text style={styles.productQuantity}>
                      {product.total_quantity} unidades
                    </Text>
                  </View>
                  <Text style={styles.productAmount}>
                    ${product.total_amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No hay datos de productos
              </Text>
            </View>
          )}
        </View>
      </View>
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
  emptyChart: {
    paddingVertical: tokens.spacing[7],
    alignItems: "center",
  },
  emptyChartText: {
    ...tokens.typography.body,
    color: palette.textMuted,
  },

  // --- Product list ---
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
  },
  productItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  productRankText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  productName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  productQuantity: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
  productAmount: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
