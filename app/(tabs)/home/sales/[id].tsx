import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Surface,
  Text,
} from "react-native-paper";

const fmt = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

const toNum = (v: any) => parseFloat(v ?? 0) || 0;

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: string; label: string }
> = {
  draft:     { color: "#6c757d", icon: "file-document-edit-outline", label: "Borrador" },
  open:      { color: "#0d6efd", icon: "progress-clock",             label: "Abierta" },
  processed: { color: "#0dcaf0", icon: "progress-check",             label: "Procesada" },
  completed: { color: "#198754", icon: "check-circle",               label: "Completada" },
  closed:    { color: "#198754", icon: "check-circle",               label: "Cerrada" },
  cancelled: { color: "#dc3545", icon: "close-circle",               label: "Cancelada" },
};

const PM_CONFIG: Record<string, { icon: string; label: string }> = {
  efectivo:      { icon: "cash",          label: "Efectivo" },
  cash:          { icon: "cash",          label: "Efectivo" },
  tarjeta:       { icon: "credit-card",   label: "Tarjeta" },
  card:          { icon: "credit-card",   label: "Tarjeta" },
  transferencia: { icon: "bank-transfer", label: "Transferencia" },
  transfer:      { icon: "bank-transfer", label: "Transferencia" },
  credit:        { icon: "account-clock", label: "Crédito" },
};

const PS_CONFIG: Record<string, { color: string; label: string }> = {
  paid:    { color: "#198754", label: "Pagado" },
  partial: { color: "#f59e0b", label: "Pago Parcial" },
  pending: { color: "#dc3545", label: "Pendiente" },
};

