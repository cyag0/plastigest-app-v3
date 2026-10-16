/**
 * Reglas del kiosko sin React: opciones de venta de cada producto, topes por
 * existencia, dinero en centavos y textos para el cliente.
 *
 * Existencia compartida: un paquete de 12 litros gasta 12 litros del mismo
 * producto que se vende suelto. El tope de cada opción se calcula en unidades
 * base con lo que ya llevan las otras opciones del mismo producto.
 */
import type { KioskProduct } from "@/utils/services/kiosk";
import { formatMoney } from "@/utils/format";
import { amountToCents, centsToAmount } from "@/utils/money";

export type { KioskCatalog, KioskCategory, KioskOrder, KioskPackage, KioskProduct } from "@/utils/services/kiosk";

/**
 * El servidor acepta de 1 a 30 por renglón (kiosk.max_quantity_per_item):
 * más que eso se pide en caja. Sin tope, un solo pedido apartaba toda la
 * existencia de un producto hasta que alguien lo cancelaba o vencía.
 */
export const KIOSK_MAX_QTY = 30;
/** Y de 1 a 40 renglones por pedido. */
export const KIOSK_MAX_LINES = 40;
/** "¿A nombre de quién?" */
export const KIOSK_NAME_MAX = 60;

const EPSILON = 1e-9;

/** Una forma de comprar el producto: suelto o un paquete. */
export interface KioskOption {
  /** "p{productId}" suelto, "k{packageId}" paquete (las mismas del punto de venta). */
  key: string;
  productId: number;
  packageId: number | null;
  /** "Por litro", "Paquete 12". */
  label: string;
  /** "Contiene 12 L" (solo paquetes). */
  detail: string | null;
  priceCents: number;
  /** Unidades base por cada una: 1 suelto, el contenido del paquete. */
  baseQty: number;
  /** Cuántas hay de esta opción sin contar el pedido. */
  stock: number;
}

export function optionKey(productId: number, packageId: number | null): string {
  return packageId == null ? `p${productId}` : `k${packageId}`;
}

/** testID de una opción: el id del paquete o "loose". */
export function optionTestId(option: Pick<KioskOption, "packageId">): string {
  return option.packageId == null ? "loose" : String(option.packageId);
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLocaleLowerCase("es-MX") + value.slice(1) : value;
}

/** "Por litro" (con el nombre de la unidad) o "Por unidad". */
export function looseLabel(product: KioskProduct): string {
  const unit = product.unit?.name?.trim();
  return unit ? `Por ${lowerFirst(unit)}` : "Por unidad";
}

/** Opciones de venta del producto (suelto primero y luego los paquetes). */
export function productOptions(product: KioskProduct): KioskOption[] {
  const options: KioskOption[] = [];
  if (product.sold_loose && product.price !== null && product.price > 0) {
    options.push({
      key: optionKey(product.id, null),
      productId: product.id,
      packageId: null,
      label: looseLabel(product),
      detail: null,
      priceCents: amountToCents(product.price),
      baseQty: 1,
      stock: Math.max(0, Math.floor(product.available + EPSILON)),
    });
  }
  const abbr = product.unit?.abbreviation?.trim();
  for (const pkg of product.packages) {
    const contents = Number.isInteger(pkg.quantity) ? String(pkg.quantity) : pkg.quantity.toLocaleString("es-MX");
    options.push({
      key: optionKey(product.id, pkg.id),
      productId: product.id,
      packageId: pkg.id,
      label: pkg.name,
      detail: `Contiene ${contents}${abbr ? ` ${abbr}` : ""}`,
      priceCents: amountToCents(pkg.price),
      baseQty: pkg.quantity,
      stock: Math.max(0, Math.min(pkg.available, Math.floor(product.available / pkg.quantity + EPSILON))),
    });
  }
  return options.filter((option) => Number.isFinite(option.priceCents) && option.priceCents > 0);
}

/**
 * Máximo de esta opción con lo que ya llevan las demás opciones del mismo
 * producto (cantidades por llave de opción).
 */
export function maxForOption(
  product: KioskProduct,
  option: KioskOption,
  quantities: Readonly<Record<string, number>>,
  options: KioskOption[] = productOptions(product),
): number {
  let otherBase = 0;
  for (const other of options) {
    if (other.key === option.key) continue;
    otherBase += (quantities[other.key] ?? 0) * other.baseQty;
  }
  const byBase = Math.floor((product.available - otherBase) / option.baseQty + EPSILON);
  return Math.max(0, Math.min(byBase, option.stock, KIOSK_MAX_QTY));
}

/** ¿No hay ninguna opción con al menos una disponible? */
export function isSoldOut(product: KioskProduct): boolean {
  return productOptions(product).every((option) => option.stock < 1);
}

/** Precio del mosaico: el suelto, o el paquete más barato con "desde". */
export function displayPrice(product: KioskProduct): { cents: number; from: boolean } {
  const options = productOptions(product);
  const loose = options.find((option) => option.packageId === null);
  if (loose) return { cents: loose.priceCents, from: false };
  const cheapest = options.reduce((min, option) => Math.min(min, option.priceCents), Infinity);
  return { cents: Number.isFinite(cheapest) ? cheapest : 0, from: true };
}

/** $1,234.50 desde centavos. */
export function formatCents(cents: number): string {
  return formatMoney(centsToAmount(cents));
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Junta nombres: "A", "A y B", "A, B y C". */
export function joinNames(names: string[]): string {
  const unique = Array.from(new Set(names.filter(Boolean)));
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} y ${unique[unique.length - 1]}`;
}

const ACCENTS: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };

/** Texto para buscar: sin acentos ni mayúsculas ("Jabón" ≈ "jabon"). */
export function searchText(value: string): string {
  const lower = value.toLocaleLowerCase("es-MX");
  try {
    return lower.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  } catch {
    return lower.replace(/[áéíóúüñ]/g, (ch) => ACCENTS[ch] ?? ch).trim();
  }
}

/**
 * Productos a mostrar: con búsqueda, todos los que coinciden (sin importar la
 * categoría); si no, los de la categoría elegida. Los agotados al final; el
 * resto conserva el orden del servidor (por nombre).
 */
export function visibleProducts(
  products: KioskProduct[],
  query: string,
  categoryId: number | null,
): KioskProduct[] {
  const q = searchText(query);
  const words = q ? q.split(/\s+/).filter(Boolean) : [];
  const matches = products.filter((product) => {
    if (words.length > 0) {
      const name = searchText(product.name);
      return words.every((word) => name.includes(word));
    }
    return categoryId === null || product.category_id === categoryId;
  });
  const available: KioskProduct[] = [];
  const soldOut: KioskProduct[] = [];
  for (const product of matches) (isSoldOut(product) ? soldOut : available).push(product);
  return available.concat(soldOut);
}
