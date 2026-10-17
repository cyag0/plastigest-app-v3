/**
 * Dashboard: cómo va el negocio en el periodo (hoy, la semana o el mes), de
 * la sucursal o de todas.
 *
 * Mismo lenguaje que Inicio: la cifra de ventas al frente con su gráfica, y
 * lo demás en listas agrupadas (resumen, más vendidos, métodos de pago,
 * actividad) en vez de tarjetas con sombra. En el teléfono va en una columna;
 * en tableta vertical, en una columna centrada; en tableta acostada y
 * escritorio, en dos (ver SummaryLayout).
 *
 * Datos: GET /reports-v2/dashboard (period, scope) y, con permiso de
 * producción, /production-orders/today-stats.
 */

import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import {
  LIST_TEXT_INSET,
  ListGroup as List,
  ListRow as Row,
  ListSection as Section,
  ListValueRow as ValueRow,
} from "@/components/App/ListGroup";
import SegmentedControl from "@/components/App/SegmentedControl";
import {
  HeroFigure,
  SkeletonBlock,
  SkeletonHero,
  SkeletonSection,
  SummaryColumns,
  SummaryHeader,
  useSummaryLayout,
} from "@/components/App/SummaryLayout";
import BreakdownList, { type BreakdownItem } from "@/components/Dashboard/BreakdownList";
import TrendBars, { type TrendBar } from "@/components/Dashboard/TrendBars";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { parseLocalDate, toLocalDateString } from "@/utils/dates";
import { formatMoney, formatQuantity } from "@/utils/format";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

type Period = "today" | "week" | "month";
type Scope = "location" | "general";
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface TrendPoint {
  period: string;
  total: number;
}
interface PiePoint {
  name: string;
  value: number;
  color: string;
}
interface TopProduct {
  name: string;
  quantity: number;
  sales: number;
}
interface ActivityItem {
  id: string;
  type: string;
  label: string;
  date: string | null;
  amount: number;
  money_type: "income" | "expense" | "none";
  location: string | null;
}
interface DashboardV2 {
  kpis: {
    sales: number;
    purchases: number;
    profit: number;
    net_profit: number;
  };
  mini_kpis: {
    movements_count: number;
    inventory_value: number;
    low_stock_products: number;
    total_stock: number;
  };
  cash: { income: number; expense: number; balance: number };
  expenses: { total: number; count: number };
  sales_trend: TrendPoint[];
  sales_by_location: { name: string; value: number }[];
  top_products: TopProduct[];
  payment_methods: PiePoint[];
  recent_activity: ActivityItem[];
}

interface ProductionLine {
  product_id: number;
  product_name: string;
  product_code?: string | null;
  unit_id: number;
  unit_name?: string | null;
  quantity: number;
  lines_count: number;
}
interface ProductionToday {
  productions_count_today: number;
  total_consumed_quantity: number;
  total_produced_quantity: number;
  waste_percentage_today: number | null;
  waste_percentage_available: boolean;
  consumption_lines: number;
  output_lines: number;
  top_consumed: ProductionLine[];
  top_produced: ProductionLine[];
}

const PERIODS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
] as const;

const SCOPES = [
  { value: "location", label: "Esta sucursal" },
  { value: "general", label: "Todas" },
] as const;

const LOW_STOCK_ROUTE = "/(tabs)/inventory/products/type/all?filter=low_stock";
const NOTIFICATIONS_ROUTE = "/(tabs)/notifications";
const PRODUCTION_ROUTE = "/(tabs)/home/production";
const BUSINESS_REPORTS_ROUTE = "/(tabs)/home/business-reports";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const formatCount = (value: number) => new Intl.NumberFormat("es-MX").format(value || 0);
const percentOf = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : undefined);

/** Lunes de la semana de `date`: la semana del backend empieza en lunes. */
function mondayOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
}

const longDay = (date: Date) =>
  date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

/** "Hoy · viernes, 16 de octubre" · "Esta semana · 12 al 18 de octubre" · "Este mes · octubre de 2026". */
function periodCaption(period: Period, now = new Date()): string {
  if (period === "today") return `Hoy · ${longDay(now)}`;
  if (period === "week") {
    const start = mondayOf(now);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const from = start.toLocaleDateString(
      "es-MX",
      start.getMonth() === end.getMonth() ? { day: "numeric" } : { day: "numeric", month: "short" },
    );
    return `Esta semana · ${from} al ${end.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`;
  }
  return `Este mes · ${now.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`;
}

const hourRange = (hour: number) => `${hour}:00 – ${hour + 1}:00`;

