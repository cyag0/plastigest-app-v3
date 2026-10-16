import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  bundleSignature,
  extractBundleScripts,
  shortBuildId,
} from "./versionCheck";

// Versión de la app (app.json → "version"). En el teléfono es la del binario
// instalado: el JS viaja dentro de él (no hay actualizaciones OTA). null si
// no se puede saber.
const KNOWN_VERSION: string | null = Constants.expoConfig?.version ?? null;

/** Versión para mostrar y reportar ("0.0.0" si no se sabe). */
export const APP_VERSION: string = KNOWN_VERSION ?? "0.0.0";

/**
 * Versión que se compara con la mínima del servidor (MIN_NATIVE_APP_VERSION).
 * null si no se sabe: entonces el aviso "Actualiza la app" nunca bloquea (un
 * "0.0.0" de respaldo bloquearía a todos). Ver "Versiones de la app" en el
 * README: cada build para las tiendas sube "version" en app.json.
 */
export const GATE_VERSION: string | null = KNOWN_VERSION;

// Web: build que cargó esta pestaña. Se lee al importar el módulo, cuando el
// documento sólo tiene los scripts de index.html (los chunks se agregan después).
const LOADED_WEB_SIGNATURE: string | null = (() => {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  try {
    const sources = Array.from(document.querySelectorAll("script[src]"))
      .map((script) => (script as HTMLScriptElement).src)
      .join("\n");
    return bundleSignature(extractBundleScripts(sources));
  } catch {
    return null;
  }
})();

/** Build web cargado (null en el teléfono o con el servidor de desarrollo). */
export function getLoadedWebBuildSignature(): string | null {
  return LOADED_WEB_SIGNATURE;
}

/**
 * Versión para mostrar: "1.0.0" y, en web, el build desplegado
 * ("1.0.0 · fe762bb") para saber qué versión tiene abierta cada caja.
 */
export function getAppVersionLabel(): string {
  const build = shortBuildId(LOADED_WEB_SIGNATURE);
  return build ? `${APP_VERSION} · ${build}` : APP_VERSION;
}

// Web: un pedazo del bundle no se pudo cargar (ver isChunkLoadError). Lo
// avisan los error boundaries y los manejadores globales; AppUpdateGate
// ofrece recargar.
type ChunkLoadErrorListener = () => void;
const chunkLoadErrorListeners = new Set<ChunkLoadErrorListener>();
let chunkLoadErrorSeen = false;

export function notifyChunkLoadError(): void {
  chunkLoadErrorSeen = true;
  chunkLoadErrorListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Un aviso que falla no debe tapar a los demás.
    }
  });
}

/** Se suscribe al aviso; si ya pasó antes de suscribirse, avisa de inmediato. */
export function onChunkLoadError(listener: ChunkLoadErrorListener): () => void {
  chunkLoadErrorListeners.add(listener);
  if (chunkLoadErrorSeen) listener();
  return () => {
    chunkLoadErrorListeners.delete(listener);
  };
}
