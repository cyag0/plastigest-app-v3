import { SafeAreaView } from "react-native-safe-area-context";
import { formatMoney, parseMoney } from "@/utils/format";
import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import AmountPreview from "@/components/Pos/AmountPreview";
import OpenShiftModal from "@/components/Pos/OpenShiftModal";
import { apiErrorCode, apiErrorMessage, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { amountToCents, centsToAmount } from "@/utils/money";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, usePreventRemove } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import { Button, RadioButton, Text, TextInput } from "react-native-paper";
import { PendingPayment, useSale } from "./SaleContext";

/** Aviso de un cobro en duda recuperado al volver a la pantalla. */
const RESTORED_MESSAGE =
  "No se pudo confirmar si la venta de este carrito quedó registrada. Vuelve a presionar «Confirmar venta»: si ya se registró no se cobra dos veces.";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

interface SaleSummary {
  total: number;
  itemCount: number;
  change: number;
  pending: number;
  method: string;
  saleNumber?: string;
  /** Se encontró por su llave después de perder la respuesta. */
  recovered?: boolean;
  /** Lo registrado no es el carrito que se mandó (una venta anterior del mismo carrito). */
  mismatch?: boolean;
}

/** Aviso dentro de la sección de pago (en celular los avisos globales quedan detrás del carrito). */
interface FormMessage {
  text: string;
  /** "warning": la venta pudo registrarse, no es un rechazo. */
  tone: "error" | "warning" | "info";
  /** Ofrecer abrir el turno de caja (cobro en efectivo sin turno). */
  openShift?: boolean;
}

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={cartBtnStyles.btn} activeOpacity={0.7}>
      <MaterialCommunityIcons name="cart-outline" size={24} color={palette.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <RNText style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</RNText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const cartBtnStyles = StyleSheet.create({
  btn: { padding: 8, marginRight: 4 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" as const },
});

export default function SaleFormScreen() {
  const alerts = useAlerts();
  const saleContext = useSale();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();
  const { hasPermission } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  // Indica si el usuario editó manualmente el monto a pagar. Mientras sea
  // false, el input se mantiene sincronizado con el total de la venta.
  const [paymentTouched, setPaymentTouched] = useState(false);
  // Un toque doble (o confirmar mientras se envía) no abre dos
  // confirmaciones ni manda dos ventas.
  const { submitting: isSubmitting, run } = useSubmitGuard();
  const [lastSale, setLastSale] = useState<SaleSummary | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [openShiftVisible, setOpenShiftVisible] = useState(false);

  // Con la venta en envío no se sale de la pantalla (atrás, menú): el
  // resultado se perdería y el carrito, con su llave, también.
  const sending = isSubmitting || saleContext.submitting;
  usePreventRemove(sending, () => {
    alerts.warning("Espera a que termine de registrarse la venta.");
  });

  // Mientras se envía o un cobro sigue en duda el pago no se cambia, como el
  // carrito: el reintento con la misma llave lleva el mismo, y si el primero
  // entró el servidor devuelve esa venta con su forma de pago.
  const paymentLocked = sending || saleContext.pendingUnknown;

  // Cobro en duda recuperado del equipo al volver: el pago con que se mandó
  // (bloqueado) y el aviso para reintentarlo aquí mismo. Se ajusta durante el
  // render, una vez por recuperación.
  const restored = saleContext.restoredPending;
  const [appliedRestore, setAppliedRestore] = useState<PendingPayment | null>(null);
  if (restored && restored !== appliedRestore) {
    setAppliedRestore(restored);
    setPaymentMethod(restored.payment_method);
    if (restored.payment_method === "credit") {
      setPaymentTouched(true);
      setPaymentAmount("0");
    } else if (restored.paid_amount === undefined) {
      setPaymentTouched(false);
    } else {
      setPaymentTouched(true);
      setPaymentAmount(restored.paid_amount.toFixed(2));
    }
    setFormMessage({ text: RESTORED_MESSAGE, tone: "warning" });
  }
  // En celular el carrito (con el aviso) está cerrado: también un aviso global.
  useEffect(() => {
    if (restored) {
      alerts.warning("Hay una venta sin confirmar: abre el carrito y vuelve a presionar «Confirmar venta».");
    }
  }, [restored, alerts]);

  // El contexto ya expone los items del carrito con el formato de Cart.
  const cartItems = saleContext.cartItems;

  // En centavos, como lo calcula el servidor.
  const totalAmount = centsToAmount(saleContext.totalCents);
  const isCredit = paymentMethod === "credit";

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  // Pre-rellenar el monto a pagar con el total de la venta. Así, por defecto,
  // la venta queda pagada por completo y el usuario solo cambia el monto (p. ej.
  // a 0 para crédito) si lo desea. Mientras no haya editado el campo a mano,
  // se mantiene sincronizado con el total.
  useEffect(() => {
    if (!paymentTouched && !isCredit) {
      setPaymentAmount(totalAmount > 0 ? totalAmount.toFixed(2) : "");
    }
  }, [totalAmount, paymentTouched, isCredit]);

  /**
   * A crédito no se cobra nada ahora: el monto queda en 0 y bloqueado. Antes
   * seguía el total y, si se tocaba, la venta a crédito quedaba como pagada
   * con un ingreso que nunca entró.
   */
  const changePaymentMethod = (method: string) => {
    if (paymentLocked) return;
    setPaymentMethod(method);
    setFormMessage(null);
    if (method === "credit") {
      setPaymentTouched(true);
      setPaymentAmount("0");
    } else if (isCredit) {
      setPaymentTouched(false);
    }
  };

  // En mobile inyectamos el botón del carrito en el AppBar.
  useEffect(() => {
    if (!isMobile) return;
    navigation.setOptions({
      headerRight: () => (
        <CartHeaderButton count={itemCount} onPress={() => setCartVisible(true)} />
      ),
    });
  }, [isMobile, itemCount]);

  const handleConfirmSale = () =>
    run(async () => {
      setFormMessage(null);
      if (cartItems.length === 0) {
        setFormMessage({ text: "Debes agregar al menos un producto", tone: "error" });
        return;
      }

      // Si el usuario no editó el monto, se paga el total completo: enviamos
      // `undefined` para que el backend use el total exacto. A crédito va 0.
      // Si lo editó, se lee en formato mexicano ("1,500" son mil quinientos)
      // y un monto que no se entiende se avisa: antes "1,500" se mandaba como
      // 1 y la venta quedaba con $1 pagado.
      let paidAmountForApi: number | undefined;
      if (isCredit) {
        paidAmountForApi = 0;
      } else if (!paymentTouched) {
        paidAmountForApi = undefined;
      } else {
        const parsed = parseMoney(paymentAmount);
        if (parsed === null || parsed < 0) {
          setFormMessage({
            text: "El monto a pagar no es válido: escríbelo como 1500 o 1,500.50 (0 si queda pendiente).",
            tone: "error",
          });
          return;
        }
        paidAmountForApi = centsToAmount(amountToCents(parsed));
      }

      const confirmed = await alerts.confirm("¿Deseas confirmar esta venta?", {
        title: "Confirmar Venta",
        okText: "Confirmar",
        cancelText: "Cancelar",
      });

      if (!confirmed) return;

      // Capturar el carrito ANTES de confirmar: si se registra, el contexto
      // lo vacía y perderíamos los datos para el modal.
      const totalCents = saleContext.totalCents;
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      const attempt = await saleContext.confirmSale({
        payment_method: paymentMethod,
        paid_amount: paidAmountForApi,
      });
      if (!attempt) return; // ya había un envío en curso

      if (attempt.status === "charged") {
        // El resumen sale de lo que registró el servidor y del pago que se
        // mandó (en un reintento, el del primer envío): no del formulario.
        const sale = attempt.sale ?? {};
        const saleTotalCents = sale.total != null ? amountToCents(Number(sale.total)) : totalCents;
        const method =
          typeof sale.payment_method === "string" && sale.payment_method
            ? sale.payment_method
            : attempt.payment.payment_method;
        const sentPaidCents =
          attempt.payment.paid_amount != null ? amountToCents(attempt.payment.paid_amount) : saleTotalCents;
        const paidServer =
          sale.paid_amount != null
            ? Number(sale.paid_amount)
            : Array.isArray(sale.payments)
              ? sale.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
              : centsToAmount(sentPaidCents);
        const mismatch = saleTotalCents !== totalCents;
        setCartVisible(false);
        setPaymentAmount("");
        setPaymentTouched(false);
        setPaymentMethod("cash");
        setLastSale({
          total: centsToAmount(saleTotalCents),
          itemCount,
          method,
          change:
            !mismatch && method === "cash" && sentPaidCents > saleTotalCents
              ? centsToAmount(sentPaidCents - saleTotalCents)
              : 0,
          pending: Math.max(0, centsToAmount(saleTotalCents - amountToCents(paidServer))),
          saleNumber: sale.sale_number,
          recovered: attempt.recovered,
          mismatch,
        });
        return;
      }

      if (attempt.status === "not_charged") {
        setFormMessage({
          text: "La venta no se registró: no llegó la respuesta del servidor. Inténtalo de nuevo.",
          tone: "error",
        });
        return;
      }

      if (attempt.status === "unknown") {
        setFormMessage({
          text: `${apiErrorMessage(attempt.error, "No llegó la respuesta del servidor.")} No se pudo confirmar si la venta quedó registrada: vuelve a presionar «Confirmar venta» (si ya se registró no se cobra dos veces). El carrito y el pago no se pueden cambiar y quedan guardados en este equipo hasta confirmarla.`,
          tone: "warning",
        });
        return;
      }

      // Rechazada: no se registró nada.
      const code = apiErrorCode(attempt.error);
      if (code === SALE_ERROR_CODES.noOpenSession) {
        const canOpen = hasPermission("sales_pos");
        setFormMessage({
          text: `${apiErrorMessage(attempt.error, "Abre un turno de caja para cobrar en efectivo.")}${
            canOpen ? "" : " También puedes cobrarla con tarjeta o transferencia."
          }`,
          tone: "error",
          openShift: canOpen,
        });
        return;
      }
      if (code === SALE_ERROR_CODES.insufficientStock) {
        // Existencias al día para corregir el carrito.
        saleContext.loadData();
      }
      setFormMessage({ text: apiErrorMessage(attempt.error, "No se pudo registrar la venta."), tone: "error" });
    });

  const handleStartAnotherSale = () => {
    setLastSale(null);
    setPaymentAmount("");
    setPaymentTouched(false);
    setPaymentMethod("cash");
  };

  const cartContent = (
    <Cart
      items={cartItems}
      onRemoveItem={(itemId) => saleContext.handleRemoveProduct(itemId)}
      onItemChange={(item, action, data) => saleContext.handleItemChange(item, action, data)}
      onClearCart={saleContext.clearCart}
      // En celular el carrito es un modal: que todo se desplace junto.
      scrollAll={isMobile}
    >
      <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Información de Pago</Text>

            {/* Método de pago */}
            <View style={styles.field}>
              <Text style={styles.label}>Método de Pago</Text>
              {saleContext.pendingUnknown && !sending && (
                <Text style={styles.sublabel}>
                  No se puede cambiar hasta confirmar la venta anterior.
                </Text>
              )}
              <RadioButton.Group
                onValueChange={changePaymentMethod}
                value={paymentMethod}
              >
                <View style={styles.radioRow}>
                  <View style={styles.radioItem}>
                    <RadioButton value="cash" disabled={paymentLocked} />
                    <Text>Efectivo</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="card" disabled={paymentLocked} />
                    <Text>Tarjeta</Text>
                  </View>
                </View>
                <View style={styles.radioRow}>
                  <View style={styles.radioItem}>
                    <RadioButton value="transfer" disabled={paymentLocked} />
                    <Text>Transferencia</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="credit" disabled={paymentLocked} />
                    <Text>Crédito</Text>
                  </View>
                </View>
              </RadioButton.Group>
            </View>

            {/* Monto a pagar */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Monto Total: {formatMoney(totalAmount)}
              </Text>
              <Text style={styles.sublabel}>
                {isCredit
                  ? "A crédito: no se cobra nada ahora, queda pendiente todo el total"
                  : "Monto a pagar ahora (cámbialo a 0 para dejarlo pendiente)"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentTouched(true);
                  setPaymentAmount(text);
                  setFormMessage(null);
                }}
                keyboardType="decimal-pad"
                disabled={isCredit || paymentLocked}
              />
              {!isCredit && <AmountPreview value={paymentAmount} label="Pagado" />}
            </View>

            {formMessage && (
              <View style={styles.formMessage}>
                <Text
                  style={[
                    styles.formMessageText,
                    formMessage.tone === "error" && { color: palette.error },
                    formMessage.tone === "warning" && { color: palette.warning },
                  ]}
                >
                  {formMessage.text}
                </Text>
                {formMessage.openShift && (
                  <Button mode="outlined" icon="cash-register" compact onPress={() => setOpenShiftVisible(true)} style={styles.formMessageAction}>
                    Abrir turno
                  </Button>
                )}
              </View>
            )}

            {/* Botón confirmar */}
            <Button
              mode="contained"
              onPress={handleConfirmSale}
              disabled={cartItems.length === 0 || sending}
              loading={sending}
              style={styles.confirmButton}
              buttonColor={palette.primary}
              icon="check"
            >
              {sending ? "Procesando..." : "Confirmar Venta"}
            </Button>
          </View>
        </Cart>
  );

  return (
    <View style={styles.container}>
      {/* Lista de productos */}
      <View style={styles.productsSection}>
        <ListProducts
          loading={saleContext.loading}
          categories={saleContext.categories}
          products={saleContext.products}
          selectedProducts={saleContext.selectedProducts}
          onAddProduct={saleContext.handleAddProduct}
          onRemoveProduct={saleContext.handleRemoveProduct}
          onItemChange={saleContext.handleItemChange}
          onScanNotFound={(code) => alerts.error(`Código no encontrado: ${code}`)}
          showOutOfStockFilter
        />
      </View>

      {/* Carrito lateral — solo desktop */}
      {!isMobile && (
        <View style={styles.cartSection}>{cartContent}</View>
      )}

      {/* Modal carrito — solo mobile */}
      {isMobile && (
        <Modal
          visible={cartVisible}
          animationType="slide"
          // Mientras se registra la venta el carrito no se cierra.
          onRequestClose={() => {
            if (!sending) setCartVisible(false);
          }}
        >
          <SafeAreaView style={styles.cartModal} edges={["top", "bottom"]}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Carrito</Text>
              <TouchableOpacity
                onPress={() => setCartVisible(false)}
                disabled={sending}
                style={styles.cartModalClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>
            {cartContent}
          </SafeAreaView>
        </Modal>
      )}

      {/* Modal de éxito al registrar la venta */}
      <Modal
        visible={lastSale !== null}
        transparent
        animationType="fade"
        onRequestClose={handleStartAnotherSale}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <MaterialCommunityIcons name="check" size={40} color="#fff" />
            </View>

            <Text style={styles.modalTitle}>Venta registrada</Text>
            <Text style={styles.modalSubtitle}>
              {lastSale?.saleNumber ? `${lastSale.saleNumber} · ` : ""}
              {lastSale?.itemCount}{" "}
              {lastSale?.itemCount === 1 ? "producto" : "productos"} ·{" "}
              {PAYMENT_LABELS[lastSale?.method ?? "cash"] ?? lastSale?.method}
            </Text>
            {!!lastSale?.recovered && (
              <Text style={styles.modalNote}>
                Se confirmó después de una falla de conexión: quedó registrada una sola vez.
              </Text>
            )}
            {!!lastSale?.mismatch && (
              <Text style={[styles.modalNote, { color: palette.warning }]}>
                El total registrado no es el del carrito: quedó registrada una venta anterior de este carrito. Revísala en Ventas
                antes de seguir.
              </Text>
            )}

            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>Total</Text>
              <Text style={styles.modalTotalValue}>
                {formatMoney(lastSale?.total)}
              </Text>
            </View>

            {!!lastSale && lastSale.change > 0 && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Cambio</Text>
                <Text style={[styles.modalRowValue, { color: palette.success }]}>
                  {formatMoney(lastSale.change)}
                </Text>
              </View>
            )}

            {!!lastSale && lastSale.pending > 0 && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Pendiente</Text>
                <Text style={[styles.modalRowValue, { color: palette.warning }]}>
                  {formatMoney(lastSale.pending)}
                </Text>
              </View>
            )}

            <Button
              mode="contained"
              icon="cart-plus"
              onPress={handleStartAnotherSale}
              buttonColor={palette.primary}
              style={styles.modalButton}
              contentStyle={styles.modalButtonContent}
            >
              Nueva venta
            </Button>
          </View>
        </View>
      </Modal>

      {/* Cobro en efectivo sin turno: abrirlo aquí sin perder el carrito. */}
      <OpenShiftModal
        visible={openShiftVisible}
        onClose={() => setOpenShiftVisible(false)}
        onOpened={() => {
          setOpenShiftVisible(false);
          setFormMessage({ text: "Turno abierto. Confirma la venta de nuevo.", tone: "info" });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  productsSection: {
    flex: 1,
  },
  cartSection: {
    width: 400,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  // Modal del carrito en mobile
  cartModal: {
    flex: 1,
    backgroundColor: palette.background,
  },
  cartModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  cartModalTitle: {
    ...tokens.typography.h3,
    color: palette.text,
  },
  cartModalClose: {
    padding: tokens.spacing[2],
  },
  paymentSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  radioRow: {
    flexDirection: "row",
    gap: 16,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmButton: {
    marginTop: 8,
  },
  formMessage: {
    marginBottom: 12,
    gap: 8,
  },
  formMessageText: {
    fontSize: 13,
    color: palette.text,
    lineHeight: 19,
  },
  formMessageAction: {
    alignSelf: "flex-start",
  },

  // --- Modal de éxito ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  modalNote: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 19,
  },
  modalTotalBox: {
    width: "100%",
    backgroundColor: palette.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  modalTotalLabel: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  modalTotalValue: {
    fontSize: 30,
    fontWeight: "800",
    color: palette.text,
    marginTop: 2,
  },
  modalRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  modalRowLabel: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  modalRowValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalButton: {
    width: "100%",
    borderRadius: 10,
    marginTop: 24,
  },
  modalButtonContent: {
    paddingVertical: 6,
  },
});
