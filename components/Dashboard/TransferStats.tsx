import palette from "@/constants/palette";
import axios from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import {
  ActivityIndicator,
  Card,
  SegmentedButtons,
  Text,
} from "react-native-paper";

const screenWidth = Dimensions.get("window").width;

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

export default function TransferStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransferStatsData | null>(null);
  const [period, setPeriod] = useState("month");

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
        <Text style={{ marginTop: 16 }}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text>No se pudieron cargar las estadísticas</Text>
      </View>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    in_transit: "En Tránsito",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="chart-box"
            size={32}
            color={palette.primary}
          />
          <Text variant="headlineSmall" style={styles.title}>
            Estadísticas de Transferencias
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Análisis y métricas del sistema de transferencias
          </Text>
        </View>

        {/* Period Selector */}
        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: "today", label: "Hoy" },
            { value: "week", label: "Semana" },
            { value: "month", label: "Mes" },
            { value: "year", label: "Año" },
          ]}
          style={styles.periodSelector}
        />

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={32}
                color={palette.primary}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total
              </Text>
              <Text variant="headlineMedium" style={styles.summaryValue}>
                {stats.total_transfers}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="package-variant"
                size={32}
                color={palette.blue}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Enviados
              </Text>
              <Text
                variant="headlineMedium"
                style={[styles.summaryValue, { color: palette.blue }]}
              >
                {stats.transfers_sent}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="truck-delivery"
                size={32}
                color={palette.success}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Recibidos
              </Text>
              <Text
                variant="headlineMedium"
                style={[styles.summaryValue, { color: palette.success }]}
              >
                {stats.transfers_received}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="clock-outline"
                size={32}
                color={palette.warning}
              />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Tiempo Prom.
              </Text>
              <Text
                variant="headlineMedium"
                style={[styles.summaryValue, { color: palette.warning }]}
              >
                {stats.avg_processing_time_hours}h
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Transfers by Status */}
        {Object.keys(stats.transfers_by_status).length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Transferencias por Estado
              </Text>
              <View style={styles.statusList}>
                {Object.entries(stats.transfers_by_status).map(
                  ([status, count]) => (
                    <View key={status} style={styles.statusItem}>
                      <Text variant="bodyMedium" style={styles.statusLabel}>
                        {statusLabels[status] || status}
                      </Text>
                      <Text variant="titleMedium" style={styles.statusCount}>
                        {count}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Transfers by Period Chart */}
        {stats.transfers_by_period.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Tendencia de Transferencias
              </Text>
              <LineChart
                data={{
                  labels: stats.transfers_by_period.map((item) =>
                    item.date
                      ? new Date(item.date).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                        })
                      : item.month || ""
                  ),
                  datasets: [
                    {
                      data: stats.transfers_by_period.map((item) => item.count),
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  backgroundColor: palette.card,
                  backgroundGradientFrom: palette.card,
                  backgroundGradientTo: palette.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) =>
                    `rgba(${palette.primary}, ${opacity})`,
                  labelColor: (opacity = 1) => palette.textSecondary,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: palette.primary,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        )}

        {/* Top Products */}
        {stats.top_products.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Productos Más Transferidos
              </Text>
              {stats.top_products.slice(0, 5).map((product, index) => (
                <View key={product.id} style={styles.topItem}>
                  <View style={styles.topItemRank}>
                    <Text variant="labelLarge" style={styles.topItemRankText}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.topItemInfo}>
                    <Text variant="bodyMedium" style={styles.topItemName}>
                      {product.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.topItemDetails}>
                      {product.total_quantity} unidades •{" "}
                      {product.transfer_count} transferencias
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Top Locations */}
        {stats.top_locations.length > 0 && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                Ubicaciones Más Activas
              </Text>
              <BarChart
                data={{
                  labels: stats.top_locations.map((loc) => loc.location_name),
                  datasets: [
                    {
                      data: stats.top_locations.map(
                        (loc) => loc.transfer_count
                      ),
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  backgroundColor: palette.card,
                  backgroundGradientFrom: palette.card,
                  backgroundGradientTo: palette.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => palette.primary,
                  labelColor: (opacity = 1) => palette.textSecondary,
                  style: {
                    borderRadius: 16,
                  },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
              />
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: palette.text,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  periodSelector: {
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    minWidth: "47%",
    maxWidth: "48%",
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 0,
    shadowColor: "transparent",
  },
  summaryLabel: {
    color: palette.textSecondary,
    marginTop: 8,
  },
  summaryValue: {
    color: palette.primary,
    fontWeight: "bold",
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 0,
    shadowColor: "transparent",
  },
  chartTitle: {
    color: palette.text,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
  },
  statusLabel: {
    color: palette.text,
  },
  statusCount: {
    color: palette.primary,
    fontWeight: "bold",
  },
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  topItemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topItemRankText: {
    color: palette.primary,
    fontWeight: "bold",
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    color: palette.text,
    fontWeight: "600",
  },
  topItemDetails: {
    color: palette.textSecondary,
    marginTop: 2,
  },
});
