import { useCallback, useMemo, useRef, useState } from "react";

type Item = App.Entities.PosCatalogItem;

export interface PosLine {
  key: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Las piezas (unidad de tipo "quantity") y los paquetes se venden enteros;
 * peso, volumen y longitud admiten decimales (0.5 kg).
 */
export const allowsDecimalQuantity = (item: Item): boolean =>
  !item.package_id && !!item.unit?.type && item.unit.type !== "quantity";

const stockMessage = (item: Item) =>
  `Solo hay ${item.stock} ${item.unit?.abbreviation ?? ""} de ${item.name}`.trim();

/**
 * Carrito del punto de venta: renglones, renglón seleccionado (para los
 * atajos de teclado), totales y armado del pago para la API.
 */
export function usePosCart() {
  const [lines, setLinesState] = useState<PosLine[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Copia síncrona de los renglones: con un lector de códigos dos escaneos
  // pueden llegar antes de que React vuelva a renderizar y el segundo leía la
  // cantidad vieja (se perdía una pieza o se saltaba la validación de stock).
  const linesRef = useRef<PosLine[]>([]);

  const setLines = useCallback((updater: (prev: PosLine[]) => PosLine[]) => {
    const next = updater(linesRef.current);
    linesRef.current = next;
    setLinesState(next);
  }, []);

  /** Agrega o suma. Devuelve un mensaje si la existencia no alcanza. */
  const add = useCallback(
    (item: Item, quantity = 1): string | null => {
      const current =
        linesRef.current.find((l) => l.key === item.key)?.quantity ?? 0;
      const next = round3(current + quantity);
      if (next > item.stock) {
        return stockMessage(item);
      }
      setLines((prev) =>
        prev.some((l) => l.key === item.key)
          ? prev.map((l) => (l.key === item.key ? { ...l, quantity: next } : l))
          : [...prev, { key: item.key, item, quantity: next, unitPrice: item.price, discount: 0 }],
      );
      setSelectedKey(item.key);
      return null;
    },
    [setLines],
  );

  /**
   * Cambia la cantidad de un renglón (0 o menos lo quita). Devuelve un
   * mensaje si la cantidad no es válida o la existencia no alcanza.
   */
  const setQuantity = useCallback(
    (key: string, quantity: number): string | null => {
      const line = linesRef.current.find((l) => l.key === key);
      if (!line) return null;
      if (!Number.isFinite(quantity)) {
        return "Cantidad inválida";
      }
      if (quantity <= 0) {
        setLines((prev) => prev.filter((l) => l.key !== key));
        return null;
      }
      if (!allowsDecimalQuantity(line.item) && !Number.isInteger(quantity)) {
        return `${line.item.name} se vende por pieza: usa una cantidad entera.`;
      }
      const next = round3(quantity);
      if (next > line.item.stock) {
        return stockMessage(line.item);
      }
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: next } : l)));
      return null;
    },
    [setLines],
  );

  const remove = useCallback((key: string) => {
    const index = linesRef.current.findIndex((l) => l.key === key);
    setLines((prev) => prev.filter((l) => l.key !== key));
    // La selección pasa al renglón vecino para seguir borrando con Supr.
    const next = linesRef.current;
    setSelectedKey(next[Math.min(index, next.length - 1)]?.key ?? null);
  }, [setLines]);

  const updatePrice = useCallback(
    (key: string, changes: { unitPrice?: number; discount?: number }) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) return l;
          const unitPrice = Math.max(0, changes.unitPrice ?? l.unitPrice);
          // El descuento no puede dejar el renglón en negativo.
          const lineSubtotal = round2(l.quantity * unitPrice);
          const discount = Math.min(
            Math.max(0, changes.discount ?? l.discount),
            lineSubtotal,
          );
          return { ...l, unitPrice, discount };
        }),
      );
    },
    [setLines],
  );

  const clear = useCallback(() => {
    setLines(() => []);
    setSelectedKey(null);
  }, [setLines]);

  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
    const discount = round2(lines.reduce((s, l) => s + l.discount, 0));
    return {
      subtotal,
      discount,
      total: round2(subtotal - discount),
      items: round3(lines.reduce((s, l) => s + l.quantity, 0)),
    };
  }, [lines]);

  /**
   * Renglones para la API. El precio solo viaja si se cambió: un cajero sin
   * permiso nunca manda precios (y el backend rechaza si lo hiciera).
   */
  const toDetails = useCallback(
    (): App.Entities.PosSalePayload["details"] =>
      lines.map((l) => ({
        product_id: l.item.product_id,
        package_id: l.item.package_id,
        quantity: l.quantity,
        ...(l.unitPrice !== l.item.price ? { unit_price: l.unitPrice } : {}),
        ...(l.discount > 0 ? { discount: l.discount } : {}),
      })),
    [lines],
  );

  return {
    lines,
    selectedKey,
    setSelectedKey,
    selected: lines.find((l) => l.key === selectedKey) ?? null,
    add,
    setQuantity,
    remove,
    updatePrice,
    clear,
    totals,
    toDetails,
  };
}

export const formatMoney = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