/**
 * Una barra por cada hora (hoy) o día (semana, mes), con o sin ventas: el
 * backend solo manda los periodos con ventas y la línea de antes unía esos
 * puntos como si no hubiera días en cero entre ellos.
 */
function buildTrend(period: Period, points: TrendPoint[], now = new Date()): TrendBar[] {
  const totals = new Map(points.map((point) => [point.period, Number(point.total) || 0]));
  const bars: TrendBar[] = [];

  if (period === "today") {
    const hours = points
      .filter((point) => /^\d{2}:\d{2}$/.test(point.period))
      .map((point) => parseInt(point.period, 10));
    const nowHour = now.getHours();
    for (let hour = Math.min(8, ...hours); hour <= Math.max(20, nowHour, ...hours); hour++) {
      const key = `${String(hour).padStart(2, "0")}:00`;
      bars.push({
        key,
        axisLabel: hour % 4 === 0 ? `${hour}h` : undefined,
        label: hourRange(hour),
        value: totals.get(key) ?? 0,
        current: hour === nowHour,
      });
    }
  } else {
    const start = period === "week" ? mondayOf(now) : new Date(now.getFullYear(), now.getMonth(), 1);
    const days = period === "week" ? 7 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = toLocalDateString(now);
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = toLocalDateString(date);
      const day = date.getDate();
      bars.push({
        key,
        axisLabel:
          period === "week"
            ? date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")
            : day === 1 || day % 5 === 0
              ? String(day)
              : undefined,
        label: longDay(date),
        value: totals.get(key) ?? 0,
        current: key === today,
      });
    }
  }

  // Si algo quedó fuera de los días esperados (p. ej. el dispositivo en otra
  // zona horaria), se muestran los puntos tal cual para no esconder ventas.
  const matched = bars.reduce((sum, bar) => sum + bar.value, 0);
  const total = points.reduce((sum, point) => sum + (Number(point.total) || 0), 0);
  if (Math.abs(matched - total) < 0.01) return bars;
  return points.map((point) => {
    const hour = /^\d{2}:\d{2}$/.test(point.period) ? parseInt(point.period, 10) : null;
    const date = parseLocalDate(point.period);
    return {
      key: point.period,
      label: hour !== null ? hourRange(hour) : longDay(date),
      axisLabel: hour !== null ? `${hour}h` : String(date.getDate()),
      value: Number(point.total) || 0,
    };
  });
}

