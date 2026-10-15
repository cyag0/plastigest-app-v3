// Tipos para las entidades de la aplicación
namespace App {
  namespace Entities {
    // ─── Cajas, turnos y punto de venta ────────────────────────────────────
    interface CashRegister {
      id: number;
      company_id: number;
      location_id: number;
      location_name?: string | null;
      name: string;
      code: string;
      is_active: boolean;
      notes?: string | null;
      /** Turno abierto ahora en la caja (el POS ofrece solo cajas libres). */
      open_session?: { id: number; user_id: number; user_name?: string | null; opened_at: string } | null;
    }

    type CashRegisterSessionStatus = "open" | "closed";

    interface CashRegisterSession {
      id: number;
      status: CashRegisterSessionStatus;
      location_id: number;
      location_name?: string | null;
      cash_register_id: number;
      cash_register_name?: string | null;
      cash_register_code?: string | null;
      user_id: number;
      user_name?: string | null;
      opened_at: string;
      opening_amount: number;
      closed_at?: string | null;
      closed_by_name?: string | null;
      expected_cash?: number | null;
      counted_cash?: number | null;
      difference?: number | null;
      totals?: CashRegisterSessionSummary | null;
      notes?: string | null;
    }

    interface CashRegisterSessionSummary {
      opening_amount: number;
      sales_count: number;
      sales_total: number;
      cancelled_count: number;
      by_method: Record<string, { income: number; expense: number; net: number }>;
      expected_cash: number;
    }

    type PosPaymentMethod = "cash" | "card" | "transfer";

    /** Renglón del catálogo del POS: producto suelto o paquete. */
    interface PosCatalogItem {
      key: string;
      product_id: number;
      package_id: number | null;
      name: string;
      code: string | null;
      price: number;
      unit: { id: number; abbreviation: string; type: string } | null;
      stock: number;
      per_package?: number;
    }

    interface PosSalePayload {
      details: {
        product_id: number;
        package_id?: number | null;
        quantity: number;
        unit_price?: number;
        discount?: number;
      }[];
      payments: { method: PosPaymentMethod; amount: number; tendered?: number }[];
      customer_id?: number | null;
      notes?: string;
    }

