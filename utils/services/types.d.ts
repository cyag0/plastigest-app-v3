// Tipos para las entidades de la aplicación
namespace App {
  namespace Entities {
    interface User {
      id: number;
      name: string;
      email: string;
      email_verified_at?: string;
      created_at: string;
      updated_at: string;
      is_active: boolean;
      company_id?: number;
      roles?: Role[];
    }

    interface Worker {
      id: number;
      position?: string;
      department?: string;
      hire_date?: string;
      salary?: string;
      is_active: boolean;
      company_id: number;
      user_id?: number;
      created_at: string;
      updated_at: string;

      // Relaciones (formato display en listado)
      company_name?: string;
      user_name?: string;
      user_email?: string;

      // Relaciones (formato completo)
      company?: {
        id: number;
        name: string;
      };
      user?: {
        id: number;
        name: string;
        email: string;
      };
      roles?: Array<{
        id: number;
        name: string;
        description?: string;
      }>;
      companies?: Array<{
        id: number;
        name: string;
      }>;
      locations?: Array<{
        id: number;
        name: string;
      }>;
    }

    interface Product {
      id: number;
      name: string;
      code: string;
      description?: string;
      purchase_price?: number;
      sale_price?: number;
      unit_id?: number;
      category_id?: number;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;

      // Relaciones (formato display)
      company_name?: string;
      category_name?: string;
      unit_name?: string;

      // Relaciones (formato completo)
      company?: {
        id: number;
        name: string;
      };
      category?: Category;
      unit?: Unit;
    }

    interface Category {
      id: number;
      name: string;
      description?: string;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;

      // Relaciones (formato display en listado)
      company_name?: string;

      // Relaciones (formato completo)
      company?: {
        id: number;
        name: string;
        business_name?: string;
      };
    }
      }>;
      locations?: Array<{
        id: number;
        name: string;
        address?: string;
      }>;

      // Para formularios
      name?: string;
      email?: string;
      password?: string;
      role_ids?: number[];
      company_ids?: number[];
      location_ids?: number[];
    }

    interface Role {
      id: number;
      name: string;
      description?: string;
      permissions: string[];
      users_count?: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Permission {
      id: number;
      name: string;
      description: string;
      resource: string;
      created_at: string;
      updated_at: string;
    }

    interface Resource {
      key: string;
      label: string;
    }

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

    interface Product {
      id: number;
      name: string;
      code: string;
      description?: string;
      purchase_price?: number;
      sale_price?: number;
      unit_id?: number;
      category_id?: number;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      
      // Relaciones (formato display)
      company_name?: string;
      category_name?: string;
      unit_name?: string;
      
      // Relaciones (formato completo)
      company?: {
        id: number;
        name: string;
      };
      category?: Category;
      unit?: Unit;
    }

    interface Category {
      id: number;
      name: string;
      code?: string;
      description?: string;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Unit {
      id: number;
      name: string;
      code: string;
      description?: string;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Customer {
      id: number;
      name: string;
      code?: string;
      email?: string;
      phone?: string;
      address?: string;
      company_id: number;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Supplier {
      id: number;
      name: string;
      code?: string;
      email?: string;
      phone?: string;
      address?: string;
      company_id: number;
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
      company?: Company;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    interface Movement {
      id: number;
      company_id: number;
      movement_type: "in" | "out" | "adjustment" | "transfer";
      warehouse_origin_id?: number;
      warehouse_destination_id?: number;
      supplier_id?: number;
      customer_id?: number;
      user_id: number;
      date: string;
      total_cost?: number;
      status: "open" | "closed";
      comments?: string;
      created_at: string;
      updated_at: string;
      details?: MovementDetail[];
    }

    interface MovementDetail {
      id: number;
      movement_id: number;
      product_id: number;
      quantity: number;
      unit_cost?: number;
      total_cost?: number;
      comments?: string;
      created_at: string;
      updated_at: string;
      product?: Product;
    }

    interface PurchaseOrder {
      id: number;
      company_id: number;
      supplier_id: number;
      user_id: number;
      order_number: string;
      order_date: string;
      expected_date?: string;
      status:
        | "draft"
        | "sent"
        | "confirmed"
        | "partial"
        | "completed"
        | "cancelled";
      subtotal: number;
      comments?: string;
      created_at: string;
      updated_at: string;
      details?: PurchaseOrderDetail[];
      supplier?: Supplier;
    }

    interface PurchaseOrderDetail {
      id: number;
      purchase_order_id: number;
      product_id: number;
      quantity_ordered: number;
      quantity_received: number;
      unit_price: number;
      total_price: number;
      comments?: string;
      created_at: string;
      updated_at: string;
      product?: Product;
    }

    interface SalesOrder {
      id: number;
      company_id: number;
      customer_id: number;
      user_id: number;
      order_number: string;
      order_date: string;
      delivery_date?: string;
      status:
        | "quotation"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "delivered"
        | "invoiced"
        | "cancelled";
      subtotal: number;
      tax_amount: number;
      total_amount: number;
      notes?: string;
      created_at: string;
      updated_at: string;
      details?: SalesOrderDetail[];
      customer?: Customer;
    }

    interface SalesOrderDetail {
      id: number;
      sales_order_id: number;
      product_id: number;
      quantity_ordered: number;
      quantity_delivered: number;
      unit_price: number;
      total_price: number;
      notes?: string;
      created_at: string;
      updated_at: string;
      product?: Product;
    }
  }
}
