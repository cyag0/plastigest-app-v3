/**
 * Kiosko web encendido todo el día: en modo kiosko no se muestra el aviso
 * "Hay una nueva versión" (lo verían los clientes, ver AppUpdateGate). En su
 * lugar, mientras la pantalla está en la bienvenida (sin pedido a medias), se
 * revisa si hay un despliegue nuevo y se recarga sola. El modo kiosko se
 * guarda en el equipo, así que tras recargar vuelve al kiosko.
 */
import { getLoadedWebBuildSignature, onChunkLoadError } from "@/utils/appVersion";
import { bundleSignature, extractBundleScripts } from "@/utils/versionCheck";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @param enabled solo en la bienvenida.
 * @param beforeReload quita lo que impediría recargar (p. ej. el aviso de
 *   "¿Salir del sitio?" de usePreventRemove en web).
 */
export function useKioskWebUpdate(enabled: boolean, beforeReload?: () => void) {
  const beforeReloadRef = useRef(beforeReload);
  useEffect(() => {
    beforeReloadRef.current = beforeReload;
  }, [beforeReload]);

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || __DEV__ || typeof window === "undefined") return;
    const loaded = getLoadedWebBuildSignature();
    let stopped = false;

    const reload = () => {
      if (stopped) return;
      stopped = true;
      beforeReloadRef.current?.();
      window.location.reload();
    };

    const check = async () => {
      if (!loaded || stopped) return;
      try {
        const response = await fetch("/", { cache: "no-store", headers: { Accept: "text/html" } });
        if (!response.ok) return;
        const deployed = bundleSignature(extractBundleScripts(await response.text()));
        if (deployed && deployed !== loaded) reload();
      } catch {
        // Sin red: se revisa en la siguiente vuelta.
      }
    };

    // Una parte del bundle ya no existe (despliegue nuevo): recargar.
    const offChunk = onChunkLoadError(reload);
    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      stopped = true;
      offChunk();
      clearInterval(timer);
    };
  }, [enabled]);
}
