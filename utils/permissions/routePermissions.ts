/**
 * Mapa central ruta → permiso. Cada pantalla de app/ tiene aquí su regla
 * (también las públicas y las de "cualquier usuario"), con los nombres de
 * permiso del backend. Lo usan:
 * - el guard de rutas (components/App/RoutePermissionGuard.tsx), que muestra
 *   "No tienes permiso…" en lugar de la pantalla al entrar por URL directa
 *   (web) o deep link;
 * - los menús (useCan().canAccessRoute), para no listar lo que el usuario no
 *   puede abrir (Todos los módulos, menú lateral, accesos rápidos…).
 *
 * La llave es el archivo dentro de app/ sin extensión, con grupos e "index":
 * "(tabs)/home/sales/[id]", "(tabs)/inventory/products/[id]/edit". Así el
 * guard la compara tal cual con el nombre de la pantalla en su navegador y los
 * menús la encuentran a partir de un href ("/(tabs)/home/sales/15" o
 * "/home/sales/15", con o sin grupos).
 *
 * Al agregar una pantalla, agrega su regla aquí. Una pantalla sin regla no
 * se bloquea (en desarrollo se avisa en consola).
 */
import { checkPermission, type PermissionRule } from "./permissions";

/** Sin sesión (login, recuperar contraseña, 404). */
export const PUBLIC = Object.freeze({ access: "public" as const });

/** Cualquier usuario con sesión, sin permiso extra (Inicio, perfil, ayuda…). */
export const AUTHENTICATED = Object.freeze({ access: "authenticated" as const });

/** Regla según un parámetro de la ruta (p. ej. "?id="): `with` si viene, `without` si no. */
export interface ParamRouteRule {
  param: string;
  with: RouteRule;
  without: RouteRule;
}

/**
 * Qué exige una ruta:
 * - PUBLIC / AUTHENTICATED;
 * - "sales_list" o ["sales_read", "sales_pos"] (basta uno);
 * - { all: ["sales_orders_create", "sales_orders_update"] } (todos);
 * - byParam("id", conId, sinId) para formularios que sirven para crear y
 *   editar ("form?id=").
 */
export type RouteRule =
  | typeof PUBLIC
  | typeof AUTHENTICATED
  | PermissionRule
  | { all: readonly string[] }
  | ParamRouteRule;

/** Regla que depende de un parámetro: byParam("id", "expenses_read", "expenses_create"). */
export function byParam(param: string, withParam: RouteRule, withoutParam: RouteRule): ParamRouteRule {
  return { param, with: withParam, without: withoutParam };
}

/** Cualquiera de estos da acceso a alguna opción de Administración. */
const ADMIN_MENU_PERMISSIONS = [
  "companies_list",
  "system_admin",
  "companies_update",
  "users_list",
  "users_read",
  "locations_list",
  "locations_update",
  "cash_registers_list",
  "roles_list",
  "notifications_list",
  "categories_list",
  "units_list",
  "products_list",
  "suppliers_list",
  "customers_list",
];

/**
 * Regla de cada pantalla: solo lo necesario para entrar. Los permisos de cada
 * acción (crear, aprobar, cobrar, imprimir…) se revisan en la pantalla con
 * useCan(), AppList (permissionPrefix) o AppForm (permissionPrefix).
 */
