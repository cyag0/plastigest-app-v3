/**
 * Nombre corto de la sucursal: sin el nombre de la empresa al inicio
 * ("Cocos Francisco La Lija" → "La Lija"). En celular el nombre completo no
 * cabe y la empresa ya se sabe.
 */
export function shortLocationName(name: string, companyName?: string | null): string {
  if (!companyName) return name;
  const prefix = companyName.trim();
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
    const rest = name.slice(prefix.length).trim();
    if (rest) return rest;
  }
  return name;
}
