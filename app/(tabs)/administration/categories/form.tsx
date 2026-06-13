import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

interface CategoryFormData {
  name: string;
  description?: string;
  company_id: number;
  is_active: boolean;
}

interface CategoriesFormProps {
  id?: number;
  readonly?: boolean;
}

export default function CategoriesForm(props: CategoriesFormProps) {
  const params = useLocalSearchParams();
  const categoryId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!categoryId;
  const formRef = useRef<AppFormRef<CategoryFormData>>(null);

  const router = useRouter();

  return (
    <AppForm
      ref={formRef}
      api={Services.categories}
      id={categoryId}
      readonly={props.readonly}
      onSuccess={() => {
        router.replace("/administration/categories");
      }}
    >
      <ScrollView style={{ flex: 1, backgroundColor: "white", padding: 24, shadowOffset: { width: 0, height: 0 } }}>
        <View style={{ padding: 16 }}>
          {/* Información básica de la categoría */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información de la Categoría
          </Text>

          <FormInput
            name="name"
            label="Nombre de la Categoría"
            placeholder="Ej: Envases Plásticos"
            required
          />

          <FormInput
            name="description"
            label="Descripción"
            placeholder="Descripción de la categoría"
            multiline
            numberOfLines={3}
          />

          <FormProSelect
            name="company_id"
            label="Empresa"
            model="admin.companies"
            placeholder="Seleccione una empresa"
            required
          />

          <FormCheckBox name="is_active" text="Categoría Activa" />
        </View>
      </ScrollView>
    </AppForm>
  );
}
