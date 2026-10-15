import { goBack } from "@/utils/navigation";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import FormulaPickerModal, {
  FormulaPickerModalRef,
} from "@/components/Production/FormulaPickerModal";
import InventorySummaryPanel from "@/components/Production/InventorySummaryPanel";
import MermasTable from "@/components/Production/MermasTable";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { mergeProductRow } from "@/utils/groupByProduct";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FormikProps, useFormikContext } from "formik";
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { toLocalDateString } from "@/utils/dates";

// Helpers de producto (resolución de unidades) — se usan desde el modal de
// fórmulas para construir las filas de consumptions / outputs.

const CONSUMPTION_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto",
    type: "product",
    width: 230,
    required: true,
    productFetchParams: { is_consumable: 1 },
  },
  { key: "unit_id", label: "Unidad", type: "unit", width: 110, required: true },
  {
    key: "quantity",
    label: "Cantidad",
    type: "number",
    width: 110,
    required: true,
  },
  {
    key: "available_stock",
    label: "Disponible",
    type: "stock",
    width: 120,
  },
  { key: "notes", label: "Notas", type: "text", width: 180 },
];

const OUTPUT_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto",
    type: "product",
    width: 230,
    required: true,
    productFetchParams: {  },
  },
  { key: "unit_id", label: "Unidad", type: "unit", width: 110, required: true },
  {
    key: "quantity",
    label: "Cantidad",
    type: "number",
    width: 110,
    required: true,
  },
  { key: "notes", label: "Notas", type: "text", width: 180 },
];

const DEFAULT_CONSUMPTION = {
  product_id: 0,
  unit_id: 0,
  quantity: 0,
  notes: "",
};

const DEFAULT_OUTPUT = {
  product_id: 0,
  unit_id: 0,
  quantity: 0,
  notes: "",
};

/** Listas de la orden; una vacía se marca con `<lista>_empty=1` al editar. */
const ORDER_LISTS = ["consumptions", "outputs", "wastes"] as const;

interface ResponsibleOption {
  id: number;
  name: string;
}

