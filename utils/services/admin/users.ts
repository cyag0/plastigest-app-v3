import createCrudService from "../crudService";

export default {
  ...createCrudService<App.Entities.User>("/auth/admin/users"),
};
