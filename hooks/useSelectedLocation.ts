import { useSelectedCompany } from "@/hooks/useSelectedCompany";
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
  selectedLocation: Location | null;
  locations: Location[];
  isLoadingLocations: boolean;
  hasLocationSelected: boolean;
  loadLocations: () => Promise<void>;
  selectLocation: (location: Location) => Promise<void>;
  clearLocationSelection: () => Promise<void>;
}

const SELECTED_LOCATION_KEY = "selected_location";
const LOCATIONS_LIST_KEY = "locations_list";

export function useSelectedLocation(): UseSelectedLocationReturn {
  const { company } = useSelectedCompany();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [locations, setLocations] = useState<Location[]>([]);
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
        setLocations(locationsData as Location[]);
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

  // Seleccionar ubicación
  const selectLocation = useCallback(
    async (location: Location) => {
      try {
        setSelectedLocation(location);
        await AsyncStorage.setItem(
          `${SELECTED_LOCATION_KEY}_${company?.id}`,
          JSON.stringify(location)
        );
      } catch (error) {
        console.error("Error selecting location:", error);
      }
    },
    [company?.id]
  );

  // Limpiar selección de ubicación
  const clearLocationSelection = useCallback(async () => {
    try {
      setSelectedLocation(null);
      if (company?.id) {
        await AsyncStorage.removeItem(`${SELECTED_LOCATION_KEY}_${company.id}`);
      }
    } catch (error) {
      console.error("Error clearing location selection:", error);
    }
  }, [company?.id]);

  // Cargar ubicación seleccionada desde caché al cambiar de compañía
  useEffect(() => {
    const loadSelectedLocation = async () => {
      if (!company?.id) {
        setSelectedLocation(null);
        return;
      }

      try {
        const cachedLocation = await AsyncStorage.getItem(
          `${SELECTED_LOCATION_KEY}_${company.id}`
        );
        if (cachedLocation) {
          setSelectedLocation(JSON.parse(cachedLocation));
        } else {
          setSelectedLocation(null);
        }
      } catch (error) {
        console.error("Error loading selected location from cache:", error);
        setSelectedLocation(null);
      }
    };

    loadSelectedLocation();
  }, [company?.id]);

  // Cargar ubicaciones cuando cambie la compañía
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

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