/** Motivo que manda el backend; nunca el texto en inglés de axios. */
function apiMessage(error: any, fallback: string): string {
  if (error?.isAxiosError && !error.response) {
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  const data = error?.response?.data;
  const fieldError = data?.errors
    ? (Object.values(data.errors).flat()[0] as string | undefined)
    : undefined;
  return data?.error || fieldError || data?.message || fallback;
}

/**
 * Salidas de una fórmula, tolerando el formato anterior.
 *
 * Las fórmulas guardadas antes del rediseño multi-salida no traen `outputs`;
 * el backend sigue exponiendo la salida principal suelta (`product_id` +
 * `expected_output_quantity`), así que se reconstruye desde ahí.
 */
function resolveFormulaOutputs(
  formula: App.Entities.Formula,
): App.Entities.FormulaOutput[] {
  if (formula.outputs?.length) return formula.outputs;
  if (!formula.product_id) return [];

  return [
    {
      product_id: formula.product_id,
      unit_id: Number(formula.product?.unit_id) || 0,
      expected_quantity: Number(formula.expected_output_quantity) || 0,
      unit_type: formula.product?.unit?.unit_type,
      is_primary: true,
    },
  ];
}

/**
 * Escala una cantidad de la fórmula. Las unidades de conteo se redondean a
 * enteros — no existen media botella ni 1.4 cocos en el almacén.
 */
function scaleQuantity(
  quantity: number | string | undefined,
  multiplier: number,
  unitType?: string,
): number {
  const raw = (Number(quantity) || 0) * multiplier;
  return unitType === "quantity"
    ? Math.round(raw)
    : Math.round(raw * 100) / 100;
}

/** Componente que escucha el cambio de formula y pre-rellena las tablas */
function FormulaListener() {
  const { values, setFieldValue } = useFormikContext<any>();
  const lastFormulaIdRef = useRef<number | null>(null);

  useEffect(() => {
    const id = values.formula_id;
    if (!id || id === lastFormulaIdRef.current) return;
    lastFormulaIdRef.current = id;
    (async () => {
      try {
        const r: any = await Services.formulas.show(id);
        const formula: App.Entities.Formula = r?.data?.data ?? r?.data;
        const items = formula?.items ?? [];
        if (items.length === 0) return;
        setFieldValue(
          "consumptions",
          items.map((it) => ({
            product_id: it.product_id,
            unit_id: it.unit_id,
            quantity: Number(it.expected_quantity) || 0,
            expected_quantity: Number(it.expected_quantity) || 0,
            notes: it.notes ?? "",
            _key: `prefill-c-${Date.now()}-${Math.random()}`,
          })),
        );

        // Todas las salidas del proceso, no sólo la principal: una corrida de
        // cocos entrega agua, pulpa y fibra a la vez.
        const outputs = resolveFormulaOutputs(formula);
        if (outputs.length > 0) {
          setFieldValue(
            "outputs",
            outputs.map((o) => ({
              product_id: o.product_id,
              unit_id: o.unit_id,
              quantity: Number(o.expected_quantity) || 0,
              expected_quantity: Number(o.expected_quantity) || 0,
              notes: o.notes ?? "",
              _key: `prefill-o-${Date.now()}-${Math.random()}`,
            })),
          );
        }
      } catch (e) {
        console.warn("No se pudo pre-rellenar desde la fórmula", e);
      }
    })();
  }, [values.formula_id, setFieldValue]);

  return null;
}

export default function ProductionForm() {
  const params = useLocalSearchParams<{ id?: string; duplicateFrom?: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const { user } = useAuth();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<any>>(null);
  const [initialValues, setInitialValues] = React.useState<any | null>(null);
  const [editingId, setEditingId] = React.useState<number | undefined>(undefined);
  const [responsibles, setResponsibles] = React.useState<ResponsibleOption[]>([]);
  // Al editar, si la orden no cargó no se muestra el formulario: guardar sus
  // valores vacíos sobre el borrador le borraría los renglones.
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = React.useState(0);

  // Cargar valores iniciales: edición o duplicado
  useEffect(() => {
    (async () => {
      // Responsables: usuarios activos de la empresa con acceso a esta
      // sucursal (production-orders/initial-data). Antes salían de la lista de
      // usuarios del administrador, que pide users_list: los roles de planta
      // (plantilla "Operativo") no podían registrar producción.
      let options: ResponsibleOption[] = [];
      try {
        const r: any = await Services.productionOrders.getInitialData();
        options = (r?.data?.responsibles ?? []).map((u: any) => ({
          id: Number(u.id),
          name: String(u.name ?? `Usuario #${u.id}`),
        }));
      } catch (e) {
        console.warn("No se pudieron cargar los responsables", e);
        // Sin la lista, al menos quien registra puede ser el responsable.
        if (user?.id) options = [{ id: Number(user.id), name: user.name }];
      }
      // El responsable guardado se conserva aunque ya no esté en la lista.
      const ensureOption = (id: any, name?: string | null) => {
        const numericId = Number(id);
        if (numericId && !options.some((o) => o.id === numericId)) {
          options = [...options, { id: numericId, name: name || `Usuario #${numericId}` }];
        }
      };

      const baseValues = {
        production_date: toLocalDateString(),
        // Por omisión, quien registra (si está entre los responsables).
        responsible_user_id:
          user?.id && options.some((o) => o.id === Number(user.id))
            ? Number(user.id)
            : 0,
        formula_id: null,
        notes: "",
        consumptions: [] as any[],
        outputs: [] as any[],
        wastes: [] as any[],
        affect_stock: true,
      };

      if (params.id) {
        setEditingId(parseInt(params.id, 10));
      }

      const sourceId = params.id ?? params.duplicateFrom;
      if (sourceId) {
        try {
          const r: any = await Services.productionOrders.show(parseInt(sourceId as string, 10));
          const order = r?.data?.data ?? r?.data;
          ensureOption(order.responsible_user_id, order.responsible_name);
          setResponsibles(options);
          if (params.duplicateFrom) {
            setInitialValues({
              ...baseValues,
              production_date: toLocalDateString(),
              formula_id: order.formula_id,
              responsible_user_id: order.responsible_user_id,
              notes: order.notes,
              consumptions: (order.consumptions ?? []).map((c: any) => ({
                product_id: c.product_id,
                unit_id: c.unit_id,
                quantity: Number(c.quantity) || 0,
                notes: c.notes ?? "",
                _key: `dup-c-${Date.now()}-${Math.random()}`,
              })),
              outputs: (order.outputs ?? []).map((o: any) => ({
                product_id: o.product_id,
                unit_id: o.unit_id,
                quantity: Number(o.quantity) || 0,
                notes: o.notes ?? "",
                _key: `dup-o-${Date.now()}-${Math.random()}`,
              })),
              wastes: [],
            });
          } else {
            setInitialValues({
              ...baseValues,
              production_date: order.production_date,
              responsible_user_id: order.responsible_user_id,
              formula_id: order.formula_id,
              notes: order.notes ?? "",
              consumptions: (order.consumptions ?? []).map((c: any) => ({
                product_id: c.product_id,
                unit_id: c.unit_id,
                quantity: Number(c.quantity) || 0,
                expected_quantity: c.expected_quantity,
                notes: c.notes ?? "",
                _key: `edit-c-${Date.now()}-${Math.random()}`,
              })),
              outputs: (order.outputs ?? []).map((o: any) => ({
                product_id: o.product_id,
                unit_id: o.unit_id,
                quantity: Number(o.quantity) || 0,
                expected_quantity: o.expected_quantity,
                notes: o.notes ?? "",
                _key: `edit-o-${Date.now()}-${Math.random()}`,
              })),
              wastes: (order.wastes ?? []).map((w: any) => ({
                product_id: w.product_id,
                unit_id: w.unit_id,
                quantity: Number(w.quantity) || 0,
                reason: w.reason ?? "other",
                notes: w.notes ?? "",
                _key: `edit-w-${Date.now()}-${Math.random()}`,
              })),
            });
          }
          return;
        } catch (e: any) {
          if (params.id) {
            setLoadError(apiMessage(e, "No se pudo cargar la producción"));
            return;
          }
          alerts.error(
            apiMessage(e, "No se pudo cargar la producción a duplicar"),
          );
        }
      }
      setResponsibles(options);
      setInitialValues(baseValues);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.duplicateFrom, loadAttempt]);

  if (loadError) {
    return (
      <View style={styles.loadError}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={palette.error} />
        <Text style={{ color: palette.text, textAlign: "center" }}>{loadError}</Text>
        <Button
          mode="contained"
          onPress={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
        >
          Reintentar
        </Button>
        <Button mode="text" onPress={() => goBack("/(tabs)/home/production")}>
          Volver
        </Button>
      </View>
    );
  }

  if (!initialValues) {
    return null;
  }

  return (
    <AppForm
      ref={formRef}
      api={Services.productionOrders}
      id={editingId}
      submitButtonText={undefined}
      showSubmitButton={false}
      showResetButton={false}
      initialValues={initialValues}
      onSubmit={async (values) => {
        // AppForm ya convirtió los valores a FormData antes de llamar a onSubmit.
        // Recuperamos los valores originales (objetos) desde la instancia de
        // Formik para poder calcular los totales reales y leer affect_stock.
        const originalValues = formRef.current?.getValues() ?? values;

        if (!Number(originalValues.responsible_user_id)) {
          alerts.error("Selecciona quién es el responsable de la producción.");
          return;
        }

        const totalC = (originalValues.consumptions ?? []).reduce(
          (a: number, b: any) => a + (Number(b.quantity) || 0),
          0,
        );
        const totalO = (originalValues.outputs ?? []).reduce(
          (a: number, b: any) => a + (Number(b.quantity) || 0),
          0,
        );

        const ok = await alerts.confirm(
          `Consumo total: ${totalC.toFixed(2)}  |  Producido: ${totalO.toFixed(2)}\n\n¿Registrar la producción?${
            originalValues.affect_stock
              ? " Se actualizará el stock."
              : " (modo borrador)"
          }`,
          { title: "Confirmar producción", okText: "Registrar" },
        );
        // Cancelar la confirmación no es un error (antes salía un aviso rojo
        // "Cancelado por el usuario").
        if (!ok) return;

        // Una lista vacía no viaja en un FormData: al quitar todas las mermas
        // (o consumos o resultados) de un borrador, el servidor conservaba las
        // anteriores y al completar las descontaba del stock. Se avisa con
        // `<lista>_empty=1` que la lista quedó vacía a propósito.
        if (editingId) {
          ORDER_LISTS.forEach((list) => {
            if ((originalValues[list] ?? []).length === 0) {
              values.append(`${list}_empty`, "1");
            }
          });
        }

        // AppForm NO llama a la API cuando se le pasa onSubmit, así que la
        // invocamos manualmente aquí con los valores convertidos a FormData.
        // Cuando affect_stock está activo, el backend crea Y descuenta el
        // stock en una sola transacción: si el stock es insuficiente, NO se
        // crea ninguna orden (ni borrador) y aquí caemos en el catch.
        let apiResponse;
        try {
          apiResponse = editingId
            ? await Services.productionOrders.update(editingId, values)
            : await Services.productionOrders.store(values);
        } catch (e: any) {
          alerts.error(
            "No se pudo registrar la producción. " +
              apiMessage(e, "Error desconocido"),
          );
          // Nos quedamos en el formulario (no navegamos) para que el usuario
          // ajuste las cantidades y reintente.
          return;
        }

        // store/update regresan AxiosResponse<LaravelResponse<T>>, donde el
        // body tiene la forma { data: T, message?: string }. Extraemos la
        // orden creada/actualizada.
        const order = apiResponse?.data?.data as
          | { id?: number; folio?: string }
          | undefined;

        // Con affect_stock el backend guarda y completa, también al editar un
        // borrador: la orden deja de ser borrador en ambos casos.
        if (originalValues.affect_stock) {
          alerts.success(
            `Producción ${order?.folio ?? ""} registrada · Stock actualizado`,
          );
        } else if (!editingId) {
          alerts.success("Borrador guardado");
        } else {
          alerts.success("Producción actualizada");
        }
        // Regresar a donde se abrió el formulario (lista o detalle; ambos se
        // recargan al recuperar el foco). Antes se hacía push de la lista y la
        // pila crecía: "atrás" volvía a abrir el formulario ya guardado.
        goBack("/(tabs)/home/production");
      }}
    >
      <ProductionFormBody editingId={editingId} responsibles={responsibles} />
    </AppForm>
  );
}

function ProductionFormBody({
  editingId,
  responsibles,
}: {
  editingId?: number;
  responsibles: ResponsibleOption[];
}) {
  const { values, submitForm, isSubmitting, setFieldValue } = useFormikContext<any>();
  const router = useRouter();
  const formulaPickerRef = useRef<FormulaPickerModalRef>(null);

  // La confirmación, llamada a la API, alertas de éxito y navegación se
  // manejan dentro del onSubmit de AppForm. Aquí solo disparamos submitForm
  // y dejamos que AppForm muestre los errores en su propio catch.
  const handleSubmit = () => {
    if (isSubmitting) return;
    submitForm();
  };

  /**
   * Recibe las fórmulas seleccionadas desde FormulaPickerModal junto con la
   * cantidad deseada del resultado principal, y reparte ingredientes y
   * resultados a las tablas `consumptions` y `outputs`.
   *
   * Reglas:
   * - El multiplicador sale del resultado PRINCIPAL:
   *   `desiredQty / expected_quantity de la salida principal`. Es la cantidad
   *   de veces que hay que correr el proceso.
   * - Cada ingrediente y cada resultado se escalan por ese multiplicador. Los
   *   subproductos salen en proporción: si un lote de cocos da 7 L de agua y
   *   3 kg de pulpa, pedir 14 L de agua trae 6 kg de pulpa.
   * - Si el mismo `product_id` ya existe en la tabla destino, `mergeProductRow`
   *   SUMA la cantidad y respeta la primera `unit_id` registrada
   *   (no se sobreescribe).
   */
  const handleFormulasSelected = (
    picked: App.Entities.Formula[],
    unitsProduced: number,
  ) => {
    const desiredQty = Number(unitsProduced) > 0 ? Number(unitsProduced) : 1;
    const currentConsumptions: any[] = values.consumptions ?? [];
    const currentOutputs: any[] = values.outputs ?? [];

    let nextConsumptions = currentConsumptions;
    let nextOutputs = currentOutputs;

    for (const formula of picked) {
      if (!formula?.id) continue;

      const items = formula.items ?? [];
      const outputs = resolveFormulaOutputs(formula);

      // El rendimiento de referencia es el de la salida principal (o la
      // primera). De ahí sale cuántas veces hay que correr el proceso.
      const primary = outputs.find((o) => o.is_primary) ?? outputs[0];
      const formulaYield = Number(primary?.expected_quantity) || 0;
      const multiplier = formulaYield > 0 ? desiredQty / formulaYield : desiredQty;

      // ── Consumos: cada ingrediente aporta expected_quantity × multiplier.
      for (const item of items) {
        if (!item?.product_id) continue;
        const qty = scaleQuantity(item.expected_quantity, multiplier, item.unit_type);
        if (qty <= 0) continue;
        nextConsumptions = mergeProductRow(
          nextConsumptions,
          {
            product_id: item.product_id,
            unit_id: Number(item.unit_id) || 0,
            quantity: qty,
            notes: item.notes ?? "",
          },
          "formula-c",
        );
      }

      // ── Resultados: TODAS las salidas escalan con el mismo multiplicador.
      for (const output of outputs) {
        if (!output?.product_id) continue;
        const qty = scaleQuantity(output.expected_quantity, multiplier, output.unit_type);
        if (qty <= 0) continue;
        nextOutputs = mergeProductRow(
          nextOutputs,
          {
            product_id: output.product_id,
            unit_id: Number(output.unit_id) || 0,
            quantity: qty,
            notes: output.notes ?? "",
          },
          "formula-o",
        );
      }
    }

    if (nextConsumptions !== currentConsumptions) {
      setFieldValue("consumptions", nextConsumptions);
    }
    if (nextOutputs !== currentOutputs) {
      setFieldValue("outputs", nextOutputs);
    }
  };

  const openFormulaPicker = () => {
    formulaPickerRef.current?.show({
      title: "Agregar fórmulas a la producción",
      onSelect: handleFormulasSelected,
      defaultUnits: 1,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, paddingBottom: 100, maxWidth: 600, width: "100%", alignSelf: "center"}}
    >
      <FormulaListener />

      <SectionHeader icon="information" title="Información General" />
      <Card style={[styles.card, {
        shadowOffset: { width: 0, height: 0 },
      }]}  elevation={0}>
        <Card.Content>
          <FormDatePicker
            name="production_date"
            label="Fecha de Producción"
            required
          />
          {/* Las opciones ya vienen cargadas antes de montar el formulario: el
              campo (FastField) no se vuelve a pintar si solo cambian. */}
          <FormSelectSimple
            name="responsible_user_id"
            label="Responsable"
            placeholder="Selecciona al responsable"
            data={responsibles.map((r) => ({ value: String(r.id), label: r.name }))}
            required
          />
 
          <FormInput name="notes" label="Observaciones" multiline numberOfLines={3} />
          <FormCheckBox
            name="affect_stock"
            label="Afectar stock al guardar"
            text="Si está activo, descuenta ingredientes y suma productos al inventario inmediatamente."
          />
        </Card.Content>
      </Card>

      <View style={{ height: 12 }} />

      <Button
        icon="plus-circle"
        mode="contained-tonal"
        onPress={openFormulaPicker}
        style={{ marginBottom: 12 }}
        buttonColor={palette.primarySoft}
        textColor={palette.primary}
      >
        Agregar fórmulas a la producción
      </Button>

      <SectionHeader
        icon="package-variant-closed"
        title="Consumos"
        badge={`${(values.consumptions ?? []).length} items`}
      />
      <EditableTable
        name="consumptions"
        columns={CONSUMPTION_COLUMNS}
        defaultRow={DEFAULT_CONSUMPTION}
        addLabel="Agregar consumo"
        emptyMessage="Toca “Agregar consumo” o usa el botón de fórmulas de arriba para registrar los ingredientes a procesar."
      />

      <View style={{ height: 12 }} />

      <SectionHeader
        icon="package-variant"
        title="Resultados Obtenidos"
        badge={`${(values.outputs ?? []).length} items`}
      />
      <EditableTable
        name="outputs"
        columns={OUTPUT_COLUMNS}
        defaultRow={DEFAULT_OUTPUT}
        addLabel="Agregar producto"
        emptyMessage="Toca “Agregar producto” o usa el botón de fórmulas de arriba para registrar lo que se obtuvo."
      />

      <View style={{ height: 12 }} />

      <SectionHeader
        icon="trash-can-outline"
        title="Mermas"
        badge={`${(values.wastes ?? []).length} items`}
      />
      <MermasTable />

      <View style={{ height: 12 }} />

      <SectionHeader icon="chart-box" title="Resumen" />
      <InventorySummaryPanel />

      <View style={{ height: 16 }} />

      <View style={styles.actionBar}>
        <Button
          mode="outlined"
          onPress={() => goBack()}
          style={{ flex: 1, marginRight: 8 }}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          buttonColor={palette.primary}
          textColor="#fff"
          icon={values.affect_stock ? "content-save" : "file-document-outline"}
          style={{ flex: 1.4 }}
        >
          {values.affect_stock ? "Registrar Producción" : "Guardar borrador"}
        </Button>
      </View>

      <FormulaPickerModal ref={formulaPickerRef} />
    </ScrollView>
  );
}

function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: string;
  title: string;
  badge?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={palette.primary}
      />
      <Text
        variant="titleSmall"
        style={{ color: palette.text, fontWeight: "700", marginLeft: 8, flex: 1 }}
      >
        {title}
      </Text>
      {badge ? (
        <View
          style={{
            backgroundColor: palette.primary + "22",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: palette.primary, fontSize: 11, fontWeight: "600" }}>
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 0,
    shadowColor: "transparent",
    boxShadow: "transparent",
    borderWidth: 1,
    borderColor: palette.border,
    shadowOffset: { width: 0, height: 0 },
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  actionBar: {
    flexDirection: "row",
    marginTop: 16,
  },
  loadError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
});
