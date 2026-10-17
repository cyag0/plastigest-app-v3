/**
 * Detalle de un ajuste de inventario, como el de Compras: arriba el producto,
 * el movimiento con su motivo y quién, cuándo y dónde; luego la existencia de
 * antes y después, los datos (de dónde salió, se puede abrir), la nota y las
 * fotos, que se abren en grande.
 *
 * Un ajuste manual se puede deshacer el mismo día (si fue un error): se
 * devuelve la existencia y el ajuste queda registrado como deshecho. Antes no
 * había cómo corregirlo, "Revertida" no aparecía y la existencia iba sin
 * unidad, en 11 renglones planos.
 */

import { ListGroup, ListSection, ListValueRow } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import StatusBadge from "@/components/App/StatusBadge";
import { SkeletonBlock, SkeletonSection } from "@/components/App/SummaryLayout";
import {
  dayTime,
  evidenceOf,
  happenedOnOtherDay,
  isReverted,
  isToday,
  originOf,
  ORIGINS,
  reasonInfo,
  revertedAt,
  round3,
  signedQuantity,
  unitOf,
  type AdjustmentRecord,
} from "@/components/Adjustments/adjustmentFormat";
import { fetchAdjustment } from "@/components/Adjustments/adjustmentRequests";
import EvidenceViewer from "@/components/Adjustments/EvidenceViewer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate } from "@/utils/dates";
import { routeForDocument } from "@/utils/documentRoutes";
import { errorMessageOf } from "@/utils/errorNotice";
import { formatQuantity } from "@/utils/format";
import { shortLocationName } from "@/utils/locations";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

/** Por qué no se puede deshacer y cómo se corrige (solo a quien registra ajustes). */
function correctionHint(record: AdjustmentRecord): string | null {
  switch (originOf(record)) {
    case "production_order":
      return "Es la merma de una orden de producción: se corrige desde la orden.";
    case "inventory_count":
      return "Lo generó un conteo de inventario. Si hay un error, registra un ajuste nuevo.";
    case "transfer":
      return "Se generó al recibir una transferencia. Si hay un error, registra un ajuste nuevo.";
    default:
      return isToday(record.created_at)
        ? null
        : "Solo se puede deshacer el mismo día. Para corregirlo, registra un ajuste nuevo.";
  }
}

