import type { FilterConfig } from "@/components/App/AppList/AppListFilter";

/**
 * Filtro «Estado» de un catálogo con is_active (el backend lo aplica en
 * CrudController). "Activas" para sucursal, categoría, caja…, como el badge.
 */
export function activeFilter(feminine = false): FilterConfig {
  const ending = feminine ? "as" : "os";
  return {
    type: "simple",
    name: "is_active",
    label: "Estado",
    options: [
      { label: feminine ? "Todas" : "Todos", value: "" },
      { label: `Activ${ending}`, value: "1" },
      { label: `Inactiv${ending}`, value: "0" },
    ],
  };
}

/** Filtro «Fecha» por rango: la lista manda date_from y date_to. */
export const dateRangeFilter: FilterConfig = { type: "dateRange", name: "date", label: "Fecha" };
