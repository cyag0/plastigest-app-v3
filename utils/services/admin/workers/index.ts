import createCrudService from "../../crudService";

export default {
  ...createCrudService<App.Entities.Worker>("/auth/admin/workers"),
};
