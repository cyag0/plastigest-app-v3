import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormRadioButton } from "@/components/Form/AppRadioButton";
import Services from "@/utils/services";
import React, { useRef, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as Yup from "yup";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { router } from "expo-router";

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
  conversion_rate: Yup.number().min(0.000001, "Debe ser mayor a 0").required("El factor de conversión es requerido"),
});

interface UnidadFormProps {
  id?: number;
  readonly?: boolean;
}

const UnidadForm = ({ id, readonly }: UnidadFormProps) => {
  const formRef = useRef<AppFormRef<UnidadFormData>>(null);
  const { company, availableCompanies, selectCompany } = useSelectedCompany();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Si no hay empresa seleccionada pero hay empresas disponibles, seleccionar la primera
    if (!company && availableCompanies && availableCompanies.length > 0) {
      selectCompany(availableCompanies[0]);
    }
    setIsReady(true);
  }, [company, availableCompanies]);

  if (!isReady || !company) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
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
    <View style={{ flex: 1 }}>
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
        <FormInput
          name="symbol"
          label="Símbolo *"
          placeholder="Ej: pz, cj, m"
        />
        <FormRadioButton
          name="type"
          label="Tipo de Unidad *"
          options={unitTypes}
        />
        <FormCheckBox
          name="is_base"
          label="¿Es unidad base?"
        />
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
        <FormCheckBox
          name="is_active"
          label="Activo"
        />
      </AppForm>
    </View>
  );
};

export default UnidadForm;