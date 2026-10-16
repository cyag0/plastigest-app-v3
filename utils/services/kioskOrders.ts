import axiosClient from "../axios";

/**
 * Pedidos del kiosko de autoservicio, del lado del personal: el cliente arma
 * su pedido en el kiosko y paga en caja. En el punto de venta el cajero los
 * ve en «Kiosko», los trae al carrito y los cobra como cualquier venta (el
 * cobro sigue siendo Services.pos.sale, con kiosk_order_id), o los cancela si
 * el cliente se fue sin pagar.
 */

/** Renglón del pedido, con el precio del catálogo al momento de pedirlo. */
export interface KioskOrderItem {
  product_id: number;
  package_id: number | null;
  name: string;
  /** Presentación: la unidad ("Litro") o el paquete ("Paquete 12"). */
  option?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

/** Pedido del kiosko pendiente de cobro (GET pos/kiosk-orders). */
export interface KioskOrder {
  id: number;
  /** Número corto que el cliente dice en caja ("Tu número es 7"); por sucursal y día. */
  ticket_number: number | null;
  order_number: string;
  customer_name: string | null;
  created_at: string;
  /** Si nadie lo cobra, a esta hora se cancela solo y libera lo apartado. */
  expires_at?: string | null;
  total: number;
  items: KioskOrderItem[];
}

/** "Pedido del kiosko 7" (sin número si el pedido no lo trae). */
export function kioskOrderLabel(ticketNumber: number | null | undefined): string {
  return ticketNumber != null ? `Pedido del kiosko ${ticketNumber}` : "Pedido del kiosko";
}

export const kioskOrders = {
  /**
   * Pendientes de la sucursal actual, del más viejo al más nuevo. Se consulta
   * cada pocos segundos con el punto de venta abierto: sin aviso global si
   * falla (el panel muestra su propio error).
   */
  async list(): Promise<KioskOrder[]> {
    const response = await axiosClient.get("/auth/admin/pos/kiosk-orders", { silent: true });
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * El cliente se fue sin pagar: cancela el pedido y libera lo apartado.
   * 422 `kiosk_order_unavailable` si ya se cobró o se canceló.
   */
  async cancel(id: number) {
    const response = await axiosClient.post(`/auth/admin/pos/kiosk-orders/${id}/cancel`, undefined, {
      silent: true,
    });
    return response.data as { data: { id: number; status: "cancelled" } };
  },
};

export default kioskOrders;
