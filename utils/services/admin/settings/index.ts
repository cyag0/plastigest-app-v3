import axiosClient from "@/utils/axios";

// PUT en JSON: el cliente manda multipart por defecto y PHP no lee cuerpos
// multipart en PUT/PATCH (el backend recibiría la petición vacía).
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

const settingsService = {
  /**
   * Get settings for a specific location
   */
  getSettings: (locationId: number) => {
    return axiosClient.get(`/auth/admin/locations/${locationId}/settings`);
  },

  /**
   * Update all settings for a location
   */
  updateSettings: (
    locationId: number,
    settings: App.Entities.LocationSettings
  ) => {
    return axiosClient.put(
      `/auth/admin/locations/${locationId}/settings`,
      { settings },
      JSON_HEADERS,
    );
  },

  /**
   * Update a specific section of settings
   */
  updateSection: (
    locationId: number,
    section:
      | "notifications"
      | "working_hours"
      | "auto_tasks"
      | "limits"
      | "features",
    data: any
  ) => {
    return axiosClient.put(
      `/auth/admin/locations/${locationId}/settings/${section}`,
      data,
      JSON_HEADERS,
    );
  },

  /**
   * Reset settings to default
   */
  resetSettings: (locationId: number) => {
    return axiosClient.post(
      `/auth/admin/locations/${locationId}/settings/reset`
    );
  },
};

export default settingsService;
