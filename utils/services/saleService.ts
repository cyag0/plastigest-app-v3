import axios from "@/utils/axios";

export interface SaleStatus {
  value: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface SaleDetail {
  id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_image?: any;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: number;
  status: string;
  status_label: string;
  status_color: string;
  sale_number: string;
  sale_date: string;
  location_id: number;
  location_name?: string;
  total_amount: number;
  payment_method: "efectivo" | "tarjeta" | "transferencia";
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  received_amount?: number;
  change_amount?: number;
  notes?: string;
  comments?: string;
  details?: SaleDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalePayload {
  location_id: number;
  movement_date: string;
  document_number?: string;
  payment_method: "efectivo" | "tarjeta" | "transferencia";
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  received_amount?: number;
  notes?: string;
  comments?: string;
  details: {
    product_id: number;
    quantity: number;
    unit_price: number;
  }[];
}

class SaleService {
  /**
   * Crear una nueva venta
   */
  async create(data: CreateSalePayload) {
    const response = await axios.post("/sales", data);
    return response.data;
  }

  /**
   * Obtener una venta específica
   */
  async getSale(saleId: number): Promise<Sale> {
    const response = await axios.get(`/sales/${saleId}`);
    return response.data.data;
  }

  /**
   * Actualizar una venta
   */
  async update(saleId: number, data: Partial<CreateSalePayload>) {
    const response = await axios.put(`/sales/${saleId}`, data);
    return response.data;
  }

  /**
   * Eliminar una venta (solo en borrador)
   */
  async delete(saleId: number) {
    const response = await axios.delete(`/sales/${saleId}`);
    return response.data;
  }

  /**
   * Avanzar al siguiente estado
   */
  async advanceStatus(saleId: number) {
    const response = await axios.post(`/sales/${saleId}/advance-status`);
    return response.data;
  }

  /**
   * Retroceder al estado anterior
   */
  async revertStatus(saleId: number) {
    const response = await axios.post(`/sales/${saleId}/revert-status`);
    return response.data;
  }

  /**
   * Cancelar venta
   */
  async cancel(saleId: number) {
    const response = await axios.post(`/sales/${saleId}/cancel`);
    return response.data;
  }

  /**
   * Obtener estadísticas de ventas
   */
  async stats(params?: {
    location_id?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await axios.get("/sales/stats", { params });
    return response.data;
  }

  /**
   * Verificar si una venta puede editarse
   */
  canEdit(sale: Sale): boolean {
    return sale.status === "draft";
  }

  /**
   * Verificar si una venta puede avanzar de estado
   */
  canAdvance(sale: Sale): boolean {
    const flowOrder = ["draft", "processed", "completed"];
    const currentIndex = flowOrder.indexOf(sale.status);
    return currentIndex >= 0 && currentIndex < flowOrder.length - 1;
  }

  /**
   * Verificar si una venta puede retroceder de estado
   */
  canRevert(sale: Sale): boolean {
    const flowOrder = ["draft", "processed", "completed"];
    const currentIndex = flowOrder.indexOf(sale.status);
    // Puede retroceder de processed a draft, o de completed a processed
    return currentIndex > 0 && sale.status !== "cancelled";
  }

  /**
   * Verificar si una venta puede cancelarse
   */
  canCancel(sale: Sale): boolean {
    return sale.status !== "cancelled" && sale.status !== "completed";
  }

  /**
   * Obtener el siguiente estado posible
   */
  getNextStatus(currentStatus: string): string | null {
    const transitions = {
      draft: "processed",
      processed: "completed",
      completed: null,
      cancelled: null,
    };
    return transitions[currentStatus] || null;
  }

  /**
   * Obtener el estado anterior posible
   */
  getPreviousStatus(currentStatus: string): string | null {
    const transitions = {
      draft: null,
      processed: "draft",
      completed: "processed",
      cancelled: null,
    };
    return transitions[currentStatus] || null;
  }

  /**
   * Obtener el ícono del estado
   */
  getStatusIcon(status: string): string {
    const icons = {
      draft: "file-document-outline",
      processed: "clock-check-outline",
      completed: "check-circle",
      cancelled: "close-circle",
    };
    return icons[status] || "help-circle";
  }

  /**
   * Obtener el color del estado
   */
  getStatusColor(status: string): string {
    const colors = {
      draft: "#6c757d", // gray
      processed: "#0d6efd", // blue
      completed: "#28a745", // green
      cancelled: "#dc3545", // red
    };
    return colors[status] || "#6c757d";
  }
}

export default new SaleService();
