import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  FAB,
  IconButton,
  Menu,
  Text,
} from "react-native-paper";

export interface CartItemData {
  id: number;
  product_id: number;
  code: string;
  name: string;
  price: number; // Precio unitario
  quantity: number;
  total: number; // price * quantity
  unit_id?: number;
  unit_name?: string;
  unit_abbreviation?: string;
  main_image?: {
    uri: string;
  };
  available_units?: Array<{
    id: number;
    name: string;
    abbreviation: string;
    price: number;
  }>;
}

interface CartProps {
  items: CartItemData[];
  onRemoveItem?: (itemId: number) => void;
  onItemChange?: (
    itemId: number,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
  onClearCart?: () => void;
  onFinish?: () => void;
  isScreen?: boolean;
  showFooter?: boolean;
  children?: React.ReactNode;
}

interface CartItemComponentProps {
  item: CartItemData;
  onRemove: (itemId: number) => void;
  onItemChange: (
    itemId: number,
    action: "increment" | "decrement" | "unit",
    data?: any,
  ) => void;
}

function CartItemComponent({
  item,
  onRemove,
  onItemChange,
}: CartItemComponentProps) {
  const [unitMenuVisible, setUnitMenuVisible] = useState(false);

  const handleQuantityChange = (delta: number) => {
    if (delta > 0) {
      onItemChange(item.id, "increment");
    } else {
      onItemChange(item.id, "decrement");
    }
  };

  const handleUnitChange = (unitId: number) => {
    onItemChange(item.id, "unit", { unit_id: unitId });
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
                onDismiss={() => setUnitMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => setUnitMenuVisible(true)}
                  >
                    {item.unit_abbreviation || item.unit_name || "Unidad"}
                    <MaterialCommunityIcons name="chevron-down" size={16} />
                  </Button>
                }
              >
                {item.available_units.map((unit) => (
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
            onPress={() => handleQuantityChange(-1)}
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
            onPress={() => handleQuantityChange(1)}
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

export default function Cart({
  items,
  onRemoveItem = () => {},
  onItemChange = () => {},
  onClearCart,
  onFinish,
  isScreen = false,
  showFooter = true,
  children,
}: CartProps) {
  const cartTotal = items.reduce((sum, item) => sum + item.total, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={[styles.container, isScreen && styles.screenContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Carrito
        </Text>
        {items.length > 0 && onClearCart && (
          <Button
            mode="text"
            onPress={onClearCart}
            textColor={palette.error}
            compact
          >
            Limpiar
          </Button>
        )}
      </View>

      <Divider />

      {/* Items */}
      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={64}
              color={palette.textSecondary}
            />
            <Text variant="bodyLarge" style={styles.emptyText}>
              El carrito está vacío
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Agrega productos para comenzar
            </Text>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <View key={item.id}>
                <CartItemComponent
                  item={item}
                  onRemove={onRemoveItem}
                  onItemChange={onItemChange}
                />
                <Divider style={styles.itemDivider} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Children - contenido adicional */}
      {children}

      {/* Footer - Total y botón de finalizar */}
      {showFooter && items.length > 0 && (
        <View style={styles.footer}>
          <Divider />

          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text variant="bodyMedium" style={styles.totalLabel}>
                Items:
              </Text>
              <Text variant="bodyMedium">{itemCount}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total:
              </Text>
              <Text variant="titleLarge" style={styles.totalAmount}>
                ${cartTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {onFinish && (
            <Button
              mode="contained"
              onPress={onFinish}
              style={styles.finishButton}
              contentStyle={styles.finishButtonContent}
              labelStyle={styles.finishButtonLabel}
            >
              Finalizar
            </Button>
          )}
        </View>
      )}

      {/* FAB para mobile cuando no es screen */}
      {!isScreen && items.length > 0 && (
        <FAB
          icon="cart"
          label={`${itemCount} items - $${cartTotal.toFixed(2)}`}
          style={styles.fab}
          color="white"
          onPress={() => {
            // Se puede usar para navegar a la pantalla del carrito
            // o simplemente mostrar el resumen
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  screenContainer: {
    // Estilos específicos cuando se muestra como pantalla
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  title: {
    fontWeight: "bold",
  },
  itemsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  emptySubtext: {
    marginTop: 4,
    color: palette.textSecondary,
  },
  itemContainer: {
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    gap: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontWeight: "600",
    flex: 1,
  },
  itemCode: {
    color: palette.textSecondary,
  },
  itemPrice: {
    fontWeight: "600",
  },
  unitLabel: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityText: {
    minWidth: 30,
    textAlign: "center",
    fontWeight: "600",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTotal: {
    fontWeight: "bold",
    color: palette.primary,
  },
  itemDivider: {
    marginHorizontal: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#bbb",
    backgroundColor: "#fff",
  },
  totalContainer: {
    padding: 16,
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontWeight: "600",
  },
  totalAmount: {
    fontWeight: "bold",
    color: palette.primary,
  },
  finishButton: {
    margin: 16,
    marginTop: 0,
  },
  finishButtonContent: {
    paddingVertical: 8,
  },
  finishButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: palette.primary,
  },
});
