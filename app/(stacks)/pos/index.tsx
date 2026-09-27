import CartTable, { CartTableRef } from "@/components/Pos/CartTable";
import CheckoutModal, { CheckoutMethod } from "@/components/Pos/CheckoutModal";
import CloseShiftModal from "@/components/Pos/CloseShiftModal";
import CmdkPalette from "@/components/Pos/CmdkPalette";
import CustomerPicker, { PosCustomer } from "@/components/Pos/CustomerPicker";
import OpenShiftView from "@/components/Pos/OpenShiftView";
import PosHeader from "@/components/Pos/PosHeader";
import ShortcutsBar from "@/components/Pos/ShortcutsBar";
import SimpleSearchModal from "@/components/Pos/SimpleSearchModal";
import SummaryPanel from "@/components/Pos/SummaryPanel";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { usePosCart, formatMoney } from "@/hooks/usePosCart";
import { usePosCatalog } from "@/hooks/usePosCatalog";
import { usePosHotkeys } from "@/hooks/usePosHotkeys";
import { useResponsive } from "@/hooks/useResponsive";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Session = App.Entities.CashRegisterSession;

/**
 * Punto de venta para cajeros. Sin turno abierto pide abrirlo; con turno,
 * escritorio (web) como caja registradora con atajos y paleta de búsqueda,
 * y en celular una lista simple con barra de cobro.
 */
export default function PosScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { user, hasPermission } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const { isMobile } = useResponsive();

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      setLoadingSession(true);
      const res = await Services.cashRegisterSessions.current();
      setSession(res.data);
    } catch (e: any) {
      alerts.error(e?.response?.data?.message ?? "No se pudo consultar el turno");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession, selectedLocation?.id]);

  // Se entra al POS por URL o desde Inicio; salir siempre regresa a Inicio.
  const exit = () => router.replace("/(tabs)/home" as any);

  if (!hasPermission("sales_pos")) {
    return (
      <Centered>
        <Text>No tienes permiso para usar el punto de venta.</Text>
        <Button onPress={exit}>Volver</Button>
      </Centered>
    );
  }

  if (loadingSession) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <PosHeader locationName={selectedLocation?.name} cashierName={user?.name} onCloseShift={() => {}} onExit={exit} />
        <OpenShiftView locationName={selectedLocation?.name} onOpened={loadSession} />
      </SafeAreaView>
    );
  }

  return (
    <PosRegister
      session={session}
      compact={isMobile || Platform.OS !== "web"}
      canEditPrice={hasPermission("sales_discount")}
      cashierName={user?.name}
      onExit={exit}
      onShiftClosed={(closed) => {
        const diff = closed.difference ?? 0;
        alerts.success(diff === 0 ? "Turno cerrado. La caja cuadra." : `Turno cerrado. ${diff > 0 ? "Sobrante" : "Faltante"} de ${formatMoney(Math.abs(diff))}.`);
        setSession(null);
      }}
    />
  );
}

interface RegisterProps {
  session: Session;
  compact: boolean;
  canEditPrice: boolean;
  cashierName?: string;
  onExit: () => void;
  onShiftClosed: (session: Session) => void;
}