export const ROUTE_PERMISSIONS: Readonly<Record<string, RouteRule>> = {
  // ── raíz ──────────────────────────────────────────────────────────────
  "+not-found": PUBLIC,
  "index": PUBLIC,
  "login": PUBLIC,
  "forgot-password": PUBLIC,
  "reset-password-code": PUBLIC,
  "reset-password-confirm": PUBLIC,

  // ── (stacks) ──────────────────────────────────────────────────────────
  "(stacks)/activity": byParam("user_id", "users_read", AUTHENTICATED),
  "(stacks)/change-password": AUTHENTICATED,
  "(stacks)/help/[topic]": AUTHENTICATED,
  "(stacks)/help/index": AUTHENTICATED,
  // Kiosko de autoservicio: la pantalla del cliente y la que inicia el modo kiosko.
  // La del cliente revisa sales_kiosk por su cuenta: si se lo quitan a la
  // cuenta, muestra "no disponible" con salida por PIN. Con el guardia de
  // aquí salía "Sin permiso" con "Ir al inicio" y el cliente quedaba dentro
  // del sistema.
  "(stacks)/kiosk/index": AUTHENTICATED,
  "(stacks)/kiosk/setup": "sales_kiosk",
  "(stacks)/notification-preferences/index": "notifications_list",
  "(stacks)/pos/index": "sales_pos",
  "(stacks)/selectCompany": AUTHENTICATED,
  "(stacks)/selectLocation": AUTHENTICATED,
  "(stacks)/task-notification-guide": AUTHENTICATED,

  // ── (tabs) ────────────────────────────────────────────────────────────
  "(tabs)/preferences": AUTHENTICATED,
  "(tabs)/profile": AUTHENTICATED,
  "(tabs)/reports": "reports_view",

  // ── (tabs)/administration ─────────────────────────────────────────────
  "(tabs)/administration/index": ADMIN_MENU_PERMISSIONS,
  "(tabs)/administration/cash-registers/index": "cash_registers_list",
  "(tabs)/administration/cash-registers/form": "cash_registers_create",
  "(tabs)/administration/cash-registers/[id]/index": "cash_registers_read",
  "(tabs)/administration/cash-registers/[id]/edit": "cash_registers_update",
  "(tabs)/administration/categories/index": "categories_list",
  "(tabs)/administration/categories/form": "categories_create",
  "(tabs)/administration/categories/[id]/index": "categories_read",
  "(tabs)/administration/categories/[id]/edit": "categories_update",
  "(tabs)/administration/clientes/index": "customers_list",
  "(tabs)/administration/clientes/form": "customers_create",
  "(tabs)/administration/clientes/[id]/index": "customers_read",
  "(tabs)/administration/clientes/[id]/edit": "customers_update",
  "(tabs)/administration/companies/index": "companies_list",
  "(tabs)/administration/companies/form": "companies_create",
  "(tabs)/administration/companies/[id]/index": "companies_read",
  "(tabs)/administration/companies/[id]/edit": "companies_update",
  "(tabs)/administration/company-users/index": "users_list",
  "(tabs)/administration/company-users/form": byParam("id", "users_update", "users_create"),
  "(tabs)/administration/company-users/[id]/index": "users_read",
  "(tabs)/administration/company-users/[id]/edit": "users_update",
  "(tabs)/administration/current-location/users/index": "users_list",
  "(tabs)/administration/current-location/users/form": byParam("id", "users_update", "users_create"),
  "(tabs)/administration/current-location/users/[id]/index": "users_read",
  "(tabs)/administration/current-location/users/[id]/edit": "users_update",
  "(tabs)/administration/users/index": "users_list",
  "(tabs)/administration/users/form": byParam("id", "users_update", "users_create"),
  "(tabs)/administration/users/[id]/index": "users_read",
  "(tabs)/administration/users/[id]/edit": "users_update",
  "(tabs)/administration/current-location/index": { all: ["locations_read", "locations_update"] },
  "(tabs)/administration/locations/index": "locations_list",
  "(tabs)/administration/locations/form": byParam("id", "locations_update", "locations_create"),
  "(tabs)/administration/locations/[id]/index": "locations_read",
  "(tabs)/administration/locations/[id]/edit": "locations_update",
  "(tabs)/administration/packages/index": "products_list",
  "(tabs)/administration/packages/form": "products_create",
  "(tabs)/administration/packages/[id]/index": "products_read",
  "(tabs)/administration/packages/[id]/edit": "products_update",
  "(tabs)/administration/suppliers/index": "suppliers_list",
  "(tabs)/administration/suppliers/form": "suppliers_create",
  "(tabs)/administration/suppliers/[id]/index": "suppliers_read",
  "(tabs)/administration/suppliers/[id]/edit": "suppliers_update",
  "(tabs)/administration/unidades/index": "units_list",
  "(tabs)/administration/unidades/form": "units_create",
  "(tabs)/administration/unidades/[id]/index": "units_read",
  "(tabs)/administration/unidades/[id]/edit": "units_update",

  // ── (tabs)/home ───────────────────────────────────────────────────────
  "(tabs)/home/index": AUTHENTICATED,
  "(tabs)/home/all-modules": AUTHENTICATED,
  "(tabs)/home/adjustment/index": "inventory_list",
  "(tabs)/home/adjustment/form": "inventory_manage",
  "(tabs)/home/adjustment/[id]/index": "inventory_read",
  "(tabs)/home/business-reports/index": "reports_view",
  "(tabs)/home/cash/closing/index": "cash_movements_list",
  "(tabs)/home/cash/closing/[id]/index": "cash_movements_read",
  "(tabs)/home/cash/form": byParam("id", "cash_movements_read", "cash_movements_create"),
  "(tabs)/home/cash/index": "cash_movements_list",
  "(tabs)/home/cash/sessions/index": "cash_register_sessions_list",
  "(tabs)/home/cash/sessions/[id]/index": ["cash_register_sessions_read", "sales_pos"],
  "(tabs)/home/companies/index": "companies_list",
  "(tabs)/home/companies/form": "companies_create",
  "(tabs)/home/companies/[id]/index": "companies_read",
  "(tabs)/home/companies/[id]/edit": "companies_update",
  "(tabs)/home/expenses/form": byParam("id", "expenses_read", "expenses_create"),
  "(tabs)/home/expenses/index": "expenses_list",
  "(tabs)/home/inventory/index": AUTHENTICATED,
  "(tabs)/home/inventory/form": AUTHENTICATED,
  "(tabs)/home/inventory/[id]/index": AUTHENTICATED,
  "(tabs)/home/inventory/[id]/edit": AUTHENTICATED,
  "(tabs)/home/production/index": "production_orders_list",
  "(tabs)/home/production/form": "production_orders_create",
  "(tabs)/home/production/[id]/index": "production_orders_read",
  "(tabs)/home/production/[id]/edit": "production_orders_update",
  // Envasar granel guardado crea una orden de envasado.
  "(tabs)/home/production/pack": "production_orders_create",
  "(tabs)/home/production/formulas/index": "formulas_list",
  "(tabs)/home/production/formulas/form": byParam("id", "formulas_read", "formulas_create"),
  "(tabs)/home/purchases/index": "purchases_list",
  "(tabs)/home/purchases/[id]": "purchases_read",
  "(tabs)/home/purchases/formv2/index": "purchases_create",
  "(tabs)/home/purchases/formv2/PurchaseContext": "purchases_create",
  "(tabs)/home/reminders/index": "reminders_list",
  "(tabs)/home/reminders/form": byParam("id", "reminders_read", "reminders_create"),
  "(tabs)/home/roles/index": "roles_list",
  "(tabs)/home/roles/form": "roles_create",
  "(tabs)/home/roles/[id]/index": "roles_read",
  "(tabs)/home/roles/[id]/edit": "roles_update",
  "(tabs)/home/sales-orders/index": "sales_orders_list",
  "(tabs)/home/sales-orders/[id]": "sales_orders_read",
  "(tabs)/home/sales/index": "sales_list",
  "(tabs)/home/sales/[id]": "sales_read",
  "(tabs)/home/transfers-menu/index": "transfers_list",
  "(tabs)/home/transfers/[id]/index": "transfers_read",
  "(tabs)/home/transfers/formv2/index": "transfers_create",
  "(tabs)/home/transfers/formv2/TransferContext": "transfers_create",
  "(tabs)/home/transfers/history/index": "transfers_list",
  "(tabs)/home/transfers/log-guide": AUTHENTICATED,
  "(tabs)/home/transfers/pending/index": "transfers_list",
  "(tabs)/home/transfers/suggestions/index": "transfers_list",

  // ── (tabs)/inventory ──────────────────────────────────────────────────
  "(tabs)/inventory/packages/index": "products_list",
  "(tabs)/inventory/packages/form": "products_create",
  "(tabs)/inventory/packages/[id]/index": "products_read",
  "(tabs)/inventory/packages/[id]/edit": "products_update",
  "(tabs)/inventory/adjustment/index": "inventory_list",
  "(tabs)/inventory/adjustment/form": "inventory_manage",
  "(tabs)/inventory/adjustment/[id]/index": "inventory_read",
  "(tabs)/inventory/index": ["products_list", "inventory_list"],
  "(tabs)/inventory/kardex": "inventory_list",
  "(tabs)/inventory/products/index": "products_list",
  "(tabs)/inventory/products/form": "products_create",
  "(tabs)/inventory/products/[id]/index": ["products_read", "products_list"],
  "(tabs)/inventory/products/[id]/edit": "products_update",
  "(tabs)/inventory/products/[id]/movements": "inventory_list",
  "(tabs)/inventory/products/type/[slug]/index": "products_list",
  "(tabs)/inventory/products/type/[slug]/form": "products_create",
  "(tabs)/inventory/weekly-inventory/index": "inventory_list",
  "(tabs)/inventory/weekly-inventory/form": "inventory_create",
  "(tabs)/inventory/weekly-inventory/[id]/index": "inventory_read",
  // Capturar renglones pide inventory_create (InventoryCountDetailController)
  // y completar o cancelar el conteo, inventory_update.
  "(tabs)/inventory/weekly-inventory/[id]/edit": { all: ["inventory_create", "inventory_update"] },
  "(tabs)/inventory/weekly-inventory/types": "inventory_list",

  // ── (tabs)/notifications ──────────────────────────────────────────────
  "(tabs)/notifications/index": AUTHENTICATED,
  "(tabs)/notifications/[id]": AUTHENTICATED,

  // ── (tabs)/tasks ──────────────────────────────────────────────────────
  "(tabs)/tasks/index": AUTHENTICATED,
  "(tabs)/tasks/[id]": AUTHENTICATED,

  // ── Carpetas con su propio _layout ─────────────────────────────────────
  // Un navegador anidado también puede tener regla: el guard del navegador
  // padre bloquea la carpeta completa, incluido lo que monta su layout (el
  // provider del formulario carga catálogos al abrirse).
  "(tabs)/home/purchases/formv2": "purchases_create",
};

