import createCrudService from "../../crudService";

export default {
  ...createCrudService<App.Entities.Location>("/auth/admin/locations"),
};
