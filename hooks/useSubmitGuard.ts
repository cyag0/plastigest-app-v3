import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Candado para los botones que escriben (guardar, cobrar, confirmar): run(fn)
 * ignora las llamadas que llegan mientras la anterior sigue en curso.
 *
 * El candado es un ref y se toma de forma síncrona: un doble toque o un Enter
 * repetido disparan dos eventos antes de que React vuelva a pintar, y un
 * `if (submitting)` basado sólo en el estado dejaría pasar los dos.
 * `submitting` es para la UI (deshabilitar el botón, mostrar el spinner,
 * no cerrar el modal mientras se guarda).
 *
 * @example
 * const { submitting, run } = useSubmitGuard();
 *
 * const save = () =>
 *   run(async () => {
 *     try {
 *       await Services.algo.store(values);
 *     } catch (error: any) {
 *       const data = error?.response?.data;
 *       alerts.error(data?.message ?? data?.error ?? "No se pudo guardar");
 *     }
 *   });
 *
 * <Button loading={submitting} disabled={submitting} onPress={save} />
 */
export function useSubmitGuard() {
  const lockedRef = useRef(false);
  const mountedRef = useRef(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Ejecuta fn si no hay otro envío en curso. Devuelve lo que regrese fn, o
   * undefined si la llamada se ignoró. Los errores de fn se propagan: hay que
   * atraparlos dentro de fn o alrededor de run.
   */
  const run = useCallback(
    async <T>(fn: () => T | Promise<T>): Promise<T | undefined> => {
      if (lockedRef.current) return undefined;
      lockedRef.current = true;
      setSubmitting(true);
      try {
        return await fn();
      } finally {
        lockedRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    },
    []
  );

  return { submitting, run };
}

export default useSubmitGuard;
