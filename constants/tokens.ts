/**
 * Design tokens para PlastiGest SaaS 2025.
 *
 * Concentra los valores reutilizables del sistema de diseño:
 * radius, sombras, espaciado y tipografia. Cualquier ajuste
 * futuro (modo oscuro, accesibilidad, branding) se hace aqui
 * y se propaga al resto de la app.
 *
 * Inspirado en: Material 3 type scale, Tailwind defaults, iOS
 * HIG 4-pt grid, Shadcn/UI tokens.
 */

export const tokens = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999, // avatares, badges circulares
  },
  shadow: {
    xs: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.10,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  spacing: {
    // 4-pt grid
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
    8: 40,
    9: 48,
    10: 64,
  },
  typography: {
    display: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const },
    h1: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
    h2: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
    body: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
    bodySm: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
    micro: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "500" as const,
      letterSpacing: 0.5,
    },
    numeric: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: "700" as const,
      // tabular nums se aplica inline en el componente porque RN no lo soporta via style
    },
  },
} as const;

export type Spacing = keyof typeof tokens.spacing;
export type Radius = keyof typeof tokens.radius;
export type Shadow = keyof typeof tokens.shadow;
export type TypographyVariant = keyof typeof tokens.typography;
