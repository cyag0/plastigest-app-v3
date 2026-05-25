import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Surface,
  Text,
} from "react-native-paper";

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  pending:    { color: "#6B7280", icon: "clock-outline",         label: "Pendiente" },
  preparing:  { color: "#D97706", icon: "progress-clock",        label: "Preparando" },
  in_transit: { color: "#2563EB", icon: "truck-delivery",        label: "En tránsito" },
  delivered:  { color: "#16A34A", icon: "check-circle-outline",  label: "Entregado" },
  cancelled:  { color: "#DC2626", icon: "close-circle-outline",  label: "Cancelado" },
};

const FLOW_DELIVERY = ["pending", "preparing", "in_transit", "delivered"] as const;
const FLOW_COUNTER  = ["pending", "delivered"] as const;

const fmt = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value || 0);

const toNum = (v: any) => Number(v ?? 0) || 0;

const PM_OPTIONS: { value: "cash" | "card" | "transfer" | "credit"; label: string; icon: string }[] = [
  { value: "cash", label: "Efectivo", icon: "cash" },
  { value: "card", label: "Tarjeta", icon: "credit-card" },
  { value: "transfer", label: "Transferencia", icon: "bank-transfer" },
  { value: "credit", label: "Crédito", icon: "account-clock" },
];

