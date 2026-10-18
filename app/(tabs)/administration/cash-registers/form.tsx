/**
 * Alta y edición de una caja: nombre y código, en qué sucursal está y, al
 * editar, si se puede abrir turno en ella.
 *
 * La sucursal solo se elige si el usuario trabaja con todas (system_admin o
 * locations_all) y no viene de «Esta sucursal»: a los demás el backend solo
 * les deja la sucursal en la que están, así que se muestra fija en lugar de
 * un select que terminaba en error.
 */

import { useLeaveScreen } from "@/components/Administration/Catalogs/useLeaveScreen";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow } from "@/components/Form/FormLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useMemo } from "react";
import { View } from "react-native";
import * as Yup from "yup";

/** Lo mismo que valida el backend (CashRegisterController). */
const LIMITS = { name: 100, code: 30, notes: 1000 };

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre de la caja")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  code: Yup.string()
    .trim()
    .required("Escribe un código, como CAJA-1")
    .max(LIMITS.code, tooLong(LIMITS.code)),
  location_id: Yup.number().required("Elige la sucursal").typeError("Elige la sucursal"),
  notes: Yup.string().nullable().max(LIMITS.notes, tooLong(LIMITS.notes)),
});

const BASE = "/(tabs)/administration/cash-registers";

interface Props {
  id?: number;
}

export default function CashRegisterFormScreen(props: Props) {
  const params = useLocalSearchParams<{ id?: string; scope?: string }>();
  const { location } = useAuth();
  const { can } = useCan();
  const id = props.id ?? (params.id ? Number(params.id) : undefined);
  const isEditing = !!id;
  // Desde Administración › Esta sucursal la caja es de la sucursal actual.
  const branchScope = params.scope === "location";
  const chooseLocation = !branchScope && can(["system_admin", "locations_all"]);
  // A la lista o al detalle de donde se vino (o, si se recargó, a uno de ellos).
  const suffix = branchScope ? "?scope=location" : "";
  const leave = useLeaveScreen(isEditing ? `${BASE}/${id}${suffix}` : `${BASE}${suffix}`);

  // Memorizado: AppForm reinicia el formulario si cambia la identidad.
  const initialValues = useMemo(
    () => ({ name: "", code: "", location_id: location?.id, is_active: true, notes: "" }),
    [location?.id],
  );

  return (
    <AppForm
      permissionPrefix="cash_registers"
      api={Services.cashRegisters}
      id={id}
      initialValues={initialValues}
      validationSchema={validationSchema}
      submitButtonText={isEditing ? "Guardar cambios" : "Guardar caja"}
      successMessage={isEditing ? "Cambios guardados" : "Caja guardada"}
      onSuccess={leave}
      onCancel={leave}
    >
      <FormRow widths={[3, 2]}>
        <FormInput name="name" label="Nombre" placeholder="Caja mostrador" maxLength={LIMITS.name} />
        <FormInput
          name="code"
          label="Código"
          placeholder="CAJA-1"
          hint="Corto y sin repetir; se ve al abrir turno."
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LIMITS.code}
        />
      </FormRow>

      {chooseLocation ? (
        <FormProSelect
          name="location_id"
          label="Sucursal"
          model="admin.locations"
          placeholder="Elige la sucursal"
          selectedLabelField="location_name"
        />
      ) : (
        <FixedLocation fallback={location?.name} />
      )}

      <FormInput
        name="notes"
        label="Notas"
        optional
        placeholder="La del mostrador de la entrada"
        multiline
        maxLength={LIMITS.notes}
      />

      {/* Una nueva siempre empieza activa: el interruptor solo al editar. */}
      {isEditing && (
        <FormSwitch name="is_active" text="Activa" description="Se puede abrir turno en ella." />
      )}
    </AppForm>
  );
}

/** La sucursal de la caja, sin poder cambiarla: la que tiene o la actual. */
function FixedLocation({ fallback }: { fallback?: string | null }) {
  const { values } = useFormikContext<any>();
  return (
    <View style={{ marginBottom: 18 }}>
      <InputLabel label="Sucursal" />
      <ReadonlyText text={values?.location_name || fallback || ""} />
    </View>
  );
}
