import AppBar from "@/components/App/AppBar";
import EmptyState from "@/components/App/EmptyState";
import { ListGroup, ListRow, ListSectionTitle } from "@/components/App/ListGroup";
import SearchInput from "@/components/App/SearchInput";
import CashSourcePicker, {
  CASH_SOURCE_CODES,
  cashSessionLabel,
  useOpenCashSessions,
} from "@/components/Cash/CashSourcePicker";
import AppDatePicker from "@/components/Form/AppDatePicker";
import { Cart, ListProducts } from "@/components/Views/POSV3/components";
import type { ListProductsHandle } from "@/components/Views/POSV3/components/ListProducts";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { apiErrorCode } from "@/components/Pos/saleErrors";
import { errorMessageOf, isApiError } from "@/utils/errorNotice";
import { formatMoney } from "@/utils/format";
import { toLocalDateString } from "@/utils/dates";
import { amountToCents } from "@/utils/money";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Button,
  IconButton,
  Menu,
  Portal,
  Modal as SheetModal,
  Switch,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { type PaymentMethod, usePurchase } from "./PurchaseContext";

/**
 * Compra en una sola pantalla, como Transferencias: arriba el proveedor, el
 * catálogo de lo que se le compra y, al lado (en el celular, en un modal), la
 * compra con sus datos y cómo se registra. Antes eran tres pantallas
 * (formulario → productos → carrito) y toda compra quedaba pedida: había que
 * marcarla en tránsito y recibirla aunque ya se tuviera la mercancía.
 */

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Sin acentos ni mayúsculas, para buscar. */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const listData = (response: any): any[] => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
};

