import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { Card, Text } from "react-native-paper";

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
      const response = await Services.purchases.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Error loading purchase stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={48}
          color={palette.textSecondary}
        />
        <Text style={styles.emptyText}>No hay datos disponibles</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: palette.card,
    backgroundGradientFrom: palette.card,
    backgroundGradientTo: palette.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(128, 150, 113, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(114, 92, 58, ${opacity})`,
    style: {
      borderRadius: 8,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  // Preparar datos para gráfica de tendencia
  const trendData = {
    labels: (stats.purchase_trend || []).map((item) => {
      const [year, month] = item.month.split("-");
      const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      return monthNames[parseInt(month) - 1];
    }),
    datasets: [
      {
        data: (stats.purchase_trend || []).map((item) => item.total),
        color: (opacity = 1) => `rgba(128, 150, 113, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Preparar datos para gráfica de top proveedores
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

  return (
    <ScrollView style={styles.container}>
      {/* Stats Cards - 2 filas */}
      <View style={styles.statsGrid}>
        {/* Fila 1 */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: palette.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="cart"
                  size={24}
                  color={palette.primary}
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.total_purchases}</Text>
                <Text style={styles.statLabel}>Total Compras</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: palette.success + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="cash"
                  size={24}
                  color={palette.success}
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>
                  ${(stats.total_amount || 0).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Monto Total</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Fila 2 */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: palette.accent + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={24}
                  color={palette.accent}
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.received_count}</Text>
                <Text style={styles.statLabel}>Recibidas</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: palette.warning + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color={palette.warning}
                />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stats.pending_count}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Gráfica de Tendencia */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Tendencia de Compras (6 meses)</Text>
          {(stats.purchase_trend || []).length > 0 ? (
            <LineChart
              data={trendData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              formatYLabel={(value) => `$${parseInt(value)}`}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No hay datos suficientes
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Gráfica de Top Proveedores */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Top 5 Proveedores</Text>
          {(stats.top_suppliers || []).length > 0 ? (
            <BarChart
              data={suppliersData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
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
        </Card.Content>
      </Card>

      {/* Lista de Productos Más Comprados */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Productos Más Comprados</Text>
          {(stats.top_products || []).length > 0 ? (
            <View style={styles.productsList}>
              {(stats.top_products || []).slice(0, 5).map((product, index) => (
                <View key={index} style={styles.productItem}>
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
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: palette.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    color: palette.textSecondary,
    fontSize: 14,
  },
  statsGrid: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.card,
    elevation: 1,
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.text,
  },
  statLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: palette.card,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  emptyChart: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChartText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  productsList: {
    gap: 8,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    gap: 12,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  productRankText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
  },
  productQuantity: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  productAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.primary,
  },
});
