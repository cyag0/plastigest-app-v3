import { goBack } from "@/utils/navigation";
import AppInput from "@/components/Form/AppInput";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

/**
 * Paso de empaque de una orden de producción.
 *
 * Sólo se llega aquí con la producción ya completada: hasta entonces el granel
 * no existe en inventario y no hay nada que empacar. Por cada salida de la
 * orden se listan los productos terminados que se obtienen de ella, con el
 * tope real de unidades — lo marca el insumo más escaso, sea el granel o el
 * material de empaque.
 */
export default function ProductionPackaging() {
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = parseInt(params.id, 10);
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useStyles();

  const [plan, setPlan] = useState<App.Entities.PackagingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Cantidad capturada por producto terminado, como texto del input. */
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const loadPlan = useCallback(async () => {
    try {
      const r: any = await Services.productionOrders.getPackagingPlan(orderId);
      setPlan(r?.data ?? null);
    } catch (e: any) {
      alerts.error("No se pudo cargar el empaque: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, alerts]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  /** Filas capturadas con cantidad > 0. */
  const pending = useMemo(() => {
    return Object.entries(quantities)
      .map(([productId, raw]) => ({
        product_id: Number(productId),
        quantity: Number(raw),
      }))
      .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);
  }, [quantities]);

  const handlePack = async () => {
    if (pending.length === 0) {
      alerts.error("Captura cuántas unidades vas a empacar.");
      return;
    }

    const total = pending.reduce((a, b) => a + b.quantity, 0);
    const ok = await alerts.confirm(
      `Se empacarán ${total.toLocaleString("es-MX")} unidades.\n\nSe descontará el granel y el material de empaque, y se dará de alta el producto terminado.`,
      { title: "Confirmar empaque", okText: "Empacar" },
    );
    if (!ok) return;

    try {
      setSaving(true);
      await Services.productionOrders.pack(orderId, pending);
      alerts.success("Empaque registrado · Stock actualizado");
      setQuantities({});
      await loadPlan();
    } catch (e: any) {
      const data = e?.response?.data;
      alerts.error(
        "No se pudo empacar. " +
          (data?.error || data?.message || e?.message || "Error desconocido"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (packaging: App.Entities.ProductionOrderPackaging) => {
    const ok = await alerts.confirm(
      `¿Revertir el empaque de ${packaging.quantity} ${packaging.product_name}? Se devolverá el granel y el material.`,
      { title: "Revertir empaque", okText: "Sí, revertir", cancelText: "Volver" },
    );
    if (!ok) return;

    try {
      setSaving(true);
      await Services.productionOrders.revertPackaging(orderId, packaging.id);
      alerts.success("Empaque revertido · Stock devuelto");
      await loadPlan();
    } catch (e: any) {
      const data = e?.response?.data;
      alerts.error(
        "No se pudo revertir. " + (data?.error || data?.message || e?.message),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    const ok = await alerts.confirm(
      "Al cerrar el empaque la orden queda como empacada y ya no admite más empaques. ¿Continuar?",
      { title: "Cerrar empaque", okText: "Cerrar" },
    );
    if (!ok) return;

    try {
      setSaving(true);
      await Services.productionOrders.finishPackaging(orderId);
      alerts.success("Empaque cerrado");
      goBack();
    } catch (e: any) {
      const data = e?.response?.data;
      alerts.error(
        "No se pudo cerrar. " + (data?.error || data?.message || e?.message),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Cargando empaque…</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No se encontró el empaque de esta orden.</Text>
      </View>
    );
  }

  const registered = plan.packagings ?? [];
  const packable = plan.lines.filter((l) => l.products.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!plan.can_pack ? (
        <Banner
          icon="lock-outline"
          color={colors.warning}
          title={`Empaque cerrado · ${plan.status_label}`}
          text={
            plan.status === "packed"
              ? "Esta orden ya se cerró. Para empacar más, crea una nueva producción."
              : "El empaque sólo está disponible cuando la producción está terminada."
          }
        />
      ) : null}

      {/* ───────── Lo que se puede empacar ───────── */}
      {plan.can_pack ? (
        packable.length === 0 ? (
          <Banner
            icon="package-variant-closed-remove"
            color={colors.textSecondary}
            title="Nada por empacar"
            text="Ninguno de los productos de esta orden tiene receta de empaque. Configúrala en el producto terminado: de qué granel sale y qué material lleva."
          />
        ) : (
          packable.map((line) => (
            <View key={line.source_product_id} style={styles.card}>
              <View style={styles.sourceHeader}>
                <View style={[styles.sourceIcon, { backgroundColor: colors.chart4 + "1F" }]}>
                  <Icon source="pot-steam" size={18} color={colors.chart4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceTitle}>{line.source_product_name}</Text>
                  <Text style={styles.sourceSubtitle}>
                    {fmt(line.remaining_quantity)} sin empacar de {fmt(line.produced_quantity)}{" "}
                    {line.source_unit_name ?? ""}
                  </Text>
                </View>
              </View>

              {line.products.map((option) => (
                <PackagingOption
                  key={option.product_id}
                  option={option}
                  value={quantities[option.product_id] ?? ""}
                  onChange={(text) =>
                    setQuantities((prev) => ({ ...prev, [option.product_id]: text }))
                  }
                />
              ))}
            </View>
          ))
        )
      ) : null}

      {/* ───────── Empaques ya registrados ───────── */}
      {registered.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sourceHeader}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.success + "1F" }]}>
              <Icon source="package-check" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>Empacado</Text>
              <Text style={styles.sourceSubtitle}>
                {registered.length} operación{registered.length === 1 ? "" : "es"} registrada
                {registered.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          {registered.map((packaging) => (
            <View key={packaging.id} style={styles.registeredRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.registeredTitle}>
                  {fmt(packaging.quantity)} {packaging.unit_name} · {packaging.product_name}
                </Text>
                <Text style={styles.registeredMeta}>
                  {packaging.source_product_name
                    ? `${fmt(packaging.source_quantity ?? 0)} ${packaging.source_unit_name ?? ""} de ${packaging.source_product_name}`
                    : "Sin granel de origen"}
                  {packaging.materials?.length
                    ? ` · ${packaging.materials
                        .map((m) => `${fmt(m.quantity)} ${m.product_name}`)
                        .join(", ")}`
                    : ""}
                </Text>
              </View>

              {plan.can_pack ? (
                <Button
                  mode="text"
                  compact
                  textColor={colors.error}
                  disabled={saving}
                  onPress={() => handleRevert(packaging)}
                >
                  Revertir
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {plan.can_pack ? (
        <View style={styles.actionBar}>
          <Button
            mode="outlined"
            onPress={handleFinish}
            disabled={saving}
            style={{ flex: 1 }}
            icon="lock-check"
          >
            Cerrar empaque
          </Button>
          <Button
            mode="contained"
            onPress={handlePack}
            loading={saving}
            disabled={saving || pending.length === 0}
            style={{ flex: 1.4 }}
            icon="package-variant-closed"
          >
            Empacar
          </Button>
        </View>
      ) : (
        <Button mode="outlined" onPress={() => goBack()} style={{ marginTop: tokens.spacing[2] }}>
          Volver
        </Button>
      )}
    </ScrollView>
  );
}

/**
 * Un producto terminado que puede salir del granel, con su receta y el tope
 * de unidades que alcanzan con el stock actual.
 */
function PackagingOption({
  option,
  value,
  onChange,
}: {
  option: App.Entities.PackagingPlanOption;
  value: string;
  onChange: (text: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  const max = option.max_units;
  const requested = Number(value);
  const exceedsMax =
    max !== null && Number.isFinite(requested) && requested > max;

  return (
    <View style={styles.option}>
      <View style={styles.optionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{option.product_name}</Text>
          <Text style={styles.optionSubtitle}>
            {option.source_quantity_per_unit > 0
              ? `${fmt(option.source_quantity_per_unit)} ${option.source_unit_name ?? ""} de granel por unidad`
              : "Sin consumo de granel"}
          </Text>
        </View>

        <View style={styles.qtyWrap}>
          <AppInput
            value={value}
            onChange={onChange}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.limitRow}>
        <Icon
          source={exceedsMax ? "alert-circle-outline" : "check-circle-outline"}
          size={14}
          color={exceedsMax ? colors.error : colors.textSecondary}
        />
        <Text
          style={[
            styles.limitText,
            exceedsMax && { color: colors.error, fontWeight: "600" },
          ]}
        >
          {max === null
            ? "Sin límite calculable"
            : exceedsMax
              ? `Sólo alcanza para ${max} — ajusta la cantidad`
              : `Alcanza para ${max} unidades`}
        </Text>
      </View>

      {option.materials.length > 0 ? (
        <View style={styles.materials}>
          {option.materials.map((material) => {
            const needed = Number.isFinite(requested) && requested > 0
              ? requested * material.quantity_per_unit
              : 0;
            const short = needed > material.available_stock;

            return (
              <View key={material.product_id} style={styles.materialRow}>
                <Text style={styles.materialName} numberOfLines={1}>
                  {material.product_name}
                </Text>
                <Text style={styles.materialQty}>
                  {fmt(material.quantity_per_unit)} c/u
                </Text>
                <Text
                  style={[
                    styles.materialStock,
                    short && { color: colors.error, fontWeight: "600" },
                  ]}
                >
                  {needed > 0 ? `${fmt(needed)} / ` : ""}
                  {fmt(material.available_stock)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Banner({
  icon,
  color,
  title,
  text,
}: {
  icon: string;
  color: string;
  title: string;
  text: string;
}) {
  const styles = useStyles();

  return (
    <View style={[styles.banner, { borderLeftColor: color }]}>
      <Icon source={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color }]}>{title}</Text>
        <Text style={styles.bannerText}>{text}</Text>
      </View>
    </View>
  );
}

const fmt = (n: number) =>
  Number(n ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 3 });

function useStyles() {
  return useThemedStyles((colors) => ({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: tokens.spacing[2] },
    muted: { ...tokens.typography.body, color: colors.textSecondary },
    scroll: {
      padding: tokens.spacing[3],
      paddingBottom: tokens.spacing[10],
      maxWidth: 700,
      width: "100%",
      alignSelf: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    sourceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingBottom: tokens.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: tokens.spacing[3],
    },
    sourceIcon: {
      width: 34,
      height: 34,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceTitle: { ...tokens.typography.h3, color: colors.text },
    sourceSubtitle: { ...tokens.typography.caption, color: colors.textSecondary },
    option: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: tokens.radius.md,
      padding: tokens.spacing[3],
      marginBottom: tokens.spacing[2],
    },
    optionHeader: { flexDirection: "row", alignItems: "center", gap: tokens.spacing[3] },
    optionTitle: { ...tokens.typography.bodyMd, color: colors.text },
    optionSubtitle: { ...tokens.typography.caption, color: colors.textSecondary },
    qtyWrap: { width: 96 },
    limitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[2],
    },
    limitText: { ...tokens.typography.caption, color: colors.textSecondary, flex: 1 },
    materials: {
      marginTop: tokens.spacing[2],
      paddingTop: tokens.spacing[2],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 2,
    },
    materialRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing[2] },
    materialName: { ...tokens.typography.caption, color: colors.text, flex: 1 },
    materialQty: { ...tokens.typography.caption, color: colors.textMuted, width: 70, textAlign: "right" as const },
    materialStock: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      width: 96,
      textAlign: "right" as const,
      fontVariant: ["tabular-nums"] as const,
    },
    registeredRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      paddingVertical: tokens.spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    registeredTitle: { ...tokens.typography.bodyMd, color: colors.text },
    registeredMeta: { ...tokens.typography.caption, color: colors.textSecondary },
    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[3],
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
    },
    bannerTitle: { ...tokens.typography.bodyMd },
    bannerText: { ...tokens.typography.caption, color: colors.textSecondary },
    actionBar: { flexDirection: "row", gap: tokens.spacing[3], marginTop: tokens.spacing[1] },
  }));
}
