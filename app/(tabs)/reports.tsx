import palette from "@/constants/palette";
import Services from "@/utils/services";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { PieChart, ProgressChart } from "react-native-chart-kit";
import {
  Card,
  Chip,
  DataTable,
  Divider,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

interface DashboardData {
  total_products: number;
  total_stock: number;
  inventory_value: number;
  movements_count: number;
  sales: number;
  purchases: number;
  profit: number;
  low_stock_products: number;
}

interface RecentMovement {
  id: number;
  movement_type: string;
  movement_type_label: string;
  movement_reason: string;
  movement_reason_label: string;
  movement_date: string;
  total_cost: number;
  status: string;
  location: { id: number; name: string } | null;
  products_count: number;
  money_type: "income" | "expense" | "none";
  generated_money: boolean;
  document_number: string | null;
}

interface MovementsByType {
  entry: number;
  exit: number;
  production: number;
  adjustment: number;
  transfer: number;
}

interface TopProduct {
  name: string;
  sales: number;
  quantity: number;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dashboardData, setDashboardData] =
    React.useState<DashboardData | null>(null);
  const [recentMovements, setRecentMovements] = React.useState<
    RecentMovement[]
  >([]);
  const [movementsByType, setMovementsByType] =
    React.useState<MovementsByType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    "today" | "week" | "month"
  >("month");

  const loadData = async () => {
    try {
      const [dashboardResponse, movementsResponse, movementsByTypeResponse] =
        await Promise.all([
          Services.reports.dashboard(),
          Services.reports.recentMovements({ limit: 10 }),
          Services.reports.movementsByType(),
        ]);

      setDashboardData(dashboardResponse.data.data);
      setRecentMovements(movementsResponse.data.data);
      setMovementsByType(movementsByTypeResponse.data.data);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  const getMoneyTypeColor = (moneyType: string) => {
    switch (moneyType) {
      case "income":
        return palette.success;
      case "expense":
        return palette.error;
      default:
        return palette.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  // Datos para gráficas
  const salesTrendData = {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    datasets: [
      {
        data: [
          (dashboardData?.sales || 0) * 0.7,
          (dashboardData?.sales || 0) * 0.85,
          (dashboardData?.sales || 0) * 0.95,
          dashboardData?.sales || 0,
        ],
        color: (opacity = 1) => palette.success,
        strokeWidth: 3,
      },
    ],
  };

  const profitabilityData = {
    labels: ["Rentabilidad"],
    data: [
      dashboardData?.sales
        ? Math.min((dashboardData.profit / dashboardData.sales) * 100, 100) /
          100
        : 0,
    ],
  };

  const topProducts: TopProduct[] = [
    { name: "Bolsa Plástica 500g", sales: 25000, quantity: 1500 },
    { name: "Contenedor 1L", sales: 18000, quantity: 900 },
    { name: "Envase Industrial", sales: 15000, quantity: 600 },
    { name: "Film Estirable", sales: 12000, quantity: 450 },
    { name: "Bolsa Biodegradable", sales: 10000, quantity: 800 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ backgroundColor: palette.error }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: palette.error,
            padding: 28,
            paddingVertical: 40,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <View style={styles.headerTop}>
              <View>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                  Dashboard Ejecutivo
                </Text>
                <Text variant="bodyMedium" style={styles.headerSubtitle}>
                  Análisis y métricas del negocio
                </Text>
              </View>
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
              <Chip
                selected={selectedPeriod === "today"}
                onPress={() => setSelectedPeriod("today")}
                style={[
                  styles.periodChip,
                  selectedPeriod === "today" && styles.periodChipSelected,
                ]}
                textStyle={{
                  color:
                    selectedPeriod === "today" ? "#fff" : palette.textSecondary,
                }}
              >
                Hoy
              </Chip>
              <Chip
                selected={selectedPeriod === "week"}
                onPress={() => setSelectedPeriod("week")}
                style={[
                  styles.periodChip,
                  selectedPeriod === "week" && styles.periodChipSelected,
                ]}
                textStyle={{
                  color:
                    selectedPeriod === "week" ? "#fff" : palette.textSecondary,
                }}
              >
                Semana
              </Chip>
              <Chip
                selected={selectedPeriod === "month"}
                onPress={() => setSelectedPeriod("month")}
                style={[
                  styles.periodChip,
                  selectedPeriod === "month" && styles.periodChipSelected,
                ]}
                textStyle={{
                  color:
                    selectedPeriod === "month" ? "#fff" : palette.textSecondary,
                }}
              >
                Mes
              </Chip>
            </View>
          </View>

          <View style={styles.headerIcon}>
            <Image
              transition={1000}
              style={{ width: 72, height: 72 }}
              source={require("../../assets/images/screens/report.svg")}
            />
          </View>
        </View>

        <View
          style={[
            styles.scrollContent,
            {
              borderTopLeftRadius: 24,
              backgroundColor: palette.background,
            },
          ]}
        >
          {/* KPIs Grid + Charts - Diseño Bento 2x2 */}
          <View style={styles.bentoGrid}>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                width: "100%",
              }}
            >
              {/* Pie Chart 1 - Distribución de Movimientos */}
              <View style={{ flex: 1, height: "100%" }}>
                <Card style={[{ backgroundColor: palette.card, flex: 1 }]}>
                  <Card.Content style={{ padding: 12 }}>
                    <Text
                      variant="labelMedium"
                      style={[
                        styles.chartTitle,
                        { marginBottom: 8, fontSize: 12 },
                      ]}
                    >
                      Distribución de Movimientos
                    </Text>
                    {movementsByType && (
                      <PieChart
                        data={[
                          {
                            name: "Entradas",
                            population: movementsByType.entry || 0.01,
                            color: palette.success,
                            legendFontColor: palette.text,
                            legendFontSize: 9,
                          },
                          {
                            name: "Salidas",
                            population: movementsByType.exit || 0.01,
                            color: palette.error,
                            legendFontColor: palette.text,
                            legendFontSize: 9,
                          },
                          {
                            name: "Producción",
                            population: movementsByType.production || 0.01,
                            color: palette.info,
                            legendFontColor: palette.text,
                            legendFontSize: 9,
                          },
                          {
                            name: "Ajustes",
                            population: movementsByType.adjustment || 0.01,
                            color: palette.warning,
                            legendFontColor: palette.text,
                            legendFontSize: 9,
                          },
                        ].filter((item) => item.population > 0)}
                        width={(Dimensions.get("window").width - 56) / 2}
                        height={140}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          labelColor: (opacity = 1) => palette.text,
                        }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="0"
                        absolute
                        hasLegend={true}
                      />
                    )}
                  </Card.Content>
                </Card>
              </View>

              {/* Ventas del Mes */}
              <View
                style={{
                  flex: 1,
                  height: "100%",
                  gap: 12,
                }}
              >
                <Card
                  style={[
                    {
                      backgroundColor: palette.success + "15",
                      borderTopColor: palette.success,
                      flex: 1,
                    },
                  ]}
                >
                  <Card.Content style={styles.kpiCardContent}>
                    <View
                      style={[
                        styles.kpiIconSmall,
                        { backgroundColor: palette.success + "30" },
                      ]}
                    >
                      <IconButton
                        icon="trending-up"
                        iconColor={palette.success}
                        size={20}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.kpiLabel}>
                      Ventas
                    </Text>
                    <Text variant="titleMedium" style={styles.kpiValueSmall}>
                      {formatCurrency(dashboardData?.sales || 0)}
                    </Text>
                    <View style={styles.kpiTrendSmall}>
                      <IconButton
                        icon="trending-up"
                        size={12}
                        iconColor={palette.success}
                        style={{ margin: 0, padding: 0 }}
                      />
                      <Text
                        style={[
                          styles.kpiTrendText,
                          { color: palette.success },
                        ]}
                      >
                        +12.5%
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                {/* Compras */}
                <Card
                  style={[
                    {
                      backgroundColor: palette.error + "15",
                      borderTopColor: palette.error,
                      flex: 1,
                    },
                  ]}
                >
                  <Card.Content style={styles.kpiCardContent}>
                    <View
                      style={[
                        styles.kpiIconSmall,
                        { backgroundColor: palette.error + "30" },
                      ]}
                    >
                      <IconButton
                        icon="cart"
                        iconColor={palette.error}
                        size={20}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.kpiLabel}>
                      Compras
                    </Text>
                    <Text variant="titleMedium" style={styles.kpiValueSmall}>
                      {formatCurrency(dashboardData?.purchases || 0)}
                    </Text>
                    <View style={styles.kpiTrendSmall}>
                      <IconButton
                        icon="trending-down"
                        size={12}
                        iconColor={palette.error}
                        style={{ margin: 0, padding: 0 }}
                      />
                      <Text
                        style={[styles.kpiTrendText, { color: palette.error }]}
                      >
                        -3.2%
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <View style={{ flex: 1, height: "100%", gap: 12 }}>
                {/* Ganancia Neta */}
                <Card
                  style={[
                    {
                      backgroundColor: palette.primary + "15",
                      borderTopColor: palette.primary,
                      flex: 1,
                    },
                  ]}
                >
                  <Card.Content style={styles.kpiCardContent}>
                    <View
                      style={[
                        styles.kpiIconSmall,
                        { backgroundColor: palette.primary + "30" },
                      ]}
                    >
                      <IconButton
                        icon="cash-multiple"
                        iconColor={palette.primary}
                        size={20}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.kpiLabel}>
                      Ganancia
                    </Text>
                    <Text variant="titleMedium" style={styles.kpiValueSmall}>
                      {formatCurrency(dashboardData?.profit || 0)}
                    </Text>
                    <View style={styles.kpiTrendSmall}>
                      <IconButton
                        icon="trending-up"
                        size={12}
                        iconColor={palette.primary}
                        style={{ margin: 0, padding: 0 }}
                      />
                      <Text
                        style={[
                          styles.kpiTrendText,
                          { color: palette.primary },
                        ]}
                      >
                        +18.4%
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                {/* Movimientos */}
                <Card
                  style={[
                    {
                      backgroundColor: palette.info + "15",
                      borderTopColor: palette.info,
                      flex: 1,
                    },
                  ]}
                >
                  <Card.Content style={styles.kpiCardContent}>
                    <View
                      style={[
                        styles.kpiIconSmall,
                        { backgroundColor: palette.info + "30" },
                      ]}
                    >
                      <IconButton
                        icon="swap-vertical"
                        iconColor={palette.info}
                        size={20}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.kpiLabel}>
                      Movimientos
                    </Text>
                    <Text variant="titleMedium" style={styles.kpiValueSmall}>
                      {dashboardData?.movements_count || 0}
                    </Text>
                    <View style={styles.kpiTrendSmall}>
                      <IconButton
                        icon="swap-horizontal"
                        size={12}
                        iconColor={palette.info}
                        style={{ margin: 0, padding: 0 }}
                      />
                      <Text
                        style={[styles.kpiTrendText, { color: palette.info }]}
                      >
                        +5.7%
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>

              <View style={{ flex: 1, height: "100%" }}>
                {/* Pie Chart 2 - Rentabilidad */}
                <Card
                  contentStyle={{
                    flex: 1,
                  }}
                  style={[{ backgroundColor: palette.card, flex: 1 }]}
                >
                  <Card.Content
                    style={{
                      padding: 12,
                      flex: 1,
                      height: "100%",
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        variant="labelMedium"
                        style={[
                          styles.chartTitle,
                          { marginBottom: 8, fontSize: 12 },
                        ]}
                      >
                        Margen de Rentabilidad
                      </Text>
                      <ProgressChart
                        data={profitabilityData}
                        width={(Dimensions.get("window").width - 56) / 2}
                        height={100}
                        strokeWidth={12}
                        radius={35}
                        chartConfig={{
                          backgroundColor: "transparent",
                          backgroundGradientFrom: "transparent",
                          backgroundGradientTo: "transparent",
                          color: (opacity = 1) => palette.warning,
                          labelColor: (opacity = 1) => palette.text,
                        }}
                        hideLegend={true}
                      />
                      <Text
                        variant="headlineSmall"
                        style={{
                          color: palette.primary,
                          fontWeight: "bold",
                          marginTop: -70,
                          marginBottom: 50,
                        }}
                      >
                        {dashboardData?.sales
                          ? Math.round(
                              (dashboardData.profit / dashboardData.sales) * 100
                            )
                          : 0}
                        %
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.textSecondary, marginTop: 8 }}
                      >
                        Ganancia sobre ventas
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </View>
            </View>
          </View>

          {/* Top 5 Productos */}
          <Card style={styles.tableCard}>
            <Card.Content>
              <View style={styles.tableHeader}>
                <Text variant="titleMedium" style={styles.tableTitle}>
                  Top 5 Productos Más Vendidos
                </Text>
                <TouchableRipple
                  onPress={() => router.push("/(tabs)/home/products" as any)}
                >
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.primary, fontWeight: "600" }}
                  >
                    Ver todos
                  </Text>
                </TouchableRipple>
              </View>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Producto</DataTable.Title>
                  <DataTable.Title numeric>Cantidad</DataTable.Title>
                  <DataTable.Title numeric>Ventas</DataTable.Title>
                </DataTable.Header>

                {topProducts.map((product, index) => (
                  <DataTable.Row key={index}>
                    <DataTable.Cell>
                      <View style={styles.productCell}>
                        <View
                          style={[
                            styles.productRank,
                            {
                              backgroundColor:
                                index === 0
                                  ? palette.success + "30"
                                  : palette.surface,
                            },
                          ]}
                        >
                          <Text
                            variant="labelSmall"
                            style={{
                              color:
                                index === 0 ? palette.success : palette.text,
                              fontWeight: "bold",
                            }}
                          >
                            #{index + 1}
                          </Text>
                        </View>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {product.name}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>{product.quantity}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: palette.success,
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(product.sales)}
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>

          {/* Actividad Reciente */}
          <Card style={styles.activityCard}>
            <Card.Content>
              <View style={styles.activityHeader}>
                <Text variant="titleMedium" style={styles.activityTitle}>
                  Actividad Reciente
                </Text>
                <TouchableRipple onPress={() => {}}>
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.primary, fontWeight: "600" }}
                  >
                    Ver historial
                  </Text>
                </TouchableRipple>
              </View>

              {recentMovements.slice(0, 5).map((movement, index) => (
                <React.Fragment key={movement.id}>
                  <View style={styles.activityItem}>
                    <View
                      style={[
                        styles.activityIcon,
                        {
                          backgroundColor:
                            movement.movement_type === "entry"
                              ? palette.success + "20"
                              : movement.movement_type === "exit"
                              ? palette.error + "20"
                              : palette.info + "20",
                        },
                      ]}
                    >
                      <IconButton
                        icon={
                          movement.movement_type === "entry"
                            ? "arrow-down"
                            : movement.movement_type === "exit"
                            ? "arrow-up"
                            : "swap-horizontal"
                        }
                        iconColor={
                          movement.movement_type === "entry"
                            ? palette.success
                            : movement.movement_type === "exit"
                            ? palette.error
                            : palette.info
                        }
                        size={20}
                        style={{ margin: 0 }}
                      />
                    </View>

                    <View style={styles.activityContent}>
                      <Text variant="bodyMedium" style={styles.activityText}>
                        {movement.movement_reason_label}
                      </Text>
                      <Text variant="bodySmall" style={styles.activityDate}>
                        {formatDate(movement.movement_date)}
                      </Text>
                    </View>

                    {movement.generated_money && movement.total_cost > 0 && (
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.activityAmount,
                          { color: getMoneyTypeColor(movement.money_type) },
                        ]}
                      >
                        {formatCurrency(movement.total_cost)}
                      </Text>
                    )}
                  </View>
                  {index < recentMovements.slice(0, 5).length - 1 && (
                    <Divider />
                  )}
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>

          {/* Alertas e Inventario */}
          <View style={styles.alertsRow}>
            <Card
              style={[styles.alertCard, { borderLeftColor: palette.error }]}
            >
              <Card.Content>
                <View style={styles.alertContent}>
                  <IconButton
                    icon="alert-circle"
                    iconColor={palette.error}
                    size={24}
                    style={{ margin: 0 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={styles.alertTitle}>
                      Stock Bajo
                    </Text>
                    <Text variant="bodySmall" style={styles.alertText}>
                      {dashboardData?.low_stock_products || 0} productos
                      requieren reposición
                    </Text>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={20}
                    iconColor={palette.textSecondary}
                    style={{ margin: 0 }}
                    onPress={() =>
                      router.push(
                        "/(tabs)/home/products?filter=low_stock" as any
                      )
                    }
                  />
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.alertCard, { borderLeftColor: palette.info }]}>
              <Card.Content>
                <View style={styles.alertContent}>
                  <IconButton
                    icon="package-variant"
                    iconColor={palette.info}
                    size={24}
                    style={{ margin: 0 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={styles.alertTitle}>
                      Inventario Total
                    </Text>
                    <Text variant="bodySmall" style={styles.alertText}>
                      {formatCurrency(dashboardData?.inventory_value || 0)} en
                      stock
                    </Text>
                  </View>
                  <IconButton
                    icon="chevron-right"
                    size={20}
                    iconColor={palette.textSecondary}
                    style={{ margin: 0 }}
                    onPress={() => router.push("/(tabs)/inventory" as any)}
                  />
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    color: palette.background + "DD",
    marginTop: 4,
  },
  headerIcon: {
    width: 108,
    height: 108,
    borderRadius: 36,
    backgroundColor: palette.background,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    backgroundColor: palette.surface,
  },
  periodChipSelected: {
    backgroundColor: palette.warning,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  bentoCard: {
    flex: 1,
    minWidth: "48%",
    maxWidth: "49%",
    borderRadius: 12,
    elevation: 2,
    borderTopWidth: 3,
  },
  bentoChartCard: {
    flex: 1,
    minWidth: "48%",
    maxWidth: "49%",
    borderRadius: 12,
    elevation: 2,
  },
  kpiCardContent: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  kpiIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiLabel: {
    color: palette.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  kpiValueSmall: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 4,
    textAlign: "center",
    fontSize: 14,
  },
  kpiTrendSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  kpiTrendText: {
    fontSize: 10,
    fontWeight: "600",
  },

  chartsRow: {
    gap: 16,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartCenterValue: {
    position: "absolute",
    alignSelf: "center",
    top: 120,
    fontWeight: "bold",
  },
  tableCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tableTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  productCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  activityCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activityTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontWeight: "500",
    color: palette.text,
  },
  activityDate: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  activityAmount: {
    fontWeight: "600",
  },
  alertsRow: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 2,
  },
  alertText: {
    color: palette.textSecondary,
  },
});
