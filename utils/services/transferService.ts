import { createCrudService, LaravelResponse } from "./crudService";
import apiClient from "@/utils/axios";

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

export interface ShippingEvidence {
  type: 'photo' | 'document' | 'signature';
  url: string;
  description?: string;
}

export interface InventoryTransfer {
  id: number;
  transfer_number?: string;
  company_id: number;
  from_location_id: number;
  to_location_id: number;
  from_location: Location;
  to_location: Location;
  status: "pending" | "approved" | "rejected" | "in_transit" | "completed" | "cancelled";
  status_label: string;
  status_color: string;
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

// Para compatibilidad con el código anterior
export interface Transfer extends InventoryTransfer {}

// Crear el servicio base
const baseService = createCrudService<InventoryTransfer>("/auth/admin/inventory-transfers");

// Extender con métodos personalizados
const transferService = {
  ...baseService,
  
  // Sobrescribir el método index para manejar casos especiales
  async index(params?: any): Promise<LaravelResponse<InventoryTransfer[]>> {
    console.log('🔍 transferService.index called with params:', params);
    
    // Si hay filtros específicos de recibos, usar getReceipts
    if (params?.to_location_id || params?.mode === 'receipts') {
      console.log('📦 Using getReceipts method');
      const receipts = await this.getReceipts(params);
      console.log('📦 getReceipts returned:', receipts.length, 'items');
      return {
        data: receipts,
        meta: { total: receipts.length }
      } as LaravelResponse<InventoryTransfer[]>;
    }
    
    // Si hay filtros específicos de envíos, usar getShipments
    if (params?.from_location_id || params?.mode === 'shipments') {
      console.log('🚛 Using getShipments method');
      const shipments = await this.getShipments(params);
      return {
        data: shipments,
        meta: { total: shipments.length }
      } as LaravelResponse<InventoryTransfer[]>;
    }
    
    // Usar el método base para otros casos
    console.log('🔧 Using base service index method');
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

  // Obtener peticiones
  async getPetitions(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      '/auth/admin/inventory-transfers/petitions',
      { params }
    );
    return response.data.data;
  },

  // Obtener envíos
  async getShipments(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      '/auth/admin/inventory-transfers/shipments',
      { params }
    );
    return response.data.data;
  },

  // Obtener recibos
  async getReceipts(params?: any): Promise<InventoryTransfer[]> {
    const response = await apiClient.get<LaravelResponse<InventoryTransfer[]>>(
      '/auth/admin/inventory-transfers/receipts',
      { params }
    );
    return response.data.data;
  },

  // Aprobar transferencia
  async approve(id: number, data?: any): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/approve`,
      data || {}
    );
    return response.data.data;
  },

  // Rechazar transferencia
  async reject(id: number, reason: string): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/reject`,
      { rejection_reason: reason }
    );
    return response.data.data;
  },

  // Enviar transferencia
  async ship(id: number, data: ShipmentData): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/ship`,
      data
    );
    return response.data.data;
  },

  // Recibir transferencia
  async receive(id: number, data: ReceiptData): Promise<InventoryTransfer> {
    const response = await apiClient.post<LaravelResponse<InventoryTransfer>>(
      `/auth/admin/inventory-transfers/${id}/receive`,
      data
    );
    return response.data.data;
  },
};

export default transferService;
