import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  bundleSignature,
  extractBundleScripts,
  shortBuildId,
} from "./versionCheck";

/**
 * Versión de la app (app.json → "version"). En el teléfono es la del binario
 * instalado: el JS viaja dentro de él (no hay actualizaciones OTA).
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? "0.0.0";

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
