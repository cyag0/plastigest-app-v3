import AppMenu from "@/components/App/AppMenu";
import EmptyState from "@/components/App/EmptyState";
import { ListGroup, ListSectionTitle, ListValueRow } from "@/components/App/ListGroup";
import PermissionGate from "@/components/App/PermissionGate";
import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney } from "@/utils/format";
import transferService, { type TransferOrigin } from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, IconButton, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TransferProvider, useTransferContext } from "./TransferContext";

/**
 * Nueva solicitud de transferencia, con el mismo arreglo que la compra nueva:
 * arriba de qué sucursal se pide y su catálogo; al lado (en el celular, en un
 * modal) la solicitud con sus datos, el costo estimado y el botón para
 * enviarla. Llega siempre a la sucursal actual.
 */

type ListSelectedProduct = {
  product_id: number;
  quantity: number;
  unit_id: number;
  price: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** ¿Está abierto el teclado en pantalla? (en web no hay eventos: no). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

function CartHeaderButton({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useTheme();
  const cartBtnStyles = useThemedStyles(makeCartBtnStyles);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cartBtnStyles.btn, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Ver solicitud"
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text} />
      {count > 0 && (
        <View style={cartBtnStyles.badge}>
          <Text style={cartBtnStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </Pressable>
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
  // Candado de "Enviar solicitud": un doble toque abría otra confirmación y
  // mandaba la solicitud dos veces.
  const { submitting, run } = useSubmitGuard();
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [fromMenuVisible, setFromMenuVisible] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  // En la tableta, con el teclado abierto, el total y el botón fijos no
  // dejaban ver lo que se escribe.
  const keyboardOpen = useKeyboardOpen();

  const company = auth.selectedCompany;
  const currentLocation = auth.location;

  // El destino siempre es la sucursal actual
  useEffect(() => {
    if (currentLocation) {
      transferContext.setToLocation(currentLocation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  // "Pedir a": las sucursales activas de la empresa menos la actual. Antes
  // salían de /admin/locations, que a un rol de sucursal (sin locations_list)
  // solo le devuelve su propia sucursal: la lista quedaba vacía.
  // (`loadingLocations` empieza en true.)
  const loadLocations = async () => {
    try {
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

  // Cargar ubicaciones al montar
  useEffect(() => {
    if (!company) return;
    void (async () => {
      await loadLocations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // Convertir selectedProducts a formato de CartItemData
  const cartItems = useMemo(() => {
    return Object.entries(transferContext.selectedProducts).map(([productId, item]) => {
      const product = transferContext.products.find((p) => p.id.toString() === productId);
      const selectedUnit = product?.available_units?.find((u) => u.id === item.unit_id);

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
    });
  }, [transferContext.selectedProducts, transferContext.products]);

  const totalCost = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const lineCount = cartItems.length;

  // En el celular, el botón de la solicitud en la barra de arriba.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isMobile
        ? () => <CartHeaderButton count={lineCount} onPress={() => setCartVisible(true)} />
        : undefined,
    });
  }, [navigation, isMobile, lineCount]);

  const selectedProductsForList = transferContext.selectedProducts as Record<
    number | string,
    ListSelectedProduct
  >;

  // El origen no puede ser la misma sucursal actual (destino fijo)
  const availableFromLocations = locations.filter((loc) => loc.id !== transferContext.toLocationId);

  const fromLocationName = locations.find((l) => l.id === transferContext.fromLocationId)?.name;

  // Lo que falta para poder enviarla (el botón queda deshabilitado).
  const blocker = !transferContext.fromLocationId
    ? "Elige de qué sucursal pides."
    : !transferContext.toLocationId
      ? "Elige la sucursal en la que estás."
      : lineCount === 0
        ? "Agrega al menos un producto."
        : null;

  const handleConfirmTransfer = () =>
    run(async () => {
      try {
        if (!transferContext.fromLocationId || !transferContext.toLocationId) {
          alerts.error("Elige de qué sucursal pides los productos.");
          return;
        }

        if (cartItems.length === 0) {
          alerts.error("Agrega al menos un producto.");
          return;
        }

        // El diálogo vive en el Portal de la app: con el modal de la solicitud
        // abierto (celular) quedaba detrás y el botón parecía no hacer nada.
        setCartVisible(false);
        const confirmed = await alerts.confirm(
          `Pides ${plural(lineCount, "producto", "productos")} a ${fromLocationName ?? "la otra sucursal"} por un costo estimado de ${formatMoney(totalCost)}.\n\nLa solicitud queda pendiente hasta que esa sucursal la apruebe.`,
          {
            title: "Enviar solicitud",
            okText: "Enviar solicitud",
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

  /* ─── La solicitud (carrito) ─── */

  const requestData = (
    <View style={styles.section}>
      <ListSectionTitle title="Datos de la solicitud" />
      <ListGroup inset={14}>
        <ListValueRow label="Pedir a" value={fromLocationName ?? "Sin elegir"} />
        <ListValueRow label="Llega a" value={currentLocation?.name ?? "Tu sucursal"} />
      </ListGroup>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notas (opcional)"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Notas"
        multiline
        maxLength={2000}
        style={styles.notes}
      />
    </View>
  );

  const checkout = (
    <View style={styles.checkout}>
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Costo estimado</Text>
          {lineCount > 0 && (
            <Text style={styles.totalMeta}>{plural(lineCount, "producto", "productos")}</Text>
          )}
        </View>
        <Text style={styles.totalValue}>{formatMoney(totalCost)}</Text>
      </View>
      {!!blocker && <Text style={styles.hint}>{blocker}</Text>}
      <View style={styles.choice}>
        <Button
          mode="contained"
          icon="send-outline"
          onPress={handleConfirmTransfer}
          loading={submitting}
          disabled={!!blocker || submitting}
        >
          Enviar solicitud
        </Button>
        <Text style={styles.hint}>
          Queda pendiente hasta que {fromLocationName ?? "la otra sucursal"} la apruebe.
        </Text>
      </View>
    </View>
  );

  const cart = (
    <Cart
      title="Productos"
      count={lineCount}
      items={cartItems}
      onRemoveItem={(itemId) => transferContext.handleRemoveProduct(itemId)}
      onItemChange={(item, action, data) => transferContext.handleItemChange(item, action, data)}
      showFooter={false}
      // Los productos y los datos se desplazan juntos; en el celular también
      // el total y el botón.
      scrollAll
    >
      <View style={styles.extras}>
        {requestData}
        {isMobile && checkout}
      </View>
    </Cart>
  );

  // Primer paso de la solicitud: de qué sucursal se piden los productos. Va
  // arriba del catálogo (antes estaba al fondo del carrito y en celular ni se
  // veía: el catálogo decía "Agrega productos para empezar a vender").
  const originBar = (
    <View style={styles.originBar}>
      <MaterialCommunityIcons name="store-marker-outline" size={20} color={colors.primary} />
      <Text style={styles.originLabel}>Pedir a</Text>
      {loadingLocations ? (
        <Text style={styles.loadingText}>Cargando sucursales…</Text>
      ) : availableFromLocations.length === 0 ? (
        <Text style={styles.loadingText}>No hay otras sucursales activas a las que pedir</Text>
      ) : (
        <AppMenu
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
            <AppMenu.Item
              key={location.id}
              onPress={() => {
                transferContext.setFromLocation(location.id);
                setFromMenuVisible(false);
              }}
              title={location.name}
              leadingIcon={location.id === transferContext.fromLocationId ? "check" : undefined}
              titleStyle={{ color: colors.text }}
            />
          ))}
        </AppMenu>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Lista de productos */}
      <View style={styles.productsSection}>
        {originBar}
        <View style={styles.catalogBody}>
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

        {/* En el celular la solicitud se abre desde aquí (o desde el carrito
            de la barra). Mientras se envía, el modal ya se cerró: aquí se ve. */}
        {isMobile && (
          <View style={styles.bottomBar}>
            <Text style={styles.bottomSummary} numberOfLines={1}>
              {submitting
                ? "Enviando la solicitud…"
                : lineCount === 0
                  ? "Sin productos"
                  : `${plural(lineCount, "producto", "productos")} · ${formatMoney(totalCost)}`}
            </Text>
            <Button
              mode="contained"
              icon="clipboard-list-outline"
              onPress={() => setCartVisible(true)}
              loading={submitting}
              disabled={submitting}
            >
              Ver solicitud
            </Button>
          </View>
        )}
      </View>

      {/* La solicitud al lado del catálogo — escritorio y tableta */}
      {!isMobile && (
        <View style={styles.cartSection}>
          {cart}
          {!keyboardOpen && <View style={styles.checkoutPinned}>{checkout}</View>}
        </View>
      )}

      {/* La solicitud en un modal — celular */}
      {isMobile && (
        <Modal
          visible={cartVisible}
          animationType="slide"
          // Mientras se envía no se cierra.
          onRequestClose={() => {
            if (!submitting) setCartVisible(false);
          }}
        >
          {/* Los menús (unidad de cada producto) se abren dentro del modal:
              en el Portal de la app quedaban detrás. */}
          <Portal.Host>
            <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Nueva solicitud
                </Text>
                <IconButton
                  icon="close"
                  iconColor={colors.text}
                  onPress={() => setCartVisible(false)}
                  disabled={submitting}
                  accessibilityLabel="Cerrar"
                />
              </View>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                {cart}
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Portal.Host>
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
    backgroundColor: c.background,
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
  originLabel: { fontSize: 14, fontWeight: "600", color: c.text },
  loadingText: { fontSize: 14, color: c.textSecondary, paddingVertical: 8 },
  menuContent: { backgroundColor: c.surface },
  productsSection: { flex: 1, minWidth: 0 },
  catalogBody: { flex: 1 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  bottomSummary: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    color: c.text,
    fontVariant: ["tabular-nums"],
  },

  cartSection: {
    width: 400,
    borderLeftWidth: 1,
    borderLeftColor: c.border,
    backgroundColor: c.surface,
  },
  checkoutPinned: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.surface,
  },
  extras: {
    padding: 16,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  section: { gap: 8 },
  notes: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    textAlignVertical: "top",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },

  checkout: { gap: 14 },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: c.text },
  totalMeta: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  totalValue: { fontSize: 18, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
  choice: { gap: 4 },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },

  modal: { flex: 1, backgroundColor: c.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: c.text },
}));
