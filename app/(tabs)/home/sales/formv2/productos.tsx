import ListProducts from "@/components/Views/POSV3/components/ListProducts";
import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSale } from "./SaleContext";

export default function ProductosScreen() {
  const saleContext = useSale();

  return (
    <ListProducts
      products={saleContext.products}
      categories={saleContext.categories}
      groupedUnits={saleContext.groupedUnits}
      onAddProduct={saleContext.handleAddProduct}
      loading={saleContext.loading}
    />
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
