import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext, getIn } from "formik";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

interface Row {
  product_id: number;
  product_name?: string;
  unit_id: number;
  unit_name?: string;
  quantity: number;
}

interface Props {
  consumptionsName?: string;
  outputsName?: string;
}

function groupByProduct(rows: Row[], productsCache: Record<number, any>) {
  const map = new Map<number, { name: string; unit: string; quantity: number }>();
  for (const r of rows) {
    if (!r.product_id || !r.quantity) continue;
    const key = r.product_id;
    const prev = map.get(key);
    const product = productsCache[key];
    const name = r.product_name ?? product?.name ?? `Producto #${key}`;
    const unit = r.unit_name ?? product?.unit?.name ?? "";
    if (prev) {
      prev.quantity += Number(r.quantity);
    } else {
      map.set(key, { name, unit, quantity: Number(r.quantity) });
    }
  }
  return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
}

export default function InventorySummaryPanel({
  consumptionsName = "consumptions",
  outputsName = "outputs",
}: Props) {
  const { values } = useFormikContext<any>();
  const consumptions: Row[] = getIn(values, consumptionsName) ?? [];
  const outputs: Row[] = getIn(values, outputsName) ?? [];

  // Cache de productos para resolver nombres
  const productIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...consumptions.map((c) => c.product_id).filter(Boolean),
          ...outputs.map((o) => o.product_id).filter(Boolean),
        ]),
      ),
    [consumptions, outputs],
  );

  const [cache, setCache] = React.useState<Record<number, any>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = productIds.filter((id) => !cache[id]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const r: any = await Services.products.show(id);
            return [id, r?.data?.data ?? r?.data] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setCache((prev) => {
        const next = { ...prev };
        for (const [id, data] of entries) next[id] = data;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(",")]);

  const groupedConsumed = useMemo(
    () => groupByProduct(consumptions, cache),
    [consumptions, cache],
  );
  const groupedProduced = useMemo(
    () => groupByProduct(outputs, cache),
    [outputs, cache],
  );

  return (
    <Card style={[styles.card, { backgroundColor: palette.surface, shadowOffset: { width: 0, height: 0 },}]}>
      <Card.Content>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="chart-box" size={20} color={palette.primary} />
          <Text
            variant="titleSmall"
            style={{ color: palette.text, fontWeight: "700", marginLeft: 8 }}
          >
            Resumen de Inventario
          </Text>
        </View>

        <ScrollView
          style={{ maxHeight: 220 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="minus-circle"
                size={16}
                color={palette.error}
              />
              <Text style={[styles.sectionTitle, { color: palette.error }]}>
                Consumido
              </Text>
            </View>
            {groupedConsumed.length === 0 ? (
              <Text style={styles.empty}>— sin consumos —</Text>
            ) : (
              groupedConsumed.map((row) => (
                <View key={row.id} style={styles.lineRow}>
                  <Text style={[styles.lineQty, { color: palette.error }]}>
                    −{row.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.lineUnit, { color: palette.error }]}>
                    {row.unit}
                  </Text>
                  <Text style={[styles.lineName, { color: palette.text }]}>
                    {row.name}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="plus-circle"
                size={16}
                color={palette.success}
              />
              <Text style={[styles.sectionTitle, { color: palette.success }]}>
                Producido
              </Text>
            </View>
            {groupedProduced.length === 0 ? (
              <Text style={styles.empty}>— sin productos —</Text>
            ) : (
              groupedProduced.map((row) => (
                <View key={row.id} style={styles.lineRow}>
                  <Text style={[styles.lineQty, { color: palette.success }]}>
                    +{row.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.lineUnit, { color: palette.success }]}>
                    {row.unit}
                  </Text>
                  <Text style={[styles.lineName, { color: palette.text }]}>
                    {row.name}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 0,
    shadowColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  lineQty: {
    fontWeight: "700",
    width: 60,
  },
  lineUnit: {
    fontSize: 11,
    width: 40,
  },
  lineName: {
    flex: 1,
    fontSize: 13,
  },
  empty: {
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
  },
});
