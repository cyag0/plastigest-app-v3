import { formatDate, formatDateTime } from "@/utils/dates";
import { goBack } from "@/utils/navigation";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { printSaleTicket } from "@/utils/printDocument";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Button,
  Chip,
  Divider,
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

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  closed:    { color: "#3F8A3A", icon: "check-circle", label: "Cerrada" },
  cancelled: { color: "#B9412C", icon: "close-circle", label: "Cancelada" },
};

const PM_CONFIG: Record<string, { icon: string; label: string }> = {
  cash:     { icon: "cash",          label: "Efectivo" },
  card:     { icon: "credit-card",   label: "Tarjeta" },
  transfer: { icon: "bank-transfer", label: "Transferencia" },
  credit:   { icon: "account-clock", label: "Crédito" },
};

const PS_CONFIG: Record<string, { color: string; label: string }> = {
  paid:    { color: "#3F8A3A", label: "Pagado" },
  partial: { color: "#C47F12", label: "Pago Parcial" },
  pending: { color: "#B9412C", label: "Pendiente" },
};

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRowLine}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValueText, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

export default function SaleDetail() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();

  // El layout registra "sales/[id]/index", pero la pantalla es sales/[id]:
  // sin esto el encabezado mostraba el nombre de la ruta ("sales/[id]").
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Venta" });
  }, [navigation]);
  const id = params.id as string;
  const [sale, setSale] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  // El error se muestra dentro del modal: los alerts globales quedarían
  // ocultos detrás del Modal nativo mientras está abierto.
  const [paymentError, setPaymentError] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
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
    if (savingPayment) return;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setPaymentError("Ingresa un monto válido");
      return;
    }
    const amount = parseFloat(paymentAmount);
    const pending = toNum(sale?.total) - toNum(sale?.paid_amount);
    if (amount > pending) {
      setPaymentError(
        `El monto no puede ser mayor al saldo pendiente (${fmt(pending)})`,
      );
      return;
    }
    setPaymentError("");
    setSavingPayment(true);
    try {
      await (Services.sales as any).addPayment(id, {
        amount,
        payment_method: paymentMethod,
        notes: paymentNotes || undefined,
      });
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      // El alert de éxito ya es visible porque el modal se cerró.
      alerts.success("Pago registrado correctamente");
      loadSale();
    } catch (e: any) {
      setPaymentError(
        e.response?.data?.message || "Error al registrar el pago",
      );
    } finally {
      setSavingPayment(false);
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
      color: "#6E6B5E",
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
      color: "#6E6B5E",
      label: sale.payment_status,
    };

  const discount = toNum(sale.discount);
  const tax = toNum(sale.tax);
  const cancelled = sale.status === "cancelled";
  const payments: { method: string; amount: number; tendered: number | null; change: number | null }[] =
    sale.payments ?? [];
  const meta = [
    sale.created_at ? formatDateTime(sale.created_at) : formatDate(sale.sale_date, "long"),
    sale.location?.name ?? sale.location_name,
    sale.cash_register_name,
    sale.user_name ? `atendió ${sale.user_name}` : null,
  ].filter(Boolean);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Encabezado: folio, estado y contexto (sin tarjeta de color) ── */}
      <View style={styles.docHeader}>
        <View style={styles.docTitleRow}>
          <Text style={styles.docTitle} selectable>
            {sale.sale_number}
          </Text>
          <View style={[styles.pill, { backgroundColor: status.color + "1F" }]}>
            <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.docMeta}>{meta.join(" · ")}</Text>
      </View>

      {/* ── Total y pago ── */}
      <View style={styles.totalBlock}>
        <Text style={[styles.bigTotal, cancelled && styles.struck]}>{fmt(total)}</Text>
        <Text style={styles.docMeta}>
          {pmConfig.label}
          {" · "}
          <Text style={{ color: psConfig.color, fontWeight: "600" }}>{psConfig.label}</Text>
          {pending > 0 && !cancelled ? ` · faltan ${fmt(pending)}` : ""}
        </Text>
        {pending > 0 && !cancelled && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${paidPct}%` as any, backgroundColor: palette.primary }]} />
          </View>
        )}
        {sale.payment_status !== "paid" && !cancelled && (
          <Button
            mode="contained"
            onPress={() => {
              setPaymentError("");
              setShowPaymentDialog(true);
            }}
            icon="cash-plus"
            buttonColor={palette.primary}
            style={styles.inlineButton}
          >
            Registrar pago
          </Button>
        )}
      </View>

      {/* ── Productos y totales en una sola lista ── */}
      <Text style={styles.groupTitle}>
        {sale.details?.length || 0} {(sale.details?.length || 0) === 1 ? "producto" : "productos"}
      </Text>
      <View style={styles.group}>
        {sale.details?.map((detail: any, i: number) => {
          const unit = detail.package_name ?? detail.unit_abbreviation ?? "";
          return (
            <View key={detail.id} style={[styles.line, i > 0 && styles.lineDivider]}>
              {detail.product_image ? <Image source={{ uri: detail.product_image }} style={styles.thumb} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lineTitle} numberOfLines={2}>
                  {detail.product_name || "Producto"}
                </Text>
                <Text style={styles.lineMeta}>
                  {parseFloat(detail.quantity)} {unit} × {fmt(toNum(detail.unit_price))}
                  {detail.product_code ? ` · ${detail.product_code}` : ""}
                  {toNum(detail.discount) > 0 ? ` · desc. ${fmt(toNum(detail.discount))}` : ""}
                </Text>
              </View>
              <Text style={styles.lineAmount}>{fmt(toNum(detail.total))}</Text>
            </View>
          );
        })}
        <View style={[styles.totals, styles.lineDivider]}>
          <TotalRow label="Subtotal" value={fmt(toNum(sale.subtotal))} />
          {discount > 0 && <TotalRow label="Descuento" value={`−${fmt(discount)}`} />}
          {tax > 0 && <TotalRow label="Impuestos" value={fmt(tax)} />}
          <TotalRow label="Total" value={fmt(total)} strong />
        </View>
      </View>

      {/* ── Pagos (cómo se cobró) ── */}
      {(payments.length > 0 || (sale.payment_history?.length ?? 0) > 0) && (
        <>
          <Text style={styles.groupTitle}>Pagos</Text>
          <View style={styles.group}>
            {payments.map((p, i) => (
              <View key={`p${i}`} style={[styles.line, i > 0 && styles.lineDivider]}>
                <MaterialCommunityIcons name={(PM_CONFIG[p.method]?.icon ?? "cash") as any} size={18} color={palette.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{PM_CONFIG[p.method]?.label ?? p.method}</Text>
                  {p.method === "cash" && p.tendered != null && p.tendered > p.amount && (
                    <Text style={styles.lineMeta}>
                      Recibido {fmt(p.tendered)} · cambio {fmt(p.change ?? 0)}
                    </Text>
                  )}
                </View>
                <Text style={styles.lineAmount}>{fmt(p.amount)}</Text>
              </View>
            ))}
            {(sale.payment_history ?? []).map((payment: any, i: number) => (
              <View key={`h${i}`} style={[styles.line, (payments.length > 0 || i > 0) && styles.lineDivider]}>
                <MaterialCommunityIcons name={(PM_CONFIG[payment.payment_method]?.icon ?? "cash") as any} size={18} color={palette.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{PM_CONFIG[payment.payment_method]?.label ?? payment.payment_method}</Text>
                  <Text style={styles.lineMeta}>
                    {formatDateTime(payment.date)}
                    {payment.notes ? ` · ${payment.notes}` : ""}
                  </Text>
                </View>
                <Text style={styles.lineAmount}>{fmt(toNum(payment.amount))}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Cliente ── */}
      {(sale.content?.customer_name || sale.content?.customer_phone || sale.content?.customer_email) && (
        <>
          <Text style={styles.groupTitle}>Cliente</Text>
          <Text style={styles.plain}>
            {[sale.content.customer_name, sale.content.customer_phone, sale.content.customer_email].filter(Boolean).join(" · ")}
          </Text>
        </>
      )}

      {/* ── Notas ── */}
      {sale.content?.notes && (
        <>
          <Text style={styles.groupTitle}>Notas</Text>
          <Text style={styles.plain}>{sale.content.notes}</Text>
        </>
      )}

      {/* ── Acciones ── */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() =>
            printSaleTicket(sale.id, sale.sale_number).catch((e: any) =>
              alerts.error(e?.response?.data?.message || "No se pudo imprimir el ticket"),
            )
          }
          icon="printer"
          style={styles.actionBtn}
        >
          Reimprimir ticket
        </Button>
        {sale.can_cancel && (
          <Button mode="text" onPress={handleCancel} icon="close-circle-outline" textColor={palette.error}>
            Cancelar venta
          </Button>
        )}
      </View>

      {/* ── Modal pago ── */}
      <Modal
        visible={showPaymentDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Agregar Pago
            </Text>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
            >
              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Saldo pendiente:{" "}
                <Text style={{ fontWeight: "bold", color: "#B9412C" }}>
                  {fmt(toNum(sale?.total) - toNum(sale?.paid_amount))}
                </Text>
              </Text>

              <Text style={styles.inputLabel}>Monto a pagar *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={paymentAmount}
                onChangeText={(t) => {
                  setPaymentAmount(t);
                  if (paymentError) setPaymentError("");
                }}
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
              {!!paymentError && (
                <Text style={styles.modalError}>{paymentError}</Text>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                onPress={() => setShowPaymentDialog(false)}
                disabled={savingPayment}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleAddPayment}
                buttonColor={palette.primary}
                loading={savingPayment}
                disabled={savingPayment}
              >
                Confirmar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: palette.background },
  content:  { padding: 16, gap: 10, paddingBottom: 32, maxWidth: 760, width: "100%", alignSelf: "center" },

  // Documento: encabezado y total sin tarjetas.
  docHeader: { gap: 4, marginTop: 4 },
  docTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  docTitle: { fontSize: 22, fontWeight: "700", color: palette.text, letterSpacing: -0.3 },
  docMeta: { fontSize: 13, color: palette.textSecondary, lineHeight: 19 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: "600" },
  totalBlock: { gap: 4, marginTop: 10, marginBottom: 8 },
  bigTotal: { fontSize: 36, lineHeight: 42, fontWeight: "700", color: palette.text, letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  struck: { textDecorationLine: "line-through", color: palette.textMuted },
  inlineButton: { alignSelf: "flex-start", marginTop: 8, borderRadius: 10 },

  // Listas agrupadas con separadores.
  groupTitle: { fontSize: 14, fontWeight: "600", color: palette.textSecondary, marginTop: 10 },
  group: { backgroundColor: palette.surface, borderRadius: 12, borderWidth: 1, borderColor: palette.border, overflow: "hidden" },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  lineDivider: { borderTopWidth: 1, borderTopColor: palette.border },
  lineTitle: { fontSize: 15, fontWeight: "500", color: palette.text },
  lineMeta: { fontSize: 13, color: palette.textSecondary, marginTop: 2 },
  lineAmount: { fontSize: 15, fontWeight: "600", color: palette.text, fontVariant: ["tabular-nums"] },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: palette.surfaceMuted },
  totals: { paddingHorizontal: 14, paddingVertical: 10, gap: 4, backgroundColor: palette.surfaceMuted },
  totalRowLine: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, color: palette.textSecondary },
  totalValueText: { fontSize: 14, color: palette.text, fontVariant: ["tabular-nums"] },
  totalStrong: { fontSize: 16, fontWeight: "700", color: palette.text },
  plain: { fontSize: 15, color: palette.text, lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 16 },
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
  metaLabel:    { color: "#8F8B7D", fontSize: 12 },

  // Summary grid
  summaryGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  summaryItem:  { flex: 1, minWidth: "43%", backgroundColor: "#F6F4EE", borderRadius: 12, padding: 12, gap: 4 },
  summaryValue: { fontWeight: "700" },

  // Payment
  progressTrack: { height: 7, backgroundColor: "#E6E1D5", borderRadius: 4, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 4 },
  paymentRow:    { flexDirection: "row", justifyContent: "space-between" },
  paymentCell:   { gap: 2 },
  iconCircle:    { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },

  // History
  historyItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F6F4EE", borderRadius: 12, padding: 12 },

  // Products
  productItem:             { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#F6F4EE", borderRadius: 12, padding: 12 },
  productImage:            { width: 56, height: 56, borderRadius: 10 },
  productImagePlaceholder: { backgroundColor: "#E6E1D5", justifyContent: "center", alignItems: "center" },
  qtyBadge:                { backgroundColor: "#DFEDF0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Actions
  actionBtn: { borderRadius: 10 },

  // Modal pago
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontWeight: "700", marginBottom: 16 },
  modalError: { color: "#B9412C", fontSize: 13, marginTop: 4, fontWeight: "600" },
  modalScroll: { flexGrow: 0 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },

  // Dialog
  inputLabel: { marginBottom: 6, fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD7C9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#F8F6F1",
  },
});
