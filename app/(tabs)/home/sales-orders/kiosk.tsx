import BarcodeScanner, {
  BarcodeScannerRef,
} from "@/components/Form/BarcodeScanner";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Modal,
  Portal,
  RadioButton,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

// ---------- Types ----------

type Unit = { id: number; name: string; abbreviation: string };
type Package = {
  id: number;
  package_name: string;
  quantity_per_package: number;
  price?: number;
  barcode?: string;
};
type Product = {
  id: number;
  code?: string;
  name: string;
  price?: number;
  sale_price?: string | number;
  unit_id: number;
  unit?: Unit;
  active_packages?: Package[];
  current_stock?: number;
  reserved_stock?: number;
  available_stock?: number;
  main_image?: any;
  category?: { id: number; name: string };
};

type CartItem = {
  key: string;
  product_id: number;
  product_name: string;
  product_image?: any;
  package_id: number | null;
  package_name?: string;
  unit_id: number;
  unit_abbreviation?: string;
  quantity: number;
  unit_price: number;
  // Quantity (in base units) consumed per cart unit:
  base_per_unit: number;
  available_base: number; // base stock available for that product
};

// ---------- Helpers ----------

const fmt = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value || 0);

const makeKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveImage = (img: any) => {
  if (!img) return null;
  if (typeof img === "string") return { uri: img };
  if (img.url) return { uri: img.url };
  if (img.path) return { uri: img.path };
  return null;
};

// ---------- Product card (memoized) ----------

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product, pkg: Package | null) => void;
};

const ProductCard = memo(function ProductCard({
  product,
  onAdd,
}: ProductCardProps) {
  const image = resolveImage(product.main_image);
  const available = Number(product.available_stock ?? 0);
  const lowStock = available <= 0;

  return (
    <Surface style={styles.productCard} elevation={1}>
      <View style={styles.productImageWrap}>
        {image ? (
          <Image source={image} style={styles.productImage} />
        ) : (
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={42}
            color={palette.textSecondary}
          />
        )}
        {lowStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>
              SIN STOCK
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="bodyMedium"
        style={{ fontWeight: "600" }}
        numberOfLines={2}
      >
        {product.name}
      </Text>
      <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
        {available.toFixed(2)} {product.unit?.abbreviation ?? ""}
      </Text>
      <Text variant="titleMedium" style={{ color: palette.primary, fontWeight: "700" }}>
        {fmt(Number(product.sale_price ?? product.price ?? 0))}
      </Text>

      <Pressable
        style={[styles.addButton, lowStock && { opacity: 0.5 }]}
        disabled={lowStock}
        onPress={() => onAdd(product, null)}
      >
        <MaterialCommunityIcons name="plus" size={16} color="white" />
        <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>
          Unidad
        </Text>
      </Pressable>

      {(product.active_packages ?? []).length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {(product.active_packages ?? []).slice(0, 3).map((pkg) => (
            <Chip
              key={pkg.id}
              compact
              disabled={lowStock}
              onPress={() => onAdd(product, pkg)}
              style={{ backgroundColor: palette.primary + "15" }}
              textStyle={{ fontSize: 11 }}
            >
              {pkg.package_name}
            </Chip>
          ))}
        </View>
      )}
    </Surface>
  );
});

// ---------- Cart row (memoized) ----------

type CartRowProps = {
  item: CartItem;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
};

const CartRow = memo(function CartRow({
  item,
  onInc,
  onDec,
  onRemove,
}: CartRowProps) {
  return (
    <View style={styles.cartRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" style={{ fontWeight: "600" }} numberOfLines={1}>
          {item.product_name}
        </Text>
        <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
          {item.package_name ?? `1 ${item.unit_abbreviation ?? ""}`} ·{" "}
          {fmt(item.unit_price)}
        </Text>
      </View>
      <View style={styles.qtyControls}>
        <IconButton
          icon="minus"
          size={16}
          mode="contained-tonal"
          onPress={() => onDec(item.key)}
        />
        <Text style={{ fontWeight: "700", minWidth: 22, textAlign: "center" }}>
          {item.quantity}
        </Text>
        <IconButton
          icon="plus"
          size={16}
          mode="contained-tonal"
          onPress={() => onInc(item.key)}
        />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontWeight: "700" }}>
          {fmt(item.unit_price * item.quantity)}
        </Text>
        <IconButton
          icon="trash-can-outline"
          size={16}
          iconColor={palette.red}
          onPress={() => onRemove(item.key)}
        />
      </View>
    </View>
  );
});

