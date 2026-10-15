import { goBack } from "@/utils/navigation";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import AmountPreview from "@/components/Pos/AmountPreview";
import { useAlerts } from "@/hooks/useAlerts";
import { parseMoney } from "@/utils/format";
import { roundMoney } from "@/utils/money";
import Services from "@/utils/services";
import { FormikProps, useFormikContext } from "formik";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import * as Yup from "yup";
import { View } from "react-native";
import { toLocalDateString } from "@/utils/dates";

const TYPE_OPTIONS = [
  { label: "Ingreso", value: "income" },
  { label: "Egreso", value: "expense" },
  { label: "Ajuste", value: "adjustment" },
];

const PAYMENT_OPTIONS = [
  { label: "Efectivo", value: "cash" },
  { label: "Tarjeta", value: "card" },
  { label: "Transferencia", value: "transfer" },
  { label: "Otro", value: "other" },
];

/** Monto capturado (texto) o cargado del servidor (número). */
const readAmount = (value: unknown): number | null =>
  typeof value === "number" ? parseMoney(value) : parseMoney(value == null ? "" : String(value));

const validationSchema = Yup.object().shape({
  type: Yup.string().required("Selecciona un tipo"),
  concept: Yup.string().required("El concepto es requerido"),
  // Formato mexicano: "1,500" son mil quinientos (Yup.number lo rechazaba).
  amount: Yup.mixed().test("money", function (value) {
    if (value == null || String(value).trim() === "") {
      return this.createError({ message: "El monto es requerido" });
    }
    const amount = readAmount(value);
    if (amount === null) {
      return this.createError({ message: "Ingresa un monto válido: escríbelo como 1500 o 1,500.50" });
    }
    if (amount < 0.01) {
      return this.createError({ message: "El monto debe ser mayor a 0" });
    }
    return true;
  }),
  payment_method: Yup.string().required("Selecciona un método de pago"),
  movement_date: Yup.string().required("La fecha es requerida"),
});

/** Debajo del monto: cómo se leyó lo escrito. */
function AmountFieldPreview() {
  const { values } = useFormikContext<{ amount?: unknown }>();
  const text = values.amount == null ? "" : String(values.amount);
  return (
    <View style={{ marginBottom: 4 }}>
      <AmountPreview value={text} label="Se registrará" />
    </View>
  );
}

export default function CashMovementForm() {
  const params = useLocalSearchParams();
  const movementId = params.id ? parseInt(params.id as string) : undefined;
  const alerts = useAlerts();

  /**
   * Guardado con el monto ya leído en formato mexicano. Los errores los
   * muestra AppForm (con el detalle de validación del servidor).
   */
  const save = async (_formData: any, form: FormikProps<any>) => {
    const ok = await alerts.confirm("¿Estás seguro de guardar los cambios?", {
      okText: "Sí, guardar",
      cancelText: "Cancelar",
      title: "Confirmar guardado",
    });
    if (!ok) return;

    const { type, concept, amount, payment_method, movement_date, notes } = form.values;
    const data = {
      type,
      concept,
      amount: roundMoney(readAmount(amount) ?? NaN),
      payment_method,
      movement_date,
      notes,
    };

    if (movementId) {
      await Services.cashMovements.update(movementId, data);
      alerts.success("Actualizado correctamente");
    } else {
      await Services.cashMovements.store(data);
      alerts.success("Creado correctamente");
    }
    goBack();
  };

  return (
    <AppForm
      api={Services.cashMovements}
      id={movementId}
      initialValues={{
        type: "income",
        concept: "",
        amount: "",
        payment_method: "cash",
        movement_date: toLocalDateString(),
        notes: "",
      }}
      validationSchema={validationSchema}
      onSubmit={save}
    >
     <View style={{ backgroundColor: "white", padding: 24, shadowOffset: { width: 0, height: 0 } }}>
       <FormSelectSimple name="type" label="Tipo" data={TYPE_OPTIONS} />
      <FormInput
        name="concept"
        label="Concepto"
        placeholder="Descripción del movimiento"
      />
      <FormInput
        name="amount"
        label="Monto"
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <AmountFieldPreview />
      <FormSelectSimple
        name="payment_method"
        label="Método de pago"
        data={PAYMENT_OPTIONS}
      />
      <FormDatePicker name="movement_date" label="Fecha" />
      <FormInput
        name="notes"
        label="Notas"
        placeholder="Opcional"
        multiline
        numberOfLines={3}
      />
     </View>
    </AppForm>
  );
}


