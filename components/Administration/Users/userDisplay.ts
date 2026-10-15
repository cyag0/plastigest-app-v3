import { shortLocationName } from "@/utils/locations";

/**
 * Cómo se muestran los usuarios en Administración (listas, detalle y
 * formulario), igual en la empresa y en la sucursal.
 */

/** Dónde se administran: todas las empresas, la empresa o la sucursal actual. */
export type UserScope = "global" | "company" | "location";

/** Rutas de cada alcance (lista, detalle y formulario). */
export function userRoutes(scope: UserScope) {
  const base =
    scope === "location"
      ? "/(tabs)/administration/current-location/users"
      : scope === "company"
        ? "/(tabs)/administration/company-users"
        : "/(tabs)/administration/users";

  return {
    list: base,
    detail: (id: number) => `${base}/${id}`,
    create: `${base}/form`,
    edit: (id: number) => `${base}/${id}/edit`,
  };
}

/** "Ana María López" → "AM"; "ana" → "A". */
export function initials(name?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export { shortLocationName };

/** "La Lija · Cajero", "La Lija · sin rol". */
export function describeAccess(
  access: App.Entities.UserLocationRole,
  companyName?: string | null,
): string {
  return `${shortLocationName(access.location_name, companyName)} · ${access.role_name ?? "sin rol"}`;
}

/** Resumen de sus sucursales para una línea de la lista. */
export function accessSummary(
  user: App.Entities.User,
  companyName?: string | null,
): string {
  const access = user.location_roles ?? [];
  if (access.length === 0) return "Sin sucursal asignada";
  if (access.length === 1) return describeAccess(access[0], companyName);
  return access.map((a) => shortLocationName(a.location_name, companyName)).join(", ");
}

/** Lista que manda el backend: arreglo directo o { data: [...] }. */
export function listFrom<T>(body: any): T[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

/**
 * Mensaje del backend o uno por defecto: el primer error de campo (422), si no
 * `message` (403, reglas de negocio) y si no `error`.
 */
export function apiMessage(error: any, fallback: string): string {
  const data = error?.response?.data;
  const fieldError = data?.errors ? (Object.values(data.errors).flat()[0] as string | undefined) : undefined;
  const message = [fieldError, data?.message, data?.error].find(
    (m): m is string => typeof m === "string" && m.trim() !== "",
  );
  return message ?? fallback;
}
