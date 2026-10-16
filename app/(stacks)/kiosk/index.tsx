/**
 * Kiosko de autoservicio: el cliente arma su pedido y paga en caja.
 *
 * Pantalla completa, fuera del marco del personal (sin menú, AppBar,
 * campana ni migas). Estados: bienvenida → catálogo ⇄ revisión → envío →
 * listo → bienvenida. El pedido vive en memoria y se borra al volver a la
 * bienvenida (por "Terminar", por "Empezar de nuevo" o por inactividad).
 *
 * Solo funciona con el modo kiosko activo para esta cuenta y sucursal
 * (utils/kioskMode, se inicia en /kiosk/setup). Mientras tanto la pantalla no
 * se apaga, el "atrás" de Android no sale y no se puede navegar fuera; el
 * personal sale manteniendo presionado el nombre de la sucursal 3 s y
 * escribiendo el PIN.
 */
import KioskCartBar, { KIOSK_CART_BAR_HEIGHT } from "@/components/Kiosk/KioskCartBar";
import KioskCartPanel, { KIOSK_PANEL_WIDTH } from "@/components/Kiosk/KioskCartPanel";
import KioskCatalogView from "@/components/Kiosk/KioskCatalogView";
import KioskConfirmation from "@/components/Kiosk/KioskConfirmation";
import KioskExitDialog from "@/components/Kiosk/KioskExitDialog";
import KioskIdleDialog from "@/components/Kiosk/KioskIdleDialog";
import type { KioskNoticeMessage } from "@/components/Kiosk/KioskNotice";
import KioskOptionSheet from "@/components/Kiosk/KioskOptionSheet";
import KioskRestartDialog from "@/components/Kiosk/KioskRestartDialog";
import KioskReview from "@/components/Kiosk/KioskReview";
import KioskSending from "@/components/Kiosk/KioskSending";
import KioskToast, { useKioskToast } from "@/components/Kiosk/KioskToast";
import KioskTopBar from "@/components/Kiosk/KioskTopBar";
import KioskUnavailable from "@/components/Kiosk/KioskUnavailable";
import KioskWelcome from "@/components/Kiosk/KioskWelcome";
import { joinNames, KIOSK_MAX_QTY, KIOSK_NAME_MAX, productOptions, visibleProducts } from "@/components/Kiosk/model";
import { apiErrorCode, apiErrorMessage, isOutcomeUnknown, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import { useAuth } from "@/contexts/AuthContext";
import { useKioskCart, type KioskCartEntry, type KioskCartResult } from "@/hooks/useKioskCart";
import { useKioskCatalog } from "@/hooks/useKioskCatalog";
import { useKioskDeviceLock } from "@/hooks/useKioskDeviceLock";
import { useKioskIdle } from "@/hooks/useKioskIdle";
import { useKioskModeRecord } from "@/hooks/useKioskMode";
import { useKioskWebUpdate } from "@/hooks/useKioskWebUpdate";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import {
  exitKioskFullscreen,
  isKioskModeFor,
  requestKioskFullscreen,
  stopKioskMode,
} from "@/utils/kioskMode";
import {
  KIOSK_ERROR_CODES,
  kioskApi,
  kioskShortItems,
  type KioskOrder,
  type KioskProduct,
} from "@/utils/services/kiosk";
import * as Haptics from "expo-haptics";
import { usePreventRemove, useRouter } from "expo-router";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Keyboard, Platform, StatusBar, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Phase = "welcome" | "catalog" | "review" | "sending" | "done";

/** En la bienvenida el catálogo se vuelve a bajar cada 5 minutos. */
const CATALOG_REFRESH_MS = 5 * 60 * 1000;
/** Al volver la app a primer plano en la bienvenida, si el catálogo tiene más de esto. */
const CATALOG_STALE_MS = 60 * 1000;

/** El diálogo de salida con PIN se cierra solo pasado este tiempo. */
const EXIT_DIALOG_TIMEOUT_MS = 45 * 1000;

const NETWORK_ERROR = "No pudimos enviar tu pedido. Revisa la conexión e intenta de nuevo.";
const ADJUSTED = "Ajustamos tu pedido; revísalo antes de enviarlo.";

export default function KioskScreen() {
  const router = useRouter();
  const { user, location, hasPermission } = useAuth();
  const record = useKioskModeRecord();
  const [exiting, setExiting] = useState(false);

  const active = isKioskModeFor(record, user?.id, location?.id);
  // Sin sesión (expiró) se suelta todo para que la app pueda ir a login.
  const locked = active && !exiting && !!user;
  const allowed = hasPermission("sales_kiosk");

  const backRef = useRef<(() => void) | null>(null);
  const onBack = useCallback(() => backRef.current?.(), []);
  useKioskDeviceLock(locked, onBack);
  // Nada saca de esta pantalla mientras el modo esté activo (en web también
  // pide confirmar antes de recargar o cerrar la pestaña).
  const disablePrevention = usePreventRemove(locked);

  // Sin modo kiosko para esta cuenta y sucursal: a la pantalla que lo inicia.
  useEffect(() => {
    if (record === undefined || active || exiting) return;
    router.replace("/kiosk/setup" as any);
  }, [record, active, exiting, router]);

  // PIN correcto: fuera del kiosko, a Inicio.
  useEffect(() => {
    if (!exiting) return;
    exitKioskFullscreen();
    router.replace("/(tabs)/home" as any);
  }, [exiting, router]);

  const exit = useCallback(() => {
    setExiting(true);
    void stopKioskMode();
  }, []);

  if (!active || exiting) return <KioskBlank />;

  return (
    <>
      {Platform.OS !== "web" ? <StatusBar hidden /> : null}
      {allowed ? (
        <KioskApp onExited={exit} backRef={backRef} disablePrevention={disablePrevention} />
      ) : (
        <KioskUnavailable onExited={exit} />
      )}
    </>
  );
}

function KioskBlank() {
  const styles = useThemedStyles((c) => ({ blank: { flex: 1, backgroundColor: c.background } }));
  return <View style={styles.blank} />;
}

function haptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

interface AppProps {
  onExited: () => void;
  backRef: React.RefObject<(() => void) | null>;
  disablePrevention: () => void;
}

function KioskApp({ onExited, backRef, disablePrevention }: AppProps) {
  const { location } = useAuth();
  const { width, height } = useWindowDimensions();
  const catalog = useKioskCatalog();
  const cart = useKioskCart(catalog.productsById);
  const toast = useKioskToast();
  const { submitting, run } = useSubmitGuard();

  const [phase, setPhase] = useState<Phase>("welcome");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sheetProductId, setSheetProductId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [notice, setNotice] = useState<KioskNoticeMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [order, setOrder] = useState<KioskOrder | null>(null);
  const [orderName, setOrderName] = useState("");
  const [expectedTotal, setExpectedTotal] = useState<number | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.background },
    safe: { flex: 1 },
    body: { flex: 1, flexDirection: "row" },
    main: { flex: 1, minWidth: 0 },
  }));

  // Tableta vertical (el caso principal): 3 columnas y barra inferior.
  // Ancho ≥ 1100 y horizontal: 4 columnas y panel "Tu pedido". Teléfono: 2.
  const wide = width >= 1100 && width > height;
  const columns = wide ? 4 : width < 600 ? 2 : 3;
  const gridWidth = wide ? width - KIOSK_PANEL_WIDTH : width;
  const locationName = catalog.catalog?.location?.name || location?.name || "Kiosko";

  const {
    clear: clearCart,
    add,
    remove,
    restore,
    setProductQuantities,
    applyCatalog,
    applyShortItems,
    removeOptions,
    ensureRequestId,
    renewRequestId,
    toItems,
    getLines,
  } = cart;
  const { reload: reloadCatalog } = catalog;
  const { show: showToast, hide: hideToast } = toast;

  const loadedAtRef = useRef(catalog.loadedAt);
  useEffect(() => {
    loadedAtRef.current = catalog.loadedAt;
  }, [catalog.loadedAt]);

  /** De vuelta a la bienvenida, sin rastro del cliente anterior. */
  const resetSession = useCallback(() => {
    clearCart();
    setQuery("");
    setCategoryId(null);
    setSheetProductId(null);
    setCustomerName("");
    setNotice(null);
    setSendError(null);
    setOrder(null);
    setOrderName("");
    setExpectedTotal(null);
    setRestartOpen(false);
    hideToast();
    Keyboard.dismiss();
    setPhase("welcome");
    // Precios y existencias al día para el siguiente cliente.
    void reloadCatalog();
  }, [clearCart, hideToast, reloadCatalog]);

  // ── Inactividad ──
  const idle = useKioskIdle({
    enabled:
      !exitOpen &&
      (phase === "catalog" || phase === "review" || (phase === "sending" && sendError !== null && !submitting)),
    hasItems: cart.lines.length > 0,
    onTimeout: resetSession,
  });
  const { bump, warning: idleWarning } = idle;
  /** Captura de toques en la raíz: cualquier toque reinicia el contador. */
  const captureActivity = useCallback(() => {
    // Con "¿Sigues ahí?" abierto el toque es del diálogo: reiniciar aquí lo
    // cerraba al apoyar el dedo y su botón ("Empezar de nuevo") se quedaba
    // sin el toque (en web táctil el clic caía en lo que estaba detrás).
    if (idleWarning !== null) return false;
    bump();
    return false;
  }, [bump, idleWarning]);

  // El diálogo de salida (solo personal) se cierra solo: abierto por error o
  // abandonado, detenía el reinicio por inactividad con el pedido a la vista.
  useEffect(() => {
    if (!exitOpen) return;
    const timer = setTimeout(() => setExitOpen(false), EXIT_DIALOG_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [exitOpen]);

  // Un catálogo recargado quitó o recortó algo del pedido: se avisa.
  const { catalogAdjustment } = cart;
  useEffect(() => {
    if (!catalogAdjustment) return;
    showToast(`Ya no está disponible como lo pediste: ${catalogAdjustment.names.join(", ")}. Revisa tu pedido.`, {
      tone: "warning",
    });
    // Solo cuando llega un ajuste nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogAdjustment]);

  // ── Bienvenida: catálogo al día y versión nueva (web) ──
  useEffect(() => {
    if (phase !== "welcome") return;
    const timer = setInterval(() => void reloadCatalog(), CATALOG_REFRESH_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - loadedAtRef.current > CATALOG_STALE_MS) void reloadCatalog();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [phase, reloadCatalog]);
  useKioskWebUpdate(phase === "welcome", disablePrevention);

  // ── Atrás de Android: cierra lo que esté abierto ──
  useEffect(() => {
    backRef.current = () => {
      if (exitOpen) setExitOpen(false);
      else if (restartOpen) setRestartOpen(false);
      else if (sheetProductId !== null) setSheetProductId(null);
      else if (phase === "review") setPhase("catalog");
    };
  }, [backRef, exitOpen, restartOpen, sheetProductId, phase]);

  // ── Avisos de un cambio en el pedido ──
  const showResult = useCallback(
    (result: KioskCartResult) => {
      if (result.ok) return;
      if (result.reason === "limit" && result.max >= KIOSK_MAX_QTY) {
        // Tope por producto del kiosko, no falta de existencia.
        showToast(`Puedes pedir hasta ${KIOSK_MAX_QTY} de cada producto; si necesitas más, pide en caja.`, {
          tone: "warning",
        });
      } else if (result.reason === "limit") {
        showToast(result.max > 0 ? `Solo quedan ${result.max}` : "Ya no quedan más", { tone: "warning" });
      } else if (result.reason === "lines") {
        showToast("Tu pedido ya tiene muchos productos distintos. Envíalo y haz otro.", { tone: "warning" });
      } else {
        showToast("Ese producto ya no está disponible.", { tone: "warning" });
      }
    },
    [showToast],
  );

  const quantityOf = useCallback(
    (productId: number) => getLines().reduce((sum, line) => (line.productId === productId ? sum + line.quantity : sum), 0),
    [getLines],
  );

  const start = useCallback(() => {
    // Dentro del toque: en web vuelve a pantalla completa (tras recargar o
    // si alguien la quitó).
    requestKioskFullscreen();
    setPhase("catalog");
    if (catalog.error || Date.now() - loadedAtRef.current > CATALOG_REFRESH_MS) void reloadCatalog();
  }, [catalog.error, reloadCatalog]);

  const onPressProduct = useCallback(
    (product: KioskProduct) => {
      Keyboard.dismiss();
      const options = productOptions(product);
      if (options.length === 1) {
        const result = add(product.id, options[0].packageId, 1);
        if (result.ok) {
          haptic();
          showToast(`Agregado: ${product.name}`);
        } else {
          showResult(result);
        }
        return;
      }
      setSheetProductId(product.id);
    },
    [add, showResult, showToast],
  );

  const sheetProduct = sheetProductId !== null ? catalog.productsById.get(sheetProductId) ?? null : null;
  const sheetInitial = useMemo(() => {
    const initial: Record<string, number> = {};
    if (sheetProductId === null) return initial;
    for (const line of cart.lines) if (line.productId === sheetProductId) initial[line.key] = line.quantity;
    return initial;
  }, [cart.lines, sheetProductId]);

  const confirmSheet = (quantities: Record<string, number>) => {
    if (!sheetProduct) return;
    const before = quantityOf(sheetProduct.id);
    const result = setProductQuantities(sheetProduct.id, quantities);
    setSheetProductId(null);
    if (!result.ok) {
      showResult(result);
      return;
    }
    const after = quantityOf(sheetProduct.id);
    if (after > before) {
      haptic();
      showToast(`Agregado: ${sheetProduct.name}`);
    } else if (after < before) {
      showToast("Listo, cambiamos tu pedido", { tone: "info" });
    }
  };

  // ── Renglones (revisión y panel) ──
  const increment = useCallback(
    (entry: KioskCartEntry) => showResult(add(entry.productId, entry.packageId, 1)),
    [add, showResult],
  );
  const decrement = useCallback(
    (entry: KioskCartEntry) => {
      if (entry.quantity > 1) add(entry.productId, entry.packageId, -1);
    },
    [add],
  );
  const removeLine = useCallback(
    (entry: KioskCartEntry) => {
      const index = getLines().findIndex((line) => line.key === entry.key);
      const line = remove(entry.key);
      if (!line) return;
      showToast(`Quitaste: ${entry.product.name}`, {
        tone: "info",
        action: { label: "Deshacer", onPress: () => showResult(restore(line, index)) },
      });
    },
    [getLines, remove, restore, showResult, showToast],
  );

  const goReview = () => {
    Keyboard.dismiss();
    setNotice(null);
    setPhase("review");
  };

  const requestRestart = () => {
    if (cart.lines.length === 0 && !customerName.trim()) resetSession();
    else setRestartOpen(true);
  };

  // ── Envío ──
  const handleSendError = async (error: unknown) => {
    if (isOutcomeUnknown(error)) {
      // Pudo haber entrado: se reintenta con la misma llave (no se duplica).
      setSendError(NETWORK_ERROR);
      return;
    }
    const status = (error as any)?.response?.status;
    if (status === 429) {
      // Límite de pedidos por minuto: nada quedó registrado. El pedido no
      // cambia, así que el reintento lleva la misma llave.
      setNotice({ tone: "warning", text: "Espera un momento e intenta de nuevo." });
      setPhase("review");
      return;
    }

    const code = apiErrorCode(error);
    if (code === KIOSK_ERROR_CODES.kioskBusy) {
      // Muchos pedidos esperando en caja: se conserva el pedido para intentarlo después.
      setNotice({
        tone: "warning",
        text: apiErrorMessage(error, "Hay muchos pedidos esperando en caja. Pide ayuda en caja para continuar."),
      });
      setPhase("review");
      return;
    }

    const items = kioskShortItems(error);
    const namesOfItems = () =>
      items.map((item) => catalog.productsById.get(item.product_id)?.name).filter((name): name is string => !!name);

    if (code === SALE_ERROR_CODES.clientRequestConflict) {
      // La llave ya se usó en otra cosa: el siguiente envío lleva una nueva.
      renewRequestId();
      setNotice({ tone: "error", text: apiErrorMessage(error, "No pudimos registrar tu pedido. Pide ayuda en caja.") });
      setPhase("review");
      return;
    }

    if (code === KIOSK_ERROR_CODES.orderCancelled) {
      // El pedido con esta llave sí entró, pero ya se canceló (venció o lo
      // canceló caja): el siguiente envío lleva otra llave y crea uno nuevo.
      renewRequestId();
      setNotice({
        tone: "warning",
        text: apiErrorMessage(error, "Ese pedido ya no está vigente. Revisa tu pedido y vuelve a enviarlo."),
      });
      setPhase("review");
      return;
    }

    if (code === KIOSK_ERROR_CODES.productUnavailable) {
      // Ya no se vende: se quita del pedido y se avisa.
      const removed = removeOptions(items);
      const fresh = await reloadCatalog();
      const adjusted = fresh ? applyCatalog(fresh.productsById).names : [];
      const names = [...removed.names, ...adjusted];
      setNotice({
        tone: "warning",
        text:
          names.length > 0
            ? `Ya no está disponible: ${joinNames(names)}. Lo quitamos de tu pedido; revísalo antes de enviarlo.`
            : apiErrorMessage(error, "Algo de tu pedido ya no está disponible. Revísalo antes de enviarlo."),
      });
      setPhase("review");
      return;
    }

    if (code === SALE_ERROR_CODES.insufficientStock) {
      // Catálogo al día y, por si todavía no lo refleja, lo que dijo el
      // servidor (el suelto y los paquetes comparten la existencia).
      const fresh = await reloadCatalog();
      const fromCatalog = fresh ? applyCatalog(fresh.productsById).names : [];
      const fromServer = applyShortItems(items).names;
      const changed = [...fromCatalog, ...fromServer];
      const names = changed.length > 0 ? changed : namesOfItems();
      setNotice({
        tone: "warning",
        text: names.length > 0 ? `Ya no alcanza: ${joinNames(names)}. ${ADJUSTED}` : `Ya no alcanza para todo tu pedido. ${ADJUSTED}`,
      });
      setPhase("review");
      return;
    }

    setNotice({
      tone: "error",
      text:
        status === 403
          ? "Este kiosko no puede recibir pedidos por ahora. Pide ayuda en caja."
          : apiErrorMessage(error, "No pudimos enviar tu pedido. Pide ayuda en caja."),
    });
    setPhase("review");
    // Por si algo dejó de venderse o cambió: catálogo al día y pedido ajustado.
    const fresh = await reloadCatalog();
    if (fresh) {
      const adjustment = applyCatalog(fresh.productsById);
      if (adjustment.names.length > 0) {
        setNotice((current) =>
          current ? { ...current, text: `${current.text} Ya no alcanza: ${joinNames(adjustment.names)}. ${ADJUSTED}` } : current,
        );
      }
    }
  };

  const send = () =>
    run(async () => {
      if (getLines().length === 0) return;
      Keyboard.dismiss();
      const name = customerName.trim().slice(0, KIOSK_NAME_MAX);
      setNotice(null);
      setSendError(null);
      setExpectedTotal(cart.totals.totalCents);
      setPhase("sending");
      try {
        const created = await kioskApi.createOrder({
          client_request_id: ensureRequestId(),
          items: toItems(),
          ...(name ? { customer_name: name } : {}),
        });
        clearCart();
        setOrder(created);
        setOrderName(name);
        setPhase("done");
        // Lo apartado ya no está disponible para el siguiente cliente.
        void reloadCatalog();
      } catch (error) {
        await handleSendError(error);
      }
    });

  // ── Vista ──
  const products = catalog.catalog?.products ?? [];
  const visible = useMemo(
    () => visibleProducts(catalog.catalog?.products ?? [], deferredQuery, categoryId),
    [catalog.catalog, deferredQuery, categoryId],
  );
  const showCartBar = phase === "catalog" && !wide && cart.lines.length > 0;
  const toastBottom = showCartBar ? KIOSK_CART_BAR_HEIGHT + 16 : 24;

  const changeQuery = (value: string) => {
    bump();
    setQuery(value);
    if (value.trim()) setCategoryId(null);
  };

  const inShop = phase === "catalog" || phase === "review";

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={captureActivity}
      onMoveShouldSetResponderCapture={captureActivity}
      testID="kiosk-screen"
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        {phase === "welcome" ? (
          <KioskWelcome locationName={locationName} onStart={start} onExitRequest={() => setExitOpen(true)} />
        ) : null}

        {inShop ? (
          <>
            <KioskTopBar
              locationName={locationName}
              onExitRequest={() => setExitOpen(true)}
              onRestart={requestRestart}
              search={phase === "catalog" ? { value: query, onChange: changeQuery } : undefined}
              compact={width < 900}
            />
            <View style={styles.body}>
              <View style={styles.main}>
                {phase === "catalog" ? (
                  <KioskCatalogView
                    status={catalog.catalog ? "ready" : catalog.error ? "error" : "loading"}
                    totalProducts={products.length}
                    products={visible}
                    categories={catalog.catalog?.categories ?? []}
                    categoryId={categoryId}
                    onSelectCategory={setCategoryId}
                    query={query}
                    onClearQuery={() => setQuery("")}
                    onRetry={() => void reloadCatalog()}
                    retrying={catalog.loading}
                    columns={columns}
                    gridWidth={gridWidth}
                    quantityByProduct={cart.quantityByProduct}
                    onPressProduct={onPressProduct}
                    onScroll={bump}
                    bottomInset={0}
                  />
                ) : (
                  <KioskReview
                    entries={cart.entries}
                    count={cart.totals.count}
                    totalCents={cart.totals.totalCents}
                    customerName={customerName}
                    onCustomerNameChange={(value) => {
                      bump();
                      setCustomerName(value);
                    }}
                    notice={notice}
                    onIncrement={increment}
                    onDecrement={decrement}
                    onRemove={removeLine}
                    onSend={send}
                    onKeepShopping={() => {
                      setNotice(null);
                      setPhase("catalog");
                    }}
                    sending={submitting}
                  />
                )}
              </View>
              {wide && phase === "catalog" ? (
                <KioskCartPanel
                  entries={cart.entries}
                  count={cart.totals.count}
                  totalCents={cart.totals.totalCents}
                  onIncrement={increment}
                  onDecrement={decrement}
                  onRemove={removeLine}
                  onContinue={goReview}
                />
              ) : null}
            </View>
            {showCartBar ? (
              <KioskCartBar
                count={cart.totals.count}
                totalCents={cart.totals.totalCents}
                onPress={goReview}
                stacked={width < 600}
              />
            ) : null}
          </>
        ) : null}

        {phase === "sending" ? (
          <KioskSending
            error={sendError}
            retrying={submitting}
            onRetry={send}
            onBack={() => {
              setSendError(null);
              setPhase("review");
            }}
          />
        ) : null}

        {phase === "done" && order ? (
          <KioskConfirmation
            order={order}
            customerName={orderName}
            expectedTotalCents={expectedTotal}
            onFinish={resetSession}
          />
        ) : null}
      </SafeAreaView>

      {phase === "catalog" && sheetProduct ? (
        <KioskOptionSheet
          key={sheetProduct.id}
          product={sheetProduct}
          initial={sheetInitial}
          onConfirm={confirmSheet}
          onClose={() => setSheetProductId(null)}
        />
      ) : null}

      <KioskToast
        toast={inShop ? toast.toast : null}
        bottom={toastBottom}
        right={wide && phase === "catalog" ? KIOSK_PANEL_WIDTH : 0}
        onHide={hideToast}
      />

      <KioskRestartDialog
        visible={restartOpen}
        onCancel={() => setRestartOpen(false)}
        onConfirm={resetSession}
      />

      {/* Encima de todo lo del cliente (también de "¿Empezar de nuevo?"). */}
      <KioskIdleDialog seconds={idle.warning} onStay={bump} onRestart={resetSession} />

      {exitOpen ? <KioskExitDialog onCancel={() => setExitOpen(false)} onSuccess={onExited} /> : null}
    </View>
  );
}
