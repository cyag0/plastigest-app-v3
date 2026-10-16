/**
 * Pedido del kiosko en memoria (no se guarda en el equipo: el siguiente
 * cliente nunca debe encontrar el pedido del anterior).
 *
 * - Importes en centavos con el mismo cálculo que el servidor (utils/money).
 * - Topes por existencia en unidades base, compartida entre el producto
 *   suelto y sus paquetes (components/Kiosk/model).
 * - Llave client_request_id: una por pedido, la misma en cada reintento hasta
 *   que el pedido se registra o el pedido cambia.
 */
import {
  KIOSK_MAX_LINES,
  KIOSK_MAX_QTY,
  maxForOption,
  optionKey,
  productOptions,
  type KioskOption,
  type KioskProduct,
} from "@/components/Kiosk/model";
import { lineTotalCents, sumCents } from "@/utils/money";
import { newClientRequestId } from "@/utils/requestId";
import type { KioskOrderItemInput, KioskShortItem } from "@/utils/services/kiosk";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface KioskCartLine {
  key: string;
  productId: number;
  packageId: number | null;
  quantity: number;
}

/** Renglón con lo que se muestra: nombre, opción, precio e importe. */
export interface KioskCartEntry extends KioskCartLine {
  product: KioskProduct;
  option: KioskOption;
  lineTotalCents: number;
  /** Tope de este renglón con lo que llevan los demás del mismo producto. */
  max: number;
}

/** Resultado de un cambio: si no se pudo, cuántas quedan. */
export type KioskCartResult =
  | { ok: true }
  | { ok: false; reason: "limit"; max: number }
  | { ok: false; reason: "lines" }
  | { ok: false; reason: "missing" };

/** Lo que se ajustó al aplicar un catálogo nuevo. */
export interface KioskCartAdjustment {
  /** Productos con renglones recortados o quitados. */
  names: string[];
  /** Renglones que quedan. */
  remaining: number;
}

type ProductsById = ReadonlyMap<number, KioskProduct>;

function quantitiesOf(lines: KioskCartLine[], productId: number): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const line of lines) {
    if (line.productId === productId) quantities[line.key] = line.quantity;
  }
  return quantities;
}

/**
 * Deja los renglones dentro de lo disponible del catálogo dado. Los primeros
 * renglones tienen prioridad; los que quedan en 0 o ya no se venden se quitan.
 */
function clampLines(
  lines: KioskCartLine[],
  products: ProductsById,
  /** Catálogo anterior: el nombre de lo que ya no viene en el nuevo. */
  previous?: ProductsById,
): { lines: KioskCartLine[]; names: string[] } {
  const kept: KioskCartLine[] = [];
  const names: string[] = [];
  for (const line of lines) {
    const product = products.get(line.productId);
    const options = product ? productOptions(product) : [];
    const option = options.find((o) => o.key === line.key);
    if (!product || !option) {
      names.push(product?.name ?? previous?.get(line.productId)?.name ?? "Un producto");
      continue;
    }
    const max = maxForOption(product, option, quantitiesOf(kept, product.id), options);
    const quantity = Math.min(line.quantity, max);
    if (quantity !== line.quantity) names.push(product.name);
    if (quantity > 0) kept.push({ ...line, quantity });
  }
  return { lines: kept, names };
}