export default function SalesOrderDetail() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const alerts = useAlerts();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await Services.salesOrders.show(id);
      const data = (res as any).data?.data ?? (res as any).data;
      setOrder(data);
    } catch (e: any) {
      alerts.error(
        e?.response?.data?.message || e?.message || "Error al cargar el pedido",
      );
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (
    label: string,
    fn: () => Promise<any>,
    confirm = true,
  ) => {
    if (confirm) {
      const ok = await alerts.confirm(`¿Deseas ${label.toLowerCase()}?`, {
        title: label,
        okText: "Confirmar",
        cancelText: "Cancelar",
      });
      if (!ok) return;
    }
    try {
      setActionLoading(true);
      const res = await fn();
      alerts.success(res?.message || `${label} aplicado`);
      await load();
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      const firstError =
        errors && typeof errors === "object"
          ? (Object.values(errors)[0] as any)?.[0]
          : null;
      alerts.error(
        firstError ||
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          `No se pudo ${label.toLowerCase()}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const onCheckoutSubmit = async () => {
    setCheckoutOpen(false);
    await runAction(
      "Cobrar pedido",
      () =>
        Services.salesOrders.checkout(Number(id), {
          payment_method: paymentMethod,
          paid_amount: paidAmount ? toNum(paidAmount) : undefined,
          notes: paymentNotes || undefined,
        }),
      false,
    );
  };

  const handlePrepare = async () => {
    const ok = await alerts.confirm("¿Deseas marcar como preparando?", {
      title: "Marcar como preparando",
      okText: "Confirmar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    try {
      setActionLoading(true);
      const res = await Services.salesOrders.prepare(Number(id));
      alerts.success((res as any)?.message || "Preparando aplicado");
      Services.tasks
        .store({
          title: `Preparar pedido #${order.order_number}`,
          priority: "high",
          location_id: order.location?.id ?? undefined,
          due_date: order.promised_at ?? undefined,
          related_type: "sales_order",
          related_id: order.id,
        })
        .catch(() => {});
      await load();
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      const firstError =
        errors && typeof errors === "object"
          ? (Object.values(errors)[0] as any)?.[0]
          : null;
      alerts.error(
        firstError ||
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo marcar como preparando",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const status: string = order.status;
  const serviceMode: string = order.service_mode;
  const isPending = status === "pending";
  const isPreparing = status === "preparing";
  const isInTransit = status === "in_transit";
  const isDelivered = status === "delivered";
  const isCancelled = status === "cancelled";
  const isCounter = serviceMode === "counter";
  const isDelivery = serviceMode === "delivery";

  const canPrepare = isDelivery && isPending;
  const canShip = isDelivery && isPreparing;
  const canDeliver = isDelivery && isInTransit && !!order.sale_id;
  const canCancel = !isDelivered && !isCancelled && !order.sale_id;
  const canCheckout =
    !isCancelled && !order.sale_id &&
    ((isCounter && isPending) || (isDelivery && (isPreparing || isInTransit)));

  const hasAnyAction = canPrepare || canShip || canDeliver || canCancel || canCheckout;

  const statusCfg   = STATUS_CONFIG[status] ?? { color: palette.primary, icon: "help-circle", label: status };
  const statusColor = statusCfg.color;
  const statusIcon  = statusCfg.icon;
  const statusLabel = order.status_label || statusCfg.label;

  const flowSteps       = (isDelivery ? FLOW_DELIVERY : FLOW_COUNTER) as readonly string[];
  const activeStepIndex = flowSteps.indexOf(status);

  return (
    <View style={{ flex: 1, backgroundColor: "#f2f4f7" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: hasAnyAction ? 140 : 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Colored header ── */}
        <Surface style={[styles.card, { backgroundColor: statusColor }]} elevation={4}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderLabel}>PEDIDO</Text>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <View style={styles.row}>
                <MaterialCommunityIcons name="account" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.headerMeta} numberOfLines={1}>
                  {order.customer_name || order.customer?.name || "Sin cliente"}
                </Text>
              </View>
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name={isDelivery ? "truck-delivery" : "storefront-outline"}
                  size={14}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.headerMeta}>
                  {order.service_mode_label ?? serviceMode}
                  {order.channel_label ? ` · ${order.channel_label}` : ""}
                </Text>
              </View>
              <View style={styles.row}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.headerMeta}>{order.order_date}</Text>
              </View>
              {!!order.location && (
                <View style={styles.row}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.headerMeta}>{order.location.name}</Text>
                </View>
              )}
            </View>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name={statusIcon as any} size={32} color="rgba(255,255,255,0.95)" />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <Divider style={{ backgroundColor: "rgba(255,255,255,0.3)", marginVertical: 16 }} />

          <View style={styles.totalRow}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Total del pedido</Text>
            <Text style={styles.totalValue}>{fmt(toNum(order.total_amount))}</Text>
          </View>
          <View style={[styles.row, { marginTop: 10 }]}>
            <MaterialCommunityIcons
              name={order.sale_id ? "check-circle" : "clock-outline"}
              size={15}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
              {order.sale_id ? "Cobrado" : "Pendiente de pago"}
            </Text>
          </View>
          {!!order.promised_at && (
            <View style={[styles.row, { marginTop: 6 }]}>
              <MaterialCommunityIcons name="clock-alert-outline" size={15} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                Entregar antes de: {order.promised_at}
              </Text>
            </View>
          )}
        </Surface>

        {/* ── Timeline vertical ── */}
        {!isCancelled && (
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Progreso</Text>
            <View style={{ marginTop: 16 }}>
              {flowSteps.map((key, index) => {
                const cfg = STATUS_CONFIG[key] ?? { color: "#ccc", icon: "help-circle", label: key };
                const isActive    = key === status;
                const isCompleted = index < activeStepIndex;
                const isLast      = index === flowSteps.length - 1;
                const dotColor    = isActive || isCompleted ? statusColor : "#e4e7ec";
                return (
                  <View key={key} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: dotColor, borderColor: dotColor }]}>
                        <MaterialCommunityIcons
                          name={(isCompleted ? "check" : cfg.icon) as any}
                          size={14}
                          color="white"
                        />
                      </View>
                      {!isLast && (
                        <View style={[styles.timelineLine, { backgroundColor: isCompleted ? statusColor : "#e4e7ec" }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text
                        variant="bodyMedium"
                        style={{ fontWeight: isActive ? "700" : "400", color: isActive || isCompleted ? "#1a1a1a" : "#aaa" }}
                      >
                        {cfg.label}
                      </Text>
                      <Text variant="bodySmall" style={{ color: "#aaa", fontSize: 11 }}>
                        {isActive ? "Estado actual" : isCompleted ? "Completado" : "Pendiente"}
                      </Text>
                    </View>
                    {(isActive || isCompleted) && (
                      <MaterialCommunityIcons name="check-circle" size={18} color={statusColor} />
                    )}
                  </View>
                );
              })}
            </View>
          </Surface>
        )}

        {/* ── Cancelado banner ── */}
        {isCancelled && (
          <Surface style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]} elevation={1}>
            <MaterialCommunityIcons name="close-circle" size={32} color="#DC2626" />
            <View>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: "#DC2626" }}>Pedido cancelado</Text>
              <Text variant="bodySmall" style={{ color: "#aaa" }}>Este pedido fue cancelado</Text>
            </View>
          </Surface>
        )}

        {/* ── Productos ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Productos</Text>
            <Chip
              compact
              style={{ backgroundColor: palette.primary + "18" }}
              textStyle={{ color: palette.primary, fontSize: 12, fontWeight: "700" }}
            >
              {String(order.details?.length || 0)}
            </Chip>
          </View>
          <View style={{ gap: 10, marginTop: 8 }}>
            {(order.details ?? []).map((d: any, idx: number) => (
              <View key={d.id ?? idx} style={styles.productItem}>
                <View style={styles.productThumb}>
                  <MaterialCommunityIcons name="package-variant" size={24} color={palette.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {d.product?.name ?? d.product_name ?? `Producto ${d.product_id}`}
                  </Text>
                  {!!d.package && (
                    <View style={[styles.row, { marginTop: 2 }]}>
                      <MaterialCommunityIcons name="package-variant-closed" size={12} color="#aaa" />
                      <Text variant="bodySmall" style={{ color: "#999" }}>{d.package.package_name}</Text>
                    </View>
                  )}
                  {!!d.unit && (
                    <Text variant="bodySmall" style={{ color: "#aaa", marginTop: 2 }}>
                      {d.unit.name} ({d.unit.abbreviation})
                    </Text>
                  )}
                  <View style={[styles.row, { justifyContent: "space-between", marginTop: 8 }]}>
                    <View style={styles.qtyBadge}>
                      <Text variant="bodySmall" style={{ color: palette.primary, fontWeight: "700" }}>
                        {toNum(d.requested_quantity)} × {fmt(toNum(d.unit_price))}
                      </Text>
                    </View>
                    <Text variant="titleSmall" style={{ fontWeight: "bold", color: palette.primary }}>
                      {fmt(toNum(d.line_total))}
                    </Text>
                  </View>
                  {(toNum(d.prepared_quantity) > 0 || toNum(d.delivered_quantity) > 0) && (
                    <View style={[styles.row, { marginTop: 6, gap: 14 }]}>
                      {toNum(d.prepared_quantity) > 0 && (
                        <View style={styles.row}>
                          <MaterialCommunityIcons name="progress-check" size={13} color="#D97706" />
                          <Text variant="bodySmall" style={{ color: "#D97706", fontWeight: "600" }}>
                            Preparado: {toNum(d.prepared_quantity)}
                          </Text>
                        </View>
                      )}
                      {toNum(d.delivered_quantity) > 0 && (
                        <View style={styles.row}>
                          <MaterialCommunityIcons name="check-circle-outline" size={13} color="#16A34A" />
                          <Text variant="bodySmall" style={{ color: "#16A34A", fontWeight: "600" }}>
                            Entregado: {toNum(d.delivered_quantity)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
          <Divider style={{ marginVertical: 16 }} />
          <View style={{ gap: 6 }}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text variant="bodyMedium" style={{ color: "#666" }}>Subtotal</Text>
              <Text variant="bodyMedium">{fmt(toNum(order.subtotal))}</Text>
            </View>
            {toNum(order.discount_amount) > 0 && (
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text variant="bodyMedium" style={{ color: "#666" }}>Descuento</Text>
                <Text variant="bodyMedium" style={{ color: "#16A34A" }}>-{fmt(toNum(order.discount_amount))}</Text>
              </View>
            )}
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Total</Text>
              <Text variant="titleLarge" style={{ fontWeight: "bold", color: palette.primary }}>
                {fmt(toNum(order.total_amount))}
              </Text>
            </View>
          </View>
        </Surface>

        {/* ── Venta vinculada ── */}
        {!!order.sale && (
          <Surface style={styles.card} elevation={1}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <MaterialCommunityIcons name="receipt" size={18} color="#16A34A" />
              <Text variant="titleMedium" style={styles.sectionTitle}>Venta vinculada</Text>
            </View>
            <View style={[styles.productItem, { backgroundColor: "#f0fdf4" }]}>
              <MaterialCommunityIcons name="receipt" size={28} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: "700", color: "#16A34A" }}>
                  {order.sale.sale_number ?? `Venta #${order.sale.id}`}
                </Text>
                <Text variant="bodySmall" style={{ color: "#16A34A", opacity: 0.8 }}>
                  {order.sale.status}
                </Text>
              </View>
              <Button mode="text" compact onPress={() => router.push(`/home/sales/${order.sale.id}`)}>
                Ver
              </Button>
            </View>
          </Surface>
        )}

        {/* ── Notas ── */}
        {!!(order.notes || order.internal_notes) && (
          <Surface style={styles.card} elevation={1}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <MaterialCommunityIcons name="note-text-outline" size={18} color={palette.primary} />
              <Text variant="titleMedium" style={styles.sectionTitle}>Notas</Text>
            </View>
            {!!order.notes && (
              <Text variant="bodyMedium" style={{ color: "#555", lineHeight: 20 }}>{order.notes}</Text>
            )}
            {!!order.internal_notes && (
              <>
                <Text variant="labelSmall" style={{ color: palette.textSecondary, marginTop: 8 }}>
                  Notas internas
                </Text>
                <Text variant="bodyMedium" style={{ color: "#555", lineHeight: 20 }}>
                  {order.internal_notes}
                </Text>
              </>
            )}
          </Surface>
        )}

        <Portal>
          <Dialog visible={checkoutOpen} onDismiss={() => setCheckoutOpen(false)}>
            <Dialog.Title>Cobrar pedido</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                Total: {fmt(toNum(order.total_amount))}
              </Text>
              <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                Método de pago
              </Text>
              <RadioButton.Group
                onValueChange={(v) => setPaymentMethod(v as any)}
                value={paymentMethod}
              >
                {PM_OPTIONS.map((pm) => (
                  <RadioButton.Item key={pm.value} label={pm.label} value={pm.value} />
                ))}
              </RadioButton.Group>
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                Monto pagado
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={paidAmount}
                onChangeText={setPaidAmount}
                placeholder="0.00"
              />
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                Notas (opcional)
              </Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                multiline
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="Observaciones del cobro"
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCheckoutOpen(false)}>Cancelar</Button>
              <Button mode="contained" onPress={onCheckoutSubmit}>
                Confirmar cobro
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>

      {hasAnyAction && (
        <Surface style={styles.bottomBar} elevation={4}>
          <View style={{ gap: 8 }}>
            {canPrepare && (
              <Button
                mode="contained"
                icon="progress-clock"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={handlePrepare}
                buttonColor="#D97706"
                style={{ borderRadius: 10 }}
              >
                Marcar preparando
              </Button>
            )}
            {canShip && (
              <Button
                mode="contained"
                icon="truck-fast"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={() => runAction("Enviar a ruta", () => Services.salesOrders.ship(Number(id)))}
                buttonColor="#2563EB"
                style={{ borderRadius: 10 }}
              >
                Enviar a ruta
              </Button>
            )}
            {canCheckout && (
              <Button
                mode="contained"
                icon="cash-register"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={() => {
                  setPaidAmount(String(toNum(order.total_amount)));
                  setCheckoutOpen(true);
                }}
                buttonColor="#16A34A"
                style={{ borderRadius: 10 }}
              >
                Cobrar y cerrar venta
              </Button>
            )}
            {canDeliver && (
              <Button
                mode="contained"
                icon="check-circle"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={() => runAction("Marcar como entregado", () => Services.salesOrders.deliver(Number(id)))}
                buttonColor="#16A34A"
                style={{ borderRadius: 10 }}
              >
                Marcar entregado
              </Button>
            )}
            {canCancel && (
              <Button
                mode="outlined"
                icon="close-circle"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={() => runAction("Cancelar pedido", () => Services.salesOrders.cancel(Number(id)))}
                textColor="#DC2626"
                style={{ borderRadius: 10, borderColor: "#DC2626" }}
              >
                Cancelar pedido
              </Button>
            )}
          </View>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  card:    { backgroundColor: "white", borderRadius: 18, padding: 20 },
  // Header
  headerTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderLabel:  { color: "rgba(255,255,255,0.75)", letterSpacing: 2, fontSize: 11, fontWeight: "700" },
  orderNumber: { color: "white", fontWeight: "bold", fontSize: 24, marginBottom: 10 },
  headerMeta:  { color: "rgba(255,255,255,0.85)", fontSize: 13, flexShrink: 1 },
  statusBadge: { alignItems: "center", gap: 4, paddingLeft: 12 },
  statusText:  { color: "rgba(255,255,255,0.9)", fontWeight: "700", textAlign: "center", fontSize: 12 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalValue:  { color: "white", fontWeight: "bold", fontSize: 22 },
  // Common
  row:           { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:  { fontWeight: "700" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // Timeline
  timelineItem:    { flexDirection: "row", alignItems: "flex-start", paddingBottom: 20 },
  timelineLeft:    { alignItems: "center", marginRight: 14 },
  timelineDot:     { width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  timelineLine:    { width: 2, flex: 1, marginTop: 4, minHeight: 24 },
  timelineContent: { flex: 1, paddingTop: 4 },
  // Products
  productItem:  { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#f6f7fb", borderRadius: 12, padding: 12 },
  productThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#e4e7ec", justifyContent: "center", alignItems: "center" },
  qtyBadge:     { backgroundColor: "#e8f0fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  // BottomBar
  bottomBar: {
    backgroundColor: "white",
    padding: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  // Dialog input
  input: {
    borderWidth: 1,
    borderColor: palette.border ?? "#ccc",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
});
