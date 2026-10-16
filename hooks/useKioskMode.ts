/**
 * El modo kiosko del equipo (utils/kioskMode) para componentes de React: se
 * vuelven a pintar al iniciar o quitar el modo.
 */
import {
  getCachedKioskMode,
  isKioskModeActive,
  subscribeKioskMode,
  type KioskModeRecord,
} from "@/utils/kioskMode";
import { useSyncExternalStore } from "react";

/** El modo guardado: undefined mientras se lee del equipo, null si no hay. */
export function useKioskModeRecord(): KioskModeRecord | null | undefined {
  return useSyncExternalStore(subscribeKioskMode, getCachedKioskMode, getCachedKioskMode);
}

/** ¿El equipo está en modo kiosko para la sesión actual? */
export function useKioskModeActive(): boolean {
  return useSyncExternalStore(subscribeKioskMode, isKioskModeActive, isKioskModeActive);
}
