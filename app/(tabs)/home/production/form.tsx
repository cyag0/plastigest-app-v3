import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import FormulaPickerModal, {
  FormulaPickerModalRef,
} from "@/components/Production/FormulaPickerModal";
import InventorySummaryPanel from "@/components/Production/InventorySummaryPanel";
import MermasTable from "@/components/Production/MermasTable";
import palette from "@/constants/palette";
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

// Helpers de producto (resolución de unidades) — se usan desde el modal de
// fórmulas para construir las filas de consumptions / outputs.

const CONSUMPTION_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto",
    type: "product",
    width: 230,
    required: true,
    productFetchParams: { product_type: ["raw_material", "processed"] },
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

const OUTPUT_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto",
    type: "product",
    width: 230,
    required: true,
    productFetchParams: { product_type: ["processed", "commercial"] },
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
        const formula = r?.data?.data ?? r?.data;
        const items = formula?.items ?? [];
        if (items.length === 0) return;
        setFieldValue(
          "consumptions",
          items.map((it: any) => ({
            product_id: it.product_id,
            unit_id: it.unit_id,
            quantity: Number(it.expected_quantity) || 0,
            expected_quantity: Number(it.expected_quantity) || 0,
            notes: it.notes ?? "",
            _key: `prefill-c-${Date.now()}-${Math.random()}`,
          })),
        );
        if (formula.expected_output_quantity) {
          setFieldValue(
            "outputs",
            [
              {
                product_id: formula.product_id,
                unit_id: formula.product?.unit_id ?? 0,
                quantity: Number(formula.expected_output_quantity) || 0,
                expected_quantity: Number(formula.expected_output_quantity) || 0,
                notes: "",
                _key: `prefill-o-${Date.now()}-${Math.random()}`,
              },
            ],
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
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<any>>(null);
  const [initialValues, setInitialValues] = React.useState<any | null>(null);
  const [editingId, setEditingId] = React.useState<number | undefined>(undefined);

  // Cargar valores iniciales: edición o duplicado
  useEffect(() => {
    (async () => {
      const baseValues = {
        production_date: new Date().toISOString().split("T")[0],
        responsible_user_id: 0,
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
          if (params.duplicateFrom) {
            setInitialValues({
              ...baseValues,
              production_date: new Date().toISOString().split("T")[0],
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
          alerts.error("No se pudo cargar la producción: " + e.message);
        }
      }
      setInitialValues(baseValues);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.duplicateFrom]);

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
        if (!ok) throw new Error("Cancelado por el usuario");

        // AppForm NO llama a la API cuando se le pasa onSubmit, así que la
        // invocamos manualmente aquí con los valores convertidos a FormData.
        const apiResponse = editingId
          ? await Services.productionOrders.update(editingId, values)
          : await Services.productionOrders.store(values);

        // store/update regresan AxiosResponse<LaravelResponse<T>>, donde el
        // body tiene la forma { data: T, message?: string }. Extraemos la
        // orden creada/actualizada.
        const order = apiResponse?.data?.data as
          | { id?: number; folio?: string }
          | undefined;

        // Si es una orden nueva y debe afectar stock, la marcamos como
        // completada para que el inventario se actualice.
        if (originalValues.affect_stock && !editingId) {
          const orderId = order?.id;
          if (orderId) {
            try {
              await Services.productionOrders.complete(orderId);
              alerts.success(
                `Producción ${order?.folio ?? ""} registrada · Stock actualizado`,
              );
            } catch (e: any) {
              alerts.error(
                "Guardada pero no se pudo afectar el stock: " + (e?.message ?? ""),
              );
            }
          }
        } else if (!originalValues.affect_stock) {
          alerts.success("Borrador guardado");
        } else {
          alerts.success("Producción actualizada");
        }
        router.push("/(tabs)/home/production" as any);
      }}
    >
      <ProductionFormBody editingId={editingId} />
    </AppForm>
  );
}

function ProductionFormBody({ editingId }: { editingId?: number }) {
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
   * Recibe las fórmulas seleccionadas desde FormulaPickerModal junto con el
   * multiplicador de unidades producidas, y reparte los items a las tablas
   * `consumptions` y `outputs`.
   *
   * Reglas:
   * - Cada `item` de la fórmula se suma a `consumptions` con
   *   `expected_quantity × unitsProduced` y la `unit_id` del item.
   * - El producto objetivo (`formula.product_id`) se agrega a `outputs` con
   *   la cantidad `formula.expected_output_quantity × unitsProduced`. Si la
   *   fórmula no tiene rendimiento esperado, se usa `1 × unitsProduced` como
   *   fallback (una unidad producida por lote).
   * - Si el mismo `product_id` ya existe en la tabla destino, `mergeProductRow`
   *   SUMA la cantidad y respeta la primera `unit_id` registrada
   *   (no se sobreescribe).
   */
  const handleFormulasSelected = (
    picked: App.Entities.Formula[],
    unitsProduced: number,
  ) => {
    // desiredQty = cantidad de output que el usuario quiere producir.
    // El multiplicador de lotes se calcula por fórmula: desiredQty / expected_output_quantity.
    const desiredQty = Number(unitsProduced) > 0 ? Number(unitsProduced) : 1;
    const currentConsumptions: any[] = values.consumptions ?? [];
    const currentOutputs: any[] = values.outputs ?? [];

    let nextConsumptions = currentConsumptions;
    let nextOutputs = currentOutputs;

    for (const formula of picked) {
      if (!formula?.id) continue;
      const items = formula.items ?? [];

      const formulaYield = Number(formula.expected_output_quantity) || 0;
      // multiplier = cuántas veces hay que correr la fórmula para llegar a desiredQty.
      const multiplier = formulaYield > 0 ? desiredQty / formulaYield : desiredQty;

      // ── Consumos: cada item aporta expected_quantity × multiplier.
      for (const item of items) {
        if (!item?.product_id) continue;
        const rawQty = (Number(item.expected_quantity) || 0) * multiplier;
        const qty = item.unit_type === "quantity"
          ? Math.round(rawQty)
          : Math.round(rawQty * 100) / 100;
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

      // ── Output: siempre es la cantidad deseada por el usuario.
      if (formula.product_id) {
        const outputQty = formulaYield > 0 ? desiredQty : Math.round(multiplier * 100) / 100;
        const outputUnitId = formula.product?.unit_id ?? 0;
        nextOutputs = mergeProductRow(
          nextOutputs,
          {
            product_id: formula.product_id,
            unit_id: Number(outputUnitId) || 0,
            quantity: outputQty,
            notes: "",
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
          <FormProSelect
            name="responsible_user_id"
            label="Responsable"
            model="users"
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
          onPress={() => router.back()}
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
});
