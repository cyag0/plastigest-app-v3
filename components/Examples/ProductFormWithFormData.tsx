// Ejemplo de uso del AppForm con FormData automático

import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormUpload } from "@/components/Form/AppUpload";
import Services from "@/utils/services";
import React from "react";

interface ProductFormData {
  name: string;
  code: string;
  company_id: number[];
  category_id?: number[];
  product_images?: any[]; // Archivos de imagen
  attachments?: any[]; // Documentos
}

export default function ProductFormWithAutoFormData() {
  return (
    <AppForm<ProductFormData>
      api={Services.products}
      onSuccess={(response, originalValues) => {
        console.log("Producto creado:", response);
        console.log("Valores originales:", originalValues);
        // El AppForm automáticamente detectó los archivos y convirtió a FormData
      }}
      onError={(error, originalValues) => {
        console.error("Error:", error);
        console.log("Valores que causaron error:", originalValues);
      }}
    >
      <FormInput name="name" label="Nombre del Producto" required />

      <FormInput name="code" label="Código" required />

      <FormProSelect
        name="company_id"
        label="Empresa"
        model="admin.companies"
        required
      />

      <FormProSelect name="category_id" label="Categoría" model="categories" />

      {/* Cuando el usuario sube archivos aquí, AppForm automáticamente
          detecta que hay archivos y convierte todo a FormData */}
      <FormUpload
        name="product_images"
        label="Imágenes del Producto"
        accept="images"
        multiple
        maxFiles={5}
      />

      <FormUpload
        name="attachments"
        label="Documentos Adicionales"
        accept="documents"
        multiple
        maxFiles={3}
      />
    </AppForm>
  );
}

// Ejemplo de formulario que manualmente controla FormData
export function ProductFormManualFormData() {
  const handleSubmit = async (values: ProductFormData, formInstance: any) => {
    console.log("Valores recibidos:", values);

    // Si necesitas control manual sobre FormData:
    if (values.product_images?.length > 0 || values.attachments?.length > 0) {
      // AppForm ya convirtió a FormData automáticamente
      console.log("FormData detectado automáticamente");

      // Enviar a API manualmente si necesitas control específico
      const response = await fetch("/api/products", {
        method: "POST",
        body: values as any, // Ya es FormData
      });

      return response.json();
    } else {
      // No hay archivos, enviar como JSON normal
      const response = await Services.products.store(values);
      return response.data;
    }
  };

  return (
    <AppForm<ProductFormData>
      onSubmit={handleSubmit} // Control manual
      onSuccess={(response, originalValues) => {
        console.log("Éxito:", response);
      }}
    >
      {/* Campos del formulario */}
    </AppForm>
  );
}

// Ejemplo de debugging FormData
export function ProductFormWithDebug() {
  const handleSubmit = async (values: ProductFormData, formInstance: any) => {
    console.log("=== DEBUGGING FORM DATA ===");
    console.log("Valores originales:", values);

    // Si AppForm detectó archivos, values ya será FormData
    if (values instanceof FormData) {
      console.log("✅ FormData detectado automáticamente");

      // Para debug en desarrollo (solo funciona en navegador)
      try {
        const formDataAny = values as any;
        if (typeof formDataAny.entries === "function") {
          console.log("Contenido de FormData:");
          for (const [key, value] of formDataAny.entries()) {
            console.log(`${key}:`, value);
          }
        }
      } catch (e) {
        console.log(
          "FormData creado para React Native (no se puede inspeccionar)"
        );
      }
    } else {
      console.log("📝 Datos JSON normales (sin archivos)");
    }

    // Proceder con el envío normal
    const response = await Services.products.store(values);
    return response.data;
  };

  return (
    <AppForm<ProductFormData> onSubmit={handleSubmit}>
      {/* Campos del formulario */}
    </AppForm>
  );
}
