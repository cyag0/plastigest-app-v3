/**
 * Registrar una producción en cuatro pasos, pensado para el celular o la
 * tableta de la planta:
 *
 *   1. ¿Qué hiciste?      el proceso (Abrir cocos, Horchata, Dulces…)
 *   2. ¿Cuánto usaste?    los insumos, con lo que hay en la sucursal
 *   3. ¿Qué salió?        lo producido y, si se envasó ya, en qué presentaciones
 *   4. Revisar            en palabras, y un solo botón: Registrar
 *
 * El material de empaque nunca se teclea: sale de la receta de cada
 * presentación. Si el granel no se midió, lo que salió es lo que se envasó
 * ("cuenta lo que ves"). Lo que sobra se queda en granel para envasarlo
 * después desde «Envasar», o se marca como merma.
 *
 * Con `orderId` continúa un pendiente (lo guardado "para después").
 */

import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { toLocalDateString } from "@/utils/dates";
import { errorMessageOf } from "@/utils/errorNotice";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, type ScrollViewInstance, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Modal, Portal } from "react-native-paper";
import PresentationPacker, { type LeftoverAction } from "./PresentationPacker";
import ProductPickerSheet, { type PickedProduct } from "./ProductPickerSheet";
import QuantityField from "./QuantityField";
import { materialNeeds, packagingLines, packedContent, type Counts, type MaterialNeed } from "./packing";
import { dayTitle, qty, round3, shortName, toNumber } from "./productionFormat";

type Process = App.Entities.ProductionProcess;
type Bulk = App.Entities.ProductionBulk;

interface InputRow {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_abbreviation?: string | null;
  unit_type?: string | null;
  qty: string;
  stock: number;
  stock_unit?: string | null;
  /** Viene del proceso (no se quita, solo se deja vacío). */
  template: boolean;
}

interface OutputRow {
  product_id: number;
  product_name: string;
  unit_id: number;
  unit_abbreviation?: string | null;
  unit_type?: string | null;
  qty: string;
  /** Por tanda en el proceso (0 = sin esperado). */
  expected: number;
  is_bulk: boolean;
  /** Resultado principal del proceso: su granel se envasa ya por omisión. */
  is_primary: boolean;
  template: boolean;
}

const STEPS = ["¿Qué hiciste?", "¿Cuánto usaste?", "¿Qué salió?", "Revisa y registra"];
const LEFTOVER_NOTE = "Sobrante del envasado";

