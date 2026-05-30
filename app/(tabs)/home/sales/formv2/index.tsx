import {
  Cart,
  ListProducts,
  type ProductListItem,
} from "@/components/Views/POSV3/components";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button, RadioButton, Text } from "react-native-paper";
import { useSale } from "./SaleContext";

export default function SaleFormScreen() {
  const alerts = useAlerts();
  const saleContext = useSale();

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saleCompleted, setSaleCompleted] = useState(false);

  // Convertir selectedProducts a formato de CartItemData
  const cartItems = useMemo(() => {
    return Object.entries(saleContext.selectedProducts).map(
      ([productId, item]) => {
        const product = saleContext.products.find(
          (p) => p.id.toString() === productId,
        );
        const selectedUnit = product?.available_units?.find(
          (u) => u.id === item.unit_id,
        );

        return {
          id: productId as any,
          product_id: item.product_id,
          code: product?.code || "",
          name: product?.name || "",
          price: item.price,
          quantity: item.quantity,
          total: item.quantity * item.price,
          unit_id: item.unit_id,
          unit_name: selectedUnit?.name,
          unit_abbreviation: selectedUnit?.abbreviation,
          main_image: product?.main_image,
          available_units: product?.available_units?.map((u) => ({
            id: u.id,
            name: u.name,
            abbreviation: u.abbreviation,
            price: item.price,
          })),
        };
      },
    );
  }, [saleContext.selectedProducts, saleContext.products]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const handleConfirmSale = async () => {
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

      const paidAmount = paymentAmount ? parseFloat(paymentAmount) : 0;

      await saleContext.confirmSale({
        payment_method: paymentMethod,
        paid_amount: paidAmount > 0 ? paidAmount : undefined,
      });

      // Limpiar formulario
      setPaymentAmount("");
      setPaymentMethod("cash");
      setSaleCompleted(true);
    } catch (error: any) {
      console.error("Error confirming sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al confirmar la venta";
      alerts.error(errorMessage);
    }
  };

  const handleAddProduct = (product: ProductListItem, unitId: number) => {
    if (saleCompleted) {
      setSaleCompleted(false);
    }

    saleContext.handleAddProduct(product, unitId);
  };

  const handleStartAnotherSale = () => {
    setSaleCompleted(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
  };

  return (
    <View style={styles.container}>
      {/* Lista de productos a la izquierda */}
      <View style={styles.productsSection}>
        <ListProducts
          loading={saleContext.loading}
          categories={saleContext.categories}
          products={saleContext.products}
          selectedProducts={saleContext.selectedProducts}
          onAddProduct={handleAddProduct}
          onRemoveProduct={saleContext.handleRemoveProduct}
          onItemChange={saleContext.handleItemChange}
          showOutOfStockFilter
        />
      </View>

      {/* Carrito y pago a la derecha */}
      <View style={styles.cartSection}>
        <Cart
          items={cartItems}
          onRemoveItem={(itemId) => {
            saleContext.handleRemoveProduct(itemId);
          }}
          onItemChange={(item, action, data) => {
            saleContext.handleItemChange(item, action, data);
          }}
          onClearCart={saleContext.clearCart}
        >
          {/* Información de pago dentro del carrito */}
          <View style={styles.paymentSection}>
            {saleCompleted && (
              <View style={styles.successPanel}>
                <Text style={styles.successTitle}>Venta registrada</Text>
                <Text style={styles.successText}>
                  Puedes iniciar otra venta sin volver al listado.
                </Text>
                <Button
                  mode="contained"
                  icon="cart-plus"
                  onPress={handleStartAnotherSale}
                  buttonColor={palette.primary}
                  style={styles.newSaleButton}
                >
                  Hacer otra venta
                </Button>
              </View>
            )}

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
              disabled={cartItems.length === 0 || saleCompleted}
              style={styles.confirmButton}
              buttonColor={palette.primary}
              icon="check"
            >
              Confirmar Venta
            </Button>
          </View>
        </Cart>
      </View>
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
  paymentSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  successPanel: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: palette.primary + "1F",
    borderWidth: 1,
    borderColor: palette.primary,
    gap: 8,
  },
  successTitle: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  successText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  newSaleButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    marginTop: 2,
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
});
