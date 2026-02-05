import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button, RadioButton, Text } from "react-native-paper";
import { useSale } from "./SaleContext";

export default function SaleFormScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const saleContext = useSale();

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");

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

      router.replace("/(tabs)/home/sales" as any);
    } catch (error: any) {
      console.error("Error confirming sale:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al confirmar la venta";
      alerts.error(errorMessage);
    }
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
          onAddProduct={saleContext.handleAddProduct}
          onRemoveProduct={saleContext.handleRemoveProduct}
          onItemChange={saleContext.handleItemChange}
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
        >
          {/* Información de pago dentro del carrito */}
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
              disabled={cartItems.length === 0}
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