export default function RegisterWizard({ orderId }: { orderId?: number }) {
  const router = useRouter();
  const alerts = useAlerts();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { can } = useCan();
  const styles = useStyles();
  const scroll = useRef<ScrollViewInstance>(null);
  // La barra de abajo no queda debajo de la barra de gestos del teléfono.
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<App.Entities.ProductionInitialData | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [step, setStep] = useState(0);
  const [process, setProcess] = useState<Process | null>(null);
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [packNow, setPackNow] = useState<Record<number, boolean>>({});
  const [counts, setCounts] = useState<Record<number, Counts>>({});
  const [leftover, setLeftover] = useState<Record<number, LeftoverAction>>({});
  const [date, setDate] = useState(toLocalDateString());
  const [responsibleId, setResponsibleId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<null | "draft" | "register">(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | "input" | "output">(null);
  const [choice, setChoice] = useState<null | "date" | "responsible">(null);
  const [outputFilter, setOutputFilter] = useState("");

  const bulks = useMemo(() => new Map((data?.bulks ?? []).map((b) => [b.product_id, b])), [data]);

  // ─── Carga ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProblem(null);
        const initial = await Services.productionOrders.getInitialData({ silent: true });
        let order: App.Entities.ProductionOrder | null = null;
        if (orderId) {
          const r: any = await Services.productionOrders.show(orderId, undefined, { silent: true });
          order = r?.data?.data ?? r?.data;
          if (order && order.status !== "draft") {
            alerts.warning("Solo se puede continuar una producción pendiente.");
            goBack(`/(tabs)/home/production/${orderId}`);
            return;
          }
        }
        if (cancelled) return;
        setData(initial);
        const me = initial.responsibles.find((r) => r.id === Number(user?.id));
        setResponsibleId(me?.id ?? initial.responsibles[0]?.id ?? null);
        if (order) hydrate(order, initial);
      } catch (e) {
        if (!cancelled) setProblem(recordLoadProblem(e, "No se pudo cargar el registro de producción."));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, attempt]);

  /** Arma los renglones de un proceso: lo que entra y lo que sale. */
  const templateRows = (p: Process, bulkMap: Map<number, Bulk>) => ({
    inputs: p.items.map<InputRow>((i) => ({
      product_id: i.product_id,
      product_name: i.product_name ?? "Insumo",
      unit_id: i.unit_id,
      unit_abbreviation: i.unit_abbreviation,
      unit_type: i.unit_type,
      qty: "",
      stock: i.stock,
      stock_unit: i.stock_unit_abbreviation,
      template: true,
    })),
    outputs: p.outputs.map<OutputRow>((o) => {
      // El granel se captura en su unidad: así cuadra con el envasado.
      const bulk = bulkMap.get(o.product_id);
      return {
        product_id: o.product_id,
        product_name: o.product_name ?? "Producto",
        unit_id: bulk?.unit_id ?? o.unit_id,
        unit_abbreviation: bulk?.unit_abbreviation ?? o.unit_abbreviation,
        unit_type: bulk?.unit_type ?? o.unit_type,
        qty: "",
        expected: o.expected_quantity,
        is_bulk: o.is_bulk,
        is_primary: o.is_primary,
        template: true,
      };
    }),
  });

  const startProcess = (p: Process) => {
    const rows = templateRows(p, bulks);
    setProcess(p);
    setInputs(rows.inputs);
    setOutputs(rows.outputs);
    // El agua se envasa al momento; la pulpa casi siempre se queda para otros
    // procesos: por omisión solo se envasa ya el resultado principal.
    setPackNow(
      Object.fromEntries(rows.outputs.filter((o) => bulks.has(o.product_id)).map((o) => [o.product_id, o.is_primary])),
    );
    setCounts({});
    setLeftover({});
    setOutputFilter("");
    goTo(1);
  };

  /** Continúa un pendiente: el proceso, lo capturado y lo planeado para envasar. */
  const hydrate = (order: App.Entities.ProductionOrder, initial: App.Entities.ProductionInitialData) => {
    const bulkMap = new Map(initial.bulks.map((b) => [b.product_id, b]));
    const p = initial.processes.find((x) => x.id === order.formula_id) ?? null;
    const rows = p ? templateRows(p, bulkMap) : { inputs: [] as InputRow[], outputs: [] as OutputRow[] };

    for (const c of order.consumptions ?? []) {
      const row = rows.inputs.find((r) => r.product_id === c.product_id);
      if (row) row.qty = String(c.quantity);
      else
        rows.inputs.push({
          product_id: c.product_id,
          product_name: c.product_name ?? "Insumo",
          unit_id: c.unit_id,
          unit_abbreviation: c.unit_abbreviation,
          qty: String(c.quantity),
          stock: 0,
          template: false,
        });
    }
    for (const o of order.outputs ?? []) {
      const row = rows.outputs.find((r) => r.product_id === o.product_id);
      if (row) row.qty = String(o.quantity);
      else
        rows.outputs.push({
          product_id: o.product_id,
          product_name: o.product_name ?? "Producto",
          unit_id: o.unit_id,
          unit_abbreviation: o.unit_abbreviation,
          qty: String(o.quantity),
          expected: 0,
          is_bulk: bulkMap.has(o.product_id),
          is_primary: false,
          template: false,
        });
    }

    const planned: Record<number, Counts> = {};
    for (const line of order.planned_packagings ?? []) {
      const bulkId = line.source_product_id;
      if (!bulkId) continue;
      planned[bulkId] = { ...(planned[bulkId] ?? {}), [line.product_id]: String(line.quantity) };
    }
    const wasted: Record<number, LeftoverAction> = {};
    for (const w of order.wastes ?? []) {
      if (bulkMap.has(w.product_id) && (w.notes ?? "").includes(LEFTOVER_NOTE)) wasted[w.product_id] = "waste";
    }

    setProcess(p);
    setInputs(rows.inputs);
    setOutputs(rows.outputs);
    setPackNow(Object.fromEntries(rows.outputs.filter((o) => bulkMap.has(o.product_id)).map((o) => [o.product_id, !!planned[o.product_id]])));
    setCounts(planned);
    setLeftover(wasted);
    setDate(order.production_date ?? toLocalDateString());
    if (order.responsible_user_id) setResponsibleId(order.responsible_user_id);
    setNotes(order.notes ?? "");
    setStep(p ? 3 : 1);
  };

  // ─── Cuentas ──────────────────────────────────────────────────────────────

  const reference = process?.items[0];
  const referenceRow = inputs.find((i) => i.product_id === reference?.product_id);
  const referenceQty = toNumber(referenceRow?.qty);

  /** Lo que espera el proceso con lo que se usó del insumo principal. */
  const expectedFor = (o: OutputRow): number | null => {
    if (!reference || reference.expected_quantity <= 0 || o.expected <= 0 || !referenceQty) return null;
    return round3((o.expected / reference.expected_quantity) * referenceQty);
  };

  const isPacking = (o: OutputRow) => bulks.has(o.product_id) && !!packNow[o.product_id];
  const packedOf = (o: OutputRow) => (isPacking(o) ? packedContent(bulks.get(o.product_id)!, counts[o.product_id]) : 0);

  /** Lo que salió: lo capturado o, si no se midió y se envasó, lo envasado. */
  const outputQty = (o: OutputRow): number | null => {
    const typed = toNumber(o.qty);
    if (typed != null) return typed;
    if (isPacking(o)) {
      const packed = packedContent(bulks.get(o.product_id)!, counts[o.product_id]);
      return packed > 0 ? packed : null;
    }
    return null;
  };

  const packingBulks = outputs.filter(isPacking).map((o) => bulks.get(o.product_id)!);
  const countsInUse = Object.fromEntries(packingBulks.map((b) => [b.product_id, counts[b.product_id] ?? {}]));
  const needs = materialNeeds(packingBulks, countsInUse);
  const shortMaterials = needs.filter((m) => m.short);

  const leftoverOf = (o: OutputRow): number => {
    const measured = toNumber(o.qty);
    if (!isPacking(o) || measured == null) return 0;
    return round3(measured - packedContent(bulks.get(o.product_id)!, counts[o.product_id]));
  };
  const overPacked = outputs.filter((o) => leftoverOf(o) < -0.0001);

  const usedInputs = inputs.filter((i) => (toNumber(i.qty) ?? 0) > 0);
  const madeOutputs = outputs.filter((o) => (outputQty(o) ?? 0) > 0);
  const stockProblems = usedInputs.filter(
    (i) => (i.stock_unit ?? i.unit_abbreviation) === i.unit_abbreviation && (toNumber(i.qty) ?? 0) > i.stock + 0.0001,
  );
  const blockers = [
    ...(usedInputs.length === 0 ? ["Indica cuánto usaste de al menos un insumo."] : []),
    ...(madeOutputs.length === 0 ? ["Indica qué salió."] : []),
    ...stockProblems.map((i) => `No alcanza ${i.product_name}: hay ${qty(i.stock, i.stock_unit)} y usaste ${qty(toNumber(i.qty), i.unit_abbreviation)}.`),
    ...overPacked.map((o) => `Envasaste más ${shortName(o.product_name).toLowerCase()} de lo que salió.`),
    ...shortMaterials.map((m) => `No alcanza ${m.product_name}: hay ${qty(m.stock)} y se necesitan ${qty(m.needed)}.`),
  ];

  const responsible = data?.responsibles.find((r) => r.id === responsibleId);

  // ─── Navegación y guardado ───────────────────────────────────────────────

  const goTo = (next: number) => {
    setSaveError(null);
    setStep(next);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
  };

  const back = () => (step > 0 ? goTo(step - 1) : goBack("/(tabs)/home/production"));

  const next = () => {
    if (step === 1 && usedInputs.length === 0) {
      alerts.warning("Indica cuánto usaste de al menos un insumo.");
      return;
    }
    if (step === 2 && madeOutputs.length === 0) {
      alerts.warning("Indica qué salió.");
      return;
    }
    if (step === 2 && overPacked.length > 0) {
      alerts.warning("Envasaste más de lo que salió: corrige las piezas o lo que salió.");
      return;
    }
    goTo(step + 1);
  };

  const save = async (register: boolean) => {
    if (saving) return;
    if (register && blockers.length > 0) {
      setSaveError(blockers[0]);
      return;
    }
    const payload: App.Entities.ProductionOrderPayload = {
      kind: "process",
      formula_id: process?.id ?? null,
      production_date: date,
      responsible_user_id: responsibleId,
      notes: notes.trim() || null,
      consumptions: usedInputs.map((i) => ({ product_id: i.product_id, unit_id: i.unit_id, quantity: toNumber(i.qty)! })),
      outputs: madeOutputs.map((o) => ({
        product_id: o.product_id,
        unit_id: o.unit_id,
        quantity: outputQty(o)!,
        expected_quantity: expectedFor(o),
      })),
      packagings: packagingLines(countsInUse),
      wastes: outputs
        .filter((o) => leftover[o.product_id] === "waste" && leftoverOf(o) > 0.0001)
        .map((o) => ({
          product_id: o.product_id,
          unit_id: o.unit_id,
          quantity: leftoverOf(o),
          reason: "process_loss",
          notes: LEFTOVER_NOTE,
        })),
      affect_stock: register,
    };

    try {
      setSaving(register ? "register" : "draft");
      setSaveError(null);
      const order = await Services.productionOrders.save(payload, orderId);
      alerts.success(register ? `${process?.name ?? "Producción"}: registrada` : "Guardada para terminarla después");
      router.replace(`/(tabs)/home/production/${order.id}` as any);
    } catch (e) {
      setSaveError(errorMessageOf(e, "No se pudo guardar la producción."));
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    } finally {
      setSaving(null);
    }
  };

  // ─── Pantalla ─────────────────────────────────────────────────────────────

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No se encontró la producción"
        errorTitle="No se pudo abrir el registro"
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const context = [process?.name, dayTitle(date), responsible?.name].filter(Boolean).join(" · ");

  return (
    <View style={styles.screen}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.progress}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.progressPart, i <= step && styles.progressOn]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>Paso {step + 1} de {STEPS.length}</Text>
          <Text style={styles.stepTitle}>{STEPS[step]}</Text>
          {step > 0 && !!context && <Text style={styles.context}>{context}</Text>}
        </View>

        {step === 0 && (
          <StepProcess
            processes={data.processes}
            canPackLater={can("production_orders_create")}
            onPick={startProcess}
            onPackLater={() => router.push("/(tabs)/home/production/pack" as any)}
          />
        )}

        {step === 1 && (
          <ListSection title="Insumos">
            <ListGroup inset={14}>
              {inputs.map((row, index) => {
                const used = toNumber(row.qty);
                const sameUnit = (row.stock_unit ?? row.unit_abbreviation) === row.unit_abbreviation;
                const short = sameUnit && used != null && used > row.stock + 0.0001;
                return (
                  <View key={row.product_id} style={styles.lineRow}>
                    <View style={styles.lineBody}>
                      <Text style={styles.lineTitle} numberOfLines={2}>
                        {row.product_name}
                      </Text>
                      <Text style={[styles.lineMeta, short && { color: colors.error }]}>
                        {short ? "Solo hay " : "Hay "}
                        {qty(row.stock, row.stock_unit ?? row.unit_abbreviation)}
                      </Text>
                    </View>
                    <QuantityField
                      value={row.qty}
                      onChangeText={(text) => setInputs((rows) => rows.map((r, i) => (i === index ? { ...r, qty: text } : r)))}
                      unit={row.unit_abbreviation}
                      integer={row.unit_type === "quantity"}
                      invalid={short}
                      accessibilityLabel={row.product_name}
                      autoFocus={index === 0 && !orderId}
                    />
                    {!row.template && (
                      <RemoveButton onPress={() => setInputs((rows) => rows.filter((_, i) => i !== index))} />
                    )}
                  </View>
                );
              })}
              <ListRow icon="plus" iconColor={colors.primary} title="Agregar otro insumo" onPress={() => setPicker("input")} chevron={false} />
            </ListGroup>
            <Text style={styles.hint}>
              Deja vacío lo que no usaste. El material de empaque (botellas, tapas) no va aquí: se calcula al envasar.
            </Text>
          </ListSection>
        )}

        {step === 2 && (
          <View style={styles.sections}>
            {outputs.filter((o) => bulks.has(o.product_id)).map((o) => (
              <BulkOutput
                key={o.product_id}
                row={o}
                bulk={bulks.get(o.product_id)!}
                expected={expectedFor(o)}
                reference={referenceRow}
                packing={isPacking(o)}
                onPacking={(value) => setPackNow((p) => ({ ...p, [o.product_id]: value }))}
                onChangeQty={(text) => setOutputs((rows) => rows.map((r) => (r.product_id === o.product_id ? { ...r, qty: text } : r)))}
                counts={counts[o.product_id] ?? {}}
                onChangeCounts={(c) => setCounts((all) => ({ ...all, [o.product_id]: c }))}
                materialNeeds={needs}
                leftover={leftover[o.product_id] ?? "keep"}
                onLeftover={(value) => setLeftover((l) => ({ ...l, [o.product_id]: value }))}
              />
            ))}

            <OtherOutputs
              rows={outputs.filter((o) => !bulks.has(o.product_id))}
              filter={outputFilter}
              onFilter={setOutputFilter}
              expectedFor={expectedFor}
              onChange={(productId, text) =>
                setOutputs((rows) => rows.map((r) => (r.product_id === productId ? { ...r, qty: text } : r)))
              }
              onRemove={(productId) => setOutputs((rows) => rows.filter((r) => r.product_id !== productId))}
              onAdd={() => setPicker("output")}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.sections}>
            <ListSection title="Usaste">
              <ListGroup inset={14}>
                {usedInputs.map((i) => (
                  <ListRow key={i.product_id} title={i.product_name} subtitle={qty(toNumber(i.qty), i.unit_abbreviation)} chevron={false} />
                ))}
              </ListGroup>
            </ListSection>

            <ListSection title="Salió">
              <ListGroup inset={14}>
                {madeOutputs.map((o) => {
                  const made = outputQty(o)!;
                  const expected = expectedFor(o);
                  const perInput = referenceQty ? made / referenceQty : null;
                  return (
                    <ListRow
                      key={o.product_id}
                      title={o.product_name}
                      subtitle={`${qty(made, o.unit_abbreviation)}${toNumber(o.qty) == null && isPacking(o) ? " (lo envasado)" : ""}`}
                      meta={
                        perInput != null && referenceRow && o.is_bulk
                          ? `${perInput.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${o.unit_abbreviation ?? ""} por ${referenceRow.unit_abbreviation ?? ""} de ${shortName(referenceRow.product_name)}${
                              expected ? ` · esperado ${qty(expected, o.unit_abbreviation)}` : ""
                            }`
                          : expected
                            ? `Esperado ${qty(expected, o.unit_abbreviation)}`
                            : undefined
                      }
                      chevron={false}
                    />
                  );
                })}
              </ListGroup>
            </ListSection>

            {packingBulks.some((b) => packedContent(b, counts[b.product_id]) > 0) && (
              <ListSection title="Envasaste">
                <ListGroup inset={14}>
                  {packingBulks.flatMap((b) =>
                    b.presentations
                      .filter((p) => (toNumber(counts[b.product_id]?.[p.product_id]) ?? 0) > 0)
                      .map((p) => (
                        <ListRow
                          key={p.product_id}
                          title={p.product_name}
                          subtitle={`${qty(toNumber(counts[b.product_id][p.product_id]), p.unit_abbreviation)}`}
                          chevron={false}
                        />
                      )),
                  )}
                  {outputs.filter((o) => packedOf(o) > 0).map((o) => {
                    const rest = leftoverOf(o);
                    if (rest <= 0.0001) return null;
                    return (
                      <ListRow
                        key={`rest-${o.product_id}`}
                        icon={leftover[o.product_id] === "waste" ? "delete-outline" : "package-variant"}
                        title={
                          leftover[o.product_id] === "waste"
                            ? `Se tiraron ${qty(rest, o.unit_abbreviation)} de ${shortName(o.product_name).toLowerCase()}`
                            : `Quedan ${qty(rest, o.unit_abbreviation)} de ${shortName(o.product_name).toLowerCase()} en granel`
                        }
                        chevron={false}
                      />
                    );
                  })}
                </ListGroup>
              </ListSection>
            )}

            {outputs.some((o) => bulks.has(o.product_id) && packedOf(o) <= 0 && (outputQty(o) ?? 0) > 0) && (
              <Text style={styles.hint}>
                {outputs
                  .filter((o) => bulks.has(o.product_id) && packedOf(o) <= 0 && (outputQty(o) ?? 0) > 0)
                  .map((o) => shortName(o.product_name))
                  .join(", ")}{" "}
                queda en inventario como granel (se envasa después desde «Envasar granel» o se usa en otros procesos).
              </Text>
            )}

            {needs.length > 0 && (
              <ListSection title="Material de empaque">
                <ListGroup inset={14}>
                  {needs.map((m) => (
                    <ListRow
                      key={m.product_id}
                      title={m.product_name}
                      subtitle={`${qty(m.needed, m.unit_abbreviation)} · hay ${qty(m.stock, m.unit_abbreviation)}`}
                      warning={m.short ? "No alcanza" : undefined}
                      chevron={false}
                    />
                  ))}
                </ListGroup>
              </ListSection>
            )}

            <ListSection title="Datos">
              <ListGroup inset={14}>
                <ListRow icon="calendar-outline" title="Fecha" subtitle={dayTitle(date)} onPress={() => setChoice("date")} />
                <ListRow
                  icon="account-outline"
                  title="Responsable"
                  subtitle={responsible?.name ?? "Elige quién la hizo"}
                  onPress={() => setChoice("responsible")}
                />
              </ListGroup>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas (opcional)"
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.notes}
              />
            </ListSection>

            {(saveError || blockers.length > 0) && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
                <Text style={styles.errorText}>{saveError ?? blockers[0]}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {step > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <View style={styles.footerInner}>
            {step < 3 ? (
              <>
                <Button mode="outlined" onPress={back} style={styles.footerButton}>
                  Atrás
                </Button>
                <Button mode="contained" onPress={next} style={[styles.footerButton, { flex: 1.4 }]} icon="arrow-right" contentStyle={{ flexDirection: "row-reverse" }}>
                  Siguiente
                </Button>
              </>
            ) : (
              <>
                <Button
                  mode="outlined"
                  onPress={() => save(false)}
                  loading={saving === "draft"}
                  disabled={!!saving || (usedInputs.length === 0 && madeOutputs.length === 0)}
                  style={styles.footerButton}
                >
                  Para después
                </Button>
                <Button
                  mode="contained"
                  onPress={() => save(true)}
                  loading={saving === "register"}
                  disabled={!!saving || blockers.length > 0}
                  style={[styles.footerButton, { flex: 1.4 }]}
                  icon="check"
                >
                  Registrar
                </Button>
              </>
            )}
          </View>
        </View>
      )}

      <ProductPickerSheet
        visible={picker === "input"}
        onDismiss={() => setPicker(null)}
        title="Agregar insumo"
        params={{ inventory_type_code: ["raw_material", "semi_finished"] }}
        excludeIds={inputs.map((i) => i.product_id)}
        onSelect={(p: PickedProduct) =>
          setInputs((rows) => [
            ...rows,
            {
              product_id: p.id,
              product_name: p.name,
              unit_id: p.unit_id,
              unit_abbreviation: p.unit_abbreviation,
              qty: "",
              stock: p.stock,
              stock_unit: p.unit_abbreviation,
              template: false,
            },
          ])
        }
      />
      <ProductPickerSheet
        visible={picker === "output"}
        onDismiss={() => setPicker(null)}
        title="Agregar lo que salió"
        params={{ is_producible: 1 }}
        excludeIds={outputs.map((o) => o.product_id)}
        onSelect={(p: PickedProduct) =>
          setOutputs((rows) => [
            ...rows,
            {
              product_id: p.id,
              product_name: p.name,
              unit_id: p.unit_id,
              unit_abbreviation: p.unit_abbreviation,
              qty: "",
              expected: 0,
              is_bulk: bulks.has(p.id),
              is_primary: false,
              template: false,
            },
          ])
        }
      />

      <ChoiceSheet
        visible={choice === "date"}
        title="¿Cuándo se hizo?"
        options={[0, 1, 2].map((days) => {
          const d = new Date();
          d.setDate(d.getDate() - days);
          const value = toLocalDateString(d);
          return { value, label: dayTitle(value) };
        })}
        selected={date}
        onSelect={(value) => setDate(String(value))}
        onDismiss={() => setChoice(null)}
      />
      <ChoiceSheet
        visible={choice === "responsible"}
        title="¿Quién la hizo?"
        options={data.responsibles.map((r) => ({ value: r.id, label: r.name }))}
        selected={responsibleId}
        onSelect={(value) => setResponsibleId(Number(value))}
        onDismiss={() => setChoice(null)}
      />
    </View>
  );
}

