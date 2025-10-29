import axios from "@/utils/axios";

export interface PurchaseStatus {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface Purchase {
  id: number;
  status: string;
  purchase_number: string;
  purchase_date: string;
  location_id: number;
  supplier_id: number;
  company_id: number;
  comments?: string;
  // Agregar más campos según sea necesario
}

class PurchaseService {
  /**
   * Avanzar al siguiente estado
   */
  async advance(purchaseId: number) {
    const response = await axios.post(`/purchases/${purchaseId}/advance`);
    return response.data;
  }

  /**
   * Retroceder al estado anterior
   */
  async revert(purchaseId: number) {
    const response = await axios.post(`/purchases/${purchaseId}/revert`);
    return response.data;
  }

  /**
   * Transicionar a un estado específico
   */
  async transitionTo(purchaseId: number, status: string) {
    const response = await axios.post(`/purchases/${purchaseId}/transition`, {
      status,
    });
    return response.data;
  }

  /**
   * Obtener información de estados disponibles
   */
  async getStatusInfo(): Promise<PurchaseStatus[]> {
    const response = await axios.get("/purchases/status/info");
    return response.data.data;
  }

  /**
   * Obtener una compra específica
   */
  async getPurchase(purchaseId: number): Promise<Purchase> {
    const response = await axios.get(`/purchases/${purchaseId}`);
    return response.data.data;
  }

  /**
   * Verificar si una compra puede editarse
   */
  canEdit(purchase: Purchase): boolean {
    return purchase.status === "draft";
  }

  /**
   * Verificar si una compra puede avanzar de estado
   */
  canAdvance(purchase: Purchase): boolean {
    const flowOrder = ["draft", "ordered", "in_transit", "received"];
    const currentIndex = flowOrder.indexOf(purchase.status);
    return currentIndex >= 0 && currentIndex < flowOrder.length - 1;
  }

  /**
   * Verificar si una compra puede retroceder de estado
   */
  canRevert(purchase: Purchase): boolean {
    const flowOrder = ["draft", "ordered", "in_transit", "received"];
    const currentIndex = flowOrder.indexOf(purchase.status);
    // No puede retroceder desde recibido (afecta stock)
    return currentIndex > 0 && purchase.status !== "received";
  }

  /**
   * Obtener el siguiente estado posible
   */
  getNextStatus(currentStatus: string): string | null {
    const transitions = {
      draft: "ordered",
      ordered: "in_transit",
      in_transit: "received",
      received: null,
    };
    return transitions[currentStatus as keyof typeof transitions] || null;
  }

  /**
   * Obtener el estado anterior posible
   */
  getPreviousStatus(currentStatus: string): string | null {
    const transitions = {
      draft: null,
      ordered: "draft",
      in_transit: "ordered",
      received: "in_transit",
    };
    return transitions[currentStatus as keyof typeof transitions] || null;
  }

  /**
   * Obtener el label de un estado
   */
  getStatusLabel(status: string): string {
    const labels = {
      draft: "Borrador",
      ordered: "Pedido",
      in_transit: "En Transporte",
      received: "Recibido",
    };
    return labels[status as keyof typeof labels] || status;
  }

  /**
   * Obtener el icono de un estado
   */
  getStatusIcon(status: string): string {
    const icons = {
      draft: "📝",
      ordered: "📋",
      in_transit: "🚚",
      received: "📦",
    };
    return icons[status as keyof typeof icons] || "📄";
  }

  /**
   * Verificar si un estado afecta el stock
   */
  affectsStock(status: string): boolean {
    return status === "received";
  }
}

export default new PurchaseService();
