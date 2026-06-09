import KpiCard from "@/components/Dashboard/KpiCard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useResponsive } from "@/hooks/useResponsive";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

interface TopProduct {
  product_id: number;
  product_name: string;
  product_code?: string;
  unit_id: number;
  unit_name?: string;
  quantity: number;
  lines_count: number;
}

interface KpiData {
  productions_count_today: number;
  total_consumed_quantity: number;
  total_produced_quantity: number;
  waste_percentage_today: number | null;
  waste_percentage_available: boolean;
  consumption_lines: number;
  output_lines: number;
  top_consumed: TopProduct[];
  top_produced: TopProduct[];
}

const DEFAULT: KpiData = {
  productions_count_today: 0,
  total_consumed_quantity: 0,
  total_produced_quantity: 0,
  waste_percentage_today: null,
  waste_percentage_available: false,
  consumption_lines: 0,
  output_lines: 0,
  top_consumed: [],
  top_produced: [],
};

interface TopRowProps {
  product: TopProduct;
  type: "in" | "out";
}

function TopRow({ product, type }: TopRowProps) {
  const isIn = type === "in";
  const icon = isIn ? "minus-circle" : "plus-circle";
  return (
    <View style={styles.topRow}>
      <View style={styles.topRowIconBox}>
        <MaterialCommunityIcons
          name={icon as any}
          size={14}
          color={isIn ? palette.error : palette.success}
        />
      </View>
      <Text style={styles.topRowName} numberOfLines={1}>
        {product.product_name}
      </Text>
      <Text
        style={[
          styles.topRowQty,
          { color: isIn ? palette.error : palette.success },
        ]}
      >
        {isIn ? "−" : "+"}
        {product.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })}{" "}
        <Text style={styles.topRowUnit}>{product.unit_name}</Text>
      </Text>
    </View>
  );
}

