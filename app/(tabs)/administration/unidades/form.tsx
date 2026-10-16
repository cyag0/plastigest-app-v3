import { goBack } from "@/utils/navigation";
import FormValueWatcher from "@/components/Administration/FormValueWatcher";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { router } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef, useState } from "react";
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
  unit_type?: string | null;
}

// Una unidad que no es conversión necesita su tipo: el backend lo exige y
// antes el formulario no lo pedía, así que crearla siempre fallaba.
const UNIT_TYPES = [
  { label: "Cantidad (piezas)", value: "quantity" },
  { label: "Peso (kg, g)", value: "mass" },
  { label: "Volumen (L, ml)", value: "volume" },
  { label: "Longitud (m, cm)", value: "length" },
];

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
  unit_type: Yup.string()
    .nullable()
    .when("conversion", {
      is: false,
      then: (schema) => schema.required("Selecciona el tipo de unidad"),
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
  // Empresa de la unidad cargada: las globales (company_id null) solo las
  // modifica un administrador del sistema (el backend responde 403).
  const [unitCompanyId, setUnitCompanyId] = useState<unknown>(undefined);
  const isGlobalUnit = !!id && unitCompanyId === null;

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
      permissionPrefix="units"
      submitPermission={isGlobalUnit ? "system_admin" : undefined}
      deletePermission={isGlobalUnit ? "system_admin" : undefined}
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
        unit_type: "quantity",
      }}
      id={id}
      readonly={readonly}
      onSuccess={() => {
        goBack();
      }}
    >
      <FormValueWatcher name="company_id" onChange={setUnitCompanyId} />

      <View style={{ backgroundColor: "white", padding: 24, shadowOffset: { width: 0, height: 0 } }}>

  
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

      <FormCheckBox name="conversion" text="¿Es una unidad de conversión?" />

      <AppDependency name="conversion">
        {(value = false) => {
          if (!value) {
            return (
              <FormSelectSimple
                name="unit_type"
                label="Tipo de unidad *"
                data={UNIT_TYPES}
              />
            );
          }
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
          </View>
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
