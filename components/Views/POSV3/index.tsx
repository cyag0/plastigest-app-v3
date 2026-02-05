import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Cart, CartItemData, ListProducts, ProductListItem, ProductCategory } from "./components";

/**
 * POSV3 - Punto de Venta versión 3
 * 
 * Esta versión usa componentes imperativos donde el estado se maneja externamente.
 * Los componentes ListProducts y Cart son "tontos" (dumb components) que solo 
 * reciben datos y emiten eventos, sin manejar estado interno.
 */

interface POSV3Props {
  type?: "sales" | "purchases";
}

export default function POSV3({ type = "sales" }: POSV3Props) {
  const { selectedLocation } = useSelectedLocation();

  // Estado externo - todo se maneja aquí
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupedUnits, setGroupedUnits] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [productsRes, categoriesRes, unitsRes] = await Promise.all([
        Services.products.index({
          location_id: selectedLocation?.id,
          is_active: "1",
          for_sale: type === "sales" ? "1" : undefined,
        }),
        Services.categories.index({ all: true }),
        Services.home.unidades.getGroupedByBase(),
      ]);

      // Manejar respuestas paginadas
      const productsData = Array.isArray(productsRes)
        ? productsRes
        : (productsRes as any).data?.data || (productsRes as any).data || [];

      const categoriesData = Array.isArray(categoriesRes)
        ? categoriesRes
        : (categoriesRes as any).data?.data || (categoriesRes as any).data || [];

      const unitsData = unitsRes?.data || {};

      // Formatear productos a ProductListItem
      const formattedProducts: ProductListItem[] = productsData.map(
        (p: App.Entities.Product) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          // Usar price unificado según el tipo
          price: parseFloat(
            type === "purchases"
              ? p.purchase_price?.toString() || "0"
              : p.sale_price?.toString() || "0"
          ),
          current_stock: p.current_stock,
          category_id: p.category_id,
          main_image: p.main_image,
        })
      );

      setProducts(formattedProducts);
      setCategories(categoriesData);
      setGroupedUnits(unitsData);
    } catch (error) {
      console.error("Error loading POS data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Manejador cuando se presiona un producto
  const handleItemPress = (product: ProductListItem) => {
    // Buscar si ya existe en el carrito
    const existingIndex = cartItems.findIndex(
      (item) => item.product_id === product.id
    );

    if (existingIndex >= 0) {
      // Si existe, incrementar cantidad
      const newItems = [...cartItems];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total =
        newItems[existingIndex].price * newItems[existingIndex].quantity;
      setCartItems(newItems);
    } else {
      // Si no existe, agregar nuevo item
      const newItem: CartItemData = {
        id: Date.now(), // ID temporal para el item del carrito
        product_id: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
        main_image: product.main_image,
        // Aquí podrías agregar available_units si el producto las tiene
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Manejador de cambio de cantidad
  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    const newItems = cartItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          total: item.price * newQuantity,
        };
      }
      return item;
    });
    setCartItems(newItems);
  };

  // Manejador de cambio de unidad
  const handleUnitChange = (itemId: number, unitId: number) => {
    const newItems = cartItems.map((item) => {
      if (item.id === itemId && item.available_units) {
        const unit = item.available_units.find((u) => u.id === unitId);
        if (unit) {
          return {
            ...item,
            unit_id: unitId,
            unit_name: unit.name,
            unit_abbreviation: unit.abbreviation,
            price: unit.price,
            total: unit.price * item.quantity,
          };
        }
      }
      return item;
    });
    setCartItems(newItems);
  };

  // Manejador de eliminación de item
  const handleRemoveItem = (itemId: number) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  // Manejador de limpiar carrito
  const handleClearCart = () => {
    setCartItems([]);
  };

  // Manejador de finalizar compra/venta
  const handleFinish = () => {
    console.log("Finalizar con items:", cartItems);
    // Aquí implementarías la lógica para crear la venta o compra
  };

  return (
    <View style={styles.container}>
      {/* Lista de productos - componente imperativo */}
      <View style={styles.productsSection}>
        <ListProducts
          products={products}
          categories={categories}
          onItemPress={handleItemPress}
          loading={loading}
          showSearch={true}
          showCategories={true}
          autoAdjustColumns={true}
        />
      </View>

      {/* Carrito - componente imperativo */}
      <View style={styles.cartSection}>
        <Cart
          items={cartItems}
          onQuantityChange={handleQuantityChange}
          onUnitChange={handleUnitChange}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onFinish={handleFinish}
          showFooter={true}
        />
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
    borderLeftColor: "#e0e0e0",
  },
});
