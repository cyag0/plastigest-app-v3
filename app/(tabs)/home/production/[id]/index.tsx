/**
 * Detalle de una producción o de un envasado.
 *
 * Arriba qué fue y en qué quedó; luego el rendimiento (litros de agua por
 * coco contra lo esperado), qué entró, qué salió, qué se envasó y la merma.
 * Un pendiente se registra o se continúa desde aquí; imprimir la hoja y
 * cancelar van en el menú ⋮.
 */

import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import { dayTitle, lineText, meaningfulYields, piecesYield, qty, shortName, yieldComparison, yieldText } from "@/components/Production/productionFormat";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import { printPdf } from "@/utils/printDocument";
import Services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

export default function ProductionDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can } = useCan();
  const canUpdate = can("production_orders_update");
  const canCreate = can("production_orders_create");

  const [order, setOrder] = useState<App.Entities.ProductionOrder | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [busy, setBusy] = useState<null | "complete" | "cancel" | "print">(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const r: any = await Services.productionOrders.show(id, undefined, { silent: true });
      setOrder(r?.data?.data ?? r?.data);
      setProblem(null);
      loaded.current = true;
    } catch (e) {
      if (!loaded.current) setProblem(recordLoadProblem(e, "No se pudo cargar la producción."));
      else alerts.error(errorMessageOf(e, "No se pudo actualizar la producción."));
    }
  }, [id, alerts]);

  // Al volver de continuar un pendiente, se ve lo guardado.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const complete = async () => {
    if (!order || busy) return;
    const ok = await alerts.confirm("Se descuentan los insumos, se suma lo que salió y se aplica el envasado.", {
      title: "¿Registrar la producción?",
      okText: "Registrar",
      cancelText: "Volver",
    });
    if (!ok) return;
    try {
      setBusy("complete");
      await Services.productionOrders.complete(order.id);
      alerts.success("Producción registrada");
      await load();
    } catch {
      // El aviso global dice qué faltó (stock, material…).
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!order || busy) return;
    const produced = order.status !== "draft";
    const ok = await alerts.confirm(
      produced
        ? "Se devuelve lo que se usó, se retira lo que salió y se deshace el envasado."
        : "El pendiente queda cancelado; no se movió inventario.",
      { title: `¿Cancelar ${order.folio}?`, okText: "Sí, cancelar", cancelText: "Volver" },
    );
    if (!ok) return;
    try {
      setBusy("cancel");
      await Services.productionOrders.cancel(order.id);
      alerts.success(produced ? "Producción cancelada y stock devuelto" : "Pendiente cancelado");
      await load();
    } catch {
      // Aviso global (p. ej. ya se vendió lo envasado).
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    if (!order || busy) return;
    try {
      setBusy("print");
      const url = await Services.print.productionSheetUrl(order.id);
      await printPdf(url, `hoja-produccion-${order.folio}.pdf`);
    } catch (e) {
      alerts.error(errorMessageOf(e, "No se pudo generar la hoja de producción."));
    } finally {
      setBusy(null);
    }
  };

  const menu: RowMenuAction[] = order
    ? [
        ...(order.status !== "cancelled" ? [{ label: "Imprimir hoja", icon: "printer" as const, onPress: print }] : []),
        ...(canUpdate && order.status !== "cancelled"
          ? [{ label: order.status === "draft" ? "Cancelar pendiente" : "Cancelar producción", icon: "cancel" as const, onPress: cancel, destructive: true }]
          : []),
      ]
    : [];

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerRight: () => (menu.length ? <RowMenu actions={menu} /> : null) });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, order?.status, canUpdate]),
  );

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, paddingBottom: 40, gap: 22, maxWidth: 680, width: "100%", alignSelf: "center" },
    header: { gap: 4 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 14, color: c.textSecondary },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    status: { fontSize: 14, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    action: { flexGrow: 1, flexBasis: 150 },
    notes: { fontSize: 14, lineHeight: 20, color: c.text },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  }));

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No se encontró la producción"
        errorTitle="No se pudo cargar la producción"
        onRetry={load}
      />
    );
  }
  if (!order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const draft = order.status === "draft";
  const cancelled = order.status === "cancelled";
  const statusColor = draft ? colors.warning : cancelled ? colors.error : colors.success;
  const statusText = draft
    ? "Pendiente de registrar: todavía no mueve inventario"
    : cancelled
      ? "Cancelada: el inventario se devolvió"
      : order.kind === "packaging"
        ? "Envasado registrado"
        : "Registrada";
  const yields = meaningfulYields(order.yields);
  const pieces = yields.length === 0 ? piecesYield(order.yields) : null;
  const packagings = order.packagings ?? [];
  const planned = order.planned_packagings ?? [];
  const wastes = (order.wastes ?? []).filter((w) => !w.reverted || cancelled);
  // El granel que salió: lo que no se envasó se envasa después desde «Envasar».
  const bulkOutputs = (order.outputs ?? []).filter((o) => o.is_bulk);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{order.title}</Text>
          <Text style={styles.subtitle}>
            {[order.folio, dayTitle(order.production_date), order.responsible_name].filter(Boolean).join(" · ")}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {draft && canUpdate && (
          <View style={styles.actions}>
            <Button mode="contained" icon="check" onPress={complete} loading={busy === "complete"} disabled={!!busy} style={styles.action}>
              Registrar
            </Button>
            <Button
              mode="outlined"
              icon="pencil-outline"
              onPress={() => router.push(`/(tabs)/home/production/${order.id}/edit` as any)}
              disabled={!!busy}
              style={styles.action}
            >
              Continuar
            </Button>
          </View>
        )}

        {(yields.length > 0 || !!pieces) && !cancelled && (
          <ListSection title="Rendimiento">
            <ListGroup inset={14}>
              {!!pieces && <ListRow title={pieces} chevron={false} />}
              {yields.map((y) => (
                <ListRow
                  key={y.product_id}
                  title={yieldText(y)}
                  titleLines={2}
                  subtitle={yieldComparison(y) ?? undefined}
                  warning={y.variance_pct != null && y.variance_pct <= -10 ? "Rindió bastante menos de lo esperado" : undefined}
                  chevron={false}
                />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {!!order.consumptions?.length && (
          <ListSection title={draft ? "Se va a usar" : "Entró"}>
            <ListGroup inset={14}>
              {order.consumptions.map((c) => (
                <ListRow key={c.id ?? c.product_id} title={c.product_name ?? "Insumo"} subtitle={qty(c.quantity, c.unit_abbreviation)} chevron={false} />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {!!order.outputs?.length && (
          <ListSection title={draft ? "Va a salir" : "Salió"}>
            <ListGroup inset={14}>
              {order.outputs.map((o) => (
                <ListRow
                  key={o.id ?? o.product_id}
                  title={o.product_name ?? "Producto"}
                  subtitle={qty(o.quantity, o.unit_abbreviation)}
                  meta={o.expected_quantity ? `Esperado ${qty(o.expected_quantity, o.unit_abbreviation)}` : undefined}
                  chevron={false}
                />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {packagings.length > 0 && (
          <ListSection title="Envasado">
            <ListGroup inset={14}>
              {packagings.map((p) => (
                <ListRow
                  key={p.id}
                  title={p.product_name ?? "Presentación"}
                  subtitle={`${qty(p.quantity, p.unit_abbreviation)}${
                    p.source_product_name ? ` · ${qty(p.source_quantity, p.source_unit_abbreviation)} de ${shortName(p.source_product_name).toLowerCase()}` : ""
                  }`}
                  meta={p.materials?.length ? p.materials.map((m) => lineText(m)).join(" · ") : undefined}
                  chevron={false}
                />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {draft && planned.length > 0 && (
          <ListSection title="Se va a envasar">
            <ListGroup inset={14}>
              {planned.map((p) => (
                <ListRow key={p.product_id} title={p.product_name ?? "Presentación"} subtitle={qty(p.quantity, p.unit_abbreviation)} chevron={false} />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {wastes.length > 0 && (
          <ListSection title="Merma">
            <ListGroup inset={14}>
              {wastes.map((w, i) => (
                <ListRow
                  key={w.id ?? i}
                  title={w.product_name ?? "Producto"}
                  subtitle={qty(w.quantity, w.unit_abbreviation)}
                  meta={(w.notes ?? "").replace(/^\[[^\]]*\]\s*/, "") || w.reason_label || undefined}
                  chevron={false}
                />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {order.status === "completed" && order.kind === "process" && bulkOutputs.length > 0 && canCreate && (
          <ListSection title="¿Quedó granel?">
            <ListGroup>
              {bulkOutputs.map((o) => (
                <ListRow
                  key={o.product_id}
                  icon="package-variant"
                  title={`Envasar ${shortName(o.product_name).toLowerCase()}`}
                  subtitle="Lo que no se envasó sigue en inventario"
                  onPress={() => router.push(`/(tabs)/home/production/pack?source=${o.product_id}` as any)}
                />
              ))}
            </ListGroup>
          </ListSection>
        )}

        {!!order.notes && (
          <ListSection title="Notas">
            <Text style={styles.notes}>{order.notes}</Text>
          </ListSection>
        )}

        {cancelled && order.cancelled_at && (
          <Text style={styles.hint}>Se canceló el {new Date(order.cancelled_at).toLocaleString("es-MX")}.</Text>
        )}
      </ScrollView>
    </View>
  );
}
