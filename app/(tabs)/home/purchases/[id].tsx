import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Divider, Surface, Text } from "react-native-paper";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

const toNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  draft:      { color: "#f59e0b", icon: "file-document-edit-outline",  label: "Borrador" },
  ordered:    { color: "#3b82f6", icon: "cart-check",                   label: "Pedido" },
  in_transit: { color: "#8b5cf6", icon: "truck-delivery",              label: "En Tránsito" },
  received:   { color: "#10b981", icon: "package-variant-closed-check", label: "Recibido" },
  cancelled:  { color: "#ef4444", icon: "close-circle-outline",         label: "Cancelado" },
};

const FLOW_STEPS = ["draft", "ordered", "in_transit", "received"] as const;

const PAYMENT_METHOD_CONFIG: Record<string, { icon: string; label: string }> = {
  cash:     { icon: "cash",            label: "Efectivo" },
  card:     { icon: "credit-card",     label: "Tarjeta" },
  transfer: { icon: "bank-transfer",   label: "Transferencia" },
  other:    { icon: "dots-horizontal", label: "Otro" },
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const alerts = useAlerts();
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadPurchase();
  }, [id]);

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const response = await Services.purchasesV2.show(Number(id));
      setPurchase(response.data.data);
    } catch {
      alerts.error("Error al cargar la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (
      !await alerts.confirm("¿Confirmar el pedido de compra?", {
        title: "Confirmar Pedido",
        okText: "Confirmar",
        cancelText: "Cancelar",
      })
    )
      return;
    try {
      setBusy(true);
      const response = await Services.purchasesV2.confirm(Number(id));
      if (response.success) {
        alerts.success("Pedido confirmado exitosamente");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al confirmar el pedido");
      }
    } catch (e: any) {
      alerts.error(e.message || "Error al confirmar el pedido");
    } finally {
      setBusy(false);
    }
  };

  const handleMarkInTransit = async () => {
    if (
      !await alerts.confirm("¿Marcar la compra como en tránsito?", {
        title: "En Tránsito",
        okText: "Confirmar",
        cancelText: "Cancelar",
      })
    )
      return;
    try {
      setBusy(true);
      const response = await Services.purchasesV2.markInTransit(Number(id));
      if (response.success) {
        alerts.success("Compra marcada como en tránsito");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al actualizar el estado");
      }
    } catch (e: any) {
      alerts.error(e.message || "Error al actualizar el estado");
    } finally {
      setBusy(false);
    }
  };

  const handleReceivePurchase = async () => {
    if (!purchase?.details?.length) {
      alerts.error("No hay productos para recibir");
      return;
    }
    if (
      !await alerts.confirm(
        "¿Confirmar que la compra ha sido recibida? Esto actualizará el stock de los productos.",
        {
          title: "Recibir Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        },
      )
    )
      return;
    try {
      setBusy(true);
      const details = purchase.details.map((d: any) => ({
        id: d.id,
        quantity_received: toNum(d.quantity),
      }));
      const response = await Services.purchasesV2.receive(Number(id), details);
      if (response.success) {
        alerts.success("Compra recibida. Stock actualizado.");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al recibir la compra");
      }
    } catch (e: any) {
      alerts.error(e.message || "Error al recibir la compra");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (
      !await alerts.confirm(
        "¿Cancelar esta compra? Esta acción no se puede deshacer.",
        {
          title: "Cancelar Compra",
          okText: "Cancelar Compra",
          cancelText: "Volver",
        },
      )
    )
      return;
    try {
      setBusy(true);
      const response = await Services.purchasesV2.cancel(Number(id));
      if (response.success) {
        alerts.success("Compra cancelada");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al cancelar");
      }
    } catch (e: any) {
      alerts.error(e.message || "Error al cancelar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!purchase) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la compra</Text>
      </View>
    );
  }

  const status =
    STATUS_CONFIG[purchase.status] ?? {
      color: "#6c757d",
      icon: "help-circle",
      label: purchase.status,
    };
  const total = toNum(purchase.total);
  const isCancelled = purchase.status === "cancelled";
  const currentStepIndex = FLOW_STEPS.indexOf(purchase.status as any);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header con estado ── */}
      <Surface style={[styles.card, { backgroundColor: status.color }]} elevation={4}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={styles.purchaseLabel}>
              COMPRA
            </Text>
            <Text variant="headlineMedium" style={styles.purchaseNumber}>
              {purchase.purchase_number || `#${purchase.id}`}
            </Text>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="store-outline"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text variant="bodySmall" style={styles.headerMeta}>
                {purchase.supplier_name || "Sin proveedor"}
              </Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text variant="bodySmall" style={styles.headerMeta}>
                {new Date(purchase.purchase_date).toLocaleDateString("es-MX", {
                  dateStyle: "long",
                })}
              </Text>
            </View>
          </View>
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons
              name={status.icon as any}
              size={32}
              color="rgba(255,255,255,0.95)"
            />
            <Text variant="labelMedium" style={styles.statusText}>
              {status.label}
            </Text>
          </View>
        </View>

        <Divider
          style={{ backgroundColor: "rgba(255,255,255,0.3)", marginVertical: 16 }}
        />

        <View style={styles.totalRow}>
          <Text variant="titleSmall" style={{ color: "rgba(255,255,255,0.8)" }}>
            Total de compra
          </Text>
          <Text variant="headlineMedium" style={styles.totalValue}>
            {fmt(total)}
          </Text>
        </View>

        {purchase.payment_method && (() => {
          const pm = PAYMENT_METHOD_CONFIG[purchase.payment_method];
          return (
            <View style={[styles.row, { marginTop: 10 }]}>
              <MaterialCommunityIcons
                name={(pm?.icon ?? "help-circle") as any}
                size={15}
                color="rgba(255,255,255,0.8)"
              />
              <Text variant="bodySmall" style={{ color: "rgba(255,255,255,0.85)" }}>
                {pm?.label ?? purchase.payment_method}
              </Text>
            </View>
          );
        })()}
      </Surface>

      {/* ── Timeline de progreso ── */}
      {!isCancelled && (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Progreso
          </Text>
          <View style={{ marginTop: 16 }}>
            {FLOW_STEPS.map((key, index) => {
              const cfg = STATUS_CONFIG[key];
              const isActive = key === purchase.status;
              const isCompleted = index < currentStepIndex;
              const isLast = index === FLOW_STEPS.length - 1;
              const dotColor =
                isActive || isCompleted ? status.color : "#e4e7ec";

              return (
                <View key={key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: dotColor, borderColor: dotColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={(isCompleted ? "check" : cfg.icon) as any}
                        size={14}
                        color="white"
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: isCompleted
                              ? status.color
                              : "#e4e7ec",
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      variant="bodyMedium"
                      style={{
                        fontWeight: isActive ? "700" : "400",
                        color:
                          isActive || isCompleted ? palette.text : "#aaa",
                      }}
                    >
                      {cfg.label}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: "#aaa", fontSize: 11 }}
                    >
                      {isActive
                        ? "Estado actual"
                        : isCompleted
                          ? "Completado"
                          : "Pendiente"}
                    </Text>
                  </View>
                  {(isActive || isCompleted) && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={status.color}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Surface>
      )}

      {/* ── Cancelado ── */}
      {isCancelled && (
        <Surface
          style={[
            styles.card,
            { flexDirection: "row", alignItems: "center", gap: 12 },
          ]}
          elevation={1}
        >
          <MaterialCommunityIcons name="close-circle" size={32} color="#ef4444" />
          <View>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "700", color: "#ef4444" }}
            >
              Compra Cancelada
            </Text>
            <Text variant="bodySmall" style={{ color: "#aaa" }}>
              Esta compra fue cancelada
            </Text>
          </View>
        </Surface>
      )}

      {/* ── Productos ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Productos
          </Text>
          <Chip
            compact
            style={{ backgroundColor: palette.primary + "18" }}
            textStyle={{ color: palette.primary, fontSize: 12, fontWeight: "700" }}
          >
            {purchase.details?.length || 0}
          </Chip>
        </View>

        <View style={{ gap: 10, marginTop: 8 }}>
          {purchase.details?.map((detail: any) => {
            const imgUri =
              typeof detail.product_image === "string"
                ? detail.product_image
                : detail.product_image?.uri;

            return (
              <View key={detail.id} style={styles.productItem}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.productImage, styles.productImagePlaceholder]}
                  >
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={24}
                      color="#aaa"
                    />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {detail.product_name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#999" }}>
                    {detail.product_code}
                  </Text>
                  {detail.package_name && (
                    <View style={[styles.row, { marginTop: 2 }]}>
                      <MaterialCommunityIcons
                        name="package-variant-closed"
                        size={12}
                        color="#aaa"
                      />
                      <Text variant="bodySmall" style={{ color: "#999" }}>
                        {detail.package_name}
                      </Text>
                    </View>
                  )}
                  <Text variant="bodySmall" style={{ color: "#aaa", marginTop: 2 }}>
                    {detail.unit_name} ({detail.unit_abbreviation})
                  </Text>

                  <View
                    style={[
                      styles.row,
                      { justifyContent: "space-between", marginTop: 8 },
                    ]}
                  >
                    <View style={styles.qtyBadge}>
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.primary, fontWeight: "700" }}
                      >
                        {toNum(detail.quantity)} × {fmt(toNum(detail.unit_price))}
                      </Text>
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{ fontWeight: "bold", color: palette.primary }}
                    >
                      {fmt(toNum(detail.subtotal))}
                    </Text>
                  </View>

                  {purchase.status === "received" && detail.quantity_received && (
                    <View style={[styles.row, { marginTop: 4 }]}>
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={13}
                        color="#10b981"
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: "#10b981", fontWeight: "600" }}
                      >
                        Recibido: {toNum(detail.quantity_received)}{" "}
                        {detail.unit_abbreviation}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Divider style={{ marginVertical: 16 }} />
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            Total
          </Text>
          <Text
            variant="titleLarge"
            style={{ fontWeight: "bold", color: palette.primary }}
          >
            {fmt(total)}
          </Text>
        </View>
      </Surface>

      {/* ── Notas ── */}
      {purchase.notes && (
        <Surface style={styles.card} elevation={1}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <MaterialCommunityIcons
              name="note-text-outline"
              size={18}
              color={palette.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notas
            </Text>
          </View>
          <Text variant="bodyMedium" style={{ color: "#555", lineHeight: 20 }}>
            {purchase.notes}
          </Text>
        </Surface>
      )}

      {/* ── Acciones ── */}
      <View style={{ gap: 10 }}>
        {purchase.status === "draft" && (
          <Button
            mode="contained"
            onPress={handleConfirmOrder}
            loading={busy}
            disabled={busy}
            icon="cart-check"
            buttonColor="#3b82f6"
            style={styles.actionBtn}
          >
            Confirmar Pedido
          </Button>
        )}

        {purchase.status === "ordered" && (
          <Button
            mode="contained"
            onPress={handleMarkInTransit}
            loading={busy}
            disabled={busy}
            icon="truck-delivery"
            buttonColor="#8b5cf6"
            style={styles.actionBtn}
          >
            Marcar en Tránsito
          </Button>
        )}

        {purchase.status === "in_transit" && (
          <Button
            mode="contained"
            onPress={handleReceivePurchase}
            loading={busy}
            disabled={busy}
            icon="package-variant-closed-check"
            buttonColor="#10b981"
            style={styles.actionBtn}
          >
            Confirmar Recepción
          </Button>
        )}

        {purchase.status !== "received" && purchase.status !== "cancelled" && (
          <Button
            mode="outlined"
            onPress={handleCancelPurchase}
            loading={busy}
            disabled={busy}
            icon="close-circle-outline"
            textColor="#ef4444"
            style={[styles.actionBtn, { borderColor: "#ef4444" }]}
          >
            Cancelar Compra
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: "#f2f4f7" },
  content: { padding: 16, gap: 14 },
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  card:    { backgroundColor: "white", borderRadius: 18, padding: 20 },

  // Header
  headerTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  purchaseLabel:  { color: "rgba(255,255,255,0.75)", letterSpacing: 2, fontSize: 11 },
  purchaseNumber: { color: "white", fontWeight: "bold", marginBottom: 10 },
  headerMeta:     { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  statusBadge:    { alignItems: "center", gap: 4, paddingLeft: 12 },
  statusText:     { color: "rgba(255,255,255,0.9)", fontWeight: "700", textAlign: "center" },
  totalRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalValue:     { color: "white", fontWeight: "bold" },

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
  productItem:             { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#f6f7fb", borderRadius: 12, padding: 12 },
  productImage:            { width: 60, height: 60, borderRadius: 10 },
  productImagePlaceholder: { backgroundColor: "#e4e7ec", justifyContent: "center", alignItems: "center" },
  qtyBadge:                { backgroundColor: "#e8f0fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Actions
  actionBtn: { borderRadius: 10 },
});
