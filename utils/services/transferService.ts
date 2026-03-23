import type { UploadedFile } from "@/components/Form/AppUpload";
import { default as apiClient, default as axiosClient } from "@/utils/axios";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { createCrudService, LaravelResponse } from "./crudService";

// Interfaces para Transferencias
export interface Location {
  id: number;
  name: string;
  address: string;
  is_main: boolean;
  company_id: number;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  sku: string;
  main_image?: {
    uri?: string;
    url?: string;
    path?: string;
  } | null;
  description?: string;
  unit: string;
  unit_id: number;
  category_id: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface TransferDetail {
  id: number;
  transfer_id: number;
  product_id: number;
  product: Product;
  quantity_requested: number;
  quantity_shipped?: number;
  quantity_received?: number;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  damage_report?: string;
  has_difference?: boolean;
  difference?: number;
  available_stock?: number;
}

export interface TransferShipment {
  id: number;
  transfer_detail_id: number;
  product_id: number;
  product: Product;
  quantity_shipped: number;
  quantity_received?: number;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  damage_report?: string;
}

export interface TransferGeneratedAdjustment {
  id: number;
  reason?: "loss" | "damage" | string;
  reason_label?: string;
  product_id?: number;
  product_name?: string;
  quantity?: number;
  unit?: {
    id?: number;
    name?: string;
    abbreviation?: string;
  } | null;
  notes?: string;
  applied_at?: string;
  content?: {
    adjustment_comment?: string;
    evidence_files?: Array<{
      name?: string;
      uri?: string;
      url?: string;
      path?: string;
    }>;
    [key: string]: any;
  };
}

export interface ShippingEvidence {
  type: "photo" | "document" | "signature";
  url: string;
  description?: string;
}

export interface InventoryTransfer {
  content?: {
    current_step: number;
    ended_at_step?: number | null;
    flow_state?: "in_progress" | "completed" | "failed";
    step_1?: {
      status?: "pending" | "approved" | "rejected";
      created_at?: string;
      requested_by?: number;
      approved_at?: string;
      approved_by?: number;
      rejected_at?: string;
      rejected_by?: number;
      reason?: string;
      items?: Array<{
        detail_id: number;
        quantity_requested: number;
      }>;
    } | null;
    step_2?: {
      status?: "pending" | "shipped" | "completed" | "failed" | "skipped";
      shipped_at?: string;
      shipped_by?: number;
      items_count?: number;
      evidence_files?: Array<{
        url?: string;
        name?: string;
        path?: string;
      }>;
    } | null;
    step_3?: {
      status?: "pending" | "received" | "completed" | "failed" | "skipped";
      received_at?: string;
      received_by?: number;
      items_count?: number;
      evidence_files?: Array<{
        url?: string;
        name?: string;
        path?: string;
      }>;
    } | null;
    step_4?: {
      status?: "pending" | "completed" | "failed";
      closed_at?: string;
      closed_by?: number;
      closed_reason?: string;
    } | null;
    progress?: {
      step_1?: {
        visited?: boolean;
        result?: "pending" | "completed" | "failed" | "skipped";
        ended_here?: boolean;
      };
      step_2?: {
        visited?: boolean;
        result?: "pending" | "completed" | "failed" | "skipped";
        ended_here?: boolean;
      };
      step_3?: {
        visited?: boolean;
        result?: "pending" | "completed" | "failed" | "skipped";
        ended_here?: boolean;
      };
      step_4?: {
        visited?: boolean;
        result?: "pending" | "completed" | "failed" | "skipped";
        ended_here?: boolean;
      };
    };
  };
  id: number;
  transfer_number?: string;
  company_id: number;
  from_location_id: number;
  to_location_id: number;
  from_location: Location;
  to_location: Location;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "in_transit"
    | "completed"
    | "cancelled";
  status_label: string;
  status_color: string;
  current_step?: number;
  requested_by?: number;
  requested_by_user_id: number;
  requested_by_user: User;
  requested_at: string;
  approved_by_user_id?: number;
  approved_by_user?: User;
  approved_at?: string;
  shipped_by_user_id?: number;
  shipped_by_user?: User;
  shipped_at?: string;
  received_by_user_id?: number;
  received_by_user?: User;
  received_at?: string;
  cancelled_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  notes?: string;
  // Nuevos campos para el flujo mejorado
  package_number?: string;
  package_count?: number;
  shipping_evidence?: any[];
  shipping_notes?: string;
  receiving_notes?: string;
  received_complete?: boolean;
  received_partial?: boolean;
  has_differences?: boolean;
  total_cost?: number;
  details?: TransferDetail[];
  shipments?: TransferShipment[];
  generated_adjustments?: TransferGeneratedAdjustment[];
  created_at: string;
  updated_at: string;
}

export interface ShipmentItem {
  transfer_detail_id: number;
  product_id: number;
  quantity_shipped: number;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface ShipmentData {
  shipments: ShipmentItem[];
  package_number?: string;
  shipping_evidence?: ShippingEvidence[];
}

export interface TransferShipStepItem {
  detail_id: number;
  quantity_shipped: number;
  notes?: string;
}

export interface TransferShipStepPayload {
  items: TransferShipStepItem[];
  shipping_notes?: string;
  evidence: UploadedFile[];
}

export interface ReceiptItem {
  shipment_id: number;
  quantity_received: number;
  damage_report?: string;
}

export interface ReceiptData {
  received: ReceiptItem[];
  received_complete: boolean;
  has_differences: boolean;
  difference_notes?: string;
}

export interface TransferReceiveStepItem {
  detail_id: number;
  quantity_received: number;
  adjustment_reason?: "loss" | "damage";
  adjustment_comment?: string;
  adjustment_notes?: string;
  adjustment_evidence?: UploadedFile[];
}

export interface TransferReceiveStepPayload {
  items: TransferReceiveStepItem[];
  receiving_notes?: string;
  evidence: UploadedFile[];
}

// Para compatibilidad con el código anterior
export interface Transfer extends InventoryTransfer {}

// Crear el servicio base
const baseService = createCrudService<InventoryTransfer>(
  "/auth/admin/inventory-transfers",
);

async function buildStepFormData(
  payload: TransferShipStepPayload | TransferReceiveStepPayload,
  notesField: "shipping_notes" | "receiving_notes",
): Promise<FormData> {
  const normalizedItems = payload.items.map((item) => {
    if ("quantity_shipped" in item) {
      return {
        detail_id: item.detail_id,
        quantity_shipped: item.quantity_shipped,
        ...(item.notes ? { notes: item.notes } : {}),
      };
    }

    return {
      detail_id: item.detail_id,
      quantity_received: item.quantity_received,
      ...(item.adjustment_reason
        ? { adjustment_reason: item.adjustment_reason }
        : {}),
      ...(item.adjustment_comment
        ? { adjustment_comment: item.adjustment_comment }
        : {}),
      ...(item.adjustment_notes
        ? { adjustment_notes: item.adjustment_notes }
        : {}),
      ...(item.adjustment_evidence && item.adjustment_evidence.length > 0
        ? {
            adjustment_evidence: item.adjustment_evidence.map((file, index) => ({
              uri: file.uri,
              name: file.name || `adjustment_${item.detail_id}_${index}.jpg`,
              type: file.type || "image/jpeg",
              ...(file.size ? { size: file.size } : {}),
            })),
          }
        : {}),
    };
  });

  const normalizedEvidence = (payload.evidence || []).map((file, index) => ({
    uri: file.uri,
    name: file.name || `evidence_${index}.jpg`,
    type: file.type || "image/jpeg",
    ...(file.size ? { size: file.size } : {}),
  }));

  const formPayload: Record<string, any> = {
    items: normalizedItems,
    evidence: normalizedEvidence,
  };

  const notesValue = (payload as any)[notesField];
  if (notesValue) {
    formPayload[notesField] = notesValue;
  }

  return objectToFormDataWithNestedInputsAsync(formPayload);
}

// Extender con métodos personalizados
const transferService = {
  ...baseService,

  // === ENDPOINTS DE LOS 4 MÓDULOS ===

  /**
   * Obtener peticiones (transferencias solicitadas desde mi ubicación)
   * Estados: ordered, in_transit
   */
  async getPetitions(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      "/auth/admin/inventory-transfers/petitions",
      { params },
    );
    return response.data.data;
  },

