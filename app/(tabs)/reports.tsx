/**
 * ReportsScreen v2 — SaaS 2025.
 *
 * Rediseño completo del dashboard de reportes usando el nuevo
 * sistema de diseño (tokens, palette v2, KpiCard, AppChip,
 * SectionHeader, EmptyState). Mantiene la estructura de datos
 * del backend (DashboardV2) y agrega dos secciones nuevas:
 *
 * - Producción hoy: módulo nuevo agregado al backend, con
 *   cocos procesados, agua extraída, pulpa producida y % de
 *   merma. Usa /production-orders/today-stats.
 * - Alertas críticas: agrupa stock bajo, tareas vencidas y
 *   notificaciones no leídas en un solo panel de un vistazo.
 *
 * Layout: 3 filas de KPIs + grid 2x2 (gráficos) + grid 2x1
 * (top productos + actividad) + alertas + producción.
 */

import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import KpiCard from "@/components/Dashboard/KpiCard";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import {
  Button,
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
  cash: { income: number; expense: number; balance: number };
  expenses: { total: number; count: number };
  sales_trend: TrendPoint[];
  sales_by_location: Array<{ name: string; value: number }>;
  top_products: TopProduct[];
  payment_methods: PiePoint[];
  recent_activity: ActivityItem[];
}

