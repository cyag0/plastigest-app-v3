import palette from "@/constants/palette";
import { Href, useRouter } from "expo-router";
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
  Divider,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

interface InventoryStats {
  total_products: number;
  total_stock: number;
  inventory_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  products_by_category?: { [key: string]: number };
  stock_health?: {
    optimal: number;
    low: number;
    critical: number;
    out: number;
  };
}

interface InventoryOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: Href;
  color: string;
  badge?: number;
}

export default function InventoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState<InventoryStats | null>(null);

  const inventoryOptions: InventoryOption[] = [
    {
      id: "view-inventory",
      title: "Ver Inventario",
      description: "Consulta el stock actual de todos los productos",
      icon: "package-variant",
      route: "/(tabs)/home/products",
      color: palette.primary,
    },
    {
      id: "weekly-check",
      title: "Inventario Semanal",
      description: "Verificación física del inventario",
      icon: "clipboard-check",
      route: "/(tabs)/inventory/weekly-inventory",
      color: palette.info,
    },
    {
      id: "adjustments",
      title: "Ajustes",
      description: "Registra ajustes de inventario por mermas o pérdidas",
      icon: "tune",
      route: "/(tabs)/home/adjustment",
      color: palette.warning,
    },
    {
      id: "transfers",
      title: "Transferencias",
      description: "Mueve inventario entre sucursales",
      icon: "truck-fast",
      route: "/(tabs)/home/locations",
      color: palette.accent,
    },
    {
      id: "low-stock",
      title: "Stock Bajo",
      description: "Productos que necesitan reposición",
      icon: "alert-circle",
      route: "/(tabs)/home/products?filter=low_stock",
      color: palette.error,
      badge: stats?.low_stock_products || 0,
    },
  ];

  const loadData = async () => {
    try {
      // Simulación de datos - reemplazar con llamada real a la API
      const mockStats: InventoryStats = {
        total_products: 150,
        total_stock: 2850,
        inventory_value: 285000,
        low_stock_products: 12,
        out_of_stock_products: 3,
        products_by_category: {
          "Materia Prima": 45,
          "Producto Terminado": 65,
          Empaques: 25,
          Otros: 15,
        },
        stock_health: {
          optimal: 70,
          low: 15,
          critical: 10,
          out: 5,
        },
      };

      setStats(mockStats);
    } catch (error) {
      console.error("Error loading inventory stats:", error);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const categoryData = stats?.products_by_category
    ? Object.entries(stats.products_by_category).map(
        ([name, value], index) => ({
          name,
          population: value,
          color: [
            palette.primary,
            palette.info,
            palette.accent,
            palette.warning,
          ][index % 4],
          legendFontColor: palette.text,
          legendFontSize: 12,
        })
      )
    : [];

  const stockHealthData = {
    labels: ["Óptimo", "Bajo", "Crítico"],
    data: [
      (stats?.stock_health?.optimal || 0) / 100,
      (stats?.stock_health?.low || 0) / 100,
      (stats?.stock_health?.critical || 0) / 100,
    ],
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards Horizontal Scroll */}
        <View style={{ position: "relative", marginBottom: 24, height: 220 }}>
          {/* Content */}
          <View
            style={{
              position: "absolute",
              top: 0,
              width: "100%",
              height: "100%",
              zIndex: 20,
            }}
          >
            <View>
              <Text
                variant="headlineLarge"
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  marginBottom: 8,
                }}
              >
                Inventario
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: "#fff",
                  opacity: 0.9,
                  paddingHorizontal: 20,
                }}
              >
                Gestiona y monitorea tu stock
              </Text>
            </View>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
              >
                <Card style={styles.statCard}>
                  <Card.Content>
                    <View style={styles.statIconContainer}>
                      <IconButton
                        icon="package-variant"
                        iconColor={palette.primary}
                        size={28}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelMedium" style={styles.statLabel}>
                      Total Productos
                    </Text>
                    <Text variant="headlineSmall" style={styles.statValue}>
                      {stats?.total_products || 0}
                    </Text>
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content>
                    <View style={styles.statIconContainer}>
                      <IconButton
                        icon="cube-outline"
                        iconColor={palette.info}
                        size={28}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelMedium" style={styles.statLabel}>
                      Stock Total
                    </Text>
                    <Text variant="headlineSmall" style={styles.statValue}>
                      {stats?.total_stock?.toLocaleString() || 0}
                    </Text>
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content>
                    <View style={styles.statIconContainer}>
                      <IconButton
                        icon="cash"
                        iconColor={palette.success}
                        size={28}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelMedium" style={styles.statLabel}>
                      Valor Inventario
                    </Text>
                    <Text variant="headlineSmall" style={styles.statValue}>
                      {formatCurrency(stats?.inventory_value || 0)}
                    </Text>
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content>
                    <View style={styles.statIconContainer}>
                      <IconButton
                        icon="alert"
                        iconColor={palette.error}
                        size={14}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <Text variant="labelMedium" style={styles.statLabel}>
                      Stock Bajo
                    </Text>
                    <Text variant="headlineSmall" style={styles.statValue}>
                      {stats?.low_stock_products || 0}
                    </Text>
                  </Card.Content>
                </Card>
              </ScrollView>
            </View>
          </View>
          <View
            style={{
              flex: 0.7,
              backgroundColor: palette.primary,
            }}
          ></View>
          <View
            style={{
              flex: 0.3,
            }}
          ></View>
        </View>

        {/* Gráficas */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Análisis de Inventario
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        >
          {/* Salud del Stock */}
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Salud del Stock
              </Text>
              <ProgressChart
                data={stockHealthData}
                width={Dimensions.get("window").width - 60}
                height={200}
                strokeWidth={16}
                radius={32}
                chartConfig={{
                  backgroundColor: palette.background,
                  backgroundGradientFrom: palette.background,
                  backgroundGradientTo: palette.background,
                  color: (opacity = 1, index = 0) => {
                    const colors = [
                      palette.success,
                      palette.warning,
                      palette.error,
                    ];
                    return colors[index] || palette.primary;
                  },
                  labelColor: (opacity = 1) => palette.text,
                }}
                hideLegend={false}
              />
            </Card.Content>
          </Card>

          {/* Productos por Categoría */}
          {categoryData.length > 0 && (
            <Card style={styles.chartCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.chartTitle}>
                  Productos por Categoría
                </Text>
                <PieChart
                  data={categoryData}
                  width={Dimensions.get("window").width - 60}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => palette.text,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        {/* Opciones de Inventario */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Acciones Rápidas
        </Text>

        <Card style={styles.optionsCard}>
          <Card.Content style={{ padding: 0 }}>
            {inventoryOptions.map((option, index) => (
              <React.Fragment key={option.id}>
                <TouchableRipple
                  onPress={() => router.push(option.route as any)}
                  style={styles.optionItem}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: option.color + "20" },
                      ]}
                    >
                      <IconButton
                        icon={option.icon}
                        size={28}
                        iconColor={option.color}
                        style={{ margin: 0 }}
                      />
                    </View>

                    <View style={styles.optionText}>
                      <Text variant="titleMedium" style={styles.optionTitle}>
                        {option.title}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={styles.optionDescription}
                        numberOfLines={2}
                      >
                        {option.description}
                      </Text>
                    </View>

                    {option.badge !== undefined && option.badge > 0 && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: option.color },
                        ]}
                      >
                        <Text variant="labelSmall" style={styles.badgeText}>
                          {option.badge}
                        </Text>
                      </View>
                    )}

                    <IconButton
                      icon="chevron-right"
                      size={24}
                      iconColor={palette.textSecondary}
                      style={{ margin: 0 }}
                    />
                  </View>
                </TouchableRipple>

                {index < inventoryOptions.length - 1 && (
                  <Divider style={{ marginLeft: 80 }} />
                )}
              </React.Fragment>
            ))}
          </Card.Content>
        </Card>

        {/* Alertas */}
        {(stats?.low_stock_products || 0) > 0 && (
          <Card style={styles.alertCard}>
            <Card.Content>
              <View style={styles.alertContent}>
                <IconButton
                  icon="alert-circle"
                  size={24}
                  iconColor={palette.error}
                  style={{ margin: 0 }}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={styles.alertTitle}>
                    Productos con Stock Bajo
                  </Text>
                  <Text variant="bodySmall" style={styles.alertText}>
                    Hay {stats?.low_stock_products} productos que necesitan
                    reposición urgente. Revisa el inventario para evitar
                    desabastecimiento.
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
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
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  statCard: {
    width: 120,
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    color: palette.textSecondary,
    lineHeight: 12,
  },
  statValue: {
    fontWeight: "bold",
    color: palette.text,
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 8,
    marginTop: 8,
  },
  chartCard: {
    width: Dimensions.get("window").width - 40,
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
  },
  chartTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 12,
  },
  optionsCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  optionDescription: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  alertCard: {
    backgroundColor: palette.error + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  alertTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 4,
  },
  alertText: {
    color: palette.textSecondary,
    lineHeight: 20,
  },
});
