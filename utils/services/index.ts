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
    ...createCrudService<App.Entities.Company>("/auth/admin/companies"),
  },
};

export default Services;
