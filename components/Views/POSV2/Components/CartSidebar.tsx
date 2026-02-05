import palette from "@/constants/palette";
import { useResponsive } from "@/hooks/useResponsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View, Platform } from "react-native";
import {
  Button,
  Divider,
  FAB,
  IconButton,
  Menu,
  Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartItem, usePOS } from "../Context";

interface CartSidebarProps {
  isScreen?: boolean; // Para cuando se muestra como screen en mobile
  onFinish?: () => void | Promise<void>; // Callback cuando se presiona el botón de finalizar
  children?: React.ReactNode; // Contenido adicional a mostrar antes del footer
}

export type RefCartSidebar = {
  updateItems: () => void;
};

// Componente individual para cada item del carrito
interface CartItemComponentProps {
  item: CartItem;
  onQuantityChange: (productId: number, delta: number) => void;
  onUnitChange: (productId: number, unitId: number) => void;
  onRemove: (productId: number) => void;
}

function CartItemComponent({
  item,
  onQuantityChange,
  onUnitChange,
  onRemove,
}: CartItemComponentProps) {
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);

  const toggleUnitMenu = () => {
    setUnitMenuVisible((prev) => !prev);
  };

  const handleUnitChange = (unitId: number) => {
    onUnitChange(item.id, unitId);
    setUnitMenuVisible(false);
  };

  return (
    <View style={styles.itemContainer}>
      {/* Imagen y datos */}
      <View style={styles.itemRow}>
        {item.main_image?.uri ? (
          <Image
            source={{ uri: item.main_image.uri }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons
              name="package-variant"
              size={20}
              color={palette.textSecondary}
            />
          </View>
        )}

        <View style={styles.itemInfo}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View>
              <Text
                variant="bodyMedium"
                style={styles.itemName}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.itemCode}>
                {item.code}
              </Text>
            </View>

            {/* Selector de unidad */}
            {item.available_units && item.available_units.length > 1 && (
              <Menu
                visible={unitMenuVisible}
                onDismiss={toggleUnitMenu}
                anchor={
                  <Button mode="outlined" compact onPress={toggleUnitMenu}>
                    {item.unit_abbreviation || item.unit_name || "Unidad"}
                    <MaterialCommunityIcons name="chevron-down" size={16} />
                  </Button>
                }
              >
                {item.available_units.map((unit: any) => (
                  <Menu.Item
                    key={unit.id}
                    onPress={() => handleUnitChange(unit.id)}
                    title={`${unit.name} (${unit.abbreviation})`}
                    leadingIcon={unit.id === item.unit_id ? "check" : undefined}
                  />
                ))}
              </Menu>
            )}
          </View>

          <Text variant="titleSmall" style={styles.itemPrice}>
            ${item.price.toFixed(2)}
            {item.unit_abbreviation && (
              <Text style={styles.unitLabel}> /{item.unit_abbreviation}</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.quantityRow}>
        <View style={styles.quantityControls}>
          <IconButton
            icon="minus"
            size={16}
            mode="contained"
            containerColor={palette.error}
            iconColor="#fff"
            onPress={() => onQuantityChange(item.id, -1)}
          />
          <Text variant="bodyMedium" style={styles.quantityText}>
            {item.quantity}
          </Text>
          <IconButton
            icon="plus"
            size={16}
            mode="contained"
            containerColor={palette.success}
            iconColor="#fff"
            onPress={() => onQuantityChange(item.id, 1)}
          />
        </View>

        <View style={styles.itemRight}>
          <Text variant="titleSmall" style={styles.itemTotal}>
            ${item.total.toFixed(2)}
          </Text>
          <IconButton
            icon="delete"
            size={18}
            iconColor={palette.error}
            onPress={() => onRemove(item.id)}
          />
        </View>
      </View>
    </View>
  );
}

