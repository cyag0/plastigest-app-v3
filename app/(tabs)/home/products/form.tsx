import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormUpload } from "@/components/Form/AppUpload";
import IngredientsTable from "@/components/Form/IngredientsTable/IngredientsTable";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";

interface ProductFormData {
  name: string;
  description?: string;
  code: string;
  purchase_price?: string;
  sale_price?: string;
  company_id: number;
  category_id?: number;
  unit_id?: number;
  supplier_id?: number;
  product_type: "raw_material" | "processed" | "commercial";
  is_active: boolean;
  for_sale: boolean;
  // Campos de la tabla pivot product_location
  current_stock?: string;
  minimum_stock?: string;
  maximum_stock?: string;
  product_images?: any[]; // Para imágenes del producto
  attachments?: any[]; // Para documentos adicionales
  ingredients?: {
    ingredient_id: number;
    quantity: number;
    notes?: string;
  }[];
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
  const { selectedLocation } = useSelectedLocation();

  useEffect(() => {
    setTimeout(() => {
      console.log("Selected Location ID:", selectedLocation?.id);

      formRef.current?.setFieldValue(
        "current_location_id",
        selectedLocation?.id || ""
      );
    }, 500);
  }, []);

  // Componente interno para usar useWatch dentro del FormProvider
  const ProductFormContent = () => {
    return (
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
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

          <FormSelectSimple
            name="product_type"
            label="Tipo de Producto"
            required
            data={[
              { label: "Materia Prima", value: "raw_material" },
              { label: "Producto Procesado", value: "processed" },
              { label: "Producto Comercial", value: "commercial" },
            ]}
          />

          <AppDependency name="product_type">
            {(value) => {
              switch (value) {
                case "processed":
                  return (
                    <IngredientsTable
                      name="ingredients"
                      label="Ingredientes (Materias Primas)"
                      required
                    />
                  ); // No mostrar nada adicional para materias primas
                case "raw_material":
                case "commercial":
                  return (
                    <FormProSelect
                      name="supplier_id"
                      label="Proveedor"
                      model="suppliers"
                      placeholder="Seleccione un proveedor (opcional)"
                    />
                  );
              }
            }}
          </AppDependency>

          <FormCheckBox name="for_sale" text="Producto Disponible para Venta" />

          <FormUpload
            name="product_images"
            label="Imágenes del producto"
            placeholder="Subir fotos del producto"
            multiple
            maxFiles={5}
            accept="images"
            helperText="Hasta 5 imágenes del producto (JPG, PNG)"
          />

          <View style={{ display: "none" }}>
            <FormInput name="current_location_id" />
          </View>

          {/* Sección de Información de Sucursal */}
          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Información en {selectedLocation?.name || "esta sucursal"}
            </Text>
            <View
              style={{
                height: 2,
                backgroundColor: "#e0e0e0",
                marginTop: 8,
              }}
            />
          </View>

          <FormCheckBox
            name="is_active"
            text={`Producto Activo en ${
              selectedLocation?.name || "esta sucursal"
            }`}
          />

          <FormInput
            name="current_stock"
            label="Stock Actual"
            placeholder="0.00"
            keyboardType="numeric"
            //@ts-ignore
            readonly
          />

          <FormInput
            name="minimum_stock"
            label="Stock Mínimo"
            placeholder="0.00"
            keyboardType="numeric"
          />

          <FormInput
            name="maximum_stock"
            label="Stock Máximo"
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.products}
      id={productId}
      readonly={props.readonly}
      initialValues={{
        company_id: company?.id || undefined,
        product_type: "raw_material", // Valor por defecto
        ingredients: [], // Array vacío por defecto
        for_sale: true, // Por defecto disponible para venta
        current_location_id: selectedLocation?.id || undefined,
        is_active: true, // Por defecto activo en la sucursal
        current_stock: "0", // Stock inicial
        minimum_stock: "0", // Stock mínimo por defecto
        maximum_stock: "", // Stock máximo opcional
      }}
    >
      <ProductFormContent />
    </AppForm>
  );
}
