import { LIST_TEXT_INSET, ListGroup } from "@/components/App/ListGroup";
import { kioskItemName } from "@/components/Pos/kioskOrderCart";
import { useTheme } from "@/contexts/ThemeContext";
import { formatMoney, type PosKioskLink } from "@/hooks/usePosCart";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatQuantity } from "@/utils/format";
import { kioskOrderLabel, type KioskOrder } from "@/utils/services/kioskOrders";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, IconButton, Text } from "react-native-paper";

/**
 * Punto de venta › Kiosko: los pedidos que los clientes enviaron desde el
 * kiosko y que pagan en caja. El cajero abre uno, lo trae al carrito con
 * «Cobrar» y lo cobra como cualquier venta; si el cliente se fue sin pagar, lo
 * cancela y lo apartado vuelve a estar disponible (si nadie hace nada, el
 * pedido vence solo).
 *
 * Es una ventana (Modal) como las demás del POS: las confirmaciones y los
 * avisos van dentro de ella, porque los diálogos y avisos globales de la app
 * quedan debajo de un Modal.
 */

export interface KioskOrdersPanelProps {
  visible: boolean;
  orders: KioskOrder[];
  loading: boolean;
  /** Ya llegó al menos una lista (antes, un error tapa todo). */
  loaded: boolean;
  error: string | null;
  /** Pedido que ya está en el carrito. */
  linkedOrderId: number | null;
  /** Renglones del carrito: si hay, «Cobrar» pregunta si reemplazarlos. */
  cartLines: number;
  onReload: () => void;
  onClose: () => void;
  /** Trae el pedido al carrito (y cierra la ventana); devuelve un aviso si no se pudo. */
  onCharge: (order: KioskOrder) => string | null;
  /** Cancela el pedido; devuelve el error o null si quedó cancelado. */
  onCancel: (order: KioskOrder) => Promise<string | null>;
}

type Confirm = { id: number; kind: "replace" | "cancel" };
type Notice = { text: string; tone: "error" | "info" };

/** "Pedido 7" (o el folio, si el pedido no trae número). */
const orderTitle = (order: KioskOrder) =>
  order.ticket_number != null ? `Pedido ${order.ticket_number}` : `Pedido ${order.order_number}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "ahora", "hace 3 min", "hace 2 h". */
function timeAgo(value: string, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h`;
}

