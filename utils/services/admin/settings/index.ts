import axiosClient from "@/utils/axios";

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
    return axiosClient.put(`/auth/admin/locations/${locationId}/settings`, {
      settings,
    });
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
      data
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
