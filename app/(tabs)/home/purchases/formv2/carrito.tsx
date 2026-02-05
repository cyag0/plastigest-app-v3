import { Cart } from "@/components/Views/POSV3/components";
import React from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import { usePurchase } from "./PurchaseContext";

export default function CarritoScreen() {
  const { cartItems, handleRemoveProduct, handleItemChange } = usePurchase();

  return (
    <View style={{ flex: 1 }}>
      <Cart
        items={cartItems}
        onRemoveItem={handleRemoveProduct}
        onItemChange={handleItemChange}
      >
        <View style={{ padding: 16 }}>
          <Button mode="contained">Finalizar Compra</Button>
        </View>
      </Cart>
    </View>
  );
}
