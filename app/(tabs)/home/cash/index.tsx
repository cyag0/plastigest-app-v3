import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import AppChip from "@/components/App/Chip";
import IconLabel from "@/components/App/IconLabel";
import { LIST_TEXT_INSET, ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import PermissionGate from "@/components/App/PermissionGate";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney } from "@/utils/format";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// El tipo es un atributo (no un estado): ícono y texto, sin color. El monto
// ya lleva el signo y el color.
const TYPE_META: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  income: { label: "Ingreso", icon: "arrow-down-circle-outline" },
  expense: { label: "Egreso", icon: "arrow-up-circle-outline" },
  adjustment: { label: "Ajuste", icon: "tune-variant" },
};

function MovementType({ type }: { type: string }) {
  const meta = TYPE_META[type];
  return <IconLabel icon={meta?.icon ?? "swap-vertical"} label={meta?.label ?? type} />;
}

/**
 * Concepto para mostrar. Los movimientos guardados antes llevaban el id
 * interno y el folio ("Venta #4668 (SAL-20261015-0003)"): se deja el folio,
 * que es el que se conoce.
 */
function displayConcept(concept: string | null | undefined): string {
  if (!concept) return "Movimiento";
  return concept.replace(/#\d+ \(([^)]+)\)$/, "$1");
}

/**
 * Pantalla del documento que originó el movimiento. Los gastos no tienen
 * detalle: se abren en su formulario (los movimientos viejos apuntaban a una
 * ruta que no existe).
 */
function sourceRoute(item: any): string | null {
  if (item.source_type === "expense" && item.source_id) {
    return `/(tabs)/home/expenses/form?id=${item.source_id}`;
  }
  return item.source_url || null;
}

const signedMoney = (item: any) => `${item.type === "expense" ? "−" : "+"}${formatMoney(item.amount)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Resumen
// ─────────────────────────────────────────────────────────────────────────────

interface CashStats {
  balance_actual: number;
  total_income: number;
  total_expense: number;
  today_income: number;
  today_expense: number;
  today_count: number;
  by_payment_method: Record<
    string,
    { balance: number; total_income: number; total_expense: number; label: string }
  >;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface CashLink {
  route: string;
  label: string;
  icon: IconName;
}

/** Saldos de la caja; se recargan al volver (p. ej. después de registrar un movimiento). */
function useCashStats() {
  const [stats, setStats] = useState<CashStats | null>(null);
  useFocusEffect(
    useCallback(() => {
      Services.cashMovements.stats().then(setStats).catch(console.error);
    }, []),
  );
  return stats;
}

/** Turnos y cierres, cada uno solo si el usuario puede abrir esa pantalla (mapa central). */
function useCashLinks(): CashLink[] {
  const { canAccessRoute } = useCan();
  const links: CashLink[] = [
    { route: "/(tabs)/home/cash/sessions", label: "Turnos de caja", icon: "cash-register" },
    { route: "/(tabs)/home/cash/closing", label: "Cierres anteriores", icon: "history" },
  ];
  return links.filter((link) => canAccessRoute(link.route));
}

/**
 * Saldo y accesos a turnos y cierres, arriba de la lista. Compacto a
 * propósito: en celular dejaba poco espacio para los movimientos. Antes los
 * botones de turnos/cierres se encimaban con los saldos por método en Android.
 */
function CashSummary({ stats, links }: { stats: CashStats | null; links: CashLink[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const methods = Object.entries(stats?.by_payment_method ?? {});
  const balance = stats?.balance_actual ?? 0;

  return (
    <View style={styles.summaryWrap}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.summaryLabel}>Saldo actual</Text>
            <Text style={[styles.summaryValue, { color: balance >= 0 ? colors.text : colors.error }]} numberOfLines={1}>
              {stats ? formatMoney(balance) : "—"}
            </Text>
          </View>
          {stats && (
            <AppChip size="sm" variant="default">
              {todayCount(stats)}
            </AppChip>
          )}
        </View>

        {methods.length > 0 && (
          <Text style={styles.methods}>
            {methods.map(([method, data], index) => (
              <Text key={method}>
                {index > 0 ? "  ·  " : ""}
                {data.label}{" "}
                <Text style={[styles.methodValue, data.balance < 0 && { color: colors.error }]}>
                  {formatMoney(data.balance)}
                </Text>
              </Text>
            ))}
          </Text>
        )}

        {stats && (
          <View style={styles.monthRow}>
            <View style={styles.monthItem}>
              <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color={colors.success} />
              <Text style={styles.monthLabel}>Ingresos del mes</Text>
              <Text style={[styles.monthValue, { color: colors.success }]} numberOfLines={1}>
                {formatMoney(stats.total_income)}
              </Text>
            </View>
            <View style={styles.monthItem}>
              <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color={colors.error} />
              <Text style={styles.monthLabel}>Egresos del mes</Text>
              <Text style={[styles.monthValue, { color: colors.error }]} numberOfLines={1}>
                {formatMoney(stats.total_expense)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Dos botones del mismo ancho: no se encimen ni se envuelvan raro. */}
      {links.length > 0 && (
        <View style={styles.linksRow}>
          {links.map((link) => (
            <Pressable
              key={link.route}
              onPress={() => router.push(link.route as any)}
              style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name={link.icon} size={18} color={colors.primary} />
              <Text style={styles.linkText} numberOfLines={1}>
                {link.label}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const todayCount = (stats: CashStats) =>
  `${stats.today_count} ${stats.today_count === 1 ? "movimiento" : "movimientos"} hoy`;

/** Monto con etiqueta (y opcionalmente ícono) en una fila de ListGroup. */
function AmountRow({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.amountRow}>
      {icon && <MaterialCommunityIcons name={icon} size={20} color={color ?? colors.textSecondary} />}
      <Text style={styles.amountLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.amountValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * El mismo resumen en un panel a la izquierda de la lista (tableta acostada,
 * escritorio): arriba quitaba un tercio de la altura y en tableta acostada
 * apenas cabían dos filas de movimientos. Aquí hay alto de sobra, así que
 * cada saldo va en su fila, como en Inicio.
 */
function CashSidePanel({ stats, links }: { stats: CashStats | null; links: CashLink[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const methods = Object.entries(stats?.by_payment_method ?? {});
  const balance = stats?.balance_actual ?? 0;

  return (
    <ScrollView style={styles.side} contentContainerStyle={styles.sideContent}>
      <ListGroup inset={LIST_TEXT_INSET}>
        <View style={styles.sideHero}>
          <Text style={styles.summaryLabel}>Saldo actual</Text>
          <Text
            style={[styles.sideValue, { color: balance >= 0 ? colors.text : colors.error }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {stats ? formatMoney(balance) : "—"}
          </Text>
          {stats && <Text style={styles.sideCaption}>{todayCount(stats)}</Text>}
        </View>
        {methods.map(([method, data]) => (
          <AmountRow
            key={method}
            label={data.label}
            value={formatMoney(data.balance)}
            color={data.balance < 0 ? colors.error : undefined}
          />
        ))}
      </ListGroup>

      {stats && (
        <ListSection title="Este mes">
          <ListGroup>
            <AmountRow
              icon="arrow-down-circle-outline"
              color={colors.success}
              label="Ingresos"
              value={formatMoney(stats.total_income)}
            />
            <AmountRow
              icon="arrow-up-circle-outline"
              color={colors.error}
              label="Egresos"
              value={formatMoney(stats.total_expense)}
            />
          </ListGroup>
        </ListSection>
      )}

      {links.length > 0 && (
        <ListGroup>
          {links.map((link) => (
            <ListRow
              key={link.route}
              icon={link.icon}
              title={link.label}
              onPress={() => router.push(link.route as any)}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pantalla
// ─────────────────────────────────────────────────────────────────────────────

const FORM = "/(tabs)/home/cash/form";

export default function CashMovementsIndex() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { can, canAccessRoute } = useCan();
  const stats = useCashStats();
  const links = useCashLinks();

  // Panel lateral según el ancho real del área (en web descuenta el menú);
  // antes de medirla, el de la ventana.
  const { width: windowWidth } = useWindowDimensions();
  const [areaWidth, setAreaWidth] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => setAreaWidth(e.nativeEvent.layout.width), []);
  const sidePanel = (areaWidth ?? windowWidth) >= SIDE_PANEL_MIN_WIDTH;

  const columns: AppListColumn<any>[] = [
    {
      title: "Fecha",
      key: "movement_date",
      width: 110,
      render: (_, item) => formatDate(item.movement_date),
    },
    {
      title: "Tipo",
      key: "type",
      width: 110,
      align: "center",
      render: (_, item) => <MovementType type={item.type} />,
    },
    { title: "Concepto", key: "concept", width: 260, render: (_, item) => displayConcept(item.concept) },
    {
      title: "Método",
      key: "payment_method",
      width: 130,
      render: (_, item) => item.payment_method_label ?? item.payment_method,
    },
    {
      title: "Monto",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, item) => (
        <Text style={{ fontWeight: "700", color: item.type === "expense" ? colors.error : colors.success }}>
          {signedMoney(item)}
        </Text>
      ),
    },
  ];

  // Tocar un movimiento abre lo que lo originó (la venta, la compra, el
  // gasto); uno capturado a mano se abre para editarlo. Antes ambos llevaban
  // a una pantalla inexistente ("Página no encontrada").
  // Sin permiso para la pantalla destino (la venta, la compra, el gasto o el
  // movimiento) el renglón no abre nada.
  const open = (item: any) => {
    const route = sourceRoute(item) ?? `${FORM}?id=${item.id}`;
    if (!canAccessRoute(route)) return;
    router.push(route as any);
  };

  return (
    <PermissionGate permission="cash_movements_list">
      {/* La lista queda en el mismo lugar del árbol con o sin panel: al girar
          la tableta no se vuelve a montar (ni pierde página ni filtros). */}
      <View style={[styles.screen, sidePanel && styles.screenSide]} onLayout={onLayout}>
        {sidePanel ? (
          <CashSidePanel stats={stats} links={links} />
        ) : (
          <CashSummary stats={stats} links={links} />
        )}
        <View style={styles.listArea}>
          <AppList
            title="Caja"
            service={Services.cashMovements}
            columns={columns}
            // "+", "Editar" y "Eliminar" piden cash_movements_create/update/delete.
            // Abrir el renglón depende de la pantalla destino (ver `open`).
            permissionPrefix="cash_movements"
            permissions={{ read: [] }}
            filters={[
              {
                type: "simple",
                name: "type",
                label: "Tipo",
                options: [
                  { label: "Todos", value: "" },
                  { label: "Ingresos", value: "income" },
                  { label: "Egresos", value: "expense" },
                  { label: "Ajustes", value: "adjustment" },
                ],
              },
              {
                type: "simple",
                name: "payment_method",
                label: "Método de Pago",
                options: [
                  { label: "Todos", value: "" },
                  { label: "Efectivo", value: "cash" },
                  { label: "Tarjeta", value: "card" },
                  { label: "Transferencia", value: "transfer" },
                  { label: "Otro", value: "other" },
                ],
              },
            ]}
            renderCard={({ item }) => {
              return {
                title: displayConcept(item.concept),
                description: item.notes || undefined,
                right: (
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 15,
                        color: item.type === "expense" ? colors.error : colors.success,
                      }}
                    >
                      {signedMoney(item)}
                    </Text>
                    <MovementType type={item.type} />
                  </View>
                ),
                // Sin etiquetas ("Fecha", "Método"…): el dato se entiende solo.
                bottom: [
                  { label: "", value: formatDate(item.movement_date) },
                  { label: "", value: item.payment_method_label ?? item.payment_method },
                  ...(item.user?.name ? [{ label: "", value: item.user.name }] : []),
                ],
              };
            }}
            onPressCreate={() => router.push(FORM as any)}
            searchPlaceholder="Buscar movimientos..."
            // Los movimientos que genera el sistema (ventas, compras, gastos,
            // devoluciones) no se editan ni se borran a mano: descuadrarían el corte.
            menu={{
              onShow: open,
              showView: (item: any) => {
                const route = sourceRoute(item);
                return !!route && canAccessRoute(route);
              },
              onEdit: (item: any) => router.push(`${FORM}?id=${item.id}` as any),
              // El formulario carga el movimiento con cash_movements_read.
              showEdit: (item: any) => !item.source_type && can("cash_movements_read"),
              showDelete: (item: any) => !item.source_type,
            }}
          />
        </View>
      </View>
    </PermissionGate>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────

const SIDE_PANEL_WIDTH = 300;
// Con el panel, a la lista le quedan ~800: dos columnas de tarjetas en la
// tableta acostada y la tabla de web sin recortar la fecha. Con menos área
// (web a 1280 junto al menú, tableta de 8") el resumen va arriba.
const SIDE_PANEL_MIN_WIDTH = 1100;

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  screenSide: {
    flexDirection: "row" as const,
  },
  listArea: {
    flex: 1,
    minWidth: 0,
  },
  summaryWrap: {
    paddingHorizontal: tokens.spacing[4],
    paddingTop: tokens.spacing[3],
    gap: tokens.spacing[2],
    width: "100%" as const,
    maxWidth: 900,
    alignSelf: "center" as const,
  },
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  summaryTop: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: tokens.spacing[2],
  },
  summaryLabel: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  summaryValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  methods: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  methodValue: {
    fontWeight: "700" as const,
    color: c.text,
  },
  monthRow: {
    flexDirection: "row" as const,
    gap: tokens.spacing[2],
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: tokens.spacing[2],
  },
  monthItem: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  monthLabel: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  monthValue: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
  },
  linksRow: {
    flexDirection: "row" as const,
    gap: tokens.spacing[2],
  },
  link: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing[2],
    borderRadius: tokens.radius.md,
    backgroundColor: c.primarySoft,
  },
  linkText: {
    ...tokens.typography.bodySm,
    fontWeight: "600" as const,
    color: c.primary,
    flexShrink: 1,
  },

  // Panel lateral: arriba a la altura del buscador; el margen del buscador
  // (16) separa el panel de la lista.
  side: {
    width: SIDE_PANEL_WIDTH,
    flexGrow: 0,
  },
  sideContent: {
    paddingLeft: tokens.spacing[4],
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[4],
    gap: 20,
  },
  sideHero: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 2,
  },
  sideValue: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums" as const],
  },
  sideCaption: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  amountRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  amountLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
  },
  amountValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700" as const,
    color: c.text,
    fontVariant: ["tabular-nums" as const],
  },
});
