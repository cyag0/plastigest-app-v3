/**
 * Inicio: el día de la sucursal.
 *
 * En vez de un tablero genérico (saludo, cuatro números en $0 y accesos que
 * repetían el menú), responde lo que se pregunta quien abre la app:
 *  1. ¿Cómo vamos hoy? Ventas contra ayer *a esta hora* y por hora.
 *  2. ¿Cómo está la caja? Mi turno y las cajas abiertas (con las olvidadas).
 *  3. ¿Qué hay que atender? Sólo avisos con algo pendiente, que llevan a
 *     donde se resuelven.
 *  4. Mis tareas.
 *
 * Todo sale de GET /home/summary (un bloque por permiso) y se recarga al
 * volver a la pantalla.
 */

import ContextSwitcherModal from "@/components/App/ContextSwitcherModal";
import { ListGroup as List, ListRow as Row, ListSection as Section } from "@/components/App/ListGroup";
import Skeleton from "@/components/SkeletonLoader";
import NotificationPermissionBanner from "@/components/Notifications/NotificationPermissionBanner";
import TaskRow from "@/components/Tasks/TaskRow";
import { fetchMyOpenTasks } from "@/components/Tasks/taskQueries";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, formatTime } from "@/utils/dates";
import { formatMoney } from "@/utils/format";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

type Summary = App.Entities.HomeSummary;
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Atajos a los módulos que no están en la barra inferior. Cada uno se muestra
 * si el usuario puede abrir su pantalla (mapa central de permisos).
 */
const SHORTCUTS: { label: string; icon: IconName; link: string }[] = [
  { label: "Punto de venta", icon: "point-of-sale", link: "/(stacks)/pos" },
  { label: "Ventas", icon: "receipt-text-outline", link: "/(tabs)/home/sales" },
  { label: "Compras", icon: "cart-outline", link: "/(tabs)/home/purchases" },
  { label: "Producción", icon: "factory", link: "/(tabs)/home/production" },
  { label: "Transferencias", icon: "swap-horizontal", link: "/(tabs)/home/transfers-menu" },
  { label: "Ajustes", icon: "tune-variant", link: "/(tabs)/home/adjustment" },
];

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Cada aviso del backend: ícono, frase y a dónde lleva. */
const ALERTS: Record<string, { icon: IconName; text: (n: number) => string; link: string }> = {
  out_of_stock: {
    icon: "package-variant-remove",
    text: (n) => `${n} ${plural(n, "producto agotado", "productos agotados")}`,
    link: "/(tabs)/inventory/products/type/all?filter=out_of_stock",
  },
  low_stock: {
    icon: "trending-down",
    text: (n) => `${n} ${plural(n, "producto", "productos")} bajo el mínimo`,
    link: "/(tabs)/inventory/products/type/all?filter=low_stock",
  },
  transfers_to_receive: {
    icon: "truck-check-outline",
    text: (n) => `${n} ${plural(n, "transferencia", "transferencias")} por recibir`,
    link: "/(tabs)/home/transfers-menu",
  },
  transfers_to_approve: {
    icon: "clipboard-check-outline",
    text: (n) => `${n} ${plural(n, "transferencia", "transferencias")} por aprobar`,
    link: "/(tabs)/home/transfers-menu",
  },
  transfers_to_ship: {
    icon: "truck-delivery-outline",
    text: (n) => `${n} ${plural(n, "transferencia", "transferencias")} por enviar`,
    link: "/(tabs)/home/transfers-menu",
  },
  purchases_in_transit: {
    icon: "truck-outline",
    text: (n) => `${n} ${plural(n, "compra", "compras")} en camino`,
    link: "/(tabs)/home/purchases",
  },
  tasks_overdue: {
    icon: "alarm",
    text: (n) => `${n} ${plural(n, "tarea vencida", "tareas vencidas")}`,
    link: "/(tabs)/tasks",
  },
};

