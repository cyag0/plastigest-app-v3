/**
 * Paleta de colores PlastiGest v2 — SaaS 2025.
 *
 * Principios:
 * - 1 color principal (matcha profundo) para acciones/foco/activo
 * - Estados semanticos unicos (emerald, amber, red, blue)
 * - Escala de grises neutros (slate) para todo lo demas
 * - Fondos claros (slate-50) + cards blancos para que las sombras se vean
 *
 * Modo oscuro: la funcion `paletteFor(mode)` retorna el set de tokens
 * correspondiente. Los componentes que necesitan reactividad al tema
 * deben usar el hook `useTheme()` en lugar de importar `palette` directo.
 *
 * Migracion desde v1: las claves deprecadas (secondary, accent,
 * skeleton, red, blue) se mantienen con sus valores antiguos
 * para no romper componentes legacy. Marcan con comentario
 * @deprecated. Eliminar cuando se migren todos los componentes.
 */

export type ThemeMode = "light" | "dark";

const lightPalette = {
  // --- Marca ---
  primary: "#4F7A3A", // Matcha profundo
  primaryHover: "#3F6230",
  primarySoft: "#E8F0E0", // Fondo para chips/badges/active state
  primaryForeground: "#FFFFFF",

  // --- Superficies (slate cool) ---
  background: "#F8FAFC", // Slate-50
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9", // Slate-100
  surfaceElevated: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.48)",

  // --- Bordes ---
  border: "#E2E8F0", // Slate-200
  borderStrong: "#CBD5E1", // Slate-300
  ring: "rgba(79, 122, 58, 0.20)",

  // --- Texto ---
  text: "#0F172A", // Slate-900
  textSecondary: "#475569", // Slate-600
  textMuted: "#94A3B8", // Slate-400
  textInverse: "#FFFFFF",

  // --- Estados semanticos ---
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  error: "#EF4444",
  errorSoft: "#FEE2E2",
  info: "#3B82F6",
  infoSoft: "#DBEAFE",

  // --- Acentos para charts ---
  chart1: "#4F7A3A",
  chart2: "#3B82F6",
  chart3: "#F59E0B",
  chart4: "#8B5CF6",
  chart5: "#EC4899",
  chart6: "#10B981",

  // --- @deprecated ---
  secondary: "#B3B792",
  accent: "#D2AB80",
  skeleton: "#E2E8F0",
  red: "#EF4444",
  blue: "#3B82F6",
  textLegacy: "#333",
  card: "#FFFFFF",
  purple: "#8B5CF6",
  skeletonCard: "#E2E8F0",
  skeletonTextBlock: "#F1F5F9",
  skeletonLine: "#E2E8F0",
  cardContent: "#FFFFFF",
};

/**
 * Paleta dark: superficies slate oscuras, texto claro, estados
 * semanticos con versiones mas brillantes para contraste.
 */
const darkPalette = {
  // --- Marca ---
  primary: "#86C66B", // Matcha mas claro para contraste
  primaryHover: "#A0D585",
  primarySoft: "rgba(134, 198, 107, 0.16)", // primary con alpha
  primaryForeground: "#0F172A",

  // --- Superficies (slate-900/800/700) ---
  background: "#0B1220", // Slate-950-ish
  surface: "#111827", // Slate-900
  surfaceMuted: "#1E293B", // Slate-800
  surfaceElevated: "#1E293B",
  overlay: "rgba(0, 0, 0, 0.65)",

  // --- Bordes ---
  border: "#1E293B", // Slate-800
  borderStrong: "#334155", // Slate-700
  ring: "rgba(134, 198, 107, 0.30)",

  // --- Texto ---
  text: "#F1F5F9", // Slate-100
  textSecondary: "#CBD5E1", // Slate-300
  textMuted: "#64748B", // Slate-500
  textInverse: "#0F172A",

  // --- Estados semanticos ---
  success: "#34D399", // Emerald-400
  successSoft: "rgba(52, 211, 153, 0.16)",
  warning: "#FBBF24", // Amber-400
  warningSoft: "rgba(251, 191, 36, 0.16)",
  error: "#F87171", // Red-400
  errorSoft: "rgba(248, 113, 113, 0.16)",
  info: "#60A5FA", // Blue-400
  infoSoft: "rgba(96, 165, 250, 0.16)",

  // --- Acentos para charts ---
  chart1: "#86C66B",
  chart2: "#60A5FA",
  chart3: "#FBBF24",
  chart4: "#A78BFA",
  chart5: "#F472B6",
  chart6: "#34D399",

  // --- @deprecated (aliases en dark) ---
  secondary: "#5C6B57",
  accent: "#7A6650",
  skeleton: "#1E293B",
  red: "#F87171",
  blue: "#60A5FA",
  textLegacy: "#F1F5F9",
  card: "#111827",
  purple: "#A78BFA",
  skeletonCard: "#1E293B",
  skeletonTextBlock: "#1E293B",
  skeletonLine: "#1E293B",
  cardContent: "#111827",
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
