import { formatDate } from "@/utils/dates";
import AmountPreview from "@/components/Pos/AmountPreview";
import OpenShiftModal from "@/components/Pos/OpenShiftModal";
import {
  apiErrorCode,
  apiErrorMessage,
  isOutcomeUnknown,
  SALE_ERROR_CODES,
} from "@/components/Pos/saleErrors";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { parseMoney } from "@/utils/format";
import { amountToCents, centsToAmount } from "@/utils/money";
import { newClientRequestId } from "@/utils/requestId";
import services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  pending:    { color: "#6E6B5E", icon: "clock-outline",         label: "Pendiente" },
  preparing:  { color: "#C47F12", icon: "progress-clock",        label: "Preparando" },
  in_transit: { color: "#2F6F7E", icon: "truck-delivery",        label: "En tránsito" },
  delivered:  { color: "#3F8A3A", icon: "check-circle-outline",  label: "Entregado" },
  cancelled:  { color: "#B9412C", icon: "close-circle-outline",  label: "Cancelado" },
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

/** Espera antes de revisar un cobro cuya respuesta se perdió: pudo seguir en proceso. */
const VERIFY_DELAY_MS = 1500;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Aviso dentro del diálogo de cobro. */
type CheckoutMessage = {
  text: string;
  /** "warning": el cobro pudo registrarse, no es un rechazo. */
  tone: "error" | "warning" | "info";
  /** Ofrecer abrir el turno de caja (cobro en efectivo sin turno). */
  openShift?: boolean;
};

