import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormUpload } from "@/components/Form/AppUpload";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";

interface ProductFormData {
  name: string;
  description?: string;
  code: string;
  purchase_price?: string;
  sale_price?: string;
  company_id: number;
  category_id?: number;
  unit_id?: number;
  is_active: boolean;
  product_images?: any[]; // Para imágenes del producto
  attachments?: any[]; // Para documentos adicionales
}

interface ProductsFormProps {
  id?: number;
  readonly?: boolean;
}

export default function ProductsForm(props: ProductsFormProps) {
  const params = useLocalSearchParams();
  const productId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!productId;
  const formRef = useRef<AppFormRef<ProductFormData>>(null);

  const { company } = useSelectedCompany();

  return (
    <AppForm
      ref={formRef}
      api={Services.products}
      id={productId}
      readonly={props.readonly}
      initialValues={{
        company_id: [company?.id.toString() || ""],
      }}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Información básica del producto */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información del Producto
          </Text>

          <FormInput
            name="name"
            label="Nombre del Producto"
            placeholder="Ej: Bolsa Plástica 20x30cm"
            required
          />

          <FormInput
            name="description"
            label="Descripción"
            placeholder="Descripción del producto"
            multiline
            numberOfLines={3}
          />

          <FormInput
            name="code"
            label="Código del Producto"
            placeholder="Ej: BP-2030"
            required
          />

          <FormInput
            name="purchase_price"
            label="Precio de Compra"
            placeholder="0.00"
            keyboardType="numeric"
          />

          <FormInput
            name="sale_price"
            label="Precio de Venta"
            placeholder="0.00"
            keyboardType="numeric"
          />

          <FormProSelect
            name="company_id"
            label="Empresa"
            model="admin.companies"
            placeholder="Seleccione una empresa"
            required
          />

          <FormProSelect
            name="category_id"
            label="Categoría"
            model="categories"
            placeholder="Seleccione una categoría"
          />

          {/* TODO: Habilitar cuando las unidades estén disponibles */}
          {/* <FormProSelect
            name="unit_id"
            label="Unidad"
            model="units"
            placeholder="Seleccione una unidad"
          /> */}

          <FormUpload
            name="product_images"
            label="Imágenes del producto"
            placeholder="Subir fotos del producto"
            multiple
            maxFiles={5}
            accept="images"
            helperText="Hasta 5 imágenes del producto (JPG, PNG)"
          />

          {/*       <FormUpload
            name="attachments"
            label="Documentos adicionales"
            placeholder="Subir fichas técnicas, certificados, etc."
            multiple
            maxFiles={5}
            accept="documents"
            helperText="Documentos relacionados (PDF, Word, Excel)"
          /> */}

          <FormCheckBox name="is_active" text="Producto Activo" />
        </View>
      </ScrollView>
    </AppForm>
  );
}
