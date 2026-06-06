import palette from "@/constants/palette";

/**
 * Tokens de diseno para el popover de notificaciones.
 *
 * Inspirado en Linear, Notion, GitHub Notifications y Stripe Dashboard:
 * fondo blanco puro, jerarquia por color y peso, badges discretos, mucho
 * espacio en blanco y separacion por grupos de fecha.
 *
 * Mantenerlo centralizado aqui permite que los subcomponentes
 * (NotificationCard, NotificationBadge, NotificationGroupHeader...)
 * compartan el mismo lenguaje visual sin reescribir paleta en cada uno.
 */

// ─── Familias de tipo ───────────────────────────────────────────────────────
// Cada tipo (Compras, Tareas, Inventario, Alertas, Sistema) tiene cuatro
// tonos: bg-soft para chips, bg-medium para el badge de icono, text para
// tipografia y accent para la barra vertical lateral de no-leidas.
export type NotificationTypeKey =
  | "purchase"
  | "task"
  | "inventory"
  | "alert"
  | "system";

export interface NotificationTypeTokens {
  /** Etiqueta corta visible en badges o chips. */
  label: string;
  /** Color de fondo suave, ideal para chips (bg-50 del estilo Tailwind). */
  bgSoft: string;
  /** Fondo medio para el contenedor del icono (bg-100 del estilo Tailwind). */
  bgMedium: string;
  /** Color de texto/icono (700 del estilo Tailwind, suficiente contraste). */
  text: string;
  /** Color de acento, usado para la barra vertical y el dot de no-leida. */
  accent: string;
  /** Icono Material Community Icons que representa la categoria. */
  icon: string;
}

export const NOTIFICATION_TYPES: Record<NotificationTypeKey, NotificationTypeTokens> = {
  purchase: {
    label: "Compra",
    bgSoft: "#ECFDF5", // emerald-50
    bgMedium: "#D1FAE5", // emerald-100
    text: "#047857", // emerald-700
    accent: "#10B981", // emerald-500
    icon: "truck-delivery-outline",
  },
  task: {
    label: "Tarea",
    bgSoft: "#EFF6FF", // blue-50
    bgMedium: "#DBEAFE", // blue-100
    text: "#1D4ED8", // blue-700
    accent: "#3B82F6", // blue-500
    icon: "checkbox-marked-circle-outline",
  },
  inventory: {
    label: "Inventario",
    bgSoft: "#FFF7ED", // orange-50
    bgMedium: "#FFEDD5", // orange-100
    text: "#C2410C", // orange-700
    accent: "#F97316", // orange-500
    icon: "package-variant",
  },
  alert: {
    label: "Alerta",
    bgSoft: "#FEF2F2", // red-50
    bgMedium: "#FEE2E2", // red-100
    text: "#B91C1C", // red-700
    accent: "#EF4444", // red-500
    icon: "alert-circle-outline",
  },
  system: {
    label: "Sistema",
    bgSoft: "#FAF5FF", // purple-50
    bgMedium: "#F3E8FF", // purple-100
    text: "#7E22CE", // purple-700
    accent: "#A855F7", // purple-500
    icon: "cog-outline",
  },
};

// ─── Estados (badges pequenos) ─────────────────────────────────────────────
// Los estados se muestran como pills al pie de cada tarjeta. Cada uno tiene
// su propia combinacion de fondo + texto para que se escaneen rapido.
export type NotificationStatusKey = "new" | "read" | "pending" | "overdue";

export interface NotificationStatusTokens {
  label: string;
  bg: string;
  text: string;
  dotColor: string;
}

