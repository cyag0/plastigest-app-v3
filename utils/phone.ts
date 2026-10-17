/**
 * Teléfonos: cómo se guardan, se muestran y se validan.
 *
 * Se guardan sólo dígitos. Uno de México va con sus 10 dígitos, sin lada de
 * país ("3221234567"), que es lo que ya esperan la búsqueda (LIKE) y el
 * envío por WhatsApp del backend (le antepone 521 a los de 10 dígitos). Uno
 * de otro país va con su lada internacional ("+15551234567").
 *
 * En pantalla se agrupan como se dictan: "322 123 4567", y "55 1234 5678"
 * en CDMX, Guadalajara y Monterrey (ladas de 2 dígitos).
 */

import * as yup from "yup";

export interface PhoneCountry {
  /** ISO 3166 (identificador). */
  id: string;
  name: string;
  /** Lada internacional, sin "+". */
  dialCode: string;
  /** Largos válidos del número nacional. */
  lengths: number[];
  /** Agrupación de los dígitos al mostrarlo. */
  groups: (national: string) => number[];
  /** Ejemplo para el placeholder. */
  example: string;
}

const MX_TWO_DIGIT_AREA = ["55", "56", "33", "81"];

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    id: "MX",
    name: "México",
    dialCode: "52",
    lengths: [10],
    groups: (n) => (MX_TWO_DIGIT_AREA.includes(n.slice(0, 2)) ? [2, 4, 4] : [3, 3, 4]),
    example: "322 123 4567",
  },
  {
    id: "US",
    name: "Estados Unidos / Canadá",
    dialCode: "1",
    lengths: [10],
    groups: () => [3, 3, 4],
    example: "555 123 4567",
  },
  { id: "GT", name: "Guatemala", dialCode: "502", lengths: [8], groups: () => [4, 4], example: "5123 4567" },
  { id: "SV", name: "El Salvador", dialCode: "503", lengths: [8], groups: () => [4, 4], example: "7012 3456" },
  { id: "HN", name: "Honduras", dialCode: "504", lengths: [8], groups: () => [4, 4], example: "9123 4567" },
  { id: "CR", name: "Costa Rica", dialCode: "506", lengths: [8], groups: () => [4, 4], example: "8312 3456" },
  { id: "PA", name: "Panamá", dialCode: "507", lengths: [7, 8], groups: () => [4, 4], example: "6123 4567" },
  { id: "CO", name: "Colombia", dialCode: "57", lengths: [10], groups: () => [3, 3, 4], example: "321 123 4567" },
  { id: "PE", name: "Perú", dialCode: "51", lengths: [8, 9], groups: () => [3, 3, 3], example: "912 345 678" },
  { id: "CL", name: "Chile", dialCode: "56", lengths: [9], groups: () => [1, 4, 4], example: "9 1234 5678" },
  { id: "ES", name: "España", dialCode: "34", lengths: [9], groups: () => [3, 3, 3], example: "612 345 678" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

/** Lada más larga primero: "+502…" es Guatemala, no "+50" + "2…". */
const BY_DIAL_CODE = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

export interface ParsedPhone {
  country: PhoneCountry;
  /** Sólo dígitos, sin la lada del país. */
  national: string;
}

export function maxLength(country: PhoneCountry): number {
  return Math.max(...country.lengths);
}

function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * Número de México escrito o pegado con algo de más: lada de país (52, 521)
 * o los prefijos viejos de larga distancia (01) y de celular (044, 045).
 */
function mexicanNational(digits: string): string {
  if (digits.length === 13 && /^(521|044|045)/.test(digits)) return digits.slice(3);
  if (digits.length === 12 && /^(52|01)/.test(digits)) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/**
 * Número sin el "+" de otro país: si trae su propia lada pegada al frente
 * (y lo que queda tiene un largo válido) se la quita.
 */
export function nationalDigits(country: PhoneCountry, digits: string): string {
  if (country.id === "MX") return mexicanNational(digits);
  if (digits.length > maxLength(country) && digits.startsWith(country.dialCode)) {
    const rest = digits.slice(country.dialCode.length);
    if (country.lengths.includes(rest.length)) return rest;
  }
  return digits;
}

/** País de un número con lada internacional (sin el "+"), si se conoce. */
function countryOfInternational(digits: string): PhoneCountry | undefined {
  return BY_DIAL_CODE.find((c) => digits.startsWith(c.dialCode));
}

/**
 * Lee un teléfono como venga (guardado, pegado o del autocompletado del
 * sistema): "+52 1 322 123 4567", "(322) 123-45-67", "+15551234567"…
 */
export function parsePhone(raw?: string | null, fallback = DEFAULT_PHONE_COUNTRY): ParsedPhone {
  const text = (raw ?? "").trim();
  const digits = onlyDigits(text);
  if (!digits) return { country: fallback, national: "" };

  if (text.startsWith("+") || text.startsWith("00")) {
    const international = text.startsWith("00") ? digits.slice(2) : digits;
    const country = countryOfInternational(international);
    if (country) {
      const rest = international.slice(country.dialCode.length);
      return { country, national: country.id === "MX" ? mexicanNational(rest) : rest };
    }
  }

  return { country: fallback, national: nationalDigits(fallback, digits) };
}

/** Valor que se guarda: "" si no hay número. */
export function serializePhone({ country, national }: ParsedPhone): string {
  if (!national) return "";
  return country.id === "MX" ? national : `+${country.dialCode}${national}`;
}

/** "3221234567" → "322 123 4567" (también a medio escribir: "322 12"). */
export function formatNational(country: PhoneCountry, national: string): string {
  const parts: string[] = [];
  let start = 0;
  const groups = country.groups(national);
  groups.forEach((size, i) => {
    if (start >= national.length) return;
    // El último grupo se lleva lo que sobre.
    const end = i === groups.length - 1 ? national.length : start + size;
    parts.push(national.slice(start, end));
    start = end;
  });
  return parts.join(" ");
}

export function isCompletePhone({ country, national }: ParsedPhone): boolean {
  return country.lengths.includes(national.length);
}

/**
 * Teléfono para mostrar: "322 123 4567" si es de México, "+1 555 123 4567"
 * si es de otro país. Lo que no se pueda leer como teléfono se muestra tal
 * cual estaba guardado.
 */
export function formatPhone(raw?: string | null): string {
  const text = (raw ?? "").trim();
  const parsed = parsePhone(text);
  if (!parsed.national || !isCompletePhone(parsed)) return text;
  const national = formatNational(parsed.country, parsed.national);
  return parsed.country.id === "MX" ? national : `+${parsed.country.dialCode} ${national}`;
}

function lengthMessage(country: PhoneCountry): string {
  const lengths = country.lengths.join(" u ");
  return country.id === "MX"
    ? "El teléfono debe tener 10 dígitos"
    : `Un teléfono de ${country.name} tiene ${lengths} dígitos`;
}

/** Regla de Yup para un teléfono opcional (vacío es válido). */
export function phoneSchema() {
  return yup
    .string()
    .nullable()
    .test("phone", function (value) {
      if (!value || !value.trim()) return true;
      const parsed = parsePhone(value);
      return isCompletePhone(parsed) || this.createError({ message: lengthMessage(parsed.country) });
    });
}
