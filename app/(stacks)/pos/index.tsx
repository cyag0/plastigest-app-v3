import CartTable, { CartTableRef } from "@/components/Pos/CartTable";
import CheckoutModal from "@/components/Pos/CheckoutModal";
import CloseShiftModal from "@/components/Pos/CloseShiftModal";
import CmdkPalette from "@/components/Pos/CmdkPalette";
import CustomerPicker from "@/components/Pos/CustomerPicker";
import OpenShiftView from "@/components/Pos/OpenShiftView";
import OtherLocationShift from "@/components/Pos/OtherLocationShift";
import { returnAfterLocationSwitch } from "@/components/NavigationHandler";
import PosHeader from "@/components/Pos/PosHeader";
import { apiErrorCode, apiErrorMessage, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import ShortcutsBar from "@/components/Pos/ShortcutsBar";
import SimpleSearchModal from "@/components/Pos/SimpleSearchModal";
import SummaryPanel from "@/components/Pos/SummaryPanel";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { CheckoutMethod, formatMoney, PosCatalogChange, posCartStorageKey, usePosCart } from "@/hooks/usePosCart";
import { usePosCatalog } from "@/hooks/usePosCatalog";
import { usePosHotkeys } from "@/hooks/usePosHotkeys";
import { useResponsive } from "@/hooks/useResponsive";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { formatQuantity } from "@/utils/format";
import { getTicketWidth, printShiftTicket, setTicketWidth } from "@/utils/printDocument";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Session = App.Entities.CashRegisterSession;

/** Sin cobro abierto, el catálogo se vuelve a bajar cada 5 minutos. */
const CATALOG_REFRESH_MS = 5 * 60 * 1000;
/** Al volver a la pantalla o a la app, si la última descarga tiene más de esto. */
const CATALOG_STALE_ON_FOCUS_MS = 30 * 1000;

/** Aviso para el cajero de lo que cambió en su carrito con el catálogo nuevo. */
function describeCatalogChanges(changes: PosCatalogChange[]): string | null {
  const parts: string[] = [];
  const prices = changes.filter((c) => c.kind === "price");
  const stock = changes.filter((c) => c.kind === "stock");
  const removed = changes.filter((c) => c.kind === "removed");
  if (prices.length > 0) {
    parts.push(`Precio nuevo: ${prices.map((c) => `${c.name} ${formatMoney(c.from)} → ${formatMoney(c.to)}`).join("; ")}.`);
  }
  if (stock.length > 0) {
    parts.push(
      `No alcanza la existencia: ${stock
        .map((c) => `${c.name} (en el carrito ${formatQuantity(c.quantity)}, hay ${formatQuantity(c.stock, c.unit)})`)
        .join("; ")}.`,
    );
  }
  if (removed.length > 0) {
    parts.push(`Ya no se vende en esta sucursal y se quitó del carrito: ${removed.map((c) => c.name).join(", ")}.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Punto de venta para cajeros. Sin turno abierto pide abrirlo; con turno,
 * escritorio (web) como caja registradora con atajos y paleta de búsqueda,
 * y en celular una lista simple con barra de cobro.
 */
export default function PosScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { user, hasPermission, selectedCompany } = useAuth();
  const { selectedLocation, selectLocation } = useSelectedLocation();
  const { isMobile } = useResponsive();
  const compact = isMobile || Platform.OS !== "web";

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [closeOtherOpen, setCloseOtherOpen] = useState(false);

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

  const handleShiftClosed = async (closed: Session) => {
    const diff = closed.difference ?? 0;
    alerts.success(diff === 0 ? "Turno cerrado. La caja cuadra." : `Turno cerrado. ${diff > 0 ? "Sobrante" : "Faltante"} de ${formatMoney(Math.abs(diff))}.`);
    setSession(null);
    // El carrito guardado de ese turno ya no se puede cobrar.
    if (user) {
      AsyncStorage.removeItem(posCartStorageKey(user.id, closed.location_id, closed.id)).catch(() => undefined);
    }
    // El corte impreso es el comprobante que firman cajero y encargado.
    const print = await alerts.confirm("¿Imprimir el corte de caja para firmarlo?", {
      title: "Corte de caja",
      okText: "Imprimir",
      cancelText: "Ahora no",
    });
    if (print) {
      printShiftTicket(closed.id).catch(() => alerts.error("No se pudo imprimir el corte"));
    }
  };

  /** Cambia la app a la sucursal del turno abierto para seguir cobrando ahí. */
  const switchToShiftLocation = async () => {
    if (!session || switching) return;
    try {
      setSwitching(true);
      const res: any = await Services.admin.locations.index({ company_id: selectedCompany?.id, is_active: true } as any);
      const list: App.Entities.Location[] = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
      const target = list.find((l) => l.id === session.location_id);
      if (!target) {
        alerts.error(`No tienes acceso a ${session.location_name ?? "esa sucursal"}.`);
        return;
      }
      // El cambio de sucursal reinicia la navegación: volver aquí al terminar.
      returnAfterLocationSwitch("/(stacks)/pos");
      await selectLocation(target);
    } catch {
      returnAfterLocationSwitch(null);
      alerts.error("No se pudo cambiar de sucursal");
    } finally {
      setSwitching(false);
    }
  };

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
        <PosHeader locationName={selectedLocation?.name} cashierName={user?.name} compact={compact} onExit={exit} />
        {/* key: al cambiar de sucursal se vuelven a pedir sus cajas. */}
        <OpenShiftView key={selectedLocation?.id ?? "none"} locationName={selectedLocation?.name} onOpened={loadSession} />
      </SafeAreaView>
    );
  }

  if (selectedLocation && session.location_id !== selectedLocation.id) {
    return (
      <SafeAreaView style={styles.screen}>
        <PosHeader locationName={selectedLocation.name} cashierName={user?.name} compact={compact} onExit={exit} />
        <OtherLocationShift
          session={session}
          currentLocationName={selectedLocation.name}
          switching={switching}
          onSwitch={switchToShiftLocation}
          onCloseShift={() => setCloseOtherOpen(true)}
        />
        <CloseShiftModal
          visible={closeOtherOpen}
          sessionId={session.id}
          onClose={() => setCloseOtherOpen(false)}
          onClosed={(closed) => {
            setCloseOtherOpen(false);
            handleShiftClosed(closed);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <PosRegister
      key={session.id}
      session={session}
      userId={user?.id ?? null}
      compact={compact}
      canEditPrice={hasPermission("sales_discount")}
      cashierName={user?.name}
      onExit={exit}
      onShiftClosed={handleShiftClosed}
      onSessionLost={(message) => {
        // El turno se cerró o cambió desde otro equipo: volver a consultarlo.
        alerts.warning(message);
        loadSession();
      }}
    />
  );
}

interface RegisterProps {
  session: Session;
  userId: number | null;
  compact: boolean;
  canEditPrice: boolean;
  cashierName?: string;
  onExit: () => void;
  onShiftClosed: (session: Session) => void;
  onSessionLost: (message: string) => void;
}

function PosRegister({ session, userId, compact, canEditPrice, cashierName, onExit, onShiftClosed, onSessionLost }: RegisterProps) {
  const alerts = useAlerts();
  const catalog = usePosCatalog();
  // Un carrito guardado por cajero, sucursal y turno.
  const cart = usePosCart(userId ? posCartStorageKey(userId, session.location_id, session.id) : null);
  const table = useRef<CartTableRef>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const { customer, setCustomer, method, setMethod, syncWithCatalog } = cart;
  const { reload: reloadCatalog } = catalog;
  // Un cobro que quedó sin respuesta (también uno recuperado tras cerrar o
  // recargar la app a medio envío) mantiene abierta la ventana de cobro hasta
  // verificar en qué quedó.
  const checkoutVisible = checkoutOpen || cart.requestUnknown;

  const anyModal = searchOpen || customerOpen || checkoutVisible || closeOpen;
  // Con un cobro o un corte abiertos no se refresca el catálogo en segundo plano.
  const busyRef = useRef(false);
  const loadedAtRef = useRef(0);
  useEffect(() => {
    busyRef.current = checkoutVisible || closeOpen;
    loadedAtRef.current = catalog.loadedAt;
  }, [checkoutVisible, closeOpen, catalog.loadedAt]);

  // Al entrar con un carrito recuperado, se avisa.
  useEffect(() => {
    if (cart.restored && cart.restoredLines > 0 && !cart.requestUnknown) {
      alerts.info(
        `Se recuperó la venta en curso (${cart.restoredLines} ${cart.restoredLines === 1 ? "producto" : "productos"}).`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.restored]);

  // Cada catálogo nuevo se aplica al carrito: precios y existencias al día.
  const appliedItemsRef = useRef<App.Entities.PosCatalogItem[] | null>(null);
  // Mientras una recarga pedida a propósito (botón, cobro rechazado) espera su
  // respuesta, ella aplica el catálogo y da el aviso, no el efecto.
  const explicitReloadRef = useRef(false);

  const applyCatalog = useCallback(
    (items: App.Entities.PosCatalogItem[]) => {
      appliedItemsRef.current = items;
      return describeCatalogChanges(syncWithCatalog(items));
    },
    [syncWithCatalog],
  );

  useEffect(() => {
    if (!cart.restored || catalog.items.length === 0) return;
    if (explicitReloadRef.current || appliedItemsRef.current === catalog.items) return;
    const message = applyCatalog(catalog.items);
    // Durante un cobro o un corte el aviso esperaría detrás de la ventana.
    if (message && !busyRef.current) alerts.warning(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.items, cart.restored, applyCatalog]);

  /** Baja el catálogo, lo aplica al carrito y devuelve el aviso de lo que cambió. */
  const reloadAndApply = useCallback(async (): Promise<{ ok: boolean; message: string | null }> => {
    explicitReloadRef.current = true;
    try {
      const items = await reloadCatalog();
      return items ? { ok: true, message: applyCatalog(items) } : { ok: false, message: null };
    } finally {
      explicitReloadRef.current = false;
    }
  }, [reloadCatalog, applyCatalog]);

  /** Vuelve a bajar el catálogo si no hay cobro abierto y el último tiene más de `maxAgeMs`. */
  const refreshIfStale = useCallback(
    (maxAgeMs: number) => {
      if (busyRef.current || Date.now() - loadedAtRef.current < maxAgeMs) return;
      reloadCatalog();
    },
    [reloadCatalog],
  );

  // Al volver a la pantalla del punto de venta.
  useFocusEffect(
    useCallback(() => {
      refreshIfStale(CATALOG_STALE_ON_FOCUS_MS);
    }, [refreshIfStale]),
  );

  // Al volver a la app (o a la pestaña en web) y cada 5 minutos sin cobrar.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshIfStale(CATALOG_STALE_ON_FOCUS_MS);
    });
    const timer = setInterval(() => refreshIfStale(CATALOG_REFRESH_MS), 60 * 1000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refreshIfStale]);

  // En web, recargar o cerrar la pestaña con productos en el carrito pide
  // confirmación (el carrito se recupera, pero un F5 entre F4 y F6 asusta).
  const hasItems = cart.lines.length > 0;
  useEffect(() => {
    if (Platform.OS !== "web" || !hasItems) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasItems]);

  /**
   * El servidor rechazó el cobro: nada quedó registrado. Si fue por precio o
   * existencia, se baja el catálogo, se actualiza el carrito y se dice qué
   * cambió; si el turno ya no está abierto aquí, se vuelve a consultar.
   */
  const handleRejected = async (error: unknown): Promise<string | null> => {
    cart.markNotCharged();
    const code = apiErrorCode(error);
    if (code === SALE_ERROR_CODES.noOpenSession || code === SALE_ERROR_CODES.sessionOtherLocation) {
      setCheckoutOpen(false);
      onSessionLost(apiErrorMessage(error, "Tu turno de caja ya no está abierto."));
      return null;
    }
    const errors = (error as any)?.response?.data?.errors;
    const priceOrStock =
      code === SALE_ERROR_CODES.insufficientStock ||
      (!!errors && Object.keys(errors).some((field) => field === "payments" || field.startsWith("details")));
    if (!priceOrStock) return null;

    const { ok, message } = await reloadAndApply();
    if (!ok) return "No se pudieron actualizar los productos: revisa la conexión.";
    return message ?? "Se actualizaron precios y existencias: revisa el carrito y vuelve a cobrar.";
  };

  const openCloseShift = async () => {
    // Cerrar el turno descarta lo que quede en el carrito.
    if (cart.lines.length > 0) {
      const ok = await alerts.confirm(
        `Hay ${cart.lines.length} ${cart.lines.length === 1 ? "producto" : "productos"} en el carrito sin cobrar. Si cierras el turno se descartan.`,
        { title: "Cerrar turno", okText: "Cerrar turno", cancelText: "Volver" },
      );
      if (!ok) return;
    }
    setCloseOpen(true);
  };

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

  // Ancho del rollo de la impresora de esta caja (se guarda en el equipo).
  const [ticketWidth, setTicketWidthState] = useState<58 | 80>(80);
  useEffect(() => {
    getTicketWidth().then(setTicketWidthState);
  }, []);

  const header = (
    <PosHeader
      locationName={session.location_name ?? undefined}
      registerName={session.cash_register_name}
      cashierName={cashierName ?? session.user_name ?? undefined}
      compact={compact}
      onCloseShift={openCloseShift}
      onExit={onExit}
      onRefreshCatalog={async () => {
        const { ok, message } = await reloadAndApply();
        if (!ok) alerts.error("No se pudieron actualizar los productos");
        else if (message) alerts.warning(message);
        else alerts.success("Productos actualizados");
      }}
      onPrintShift={() => printShiftTicket(session.id).catch(() => alerts.error("No se pudo imprimir el corte"))}
      ticketWidth={ticketWidth}
      onToggleTicketWidth={() => {
        const next = ticketWidth === 58 ? 80 : 58;
        setTicketWidthState(next);
        setTicketWidth(next);
        alerts.success(`Los tickets se imprimirán en ${next} mm`);
      }}
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
        visible={checkoutVisible}
        total={cart.totals.total}
        initialMethod={method}
        pendingUnknown={cart.requestUnknown}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={async (payments) => {
          // La misma llave en cada reintento de este carrito: el servidor no
          // duplica la venta si el primer envío sí se registró.
          const clientRequestId = cart.beginAttempt();
          const res = await Services.pos.sale({
            details: cart.toDetails(),
            payments,
            customer_id: customer?.id ?? null,
            client_request_id: clientRequestId,
          });
          return res.data;
        }}
        onVerify={async () => {
          const clientRequestId = cart.getRequestId();
          if (!clientRequestId) return null;
          const found = await Services.pos.findSaleByRequest(clientRequestId);
          return found?.data ?? null;
        }}
        onNotCharged={() => {
          cart.markNotCharged();
          // Si la ventana se abrió sola para verificar, sigue abierta con el aviso.
          setCheckoutOpen(true);
        }}
        onRejected={handleRejected}
        // Registrada: el carrito (y su llave) se vacían de inmediato y la
        // pantalla de "Venta registrada" sigue abierta hasta "Nueva venta".
        onCharged={() => {
          cart.clear();
          setCheckoutOpen(true);
        }}
        onDiscard={() => {
          cart.clear();
          setCheckoutOpen(false);
        }}
        onDone={() => {
          setCheckoutOpen(false);
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
