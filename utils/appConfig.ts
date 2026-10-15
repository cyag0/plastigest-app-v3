/**
 * Dirección del API que se incrusta en el bundle al compilar
 * (EXPO_PUBLIC_API_URL): en EAS sale de eas.json, en la web de las variables
 * de compilación de Cloudflare y en desarrollo de .env.
 *
 * Antes, si faltaba, se usaba "http://localhost/api" en cualquier build, y un
 * export hecho en una PC de desarrollo (con su .env o con la caché de Metro de
 * un export anterior) mandaba los inicios de sesión y las ventas de todas las
 * sucursales a localhost sin ningún aviso. Ahora, en un build de producción,
 * una dirección faltante o local es un error de configuración: la app muestra
 * una pantalla que lo explica (app/_layout.tsx) y no hace ninguna petición.
 *
 * Sin imports de React Native para poder probar la lógica con Node.
 */

/** Dirección que se usa en desarrollo cuando no hay EXPO_PUBLIC_API_URL. */
export const DEV_FALLBACK_API_URL = "http://localhost/api";

// Esta misma máquina o la PC vista desde un emulador de Android
// (10.0.2.2 en el de Android Studio, 10.0.3.2 en Genymotion).
const LOCAL_HOST = /^(localhost|.+\.localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10\.0\.2\.2|10\.0\.3\.2|\[::1?\])$/i;

// Protocolo y host. Expresión propia: el URL de React Native no valida nada y
// su `hostname` no entiende IPv6.
const URL_PARTS = /^(https?):\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]+)/i;

export interface ApiConfig {
  /** Base de las peticiones ("" cuando la configuración no sirve). */
  baseUrl: string;
  /** Explicación para la pantalla de configuración, o null si todo bien. */
  error: string | null;
}

export function resolveApiConfig(
  rawUrl: string | undefined,
  options: { isDev: boolean; allowLocal?: boolean },
): ApiConfig {
  const url = (rawUrl ?? "").trim().replace(/\/+$/, "");

  // En desarrollo todo se permite, como antes.
  if (options.isDev) {
    return { baseUrl: url || DEV_FALLBACK_API_URL, error: null };
  }

  if (!url) {
    return {
      baseUrl: "",
      error:
        "Este build no trae la dirección del servidor (EXPO_PUBLIC_API_URL). Hay que definirla en las variables de compilación y volver a compilar.",
    };
  }

  const parts = URL_PARTS.exec(url);
  if (!parts) {
    return {
      baseUrl: "",
      error: `La dirección del servidor de este build no es válida: «${url}». Debe empezar con https://.`,
    };
  }

  if (LOCAL_HOST.test(parts[2]) && !options.allowLocal) {
    return {
      baseUrl: "",
      error: `Este build apunta a un servidor local (${url}), que sólo existe en la computadora donde se compiló. Hay que compilar de nuevo con la dirección real del servidor (para pruebas locales, con EXPO_PUBLIC_ALLOW_LOCAL_API=true).`,
    };
  }

  return { baseUrl: url, error: null };
}

const API_CONFIG = resolveApiConfig(process.env.EXPO_PUBLIC_API_URL, {
  isDev: typeof __DEV__ !== "undefined" && __DEV__,
  allowLocal: process.env.EXPO_PUBLIC_ALLOW_LOCAL_API === "true",
});

/** Base del API (incluye /api), sin barra final. */
export const API_BASE_URL = API_CONFIG.baseUrl;

/** Motivo por el que este build no puede funcionar, o null. */
export const API_CONFIG_ERROR = API_CONFIG.error;
