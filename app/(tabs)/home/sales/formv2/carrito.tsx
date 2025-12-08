import CartSidebar from "@/components/Views/POSV2/Components/CartSidebar";
import { usePOS } from "@/components/Views/POSV2/Context";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

export default function CarritoScreen() {
  const { cartItems, clearCart } = usePOS();
  const alerts = useAlerts();
  const router = useRouter();

  const paymentMethod = useRef<string>("efectivo");

  const handleFinish = async () => {
    try {
      const _cartItems = cartItems.current || [];

      // Validar que haya productos en el carrito
      if (!_cartItems || _cartItems.length === 0) {
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
        }
      );

      if (!confirmed) return;

      // Preparar datos de la venta
      const saleData = {
        payment_method: paymentMethod.current,
        details: _cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      // Crear la venta
      const response = await Services.sales.store(saleData);

      alerts.success("Venta registrada exitosamente");
      clearCart();
      router.back();
    } catch (error: any) {
      console.error("Error creating sale:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error al registrar la venta";
      alerts.error(errorMessage);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CartSidebar isScreen={true} onFinish={handleFinish}>
        <CartContent paymentMethod={paymentMethod} />
      </CartSidebar>
    </View>
  );
}

interface CartContentProps {
  paymentMethod: React.MutableRefObject<string>;
}

function CartContent(props: CartContentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");
  const paymentMethods = [
    {
      label: "Efectivo",
      value: "efectivo",
      icon: "cash" as const,
      color: palette.success,
    },
    {
      label: "Tarjeta",
      value: "tarjeta",
      icon: "credit-card" as const,
      color: palette.blue,
    },
    {
      label: "Transferencia",
      value: "transferencia",
      icon: "bank-transfer" as const,
      color: palette.warning,
    },
  ];

  useEffect(() => {
    props.paymentMethod.current = paymentMethod;
  }, [paymentMethod]);

  return (
    <View style={styles.paymentContainer}>
      <Text variant="titleSmall" style={styles.paymentTitle}>
        Método de Pago
      </Text>
      <View style={styles.paymentMethods}>
        {paymentMethods.map((method) => {
          const isSelected = paymentMethod === method.value;
          return (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.paymentButton,
                isSelected && {
                  backgroundColor: method.color,
                  borderColor: method.color,
                },
              ]}
              onPress={() => setPaymentMethod(method.value)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={method.icon}
                size={28}
                color={isSelected ? "#fff" : method.color}
              />
              <Text
                variant="bodyMedium"
                style={[
                  styles.paymentLabel,
                  isSelected && styles.paymentLabelSelected,
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
