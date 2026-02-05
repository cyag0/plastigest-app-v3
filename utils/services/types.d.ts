// Tipos para las entidades de la aplicación
namespace App {
  namespace Entities {
    interface User {
      id: number;
      name: string;
      email: string;
      is_active: boolean;
      password?: string;
      created_at: string;
      updated_at: string;
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

    interface Customer {
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
      unit?: any; // Unidad base del producto
      supplier_id?: number | null;
      product_type?: string | number | null;
      is_active: boolean;
      for_sale: boolean;
      current_stock?: number | null;
      minimum_stock?: number | null;
      maximum_stock?: number | null;
      available_units?: any[]; // Unidades disponibles (base + derivadas)
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

    interface Category {
      id: number;
      name: string;
      description?: string | null;
      company_id?: number | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    namespace InventoryCount {
      interface Detail {
        id?: number;
        product_id: number;
        location_id: number;
        system_quantity: number;
        counted_quantity: number;
        difference?: number;
        notes?: string | null;
        inventory_count_id?: number;
        product?: {
          id: number;
          name: string;
          code?: string | null;
          image?: string | null;
          unit?: {
            name: string;
            abbreviation: string;
          } | null;
        };
      }

      interface InventoryCount {
        id: number;
        name: string;
        count_date: string;
        status: "completed" | "counting" | "planning" | "cancelled";
        notes?: string | null;
        location?: {
          id: number;
          name: string;
        };
        user?: {
          id: number;
          name: string;
        };
        details: {
          [product_id: number]: Detail;
        };
        details_count?: number;
        company_id?: number;
        created_at?: string;
        updated_at?: string;
      }
    }

    namespace Adjustment {
      // Tipos de ajuste
      type AdjustmentType =
        | "adjustment"
        | "return"
        | "damage"
        | "loss"
        | "shrinkage";

      interface AdjustmentDetail {
        id?: number;
        product_id: number;
        quantity: number;
        unit_id: number;
        unit_price?: number;
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

    interface Notification {
      id: number;
      user_id: number;
      company_id: number;
      title: string;
      message: string;
      type: "info" | "success" | "warning" | "error" | "alert";
      is_read: boolean;
      read_at?: string | null;
      data?: any;
      created_at: string;
      updated_at: string;
      user?: User;
      company?: Company;
    }

    type TaskType = 'inventory_count' | 'receive_purchase' | 'approve_transfer' | 
      'send_transfer' | 'receive_transfer' | 'sales_report' | 'stock_check' | 
      'adjustment_review' | 'custom';
    
    type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
    
    type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

    interface Task {
      id: number;
      company_id: number;
      location_id?: number;
      title: string;
      description?: string;
      type: TaskType;
      status: TaskStatus;
      priority: TaskPriority;
      assigned_to?: number;
      assigned_users?: number[];
      assigned_by?: number;
      completed_by?: number;
      due_date?: string;
      started_at?: string;
      completed_at?: string;
      related_type?: string;
      related_id?: number;
      is_recurring: boolean;
      recurrence_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
      recurrence_day?: number;
      recurrence_time?: string;
      last_generated_at?: string;
      next_occurrence?: string;
      metadata?: any;
      created_at: string;
      updated_at: string;
      is_overdue: boolean;
      assignedTo?: User;
      assignedBy?: User;
      completedBy?: User;
      location?: Location;
      related?: any;
    }

    interface Expense {
      id: number;
      company_id: number;
      location_id: number;
      user_id: number;
      category: string;
      category_label: string;
      amount: number;
      payment_method: string;
      payment_method_label: string;
      description: string;
      expense_date: string;
      receipt_image?: string | null;
      created_at: string;
      updated_at: string;
      user?: {
        id: number;
        name: string;
        email: string;
      };
      location?: {
        id: number;
        name: string;
      };
      company?: {
        id: number;
        name: string;
      };
    }

    interface TaskComment {
      id: number;
      task_id: number;
      user_id: number;
      comment: string;
      attachments?: any[];
      created_at: string;
      updated_at: string;
      user?: User;
    }

    interface TaskStatistics {
      total: number;
      pending: number;
      in_progress: number;
      completed: number;
      overdue: number;
      due_today: number;
      by_priority: {
        urgent: number;
        high: number;
        medium: number;
        low: number;
      };
      by_type: Record<string, number>;
    }

    interface NotificationConfig {
      enabled: boolean;
      users: number[];
    }

    interface LocationSettings {
      notifications?: {
        low_stock?: NotificationConfig;
        purchase_confirmed?: NotificationConfig;
        transfer_received?: NotificationConfig;
        inventory_discrepancies?: NotificationConfig;
        adjustment_created?: NotificationConfig;
        // Legacy boolean support for backward compatibility
        low_stock_enabled?: boolean;
        purchase_confirmed_enabled?: boolean;
        transfer_received_enabled?: boolean;
      };
      working_hours?: {
        monday?: { start: string; end: string; enabled: boolean };
        tuesday?: { start: string; end: string; enabled: boolean };
        wednesday?: { start: string; end: string; enabled: boolean };
        thursday?: { start: string; end: string; enabled: boolean };
        friday?: { start: string; end: string; enabled: boolean };
        saturday?: { start: string; end: string; enabled: boolean };
        sunday?: { start: string; end: string; enabled: boolean };
      };
      auto_tasks?: {
        inventory_count_enabled?: boolean;
        inventory_count_frequency?: 'daily' | 'weekly' | 'monthly';
        inventory_count_day?: number;
        sales_report_enabled?: boolean;
        sales_report_frequency?: 'daily' | 'weekly';
      };
      limits?: {
        max_discount_percentage?: number;
        require_approval_above?: number;
        low_stock_threshold?: number;
      };
      features?: {
        enable_barcode_scanner?: boolean;
        enable_whatsapp_orders?: boolean;
        enable_pos_mode?: boolean;
      };
    }

    interface Reminder {
      id: number;
      company_id: number;
      location_id?: number | null;
      user_id: number;
      title: string;
      description?: string | null;
      type: 'payment' | 'renewal' | 'expiration' | 'other';
      type_label: string;
      reminder_date: string;
      reminder_time?: string | null;
      status: 'pending' | 'completed' | 'overdue';
      status_label: string;
      completed_at?: string | null;
      is_recurring: boolean;
      recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
      recurrence_interval?: number;
      recurrence_end_date?: string | null;
      notify_enabled: boolean;
      notify_days_before: number;
      last_notified_at?: string | null;
      supplier_id?: number | null;
      product_id?: number | null;
      amount?: number | null;
      is_overdue: boolean;
      days_until_due?: number | null;
      company?: any;
      location?: any;
      user?: any;
      supplier?: any;
      product?: any;
      created_at: string;
      updated_at: string;
    }
  }
}
