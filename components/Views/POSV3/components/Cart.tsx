import EmptyState from "@/components/App/EmptyState";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Divider, FAB, Menu } from "react-native-paper";

export interface CartItemData {
  id: number | string;
  product_id: number;
  code: string;
  name: string;
  price: number; // Precio unitario
  quantity: number;
  total: number; // price * quantity
  unit_id?: number;
  unit_name?: string;
  unit_abbreviation?: string;
  unit?: string;
  main_image?: {
    uri: string;
  };
  available_units?: {
    id: number;
    name: string;
    abbreviation: string;
    price: number;
  }[];
}

interface CartProps {
  items: CartItemData[];
  onRemoveItem?: (itemId: number | string) => void;
  onItemChange?: (
    itemId: number | string,
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
  onRemove: (itemId: number | string) => void;
  onItemChange: (
    itemId: number | string,
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
    onItemChange(item.id, "unit", unitId);
    setUnitMenuVisible(false);
  };

  return (
    <View style={styles.itemContainer}>
      {/* Imagen y datos */}
      <View style={styles.itemRow}>
        <View style={styles.imageWrap}>
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
                color={palette.textMuted}
              />
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.itemHeaderRow}>
            <View style={styles.itemTitleWrap}>
              <Text
                style={styles.itemName}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text style={styles.itemCode}>{item.code}</Text>
            </View>

            {/* Selector de unidad */}
            {item.available_units && item.available_units.length > 1 && (
              <View>
                <TouchableOpacity
                  style={styles.unitChip}
                  onPress={() => setUnitMenuVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unitChipText} numberOfLines={1}>
                    {item.unit_abbreviation ||
                      item.unit_name ||
                      item.unit ||
                      "Unidad"}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={12}
                    color={palette.textSecondary}
                  />
                </TouchableOpacity>
                <Menu
                  visible={unitMenuVisible}
                  onDismiss={() => setUnitMenuVisible(false)}
                  anchor={
                    <View style={styles.menuAnchor}>
                      <Text>·</Text>
                    </View>
                  }
                  contentStyle={styles.unitMenu}
                >
                  {item.available_units.map((unit) => (
                    <Menu.Item
                      key={unit.id}
                      onPress={() => handleUnitChange(unit.id)}
                      title={`${unit.name} (${unit.abbreviation})`}
                      leadingIcon={
                        unit.id === item.unit_id ? "check" : undefined
                      }
                      titleStyle={
                        unit.id === item.unit_id
                          ? styles.unitMenuItemTextSelected
                          : undefined
                      }
                    />
                  ))}
                </Menu>
              </View>
            )}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>
              ${item.price.toFixed(2)}
              {item.unit_abbreviation && (
                <Text style={styles.unitLabel}>
                  {" "}
                  /{item.unit_abbreviation}
                </Text>
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.quantityRow}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => handleQuantityChange(-1)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="minus"
              size={14}
              color={palette.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyButton, styles.qtyButtonPrimary]}
            onPress={() => handleQuantityChange(1)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.itemRight}>
          <Text style={styles.itemTotal}>${item.total.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(item.id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={palette.error}
            />
          </TouchableOpacity>
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
        <View style={styles.headerTitleWrap}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={18}
              color={palette.primary}
            />
          </View>
          <Text style={styles.title}>Carrito</Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{itemCount}</Text>
            </View>
          )}
        </View>
        {items.length > 0 && onClearCart && (
          <TouchableOpacity
            onPress={onClearCart}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="broom"
              size={14}
              color={palette.error}
            />
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.headerDivider} />

      {/* Items */}
      <ScrollView
        style={styles.itemsList}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="cart-outline"
              title="El carrito está vacío"
              description="Agrega productos para comenzar"
              compact
            />
          </View>
        ) : (
          items.map((item, index) => (
            <View key={item.id}>
              <CartItemComponent
                item={item}
                onRemove={onRemoveItem}
                onItemChange={onItemChange}
              />
              {index < items.length - 1 && (
                <View style={styles.itemDivider} />
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Children - contenido adicional */}
      {children}

      {/* Footer - Total y botón de finalizar */}
      {showFooter && items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Items</Text>
              <Text style={styles.totalValue}>{itemCount}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabelStrong}>Total</Text>
              <Text style={styles.totalAmount}>
                ${cartTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          {onFinish && (
            <TouchableOpacity
              onPress={onFinish}
              style={styles.finishButton}
              activeOpacity={0.7}
            >
              <Text style={styles.finishButtonText}>Finalizar</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
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
    backgroundColor: palette.surface,
  },
  screenContainer: {
    // Estilos específicos cuando se muestra como pantalla
  },

  // --- Header ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[4],
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[3],
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...tokens.typography.h3,
    color: palette.text,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 6,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
  },
  clearButtonText: {
    ...tokens.typography.micro,
    color: palette.error,
    fontWeight: "600",
  },
  headerDivider: {
    backgroundColor: palette.border,
  },

  // --- Items list ---
  itemsList: {
    flex: 1,
  },
  emptyWrap: {
    paddingTop: tokens.spacing[7],
  },
  itemContainer: {
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    gap: tokens.spacing[3],
  },
  itemRow: {
    flexDirection: "row",
    gap: tokens.spacing[3],
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: palette.surfaceMuted,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: palette.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing[2],
  },
  itemTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  itemCode: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemPrice: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  unitLabel: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
    fontWeight: "400",
  },

  // --- Unit chip in cart ---
  unitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.surfaceMuted,
  },
  unitChipText: {
    ...tokens.typography.micro,
    color: palette.text,
    fontWeight: "600",
  },
  unitMenu: {
    marginTop: 4,
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    ...tokens.shadow.md,
    borderWidth: 1,
    borderColor: palette.border,
    // Z-index alto para superponerse a las cards del carrito
    // sin verse transparente. Paper renderiza el Menu en un
    // portal, por lo que el zIndex va en el contentStyle.
    zIndex: 1000,
    elevation: 8,
  },
  menuAnchor: {
    width: 0,
    height: 0,
    opacity: 0,
    position: "absolute",
  },
  unitMenuItemTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },

  // --- Quantity row ---
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    backgroundColor: palette.surfaceMuted,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.surface,
  },
  qtyButtonPrimary: {
    backgroundColor: palette.primary,
  },
  quantityText: {
    ...tokens.typography.bodyMd,
    minWidth: 28,
    textAlign: "center",
    fontWeight: "700",
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  itemTotal: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: tokens.spacing[4],
  },

  // --- Footer ---
  footer: {
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  totalContainer: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[2],
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },
  totalLabelStrong: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  totalValue: {
    ...tokens.typography.body,
    color: palette.text,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  totalAmount: {
    ...tokens.typography.h2,
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.primary,
    marginHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
    paddingVertical: 12,
    borderRadius: tokens.radius.md,
  },
  finishButtonText: {
    ...tokens.typography.bodyMd,
    color: "#fff",
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    margin: tokens.spacing[4],
    right: 0,
    bottom: 0,
    backgroundColor: palette.primary,
  },
});
