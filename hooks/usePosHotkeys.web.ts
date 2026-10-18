import { useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export interface PosHotkeyHandlers {
  enabled: boolean;
  onSearch: () => void;
  onQuantity: () => void;
  onCustomer: () => void;
  onCheckout: () => void;
  onCancel: () => void;
  onRemoveSelected: () => void;
  onMoveSelection: (delta: 1 | -1) => void;
  /** Código leído por un lector USB (teclea rápido y termina en Enter). */
  onScan: (code: string) => void;
  /** ¿Es el código de un producto del catálogo? (lectores que no mandan Enter). */
  isProductCode: (code: string) => boolean;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Más que esto entre tecla y tecla ya no es el lector: es una persona. */
const SCAN_GAP_MS = 80;
/** Pausa tras la que se da por terminada una lectura sin Enter. */
const SCAN_IDLE_MS = 150;

/**
 * Atajos del punto de venta (web): F2 buscar, F4 cantidad, F6 cliente,
 * F8 cobrar, Esc cancelar, Supr quitar renglón, ↑↓ mover selección.
 *
 * Sin atajo en "/": react-hotkeys-hook compara la tecla física, y en el
 * teclado latinoamericano esa tecla es el guion. Cada código con guion
 * (GRA-AGUA) abría el buscador a media lectura y el resto del código caía
 * en él.
 */
export function usePosHotkeys(h: PosHotkeyHandlers) {
  const opts = { enabled: h.enabled, preventDefault: true, enableOnFormTags: true as const };

  useHotkeys("f2, mod+k", h.onSearch, opts, [h.onSearch]);
  useHotkeys("f4", h.onQuantity, opts, [h.onQuantity]);
  useHotkeys("f6", h.onCustomer, opts, [h.onCustomer]);
  useHotkeys("f8", h.onCheckout, opts, [h.onCheckout]);
  useHotkeys("escape", h.onCancel, { ...opts, preventDefault: false }, [h.onCancel]);
  useHotkeys("delete", h.onRemoveSelected, { ...opts, enableOnFormTags: false }, [h.onRemoveSelected]);
  useHotkeys("up", () => h.onMoveSelection(-1), { ...opts, enableOnFormTags: false }, [h.onMoveSelection]);
  useHotkeys("down", () => h.onMoveSelection(1), { ...opts, enableOnFormTags: false }, [h.onMoveSelection]);

  // Lector de códigos tipo teclado: caracteres muy seguidos + Enter, sin un
  // campo con foco (dentro de un campo, el propio campo resuelve el código).
  // Si el lector no manda Enter, tras una pausa se agrega cuando lo leído es
  // exactamente un código del catálogo.
  const buffer = useRef("");
  const last = useRef(0);
  const handlers = useRef(h);
  useEffect(() => {
    handlers.current = h;
  });

  useEffect(() => {
    if (!h.enabled) return;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const now = Date.now();
      if (now - last.current > SCAN_GAP_MS) buffer.current = "";
      last.current = now;
      clearTimeout(idle);

      if (e.key === "Enter") {
        if (buffer.current.length >= 3) {
          e.preventDefault();
          handlers.current.onScan(buffer.current);
        }
        buffer.current = "";
      } else if (e.key.length === 1) {
        buffer.current += e.key;
        idle = setTimeout(() => {
          const code = buffer.current;
          if (code.length >= 4 && handlers.current.isProductCode(code)) {
            buffer.current = "";
            handlers.current.onScan(code);
          }
        }, SCAN_IDLE_MS);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(idle);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [h.enabled]);
}
