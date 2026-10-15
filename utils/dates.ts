/**
 * Fechas de calendario (YYYY-MM-DD) en la zona horaria del dispositivo.
 *
 * `new Date().toISOString().split("T")[0]` da la fecha en UTC: en México,
 * después de las 6 pm ya es "mañana", así que una producción o un corte de
 * caja capturados en la tarde quedaban con la fecha del día siguiente. Y
 * `new Date("2026-09-24")` interpreta la cadena como medianoche UTC, que en
 * México se muestra como el día anterior.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha local del dispositivo como YYYY-MM-DD. */
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Convierte lo que manda el backend a Date sin corrimiento de día: una fecha
 * sola (YYYY-MM-DD) se toma como medianoche local; un datetime completo se
 * deja tal cual.
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

// ---------------------------------------------------------------------------
// Formato para mostrar. Todas las pantallas usan estas funciones para que una
// misma fecha se vea igual en toda la app (antes convivían "17 set. 2026",
// "17/09/2026", "2026 09 16" y "Sep 26, 2026, 01:38 AM").
// ---------------------------------------------------------------------------

const LOCALE = "es-MX";
const EMPTY = "—";

type DateInput = string | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_STYLES = {
  /** 17/09/2026 */
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  /** 17 sep 2026 */
  medium: { day: "numeric", month: "short", year: "numeric" },
  /** 17 de septiembre de 2026 */
  long: { day: "numeric", month: "long", year: "numeric" },
} as const;

/** Fecha de calendario: "17 sep 2026" (o "17/09/2026", "17 de septiembre de 2026"). */
export function formatDate(
  value: DateInput,
  style: keyof typeof DATE_STYLES = "medium",
): string {
  const date = toValidDate(value);
  return date ? date.toLocaleDateString(LOCALE, DATE_STYLES[style]) : EMPTY;
}

/** Fecha y hora: "17 sep 2026, 1:38 p.m." */
export function formatDateTime(value: DateInput): string {
  const date = toValidDate(value);
  return date
    ? date.toLocaleString(LOCALE, {
        ...DATE_STYLES.medium,
        hour: "numeric",
        minute: "2-digit",
      })
    : EMPTY;
}

/** Hora: "1:38 p.m." */
export function formatTime(value: DateInput): string {
  const date = toValidDate(value);
  return date
    ? date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" })
    : EMPTY;
}