export default function AdjustmentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can, canAccessRoute } = useCan();
  const { location, selectedCompany } = useAuth();
  const { isMobile } = useResponsive();
  const styles = useThemedStyles(makeStyles);
  // Candado de "Deshacer": un doble toque no lo manda dos veces.
  const { submitting, run } = useSubmitGuard();

  const [record, setRecord] = useState<AdjustmentRecord | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setProblem({ kind: "not_found", message: "" });
      return;
    }
    try {
      const data = await fetchAdjustment(id);
      setRecord(data);
      setProblem(null);
      loaded.current = true;
    } catch (e) {
      // La primera carga explica la falla en la pantalla (404, sin permiso,
      // red); después se avisa y se queda lo que ya se veía.
      if (!loaded.current) setProblem(recordLoadProblem(e, "No se pudo cargar el ajuste."));
      else alerts.error(errorMessageOf(e, "No se pudo actualizar el ajuste."));
    }
  }, [id, alerts]);

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Ajuste" });
  }, [navigation]);

  const undo = () =>
    run(async () => {
      if (!record) return;
      const unit = unitOf(record);
      const fmt = (n: number) => formatQuantity(n, unit);
      const name = record.product?.name ?? "el producto";
      const amount = fmt(record.quantity);

      // Cuánto queda al deshacerlo, con la existencia de ahora (si el ajuste
      // es de la sucursal en la que se está trabajando).
      let stockNow: number | null = null;
      if (location?.id === record.location_id) {
        try {
          const response: any = await Services.products.show(record.product_id, undefined, { silent: true });
          const product = response?.data?.data ?? response?.data;
          if (product?.current_stock != null) stockNow = Number(product.current_stock);
        } catch {
          // Sin la existencia, la confirmación no dice cuánto queda.
        }
      }
      const remaining =
        stockNow === null
          ? null
          : round3(record.direction === "out" ? stockNow + record.quantity : stockNow - record.quantity);
      if (remaining !== null && remaining < 0) {
        alerts.error(
          `Ya no hay suficiente existencia de «${name}» para deshacer esta entrada (hay ${fmt(stockNow!)}, se necesitan ${amount}).`,
        );
        return;
      }

      const effect =
        record.direction === "out"
          ? `Se devuelven ${amount} de ${name} a la existencia`
          : `Se quitan ${amount} de ${name} de la existencia`;
      const ok = await alerts.confirm(
        `${effect}${remaining !== null ? ` (quedan ${fmt(remaining)})` : ""}. El ajuste queda registrado como deshecho.`,
        { title: "¿Deshacer el ajuste?", okText: "Deshacer", cancelText: "Volver" },
      );
      if (!ok) return;
      try {
        await Services.inventoryAdjustments.undo(record.id, { silent: true });
        alerts.success("Ajuste deshecho");
      } catch (e) {
        alerts.error(errorMessageOf(e, "No se pudo deshacer el ajuste."));
      }
      // También si falló: puede que ya lo haya deshecho alguien más.
      await load();
    });

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No se encontró el ajuste"
        errorTitle="No se pudo cargar el ajuste"
        onRetry={load}
      />
    );
  }

  const contentStyle = [styles.content, !isMobile && styles.contentWide];

  if (!record) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={contentStyle}>
          <View style={styles.skeletonHeader}>
            <SkeletonBlock width={220} height={26} radius={8} />
            <SkeletonBlock width={140} height={16} />
            <SkeletonBlock width={260} height={13} />
          </View>
          <SkeletonSection rows={1} />
          <SkeletonSection rows={4} />
        </ScrollView>
      </View>
    );
  }

  const unit = unitOf(record);
  const fmt = (n: number | null | undefined) => formatQuantity(n ?? 0, unit);
  const reason = reasonInfo(record.reason_code);
  const reverted = isReverted(record);
  const origin = originOf(record);
  const photos = evidenceOf(record);
  const locationShort = record.location?.name ? shortLocationName(record.location.name, selectedCompany?.name) : null;

  // De dónde salió: la orden, el conteo o la transferencia se pueden abrir.
  const originLabel = record.origin?.label || ORIGINS[origin].label;
  const originRoute = routeForDocument(ORIGINS[origin].document, record.origin?.id ?? null);
  const openOrigin = originRoute && canAccessRoute(originRoute) ? () => router.push(originRoute as any) : undefined;

  // Quién y cuándo lo deshizo. La merma de una orden se revierte al cancelarla.
  const fromOrder = origin === "production_order";
  const revertedWhen = revertedAt(record);
  const revertedText = reverted
    ? [
        fromOrder ? "Al cancelar la orden" : null,
        record.reverted_by_user?.name,
        revertedWhen ? dayTime(revertedWhen) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Lo deshecho ya lo explica la existencia ("Al deshacerlo: se devolvieron…").
  const hint = reverted
    ? null
    : record.can_undo
      ? "Si fue un error, puedes deshacerlo hoy."
      : can("inventory_manage")
        ? correctionHint(record)
        : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={contentStyle}>
        <View style={[styles.header, !isMobile && styles.headerWide]}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">
              {record.product?.name ?? "Producto"}
            </Text>
            <Text style={styles.movementLine}>
              <Text
                style={[
                  styles.movement,
                  record.direction === "in" && styles.movementIn,
                  reverted && styles.movementMuted,
                ]}
              >
                {signedQuantity(record)}
              </Text>
              {` · ${reason.label}`}
            </Text>
            <Text style={styles.subtitle}>
              {[dayTime(record.created_at ?? record.applied_at), record.created_by_user?.name, locationShort]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {reverted && (
              <View style={styles.statusRow}>
                <View>
                  <StatusBadge label="Deshecho" />
                </View>
                {!!revertedText && <Text style={styles.statusText}>{revertedText}</Text>}
              </View>
            )}
            {!!hint && <Text style={styles.hint}>{hint}</Text>}
          </View>

          {record.can_undo && !reverted && (
            <View style={isMobile ? styles.headerActionPhone : undefined}>
              <Button mode="outlined" icon="undo-variant" onPress={undo} loading={submitting} disabled={submitting}>
                Deshacer ajuste
              </Button>
            </View>
          )}
        </View>

        <ListSection title="Existencia">
          <ListGroup inset={14}>
            <View style={styles.stockRow}>
              <View style={styles.stockCol}>
                <Text style={styles.stockLabel}>Antes</Text>
                <Text style={styles.stockValue}>{fmt(record.previous_stock)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} style={styles.stockArrow} />
              <View style={styles.stockCol}>
                <Text style={styles.stockLabel}>Después</Text>
                <Text style={styles.stockValue}>{fmt(record.new_stock)}</Text>
              </View>
            </View>
            {reverted && (
              <ListValueRow
                label={fromOrder ? "Al cancelar la orden" : "Al deshacerlo"}
                value={`${record.direction === "out" ? "Se devolvieron" : "Se quitaron"} ${fmt(record.quantity)}`}
              />
            )}
          </ListGroup>
        </ListSection>

        <ListSection title="Datos">
          <ListGroup inset={14}>
            <ListValueRow label="Motivo" value={reason.label} />
            {openOrigin ? (
              <Pressable
                onPress={openOrigin}
                style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.surfaceMuted }]}
                accessibilityRole="link"
                accessibilityLabel={`De dónde salió: ${originLabel}. Abrir`}
              >
                <Text style={styles.linkLabel}>De dónde salió</Text>
                <View style={styles.linkValue}>
                  <Text style={styles.linkText}>{originLabel}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
                </View>
              </Pressable>
            ) : (
              <ListValueRow label="De dónde salió" value={originLabel} />
            )}
            {happenedOnOtherDay(record) && (
              <ListValueRow label="Fecha en que pasó" value={formatDate(record.applied_at)} />
            )}
            {!!record.created_by_user?.name && <ListValueRow label="Registró" value={record.created_by_user.name} />}
            {!!record.location?.name && <ListValueRow label="Sucursal" value={record.location.name} />}
            {!!record.product?.code && <ListValueRow label="Código" value={record.product.code} />}
          </ListGroup>
        </ListSection>

        {!!record.notes?.trim() && (
          <ListSection title="Nota">
            <Text style={styles.notes} selectable>
              {record.notes.trim()}
            </Text>
          </ListSection>
        )}

        {photos.length > 0 && (
          <ListSection title="Fotos" count={photos.length}>
            <View style={styles.photos}>
              {photos.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  onPress={() => setPhoto(index)}
                  style={({ pressed }) => [styles.photo, pressed && { opacity: 0.8 }]}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Ver foto ${index + 1} de ${photos.length}`}
                >
                  <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </ListSection>
        )}
      </ScrollView>

      <EvidenceViewer photos={photos} index={photo} onChange={setPhoto} onClose={() => setPhoto(null)} />
    </View>
  );
}

const PHOTO = 96;

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 40, gap: 22 },
  contentWide: { padding: 28, maxWidth: 680 + 56, width: "100%", alignSelf: "center" },

  // Encabezado sin tarjeta, como el detalle de Compras: la acción va a la
  // derecha en pantallas anchas y debajo en el teléfono.
  header: { gap: 14 },
  headerWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 14,
  },
  headerText: { gap: 4, flexShrink: 1, minWidth: 0 },
  headerActionPhone: { alignSelf: "stretch" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
  movementLine: { fontSize: 16, lineHeight: 22, color: c.textSecondary },
  movement: { fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
  movementIn: { color: c.successStrong },
  movementMuted: { color: c.textMuted, textDecorationLine: "line-through" },
  subtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  statusRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 6, marginTop: 6 },
  statusText: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },

  stockRow: { flexDirection: "row", alignItems: "flex-end", gap: 16, paddingHorizontal: 14, paddingVertical: 12 },
  stockCol: { gap: 2 },
  stockLabel: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  stockValue: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: c.text, fontVariant: ["tabular-nums"] },
  stockArrow: { marginBottom: 3 },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  linkLabel: { fontSize: 14, lineHeight: 20, color: c.textSecondary, flexShrink: 0 },
  linkValue: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 1 },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primary, textAlign: "right", flexShrink: 1 },

  notes: { fontSize: 14, lineHeight: 20, color: c.text },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: PHOTO, height: PHOTO, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  photoImage: { width: "100%", height: "100%", backgroundColor: c.surfaceMuted },

  skeletonHeader: { gap: 8 },
}));
