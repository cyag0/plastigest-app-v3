// Tipos para las entidades de la aplicación
namespace App {
  namespace Entities {
    interface Company {
      id: number;
      name: string;
      business_name: string;
      rfc: string;
      email?: string;
      phone?: string;
      address?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Supplier {
      id: number;
      name: string;
      business_name?: string;
      social_reason?: string;
      rfc?: string;
      email?: string;
      phone?: string;
      address?: string;
      company_id: number;
      company_name?: string;
      company?: Company;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Location {
      id: number;
      name: string;
      description?: string;
      address: string;
      phone?: string;
      email?: string;
      company_id: number;
      company_name?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Product {
      id: number;
      name: string;
      description?: string | null;
      code?: string | null;
      purchase_price?: number | null;
      sale_price?: number | null;
      company_id?: number | null;
      category_id?: number | null;
      unit_id?: number | null;
      supplier_id?: number | null;
      product_type?: string | number | null;
      is_active: boolean;
      for_sale: boolean;
      current_stock?: number | null;
      minimum_stock?: number | null;
      maximum_stock?: number | null;
      created_at: string;
      updated_at: string;
      product_images?: any[]; // formatted file objects returned for editing
      main_image?: any | null; // formatted file object for listing
      ingredients?: Array<{
        id: number;
        ingredient_id: number;
        quantity: number;
        notes?: string | null;
      }>;
    }

    namespace Adjustment {
      // Tipos de ajuste
      type AdjustmentType = "increase" | "decrease";

      interface AdjustmentDetail {
        id?: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        total_cost?: number;
        product_name?: string;
        product_code?: string;
        product_image?: any;
      }

      interface Adjustment {
        id: number;
        adjustment_number: string;
        adjustment_date: string;
        adjustment_type: AdjustmentType;
        status: string;
        total_cost: number;
        reason?: string;
        adjusted_by?: string;
        location?: {
          id: number;
          name: string;
        };
        details?: AdjustmentDetail[];
        content?: any;
        comments?: string;
        created_at?: string;
        updated_at?: string;
      }

      interface CreateAdjustmentData {
        location_id: number;
        company_id: number;
        movement_date: string;
        document_number?: string;
        comments?: string;
        adjustment_type: AdjustmentType;
        reason?: string;
        adjusted_by?: string;
        details: Array<{
          product_id: number;
          quantity: number;
          unit_price: number;
        }>;
      }
    }
  }
}
