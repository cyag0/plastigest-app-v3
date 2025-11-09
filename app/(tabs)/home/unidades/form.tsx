import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormRadioButton } from "@/components/Form/AppRadioButton";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { router } from "expo-router";
import React, { useRef } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import * as Yup from "yup";

interface UnidadFormData {
  name: string;
  symbol: string;
  description?: string;
  type: string;
  is_base: boolean;
  conversion_rate: number;
  is_active: boolean;
  company_id?: number;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  symbol: Yup.string().required("El símbolo es requerido"),
  type: Yup.string().required("El tipo es requerido"),
  conversion_rate: Yup.number()
    .min(0.000001, "Debe ser mayor a 0")
    .required("El factor de conversión es requerido"),
});

interface UnidadFormProps {
  id?: number;
  readonly?: boolean;
}

const UnidadForm = ({ id, readonly }: UnidadFormProps) => {
  const formRef = useRef<AppFormRef<UnidadFormData>>(null);

  const auth = useAuth();
  const alerts = useAlerts();
  const company = auth.selectedCompany;

  if (!company) {
    alerts.error("Debe seleccionar una compañía antes de continuar.");

    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Debe seleccionar una compañía primero.</Text>
      </View>
    );
  }

  const unitTypes = [
    { label: "Cantidad", value: "quantity" },
    { label: "Longitud", value: "length" },
    { label: "Peso", value: "weight" },
    { label: "Volumen", value: "volume" },
    { label: "Otro", value: "other" },
  ];

  return (
    <AppForm
      ref={formRef}
      api={Services.home.unidades}
      validationSchema={validationSchema}
      initialValues={{
        name: "",
        symbol: "",
        description: "",
        type: "quantity",
        is_base: false,
        conversion_rate: 1.0,
        is_active: true,
        company_id: company.id,
      }}
      id={id}
      readonly={readonly}
      onSuccess={() => {
        router.back();
      }}
    >
      <FormInput
        name="name"
        label="Nombre *"
        placeholder="Ej: Pieza, Caja, Metro"
      />
      <FormInput name="symbol" label="Símbolo *" placeholder="Ej: pz, cj, m" />
      <FormRadioButton
        name="type"
        label="Tipo de Unidad *"
        options={unitTypes}
      />
      <FormCheckBox name="is_base" text="¿Es unidad base?" />
      <FormInput
        name="conversion_rate"
        label="Factor de conversión *"
        placeholder="Ej: 12 (1 caja = 12 piezas)"
        keyboardType="decimal-pad"
      />
      <FormInput
        name="description"
        label="Descripción"
        placeholder="Descripción opcional"
        multiline
        numberOfLines={3}
      />
      <FormCheckBox name="is_active" text="Activo" />
    </AppForm>
  );
};

export default UnidadForm;
