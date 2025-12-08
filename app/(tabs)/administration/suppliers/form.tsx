import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import * as yup from "yup";

// Esquema de validación basado en las validaciones del backend
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required("El nombre del proveedor es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres")
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  business_name: yup
    .string()
    .nullable()
    .max(255, "El nombre comercial no puede exceder 255 caracteres"),
  social_reason: yup
    .string()
    .nullable()
    .max(20, "La razón social no puede exceder 20 caracteres"),
  rfc: yup
    .string()
    .nullable()
    .max(20, "El RFC no puede exceder 20 caracteres")
    .test("rfc-format", "El RFC no tiene un formato válido", function (value) {
      if (!value || value.trim() === "") return true; // Si está vacío, es válido (nullable)
      return /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i.test(value);
    }),
  email: yup
    .string()
    .nullable()
    .max(100, "El email no puede exceder 100 caracteres")
    .test("email-format", "Debe ser un email válido", function (value) {
      if (!value || value.trim() === "") return true; // Si está vacío, es válido (nullable)
      return yup.string().email().isValidSync(value);
    }),
  phone: yup
    .string()
    .nullable()
    .max(50, "El teléfono no puede exceder 50 caracteres")
    .test(
      "phone-format",
      "El teléfono solo debe contener números y caracteres válidos",
      function (value) {
        if (!value || value.trim() === "") return true; // Si está vacío, es válido (nullable)
        return /^[0-9+\-\s()]+$/.test(value);
      }
    ),
  address: yup
    .string()
    .nullable()
    .max(255, "La dirección no puede exceder 255 caracteres"),
  company_id: yup.number().required("Debe seleccionar una empresa"),
  is_active: yup.boolean(),
});

interface SupplierFormData {
  name: string;
  business_name?: string;
  social_reason?: string;
  rfc?: string;
  email?: string;
  phone?: string;
  address?: string;
  company_id: number;
  is_active: boolean;
}

interface SuppliersFormProps {
  id?: number;
  readonly?: boolean;
}

export default function SuppliersForm(props: SuppliersFormProps) {
  const params = useLocalSearchParams();
  const supplierId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!supplierId;
  const formRef = useRef<AppFormRef<SupplierFormData>>(null);

  const { company } = useSelectedCompany();

  return (
    <AppForm
      ref={formRef}
      api={Services.suppliers}
      id={supplierId}
      readonly={props.readonly}
      initialValues={{
        company_id: company?.id || undefined,
      }}
      validationSchema={validationSchema}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <FormInput
            name="name"
            label="Nombre del Proveedor"
            placeholder="Ej: Proveedora de Plásticos SA"
            required
            maxLength={150}
          />

          <FormInput
            name="business_name"
            label="Nombre Comercial"
            placeholder="Nombre comercial o marca"
            maxLength={255}
          />

          <FormInput
            name="social_reason"
            label="Razón Social"
            placeholder="Razón social completa"
            maxLength={20}
          />

          <FormInput
            name="rfc"
            label="RFC"
            placeholder="Ej: ABC123456ABC"
            autoCapitalize="characters"
            maxLength={20}
          />

          <FormInput
            name="email"
            label="Correo Electrónico"
            placeholder="contacto@proveedor.com"
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
          />

          <FormInput
            name="phone"
            label="Teléfono"
            placeholder="Ej: +52 55 1234 5678"
            keyboardType="phone-pad"
            maxLength={50}
          />

          <FormInput
            name="address"
            label="Dirección"
            placeholder="Dirección completa del proveedor"
            multiline
            numberOfLines={3}
            maxLength={255}
          />

          <FormProSelect
            name="company_id"
            label="Empresa"
            model="admin.companies"
            placeholder="Seleccione una empresa"
            required
          />

          <FormCheckBox name="is_active" text="Proveedor Activo" />
        </View>
      </ScrollView>
    </AppForm>
  );
}
