import Cart from "@/components/Views/POSV3/components/Cart";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSale } from "./SaleContext";

export default function CarritoScreen() {
  const saleContext = useSale();
  const alerts = useAlerts();
  const router = useRouter();

  const handleFinish = async () => {
    try {
      // Validar que haya productos en el carrito
      if (!saleContext.cartItems || saleContext.cartItems.length === 0) {
        alerts.error("Debes agregar al menos un producto al carrito");
        return;
      }

      // Confirmar la venta
      const confirmed = await alerts.confirm(
        "¿Deseas finalizar y registrar la venta?",
        {
          title: "Finalizar Venta",
          okText: "Finalizar",
          cancelText: "Cancelar",
        },
      );

      if (!confirmed) return;

      // La confirmación se manejará desde el formulario principal
      // que incluye el método de pago y otros datos
      alerts.info(
        "Por favor, completa la información de pago en el formulario principal",
      );
      router.back();
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || "Error al procesar la venta";
      alerts.error(errorMessage);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Cart
        cartItems={saleContext.cartItems}
        onItemChange={saleContext.handleItemChange}
        onRemoveItem={saleContext.handleRemoveProduct}
        onClearCart={saleContext.clearCart}
        onFinish={handleFinish}
        groupedUnits={saleContext.groupedUnits}
        showFinishButton={true}
        finishButtonText="Ir a Pago"
      />
    </View>
  );
}

/* const styles = StyleSheet.create({
  paymentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  paymentTitle: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: "#fff",
    gap: 8,
  },
  paymentLabel: {
    fontWeight: "600",
    color: palette.text,
    fontSize: 12,
  },
  paymentLabelSelected: {
    color: "#fff",
  },
}); */
