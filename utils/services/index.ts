import admin from "./admin/admin";
import { createCrudService } from "./crudService";
import saleService from "./saleService";

const Services = {
  admin,
  categories: {
    ...createCrudService<App.Entities.Category>("/auth/admin/categories"),
  },
  products: {
    ...createCrudService<App.Entities.Product>("/auth/admin/products"),
  },
  companies: {
    ...createCrudService<App.Entities.Company>("/auth/admin/companies"),
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
};

export default Services;