interface ProductionLine {
  product_id: number;
  product_name: string;
  product_code?: string | null;
  unit_id: number;
  unit_name?: string | null;
  quantity: number;
  lines_count: number;
}
interface ProductionToday {
  productions_count_today: number;
  total_consumed_quantity: number;
  total_produced_quantity: number;
  waste_percentage_today: number | null;
  waste_percentage_available: boolean;
  consumption_lines: number;
  output_lines: number;
  top_consumed: ProductionLine[];
  top_produced: ProductionLine[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number, suffix = "") {
  if (!value) return `0${suffix}`;
  return `${new Intl.NumberFormat("es-MX").format(value)}${suffix}`;
}

function formatQuantity(value: number, unit?: string | null) {
  const num = new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value || 0);
  return unit ? `${num} ${unit}` : num;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function normalizeDayLabel(raw: string) {
  if (!raw) return "";
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("es-MX", { weekday: "short" });
}

function moneyColor(
  type: ActivityItem["money_type"],
  colors: ReturnType<typeof useTheme>["colors"],
) {
  if (type === "income") return colors.success;
  if (type === "expense") return colors.error;
  return colors.textSecondary;
}

function activityIcon(type: string) {
  if (type.startsWith("sale")) return "cash-register";
  if (type.startsWith("purchase")) return "cart-outline";
  if (type.startsWith("expense")) return "cash-minus";
  if (type.startsWith("cash_income")) return "trending-up";
  if (type.startsWith("cash_expense")) return "trending-down";
  if (type.startsWith("transfer")) return "swap-horizontal";
  if (type.startsWith("production")) return "factory";
  if (type.startsWith("adjustment")) return "clipboard-edit-outline";
  return "information-outline";
}

/**
 * Factory de estilos a nivel de módulo. Se comparte entre el screen
 * principal y los sub-componentes (ProductionStat, FilterModal,
 * ScopeOption) para que cada uno pueda tener su propio `styles`
 * reactivo al tema. La función NO captura estado externo: solo
 * recibe la paleta y devuelve un objeto plano.
 */
function makeReportsStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return {
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: tokens.spacing[5],
      paddingTop: tokens.spacing[3],
      paddingBottom: tokens.spacing[10],
      width: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    title: {
      ...tokens.typography.h1,
      color: c.text,
    },
    subtitle: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: tokens.spacing[3],
      paddingVertical: 8,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    periodRow: {
      flexDirection: "row",
      gap: 6,
      marginBottom: tokens.spacing[2],
    },
    periodChip: {
      paddingHorizontal: tokens.spacing[3],
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    periodChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    periodChipText: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      fontWeight: "500",
    },
    periodChipTextActive: {
      color: c.textInverse,
      fontWeight: "600",
    },
    section: {
      marginBottom: tokens.spacing[5],
    },
    kpiRow: {
      flexDirection: "row",
      gap: tokens.spacing[3],
      marginBottom: tokens.spacing[3],
    },
    chartCard: {
      flex: 1,
      minWidth: 320,
      width: "100%",
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      ...tokens.shadow.sm,
    },
    chartTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
      fontWeight: "600",
      marginBottom: tokens.spacing[3],
    },
    chart: {
      borderRadius: tokens.radius.md,
    },
    chartEmpty: {
      padding: tokens.spacing[5],
      alignItems: "center",
    },
    emptyText: {
      ...tokens.typography.body,
      color: c.textMuted,
      textAlign: "center",
    },
    chartsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[3],
      marginBottom: tokens.spacing[5],
    },
    bottomGrid: {
      flexDirection: "row",
      gap: tokens.spacing[3],
    },
    // Top productos / métodos de pago
    productRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingVertical: tokens.spacing[2] + 2,
    },
    productRank: {
      width: 28,
      height: 28,
      borderRadius: tokens.radius.full,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    productRankText: {
      color: c.primary,
      fontWeight: "700",
      fontSize: 12,
    },
    productHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.spacing[2],
    },
    productLabel: {
      ...tokens.typography.bodyMd,
      color: c.text,
      flex: 1,
      minWidth: 0,
    },
    productValue: {
      ...tokens.typography.bodyMd,
      color: c.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    productMeta: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    productBarTrack: {
      height: 6,
      backgroundColor: c.surfaceMuted,
      borderRadius: tokens.radius.full,
      overflow: "hidden",
      marginTop: 6,
    },
    productBarFill: {
      height: "100%",
      backgroundColor: c.primary,
      borderRadius: tokens.radius.full,
    },
    paymentRow: {
      flexDirection: "column",
      gap: 0,
      paddingVertical: tokens.spacing[2] + 2,
    },
    paymentHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.spacing[2],
    },
    paymentTrack: {
      height: 6,
      backgroundColor: c.surfaceMuted,
      borderRadius: tokens.radius.full,
      overflow: "hidden",
      marginTop: 6,
    },
    paymentFill: {
      height: "100%",
      borderRadius: tokens.radius.full,
    },
    paymentDot: {
      width: 10,
      height: 10,
      borderRadius: tokens.radius.full,
    },
    paymentName: {
      ...tokens.typography.body,
      color: c.text,
      flex: 1,
    },
    paymentPercent: {
      ...tokens.typography.bodyMd,
      color: c.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    subTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
      fontWeight: "600",
      marginTop: tokens.spacing[3],
      marginBottom: tokens.spacing[2],
    },
    // Actividad
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: tokens.spacing[3],
      gap: tokens.spacing[3],
    },
    activityIcon: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    activityBody: {
      flex: 1,
      minWidth: 0,
    },
    activityLabel: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    activityTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    activityMeta: {
      ...tokens.typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    activityAmount: {
      ...tokens.typography.bodyMd,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: tokens.spacing[3],
    },
    // Alertas
    alertsPanel: {
      gap: tokens.spacing[2],
    },
    alertRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      padding: tokens.spacing[3] + 2,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surfaceMuted,
    },
    alertRowError: {
      backgroundColor: c.errorSoft,
    },
    alertRowWarning: {
      backgroundColor: c.warningSoft,
    },
    alertRowInfo: {
      backgroundColor: c.infoSoft,
    },
    alertIcon: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    alertIconError: {
      backgroundColor: c.error,
    },
    alertIconWarning: {
      backgroundColor: c.warning,
    },
    alertIconInfo: {
      backgroundColor: c.info,
    },
    alertLabel: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    alertMeta: {
      ...tokens.typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    alertCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.warningSoft,
      borderLeftWidth: 4,
      borderLeftColor: c.warning,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    alertBody: {
      flex: 1,
      minWidth: 0,
    },
    alertTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
      fontWeight: "600",
    },
    alertSubtitle: {
      ...tokens.typography.caption,
      color: c.textSecondary,
    },
    // Producción
    productionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[3],
    },
    prodStat: {
      flex: 1,
      minWidth: 160,
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      gap: tokens.spacing[2],
      ...tokens.shadow.sm,
    },
    prodStatIcon: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    prodStatValue: {
      ...tokens.typography.numeric,
      color: c.text,
      fontVariant: ["tabular-nums"],
    },
    prodStatLabel: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    // Modal
    modalContainer: {
      maxWidth: 400,
      width: "100%",
      alignSelf: "center",
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[5],
      margin: tokens.spacing[5],
      ...tokens.shadow.lg,
    },
    modalTitle: {
      ...tokens.typography.h2,
      color: c.text,
      marginBottom: tokens.spacing[4],
    },
    scopeItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: tokens.spacing[3] + 2,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: tokens.spacing[3],
      marginBottom: tokens.spacing[2],
    },
    scopeItemSelected: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    scopeContent: {
      flex: 1,
    },
    scopeTitle: {
      ...tokens.typography.bodyMd,
      color: c.text,
      fontWeight: "600",
    },
    scopeDescription: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
  };
}

