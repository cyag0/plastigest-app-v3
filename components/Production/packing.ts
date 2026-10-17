/**
 * Cuentas del envasado, compartidas por el registro de producción y el
 * envasado aparte: cuánto granel se va en lo que se envasa, qué material de
 * empaque hace falta (sumado entre presentaciones: la misma tapa va en la
 * botella de 1 L y en la de ½ L) y si alcanza lo que hay.
 */

import { round3, toNumber } from "./productionFormat";

/** Unidades capturadas por presentación (product_id → texto del campo). */
export type Counts = Record<number, string>;

export const countOf = (counts: Counts | undefined, productId: number): number => {
  const n = toNumber(counts?.[productId]);
  return n == null ? 0 : Math.floor(n);
};

/** Granel que se va en lo capturado, en la unidad del granel. */
export function packedContent(bulk: App.Entities.ProductionBulk, counts: Counts | undefined): number {
  return round3(
    bulk.presentations.reduce((sum, p) => sum + countOf(counts, p.product_id) * p.content_in_bulk_unit, 0),
  );
}

export interface MaterialNeed {
  product_id: number;
  product_name: string;
  /** En la unidad base del material (piezas). */
  needed: number;
  stock: number;
  unit_abbreviation?: string | null;
  short: boolean;
}

/** Material de empaque de todo lo capturado, sumado por material. */
export function materialNeeds(
  bulks: App.Entities.ProductionBulk[],
  countsByBulk: Record<number, Counts>,
): MaterialNeed[] {
  const needs = new Map<number, MaterialNeed>();
  for (const bulk of bulks) {
    const counts = countsByBulk[bulk.product_id];
    if (!counts) continue;
    for (const presentation of bulk.presentations) {
      const units = countOf(counts, presentation.product_id);
      if (units <= 0) continue;
      for (const m of presentation.materials) {
        const prev = needs.get(m.product_id);
        const needed = round3((prev?.needed ?? 0) + units * m.quantity_per_unit_base);
        needs.set(m.product_id, {
          product_id: m.product_id,
          product_name: m.product_name ?? "Material",
          needed,
          stock: m.stock,
          unit_abbreviation: m.stock_unit_abbreviation ?? m.unit_abbreviation,
          short: needed > m.stock + 0.0001,
        });
      }
    }
  }
  return Array.from(needs.values());
}

/** Renglones de envasado para el API. */
export function packagingLines(countsByBulk: Record<number, Counts>): Array<{ product_id: number; quantity: number }> {
  const lines: Array<{ product_id: number; quantity: number }> = [];
  for (const counts of Object.values(countsByBulk)) {
    for (const [id, text] of Object.entries(counts)) {
      const n = toNumber(text);
      if (n && n > 0) lines.push({ product_id: Number(id), quantity: Math.floor(n) });
    }
  }
  return lines;
}

/** La presentación que corresponde a un código escaneado (código o código de barras de un paquete). */
export function findPresentation(
  bulks: App.Entities.ProductionBulk[],
  code: string,
): { bulk: App.Entities.ProductionBulk; presentation: App.Entities.ProductionPresentation } | null {
  const wanted = code.trim().toUpperCase();
  for (const bulk of bulks) {
    for (const presentation of bulk.presentations) {
      const codes = [presentation.product_code, ...(presentation.barcodes ?? [])]
        .filter(Boolean)
        .map((c) => String(c).toUpperCase());
      if (codes.includes(wanted)) return { bulk, presentation };
    }
  }
  return null;
}

/** "1 L" · "500 ml" · "0.25 kg" */
export const contentText = (p: App.Entities.ProductionPresentation) =>
  `${p.content.toLocaleString("es-MX", { maximumFractionDigits: 3 })} ${p.content_unit_abbreviation ?? ""}`.trim();