export default function SaleDetail() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [sale, setSale] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const alerts = useAlerts();

  React.useEffect(() => {
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const response = await Services.sales.show(id);
      setSale(response.data.data);
    } catch (error: any) {
      alerts.error(
        error.response?.data?.message ||
          error.message ||
          "Error al cargar la venta",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (
      !await alerts.confirm("¿Deseas avanzar el estado de esta venta?", {
        title: "Avanzar Estado",
        okText: "Avanzar",
        cancelText: "Cancelar",
      })
    )
      return;
    try {
      await (Services.sales as any).advanceStatus(id);
      alerts.success("Estado avanzado correctamente");
      loadSale();
    } catch (e: any) {
      alerts.error(e.response?.data?.message || "Error al avanzar el estado");
    }
  };

  const handleRevertStatus = async () => {
    if (
      !await alerts.confirm("¿Deseas retroceder el estado de esta venta?", {
        title: "Retroceder Estado",
        okText: "Retroceder",
        cancelText: "Cancelar",
      })
    )
      return;
    try {
      await (Services.sales as any).revertStatus(id);
      alerts.success("Estado retrocedido correctamente");
      loadSale();
    } catch (e: any) {
      alerts.error(
        e.response?.data?.message || "Error al retroceder el estado",
      );
    }
  };

  const handleCancel = async () => {
    if (
      !await alerts.confirm(
        "¿Estás seguro de cancelar esta venta? Esta acción no se puede deshacer.",
        { title: "Cancelar Venta", okText: "Cancelar Venta", cancelText: "No" },
      )
    )
      return;
    try {
      await (Services.sales as any).cancel(id);
      alerts.success("Venta cancelada correctamente");
      loadSale();
    } catch (e: any) {
      alerts.error(e.response?.data?.message || "Error al cancelar la venta");
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alerts.error("Ingresa un monto válido");
      return;
    }
    const amount = parseFloat(paymentAmount);
    const pending = toNum(sale?.total) - toNum(sale?.paid_amount);
    if (amount > pending) {
      alerts.error(
        `El monto no puede ser mayor al saldo pendiente (${fmt(pending)})`,
      );
      return;
    }
    if (
      !await alerts.confirm(`¿Registrar pago de ${fmt(amount)}?`, {
        title: "Confirmar Pago",
        okText: "Confirmar",
        cancelText: "Cancelar",
      })
    )
      return;
    try {
      await (Services.sales as any).addPayment(id, {
        amount,
        payment_method: paymentMethod,
        notes: paymentNotes || undefined,
      });
      alerts.success("Pago registrado correctamente");
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      loadSale();
    } catch (e: any) {
      alerts.error(e.response?.data?.message || "Error al registrar el pago");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la venta</Text>
      </View>
    );
  }

  const total = toNum(sale.total);
  const paid = toNum(sale.paid_amount);
  const pending = total - paid;
  const paidPct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  const status =
    STATUS_CONFIG[sale.status] ?? {
      color: "#6c757d",
      icon: "help-circle",
      label: sale.status_label || sale.status,
    };
  const pmConfig =
    PM_CONFIG[sale.payment_method] ?? {
      icon: "cash",
      label: sale.payment_method,
    };
  const psConfig =
    PS_CONFIG[sale.payment_status] ?? {
      color: "#6c757d",
      label: sale.payment_status,
    };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header de color con estado ── */}
      <Surface
        style={[styles.card, { backgroundColor: status.color }]}
        elevation={4}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={styles.saleLabel}>
              VENTA
            </Text>
            <Text variant="headlineMedium" style={styles.saleNumber}>
              {sale.sale_number}
            </Text>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text variant="bodySmall" style={styles.headerMeta}>
                {new Date(sale.sale_date).toLocaleDateString("es-MX", {
                  dateStyle: "long",
                })}
              </Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={14}
                color="rgba(255,255,255,0.8)"
              />
              <Text variant="bodySmall" style={styles.headerMeta}>
                {sale.location?.name || "Sin ubicación"}
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
          style={{
            backgroundColor: "rgba(255,255,255,0.3)",
            marginVertical: 16,
          }}
        />

        <View style={styles.totalRow}>
          <Text
            variant="titleSmall"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Total de venta
          </Text>
          <Text variant="headlineMedium" style={styles.totalValue}>
            {fmt(total)}
          </Text>
        </View>
      </Surface>

      {/* ── Desglose financiero ── */}
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Desglose
        </Text>
        <View style={styles.summaryGrid}>
          {[
            { label: "Subtotal",  value: fmt(toNum(sale.subtotal)),   color: undefined },
            { label: "Impuestos", value: fmt(toNum(sale.tax)),         color: undefined },
            { label: "Descuento", value: `-${fmt(toNum(sale.discount))}`, color: "#198754" },
            { label: "Total",     value: fmt(total),                   color: palette.primary },
          ].map((item) => (
            <View key={item.label} style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.metaLabel}>
                {item.label}
              </Text>
              <Text
                variant="titleSmall"
                style={[
                  styles.summaryValue,
                  item.color ? { color: item.color } : undefined,
                ]}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </Surface>

      {/* ── Pago ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información de Pago
          </Text>
          <Chip
            compact
            style={{ backgroundColor: psConfig.color }}
            textStyle={{ color: "white", fontSize: 11, fontWeight: "700" }}
          >
            {psConfig.label}
          </Chip>
        </View>

        <View style={[styles.row, { marginBottom: 16 }]}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: palette.primary + "18" },
            ]}
          >
            <MaterialCommunityIcons
              name={pmConfig.icon as any}
              size={20}
              color={palette.primary}
            />
          </View>
          <View>
            <Text variant="bodySmall" style={styles.metaLabel}>
              Método
            </Text>
            <Text variant="bodyLarge" style={{ fontWeight: "700" }}>
              {pmConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${paidPct}%` as any,
                backgroundColor: paidPct >= 100 ? "#198754" : palette.primary,
              },
            ]}
          />
        </View>

        <View style={[styles.paymentRow, { marginTop: 10 }]}>
          <View style={styles.paymentCell}>
            <Text variant="bodySmall" style={styles.metaLabel}>
              Pagado
            </Text>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "700", color: "#198754" }}
            >
              {fmt(paid)}
            </Text>
          </View>
          <View style={[styles.paymentCell, { alignItems: "flex-end" }]}>
            <Text variant="bodySmall" style={styles.metaLabel}>
              Pendiente
            </Text>
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "700",
                color: pending > 0 ? "#dc3545" : "#198754",
              }}
            >
              {fmt(pending)}
            </Text>
          </View>
        </View>

        {sale.payment_status !== "paid" && sale.status !== "cancelled" && (
          <Button
            mode="contained"
            onPress={() => setShowPaymentDialog(true)}
            icon="cash-plus"
            buttonColor={palette.primary}
            style={{ marginTop: 16, borderRadius: 10 }}
          >
            Agregar Pago
          </Button>
        )}
      </Surface>

      {/* ── Historial de pagos ── */}
      {sale.payment_history && sale.payment_history.length > 0 && (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Historial de Pagos
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {sale.payment_history.map((payment: any, index: number) => {
              const pc =
                PM_CONFIG[payment.payment_method] ?? {
                  icon: "cash",
                  label: payment.payment_method,
                };
              return (
                <View key={index} style={styles.historyItem}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: "#19875420" }]}
                  >
                    <MaterialCommunityIcons
                      name={pc.icon as any}
                      size={18}
                      color="#198754"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
                      {pc.label}
                    </Text>
                    <Text variant="bodySmall" style={styles.metaLabel}>
                      {new Date(payment.date).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Text>
                    {payment.notes && (
                      <Text variant="bodySmall" style={styles.metaLabel}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                  <Text
                    variant="titleSmall"
                    style={{ fontWeight: "bold", color: "#198754" }}
                  >
                    {fmt(toNum(payment.amount))}
                  </Text>
                </View>
              );
            })}
          </View>
        </Surface>
      )}

      {/* ── Cliente ── */}
      {(sale.content?.customer_name ||
        sale.content?.customer_phone ||
        sale.content?.customer_email) && (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Cliente
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {sale.content.customer_name && (
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_name}</Text>
              </View>
            )}
            {sale.content.customer_phone && (
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={18}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_phone}</Text>
              </View>
            )}
            {sale.content.customer_email && (
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={palette.primary}
                />
                <Text variant="bodyMedium">{sale.content.customer_email}</Text>
              </View>
            )}
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
            textStyle={{
              color: palette.primary,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {sale.details?.length || 0}
          </Chip>
        </View>

        <View style={{ gap: 10, marginTop: 4 }}>
          {sale.details?.map((detail: any) => (
            <View key={detail.id} style={styles.productItem}>
              {detail.product_image ? (
                <Image
                  source={{ uri: detail.product_image }}
                  style={styles.productImage}
                />
              ) : (
                <View
                  style={[styles.productImage, styles.productImagePlaceholder]}
                >
                  <MaterialCommunityIcons
                    name="package-variant-closed"
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
                  {detail.product_name || "Producto sin nombre"}
                </Text>
                <Text variant="bodySmall" style={styles.metaLabel}>
                  {detail.product_code}
                </Text>
                <View
                  style={[
                    styles.row,
                    { justifyContent: "space-between", marginTop: 6 },
                  ]}
                >
                  <View style={styles.qtyBadge}>
                    <Text
                      variant="bodySmall"
                      style={{ color: palette.primary, fontWeight: "700" }}
                    >
                      ×{parseFloat(detail.quantity)} ·{" "}
                      {fmt(toNum(detail.unit_price))}
                    </Text>
                  </View>
                  <Text
                    variant="titleSmall"
                    style={{ fontWeight: "bold", color: palette.primary }}
                  >
                    {fmt(toNum(detail.total))}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Surface>

      {/* ── Notas ── */}
      {sale.content?.notes && (
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
          <Text
            variant="bodyMedium"
            style={{ color: "#555", lineHeight: 20 }}
          >
            {sale.content.notes}
          </Text>
        </Surface>
      )}

      {/* ── Acciones ── */}
      <View style={{ gap: 10, marginBottom: 32 }}>
        {sale.can_advance && (
          <Button
            mode="contained"
            onPress={handleAdvanceStatus}
            icon="arrow-right-circle"
            buttonColor={palette.primary}
            style={styles.actionBtn}
          >
            Avanzar Estado
          </Button>
        )}
        {sale.can_revert && (
          <Button
            mode="outlined"
            onPress={handleRevertStatus}
            icon="arrow-left-circle"
            style={[styles.actionBtn, { borderColor: palette.primary }]}
            textColor={palette.primary}
          >
            Retroceder Estado
          </Button>
        )}
        {sale.can_cancel && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            icon="close-circle"
            style={[styles.actionBtn, { borderColor: "#dc3545" }]}
            textColor="#dc3545"
          >
            Cancelar Venta
          </Button>
        )}
        <Button
          mode="text"
          onPress={() => router.back()}
          icon="arrow-left"
          textColor="#888"
        >
          Volver
        </Button>
      </View>

      {/* ── Dialog pago ── */}
      <Portal>
        <Dialog
          visible={showPaymentDialog}
          onDismiss={() => setShowPaymentDialog(false)}
          style={{ borderRadius: 16 }}
        >
          <Dialog.Title>Agregar Pago</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Saldo pendiente:{" "}
              <Text style={{ fontWeight: "bold", color: "#dc3545" }}>
                {fmt(toNum(sale?.total) - toNum(sale?.paid_amount))}
              </Text>
            </Text>

            <Text style={styles.inputLabel}>Monto a pagar *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Método de Pago</Text>
            <RadioButton.Group
              onValueChange={setPaymentMethod}
              value={paymentMethod}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {[
                  ["cash", "Efectivo"],
                  ["card", "Tarjeta"],
                  ["transfer", "Transferencia"],
                  ["credit", "Crédito"],
                ].map(([val, label]) => (
                  <View
                    key={val}
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <RadioButton value={val} />
                    <Text>{label}</Text>
                  </View>
                ))}
              </View>
            </RadioButton.Group>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>
              Notas (opcional)
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
              placeholder="Notas adicionales..."
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onPress={handleAddPayment} buttonColor={palette.primary}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: "#f2f4f7" },
  content:  { padding: 16, gap: 14 },
  center:   { flex: 1, justifyContent: "center", alignItems: "center" },
  card:     { backgroundColor: "white", borderRadius: 18, padding: 20 },

  // Header
  headerTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  saleLabel:   { color: "rgba(255,255,255,0.75)", letterSpacing: 2, fontSize: 11 },
  saleNumber:  { color: "white", fontWeight: "bold", marginBottom: 10 },
  headerMeta:  { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  statusBadge: { alignItems: "center", gap: 4, paddingLeft: 12 },
  statusText:  { color: "rgba(255,255,255,0.9)", fontWeight: "700", textAlign: "center" },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalValue:  { color: "white", fontWeight: "bold" },

  // Common
  row:          { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontWeight: "700" },
  sectionHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metaLabel:    { color: "#999", fontSize: 12 },

  // Summary grid
  summaryGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  summaryItem:  { flex: 1, minWidth: "43%", backgroundColor: "#f6f7fb", borderRadius: 12, padding: 12, gap: 4 },
  summaryValue: { fontWeight: "700" },

  // Payment
  progressTrack: { height: 7, backgroundColor: "#e4e7ec", borderRadius: 4, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 4 },
  paymentRow:    { flexDirection: "row", justifyContent: "space-between" },
  paymentCell:   { gap: 2 },
  iconCircle:    { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },

  // History
  historyItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f6f7fb", borderRadius: 12, padding: 12 },

  // Products
  productItem:             { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#f6f7fb", borderRadius: 12, padding: 12 },
  productImage:            { width: 56, height: 56, borderRadius: 10 },
  productImagePlaceholder: { backgroundColor: "#e4e7ec", justifyContent: "center", alignItems: "center" },
  qtyBadge:                { backgroundColor: "#e8f0fe", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Actions
  actionBtn: { borderRadius: 10 },

  // Dialog
  inputLabel: { marginBottom: 6, fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#dde1e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#fafbfc",
  },
});