// ---------- Main Screen ----------

export default function KioskScreen() {
  const alerts = useAlerts();
  const screenWidth = Dimensions.get("window").width;
  const wide = screenWidth >= 900;

  const scannerRef = useRef<BarcodeScannerRef>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [query, setQuery] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  // Mobile drawer for cart
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout dialog
  const [payDialog, setPayDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [isPaid, setIsPaid] = useState(true);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerMenu, setCustomerMenu] = useState(false);
  const paidAmountRef = useRef<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await Services.salesOrders.getInitialData();
        const data = res?.data ?? res;
        if (!mounted) return;
        setProducts(data?.products ?? []);
        setCustomers(data?.customers ?? []);
      } catch (e: any) {
        alerts.error(
          e?.response?.data?.message || e?.message || "Error al cargar productos",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Derived ----------

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const totals = useMemo(() => {
    const total = cart.reduce((acc, c) => acc + c.unit_price * c.quantity, 0);
    const count = cart.reduce((acc, c) => acc + c.quantity, 0);
    return { total, count };
  }, [cart]);

  // ---------- Cart logic ----------

  // Compute already-consumed base units per product (across all cart lines)
  const consumedBaseByProduct = useMemo(() => {
    const map: Record<number, number> = {};
    for (const c of cart) {
      map[c.product_id] =
        (map[c.product_id] ?? 0) + c.base_per_unit * c.quantity;
    }
    return map;
  }, [cart]);

  const canTake = useCallback(
    (productId: number, availableBase: number, addBase: number) => {
      const used = consumedBaseByProduct[productId] ?? 0;
      return used + addBase <= availableBase + 1e-9;
    },
    [consumedBaseByProduct],
  );

  const handleAddFromCard = useCallback(
    (product: Product, pkg: Package | null) => {
      const available = Number(product.available_stock ?? 0);
      const basePerUnit = pkg ? Number(pkg.quantity_per_package ?? 1) : 1;
      const basePrice = Number(product.sale_price ?? product.price ?? 0);
      const price = pkg ? Number(pkg.price ?? basePrice) : basePrice;

      if (!canTake(product.id, available, basePerUnit)) {
        alerts.error(`Stock insuficiente para ${product.name}`);
        return;
      }

      setCart((prev) => {
        // Merge same product+package line
        const idx = prev.findIndex(
          (c) =>
            c.product_id === product.id &&
            (c.package_id ?? null) === (pkg?.id ?? null),
        );
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            key: makeKey(),
            product_id: product.id,
            product_name: product.name,
            product_image: product.main_image,
            package_id: pkg?.id ?? null,
            package_name: pkg?.package_name,
            unit_id: product.unit_id,
            unit_abbreviation: product.unit?.abbreviation,
            quantity: 1,
            unit_price: price,
            base_per_unit: basePerUnit,
            available_base: available,
          },
        ];
      });
    },
    [canTake, alerts],
  );

  const handleInc = useCallback(
    (key: string) => {
      setCart((prev) => {
        const item = prev.find((c) => c.key === key);
        if (!item) return prev;
        if (!canTake(item.product_id, item.available_base, item.base_per_unit)) {
          alerts.error(`Stock insuficiente para ${item.product_name}`);
          return prev;
        }
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c,
        );
      });
    },
    [canTake, alerts],
  );

  const handleDec = useCallback((key: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const handleRemove = useCallback((key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }, []);

  // ---------- Scanner ----------

  const handleScanned = useCallback(
    async (code: string) => {
      try {
        const res = await Services.productPackages.searchByBarcode(code);
        const pkg = res?.data?.data ?? res?.data ?? res;
        if (!pkg?.product_id) {
          alerts.error("Código no encontrado");
          return;
        }
        const product = products.find((p) => p.id === pkg.product_id);
        if (!product) {
          alerts.error("Producto no disponible en este inventario");
          return;
        }
        const localPkg =
          product.active_packages?.find((p) => p.id === pkg.id) ??
          (pkg.id
            ? {
                id: pkg.id,
                package_name: pkg.package_name,
                quantity_per_package: Number(pkg.quantity_per_package ?? 1),
                price: Number(pkg.price ?? product.price ?? 0),
              }
            : null);
        handleAddFromCard(product, localPkg ?? null);
      } catch (e: any) {
        alerts.error(
          e?.response?.data?.message ||
            e?.message ||
            "No se pudo buscar el código",
        );
      }
    },
    [products, handleAddFromCard, alerts],
  );

  // ---------- Submit ----------

  const submitOrder = useCallback(async () => {
    if (cart.length === 0) {
      alerts.error("El carrito está vacío");
      return;
    }
    const paid = parseFloat(paidAmountRef.current.replace(",", "."));
    const totalNum = totals.total;
    const paidValid = isPaid
      ? (Number.isFinite(paid) ? paid : totalNum)
      : 0;

    try {
      setSubmitting(true);
      // 1. Create the sales order in kiosk channel
      const orderRes = await Services.salesOrders.store({
        channel: "kiosk",
        service_mode: "counter",
        customer_id: customerId,
        details: cart.map((c) => ({
          product_id: c.product_id,
          package_id: c.package_id,
          unit_id: c.unit_id,
          requested_quantity: c.quantity,
          unit_price: c.unit_price,
        })),
      });
      const order = orderRes?.data?.data ?? orderRes?.data ?? orderRes;
      if (!order?.id) {
        throw new Error("Respuesta inválida al crear el pedido");
      }

      // 2. Checkout (reserves + decrements stock atomically, creates closed Sale)
      const checkoutRes = await Services.salesOrders.checkout(order.id, {
        payment_method: paymentMethod,
        paid_amount: paidValid,
      });
      const updated =
        checkoutRes?.data?.data ?? checkoutRes?.data ?? checkoutRes;

      alerts.success("Venta registrada");
      setCart([]);
      setPayDialog(false);
      setCustomerId(null);
      paidAmountRef.current = "";
      const finalId = updated?.id ?? order.id;
      router.replace(`/home/sales-orders/${finalId}`);
    } catch (e: any) {
      const errors = e?.response?.data?.errors;
      const firstError =
        errors && typeof errors === "object"
          ? (Object.values(errors)[0] as any)?.[0]
          : null;
      alerts.error(
        firstError ||
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo completar la venta",
      );
    } finally {
      setSubmitting(false);
    }
  }, [cart, totals.total, paymentMethod, isPaid, customerId, alerts]);

  // ---------- Render ----------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const ProductsPane = (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBar}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Buscar producto..."
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" />}
          style={{ flex: 1 }}
        />
        <IconButton
          icon="barcode-scan"
          mode="contained"
          size={24}
          onPress={() => scannerRef.current?.open()}
        />
        {!wide && (
          <View>
            <IconButton
              icon="cart"
              mode="contained"
              size={24}
              onPress={() => setCartOpen(true)}
            />
            {totals.count > 0 && (
              <Badge
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                }}
              >
                {totals.count}
              </Badge>
            )}
          </View>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(p) => String(p.id)}
        numColumns={wide ? 3 : 2}
        key={wide ? "w3" : "m2"}
        renderItem={({ item }) => (
          <ProductCard product={item} onAdd={handleAddFromCard} />
        )}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
        contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
        ListEmptyComponent={
          <Text
            style={{
              padding: 24,
              textAlign: "center",
              color: palette.textSecondary,
            }}
          >
            Sin productos
          </Text>
        }
      />
    </View>
  );

  const CartPane = (
    <View style={{ flex: 1 }}>
      <View style={styles.cartHeader}>
        <MaterialCommunityIcons name="cart" size={22} color={palette.primary} />
        <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>
          Carrito
        </Text>
        {cart.length > 0 && (
          <Button
            compact
            textColor={palette.red}
            onPress={() => setCart([])}
          >
            Vaciar
          </Button>
        )}
      </View>
      <Divider />
      <FlatList
        data={cart}
        keyExtractor={(c) => c.key}
        renderItem={({ item }) => (
          <CartRow
            item={item}
            onInc={handleInc}
            onDec={handleDec}
            onRemove={handleRemove}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <Text
            style={{
              padding: 24,
              textAlign: "center",
              color: palette.textSecondary,
            }}
          >
            Agrega productos al carrito
          </Text>
        }
        style={{ flex: 1 }}
      />
      <Divider />
      <View style={styles.totalsBar}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
            Total ({totals.count} artículos)
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
            {fmt(totals.total)}
          </Text>
        </View>
        <Button
          mode="contained"
          icon="cash-register"
          disabled={cart.length === 0 || submitting}
          loading={submitting}
          onPress={() => {
            paidAmountRef.current = String(totals.total.toFixed(2));
            setPayDialog(true);
          }}
        >
          Cobrar
        </Button>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {wide ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 2 }}>{ProductsPane}</View>
          <Card style={{ flex: 1, maxWidth: 460, backgroundColor: "#fff" }} elevation={0}>
            {CartPane}
          </Card>
        </View>
      ) : (
        ProductsPane
      )}

      {/* Cart drawer for mobile */}
      {!wide && (
        <Portal>
          <Modal
            visible={cartOpen}
            onDismiss={() => setCartOpen(false)}
            contentContainerStyle={styles.mobileCartModal}
          >
            {CartPane}
          </Modal>
        </Portal>
      )}

      {/* Payment dialog */}
      <Portal>
        <Dialog
          visible={payDialog}
          onDismiss={() => setPayDialog(false)}
          style={{ maxWidth: 480, alignSelf: "center", width: "100%" }}
        >
          <Dialog.Title>Finalizar venta</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 460 }}>
            <ScrollView>
              {/* Total */}
              <View
                style={{
                  backgroundColor: palette.primary + "12",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  Total a cobrar
                </Text>
                <Text
                  variant="headlineMedium"
                  style={{ fontWeight: "700", color: palette.primary }}
                >
                  {fmt(totals.total)}
                </Text>
              </View>

              {/* Cliente */}
              <Text variant="labelLarge" style={{ marginBottom: 6 }}>
                Cliente (opcional)
              </Text>
              <Menu
                visible={customerMenu}
                onDismiss={() => setCustomerMenu(false)}
                anchor={
                  <Pressable
                    onPress={() => setCustomerMenu(true)}
                    style={styles.menuAnchor}
                  >
                    <MaterialCommunityIcons
                      name="account"
                      size={18}
                      color={palette.textSecondary}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ flex: 1, color: customerId ? palette.text : palette.textSecondary }}
                    >
                      {customers.find((c) => c.id === customerId)?.name ??
                        "Sin cliente (invitado)"}
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={18}
                      color={palette.textSecondary}
                    />
                  </Pressable>
                }
              >
                <Menu.Item
                  title="Sin cliente"
                  leadingIcon="account-off"
                  onPress={() => {
                    setCustomerId(null);
                    setCustomerMenu(false);
                  }}
                />
                <Divider />
                {customers.map((c) => (
                  <Menu.Item
                    key={c.id}
                    title={c.name}
                    leadingIcon="account"
                    onPress={() => {
                      setCustomerId(c.id);
                      setCustomerMenu(false);
                    }}
                  />
                ))}
              </Menu>

              <Divider style={{ marginVertical: 14 }} />

              {/* Método de pago */}
              <Text variant="labelLarge" style={{ marginBottom: 4 }}>
                Método de pago
              </Text>
              <RadioButton.Group
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "transfer" | "credit")}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <RadioButton.Item label="Efectivo" value="cash" />
                  <RadioButton.Item label="Tarjeta" value="card" />
                  <RadioButton.Item label="Transferencia" value="transfer" />
                </View>
              </RadioButton.Group>

              <Divider style={{ marginVertical: 14 }} />

              {/* ¿Está pagado? */}
              <Pressable
                onPress={() => setIsPaid((v) => !v)}
                style={styles.paidToggle}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
                    Pago recibido
                  </Text>
                  <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                    {isPaid ? "El cliente ya pagó" : "Queda pendiente de pago"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isPaid ? "toggle-switch" : "toggle-switch-off"}
                  size={36}
                  color={isPaid ? palette.success : palette.textSecondary}
                />
              </Pressable>

              {isPaid && (
                <TextInput
                  mode="outlined"
                  dense
                  label="Monto recibido"
                  keyboardType="decimal-pad"
                  defaultValue={String(totals.total.toFixed(2))}
                  onChangeText={(t) => (paidAmountRef.current = t)}
                  style={{ marginTop: 10 }}
                />
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPayDialog(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={submitOrder}
              loading={submitting}
              disabled={submitting}
              icon="check"
            >
              Confirmar venta
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <BarcodeScanner ref={scannerRef} onScanned={handleScanned} />
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  productCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    gap: 4,
  },
  productImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: palette.surface ?? "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  outOfStockBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: palette.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: palette.primary,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  totalsBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  mobileCartModal: {
    backgroundColor: "white",
    margin: 12,
    borderRadius: 12,
    height: "85%",
    overflow: "hidden",
  },
  menuAnchor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: palette.border ?? "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 4,
  },
  paidToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border ?? "#eee",
  },
});