export default function KioskOrdersPanel({
  visible,
  orders,
  loading,
  loaded,
  error,
  linkedOrderId,
  cartLines,
  onReload,
  onClose,
  onCharge,
  onCancel,
}: KioskOrdersPanelProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Al abrir: todo cerrado y, si hay un solo pedido, ya abierto.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setConfirm(null);
      setNotice(null);
      setExpandedId(orders.length === 1 ? orders[0].id : null);
    }
    wasVisible.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id: number) => {
    setConfirm(null);
    setExpandedId((current) => (current === id ? null : id));
  };

  const load = (order: KioskOrder) => {
    setConfirm(null);
    const problem = onCharge(order);
    if (problem) setNotice({ text: problem, tone: "error" });
  };

  const charge = (order: KioskOrder) => {
    setNotice(null);
    if (order.id === linkedOrderId) {
      onClose();
      return;
    }
    if (cartLines > 0) {
      setConfirm({ id: order.id, kind: "replace" });
      return;
    }
    load(order);
  };

  const cancel = async (order: KioskOrder) => {
    setCancellingId(order.id);
    const problem = await onCancel(order);
    setCancellingId(null);
    setConfirm(null);
    setNotice(problem ? { text: problem, tone: "error" } : { text: `${orderTitle(order)} cancelado.`, tone: "info" });
  };

  const renderBody = () => {
    if (!loaded && error) {
      return (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          <Button mode="outlined" icon="refresh" onPress={onReload} loading={loading} disabled={loading}>
            Reintentar
          </Button>
        </View>
      );
    }
    if (!loaded) {
      return (
        <View style={styles.state}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Cargando pedidos…</Text>
        </View>
      );
    }
    if (orders.length === 0) {
      return (
        <View style={styles.state}>
          <MaterialCommunityIcons name="tablet-dashboard" size={36} color={colors.textMuted} />
          <Text style={styles.stateTitle}>No hay pedidos pendientes</Text>
          <Text style={styles.stateText}>
            Cuando un cliente envíe su pedido desde el kiosko, aparecerá aquí con su número para cobrarlo.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!!error && <Text style={styles.staleList}>No se pudo actualizar la lista: puede no estar al día.</Text>}
        <ListGroup inset={LIST_TEXT_INSET}>
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            const linked = order.id === linkedOrderId;
            const cancelling = cancellingId === order.id;
            const items = order.items ?? [];
            const name = order.customer_name?.trim();
            const meta = [timeAgo(order.created_at), plural(items.length, "producto", "productos"), linked ? "En el carrito" : null]
              .filter(Boolean)
              .join(" · ");
            const confirming = confirm?.id === order.id ? confirm.kind : null;

            return (
              <View key={order.id}>
                <Pressable
                  testID={`pos-kiosk-order-${order.id}`}
                  onPress={() => toggle(order.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${orderTitle(order)}${name ? `, ${name}` : ""}, ${formatMoney(order.total)}`}
                  style={({ pressed }) => [styles.row, (pressed || expanded) && styles.rowActive]}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {orderTitle(order)}
                      {name ? <Text style={styles.rowName}>{` · ${name}`}</Text> : null}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                  <Text style={styles.rowTotal}>{formatMoney(order.total)}</Text>
                  <MaterialCommunityIcons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>

                {expanded && (
                  <View style={styles.detail}>
                    {items.map((line, index) => (
                      <View key={`${line.product_id}-${line.package_id ?? "u"}-${index}`} style={styles.line}>
                        <Text style={styles.lineQty}>{formatQuantity(line.quantity)} ×</Text>
                        <Text style={styles.lineName} numberOfLines={2}>
                          {kioskItemName(line)}
                        </Text>
                        <Text style={styles.lineTotal}>{formatMoney(line.line_total)}</Text>
                      </View>
                    ))}

                    {confirming ? (
                      <View style={styles.confirm}>
                        <Text style={styles.confirmText}>
                          {confirming === "cancel"
                            ? `¿El cliente se fue sin pagar? Se cancela el pedido y sus productos vuelven a estar disponibles.${
                                linked ? " También se vacía el carrito." : ""
                              }`
                            : `El carrito tiene ${plural(cartLines, "producto", "productos")} sin cobrar. ¿Reemplazarlo con este pedido?`}
                        </Text>
                        <View style={styles.actions}>
                          <Button mode="outlined" onPress={() => setConfirm(null)} disabled={cancelling}>
                            Volver
                          </Button>
                          {confirming === "cancel" ? (
                            <Button
                              testID={`pos-kiosk-cancel-confirm-${order.id}`}
                              mode="contained"
                              buttonColor={colors.error}
                              textColor={colors.textInverse}
                              onPress={() => cancel(order)}
                              loading={cancelling}
                              disabled={cancelling}
                            >
                              Cancelar pedido
                            </Button>
                          ) : (
                            <Button
                              testID={`pos-kiosk-replace-confirm-${order.id}`}
                              mode="contained"
                              onPress={() => load(order)}
                            >
                              Reemplazar carrito
                            </Button>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.actions}>
                        <Button
                          testID={`pos-kiosk-cancel-${order.id}`}
                          mode="text"
                          textColor={colors.error}
                          onPress={() => {
                            setNotice(null);
                            setConfirm({ id: order.id, kind: "cancel" });
                          }}
                        >
                          Cancelar pedido
                        </Button>
                        <Button
                          testID={`pos-kiosk-charge-${order.id}`}
                          mode="contained"
                          icon={linked ? "cart-outline" : "cart-arrow-down"}
                          onPress={() => charge(order)}
                        >
                          {linked ? "Ver en el carrito" : "Cobrar"}
                        </Button>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ListGroup>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              Pedidos del kiosko
              {loaded && orders.length > 0 ? <Text style={styles.count}>{`  ${orders.length}`}</Text> : null}
            </Text>
            {loading && loaded ? <ActivityIndicator size={16} /> : null}
            <IconButton icon="refresh" size={20} onPress={onReload} disabled={loading} accessibilityLabel="Actualizar" />
            <IconButton icon="close" size={20} onPress={onClose} accessibilityLabel="Cerrar" />
          </View>
          {!!notice && (
            <Text style={[styles.notice, notice.tone === "error" && styles.noticeError]}>{notice.text}</Text>
          )}
          {renderBody()}
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────────────── Botón del encabezado del POS ───────────────────────── */

/** "Kiosko" con cuántos pedidos esperan cobro. Va sobre la barra de color del POS. */
export function KioskOrdersButton({ count, compact, onPress }: { count: number; compact?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID="pos-kiosk-button"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Pedidos del kiosko: ${count} por cobrar` : "Pedidos del kiosko"}
      hitSlop={6}
      style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
    >
      <MaterialCommunityIcons name="tablet-dashboard" size={18} color={colors.primary} />
      {!compact && <Text style={styles.headerButtonLabel}>Kiosko</Text>}
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ───────────────────────── Etiqueta del carrito ligado ───────────────────────── */

/**
 * "Pedido del kiosko 7 · Juan" sobre el carrito que se trajo de un pedido,
 * con «Desligar» para cobrarlo como venta normal. `stale`: el pedido ya no
 * está pendiente (se cobró en otra caja, se canceló o venció).
 */
export function KioskLinkTag({
  link,
  stale,
  onUnlink,
}: {
  link: PosKioskLink | null;
  stale: boolean;
  onUnlink: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!link) return null;
  const title = [kioskOrderLabel(link.ticketNumber), link.customerName].filter(Boolean).join(" · ");
  return (
    <View testID="pos-kiosk-link-tag" style={styles.tag}>
      <MaterialCommunityIcons
        name={stale ? "alert-circle-outline" : "link-variant"}
        size={18}
        color={stale ? colors.warning : colors.primary}
      />
      <View style={styles.tagBody}>
        <Text style={styles.tagTitle} numberOfLines={1}>
          {title}
        </Text>
        {stale && (
          <Text style={styles.tagWarning}>Ese pedido ya se cobró o se canceló. Desliga para cobrarlo como venta normal.</Text>
        )}
      </View>
      <Button testID="pos-kiosk-unlink" mode="text" compact icon="link-variant-off" textColor={colors.primary} onPress={onUnlink}>
        Desligar
      </Button>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 18,
    paddingRight: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: c.text },
  count: { fontWeight: "500", color: c.textMuted },
  notice: { paddingHorizontal: 18, paddingTop: 12, fontSize: 14, lineHeight: 20, color: c.textSecondary },
  noticeError: { color: c.error },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { padding: 14, gap: 10 },
  staleList: { fontSize: 13, color: c.warning },
  state: { alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 32 },
  stateTitle: { fontSize: 16, fontWeight: "600", color: c.text, textAlign: "center" },
  stateText: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: "center" },

  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowActive: { backgroundColor: c.surfaceMuted },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: c.text },
  rowName: { fontWeight: "400", color: c.text },
  rowMeta: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 2 },
  rowTotal: { fontSize: 15, fontWeight: "700", color: c.text },
  detail: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12, gap: 6 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lineQty: { minWidth: 36, fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: "right" },
  lineName: { flex: 1, fontSize: 14, lineHeight: 20, color: c.text },
  lineTotal: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  confirm: { marginTop: 8, gap: 4 },
  confirmText: { fontSize: 14, lineHeight: 20, color: c.text },
  actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 8 },

  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    marginRight: 6,
    borderRadius: 9999,
    backgroundColor: c.surface,
  },
  headerButtonPressed: { opacity: 0.85 },
  headerButtonLabel: { fontSize: 14, fontWeight: "600", color: c.primary },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primary,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: c.primaryForeground },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
    backgroundColor: c.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  tagBody: { flex: 1, minWidth: 0, paddingVertical: 4 },
  tagTitle: { fontSize: 14, fontWeight: "600", color: c.text },
  tagWarning: { fontSize: 12, lineHeight: 16, color: c.warning, marginTop: 2 },
}));
