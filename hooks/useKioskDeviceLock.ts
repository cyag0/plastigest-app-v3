/**
 * Lo que fija el equipo mientras el kiosko está activo:
 *  - pantalla siempre encendida (expo-keep-awake; en web, la API Wake Lock,
 *    que el navegador suelta al ocultar la pestaña y se vuelve a pedir al
 *    regresar);
 *  - el botón "atrás" de Android no saca del kiosko (cierra lo que esté
 *    abierto, si la pantalla lo indica).
 *
 * La barra de estado oculta y usePreventRemove van en la pantalla.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

const KEEP_AWAKE_TAG = "plastigest-kiosk";

export function useKioskDeviceLock(active: boolean, onBack?: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;

    const acquire = () => {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    };
    acquire();

    let onVisible: (() => void) | null = null;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      onVisible = () => {
        if (document.visibilityState === "visible") acquire();
      };
      document.addEventListener("visibilitychange", onVisible);
    }

    // Atrás de Android: nunca sale del kiosko.
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      onBackRef.current?.();
      return true;
    });

    return () => {
      back.remove();
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [active]);
}
