import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text as RNText, TouchableOpacity, View } from "react-native";
import { Button, RadioButton, Text, TextInput } from "react-native-paper";
import { useSale } from "./SaleContext";

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

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<SaleSummary | null>(null);
  const [cartVisible, setCartVisible] = useState(false);

  // El contexto ya expone los items del carrito con el formato de Cart.
  const cartItems = saleContext.cartItems;

  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.total, 0),
    [cartItems],
  );

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  // En mobile inyectamos el botón del carrito en el AppBar.
  useEffect(() => {
    if (!isMobile) return;
    navigation.setOptions({
      headerRight: () => (
        <CartHeaderButton count={itemCount} onPress={() => setCartVisible(true)} />
      ),
    });
  }, [isMobile, itemCount]);

  const handleConfirmSale = async () => {
    if (isSubmitting) return;
    try {
      if (cartItems.length === 0) {
        alerts.error("Debes agregar al menos un producto");
        return;
      }

      const confirmed = await alerts.confirm("¿Deseas confirmar esta venta?", {
        title: "Confirmar Venta",
        okText: "Confirmar",
        cancelText: "Cancelar",
      });

      if (!confirmed) return;

      setIsSubmitting(true);

      const paidAmount = paymentAmount ? parseFloat(paymentAmount) : 0;

      // Capturar el resumen ANTES de confirmar, porque confirmSale limpia
      // el carrito (clearCart) y perderíamos los datos para el modal.
      const summary: SaleSummary = {
        total: totalAmount,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        method: paymentMethod,
        change:
          paymentMethod === "cash" && paidAmount > totalAmount
            ? paidAmount - totalAmount
            : 0,
        pending:
          paidAmount > 0 && paidAmount < totalAmount
            ? totalAmount - paidAmount
            : 0,
      };

      await saleContext.confirmSale({
        payment_method: paymentMethod,
        paid_amount: paidAmount > 0 ? paidAmount : undefined,
      });

      // Cerrar carrito y mostrar modal de éxito
      setCartVisible(false);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setLastSale(summary);
    } catch (error: any) {
      console.error("Error confirming sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al confirmar la venta";
      alerts.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAnotherSale = () => {
    setLastSale(null);
    setPaymentAmount("");
    setPaymentMethod("cash");
  };

  const cartContent = (
    <Cart
      items={cartItems}
      onRemoveItem={(itemId) => saleContext.handleRemoveProduct(itemId)}
      onItemChange={(item, action, data) => saleContext.handleItemChange(item, action, data)}
      onClearCart={saleContext.clearCart}
    >
      <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Información de Pago</Text>

            {/* Método de pago */}
            <View style={styles.field}>
              <Text style={styles.label}>Método de Pago</Text>
              <RadioButton.Group
                onValueChange={setPaymentMethod}
                value={paymentMethod}
              >
                <View style={styles.radioRow}>
                  <View style={styles.radioItem}>
                    <RadioButton value="cash" />
                    <Text>Efectivo</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="card" />
                    <Text>Tarjeta</Text>
                  </View>
                </View>
                <View style={styles.radioRow}>
                  <View style={styles.radioItem}>
                    <RadioButton value="transfer" />
                    <Text>Transferencia</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="credit" />
                    <Text>Crédito</Text>
                  </View>
                </View>
              </RadioButton.Group>
            </View>

            {/* Monto a pagar */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Monto Total: ${totalAmount.toFixed(2)}
              </Text>
              <Text style={styles.sublabel}>
                Monto a pagar ahora (deja vacío para pagar completo)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Botón confirmar */}
            <Button
              mode="contained"
              onPress={handleConfirmSale}
              disabled={cartItems.length === 0 || isSubmitting}
              loading={isSubmitting}
              style={styles.confirmButton}
              buttonColor={palette.primary}
              icon="check"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Venta"}
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
          onRequestClose={() => setCartVisible(false)}
        >
          <View style={styles.cartModal}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Carrito</Text>
              <TouchableOpacity
                onPress={() => setCartVisible(false)}
                style={styles.cartModalClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>
            {cartContent}
          </View>
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
              {lastSale?.itemCount}{" "}
              {lastSale?.itemCount === 1 ? "producto" : "productos"} ·{" "}
              {PAYMENT_LABELS[lastSale?.method ?? "cash"] ?? lastSale?.method}
            </Text>

            <View style={styles.modalTotalBox}>
              <Text style={styles.modalTotalLabel}>Total</Text>
              <Text style={styles.modalTotalValue}>
                ${lastSale?.total.toFixed(2)}
              </Text>
            </View>

            {!!lastSale && lastSale.change > 0 && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Cambio</Text>
                <Text style={[styles.modalRowValue, { color: palette.success }]}>
                  ${lastSale.change.toFixed(2)}
                </Text>
              </View>
            )}

            {!!lastSale && lastSale.pending > 0 && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Pendiente</Text>
                <Text style={[styles.modalRowValue, { color: palette.warning }]}>
                  ${lastSale.pending.toFixed(2)}
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
