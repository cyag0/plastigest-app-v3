/**
 * Un proceso: qué entra y qué sale cada vez que se corre.
 *
 *   Abrir cocos
 *   Entra:  1 pz Coco Entero            (el principal: contra él se mide el rendimiento)
 *   Sale:   0.6 L Agua de coco (granel)  → se envasa en Botella 1 L, ½ L, Galón…
 *           0.15 kg Pulpa de coco (granel)
 *
 * Las cantidades son por tanda y sirven para el rendimiento esperado; un
 * resultado en 0 solo aparece en la lista al registrar (los dulces). El
 * material de empaque no va aquí: está en la presentación de cada producto.
 */

import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import ProductPickerSheet, { type PickedProduct } from "@/components/Production/ProductPickerSheet";
import QuantityField from "@/components/Production/QuantityField";
import { qty, shortName, toNumber } from "@/components/Production/productionFormat";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";

interface Line {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_abbreviation?: string | null;
  qty: string;
  is_bulk?: boolean;
  presentations?: App.Entities.FormulaOutput["presentations"];
}

export default function ProcessForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? parseInt(params.id, 10) : undefined;
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can } = useCan();
  const canSave = can(id ? "formulas_update" : "formulas_create");
  const canEditProducts = can("products_update");

  const [loaded, setLoaded] = useState(!id);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<Line[]>([]);
  const [outputs, setOutputs] = useState<Line[]>([]);
  const [picker, setPicker] = useState<null | "item" | "output">(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setProblem(null);
        const r: any = await Services.formulas.show(id, undefined, { silent: true });
        const f: App.Entities.Formula = r?.data?.data ?? r?.data;
        setName(f.name);
        setDescription(f.description ?? "");
        setActive(!!f.is_active);
        setItems(
          (f.items ?? []).map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name ?? "Insumo",
            unit_id: i.unit_id,
            unit_abbreviation: i.unit_abbreviation,
            qty: i.expected_quantity ? String(i.expected_quantity) : "",
          })),
        );
        setOutputs(
          (f.outputs ?? []).map((o) => ({
            product_id: o.product_id,
            product_name: o.product_name ?? "Producto",
            unit_id: o.unit_id,
            unit_abbreviation: o.unit_abbreviation,
            qty: o.expected_quantity ? String(o.expected_quantity) : "",
            is_bulk: o.is_bulk,
            presentations: o.presentations,
          })),
        );
        setLoaded(true);
      } catch (e) {
        setProblem(recordLoadProblem(e, "No se pudo cargar el proceso."));
      }
    })();
  }, [id, attempt]);

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, paddingBottom: 120, gap: 22, maxWidth: 680, width: "100%", alignSelf: "center" },
    field: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    area: {
      minHeight: 88,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      textAlignVertical: "top",
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
    body: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    rowMeta: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 2 },
    presentations: { marginTop: 4, gap: 2 },
    presentation: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    link: { color: c.primary, fontWeight: "600" },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    summary: { fontSize: 14, lineHeight: 20, color: c.text },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
    errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.errorSoft },
    errorText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.error },
    footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
    footerInner: { flexDirection: "row", gap: 10, padding: 12, maxWidth: 680, width: "100%", alignSelf: "center" },
  }));

  const toPayload = () => ({
    name: name.trim(),
    description: description.trim() || null,
    is_active: active,
    items: items.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, expected_quantity: toNumber(l.qty) ?? 0 })),
    outputs: outputs.map((l, i) => ({
      product_id: l.product_id,
      unit_id: l.unit_id,
      expected_quantity: toNumber(l.qty) ?? 0,
      is_primary: i === 0,
    })),
  });

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return setError("Ponle nombre al proceso (por ejemplo, «Abrir cocos»).");
    if (items.length === 0) return setError("Agrega al menos lo que entra.");
    if (outputs.length === 0) return setError("Agrega al menos lo que sale.");
    try {
      setSaving(true);
      setError(null);
      if (id) await Services.formulas.update(id, toPayload() as any);
      else await Services.formulas.store(toPayload() as any);
      alerts.success("Proceso guardado");
      goBack("/(tabs)/home/production/formulas");
    } catch (e) {
      setError(errorMessageOf(e, "No se pudo guardar el proceso."));
    } finally {
      setSaving(false);
    }
  };

  if (problem) {
    return <RecordLoadError problem={problem} notFoundTitle="No se encontró el proceso" errorTitle="No se pudo cargar el proceso" onRetry={() => setAttempt((n) => n + 1)} />;
  }
  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const main = items[0];
  const mainQty = toNumber(main?.qty);
  const expectedOutputs = outputs.filter((o) => (toNumber(o.qty) ?? 0) > 0);

  const lineRow = (line: Line, index: number, list: "item" | "output") => {
    const setList = list === "item" ? setItems : setOutputs;
    return (
      <View key={line.product_id}>
        <View style={styles.row}>
          <View style={styles.body}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {line.product_name}
            </Text>
            {index === 0 && <Text style={styles.rowMeta}>{list === "item" ? "Principal: contra él se mide el rendimiento" : "Principal"}</Text>}
            {list === "output" && !!line.presentations?.length && (
              <View style={styles.presentations}>
                <Text style={styles.presentation}>Se envasa en:</Text>
                {line.presentations.map((p) => (
                  <Text key={p.product_id} style={styles.presentation}>
                    ·{" "}
                    <Text
                      style={canEditProducts ? styles.link : undefined}
                      onPress={canEditProducts ? () => router.push(`/(tabs)/inventory/products/${p.product_id}/edit` as any) : undefined}
                    >
                      {p.product_name}
                    </Text>
                    {" — "}
                    {qty(p.content, p.content_unit_abbreviation)}
                    {p.materials.length ? ` + ${p.materials.map((m) => shortName(m.product_name)).join(" + ")}` : ""}
                  </Text>
                ))}
              </View>
            )}
            {list === "output" && line.is_bulk && !line.presentations?.length && (
              <Text style={[styles.presentation, { marginTop: 4 }]}>Granel sin presentaciones: se usa en otros procesos.</Text>
            )}
          </View>
          <QuantityField
            value={line.qty}
            onChangeText={(text) => setList((rows) => rows.map((r, i) => (i === index ? { ...r, qty: text } : r)))}
            unit={line.unit_abbreviation}
            placeholder={list === "output" ? "—" : "0"}
            accessibilityLabel={line.product_name}
          />
          {canSave && (
            <Pressable
              onPress={() => setList((rows) => rows.filter((_, i) => i !== index))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${line.product_name}`}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ListSection title="Nombre">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Por ejemplo, Abrir cocos"
            placeholderTextColor={colors.textMuted}
            editable={canSave}
            style={styles.field}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Qué se hace (opcional)"
            placeholderTextColor={colors.textMuted}
            editable={canSave}
            multiline
            style={styles.area}
          />
        </ListSection>

        <ListSection title="Entra">
          <ListGroup inset={14}>
            {items.map((l, i) => lineRow(l, i, "item"))}
            {canSave && <ListRow icon="plus" iconColor={colors.primary} title="Agregar lo que entra" onPress={() => setPicker("item")} chevron={false} />}
          </ListGroup>
          <Text style={styles.hint}>Cantidades por tanda. Solo ingredientes: el material de empaque va en la presentación de cada producto.</Text>
        </ListSection>

        <ListSection title="Sale">
          <ListGroup inset={14}>
            {outputs.map((l, i) => lineRow(l, i, "output"))}
            {canSave && <ListRow icon="plus" iconColor={colors.primary} title="Agregar lo que sale" onPress={() => setPicker("output")} chevron={false} />}
          </ListGroup>
          <Text style={styles.hint}>Deja vacío lo que no tiene una cantidad fija: igual aparece al registrar (por ejemplo, cada dulce).</Text>
        </ListSection>

        {main && mainQty && expectedOutputs.length > 0 && (
          <ListSection title="Rendimiento esperado">
            <Text style={styles.summary}>
              Por cada {qty(1, main.unit_abbreviation)} de {shortName(main.product_name)}:{" "}
              {expectedOutputs
                .map((o) => `${qty((toNumber(o.qty) ?? 0) / mainQty, o.unit_abbreviation)} de ${shortName(o.product_name).toLowerCase()}`)
                .join(", ")}
              .
            </Text>
          </ListSection>
        )}

        <ListGroup inset={14}>
          <View style={styles.switchRow}>
            <Text style={styles.rowTitle}>Activo (aparece al registrar)</Text>
            <Switch value={active} onValueChange={setActive} disabled={!canSave} />
          </View>
        </ListGroup>

        {!!error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Button mode="outlined" onPress={() => goBack("/(tabs)/home/production/formulas")} style={{ flex: 1 }}>
            {canSave ? "Cancelar" : "Volver"}
          </Button>
          {canSave && (
            <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ flex: 1.4 }} icon="content-save-outline">
              Guardar
            </Button>
          )}
        </View>
      </View>

      <ProductPickerSheet
        visible={picker === "item"}
        onDismiss={() => setPicker(null)}
        title="Lo que entra"
        params={{ inventory_type_code: ["raw_material", "semi_finished"] }}
        excludeIds={items.map((l) => l.product_id)}
        onSelect={(p: PickedProduct) =>
          setItems((rows) => [...rows, { product_id: p.id, product_name: p.name, unit_id: p.unit_id, unit_abbreviation: p.unit_abbreviation, qty: "" }])
        }
      />
      <ProductPickerSheet
        visible={picker === "output"}
        onDismiss={() => setPicker(null)}
        title="Lo que sale"
        params={{ is_producible: 1 }}
        excludeIds={outputs.map((l) => l.product_id)}
        onSelect={(p: PickedProduct) =>
          setOutputs((rows) => [...rows, { product_id: p.id, product_name: p.name, unit_id: p.unit_id, unit_abbreviation: p.unit_abbreviation, qty: "" }])
        }
      />
    </View>
  );
}
