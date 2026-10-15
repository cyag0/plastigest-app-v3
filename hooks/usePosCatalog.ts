import Services from "@/utils/services";
import Fuse from "fuse.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = App.Entities.PosCatalogItem;

/**
 * Catálogo del punto de venta. Se descarga por sucursal y se busca en el
 * dispositivo con fuse.js: la búsqueda es instantánea y el lector de códigos
 * no espera a la red.
 *
 * Se vuelve a descargar (reload) al regresar a la pantalla, cada pocos minutos
 * sin cobro abierto, después de cada venta y cuando el servidor rechaza un
 * cobro por precio o existencia: antes solo al entrar, y un cambio de precio a
 * media jornada bloqueaba el cobro de ese producto hasta salir del punto de
 * venta.
 */
export function usePosCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Hora (ms) de la última descarga exitosa. */
  const [loadedAt, setLoadedAt] = useState(0);
  const itemsRef = useRef<Item[]>([]);
  const inFlightRef = useRef<Promise<Item[] | null> | null>(null);

  /**
   * Descarga el catálogo y devuelve los renglones nuevos (null si falló).
   * Con productos ya cargados una falla no tapa el carrito: se siguen usando
   * los que había. Dos llamadas seguidas comparten la misma descarga.
   */
  const reload = useCallback((): Promise<Item[] | null> => {
    if (inFlightRef.current) return inFlightRef.current;
    const request = (async () => {
      try {
        setLoading(true);
        const res = await Services.pos.catalog();
        const next = res.data ?? [];
        itemsRef.current = next;
        setItems(next);
        setError(null);
        setLoadedAt(Date.now());
        return next;
      } catch (e: any) {
        if (itemsRef.current.length === 0) {
          setError(e?.response?.data?.message ?? "No se pudo cargar el catálogo");
        }
        return null;
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = request;
    return request;
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

  return { items, loading, error, loadedAt, reload, search, findByCode };
}