  /**
   * Obtener envíos (transferencias solicitadas completadas o rechazadas)
   * Estados: closed, rejected
   */
  async getShipments(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      "/auth/admin/inventory-transfers/shipments",
      { params },
    );
    return response.data.data;
  },

  /**
   * Obtener recepciones (transferencias que recibiré)
   * Estados: ordered, in_transit
   */
  async getReceipts(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      "/auth/admin/inventory-transfers/receipts",
      { params },
    );
    return response.data.data;
  },

  /**
   * Obtener transferencias (historial de transferencias recibidas)
   * Estados: closed, rejected
   */
  async getTransfers(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      "/auth/admin/inventory-transfers/transfers",
      { params },
    );
    return response.data.data;
  },

  // Sobrescribir el método index para manejar casos especiales
  async index(params?: any) {
    console.log("🔍 transferService.index called with params:", params);

    // Si hay filtros específicos de recibos, usar getReceipts
    if (params?.to_location_id || params?.mode === "receipts") {
      console.log("📦 Using getReceipts method");
      const receipts = await this.getReceipts(params);
      console.log("📦 getReceipts returned:", receipts.length, "items");
      return {
        data: {
          data: receipts,
          meta: { total: receipts.length },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }

    // Si hay filtros específicos de envíos, usar getShipments
    if (params?.from_location_id || params?.mode === "shipments") {
      console.log("🚛 Using getShipments method");
      const shipments = await this.getShipments(params);
      return {
        data: {
          data: shipments,
          meta: { total: shipments.length },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      };
    }

    // Usar el método base para otros casos
    console.log("🔧 Using base service index method");
    return await baseService.index(params);
  },

  // Obtener por ID (adaptado para devolver solo data)
  async getTransfer(id: number): Promise<InventoryTransfer> {
    const response = await baseService.show(id);
    return response.data.data;
  },

  // Alias para compatibilidad
  async getById(id: number): Promise<InventoryTransfer> {
    return this.getTransfer(id);
  },

  // === ACCIONES DE WORKFLOW ===

  // Aprobar transferencia
  async approve(id: number, data?: any): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/approve`,
      data || {},
    );
    return response.data.data;
  },

  // Rechazar transferencia
  async reject(id: number, reason: string): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/reject`,
      { rejection_reason: reason },
    );
    return response.data.data;
  },

  // Enviar transferencia
  async ship(
    id: number,
    data?: TransferShipStepPayload,
  ): Promise<InventoryTransfer> {
    if (!data) {
      const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
        `/auth/admin/inventory-transfers/${id}/ship`,
      );
      return response.data.data;
    }

    const formData = await buildStepFormData(data, "shipping_notes");
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/ship`,
      formData,
    );
    return response.data.data;
  },

  // Recibir transferencia
  async receive(
    id: number,
    data?: TransferReceiveStepPayload,
  ): Promise<InventoryTransfer> {
    if (!data) {
      const response = await axiosClient.post<
        LaravelResponse<InventoryTransfer>
      >(`/auth/admin/inventory-transfers/${id}/receive`);
      return response.data.data;
    }

    const formData = await buildStepFormData(data, "receiving_notes");
    const response = await axiosClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/receive`,
      formData,
    );
    return response.data.data;
  },
};

export default transferService;