// ─── Resolver y comparar ───────────────────────────────────────────────────

/** Un href de expo-router: "/home/sales/15?tab=1" o { pathname, params }. */
export type RouteHref = string | { pathname: string; params?: Record<string, unknown> };

/** Qué exige la ruta ya con sus parámetros resueltos. */
export type ResolvedRouteRule =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "permissions"; permissions: readonly string[]; all: boolean };

// Array.isArray no distingue los arreglos readonly en TypeScript.
function isPermissionList(rule: RouteRule): rule is readonly string[] {
  return Array.isArray(rule);
}

/** Resuelve las reglas por parámetro (byParam) y normaliza el resto. */
export function resolveRouteRule(
  rule: RouteRule,
  params: Record<string, unknown> = {},
): ResolvedRouteRule {
  if (typeof rule === "string") {
    return { kind: "permissions", permissions: [rule], all: false };
  }
  if (isPermissionList(rule)) {
    return rule.length === 0
      ? { kind: "authenticated" }
      : { kind: "permissions", permissions: rule, all: false };
  }
  if ("access" in rule) {
    return { kind: rule.access };
  }
  if ("all" in rule) {
    return { kind: "permissions", permissions: rule.all, all: true };
  }
  const value = params[rule.param];
  const present = Array.isArray(value) ? value.length > 0 : value != null && value !== "";
  return resolveRouteRule(present ? rule.with : rule.without, params);
}

