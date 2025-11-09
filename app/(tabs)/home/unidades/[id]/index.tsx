import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import Services from "@/utils/services";
import React, { useRef } from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Button } from "react-native-paper";
import palette from "@/constants/palette";

export default function UnidadDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const formRef = useRef<AppFormRef<any>>(null);
  const [deleting, setDeleting] = React.useState(false);

  const handleEdit = () => {
    router.push(`/(tabs)/home/unidades/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await Services.home.unidades.destroy(Number(id));
      router.back();
    } catch (error) {
      console.error("Error deleting unidad:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <AppForm
          ref={formRef}
          api={Services.home.unidades}
          id={Number(id)}
          showButtons={false}
        >
          <FormInput
            name="name"
            label="Nombre"
            readOnly
          />
          <FormInput
            name="symbol"
            label="Símbolo"
            readOnly
          />
          <FormInput
            name="type"
            label="Tipo"
            readOnly
          />
          <FormCheckBox
            name="is_base"
            label="¿Es unidad base?"
            disabled
          />
          <FormInput
            name="conversion_rate"
            label="Factor de conversión"
            readOnly
          />
          <FormInput
            name="description"
            label="Descripción"
            multiline
            numberOfLines={3}
            readOnly
          />
          <FormCheckBox
            name="is_active"
            label="Activo"
            disabled
          />
        </AppForm>

        {/* Botones de acción */}
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button
            mode="contained"
            onPress={handleEdit}
          >
            Editar Unidad
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleDelete}
            textColor={palette.red}
            loading={deleting}
            disabled={deleting}
          >
            Eliminar Unidad
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}