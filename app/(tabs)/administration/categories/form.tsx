/**
 * Alta y edición de una categoría: nombre y, si ayuda, qué productos van en
 * ella; al editar, si está activa.
 *
 * Antes iba en una caja blanca con «Información de la Categoría» en
 * negritas, un select «Empresa» que solo repetía la actual (el backend la
 * toma del contexto al crear) y una casilla «Categoría Activa». No validaba
 * nada: guardar vacío iba al servidor y regresaba un error genérico.
 */

import { useLeaveScreen } from "@/components/Administration/Catalogs/useLeaveScreen";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import * as Yup from "yup";

const BASE = "/(tabs)/administration/categories";

/** Lo mismo que valida el backend (CategoryController). */
const LIMITS = { name: 150, description: 255 };

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre de la categoría")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  description: Yup.string().nullable().max(LIMITS.description, tooLong(LIMITS.description)),
  is_active: Yup.boolean(),
});

export default function CategoriesForm(props: { id?: number }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = props.id ?? (params.id ? parseInt(params.id, 10) : undefined);
  const isEditing = !!id;
  const { company } = useSelectedCompany();
  // A la lista o al detalle de donde se vino (o, si se recargó, a uno de ellos).
  const leave = useLeaveScreen(isEditing ? `${BASE}/${id}` : BASE);

  // Referencia estable: AppForm reinicia el formulario cada vez que cambia
  // initialValues. company_id se sigue mandando; ya no se muestra.
  const initialValues = useMemo(
    () => ({ name: "", description: "", company_id: company?.id, is_active: true }),
    [company?.id],
  );

  return (
    <AppForm
      permissionPrefix="categories"
      api={Services.categories}
      id={id}
      initialValues={initialValues}
      validationSchema={validationSchema}
      submitButtonText={isEditing ? "Guardar cambios" : "Guardar categoría"}
      successMessage={isEditing ? "Cambios guardados" : "Categoría guardada"}
      // Antes router.replace a la lista: quedaba la lista dos veces y
      // «Atrás» volvía a ella.
      onSuccess={leave}
      onCancel={leave}
    >
      <FormInput
        name="name"
        label="Nombre"
        placeholder="Paletas"
        maxLength={LIMITS.name}
      />
      <FormInput
        name="description"
        label="Descripción"
        optional
        placeholder="Paletas de agua y de crema de coco"
        multiline
        maxLength={LIMITS.description}
      />

      {/* Una nueva siempre empieza activa: el interruptor solo al editar. */}
      {isEditing && <FormSwitch name="is_active" text="Activa" />}
    </AppForm>
  );
}