// ─── Paso 1: el proceso ─────────────────────────────────────────────────────

function StepProcess({
  processes,
  canPackLater,
  onPick,
  onPackLater,
}: {
  processes: Process[];
  canPackLater: boolean;
  onPick: (p: Process) => void;
  onPackLater: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (processes.length === 0) {
    return (
      <Text style={styles.hint}>
        Todavía no hay procesos. Créalos en Producción → Procesos: qué entra (por ejemplo, coco entero) y qué sale (agua y pulpa).
      </Text>
    );
  }

  return (
    <View style={styles.sections}>
      <ListGroup>
        {processes.map((p) => (
          <ListRow
            key={p.id}
            icon="pot-steam-outline"
            iconColor={colors.primary}
            title={p.name}
            subtitle={`${p.items.map((i) => shortName(i.product_name)).slice(0, 2).join(", ")} → ${p.outputs
              .slice(0, 3)
              .map((o) => shortName(o.product_name))
              .join(", ")}${p.outputs.length > 3 ? ` y ${p.outputs.length - 3} más` : ""}`}
            subtitleLines={2}
            onPress={() => onPick(p)}
          />
        ))}
      </ListGroup>
      {canPackLater && (
        <ListSection title="Otra cosa">
          <ListGroup>
            <ListRow
              icon="package-variant"
              title="Envasar granel guardado"
              subtitle="El agua, la tuba o el rallado que quedó para después"
              onPress={onPackLater}
            />
          </ListGroup>
        </ListSection>
      )}
    </View>
  );
}

// ─── Paso 3: un granel, con su envasado ─────────────────────────────────────

function BulkOutput({
  row,
  bulk,
  expected,
  reference,
  packing,
  onPacking,
  onChangeQty,
  counts,
  onChangeCounts,
  materialNeeds: needs,
  leftover,
  onLeftover,
}: {
  row: OutputRow;
  bulk: Bulk;
  expected: number | null;
  reference?: InputRow;
  packing: boolean;
  onPacking: (value: boolean) => void;
  onChangeQty: (text: string) => void;
  counts: Counts;
  onChangeCounts: (c: Counts) => void;
  materialNeeds: MaterialNeed[];
  leftover: LeftoverAction;
  onLeftover: (value: LeftoverAction) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const measured = toNumber(row.qty);
  const perUnit = expected && reference && toNumber(reference.qty) ? expected / toNumber(reference.qty)! : null;

  return (
    <ListSection title={row.product_name}>
      <ListGroup inset={14}>
        <View style={styles.lineRow}>
          <View style={styles.lineBody}>
            <Text style={styles.lineTitle}>Salió</Text>
            <Text style={styles.lineMeta}>
              {expected != null
                ? `Esperado ≈ ${qty(expected, row.unit_abbreviation)}${
                    perUnit && reference
                      ? ` (${perUnit.toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${row.unit_abbreviation ?? ""} por ${reference.unit_abbreviation ?? ""})`
                      : ""
                  }`
                : packing
                  ? "Si no lo mediste, déjalo vacío: se toma lo envasado"
                  : "Lo que se midió"}
            </Text>
          </View>
          <QuantityField value={row.qty} onChangeText={onChangeQty} unit={row.unit_abbreviation} accessibilityLabel={`${row.product_name}, salió`} />
        </View>
      </ListGroup>

      {bulk.presentations.length > 0 ? (
        <>
          <View style={styles.packQuestion}>
            <Text style={styles.packQuestionText}>¿Lo envasaste?</Text>
            <View style={styles.pills}>
              {(
                [
                  [true, "Sí, ahora"],
                  [false, "Después"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={label}
                  onPress={() => onPacking(value)}
                  style={[styles.pill, packing === value && styles.pillOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: packing === value }}
                >
                  <Text style={[styles.pillText, packing === value && { color: colors.primary, fontWeight: "600" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {packing ? (
            <PresentationPacker
              bulk={bulk}
              available={measured}
              counts={counts}
              onChangeCounts={onChangeCounts}
              materialNeeds={needs}
              leftover={leftover}
              onLeftoverChange={onLeftover}
            />
          ) : (
            <Text style={styles.hint}>Queda en inventario como granel; envásalo después desde «Envasar».</Text>
          )}
        </>
      ) : (
        <Text style={styles.hint}>Queda en inventario como granel para usarse en otros procesos.</Text>
      )}
    </ListSection>
  );
}

// ─── Paso 3: lo que sale por pieza ──────────────────────────────────────────

function OtherOutputs({
  rows,
  filter,
  onFilter,
  expectedFor,
  onChange,
  onRemove,
  onAdd,
}: {
  rows: OutputRow[];
  filter: string;
  onFilter: (text: string) => void;
  expectedFor: (o: OutputRow) => number | null;
  onChange: (productId: number, text: string) => void;
  onRemove: (productId: number) => void;
  onAdd: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const q = filter.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.product_name.toLowerCase().includes(q)) : rows;
  const captured = rows.filter((r) => (toNumber(r.qty) ?? 0) > 0);
  const pieces = captured.filter((r) => r.unit_type === "quantity" || r.unit_abbreviation === "pz");
  const total = pieces.reduce((sum, r) => sum + (toNumber(r.qty) ?? 0), 0);

  return (
    <ListSection
      title={rows.length > 0 ? "Productos" : undefined}
      count={captured.length > 0 ? captured.length : undefined}
    >
      {rows.length > 8 && (
        <TextInput
          value={filter}
          onChangeText={onFilter}
          placeholder="Buscar en la lista…"
          placeholderTextColor={colors.textMuted}
          style={styles.filter}
        />
      )}
      <ListGroup inset={14}>
        {visible.map((row) => {
          const expected = expectedFor(row);
          return (
            <View key={row.product_id} style={styles.lineRow}>
              <View style={styles.lineBody}>
                <Text style={styles.lineTitle} numberOfLines={2}>
                  {row.product_name}
                </Text>
                {expected != null && <Text style={styles.lineMeta}>Esperado ≈ {qty(expected, row.unit_abbreviation)}</Text>}
              </View>
              <QuantityField
                value={row.qty}
                onChangeText={(text) => onChange(row.product_id, text)}
                unit={row.unit_abbreviation}
                steppers={row.unit_type === "quantity" || row.unit_abbreviation === "pz"}
                integer={row.unit_type === "quantity" || row.unit_abbreviation === "pz"}
                accessibilityLabel={row.product_name}
              />
              {!row.template && <RemoveButton onPress={() => onRemove(row.product_id)} />}
            </View>
          );
        })}
        <ListRow icon="plus" iconColor={colors.primary} title="Agregar otro producto" onPress={onAdd} chevron={false} />
      </ListGroup>
      {total > 0 && pieces.length > 1 && (
        <Text style={styles.hint}>
          {captured.length} productos · {qty(total, "pz")} en total
        </Text>
      )}
    </ListSection>
  );
}

// ─── Piezas sueltas ─────────────────────────────────────────────────────────

function RemoveButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar renglón">
      <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function ChoiceSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: string | number; label: string }>;
  selected: string | number | null;
  onSelect: (value: string | number) => void;
  onDismiss: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.sheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={{ flexGrow: 0 }}>
          <ListGroup inset={14}>
            {options.map((o) => (
              <ListRow
                key={String(o.value)}
                title={o.label}
                chevron={false}
                trailing={
                  String(o.value) === String(selected) ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  ) : undefined
                }
                onPress={() => {
                  onSelect(o.value);
                  onDismiss();
                }}
              />
            ))}
          </ListGroup>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

function useStyles() {
  return useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, paddingBottom: 120, gap: 18, maxWidth: 680, width: "100%", alignSelf: "center" },
    header: { gap: 4 },
    progress: { flexDirection: "row", gap: 6, marginBottom: 8 },
    progressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.border },
    progressOn: { backgroundColor: c.primary },
    stepLabel: { fontSize: 13, fontWeight: "500", color: c.textSecondary },
    stepTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
    context: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    sections: { gap: 22 },
    lineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
    lineBody: { flex: 1, minWidth: 0 },
    lineTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    lineMeta: { fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 2 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    packQuestion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    packQuestionText: { fontSize: 15, fontWeight: "500", color: c.text },
    pills: { flexDirection: "row", gap: 8 },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    pillOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
    pillText: { fontSize: 14, color: c.text },
    filter: {
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
      fontSize: 15,
      color: c.text,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    notes: {
      minHeight: 72,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      textAlignVertical: "top",
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.errorSoft,
    },
    errorText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.error },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerInner: {
      flexDirection: "row",
      gap: 10,
      padding: 12,
      maxWidth: 680,
      width: "100%",
      alignSelf: "center",
    },
    footerButton: { flex: 1 },
    sheet: {
      alignSelf: "center",
      width: "92%",
      maxWidth: 440,
      maxHeight: "80%",
      backgroundColor: c.background,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: c.text },
  }));
}
