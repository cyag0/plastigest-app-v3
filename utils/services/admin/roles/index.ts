import createCrudService from "../../crudService";

export default {
  ...createCrudService<App.Entities.Role>("/auth/admin/roles"),
};
