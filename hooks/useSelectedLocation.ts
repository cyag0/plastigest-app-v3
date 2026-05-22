import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

interface Location {
  id: number;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  company_id: number;
  company_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseSelectedLocationReturn {
  selectedLocation: App.Entities.Location | null;
  locations: App.Entities.Location[];
  isLoadingLocations: boolean;
  hasLocationSelected: boolean;
  loadLocations: () => Promise<void>;
  selectLocation: (location: App.Entities.Location | null) => Promise<void>;
  clearLocationSelection: () => Promise<void>;
}

const LOCATIONS_LIST_KEY = "locations_list";

export function useSelectedLocation(): UseSelectedLocationReturn {
  const { company } = useSelectedCompany();
  const { location: selectedLocation, selectLocation } = useAuth();
  const [locations, setLocations] = useState<App.Entities.Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Cargar ubicaciones de la compañía actual
  const loadLocations = useCallback(async () => {
    if (!company?.id) {
      setLocations([]);
      return;
    }

    try {
      setIsLoadingLocations(true);

      const response = await Services.admin.locations.index({
        company_id: company.id,
        all: true,
      });

      let locationsData = response.data;

      // Si la respuesta es paginada, extraer el array de datos
      if (
        locationsData &&
        typeof locationsData === "object" &&
        "data" in locationsData
      ) {
        locationsData = locationsData.data;
      }

      if (Array.isArray(locationsData)) {
        setLocations(locationsData as App.Entities.Location[]);
        await AsyncStorage.setItem(
          `${LOCATIONS_LIST_KEY}_${company.id}`,
          JSON.stringify(locationsData)
        );
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      // Intentar cargar desde caché local
      try {
        const cachedLocations = await AsyncStorage.getItem(
          `${LOCATIONS_LIST_KEY}_${company.id}`
        );
        if (cachedLocations) {
          setLocations(JSON.parse(cachedLocations));
        }
      } catch (cacheError) {
        console.error("Error loading cached locations:", cacheError);
      }
    } finally {
      setIsLoadingLocations(false);
    }
  }, [company?.id]);

  // Limpiar selección de ubicación
  const clearLocationSelection = useCallback(async () => {
    try {
      await selectLocation(null);
    } catch (error) {
      console.error("Error clearing location selection:", error);
    }
  }, [selectLocation]);


  return {
    selectedLocation,
    locations,
    isLoadingLocations,
    hasLocationSelected: !!selectedLocation,
    loadLocations,
    selectLocation,
    clearLocationSelection,
  };
}