/** Proveedores de la empresa (suppliers_list), para elegir a quién se le compra. */
function useSuppliers(enabled: boolean) {
  const [list, setList] = useState<App.Entities.Supplier[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // silent: si falla, la lista de proveedores lo dice y ofrece reintentar.
        const response = await Services.suppliers.index(
          { all: true, sort_by: "name", sort_direction: "asc" },
          { silent: true },
        );
        if (!cancelled) setList(listData(response));
      } catch (e) {
        if (!cancelled) setError(errorMessageOf(e, "No se pudieron cargar los proveedores."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  return {
    list,
    loading: enabled && loading,
    error,
    retry: () => setAttempt((n) => n + 1),
  };
}

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
  const styles = useThemedStyles((c) => ({
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
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Ver compra"
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

interface SupplierPickerProps {
  visible: boolean;
  onDismiss: () => void;
  suppliers: App.Entities.Supplier[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedId: number | null;
  /** Ya hay productos en la compra: se avisa que se quedan. */
  hasLines: boolean;
  onSelect: (supplierId: number) => void;
}

/** Elegir el proveedor: lista con búsqueda, como el buscador de productos de Producción. */
function SupplierPicker({
  visible,
  onDismiss,
  suppliers,
  loading,
  error,
  onRetry,
  selectedId,
  hasLines,
  onSelect,
}: SupplierPickerProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const styles = useThemedStyles((c) => ({
    card: {
      alignSelf: "center",
      width: "94%",
      maxWidth: 520,
      maxHeight: "86%",
      backgroundColor: c.background,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    title: { fontSize: 18, fontWeight: "700", color: c.text },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    field: {
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.surface,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    empty: { fontSize: 14, color: c.textSecondary, paddingVertical: 16, textAlign: "center" },
    error: { fontSize: 14, lineHeight: 20, color: c.error, paddingVertical: 8 },
  }));

  const query = normalize(search.trim());
  // Los inactivos no se ofrecen (salvo el que ya tiene la compra).
  const rows = suppliers.filter(
    (supplier) =>
      (supplier.is_active !== false || supplier.id === selectedId) &&
      (!query ||
        normalize(`${supplier.name} ${supplier.business_name ?? ""}`).includes(query)),
  );

  const close = () => {
    setSearch("");
    onDismiss();
  };

  return (
    <Portal>
      <SheetModal visible={visible} onDismiss={close} contentContainerStyle={styles.card}>
        <Text style={styles.title}>Proveedor</Text>
        {hasLines && (
          <Text style={styles.hint}>Los productos que ya agregaste se quedan en la compra.</Text>
        )}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar proveedor"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.field}
        />

        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
          ) : error ? (
            <View>
              <Text style={styles.error}>{error}</Text>
              <Button mode="outlined" onPress={onRetry} style={{ alignSelf: "flex-start" }}>
                Reintentar
              </Button>
            </View>
          ) : rows.length === 0 ? (
            <Text style={styles.empty}>
              {query ? "Sin resultados." : "No hay proveedores activos: dalos de alta en Proveedores."}
            </Text>
          ) : (
            <ListGroup inset={14}>
              {rows.map((supplier) => (
                <ListRow
                  key={supplier.id}
                  title={supplier.name}
                  subtitle={
                    supplier.business_name && supplier.business_name !== supplier.name
                      ? supplier.business_name
                      : undefined
                  }
                  chevron={false}
                  onPress={() => {
                    if (supplier.id !== selectedId) onSelect(supplier.id);
                    close();
                  }}
                  trailing={
                    supplier.id === selectedId ? (
                      <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                    ) : undefined
                  }
                />
              ))}
            </ListGroup>
          )}
        </ScrollView>

        <Button mode="text" onPress={close}>
          Cerrar
        </Button>
      </SheetModal>
    </Portal>
  );
}

export default function PurchaseFormScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const navigation = useNavigation();
  const { id: routeId } = useLocalSearchParams<{ id?: string }>();
  const { isMobile } = useResponsive();
  const { colors } = useTheme();
  const { can } = useCan();
  const { location } = useAuth();
  const purchase = usePurchase();
  const { header, updateHeader } = purchase;

  // Los productos se guardan en el borrador al agregarlos (purchases_create);
  // confirmar la compra (POST purchases-v2/{id}/confirm) pide purchases_update.
  const canConfirm = can("purchases_update");
  const canListSuppliers = can("suppliers_list");
  const suppliers = useSuppliers(canListSuppliers);

  // Candado de los dos botones: un doble toque abría otra confirmación.
  const { submitting, run } = useSubmitGuard();
  const [sending, setSending] = useState<"receive" | "order" | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);
  // Por qué no se pudo confirmar, dentro del modal (celular).
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // De qué caja sale el efectivo al registrarla recibida, si quien la
  // registra no tiene turno abierto.
  const [cashSessionId, setCashSessionId] = useState<number | null>(null);
  const [cashAttempted, setCashAttempted] = useState(false);
  // En la tableta, con el teclado abierto, el total y los botones fijos no
  // dejaban ver el renglón que se escribe.
  const keyboardOpen = useKeyboardOpen();

  const lineCount = purchase.cartItems.length;
  const title = purchase.draftLabel ?? "Nueva compra";
  const supplierName =
    suppliers.list.find((supplier) => supplier.id === purchase.supplierId)?.name ??
    purchase.draftSupplierName ??
    (purchase.supplierId
      ? suppliers.loading
        ? "Cargando proveedor…"
        : `Proveedor #${purchase.supplierId}`
      : null);
  const paymentLabel =
    PAYMENT_OPTIONS.find((option) => option.value === header.payment_method)?.label ?? "Otro";
  const paidFromCash = header.payment_method === "cash" && header.paid_from_cash;
  const cash = useOpenCashSessions(paidFromCash && canConfirm);
  const chosenSession = cash.sessions.find((session) => session.id === cashSessionId) ?? null;

  const dismissNotices = () => {
    setConfirmError(null);
    purchase.dismissNotice();
  };

  const closeCart = () => {
    setCartVisible(false);
    setConfirmError(null);
  };

  // La barra de arriba la pinta la pantalla: en tableta y escritorio lleva
  // el proveedor y el buscador del catálogo, que antes ocupaban dos renglones
  // abajo de ella (y en la tableta solo quedaba una fila de productos). En el
  // celular lleva el carrito; el título es el folio del borrador que se abrió.
  const [search, setSearch] = useState("");
  const listRef = useRef<ListProductsHandle>(null);
  // Otro proveedor, otro catálogo: la búsqueda empieza de nuevo.
  const selectSupplier = (supplierId: number) => {
    setSearch("");
    purchase.selectSupplier(supplierId);
  };

  // La URL apunta al borrador en cuanto existe (el primer producto lo crea).
  // Antes se quedaba en ?new=1: al recargar en web arrancaba otra compra
  // vacía y el borrador quedaba en la lista sin verse aquí.
  const purchaseId = purchase.currentPurchaseId;
  useEffect(() => {
    if (purchaseId && String(purchaseId) !== routeId) {
      navigation.setParams({ id: String(purchaseId), new: undefined } as any);
    }
  }, [navigation, purchaseId, routeId]);

  // Lo que falta para poder confirmar (los botones quedan deshabilitados).
  const blocker =
    lineCount === 0
      ? "Agrega al menos un producto."
      : !purchase.supplierId
        ? "Elige el proveedor de la compra."
        : !header.purchase_date
          ? "Elige la fecha de la compra."
          : null;

  const handleConfirm = (receiveNow: boolean) =>
    run(async () => {
      if (blocker) return;
      setConfirmError(null);
      // Lo que ya llegó no puede tener fecha posterior a hoy: el backend lo
      // rechaza (el stock entra hoy y el egreso quedaría en el futuro).
      if (receiveNow && header.purchase_date > toLocalDateString()) {
        alerts.error("Una compra que ya llegó no puede tener fecha posterior a hoy.");
        return;
      }
      // El efectivo sale ahora: tiene que salir del turno de alguna caja.
      const cashProblem = receiveNow && paidFromCash ? cash.problem(cashSessionId) : null;
      if (cashProblem) {
        setCashAttempted(true);
        alerts.error(cashProblem);
        if (isMobile) {
          setConfirmError(cashProblem);
          setCartVisible(true);
        }
        return;
      }

      // En centavos, como se guarda: $0.004/g queda en $0.00 y antes no se
      // contaba porque no era exactamente 0.
      const zeroCount = purchase.cartItems.filter((item) => amountToCents(item.price) <= 0).length;
      const zeroNote =
        zeroCount === 0
          ? ""
          : zeroCount === 1
            ? `\n\nUn producto va a ${formatMoney(0)}: ${receiveNow ? "revisa que ese sea el precio que pagaste." : "revisa su precio antes de recibirla."}`
            : `\n\n${zeroCount} productos van a ${formatMoney(0)}: ${receiveNow ? "revisa que esos sean los precios que pagaste." : "revisa sus precios antes de recibirla."}`;
      const summary = `${plural(lineCount, "producto", "productos")} por ${formatMoney(purchase.total)}`;
      // El pago siempre, también cuando no sale de la caja: el método por
      // defecto es «Otro» y los datos quedan debajo de los productos, fuera de
      // la vista. Antes solo se mencionaba la caja con efectivo. El egreso va
      // al turno de la caja de donde sale: el de quien la recibe o el que
      // eligió de los abiertos.
      const paymentNote = paidFromCash
        ? receiveNow
          ? chosenSession && !cash.mine
            ? `Pago: efectivo de ${cashSessionLabel(chosenSession)}, se descuenta en ese corte.`
            : "Pago: efectivo de la caja, se descuenta de tu turno abierto."
          : "Pago: efectivo de la caja, se descuenta del turno de quien la reciba."
        : `Pago: ${paymentLabel} (no sale de la caja).`;

      // El diálogo vive en el Portal de la app: con el modal de la compra
      // abierto (celular) quedaba detrás y el botón parecía no hacer nada.
      setCartVisible(false);
      const confirmed = await alerts.confirm(
        receiveNow
          ? `${summary} ${lineCount === 1 ? "entra" : "entran"} al inventario${location?.name ? ` de ${location.name}` : ""} ahora.\n\n${paymentNote}${zeroNote}`
          : `La compra ${supplierName ? `a ${supplierName}` : "al proveedor"} queda pedida: ${summary}. Cuando llegue, recíbela desde su detalle para que entre al inventario.\n\n${paymentNote}${zeroNote}`,
        receiveNow
          ? { title: "Registrar compra recibida", okText: "Registrar", cancelText: "Cancelar" }
          : { title: "Guardar como pedido", okText: "Guardar pedido", cancelText: "Cancelar" },
      );
      if (!confirmed) {
        if (isMobile) setCartVisible(true);
        return;
      }

      setSending(receiveNow ? "receive" : "order");
      try {
        // Primero se mandan los cambios pendientes y se verifica que el
        // servidor tenga lo que muestra el carrito. Solo una compra en
        // efectivo puede salir de la caja; con tarjeta, transferencia u otro
        // medio nunca toca el corte.
        const result = await purchase.confirmPurchase({
          supplier_id: purchase.supplierId ?? undefined,
          purchase_date: header.purchase_date,
          payment_method: header.payment_method,
          paid_from_cash: paidFromCash,
          notes: header.notes.trim(),
          document_number: header.document_number || undefined,
          receive_now: receiveNow,
          ...(receiveNow && paidFromCash && !cash.mine && cashSessionId
            ? { cash_register_session_id: cashSessionId }
            : {}),
        });
        // Ya había una confirmación en curso.
        if (!result) return;

        if (!receiveNow) {
          alerts.success(
            result.whatsappSent ? "Pedido guardado y enviado al proveedor por WhatsApp" : "Pedido guardado",
          );
        } else if (!result.received) {
          // El servidor la dejó pedida (una versión que no recibe al confirmar).
          alerts.warning("La compra quedó como pedido: recíbela desde su detalle.");
        } else if (result.cashOutOfShift) {
          // El egreso quedó sin turno: ningún corte lo descuenta y la caja de
          // donde salió el efectivo sale con faltante. Antes solo se decía
          // «Compra registrada» y el diálogo prometía descontarlo en el corte.
          alerts.alert(
            "Compra registrada, pero no tienes turno abierto: el pago no se descuenta en ningún corte.",
            { type: "warning", duration: 8000 },
          );
        } else {
          alerts.success("Compra registrada: ya entró al inventario");
        }
        // De vuelta a la lista: si se abrió desde el detalle de un borrador
        // («Continuar compra»), quita también ese detalle viejo de la pila
        // (con replace quedaba lista → detalle → lista).
        router.dismissTo("/(tabs)/home/purchases" as any);
      } catch (error: any) {
        console.error("Error confirming purchase:", error);
        // El motivo del servidor o el de la verificación del carrito; nunca el
        // texto en inglés de axios.
        const message = isApiError(error)
          ? errorMessageOf(error, "No se pudo confirmar la compra.")
          : error?.message || "No se pudo confirmar la compra.";
        alerts.error(message);
        // Se cerró el turno elegido o el propio: se vuelven a pedir los abiertos.
        if (CASH_SOURCE_CODES.includes(apiErrorCode(error) ?? "")) cash.reload();
        // En el celular se vuelve a abrir la compra para corregirla, con el
        // motivo adentro (el aviso de la app queda detrás del modal).
        if (isMobile) {
          setConfirmError(message);
          setCartVisible(true);
        }
      } finally {
        setSending(null);
      }
    });

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, flexDirection: "row", backgroundColor: c.background },
    headerSupplier: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0 },
    headerSearch: { flex: 1, maxWidth: 460 },
    catalogSection: { flex: 1, minWidth: 0 },
    catalogBody: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    supplierBar: {
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
    supplierLabel: { fontSize: 14, fontWeight: "600", color: c.text },
    supplierName: { fontSize: 14, color: c.textSecondary, flexShrink: 1 },

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
      gap: 14,
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
    selectRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowLabel: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    rowValue: { flexDirection: "row", alignItems: "center", gap: 4 },
    rowValueText: { fontSize: 15, lineHeight: 20, color: c.textSecondary },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
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
    decision: { gap: 10 },
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
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
    },
    noticeError: { backgroundColor: c.errorSoft },
    noticeWarning: { backgroundColor: c.warningSoft },
    noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
  }));

  /* ─── Proveedor y catálogo ─── */

  // Primer paso: a quién se le compra. Va arriba del catálogo, como "Pedir a"
  // en Transferencias.
  const supplierControl = canListSuppliers ? (
    <Button
      mode={supplierName ? "outlined" : "contained"}
      onPress={() => setPickerVisible(true)}
      icon="chevron-down"
      contentStyle={{ flexDirection: "row-reverse" }}
      style={{ flexShrink: 1 }}
      accessibilityLabel={supplierName ? `Proveedor: ${supplierName}. Cambiar` : "Elegir proveedor"}
      compact
    >
      {supplierName ?? "Elegir proveedor"}
    </Button>
  ) : (
    <Text style={styles.supplierName} numberOfLines={1}>
      {supplierName ?? "Sin proveedor"}
    </Text>
  );

  // Celular: su propio renglón abajo de la barra.
  const supplierBar = (
    <View style={styles.supplierBar}>
      <MaterialCommunityIcons name="truck-outline" size={20} color={colors.primary} />
      <Text style={styles.supplierLabel}>Proveedor</Text>
      {supplierControl}
    </View>
  );

  // Tableta y escritorio: proveedor y buscador en la barra de arriba. El
  // buscador sigue sirviendo de escáner: Enter agrega el producto del código.
  const headerTools = (
    <>
      <View style={styles.headerSupplier}>
        <MaterialCommunityIcons name="truck-outline" size={20} color={colors.primary} />
        {supplierControl}
      </View>
      {!!purchase.supplierId && (
        <SearchInput
          placeholder="Buscar productos o escanear código"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => listRef.current?.submitSearch()}
          // Mantener el foco para escanear varios códigos seguidos.
          blurOnSubmit={false}
          returnKeyType="search"
          showShortcut={false}
          width="auto"
          containerStyle={styles.headerSearch}
          accessibilityLabel="Buscar productos o escanear código"
        />
      )}
    </>
  );

  let catalog: React.ReactNode;
  if (!purchase.ready) {
    catalog = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (!purchase.supplierId) {
    catalog = canListSuppliers ? (
      <EmptyState
        icon="truck-outline"
        title="Elige el proveedor"
        description="Verás los productos que le compras para armar la compra."
        actionLabel="Elegir proveedor"
        onAction={() => setPickerVisible(true)}
      />
    ) : (
      <EmptyState
        icon="truck-outline"
        title="Elige el proveedor"
        description="No tienes permiso para ver los proveedores: pide que te lo den para armar la compra."
      />
    );
  } else if (purchase.catalogError) {
    catalog = (
      <EmptyState
        icon="alert-circle-outline"
        title="No se pudo cargar el catálogo"
        description={purchase.catalogError}
        actionLabel="Reintentar"
        onAction={purchase.reloadCatalog}
      />
    );
  } else if (!purchase.loading && purchase.products.length === 0) {
    catalog = (
      <EmptyState
        icon="package-variant-closed"
        title="Este proveedor no tiene productos"
        description="Para comprarle un producto, asígnale este proveedor en el producto (Inventario)."
        actionLabel={canListSuppliers ? "Cambiar proveedor" : undefined}
        onAction={canListSuppliers ? () => setPickerVisible(true) : undefined}
      />
    );
  } else {
    catalog = (
      <ListProducts
        ref={listRef}
        // Otro proveedor, otro catálogo: sin la búsqueda ni la categoría del
        // anterior (que quizá ni existe en este y dejaba la lista vacía).
        key={purchase.supplierId}
        // En tableta y escritorio el buscador va en la barra de arriba.
        searchQuery={isMobile ? undefined : search}
        onSearchQueryChange={setSearch}
        loading={purchase.loading}
        categories={purchase.categories}
        products={purchase.products}
        selectedProducts={purchase.selectedProducts}
        onAddProduct={purchase.handleAddProduct}
        onRemoveProduct={purchase.handleRemoveProduct}
        onItemChange={purchase.handleItemChange}
        onScanNotFound={(code) => alerts.error(`${supplierName ?? "Este proveedor"} no tiene un producto con el código ${code}`)}
        canEditItems={purchase.canEditLines}
        canRemoveItems={purchase.canRemoveLines}
      />
    );
  }

  /* ─── La compra (carrito) ─── */

  const purchaseData = (
    <View style={styles.section}>
      <ListSectionTitle title="Datos de la compra" />
      <AppDatePicker
        label="Fecha de compra"
        value={header.purchase_date}
        onChange={(value) => updateHeader({ purchase_date: value })}
      />
      <ListGroup inset={14}>
        <Menu
          visible={paymentMenuVisible}
          onDismiss={() => setPaymentMenuVisible(false)}
          contentStyle={{ backgroundColor: colors.surface }}
          anchor={
            <Pressable
              onPress={() => setPaymentMenuVisible(true)}
              style={({ pressed }) => [styles.selectRow, pressed && { backgroundColor: colors.surfaceMuted }]}
              accessibilityRole="button"
              accessibilityLabel={`Método de pago: ${paymentLabel}`}
            >
              <Text style={styles.rowLabel}>Método de pago</Text>
              <View style={styles.rowValue}>
                <Text style={styles.rowValueText}>{paymentLabel}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          }
        >
          {PAYMENT_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              title={option.label}
              leadingIcon={option.value === header.payment_method ? "check" : undefined}
              titleStyle={{ color: colors.text }}
              onPress={() => {
                updateHeader({ payment_method: option.value });
                setPaymentMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        {/* Una compra grande pagada por el dueño o desde el banco no debe
            dejar la caja en negativo: solo se descuenta si salió de ella. */}
        {header.payment_method === "cash" && (
          <View style={styles.switchRow}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>
              Pagado con dinero de la caja (se descuenta en el corte)
            </Text>
            <Switch
              value={header.paid_from_cash}
              onValueChange={(value) => updateHeader({ paid_from_cash: value })}
              color={colors.primary}
              accessibilityLabel="Pagado con dinero de la caja"
            />
          </View>
        )}
      </ListGroup>
      {/* Al registrarla recibida el efectivo sale ya; guardada como pedido,
          sale al recibirla (y ahí se elige). */}
      <CashSourcePicker
        state={cash}
        active={paidFromCash && canConfirm}
        value={cashSessionId}
        onChange={setCashSessionId}
        emptyHint="quita «Pagado con dinero de la caja» si la pagó el dueño u otra fuente, o guárdala como pedido"
        showError={cashAttempted}
      />
      <TextInput
        value={header.notes}
        onChangeText={(notes) => updateHeader({ notes })}
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
          <Text style={styles.totalLabel}>Total</Text>
          {lineCount > 0 && (
            <Text style={styles.totalMeta}>{plural(lineCount, "producto", "productos")}</Text>
          )}
        </View>
        <Text style={styles.totalValue}>{formatMoney(purchase.total)}</Text>
      </View>

      {canConfirm ? (
        <View style={styles.decision}>
          <ListSectionTitle title="¿Ya tienes la mercancía?" />
          {!!blocker && <Text style={styles.hint}>{blocker}</Text>}
          <View style={styles.choice}>
            <Button
              mode="contained"
              icon="package-variant-closed-check"
              onPress={() => handleConfirm(true)}
              loading={sending === "receive"}
              disabled={!!blocker || submitting}
            >
              Registrar compra recibida
            </Button>
            <Text style={styles.hint}>Entra al inventario ahora.</Text>
          </View>
          <View style={styles.choice}>
            <Button
              mode="outlined"
              icon="truck-delivery-outline"
              onPress={() => handleConfirm(false)}
              loading={sending === "order"}
              disabled={!!blocker || submitting}
            >
              Guardar como pedido
            </Button>
            <Text style={styles.hint}>Llega después y se recibe desde el detalle.</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>
          La compra queda guardada como borrador. Confirmarla requiere permiso para actualizar compras.
        </Text>
      )}
    </View>
  );

  const cart = (
    <Cart
      // Con el tema: los datos y los botones de la compra (del tema) se leen
      // en modo oscuro. Antes el carrito era blanco fijo y quedaban crema
      // sobre blanco.
      themed
      title="Productos"
      count={lineCount}
      items={purchase.cartItems}
      onRemoveItem={purchase.handleRemoveProduct}
      onItemChange={purchase.handleItemChange}
      canEditItems={purchase.canEditLines}
      canRemoveItems={purchase.canRemoveLines}
      canEditPrice={purchase.canEditLines}
      onPriceChange={(itemId, price) => purchase.handleItemChange(itemId, "price", price)}
      showFooter={false}
      // Los productos y los datos se desplazan juntos; en el celular también
      // el total y los botones (con el teclado abierto no queda espacio para
      // tenerlos fijos).
      scrollAll
    >
      {(canConfirm || isMobile) && (
        <View style={styles.extras}>
          {/* Sin permiso para confirmar los datos no se guardarían. */}
          {canConfirm && purchaseData}
          {isMobile && checkout}
        </View>
      )}
    </Cart>
  );

  // Último error del carrito o de la confirmación: en el celular los avisos
  // de la app quedan detrás del modal.
  const notice = confirmError
    ? { text: confirmError, tone: "error" as const }
    : purchase.notice;
  const noticeColor = notice?.tone === "warning" ? colors.warningStrong : colors.errorStrong;
  const noticeBanner = notice ? (
    <View style={[styles.notice, notice.tone === "warning" ? styles.noticeWarning : styles.noticeError]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={noticeColor} />
      <Text style={[styles.noticeText, { color: noticeColor }]}>{notice.text}</Text>
      <Pressable onPress={dismissNotices} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar aviso">
        <MaterialCommunityIcons name="close" size={16} color={noticeColor} />
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <AppBar
        title={title}
        showSearchButton={false}
        onBack={() => goBack("/(tabs)/home/purchases")}
        centerContent={isMobile ? undefined : headerTools}
        rightActions={
          isMobile ? (
            <CartHeaderButton count={lineCount} onPress={() => setCartVisible(true)} />
          ) : undefined
        }
      />
      <View style={styles.container}>
        <View style={styles.catalogSection}>
          {isMobile && supplierBar}
          <View style={styles.catalogBody}>{catalog}</View>

          {/* En el celular la compra se abre desde aquí (o desde el carrito del
              AppBar). Mientras se registra, el modal ya se cerró: aquí se ve. */}
          {isMobile && (
            <View style={styles.bottomBar}>
              <Text style={styles.bottomSummary} numberOfLines={1}>
                {sending === "receive"
                  ? "Registrando la compra…"
                  : sending === "order"
                    ? "Guardando el pedido…"
                    : lineCount === 0
                      ? "Sin productos"
                      : `${plural(lineCount, "producto", "productos")} · ${formatMoney(purchase.total)}`}
              </Text>
              <Button
                mode="contained"
                icon="clipboard-list-outline"
                onPress={() => setCartVisible(true)}
                loading={!!sending}
                disabled={!!sending}
              >
                Ver compra
              </Button>
            </View>
          )}
        </View>

        {/* La compra al lado del catálogo — escritorio y tableta */}
        {!isMobile && (
          <View style={styles.cartSection}>
            {cart}
            {!keyboardOpen && <View style={styles.checkoutPinned}>{checkout}</View>}
          </View>
        )}

        {/* La compra en un modal — celular */}
        {isMobile && (
          <Modal
            visible={cartVisible}
            animationType="slide"
            // Lo que falló antes de abrirla ya se vio en el aviso de la app.
            onShow={purchase.dismissNotice}
            // Mientras se confirma la compra no se cierra.
            onRequestClose={() => {
              if (!submitting) closeCart();
            }}
          >
            {/* Los menús (unidad, método de pago) se abren dentro del modal:
                en el Portal de la app quedaban detrás. */}
            <Portal.Host>
              <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <IconButton
                    icon="close"
                    iconColor={colors.text}
                    onPress={closeCart}
                    disabled={submitting}
                    accessibilityLabel="Cerrar"
                  />
                </View>
                {noticeBanner}
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

        {canListSuppliers && (
          <SupplierPicker
            visible={pickerVisible}
            onDismiss={() => setPickerVisible(false)}
            suppliers={suppliers.list}
            loading={suppliers.loading}
            error={suppliers.error}
            onRetry={suppliers.retry}
            selectedId={purchase.supplierId}
            hasLines={lineCount > 0}
            onSelect={selectSupplier}
          />
        )}
      </View>
    </View>
  );
}
