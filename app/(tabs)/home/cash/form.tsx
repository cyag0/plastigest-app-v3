/**
 * Movimiento de caja capturado a mano: dinero que entra o sale de la caja sin
 * una venta, compra o gasto detrás (un fondo para cambio, un retiro para el
 * banco). Los que genera el sistema no se abren aquí (ver cash/index).
 *
 *   Tipo        [Ingreso | Egreso | Ajuste]   ingreso y ajuste suman, egreso resta
 *   Concepto
 *   Monto       "1,500" son mil quinientos; debajo, cómo se leyó
 *   Método de pago · Fecha
 *   Caja        en efectivo y sin turno propio: de cuál caja sale o a cuál
 *               entra (el corte de ese turno lo cuenta, con tu nombre)
 *   Notas (opcional)
 */

import SegmentedControl from "@/components/App/SegmentedControl";
import CashSourcePicker, { useOpenCashSessions } from "@/components/Cash/CashSourcePicker";
import AppForm, { useAppForm } from "@/components/Form/AppForm/AppForm";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormRow } from "@/components/Form/FormLayout";
import AmountPreview from "@/components/Pos/AmountPreview";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { toLocalDateString } from "@/utils/dates";
import { formatMoney, parseMoney } from "@/utils/format";
import { roundMoney } from "@/utils/money";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { FormikProps, useField, useFormikContext } from "formik";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Text, View } from "react-native";
import * as Yup from "yup";

type MovementType = "income" | "expense" | "adjustment";

/** El monto siempre es positivo: el tipo dice si suma o resta. */
const TYPE_OPTIONS: { value: MovementType; label: string; hint: string }[] = [
  { value: "income", label: "Ingreso", hint: "Entra dinero a la caja." },
  { value: "expense", label: "Egreso", hint: "Sale dinero de la caja." },
  { value: "adjustment", label: "Ajuste", hint: "Corrige el saldo: se suma a la caja." },
];

const PAYMENT_OPTIONS = [
  { label: "Efectivo", value: "cash" },
  { label: "Tarjeta", value: "card" },
  { label: "Transferencia", value: "transfer" },
  { label: "Otro", value: "other" },
];

/** Lo que acepta el backend: concepto de 255 y notas de 2000. */
const LIMITS = { concept: 255, notes: 2000 };

/** Monto capturado (texto) o cargado del servidor (número). */
const readAmount = (value: unknown): number | null =>
  typeof value === "number" ? parseMoney(value) : parseMoney(value == null ? "" : String(value));

const validationSchema = Yup.object().shape({
  type: Yup.string().required("Elige el tipo de movimiento"),
  concept: Yup.string()
    .trim()
    .required("Escribe el concepto")
    .max(LIMITS.concept, `Máximo ${LIMITS.concept} caracteres`),
  // Formato mexicano: "1,500" son mil quinientos (Yup.number lo rechazaba).
  amount: Yup.mixed().test("money", function (value) {
    if (value == null || String(value).trim() === "") {
      return this.createError({ message: "Escribe el monto" });
    }
    const amount = readAmount(value);
    if (amount === null) {
      return this.createError({ message: "Escríbelo como 1500 o 1,500.50" });
    }
    if (amount < 0.01) {
      return this.createError({ message: "El monto debe ser mayor a 0" });
    }
    return true;
  }),
  payment_method: Yup.string().required("Elige el método de pago"),
  movement_date: Yup.string().required("Elige la fecha"),
  notes: Yup.string().nullable().max(LIMITS.notes, `Máximo ${LIMITS.notes} caracteres`),
});

function useFieldStyles() {
  return useThemedStyles((c) => ({
    field: { marginBottom: 18 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 6 },
    // Del alto de los demás campos.
    segmented: { minHeight: 48 },
  }));
}

/** Ingreso, egreso o ajuste, siempre a la vista; debajo, qué hace con la caja. */
function TypeField() {
  const [field, , helpers] = useField<MovementType>("type");
  const { readonly } = useAppForm();
  const styles = useFieldStyles();
  const selected = TYPE_OPTIONS.find((option) => option.value === field.value);

  return (
    <View style={styles.field}>
      <InputLabel label="Tipo" />
      {readonly ? (
        <ReadonlyText text={selected?.label ?? ""} />
      ) : (
        <>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={field.value}
            onChange={(value) => helpers.setValue(value)}
            stretch
            style={styles.segmented}
            accessibilityLabel="Tipo de movimiento"
          />
          {!!selected && <Text style={styles.hint}>{selected.hint}</Text>}
        </>
      )}
    </View>
  );
}

