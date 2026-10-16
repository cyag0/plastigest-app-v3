/**
 * Catálogo del kiosko (GET kiosk/catalog): se baja al montar y cada vez que
 * la pantalla lo pide (al volver a la bienvenida, cada 5 minutos en ella y
 * tras cada pedido).
 *
 * Si una recarga falla se conserva el último catálogo bueno (el servidor
 * revisa precios y existencias al recibir el pedido). Solo sin ningún
 * catálogo se muestra el error con "Reintentar": nunca "Sin productos" cuando
 * en realidad no se pudo cargar.
 */
import type { KioskProduct } from "@/components/Kiosk/model";
import { kioskApi, type KioskCatalog } from "@/utils/services/kiosk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface KioskCatalogSnapshot {
  catalog: KioskCatalog;
  productsById: Map<number, KioskProduct>;
}

function indexProducts(catalog: KioskCatalog | null): Map<number, KioskProduct> {
  return new Map((catalog?.products ?? []).map((product) => [product.id, product]));
}

export function useKioskCatalog() {
  const [catalog, setCatalog] = useState<KioskCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);
  const seqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** La petición; el estado se actualiza al llegar la respuesta. */
  const fetchCatalog = useCallback(async (seq: number): Promise<KioskCatalogSnapshot | null> => {
    const current = () => mountedRef.current && seq === seqRef.current;
    try {
      const fresh = await kioskApi.catalog();
      if (!current()) return null;
      setCatalog(fresh);
      setFailed(false);
      setLoadedAt(Date.now());
      return { catalog: fresh, productsById: indexProducts(fresh) };
    } catch {
      if (current()) setFailed(true);
      return null;
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  /**
   * Baja el catálogo. Devuelve el nuevo (para ajustar el pedido en el acto) o
   * null si falló o si otra recarga más reciente ya lo reemplazó.
   */
  const reload = useCallback((): Promise<KioskCatalogSnapshot | null> => {
    setLoading(true);
    return fetchCatalog(++seqRef.current);
  }, [fetchCatalog]);

  // Primera carga (loading ya empieza en true).
  useEffect(() => {
    void fetchCatalog(++seqRef.current);
  }, [fetchCatalog]);

  const productsById = useMemo(() => indexProducts(catalog), [catalog]);

  return {
    catalog,
    productsById,
    loading,
    /** Sin catálogo que mostrar porque la carga falló. */
    error: failed && !catalog,
    /** La última recarga falló (pero hay un catálogo anterior). */
    stale: failed && !!catalog,
    loadedAt,
    reload,
  };
}

export type KioskCatalogState = ReturnType<typeof useKioskCatalog>;
