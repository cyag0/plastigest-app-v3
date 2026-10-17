/**
 * Envasar granel guardado: el agua que quedó de la mañana, la tuba o el
 * rallado de ayer. Se elige el granel, se cuentan las piezas de cada
 * presentación con la barra de lo que queda, y se registra como un envasado
 * (orden de tipo packaging): descuenta granel y material, suma las piezas.
 *
 * Con ?source=<id del granel> abre directo en ese granel (desde el detalle de
 * una producción: "Envasar lo que quedó").
 */

import { ListGroup, ListRow } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import PresentationPacker, { type LeftoverAction } from "@/components/Production/PresentationPacker";
import { materialNeeds, packagingLines, packedContent, type Counts } from "@/components/Production/packing";
import { qty, round3, shortName } from "@/components/Production/productionFormat";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { toLocalDateString } from "@/utils/dates";
import { errorMessageOf } from "@/utils/errorNotice";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

export default function PackScreen() {
  const params = useLocalSearchParams<{ source?: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [data, setData] = useState<App.Entities.ProductionInitialData | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [bulkId, setBulkId] = useState<number | null>(params.source ? Number(params.source) : null);
  const [counts, setCounts] = useState<Counts>({});
  const [leftover, setLeftover] = useState<LeftoverAction>("keep");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProblem(null);
        const initial = await Services.productionOrders.getInitialData({ silent: true });
        if (!cancelled) setData(initial);
      } catch (e) {
        if (!cancelled) setProblem(recordLoadProblem(e, "No se pudo cargar el envasado."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const bulks = useMemo(
    () => [...(data?.bulks ?? [])].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.product_name.localeCompare(b.product_name)),
    [data],
  );
  const bulk = bulks.find((b) => b.product_id === bulkId) ?? null;
  const packed = bulk ? packedContent(bulk, counts) : 0;
  const remaining = bulk ? round3(bulk.stock - packed) : 0;
  const needs = bulk ? materialNeeds([bulk], { [bulk.product_id]: counts }) : [];
  const blockers = [
    ...(packed <= 0 ? ["Captura cuántas piezas envasaste."] : []),
    ...(bulk && remaining < -0.0001 ? [`Solo hay ${qty(bulk.stock, bulk.unit_abbreviation)} de ${shortName(bulk.product_name).toLowerCase()}.`] : []),
    ...needs.filter((m) => m.short).map((m) => `No alcanza ${m.product_name}: hay ${qty(m.stock)} y se necesitan ${qty(m.needed)}.`),
  ];

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, paddingBottom: 120, gap: 18, maxWidth: 680, width: "100%", alignSelf: "center" },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.errorSoft },
    errorText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.error },
    footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
    footerInner: { flexDirection: "row", gap: 10, padding: 12, maxWidth: 680, width: "100%", alignSelf: "center" },
  }));

  const save = async () => {
    if (!bulk || saving) return;
    if (blockers.length) {
      setError(blockers[0]);
      return;
    }
    const responsible = data?.responsibles.find((r) => r.id === Number(user?.id));
    try {
      setSaving(true);
      setError(null);
      const order = await Services.productionOrders.save({
        kind: "packaging",
        production_date: toLocalDateString(),
        responsible_user_id: responsible?.id ?? null,
        packagings: packagingLines({ [bulk.product_id]: counts }),
        wastes:
          leftover === "waste" && remaining > 0.0001
            ? [{ product_id: bulk.product_id, unit_id: bulk.unit_id, quantity: remaining, reason: "process_loss", notes: "Sobrante del envasado" }]
            : [],
        affect_stock: true,
      });
      alerts.success(`Envasado registrado: ${shortName(bulk.product_name)}`);
      router.replace(`/(tabs)/home/production/${order.id}` as any);
    } catch (e) {
      setError(errorMessageOf(e, "No se pudo registrar el envasado."));
    } finally {
      setSaving(false);
    }
  };

  if (problem) {
    return <RecordLoadError problem={problem} errorTitle="No se pudo abrir el envasado" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!bulk ? (
          <>
            <View>
              <Text style={styles.title}>¿Qué vas a envasar?</Text>
              <Text style={styles.subtitle}>Granel que está en la sucursal</Text>
            </View>
            {bulks.length === 0 ? (
              <Text style={styles.hint}>
                No hay graneles con presentaciones. Configura en cada producto de qué granel sale y cuánto lleva (Inventario → producto → Presentación).
              </Text>
            ) : (
              <ListGroup>
                {bulks.map((b) => (
                  <ListRow
                    key={b.product_id}
                    icon="package-variant"
                    iconColor={b.stock > 0 ? colors.primary : colors.textMuted}
                    title={b.product_name}
                    subtitle={b.stock > 0 ? `Hay ${qty(b.stock, b.unit_abbreviation)}` : "Sin existencia"}
                    meta={`${b.presentations.length} ${b.presentations.length === 1 ? "presentación" : "presentaciones"}`}
                    onPress={
                      b.stock > 0
                        ? () => {
                            setBulkId(b.product_id);
                            setCounts({});
                            setLeftover("keep");
                            setError(null);
                          }
                        : undefined
                    }
                  />
                ))}
              </ListGroup>
            )}
          </>
        ) : (
          <>
            <View>
              <Text style={styles.title}>Envasar {shortName(bulk.product_name).toLowerCase()}</Text>
              <Text style={styles.subtitle}>
                Hay {qty(bulk.stock, bulk.unit_abbreviation)} en la sucursal
                {bulks.length > 1 && !params.source ? " · " : ""}
                {bulks.length > 1 && !params.source && (
                  <Text style={{ color: colors.primary, fontWeight: "600" }} onPress={() => setBulkId(null)}>
                    Cambiar
                  </Text>
                )}
              </Text>
            </View>

            <PresentationPacker
              bulk={bulk}
              available={bulk.stock}
              availableVerb="hay"
              counts={counts}
              onChangeCounts={setCounts}
              materialNeeds={needs}
              leftover={leftover}
              onLeftoverChange={setLeftover}
            />

            {(error || (packed > 0 && blockers.length > 0)) && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error ?? blockers[0]}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Button mode="outlined" onPress={() => goBack("/(tabs)/home/production")} style={{ flex: 1 }}>
            Cancelar
          </Button>
          {bulk && (
            <Button mode="contained" onPress={save} loading={saving} disabled={saving || blockers.length > 0} style={{ flex: 1.4 }} icon="check">
              Registrar envasado
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