export default function ProductionKpiCards() {
  const { isMobile, isMd, isXl } = useResponsive();
  // Tablet = md+ (no xl), Desktop = xl
  const isTablet = isMd && !isXl;
  const isDesktop = isXl;
  const [stats, setStats] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const r = await Services.productionOrders.getTodayStats();
      setStats(r.data ?? DEFAULT);
    } catch (e) {
      console.warn("Error loading production KPIs", e);
      setStats(DEFAULT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || !stats) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={palette.primary} size="small" />
        <Text style={styles.loadingText}>Cargando KPIs del día…</Text>
      </View>
    );
  }

  const wasteValue = stats.waste_percentage_today === null
    ? "N/D"
    : `${stats.waste_percentage_today.toFixed(1)}%`;

  const hasTop = stats.top_consumed.length > 0 || stats.top_produced.length > 0;

  if (isMobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mobileScroll}
      >
        <View style={styles.mobileKpi}>
          <KpiCard
            icon="counter"
            label="Producciones"
            value={String(stats.productions_count_today)}
          />
        </View>
        <View style={styles.mobileKpi}>
          <KpiCard
            icon="import"
            label="Insumos Consumidos"
            value={String(stats.consumption_lines)}
          />
        </View>
        <View style={styles.mobileKpi}>
          <KpiCard
            icon="export-variant"
            label="Productos Generados"
            value={String(stats.output_lines)}
          />
        </View>
        <View style={styles.mobileKpi}>
          <KpiCard
            icon="trash-can-outline"
            label="% Merma"
            value={wasteValue}
          />
        </View>
        {hasTop && (
          <View style={styles.mobileTop}>
            <View style={styles.topCard}>
              <View style={styles.topCardHeader}>
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={16}
                  color={palette.textMuted}
                />
                <Text style={styles.topCardTitle}>TOP DEL DÍA</Text>
              </View>
              {stats.top_consumed.map((p) => (
                <TopRow
                  key={`c-${p.product_id}-${p.unit_id}`}
                  product={p}
                  type="in"
                />
              ))}
              {stats.top_produced.map((p) => (
                <TopRow
                  key={`o-${p.product_id}-${p.unit_id}`}
                  product={p}
                  type="out"
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.desktopWrap}>
      <View
        style={[
          styles.kpiRow,
          isTablet && styles.kpiRowTablet,
        ]}
      >
        <View style={isDesktop ? styles.kpiFlex : undefined}>
          <KpiCard
            icon="counter"
            label="Producciones"
            value={String(stats.productions_count_today)}
          />
        </View>
        <View style={isDesktop ? styles.kpiFlex : undefined}>
          <KpiCard
            icon="import"
            label="Insumos Consumidos"
            value={String(stats.consumption_lines)}
          />
        </View>
        <View style={isDesktop ? styles.kpiFlex : undefined}>
          <KpiCard
            icon="export-variant"
            label="Productos Generados"
            value={String(stats.output_lines)}
          />
        </View>
        <View style={isDesktop ? styles.kpiFlex : undefined}>
          <KpiCard
            icon="trash-can-outline"
            label="% Merma"
            value={wasteValue}
          />
        </View>
      </View>

      {hasTop && (
        <View style={styles.topCard}>
          <View style={styles.topCardHeader}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={16}
              color={palette.textMuted}
            />
            <Text style={styles.topCardTitle}>TOP 3 DEL DÍA</Text>
          </View>
          <View style={styles.topCardBody}>
            <View style={styles.topColumn}>
              <Text style={styles.topColumnLabel}>MÁS CONSUMIDOS</Text>
              {stats.top_consumed.length === 0 ? (
                <Text style={styles.topEmpty}>—</Text>
              ) : (
                stats.top_consumed.map((p) => (
                  <TopRow
                    key={`c-${p.product_id}-${p.unit_id}`}
                    product={p}
                    type="in"
                  />
                ))
              )}
            </View>
            <View style={styles.topColumn}>
              <Text style={styles.topColumnLabel}>MÁS PRODUCIDOS</Text>
              {stats.top_produced.length === 0 ? (
                <Text style={styles.topEmpty}>—</Text>
              ) : (
                stats.top_produced.map((p) => (
                  <TopRow
                    key={`o-${p.product_id}-${p.unit_id}`}
                    product={p}
                    type="out"
                  />
                ))
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Loading ---
  loadingWrap: {
    padding: tokens.spacing[5],
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: tokens.spacing[2],
  },
  loadingText: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },

  // --- Mobile scroll ---
  mobileScroll: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    gap: tokens.spacing[3],
  },
  mobileKpi: {
    width: 200,
  },
  mobileTop: {
    width: 260,
  },

  // --- Desktop/tablet wrap ---
  desktopWrap: {
    padding: tokens.spacing[3],
    gap: tokens.spacing[3],
  },
  kpiRow: {
    flexDirection: "row",
    gap: tokens.spacing[3],
  },
  kpiRowTablet: {
    flexWrap: "wrap",
  },
  kpiFlex: {
    flex: 1,
  },

  // --- Top products card ---
  topCard: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[4],
    ...tokens.shadow.sm,
  },
  topCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[3],
  },
  topCardTitle: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  topCardBody: {
    flexDirection: "row",
    gap: tokens.spacing[4],
  },
  topColumn: {
    flex: 1,
    minWidth: 0,
  },
  topColumnLabel: {
    ...tokens.typography.micro,
    color: palette.textMuted,
    marginBottom: tokens.spacing[2],
  },
  topEmpty: {
    ...tokens.typography.caption,
    color: palette.textMuted,
  },

  // --- Top row ---
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[1] + 2,
    gap: tokens.spacing[2],
  },
  topRowIconBox: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  topRowName: {
    ...tokens.typography.caption,
    color: palette.text,
    flex: 1,
    minWidth: 0,
  },
  topRowQty: {
    ...tokens.typography.caption,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  topRowUnit: {
    ...tokens.typography.micro,
    color: palette.textMuted,
    fontWeight: "400",
  },
});
