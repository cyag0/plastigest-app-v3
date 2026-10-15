/**
 * Paleta GCStock — "coco y matcha".
 *
 * Principios:
 * - Un solo verde de marca (el oliva del logo) para acciones, foco y activo.
 *   "Éxito" es de la misma familia: antes convivían el oliva y un esmeralda
 *   de Tailwind que no combinaban.
 * - Neutros cálidos (arena, crema, café) en lugar de los grises azulados de
 *   Tailwind (slate): van con el producto (coco) y con el oliva.
 * - Estados en tonos de tierra: ocre (aviso), ladrillo (error), petróleo
 *   (información). Sin el azul/lila de plantilla.
 * - Acento tostado (cáscara de coco) para detalles, con moderación.
 *
 * Modo oscuro: `paletteFor(mode)` devuelve el set del modo. Los componentes
 * que reaccionan al tema usan `useTheme()` en vez de importar `palette`.
 *
 * Las claves @deprecated (secondary, skeleton, red, blue…) se conservan
 * apuntando a los colores nuevos para no romper componentes viejos.
 */

export type ThemeMode = "light" | "dark";

const lightPalette = {
  // --- Marca ---
  primary: "#4F7A3A", // Oliva/matcha del logo
  primaryHover: "#3E6230",
  primarySoft: "#E9F0E1", // Fondo de chips, badges y estado activo
  primaryForeground: "#FFFFFF",

  // --- Acento (cáscara de coco) ---
  accent: "#8A6A43",
  accentSoft: "#F3EBDD",

  // --- Superficies (arena cálida) ---
  background: "#F6F4EE",
  surface: "#FFFFFF",
  surfaceMuted: "#F0EDE4",
  surfaceElevated: "#FFFFFF",
  overlay: "rgba(31, 36, 27, 0.48)",

  // --- Bordes ---
  border: "#E6E1D5",
  borderStrong: "#D3CCBC",
  ring: "rgba(79, 122, 58, 0.22)",

  // --- Texto (negro oliva y grises cálidos) ---
  text: "#1F241B",
  textSecondary: "#57564B",
  textMuted: "#8F8B7D",
  textInverse: "#FFFFFF",

  // --- Estados ---
  success: "#3F8A3A",
  successSoft: "#E4F0DA",
  warning: "#C47F12",
  warningSoft: "#FAEED6",
  error: "#B9412C",
  errorSoft: "#F8E2DC",
  info: "#2F6F7E",
  infoSoft: "#DFEDF0",

  // --- Gráficas (de la misma familia) ---
  chart1: "#4F7A3A",
  chart2: "#8A6A43",
  chart3: "#C47F12",
  chart4: "#2F6F7E",
  chart5: "#A4B86A",
  chart6: "#B9412C",

  // --- @deprecated ---
  secondary: "#A9AE86",
  skeleton: "#E6E1D5",
  red: "#B9412C",
  blue: "#2F6F7E",
  textLegacy: "#1F241B",
  card: "#FFFFFF",
  purple: "#7A6A8C",
  skeletonCard: "#E6E1D5",
  skeletonTextBlock: "#F0EDE4",
  skeletonLine: "#E6E1D5",
  cardContent: "#FFFFFF",
};

/**
 * Paleta oscura: superficies café-oliva muy oscuras, texto crema y estados
 * más claros para que tengan contraste.
 */
const darkPalette = {
  // --- Marca ---
  primary: "#9CC47F",
  primaryHover: "#B2D399",
  primarySoft: "rgba(156, 196, 127, 0.16)",
  primaryForeground: "#14170F",

  // --- Acento ---
  accent: "#C9A577",
  accentSoft: "rgba(201, 165, 119, 0.16)",

  // --- Superficies ---
  background: "#12140F",
  surface: "#1B1D16",
  surfaceMuted: "#25281F",
  surfaceElevated: "#25281F",
  overlay: "rgba(0, 0, 0, 0.65)",

  // --- Bordes ---
  border: "#2C2F25",
  borderStrong: "#3D4033",

  ring: "rgba(156, 196, 127, 0.30)",

  // --- Texto ---
  text: "#F1EEE4",
  textSecondary: "#CFCABA",
  textMuted: "#8E8A7B",
  textInverse: "#14170F",

  // --- Estados ---
  success: "#8FC56E",
  successSoft: "rgba(143, 197, 110, 0.16)",
  warning: "#E3A646",
  warningSoft: "rgba(227, 166, 70, 0.16)",
  error: "#E07A62",
  errorSoft: "rgba(224, 122, 98, 0.16)",
  info: "#7FB4C2",
  infoSoft: "rgba(127, 180, 194, 0.16)",

  // --- Gráficas ---
  chart1: "#9CC47F",
  chart2: "#C9A577",
  chart3: "#E3A646",
  chart4: "#7FB4C2",
  chart5: "#C8D79A",
  chart6: "#E07A62",

  // --- @deprecated (alias en oscuro) ---
  secondary: "#6B7058",
  skeleton: "#2C2F25",
  red: "#E07A62",
  blue: "#7FB4C2",
  textLegacy: "#F1EEE4",
  card: "#1B1D16",
  purple: "#A99BBB",
  skeletonCard: "#2C2F25",
  skeletonTextBlock: "#25281F",
  skeletonLine: "#2C2F25",
  cardContent: "#1B1D16",
};

export type Palette = typeof lightPalette;

export const light = lightPalette;
export const dark = darkPalette;

/**
 * Retorna la paleta correspondiente al modo. Usado por el
 * ThemeContext. Para componentes individuales, preferir el hook
 * `useTheme()` que devuelve la paleta activa.
 */
export function paletteFor(mode: ThemeMode): Palette {
  return mode === "dark" ? darkPalette : lightPalette;
}

/**
 * `palette` (default export) sigue siendo la version light para
 * compatibilidad con codigo existente que no migra al theme hook.
 * En modo dark los colores no se actualizan; los componentes que
 * usan este import mantienen el aspecto claro.
 */
const palette = lightPalette;

export default palette;
