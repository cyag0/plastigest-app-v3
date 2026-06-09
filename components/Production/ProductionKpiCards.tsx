import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { useResponsive } from "@/hooks/useResponsive";

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
  const color = isIn ? palette.error : palette.success;
  const icon = isIn ? "minus-circle" : "plus-circle";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
      }}
    >
      <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      <Text
        style={{
          flex: 1,
          color: palette.text,
          fontSize: 12,
          marginLeft: 6,
        }}
        numberOfLines={1}
      >
        {product.product_name}
      </Text>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>
        {isIn ? "−" : "+"}
        {product.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })}{" "}
        <Text style={{ color: palette.textSecondary, fontSize: 10 }}>
          {product.unit_name}
        </Text>
      </Text>
    </View>
  );
}

interface StatTileProps {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}

function StatTile({ icon, label, value, sublabel, color }: StatTileProps) {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: palette.card, borderLeftColor: color, borderLeftWidth: 4 },
      ]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            variant="bodySmall"
            style={{ color: palette.textSecondary, marginBottom: 2 }}
          >
            {label}
          </Text>
          <Text
            variant="titleLarge"
            style={{ color: palette.text, fontWeight: "700" }}
          >
            {value}
          </Text>
          {sublabel ? (
            <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 2 }}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function ProductionKpiCards() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
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
      <View
        style={{
          padding: 16,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={palette.primary} size="small" />
        <Text style={{ marginLeft: 8, color: palette.textSecondary }}>
          Cargando KPIs del día…
        </Text>
      </View>
    );
  }

  const wasteColor =
    stats.waste_percentage_today === null
      ? palette.textSecondary
      : stats.waste_percentage_today > 20
        ? palette.error
        : stats.waste_percentage_today > 10
          ? palette.warning
          : palette.success;

  const wasteValue = stats.waste_percentage_today === null
    ? "N/D"
    : `${stats.waste_percentage_today.toFixed(1)}%`;
  const wasteSublabel = stats.waste_percentage_today === null
    ? "Unidades mixtas: usa el detalle por orden"
    : stats.waste_percentage_today > 20
      ? "Alta — revisa insumos"
      : stats.waste_percentage_today > 10
        ? "Aceptable"
        : "Óptima";

  const tiles: StatTileProps[] = [
    {
      icon: "counter",
      label: "Producciones",
      value: String(stats.productions_count_today),
      sublabel: "completadas hoy",
      color: palette.primary,
    },
    {
      icon: "import",
      label: "Insumos consumidos",
      value: String(stats.consumption_lines),
      sublabel: `${stats.total_consumed_quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} en total`,
      color: palette.error,
    },
    {
      icon: "export-variant",
      label: "Productos generados",
      value: String(stats.output_lines),
      sublabel: `${stats.total_produced_quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} en total`,
      color: palette.success,
    },
    {
      icon: "trash-can-outline",
      label: "% Merma",
      value: wasteValue,
      sublabel: wasteSublabel,
      color: wasteColor,
    },
  ];

  if (isMobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
      >
        {tiles.map((t) => (
          <View key={t.label} style={{ width: 200 }}>
            <StatTile {...t} />
          </View>
        ))}
        {(stats.top_consumed.length > 0 || stats.top_produced.length > 0) && (
          <View style={{ width: 260 }}>
            <Card style={[styles.card, { backgroundColor: palette.card }]}>
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <MaterialCommunityIcons name="chart-bar" size={18} color={palette.primary} />
                  <Text style={{ marginLeft: 6, color: palette.text, fontWeight: "700" }}>
                    Top del día
                  </Text>
                </View>
                {stats.top_consumed.map((p) => (
                  <TopRow key={`c-${p.product_id}-${p.unit_id}`} product={p} type="in" />
                ))}
                {stats.top_produced.map((p) => (
                  <TopRow key={`o-${p.product_id}-${p.unit_id}`} product={p} type="out" />
                ))}
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={{ padding: 12, gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: isTablet ? "wrap" : "nowrap",
          gap: 8,
        }}
      >
        {tiles.map((t) => (
          <View
            key={t.label}
            style={{ flex: isDesktop ? 1 : undefined, minWidth: isTablet ? "48%" : 0 }}
          >
            <StatTile {...t} />
          </View>
        ))}
      </View>
      {(stats.top_consumed.length > 0 || stats.top_produced.length > 0) && (
        <Card style={[styles.card, { backgroundColor: palette.card }]}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <MaterialCommunityIcons name="chart-bar" size={18} color={palette.primary} />
              <Text style={{ marginLeft: 6, color: palette.text, fontWeight: "700" }}>
                Top 3 del día
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.textSecondary,
                    fontSize: 11,
                    marginBottom: 4,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Más consumidos
                </Text>
                {stats.top_consumed.length === 0 ? (
                  <Text style={{ color: palette.textSecondary, fontSize: 12 }}>—</Text>
                ) : (
                  stats.top_consumed.map((p) => (
                    <TopRow key={`c-${p.product_id}-${p.unit_id}`} product={p} type="in" />
                  ))
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.textSecondary,
                    fontSize: 11,
                    marginBottom: 4,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Más producidos
                </Text>
                {stats.top_produced.length === 0 ? (
                  <Text style={{ color: palette.textSecondary, fontSize: 12 }}>—</Text>
                ) : (
                  stats.top_produced.map((p) => (
                    <TopRow key={`o-${p.product_id}-${p.unit_id}`} product={p} type="out" />
                  ))
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff20",
  },
});
