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

/**
 * Precio por unidad para mostrar: como formatMoney, pero debajo de $1 y sin
 * ser un centavo exacto, con hasta 4 decimales ($25/kg vendido por gramo es
 * $0.025, no "$0.03"). El importe se sigue calculando en centavos.
 */
export function formatUnitPrice(value: NumberInput): string {
  const n = toNumber(value) ?? 0;
  if (Math.abs(n) >= 1 || Math.abs(n * 100 - Math.round(n * 100)) < 1e-6) return formatMoney(n);
  return n.toLocaleString(LOCALE, {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/** 70 · 2.5 · 1,250.125 — con unidad opcional: "70 pz". */
export function formatQuantity(value: NumberInput, unit?: string | null): string {
  const n = toNumber(value) ?? 0;
  const text = n.toLocaleString(LOCALE, { maximumFractionDigits: 3 });
  return unit ? `${text} ${unit}` : text;
}

/* ───────────────────────── Lectura de lo capturado ───────────────────────── */

// 1500 · 1500.5 · 1500. (a medio escribir) · .5
const PLAIN_NUMBER = /^(\d+(\.\d*)?|\.\d+)$/;
// 1,500 · 1,500.50 · 12,345,678 — grupos de 3 y sin "0," al inicio.
const GROUPED_NUMBER = /^[1-9]\d{0,2}(,\d{3})+(\.\d*)?$/;
// Un solo grupo de miles sin decimales: "1,500".
const SINGLE_GROUP = /^[1-9]\d{0,2},\d{3}$/;
// 12,5 · 1500,50 — coma decimal: con 1 o 2 dígitos no puede ser de miles.
const DECIMAL_COMMA = /^\d+,\d{1,2}$/;

function parseCaptured(
  input: NumberInput,
  options: { currency: boolean; singleGroup: "thousands" | "reject" }
): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return input === 0 ? 0 : input; // sin -0
  }
  if (typeof input !== "string") return null;

  let text = input.replace(/\s/g, "");
  if (options.currency) text = text.replace("$", ""); // "$1,500", "-$20", "$-20"

  let sign = 1;
  if (text.startsWith("-") || text.startsWith("+")) {
    if (text.startsWith("-")) sign = -1;
    text = text.slice(1);
  }
  if (text === "") return null;

  let normalized: string;
  if (PLAIN_NUMBER.test(text)) {
    normalized = text;
  } else if (GROUPED_NUMBER.test(text)) {
    if (options.singleGroup === "reject" && SINGLE_GROUP.test(text)) return null;
    normalized = text.replace(/,/g, "");
  } else if (DECIMAL_COMMA.test(text)) {
    normalized = text.replace(",", ".");
  } else {
    return null;
  }

  const n = sign * Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n === 0 ? 0 : n;
}

/**
 * Lee un monto capturado en formato mexicano: "," separa miles y "." los
 * decimales ("1,500.50" → 1500.5, "1,500" → 1500, "1.5" → 1.5). Tolera "$" y
 * espacios. Una coma seguida de 1 o 2 dígitos se toma como punto decimal
 * ("12,5" → 12.5) porque no puede ser separador de miles.
 *
 * Devuelve null si el texto no es un número claro ("", "abc", "1.500,50",
 * "1,50,0", "0,500"): quien lo use debe avisar que el monto no es válido, nunca
 * tomarlo como 0. Un número se devuelve tal cual (null si no es finito).
 */
export function parseMoney(input: NumberInput): number | null {
  return parseCaptured(input, { currency: true, singleGroup: "thousands" });
}

/**
 * Lee una cantidad capturada (piezas, kg, litros) con las mismas reglas que
 * parseMoney, sin "$". La diferencia: un solo grupo de miles sin decimales
 * ("1,500", "2,489") se rechaza, porque en una cantidad con 3 decimales igual
 * puede ser 1.5 kg que 1500 piezas; hay que escribir "1500" o "1.5". Con
 * decimales o varios grupos no hay duda ("1,500.5", "1,500,000").
 */
export function parseQuantity(input: NumberInput): number | null {
  return parseCaptured(input, { currency: false, singleGroup: "reject" });
}
