import admin from "./admin/admin";
import { createCrudService } from "./crudService";

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
  home: {
    clientes: createCrudService<any>("/auth/admin/customers"),
    proveedores: createCrudService<any>("/api/proveedores"),
    unidades: createCrudService<any>("/auth/admin/units"),
    customerNotes: createCrudService<any>("/auth/admin/customer-notes"),
  }
};

export default Services;