function PosRegister({ session, compact, canEditPrice, cashierName, onExit, onShiftClosed }: RegisterProps) {
  const alerts = useAlerts();
  const catalog = usePosCatalog();
  const cart = usePosCart();
  const table = useRef<CartTableRef>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [method, setMethod] = useState<CheckoutMethod>("cash");
  const [customer, setCustomer] = useState<PosCustomer | null>(null);

  const anyModal = searchOpen || customerOpen || checkoutOpen || closeOpen;

  const addItem = useCallback(
    (item: App.Entities.PosCatalogItem) => {
      const problem = cart.add(item, 1);
      if (problem) alerts.warning(problem);
    },
    [cart.add],
  );

  const onScan = useCallback(
    (code: string) => {
      const item = catalog.findByCode(code);
      if (item) addItem(item);
      else alerts.error(`No se encontró el código ${code}`);
    },
    [catalog.findByCode, addItem],
  );

  const changeQuantity = (key: string, quantity: number) => {
    const problem = cart.setQuantity(key, quantity);
    if (problem) alerts.warning(problem);
  };

  const openCheckout = (m?: CheckoutMethod) => {
    if (cart.lines.length === 0) return;
    if (m) setMethod(m);
    setCheckoutOpen(true);
  };

  usePosHotkeys({
    enabled: !anyModal,
    onSearch: () => setSearchOpen(true),
    onQuantity: () => cart.selectedKey && table.current?.focusQuantity(cart.selectedKey),
    onCustomer: () => setCustomerOpen(true),
    onCheckout: () => openCheckout(),
    onCancel: () => {
      if (cart.lines.length > 0 && window.confirm("¿Cancelar la venta y vaciar el carrito?")) {
        cart.clear();
        setCustomer(null);
      }
    },
    onRemoveSelected: () => cart.selectedKey && cart.remove(cart.selectedKey),
    onMoveSelection: (delta) => {
      if (cart.lines.length === 0) return;
      const i = cart.lines.findIndex((l) => l.key === cart.selectedKey);
      const next = Math.min(Math.max((i < 0 ? 0 : i) + delta, 0), cart.lines.length - 1);
      cart.setSelectedKey(cart.lines[next].key);
    },
    onScan,
  });

  const header = (
    <PosHeader
      locationName={session.location_name ?? undefined}
      registerName={session.cash_register_name}
      cashierName={cashierName ?? session.user_name ?? undefined}
      compact={compact}
      onCloseShift={() => setCloseOpen(true)}
      onExit={onExit}
    />
  );

  const cartTable = (
    <CartTable
      ref={table}
      lines={cart.lines}
      selectedKey={cart.selectedKey}
      canEditPrice={canEditPrice}
      compact={compact}
      onSelect={cart.setSelectedKey}
      onQuantity={changeQuantity}
      onRemove={cart.remove}
      onPrice={cart.updatePrice}
    />
  );

  const searchBar = (
    <Pressable onPress={() => setSearchOpen(true)} style={styles.search} accessibilityRole="search">
      <MaterialCommunityIcons name="magnify" size={22} color={palette.textSecondary} />
      <Text style={styles.searchText}>{compact ? "Buscar producto…" : "Escanear código o buscar producto…"}</Text>
      {!compact && <Text style={styles.key}>F2</Text>}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {header}

      {catalog.loading && catalog.items.length === 0 ? (
        <Centered>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Cargando productos…</Text>
        </Centered>
      ) : catalog.error ? (
        <Centered>
          <Text>{catalog.error}</Text>
          <Button onPress={catalog.reload}>Reintentar</Button>
        </Centered>
      ) : compact ? (
        <View style={{ flex: 1 }}>
          <View style={styles.mobileSearch}>{searchBar}</View>
          <Pressable onPress={() => setCustomerOpen(true)} style={styles.mobileCustomer}>
            <MaterialCommunityIcons name="account-outline" size={16} color={palette.textSecondary} />
            <Text style={{ color: palette.textSecondary }}>Cliente: {customer?.name ?? "Público en general"}</Text>
          </Pressable>
          {cartTable}
          <View style={styles.bottomBar}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textSecondary }}>{cart.totals.items} art.</Text>
              <Text style={styles.bottomTotal}>{formatMoney(cart.totals.total)}</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => openCheckout()}
              disabled={cart.lines.length === 0}
              contentStyle={{ height: 52, paddingHorizontal: 12 }}
              labelStyle={{ fontSize: 17, fontWeight: "800" }}
              style={{ borderRadius: 12 }}
            >
              Cobrar
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.desktop}>
          <View style={styles.main}>
            <View style={styles.desktopSearch}>{searchBar}</View>
            {cartTable}
          </View>
          <SummaryPanel
            totals={cart.totals}
            customerName={customer?.name ?? "Público en general"}
            method={method}
            onMethod={setMethod}
            onCustomer={() => setCustomerOpen(true)}
            onCheckout={() => openCheckout()}
          />
        </View>
      )}

      {!compact && <ShortcutsBar />}

      {compact ? (
        <SimpleSearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
          search={catalog.search}
          findByCode={catalog.findByCode}
          onSelect={addItem}
        />
      ) : (
        <CmdkPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          search={catalog.search}
          onSelect={(item) => {
            addItem(item);
            setSearchOpen(false);
          }}
        />
      )}

      <CustomerPicker
        visible={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onSelect={(c) => {
          setCustomer(c);
          setCustomerOpen(false);
        }}
      />

      <CheckoutModal
        visible={checkoutOpen}
        total={cart.totals.total}
        initialMethod={method}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={async (payments) => {
          const res = await Services.pos.sale({
            details: cart.toDetails(),
            payments,
            customer_id: customer?.id ?? null,
          } as App.Entities.PosSalePayload);
          return res.data;
        }}
        onDone={() => {
          setCheckoutOpen(false);
          cart.clear();
          setCustomer(null);
          setMethod("cash");
          catalog.reload();
        }}
      />

      <CloseShiftModal
        visible={closeOpen}
        sessionId={session.id}
        onClose={() => setCloseOpen(false)}
        onClosed={(closed) => {
          setCloseOpen(false);
          onShiftClosed(closed);
        }}
      />
    </SafeAreaView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  desktop: { flex: 1, flexDirection: "row" },
  main: { flex: 1, backgroundColor: palette.surface },
  desktopSearch: { padding: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: palette.borderStrong, backgroundColor: palette.surface },
  searchText: { flex: 1, color: palette.textMuted, fontSize: 16 },
  key: { fontSize: 12, fontWeight: "700", color: palette.textSecondary, borderWidth: 1, borderColor: palette.border, borderRadius: 4, paddingHorizontal: 6 },
  mobileSearch: { padding: 12, backgroundColor: palette.surface },
  mobileCustomer: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 8, backgroundColor: palette.surface },
  bottomBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: palette.surface, borderTopWidth: 1, borderTopColor: palette.border },
  bottomTotal: { fontSize: 24, fontWeight: "800", color: palette.text },
});
