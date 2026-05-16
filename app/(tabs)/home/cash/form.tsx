import AppForm from "@/components/Form/AppForm/AppForm";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import * as Yup from "yup";

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

const validationSchema = Yup.object().shape({
  type: Yup.string().required("Selecciona un tipo"),
  concept: Yup.string().required("El concepto es requerido"),
  amount: Yup.number()
    .typeError("Ingresa un monto válido")
    .required("El monto es requerido")
    .min(0.01, "El monto debe ser mayor a 0"),
  payment_method: Yup.string().required("Selecciona un método de pago"),
  movement_date: Yup.string().required("La fecha es requerida"),
});

export default function CashMovementForm() {
  const params = useLocalSearchParams();
  const movementId = params.id ? parseInt(params.id as string) : undefined;

  return (
    <AppForm
      api={Services.cashMovements}
      id={movementId}
      initialValues={{
        type: "income",
        concept: "",
        amount: "",
        payment_method: "cash",
        movement_date: new Date().toISOString().split("T")[0],
        notes: "",
      }}
      validationSchema={validationSchema}
      onSuccess={() => router.back()}
    >
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
    </AppForm>
  );
}


