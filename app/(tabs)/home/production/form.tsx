import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import InventorySummaryPanel from "@/components/Production/InventorySummaryPanel";
import MermasTable from "@/components/Production/MermasTable";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FormikProps, useFormikContext } from "formik";
import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

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
        if (formula.expected_output_quantity && items[0]?.expected_output_quantity) {
          setFieldValue(
            "outputs",
            items.map((it: any) => ({
              product_id: it.product_id,
              unit_id: it.unit_id,
              quantity: Number(it.expected_output_quantity) || 0,
              expected_quantity: Number(it.expected_output_quantity) || 0,
              notes: it.notes ?? "",
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
      initialValues={initialValues}
      onSubmit={async (values) => {
        const totalC = (values.consumptions ?? []).reduce(
          (a: number, b: any) => a + (Number(b.quantity) || 0),
          0,
        );
        const totalO = (values.outputs ?? []).reduce(
          (a: number, b: any) => a + (Number(b.quantity) || 0),
          0,
        );

        const ok = await alerts.confirm(
          `Consumo total: ${totalC.toFixed(2)}  |  Producido: ${totalO.toFixed(2)}\n\n¿Registrar la producción?${
            values.affect_stock ? " Se actualizará el stock." : " (modo borrador)"
          }`,
          { title: "Confirmar producción", okText: "Registrar" },
        );
        if (!ok) throw new Error("Cancelado por el usuario");
      }}
      onSuccess={async (response, values) => {
        try {
          if (values.affect_stock && !editingId) {
            const orderId = response?.data?.id ?? response?.id;
            if (orderId) {
              await Services.productionOrders.complete(orderId);
              alerts.success(
                `Producción ${response?.data?.folio ?? ""} registrada · Stock actualizado`,
              );
            }
          } else if (!values.affect_stock) {
            alerts.success("Borrador guardado");
          } else {
            alerts.success("Producción actualizada");
          }
        } catch (e: any) {
          alerts.error("Guardada pero no se pudo afectar el stock: " + (e?.message ?? ""));
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
  const alerts = useAlerts();

  const handleSubmit = async () => {
    if (isSubmitting) return;
    try {
      await submitForm();
      // Si estamos en draft o affect_stock=false → solo guardamos en draft
      // Si affect_stock=true → después de guardar (POST store) hacemos complete
      // AppForm internamente llama a Services.productionOrders.store(values) y devuelve la orden
      if (!values.affect_stock) {
        alerts.success("Producción guardada en borrador");
        router.push("/(tabs)/home/production" as any);
      } else {
        // Llamamos a complete manualmente después del store
        try {
          // La respuesta del store no es accesible aquí, pero AppForm ya hizo la navegación en success.
          // Solución: usamos el ref del form (no exponer aquí es complejo) - lo manejamos en la pantalla padre.
        } catch (e) {
          // noop
        }
      }
    } catch (e: any) {
      if (e?.message && e.message !== "Cancelado por el usuario") {
        alerts.error("Error: " + e.message);
      }
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
    >
      <FormulaListener />

      <SectionHeader icon="information" title="Información General" />
      <Card style={styles.card}>
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
          <FormProSelect
            name="formula_id"
            label="Fórmula (opcional)"
            model="formulas"
            fetchParams={{ is_active: true }}
            placeholder="Sin fórmula"
            clearable
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
        emptyMessage="Toca “Agregar consumo” para registrar lo que se va a procesar."
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
        emptyMessage="Toca “Agregar producto” para registrar lo que se obtuvo."
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
    elevation: 1,
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
