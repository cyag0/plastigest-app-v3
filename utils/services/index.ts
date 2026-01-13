import { default as api, default as axiosClient } from "../axios";
import admin from "./admin/admin";
import { createCrudService } from "./crudService";
import saleService from "./saleService";

const movements = {
  adjustments: createCrudService<App.Entities.Adjustment.Adjustment>(
    "/auth/admin/adjustments"
  ),
};

const Services = {
  admin,
  users: {
    ...createCrudService<App.Entities.User>("/auth/admin/users"),
  },
  categories: {
    ...createCrudService<App.Entities.Category>("/auth/admin/categories"),
  },
  products: {
    ...createCrudService<App.Entities.Product>("/auth/admin/products"),
    async printLabels(productId: number, quantity: number) {
      const response = await axiosClient.post(
        `/auth/admin/products/${productId}/print-labels`,
        { quantity },
        {
          responseType: "blob",
        }
      );
      return response.data;
    },
  },
  transfers: {
    ...createCrudService<App.Entities.Company>("/auth/admin/movements"),
  },
  productPackages: {
    ...createCrudService<any>("/auth/admin/product-packages"),
    async searchByBarcode(barcode: string) {
      const response = await axiosClient.post(
        "/auth/admin/product-packages/search-barcode",
        { barcode }
      );
      return response.data;
    },
    async generateBarcode(productId: number) {
      const response = await axiosClient.post(
        "/auth/admin/product-packages/generate-barcode",
        { product_id: productId }
      );
      return response.data;
    },
  },
  companies: {
    ...createCrudService<App.Entities.Company>("/auth/admin/companies"),
  },
  purchases: {
    ...createCrudService<App.Entities.Purchase>("/auth/admin/purchases"),
    async getStats(params?: {
      location_id?: number;
      start_date?: string;
      end_date?: string;
    }) {
      const response = await axiosClient.get("/auth/admin/purchases/stats", {
        params,
      });
      return response.data;
    },
    async updateDetails(purchaseId: number, data: any) {
      const response = await axiosClient.post(
        `/auth/admin/purchases/${purchaseId}/details`,
        data
      );
      return response.data;
    },
    async startOrder(purchaseId: number) {
      const response = await axiosClient.post(
        `/auth/admin/purchases/${purchaseId}/start-order`
      );
      return response.data;
    },
    async receivePurchase(purchaseId: number) {
      const response = await axiosClient.post(
        `/auth/admin/purchases/${purchaseId}/receive`
      );
      return response.data;
    },
  },
  sales: {
    ...createCrudService<App.Entities.Sale>("/auth/admin/sales"),
    ...saleService,
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
        }
      );
      return response.data;
    },
  },
  salesReports: {
    ...createCrudService<any>("/auth/admin/sales-reports"),
  },
  productions: {
    ...createCrudService<any>("/auth/admin/productions"),
  },
  suppliers: {
    ...createCrudService<App.Entities.Supplier>("/auth/admin/suppliers"),
  },
  customers: {
    ...createCrudService<App.Entities.Customer>("/auth/admin/customers"),
  },
  notifications: {
    ...createCrudService<App.Entities.Notification>(
      "/auth/admin/notifications"
    ),
    async markAsRead(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/notifications/${id}/mark-as-read`
      );
      return response.data;
    },
    async markAsUnread(id: number) {
      const response = await axiosClient.post(
        `/auth/admin/notifications/${id}/mark-as-unread`
      );
      return response.data;
    },
    async markAllAsRead() {
      const response = await axiosClient.post(
        "/auth/admin/notifications/mark-all-as-read"
      );
      return response.data;
    },
    async getUnreadCount() {
      const response = await axiosClient.get(
        "/auth/admin/notifications/unread-count"
      );
      return response.data;
    },
  },
  tasks: {
    ...createCrudService<App.Entities.Task>("/auth/admin/tasks"),
    async getStatistics(params?: { location_id?: number }) {
      const response = await axiosClient.get("/auth/admin/tasks/statistics", {
        params,
      });
      return response.data;
    },
    async changeStatus(
      taskId: number,
      action: "start" | "complete" | "cancel"
    ) {
      const response = await axiosClient.post(
        `/auth/admin/tasks/${taskId}/change-status`,
        { action }
      );
      return response.data;
    },
    async addComment(taskId: number, comment: string, attachments?: any[]) {
      const response = await axiosClient.post(
        `/auth/admin/tasks/${taskId}/comments`,
        { comment, attachments }
      );
      return response.data;
    },
  },
  inventory: {
    ...createCrudService<any>("/auth/admin/inventory"),
  },
  inventoryCounts: {
    ...createCrudService<App.Entities.InventoryCount.InventoryCount>(
      "/auth/admin/inventory-counts"
    ),
  },
  inventoryCountsDetails: {
    ...createCrudService<App.Entities.InventoryCount.Detail>(
      "/auth/admin/inventory-counts-details"
    ),
  },
  reports: {
    dashboard: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/dashboard", {
        params,
      });
      return response;
    },
    inventoryStats: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/inventory-stats", {
        params,
      });
      return response;
    },
    recentMovements: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/recent-movements", {
        params,
      });
      return response;
    },
    movementsByType: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/movements-by-type", {
        params,
      });
      return response;
    },
    topProducts: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/top-products", {
        params,
      });
      return response;
    },
    salesTrend: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/sales-trend", {
        params,
      });
      return response;
    },
    salesByLocation: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/sales-by-location", {
        params,
      });
      return response;
    },
    lowStockProducts: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/low-stock-products", {
        params,
      });
      return response;
    },
    paymentMethods: async (params?: any) => {
      const response = await api.get("/auth/admin/reports/payment-methods", {
        params,
      });
      return response;
    },
  },
  movements,
  home: {
    clientes: createCrudService<any>("/auth/admin/customers"),
    proveedores: createCrudService<any>("/api/proveedores"),
    unidades: {
      ...createCrudService<any>("/auth/admin/units"),
      async getGroupedByBase(params?: { company_id?: number }) {
        const response = await axiosClient.get(
          "/auth/admin/units/grouped-by-base",
          {
            params,
          }
        );
        return response.data;
      },
      async getGroupedByType(params?: { company_id?: number }) {
        const response = await axiosClient.get(
          "/auth/admin/units/grouped-by-type",
          {
            params,
          }
        );
        return response.data;
      },
    },
    customerNotes: createCrudService<any>("/auth/admin/customer-notes"),
  },
};

export { Services };
export default Services;