export default function ReportsScreen() {
  const { selectedLocation } = useSelectedLocation();
  const auth = useAuth();
  const { colors } = useTheme();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>("month");
  const [scope, setScope] = React.useState<Scope>("location");
  const [filterVisible, setFilterVisible] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<DashboardV2 | null>(null);
  const [production, setProduction] = React.useState<ProductionToday | null>(
    null
  );

  const isWeb = Platform.OS === "web";
  const width = Dimensions.get("window").width;
  const isWide = width >= 1024;
  const chartWidth = isWide ? Math.min((width - 100) / 2, 530) : width - 56;

  const loadAll = React.useCallback(async () => {
    try {
      const [dashboardRes, productionRes] = await Promise.all([
        Services.reportsV2
          .dashboard({ period: selectedPeriod, scope })
          .catch(() => null),
        Services.productionOrders
          ?.getTodayStats?.({
            location_id: selectedLocation?.id,
          })
          .catch(() => null),
      ]);

      const dData: any = dashboardRes?.data;
      setDashboard(dData?.data ?? dData ?? null);

      const pData: any = productionRes?.data;
      setProduction(pData?.data ?? pData ?? null);
    } catch (error) {
      console.error("reports v2 load error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope, selectedPeriod, selectedLocation?.id]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const periodLabel = React.useMemo(() => {
    if (selectedPeriod === "today") return "Hoy";
    if (selectedPeriod === "week") return "Esta semana";
    return "Este mes";
  }, [selectedPeriod]);

  const locationPie = React.useMemo(() => {
    const rows = dashboard?.sales_by_location || [];
    if (!rows.length) return [] as any[];
    const total = rows.reduce((acc, row) => acc + row.value, 0) || 1;
    const chartColors = [
      colors.chart1,
      colors.chart2,
      colors.chart3,
      colors.chart4,
      colors.chart5,
      colors.chart6,
    ];
    return rows.map((row, index) => ({
      name: `${row.name}: ${Math.round((row.value / total) * 100)}%`,
      population: row.value,
      color: chartColors[index % chartColors.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
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

  // Alertas críticas: stock bajo + tareas + notificaciones
  const alerts = React.useMemo(() => {
    const list: Array<{
      id: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      label: string;
      meta: string;
      variant: "error" | "warning" | "info";
      action?: () => void;
    }> = [];

    if ((dashboard?.mini_kpis.low_stock_products ?? 0) > 0) {
      list.push({
        id: "low-stock",
        icon: "alert-circle",
        label: `${dashboard?.mini_kpis.low_stock_products} producto${
          (dashboard?.mini_kpis.low_stock_products ?? 0) === 1 ? "" : "s"
        } con stock bajo`,
        meta: "Requieren reabastecimiento",
        variant: "error",
      });
    }
    if ((auth.unreadNotificationsCount ?? 0) > 0) {
      list.push({
        id: "notifications",
        icon: "bell-ring",
        label: `${auth.unreadNotificationsCount} notificacion${
          (auth.unreadNotificationsCount ?? 0) === 1 ? "" : "es"
        } sin leer`,
        meta: "Revisa las novedades",
        variant: "warning",
      });
    }
    return list;
  }, [dashboard, auth.unreadNotificationsCount, production]);

  const styles = useThemedStyles(makeReportsStyles);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con periodo y filtros */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Reportes</Text>
            <Text style={styles.subtitle}>
              {scope === "location" ? "Por sucursal" : "Consolidado"} ·{" "}
              {periodLabel}
            </Text>
          </View>
          <Button
            mode="outlined"
            icon="tune-variant"
            textColor={colors.primary}
            onPress={() => setFilterVisible(true)}
            style={styles.filterButton}
          >
            Filtros
          </Button>
        </View>

        {/* Period selector como chips inline */}
        <View style={styles.periodRow}>
          {(
            [
              { key: "today", label: "Hoy" },
              { key: "week", label: "Semana" },
              { key: "month", label: "Mes" },
            ] as const
          ).map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => {
                setLoading(true);
                setSelectedPeriod(p.key);
              }}
              activeOpacity={0.7}
              style={[
                styles.periodChip,
                selectedPeriod === p.key && styles.periodChipActive,
              ]}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selectedPeriod === p.key && styles.periodChipTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            <View style={styles.kpiRow}>
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
            </View>
            <View style={styles.kpiRow}>
              <SkeletonBox />
              <SkeletonBox />
              <SkeletonBox />
            </View>
            <SkeletonBox height={260} />
            <SkeletonBox height={320} />
          </View>
        ) : (
          <>
            {/* KPIs principales (3) */}
            <View style={styles.kpiRow}>
              <KpiCard
                icon="trending-up"
                label="Ventas"
                value={formatCurrency(dashboard?.kpis?.sales ?? 0)}
              />
              <KpiCard
                icon="cart-outline"
                label="Compras"
                value={formatCurrency(dashboard?.kpis?.purchases ?? 0)}
                inverseDelta
              />
              <KpiCard
                icon="cash-multiple"
                label="Ganancia"
                value={formatCurrency(dashboard?.kpis?.profit ?? 0)}
              />
            </View>

            {/* KPIs secundarios (3) */}
            <View style={styles.kpiRow}>
              <KpiCard
                icon="package-variant"
                label="Inventario"
                value={formatCurrency(
                  dashboard?.mini_kpis.inventory_value ?? 0
                )}
              />
              <KpiCard
                icon="swap-vertical"
                label="Movimientos"
                value={formatNumber(dashboard?.mini_kpis.movements_count ?? 0)}
              />
              <KpiCard
                icon="alert-circle-outline"
                label="Stock bajo"
                value={formatNumber(
                  dashboard?.mini_kpis.low_stock_products ?? 0
                )}
              />
            </View>

            {/* Producción hoy — KPIs dinámicos basados en datos reales */}
            {production && (
              <View style={styles.section}>
                <SectionHeader
                  title="Producción de hoy"
                  actionLabel="Ver órdenes"
                  onAction={() =>
                    auth.user &&
                    (require("expo-router") as any).router.push(
                      "/(tabs)/home/production"
                    )
                  }
                />
                {production.productions_count_today > 0 ? (
                  <>
                    <View style={styles.productionGrid}>
                      <ProductionStat
                        icon="factory"
                        label="Órdenes"
                        value={String(production.productions_count_today)}
                        tone="primary"
                      />
                      <ProductionStat
                        icon="import"
                        label="Insumos"
                        value={String(production.consumption_lines)}
                        tone="info"
                      />
                      <ProductionStat
                        icon="export-variant"
                        label="Productos"
                        value={String(production.output_lines)}
                        tone="success"
                      />
                      {production.waste_percentage_available && (
                        <ProductionStat
                          icon="delete-variant"
                          label="Merma"
                          value={`${formatNumber(
                            production.waste_percentage_today ?? 0
                          )}%`}
                          tone="warning"
                        />
                      )}
                    </View>

                    <View
                      style={[
                        styles.bottomGrid,
                        !isWide && { flexDirection: "column" },
                        { marginTop: tokens.spacing[3] },
                      ]}
                    >
                      <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Más producido</Text>
                        <ProductionBreakdown
                          rows={production.top_produced}
                          tone="success"
                          emptyText="Sin productos registrados hoy."
                        />
                      </View>
                      <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Más consumido</Text>
                        <ProductionBreakdown
                          rows={production.top_consumed}
                          tone="info"
                          emptyText="Sin insumos registrados hoy."
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.chartCard}>
                    <EmptyState
                      icon="factory"
                      title="Sin producción hoy"
                      description="No se han completado órdenes de producción hoy"
                      compact
                    />
                  </View>
                )}
              </View>
            )}

            {/* Alertas críticas */}
            {alerts.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Atención requerida"
                  badge={alerts.length}
                />
                <View style={styles.alertsPanel}>
                  {alerts.map((alert) => (
                    <View
                      key={alert.id}
                      style={[
                        styles.alertRow,
                        alert.variant === "error" && styles.alertRowError,
                        alert.variant === "warning" && styles.alertRowWarning,
                        alert.variant === "info" && styles.alertRowInfo,
                      ]}
                    >
                      <View
                        style={[
                          styles.alertIcon,
                          alert.variant === "error" && styles.alertIconError,
                          alert.variant === "warning" && styles.alertIconWarning,
                          alert.variant === "info" && styles.alertIconInfo,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={alert.icon}
                          size={16}
                          color={
                            alert.variant === "error"
                              ? colors.error
                              : alert.variant === "warning"
                                ? colors.warning
                                : colors.info
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertLabel}>{alert.label}</Text>
                        <Text style={styles.alertMeta}>{alert.meta}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Gráficos principales: tendencia + por sucursal */}
            <View
              style={[
                styles.chartsGrid,
                !isWide && { flexDirection: "column" },
              ]}
            >
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Tendencia de Ventas</Text>
                {(() => {
                  const trendValues = (dashboard?.sales_trend || []).map(
                    (p) => Number(p.total || 0),
                  );
                  const trendLabels = (dashboard?.sales_trend || []).map((p) =>
                    normalizeDayLabel(p.period),
                  );
                  if (!trendValues.length) {
                    return (
                      <View style={styles.chartEmpty}>
                        <Text style={styles.emptyText}>
                          No hay datos de tendencia.
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <LineChart
                      data={{
                        labels: trendLabels,
                        datasets: [{ data: trendValues }],
                      }}
                      width={chartWidth}
                      height={220}
                      yAxisLabel="$"
                      yAxisSuffix=""
                      fromZero
                      chartConfig={{
                        backgroundColor: colors.surface,
                        backgroundGradientFrom: colors.surface,
                        backgroundGradientTo: colors.surface,
                        decimalPlaces: 0,
                        color: () => colors.primary,
                        labelColor: () => colors.textMuted,
                        propsForDots: {
                          r: "4",
                          strokeWidth: "2",
                          stroke: colors.primary,
                        },
                      }}
                      bezier
                      style={styles.chart}
                    />
                  );
                })()}
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Ventas por Sucursal</Text>
                {locationPie.length ? (
                  <PieChart
                    data={locationPie}
                    width={chartWidth}
                    height={220}
                    chartConfig={{
                      color: () => colors.text,
                      labelColor: () => colors.textSecondary,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="8"
                    absolute
                  />
                ) : (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.emptyText}>
                      No hay datos para mostrar.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Top productos + Métodos de pago + Actividad */}
            <View
              style={[
                styles.bottomGrid,
                !isWide && { flexDirection: "column" },
              ]}
            >
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Top 5 Productos</Text>
                {(dashboard?.top_products || []).map((product, idx) => {
                  const widthPct = Math.max(
                    8,
                    Math.round(((product.sales || 0) / topProductMax) * 100)
                  );
                  return (
                    <View
                      key={`${product.name}-${idx}`}
                      style={styles.productRow}
                    >
                      <View style={styles.productRank}>
                        <Text style={styles.productRankText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.productHeader}>
                          <Text
                            style={styles.productLabel}
                            numberOfLines={1}
                          >
                            {product.name}
                          </Text>
                          <Text style={styles.productValue}>
                            {formatCurrency(product.sales)}
                          </Text>
                        </View>
                        <View style={styles.productBarTrack}>
                          <View
                            style={[
                              styles.productBarFill,
                              {
                                width: `${widthPct}%`,
                                backgroundColor: colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
                {(!dashboard?.top_products ||
                  dashboard.top_products.length === 0) && (
                  <View style={styles.chartEmpty}>
                    <EmptyState
                      icon="package-variant-closed"
                      title="Sin ventas registradas"
                      description="No hay productos vendidos en el periodo"
                      compact
                    />
                  </View>
                )}
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Métodos de Pago</Text>
                {(paymentProgress || []).map((method, idx) => (
                  <View
                    key={`${method.name}-${idx}`}
                    style={styles.paymentRow}
                  >
                    <View style={styles.paymentHeader}>
                      <Text style={styles.productLabel}>{method.name}</Text>
                      <Text style={styles.productMeta}>
                        {method.percent}%
                      </Text>
                    </View>
                    <View style={styles.paymentTrack}>
                      <View
                        style={[
                          styles.paymentFill,
                          {
                            width: `${method.percent}%`,
                            backgroundColor: method.color || colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
                {paymentProgress.length === 0 && (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.emptyText}>
                      Sin métodos de pago registrados.
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.subTitle}>Actividad reciente</Text>
                {(dashboard?.recent_activity || []).slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityIcon,
                        {
                          backgroundColor:
                            moneyColor(item.money_type, colors) + "15",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={activityIcon(item.type) as any}
                        size={14}
                        color={moneyColor(item.money_type, colors)}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={styles.activityLabel}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>
                        {formatDate(item.date)}
                        {item.location ? ` · ${item.location}` : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.activityAmount,
                        { color: moneyColor(item.money_type, colors) },
                      ]}
                    >
                      {item.money_type === "none"
                        ? "-"
                        : formatCurrency(item.amount)}
                    </Text>
                  </View>
                ))}
                {(!dashboard?.recent_activity ||
                  dashboard.recent_activity.length === 0) && (
                  <View style={styles.chartEmpty}>
                    <EmptyState
                      icon="clock-outline"
                      title="Sin actividad"
                      description="No hay movimientos en el periodo"
                      compact
                    />
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de filtros (sucursal vs consolidado) */}
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

// ────────────────────────────────────────────────────────────────────
// Sub-componentes locales (mantenidos inline para cohesion)
// ────────────────────────────────────────────────────────────────────

interface ProductionStatProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: "primary" | "info" | "success" | "warning" | "error";
}

function ProductionStat({ icon, label, value, tone }: ProductionStatProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeReportsStyles);
  const tonePalette = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    error: { bg: colors.errorSoft, fg: colors.error },
  }[tone];
  return (
    <View style={styles.prodStat}>
      <View
        style={[styles.prodStatIcon, { backgroundColor: tonePalette.bg }]}
      >
        <MaterialCommunityIcons name={icon} size={18} color={tonePalette.fg} />
      </View>
      <Text style={styles.prodStatValue}>{value}</Text>
      <Text style={styles.prodStatLabel}>{label}</Text>
    </View>
  );
}

interface ProductionBreakdownProps {
  rows: ProductionLine[];
  tone: "primary" | "info" | "success" | "warning" | "error";
  emptyText: string;
}

function ProductionBreakdown({ rows, tone, emptyText }: ProductionBreakdownProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeReportsStyles);
  const toneColor = {
    primary: colors.primary,
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  }[tone];

  if (!rows || rows.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  const max = Math.max(...rows.map((r) => r.quantity || 0), 1);

  return (
    <>
      {rows.map((row, idx) => {
        const widthPct = Math.max(
          8,
          Math.round(((row.quantity || 0) / max) * 100)
        );
        return (
          <View key={`${row.product_id}-${idx}`} style={styles.productRow}>
            <View
              style={[styles.productRank, { backgroundColor: toneColor + "1A" }]}
            >
              <Text style={[styles.productRankText, { color: toneColor }]}>
                {idx + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.productHeader}>
                <Text style={styles.productLabel} numberOfLines={1}>
                  {row.product_name}
                </Text>
                <Text style={styles.productValue}>
                  {formatQuantity(row.quantity, row.unit_name)}
                </Text>
              </View>
              <View style={styles.productBarTrack}>
                <View
                  style={[
                    styles.productBarFill,
                    { width: `${widthPct}%`, backgroundColor: toneColor },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

interface SkeletonBoxProps {
  height?: number;
}
function SkeletonBox({ height = 112 }: SkeletonBoxProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        height,
        backgroundColor: colors.surfaceMuted,
        borderRadius: tokens.radius.lg,
      }}
    />
  );
}

interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  selectedScope: Scope;
  onScopeChange: (scope: Scope) => void;
  currentLocationName?: string | null;
}

function FilterModal({
  visible,
  onDismiss,
  selectedScope,
  onScopeChange,
  currentLocationName,
}: FilterModalProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeReportsStyles);
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Filtros de Reporte</Text>

        <View style={{ marginTop: 16, gap: 12 }}>
          <ScopeOption
            value="location"
            selected={selectedScope === "location"}
            onPress={() => onScopeChange("location")}
            title="Sucursal actual"
            description={currentLocationName || "Sin sucursal seleccionada"}
          />
          <ScopeOption
            value="general"
            selected={selectedScope === "general"}
            onPress={() => onScopeChange("general")}
            title="Consolidado"
            description="Todas las sucursales"
          />
        </View>

        <Button
          mode="contained"
          style={{ marginTop: 20 }}
          buttonColor={colors.primary}
          onPress={onDismiss}
        >
          Aplicar
        </Button>
      </Modal>
    </Portal>
  );
}

interface ScopeOptionProps {
  value: Scope;
  selected: boolean;
  onPress: () => void;
  title: string;
  description: string;
}

function ScopeOption({
  selected,
  onPress,
  title,
  description,
}: ScopeOptionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeReportsStyles);
  return (
    <TouchableRipple
      onPress={onPress}
      style={[styles.scopeItem, selected && styles.scopeItemSelected]}
    >
      <View style={styles.scopeContent}>
        <RadioButton
          value="scope"
          status={selected ? "checked" : "unchecked"}
          onPress={onPress}
          color={colors.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.scopeTitle}>{title}</Text>
          <Text style={styles.scopeDescription}>{description}</Text>
        </View>
      </View>
    </TouchableRipple>
  );
}
