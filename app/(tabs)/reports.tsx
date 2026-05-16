import SkeletonLoader, { SkeletonCard } from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import React from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import {
  Button,
  Card,
  Chip,
  Icon,
  Modal,
  Portal,
  RadioButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

type Period = "today" | "week" | "month";
type Scope = "location" | "general";

interface TrendPoint {
  period: string;
  total: number;
}

interface PiePoint {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  sales: number;
}

interface ActivityItem {
  id: string;
  type: string;
  label: string;
  date: string | null;
  amount: number;
  money_type: "income" | "expense" | "none";
  location: string | null;
}

interface DashboardV2 {
  kpis: {
    sales: number;
    purchases: number;
    profit: number;
    net_profit: number;
  };
  mini_kpis: {
    movements_count: number;
    inventory_value: number;
    low_stock_products: number;
    total_stock: number;
  };
  cash: {
    income: number;
    expense: number;
    balance: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  sales_trend: TrendPoint[];
  sales_by_location: Array<{ name: string; value: number }>;
  top_products: TopProduct[];
  payment_methods: PiePoint[];
  recent_activity: ActivityItem[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateString?: string | null) {
  if (!dateString) {
    return "-";
  }

  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) {
    return "-";
  }

  return dt.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function normalizeDayLabel(raw: string) {
  if (!raw) {
    return "";
  }

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    return raw;
  }

  return dt.toLocaleDateString("es-MX", { weekday: "short" });
}

function moneyColor(type: ActivityItem["money_type"]) {
  if (type === "income") {
    return palette.success;
  }
  if (type === "expense") {
    return palette.red;
  }
  return palette.textSecondary;
}

function activityIcon(type: string) {
  if (type.startsWith("sale")) return "cash-register";
  if (type.startsWith("purchase")) return "cart";
  if (type.startsWith("expense")) return "cash-minus";
  if (type.startsWith("cash_income")) return "trending-up";
  if (type.startsWith("cash_expense")) return "trending-down";
  if (type.startsWith("transfer")) return "swap-horizontal";
  return "information";
}

function KpiCard(props: {
  title: string;
  value: string;
  icon: string;
  accentColor: string;
  changeLabel?: string;
}) {
  return (
    <Card style={styles.kpiCard} elevation={0}>
      <Card.Content style={styles.kpiCardContent}>
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIconWrap, { backgroundColor: props.accentColor + "20" }]}>
            <Icon source={props.icon} size={16} color={props.accentColor} />
          </View>
          {props.changeLabel ? (
            <Chip compact style={styles.kpiChip} textStyle={styles.kpiChipText}>
              {props.changeLabel}
            </Chip>
          ) : null}
        </View>

        <Text variant="bodySmall" style={styles.kpiTitle}>
          {props.title}
        </Text>

        <Text variant="headlineSmall" style={[styles.kpiValue, { color: props.accentColor }]}>
          {props.value}
        </Text>
      </Card.Content>
    </Card>
  );
}

function MiniCard(props: {
  title: string;
  value: string;
  icon: string;
  accentColor: string;
}) {
  return (
    <Card style={styles.miniCard}>
      <Card.Content style={styles.miniCardContent}>
        <View
          style={[
            styles.miniIcon,
            {
              backgroundColor: props.accentColor + "20",
            },
          ]}
        >
          <Icon source={props.icon} size={14} color={props.accentColor} />
        </View>
        <Text variant="labelSmall" style={styles.miniTitle}>
          {props.title}
        </Text>
        <Text variant="titleMedium" style={[styles.miniValue, { color: props.accentColor }]}>
          {props.value}
        </Text>
      </Card.Content>
    </Card>
  );
}

