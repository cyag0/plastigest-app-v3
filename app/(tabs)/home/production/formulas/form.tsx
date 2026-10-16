import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import { goBack } from "@/utils/navigation";
import { FormSwitch } from "@/components/Form/AppSwitch";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import FormulaFlowSummary from "@/components/Production/FormulaFlowSummary";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

/**
 * Formulario de fórmulas.
 *
 * La fórmula es el proceso, no un producto: arriba se capturan los
 * INGREDIENTES que se consumen y abajo los RESULTADOS que se obtienen. Una
 * misma corrida puede entregar varios productos — de un lote de cocos salen
 * agua, dulce y fibra al mismo tiempo.
 */

/** Sólo insumos: el tipo de inventario manda con `is_consumable`. */
const INGREDIENT_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Ingrediente",
    type: "product",
    width: 240,
    required: true,
    productFetchParams: { is_consumable: 1 },
    labelKey: "product_name",
  },
  {
    key: "unit_id",
    label: "Unidad",
    type: "unit",
    width: 110,
    required: true,
    labelKey: "unit_name",
  },
  {
    key: "expected_quantity",
    label: "Cantidad",
    type: "number",
    width: 130,
    required: true,
  },
  { key: "notes", label: "Notas", type: "text", width: 200 },
];

/** Sólo productos que pueden salir de una fórmula (`is_producible`). */
const OUTPUT_COLUMNS: EditableTableColumn[] = [
  {
    key: "product_id",
    label: "Producto resultante",
    type: "product",
    width: 240,
    required: true,
    productFetchParams: { is_producible: 1 },
    labelKey: "product_name",
  },
  {
    key: "unit_id",
    label: "Unidad",
    type: "unit",
    width: 110,
    required: true,
    labelKey: "unit_name",
  },
  {
    key: "expected_quantity",
    label: "Cantidad",
    type: "number",
    width: 130,
    required: true,
  },
  { key: "notes", label: "Notas", type: "text", width: 200 },
];

const DEFAULT_INGREDIENT = {
  product_id: 0,
  unit_id: 0,
  expected_quantity: 0,
  notes: "",
};

const DEFAULT_OUTPUT = {
  product_id: 0,
  unit_id: 0,
  expected_quantity: 0,
  notes: "",
};

