/**
 * Alta y edición de un cliente o un proveedor (tienen los mismos datos): el
 * nombre arriba; luego cómo contactarlo y, si hay factura, sus datos
 * fiscales; al editar, si está activo.
 *
 * La empresa no se pregunta: es la actual (al crear el backend la toma del
 * contexto y al editar el registro ya la trae). Antes había un select
 * «Empresa» que solo la repetía, etiquetas como «Nombre del Cliente» y
 * «Correo Electrónico», y una casilla «Cliente Activo».
 */

import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormPhoneInput } from "@/components/Form/AppPhoneInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { phoneSchema } from "@/utils/phone";
import Services from "@/utils/services";
import React, { useMemo } from "react";
import * as Yup from "yup";
import { useLeaveScreen } from "./useLeaveScreen";

export type PartyKind = "customer" | "supplier";

/** Lo que cabe en las tablas customers y suppliers (lo mismo que valida el backend). */
const LIMITS = { name: 150, business_name: 255, social_reason: 255, email: 100, address: 255 };

/** RFC de persona moral (12) o física (13). */
const RFC = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i;

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const COPY: Record<
  PartyKind,
  {
    listHref: string;
    saveLabel: string;
    saved: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    fiscalNote: string;
    activeNote?: string;
  }
> = {
  customer: {
    listHref: "/(tabs)/administration/clientes",
    saveLabel: "Guardar cliente",
    saved: "Cliente guardado",
    namePlaceholder: "Restaurante La Palapa",
    emailPlaceholder: "compras@lapalapa.mx",
    fiscalNote: "Solo si le facturas.",
  },
  supplier: {
    listHref: "/(tabs)/administration/suppliers",
    saveLabel: "Guardar proveedor",
    saved: "Proveedor guardado",
    namePlaceholder: "Cocos del Pacífico",
    emailPlaceholder: "ventas@cocosdelpacifico.mx",
    fiscalNote: "Solo si te factura.",
    // El buscador de proveedores de la compra no ofrece los inactivos.
    activeNote: "Aparece al registrar compras.",
  },
};

function partySchema(noun: string) {
  return Yup.object({
    name: Yup.string()
      .trim()
      .required(`Escribe el nombre del ${noun}`)
      .min(2, "Escribe al menos 2 letras")
      .max(LIMITS.name, tooLong(LIMITS.name)),
    business_name: Yup.string().nullable().max(LIMITS.business_name, tooLong(LIMITS.business_name)),
    social_reason: Yup.string().nullable().max(LIMITS.social_reason, tooLong(LIMITS.social_reason)),
    rfc: Yup.string()
      .nullable()
      .trim()
      .matches(RFC, {
        message: "Revisa el RFC: son 12 o 13 letras y números",
        excludeEmptyString: true,
      }),
    email: Yup.string()
      .nullable()
      .trim()
      .email("Revisa el correo; parece incompleto")
      .max(LIMITS.email, tooLong(LIMITS.email)),
    phone: phoneSchema(),
    address: Yup.string().nullable().max(LIMITS.address, tooLong(LIMITS.address)),
    is_active: Yup.boolean(),
  });
}

const SCHEMAS: Record<PartyKind, ReturnType<typeof partySchema>> = {
  customer: partySchema("cliente"),
  supplier: partySchema("proveedor"),
};

interface PartyFormProps {
  kind: PartyKind;
  /** Registro a editar; sin él, uno nuevo. */
  id?: number;
}

export default function PartyForm({ kind, id }: PartyFormProps) {
  const copy = COPY[kind];
  const isEditing = !!id;
  const { company } = useSelectedCompany();
  // Guardar o cancelar regresa a la lista o al detalle de donde se vino; si
  // se recargó la página, a la lista (nuevo) o al detalle (editar).
  const leave = useLeaveScreen(isEditing ? `${copy.listHref}/${id}` : copy.listHref);

  // Memorizado: AppForm vuelve a cargar el formulario cada vez que cambia la
  // identidad de initialValues (antes era un objeto nuevo en cada render).
  // company_id se sigue mandando como antes; ya no se muestra.
  const initialValues = useMemo(
    () => ({
      name: "",
      business_name: "",
      social_reason: "",
      rfc: "",
      email: "",
      phone: "",
      address: "",
      company_id: company?.id,
      is_active: true,
    }),
    [company?.id],
  );

  return (
    <AppForm
      permissionPrefix={kind === "customer" ? "customers" : "suppliers"}
      api={kind === "customer" ? Services.customers : Services.suppliers}
      id={id}
      initialValues={initialValues}
      validationSchema={SCHEMAS[kind]}
      submitButtonText={isEditing ? "Guardar cambios" : copy.saveLabel}
      successMessage={isEditing ? "Cambios guardados" : copy.saved}
      // Antes router.replace a la lista: quedaba la lista dos veces y
      // «Atrás» volvía a ella.
      onSuccess={leave}
      onCancel={leave}
    >
      <FormInput
        name="name"
        label="Nombre"
        placeholder={copy.namePlaceholder}
        autoCapitalize="words"
        maxLength={LIMITS.name}
      />
      <FormInput
        name="business_name"
        label="Nombre comercial"
        optional
        hint="La marca o el nombre de su negocio, si es otro."
        autoCapitalize="words"
        maxLength={LIMITS.business_name}
      />

      <FormSection title="Contacto">
        <FormRow>
          <FormPhoneInput name="phone" label="Teléfono" optional />
          <FormInput
            name="email"
            label="Correo electrónico"
            optional
            placeholder={copy.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            maxLength={LIMITS.email}
          />
        </FormRow>
        <FormInput
          name="address"
          label="Dirección"
          optional
          placeholder="Calle, número, colonia y ciudad"
          multiline
          maxLength={LIMITS.address}
        />
      </FormSection>

      <FormSection title="Datos fiscales" description={copy.fiscalNote}>
        <FormRow widths={[3, 2]}>
          <FormInput
            name="social_reason"
            label="Razón social"
            optional
            maxLength={LIMITS.social_reason}
          />
          <FormInput
            name="rfc"
            label="RFC"
            optional
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={13}
          />
        </FormRow>
      </FormSection>

      {/* Uno nuevo siempre empieza activo: el interruptor solo al editar. */}
      {isEditing && (
        <FormSwitch name="is_active" text="Activo" description={copy.activeNote} />
      )}
    </AppForm>
  );
}
