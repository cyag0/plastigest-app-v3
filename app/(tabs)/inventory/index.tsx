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
  Icon,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";
import Carousel from "react-native-reanimated-carousel";

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

  function Statistic(props: { icon: string; value: number; label: string }) {
    return (
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Icon source={props.icon} color={"#fff"} size={32} />
          <Text
            variant="headlineSmall"
            style={{
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {props.value}
          </Text>
        </View>
        <Text
          variant="labelMedium"
          style={{
            color: "#eee",
            lineHeight: 8,
          }}
        >
          {props.label}
        </Text>
      </View>
    );
  }

  const statistics = [
    {
      icon: "cube-outline",
      value: stats?.total_products || 0,
      label: "Total Productos",
    },
    {
      icon: "warehouse",
      value: stats?.total_stock || 0,
      label: "Stock Total",
    },
    {
      icon: "cash",
      value: stats?.inventory_value || 0,
      label: "Valor Inventario",
    },
    /*     {
      icon: "alert",
      value: stats?.low_stock_products || 0,
      label: "Stock Bajo",
    },
    {
      icon: "close-circle-outline",
      value: stats?.out_of_stock_products || 0,
      label: "Sin Stock",
    }, */
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ height: 240, marginBottom: 16 }}>
          <Carousel
            loop
            width={Dimensions.get("window").width - 40}
            height={280}
            autoPlay={true}
            autoPlayInterval={2000}
            pagingEnabled={true}
            snapEnabled={true}
            mode="parallax"
            data={[
              { type: "stats", color: palette.primary },
              { type: "health", color: palette.info },
              { type: "category", color: palette.accent },
            ]}
            scrollAnimationDuration={1000}
            renderItem={({ item, index }: { item: any; index: number }) => {
              if (item.type === "stats") {
                return (
                  <View
                    style={{
                      backgroundColor: palette.primary,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 24,
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* Content */}
                    <View
                      style={{
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
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

                    <View
                      style={{
                        gap: 16,
                        paddingBottom: 16,
                        marginTop: 20,
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                    >
                      {statistics.map((stat) => (
                        <Statistic
                          key={stat.label}
                          icon={stat.icon}
                          value={stat.value}
                          label={stat.label}
                        />
                      ))}
                    </View>
                  </View>
                );
              }

              if (item.type === "health") {
                return (
                  <Card
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: item.color + "15",
                        borderWidth: 2,
                        borderColor: item.color + "30",
                      },
                    ]}
                  >
                    <Card.Content>
                      <Text variant="titleMedium" style={styles.chartTitle}>
                        Salud del Stock
                      </Text>
                      <ProgressChart
                        data={stockHealthData}
                        width={Dimensions.get("window").width - 80}
                        height={200}
                        strokeWidth={16}
                        radius={32}
                        chartConfig={{
                          backgroundColor: "transparent",
                          backgroundGradientFrom: "transparent",
                          backgroundGradientTo: "transparent",
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
                );
              }

              if (item.type === "category" && categoryData.length > 0) {
                return (
                  <Card
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: item.color + "15",
                        borderWidth: 2,
                        borderColor: item.color + "30",
                      },
                    ]}
                  >
                    <Card.Content>
                      <Text variant="titleMedium" style={styles.chartTitle}>
                        Productos por Categoría
                      </Text>
                      <PieChart
                        data={categoryData}
                        width={Dimensions.get("window").width - 80}
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
                );
              }

              return null;
            }}
          />
        </View>

        {/* Opciones de Inventario */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Acciones Rápidas
          </Text>
        </View>

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
                    style={[styles.badge, { backgroundColor: option.color }]}
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

        {/* Alertas */}
        {(stats?.low_stock_products || 0) > 0 && (
          <View style={{ paddingHorizontal: 16 }}>
            <Card style={[styles.alertCard, { marginTop: 16 }]}>
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
          </View>
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
    paddingTop: 0,
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