const CartSidebar = ({
  isScreen = false,
  onFinish,
  children,
}: CartSidebarProps) => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    updateUnit,
    getCartTotal,
    getCartItemsCount,
    clearCart,
    cartRef,
    type = "purchases",
  } = usePOS();

  const { isMobile } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CartItem[]>([]);

  // Inicializar items del carrito
  useEffect(() => {
    setItems([...cartItems.current]);

    cartRef.current = {
      updateItems: () => {
        setItems([...cartItems.current]);
      },
    };
  }, []);

  const handleQuantityChange = (productId: number, delta: number) => {
    const item = cartItems.current.find((i) => i.id === productId);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity > 0) {
        updateQuantity(productId, newQuantity);
      }
    }
  };

  const handleUnitChange = (productId: number, unitId: number) => {
    updateUnit(productId, unitId);
  };

  const handleRemove = (productId: number) => {
    removeFromCart(productId);
  };

  const cartItemsCount = getCartItemsCount();

  // Si es mobile y no es una screen, mostrar FAB
  if (isMobile && !isScreen) {
    if (cartItemsCount === 0) return null;

    const carritoRoute =
      type === "purchases"
        ? "/(tabs)/home/purchases/formv2/carrito"
        : "/(tabs)/home/sales/formv2/carrito";

    return (
      <FAB
        icon="cart"
        label={cartItemsCount.toString()}
        style={styles.fab}
        onPress={() => router.push(carritoRoute as any)}
        color="#fff"
      />
    );
  }

  // Renderizado completo del sidebar (desktop o mobile screen)
  if (items.length === 0) {
    return (
      <View style={[styles.container, isScreen && styles.containerScreen]}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="cart"
            size={24}
            color={palette.primary}
          />
          <Text variant="titleLarge" style={styles.headerTitle}>
            Carrito
          </Text>
        </View>
        <Divider />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={60}
            color={palette.textSecondary}
          />
          <Text style={styles.emptyText}>Carrito vacío</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isScreen && styles.containerScreen]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="cart"
            size={24}
            color={palette.primary}
          />
          <Text variant="titleLarge" style={styles.headerTitle}>
            Carrito
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.itemCount}>
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </Text>
      </View>

      <Divider />

      {/* Lista de productos - con flex para ocupar espacio disponible */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <CartItemComponent
                item={item}
                onQuantityChange={handleQuantityChange}
                onUnitChange={handleUnitChange}
                onRemove={handleRemove}
              />
              {index < items.length - 1 && <Divider style={styles.divider} />}
            </React.Fragment>
          ))}
        </ScrollView>

        {/* Contenido personalizado (como métodos de pago) */}
        {children}
      </View>

      {/* Footer con total y acciones */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Divider />
        <View style={styles.totalContainer}>
          <Text variant="titleMedium" style={styles.totalLabel}>
            Total:
          </Text>
          <Text variant="headlineSmall" style={styles.totalAmount}>
            ${getCartTotal().toFixed(2)}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={clearCart}
            style={styles.clearButton}
            textColor={palette.error}
          >
            Limpiar
          </Button>
          <Button
            mode="contained"
            onPress={async () => {
              if (onFinish) {
                await onFinish();
              } else {
                console.log("Finalizar compra - no hay callback");
              }
            }}
            style={styles.checkoutButton}
            buttonColor={palette.primary}
          >
            Finalizar
          </Button>
        </View>
      </View>
    </View>
  );
};

export default CartSidebar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  containerScreen: {
    borderLeftWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  itemCount: {
    color: palette.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: 12,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: palette.primary,
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  itemContainer: {
    padding: 12,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: palette.skeleton,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: palette.skeleton,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  itemCode: {
    color: palette.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  itemPrice: {
    color: palette.primary,
    fontWeight: "bold",
  },
  unitButton: {
    marginVertical: 2,
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  unitButtonLabel: {
    fontSize: 11,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  unitButtonContent: {
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  unitLabel: {
    fontSize: 10,
    color: palette.textSecondary,
    fontWeight: "normal",
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quantityText: {
    fontWeight: "bold",
    minWidth: 24,
    textAlign: "center",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemTotal: {
    fontWeight: "bold",
    color: palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontWeight: "bold",
    color: palette.text,
  },
  totalAmount: {
    fontWeight: "bold",
    color: palette.primary,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  clearButton: {
    flex: 1,
    borderColor: palette.error,
  },
  checkoutButton: {
    flex: 2,
  },
});
