import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as yup from "yup";

// Esquema de validación
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required("El nombre de la compañía es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  business_name: yup
    .string()
    .required("La razón social es requerida")
    .min(2, "La razón social debe tener al menos 2 caracteres"),
  rfc: yup
    .string()
    .required("El RFC es requerido")
    .matches(
      /^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
      "El RFC no tiene un formato válido"
    ),
  email: yup
    .string()
    .email("Debe ser un email válido")
    .required("El email es requerido"),
  phone: yup
    .string()
    .matches(
      /^[0-9+\-\s()]+$/,
      "El teléfono solo debe contener números y caracteres válidos"
    ),
  address: yup.string(),
  is_active: yup.boolean(),
});

interface Company {
  name: string;
  business_name: string;
  rfc: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface CompaniesProps {
  id?: number;
  readonly?: boolean;
}

export default function CompaniesForm(props: CompaniesProps) {
  const formRef = useRef<AppFormRef<Company>>(null);

  return (
    <View style={styles.container}>
      <AppForm
        ref={formRef}
        api={Services.admin.companies}
        initialValues={{
          name: "",
          business_name: "",
          rfc: "",
          address: "",
          phone: "",
          email: "",
          is_active: true,
        }}
        validationSchema={validationSchema}
        id={props.id}
        readonly={props.readonly}
        onSuccess={(response) => {
          console.log("Compañía guardada exitosamente:", response);
        }}
        onError={(error) => {
          console.error("Error al guardar compañía:", error);
        }}
      >
        {/* Información básica */}
        <View style={styles.section}>
          <FormInput
            name="name"
            label="Nombre de la Compañía"
            placeholder="Ingrese el nombre comercial"
          />

          <FormInput
            name="business_name"
            label="Razón Social"
            placeholder="Ingrese la razón social completa"
          />

          <FormInput
            name="rfc"
            label="RFC"
            placeholder="ABCD123456ABC"
            autoCapitalize="characters"
          />
        </View>

        {/* Información de contacto */}
        <View style={styles.section}>
          <FormInput
            name="email"
            label="Correo Electrónico"
            placeholder="correo@empresa.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormInput
            name="phone"
            label="Teléfono"
            placeholder="+52 55 1234 5678"
            keyboardType="phone-pad"
          />

          <FormInput
            name="address"
            label="Dirección"
            placeholder="Ingrese la dirección completa"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Estado */}
        <View style={styles.section}>
          <FormCheckBox
            name="is_active"
            label="Compañía Activa"
            text="La compañía está activa y operativa"
          />
        </View>
      </AppForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  section: {
    marginBottom: 20,
  },
});
