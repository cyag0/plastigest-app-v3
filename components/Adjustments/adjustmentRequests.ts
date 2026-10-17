/**
 * Peticiones de Ajustes que la pantalla explica por su cuenta (con
 * `silent: true`, para que no salga además el aviso global): abrir un
 * ajuste, registrar ajustes y lo que hace falta del producto al agregarlo.
 */

import axiosClient from "@/utils/axios";
import Services from "@/utils/services";
import { useEffect, useState } from "react";
import { rememberUnitAbbreviations, type AdjustmentRecord } from "./adjustmentFormat";

const BASE = "/auth/admin/inventory-adjustments";

/** Un ajuste (GET inventory-adjustments/{id}); el detalle explica el 404. */
export async function fetchAdjustment(id: number): Promise<AdjustmentRecord> {
  const response = await axiosClient.get(`${BASE}/${id}`, { silent: true });
  const body = response.data as any;
  return (body?.data ?? body) as AdjustmentRecord;
}

/**
 * Registra los ajustes (POST multipart: details[i][...] y las fotos en
 * details[i][evidence][]). El error lo muestra la barra del formulario.
 */
export async function createAdjustments(form: FormData): Promise<AdjustmentRecord[]> {
  const response = await axiosClient.post(BASE, form, { silent: true });
  const data = (response.data as any)?.data;
  return Array.isArray(data) ? data : [];
}

export interface UnitOption {
  id: number;
  name: string;
  abbreviation: string;
  /** Cuántas unidades base es una de esta (para convertir a la del producto). */
  factor: number;
}

export interface ProductForAdjustment {
  stock: number;
  unitType: string | null;
  code: string | null;
  /** Unidades en que se puede capturar (la del producto primero). */
  units: UnitOption[];
}

// Las unidades compatibles casi no cambian: una sola petición por unidad.
const unitsCache = new Map<number, Promise<UnitOption[]>>();

function compatibleUnits(unitId: number): Promise<UnitOption[]> {
  const cached = unitsCache.get(unitId);
  if (cached) return cached;
  const request = axiosClient
    .get("/auth/admin/units/grouped-by-base", { params: { unit_id: unitId }, silent: true })
    .then((response) => {
      const groups = (response.data as any)?.data ?? {};
      const rows: any[] = (Object.values(groups)[0] as any[]) ?? [];
      return (Array.isArray(rows) ? rows : []).map((u) => ({
        id: Number(u.id),
        name: String(u.name ?? ""),
        abbreviation: String(u.abbreviation ?? u.name ?? ""),
        factor: Number(u.factor_to_base) > 0 ? Number(u.factor_to_base) : 1,
      }));
    })
    .catch(() => {
      // Sin la lista se captura en la unidad del producto; se reintenta la próxima vez.
      unitsCache.delete(unitId);
      return [] as UnitOption[];
    });
  unitsCache.set(unitId, request);
  return request;
}

/**
 * Existencia del producto en la sucursal actual y las unidades en que se
 * puede capturar. Si falla, null: el renglón se queda con lo que mostró el
 * buscador.
 */
export async function loadProductForAdjustment(
  productId: number,
  unitId: number,
): Promise<ProductForAdjustment | null> {
  try {
    const [response, units] = await Promise.all([
      Services.products.show(productId, undefined, { silent: true }),
      compatibleUnits(unitId),
    ]);
    const product: any = (response.data as any)?.data ?? response.data;
    const own = units.find((u) => u.id === unitId);
    const ordered = own ? [own, ...units.filter((u) => u.id !== unitId)] : units;
    return {
      stock: Number(product?.current_stock ?? 0),
      unitType: product?.unit?.unit_type ?? null,
      code: product?.code ?? null,
      units: ordered,
    };
  } catch {
    return null;
  }
}

// Una sola carga por sesión (null mientras no haya una en curso o si falló).
let abbreviationsLoad: Promise<boolean> | null = null;

/**
 * Carga las abreviaturas de las unidades ("pz", "kg") para mostrar las
 * cantidades de los ajustes: el recurso no las trae. Devuelve true cuando ya
 * están (la pantalla vuelve a pintarse). grouped-by-base no pide permiso de
 * unidades, así que sirve a quien solo ve inventario.
 */
export function useUnitAbbreviations(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!abbreviationsLoad) {
      abbreviationsLoad = axiosClient
        .get("/auth/admin/units/grouped-by-base", { silent: true })
        .then((response) => {
          const groups = (response.data as any)?.data ?? {};
          const rows = Object.values(groups).flat() as any[];
          rememberUnitAbbreviations(rows.map((u) => [Number(u.id), String(u.abbreviation ?? "")]));
          return true;
        })
        .catch(() => {
          abbreviationsLoad = null;
          return false;
        });
    }
    abbreviationsLoad.then((ok) => {
      if (alive && ok) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
