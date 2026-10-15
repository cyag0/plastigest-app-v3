/**
 * Formato de números para mostrar (es-MX).
 *
 * El backend manda cantidades con 3 decimales ("70.000"): en México eso se lee
 * como setenta mil. Las cantidades se muestran sin ceros de sobra (70, 2.5) y
 * el dinero siempre con 2 decimales.
 */

const LOCALE = "es-MX";

type NumberInput = number | string | null | undefined;

function toNumber(value: NumberInput): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** $1,234.50 */
export function formatMoney(value: NumberInput): string {
  const n = toNumber(value) ?? 0;
  return n.toLocaleString(LOCALE, { style: "currency", currency: "MXN" });
}

/** 70 · 2.5 · 1,250.125 — con unidad opcional: "70 pz". */
export function formatQuantity(value: NumberInput, unit?: string | null): string {
  const n = toNumber(value) ?? 0;
  const text = n.toLocaleString(LOCALE, { maximumFractionDigits: 3 });
  return unit ? `${text} ${unit}` : text;
}
