import { lineTotalCents, roundMoney, roundQuantity } from "@/utils/money";

/**
 * Renglones de venta en otra unidad del mismo tipo (gramos de un producto que
 * se vende por kilo, docenas de uno por pieza).
 *
 * El servidor guarda cada renglón en la unidad del producto (SalePricing):
 * cantidad × factor de la unidad elegida ÷ factor de la del producto, a
 * milésimas, y precio por unidad del producto, en centavos. La pantalla deja
 * elegir la unidad, pero calcula el importe y manda el renglón ya convertido,
 * así el total que ve el cajero es el que registra el servidor. Antes se
 * mandaba el precio por gramo redondeado al centavo ($25/kg → $0.03/g) y
 * 500 g se cobraban $15.00 en lugar de $12.50.
 */

export interface SaleUnit {
  id: number;
  /** La API lo manda como texto ("0.001000"). */
  factor_to_base?: number | string | null;
}

/** factor_to_base como número: sin factor, 1 (como el servidor); NaN si no sirve. */
export function unitFactor(unit: SaleUnit): number {
  const raw = unit.factor_to_base;
  if (raw === undefined || raw === null || raw === "") return 1;
  const factor = Number(raw);
  return Number.isFinite(factor) && factor > 0 ? factor : NaN;
}

/**
 * Unidades del producto en una de la unidad elegida, con los factores del
 * inventario: gramo de un producto por kilo, 0.001; docena de uno por pieza,
 * 12; pieza de uno por docena, 1/12. La misma unidad, 1. NaN si falta alguna
 * de las dos o su factor no sirve (el servidor la rechazaría).
 */
export function unitRatio(
  unit: SaleUnit | null | undefined,
  productUnit: SaleUnit | null | undefined,
): number {
  if (!unit || !productUnit) return NaN;
  if (unit.id === productUnit.id) return 1;
  return unitFactor(unit) / unitFactor(productUnit);
}

/** Precio por la unidad elegida, solo para mostrarlo ($25/kg → $0.025/g). */
export function unitDisplayPrice(productUnitPrice: number, ratio: number): number {
  return productUnitPrice * ratio;
}

/** Renglón como lo manda la app y lo guarda el servidor: en la unidad del producto. */
export interface NormalizedSaleLine {
  unit_id: number;
  quantity: number;
  unit_price: number;
}

/**
 * Pasa un renglón a la unidad del producto: cantidad convertida a milésimas y
 * el precio por unidad del producto en centavos. 500 g de uno de $25/kg:
 * 0.5 kg a $25.00. La cantidad puede quedar en 0 (0.4 g = 0.0004 kg): quien
 * llama lo valida antes de mandarlo.
 */
export function normalizeSaleLine(
  quantity: number,
  ratio: number,
  productUnitPrice: number,
  productUnitId: number,
): NormalizedSaleLine {
  return {
    unit_id: productUnitId,
    quantity: roundQuantity(quantity * ratio),
    unit_price: roundMoney(productUnitPrice),
  };
}

/** Importe del renglón en centavos (C2), sobre el renglón ya convertido. */
export function normalizedLineCents(line: NormalizedSaleLine): number {
  return lineTotalCents(line.quantity, line.unit_price);
}
