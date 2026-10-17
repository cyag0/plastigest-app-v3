import EmptyState from "@/components/App/EmptyState";
import KpiCard from "@/components/Dashboard/KpiCard";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { useResponsive } from "@/hooks/useResponsive";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PermissionGate from "@/components/App/PermissionGate";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";

/** "#4F7A3A" → "79, 122, 58": las gráficas piden el color con opacidad. */
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

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

/** GET /purchases-v2/stats pide purchases_list: sin él no se consulta y se ve «sin permiso». */
export default function PurchaseStats() {
  return (
    <PermissionGate permission="purchases_list">
      <PurchaseStatsContent />
    </PermissionGate>
  );
}

function PurchaseStatsContent() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const primaryRgb = rgbOf(colors.primary);
  const { isMobile } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PurchaseStatsData | null>(null);
  const kpiStyle = isMobile ? { flexBasis: "47%" as const } : undefined;
  const chartWidth = screenWidth - (tokens.spacing[5] + tokens.spacing[4]) * 2;

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
        <ActivityIndicator size="large" color={colors.primary} />
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
        color: (opacity = 1) => `rgba(${primaryRgb}, ${opacity})`,
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
          style={kpiStyle}
        />
        <KpiCard
          icon="cash"
          label="Monto Total"
          value={`$${(stats.total_amount || 0).toFixed(0)}`}
          style={kpiStyle}
        />
        <KpiCard
          icon="package-variant-closed"
          label="Recibidas"
          value={String(stats.received_count)}
          style={kpiStyle}
        />
        <KpiCard
          icon="clock-outline"
          label="Pendientes"
          value={String(stats.pending_count)}
          style={kpiStyle}
        />
      </View>

      {/* Trend chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tendencia (6 meses)</Text>
        <View style={styles.card}>
          {hasTrend ? (
            <LineChart
              data={trendData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(${primaryRgb}, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: colors.primary,
                },
                propsForBackgroundLines: {
                  stroke: colors.border,
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
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(${primaryRgb}, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForBackgroundLines: {
                  stroke: colors.border,
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

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: tokens.spacing[5],
    gap: tokens.spacing[5],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.background,
    gap: tokens.spacing[3],
  },
  loadingText: {
    ...tokens.typography.body,
    color: c.textSecondary,
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
    color: c.text,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textMuted,
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
    borderBottomColor: c.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: c.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  productRankText: {
    ...tokens.typography.micro,
    color: c.primary,
    fontWeight: "700",
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  productName: {
    ...tokens.typography.bodyMd,
    color: c.text,
    fontWeight: "600",
  },
  productQuantity: {
    ...tokens.typography.micro,
    color: c.textSecondary,
  },
  productAmount: {
    ...tokens.typography.bodyMd,
    color: c.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
}));
