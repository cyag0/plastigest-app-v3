import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import type { FilterConfig } from "@/components/App/AppList/AppListFilter";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import { shortLocationName } from "@/utils/locations";
import Services from "@/utils/services";
import { useEffect, useMemo, useState } from "react";

type Option = { id: number; name: string };

/** Los renglones de un index: arreglo, { data } o paginado. */
function rowsOf(response: any): Option[] {
  const data = response?.data?.data ?? response?.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Filtro «Sucursal» de las listas con registros de varias sucursales
 * (ventas, cajas, cierres). Solo quien entra a todas (system_admin o
 * locations_all) las ve mezcladas; a los demás el backend ya les muestra solo
 * la suya, así que para ellos (o con una sola sucursal) devuelve null.
 */
export function useLocationFilter(): FilterConfig | null {
  const allLocations = useAllLocationsAccess();
  const { selectedCompany } = useAuth();
  const [locations, setLocations] = useState<Option[]>([]);

  useEffect(() => {
    if (!allLocations || !selectedCompany?.id) return;
    let cancelled = false;
    // silent: si falla, la lista simplemente no ofrece el filtro.
    Services.admin.locations
      .index({ all: true }, { silent: true })
      .then((res) => {
        if (!cancelled) setLocations(rowsOf(res));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allLocations, selectedCompany?.id]);

  return useMemo(() => {
    if (!allLocations || locations.length < 2) return null;
    return {
      type: "simple",
      name: "location_id",
      label: "Sucursal",
      options: [
        { label: "Todas", value: "" },
        ...locations.map((l) => ({
          label: shortLocationName(l.name, selectedCompany?.name),
          value: String(l.id),
        })),
      ],
    };
  }, [allLocations, locations, selectedCompany?.name]);
}

/**
 * Filtro «Categoría» (category_id). Pide categories_list; sin él, o sin
 * categorías, devuelve null.
 */
export function useCategoryFilter(): FilterConfig | null {
  const { can } = useCan();
  const canList = can("categories_list");
  const [categories, setCategories] = useState<Option[]>([]);

  useEffect(() => {
    if (!canList) return;
    let cancelled = false;
    Services.categories
      .index({ all: true }, { silent: true })
      .then((res) => {
        if (!cancelled) setCategories(rowsOf(res));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canList]);

  return useMemo(() => {
    if (!canList || categories.length === 0) return null;
    return {
      type: "simple",
      name: "category_id",
      label: "Categoría",
      options: [
        { label: "Todas", value: "" },
        ...categories.map((c) => ({ label: c.name, value: String(c.id) })),
      ],
    };
  }, [canList, categories]);
}
