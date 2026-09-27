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
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Atajos del punto de venta (web): F2 buscar, F4 cantidad, F6 cliente,
 * F8 cobrar, Esc cancelar, Supr quitar renglón, ↑↓ mover selección.
 */
export function usePosHotkeys(h: PosHotkeyHandlers) {
  const opts = { enabled: h.enabled, preventDefault: true, enableOnFormTags: true as const };

  useHotkeys("f2, mod+k", h.onSearch, opts, [h.onSearch]);
  useHotkeys("slash", h.onSearch, { ...opts, enableOnFormTags: false }, [h.onSearch]);
  useHotkeys("f4", h.onQuantity, opts, [h.onQuantity]);
  useHotkeys("f6", h.onCustomer, opts, [h.onCustomer]);
  useHotkeys("f8", h.onCheckout, opts, [h.onCheckout]);
  useHotkeys("escape", h.onCancel, { ...opts, preventDefault: false }, [h.onCancel]);
  useHotkeys("delete", h.onRemoveSelected, { ...opts, enableOnFormTags: false }, [h.onRemoveSelected]);
  useHotkeys("up", () => h.onMoveSelection(-1), { ...opts, enableOnFormTags: false }, [h.onMoveSelection]);
  useHotkeys("down", () => h.onMoveSelection(1), { ...opts, enableOnFormTags: false }, [h.onMoveSelection]);

  // Lector de códigos tipo teclado: caracteres muy seguidos + Enter, sin un
  // campo con foco (dentro de un campo, el propio campo resuelve el código).
  const buffer = useRef("");
  const last = useRef(0);
  const onScan = useRef(h.onScan);
  onScan.current = h.onScan;

  useEffect(() => {
    if (!h.enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const now = Date.now();
      if (now - last.current > 80) buffer.current = "";
      last.current = now;

      if (e.key === "Enter") {
        if (buffer.current.length >= 3) {
          e.preventDefault();
          onScan.current(buffer.current);
        }
        buffer.current = "";
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [h.enabled]);
}
