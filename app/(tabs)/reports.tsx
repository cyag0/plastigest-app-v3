import SkeletonLoader, {
  SkeletonCard,
  SkeletonChart,
} from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Modal,
  Portal,
  RadioButton,
  Text,
  TouchableRipple,
} from "react-native-paper";
import Carousel from "react-native-reanimated-carousel";

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

interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedScope: "location" | "general";
  onScopeChange: (scope: "location" | "general") => void;
  currentLocation?: { id: number; name: string } | null;
  onChangeLocation: () => void;
}

function FilterModal({
  visible,
  onDismiss,
  selectedScope,
  onScopeChange,
  currentLocation,
  onChangeLocation,
}: FilterModalProps) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: palette.card,
          marginHorizontal: 20,
          borderRadius: 16,
          padding: 24,
        }}
      >
        <View style={{ gap: 20 }}>
          <View>
            <Text
              variant="headlineSmall"
              style={{ fontWeight: "bold", color: palette.text }}
            >
              Filtros de Dashboard
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: palette.textSecondary, marginTop: 4 }}
            >
              Selecciona el alcance de los datos
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              variant="titleSmall"
              style={{ fontWeight: "600", color: palette.text }}
            >
              Alcance de datos
            </Text>

            <TouchableRipple
              onPress={() => onScopeChange("location")}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor:
                  selectedScope === "location"
                    ? palette.primary
                    : palette.surface,
                backgroundColor:
                  selectedScope === "location"
                    ? palette.primary + "10"
                    : palette.surface,
              }}
            >
              <View
                style={{
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <RadioButton
                  value="location"
                  status={
                    selectedScope === "location" ? "checked" : "unchecked"
                  }
                  onPress={() => onScopeChange("location")}
                  color={palette.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: "600", color: palette.text }}
                  >
                    Por Sucursal
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary, marginTop: 2 }}
                  >
                    {currentLocation
                      ? currentLocation.name
                      : "Ninguna sucursal seleccionada"}
                  </Text>
                </View>
                {currentLocation && (
                  <IconButton
                    icon="pencil"
                    size={20}
                    iconColor={palette.primary}
                    onPress={onChangeLocation}
                    style={{ margin: 0 }}
                  />
                )}
              </View>
            </TouchableRipple>

            <TouchableRipple
              onPress={() => onScopeChange("general")}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor:
                  selectedScope === "general"
                    ? palette.primary
                    : palette.surface,
                backgroundColor:
                  selectedScope === "general"
                    ? palette.primary + "10"
                    : palette.surface,
              }}
            >
              <View
                style={{
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <RadioButton
                  value="general"
                  status={selectedScope === "general" ? "checked" : "unchecked"}
                  onPress={() => onScopeChange("general")}
                  color={palette.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: "600", color: palette.text }}
                  >
                    General
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary, marginTop: 2 }}
                  >
                    Todas las sucursales
                  </Text>
                </View>
              </View>
            </TouchableRipple>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={{ flex: 1 }}
              textColor={palette.textSecondary}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={onDismiss}
              style={{ flex: 1 }}
              buttonColor={palette.primary}
            >
              Aplicar
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

