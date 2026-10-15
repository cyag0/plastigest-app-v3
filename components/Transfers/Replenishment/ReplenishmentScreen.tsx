import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { parseLocalDate } from "@/utils/dates";
import { formatMoney, formatQuantity } from "@/utils/format";
import { shortLocationName } from "@/utils/locations";
import Services from "@/utils/services";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";
import ExplainSheet, { ExplainTarget } from "./ExplainSheet";

type Plan = App.Entities.ReplenishmentPlan;
type TransferGroup = Plan["transfers"][number];
type PurchaseGroup = Plan["purchases"][number];

const COVERAGE_OPTIONS = [
  { days: 1, label: "Mañana" },
  { days: 2, label: "2 días" },
  { days: 3, label: "3 días" },
  { days: 7, label: "1 semana" },
];

function apiMessage(error: any, fallback: string): string {
  const data = error?.response?.data;
  const fieldError = data?.errors ? (Object.values(data.errors).flat()[0] as string | undefined) : undefined;
  const message = fieldError ?? data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function horizonLabel(plan: Plan): string {
  if (plan.coverage_days === 1) {
    const weekday = parseLocalDate(plan.horizon.from).toLocaleDateString("es-MX", { weekday: "long" });
    return `mañana (${weekday})`;
  }
  return `los próximos ${plan.coverage_days} días`;
}

const oneDecimal = (value: number) => formatQuantity(Math.round(value * 10) / 10);

const itemKey = (group: TransferGroup, productId: number) => `${group.from.id}-${group.to.id}-${productId}`;
const groupKey = (group: TransferGroup) => `${group.from.id}-${group.to.id}`;

/**
 * Reabastecimiento: qué mandarle a cada sucursal para lo que queda de hoy y
 * los días a cubrir, y qué comprar o producir porque no alcanza entre todas.
 * Se calcula con lo que vendió cada sucursal (sin IA): ver
 * ReplenishmentPlanner en el backend.
 */
export default function ReplenishmentScreen() {
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { location, selectedCompany, hasPermission } = useAuth();
  // En celular el nombre completo ("Cocos Francisco La Lija") no cabe.
  const short = (name: string) => shortLocationName(name, selectedCompany?.name);

  const [coverageDays, setCoverageDays] = useState(1);
  // Para recalcular al volver con los días elegidos (el efecto de foco no
  // depende del estado).
  const coverageRef = useRef(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  // Lo que el usuario ajustó antes de crear la solicitud.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [explain, setExplain] = useState<ExplainTarget | null>(null);

  const canCreateTransfer = hasPermission("transfers_create");
  const canCreatePurchase = hasPermission("purchases_create");

  const requestId = useRef(0);
  const load = useCallback(
    async (days: number, isRefresh = false) => {
      const current = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await Services.replenishment.index({ coverage_days: days });
        if (current !== requestId.current) return;
        setPlan(data);
        setQuantities({});
        setExcluded({});
        setFailed(false);
      } catch (error) {
        if (current !== requestId.current) return;
        setFailed(true);
        alerts.error(apiMessage(error, "No se pudieron calcular las sugerencias"));
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // alerts es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Se recalcula al volver: una solicitud creada ya cuenta como "en camino".
  const loadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(coverageRef.current, loadedOnce.current);
      loadedOnce.current = true;
    }, [load]),
  );

  const changeCoverage = (days: number) => {
    if (days === coverageDays) return;
    coverageRef.current = days;
    setCoverageDays(days);
    load(days);
  };

  const quantityOf = (key: string, suggested: number) => {
    const text = quantities[key];
    if (text === undefined) return suggested;
    const value = Number(text.replace(",", "."));
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const step = (suggested: number) => (Number.isInteger(suggested) ? 1 : 0.1);

  const createTransfer = async (group: TransferGroup) => {
    const items = group.items
      .map((item) => ({ item, quantity: quantityOf(itemKey(group, item.product.id), item.quantity) }))
      .filter(({ item, quantity }) => !excluded[itemKey(group, item.product.id)] && quantity > 0);
    if (items.length === 0) {
      alerts.warning("Elige al menos un producto");
      return;
    }

    const ok = await alerts.confirm(
      `Se le pedirán a ${short(group.from.name)} ${items.length} ${items.length === 1 ? "producto" : "productos"} para ${short(group.to.name)}. La solicitud sigue el flujo normal: ${short(group.from.name)} la aprueba y la envía.`,
      { title: "Crear solicitud de transferencia", okText: "Crear solicitud", cancelText: "Cancelar" },
    );
    if (!ok) return;

    setBusy(groupKey(group));
    try {
      const response: any = await transferService.store({
        from_location_id: group.from.id,
        to_location_id: group.to.id,
        notes: "Sugerida por reabastecimiento",
        details: items.map(({ item, quantity }) => ({
          product_id: item.product.id,
          unit_id: item.product.unit_id,
          quantity_requested: quantity,
        })),
      } as any);
      const number = response?.data?.data?.transfer_number;
      alerts.success(number ? `Solicitud ${number} creada` : "Solicitud creada");
      await load(coverageDays, true);
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo crear la solicitud"));
    } finally {
      setBusy(null);
    }
  };

  const createPurchase = async (group: PurchaseGroup) => {
    const ok = await alerts.confirm(
      `Se arma un borrador de compra${group.supplier ? ` a ${group.supplier.name}` : ""} con ${group.items.length} ${group.items.length === 1 ? "producto" : "productos"}. Lo revisas y lo envías desde Compras.`,
      { title: "Crear borrador de compra", okText: "Crear borrador", cancelText: "Cancelar" },
    );
    if (!ok) return;

    setBusy(`purchase-${group.location.id}-${group.supplier?.id ?? 0}`);
    try {
      await Services.purchasesV2.upsertDraft({
        supplier_id: group.supplier?.id,
        notes: "Sugerida por reabastecimiento",
        items: group.items
          .filter((item) => item.product.unit_id)
          .map((item) => ({
            id: `product_${item.product.id}`,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_id: item.product.unit_id as number,
            price: item.unit_cost ?? 0,
          })),
      });
      router.push("/(tabs)/home/purchases/formv2" as any);
    } catch (error) {
      alerts.error(apiMessage(error, "No se pudo crear el borrador de compra"));
    } finally {
      setBusy(null);
    }
  };

  const needsText = (needs: App.Entities.ReplenishmentNeed[], unit: string | null) =>
    needs.map((need) => `${short(need.location.name)} ${formatQuantity(need.quantity, unit)}`).join(" · ");

  // ─── Render ──────────────────────────────────────────────────────────────

  const renderTransfer = (group: TransferGroup) => {
    const key = groupKey(group);
    const selected = group.items.filter((item) => !excluded[itemKey(group, item.product.id)]).length;

    return (
      <View key={key} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              Para {short(group.to.name)}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              desde {short(group.from.name)}
            </Text>
          </View>
          <Text style={styles.count}>
            {group.items.length} {group.items.length === 1 ? "producto" : "productos"}
          </Text>
        </View>

        {group.items.map((item, index) => {
          const k = itemKey(group, item.product.id);
          const off = !!excluded[k];
          const quantity = quantityOf(k, item.quantity);
          const d = item.destination;
          return (
            <View key={k} style={[styles.itemRow, index > 0 && styles.divider]}>
              {canCreateTransfer && (
                <Pressable
                  onPress={() => setExcluded((prev) => ({ ...prev, [k]: !off }))}
                  hitSlop={8}
                  role="checkbox"
                  aria-checked={!off}
                  accessibilityLabel={`Incluir ${item.product.name}`}
                >
                  <MaterialCommunityIcons
                    name={off ? "checkbox-blank-outline" : "checkbox-marked"}
                    size={22}
                    color={off ? colors.textMuted : colors.primary}
                  />
                </Pressable>
              )}
              <View style={[styles.itemBody, off && { opacity: 0.45 }]}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Pressable
                  onPress={() =>
                    setExplain({
                      productName: item.product.name,
                      unit: item.product.unit,
                      locationName: short(group.to.name),
                      explanation: d,
                      source: { name: short(group.from.name), explanation: item.source },
                      quantity: item.quantity,
                      coverageDays: plan?.coverage_days ?? 1,
                      horizonLabel: plan ? horizonLabel(plan) : "mañana",
                    })
                  }
                  hitSlop={6}
                >
                  <Text style={styles.itemMeta}>
                    {d.stock <= 0 && d.stockout_streak >= 2 ? (
                      // Lo agotado se cubre con lo que vendía antes de agotarse.
                      <Text style={styles.soldOut}>
                        Agotado hace {d.stockout_streak} días · vendía ~{oneDecimal(d.daily_average)}/día
                      </Text>
                    ) : (
                      `Vende ~${oneDecimal(d.daily_average)}/día · tiene ${oneDecimal(d.stock)}`
                    )}
                    {d.incoming > 0 ? ` · le llegan ${oneDecimal(d.incoming)}` : ""} ·{" "}
                    <Text style={styles.link}>¿por qué?</Text>
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.qtyRow, off && { opacity: 0.45 }]}>
                {canCreateTransfer ? (
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() =>
                        setQuantities((prev) => ({
                          ...prev,
                          [k]: String(Math.max(0, Math.round((quantity - step(item.quantity)) * 10) / 10)),
                        }))
                      }
                      style={styles.stepButton}
                      accessibilityLabel="Menos"
                      disabled={off}
                    >
                      <MaterialCommunityIcons name="minus" size={16} color={colors.text} />
                    </Pressable>
                    <TextInput
                      value={quantities[k] ?? String(item.quantity)}
                      onChangeText={(text) => setQuantities((prev) => ({ ...prev, [k]: text }))}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      editable={!off}
                      style={styles.qtyInput}
                      accessibilityLabel={`Cantidad de ${item.product.name}`}
                    />
                    <Pressable
                      onPress={() =>
                        setQuantities((prev) => ({
                          ...prev,
                          [k]: String(Math.round((quantity + step(item.quantity)) * 10) / 10),
                        }))
                      }
                      style={styles.stepButton}
                      accessibilityLabel="Más"
                      disabled={off}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.qtyStatic}>{formatQuantity(item.quantity)}</Text>
                )}
                <Text style={styles.unit}>{item.product.unit}</Text>
              </View>
            </View>
          );
        })}

        {canCreateTransfer && (
          <Button
            mode="contained"
            icon="truck-delivery-outline"
            onPress={() => createTransfer(group)}
            loading={busy === key}
            disabled={busy !== null || selected === 0}
            style={styles.cardAction}
          >
            {`Pedir a ${short(group.from.name)}`}
          </Button>
        )}
      </View>
    );
  };

  const renderPurchase = (group: PurchaseGroup) => {
    const key = `purchase-${group.location.id}-${group.supplier?.id ?? 0}`;
    const here = location?.id === group.location.id;
    return (
      <View key={key} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {group.supplier?.name ?? "Sin proveedor asignado"}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              Para {short(group.location.name)}
            </Text>
          </View>
          {group.total > 0 && <Text style={styles.money}>≈ {formatMoney(group.total)}</Text>}
        </View>

        {group.items.map((item, index) => (
          <View key={item.product.id} style={[styles.itemRow, index > 0 && styles.divider]}>
            <View style={styles.itemBody}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.itemMeta}>Para: {needsText(item.needs, item.product.unit)}</Text>
            </View>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyStatic}>{formatQuantity(item.quantity, item.product.unit)}</Text>
              {item.total !== null && <Text style={styles.unit}>{formatMoney(item.total)}</Text>}
            </View>
          </View>
        ))}

        {canCreatePurchase &&
          (here ? (
            <Button
              mode="outlined"
              icon="cart-plus"
              onPress={() => createPurchase(group)}
              loading={busy === key}
              disabled={busy !== null}
              style={styles.cardAction}
            >
              Crear borrador de compra
            </Button>
          ) : (
            <Text style={styles.hint}>Para armar la compra, entra a {short(group.location.name)}.</Text>
          ))}
      </View>
    );
  };

  if (loading && !plan) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Calculando lo que necesita cada sucursal…</Text>
      </View>
    );
  }

  const empty =
    plan &&
    plan.transfers.length === 0 &&
    plan.purchases.length === 0 &&
    plan.production.length === 0 &&
    plan.shortages.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(coverageDays, true)} colors={[colors.primary]} />
        }
      >
        <View style={styles.coverageRow}>
          {COVERAGE_OPTIONS.map((option) => {
            const active = option.days === coverageDays;
            return (
              <Pressable
                key={option.days}
                onPress={() => changeCoverage(option.days)}
                style={[styles.coverageChip, active && styles.coverageChipActive]}
                role="radio"
                aria-checked={active}
              >
                <Text style={[styles.coverageText, active && styles.coverageTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {plan && (
          <Text style={styles.intro}>
            Para lo que queda de hoy y {horizonLabel(plan)}, con lo que vendió cada sucursal las últimas{" "}
            {Math.round(plan.history_days / 7)} semanas. Ya descuenta lo que tienen y lo que viene en camino.
          </Text>
        )}

        {failed && !plan && (
          <Button mode="outlined" icon="refresh" onPress={() => load(coverageDays)}>
            Reintentar
          </Button>
        )}

        {empty && (
          <EmptyState
            icon="check-circle-outline"
            title={coverageDays === 1 ? "Todo cubierto para mañana" : "Todo cubierto"}
            description="Con lo que tienen y lo que viene en camino, ninguna sucursal necesita producto."
          />
        )}

        {plan && plan.transfers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Mandar a sucursales</Text>
              <AppChip size="sm" variant="primary">
                {plan.transfers.length}
              </AppChip>
            </View>
            {plan.transfers.map(renderTransfer)}
          </>
        )}

        {plan && plan.purchases.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cart-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Comprar</Text>
              <AppChip size="sm" variant="primary">
                {plan.purchases.length}
              </AppChip>
            </View>
            <Text style={styles.sectionHint}>Lo que no alcanza entre todas las sucursales.</Text>
            {plan.purchases.map(renderPurchase)}
          </>
        )}

        {plan && plan.production.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="factory" size={18} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Producir</Text>
            </View>
            {plan.production.map((group) => (
              <View key={group.location.id} style={styles.card}>
                <Text style={styles.cardTitle}>En {short(group.location.name)}</Text>
                {group.items.map((item, index) => (
                  <View key={item.product.id} style={[styles.itemRow, index > 0 && styles.divider]}>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemMeta}>Para: {needsText(item.needs, item.product.unit)}</Text>
                    </View>
                    <Text style={styles.qtyStatic}>{formatQuantity(item.quantity, item.product.unit)}</Text>
                  </View>
                ))}
                {hasPermission("production_orders_list") && (
                  <Button
                    mode="outlined"
                    icon="factory"
                    onPress={() => router.push("/(tabs)/home/production" as any)}
                    style={styles.cardAction}
                  >
                    Ir a Producción
                  </Button>
                )}
              </View>
            ))}
          </>
        )}

        {plan && plan.shortages.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
              <Text style={styles.sectionTitle}>Sin de dónde surtir</Text>
            </View>
            <View style={styles.card}>
              {plan.shortages.map((item, index) => (
                <View key={item.product.id} style={[styles.itemRow, index > 0 && styles.divider]}>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemMeta}>Para: {needsText(item.needs, item.product.unit)}</Text>
                  </View>
                  <Text style={styles.qtyStatic}>{formatQuantity(item.quantity, item.product.unit)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {plan && (
          <Text style={styles.footnote}>
            Cómo se calcula: lo que vende (y consume en producción) cada sucursal al día, con más peso a lo reciente y
            según el día de la semana; los días que se agotó no cuentan. Se suma un margen por si vende más de lo
            normal y se resta lo que tiene y lo que viene en camino. Lo que no se puede mandar desde otra sucursal se
            sugiere comprar o producir.
          </Text>
        )}
      </ScrollView>

      {explain && <ExplainSheet target={explain} onClose={() => setExplain(null)} />}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  center: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: tokens.spacing[3],
  },
  loadingText: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
  },
  content: {
    width: "100%" as const,
    maxWidth: 760,
    alignSelf: "center" as const,
    padding: tokens.spacing[4],
    paddingBottom: tokens.spacing[10],
  },
  coverageRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
  },
  coverageChip: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 7,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  coverageChipActive: {
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
  },
  coverageText: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
  },
  coverageTextActive: {
    color: c.primary,
    fontWeight: "600" as const,
  },
  intro: {
    ...tokens.typography.caption,
    color: c.textSecondary,
    marginTop: tokens.spacing[3],
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[5],
    marginBottom: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
  },
  sectionHint: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: -tokens.spacing[1],
    marginBottom: tokens.spacing[2],
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: tokens.spacing[3],
    marginBottom: tokens.spacing[3],
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: tokens.spacing[2],
    marginBottom: tokens.spacing[1],
  },
  count: {
    ...tokens.typography.caption,
    color: c.textMuted,
  },
  cardTitle: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
  },
  cardSubtitle: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  money: {
    ...tokens.typography.bodyMd,
    fontWeight: "600" as const,
    color: c.text,
  },
  itemRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[2] + 2,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    ...tokens.typography.bodyMd,
    color: c.text,
  },
  itemMeta: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  link: {
    color: c.primary,
    fontWeight: "600" as const,
  },
  soldOut: {
    color: c.warning,
    fontWeight: "600" as const,
  },
  qtyBox: {
    alignItems: "flex-end" as const,
    gap: 2,
  },
  qtyRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  stepper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: tokens.radius.sm,
    overflow: "hidden" as const,
  },
  stepButton: {
    width: 30,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: c.surfaceMuted,
  },
  qtyInput: {
    width: 52,
    height: 34,
    textAlign: "center" as const,
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },
  qtyStatic: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
  },
  unit: {
    ...tokens.typography.caption,
    color: c.textMuted,
  },
  cardAction: {
    marginTop: tokens.spacing[2],
  },
  hint: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: tokens.spacing[2],
  },
  footnote: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: tokens.spacing[6],
  },
});
