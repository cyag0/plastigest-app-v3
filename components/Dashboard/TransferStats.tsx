import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import KpiCard from "@/components/Dashboard/KpiCard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useResponsive } from "@/hooks/useResponsive";
import axios from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { ActivityIndicator, SegmentedButtons, Text } from "react-native-paper";

interface TransferStatsData {
  total_transfers: number;
  transfers_sent: number;
  transfers_received: number;
  transfers_by_status: Record<string, number>;
  top_products: Array<{
    id: number;
    name: string;
    code: string;
    total_quantity: number;
    transfer_count: number;
  }>;
  top_locations: Array<{
    location_name: string;
    transfer_count: number;
  }>;
  transfers_by_period: Array<{
    date?: string;
    month?: string;
    count: number;
  }>;
  avg_processing_time_hours: number;
}

const STATUS_META: Record<
  string,
  { label: string; variant: "primary" | "success" | "warning" | "error" | "info" | "default" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  in_transit: { label: "En Tránsito", variant: "info" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "error" },
};

export default function TransferStats() {
  const { isMobile } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransferStatsData | null>(null);
  const [period, setPeriod] = useState("month");
  const kpiStyle = isMobile ? { flexBasis: "47%" as const } : undefined;
  const chartWidth = screenWidth - (tokens.spacing[5] + tokens.spacing[4]) * 2;

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/auth/admin/reports/transfer-stats", {
        params: { period },
      });
      setStats(response.data.data);
    } catch (error) {
      console.error("Error loading transfer stats:", error);
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
        description="No se pudieron cargar las estadísticas de transferencias"
      />
    );
  }

  const hasStatusData = Object.keys(stats.transfers_by_status).length > 0;
  const hasTrendData = stats.transfers_by_period.length > 0;
  const hasTopProducts = stats.top_products.length > 0;
  const hasTopLocations = stats.top_locations.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon="swap-horizontal"
          label="Total"
          value={String(stats.total_transfers)}
          style={kpiStyle}
        />
        <KpiCard
          icon="package-variant"
          label="Enviados"
          value={String(stats.transfers_sent)}
          style={kpiStyle}
        />
        <KpiCard
          icon="truck-delivery"
          label="Recibidos"
          value={String(stats.transfers_received)}
          style={kpiStyle}
        />
        <KpiCard
          icon="clock-outline"
          label="Tiempo Prom."
          value={`${stats.avg_processing_time_hours}h`}
          style={kpiStyle}
        />
      </View>

      {/* Period Selector */}
      <View style={styles.periodWrap}>
        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: "today", label: "Hoy" },
            { value: "week", label: "Semana" },
            { value: "month", label: "Mes" },
            { value: "year", label: "Año" },
          ]}
          theme={{
            colors: {
              secondaryContainer: palette.primarySoft,
              onSecondaryContainer: palette.primary,
            },
          }}
        />
      </View>

      {/* Status breakdown */}
      {hasStatusData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por estado</Text>
          <View style={styles.card}>
            <View style={styles.statusList}>
              {Object.entries(stats.transfers_by_status).map(
                ([status, count]) => {
                  const meta = STATUS_META[status] ?? {
                    label: status,
                    variant: "default" as const,
                  };
                  return (
                    <View key={status} style={styles.statusItem}>
                      <AppChip variant={meta.variant} size="md">
                        {meta.label}
                      </AppChip>
                      <Text style={styles.statusCount}>{count}</Text>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        </View>
      )}

      {/* Trend Chart */}
      {hasTrendData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tendencia</Text>
          <View style={styles.card}>
            <LineChart
              data={{
                labels: stats.transfers_by_period.map((item) =>
                  item.date
                    ? new Date(item.date).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })
                    : item.month || "",
                ),
                datasets: [
                  {
                    data: stats.transfers_by_period.map((item) => item.count),
                  },
                ],
              }}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: palette.surface,
                backgroundGradientFrom: palette.surface,
                backgroundGradientTo: palette.surface,
                decimalPlaces: 0,
                color: (opacity = 1) =>
                  `rgba(79, 122, 58, ${opacity})`,
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
              withInnerLines
              withOuterLines={false}
            />
          </View>
        </View>
      )}

      {/* Top Products */}
      {hasTopProducts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos más transferidos</Text>
          <View style={styles.card}>
            {stats.top_products.slice(0, 5).map((product, index) => (
              <View
                key={product.id}
                style={[
                  styles.topItem,
                  index < Math.min(stats.top_products.length, 5) - 1 &&
                    styles.topItemDivider,
                ]}
              >
                <View style={styles.topItemRank}>
                  <Text style={styles.topItemRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topItemInfo}>
                  <Text style={styles.topItemName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.topItemDetails}>
                    {product.total_quantity} unidades · {product.transfer_count} transferencias
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Top Locations */}
      {hasTopLocations && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicaciones más activas</Text>
          <View style={styles.card}>
            <BarChart
              data={{
                labels: stats.top_locations.map((loc) => loc.location_name),
                datasets: [
                  {
                    data: stats.top_locations.map(
                      (loc) => loc.transfer_count,
                    ),
                  },
                ],
              }}
              width={chartWidth}
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
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
        </View>
      )}

      {!hasStatusData && !hasTrendData && !hasTopProducts && !hasTopLocations && (
        <EmptyState
          icon="chart-line"
          title="Sin datos para el período"
          description="No hay transferencias registradas en el período seleccionado"
        />
      )}
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

  // --- KPI Grid ---
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },

  // --- Period selector ---
  periodWrap: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing[2],
    borderWidth: 1,
    borderColor: palette.border,
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

  // --- Status list ---
  statusList: {
    gap: tokens.spacing[2],
  },
  statusItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing[2],
  },
  statusCount: {
    ...tokens.typography.h3,
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },

  // --- Top items list ---
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
  },
  topItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  topItemRankText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "700",
  },
  topItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topItemName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  topItemDetails: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
});
