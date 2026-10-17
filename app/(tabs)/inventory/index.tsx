/**
 * Inventario: cómo está el stock de la sucursal y la entrada a los módulos
 * de inventario.
 *
 * Mismo lenguaje que Inicio y el Dashboard: el valor del inventario al
 * frente, la salud del stock en una barra con sus estados, lo que hay que
 * atender y los accesos en una lista (antes: cuatro tarjetas KPI, botones
 * sueltos y un aviso con barra de color). En el teléfono va en una columna;
 * en tableta vertical, en una columna centrada; en tableta acostada y
 * escritorio, en dos (ver SummaryLayout).
 *
 * El resumen sale de /reports/inventory-stats, que pide reports_view: sin
 * ese permiso solo se muestran los accesos.
 */

import {
  LIST_ICON_INSET,
  ListGroup as List,
  ListRow as Row,
  ListSection as Section,
} from "@/components/App/ListGroup";
import {
  HeroFigure,
  SkeletonHero,
  SkeletonSection,
  SummaryColumns,
  SummaryHeader,
  useSummaryLayout,
} from "@/components/App/SummaryLayout";
import BreakdownList, { ListFooterAction, ProportionBar } from "@/components/Dashboard/BreakdownList";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney, formatQuantity } from "@/utils/format";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Colors = ReturnType<typeof useTheme>["colors"];

interface InventoryStats {
  total_products: number;
  total_stock: number;
  inventory_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  products_by_category?: { [key: string]: number };
  stock_health?: {
    optimal: number;
    low: number;
    critical: number;
    out: number;
  };
}

const ALL_PRODUCTS_ROUTE = "/(tabs)/inventory/products/type/all";
const LOW_STOCK_ROUTE = "/(tabs)/inventory/products/type/all?filter=low_stock";
const OUT_OF_STOCK_ROUTE = "/(tabs)/inventory/products/type/all?filter=out_of_stock";

/** Categorías a la vista antes de "Ver todas". */
const CATEGORIES_PREVIEW = 6;

/** Accesos de la sección; la descripción va como etiqueta de accesibilidad. */
const INVENTORY_ACTIONS: { key: string; label: string; description: string; icon: IconName; route: string }[] = [
  {
    key: "products",
    label: "Ver inventario",
    description: "Stock de todos los productos",
    icon: "package-variant",
    route: "/(tabs)/inventory/products",
  },
  {
    key: "kardex",
    label: "Kárdex",
    description: "Todas las entradas y salidas",
    icon: "swap-vertical-bold",
    route: "/(tabs)/inventory/kardex",
  },
  {
    key: "weekly",
    label: "Inventario semanal",
    description: "Verificación física",
    icon: "clipboard-check-outline",
    route: "/(tabs)/inventory/weekly-inventory",
  },
  {
    key: "adjustment",
    label: "Ajustes",
    description: "Mermas o pérdidas",
    icon: "tune-variant",
    route: "/(tabs)/inventory/adjustment",
  },
  {
    key: "packages",
    label: "Paquetes",
    description: "Empaques y presentaciones",
    icon: "package-variant-closed",
    route: "/(tabs)/inventory/packages",
  },
  {
    key: "low-stock",
    label: "Stock bajo",
    description: "Productos a reponer",
    icon: "alert-circle-outline",
    route: LOW_STOCK_ROUTE,
  },
];

type HealthKey = keyof NonNullable<InventoryStats["stock_health"]>;

/**
 * Estados de la salud del stock, del mejor al peor (el orden de los tramos de
 * la barra). Cada uno lleva ícono y nombre: el verde y el ocre no se
 * distinguen con algunos tipos de daltonismo.
 */
const HEALTH_STATES: { key: HealthKey; label: string; hint: string; icon: IconName; color: (c: Colors) => string }[] = [
  { key: "optimal", label: "Óptimo", hint: "En el mínimo o arriba", icon: "check-circle-outline", color: (c) => c.success },
  { key: "low", label: "Bajo", hint: "Debajo del mínimo", icon: "arrow-down-circle-outline", color: (c) => c.warning },
  { key: "critical", label: "Crítico", hint: "Debajo de la mitad del mínimo", icon: "alert-circle-outline", color: (c) => c.error },
  { key: "out", label: "Agotado", hint: "Sin existencia", icon: "close-circle-outline", color: (c) => c.text },
];

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const formatCount = (value: number) => new Intl.NumberFormat("es-MX").format(value || 0);

