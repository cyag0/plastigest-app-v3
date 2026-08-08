import Services from "@/utils/services";
import React from "react";

type InventoryType = App.Entities.InventoryType;

/** Slug de ruta que significa "sin filtrar por tipo". */
export const ALL_INVENTORY_TYPES = "all";

interface UseInventoryTypesOptions {
  /** Incluir products_count en cada tipo (menú de inventario). */
  withCounts?: boolean;
  /** Traer también los tipos desactivados. */
  includeInactive?: boolean;
}

/**
 * Catálogo de tipos de inventario (materia prima, material de empaque,
 * semiterminado, producto terminado, mercancía de reventa, insumo).
 *
 * Cada tipo trae sus reglas de comportamiento (is_purchasable, is_sellable,
 * is_producible, is_consumable), así que las pantallas ya no necesitan listas
 * de códigos escritas a mano.
 */
export function useInventoryTypes(options: UseInventoryTypesOptions = {}) {
  const { withCounts = false, includeInactive = false } = options;

  const [types, setTypes] = React.useState<InventoryType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setError(null);

      const params: any = { all: true };
      if (withCounts) params.with_counts = 1;
      if (!includeInactive) params.is_active = 1;

      const response = await Services.inventoryTypes.index(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data;

      setTypes(data || []);
    } catch (e: any) {
      console.error("Error cargando tipos de inventario:", e);
      setError(e?.message || "No se pudieron cargar los tipos de inventario");
    } finally {
      setLoading(false);
    }
  }, [withCounts, includeInactive]);

  React.useEffect(() => {
    load();
  }, [load]);

  const byId = React.useMemo(() => {
    const map: Record<number, InventoryType> = {};
    types.forEach((type) => {
      map[type.id] = type;
    });
    return map;
  }, [types]);

  const byCode = React.useMemo(() => {
    const map: Record<string, InventoryType> = {};
    types.forEach((type) => {
      map[type.code] = type;
    });
    return map;
  }, [types]);

  // El slug viene del backend (sale del nombre: "Materia prima" → materia-prima)
  // y es lo que viaja en la URL.
  const bySlug = React.useMemo(() => {
    const map: Record<string, InventoryType> = {};
    types.forEach((type) => {
      if (type.slug) map[type.slug] = type;
    });
    return map;
  }, [types]);

  return { types, byId, byCode, bySlug, loading, error, reload: load };
}

export default useInventoryTypes;