function shortDate(value?: string | null): string {
  if (!value) return "";
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function activityIcon(type: string): IconName {
  if (type.startsWith("sale")) return "cash-register";
  if (type.startsWith("purchase")) return "cart-outline";
  if (type.startsWith("expense")) return "cash-minus";
  if (type.startsWith("cash_income")) return "trending-up";
  if (type.startsWith("cash_expense")) return "trending-down";
  if (type.startsWith("transfer")) return "swap-horizontal";
  if (type.startsWith("production")) return "factory";
  if (type.startsWith("adjustment")) return "clipboard-edit-outline";
  return "information-outline";
}

export default function ReportsScreen() {
  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();
  const auth = useAuth();
  const { colors } = useTheme();
  const { can, canAccessRoute } = useCan();
  const styles = useStyles();
  const layout = useSummaryLayout();
  // "Todas" solo cambia algo para quien entra a todas las sucursales: a los
  // demás el backend les responde con la suya aunque lo pidan.
  const allLocations = useAllLocationsAccess();
  // "Producción de hoy" pide production_orders_list: sin él no se consulta
  // (antes se pedía igual y el backend respondía 403).
  const canSeeProduction = can("production_orders_list");

  const [loading, setLoading] = React.useState(true);
  // Al cambiar de periodo o de alcance se queda lo anterior, atenuado, hasta
  // que llega lo nuevo (antes se volvía al esqueleto y la pantalla brincaba).
  const [reloading, setReloading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [period, setPeriod] = React.useState<Period>("month");
  const [scope, setScope] = React.useState<Scope>("location");
  const [dashboard, setDashboard] = React.useState<DashboardV2 | null>(null);
  // Periodo y alcance de los datos en pantalla: mientras llega lo nuevo, la
  // gráfica sigue leyendo lo anterior con sus propias reglas (fechas como días,
  // no como horas).
  const [shown, setShown] = React.useState<{ period: Period; scope: Scope }>({ period, scope });
  const [production, setProduction] = React.useState<ProductionToday | null>(null);
  const requestId = React.useRef(0);
  const locationId = selectedLocation?.id;

  const loadAll = React.useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [dashboardRes, productionRes] = await Promise.all([
        Services.reportsV2.dashboard({ period, scope }).catch(() => null),
        canSeeProduction
          ? Services.productionOrders
              ?.getTodayStats?.({
                location_id: locationId,
              })
              .catch(() => null)
          : null,
      ]);
      // Una respuesta que llega después de cambiar otra vez el filtro ya no vale.
      if (id !== requestId.current) return;

      const dData: any = dashboardRes?.data;
      setDashboard(dData?.data ?? dData ?? null);
      setShown({ period, scope });

      const pData: any = productionRes?.data;
      setProduction(pData?.data ?? pData ?? null);
    } catch (error) {
      console.error("reports v2 load error", error);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setReloading(false);
        setRefreshing(false);
      }
    }
  }, [scope, period, locationId, canSeeProduction]);

  // Al entrar y al cambiar un filtro. La carga es asíncrona: el estado cambia
  // cuando llega la respuesta, no durante el efecto.
  React.useEffect(() => {
    const run = async () => {
      await loadAll();
    };
    run();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const changePeriod = (next: Period) => {
    if (dashboard) setReloading(true);
    else setLoading(true);
    setPeriod(next);
  };

  const changeScope = (next: Scope) => {
    if (dashboard) setReloading(true);
    else setLoading(true);
    setScope(next);
  };

  const go = (link: string) => router.push(link as any);
  const linkIfAllowed = (link: string) => (canAccessRoute(link) ? () => go(link) : undefined);

  const trend = React.useMemo(
    () => buildTrend(shown.period, dashboard?.sales_trend ?? []),
    [shown.period, dashboard],
  );

  // Dos claves del backend pueden dar el mismo nombre ("Sin especificar"):
  // se juntan para no repetir la fila.
  const payments = React.useMemo(() => {
    const byName = new Map<string, number>();
    for (const row of dashboard?.payment_methods ?? []) {
      byName.set(row.name, (byName.get(row.name) ?? 0) + (Number(row.value) || 0));
    }
    const total = [...byName.values()].reduce((sum, value) => sum + value, 0);
    const items: BreakdownItem[] = [...byName.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        key: name,
        label: name,
        value,
        valueText: formatMoney(value),
        detail: percentOf(value, total),
      }));
    return { total, items };
  }, [dashboard]);

  const branches = React.useMemo(() => {
    const rows = dashboard?.sales_by_location ?? [];
    const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
    const items: BreakdownItem[] = rows.map((row) => ({
      key: row.name,
      label: row.name,
      value: Number(row.value) || 0,
      valueText: formatMoney(row.value),
      detail: percentOf(Number(row.value) || 0, total),
    }));
    return { total, items };
  }, [dashboard]);

  const locationName = selectedLocation?.name ?? auth.location?.name ?? "Sucursal actual";
  const header = (
    <SummaryHeader
      caption={periodCaption(period)}
      title={scope === "general" ? "Todas las sucursales" : locationName}
      phone={layout.phone}
    >
      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={changePeriod}
        stretch={layout.phone}
        accessibilityLabel="Periodo"
      />
      {allLocations && (
        <SegmentedControl
          options={SCOPES}
          value={scope}
          onChange={changeScope}
          stretch={layout.phone}
          accessibilityLabel="Sucursales"
        />
      )}
    </SummaryHeader>
  );

  let body: React.ReactNode;
  if (loading) {
    body = <DashboardSkeleton twoColumns={layout.twoColumns} />;
  } else if (!dashboard) {
    body = (
      <View style={styles.loadError}>
        <Text style={styles.calm}>No se pudo cargar el resumen.</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            loadAll();
          }}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.link}>Reintentar</Text>
        </Pressable>
      </View>
    );
  } else {
    const kpis = dashboard.kpis;
    const mini = dashboard.mini_kpis;
    const lowStock = mini?.low_stock_products ?? 0;
    const unread = auth.unreadNotificationsCount ?? 0;
    const topProducts = dashboard.top_products ?? [];
    const activity = (dashboard.recent_activity ?? []).slice(0, 5);

    const sales = (
      <Section title="Ventas">
        <HeroFigure value={formatMoney(kpis?.sales ?? 0)} />
        <View style={styles.trend}>
          <TrendBars
            bars={trend}
            formatValue={formatMoney}
            peakLabel={shown.period === "today" ? "Hora más alta" : "Día más alto"}
            emptyText={shown.period === "today" ? "Todavía sin ventas hoy." : "Sin ventas en este periodo."}
          />
        </View>
      </Section>
    );

    const summary = (
      <Section title="Resumen">
        <List inset={LIST_TEXT_INSET}>
          <ValueRow label="Compras" value={formatMoney(kpis?.purchases ?? 0)} />
          <ValueRow label="Ganancia (ventas − compras)" value={formatMoney(kpis?.profit ?? 0)} />
          <ValueRow label="Valor del inventario" value={formatMoney(mini?.inventory_value ?? 0)} />
          <ValueRow label="Movimientos" value={formatCount(mini?.movements_count ?? 0)} />
          <ValueRow label="Productos con stock bajo" value={formatCount(lowStock)} />
        </List>
      </Section>
    );

    const attention =
      lowStock > 0 || unread > 0 ? (
        <Section title="Por atender">
          <List>
            {lowStock > 0 && (
              <Row
                icon="trending-down"
                iconColor={colors.warning}
                title={`${formatCount(lowStock)} ${plural(lowStock, "producto", "productos")} con stock bajo`}
                onPress={linkIfAllowed(LOW_STOCK_ROUTE)}
              />
            )}
            {unread > 0 && (
              <Row
                icon="bell-outline"
                iconColor={colors.info}
                title={`${formatCount(unread)} ${plural(unread, "notificación sin leer", "notificaciones sin leer")}`}
                onPress={linkIfAllowed(NOTIFICATIONS_ROUTE)}
              />
            )}
          </List>
        </Section>
      ) : null;

    const bestSellers = (
      <Section title="Más vendidos">
        {topProducts.length > 0 ? (
          <BreakdownList
            items={topProducts.map((product, index) => ({
              key: `${product.name}-${index}`,
              label: product.name,
              value: Number(product.sales) || 0,
              valueText: formatMoney(product.sales),
            }))}
          />
        ) : (
          <Text style={styles.calm}>Sin productos vendidos en este periodo.</Text>
        )}
      </Section>
    );

    const paymentMethods = (
      <Section title="Métodos de pago">
        {payments.items.length > 0 ? (
          <BreakdownList items={payments.items} max={payments.total} />
        ) : (
          <Text style={styles.calm}>Sin cobros en este periodo.</Text>
        )}
      </Section>
    );

    // Con una sola sucursal el desglose solo repetiría el total.
    const byBranch =
      branches.items.length > 1 ? (
        <Section title="Ventas por sucursal">
          <BreakdownList items={branches.items} max={branches.total} />
        </Section>
      ) : null;

    const productionBlock =
      canSeeProduction && production ? (
        <Section
          title="Producción de hoy"
          action={canAccessRoute(PRODUCTION_ROUTE) ? { label: "Ver órdenes", onPress: () => go(PRODUCTION_ROUTE) } : undefined}
        >
          <ProductionTodayBlock production={production} sideBySide={layout.mainWidth >= 600} />
        </Section>
      ) : null;

    const recent = (
      <Section title="Actividad reciente">
        {activity.length > 0 ? (
          <List>
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} showLocation={shown.scope === "general"} />
            ))}
          </List>
        ) : (
          <Text style={styles.calm}>Sin movimientos en este periodo.</Text>
        )}
      </Section>
    );

    // Los mismos números, como documento: PDF para imprimir, Excel para el contador.
    const documents = canAccessRoute(BUSINESS_REPORTS_ROUTE) ? (
      <Section title="Documentos">
        <List>
          <Row
            icon="file-chart-outline"
            title="Reportes en PDF y Excel"
            subtitle="Ventas del periodo, inventario valorizado, mermas y diferencias de caja"
            onPress={() => go(BUSINESS_REPORTS_ROUTE)}
          />
        </List>
      </Section>
    ) : null;

    body = (
      <View style={[styles.body, reloading && styles.dimmed]}>
        {layout.twoColumns ? (
          <SummaryColumns
            main={
              <>
                {sales}
                {bestSellers}
                {paymentMethods}
                {byBranch}
                {productionBlock}
              </>
            }
            side={
              <>
                {summary}
                {attention}
                {recent}
                {documents}
              </>
            }
          />
        ) : (
          <>
            {sales}
            {summary}
            {attention}
            {bestSellers}
            {paymentMethods}
            {byBranch}
            {productionBlock}
            {recent}
            {documents}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen} onLayout={layout.onLayout}>
      <ScrollView
        contentContainerStyle={layout.contentStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {header}
        {body}
      </ScrollView>
    </View>
  );
}

// ─── Bloques ────────────────────────────────────────────────────────────────

function DashboardSkeleton({ twoColumns }: { twoColumns: boolean }) {
  const main = (
    <>
      <View style={{ gap: 16 }}>
        <SkeletonHero />
        <SkeletonBlock height={120} radius={8} />
      </View>
      <SkeletonSection rows={4} />
    </>
  );
  const side = (
    <>
      <SkeletonSection rows={5} />
      <SkeletonSection rows={3} />
    </>
  );
  return twoColumns ? (
    <SummaryColumns main={main} side={side} />
  ) : (
    <View style={{ gap: 22 }}>
      {main}
      {side}
    </View>
  );
}

function ProductionTodayBlock({ production, sideBySide }: { production: ProductionToday; sideBySide: boolean }) {
  const styles = useStyles();
  const count = production.productions_count_today;
  if (count <= 0) {
    return <Text style={styles.calm}>Todavía no se completa ninguna orden de producción hoy.</Text>;
  }

  const parts = [
    `${count} ${plural(count, "orden", "órdenes")}`,
    `${production.consumption_lines} ${plural(production.consumption_lines, "insumo", "insumos")}`,
    `${production.output_lines} ${plural(production.output_lines, "producto", "productos")}`,
    production.waste_percentage_available
      ? `merma ${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(production.waste_percentage_today ?? 0)}%`
      : null,
  ].filter(Boolean);

  const lines = (rows: ProductionLine[], emptyText: string) =>
    rows.length > 0 ? (
      <BreakdownList
        items={rows.map((row, index) => ({
          key: `${row.product_id}-${index}`,
          label: row.product_name,
          value: Number(row.quantity) || 0,
          valueText: formatQuantity(row.quantity, row.unit_name),
        }))}
      />
    ) : (
      <Text style={styles.calm}>{emptyText}</Text>
    );

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.subtle}>{parts.join(" · ")}</Text>
      <View style={[styles.pair, sideBySide && styles.pairRow]}>
        <View style={[styles.pairItem, sideBySide && styles.pairItemRow]}>
          <Text style={styles.subhead}>Lo que más se produjo</Text>
          {lines(production.top_produced ?? [], "Sin productos registrados hoy.")}
        </View>
        <View style={[styles.pairItem, sideBySide && styles.pairItemRow]}>
          <Text style={styles.subhead}>Lo que más se usó</Text>
          {lines(production.top_consumed ?? [], "Sin insumos registrados hoy.")}
        </View>
      </View>
    </View>
  );
}

