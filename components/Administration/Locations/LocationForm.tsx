/**
 * Alta y edición de una sucursal: Administración › Sucursales y «Datos de la
 * sucursal» (la actual). Arriba el nombre; luego la dirección y el teléfono,
 * que salen en los tickets; al final, al editar, si está activa.
 *
 * La empresa no se pregunta: es la actual (el backend la exige en
 * company_id). Antes había una caja «Compañía» que solo la repetía, con una
 * barra de color al costado.
 *
 * «Activa» solo la cambia quien administra todas las sucursales
 * (system_admin o locations_all): a los demás el backend les responde 403.
 */

import EmptyState from "@/components/App/EmptyState";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormPhoneInput } from "@/components/Form/AppPhoneInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { goBack } from "@/utils/navigation";
import { phoneSchema } from "@/utils/phone";
import Services from "@/utils/services";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import * as Yup from "yup";

/**
 * Lo que cabe en la tabla locations. El backend valida 255 en el nombre y
 * 500 en la dirección, pero las columnas guardan 150 y 255 (y el correo, 100):
 * un texto más largo pasaba la validación y fallaba al guardar.
 */
const LIMITS = { name: 150, description: 1000, address: 255, email: 100 };

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre de la sucursal")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  description: Yup.string().nullable().max(LIMITS.description, tooLong(LIMITS.description)),
  address: Yup.string()
    .trim()
    .required("Escribe la dirección de la sucursal")
    .max(LIMITS.address, tooLong(LIMITS.address)),
  phone: phoneSchema(),
  email: Yup.string()
    .nullable()
    .trim()
    .email("Revisa el correo; parece incompleto")
    .max(LIMITS.email, tooLong(LIMITS.email)),
  is_active: Yup.boolean(),
});

interface LocationFormProps {
  /** Sucursal a editar; sin él, una nueva. */
  id?: number | string;
  /** Título de la barra (por omisión "Nueva sucursal" / "Editar sucursal"). */
  title?: string;
}

export default function LocationForm({ id, title }: LocationFormProps) {
  const isEditing = !!id;
  const navigation = useNavigation();
  const { company } = useSelectedCompany();
  const allLocations = useAllLocationsAccess();

  useLayoutEffect(() => {
    navigation.setOptions({ title: title ?? (isEditing ? "Editar sucursal" : "Nueva sucursal") });
  }, [navigation, title, isEditing]);

  if (!company) {
    return (
      <EmptyState
        icon="domain"
        title="Elige una empresa"
        description="Las sucursales son de una empresa: elige con cuál vas a trabajar."
      />
    );
  }

  return (
    <AppForm
      permissionPrefix="locations"
      id={id}
      api={Services.admin.locations}
      initialValues={{
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        company_id: company.id,
        is_active: true,
      }}
      validationSchema={validationSchema}
      submitButtonText={isEditing ? "Guardar cambios" : "Guardar sucursal"}
      successMessage={isEditing ? "Cambios guardados" : "Sucursal guardada"}
      onSuccess={() => goBack("/(tabs)/administration/locations")}
    >
      <FormInput
        name="name"
        label="Nombre"
        placeholder="Cocos Francisco Centro"
        autoCapitalize="words"
        maxLength={LIMITS.name}
      />
      <FormInput
        name="description"
        label="Descripción"
        optional
        placeholder="Venta de mostrador y entregas a restaurantes"
        multiline
        maxLength={LIMITS.description}
      />

      <FormSection title="Ubicación y contacto" description="La dirección y el teléfono salen en los tickets.">
        <FormInput
          name="address"
          label="Dirección"
          placeholder="Abasolo #242A, El Pitillal, Puerto Vallarta, Jalisco"
          multiline
          maxLength={LIMITS.address}
        />
        <FormRow>
          <FormPhoneInput name="phone" label="Teléfono" optional />
          <FormInput
            name="email"
            label="Correo electrónico"
            optional
            placeholder="centro@cocosfrancisco.mx"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            maxLength={LIMITS.email}
          />
        </FormRow>
      </FormSection>

      {isEditing && allLocations && (
        <FormSwitch
          name="is_active"
          text="Activa"
          description="Si la desactivas, ya no aparece al elegir sucursal."
        />
      )}
    </AppForm>
  );
}
