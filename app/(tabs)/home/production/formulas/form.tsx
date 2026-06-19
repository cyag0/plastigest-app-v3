import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

const COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Ingrediente",
    type: "product",
    width: 240,
    required: true,
    productFetchParams: { product_type: ["raw_material", "processed"] },
  },
  { key: "unit_id", label: "Unidad", type: "unit", width: 110, required: true },
  {
    key: "expected_quantity",
    label: "Cantidad esperada",
    type: "number",
    width: 160,
    required: true,
  },
  { key: "notes", label: "Notas", type: "text", width: 200 },
];

const DEFAULT_ROW = {
  product_id: 0,
  unit_id: 0,
  expected_quantity: 0,
  notes: "",
};

export default function FormulaForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const [initialValues, setInitialValues] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      if (params.id) {
        try {
          const r: any = await Services.formulas.show(parseInt(params.id, 10));
          const f = r?.data?.data ?? r?.data;
          setInitialValues({
            product_id: f.product_id,
            name: f.name,
            description: f.description ?? "",
            is_active: f.is_active,
            notes: f.notes ?? "",
            expected_output_quantity:
              f.expected_output_quantity !== null && f.expected_output_quantity !== undefined
                ? f.expected_output_quantity
                : 0,
            items: (f.items ?? []).map((it: any) => ({
              product_id: it.product_id,
              unit_id: it.unit_id,
              expected_quantity: Number(it.expected_quantity) || 0,
              notes: it.notes ?? "",
              _key: `init-${Date.now()}-${Math.random()}`,
            })),
          });
        } catch (e: any) {
          alerts.error("No se pudo cargar la fórmula: " + e.message);
        }
      } else {
        setInitialValues({
          product_id: 0,
          name: "",
          description: "",
          is_active: true,
          notes: "",
          expected_output_quantity: 0,
          items: [] as any[],
        });
      }
    })();
  }, [params.id, alerts]);

  if (!initialValues) return null;

  return (
    <AppForm
      api={Services.formulas}
      id={params.id ? parseInt(params.id, 10) : undefined}
      initialValues={initialValues}
      onSuccess={() => {
        alerts.success("Fórmula guardada");
        router.push("/(tabs)/home/production/formulas" as any);
      }}
    >
      <ScrollView>
        <Text variant="titleMedium" style={{ color: palette.text, fontWeight: "700", marginBottom: 8 }}>
          Información de la fórmula
        </Text>
        <Card style={styles.card}>
          <FormInput name="name" label="Nombre" required />
          <FormProSelect
            name="product_id"
            label="Producto a elaborar"
            model="products"
            required
            disabled={!!params.id}
            helperText={params.id ? "El producto no se puede cambiar después de crear la fórmula" : undefined}
          />
          <FormInput name="description" label="Descripción" multiline numberOfLines={2} />
          <FormInput name="notes" label="Notas internas" multiline numberOfLines={2} />
          <FormCheckBox name="is_active" text="Fórmula activa" />
        </Card>

        <View style={{ height: 12 }} />

        <Text variant="titleMedium" style={{ color: palette.text, fontWeight: "700", marginBottom: 8 }}>
          Rendimiento esperado
        </Text>
        <Card style={styles.card}>
          <FormInput
            name="expected_output_quantity"
            label="Cantidad producida"
            keyboardType="decimal-pad"
            required
          />
          <Text
            variant="bodySmall"
            style={{ color: palette.textSecondary, marginTop: -8, marginBottom: 4 }}
          >
            Cantidad del producto final que se obtiene al ejecutar la fórmula una
            vez. La unidad se toma del producto seleccionado arriba.
          </Text>
        </Card>

        <View style={{ height: 12 }} />

        <Text variant="titleMedium" style={{ color: palette.text, fontWeight: "700", marginBottom: 8 }}>
          Ingredientes
        </Text>
        <EditableTable
          name="items"
          columns={COLUMNS}
          defaultRow={DEFAULT_ROW}
          addLabel="Agregar ingrediente"
          emptyMessage="Agrega los ingredientes necesarios para producir una unidad del producto."
        />
      </ScrollView>
    </AppForm>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: 12,
  },
});
