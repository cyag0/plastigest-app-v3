import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text as RNText, TextInput, TouchableOpacity, View } from "react-native";
import { Button, Card, Menu, Text } from "react-native-paper";
import { TransferProvider, useTransferContext } from "./TransferContext";

type ListSelectedProduct = {
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
};

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={cartBtnStyles.btn} activeOpacity={0.7}>
      <MaterialCommunityIcons name="cart-outline" size={24} color={palette.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <RNText style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</RNText>
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

function TransferFormContent() {
  const router = useRouter();
  const alerts = useAlerts();
  const transferContext = useTransferContext();
  const auth = useAuth();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();

  const [locations, setLocations] = useState<App.Entities.Location[]>([]);
  const [notes, setNotes] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [fromMenuVisible, setFromMenuVisible] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);

  const company = auth.selectedCompany;
  const currentLocation = auth.location;

  // Cargar ubicaciones al montar
  useEffect(() => {
    if (company) {
      loadLocations();
    }
  }, [company]);

  // El destino siempre es la sucursal actual
  useEffect(() => {
    if (currentLocation) {
      transferContext.setToLocation(currentLocation.id);
    }
  }, [currentLocation]);

  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await Services.admin.locations.index({
        company_id: company?.id,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setLocations(data as App.Entities.Location[]);
    } catch (error) {
      console.error("Error loading locations:", error);
      alerts.error("Error al cargar ubicaciones");
    } finally {
      setLoadingLocations(false);
    }
  };

  // Convertir selectedProducts a formato de CartItemData
  const cartItems = useMemo(() => {
    return Object.entries(transferContext.selectedProducts).map(
      ([productId, item]) => {
        const product = transferContext.products.find(
          (p) => p.id.toString() === productId,
        );
        const selectedUnit = product?.available_units?.find(
          (u) => u.id === item.unit_id,
        );

        return {
          id: productId as any,
          product_id: item.product_id,
          code: product?.code || "",
          name: product?.name || "",
          price: item.unit_cost,
          quantity: item.quantity,
          total: item.quantity * item.unit_cost,
          unit_id: item.unit_id,
          unit_name: selectedUnit?.name,
          unit_abbreviation: selectedUnit?.abbreviation,
          main_image: product?.main_image,
          available_units: product?.available_units?.map((u) => ({
            id: u.id,
            name: u.name,
            abbreviation: u.abbreviation,
            price: item.unit_cost,
          })),
        };
      },
    );
  }, [transferContext.selectedProducts, transferContext.products]);

  const totalCost = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // En mobile inyectamos el botón del carrito en el AppBar.
  useEffect(() => {
    if (!isMobile) return;
    navigation.setOptions({
      headerRight: () => (
        <CartHeaderButton count={itemCount} onPress={() => setCartVisible(true)} />
      ),
    });
  }, [isMobile, itemCount]);

  const selectedProductsForList = transferContext.selectedProducts as Record<
    number | string,
    ListSelectedProduct
  >;

  const handleConfirmTransfer = async () => {
    try {
      if (!transferContext.fromLocationId || !transferContext.toLocationId) {
        alerts.error("Debes seleccionar ubicación de origen y destino");
        return;
      }

      if (cartItems.length === 0) {
        alerts.error("Debes agregar al menos un producto");
        return;
      }

      const confirmed = await alerts.confirm(
        "¿Deseas crear esta solicitud de transferencia?",
        {
          title: "Confirmar Transferencia",
          okText: "Crear Solicitud",
          cancelText: "Cancelar",
        },
      );

      if (!confirmed) return;

      await transferContext.confirmTransfer({
        notes: notes || undefined,
      });

      // Limpiar formulario
      setNotes("");

      router.replace("/(tabs)/home/transfers/pending" as any);
    } catch (error: any) {
      console.error("Error confirming transfer:", error);
      // El error ya fue mostrado en el contexto
    }
  };

  // El origen no puede ser la misma sucursal actual (destino fijo)
  const availableFromLocations = locations.filter(
    (loc) => loc.id !== transferContext.toLocationId,
  );

  const cartContent = (
    <Cart
      items={cartItems}
      onRemoveItem={(itemId) => transferContext.handleRemoveProduct(itemId)}
      onItemChange={(item, action, data) => transferContext.handleItemChange(item, action, data)}
    >
      <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16 }}>
          {/* Información de transferencia dentro del carrito */}
          <Text style={styles.sectionTitle}>
            Configuración de Transferencia
          </Text>

          {/* Ubicación de Origen */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Ubicación de Origen</Text>
            <Text style={styles.sublabel}>
              De dónde se tomarán los productos
            </Text>
            {loadingLocations ? (
              <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
            ) : (
              <Menu
                visible={fromMenuVisible}
                onDismiss={() => setFromMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setFromMenuVisible(true)}
                    style={styles.selectButton}
                    contentStyle={styles.selectButtonContent}
                    icon="map-marker"
                  >
                    {locations.find(
                      (l) => l.id === transferContext.fromLocationId,
                    )?.name || "Seleccionar origen..."}
                  </Button>
                }
              >
                {availableFromLocations.map((location) => (
                  <Menu.Item
                    key={location.id}
                    onPress={() => {
                      transferContext.setFromLocation(location.id);
                      setFromMenuVisible(false);
                    }}
                    title={location.name}
                  />
                ))}
              </Menu>
            )}
          </View>

          {/* Ubicación de Destino */}
          {/* <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Ubicación de Destino</Text>
            <Text style={styles.sublabel}>
              Se establece automáticamente como tu sucursal actual
            </Text>
            {loadingLocations ? (
              <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
            ) : (
              <Button
                mode="outlined"
                disabled
                style={styles.selectButton}
                contentStyle={styles.selectButtonContent}
                icon="map-marker"
              >
                {locations.find((l) => l.id === transferContext.toLocationId)
                  ?.name || "Sucursal actual"}
              </Button>
            )}
          </View> */}

          {/* Notas */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Notas (Opcional)</Text>
            <Text style={styles.sublabel}>
              Información adicional sobre esta transferencia
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Escribe notas sobre esta transferencia..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Resumen */}
          <Card style={[styles.card, styles.summaryCard]}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de productos:</Text>
                <Text style={styles.summaryValue}>{cartItems.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Costo estimado:</Text>
                <Text style={styles.summaryValue}>${totalCost.toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>
          </ScrollView>

          {/* Botón confirmar */}
          <Button
            mode="contained"
            onPress={handleConfirmTransfer}
            disabled={
              !transferContext.fromLocationId ||
              !transferContext.toLocationId ||
              cartItems.length === 0
            }
            style={styles.confirmButton}
            buttonColor={palette.success}
            icon="check-circle"
          >
            Crear Solicitud de Transferencia
          </Button>
        </Cart>
  );

  return (
    <View style={styles.container}>
      {/* Lista de productos */}
      <View style={styles.productsSection}>
        <ListProducts
          loading={transferContext.loading || loadingLocations}
          categories={transferContext.categories}
          products={transferContext.products}
          selectedProducts={selectedProductsForList}
          onAddProduct={transferContext.handleAddProduct}
          onRemoveProduct={transferContext.handleRemoveProduct}
          onItemChange={transferContext.handleItemChange}
        />
      </View>

      {/* Carrito lateral — solo desktop */}
      {!isMobile && (
        <View style={styles.cartSection}>{cartContent}</View>
      )}

      {/* Modal carrito — solo mobile */}
      {isMobile && (
        <Modal
          visible={cartVisible}
          animationType="slide"
          onRequestClose={() => setCartVisible(false)}
        >
          <View style={styles.cartModal}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Carrito</Text>
              <TouchableOpacity
                onPress={() => setCartVisible(false)}
                style={styles.cartModalClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>
            {cartContent}
          </View>
        </Modal>
      )}
    </View>
  );
}

export default function TransferFormScreen() {
  return (
    <TransferProvider>
      <TransferFormContent />
    </TransferProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent" as any,
  },
  productsSection: {
    flex: 1,
  },
  // Modal del carrito en mobile
  cartModal: {
    flex: 1,
    backgroundColor: palette.background,
  },
  cartModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  cartModalTitle: {
    ...tokens.typography.h3,
    color: palette.text,
  },
  cartModalClose: {
    padding: tokens.spacing[2],
  },
  cartSection: {
    width: 420,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  transferSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: palette.card,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: palette.textSecondary,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  selectButton: {
    marginTop: 4,
    justifyContent: "flex-start",
  },
  selectButtonContent: {
    justifyContent: "flex-start",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: "transparent" as any,
    minHeight: 80,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: palette.primary + "10",
    borderWidth: 1,
    borderColor: palette.primary + "30",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.primary,
  },
  confirmButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
});
