/**
 * Envasado de un granel en sus presentaciones, con una barra que dice cuánto
 * granel se va y cuánto queda mientras se capturan las piezas:
 *
 *   Agua de coco · envasado 18.5 de 20 L · quedan 1.5 L
 *   Botella 1 L      [−] 10 [+]
 *   Botella ½ L      [−] 17 [+]
 *   Material: 27 Tapa R-28 · 10 Botella 1 L · 17 Botella ½ L ✓
 *
 * Si el granel no se midió (`available` null) la barra no aplica: lo que salió
 * es lo que se envasó ("cuenta lo que ves").
 */

import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import QuantityField from "./QuantityField";
import ScanSheet from "./ScanSheet";
import { contentText, countOf, findPresentation, packedContent, type Counts, type MaterialNeed } from "./packing";
import { qty, round3, shortName } from "./productionFormat";

export type LeftoverAction = "keep" | "waste";

interface Props {
  bulk: App.Entities.ProductionBulk;
  /** Granel con el que se cuenta; null = no se midió. */
  available: number | null;
  /** "salieron" (producción) o "hay" (envasado aparte). */
  availableVerb?: string;
  counts: Counts;
  onChangeCounts: (counts: Counts) => void;
  /** Material de todo el registro (varios graneles pueden usar la misma tapa). */
  materialNeeds: MaterialNeed[];
  leftover?: LeftoverAction;
  onLeftoverChange?: (value: LeftoverAction) => void;
}

export default function PresentationPacker({
  bulk,
  available,
  availableVerb = "salieron",
  counts,
  onChangeCounts,
  materialNeeds,
  leftover = "keep",
  onLeftoverChange,
}: Props) {
  const { colors } = useTheme();
  const alerts = useAlerts();
  const [scanning, setScanning] = useState(false);
  const unit = bulk.unit_abbreviation ?? "";

  const packed = packedContent(bulk, counts);
  const remaining = available == null ? null : round3(available - packed);
  const over = remaining != null && remaining < -0.0001;
  const progress = available && available > 0 ? Math.min(1, packed / available) : 0;

  const materialIds = new Set(bulk.presentations.flatMap((p) => p.materials.map((m) => m.product_id)));
  const needs = materialNeeds.filter((m) => materialIds.has(m.product_id) && m.needed > 0);
  const short = needs.filter((m) => m.short);

  const styles = useThemedStyles((c) => ({
    group: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    head: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 8 },
    track: { height: 8, borderRadius: 4, backgroundColor: c.surfaceMuted, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
    headText: { fontSize: 14, lineHeight: 20, color: c.text },
    headStrong: { fontWeight: "700" },
    divider: { height: 1, backgroundColor: c.border },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    rowMeta: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 2 },
    foot: { paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
    footText: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8, flexWrap: "wrap" },
    link: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
    linkText: { fontSize: 14, fontWeight: "600", color: c.primary },
    leftover: { marginTop: 10, gap: 8 },
    leftoverTitle: { fontSize: 14, color: c.text },
    pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
    pillText: { fontSize: 14, color: c.text },
  }));

  const setCount = (productId: number, text: string) => onChangeCounts({ ...counts, [productId]: text });

  const headline = (() => {
    if (available == null) {
      return packed > 0 ? (
        <Text style={styles.headText}>
          Envasado <Text style={styles.headStrong}>{qty(packed, unit)}</Text>. Como no mediste lo que salió, se registra eso.
        </Text>
      ) : (
        <Text style={styles.headText}>Captura cuántas piezas salieron de cada presentación.</Text>
      );
    }
    if (over) {
      return (
        <Text style={[styles.headText, { color: colors.error }]}>
          Te pasas por <Text style={styles.headStrong}>{qty(-remaining!, unit)}</Text>: {availableVerb} {qty(available, unit)} y se envasan {qty(packed, unit)}.
        </Text>
      );
    }
    return (
      <Text style={styles.headText}>
        Envasado <Text style={styles.headStrong}>{qty(packed, unit)}</Text> de {qty(available, unit)}
        {" · "}
        {remaining! > 0 ? `quedan ${qty(remaining, unit)}` : "no queda nada"}
      </Text>
    );
  })();

  const onCode = (code: string) => {
    const found = findPresentation([bulk], code);
    if (!found) return { ok: false, message: `El código ${code} no es una presentación de ${shortName(bulk.product_name)}.` };
    const next = countOf(counts, found.presentation.product_id) + 1;
    setCount(found.presentation.product_id, String(next));
    return { ok: true, message: `${found.presentation.product_name} · ${next}` };
  };

  return (
    <View>
      <View style={styles.group}>
        <View style={styles.head}>
          {available != null && (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${(over ? 1 : progress) * 100}%`, backgroundColor: over ? colors.error : colors.primary },
                ]}
              />
            </View>
          )}
          {headline}
        </View>

        {bulk.presentations.map((p) => (
          <View key={p.product_id}>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {p.product_name}
                </Text>
                <Text style={styles.rowMeta}>
                  {contentText(p)} c/u · ya hay {qty(p.stock, p.unit_abbreviation)}
                </Text>
              </View>
              <QuantityField
                value={counts[p.product_id] ?? ""}
                onChangeText={(text) => setCount(p.product_id, text)}
                unit={p.unit_abbreviation}
                steppers
                integer
                accessibilityLabel={p.product_name}
              />
            </View>
          </View>
        ))}

        {needs.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.foot}>
              <Text style={styles.footText}>
                Material: {needs.map((m) => `${qty(m.needed)} ${m.product_name}`).join(" · ")}
              </Text>
              {short.length > 0 ? (
                short.map((m) => (
                  <Text key={m.product_id} style={[styles.footText, { color: colors.error }]}>
                    No alcanza {m.product_name}: hay {qty(m.stock)} y se necesitan {qty(m.needed)}.
                  </Text>
                ))
              ) : (
                <Text style={[styles.footText, { color: colors.success }]}>Alcanza el material.</Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => setScanning(true)} style={styles.link} accessibilityRole="button">
          <MaterialCommunityIcons name="barcode-scan" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Contar con escáner</Text>
        </Pressable>
        {packed > 0 && (
          <Pressable
            onPress={async () => {
              const ok = await alerts.confirm("Se borran las piezas capturadas de este granel.", {
                title: "¿Empezar de nuevo?",
                okText: "Borrar",
                cancelText: "Volver",
              });
              if (ok) onChangeCounts({});
            }}
            style={styles.link}
            accessibilityRole="button"
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Borrar piezas</Text>
          </Pressable>
        )}
      </View>

      {onLeftoverChange && remaining != null && remaining > 0.0001 && packed > 0 && (
        <View style={styles.leftover}>
          <Text style={styles.leftoverTitle}>
            Sobran {qty(remaining, unit)} de {shortName(bulk.product_name).toLowerCase()}:
          </Text>
          <View style={styles.pills}>
            {(
              [
                ["keep", "Se queda en granel", "package-variant"],
                ["waste", "Se tiró", "delete-outline"],
              ] as const
            ).map(([value, label, icon]) => (
              <Pressable
                key={value}
                onPress={() => onLeftoverChange(value)}
                style={[styles.pill, leftover === value && styles.pillOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: leftover === value }}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={16}
                  color={leftover === value ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.pillText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <ScanSheet
        visible={scanning}
        onDismiss={() => setScanning(false)}
        title="Contar con escáner"
        hint={`Escanea la etiqueta de cada pieza de ${shortName(bulk.product_name).toLowerCase()}: se suma una por código.`}
        onCode={onCode}
      />
    </View>
  );
}
