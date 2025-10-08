import axiosClient from "@/utils/axios";
import createCrudService from "../../crudService";

export default {
  ...createCrudService<App.Entities.Role>("/auth/admin/permissions"),
  async getByResource() {
    const response = await axiosClient.get(
      "/auth/admin/permissions/by-resource"
    );
    return response.data as {
      permissions_by_resource: { [key: string]: App.Entities.Permission[] };
      resources: App.Entities.Resource[];
    };
  },
};
