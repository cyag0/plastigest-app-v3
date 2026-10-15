import type { ServicePath } from "./context";

/**
 * Canal sin dependencias para controlar la caché de opciones de los selects
 * (SelectDataProvider) desde fuera de su árbol: AuthContext vive arriba del
 * provider y no puede usar su contexto, y una pantalla que da de alta un
 * registro puede pedir que los selects de ese catálogo se vuelvan a cargar.
 *
 * Vive en su propio archivo para no crear un import circular
 * (AuthContext → context.tsx → AuthContext).
 */
export type SelectCacheEvent =
  | { type: "clear" }
  | { type: "invalidate"; models?: ServicePath[] };

type Listener = (event: SelectCacheEvent) => void;

const listeners = new Set<Listener>();

export function subscribeSelectCache(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(event: SelectCacheEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Select cache listener error:", error);
    }
  });
}

/**
 * Borra todas las opciones cacheadas. AuthContext lo llama al cerrar sesión,
 * cuando la sesión expira y al cambiar de empresa o sucursal.
 */
export function clearSelectDataCache() {
  emit({ type: "clear" });
}

/**
 * Marca como vencidas las opciones de los modelos indicados (o de todos si no
 * se pasa ninguno): los selects montados las vuelven a pedir y mientras tanto
 * siguen mostrando las anteriores. Las altas/ediciones hechas con axios ya lo
 * hacen solas (ver MUTATION_INVALIDATES en context.tsx); esto es para casos
 * que no pasan por la API normal.
 */
export function invalidateSelectData(models?: ServicePath | ServicePath[]) {
  emit({
    type: "invalidate",
    models: models === undefined ? undefined : Array.isArray(models) ? models : [models],
  });
}
