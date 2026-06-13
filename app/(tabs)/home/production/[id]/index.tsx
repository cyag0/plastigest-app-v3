import ProductionStatusBadge from "@/components/Production/ProductionStatusBadge";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, DataTable, Divider, Text } from "react-native-paper";

export default function ProductionDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const [order, setOrder] = useState<any | null>(null);
  const [variance, setVariance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r: any = await Services.productionOrders.show(parseInt(params.id, 10));
        setOrder(r?.data?.data ?? r?.data);
        if ((r?.data?.data ?? r?.data)?.formula_id) {
          try {
            const v: any = await Services.productionOrders.getVariance(parseInt(params.id, 10));
            setVariance(v.data);
          } catch (e) {
            // ignore
          }
        }
      } catch (e: any) {
        alerts.error("No se pudo cargar: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, alerts]);

  const handleCancel = async () => {
    if (!order) return;
    const ok = await alerts.confirm(
      `¿Cancelar la producción ${order.folio}? Se revertirá el stock.`,
      { title: "Cancelar producción", okText: "Sí, cancelar", cancelText: "Volver" },
    );
    if (!ok) return;
    try {
      await Services.productionOrders.cancel(order.id);
      alerts.success("Producción cancelada");
      router.back();
    } catch (e: any) {
      alerts.error("No se pudo cancelar: " + e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.primary} />
        <Text style={{ marginTop: 8, color: palette.textSecondary }}>
          Cargando producción…
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={{ color: palette.textSecondary }}>Producción no encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "transparent" as any }}
      contentContainerStyle={{ padding: 12, paddingBottom: 80, maxWidth: 600, width: "100%", alignSelf: "center" }}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ color: palette.text, fontWeight: "700" }}>
                {order.folio}
              </Text>
              <Text style={{ color: palette.textSecondary, marginTop: 2 }}>
                {new Date(order.production_date).toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <ProductionStatusBadge status={order.status} size="medium" />
          </View>

          <Divider style={{ marginVertical: 12, backgroundColor: palette.border }} />

          <View style={styles.metaRow}>
            <MetaItem icon="account" label="Responsable" value={order.responsible_name ?? "—"} />
            <MetaItem icon="map-marker" label="Sucursal" value={order.location_name ?? "—"} />
          </View>
  
          {order.notes ? (
            <View style={styles.notesBlock}>
              <Text style={{ color: palette.textSecondary, fontSize: 12, marginBottom: 2 }}>
                Observaciones
              </Text>
              <Text style={{ color: palette.text }}>{order.notes}</Text>
            </View>
          ) : null}
        </Card.Content>
      </Card>

      <SectionTitle icon="package-variant-closed" title={`Consumos (${order.consumptions?.length ?? 0})`} />
      <Card style={styles.card}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Producto</DataTable.Title>
            <DataTable.Title numeric>Cantidad</DataTable.Title>
          </DataTable.Header>
          {(order.consumptions ?? []).map((c: any, i: number) => (
            <DataTable.Row key={i}>
              <DataTable.Cell>
                <Text style={{ color: palette.text }}>{c.product_name}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 11 }}>{" " + c.unit_name}</Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{ color: palette.error, fontWeight: "600" }}>
                  −{Number(c.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
          {(!order.consumptions || order.consumptions.length === 0) ? (
            <View style={styles.empty}><Text style={{ color: palette.textSecondary }}>Sin consumos registrados</Text></View>
          ) : null}
        </DataTable>
      </Card>

      <SectionTitle icon="package-variant" title={`Productos (${order.outputs?.length ?? 0})`} />
      <Card style={styles.card}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Producto</DataTable.Title>
            <DataTable.Title numeric>Cantidad</DataTable.Title>
          </DataTable.Header>
          {(order.outputs ?? []).map((o: any, i: number) => (
            <DataTable.Row key={i}>
              <DataTable.Cell>
                <Text style={{ color: palette.text }}>{o.product_name}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 11 }}>{" " + o.unit_name}</Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{ color: palette.success, fontWeight: "600" }}>
                  +{Number(o.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                </Text>
              </DataTable.Cell>
       
            </DataTable.Row>
          ))}
          {(!order.outputs || order.outputs.length === 0) ? (
            <View style={styles.empty}><Text style={{ color: palette.textSecondary }}>Sin productos registrados</Text></View>
          ) : null}
        </DataTable>
      </Card>

      {(order.wastes?.length ?? 0) > 0 ? (
        <>
          <SectionTitle icon="trash-can-outline" title={`Mermas (${order.wastes.length})`} />
          <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: palette.error }]}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Producto</DataTable.Title>
                <DataTable.Title>Cantidad</DataTable.Title>
                <DataTable.Title>Tipo</DataTable.Title>
              </DataTable.Header>
              {order.wastes.map((w: any, i: number) => (
                <DataTable.Row key={i}>
                  <DataTable.Cell>
                    <Text style={{ color: palette.text }}>{w.product_name}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={{ color: palette.error, fontWeight: "600" }}>
                      −{Number(w.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} {w.unit_name}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                      {w.reason_label}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card>
        </>
      ) : null}

      {variance ? (
        <>
          <SectionTitle icon="chart-line-variant" title="Varianza vs Fórmula" />
          <Card style={styles.card}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Producto</DataTable.Title>
                <DataTable.Title numeric>Real</DataTable.Title>
                <DataTable.Title numeric>Esperado</DataTable.Title>
                <DataTable.Title numeric>% Var</DataTable.Title>
              </DataTable.Header>
              {[...(variance.consumptions ?? []), ...(variance.outputs ?? [])].map(
                (v: any, i: number) => (
                  <DataTable.Row key={i}>
                    <DataTable.Cell>
                      <Text style={{ color: palette.text }}>{v.product_name}</Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text style={{ color: palette.text }}>
                        {Number(v.actual).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text style={{ color: palette.textSecondary }}>
                        {v.expected != null
                          ? Number(v.expected).toLocaleString("es-MX", { maximumFractionDigits: 2 })
                          : "—"}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text
                        style={{
                          color:
                            (v.variance_pct ?? 0) > 10
                              ? palette.error
                              : (v.variance_pct ?? 0) < -10
                                ? palette.warning
                                : palette.success,
                          fontWeight: "600",
                        }}
                      >
                        {v.variance_pct != null ? `${v.variance_pct}%` : "—"}
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                ),
              )}
            </DataTable>
          </Card>
        </>
      ) : null}

      <View style={styles.actionBar}>
        {order.status === "draft" ? (
          <Button
            mode="outlined"
            onPress={() => router.push(`/(tabs)/home/production/${order.id}/edit` as any)}
            style={{ flex: 1, marginRight: 8 }}
            icon="pencil"
          >
            Editar
          </Button>
        ) : null}
  
      </View>
    </ScrollView>
  );
}

function MetaItem({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
      <MaterialCommunityIcons name={icon as any} size={18} color={palette.primary} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={{ color: palette.textSecondary, fontSize: 11 }}>{label}</Text>
        <Text style={{ color: valueColor ?? palette.text, fontWeight: "600" }}>{value}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons name={icon as any} size={18} color={palette.primary} />
      <Text style={{ marginLeft: 8, color: palette.text, fontWeight: "700", fontSize: 14 }}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  metaRow: { flexDirection: "row", marginVertical: 4 },
  notesBlock: { marginTop: 12, padding: 8, backgroundColor: palette.surface, borderRadius: 8 },
  sectionTitle: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 6 },
  empty: { padding: 12, alignItems: "center" },
  actionBar: { flexDirection: "row", marginTop: 16 },
});