export function useKioskCart(products: ProductsById) {
  const [lines, setLines] = useState<KioskCartLine[]>([]);
  // Fuente de verdad síncrona: dos toques seguidos (antes de volver a pintar)
  // parten del pedido ya actualizado, no del anterior.
  const linesRef = useRef<KioskCartLine[]>([]);
  const productsRef = useRef(products);
  const requestIdRef = useRef<string | null>(null);

  const commit = useCallback((next: KioskCartLine[]) => {
    linesRef.current = next;
    // El pedido cambió: el siguiente envío lleva una llave nueva.
    requestIdRef.current = null;
    setLines(next);
  }, []);

  /** Lo que un catálogo recargado quitó o recortó del pedido (para avisar). */
  const [catalogAdjustment, setCatalogAdjustment] = useState<{ names: string[]; seq: number } | null>(null);
  useLayoutEffect(() => {
    const previous = productsRef.current;
    productsRef.current = products;
    // Un catálogo recargado con el pedido a medias (p. ej. la recarga de la
    // bienvenida que llega después del primer toque) se aplica al pedido.
    // Antes lo que salía del catálogo seguía en el pedido sin verse en la
    // revisión, contaba en la barra y el envío lo rechazaba.
    if (previous === products || linesRef.current.length === 0) return;
    const current = linesRef.current;
    const { lines: next, names } = clampLines(current, products, previous);
    const changed =
      next.length !== current.length ||
      next.some((line, i) => line.key !== current[i].key || line.quantity !== current[i].quantity);
    if (!changed) return;
    commit(next);
    if (names.length > 0) {
      setCatalogAdjustment((prev) => ({ names: Array.from(new Set(names)), seq: (prev?.seq ?? 0) + 1 }));
    }
  }, [products, commit]);

  /** Cambia la cantidad de una opción (0 la quita), con su tope. */
  const setOptionQuantity = useCallback(
    (productId: number, packageId: number | null, quantity: number): KioskCartResult => {
      const product = productsRef.current.get(productId);
      const options = product ? productOptions(product) : [];
      const key = optionKey(productId, packageId);
      const option = options.find((o) => o.key === key);
      if (!product || !option) return { ok: false, reason: "missing" };

      const current = linesRef.current;
      const index = current.findIndex((line) => line.key === key);
      const wanted = Math.max(0, Math.floor(quantity));
      if (wanted === 0) {
        if (index >= 0) commit(current.filter((line) => line.key !== key));
        return { ok: true };
      }
      if (index < 0 && current.length >= KIOSK_MAX_LINES) return { ok: false, reason: "lines" };

      const max = maxForOption(product, option, quantitiesOf(current, productId), options);
      const next = Math.min(wanted, max);
      if (next <= 0) return { ok: false, reason: "limit", max: 0 };
      if (index >= 0) {
        if (current[index].quantity !== next) {
          commit(current.map((line, i) => (i === index ? { ...line, quantity: next } : line)));
        }
      } else {
        commit([...current, { key, productId, packageId, quantity: next }]);
      }
      return next < wanted ? { ok: false, reason: "limit", max } : { ok: true };
    },
    [commit],
  );

  /** Suma (o resta) a una opción. */
  const add = useCallback(
    (productId: number, packageId: number | null, delta = 1): KioskCartResult => {
      const key = optionKey(productId, packageId);
      const current = linesRef.current.find((line) => line.key === key)?.quantity ?? 0;
      if (delta > 0 && current >= KIOSK_MAX_QTY) return { ok: false, reason: "limit", max: KIOSK_MAX_QTY };
      return setOptionQuantity(productId, packageId, current + delta);
    },
    [setOptionQuantity],
  );

  /**
   * Fija todas las opciones de un producto a la vez (hoja "¿Cómo lo
   * quieres?"). Respeta el orden: primero las que ya estaban.
   */
  const setProductQuantities = useCallback(
    (productId: number, quantities: Record<string, number>): KioskCartResult => {
      const product = productsRef.current.get(productId);
      if (!product) return { ok: false, reason: "missing" };
      const options = productOptions(product);
      const current = linesRef.current;
      const others = current.filter((line) => line.productId !== productId);
      const mine: KioskCartLine[] = [];
      // Las que ya estaban conservan su lugar relativo; las nuevas van al final.
      const ordered = [
        ...current.filter((line) => line.productId === productId).map((line) => line.key),
        ...options.map((o) => o.key),
      ].filter((key, i, all) => all.indexOf(key) === i);
      let limited: { max: number } | null = null;
      for (const key of ordered) {
        const option = options.find((o) => o.key === key);
        const wanted = Math.max(0, Math.floor(quantities[key] ?? 0));
        if (!option || wanted === 0) continue;
        const max = maxForOption(product, option, quantitiesOf(mine, productId), options);
        const quantity = Math.min(wanted, max);
        if (quantity < wanted) limited = { max };
        if (quantity > 0) mine.push({ key, productId, packageId: option.packageId, quantity });
      }
      // Los renglones del producto quedan juntos, donde estaba el primero.
      const firstIndex = current.findIndex((line) => line.productId === productId);
      const next =
        firstIndex < 0
          ? [...others, ...mine]
          : [
              ...current.slice(0, firstIndex).filter((line) => line.productId !== productId),
              ...mine,
              ...current.slice(firstIndex).filter((line) => line.productId !== productId),
            ];
      if (next.length > KIOSK_MAX_LINES) return { ok: false, reason: "lines" };
      const changed =
        next.length !== current.length ||
        next.some((line, i) => line.key !== current[i].key || line.quantity !== current[i].quantity);
      if (changed) commit(next);
      return limited ? { ok: false, reason: "limit", max: limited.max } : { ok: true };
    },
    [commit],
  );

  const remove = useCallback(
    (key: string): KioskCartLine | null => {
      const current = linesRef.current;
      const line = current.find((l) => l.key === key) ?? null;
      if (line) commit(current.filter((l) => l.key !== key));
      return line;
    },
    [commit],
  );

  /** Vuelve a poner un renglón quitado ("Deshacer"), con su tope. */
  const restore = useCallback(
    (line: KioskCartLine, index: number): KioskCartResult => {
      const current = linesRef.current;
      if (current.some((l) => l.key === line.key)) return { ok: true };
      const next = [...current];
      next.splice(Math.min(Math.max(index, 0), next.length), 0, line);
      const clamped = clampLines(next, productsRef.current);
      commit(clamped.lines);
      return clamped.names.length > 0 ? { ok: false, reason: "limit", max: 0 } : { ok: true };
    },
    [commit],
  );

  const clear = useCallback(() => {
    linesRef.current = [];
    requestIdRef.current = null;
    setLines([]);
  }, []);

  /**
   * Aplica un catálogo recién bajado: recorta a lo disponible y quita lo que
   * ya no se vende. Si no cambió nada, la llave se conserva.
   */
  const applyCatalog = useCallback(
    (fresh: ProductsById): KioskCartAdjustment => {
      const previous = productsRef.current;
      productsRef.current = fresh;
      const current = linesRef.current;
      const { lines: next, names } = clampLines(current, fresh, previous);
      const changed =
        next.length !== current.length ||
        next.some((line, i) => line.key !== current[i].key || line.quantity !== current[i].quantity);
      if (changed) commit(next);
      return { names: Array.from(new Set(names)), remaining: next.length };
    },
    [commit],
  );

  /**
   * Recorta con lo que dijo el servidor en el 422 insufficient_stock
   * (`available`: unidades base si es suelto, paquetes completos si es
   * paquete). Sirve si el catálogo no se pudo bajar o todavía no lo refleja.
   * El suelto y los paquetes comparten la existencia del producto: se arma un
   * catálogo con esos números y se recorta todo junto.
   */
  const applyShortItems = useCallback(
    (items: KioskShortItem[]): KioskCartAdjustment => {
      const base = productsRef.current;
      const adjusted = new Map(base);
      for (const productId of new Set(items.map((item) => item.product_id))) {
        const product = base.get(productId);
        if (!product) continue;
        const rows = items.filter((item) => item.product_id === productId);
        const loose = rows.find((item) => item.package_id === null);
        // Suelto: las unidades base que hay. Solo paquetes: lo mínimo que hay.
        const fromPackages = rows.reduce((max, item) => {
          const pkg = product.packages.find((p) => p.id === item.package_id);
          return pkg ? Math.max(max, Math.floor(item.available) * pkg.quantity) : max;
        }, 0);
        adjusted.set(productId, {
          ...product,
          available: Math.min(product.available, loose ? loose.available : fromPackages),
          packages: product.packages.map((pkg) => {
            const row = rows.find((item) => item.package_id === pkg.id);
            return row ? { ...pkg, available: Math.min(pkg.available, Math.floor(row.available)) } : pkg;
          }),
        });
      }
      const current = linesRef.current;
      const { lines: next, names } = clampLines(current, adjusted, base);
      const changed =
        next.length !== current.length ||
        next.some((line, i) => line.key !== current[i].key || line.quantity !== current[i].quantity);
      if (changed) commit(next);
      return { names: Array.from(new Set(names)), remaining: next.length };
    },
    [commit],
  );

  /** Quita las opciones que ya no se venden (422 product_unavailable). */
  const removeOptions = useCallback(
    (items: KioskShortItem[]): KioskCartAdjustment => {
      const current = linesRef.current;
      const gone = (line: KioskCartLine) =>
        items.some((item) => item.product_id === line.productId && item.package_id === line.packageId);
      const names = current.filter(gone).map((line) => productsRef.current.get(line.productId)?.name ?? "Un producto");
      const next = current.filter((line) => !gone(line));
      if (next.length !== current.length) commit(next);
      return { names: Array.from(new Set(names)), remaining: next.length };
    },
    [commit],
  );

  /** Llave del envío: la misma mientras el pedido no cambie. */
  const ensureRequestId = useCallback((): string => {
    if (!requestIdRef.current) requestIdRef.current = `k-${newClientRequestId()}`;
    return requestIdRef.current;
  }, []);

  /** La llave ya se usó en otra operación: el siguiente envío lleva otra. */
  const renewRequestId = useCallback(() => {
    requestIdRef.current = null;
  }, []);

  /** Renglones para POST kiosk/orders (el servidor pone los precios). */
  const toItems = useCallback(
    (): KioskOrderItemInput[] =>
      linesRef.current.map((line) => ({
        product_id: line.productId,
        package_id: line.packageId,
        quantity: line.quantity,
      })),
    [],
  );

  const entries = useMemo<KioskCartEntry[]>(() => {
    const result: KioskCartEntry[] = [];
    for (const line of lines) {
      const product = products.get(line.productId);
      const options = product ? productOptions(product) : [];
      const option = options.find((o) => o.key === line.key);
      if (!product || !option) continue;
      result.push({
        ...line,
        product,
        option,
        lineTotalCents: lineTotalCents(line.quantity, option.priceCents / 100),
        max: maxForOption(product, option, quantitiesOf(lines, product.id), options),
      });
    }
    return result;
  }, [lines, products]);

  const totals = useMemo(
    () => ({
      count: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      totalCents: sumCents(entries.map((entry) => entry.lineTotalCents)),
    }),
    [entries],
  );

  /** Lectura síncrona del pedido (para callbacks estables). */
  const getLines = useCallback(() => linesRef.current, []);

  /** Cantidad por producto (todas sus opciones), para la pastilla del mosaico. */
  const quantityByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of lines) map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
    return map;
  }, [lines]);

  return {
    lines,
    entries,
    totals,
    quantityByProduct,
    isEmpty: lines.length === 0,
    catalogAdjustment,
    add,
    setOptionQuantity,
    setProductQuantities,
    remove,
    restore,
    clear,
    applyCatalog,
    applyShortItems,
    removeOptions,
    ensureRequestId,
    renewRequestId,
    toItems,
    getLines,
  };
}

export type KioskCart = ReturnType<typeof useKioskCart>;