const newKey = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function FormulaForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const formRef = useRef<AppFormRef<any>>(null);
  // Con ?id= se abre con formulas_read: guardar cambios pide formulas_update
  // (crear, formulas_create). Sin el permiso la fórmula queda en solo lectura.
  const savePermission = params.id ? "formulas_update" : "formulas_create";
  const canSave = useCan().can(savePermission);
  const [initialValues, setInitialValues] = useState<any | null>(null);
  // La fórmula no se pudo cargar: se explica (antes la pantalla quedaba en blanco).
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoadProblem(null);
      if (!params.id) {
        setInitialValues({
          name: "",
          description: "",
          is_active: true,
          notes: "",
          items: [{ ...DEFAULT_INGREDIENT, _key: newKey("new-i") }],
          outputs: [{ ...DEFAULT_OUTPUT, _key: newKey("new-o") }],
        });
        return;
      }

      try {
        // silent: la falla se explica en la pantalla.
        const r: any = await Services.formulas.show(parseInt(params.id, 10), undefined, {
          silent: true,
        });
        const f: App.Entities.Formula = r?.data?.data ?? r?.data;

        // Las fórmulas creadas antes del rediseño no traen `outputs`; el
        // backend sigue exponiendo la salida principal suelta, así que la
        // convertimos en la primera fila para no perderla al guardar.
        // product_name / unit_name: los nombres que trae la fórmula, para
        // verlos aunque el usuario no pueda listar productos o unidades.
        const outputs = f.outputs?.length
          ? f.outputs.map((o) => ({
              product_id: o.product_id,
              unit_id: o.unit_id,
              expected_quantity: Number(o.expected_quantity) || 0,
              notes: o.notes ?? "",
              product_name: o.product_name ?? undefined,
              unit_name: o.unit_name ?? undefined,
              _key: newKey("init-o"),
            }))
          : f.product_id
            ? [
                {
                  product_id: f.product_id,
                  unit_id: f.product?.unit_id ?? 0,
                  expected_quantity: Number(f.expected_output_quantity) || 0,
                  notes: "",
                  product_name: f.product_name ?? f.product?.name ?? undefined,
                  _key: newKey("legacy-o"),
                },
              ]
            : [];

        setInitialValues({
          name: f.name,
          description: f.description ?? "",
          is_active: f.is_active,
          notes: f.notes ?? "",
          items: (f.items ?? []).map((it) => ({
            product_id: it.product_id,
            unit_id: it.unit_id,
            expected_quantity: Number(it.expected_quantity) || 0,
            notes: it.notes ?? "",
            product_name: it.product_name ?? undefined,
            unit_name: it.unit_name ?? undefined,
            _key: newKey("init-i"),
          })),
          outputs,
        });
      } catch (e: any) {
        setLoadProblem(recordLoadProblem(e, "No se pudo cargar la fórmula. Inténtalo de nuevo."));
      }
    })();
  }, [params.id, reloadKey]);

  if (loadProblem) {
    return (
      <RecordLoadError
        problem={loadProblem}
        notFoundTitle="No se encontró la fórmula"
        errorTitle="No se pudo cargar la fórmula"
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  if (!initialValues) return null;

  return (
    <AppForm
      ref={formRef}
      api={Services.formulas}
      id={params.id ? parseInt(params.id, 10) : undefined}
      initialValues={initialValues}
      submitPermission={savePermission}
      readonly={!canSave}
      showDeleteButton={false}
      showSubmitButton={false}
      showResetButton={false}
      onSuccess={() => {
        alerts.success("Fórmula guardada");
        router.push("/(tabs)/home/production/formulas" as any);
      }}
    >
      <FormulaFormBody editing={!!params.id} canSave={canSave} />
    </AppForm>
  );
}

function FormulaFormBody({ editing, canSave }: { editing: boolean; canSave: boolean }) {
  const { values, submitForm, isSubmitting } = useFormikContext<any>();
  const { colors } = useTheme();
  const styles = useFormStyles();
  const alerts = useAlerts();
  const router = useRouter();

  const items: any[] = values.items ?? [];
  const outputs: any[] = values.outputs ?? [];

  const filledItems = items.filter((r) => r.product_id && Number(r.expected_quantity) > 0);
  const filledOutputs = outputs.filter((r) => r.product_id && Number(r.expected_quantity) > 0);

  const handleSubmit = () => {
    if (isSubmitting) return;

    if (filledItems.length === 0) {
      alerts.error("Agrega al menos un ingrediente con cantidad.");
      return;
    }
    if (filledOutputs.length === 0) {
      alerts.error("Agrega al menos un producto resultante con cantidad.");
      return;
    }

    submitForm();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── El proceso de un vistazo: ingredientes → resultados ── */}
      <FormulaFlowSummary items={filledItems} outputs={filledOutputs} />

      {/* ───────────────── Ingredientes ───────────────── */}
      <Section
        icon="basket-outline"
        color={colors.warning}
        title="Ingredientes"
        subtitle="Lo que se consume cada vez que se corre el proceso"
        badge={`${filledItems.length}`}
      >
        <EditableTable
          name="items"
          columns={INGREDIENT_COLUMNS}
          defaultRow={DEFAULT_INGREDIENT}
          addLabel="Agregar ingrediente"
          emptyMessage="Agrega los insumos que se consumen: materia prima, granel de otra fórmula…"
        />
      </Section>

      {/* ───────────────── Resultados ───────────────── */}
      <Section
        icon="package-variant"
        color={colors.success}
        title="Resultados"
        subtitle="Todo lo que se obtiene. De unos cocos pueden salir agua, dulce y fibra a la vez"
        badge={`${filledOutputs.length}`}
      >
        <EditableTable
          name="outputs"
          columns={OUTPUT_COLUMNS}
          defaultRow={DEFAULT_OUTPUT}
          addLabel="Agregar resultado"
          emptyMessage="Agrega cada producto que entrega el proceso, con lo que rinde."
        />

        <View style={styles.hint}>
          <Icon source="information-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.hintText}>
            El primer resultado es el principal: es el que da nombre al proceso
            en los listados.
          </Text>
        </View>
      </Section>

      {/* ───────────────── Identificación ───────────────── */}
      <Section
        icon="flask-outline"
        color={colors.primary}
        title="Datos de la fórmula"
        subtitle="Cómo se identifica el proceso"
      >
        <FormInput
          name="name"
          label="Nombre del proceso"
          placeholder="Ej: Procesamiento de coco"
          required
        />
        <FormInput
          name="description"
          label="Descripción"
          placeholder="Qué hace el proceso y qué rinde"
          multiline
          numberOfLines={2}
        />
        <FormInput
          name="notes"
          label="Notas internas"
          multiline
          numberOfLines={2}
        />
        <FormSwitch name="is_active" text="Fórmula activa" />
      </Section>

      <View style={styles.actionBar}>
        <Button
          mode="outlined"
          onPress={() => goBack()}
          style={{ flex: 1 }}
          disabled={isSubmitting}
        >
          {canSave ? "Cancelar" : "Volver"}
        </Button>
        {canSave && (
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="content-save"
            style={{ flex: 1.4 }}
          >
            {editing ? "Guardar cambios" : "Crear fórmula"}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * Bloque del formulario con encabezado. Mismo patrón que el formulario de
 * productos para que las dos pantallas se lean igual.
 */
function Section(props: {
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const styles = useFormStyles();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionIcon, { backgroundColor: props.color + "1F" }]}
        >
          <Icon source={props.icon} size={18} color={props.color} />
        </View>

        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{props.title}</Text>
          {!!props.subtitle && (
            <Text style={styles.sectionSubtitle}>{props.subtitle}</Text>
          )}
        </View>

        {props.badge ? (
          <View style={[styles.badge, { backgroundColor: props.color + "1F" }]}>
            <Text style={[styles.badgeText, { color: props.color }]}>
              {props.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

function useFormStyles() {
  return useThemedStyles((colors) => ({
    scroll: {
      padding: tokens.spacing[3],
      paddingBottom: tokens.spacing[10],
      maxWidth: 760,
      width: "100%",
      alignSelf: "center",
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: tokens.spacing[5],
      paddingTop: tokens.spacing[4],
      paddingBottom: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingBottom: tokens.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      ...tokens.typography.h3,
      color: colors.text,
    },
    sectionSubtitle: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
    },
    sectionBody: {
      paddingTop: tokens.spacing[3],
    },
    badge: {
      minWidth: 26,
      paddingHorizontal: tokens.spacing[2],
      paddingVertical: 2,
      borderRadius: tokens.radius.full,
      alignItems: "center",
    },
    badgeText: {
      ...tokens.typography.micro,
      fontWeight: "700" as const,
    },
    hint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[1],
    },
    hintText: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
    actionBar: {
      flexDirection: "row",
      gap: tokens.spacing[3],
      marginTop: tokens.spacing[2],
    },
  }));
}
