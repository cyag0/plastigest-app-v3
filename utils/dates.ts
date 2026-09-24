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
