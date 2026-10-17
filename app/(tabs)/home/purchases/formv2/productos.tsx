import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import palette from "@/constants/palette";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney } from "@/utils/format";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { useBackToPurchaseForm, usePurchase } from "./PurchaseContext";

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={cartBtnStyles.btn}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Ver carrito"
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={palette.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <Text style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
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

export default function ProductosScreen() {
  const {
    products,
    categories,
    loading,
    selectedProducts,
    handleAddProduct,
    handleRemoveProduct,
    handleItemChange,
    loadData,
    supplierId,
    canEditLines,
    canRemoveLines,
  } = usePurchase();
  const router = useRouter();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();
  const backToForm = useBackToPurchaseForm();
  const barStyles = useThemedStyles((colors) => ({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summary: { flex: 1, minWidth: 0 },
    count: { fontSize: 13, color: colors.textSecondary },
    total: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
  }));

  // Safety net: if we arrive here with a supplier but no products loaded yet, fetch now.
  useEffect(() => {
    if (supplierId && products.length === 0 && !loading) {
      loadData(supplierId);
    }
  }, [supplierId]);

  const cartItems = useMemo(() => {
    return Object.entries(selectedProducts).map(([productId, item]) => {
      const product = products.find((p) => p.id.toString() === productId);
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
    });
  }, [selectedProducts, products]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    if (!isMobile) return;
    navigation.setOptions({
      headerRight: () => (
        <CartHeaderButton
          count={itemCount}
          onPress={() => router.push("/(tabs)/home/purchases/formv2/carrito" as any)}
        />
      ),
    });
  }, [isMobile, itemCount]);

  return (
    <View style={styles.container}>
      <View style={styles.productsSection}>
        <ListProducts
          loading={loading}
          categories={categories}
          products={products}
          selectedProducts={selectedProducts}
          onAddProduct={handleAddProduct}
          onRemoveProduct={handleRemoveProduct}
          onItemChange={handleItemChange}
          canEditItems={canEditLines}
          canRemoveItems={canRemoveLines}
        />

        {/* En el celular no hay carrito al lado: esta barra regresa a la
            compra, donde se revisa y se confirma. */}
        {isMobile && (
          <View style={barStyles.bar}>
            <View style={barStyles.summary}>
              <Text style={barStyles.count}>
                {cartItems.length === 0
                  ? "Sin productos"
                  : `${cartItems.length} ${cartItems.length === 1 ? "producto" : "productos"}`}
              </Text>
              <Text style={barStyles.total}>{formatMoney(cartTotal)}</Text>
            </View>
            <Button mode="contained" onPress={backToForm} icon="check">
              Listo
            </Button>
          </View>
        )}
      </View>

      {/* Carrito lateral — solo desktop */}
      {!isMobile && (
        <View style={styles.cartSection}>
          <Cart
            items={cartItems}
            onRemoveItem={handleRemoveProduct}
            onItemChange={handleItemChange}
            canEditItems={canEditLines}
            canRemoveItems={canRemoveLines}
            isScreen
          >
            <View style={{ padding: 16 }}>
              <Button
                mode="contained"
                onPress={backToForm}
                style={{ marginTop: 8 }}
                icon="arrow-left"
              >
                Volver a la compra
              </Button>
            </View>
          </Cart>
        </View>
      )}
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
    minWidth: 300,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
});
