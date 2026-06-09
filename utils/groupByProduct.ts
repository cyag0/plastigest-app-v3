/**
 * Utilidades para fusionar/agrupar filas de productos (consumos, salidas, etc.)
 * por product_id, conservando la primera unidad registrada.
 *
 * Usado por:
 * - FormulaPickerModal: al confirmar fórmulas, suma cantidades si el
 *   producto objetivo o algún ingrediente ya existe en la tabla destino.
 * - InventorySummaryPanel: agrupa filas para mostrar el resumen consolidado.
 */

export interface ProductRow {
  product_id: number;
  unit_id: number;
  quantity: number;
  // Campos auxiliares que se conservan al fusionar (notes, _key, etc.)
  [key: string]: any;
}

const newKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Fusiona una nueva fila en un arreglo de filas, agrupando por product_id.
 *
 * Reglas:
 * - Si ya existe una fila con el mismo `product_id`, suma la cantidad
 *   (`quantity`) de `newRow` a la existente y mantiene la primera unidad
 *   (`unit_id`) registrada (no se sobreescribe).
 * - Si no existe, agrega `newRow` al final con un `_key` único.
 *
 * @param rows   Arreglo actual de filas (no se muta).
 * @param newRow Fila a fusionar.
 * @param keyPrefix Prefijo para el `_key` autogenerado (por defecto "row").
 */
export function mergeProductRow<T extends ProductRow>(
  rows: T[],
  newRow: T,
  keyPrefix: string = "row",
): T[] {
  const existingIndex = rows.findIndex(
    (r) => Number(r.product_id) === Number(newRow.product_id) && r.product_id,
  );

  if (existingIndex >= 0) {
    const next = rows.slice();
    const existing = next[existingIndex];
    next[existingIndex] = {
      ...existing,
      quantity: Number(existing.quantity ?? 0) + Number(newRow.quantity ?? 0),
      // unit_id se respeta al existente — no se sobreescribe con el nuevo.
    } as T;
    return next;
  }

  const rowWithKey = { ...newRow, _key: newKey(keyPrefix) } as T;
  return [...rows, rowWithKey];
}

/**
 * Variante que acepta varias filas a la vez y devuelve el resultado tras
 * aplicar `mergeProductRow` secuencialmente.
 */
export function mergeProductRows<T extends ProductRow>(
  rows: T[],
  newRows: T[],
  keyPrefix: string = "row",
): T[] {
  let acc = rows;
  for (const r of newRows) {
    acc = mergeProductRow(acc, r, keyPrefix);
  }
  return acc;
}

/**
 * Agrupa filas por product_id sumando cantidades. Útil para vistas de
 * resumen (no muta el arreglo original).
 */
export function groupByProduct<
  T extends { product_id: number; quantity?: number | null; [k: string]: any },
>(rows: T[]): Array<{ product_id: number; quantity: number; rows: T[] }> {
  const map = new Map<number, { product_id: number; quantity: number; rows: T[] }>();
  for (const r of rows) {
    if (!r.product_id) continue;
    const key = r.product_id;
    const prev = map.get(key);
    if (prev) {
      prev.quantity += Number(r.quantity ?? 0);
      prev.rows.push(r);
    } else {
      map.set(key, {
        product_id: key,
        quantity: Number(r.quantity ?? 0),
        rows: [r],
      });
    }
  }
  return Array.from(map.values());
}