function todayTitle(): string {
  const text = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "9:12 a.m." si fue hoy; "18 sep, 9:12 a.m." si fue otro día. */
function sinceText(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? formatTime(d) : `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${formatTime(d)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const styles = useStyles();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const load = useCallback(async () => {
    if (!auth.selectedCompany) return;
    const [home, open] = await Promise.all([
      Services.today.summary().catch(() => null),
      fetchMyOpenTasks({ perPage: 4 }).catch(() => null),
    ]);
    if (home) setSummary(home);
    if (open) {
      setTasks(open.items.slice(0, 4));
      setTasksTotal(open.pendingTotal + open.inProgressTotal);
    }
    setLoading(false);
  }, [auth.selectedCompany]);

  // Al volver de una venta, un turno o una tarea, Inicio ya lo refleja.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, auth.location?.id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const { canAccessRoute } = useCan();
  const shortcuts = SHORTCUTS.filter((s) => canAccessRoute(s.link));
  const go = (link: string) => router.push(link as any);

  const header = (
    <View style={styles.header}>
      <Text style={styles.date}>{todayTitle()}</Text>
      <Pressable onPress={() => setSwitcherOpen(true)} style={styles.branchRow} accessibilityRole="button">
        <Text style={styles.branch} numberOfLines={2}>
          {summary?.location?.name ?? auth.location?.name ?? "Elige una sucursal"}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  const sales = summary?.sales ? <SalesToday sales={summary.sales} /> : null;
  const cash = summary?.cash ? <CashBlock cash={summary.cash} onGo={go} /> : null;
  const pending = summary ? <PendingBlock alerts={summary.alerts} onGo={go} /> : null;
  const myTasks = (
    <Section title="Tus tareas" action={tasksTotal > 0 ? { label: "Ver todas", onPress: () => go("/(tabs)/tasks") } : undefined}>
      {tasks.length === 0 ? (
        <Text style={styles.calm}>No tienes tareas abiertas.</Text>
      ) : (
        <List>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              currentLocationId={auth.location?.id}
              onPress={() => go(`/(tabs)/tasks/${task.id}`)}
            />
          ))}
        </List>
      )}
    </Section>
  );

  const goTo =
    shortcuts.length > 0 ? (
      <Section title="Ir a">
        <View style={styles.shortcuts}>
          {shortcuts.map((s) => (
            <Pressable key={s.link} onPress={() => go(s.link)} style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.7 }]}>
              <MaterialCommunityIcons name={s.icon} size={18} color={colors.primary} />
              <Text style={styles.shortcutText}>{s.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => go("/(tabs)/home/all-modules")} style={styles.shortcutGhost}>
            <Text style={styles.shortcutGhostText}>Todos los módulos</Text>
          </Pressable>
        </View>
      </Section>
    ) : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, !isMobile && styles.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <NotificationPermissionBanner />
        {header}

        {loading && !summary ? (
          // Esqueleto con la forma de la pantalla: antes era un segundo spinner
          // justo después del de arranque de la app.
          <HomeSkeleton wide={!isMobile} />
        ) : isMobile ? (
          <>
            {sales}
            {cash}
            {pending}
            {myTasks}
            {goTo}
          </>
        ) : (
          <View style={styles.columns}>
            <View style={styles.colMain}>
              {sales}
              {cash}
              {goTo}
            </View>
            <View style={styles.colSide}>
              {pending}
              {myTasks}
            </View>
          </View>
        )}
      </ScrollView>

      <ContextSwitcherModal visible={switcherOpen} onDismiss={() => setSwitcherOpen(false)} initialView="location" />
    </View>
  );
}

// ─── Bloques ────────────────────────────────────────────────────────────────

function HomeSkeleton({ wide }: { wide: boolean }) {
  const styles = useStyles();
  const block = (rows: number) => (
    <View style={[styles.list, { padding: 14, gap: 16 }]}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ gap: 6 }}>
          <Skeleton width="70%" height={14} borderRadius={6} />
          <Skeleton width="40%" height={11} borderRadius={6} />
        </View>
      ))}
    </View>
  );
  const main = (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Skeleton width={110} height={13} borderRadius={6} />
        <Skeleton width={180} height={40} borderRadius={8} />
        <Skeleton width={220} height={12} borderRadius={6} />
      </View>
      <View style={{ gap: 8 }}>
        <Skeleton width={60} height={13} borderRadius={6} />
        {block(2)}
      </View>
    </View>
  );
  const side = (
    <View style={{ gap: 8 }}>
      <Skeleton width={90} height={13} borderRadius={6} />
      {block(3)}
    </View>
  );
  return wide ? (
    <View style={styles.columns}>
      <View style={styles.colMain}>{main}</View>
      <View style={styles.colSide}>{side}</View>
    </View>
  ) : (
    <View style={{ gap: 22 }}>
      {main}
      {side}
    </View>
  );
}

function SalesToday({ sales }: { sales: NonNullable<Summary["sales"]> }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const base = sales.yesterday_same_time;
  const change = base > 0 ? ((sales.today_total - base) / base) * 100 : null;

  let comparison: { text: string; color: string };
  if (change !== null) {
    const up = change >= 0;
    comparison = {
      text: `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(0)}% vs. ayer a esta hora (${formatMoney(base)})`,
      color: up ? colors.success : colors.error,
    };
  } else if (sales.today_total > 0) {
    comparison = { text: "Ayer a esta hora no había ventas", color: colors.textSecondary };
  } else {
    comparison = {
      text: sales.yesterday_total > 0 ? `Todavía sin ventas · ayer se vendieron ${formatMoney(sales.yesterday_total)}` : "Todavía sin ventas hoy",
      color: colors.textSecondary,
    };
  }

  return (
    <Section title="Ventas de hoy">
      <Text style={styles.bigNumber}>{formatMoney(sales.today_total)}</Text>
      {sales.today_count > 0 && (
        <Text style={styles.subtle}>
          {sales.today_count} {plural(sales.today_count, "venta", "ventas")} · ticket promedio {formatMoney(sales.average_ticket)}
        </Text>
      )}
      <Text style={[styles.comparison, { color: comparison.color }]}>{comparison.text}</Text>
      <HourBars hours={sales.by_hour} />
    </Section>
  );
}

/** Ventas por hora: hoy (barra) contra ayer (sombra detrás). */
function HourBars({ hours }: { hours: NonNullable<Summary["sales"]>["by_hour"] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const nowHour = new Date().getHours();

  const { range, max } = useMemo(() => {
    const active = hours.filter((h) => h.today > 0 || h.yesterday > 0).map((h) => h.hour);
    const from = Math.min(8, ...active);
    const to = Math.max(20, nowHour, ...active);
    const slice = hours.filter((h) => h.hour >= from && h.hour <= to);
    return { range: slice, max: Math.max(1, ...slice.map((h) => Math.max(h.today, h.yesterday))) };
  }, [hours, nowHour]);

  if (max <= 1 && range.every((h) => h.today === 0 && h.yesterday === 0)) return null;

  return (
    <View style={styles.chart}>
      <View style={styles.bars}>
        {range.map((h) => (
          <View key={h.hour} style={styles.barSlot}>
            <View style={[styles.barGhost, { height: `${(h.yesterday / max) * 100}%`, backgroundColor: colors.border }]} />
            <View
              style={[
                styles.bar,
                { height: `${(h.today / max) * 100}%`, backgroundColor: h.hour === nowHour ? colors.primary : colors.primary + "B3" },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        {range.map((h) => (
          <Text key={h.hour} style={styles.barLabel}>
            {h.hour % 4 === 0 ? `${h.hour}h` : ""}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.legendText}>Hoy</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
        <Text style={styles.legendText}>Ayer</Text>
      </View>
    </View>
  );
}

function CashBlock({ cash, onGo }: { cash: NonNullable<Summary["cash"]>; onGo: (link: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { can, canAccessRoute } = useCan();
  const canOpenPos = canAccessRoute("/(stacks)/pos");
  // El turno de otro cajero solo se abre con cash_register_sessions_read (el
  // backend responde 403 sin él): sin permiso la fila solo informa.
  const canOpenOthers = can("cash_register_sessions_read");
  const others = cash.open_in_branch.filter((s) => s.id !== cash.mine?.id);
  if (!cash.mine && !cash.can_sell && others.length === 0) return null;

  return (
    <Section title="Caja">
      <List>
        {cash.mine ? (
          <Row
            icon="cash-register"
            title={`Tu turno en ${cash.mine.register ?? "caja"}${cash.mine.location ? ` · ${cash.mine.location}` : ""}`}
            subtitle={`Desde ${sinceText(cash.mine.opened_at)} · ${cash.mine.sales_count} ${plural(cash.mine.sales_count, "venta", "ventas")} · ${formatMoney(cash.mine.sales_total)}`}
            warning={cash.mine.stale ? "Lleva abierto desde otro día: ciérralo para que el corte cuadre." : undefined}
            actionLabel={canOpenPos ? "Ir al punto de venta" : undefined}
            onPress={canOpenPos ? () => onGo("/(stacks)/pos") : undefined}
          />
        ) : cash.can_sell && canOpenPos ? (
          <Row icon="cash-register" title="No tienes turno abierto" subtitle="Ábrelo para empezar a cobrar." actionLabel="Abrir turno" onPress={() => onGo("/(stacks)/pos")} />
        ) : null}
        {others.map((s) => (
          <Row
            key={s.id}
            icon="account-cash-outline"
            title={`${s.register ?? "Caja"} · ${s.user ?? "—"}`}
            subtitle={`Abierta desde ${sinceText(s.opened_at)}`}
            warning={s.stale ? "Turno olvidado: sigue abierto desde otro día." : undefined}
            onPress={canOpenOthers ? () => onGo(`/(tabs)/home/cash/sessions/${s.id}`) : undefined}
          />
        ))}
      </List>
      {others.some((s) => s.stale) && (
        <Text style={[styles.subtle, { color: colors.warning, marginTop: 6 }]}>
          Los turnos olvidados mezclan las ventas de varios días en un mismo corte.
        </Text>
      )}
    </Section>
  );
}

function PendingBlock({ alerts, onGo }: { alerts: Summary["alerts"]; onGo: (link: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  // El aviso se muestra siempre (el backend ya lo arma según permiso); solo
  // lleva a la pantalla si el usuario puede abrirla.
  const { canAccessRoute } = useCan();
  const tone = { error: colors.error, warning: colors.warning, info: colors.info };
  const known = alerts.filter((a) => ALERTS[a.key]);

  return (
    <Section title="Por atender">
      {known.length === 0 ? (
        <View style={styles.allGood}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.success} />
          <Text style={styles.calm}>Todo en orden por ahora.</Text>
        </View>
      ) : (
        <List>
          {known.map((a) => (
            <Row
              key={a.key}
              icon={ALERTS[a.key].icon}
              iconColor={tone[a.tone]}
              title={ALERTS[a.key].text(a.count)}
              onPress={canAccessRoute(ALERTS[a.key].link) ? () => onGo(ALERTS[a.key].link) : undefined}
            />
          ))}
        </List>
      )}
    </Section>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const useStyles = () =>
  useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, gap: 22, paddingBottom: 40 },
    contentWide: { padding: 28, maxWidth: 1180, width: "100%", alignSelf: "center" as const },
    header: { gap: 2, marginTop: 4 },
    date: { fontSize: 13, color: c.textSecondary, fontWeight: "500" as const },
    branchRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, alignSelf: "flex-start" as const },
    branch: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, color: c.text, flexShrink: 1, letterSpacing: -0.3 },

    columns: { flexDirection: "row" as const, gap: 28, alignItems: "flex-start" as const },
    colMain: { flex: 3, gap: 22, minWidth: 0 },
    colSide: { flex: 2, gap: 22, minWidth: 0 },

    bigNumber: { fontSize: 40, lineHeight: 46, fontWeight: "700" as const, color: c.text, letterSpacing: -1, fontVariant: ["tabular-nums"] as any },
    subtle: { fontSize: 13, color: c.textSecondary },
    comparison: { fontSize: 13, fontWeight: "600" as const },
    calm: { fontSize: 14, color: c.textSecondary },
    allGood: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 4 },

    chart: { marginTop: 10, gap: 4 },
    bars: { flexDirection: "row" as const, alignItems: "flex-end" as const, height: 72, gap: 3 },
    barSlot: { flex: 1, height: "100%" as const, justifyContent: "flex-end" as const },
    barGhost: { position: "absolute" as const, left: 0, right: 0, bottom: 0, borderRadius: 3 },
    bar: { marginHorizontal: "18%" as const, borderRadius: 3, minHeight: 0 },
    barLabels: { flexDirection: "row" as const, gap: 3 },
    barLabel: { flex: 1, fontSize: 10, color: c.textMuted },
    legend: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 2 },
    legendDot: { width: 8, height: 8, borderRadius: 2 },
    legendText: { fontSize: 11, color: c.textMuted, marginRight: 8 },

    list: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: "hidden" as const },

    shortcuts: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
    shortcut: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    shortcutText: { fontSize: 14, fontWeight: "500" as const, color: c.text },
    shortcutGhost: { paddingHorizontal: 12, paddingVertical: 9 },
    shortcutGhostText: { fontSize: 14, fontWeight: "600" as const, color: c.primary },
  }));