export const NOTIFICATION_STATUSES: Record<NotificationStatusKey, NotificationStatusTokens> = {
  new: {
    label: "Nueva",
    bg: "#EEF2FF", // indigo-50
    text: "#4F46E5", // indigo-600
    dotColor: "#4F46E5",
  },
  read: {
    label: "Leida",
    bg: "#F3F4F6", // gray-100
    text: "#6B7280", // gray-500
    dotColor: "#9CA3AF", // gray-400
  },
  pending: {
    label: "Pendiente",
    bg: "#FEF3C7", // amber-100
    text: "#B45309", // amber-700
    dotColor: "#D97706", // amber-600
  },
  overdue: {
    label: "Vencida",
    bg: "#FEE2E2", // red-100
    text: "#B91C1C", // red-700
    dotColor: "#DC2626", // red-600
  },
};

// ─── Tokens base ────────────────────────────────────────────────────────────
// Tokens neutros. El fondo es blanco puro segun la spec; los grises vienen
// de la escala 50-900 de Tailwind para mantener la consistencia con el
// resto del design system.
export const NOTIFICATION_NEUTRAL = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAFB", // gray-50 — fondo de hover / no-leida ligera
  border: "#E5E7EB", // gray-200
  borderSubtle: "#F3F4F6", // gray-100
  textPrimary: "#111827", // gray-900
  textSecondary: "#6B7280", // gray-500
  textTertiary: "#9CA3AF", // gray-400
  hover: "#F3F4F6", // gray-100 — fondo de hover en cards
  unreadBg: "#F8FAFC", // slate-50 — fondo resaltado para no-leidas
  primary: palette.primary, // hereda el verde matcha de la app
  primaryText: palette.primary,
  onPrimary: "#FFFFFF",
} as const;

// ─── Layout tokens ──────────────────────────────────────────────────────────
// Anchos, radios y separaciones. Centralizados para que cambiar la densidad
// (compact vs spacious) sea un solo cambio.
export const NOTIFICATION_LAYOUT = {
  /** Ancho del contenedor del popover. Spec: 380-420. */
  containerWidth: 400,
  /** Altura maxima del popover antes de hacer scroll. */
  containerMaxHeight: 560,
  /** Radio del contenedor principal. */
  containerRadius: 16,
  /** Radio de las tarjetas individuales. */
  cardRadius: 12,
  /** Padding interno del contenedor. */
  containerPadding: 8,
  /** Padding interno de cada tarjeta. */
  cardPadding: 14,
  /** Separacion entre tarjetas. Spec: 8. */
  cardGap: 8,
  /** Altura maxima de cada tarjeta en modo compacto. Spec: 72. */
  cardMaxHeight: 72,
  /** Ancho del badge de icono dentro de la tarjeta. */
  iconBadgeSize: 36,
  /** Ancho de la barra vertical de no-leida. */
  unreadBarWidth: 3,
} as const;

// ─── Sombra moderna multi-capa ──────────────────────────────────────────────
// Inspirada en los dropdowns de Linear y Notion: una sombra ambiental mas
// amplia y otra mas cerrada que da el efecto de "flotar" sobre la pagina.
// En iOS se renderiza nativamente; en Android la elevation se aproxima.
export const NOTIFICATION_SHADOW = {
  shadowColor: "#0F172A", // slate-900 con tinte frio
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 32,
  elevation: 16,
} as const;

// ─── Tipografia ─────────────────────────────────────────────────────────────
// Variantes que se pasan a <Text> de Paper. Centralizadas para que el ritmo
// vertical del popover sea consistente.
export const NOTIFICATION_TYPOGRAPHY = {
  headerTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" as const },
  headerSubtitle: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
  cardTitle: { fontSize: 13.5, lineHeight: 18, fontWeight: "600" as const },
  cardTitleUnread: { fontSize: 13.5, lineHeight: 18, fontWeight: "700" as const },
  cardDescription: { fontSize: 12.5, lineHeight: 16, fontWeight: "400" as const },
  meta: { fontSize: 11, lineHeight: 14, fontWeight: "500" as const },
  badge: { fontSize: 10, lineHeight: 12, fontWeight: "700" as const, letterSpacing: 0.3 },
  groupLabel: { fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 0.8 },
  footer: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
} as const;
