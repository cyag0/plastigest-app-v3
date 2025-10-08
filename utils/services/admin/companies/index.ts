import createCrudService from "../../crudService";

export default {
  ...createCrudService<App.Entities.Company>("/auth/admin/companies"),
};