/**
 * Movimiento del periodo: ícono del tipo, folio, fecha y monto con signo. La
 * sucursal solo cuando se ven todas (o en transferencias, que dicen de dónde
 * a dónde); con una sola, repetirla en cada fila no dice nada.
 */
function ActivityRow({ item, showLocation }: { item: ActivityItem; showLocation: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isTransfer = item.type.startsWith("transfer");
  const place = showLocation || isTransfer ? item.location?.replace(" -> ", " → ") : null;
  const meta = [shortDate(item.date), place].filter(Boolean).join(" · ");
  const amount =
    item.money_type === "income"
      ? `+${formatMoney(item.amount)}`
      : item.money_type === "expense"
        ? `−${formatMoney(item.amount)}`
        : null;

  return (
    <View style={styles.activityRow} accessible accessibilityLabel={[item.label, meta, amount].filter(Boolean).join(", ")}>
      <MaterialCommunityIcons name={activityIcon(item.type)} size={20} color={colors.textSecondary} />
      <View style={styles.activityBody}>
        <Text style={styles.activityTitle} numberOfLines={1}>
          {item.label}
        </Text>
        {!!meta && (
          <Text style={styles.activityMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {amount && (
        <Text style={[styles.activityAmount, item.money_type === "income" && { color: colors.success }]}>
          {amount}
        </Text>
      )}
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const useStyles = () =>
  useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    body: { gap: 22 },
    dimmed: { opacity: 0.55 },

    trend: { marginTop: 10 },
    calm: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
    subtle: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    subhead: { fontSize: 13, fontWeight: "600" as const, color: c.textSecondary, marginBottom: 8 },
    link: { fontSize: 14, fontWeight: "600" as const, color: c.primary },
    loadError: { gap: 8, paddingVertical: 8 },

    pair: { gap: 16 },
    pairRow: { flexDirection: "row" as const, alignItems: "flex-start" as const },
    pairItem: { minWidth: 0 },
    pairItemRow: { flex: 1 },

    activityRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    activityBody: { flex: 1, minWidth: 0 },
    activityTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500" as const, color: c.text },
    activityMeta: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
    activityAmount: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: c.text,
      fontVariant: ["tabular-nums"] as any,
    },
  }));
