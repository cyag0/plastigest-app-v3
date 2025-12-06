import { useCallback, useRef } from 'react';

interface UseDebounceOptions {
  time?: number;
}

/**
 * Hook para ejecutar una función con debounce
 * @param fn - Función a ejecutar con debounce
 * @param options - Opciones de configuración
 * @returns Objeto con la función run para ejecutar el debounce
 * 
 * @example
 * const { run } = useDebounce((value) => {
 *   console.log('Debounced value:', value);
 * }, { time: 500 });
 * 
 * // Usar en un input
 * <TextInput onChangeText={(text) => run(text)} />
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  options: UseDebounceOptions = {}
) {
  const { time = 300 } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    (...args: Parameters<T>) => {
      // Limpiar timeout anterior si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Crear nuevo timeout
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, time);
    },
    [fn, time]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { run, cancel };
}

export default useDebounce;