function Statistic(props: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <Card
      style={{
        flex: 1,
        backgroundColor: palette.card,
        borderRadius: 12,
        elevation: 2,
      }}
    >
      <Card.Content
        style={{
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 8,
        }}
      >
        <Text
          variant="labelSmall"
          style={{
            color: palette.textSecondary,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {props.label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon source={props.icon} color={props.color} size={32} />
          <Text
            variant="headlineMedium"
            style={{
              color: palette.text,
              fontWeight: "bold",
            }}
          >
            {props.value}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dashboardData, setDashboardData] =
    React.useState<DashboardData | null>(null);
  const [recentMovements, setRecentMovements] = React.useState<
    RecentMovement[]
  >([]);
  const [movementsByType, setMovementsByType] =
    React.useState<MovementsByType | null>(null);
  const [topProducts, setTopProducts] = React.useState<TopProduct[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    "today" | "week" | "month"
  >("month");
  const [filterModalVisible, setFilterModalVisible] = React.useState(false);
  const [dataScope, setDataScope] = React.useState<"location" | "general">(
    "location"
  );

  const loadData = async () => {
    try {
      const params = {
        scope: dataScope,
        period: selectedPeriod,
      };

      const [
        dashboardResponse,
        movementsResponse,
        movementsByTypeResponse,
        topProductsResponse,
      ] = await Promise.all([
        Services.reports.dashboard(params),
        Services.reports.recentMovements({ ...params, limit: 10 }),
        Services.reports.movementsByType(params),
        Services.reports.topProducts({ ...params, limit: 5 }),
      ]);

      setDashboardData(dashboardResponse.data.data);
      setRecentMovements(movementsResponse.data.data);
      setMovementsByType(movementsByTypeResponse.data.data);
      setTopProducts(topProductsResponse.data.data);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [dataScope, selectedPeriod]);

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

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={{ padding: 20 }}>
          {/* Header skeleton */}
          <SkeletonLoader
            width="100%"
            height={180}
            borderRadius={12}
            style={{ marginBottom: 16 }}
          />

          {/* Stats cards skeleton */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>

          {/* Charts skeleton */}
          <SkeletonChart style={{ marginBottom: 16 }} />
          <SkeletonChart />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text variant="displaySmall" style={styles.headerTitle}>
                Dashboard
              </Text>
              <Text variant="bodyLarge" style={styles.headerSubtitle}>
                Análisis y métricas del negocio
              </Text>
            </View>

            <View style={styles.headerIconContainer}>
              <View style={styles.headerIcon}>
                <Icon source="chart-box" size={40} color={palette.primary} />
              </View>
            </View>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <Chip
              mode="flat"
              selected={selectedPeriod === "today"}
              onPress={() => setSelectedPeriod("today")}
              style={[
                styles.periodChip,
                selectedPeriod === "today" && styles.periodChipSelected,
              ]}
              textStyle={[
                styles.periodChipText,
                selectedPeriod === "today" && styles.periodChipTextSelected,
              ]}
            >
              Hoy
            </Chip>
            <Chip
              mode="flat"
              selected={selectedPeriod === "week"}
              onPress={() => setSelectedPeriod("week")}
              style={[
                styles.periodChip,
                selectedPeriod === "week" && styles.periodChipSelected,
              ]}
              textStyle={[
                styles.periodChipText,
                selectedPeriod === "week" && styles.periodChipTextSelected,
              ]}
            >
              Semana
            </Chip>
            <Chip
              mode="flat"
              selected={selectedPeriod === "month"}
              onPress={() => setSelectedPeriod("month")}
              style={[
                styles.periodChip,
                selectedPeriod === "month" && styles.periodChipSelected,
              ]}
              textStyle={[
                styles.periodChipText,
                selectedPeriod === "month" && styles.periodChipTextSelected,
              ]}
            >
              Mes
            </Chip>
          </View>
        </View>

        {/* Location Banner */}
        <View style={styles.locationBanner}>
          <View style={styles.locationBannerContent}>
            <View style={styles.locationBannerIcon}>
              <Icon
                source={dataScope === "location" ? "map-marker" : "earth"}
                size={20}
                color={palette.info}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" style={styles.locationBannerLabel}>
                {dataScope === "location"
                  ? "Datos de sucursal"
                  : "Datos generales"}
              </Text>
              <Text variant="bodyMedium" style={styles.locationBannerText}>
                {dataScope === "location"
                  ? selectedLocation?.name || "Ninguna sucursal seleccionada"
                  : "Todas las sucursales"}
              </Text>
            </View>
            <IconButton
              icon="tune"
              size={20}
              iconColor={palette.primary}
              onPress={() => setFilterModalVisible(true)}
              style={{ margin: 0 }}
            />
          </View>
        </View>

        <View
          style={[
            styles.scrollContent,
            {
              backgroundColor: palette.background,
            },
          ]}
        >
          {/* Statistics Grid - 6 cards in 2 rows */}
          <View style={styles.statisticsGrid}>
            {/* First Row */}
            <View style={styles.statisticsRow}>
              <Statistic
                icon="trending-up"
                value={formatCurrency(dashboardData?.sales || 0)}
                label="Ventas"
                color={palette.success}
              />
              <Statistic
                icon="cart"
                value={formatCurrency(dashboardData?.purchases || 0)}
                label="Compras"
                color={palette.error}
              />
              <Statistic
                icon="cash-multiple"
                value={formatCurrency(dashboardData?.profit || 0)}
                label="Ganancia"
                color={palette.primary}
              />
            </View>
            {/* Second Row */}
            <View style={styles.statisticsRow}>
              <Statistic
                icon="swap-vertical"
                value={dashboardData?.movements_count || 0}
                label="Movimientos"
                color={palette.blue}
              />
              <Statistic
                icon="package-variant"
                value={formatCurrency(dashboardData?.inventory_value || 0)}
                label="Inventario"
                color={palette.accent}
              />
              <Statistic
                icon="alert-circle"
                value={dashboardData?.low_stock_products || 0}
                label="Stock Bajo"
                color={palette.red}
              />
            </View>
          </View>

          {/* Charts Carousel */}
          <View style={{ height: 280, marginBottom: 16 }}>
            <Carousel
              loop
              width={Dimensions.get("window").width - 40}
              height={280}
              autoPlay={true}
              autoPlayInterval={5000}
              pagingEnabled={true}
              snapEnabled={true}
              mode="parallax"
              data={[
                { type: "sales-trend", color: palette.primary },
                { type: "sales-by-location", color: palette.info },
                { type: "top-products", color: palette.success },
                { type: "payment-methods", color: palette.secondary },
                { type: "low-stock", color: palette.warning },
              ]}
              scrollAnimationDuration={1000}
              renderItem={({ item }: { item: any }) => (
                <CarrouselCard
                  type={item.type}
                  color={item.color}
                  dataScope={dataScope}
                  selectedPeriod={selectedPeriod}
                  locationName={selectedLocation?.name}
                />
              )}
            />
          </View>

          {/* Top 5 Productos */}
          <View style={{ marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
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

            {topProducts.map((product, index) => (
              <Card key={index} style={styles.productCard}>
                <Card.Content style={styles.productCardContent}>
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
                        color: index === 0 ? palette.success : palette.text,
                        fontWeight: "bold",
                      }}
                    >
                      #{index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodyMedium"
                      style={{ fontWeight: "600", color: palette.text }}
                    >
                      {product.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon
                          source="package-variant"
                          size={14}
                          color={palette.textSecondary}
                        />
                        <Text
                          variant="bodySmall"
                          style={{ color: palette.textSecondary }}
                        >
                          {product.quantity} uds
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon source="cash" size={14} color={palette.success} />
                        <Text
                          variant="bodySmall"
                          style={{ color: palette.success, fontWeight: "600" }}
                        >
                          {formatCurrency(product.sales)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>

          {/* Actividad Reciente */}
          <View style={{ marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
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

            {(recentMovements || []).slice(0, 5).map((movement) => (
              <Card key={movement.id} style={styles.movementCard}>
                <Card.Content style={styles.movementCardContent}>
                  <View
                    style={[
                      styles.movementIcon,
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
                    <Icon
                      source={
                        movement.movement_type === "entry"
                          ? "arrow-down"
                          : movement.movement_type === "exit"
                          ? "arrow-up"
                          : "swap-horizontal"
                      }
                      color={
                        movement.movement_type === "entry"
                          ? palette.success
                          : movement.movement_type === "exit"
                          ? palette.error
                          : palette.info
                      }
                      size={24}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodyMedium"
                      style={{ fontWeight: "600", color: palette.text }}
                    >
                      {movement.movement_reason_label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon
                          source="calendar"
                          size={14}
                          color={palette.textSecondary}
                        />
                        <Text
                          variant="bodySmall"
                          style={{ color: palette.textSecondary }}
                        >
                          {formatDate(movement.movement_date)}
                        </Text>
                      </View>
                      {movement.products_count > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon
                            source="package-variant"
                            size={14}
                            color={palette.textSecondary}
                          />
                          <Text
                            variant="bodySmall"
                            style={{ color: palette.textSecondary }}
                          >
                            {movement.products_count} productos
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {movement.generated_money && movement.total_cost > 0 && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        variant="titleSmall"
                        style={{
                          color: getMoneyTypeColor(movement.money_type),
                          fontWeight: "bold",
                        }}
                      >
                        {formatCurrency(movement.total_cost)}
                      </Text>
                      <Chip
                        style={{
                          backgroundColor:
                            getMoneyTypeColor(movement.money_type) + "20",
                          marginTop: 4,
                        }}
                        textStyle={{
                          color: getMoneyTypeColor(movement.money_type),
                          fontSize: 10,
                        }}
                      >
                        {movement.money_type === "income"
                          ? "Ingreso"
                          : "Egreso"}
                      </Chip>
                    </View>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>

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

            <Card style={[styles.alertCard, { borderLeftColor: palette.blue }]}>
              <Card.Content>
                <View style={styles.alertContent}>
                  <IconButton
                    icon="package-variant"
                    iconColor={palette.blue}
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

      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        selectedScope={dataScope}
        onScopeChange={(scope) => {
          setDataScope(scope);
          // TODO: Reload data based on new scope
        }}
        currentLocation={selectedLocation}
        onChangeLocation={() => {
          setFilterModalVisible(false);
          router.push("/(tabs)/home/locations" as any);
        }}
      />
    </View>
  );
}
interface CarouselCardProps {
  type: string;
  color: string;
  dataScope: "location" | "general";
  selectedPeriod: "today" | "week" | "month";
  locationName?: string;
}

function CarrouselCard({
  type,
  color,
  dataScope,
  selectedPeriod,
  locationName,
}: CarouselCardProps) {
  const [chartData, setChartData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const chartWidth = Dimensions.get("window").width - 80;

  React.useEffect(() => {
    loadChartData();
  }, [dataScope, selectedPeriod, type]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const params = { scope: dataScope, period: selectedPeriod };

      switch (type) {
        case "sales-trend":
          const trendResponse = await Services.reports.salesTrend(params);
          setChartData(trendResponse.data.data);
          break;
        case "sales-by-location":
          const locationResponse = await Services.reports.salesByLocation(
            params
          );
          setChartData(locationResponse.data.data);
          break;
        case "top-products":
          const productsResponse = await Services.reports.topProducts({
            ...params,
            limit: 5,
          });
          setChartData(productsResponse.data.data);
          break;
        case "payment-methods":
          const paymentsResponse = await Services.reports.paymentMethods(
            params
          );
          setChartData(paymentsResponse.data.data);
          break;
        case "low-stock":
          const lowStockResponse = await Services.reports.lowStockProducts({
            ...params,
            limit: 5,
          });
          setChartData(lowStockResponse.data.data);
          break;
      }
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart config
  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces: 0,
    color: (opacity = 1) => color,
    labelColor: (opacity = 1) => palette.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: color,
    },
  };

  if (type === "sales-trend") {
    // Procesar datos de tendencia
    const salesData = Array.isArray(chartData) ? chartData : [];
    const labels = salesData.map((item: any) => {
      if (selectedPeriod === "today") {
        return item.period || "";
      } else if (selectedPeriod === "week") {
        // Mapear nombres de días
        const dayNames: any = {
          Monday: "Lun",
          Tuesday: "Mar",
          Wednesday: "Mié",
          Thursday: "Jue",
          Friday: "Vie",
          Saturday: "Sáb",
          Sunday: "Dom",
        };
        return dayNames[item.period] || item.period;
      } else {
        return `S${item.period}` || "";
      }
    });
    const values = salesData.map((item: any) => parseFloat(item.total) || 0);

    // Si no hay datos, mostrar mensaje
    if (values.length === 0 || values.every((v: number) => v === 0)) {
      return (
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: color + "15",
              borderWidth: 2,
              borderColor: color + "30",
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Tendencia de Ventas
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingVertical: 40,
                color: palette.textSecondary,
              }}
            >
              No hay datos de ventas en este período
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card
        style={[
          styles.chartCard,
          {
            backgroundColor: color + "15",
            borderWidth: 2,
            borderColor: color + "30",
          },
        ]}
      >
        <Card.Content>
          {loading || !chartData ? (
            <SkeletonChart />
          ) : (
            <>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Tendencia de Ventas (
                {selectedPeriod === "today"
                  ? "Hoy"
                  : selectedPeriod === "week"
                  ? "Semana"
                  : "Mes"}
                )
              </Text>
              <LineChart
                data={{
                  labels: labels.length > 0 ? labels : ["Sin datos"],
                  datasets: [
                    {
                      data: values.length > 0 ? values : [0],
                    },
                  ],
                }}
                width={chartWidth}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientTo: color,
                  backgroundGradientToOpacity: 0.1,
                  propsForBackgroundLines: {
                    stroke: palette.border,
                    strokeDasharray: "",
                    strokeWidth: 1,
                    opacity: 0.3,
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </>
          )}
        </Card.Content>
      </Card>
    );
  }

  if (type === "sales-by-location") {
    const locationSales = Array.isArray(chartData) ? chartData : [];
    const labels = locationSales.map((l: any) =>
      l.name && l.name.length > 10
        ? l.name.substring(0, 10) + "..."
        : l.name || "Sin nombre"
    );
    const values = locationSales.map((l: any) => parseFloat(l.value) || 0);

    if (values.length === 0 || values.every((v: number) => v === 0)) {
      return (
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: color + "15",
              borderWidth: 2,
              borderColor: color + "30",
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Ventas por Sucursal
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingVertical: 40,
                color: palette.textSecondary,
              }}
            >
              No hay datos de ventas por sucursal
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card
        style={[
          styles.chartCard,
          {
            backgroundColor: color + "15",
            borderWidth: 2,
            borderColor: color + "30",
          },
        ]}
      >
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Ventas por Sucursal
          </Text>
          <BarChart
            data={{
              labels: labels,
              datasets: [
                {
                  data: values,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            yAxisLabel="$"
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              backgroundGradientFrom: "#ffffff",
              backgroundGradientFromOpacity: 0,
              backgroundGradientTo: color,
              backgroundGradientToOpacity: 0.05,
              propsForBackgroundLines: {
                stroke: palette.border,
                strokeDasharray: "",
                strokeWidth: 1,
                opacity: 0.3,
              },
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
            showValuesOnTopOfBars
            fromZero
          />
        </Card.Content>
      </Card>
    );
  }

  if (type === "top-products") {
    const topProducts = Array.isArray(chartData) ? chartData : [];
    const labels = topProducts.map((p: any) =>
      p.name && p.name.length > 8
        ? p.name.substring(0, 8) + "."
        : p.name || "Sin nombre"
    );
    const values = topProducts.map((p: any) => parseFloat(p.quantity) || 0);

    if (values.length === 0 || values.every((v: number) => v === 0)) {
      return (
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: color + "15",
              borderWidth: 2,
              borderColor: color + "30",
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Top 5 Productos Más Vendidos
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingVertical: 40,
                color: palette.textSecondary,
              }}
            >
              No hay datos de productos vendidos
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card
        style={[
          styles.chartCard,
          {
            backgroundColor: color + "15",
            borderWidth: 2,
            borderColor: color + "30",
          },
        ]}
      >
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Top 5 Productos Más Vendidos
          </Text>
          <BarChart
            data={{
              labels: labels,
              datasets: [
                {
                  data: values,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" u"
            chartConfig={{
              ...chartConfig,
              backgroundGradientFrom: "#ffffff",
              backgroundGradientFromOpacity: 0,
              backgroundGradientTo: color,
              backgroundGradientToOpacity: 0.05,
              propsForBackgroundLines: {
                stroke: palette.border,
                strokeDasharray: "",
                strokeWidth: 1,
                opacity: 0.3,
              },
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16,
            }}
            showValuesOnTopOfBars
            fromZero
          />
        </Card.Content>
      </Card>
    );
  }

  if (type === "payment-methods") {
    const paymentMethods = Array.isArray(chartData) ? chartData : [];

    if (paymentMethods.length === 0) {
      return (
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: color + "15",
              borderWidth: 2,
              borderColor: color + "30",
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Métodos de Pago
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingVertical: 40,
                color: palette.textSecondary,
              }}
            >
              No hay datos de métodos de pago
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card
        style={[
          styles.chartCard,
          {
            backgroundColor: color + "15",
            borderWidth: 2,
            borderColor: color + "30",
          },
        ]}
      >
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Métodos de Pago
          </Text>
          <PieChart
            data={paymentMethods.map((pm: any) => ({
              name: pm.name || "Sin especificar",
              population: parseFloat(pm.value) || 0,
              color: pm.color || palette.textSecondary,
              legendFontColor: palette.text,
              legendFontSize: 12,
            }))}
            width={chartWidth}
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

  if (type === "low-stock") {
    const lowStockItems = Array.isArray(chartData) ? chartData : [];

    if (lowStockItems.length === 0) {
      return (
        <Card
          style={[
            styles.chartCard,
            {
              backgroundColor: color + "15",
              borderWidth: 2,
              borderColor: color + "30",
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Productos con Stock Bajo
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingVertical: 40,
                color: palette.textSecondary,
              }}
            >
              No hay productos con stock bajo
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card
        style={[
          styles.chartCard,
          {
            backgroundColor: color + "15",
            borderWidth: 2,
            borderColor: color + "30",
          },
        ]}
      >
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Productos con Stock Bajo
          </Text>
          <View style={{ gap: 12, marginTop: 8 }}>
            {lowStockItems.map((item: any, index: number) => (
              <View key={index}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    variant="bodyMedium"
                    style={{ fontWeight: "600", color: palette.text }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary }}
                  >
                    {Math.round(item.current)} / {Math.round(item.min)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: palette.surface,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.min(
                        parseFloat(item.percentage) * 100,
                        100
                      )}%`,
                      backgroundColor:
                        item.percentage < 0.3
                          ? palette.error
                          : item.percentage < 0.6
                          ? palette.warning
                          : palette.success,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  }

  return <View />;
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
    backgroundColor: palette.background,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: palette.textSecondary,
  },
  headerIconContainer: {
    marginLeft: 16,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: palette.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.surface,
  },
  periodChipSelected: {
    backgroundColor: palette.primary + "20",
    borderColor: palette.primary,
  },
  periodChipText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  periodChipTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
  locationBanner: {
    backgroundColor: palette.info + "15",
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
  },
  locationBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  locationBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.info + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  locationBannerLabel: {
    color: palette.info,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  locationBannerText: {
    color: palette.text,
    fontWeight: "600",
    marginTop: 2,
  },
  statisticsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statisticsRow: {
    flexDirection: "row",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  productCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  productCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  movementCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  movementCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  movementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  chartCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  chartTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 12,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
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
