/**
 * En la app nativa no hay teclado físico ni lector USB: el POS usa botones.
 * Metro toma usePosHotkeys.web.ts en web.
 */
export interface PosHotkeyHandlers {
  enabled: boolean;
  onSearch: () => void;
  onQuantity: () => void;
  onCustomer: () => void;
  onCheckout: () => void;
  onCancel: () => void;
  onRemoveSelected: () => void;
  onMoveSelection: (delta: 1 | -1) => void;
  onScan: (code: string) => void;
}

export function usePosHotkeys(_handlers: PosHotkeyHandlers) {}
