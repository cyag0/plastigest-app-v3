import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import AppChip, { ChipVariant } from "@/components/App/Chip";
import PermissionGate from "@/components/App/PermissionGate";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatMoney } from "@/utils/format";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; variant: ChipVariant }> = {
  income: { label: "Ingreso", variant: "success" },
  expense: { label: "Egreso", variant: "error" },
  adjustment: { label: "Ajuste", variant: "info" },
};

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

/**
 * Saldo y accesos a turnos y cierres. Compacto a propósito: va arriba de la
 * lista y en celular dejaba poco espacio para los movimientos. Antes los
 * botones de turnos/cierres se encimaban con los saldos por método en Android.
 */
function CashSummary() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [stats, setStats] = useState<CashStats | null>(null);

  // Se recarga al volver (p. ej. después de registrar un movimiento).
  useFocusEffect(
    useCallback(() => {
      Services.cashMovements.stats().then(setStats).catch(console.error);
    }, []),
  );

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
              {`${stats.today_count} ${stats.today_count === 1 ? "movimiento" : "movimientos"} hoy`}
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
      <View style={styles.linksRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/home/cash/sessions" as any)}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="cash-register" size={18} color={colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>
            Turnos de caja
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/home/cash/closing" as any)}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
          <Text style={styles.linkText} numberOfLines={1}>
            Cierres anteriores
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pantalla
// ─────────────────────────────────────────────────────────────────────────────

const FORM = "/(tabs)/home/cash/form";

export default function CashMovementsIndex() {
  const { colors } = useTheme();

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
      render: (_, item) => {
        const meta = TYPE_META[item.type];
        return (
          <AppChip size="sm" variant={meta?.variant ?? "default"}>
            {meta?.label ?? item.type}
          </AppChip>
        );
      },
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
  const open = (item: any) => {
    const route = sourceRoute(item);
    router.push((route ?? `${FORM}?id=${item.id}`) as any);
  };

  return (
    <PermissionGate permission="cash_movements_list">
      <CashSummary />
      <AppList
        title="Caja"
        service={Services.cashMovements}
        columns={columns}
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
          const meta = TYPE_META[item.type];
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
                <AppChip size="sm" variant={meta?.variant ?? "default"}>
                  {meta?.label ?? item.type}
                </AppChip>
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
          showView: (item: any) => !!sourceRoute(item),
          onEdit: (item: any) => router.push(`${FORM}?id=${item.id}` as any),
          showEdit: (item: any) => !item.source_type,
          showDelete: (item: any) => !item.source_type,
        }}
      />
    </PermissionGate>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
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
});