function FilterModal(props: {
  visible: boolean;
  onDismiss: () => void;
  selectedScope: Scope;
  onScopeChange: (scope: Scope) => void;
  currentLocationName?: string | null;
}) {
  return (
    <Portal>
      <Modal
        visible={props.visible}
        onDismiss={props.onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="titleLarge" style={{ fontWeight: "700", color: palette.text }}>
          Filtros de Reporte
        </Text>

        <View style={{ marginTop: 16, gap: 12 }}>
          <TouchableRipple
            onPress={() => props.onScopeChange("location")}
            style={[
              styles.scopeItem,
              props.selectedScope === "location" && styles.scopeItemSelected,
            ]}
          >
            <View style={styles.scopeContent}>
              <RadioButton
                value="location"
                status={
                  props.selectedScope === "location" ? "checked" : "unchecked"
                }
                onPress={() => props.onScopeChange("location")}
                color={palette.primary}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={styles.scopeTitle}>
                  Sucursal actual
                </Text>
                <Text variant="bodySmall" style={styles.scopeDescription}>
                  {props.currentLocationName || "Sin sucursal seleccionada"}
                </Text>
              </View>
            </View>
          </TouchableRipple>

          <TouchableRipple
            onPress={() => props.onScopeChange("general")}
            style={[
              styles.scopeItem,
              props.selectedScope === "general" && styles.scopeItemSelected,
            ]}
          >
            <View style={styles.scopeContent}>
              <RadioButton
                value="general"
                status={
                  props.selectedScope === "general" ? "checked" : "unchecked"
                }
                onPress={() => props.onScopeChange("general")}
                color={palette.primary}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={styles.scopeTitle}>
                  Consolidado
                </Text>
                <Text variant="bodySmall" style={styles.scopeDescription}>
                  Todas las sucursales
                </Text>
              </View>
            </View>
          </TouchableRipple>
        </View>

        <Button
          mode="contained"
          style={{ marginTop: 20 }}
          buttonColor={palette.primary}
          onPress={props.onDismiss}
        >
          Aplicar
        </Button>
      </Modal>
    </Portal>
  );
}

export default function ReportsScreen() {
  const { selectedLocation } = useSelectedLocation();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>("month");
  const [scope, setScope] = React.useState<Scope>("location");
  const [filterVisible, setFilterVisible] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<DashboardV2 | null>(null);

  const isWeb = Platform.OS === "web";
  const width = Dimensions.get("window").width;
  const isWide = width >= 1024;
  const chartWidth = isWide ? Math.min((width - 100) / 2, 530) : width - 56;

  const loadDashboard = React.useCallback(async () => {
    try {
      const response = await Services.reportsV2.dashboard({
        period: selectedPeriod,
        scope,
      });
      setDashboard(response.data?.data ?? null);
    } catch (error) {
      console.error("reports v2 load error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope, selectedPeriod]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const periodLabel = React.useMemo(() => {
    if (selectedPeriod === "today") return "Hoy";
    if (selectedPeriod === "week") return "Semana";
    return "Mes";
  }, [selectedPeriod]);

  const locationPie = React.useMemo(() => {
    const rows = dashboard?.sales_by_location || [];
    if (!rows.length) {
      return [] as any[];
    }

    const total = rows.reduce((acc, row) => acc + row.value, 0) || 1;
    const paletteColors = [
      palette.success,
      palette.blue,
      palette.warning,
      palette.red,
      palette.primary,
    ];

    return rows.map((row, index) => ({
      name: `${row.name}: ${Math.round((row.value / total) * 100)}%`,
      population: row.value,
      color: paletteColors[index % paletteColors.length],
      legendFontColor: palette.text,
      legendFontSize: 12,
    }));
  }, [dashboard]);

  const paymentProgress = React.useMemo(() => {
    const rows = dashboard?.payment_methods || [];
    const total = rows.reduce((acc, row) => acc + row.value, 0) || 1;

    return rows.map((row) => ({
      ...row,
      percent: Math.round((row.value / total) * 100),
    }));
  }, [dashboard]);

  const topProductMax = React.useMemo(() => {
    const values = (dashboard?.top_products || []).map((p) => p.sales || 0);
    return values.length ? Math.max(...values) : 1;
  }, [dashboard]);

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <SkeletonLoader width="100%" height={120} borderRadius={18} />
          <View style={styles.kpiRow}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>
          <View style={styles.kpiRow}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>
          <SkeletonLoader width="100%" height={260} borderRadius={16} />
          <SkeletonLoader width="100%" height={320} borderRadius={16} />
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
        <View style={styles.content}>
          <View style={styles.topBar}>
            <View>
              <Text variant="headlineMedium" style={styles.title}>
                Reportes
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Vista {scope === "location" ? "por sucursal" : "consolidada"} · {periodLabel}
              </Text>
            </View>

            <Button
              mode="outlined"
              textColor={palette.primary}
              onPress={() => setFilterVisible(true)}
            >
              Filtros
            </Button>
          </View>

          <View style={styles.periodRow}>
            <Chip
              selected={selectedPeriod === "today"}
              style={[
                styles.periodChip,
                selectedPeriod === "today" && styles.periodChipSelected,
              ]}
              onPress={() => {
                setLoading(true);
                setSelectedPeriod("today");
              }}
            >
              Hoy
            </Chip>
            <Chip
              selected={selectedPeriod === "week"}
              style={[
                styles.periodChip,
                selectedPeriod === "week" && styles.periodChipSelected,
              ]}
              onPress={() => {
                setLoading(true);
                setSelectedPeriod("week");
              }}
            >
              Semana
            </Chip>
            <Chip
              selected={selectedPeriod === "month"}
              style={[
                styles.periodChip,
                selectedPeriod === "month" && styles.periodChipSelected,
              ]}
              onPress={() => {
                setLoading(true);
                setSelectedPeriod("month");
              }}
            >
              Mes
            </Chip>
          </View>

          <View style={styles.kpiRow}>
            <KpiCard
              title="Ventas"
              value={formatCurrency(dashboard?.kpis.sales || 0)}
              icon="trending-up"
              accentColor={palette.success}
            />
            <KpiCard
              title="Compras"
              value={formatCurrency(dashboard?.kpis.purchases || 0)}
              icon="cart"
              accentColor={palette.warning}
            />
            <KpiCard
              title="Ganancia"
              value={formatCurrency(dashboard?.kpis.profit || 0)}
              icon="cash"
              accentColor={palette.primary}
            />
          </View>

          <View style={styles.kpiRow}>
            <MiniCard
              title="Movimientos"
              value={String(dashboard?.mini_kpis.movements_count || 0)}
              icon="swap-vertical"
              accentColor={palette.blue}
            />
            <MiniCard
              title="Inventario"
              value={formatCurrency(dashboard?.mini_kpis.inventory_value || 0)}
              icon="package-variant"
              accentColor={palette.primary}
            />
            <MiniCard
              title="Stock Bajo"
              value={String(dashboard?.mini_kpis.low_stock_products || 0)}
              icon="alert-circle"
              accentColor={palette.red}
            />
          </View>

          <View style={[styles.mainChartsRow, !isWide && { flexDirection: "column" }]}>
            <Card style={styles.panelCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.panelTitle}>
                  Tendencia de Ventas
                </Text>
                <LineChart
                  data={{
                    labels:
                      (dashboard?.sales_trend || []).map((point) =>
                        normalizeDayLabel(point.period)
                      ) || [],
                    datasets: [
                      {
                        data:
                          (dashboard?.sales_trend || []).map((point) =>
                            Number(point.total || 0)
                          ) || [0],
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={220}
                  yAxisLabel="$"
                  yAxisSuffix=""
                  fromZero
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFrom: "transparent",
                    backgroundGradientTo: "transparent",
                    decimalPlaces: 0,
                    color: () => palette.warning,
                    labelColor: () => palette.textSecondary,
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: palette.warning,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </Card.Content>
            </Card>

            <Card style={styles.panelCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.panelTitle}>
                  Ventas por Sucursal
                </Text>
                {locationPie.length ? (
                  <PieChart
                    data={locationPie}
                    width={chartWidth}
                    height={220}
                    chartConfig={{
                      color: () => palette.text,
                      labelColor: () => palette.textSecondary,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="8"
                    absolute
                  />
                ) : (
                  <Text style={styles.emptyText}>No hay datos para mostrar.</Text>
                )}
              </Card.Content>
            </Card>
          </View>

          <View
            style={[
              styles.bottomRow,
              !isWide && {
                flexDirection: "column",
              },
            ]}
          >
            <Card style={styles.panelCard}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Text variant="titleMedium" style={styles.panelTitle}>
                    Top 5 Productos Más Vendidos
                  </Text>
                </View>

                {(dashboard?.top_products || []).map((product, idx) => {
                  const widthPct = Math.max(
                    8,
                    Math.round(((product.sales || 0) / topProductMax) * 100)
                  );

                  return (
                    <View key={`${product.name}-${idx}`} style={styles.productRow}>
                      <Text variant="bodySmall" style={styles.productLabel}>
                        {product.name}
                      </Text>
                      <View style={styles.productBarTrack}>
                        <View
                          style={[
                            styles.productBarFill,
                            {
                              width: `${widthPct}%`,
                              backgroundColor: palette.success,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>

            <Card style={styles.panelCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.panelTitle}>
                  Métodos de Pago
                </Text>

                {(paymentProgress || []).map((method, idx) => (
                  <View key={`${method.name}-${idx}`} style={{ marginBottom: 10 }}>
                    <View style={styles.paymentRowHeader}>
                      <Text variant="bodySmall" style={{ color: palette.text }}>
                        {method.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                        {method.percent}%
                      </Text>
                    </View>
                    <View style={styles.paymentTrack}>
                      <View
                        style={[
                          styles.paymentFill,
                          {
                            width: `${method.percent}%`,
                            backgroundColor: method.color || palette.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}

                <View style={styles.divider} />

                <Text
                  variant="titleSmall"
                  style={{ color: palette.text, fontWeight: "700", marginBottom: 10 }}
                >
                  Actividad Reciente
                </Text>

                {(dashboard?.recent_activity || []).slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <View style={styles.activityIcon}>
                      <Icon
                        source={activityIcon(item.type)}
                        size={16}
                        color={moneyColor(item.money_type)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySmall" style={{ color: palette.text, fontWeight: "600" }}>
                        {item.label}
                      </Text>
                      <Text variant="labelSmall" style={{ color: palette.textSecondary }}>
                        {formatDate(item.date)} {item.location ? `· ${item.location}` : ""}
                      </Text>
                    </View>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: moneyColor(item.money_type),
                        fontWeight: "700",
                      }}
                    >
                      {item.money_type === "none" ? "-" : formatCurrency(item.amount)}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </View>
        </View>
      </ScrollView>

      <FilterModal
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        selectedScope={scope}
        currentLocationName={selectedLocation?.name}
        onScopeChange={(nextScope) => {
          setScope(nextScope);
          setLoading(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f6",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 14,
  },
  topBar: {
    backgroundColor: palette.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  periodRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  periodChip: {
    backgroundColor: palette.surface,
  },
  periodChipSelected: {
    backgroundColor: palette.primary + "25",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: palette.border,
    elevation: 0,
    boxShadow: "transparent",
  },
  kpiCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  kpiChip: {
    backgroundColor: palette.surface,
    height: 20,
  },
  kpiChipText: {
    color: palette.textSecondary,
    fontSize: 10,
  },
  kpiTitle: {
    color: palette.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontWeight: "800",
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    elevation: 0,
    backgroundColor: "#fff",
  },
  miniCardContent: {
    paddingVertical: 12,
    alignItems: "flex-start",
    gap: 6,
  },
  miniIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  miniTitle: {
    color: palette.textSecondary,
  },
  miniValue: {
    color: palette.text,
    fontWeight: "700",
  },
  mainChartsRow: {
    flexDirection: "row",
    gap: 14,
  },
  panelCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    elevation: 0,
    backgroundColor: palette.surface,
  },
  panelTitle: {
    color: palette.text,
    fontWeight: "700",
    marginBottom: 10,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 12,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
    paddingVertical: 40,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productRow: {
    marginBottom: 12,
  },
  productLabel: {
    color: palette.textSecondary,
    marginBottom: 5,
  },
  productBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.surface,
    overflow: "hidden",
  },
  productBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  paymentRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  paymentTrack: {
    backgroundColor: palette.surface,
    borderRadius: 5,
    height: 9,
    overflow: "hidden",
  },
  paymentFill: {
    height: "100%",
    borderRadius: 5,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 10,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.surface,
  },
  modalContainer: {
    backgroundColor: palette.card,
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  scopeItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  scopeItemSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary + "10",
  },
  scopeContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  scopeTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  scopeDescription: {
    color: palette.textSecondary,
    marginTop: 2,
  },
});