/** ¿Los permisos `granted` alcanzan para la regla ya resuelta? */
export function isRouteRuleSatisfied(
  resolved: ResolvedRouteRule,
  granted: ReadonlySet<string>,
): boolean {
  if (resolved.kind !== "permissions") return true;
  return checkPermission(granted, resolved.permissions, { all: resolved.all });
}

/** Texto corto de lo que pide una regla ("sales_read o sales_pos"). */
export function describeRouteRule(resolved: ResolvedRouteRule): string {
  if (resolved.kind !== "permissions") return "";
  return resolved.permissions.join(resolved.all ? " y " : " o ");
}

/**
 * Regla de una pantalla vista desde su navegador: la carpeta del layout
 * ("(tabs)/home") y el nombre de la pantalla en ese navegador
 * ("cash/sessions/[id]/index"). Undefined si la pantalla no está en el mapa
 * (por ejemplo, un navegador anidado como "home" visto desde las pestañas).
 */
export function routeRuleForScreen(layoutDir: string, routeName: string): RouteRule | undefined {
  const key = layoutDir ? `${layoutDir}/${routeName}` : routeName;
  return Object.prototype.hasOwnProperty.call(ROUTE_PERMISSIONS, key)
    ? ROUTE_PERMISSIONS[key]
    : undefined;
}