export default function SalesOrderDetail() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const alerts = useAlerts();
  const { hasPermission } = useAuth();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Candado de las acciones (cobrar, preparar, enviar, entregar, cancelar):
  // un doble toque no manda dos veces ni abre dos confirmaciones.
  const { submitting: actionLoading, run } = useSubmitGuard();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState<CheckoutMessage | null>(null);
  const [openShiftVisible, setOpenShiftVisible] = useState(false);
  // Llave del cobro (client_request_id): la misma en cada reintento hasta que
  // el pedido queda cobrado.
  const checkoutKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await services.salesOrders.show(id);
      const data = (res as any).data?.data ?? (res as any).data;
      setOrder(data);
    } catch (e: any) {
      alerts.error(
        e?.response?.data?.message || e?.message || "Error al cargar el pedido",
      );
    } finally {
      setLoading(false);
    }
  }, [alerts, id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = (
    label: string,
    fn: () => Promise<any>,
    confirm = true,
  ) =>
    run(async () => {
      if (confirm) {
        const ok = await alerts.confirm(`¿Deseas ${label.toLowerCase()}?`, {
          title: label,
          okText: "Confirmar",
          cancelText: "Cancelar",
        });
        if (!ok) return;
      }
      try {
        const res = await fn();
        alerts.success(res?.message || `${label} aplicado`);
        await load();
      } catch (e: any) {
        alerts.error(apiErrorMessage(e, `No se pudo ${label.toLowerCase()}`));
      }
    });

  const totalCents = amountToCents(toNum(order?.total_amount));

  const openCheckout = () => {
    setPaidAmount(paymentMethod === "credit" ? "0" : centsToAmount(totalCents).toFixed(2));
    setCheckoutMessage(null);
    setCheckoutOpen(true);
  };

  /**
   * A crédito no se cobra nada ahora: el monto queda en 0 y bloqueado. Antes
   * se quedaba el total precargado y el pedido a crédito quedaba como pagado.
   */
  const changePaymentMethod = (method: "cash" | "card" | "transfer" | "credit") => {
    setPaymentMethod(method);
    setCheckoutMessage(null);
    if (method === "credit") setPaidAmount("0");
    else if (paymentMethod === "credit") setPaidAmount(centsToAmount(totalCents).toFixed(2));
  };

  const onCheckoutSubmit = () =>
    run(async () => {
      setCheckoutMessage(null);

      // Formato mexicano ("1,500" son mil quinientos). Un monto que no se
      // entiende se avisa: antes "1,500" se mandaba como 0 y el pedido quedaba
      // a crédito sin que nadie lo notara.
      let paid = 0;
      if (paymentMethod !== "credit") {
        const parsed = parseMoney(paidAmount);
        if (parsed === null || parsed < 0) {
          setCheckoutMessage({
            text: "Captura el monto pagado (0 si queda pendiente): escríbelo como 1500 o 1,500.50.",
            tone: "error",
          });
          return;
        }
        paid = centsToAmount(amountToCents(parsed));
      }

      const clientRequestId = checkoutKeyRef.current ?? newClientRequestId();
      checkoutKeyRef.current = clientRequestId;

      try {
        const res = await services.salesOrders.checkout(Number(id), {
          payment_method: paymentMethod,
          paid_amount: paid,
          notes: paymentNotes || undefined,
          client_request_id: clientRequestId,
        });
        checkoutKeyRef.current = null;
        setCheckoutOpen(false);
        alerts.success(res?.message || "Pedido cobrado");
        await load();
      } catch (e: any) {
        if (isOutcomeUnknown(e)) {
          // Sin respuesta: el pedido dice si quedó cobrado (sale_id).
          await wait(VERIFY_DELAY_MS);
          try {
            const fresh = await services.salesOrders.show(id);
            const data = (fresh as any).data?.data ?? (fresh as any).data;
            if (data?.sale_id) {
              checkoutKeyRef.current = null;
              setOrder(data);
              setCheckoutOpen(false);
              alerts.success("El pedido quedó cobrado.");
              return;
            }
          } catch {
            // Tampoco se pudo consultar.
          }
          setCheckoutMessage({
            text: `${apiErrorMessage(e, "No llegó la respuesta del servidor.")} No se pudo confirmar si el cobro quedó registrado: vuelve a presionar «Confirmar cobro» (si ya se registró no se cobra dos veces).`,
            tone: "warning",
          });
          return;
        }

        if (apiErrorCode(e) === SALE_ERROR_CODES.noOpenSession) {
          const canOpen = hasPermission("sales_pos");
          setCheckoutMessage({
            text: `${apiErrorMessage(e, "Abre un turno de caja para cobrar en efectivo.")}${
              canOpen ? "" : " También puedes cobrarlo con tarjeta, transferencia o a crédito."
            }`,
            tone: "error",
            openShift: canOpen,
          });
          return;
        }
        setCheckoutMessage({ text: apiErrorMessage(e, "No se pudo cobrar el pedido"), tone: "error" });
      }
    });

  const handlePrepare = () =>
    run(async () => {
      const ok = await alerts.confirm("¿Deseas marcar como preparando?", {
        title: "Marcar como preparando",
        okText: "Confirmar",
        cancelText: "Cancelar",
      });
      if (!ok) return;
      try {
        const res = await services.salesOrders.prepare(Number(id));
        alerts.success((res as any)?.message || "Preparando aplicado");
        services.tasks
          .store({
            title: `Preparar pedido #${order.order_number}`,
            description: `Preparar productos del pedido ${order.order_number} para despacho o entrega.`,
            type: "custom",
            priority: "high",
            location_id: order.location?.id ?? undefined,
            due_date: order.promised_at ?? undefined,
            related_type: "sales_order",
            related_id: order.id,
          })
          .catch(() => {});
        await load();
      } catch (e: any) {
        alerts.error(apiErrorMessage(e, "No se pudo marcar como preparando"));
      }
    });

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
    <View style={{ flex: 1, backgroundColor: "#F3F0E8" }}>
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
                <Text style={styles.headerMeta}>{formatDate(order.order_date)}</Text>
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
                const cfg = STATUS_CONFIG[key] ?? { color: "#D3CCBC", icon: "help-circle", label: key };
                const isActive    = key === status;
                const isCompleted = index < activeStepIndex;
                const isLast      = index === flowSteps.length - 1;
                const dotColor    = isActive || isCompleted ? statusColor : "#E6E1D5";
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
                        <View style={[styles.timelineLine, { backgroundColor: isCompleted ? statusColor : "#E6E1D5" }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text
                        variant="bodyMedium"
                        style={{ fontWeight: isActive ? "700" : "400", color: isActive || isCompleted ? "#1a1a1a" : "#A39F92" }}
                      >
                        {cfg.label}
                      </Text>
                      <Text variant="bodySmall" style={{ color: "#A39F92", fontSize: 11 }}>
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
            <MaterialCommunityIcons name="close-circle" size={32} color="#B9412C" />
            <View>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: "#B9412C" }}>Pedido cancelado</Text>
              <Text variant="bodySmall" style={{ color: "#A39F92" }}>Este pedido fue cancelado</Text>
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
                      <MaterialCommunityIcons name="package-variant-closed" size={12} color="#A39F92" />
                      <Text variant="bodySmall" style={{ color: "#8F8B7D" }}>{d.package.package_name}</Text>
                    </View>
                  )}
                  {!!d.unit && (
                    <Text variant="bodySmall" style={{ color: "#A39F92", marginTop: 2 }}>
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
                          <MaterialCommunityIcons name="progress-check" size={13} color="#C47F12" />
                          <Text variant="bodySmall" style={{ color: "#C47F12", fontWeight: "600" }}>
                            Preparado: {toNum(d.prepared_quantity)}
                          </Text>
                        </View>
                      )}
                      {toNum(d.delivered_quantity) > 0 && (
                        <View style={styles.row}>
                          <MaterialCommunityIcons name="check-circle-outline" size={13} color="#3F8A3A" />
                          <Text variant="bodySmall" style={{ color: "#3F8A3A", fontWeight: "600" }}>
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
              <Text variant="bodyMedium" style={{ color: "#66635A" }}>Subtotal</Text>
              <Text variant="bodyMedium">{fmt(toNum(order.subtotal))}</Text>
            </View>
            {toNum(order.discount_amount) > 0 && (
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text variant="bodyMedium" style={{ color: "#66635A" }}>Descuento</Text>
                <Text variant="bodyMedium" style={{ color: "#3F8A3A" }}>-{fmt(toNum(order.discount_amount))}</Text>
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
              <MaterialCommunityIcons name="receipt" size={18} color="#3F8A3A" />
              <Text variant="titleMedium" style={styles.sectionTitle}>Venta vinculada</Text>
            </View>
            <View style={[styles.productItem, { backgroundColor: "#f0fdf4" }]}>
              <MaterialCommunityIcons name="receipt" size={28} color="#3F8A3A" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: "700", color: "#3F8A3A" }}>
                  {order.sale.sale_number ?? `Venta #${order.sale.id}`}
                </Text>
                <Text variant="bodySmall" style={{ color: "#3F8A3A", opacity: 0.8 }}>
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
              <Text variant="bodyMedium" style={{ color: "#57564B", lineHeight: 20 }}>{order.notes}</Text>
            )}
            {!!order.internal_notes && (
              <>
                <Text variant="labelSmall" style={{ color: palette.textSecondary, marginTop: 8 }}>
                  Notas internas
                </Text>
                <Text variant="bodyMedium" style={{ color: "#57564B", lineHeight: 20 }}>
                  {order.internal_notes}
                </Text>
              </>
            )}
          </Surface>
        )}

        <Portal>
          <Dialog
            visible={checkoutOpen}
            // Mientras se cobra no se cierra (tocar fuera, botón atrás).
            onDismiss={() => {
              if (!actionLoading) setCheckoutOpen(false);
            }}
            dismissable={!actionLoading}
            dismissableBackButton={!actionLoading}
          >
            <Dialog.Title>Cobrar pedido</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                Total: {fmt(toNum(order.total_amount))}
              </Text>
              <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                Método de pago
              </Text>
              <RadioButton.Group
                onValueChange={(v) => changePaymentMethod(v as any)}
                value={paymentMethod}
              >
                {PM_OPTIONS.map((pm) => (
                  <RadioButton.Item key={pm.value} label={pm.label} value={pm.value} disabled={actionLoading} />
                ))}
              </RadioButton.Group>
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                {paymentMethod === "credit" ? "A crédito: no se cobra nada ahora" : "Monto pagado"}
              </Text>
              <TextInput
                style={[styles.input, paymentMethod === "credit" && styles.inputDisabled]}
                keyboardType="decimal-pad"
                value={paidAmount}
                onChangeText={(t) => {
                  setPaidAmount(t);
                  setCheckoutMessage(null);
                }}
                editable={paymentMethod !== "credit" && !actionLoading}
                placeholder="0.00"
              />
              {paymentMethod !== "credit" && <AmountPreview value={paidAmount} label="Pagado" />}
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                Notas (opcional)
              </Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                multiline
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                editable={!actionLoading}
                placeholder="Observaciones del cobro"
              />
              {checkoutMessage && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Text
                    variant="bodyMedium"
                    style={{
                      color:
                        checkoutMessage.tone === "error"
                          ? palette.error
                          : checkoutMessage.tone === "warning"
                            ? palette.warning
                            : palette.text,
                    }}
                  >
                    {checkoutMessage.text}
                  </Text>
                  {checkoutMessage.openShift && (
                    <Button
                      mode="outlined"
                      icon="cash-register"
                      compact
                      onPress={() => setOpenShiftVisible(true)}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Abrir turno
                    </Button>
                  )}
                </View>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCheckoutOpen(false)} disabled={actionLoading}>
                Cancelar
              </Button>
              <Button mode="contained" onPress={onCheckoutSubmit} loading={actionLoading} disabled={actionLoading}>
                Confirmar cobro
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Cobro en efectivo sin turno: abrirlo aquí y volver a cobrar. */}
        <OpenShiftModal
          visible={openShiftVisible}
          onClose={() => setOpenShiftVisible(false)}
          onOpened={() => {
            setOpenShiftVisible(false);
            setCheckoutMessage({ text: "Turno abierto. Confirma el cobro de nuevo.", tone: "info" });
          }}
        />
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
                buttonColor="#C47F12"
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
                onPress={() => runAction("Enviar a ruta", () => services.salesOrders.ship(Number(id)))}
                buttonColor="#2F6F7E"
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
                onPress={openCheckout}
                buttonColor="#3F8A3A"
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
                onPress={() => runAction("Marcar como entregado", () => services.salesOrders.deliver(Number(id)))}
                buttonColor="#3F8A3A"
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
                onPress={() => runAction("Cancelar pedido", () => services.salesOrders.cancel(Number(id)))}
                textColor="#B9412C"
                style={{ borderRadius: 10, borderColor: "#B9412C" }}
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
  productItem:  { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#F6F4EE", borderRadius: 12, padding: 12 },
  productThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#E6E1D5", justifyContent: "center", alignItems: "center" },
  qtyBadge:     { backgroundColor: "#DFEDF0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
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
    borderColor: palette.border ?? "#D3CCBC",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  inputDisabled: {
    backgroundColor: palette.surfaceMuted,
    color: palette.textSecondary,
  },
});
