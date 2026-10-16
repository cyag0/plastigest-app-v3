import { goBack } from "@/utils/navigation";
import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import palette from "@/constants/palette";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es obligatorio").max(100),
  code: Yup.string().required("El código es obligatorio").max(30),
  location_id: Yup.number().required("Elige la sucursal").typeError("Elige la sucursal"),
});

interface Props {
  id?: number;
  readonly?: boolean;
}

export default function CashRegisterFormScreen(props: Props) {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();
  const id = props.id ?? (params.id ? Number(params.id) : undefined);
  // Desde Administración › Esta sucursal la caja es de la sucursal actual.
  const branchScope = params.scope === "location";

  // Memorizado: AppForm reinicia el formulario si cambia la identidad.
  const initialValues = useMemo(
    () => ({ name: "", code: "", location_id: selectedLocation?.id, is_active: true, notes: "" }),
    [selectedLocation?.id],
  );

  return (
    <AppForm
      permissionPrefix="cash_registers"
      api={Services.cashRegisters}
      id={id}
      readonly={props.readonly}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSuccess={() => goBack()}
      card
    >
      <View style={styles.container}>
        <FormInput name="name" label="Nombre" placeholder="Ej: Caja 1, Caja mostrador" required />
        <FormInput name="code" label="Código" placeholder="Ej: CAJA-1" required />
        {branchScope ? (
          <Text variant="bodySmall" style={styles.branchNote}>
            Sucursal: {selectedLocation?.name}
          </Text>
        ) : (
          <FormProSelect name="location_id" label="Sucursal" model="admin.locations" required />
        )}
        <FormSwitch name="is_active" text="Caja activa (se puede abrir turno)" />
        <FormInput name="notes" label="Notas" multiline numberOfLines={3} />
      </View>
    </AppForm>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  branchNote: { color: palette.textSecondary, marginBottom: 8 },
});