/** El monto y, debajo, cómo se leyó lo escrito ("1,500" → $1,500.00). */
function AmountField() {
  const { values } = useFormikContext<{ amount?: unknown }>();
  const { readonly } = useAppForm();
  const styles = useFieldStyles();
  const text = values.amount == null ? "" : String(values.amount);
  const amount = readAmount(values.amount);

  if (readonly) {
    return (
      <View style={styles.field}>
        <InputLabel label="Monto" />
        <ReadonlyText text={amount !== null ? formatMoney(amount) : ""} />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <FormInput
        name="amount"
        label="Monto"
        placeholder="0.00"
        keyboardType="decimal-pad"
        inputMode="decimal"
        containerStyle={{ marginBottom: 0 }}
      />
      {/* Solo con un monto válido: si no, el error lo dice el campo. */}
      {amount !== null && amount > 0 && <AmountPreview value={text} label="Se registrará" />}
    </View>
  );
}

/**
 * De qué caja sale (o a cuál entra) el efectivo, al capturar uno nuevo. Lo que
 * falta elegir queda en `problemRef` para que el guardado lo revise.
 */
function CashSourceField({ problemRef }: { problemRef: React.MutableRefObject<string | null> }) {
  const { values, setFieldValue, submitCount } = useFormikContext<{
    type: MovementType;
    payment_method: string;
    cash_register_session_id: number | null;
  }>();
  const { readonly } = useAppForm();
  const styles = useFieldStyles();
  const active = values.payment_method === "cash" && !readonly;
  const cash = useOpenCashSessions(active);
  const problem = cash.problem(values.cash_register_session_id);
  useEffect(() => {
    problemRef.current = problem;
  }, [problem, problemRef]);

  if (!active) return null;

  return (
    <View style={styles.field}>
      <CashSourcePicker
        state={cash}
        active
        value={values.cash_register_session_id}
        onChange={(sessionId) => setFieldValue("cash_register_session_id", sessionId)}
        incoming={values.type !== "expense"}
        showError={submitCount > 0}
      />
    </View>
  );
}

export default function CashMovementForm() {
  const params = useLocalSearchParams();
  const movementId = params.id ? parseInt(params.id as string) : undefined;
  const alerts = useAlerts();
  const navigation = useNavigation();
  const { can } = useCan();
  const canSave = can(movementId ? "cash_movements_update" : "cash_movements_create");
  const cashProblem = useRef<string | null>(null);

  // Título de la barra en el teléfono (en web lo ponen las migas de la ruta).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: !movementId
        ? "Nuevo movimiento"
        : canSave
          ? "Editar movimiento"
          : "Movimiento de caja",
    });
  }, [navigation, movementId, canSave]);

  /**
   * Guardado con el monto ya leído en formato mexicano. Los errores los
   * muestra AppForm (con el detalle de validación del servidor). Ya no se
   * pregunta «¿Estás seguro de guardar los cambios?»: solo era un paso más.
   */
  const save = async (_formData: any, form: FormikProps<any>) => {
    const { type, concept, amount, payment_method, movement_date, notes, cash_register_session_id } = form.values;
    // En efectivo y sin turno propio hay que elegir la caja (el servidor
    // también lo rechaza).
    if (!movementId && payment_method === "cash" && cashProblem.current) {
      throw new Error(cashProblem.current);
    }
    const data = {
      type,
      concept: String(concept ?? "").trim(),
      amount: roundMoney(readAmount(amount) ?? NaN),
      payment_method,
      movement_date,
      notes,
      ...(!movementId && payment_method === "cash" && cash_register_session_id
        ? { cash_register_session_id }
        : {}),
    };

    if (movementId) {
      await Services.cashMovements.update(movementId, data);
    } else {
      await Services.cashMovements.store(data);
    }
    alerts.success("Movimiento guardado");
    goBack();
  };

  return (
    <AppForm
      api={Services.cashMovements}
      id={movementId}
      // Guardar pide cash_movements_update con ?id= y cash_movements_create sin él
      // (sin el permiso se ve «Solo lectura» en lugar del botón).
      permissionPrefix="cash_movements"
      initialValues={{
        type: "income",
        concept: "",
        amount: "",
        payment_method: "cash",
        movement_date: toLocalDateString(),
        notes: "",
        cash_register_session_id: null,
      }}
      validationSchema={validationSchema}
      onSubmit={save}
      submitButtonText={movementId ? "Guardar cambios" : "Guardar movimiento"}
    >
      <TypeField />
      <FormInput
        name="concept"
        label="Concepto"
        placeholder="Por ejemplo, Fondo para cambio"
        maxLength={LIMITS.concept}
      />
      <AmountField />
      <FormRow>
        <FormSelectSimple
          name="payment_method"
          label="Método de pago"
          data={PAYMENT_OPTIONS}
          hideSearchBox
        />
        <FormDatePicker name="movement_date" label="Fecha" />
      </FormRow>
      {!movementId && <CashSourceField problemRef={cashProblem} />}
      <FormInput
        name="notes"
        label="Notas"
        optional
        multiline
        numberOfLines={3}
        maxLength={LIMITS.notes}
      />
    </AppForm>
  );
}
