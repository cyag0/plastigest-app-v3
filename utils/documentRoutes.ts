/**
 * Pantalla de detalle de cada tipo de documento que mencionan el kárdex y la
 * bitácora (los tipos cortos los define el backend: "sale", "purchase"…).
 * Devuelve null si el tipo no tiene pantalla de detalle.
 */
const ROUTES: Record<string, (id: number) => string> = {
  sale: (id) => `/(tabs)/home/sales/${id}`,
  sales_order: (id) => `/(tabs)/home/sales-orders/${id}`,
  purchase: (id) => `/(tabs)/home/purchases/${id}`,
  transfer: (id) => `/(tabs)/home/transfers/${id}`,
  production_order: (id) => `/(tabs)/home/production/${id}`,
  count: (id) => `/(tabs)/inventory/weekly-inventory/${id}`,
  adjustment: (id) => `/(tabs)/home/adjustment/${id}`,
  cash_session: (id) => `/(tabs)/home/cash/sessions/${id}`,
  product: (id) => `/(tabs)/inventory/products/${id}`,
  package: (id) => `/(tabs)/administration/packages/${id}`,
  category: (id) => `/(tabs)/administration/categories/${id}`,
  supplier: (id) => `/(tabs)/administration/suppliers/${id}`,
  customer: (id) => `/(tabs)/administration/clientes/${id}`,
  unit: (id) => `/(tabs)/administration/unidades/${id}`,
  location: (id) => `/(tabs)/administration/locations/${id}`,
  cash_register: (id) => `/(tabs)/administration/cash-registers/${id}`,
  company: (id) => `/(tabs)/administration/companies/${id}`,
  user: (id) => `/(tabs)/administration/company-users/${id}`,
  role: (id) => `/(tabs)/home/roles/${id}`,
  task: (id) => `/(tabs)/tasks/${id}`,
};

export function routeForDocument(type?: string | null, id?: number | null): string | null {
  if (!type || !id) return null;
  const build = ROUTES[type];
  return build ? build(id) : null;
}