    interface PosSaleResult {
      id: number;
      sale_number: string;
      total: number;
      discount: number;
      payment_method: PosPaymentMethod | "mixed";
      payments: { method: PosPaymentMethod; amount: number; tendered: number | null; change: number | null }[];
      change: number;
    }

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
      purchase_price?: string | null;
      sale_price?: string | null;
      company_id?: number | null;
      category_id?: number | null;
      unit_id?: number | null;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
        unit_type?: "mass" | "volume" | "quantity";
      };
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
      inventory_type_id?: number | null;
      /**
       * Empaque: el producto terminado se obtiene empacando un granel
       * (`packaging_source_*`) y consumiendo material (`packaging_materials`).
       * Sólo se ejecuta después de completar la producción.
       */
      requires_packaging?: boolean;
      packaging_source_product_id?: number | null;
      packaging_source_quantity?: number | null;
      packaging_source_unit_id?: number | null;
      packaging_materials?: ProductPackagingMaterial[];
      active_packages?: ProductPackage[];
      // Ubicaciones donde existe el producto, con el stock por ubicación
      // en el pivot (relación many-to-many product <-> location).
      locations?: Array<{
        id: number;
        pivot?: {
          current_stock?: number | null;
        };
      }>;
    }

    interface ProductPackage {
      id: number;
      package_name: string;
      barcode: string;
      quantity_per_package: number;
      purchase_price: string;
      sale_price: string;
      is_active: boolean;
      is_default: boolean;
      sort_order: number;
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

    interface InventoryType {
      id: number;
      company_id?: number | null;
      code: string;
      /** Slug del nombre; es lo que viaja en la URL (materia-prima) */
      slug: string;
      name: string;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      /** Se puede comprar a un proveedor */
      is_purchasable: boolean;
      /** Se puede vender / aparece en el POS */
      is_sellable: boolean;
      /** Puede ser salida de una orden de producción */
      is_producible: boolean;
      /** Puede ser insumo de una fórmula */
      is_consumable: boolean;
      /** Se inventaría y entra en los conteos */
      is_stockable: boolean;
      is_system: boolean;
      is_active: boolean;
      sort_order: number;
      /** Sólo cuando se pide with_counts=1 */
      products_count?: number;
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

    type NotificationEventType =
      | "low_stock"
      | "inventory_adjustment"
      | "inventory_count_discrepancy"
      | "purchase_update"
      | "task_event"
      | "transfer_update"
      | "reminder";

    type NotificationSeverity = "info" | "success" | "warning" | "error" | "alert";

    interface Notification {
      id: number;
      user_id: number;
      company_id: number;
      event_type: NotificationEventType;
      title: string;
      message: string;
      severity: NotificationSeverity;
      is_read: boolean;
      read_at?: string | null;
      data?: Record<string, any>;
      created_at: string;
      updated_at: string;
      user?: User;
      company?: Company;
    }

    interface NotificationPreference {
      event_type: NotificationEventType;
      permission_name: string;
      channel_db: boolean;
      channel_email: boolean;
      channel_push: boolean;
      is_active: boolean;
      is_customized: boolean;
      allowed_user_ids: number[] | null;
      /** De dónde sale la configuración: valores por defecto, la empresa o la sucursal. */
      source?: "default" | "company" | "location";
    }

    interface NotificationEligibleUser {
      id: number;
      name: string;
      email: string;
    }

    type TaskType =
      | "inventory_count"
      | "receive_purchase"
      | "approve_transfer"
      | "send_transfer"
      | "receive_transfer"
      | "sales_report"
      | "stock_check"
      | "adjustment_review"
      | "custom";

    // "overdue" ya no lo escribe el backend (vencida = pendiente/en proceso
    // con is_overdue); se conserva por registros anteriores.
    type TaskStatus =
      | "pending"
      | "in_progress"
      | "completed"
      | "cancelled"
      | "overdue";

    type TaskPriority = "low" | "medium" | "high" | "urgent";

    /** Usuario resumido que el backend incrusta en la tarea. */
    interface TaskUserRef {
      id: number;
      name: string;
      email?: string;
      avatar?: string | null;
    }

    interface Task {
      id: number;
      company_id: number;
      location_id?: number;
      title: string;
      description?: string;
      type: TaskType;
      status: TaskStatus;
      priority: TaskPriority;
      // Laravel serializa las relaciones assignedTo/assignedBy/completedBy en
      // estas mismas llaves: con la relación cargada llega el usuario, no el id.
      assigned_to?: number | TaskUserRef | null;
      assigned_users?: number[];
      assigned_by?: number | TaskUserRef | null;
      completed_by?: number | TaskUserRef | null;
      due_date?: string;
      started_at?: string;
      completed_at?: string;
      related_type?: string;
      related_id?: number;
      is_recurring: boolean;
      recurrence_frequency?: "daily" | "weekly" | "biweekly" | "monthly";
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
      comments?: TaskComment[];
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
        inventory_count_frequency?: "daily" | "weekly" | "monthly";
        inventory_count_day?: number;
        sales_report_enabled?: boolean;
        sales_report_frequency?: "daily" | "weekly";
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

    // Purchase V2 Types
    type PurchaseStatus =
      | "draft"
      | "ordered"
      | "in_transit"
      | "received"
      | "cancelled";

    interface PurchaseV2 {
      id: number;
      company_id: number;
      location_id: number;
      supplier_id?: number;
      purchase_number: string;
      purchase_date: string;
      expected_delivery_date?: string;
      delivery_date?: string;
      status: PurchaseStatus;
      total: string;
      notes?: string;
      document_number?: string;
      user_id: number;
      received_by?: number;
      created_at: string;
      updated_at: string;
      supplier?: Supplier;
      location?: Location;
      user?: User;
      received_by_user?: User;
      details?: PurchaseDetailV2[];
    }

    interface PurchaseDetailV2 {
      id: number;
      purchase_id: number;
      product_id: number;
      package_id?: number;
      quantity: string;
      unit_id: number;
      unit_price: string;
      total: string;
      quantity_received?: string;
      received_at?: string;
      notes?: string;
      created_at: string;
      updated_at: string;
      product?: Product;
      package?: ProductPackage;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
      };
    }
    interface Reminder {
      id: number;
      company_id: number;
      location_id?: number | null;
      user_id: number;
      title: string;
      description?: string | null;
      type: "payment" | "renewal" | "expiration" | "other";
      type_label: string;
      reminder_date: string;
      reminder_time?: string | null;
      status: "pending" | "completed" | "overdue";
      status_label: string;
      completed_at?: string | null;
      is_recurring: boolean;
      recurrence_type?: "daily" | "weekly" | "monthly" | "yearly" | null;
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

    /**
     * Material que consume UNA unidad del producto al empacarse
     * (frasco, tapa, etiqueta). Distinto de `ProductPackage`, que es una
     * presentación de venta.
     */
    interface ProductPackagingMaterial {
      id?: number;
      material_product_id: number;
      material_name?: string;
      material_code?: string;
      unit_id: number;
      unit_name?: string;
      unit_abbreviation?: string;
      quantity: number;
      sort_order?: number;
      notes?: string | null;
    }

    // ============== Producción (nuevo módulo) ==============

    /**
     * El empaque es un paso posterior: hasta que la producción no se completa
     * el granel no existe en inventario, así que `packaging` y `packed` sólo
     * se alcanzan desde `completed`.
     */
    type ProductionStatus =
      | "draft"
      | "completed"
      | "packaging"
      | "packed"
      | "cancelled";

    interface ProductionOrder {
      id: number;
      folio: string;
      production_date: string;
      company_id?: number;
      location_id?: number;
      location_name?: string;
      formula_id?: number | null;
      formula_name?: string | null;
      responsible_user_id?: number;
      responsible_name?: string;
      status: ProductionStatus;
      status_label: string;
      status_color: string;
      status_icon?: string;
      /** El backend habilita el empaque sólo en `completed` y `packaging`. */
      can_pack?: boolean;
      notes?: string | null;
      wastes?: ProductionWaste[];
      total_consumed_quantity?: number | null;
      total_produced_quantity?: number | null;
      waste_percentage?: number | null;
      completed_at?: string | null;
      packed_at?: string | null;
      cancelled_at?: string | null;
      consumptions?: ProductionOrderConsumption[];
      outputs?: ProductionOrderOutput[];
      packagings?: ProductionOrderPackaging[];
      summary?: {
        consumption_count?: number;
        output_count?: number;
        waste_count?: number;
        packaging_count?: number;
        packaged_quantity?: number | null;
        waste_percentage?: number | null;
      };
      created_at?: string;
      updated_at?: string;
    }

    /** Una operación de empaque: granel + material → producto terminado. */
    interface ProductionOrderPackaging {
      id: number;
      product_id: number;
      product_name?: string;
      product_code?: string;
      unit_id: number;
      unit_name?: string;
      quantity: number;
      source_product_id?: number | null;
      source_product_name?: string | null;
      source_unit_id?: number | null;
      source_unit_name?: string | null;
      source_quantity?: number | null;
      packed_at?: string | null;
      notes?: string | null;
      materials?: Array<{
        id?: number;
        product_id: number;
        product_name?: string;
        unit_id: number;
        unit_name?: string;
        quantity: number;
      }>;
    }

    /** Respuesta de GET /production-orders/{id}/packaging. */
    interface PackagingPlan {
      can_pack: boolean;
      status: ProductionStatus;
      status_label: string;
      lines: PackagingPlanLine[];
      packagings: ProductionOrderPackaging[];
    }

    /** Una salida de la orden y los productos que pueden empacarse de ella. */
    interface PackagingPlanLine {
      source_product_id: number;
      source_product_name?: string;
      source_unit_id: number;
      source_unit_name?: string;
      produced_quantity: number;
      packed_quantity: number;
      remaining_quantity: number;
      available_stock: number;
      products: PackagingPlanOption[];
    }

    interface PackagingPlanOption {
      product_id: number;
      product_name: string;
      product_code?: string | null;
      unit_id?: number | null;
      unit_name?: string | null;
      source_quantity_per_unit: number;
      source_unit_id?: number | null;
      source_unit_name?: string | null;
      /** Techo real: lo marca el insumo más escaso (granel o material). */
      max_units: number | null;
      max_units_by_source: number | null;
      materials: Array<{
        product_id: number;
        product_name?: string;
        product_code?: string | null;
        unit_id: number;
        unit_name?: string;
        quantity_per_unit: number;
        available_stock: number;
        max_units: number | null;
        notes?: string | null;
      }>;
    }

    interface ProductionOrderConsumption {
      id?: number;
      product_id: number;
      product_name?: string;
      product_code?: string;
      unit_id: number;
      unit_name?: string;
      quantity: number;
      expected_quantity?: number | null;
      variance_pct?: number | null;
      notes?: string | null;
    }

    interface ProductionOrderOutput {
      id?: number;
      product_id: number;
      product_name?: string;
      product_code?: string;
      unit_id: number;
      unit_name?: string;
      quantity: number;
      expected_quantity?: number | null;
      variance_pct?: number | null;
      notes?: string | null;
    }

    interface ProductionWaste {
      id?: number;
      product_id: number;
      product_name?: string;
      unit_id: number;
      unit_name?: string;
      quantity: number;
      reason: string;
      reason_label?: string;
      notes?: string | null;
    }

    /** Producto de una fórmula, con su imagen para los selectores. */
    interface FormulaProduct {
      id: number;
      name: string;
      code?: string | null;
      product_type?: string | number | null;
      inventory_type_id?: number | null;
      unit_id?: number | null;
      requires_packaging?: boolean;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
        unit_type?: "mass" | "volume" | "quantity";
      } | null;
      main_image?: { uri: string; name?: string; type?: string; size?: number | null } | null;
    }

    /**
     * Una fórmula es el proceso: qué consume (`items`) y qué entrega
     * (`outputs`). Una misma corrida puede dar varios productos a la vez —
     * de un lote de cocos salen agua, pulpa y fibra.
     */
    interface Formula {
      id: number;
      company_id?: number;
      name: string;
      description?: string | null;
      version: number;
      is_active: boolean;
      notes?: string | null;
      items?: FormulaItem[];
      outputs?: FormulaOutput[];

      /**
       * Espejo de la salida principal que el backend sigue devolviendo por
       * compatibilidad. Para leer todos los resultados, usa `outputs`.
       */
      product_id?: number | null;
      product_name?: string;
      product_code?: string;
      product?: FormulaProduct | null;
      expected_output_quantity?: number | null;

      created_at?: string;
      updated_at?: string;
    }

    /** Un resultado de la fórmula: qué producto sale y cuánto rinde. */
    interface FormulaOutput {
      id?: number;
      product_id: number;
      product_name?: string;
      product_code?: string;
      unit_id: number;
      unit_name?: string;
      unit_abbreviation?: string;
      unit_type?: "mass" | "volume" | "quantity";
      expected_quantity: number;
      /** El resultado de referencia del proceso. Sólo uno por fórmula. */
      is_primary?: boolean;
      sort_order?: number;
      notes?: string | null;
      product?: FormulaProduct | null;
    }

    interface FormulaItem {
      id?: number;
      product_id: number;
      product_name?: string;
      product_code?: string;
      unit_id: number;
      unit_name?: string;
      unit_abbreviation?: string;
      unit_type?: "mass" | "volume" | "quantity";
      expected_quantity: number;
      sort_order?: number;
      notes?: string | null;
    }
    /**
     * Un renglón del historial de existencias de un producto.
     * Lo sirve GET /products/{id}/movements.
     */
    interface StockMovement {
      id: number;
      date: string;
      direction: "in" | "out";
      reason: string;
      reason_label: string;
      reason_icon: string;
      quantity: number;
      /** Positiva en entradas, negativa en salidas. */
      signed_quantity: number;
      previous_stock: number;
      new_stock: number;
      unit_cost: number | null;
      location: { id: number; name: string } | null;
      /** La otra sucursal, en traspasos. */
      counterpart_location: { id: number; name: string } | null;
      user: { id: number; name: string } | null;
      /** label: folio legible del documento ("Venta SAL-…"). */
      reference: { type: string; id: number; label?: string | null } | null;
      notes: string | null;
      /** Sólo en el kárdex general. */
      product?: { id: number; name: string; code?: string | null; unit?: string | null } | null;
    }

    /** Opciones de filtro que devuelve el kárdex general. */
    interface KardexFilters {
      reasons: { value: string; label: string }[];
      users: { value: number; label: string }[];
      locations: { value: number; label: string }[];
      can_choose_location: boolean;
    }

    type BusinessReportKey = "sales" | "inventory-valuation" | "adjustments" | "cash-differences";

    /** GET /business-reports/options: los reportes del dueño y las sucursales que se pueden elegir. */
    interface BusinessReportOptions {
      reports: {
        key: BusinessReportKey;
        title: string;
        description: string;
        icon: string;
        /** period: rango de fechas; as_of: fecha de corte. */
        input: "period" | "as_of";
      }[];
      can_choose_location: boolean;
      current_location: { id: number; name: string } | null;
      locations: { id: number; name: string }[];
    }

    /** GET /home/summary: lo que muestra Inicio (cada bloque según permisos). */
    interface HomeSummary {
      location: { id: number; name: string } | null;
      sales: {
        today_total: number;
        today_count: number;
        average_ticket: number;
        yesterday_same_time: number;
        yesterday_total: number;
        by_hour: { hour: number; today: number; yesterday: number }[];
      } | null;
      cash: {
        mine: {
          id: number;
          register: string | null;
          location: string | null;
          stale: boolean;
          opened_at: string | null;
          sales_count: number;
          sales_total: number;
          expected_cash: number;
        } | null;
        open_in_branch: { id: number; register: string | null; user: string | null; opened_at: string | null; stale: boolean }[];
        can_sell: boolean;
      } | null;
      alerts: { key: string; count: number; tone: "error" | "warning" | "info" }[];
      production_today: number | null;
    }

    /** Un renglón de la bitácora ("Mi actividad"). */
    interface ActivityEntry {
      id: number;
      date: string;
      module: string;
      module_label: string;
      event: string;
      description: string;
      user: { id: number | null; name: string | null };
      location: { id: number; name: string } | null;
      subject: { type: string; id: number | null; label: string | null } | null;
      changes: Record<string, any> | null;
    }

    interface ActivityResponse {
      data: ActivityEntry[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
      filters: { modules: { value: string; label: string }[] };
    }

    interface StockMovementsResponse {
      data: StockMovement[];
      meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
      product: {
        id: number;
        name: string;
        code?: string | null;
        unit?: string | null;
        unit_abbreviation?: string | null;
        current_stock: number;
      };
      filters: {
        reasons: { value: string; label: string }[];
      };
    }
  }
}
