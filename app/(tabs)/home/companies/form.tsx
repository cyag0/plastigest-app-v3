/**
 * Datos de una empresa (alta, edición y vista de solo lectura): el nombre, el
 * contacto y los datos fiscales, que salen en el encabezado de los tickets.
 * Es también «Datos de la empresa» en Administración.
 *
 * El RFC se escribe en mayúsculas y sin espacios: el backend lo valida así
 * antes de normalizarlo (en minúsculas respondía «formato inválido»).
 * «Activa» solo al editar y para quien administra todas las empresas
 * (companies_list); a la empresa propia no le cambia nada desactivarla.
 */

import AppForm, { AppFormRef, useAppForm } from "@/components/Form/AppForm/AppForm";
import MakeForm from "@/components/Form/AppForm/hoc";
import AppInput, { FormInput } from "@/components/Form/AppInput";
import { FormPhoneInput } from "@/components/Form/AppPhoneInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import { useCan } from "@/hooks/useCan";
import { goBack } from "@/utils/navigation";
import { phoneSchema } from "@/utils/phone";
import Services from "@/utils/services";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect, useRef } from "react";
import * as yup from "yup";

/**
 * Lo que cabe en la tabla companies (el backend valida 255 en el nombre y en
 * el correo, y 500 en la dirección, pero las columnas guardan 150, 100 y 255).
 */
const LIMITS = { name: 150, business_name: 255, rfc: 13, email: 100, address: 255 };

/** El mismo patrón que valida el backend: 12 caracteres (empresa) o 13 (persona física). */
const RFC_PATTERN = /^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Escribe el nombre de la empresa")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  email: yup
    .string()
    .trim()
    .required("Escribe un correo de contacto")
    .email("Revisa el correo; parece incompleto")
    .max(LIMITS.email, tooLong(LIMITS.email)),
  phone: phoneSchema(),
  address: yup.string().nullable().max(LIMITS.address, tooLong(LIMITS.address)),
  business_name: yup
    .string()
    .trim()
    .required("Escribe la razón social")
    .max(LIMITS.business_name, tooLong(LIMITS.business_name)),
  rfc: yup
    .string()
    .trim()
    .required("Escribe el RFC")
    .matches(RFC_PATTERN, "Revisa el RFC: son 12 caracteres si es empresa o 13 si es persona física"),
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

/**
 * RFC en mayúsculas y sin espacios ni guiones mientras se escribe o se pega
 * ("cdp-180312-ab1" → "CDP180312AB1"). El largo se corta ya limpio: con
 * maxLength en el campo, un RFC pegado con espacios perdía sus últimas letras.
 */
function RfcInput(props: React.ComponentProps<typeof AppInput>) {
  const { onChange } = props;
  return (
    <AppInput
      {...props}
      onChange={(text) => onChange?.(text.toUpperCase().replace(/[\s.-]/g, "").slice(0, LIMITS.rfc))}
    />
  );
}

const FormRfcInput = MakeForm(RfcInput);

interface CompaniesProps {
  id?: number;
  readonly?: boolean;
}

export default function CompaniesForm(props: CompaniesProps) {
  const formRef = useRef<AppFormRef<Company>>(null);
  const { can } = useCan();
  const isEditing = !!props.id;
  // Ver y administrar todas las empresas es del administrador del sistema.
  const managesAll = can("companies_list");

  return (
    <AppForm
      permissionPrefix="companies"
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
      submitButtonText={isEditing ? "Guardar cambios" : "Guardar empresa"}
      successMessage={isEditing ? "Cambios guardados" : "Empresa guardada"}
      onSuccess={() => goBack()}
    >
      <CompanyFields isEditing={isEditing} showActive={isEditing && managesAll} />
    </AppForm>
  );
}

/**
 * Los campos. Van dentro de AppForm para saber si está en solo lectura
 * (también después de tocar «Editar»): ahí sobra «(opcional)» y el título es
 * «Empresa».
 */
function CompanyFields({ isEditing, showActive }: { isEditing: boolean; showActive: boolean }) {
  const { readonly } = useAppForm();
  const optional = !readonly;
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: readonly ? "Empresa" : isEditing ? "Editar empresa" : "Nueva empresa",
    });
  }, [navigation, readonly, isEditing]);

  return (
    <>
      <FormInput
        name="name"
        label="Nombre"
        placeholder="Cocos Francisco"
        maxLength={LIMITS.name}
      />

      <FormSection title="Contacto">
        <FormRow>
          <FormInput
            name="email"
            label="Correo electrónico"
            placeholder="contacto@cocosfrancisco.mx"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            maxLength={LIMITS.email}
          />
          <FormPhoneInput name="phone" label="Teléfono" optional={optional} />
        </FormRow>
        <FormInput
          name="address"
          label="Dirección"
          optional={optional}
          placeholder="Av. México #210, Puerto Vallarta, Jalisco"
          multiline
          maxLength={LIMITS.address}
        />
      </FormSection>

      <FormSection title="Datos fiscales" description="La razón social y el RFC salen en los tickets.">
        <FormRow widths={[3, 2]}>
          <FormInput
            name="business_name"
            label="Razón social"
            placeholder="Cocos Francisco SA de CV"
            maxLength={LIMITS.business_name}
          />
          <FormRfcInput
            name="rfc"
            label="RFC"
            placeholder="CFR180312AB1"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </FormRow>
      </FormSection>

      {showActive && <FormSwitch name="is_active" text="Activa" />}
    </>
  );
}