function todayCaption(): string {
  const text = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function InventoryScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const layout = useSummaryLayout();
  // El resumen sale de reportes: sin ese permiso la API responde 403 y las
  // tarjetas mostraban 0 productos y $0 como si el almacén estuviera vacío.
  const canSeeSummary = auth.hasPermission("reports_view");
  const [loading, setLoading] = React.useState(canSeeSummary);
  const [refreshing, setRefreshing] = React.useState(false);
  const [stats, setStats] = React.useState<InventoryStats | null>(null);
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  // Accesos y enlaces: solo a donde el usuario puede entrar (mapa central).
  const { canAccessRoute } = useCan();
  const canSeeProducts = canAccessRoute(ALL_PRODUCTS_ROUTE);
  const actions = INVENTORY_ACTIONS.filter((item) => canAccessRoute(item.route));

  const loadData = React.useCallback(async () => {
    try {
      const response = await Services.reports.inventoryStats({
        scope: "location",
      });
      setStats(response.data.data);
    } catch (error) {
      console.error("Error loading inventory stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // La carga es asíncrona: el estado cambia cuando llega la respuesta, no
  // durante el efecto.
  React.useEffect(() => {
    if (!canSeeSummary) return;
    const run = async () => {
      await loadData();
    };
    run();
  }, [canSeeSummary, loadData]);

  const onRefresh = () => {
    if (!canSeeSummary) return;
    setRefreshing(true);
    loadData();
  };

  const go = (link: string) => router.push(link as any);
  const linkIfAllowed = (link: string) => (canAccessRoute(link) ? () => go(link) : undefined);

  // --- Derivados ---
  const health = stats?.stock_health;
  const healthTotal = health ? HEALTH_STATES.reduce((sum, state) => sum + (health[state.key] ?? 0), 0) : 0;
  const lowStock = stats?.low_stock_products ?? 0;
  const outOfStock = stats?.out_of_stock_products ?? 0;
  const totalProducts = stats?.total_products ?? 0;

  const categories: [string, number][] = stats?.products_by_category
    ? (Object.entries(stats.products_by_category) as [string, number][]).sort((a, b) => b[1] - a[1])
    : [];
  const visibleCategories = showAllCategories ? categories : categories.slice(0, CATEGORIES_PREVIEW);

  const header = (
    <SummaryHeader caption={todayCaption()} title={auth.location?.name ?? "Inventario"} phone={layout.phone} />
  );

  const shortcuts =
    actions.length > 0 ? (
      <Section title="Ir a">
        <List>
          {actions.map((item) => (
            <Row
              key={item.key}
              icon={item.icon}
              title={item.label}
              titleLines={1}
              accessibilityLabel={`${item.label}: ${item.description}`}
              onPress={() => go(item.route)}
            />
          ))}
        </List>
      </Section>
    ) : null;

  let body: React.ReactNode;
  if (!canSeeSummary) {
    body = shortcuts;
  } else if (loading) {
    body = <InventorySkeleton twoColumns={layout.twoColumns} />;
  } else {
    const value = (
      <Section title="Valor del inventario">
        <HeroFigure value={formatMoney(stats?.inventory_value ?? 0)} />
        <Text style={styles.subtle}>
          {formatCount(totalProducts)} {plural(totalProducts, "producto activo", "productos activos")} · existencia
          total {formatQuantity(stats?.total_stock ?? 0)}
        </Text>
      </Section>
    );

    const attention =
      outOfStock > 0 || lowStock > 0 ? (
        <Section title="Por atender">
          <List>
            {outOfStock > 0 && (
              <Row
                icon="package-variant-remove"
                iconColor={colors.error}
                title={`${formatCount(outOfStock)} ${plural(outOfStock, "producto agotado", "productos agotados")}`}
                onPress={linkIfAllowed(OUT_OF_STOCK_ROUTE)}
              />
            )}
            {lowStock > 0 && (
              <Row
                icon="trending-down"
                iconColor={colors.warning}
                title={`${formatCount(lowStock)} ${plural(lowStock, "producto", "productos")} bajo el mínimo`}
                onPress={linkIfAllowed(LOW_STOCK_ROUTE)}
              />
            )}
          </List>
        </Section>
      ) : null;

    const stockHealth =
      health && healthTotal > 0 ? (
        <Section
          title="Salud del stock"
          action={canSeeProducts ? { label: "Ver productos", onPress: () => go(ALL_PRODUCTS_ROUTE) } : undefined}
        >
          <List inset={LIST_ICON_INSET}>
            <View style={styles.healthHead}>
              <Text style={styles.healthHeadline}>
                <Text style={styles.strong}>{formatCount(health.optimal)}</Text> de {formatCount(healthTotal)}{" "}
                {plural(healthTotal, "producto", "productos")} en nivel óptimo
              </Text>
              <ProportionBar
                segments={HEALTH_STATES.map((state) => ({
                  key: state.key,
                  value: health[state.key] ?? 0,
                  color: state.color(colors),
                }))}
              />
            </View>
            {HEALTH_STATES.map((state) => (
              <HealthRow
                key={state.key}
                icon={state.icon}
                color={state.color(colors)}
                label={state.label}
                hint={state.hint}
                value={health[state.key] ?? 0}
                total={healthTotal}
              />
            ))}
          </List>
        </Section>
      ) : null;

    const byCategory =
      categories.length > 0 ? (
        <Section title="Productos por categoría" count={categories.length}>
          <BreakdownList
            items={visibleCategories.map(([name, count]) => ({
              key: name,
              label: name,
              value: count,
              valueText: formatCount(count),
            }))}
            footer={
              categories.length > CATEGORIES_PREVIEW ? (
                <ListFooterAction
                  label={showAllCategories ? "Ver menos" : `Ver las ${categories.length} categorías`}
                  onPress={() => setShowAllCategories((shown) => !shown)}
                />
              ) : undefined
            }
          />
        </Section>
      ) : null;

    body = layout.twoColumns ? (
      <SummaryColumns
        main={
          <>
            {value}
            {stockHealth}
            {byCategory}
          </>
        }
        side={
          <>
            {attention}
            {shortcuts}
          </>
        }
      />
    ) : (
      <>
        {value}
        {attention}
        {shortcuts}
        {stockHealth}
        {byCategory}
      </>
    );
  }

  return (
    <View style={styles.screen} onLayout={layout.onLayout}>
      <ScrollView
        contentContainerStyle={layout.contentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {header}
        {body}
      </ScrollView>
    </View>
  );
}

// ─── Bloques ────────────────────────────────────────────────────────────────

function InventorySkeleton({ twoColumns }: { twoColumns: boolean }) {
  const main = (
    <>
      <SkeletonHero />
      <SkeletonSection rows={5} />
    </>
  );
  const side = (
    <>
      <SkeletonSection rows={2} />
      <SkeletonSection rows={6} />
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

/** Un estado de la salud del stock: ícono, nombre, qué significa, cuántos y qué parte. */
function HealthRow({
  icon,
  color,
  label,
  hint,
  value,
  total,
}: {
  icon: IconName;
  color: string;
  label: string;
  hint: string;
  value: number;
  total: number;
}) {
  const styles = useStyles();
  const empty = value === 0;
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View
      style={styles.healthRow}
      accessible
      accessibilityLabel={`${label}: ${value} ${plural(value, "producto", "productos")}, ${percent}%. ${hint}`}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} style={empty && styles.faded} />
      <View style={styles.healthBody}>
        <Text style={[styles.healthLabel, empty && styles.muted]}>{label}</Text>
        <Text style={styles.healthHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <Text style={styles.healthPercent}>{percent}%</Text>
      <Text style={[styles.healthCount, empty && styles.muted]}>{formatCount(value)}</Text>
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const useStyles = () =>
  useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    subtle: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    strong: { fontWeight: "700" as const, color: c.text },
    muted: { color: c.textMuted },
    faded: { opacity: 0.45 },

    healthHead: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16, gap: 12 },
    healthHeadline: { fontSize: 15, lineHeight: 20, color: c.textSecondary },
    healthRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    healthBody: { flex: 1, minWidth: 0 },
    healthLabel: { fontSize: 15, lineHeight: 20, fontWeight: "500" as const, color: c.text },
    healthHint: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 1 },
    healthPercent: {
      fontSize: 13,
      color: c.textMuted,
      fontVariant: ["tabular-nums"] as any,
      minWidth: 40,
      textAlign: "right" as const,
    },
    healthCount: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: c.text,
      fontVariant: ["tabular-nums"] as any,
      minWidth: 36,
      textAlign: "right" as const,
    },
  }));
