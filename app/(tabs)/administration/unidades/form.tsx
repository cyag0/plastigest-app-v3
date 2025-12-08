import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { router } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import * as Yup from "yup";

interface UnidadFormData {
  name: string;
  abbreviation: string;
  company_id: number;
  conversion: boolean;
  base_unit_id?: number | null;
  factor_to_base?: number | null;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  abbreviation: Yup.string().required("La abreviación es requerida"),
  company_id: Yup.number().required("La compañía es requerida"),
  conversion: Yup.boolean(),
  base_unit_id: Yup.number().when("conversion", {
    is: true,
    then: (schema) => schema.required("Debe seleccionar la unidad base"),
    otherwise: (schema) => schema.nullable(),
  }),
  factor_to_base: Yup.number().when("conversion", {
    is: true,
    then: (schema) =>
      schema
        .required("El factor de conversión es requerido")
        .min(0.000001, "El factor debe ser mayor a 0"),
    otherwise: (schema) => schema.nullable(),
  }),
});

interface UnidadFormProps {
  id?: number;
  readonly?: boolean;
}

const UnidadForm = ({ id, readonly }: UnidadFormProps) => {
  const formRef = useRef<AppFormRef<UnidadFormData>>(null);
  const { company } = useSelectedCompany();
  const alerts = useAlerts();

  console.log("Selected Location:");

  if (!company) {
    alerts.error("Debe seleccionar una compañía antes de continuar.");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Debe seleccionar una compañía primero.</Text>
      </View>
    );
  }

  return (
    <AppForm
      ref={formRef}
      api={Services.home.unidades}
      validationSchema={validationSchema}
      initialValues={{
        name: "",
        abbreviation: "",
        company_id: company.id,
        conversion: false,
        base_unit_id: null,
        factor_to_base: 1,
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
        name="abbreviation"
        label="Abreviación *"
        placeholder="Ej: pz, cj, m"
      />

      <FormCheckBox name="conversion" label="¿Es una unidad de conversión?" />

      <AppDependency name="conversion">
        {(value = false) => {
          return (
            value && (
              <>
                <FormProSelect
                  name="base_unit_id"
                  label="Equivale a"
                  model="home.unidades"
                  placeholder="Seleccione una unidad"
                />
                <FormNumeric
                  name="factor_to_base"
                  label="Factor de conversión *"
                  placeholder="Ej: 12 (1 caja = 12 piezas)"
                  keyboardType="decimal-pad"
                />
              </>
            )
          );
        }}
      </AppDependency>
    </AppForm>
  );
};

function ConversionSection() {
  const form = useFormikContext<UnidadFormData>();

  return (
    <>
      <Text
        variant="bodySmall"
        style={{ marginTop: -8, marginBottom: 16, opacity: 0.7 }}
      >
        Ejemplo: Si 1 caja = 12 piezas, el factor es 12
      </Text>
    </>
  );
}

export default UnidadForm;
