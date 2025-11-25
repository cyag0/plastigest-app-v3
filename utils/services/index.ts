import api from "../axios";
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
  categories: {
    ...createCrudService<App.Entities.Category>("/auth/admin/categories"),
  },
  products: {
    ...createCrudService<App.Entities.Product>("/auth/admin/products"),
  },
  companies: {
    ...createCrudService<any>("/auth/admin/companies"),
  },
  purchases: {
    ...createCrudService<App.Entities.Purchase>("/auth/admin/purchases"),
  },
  sales: {
    ...createCrudService<App.Entities.Sale>("/auth/admin/sales"),
    ...saleService,
  },
  productions: {
    ...createCrudService<any>("/auth/admin/productions"),
  },
  suppliers: {
    ...createCrudService<App.Entities.Supplier>("/auth/admin/suppliers"),
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
  },
  movements,
  home: {
    clientes: createCrudService<any>("/auth/admin/customers"),
    proveedores: createCrudService<any>("/api/proveedores"),
    unidades: createCrudService<any>("/auth/admin/units"),
    customerNotes: createCrudService<any>("/auth/admin/customer-notes"),
  },
};

export default Services;
