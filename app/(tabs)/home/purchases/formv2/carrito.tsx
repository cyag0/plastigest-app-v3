import { Cart } from "@/components/Views/POSV3/components";
import React from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import { useBackToPurchaseForm, usePurchase } from "./PurchaseContext";

export default function CarritoScreen() {
  const { cartItems, handleRemoveProduct, handleItemChange, canEditLines, canRemoveLines } =
    usePurchase();
  const backToForm = useBackToPurchaseForm();

  return (
    <View style={{ flex: 1 }}>
      <Cart
        items={cartItems}
        onRemoveItem={handleRemoveProduct}
        onItemChange={handleItemChange}
        canEditItems={canEditLines}
        canRemoveItems={canRemoveLines}
        isScreen
      >
        <View style={{ padding: 16 }}>
          {/* Se confirma en el formulario (proveedor, fecha y forma de pago);
              antes este botón no hacía nada. */}
          <Button mode="contained" onPress={backToForm} icon="arrow-right">
            Revisar y confirmar
          </Button>
        </View>
      </Cart>
    </View>
  );
}