/** ¿La llave es una carpeta con pantallas en el mapa (un navegador anidado)? */
export function isRouteGroupKey(key: string): boolean {
  const prefix = `${key}/`;
  return Object.keys(ROUTE_PERMISSIONS).some((routeKey) => routeKey.startsWith(prefix));
}

const GROUP_SEGMENT = /^\(.+\)$/;
const DYNAMIC_SEGMENT = /^\[(.+)\]$/;
const CATCH_ALL_SEGMENT = /^\[\.\.\.(.+)\]$/;

/** "(tabs)/home/sales/[id]" o "/home/sales/15/" → segmentos de URL sin grupos ni "index" final. */
function urlSegments(path: string): string[] {
  const segments = path.split("/").filter((segment) => segment && !GROUP_SEGMENT.test(segment));
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

function parseQuery(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [rawKey, ...rest] = pair.split("=");
    try {
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join("=").replace(/\+/g, " "));
    } catch {
      params[rawKey] = rest.join("=");
    }
  }
  return params;
}

function splitHref(href: RouteHref): { pathname: string; params: Record<string, unknown> } {
  if (typeof href !== "string") {
    return { pathname: href.pathname, params: { ...(href.params ?? {}) } };
  }
  const [beforeHash] = href.split("#");
  const [pathname, query = ""] = beforeHash.split("?");
  return { pathname, params: parseQuery(query) };
}

interface CompiledRoute {
  key: string;
  segments: string[];
}

let compiledRoutes: CompiledRoute[] | null = null;

function compiled(): CompiledRoute[] {
  if (!compiledRoutes) {
    compiledRoutes = Object.keys(ROUTE_PERMISSIONS).map((key) => ({ key, segments: urlSegments(key) }));
  }
  return compiledRoutes;
}

/** Compara un patrón ("home", "sales", "[id]") con una URL; más puntos = más específico. */
function matchSegments(
  pattern: string[],
  target: string[],
): { score: number; params: Record<string, string> } | null {
  const params: Record<string, string> = {};
  let score = 0;
  for (let i = 0; i < pattern.length; i++) {
    const catchAll = CATCH_ALL_SEGMENT.exec(pattern[i]);
    if (catchAll) {
      if (i >= target.length) return null;
      params[catchAll[1]] = target.slice(i).join("/");
      return { score, params };
    }
    if (i >= target.length) return null;
    const dynamic = DYNAMIC_SEGMENT.exec(pattern[i]);
    if (dynamic) {
      params[dynamic[1]] = target[i];
      score += 1;
    } else if (pattern[i] === target[i]) {
      score += 2;
    } else {
      return null;
    }
  }
  return pattern.length === target.length ? { score, params } : null;
}

/**
 * Busca la pantalla de un href en el mapa. Gana la ruta más específica:
 * "/home/purchases/formv2" es formv2/index, no purchases/[id]. Los parámetros
 * incluyen los segmentos dinámicos y el query ("?id=").
 */
export function matchRoute(
  href: RouteHref,
): { key: string; rule: RouteRule; params: Record<string, unknown> } | undefined {
  const { pathname, params } = splitHref(href);
  const target = urlSegments(pathname);
  let best: { key: string; score: number; params: Record<string, string> } | undefined;
  for (const route of compiled()) {
    const result = matchSegments(route.segments, target);
    if (result && (!best || result.score > best.score)) {
      best = { key: route.key, ...result };
    }
  }
  if (!best) return undefined;
  return { key: best.key, rule: ROUTE_PERMISSIONS[best.key], params: { ...params, ...best.params } };
}

/**
 * ¿Puede abrir esta ruta quien tiene `granted`? Una ruta que no está en el
 * mapa se permite (el backend sigue validando cada petición).
 */
export function canAccessRouteWith(href: RouteHref, granted: ReadonlySet<string>): boolean {
  const match = matchRoute(href);
  if (!match) return true;
  return isRouteRuleSatisfied(resolveRouteRule(match.rule, match.params), granted);
}
