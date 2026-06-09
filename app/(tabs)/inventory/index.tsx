import AppChip from "@/components/App/Chip";
import SectionHeader from "@/components/App/SectionHeader";
import KpiCard from "@/components/Dashboard/KpiCard";
import QuickAccessCard from "@/components/Dashboard/QuickAccessCard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import Services from "@/utils/services";
import { Href, useRouter } from "expo-router";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";

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

export default function InventoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState<InventoryStats | null>(null);

  const loadData = async () => {
    try {
      const response = await Services.reports.inventoryStats({
        scope: "location",
      });
      setStats(response.data.data);
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
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatStock = (value: number) => {
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("es-MX").format(value);
  };

  // --- Derivados ---
  const stockHealth = stats?.stock_health;
  const totalForHealth =
    (stockHealth?.optimal ?? 0) +
    (stockHealth?.low ?? 0) +
    (stockHealth?.critical ?? 0) +
    (stockHealth?.out ?? 0);

  const lowStockCount = stats?.low_stock_products ?? 0;
  const totalProducts = stats?.total_products ?? 0;
  const inventoryValue = stats?.inventory_value ?? 0;
  const totalStock = stats?.total_stock ?? 0;
  const outOfStock = stats?.out_of_stock_products ?? 0;

  const categoryEntries: [string, number][] = stats?.products_by_category
    ? (Object.entries(stats.products_by_category) as [string, number][]).sort(
        (a, b) => b[1] - a[1],
      )
    : [];
  const maxCategory = Math.max(1, ...categoryEntries.map(([, v]) => v));

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ============== RESUMEN ============== */}
      <View style={styles.section}>
        <SectionHeader title="Resumen" />
        <View style={styles.kpiRow}>
          <KpiCard
            icon="package-variant-closed"
            label="Total productos"
            value={formatStock(totalProducts)}
          />
          <KpiCard
            icon="warehouse"
            label="Stock total"
            value={formatStock(totalStock)}
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard
            icon="cash-multiple"
            label="Valor inventario"
            value={formatCurrency(inventoryValue)}
          />
          <KpiCard
            icon="alert-circle-outline"
            label="Stock bajo"
            value={formatStock(lowStockCount + outOfStock)}
            inverseDelta={lowStockCount + outOfStock > 0}
            delta={
              totalProducts > 0
                ? {
                    value: ((lowStockCount + outOfStock) / totalProducts) * 100,
                    period: "del total",
                  }
                : undefined
            }
          />
        </View>
      </View>

      {/* ============== SALUD DEL STOCK ============== */}
      {stockHealth && totalForHealth > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Salud del stock"
            badge={`${totalProducts}`}
            actionLabel="Detalles"
            onAction={() => router.push("/(tabs)/inventory/products" as any)}
          />
          <View style={styles.card}>
            <HealthRow
              label="Optimo"
              value={stockHealth.optimal}
              total={totalForHealth}
              color={palette.success}
              bg={palette.successSoft}
            />
            <Divider />
            <HealthRow
              label="Bajo"
              value={stockHealth.low}
              total={totalForHealth}
              color={palette.warning}
              bg={palette.warningSoft}
            />
            <Divider />
            <HealthRow
              label="Critico"
              value={stockHealth.critical}
              total={totalForHealth}
              color={palette.error}
              bg={palette.errorSoft}
            />
            {stockHealth.out > 0 && (
              <>
                <Divider />
                <HealthRow
                  label="Agotado"
                  value={stockHealth.out}
                  total={totalForHealth}
                  color={palette.text}
                  bg={palette.surfaceMuted}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* ============== PRODUCTOS POR CATEGORIA ============== */}
      {categoryEntries.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Productos por categoria"
            badge={`${categoryEntries.length}`}
          />
          <View style={styles.card}>
            {categoryEntries.slice(0, 6).map(([name, count], idx) => (
              <React.Fragment key={name}>
                <CategoryRow
                  name={name}
                  count={count}
                  percentage={(count / maxCategory) * 100}
                  rank={idx + 1}
                />
                {idx < Math.min(categoryEntries.length, 6) - 1 && <Divider />}
              </React.Fragment>
            ))}
            {categoryEntries.length > 6 && (
              <TouchableOpacity
                style={styles.seeMore}
                onPress={() => router.push("/(tabs)/inventory/products" as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.seeMoreText}>
                  Ver {categoryEntries.length - 6} mas
                </Text>
                <Text style={styles.seeMoreArrow}>{"→"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ============== ACCIONES RAPIDAS ============== */}
      <View style={styles.section}>
        <SectionHeader title="Acciones rapidas" />
        <View style={styles.actionsGrid}>
          <QuickAccessCard
            icon="package-variant"
            label="Ver inventario"
            description="Stock de todos los productos"
            onPress={() => router.push("/(tabs)/inventory/products" as any)}
          />
          <QuickAccessCard
            icon="clipboard-check-outline"
            label="Inventario semanal"
            description="Verificacion fisica"
            onPress={() =>
              router.push("/(tabs)/inventory/weekly-inventory" as any)
            }
          />
          <QuickAccessCard
            icon="tune-variant"
            label="Ajustes"
            description="Mermas o perdidas"
            onPress={() => router.push("/(tabs)/inventory/adjustment" as any)}
          />
          <QuickAccessCard
            icon="alert-circle-outline"
            label="Stock bajo"
            description="Productos a reponer"
            onPress={() =>
              router.push(
                "/(tabs)/inventory/products?filter=low_stock" as any,
              )
            }
          />
        </View>
      </View>

      {/* ============== ALERTA ============== */}
      {lowStockCount > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.alertCard, { borderLeftColor: palette.error }]}
            onPress={() =>
              router.push(
                "/(tabs)/inventory/products?filter=low_stock" as any,
              )
            }
          >
            <View
              style={[
                styles.alertIcon,
                { backgroundColor: palette.errorSoft },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color={palette.error}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>Stock bajo</Text>
                <AppChip variant="error" size="sm">
                  {lowStockCount}
                </AppChip>
              </View>
              <Text style={styles.alertText} numberOfLines={2}>
                Hay {lowStockCount} producto{lowStockCount === 1 ? "" : "s"} que
                {lowStockCount === 1 ? " necesita" : " necesitan"} reposicion
                urgente. Revisa el inventario para evitar desabastecimiento.
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Datos en tiempo real de la sucursal activa
        </Text>
      </View>
    </ScrollView>
  );
}

// ============== SUBCOMPONENTES ==============

import { MaterialCommunityIcons } from "@expo/vector-icons";

function Divider() {
  return <View style={styles.divider} />;
}

interface HealthRowProps {
  label: string;
  value: number;
  total: number;
  color: string;
  bg: string;
}

function HealthRow({ label, value, total, color, bg }: HealthRowProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthLabelRow}>
        <View style={[styles.healthDot, { backgroundColor: color }]} />
        <Text style={styles.healthLabel}>{label}</Text>
        <Text style={styles.healthCount}>{value}</Text>
        <Text style={styles.healthPercent}>
          {percentage.toFixed(0)}%
        </Text>
      </View>
      <View style={styles.healthBarTrack}>
        <View
          style={[
            styles.healthBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

interface CategoryRowProps {
  name: string;
  count: number;
  percentage: number;
  rank: number;
}

function CategoryRow({ name, count, percentage, rank }: CategoryRowProps) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryRank}>
        <Text style={styles.categoryRankText}>{rank}</Text>
      </View>
      <View style={styles.categoryBody}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.categoryCount}>{count}</Text>
        </View>
        <View style={styles.categoryBarTrack}>
          <View
            style={[
              styles.categoryBarFill,
              { width: `${percentage}%`, backgroundColor: palette.primary },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ============== STYLES ==============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingBottom: tokens.spacing[10],
  },

  // --- Sections ---
  section: {
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[5],
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    ...tokens.shadow.sm,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: tokens.spacing[4],
  },

  // --- KPI ---
  kpiRow: {
    flexDirection: "row",
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[3],
  },

  // --- Health bar ---
  healthRow: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[2],
  },
  healthLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: tokens.radius.full,
  },
  healthLabel: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
  },
  healthCount: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  healthPercent: {
    ...tokens.typography.caption,
    color: palette.textMuted,
    fontVariant: ["tabular-nums"],
    minWidth: 40,
    textAlign: "right",
  },
  healthBarTrack: {
    height: 8,
    backgroundColor: palette.surfaceMuted,
    borderRadius: tokens.radius.full,
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    borderRadius: tokens.radius.full,
  },

  // --- Category bars ---
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  categoryRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryRankText: {
    ...tokens.typography.caption,
    fontWeight: "700",
    color: palette.primary,
    fontVariant: ["tabular-nums"],
  },
  categoryBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing[2],
  },
  categoryName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
    minWidth: 0,
  },
  categoryCount: {
    ...tokens.typography.bodyMd,
    color: palette.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  categoryBarTrack: {
    height: 6,
    backgroundColor: palette.surfaceMuted,
    borderRadius: tokens.radius.full,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: tokens.radius.full,
  },
  seeMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing[3],
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  seeMoreText: {
    ...tokens.typography.bodyMd,
    color: palette.primary,
  },
  seeMoreArrow: {
    ...tokens.typography.bodyMd,
    color: palette.primary,
  },

  // --- Actions grid ---
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },

  // --- Alert ---
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
    borderLeftWidth: 4,
    ...tokens.shadow.sm,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    marginBottom: 2,
  },
  alertTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  alertText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 18,
  },

  // --- Footer ---
  footer: {
    alignItems: "center",
    paddingVertical: tokens.spacing[5],
  },
  footerText: {
    ...tokens.typography.caption,
    color: palette.textMuted,
  },
});
