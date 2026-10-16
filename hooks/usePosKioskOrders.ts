import type { KioskOrdersPanelProps } from "@/components/Pos/KioskOrdersPanel";
import { planKioskCart } from "@/components/Pos/kioskOrderCart";
import { apiErrorCode, apiErrorMessage, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import { useAlerts } from "@/hooks/useAlerts";
import { formatMoney, type usePosCart } from "@/hooks/usePosCart";
import kioskOrdersApi, { kioskOrderLabel, type KioskOrder } from "@/utils/services/kioskOrders";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

type Item = App.Entities.PosCatalogItem;
type PosCart = ReturnType<typeof usePosCart>;

/** Con el punto de venta a la vista, la lista se vuelve a pedir cada 20 s. */
const POLL_MS = 20 * 1000;

/**
 * Pedidos del kiosko en el punto de venta (botón «Kiosko»): la lista de
 * pendientes de la sucursal, que se consulta al entrar, cada 20 s y al volver
 * a la app, y lo que hace el cajero con ellos:
 * - «Cobrar» trae el pedido al carrito con los ítems del catálogo del POS y lo
 *   deja ligado (la venta lleva kiosk_order_id);
 * - «Cancelar pedido» lo cancela (el cliente se fue sin pagar) y libera lo
 *   apartado.
 *
 * Devuelve las props del panel y de la etiqueta del carrito ligado para que
 * la pantalla del POS solo las pase.
 */
export function usePosKioskOrders(cart: PosCart, catalogItems: Item[]) {
  const alerts = useAlerts();
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  /**
   * Pedido ligado que el servidor rechazó al cobrar (kiosk_order_unavailable),
   * con su mensaje: ya se cobró o se canceló, es de otra sucursal o ya no existe.
   */
  const [unavailable, setUnavailable] = useState<{ id: number; message: string } | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Una lista que se pidió antes de cobrar o cancelar un pedido llega vieja:
  // se descarta para que el pedido no reaparezca hasta la siguiente consulta.
  const generationRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const requestSeqRef = useRef(0);

  const reload = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const generation = generationRef.current;
    const seq = ++requestSeqRef.current;
    const request = (async () => {
      setLoading(true);
      try {
        const next = await kioskOrdersApi.list();
        if (!mountedRef.current || generation !== generationRef.current) return;
        setOrders(next);
        setLoaded(true);
        setError(null);
      } catch (e) {
        if (!mountedRef.current || generation !== generationRef.current) return;
        setError(apiErrorMessage(e, "No se pudieron cargar los pedidos del kiosko."));
      } finally {
        // Solo la consulta más reciente suelta el candado y el "cargando".
        if (seq === requestSeqRef.current) {
          inFlightRef.current = null;
          if (mountedRef.current) setLoading(false);
        }
      }
    })();
    inFlightRef.current = request;
    return request;
  }, []);

  /** Un pedido dejó de estar pendiente (se cobró o se canceló): fuera de la lista ya, y se vuelve a pedir. */
  const drop = useCallback(
    (id: number) => {
      generationRef.current += 1;
      inFlightRef.current = null;
      setOrders((prev) => prev.filter((o) => o.id !== id));
      reload();
    },
    [reload],
  );

  // Con el punto de venta a la vista: al entrar y cada 20 s (si la app o la
  // pestaña están al frente).
  useFocusEffect(
    useCallback(() => {
      reload();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") reload();
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [reload]),
  );

  // Al volver a la app (o a la pestaña en web).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    return () => subscription.remove();
  }, [reload]);

  const linkedId = cart.kioskOrder?.id ?? null;
  // El pedido ligado ya no se puede cobrar: el servidor lo rechazó (con su
  // mensaje) o ya no está entre los pendientes (lo cobraron en otra caja, lo
  // cancelaron o venció). Cobrar con él daría kiosk_order_unavailable.
  const staleMessage =
    linkedId === null
      ? null
      : unavailable?.id === linkedId
        ? unavailable.message
        : loaded && !orders.some((o) => o.id === linkedId)
          ? "Ese pedido ya no está pendiente: se cobró, se canceló o venció. Si ya lo cobraron en otra caja, no lo cobres otra vez; si no, desliga para cobrarlo como venta normal."
          : null;

  const charge = (order: KioskOrder): string | null => {
    if (cart.requestUnknown) return "Hay un cobro sin confirmar: verifícalo antes de traer un pedido.";
    if (catalogItems.length === 0) return "Todavía no se cargan los productos: inténtalo en un momento.";
    const plan = planKioskCart(order, catalogItems);
    if (plan.entries.length === 0) {
      return "Ninguno de sus productos se vende ya en esta sucursal: no hay nada que cobrar.";
    }
    cart.loadKioskOrder(plan.link, plan.entries);
    setUnavailable(null);
    setPanelOpen(false);

    const notes: string[] = [];
    if (plan.missing.length > 0) {
      notes.push(`No se cargó porque ya no se vende aquí: ${plan.missing.join(", ")}.`);
    }
    if (plan.priceChanges.length > 0) {
      notes.push(
        `Cambió el precio: ${plan.priceChanges
          .map((c) => `${c.name} ${formatMoney(c.from)} → ${formatMoney(c.to)}`)
          .join("; ")}.`,
      );
    }
    if (notes.length > 0) alerts.warning(`${kioskOrderLabel(order.ticket_number)}: ${notes.join(" ")}`);
    return null;
  };

  const cancel = async (order: KioskOrder): Promise<string | null> => {
    try {
      await kioskOrdersApi.cancel(order.id);
    } catch (e: any) {
      // Ya no está pendiente (o ya no existe): sale de la lista con el aviso.
      if (apiErrorCode(e) === SALE_ERROR_CODES.kioskOrderUnavailable || e?.response?.status === 404) {
        drop(order.id);
        return apiErrorMessage(e, "Ese pedido ya se cobró o se canceló.");
      }
      return apiErrorMessage(e, "No se pudo cancelar el pedido.");
    }
    drop(order.id);
    // Lo del carrito era ese pedido y el cliente se fue: no queda nada que cobrar.
    if (cart.getKioskOrder()?.id === order.id && !cart.requestUnknown) cart.clear();
    return null;
  };

  /** Desligar: los renglones se quedan en el carrito y se cobran como venta normal. */
  const unlink = () => {
    const link = cart.getKioskOrder();
    if (!link) return;
    cart.unlinkKioskOrder();
    if (!staleMessage) {
      alerts.info(`Se desligó el ${kioskOrderLabel(link.ticketNumber).toLowerCase()}: sigue pendiente en «Kiosko».`);
    }
  };

  /**
   * El cobro se rechazó con kiosk_order_unavailable: la etiqueta lo marca y
   * ofrece desligar. `message`: el del servidor (ya se cobró o se canceló, es
   * de otra sucursal o ya no existe). Como error de la pantalla: así no sale
   * encima el aviso global del mismo rechazo, sin la indicación.
   */
  const markLinkedUnavailable = (message: string, reason?: string) => {
    // Si ya se cobró (en otra caja) no se sugiere cobrarlo como venta normal:
    // sería cobrarle dos veces al cliente.
    const hint =
      reason === "charged"
        ? "Ya se cobró en otra caja: no lo cobres otra vez. Vacía el carrito."
        : "Desliga el carrito para cobrar estos productos como una venta normal.";
    const text = `${message} ${hint}`;
    const link = cart.getKioskOrder();
    if (link) {
      setUnavailable({ id: link.id, message: text });
      drop(link.id);
    }
    alerts.error(text);
  };

  /** Venta registrada: su pedido del kiosko ya no está pendiente. Llamar antes de vaciar el carrito. */
  const saleCharged = (sale: App.Entities.PosSaleResult) => {
    const id = sale.kiosk_order?.id ?? cart.getKioskOrder()?.id;
    if (id) drop(id);
  };

  const panelProps: KioskOrdersPanelProps = {
    visible: panelOpen,
    orders,
    loading,
    loaded,
    error,
    linkedOrderId: linkedId,
    cartLines: cart.lines.length,
    onReload: () => {
      reload();
    },
    onClose: () => setPanelOpen(false),
    onCharge: charge,
    onCancel: cancel,
  };

  return {
    orders,
    panelOpen,
    openPanel: () => setPanelOpen(true),
    reload,
    markLinkedUnavailable,
    saleCharged,
    panelProps,
    tagProps: { link: cart.kioskOrder, staleMessage, onUnlink: unlink },
  };
}
