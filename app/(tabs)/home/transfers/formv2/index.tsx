import { SafeAreaView } from "react-native-safe-area-context";
import { formatMoney } from "@/utils/format";
import EmptyState from "@/components/App/EmptyState";
import PermissionGate from "@/components/App/PermissionGate";
import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import transferService, {
  type TransferOrigin,
} from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text as RNText, TextInput, TouchableOpacity, View } from "react-native";
import { Button, Card, Menu, Text } from "react-native-paper";
import { TransferProvider, useTransferContext } from "./TransferContext";

type ListSelectedProduct = {
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
};

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useTheme();
  const cartBtnStyles = useThemedStyles(makeCartBtnStyles);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={cartBtnStyles.btn}
      activeOpacity={0.7}
      accessibilityLabel="Ver carrito"
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <RNText style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</RNText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeCartBtnStyles = themedStyles((c) => ({
  btn: { padding: 8, marginRight: 4 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: c.primaryForeground, fontSize: 10, fontWeight: "700" },
}));

function TransferFormContent() {
  const router = useRouter();
  const alerts = useAlerts();
  const transferContext = useTransferContext();
  const auth = useAuth();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [locations, setLocations] = useState<TransferOrigin[]>([]);
  const [notes, setNotes] = useState("");
  // Candado de "Crear Solicitud": un doble toque abría otra confirmación y
  // mandaba la solicitud dos veces.
  const { submitting, run } = useSubmitGuard();
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

  // "Pedir a": las sucursales activas de la empresa menos la actual. Antes
  // salían de /admin/locations, que a un rol de sucursal (sin locations_list)
  // solo le devuelve su propia sucursal: la lista quedaba vacía.
  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      setLocations(await transferService.origins());
    } catch (error: any) {
      console.error("Error loading locations:", error);
      const data = error?.response?.data;
      alerts.error(
        data?.message ||
          data?.error ||
          "No se pudieron cargar las sucursales a las que puedes pedir",
      );
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

  const handleConfirmTransfer = () =>
    run(async () => {
      try {
        if (!transferContext.fromLocationId || !transferContext.toLocationId) {
          alerts.error("Debes seleccionar ubicación de origen y destino");
          return;
        }

        if (cartItems.length === 0) {
          alerts.error("Debes agregar al menos un producto");
          return;
        }

        // El diálogo vive en el Portal de la app: con el modal del carrito abierto
        // (mobile) quedaba detrás y el botón parecía no hacer nada.
        setCartVisible(false);
        const confirmed = await alerts.confirm(
          "¿Deseas crear esta solicitud de transferencia?",
          {
            title: "Confirmar Transferencia",
            okText: "Crear Solicitud",
            cancelText: "Cancelar",
          },
        );

        if (!confirmed) {
          if (isMobile) setCartVisible(true);
          return;
        }

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
    });

  // El origen no puede ser la misma sucursal actual (destino fijo)
  const availableFromLocations = locations.filter(
    (loc) => loc.id !== transferContext.toLocationId,
  );

  const cartContent = (
    <Cart
      items={cartItems}
      onRemoveItem={(itemId) => transferContext.handleRemoveProduct(itemId)}
      onItemChange={(item, action, data) => transferContext.handleItemChange(item, action, data)}
      // En celular el carrito es un modal: que todo se desplace junto.
      scrollAll={isMobile}
    >
      <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16 }}>
          {/* Información de transferencia dentro del carrito */}
          <Text style={styles.sectionTitle}>
            Configuración de Transferencia
          </Text>

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
              placeholderTextColor={colors.textMuted}
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
                <Text style={styles.summaryValue}>{formatMoney(totalCost)}</Text>
              </View>
            </Card.Content>
          </Card>
          </ScrollView>

          {/* Botón confirmar */}
          <Button
            mode="contained"
            onPress={handleConfirmTransfer}
            loading={submitting}
            disabled={
              submitting ||
              !transferContext.fromLocationId ||
              !transferContext.toLocationId ||
              cartItems.length === 0
            }
            style={styles.confirmButton}
            buttonColor={colors.success}
            icon="check-circle"
          >
            Crear Solicitud de Transferencia
          </Button>
        </Cart>
  );

  const fromLocationName = locations.find(
    (l) => l.id === transferContext.fromLocationId,
  )?.name;

  // Primer paso de la solicitud: de qué sucursal se piden los productos. Va
  // arriba del catálogo (antes estaba al fondo del carrito y en celular ni se
  // veía: el catálogo decía "Agrega productos para empezar a vender").
  const originBar = (
    <View style={styles.originBar}>
      <MaterialCommunityIcons name="store-marker-outline" size={20} color={colors.primary} />
      <Text style={styles.originLabel}>Pedir a</Text>
      {loadingLocations ? (
        <Text style={styles.loadingText}>Cargando sucursales...</Text>
      ) : availableFromLocations.length === 0 ? (
        <Text style={styles.loadingText}>
          No hay otras sucursales activas a las que pedir
        </Text>
      ) : (
        <Menu
          visible={fromMenuVisible}
          onDismiss={() => setFromMenuVisible(false)}
          contentStyle={styles.menuContent}
          anchor={
            <Button
              mode={fromLocationName ? "outlined" : "contained"}
              onPress={() => setFromMenuVisible(true)}
              icon="chevron-down"
              contentStyle={{ flexDirection: "row-reverse" }}
              compact
            >
              {fromLocationName || "Elegir sucursal"}
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
  );

  return (
    <View style={styles.container}>
      {/* Lista de productos */}
      <View style={styles.productsSection}>
        {originBar}
        {!transferContext.fromLocationId && !loadingLocations ? (
          availableFromLocations.length === 0 ? (
            <EmptyState
              icon="store-off-outline"
              title="No hay sucursales a las que pedir"
              description="Solo puedes pedir productos a otras sucursales activas de la empresa."
            />
          ) : (
            <EmptyState
              icon="store-search-outline"
              title="Elige de qué sucursal pides"
              description="Verás el catálogo y las existencias de esa sucursal para armar tu solicitud."
              actionLabel="Elegir sucursal"
              onAction={() => setFromMenuVisible(true)}
            />
          )
        ) : (
          <ListProducts
            loading={transferContext.loading || loadingLocations}
            categories={transferContext.categories}
            products={transferContext.products}
            selectedProducts={selectedProductsForList}
            onAddProduct={transferContext.handleAddProduct}
            onRemoveProduct={transferContext.handleRemoveProduct}
            onItemChange={transferContext.handleItemChange}
          />
        )}
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
          <SafeAreaView style={styles.cartModal} edges={["top", "bottom"]}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Carrito</Text>
              <TouchableOpacity
                onPress={() => setCartVisible(false)}
                style={styles.cartModalClose}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {cartContent}
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

export default function TransferFormScreen() {
  return (
    // Crear la solicitud pide transfers_create (igual que el backend); antes
    // bastaba transfers_list y el formulario fallaba al final.
    <PermissionGate permission="transfers_create">
      <TransferProvider>
        <TransferFormContent />
      </TransferProvider>
    </PermissionGate>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent" as any,
  },
  originBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  originLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: c.text,
  },
  productsSection: {
    flex: 1,
  },
  // Modal del carrito en mobile
  cartModal: {
    flex: 1,
    backgroundColor: c.background,
  },
  cartModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  cartModalTitle: {
    ...tokens.typography.h3,
    color: c.text,
  },
  cartModalClose: {
    padding: tokens.spacing[2],
  },
  cartSection: {
    width: 420,
    borderLeftWidth: 1,
    borderLeftColor: c.border,
  },
  transferSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: c.text,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: c.surface,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: c.text,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
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
  menuContent: {
    backgroundColor: c.surface,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: c.text,
    backgroundColor: "transparent" as any,
    minHeight: 80,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: c.primary + "10",
    borderWidth: 1,
    borderColor: c.primary + "30",
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
    color: c.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: c.primary,
  },
  confirmButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
}));
