/**
 * Unidades: su tipo de medida y cómo se lee su equivalencia.
 *
 * Cada unidad guarda su tipo (cantidad, peso, volumen, longitud) y su factor
 * respecto a la unidad base de ese tipo (pieza, kilogramo, litro): una
 * docena es 12, un gramo 0.001. La API no dice cuál es la base ni de qué
 * unidad se creó (base_unit_id no es columna), así que la base se deduce: la
 * de factor 1, de preferencia la del sistema.
 */

import Services from "@/utils/services";
import { useEffect, useState } from "react";

export const UNIT_TYPES = [
  { label: "Cantidad (piezas)", value: "quantity" },
  { label: "Peso (kg, g)", value: "mass" },
  { label: "Volumen (L, ml)", value: "volume" },
  { label: "Longitud (m, cm)", value: "length" },
];

const TYPE_NAMES: Record<string, string> = {
  quantity: "Cantidad",
  mass: "Peso",
  volume: "Volumen",
  length: "Longitud",
};

export function unitTypeName(type?: string | null): string {
  return (type && TYPE_NAMES[type]) || type || "—";
}

export interface UnitRecord {
  id: number;
  name: string;
  abbreviation: string;
  unit_type: string;
  company_id: number | null;
  factor_to_base: number | string | null;
}

/** Factor respecto a la base de su tipo (la API lo manda como "12.000000"). */
export function unitFactor(unit?: Pick<UnitRecord, "factor_to_base"> | null): number {
  const n = Number(unit?.factor_to_base);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** 12 · 0.001 · 1,000 · 0.453592 (hasta 6 decimales, sin ceros de sobra). */
export function formatFactor(n: number): string {
  return n.toLocaleString("es-MX", { maximumFractionDigits: 6 });
}

/** La unidad base de un tipo: factor 1; si hay varias, la del sistema y la más antigua. */
export function baseUnitOf(type: string | null | undefined, units: UnitRecord[]): UnitRecord | null {
  const candidates = units
    .filter((u) => u.unit_type === type && Math.abs(unitFactor(u) - 1) < 1e-9)
    .sort((a, b) => Number(a.company_id != null) - Number(b.company_id != null) || a.id - b.id);
  return candidates[0] ?? null;
}

/**
 * "1 dz = 12 pz", "1,000 g = 1 kg", "1 lb = 0.453592 kg". Null si la unidad
 * es la base de su tipo (o no se sabe cuál es).
 */
export function equivalenceText(
  unit: Pick<UnitRecord, "id" | "abbreviation" | "factor_to_base">,
  base: UnitRecord | null,
): string | null {
  if (!base || base.id === unit.id) return null;
  const factor = unitFactor(unit);
  if (factor < 1) {
    // Un gramo se lee mejor al revés: 1,000 g = 1 kg.
    const inverse = 1 / factor;
    if (Math.abs(inverse - Math.round(inverse)) < 1e-6 * inverse) {
      return `${formatFactor(Math.round(inverse))} ${unit.abbreviation} = 1 ${base.abbreviation}`;
    }
  }
  return `1 ${unit.abbreviation} = ${formatFactor(factor)} ${base.abbreviation}`;
}

/** Todas las unidades que ve la empresa (las del sistema y las suyas). */
export function useUnitsCatalog(): UnitRecord[] {
  const [units, setUnits] = useState<UnitRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // silent: sin el catálogo solo no se muestra la equivalencia.
        const res: any = await Services.home.unidades.index({ all: true }, { silent: true });
        const data = res?.data?.data ?? res?.data ?? [];
        if (!cancelled && Array.isArray(data)) setUnits(data);
      } catch {
        // Sin el catálogo no se muestra la equivalencia; lo demás funciona.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return units;
}
