/**
 * Reinicio por inactividad del kiosko. Cualquier toque (o tecla) reinicia el
 * contador: la pantalla llama `bump` desde la captura de toques de su raíz y
 * al escribir.
 *
 * - Sin productos en el pedido: a los 60 s vuelve a la bienvenida.
 * - Con productos: a los 90 s pregunta "¿Sigues ahí?" con una cuenta de 20 s
 *   y, si nadie contesta, vacía el pedido y vuelve a la bienvenida.
 *
 * Un solo intervalo de 1 s compara la hora del último toque: tocar no crea ni
 * cancela temporizadores, y la pantalla solo se vuelve a pintar mientras se
 * muestra la cuenta regresiva.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const KIOSK_IDLE_EMPTY_MS = 60 * 1000;
export const KIOSK_IDLE_WARN_MS = 90 * 1000;
export const KIOSK_IDLE_COUNTDOWN_MS = 20 * 1000;

interface Options {
  /** Solo cuenta en catálogo y revisión (no en la bienvenida, al enviar ni en "Listo"). */
  enabled: boolean;
  hasItems: boolean;
  onTimeout: () => void;
}

export function useKioskIdle({ enabled, hasItems, onTimeout }: Options) {
  // Se fija al activarse (efecto) y con cada toque (bump).
  const lastActivityRef = useRef(0);
  const hasItemsRef = useRef(hasItems);
  const onTimeoutRef = useRef(onTimeout);
  const warningRef = useRef<number | null>(null);
  const [warning, setWarning] = useState<number | null>(null);

  useEffect(() => {
    hasItemsRef.current = hasItems;
    onTimeoutRef.current = onTimeout;
  }, [hasItems, onTimeout]);

  const showWarning = useCallback((seconds: number | null) => {
    if (warningRef.current === seconds) return;
    warningRef.current = seconds;
    setWarning(seconds);
  }, []);

  /** Hubo actividad: reinicia el contador y quita el aviso. */
  const bump = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningRef.current !== null) showWarning(null);
  }, [showWarning]);

  useEffect(() => {
    if (!enabled) return;
    // Entrar a una pantalla que cuenta es actividad.
    lastActivityRef.current = Date.now();
    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const fire = () => {
        lastActivityRef.current = Date.now();
        showWarning(null);
        onTimeoutRef.current();
      };
      if (!hasItemsRef.current) {
        showWarning(null);
        if (idle >= KIOSK_IDLE_EMPTY_MS) fire();
        return;
      }
      if (idle >= KIOSK_IDLE_WARN_MS + KIOSK_IDLE_COUNTDOWN_MS) {
        fire();
      } else if (idle >= KIOSK_IDLE_WARN_MS) {
        showWarning(Math.max(1, Math.ceil((KIOSK_IDLE_WARN_MS + KIOSK_IDLE_COUNTDOWN_MS - idle) / 1000)));
      } else {
        showWarning(null);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      showWarning(null);
    };
  }, [enabled, showWarning]);

  return {
    /** Segundos que faltan para vaciar el pedido, o null sin aviso. */
    warning,
    bump,
  };
}
