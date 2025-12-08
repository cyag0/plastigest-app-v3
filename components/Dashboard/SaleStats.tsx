import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { ActivityIndicator, Card, Text } from "react-native-paper";

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={palette.red}
        />
        <Text style={styles.errorText}>
          No se pudieron cargar las estadísticas
        </Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: palette.surface,
    backgroundGradientFrom: palette.surface,
    backgroundGradientTo: palette.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: palette.primary,
    },
  };

  // Preparar datos para el gráfico de tendencia
  const trendData = {
    labels:
      stats.sales_trend?.map((item: any) => {
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
      }) || [],
    datasets: [
      {
        data: stats.sales_trend?.map((item: any) => item.total || 0) || [0],
        color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Preparar datos para el gráfico de métodos de pago
  const paymentMethodData = {
    labels: Object.values(stats.by_payment_method || {}).map(
      (item: any) => item.label
    ),
    datasets: [
      {
        data: Object.values(stats.by_payment_method || {}).map(
          (item: any) => item.total
        ),
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Resumen General */}
      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Resumen General
        </Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="cart"
                size={32}
                color={palette.primary}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats.overview?.total_sales || 0}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Total Ventas
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={32}
                color={palette.success}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                $
                {(stats.overview?.total_amount || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Monto Total
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="chart-line"
                size={32}
                color={palette.info}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                $
                {(stats.overview?.average_amount || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Promedio por Venta
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="calendar-today"
                size={32}
                color={palette.warning}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                $
                {(stats.overview?.average_per_day || 0).toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Promedio Diario
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="calendar-check"
                size={32}
                color={palette.accent}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                {stats.overview?.today_sales || 0}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Ventas Hoy
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="cash-check"
                size={32}
                color={palette.success}
              />
              <Text variant="headlineMedium" style={styles.statValue}>
                $
                {(stats.overview?.today_amount || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Monto Hoy
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Ventas por Estado */}
      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Ventas por Estado
        </Text>
        <View style={styles.statusContainer}>
          {Object.entries(stats.by_status || {}).map(
            ([key, value]: [string, any]) => (
              <Card key={key} style={styles.statusCard}>
                <Card.Content style={styles.statusContent}>
                  <View style={styles.statusHeader}>
                    <Text variant="titleMedium" style={styles.statusLabel}>
                      {value.label}
                    </Text>
                    <Text variant="headlineSmall" style={styles.statusCount}>
                      {value.count}
                    </Text>
                  </View>
                  <Text variant="bodyLarge" style={styles.statusAmount}>
                    $
                    {(value.total || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Card.Content>
              </Card>
            )
          )}
        </View>
      </View>

      {/* Métodos de Pago */}
      {Object.keys(stats.by_payment_method || {}).length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Ventas por Método de Pago
          </Text>
          <Card style={styles.chartCard}>
            <Card.Content>
              <BarChart
                data={paymentMethodData}
                width={Dimensions.get("window").width - 64}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel="$"
                yAxisSuffix=""
                showValuesOnTopOfBars
                fromZero
              />
            </Card.Content>
          </Card>
          <View style={styles.paymentMethodList}>
            {Object.entries(stats.by_payment_method || {}).map(
              ([key, value]: [string, any]) => (
                <Card key={key} style={styles.paymentMethodCard}>
                  <Card.Content style={styles.paymentMethodContent}>
                    <MaterialCommunityIcons
                      name={
                        key === "efectivo"
                          ? "cash"
                          : key === "tarjeta"
                          ? "credit-card"
                          : "bank-transfer"
                      }
                      size={24}
                      color={palette.primary}
                    />
                    <View style={styles.paymentMethodInfo}>
                      <Text variant="titleMedium">{value.label}</Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.textSecondary }}
                      >
                        {value.count} {value.count === 1 ? "venta" : "ventas"}
                      </Text>
                    </View>
                    <Text
                      variant="titleMedium"
                      style={{ color: palette.primary }}
                    >
                      $
                      {(value.total || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Card.Content>
                </Card>
              )
            )}
          </View>
        </View>
      )}

      {/* Tendencia de Ventas */}
      {stats.sales_trend && stats.sales_trend.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Tendencia de Ventas (6 meses)
          </Text>
          <Card style={styles.chartCard}>
            <Card.Content>
              <LineChart
                data={trendData}
                width={Dimensions.get("window").width - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisLabel="$"
                yAxisSuffix=""
              />
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Top Productos Vendidos */}
      {stats.top_products && stats.top_products.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Productos Más Vendidos
          </Text>
          {stats.top_products.map((product: any, index: number) => (
            <Card key={product.product_id} style={styles.productCard}>
              <Card.Content style={styles.productContent}>
                <View style={styles.productRank}>
                  <Text variant="titleLarge" style={styles.rankNumber}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.productInfo}>
                  <Text variant="titleMedium" style={styles.productName}>
                    {product.product_name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary }}
                  >
                    {product.quantity_sold} unidades vendidas
                  </Text>
                </View>
                <Text variant="titleMedium" style={styles.productAmount}>
                  $
                  {(product.total_amount || 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </Card.Content>
            </Card>
          ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
    gap: 16,
  },
  errorText: {
    color: palette.red,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: palette.text,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  statValue: {
    fontWeight: "bold",
    color: palette.text,
    marginTop: 8,
  },
  statLabel: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  statusContainer: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  statusContent: {
    gap: 8,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontWeight: "600",
    color: palette.text,
  },
  statusCount: {
    fontWeight: "bold",
    color: palette.primary,
  },
  statusAmount: {
    fontWeight: "bold",
    color: palette.success,
  },
  chartCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  paymentMethodList: {
    gap: 12,
  },
  paymentMethodCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  paymentMethodContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  productCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  productContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  productRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: {
    fontWeight: "bold",
    color: palette.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "600",
    color: palette.text,
  },
  productAmount: {
    fontWeight: "bold",
    color: palette.success,
  },
});
