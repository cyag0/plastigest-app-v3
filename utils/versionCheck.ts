/**
 * Lógica pura del aviso de versiones (sin React Native, para probarla con
 * Node). La usan utils/appVersion.ts y components/App/AppUpdateGate.tsx.
 */

/** Respuesta de GET app/version (versiones mínima y más reciente del binario). */
export interface NativeVersionInfo {
  min_native_version: string | null;
  latest_native_version: string | null;
}

/** "1.2.10" → [1, 2, 10]. Ignora sufijos ("1.3.0-beta" → [1, 3, 0]). */
function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(/[-+]/)[0]
    .split(".")
    .map((part) => {
      const value = parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
    });
}

/** Negativo si a < b, 0 si son iguales, positivo si a > b ("1.10.0" > "1.9.9"). */
export function compareVersions(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** true si `current` es menor que `minimum` (sin mínimo nunca lo es). */
export function isVersionBelow(
  current: string,
  minimum: string | null | undefined,
): boolean {
  if (!minimum || !/\d/.test(minimum)) return false;
  return compareVersions(current, minimum) < 0;
}

const asVersion = (value: unknown): string | null =>
  typeof value === "string" && /\d/.test(value) ? value.trim() : null;

/** Normaliza la respuesta del servidor; lo que no sea una versión cuenta como "sin dato". */
export function parseNativeVersionInfo(data: unknown): NativeVersionInfo {
  const source = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    min_native_version: asVersion(source.min_native_version),
    latest_native_version: asVersion(source.latest_native_version),
  };
}

// Scripts del bundle web que Expo inserta en index.html.
const BUNDLE_SCRIPT = /\/_expo\/static\/js\/web\/([^"'?#\s/]+\.js)/g;

/** Nombres de los scripts del bundle (con su hash) que aparecen en un HTML. */
export function extractBundleScripts(html: string): string[] {
  const names = new Set<string>();
  for (const match of html.matchAll(BUNDLE_SCRIPT)) names.add(match[1]);
  return [...names];
}

/**
 * Identificador del build web: todos los scripts del bundle (runtime,
 * __common e index-<hash>.js), ordenados. Cualquiera que cambie es un
 * despliegue nuevo.
 */
export function bundleSignature(scripts: string[]): string | null {
  if (scripts.length === 0) return null;
  return [...scripts].sort().join("|");
}

/**
 * Hash corto del build web para mostrarlo junto a la versión ("fe762bb"): el
 * del script de entrada (index-<hash>.js en SDK 56, entry-<hash>.js antes),
 * que cambia con el código de la app; el runtime y __common casi nunca.
 */
export function shortBuildId(signature: string | null): string | null {
  if (!signature) return null;
  const hash =
    /(?:^|\|)(?:entry|index)-([0-9a-f]{7,})/i.exec(signature) ??
    /([0-9a-f]{7,})/i.exec(signature);
  return hash ? hash[1].slice(0, 7) : null;
}
