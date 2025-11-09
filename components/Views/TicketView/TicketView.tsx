import palette from "@/constants/palette";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, IconButton, Text } from "react-native-paper";

interface CartItem {
  id: number;
  name: string;
  code: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  current_stock?: number;
  product_type?: string;
}

interface TicketViewProps {
  cart: CartItem[];
  cartTotal: number;
  cartItemsCount: number;
  onEditCart?: () => void;
  onClearCart?: () => void;
  readonly?: boolean;
  type?: "sales" | "purchases";
}

export default function TicketView({
  cart,
  cartTotal,
  cartItemsCount,
  onEditCart,
  onClearCart,
  readonly = false,
  type = "purchases",
}: TicketViewProps) {
  const title = type === "sales" ? "Resumen de Venta" : "Resumen de Compra";
  const emptyMessage =
    type === "sales"
      ? "No hay productos para vender"
      : "No hay productos para comprar";

  return (
    <View style={styles.ticketContainer}>
      {/* Header del ticket */}
      <View style={styles.ticketHeader}>
        <Text variant="titleLarge" style={styles.ticketTitle}>
          {title}
        </Text>
        {!readonly && cart.length > 0 && (
          <View style={styles.headerActions}>
            {onEditCart && (
              <Button
                mode="outlined"
                onPress={onEditCart}
                icon="pencil"
                contentStyle={styles.actionButtonContent}
              >
                Editar
              </Button>
            )}
            {onClearCart && (
              <IconButton
                icon="delete"
                mode="outlined"
                size={20}
                onPress={onClearCart}
              />
            )}
          </View>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Contenido del ticket */}
      <ScrollView
        style={styles.ticketBody}
        showsVerticalScrollIndicator={false}
      >
        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMessage}>{emptyMessage}</Text>
            {!readonly && onEditCart && (
              <Button
                mode="contained"
                onPress={onEditCart}
                style={styles.addProductsButton}
              >
                {type === "sales"
                  ? "Agregar Productos"
                  : "Seleccionar Productos"}
              </Button>
            )}
          </View>
        ) : (
          <View>
            {/* Lista de productos */}
            <View style={styles.productsList}>
              {cart.map((item, index) => (
                <View key={item.id} style={styles.ticketItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemCode}>{item.code}</Text>
                  </View>

                  <View style={styles.itemDetails}>
                    <View style={styles.itemQuantityPrice}>
                      <Text style={styles.itemQuantity}>
                        {item.quantity} x{" "}
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(item.unit_price)}
                      </Text>
                    </View>

                    <Text style={styles.itemTotal}>
                      {new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      }).format(item.total_price)}
                    </Text>
                  </View>

                  {/* Stock info para compras */}
                  {type === "purchases" && item.current_stock !== undefined && (
                    <View style={styles.stockInfo}>
                      <Text style={styles.stockText}>
                        Stock actual: {item.current_stock}
                      </Text>
                      <Text style={styles.stockText}>
                        Stock después de compra:{" "}
                        {item.current_stock + item.quantity}
                      </Text>
                    </View>
                  )}

                  {index < cart.length - 1 && (
                    <Divider style={styles.itemDivider} />
                  )}
                </View>
              ))}
            </View>

            {/* Resumen totales */}
            <Divider style={styles.divider} />

            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de productos:</Text>
                <Text style={styles.summaryValue}>{cartItemsCount}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(cartTotal)}
                </Text>
              </View>

              {/* IVA simulado para compras */}
              {type === "purchases" && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>IVA (16%):</Text>
                  <Text style={styles.summaryValue}>
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(cartTotal * 0.16)}
                  </Text>
                </View>
              )}

              <Divider style={styles.divider} />

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>
                  Total {type === "purchases" ? "(con IVA)" : ""}:
                </Text>
                <Text style={styles.totalValue}>
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(
                    type === "purchases" ? cartTotal * 1.16 : cartTotal
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer actions */}
      {!readonly && cart.length > 0 && (
        <View style={styles.ticketFooter}>
          <Divider style={styles.divider} />
          <View style={styles.footerActions}>
            {onEditCart && (
              <Button
                mode="outlined"
                onPress={onEditCart}
                style={styles.editButton}
                icon="pencil"
              >
                Editar {type === "sales" ? "Venta" : "Compra"}
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ticketContainer: {
    flex: 1,
    marginTop: 24,
    backgroundColor: "white",
    padding: 0,
  },
  ticketContent: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketTitle: {
    fontWeight: "bold",
    color: palette.primary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtonContent: {
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 12,
  },
  ticketBody: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginBottom: 24,
  },
  addProductsButton: {
    marginTop: 16,
  },
  productsList: {
    gap: 16,
  },
  ticketItem: {
    paddingVertical: 12,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 12,
    color: "#666",
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemQuantityPrice: {
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#666",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: palette.primary,
  },
  stockInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0f8ff",
    borderRadius: 6,
  },
  stockText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  itemDivider: {
    marginTop: 16,
  },
  summarySection: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: palette.primary,
  },
  ticketFooter: {
    marginTop: 16,
  },
  footerActions: {
    marginTop: 16,
  },
  editButton: {
    width: "100%",
  },
});
