import { parseMoney, parseQuantity } from "@/utils/format";

/**
 * Dinero en centavos enteros, con el mismo algoritmo que el backend para el
 * punto de venta, la venta de mostrador y los pedidos. Así el total que ve el
 * cajero es exactamente el que valida el servidor: antes se sumaban decimales
 * y se redondeaba al final, y cobros como 2.489 kg × $25 se rechazaban por un
 * centavo.
 *
 *   qty_milli      = round(cantidad × 1000)
 *   price_cents    = round(precio × 100)
 *   line_cents     = round_half_up(qty_milli × price_cents / 1000)  (enteros)
 *   discount_cents = round(descuento × 100)
 *   renglón        = line_cents − discount_cents
 *   total          = suma de los renglones
 *
 * Los pagos deben sumar exactamente el total en centavos. Para que el servidor
 * llegue a los mismos enteros conviene mandarle la cantidad y el precio ya
 * normalizados (roundQuantity / roundMoney).
 */

type AmountInput = number | string | null | undefined;

/** Mitades lejos de cero, como el round() de PHP (Math.round sube -2.5 a -2). */
function roundHalfAwayFromZero(n: number): number {
  const rounded = Math.sign(n) * Math.round(Math.abs(n));
  return rounded === 0 ? 0 : rounded; // sin -0
}

/**
 * value × scale al entero más cercano. El producto puede quedar a un pelo del
 * entero (2.489 × 1000 = 2488.9999999999995, 1.005 × 100 = 100.49999999999999):
 * se ajusta a 15 cifras significativas antes de redondear para tomar el
 * decimal que se escribió y no su representación binaria.
 */
function toScaledInteger(value: number, scale: number): number {
  if (!Number.isFinite(value)) return NaN;
  return roundHalfAwayFromZero(Number((value * scale).toPrecision(15)));
}

/** floor(n / d) exacto para enteros n ≥ 0 y d > 0. */
function floorDiv(n: number, d: number): number {
  return (n - (n % d)) / d;
}

/**
 * round_half_up(qtyMilli × priceCents / 1000) sólo con enteros. Separar las
 * unidades completas de las milésimas mantiene los productos dentro de los
 * enteros exactos de JavaScript (2^53) aun con cantidades y precios grandes.
 * Con negativos redondea simétrico (mitades lejos de cero).
 */
function milliTimesCents(qtyMilli: number, priceCents: number): number {
  const sign = Math.sign(qtyMilli) * Math.sign(priceCents);
  const milli = Math.abs(qtyMilli);
  const cents = Math.abs(priceCents);
  const units = floorDiv(milli, 1000);
  const rest = milli - units * 1000; // 0..999 milésimas
  const result = sign * (units * cents + floorDiv(rest * cents + 500, 1000));
  return result === 0 ? 0 : result; // sin -0
}

/**
 * Monto → centavos enteros ($62.23 → 6223). Acepta números o texto (lo lee
 * parseMoney: "1,500.50" → 150050). Devuelve NaN si no es un monto válido,
 * nunca 0, para que el error se note.
 */
export function amountToCents(amount: AmountInput): number {
  const n = typeof amount === "number" ? amount : parseMoney(amount);
  return n === null ? NaN : toScaledInteger(n, 100);
}

/** Centavos → monto (6223 → 62.23), para mostrar o mandar a la API. */
export function centsToAmount(cents: number): number {
  if (!Number.isFinite(cents)) return NaN;
  const amount = roundHalfAwayFromZero(cents) / 100;
  return amount === 0 ? 0 : amount;
}

/**
 * Cantidad → milésimas enteras (2.489 kg → 2489). El texto lo lee
 * parseQuantity. NaN si no es una cantidad válida.
 */
export function quantityToMilli(quantity: AmountInput): number {
  const n = typeof quantity === "number" ? quantity : parseQuantity(quantity);
  return n === null ? NaN : toScaledInteger(n, 1000);
}

/** Monto redondeado a centavos como lo hace el servidor (19.999 → 20). */
export function roundMoney(amount: AmountInput): number {
  return centsToAmount(amountToCents(amount));
}

/** Cantidad redondeada a milésimas como lo hace el servidor. */
export function roundQuantity(quantity: AmountInput): number {
  const milli = quantityToMilli(quantity);
  if (!Number.isFinite(milli)) return NaN;
  const value = milli / 1000;
  return value === 0 ? 0 : value;
}

/**
 * Total de un renglón en centavos: cantidad × precio redondeado a centavos
 * (mitad hacia arriba) menos el descuento. Sin descuento es el subtotal del
 * renglón. Un descuento vacío (null, undefined, "") cuenta como 0; cualquier
 * otro valor inválido da NaN.
 *
 * lineTotalCents(2.489, 25) = 6223 · lineTotalCents(0.215, 85) = 1828
 */
export function lineTotalCents(
  quantity: AmountInput,
  unitPrice: AmountInput,
  discount: AmountInput = 0
): number {
  const qtyMilli = quantityToMilli(quantity);
  const priceCents = amountToCents(unitPrice);
  const discountCents =
    discount === null || discount === undefined || discount === ""
      ? 0
      : amountToCents(discount);

  if (
    !Number.isFinite(qtyMilli) ||
    !Number.isFinite(priceCents) ||
    !Number.isFinite(discountCents)
  ) {
    return NaN;
  }

  return milliTimesCents(qtyMilli, priceCents) - discountCents;
}

/** Suma de importes en centavos (enteros: la suma es exacta). */
export function sumCents(values: readonly number[]): number {
  return values.reduce((total, cents) => total + cents, 0);
}
