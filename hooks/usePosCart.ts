import { useCallback, useMemo, useState } from "react";

type Item = App.Entities.PosCatalogItem;

export interface PosLine {
  key: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Carrito del punto de venta: renglones, renglón seleccionado (para los
 * atajos de teclado), totales y armado del pago para la API.
 */
export function usePosCart() {
  const [lines, setLines] = useState<PosLine[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  /** Agrega o suma. Devuelve un mensaje si la existencia no alcanza. */
  const add = useCallback(
    (item: Item, quantity = 1): string | null => {
      const current = lines.find((l) => l.key === item.key)?.quantity ?? 0;
      const next = current + quantity;
      if (next > item.stock) {
        return `Solo hay ${item.stock} ${item.unit?.abbreviation ?? ""} de ${item.name}`.trim();
      }
      setLines((prev) =>
        prev.some((l) => l.key === item.key)
          ? prev.map((l) => (l.key === item.key ? { ...l, quantity: next } : l))
          : [...prev, { key: item.key, item, quantity: next, unitPrice: item.price, discount: 0 }],
      );
      setSelectedKey(item.key);
      return null;
    },
    [lines],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number): string | null => {
      const line = lines.find((l) => l.key === key);
      if (!line) return null;
      if (quantity <= 0) {
        setLines((prev) => prev.filter((l) => l.key !== key));
        return null;
      }
      if (quantity > line.item.stock) {
        return `Solo hay ${line.item.stock} ${line.item.unit?.abbreviation ?? ""} de ${line.item.name}`.trim();
      }
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
      return null;
    },
    [lines],
  );

  const remove = useCallback((key: string) => {
    setLines((prev) => {
      const index = prev.findIndex((l) => l.key === key);
      const next = prev.filter((l) => l.key !== key);
      // La selección pasa al renglón vecino para seguir borrando con Supr.
      setSelectedKey(next[Math.min(index, next.length - 1)]?.key ?? null);
      return next;
    });
  }, []);

  const updatePrice = useCallback((key: string, changes: { unitPrice?: number; discount?: number }) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setSelectedKey(null);
  }, []);

  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
    const discount = round2(lines.reduce((s, l) => s + l.discount, 0));
    return {
      subtotal,
      discount,
      total: round2(subtotal - discount),
      items: lines.reduce((s, l) => s + l.quantity, 0),
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
