import { default as api, default as axiosClient } from "../axios";
import admin from "./admin/admin";
import { createCrudService } from "./crudService";

const Services = {
  admin,
  users: {
    ...createCrudService<App.Entities.User>("/auth/admin/users"),
  },
  categories: {
    ...createCrudService<App.Entities.Category>("/auth/admin/categories"),
  },
  inventoryTypes: {
    ...createCrudService<App.Entities.InventoryType>(
      "/auth/admin/inventory-types",
    ),
  },
  products: {
    ...createCrudService<App.Entities.Product>("/auth/admin/products"),
    /** Trazabilidad: historial de movimientos de existencias del producto. */
    async movements(
      productId: number,
      params?: {
        location_id?: number;
        direction?: "in" | "out";
        reason?: string;
        start_date?: string;
        end_date?: string;
        page?: number;
        per_page?: number;
      },
    ): Promise<App.Entities.StockMovementsResponse> {
      const response = await axiosClient.get(
        `/auth/admin/products/${productId}/movements`,
        { params },
      );
      return response.data;
    },
  },
  /** Kárdex general: todos los movimientos de inventario, con filtros. */
  inventoryMovements: {
    ...createCrudService<App.Entities.StockMovement>("/auth/admin/inventory-movements"),
    /** Opciones de filtro (motivos, usuarios, sucursales). */
    async filters(): Promise<App.Entities.KardexFilters> {
      const response = await axiosClient.get("/auth/admin/inventory-movements", {
        params: { per_page: 1 },
      });
      return response.data.filters;
    },
    /** URL firmada (10 min) del CSV con los mismos filtros. */
    async exportUrl(params: Record<string, any>): Promise<string> {
      const response = await axiosClient.get("/auth/admin/inventory-movements/export-url", { params });
      return response.data.url;
    },
  },
  /** URL firmadas (30 min) de los documentos para imprimir. */
  print: {
    async saleTicketUrl(saleId: number, width: 58 | 80 = 80): Promise<string> {
      const response = await axiosClient.get(`/auth/admin/sales/${saleId}/ticket-url`, { params: { width } });
      return response.data.url;
    },
    async shiftTicketUrl(sessionId: number, width: 58 | 80 = 80): Promise<string> {
      const response = await axiosClient.get(`/auth/admin/cash-register-sessions/${sessionId}/ticket-url`, { params: { width } });
      return response.data.url;
    },
    async transferPdfUrl(transferId: number): Promise<string> {
      const response = await axiosClient.get(`/auth/admin/inventory-transfers/${transferId}/pdf-url`);
      return response.data.url;
    },
    /** Hoja de producción para la planta (qué producir y qué sacar del almacén). */
    async productionSheetUrl(orderId: number): Promise<string> {
      const response = await axiosClient.get(`/auth/admin/production-orders/${orderId}/sheet-url`);
      return response.data.url;
    },
  },
  /** Reportes del dueño en PDF o Excel: ventas, inventario valorizado, mermas y caja. */
  businessReports: {
    async options(): Promise<App.Entities.BusinessReportOptions> {
      const response = await axiosClient.get("/auth/admin/business-reports/options");
      return response.data;
    },
    /** URL firmada (30 min) del reporte con el periodo y la sucursal elegidos. */
    async url(
      report: App.Entities.BusinessReportKey,
      params: {
        format: "pdf" | "xlsx";
        date_from?: string;
        date_to?: string;
        as_of?: string;
        location_id?: number | "all";
      },
    ): Promise<string> {
      const response = await axiosClient.get(`/auth/admin/business-reports/${report}/url`, { params });
      return response.data.url;
    },
  },
  /** Bitácora: "me" (default), un id de usuario o "all" (toda la empresa). */
  activity: {
    async index(params: {
      user_id?: number | "me" | "all";
      /** "location": solo lo ocurrido en la sucursal actual. */
      scope?: "location";
      module?: string;
      search?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      per_page?: number;
    }): Promise<App.Entities.ActivityResponse> {
      const response = await axiosClient.get("/auth/admin/activity", { params });
      return response.data;
    },
  },
  transfers: {
    ...createCrudService<App.Entities.Company>("/auth/admin/inventory-transfers"),
  },
  inventoryAdjustments: {
    ...createCrudService<any>("/auth/admin/inventory-adjustments"),
  },
  productPackages: {
    ...createCrudService<any>("/auth/admin/product-packages"),
    /**
     * Paquete activo con ese código de barras exacto, o `{ data: null }`.
     * El backend no tiene `POST product-packages/search-barcode` (respondía
     * 405); se usa el listado con `search` (busca también por barcode) y se
     * filtra la coincidencia exacta. Requiere products_list.
     */
    async searchByBarcode(barcode: string) {
      const code = barcode.trim();
      const response = await axiosClient.get("/auth/admin/product-packages", {
        params: { search: code, active_only: 1 },
      });
      const body: any = response.data;
      const list: any[] = Array.isArray(body) ? body : body?.data ?? [];
      const match =
        list.find((pkg) => pkg?.barcode != null && String(pkg.barcode).trim() === code) ??
        null;
      return { data: match };
    },
  },
  companies: {
    ...createCrudService<App.Entities.Company>("/auth/admin/companies"),
  },
  purchasesV2: {
    async addDetail(data: {
      purchase_id?: number;
      supplier_id?: number;
      product_id: number;
      package_id?: number;
      quantity: number;
      unit_id: number;
      price: number;
    }) {
      const response = await axiosClient.post(
        "/auth/admin/purchases-v2/add-detail",
        data,
      );
      return response.data;
    },
    async updateDetail(
      detailId: number,
      data: {
        quantity?: number;
        unit_id?: number;
        price?: number;
      },
    ) {
      const response = await axiosClient.post(
        `/auth/admin/purchases-v2/details/${detailId}/update`,
        data,
      );
      return response.data;
    },
    async removeDetail(detailId: number) {
      const response = await axiosClient.delete(
        `/auth/admin/purchases-v2/details/${detailId}`,
      );
      return response.data;
    },
    async upsertDraft(data: {
      purchase_id?: number;
      supplier_id?: number;
      notes?: string;
      payment_method?: string;
      items?: {
        id: string | number;
        product_id: number;
        package_id?: number;
        quantity: number;
        unit_id: number;
        price: number;
      }[];
    }) {
      const response = await axiosClient.post(
        "/auth/admin/purchases-v2/upsert-draft",
        data,
      );
      return response.data;
    },
    async getDraft() {
      const response = await axiosClient.get("/auth/admin/purchases-v2/draft");
      return response.data;
    },
    async confirm(
      id: number,
      data?: {
        expected_delivery_date?: string;
        document_number?: string;
        payment_method?: string;
        /** ¿El dinero salió de la caja? Solo entonces se registra egreso. */
        paid_from_cash?: boolean;
      },
    ) {
      const response = await axiosClient.post(
        `/auth/admin/purchases-v2/${id}/confirm`,
        data,
      );
      return response.data;
    },
    async markInTransit(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/purchases-v2/${id}/mark-in-transit`,
      );
      return response.data;
    },
    async receive(
      id: number,
      details: {
        id: number;
        quantity_received: number;
      }[],
    ) {
      const response = await axiosClient.post(
        `/auth/admin/purchases-v2/${id}/receive`,
        { details },
      );
      return response.data;
    },
    async cancel(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/purchases-v2/${id}/cancel`,
      );
      return response.data;
    },
    async index(params?: {
      status?: string;
      location_id?: number;
      page?: number;
    }) {
      const response = await axiosClient.get("/auth/admin/purchases-v2", {
        params,
      });
      return response.data;
    },
    async show(id: number) {
      const response = await axiosClient.get(`/auth/admin/purchases-v2/${id}`);
      return response.data;
    },
    async pdfUrl(id: number) {
      const response = await axiosClient.get(
        `/auth/admin/purchases-v2/${id}/pdf-url`,
      );
      return response.data as { url: string; expires_at: string };
    },
    async delete(id: number) {
      const response = await axiosClient.delete(
        `/auth/admin/purchases-v2/${id}`,
      );
      return response.data;
    },
    async getStats(params?: {
      location_id?: number;
      start_date?: string;
      end_date?: string;
    }) {
      const response = await axiosClient.get("/auth/admin/purchases-v2/stats", { params });
      return response.data;
    },
  },
  sales: {
    // App.Entities no declara Sale (las pantallas leen la venta como any).
    ...createCrudService<any>("/auth/admin/sales"),
    async cancel(id: number) {
      const response = await axiosClient.post(`/auth/admin/sales/${id}/cancel`);
      return response.data;
    },
    async getInitialData(params?: { location_id?: number }) {
      const response = await axiosClient.get("/auth/admin/sales/initial-data", {
        params,
      });
      return response.data;
    },
    async addPayment(
      id: number,
      data: { amount: number; payment_method: string; notes?: string },
    ) {
      const response = await axiosClient.post(
        `/auth/admin/sales/${id}/add-payment`,
        data,
      );
      return response.data;
    },
    async stats(params?: {
      location_id?: number;
      start_date?: string;
      end_date?: string;
    }) {
      const response = await axiosClient.get("/auth/admin/sales/stats", {
        params,
      });
      return response.data;
    },
    async cashRegister(params: { date: string; location_id?: number }) {
      const response = await axiosClient.get(
        "/auth/admin/sales/cash-register",
        {
          params,
        },
      );
      return response.data;
    },
    async pdfUrl(id: number) {
      const response = await axiosClient.get(
        `/auth/admin/sales/${id}/pdf-url`,
      );
      return response.data as { url: string; expires_at: string };
    },
  },
  salesReports: {
    ...createCrudService<any>("/auth/admin/sales-reports"),
  },
  salesOrders: {
    ...createCrudService<any>("/auth/admin/sales-orders"),
    async getInitialData() {
      const response = await axiosClient.get(
        "/auth/admin/sales-orders/initial-data",
      );
      return response.data;
    },
    async prepare(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/sales-orders/${id}/prepare`,
      );
      return response.data;
    },
    async ship(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/sales-orders/${id}/ship`,
      );
      return response.data;
    },
    async deliver(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/sales-orders/${id}/deliver`,
      );
      return response.data;
    },
    async cancel(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/sales-orders/${id}/cancel`,
      );
      return response.data;
    },
    async checkout(
      id: number,
      data?: {
        payment_method?: "cash" | "card" | "transfer" | "credit";
        paid_amount?: number;
        notes?: string;
      },
    ) {
      const response = await axiosClient.post(
        `/auth/admin/sales-orders/${id}/checkout`,
        data ?? {},
      );
      return response.data;
    },
  },
  expenses: {
    ...createCrudService<App.Entities.Expense>("/auth/admin/expenses"),
    async getCategories() {
      const response = await axiosClient.get("/auth/admin/expenses/categories");
      return response.data;
    },
    async getStatistics(params?: {
      location_id?: number;
      start_date?: string;
      end_date?: string;
    }) {
      const response = await axiosClient.get(
        "/auth/admin/expenses/statistics",
        {
          params,
        }
      );
      return response.data;
    },
  },
  reminders: {
    ...createCrudService<App.Entities.Reminder>("/auth/admin/reminders"),
    async getTypes() {
      const response = await axiosClient.get("/auth/admin/reminders/types");
      return response.data;
    },
    async getRecurrenceTypes() {
      const response = await axiosClient.get("/auth/admin/reminders/recurrence-types");
      return response.data;
    },
    async getStatistics() {
      const response = await axiosClient.get("/auth/admin/reminders/statistics");
      return response.data;
    },
    async getUsers() {
      const response = await axiosClient.get("/auth/admin/reminders/users");
      return response.data;
    },
    async markAsCompleted(id: number) {
      const response = await axiosClient.post(`/auth/admin/reminders/${id}/complete`);
      return response.data;
    },
  },
  productions: {
    // Mantenido por compatibilidad con código legacy, apunta a la nueva ruta.
    ...createCrudService<any>("/auth/admin/production-orders"),
  },
  productionOrders: {
    ...createCrudService<any>("/auth/admin/production-orders"),
    async getInitialData() {
      const response = await axiosClient.get(
        "/auth/admin/production-orders/initial-data",
      );
      return response.data;
    },
    async getTodayStats(params?: { location_id?: number | string }) {
      const response = await axiosClient.get(
        "/auth/admin/production-orders/today-stats",
        { params },
      );
      return response.data;
    },
    async complete(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/production-orders/${id}/complete`,
      );
      return response.data;
    },
    async cancel(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/production-orders/${id}/cancel`,
      );
      return response.data;
    },
    async getVariance(id: number) {
      const response = await axiosClient.get(
        `/auth/admin/production-orders/${id}/variance`,
      );
      return response.data;
    },

    // ── Empaque: paso posterior, sólo habilitado con la producción completada.

    /** Qué se puede empacar de cada salida y cuánto material haría falta. */
    async getPackagingPlan(id: number) {
      const response = await axiosClient.get(
        `/auth/admin/production-orders/${id}/packaging`,
      );
      return response.data;
    },
    /** Registra empaques: descuenta granel + material y acredita el terminado. */
    async pack(
      id: number,
      packagings: {
        product_id: number;
        quantity: number;
        unit_id?: number | null;
        notes?: string | null;
      }[],
    ) {
      const response = await axiosClient.post(
        `/auth/admin/production-orders/${id}/packaging`,
        { packagings },
      );
      return response.data;
    },
    /** Deshace un empaque y devuelve el stock. */
    async revertPackaging(id: number, packagingId: number) {
      const response = await axiosClient.delete(
        `/auth/admin/production-orders/${id}/packaging/${packagingId}`,
      );
      return response.data;
    },
    /** Cierra el empaque: la orden queda empacada y no admite más. */
    async finishPackaging(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/production-orders/${id}/packaging/finish`,
      );
      return response.data;
    },
  },
  formulas: {
    ...createCrudService<any>("/auth/admin/formulas"),
    async clone(id: number, name?: string) {
      const response = await axiosClient.post(
        `/auth/admin/formulas/${id}/clone`,
        { name },
      );
      return response.data;
    },
  },
  suppliers: {
    ...createCrudService<App.Entities.Supplier>("/auth/admin/suppliers"),
  },
  customers: {
    ...createCrudService<App.Entities.Customer>("/auth/admin/customers"),
  },
  notifications: {
    ...createCrudService<App.Entities.Notification>(
      "/auth/admin/notifications",
    ),
    async markAsRead(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/notifications/${id}/mark-as-read`,
      );
      return response.data;
    },
    async markAsUnread(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/notifications/${id}/mark-as-unread`,
      );
      return response.data;
    },
    async markAllAsRead() {
      const response = await axiosClient.post(
        "/auth/admin/notifications/mark-all-as-read",
      );
      return response.data;
    },
    async getUnreadCount() {
      const response = await axiosClient.get(
        "/auth/admin/notifications/unread-count",
      );
      return response.data;
    },
  },
  deviceTokens: {
    async register(payload: {
      token: string;
      device_type?: "ios" | "android" | "web";
      device_name?: string;
      app_version?: string;
    }) {
      const response = await axiosClient.post(
        "/auth/admin/device-tokens/register",
        payload,
      );
      return response.data;
    },
    async deactivate(payload: { token: string }) {
      const response = await axiosClient.post(
        "/auth/admin/device-tokens/deactivate",
        payload,
      );
      return response.data;
    },
    async index() {
      const response = await axiosClient.get("/auth/admin/device-tokens");
      return response.data;
    },
    async destroy(id: number) {
      const response = await axiosClient.delete(
        `/auth/admin/device-tokens/${id}`,
      );
      return response.data;
    },
  },
  /**
   * Preferencias de notificación de la empresa o, con scope "location", de la
   * sucursal actual (hereda las de la empresa hasta que se personaliza).
   */
  notificationPreferences: {
    async index(scope?: "location") {
      const response = await axiosClient.get(
        "/auth/admin/notification-preferences",
        { params: scope ? { scope } : undefined },
      );
      return response.data;
    },
    async update(
      eventType: App.Entities.NotificationEventType,
      data: Partial<
        Pick<App.Entities.NotificationPreference, "channel_db" | "channel_email" | "channel_push" | "is_active"> &
        { allowed_user_ids: number[] | null }
      >,
      scope?: "location",
    ) {
      // JSON, no multipart (el default del cliente): PHP no lee cuerpos
      // multipart en PATCH, así que el backend recibía la petición vacía y
      // guardaba los valores por defecto de la tabla en vez del cambio (y
      // allowed_user_ids null no se puede mandar como form-data).
      const response = await axiosClient.patch(
        `/auth/admin/notification-preferences/${eventType}`,
        data,
        { headers: { "Content-Type": "application/json" }, params: scope ? { scope } : undefined },
      );
      return response.data;
    },
    /** Quita la configuración propia del aviso: la sucursal vuelve a la de la empresa. */
    async restore(eventType: App.Entities.NotificationEventType, scope?: "location") {
      const response = await axiosClient.delete(
        `/auth/admin/notification-preferences/${eventType}`,
        { params: scope ? { scope } : undefined },
      );
      return response.data;
    },
    async eligibleUsers(
      eventType: App.Entities.NotificationEventType,
      params?: { location_id?: number; scope?: "location" },
    ) {
      const response = await axiosClient.get(
        `/auth/admin/notification-preferences/${eventType}/eligible-users`,
        { params },
      );
      return response.data;
    },
    async reset(scope?: "location") {
      const response = await axiosClient.post(
        "/auth/admin/notification-preferences/reset",
        undefined,
        { params: scope ? { scope } : undefined },
      );
      return response.data;
    },
  },
  tasks: {
    ...createCrudService<App.Entities.Task>("/auth/admin/tasks"),
    async eligibleUsers(params: { location_id: number; type?: App.Entities.TaskType }) {
      const response = await axiosClient.get("/auth/admin/tasks/eligible-users", {
        params,
      });
      return response.data;
    },
    async getStatistics(params?: { location_id?: number }) {
      const response = await axiosClient.get("/auth/admin/tasks/statistics", {
        params,
      });
      return response.data;
    },
    async changeStatus(
      taskId: number,
      action: "start" | "complete" | "cancel",
    ) {
      const response = await axiosClient.post(
        `/auth/admin/tasks/${taskId}/change-status`,
        { action },
      );
      return response.data;
    },
    async addComment(taskId: number, comment: string, attachments?: any[]) {
      const response = await axiosClient.post(
        `/auth/admin/tasks/${taskId}/comments`,
        { comment, attachments },
      );
      return response.data;
    },
  },
  inventory: {
    async getCurrentStock(params: {
      product_id: number;
      location_id: number;
      company_id: number;
    }) {
      const response = await axiosClient.get(
        "/auth/admin/inventory/stock/current",
        { params },
      );
      return response.data as {
        success: boolean;
        data: { current_stock: number };
      };
    },
  },
  inventoryCounts: {
    ...createCrudService<App.Entities.InventoryCount.InventoryCount>(
      "/auth/admin/inventory-counts",
    ),
  },
  inventoryCountsDetails: {
    ...createCrudService<App.Entities.InventoryCount.Detail>(
      "/auth/admin/inventory-counts-details",
    ),
  },
  reports: {
    // Únicos reportes vigentes del esquema anterior; el dashboard es reportsV2.
    inventoryStats: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/inventory-stats", {
        params,
      });
      return response;
    },
  },
  reportsV2: {
    dashboard: async (params?: any) => {
      const response = await api.get("/auth/admin/reports-v2/dashboard", {
        params,
      });
      return response;
    },
  },
  cashMovements: {
    ...createCrudService<any>("/auth/admin/cash-movements"),
    async stats(params?: {
      start_date?: string;
      end_date?: string;
      date?: string;
    }) {
      const response = await axiosClient.get("/auth/admin/cash-movements/stats", { params });
      return response.data;
    },
  },
  // Cajas por sucursal (catálogo) y turnos de cajero.
  cashRegisters: {
    ...createCrudService<App.Entities.CashRegister>("/auth/admin/cash-registers"),
  },
  cashRegisterSessions: {
    async index(params?: Record<string, any>) {
      const response = await axiosClient.get("/auth/admin/cash-register-sessions", { params });
      return response.data as { data: App.Entities.CashRegisterSession[]; meta: any };
    },
    /** Turno abierto del usuario (null si no tiene) con sus totales en vivo. */
    async current() {
      const response = await axiosClient.get("/auth/admin/cash-register-sessions/current");
      return response.data as {
        data: App.Entities.CashRegisterSession | null;
        summary: App.Entities.CashRegisterSessionSummary | null;
      };
    },
    async open(payload: { cash_register_id: number; opening_amount: number }) {
      const response = await axiosClient.post("/auth/admin/cash-register-sessions/open", payload);
      return response.data as { data: App.Entities.CashRegisterSession };
    },
    async show(id: number) {
      const response = await axiosClient.get(`/auth/admin/cash-register-sessions/${id}`);
      return response.data as {
        data: App.Entities.CashRegisterSession;
        summary: App.Entities.CashRegisterSessionSummary | null;
      };
    },
    async close(id: number, payload: { counted_cash: number; notes?: string }) {
      const response = await axiosClient.post(`/auth/admin/cash-register-sessions/${id}/close`, payload);
      return response.data as {
        data: App.Entities.CashRegisterSession;
        summary: App.Entities.CashRegisterSessionSummary;
      };
    },
  },
  // Punto de venta para cajeros.
  pos: {
    async catalog() {
      const response = await axiosClient.get("/auth/admin/pos/catalog");
      return response.data as { data: App.Entities.PosCatalogItem[] };
    },
    async sale(payload: App.Entities.PosSalePayload) {
      const response = await axiosClient.post("/auth/admin/pos/sales", payload);
      return response.data as { message: string; data: App.Entities.PosSaleResult };
    },
  },
  cashClosings: {
    ...createCrudService<any>("/auth/admin/cash-closings"),
    async pdfUrl(id: number) {
      const response = await axiosClient.get(
        `/auth/admin/cash-closings/${id}/pdf-url`,
      );
      return response.data as { url: string; expires_at: string };
    },
  },
  home: {
    clientes: createCrudService<any>("/auth/admin/customers"),
    proveedores: createCrudService<any>("/api/proveedores"),
    unidades: {
      ...createCrudService<any>("/auth/admin/units"),
      async getGroupedByBase(params?: { company_id?: number; unit_id?: number }) {
        const response = await axiosClient.get(
          "/auth/admin/units/grouped-by-base",
          {
            params,
          },
        );
        return response.data;
      },
      async getGroupedByType(params?: { company_id?: number }) {
        const response = await axiosClient.get(
          "/auth/admin/units/grouped-by-type",
          {
            params,
          },
        );
        return response.data;
      },
    },
    customerNotes: createCrudService<any>("/auth/admin/customer-notes"),
  },
};

export { Services };
export default Services;
