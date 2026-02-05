import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import { usePurchase } from "./PurchaseContext";

export default function ProductosScreen() {
  const {
    products,
    categories,
    loading,
    selectedProducts,
    handleAddProduct,
    handleRemoveProduct,
    handleItemChange,
  } = usePurchase();
  const router = useRouter();

  // Convertir selectedProducts a formato de CartItemData
  const cartItems = useMemo(() => {
    return Object.entries(selectedProducts).map(([productId, item]) => {
      const product = products.find((p) => p.id.toString() === productId);
      const selectedUnit = product?.available_units?.find(
        (u) => u.id === item.unit_id,
      );

      return {
        id: productId as any, // Usar el string completo (product_12 o package_12)
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
    });
  }, [selectedProducts, products]);

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <ListProducts
        loading={loading}
        categories={categories}
        products={products}
        selectedProducts={selectedProducts}
        onAddProduct={handleAddProduct}
        onRemoveProduct={handleRemoveProduct}
        onItemChange={handleItemChange}
      />

      <View
        style={{ minWidth: 300, borderLeftWidth: 1, borderLeftColor: "#eee" }}
      >
        <Cart
          items={cartItems}
          onRemoveItem={(itemId) => {
            console.log("Removing item from cart:", itemId);

            handleRemoveProduct(itemId);
          }}
          onItemChange={(item, action, data) => {
            console.log("Changing item in cart:", item, action, data);

            handleItemChange(item, action, data);
          }}
        >
          <View style={{ padding: 16 }}>
            <Button
              mode="contained"
              onPress={() => router.back()}
              style={{ marginTop: 8 }}
              icon="arrow-left"
            >
              Volver al formulario
            </Button>
          </View>
        </Cart>
      </View>
    </View>
  );
}
