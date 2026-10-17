/**
 * Textos de producción para mostrar: cantidades con unidad, el resumen de una
 * orden en una línea ("257 pz Coco Entero → 120 L Agua de coco…") y el
 * rendimiento ("0.47 L por coco").
 */

import { parseLocalDate } from "@/utils/dates";
import { formatQuantity } from "@/utils/format";

type Line = { product_name?: string | null; quantity: number; unit_abbreviation?: string | null };

/** "120 L" · "257 pz" */
export const qty = (value: number | null | undefined, unit?: string | null) =>
  formatQuantity(value ?? 0, unit ?? undefined);

/** "120 L Agua de coco (granel)" */
export const lineText = (line: Line) =>
  `${qty(line.quantity, line.unit_abbreviation)} ${line.product_name ?? "Producto"}`;

/** Nombre sin "(granel)": en un resumen ya se entiende. */
export const shortName = (name?: string | null) =>
  (name ?? "Producto").replace(/\s*\(granel\)\s*$/i, "");

/** Hasta `max` renglones y "+N más". */
function joinLines(lines: Line[], max: number): string {
  const shown = lines.slice(0, max).map((l) => `${qty(l.quantity, l.unit_abbreviation)} ${shortName(l.product_name)}`);
  const rest = lines.length - shown.length;
  return rest > 0 ? `${shown.join(" · ")} · +${rest} más` : shown.join(" · ");
}

/**
 * Resumen de una orden en una línea, para la lista:
 *   producción: "257 pz Coco Entero → 120 L Agua de coco · 38 kg Pulpa"
 *   envasado:   "30 L Agua de coco → 20 Agua de Coco 1 Litro · 20 …"
 */
export function orderSummary(order: App.Entities.ProductionOrder): string {
  if (order.kind === "packaging") {
    const packed = order.packagings ?? [];
    const planned = order.planned_packagings ?? [];
    const rows: Line[] = packed.length
      ? packed.map((p) => ({ product_name: p.product_name, quantity: p.quantity, unit_abbreviation: p.unit_abbreviation }))
      : planned.map((p) => ({ product_name: p.product_name, quantity: p.quantity, unit_abbreviation: p.unit_abbreviation }));
    const sources = new Map<string, { quantity: number; unit?: string | null }>();
    for (const p of packed) {
      if (!p.source_product_name) continue;
      const prev = sources.get(p.source_product_name);
      sources.set(p.source_product_name, {
        quantity: (prev?.quantity ?? 0) + (p.source_quantity ?? 0),
        unit: p.source_unit_abbreviation,
      });
    }
    const from = Array.from(sources.entries())
      .map(([name, s]) => `${qty(s.quantity, s.unit)} ${shortName(name)}`)
      .join(" · ");
    const to = joinLines(rows, 2);
    return from ? `${from} → ${to}` : to;
  }

  const inputs = joinLines(order.consumptions ?? [], 2);
  const outputs = joinLines(order.outputs ?? [], 2);
  if (inputs && outputs) return `${inputs} → ${outputs}`;
  return inputs || outputs || "Sin renglones";
}

/** "0.47 L por pz de Coco Entero" (o "por coco" si se puede decir así). */
export function yieldText(y: App.Entities.ProductionYield): string {
  const value = y.per_input.toLocaleString("es-MX", { maximumFractionDigits: y.per_input < 10 ? 2 : 1 });
  return `${value} ${y.unit_abbreviation ?? ""} de ${shortName(y.product_name)} por ${y.input_unit_abbreviation ?? "unidad"} de ${shortName(y.input_product_name)}`.replace(/\s+/g, " ");
}

/** "0.6 L por pz de Coco Entero" (sin repetir el producto que salió). */
export function yieldShort(y: App.Entities.ProductionYield): string {
  const value = y.per_input.toLocaleString("es-MX", { maximumFractionDigits: y.per_input < 10 ? 2 : 1 });
  return `${value} ${y.unit_abbreviation ?? ""} por ${y.input_unit_abbreviation ?? "unidad"} de ${shortName(y.input_product_name)}`.replace(/\s+/g, " ");
}

/** "Esperado 0.6 L · 8 % menos" */
export function yieldComparison(y: App.Entities.ProductionYield): string | null {
  if (y.expected_per_input == null) return null;
  const expected = `${y.expected_per_input.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${y.unit_abbreviation ?? ""}`.trim();
  if (y.variance_pct == null || Math.abs(y.variance_pct) < 0.5) return `Esperado ${expected} · como se esperaba`;
  const pct = Math.abs(y.variance_pct).toLocaleString("es-MX", { maximumFractionDigits: 0 });
  return `Esperado ${expected} · ${pct} % ${y.variance_pct < 0 ? "menos" : "más"}`;
}

/**
 * Rendimientos que vale la pena mostrar: los que el proceso espera (litros de
 * agua por coco). Se omiten los 1 a 1 (un coco → un coco para tomar) y los que
 * no tienen esperado (cada dulce por kilo de pulpa no dice nada).
 */
export function meaningfulYields(yields: App.Entities.ProductionYield[] | undefined): App.Entities.ProductionYield[] {
  return (yields ?? []).filter(
    (y) =>
      y.expected_per_input != null &&
      !(y.unit_abbreviation === y.input_unit_abbreviation && Math.abs(y.expected_per_input - 1) < 0.0001),
  );
}

/**
 * Para lo que sale por pieza sin esperado (los dulces): el total de piezas
 * por unidad del insumo principal ("5.8 pz por kg de Pulpa de coco").
 */
export function piecesYield(yields: App.Entities.ProductionYield[] | undefined): string | null {
  const rows = (yields ?? []).filter((y) => y.unit_abbreviation === "pz" && y.expected_per_input == null);
  if (rows.length < 2) return null;
  const total = rows.reduce((sum, y) => sum + y.quantity, 0);
  const perInput = rows.reduce((sum, y) => sum + y.per_input, 0);
  const first = rows[0];
  return `${qty(total, "pz")} en total · ${perInput.toLocaleString("es-MX", { maximumFractionDigits: 1 })} pz por ${first.input_unit_abbreviation ?? "unidad"} de ${shortName(first.input_product_name)}`;
}

/** "Hoy" · "Ayer" · "Jueves 15 oct" */
export function dayTitle(date: string): string {
  const d = parseLocalDate(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  const text = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Número capturado en un campo ("12.5", "", "abc" → null). */
export function toNumber(text: string | undefined | null): number | null {
  if (text == null) return null;
  const clean = String(text).replace(",", ".").trim();
  if (clean === "") return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Redondeo para comparar cantidades sin ruido de punto flotante. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000;
