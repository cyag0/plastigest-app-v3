import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { useSelectData } from "@/components/Form/AppProSelect/context";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormUpload } from "@/components/Form/AppUpload";
import BarcodeScanner from "@/components/Form/BarcodeScanner";
import IngredientsTable from "@/components/Form/IngredientsTable/IngredientsTable";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconButton } from "react-native-paper";

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
    unit_id?: number;
    notes?: string;
  }[];
  productIngredients?: any[]; // Ingredientes cargados del API (antes de transformar)
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
  const scannerRef = useRef<any>(null);

  const { company } = useSelectedCompany();
  const { location: selectedLocation } = useAuth();
  const router = useRouter();

  // Función para generar código de barras aleatorio en el frontend
  const generateRandomBarcode = () => {
    // Generar un código de 13 dígitos (similar a EAN-13)
    const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos del timestamp
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0"); // 5 dígitos aleatorios
    const barcode = timestamp + random; // 13 dígitos en total

    formRef.current?.setFieldValue("code", barcode);
  };

  useEffect(() => {
    if (selectedLocation?.id) {
      console.log("🎯 ProductsForm - selectedLocation actualizado:", selectedLocation);
      formRef.current?.setFieldValue(
        "current_location_id",
        selectedLocation.id
      );
    } else {
      console.log("⚠️ ProductsForm - selectedLocation es NULL o sin ID");
    }
  }, [selectedLocation?.id]);

  // Transformar productIngredients a ingredients cuando se cargan datos
  useEffect(() => {
    if (!isEditing) return;

    const checkAndTransform = () => {
      const values = formRef.current?.getValues();
      
      console.log("Verificando valores del formulario:", {
        hasValues: !!values,
        productIngredients: values?.productIngredients,
        ingredients: values?.ingredients,
      });
      
      if (values && values.productIngredients && Array.isArray(values.productIngredients)) {
        // Verificar si ya fue transformado
        const currentIngredients = values.ingredients || [];
        if (currentIngredients.length === 0 && values.productIngredients.length > 0) {
          // Transformar productIngredients a ingredients
          const transformedIngredients = values.productIngredients.map((item: any, index: number) => ({
            id: `product-ingredient-${item.id}-${index}`, // ID único para identificar en el formulario
            ingredient_id: item.ingredient_id || item.ingredient?.id, // Usar ingredient.id si es relación
            quantity: item.quantity,
            unit_id: item.unit_id,
            notes: item.notes || "",
          }));

          console.log("🔄 Transformando ingredientes:", {
            original: values.productIngredients,
            transformed: transformedIngredients,
          });

          // Establecer los ingredientes transformados
          formRef.current?.setFieldValue("ingredients", transformedIngredients);
          
          // Limpiar productIngredients para evitar conflictos
          formRef.current?.setFieldValue("productIngredients", undefined);
          
          return true; // Transformación completada
        }
      }
      return false;
    };

    // Intentar transformar inmediatamente
    if (checkAndTransform()) {
      return;
    }

    // Si no está disponible, reintentar cada 100ms hasta 5 segundos (más agresivo)
    let attempts = 0;
    const maxAttempts = 50; // 50 * 100ms = 5 segundos
    
    const timer = setInterval(() => {
      attempts++;
      console.log(`Intento ${attempts}/${maxAttempts} de transformar ingredientes`);
      if (checkAndTransform() || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          console.warn("⚠️ No se pudieron cargar los ingredientes después de 5 segundos");
        }
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isEditing]);

  const selectDataContext = useSelectData();

  return (
    <AppForm
      ref={formRef}
      api={Services.products}
      id={productId}
      readonly={props.readonly}
      onSuccess={() => {
        // Limpiar caché de productos para que cargue la lista actualizada
        selectDataContext.clearCache("products");
        router.back();
      }}
      initialValues={{
        company_id: company?.id || undefined,
        location_id: selectedLocation?.id || undefined,
        product_type: "raw_material", // Valor por defecto
        ingredients: [], // Array vacío por defecto
        productIngredients: [], // Campo para ingredientes del API
        for_sale: true, // Por defecto disponible para venta
        current_location_id: selectedLocation?.id || undefined,
        is_active: true, // Por defecto activo en la sucursal
        current_stock: "0", // Stock inicial
        minimum_stock: "0", // Stock mínimo por defecto
        maximum_stock: "", // Stock máximo opcional
      }}
    >
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

      {/* Código del Producto con Escáner */}
      <View style={styles.codeInputContainer}>
        <View style={styles.codeInput}>
          <FormInput
            name="code"
            label="Código del Producto"
            placeholder="Ej: BP-2030"
            required
            //@ts-ignore
            readonly
          />
        </View>
        <IconButton
          icon="barcode-scan"
          mode="contained"
          containerColor={palette.primary}
          iconColor="#fff"
          size={24}
          onPress={() => scannerRef.current?.open()}
          style={styles.scanButton}
        />
        <IconButton
          icon="auto-fix"
          mode="contained"
          containerColor={palette.accent}
          iconColor="#fff"
          size={24}
          onPress={generateRandomBarcode}
          style={styles.scanButton}
        />
      </View>

      <BarcodeScanner
        ref={scannerRef}
        onScanned={(code) => {
          console.log("Scanned code:", code);
          formRef.current?.setFieldValue("code", code);
        }}
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
        name="category_id"
        label="Categoría"
        model="categories"
        placeholder="Seleccione una categoría"
      />

      <FormProSelect
        model="home.unidades"
        name="unit_id"
        label="Unidad de Medida"
        placeholder="Seleccione una unidad de medida"
        required
        fetchParams={{
          only_base: true,
        }}
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
        text={`Producto Activo en ${selectedLocation?.name || "esta sucursal"}`}
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
    </AppForm>
  );
}

const styles = StyleSheet.create({
  codeInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
  },
  scanButton: {
    marginBottom: 8,
  },
});
