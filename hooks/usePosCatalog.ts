import Services from "@/utils/services";
import Fuse from "fuse.js";
import { useCallback, useEffect, useMemo, useState } from "react";

type Item = App.Entities.PosCatalogItem;

/**
 * Catálogo del punto de venta. Se descarga una vez por sucursal y se busca en
 * el dispositivo con fuse.js: la búsqueda es instantánea y el lector de
 * códigos no espera a la red.
 */
export function usePosCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await Services.pos.catalog();
      setItems(res.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "code", weight: 0.3 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items],
  );

  const byCode = useMemo(() => {
    const map = new Map<string, Item>();
    for (const item of items) {
      if (item.code) map.set(item.code.trim().toLowerCase(), item);
    }
    return map;
  }, [items]);

  /** Coincidencia exacta por código o código de barras (lector de códigos). */
  const findByCode = useCallback(
    (code: string): Item | null => byCode.get(code.trim().toLowerCase()) ?? null,
    [byCode],
  );

  /** Búsqueda difusa por nombre y código; la coincidencia exacta de código va primero. */
  const search = useCallback(
    (query: string, limit = 30): Item[] => {
      const q = query.trim();
      if (!q) return items.slice(0, limit);
      const exact = findByCode(q);
      const results = fuse.search(q, { limit }).map((r) => r.item);
      return exact ? [exact, ...results.filter((r) => r.key !== exact.key)] : results;
    },
    [items, fuse, findByCode],
  );

  return { items, loading, error, reload, search, findByCode };
}
