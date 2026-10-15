import axiosClient from "@/utils/axios";
import createCrudService from "../crudService";

export default {
  ...createCrudService<App.Entities.User>("/auth/admin/users"),
  /** Quita al usuario de la sucursal actual; conserva sus otras sucursales. */
  removeFromCurrentLocation: (id: number) =>
    axiosClient.delete(`/auth/admin/users/${id}/current-location`),
};
