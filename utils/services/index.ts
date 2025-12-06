import admin from "./admin/admin";
import { createCrudService } from "./crudService";
import saleService from "./saleService";
import transferService from "./transferService";

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
  movements,
  home: {
    clientes: createCrudService<any>("/auth/admin/customers"),
    proveedores: createCrudService<any>("/api/proveedores"),
    unidades: createCrudService<any>("/auth/admin/units"),
    customerNotes: createCrudService<any>("/auth/admin/customer-notes"),
  },
  transfers: transferService,
};

export default Services;
