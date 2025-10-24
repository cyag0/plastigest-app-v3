// Ejemplos de uso de formDataUtils.ts

import { logFormData, objectToFormData } from "./formDataUtils";

// Ejemplo 1: Objeto simple con archivos
const simpleExample = () => {
  const data = {
    name: "Producto Test",
    price: 29.99,
    description: "Un producto de prueba",
    is_active: true,
    product_images: [
      // Archivos de React Native
      {
        uri: "file://path/to/image1.jpg",
        name: "imagen1.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file://path/to/image2.png",
        name: "imagen2.png",
        type: "image/png",
      },
    ],
  };

  const formData = objectToFormData(data);
  logFormData(formData, "Producto Simple");

  // Resultado esperado en FormData:
  // name: "Producto Test"
  // price: "29.99"
  // description: "Un producto de prueba"
  // is_active: "true"
  // product_images[]: File(imagen1.jpg)
  // product_images[]: File(imagen2.png)

  return formData;
};

// Ejemplo 2: Objeto con arrays de IDs (común en formularios)
const formWithArraysExample = () => {
  const data = {
    name: "Test Product",
    company_id: [1], // Array con un solo elemento (común en AppForm)
    category_id: [5],
    tags: ["plastico", "reciclable", "industrial"],
    specifications: {
      weight: "100g",
      dimensions: {
        width: 10,
        height: 20,
        depth: 5,
      },
    },
  };

  const formData = objectToFormData(data);
  logFormData(formData, "Formulario con Arrays");

  // Resultado esperado:
  // name: "Test Product"
  // company_id[0]: "1"
  // category_id[0]: "5"
  // tags[0]: "plastico"
  // tags[1]: "reciclable"
  // tags[2]: "industrial"
  // specifications[weight]: "100g"
  // specifications[dimensions][width]: "10"
  // specifications[dimensions][height]: "20"
  // specifications[dimensions][depth]: "5"

  return formData;
};

// Ejemplo 3: Producto completo con imágenes y documentos
const completeProductExample = () => {
  const data = {
    // Campos básicos
    name: "Bolsa Plástica Premium",
    code: "BP-PREM-001",
    description: "Bolsa plástica de alta calidad para uso industrial",
    purchase_price: 15.5,
    sale_price: 25.0,
    is_active: true,

    // Arrays de IDs (formato AppForm)
    company_id: ["1"],
    category_id: ["3"],

    // Imágenes del producto
    product_images: [
      {
        uri: "file://storage/images/bolsa1.jpg",
        name: "bolsa_principal.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file://storage/images/bolsa2.jpg",
        name: "bolsa_detalle.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file://storage/images/bolsa3.jpg",
        name: "bolsa_uso.jpg",
        type: "image/jpeg",
      },
    ],

    // Documentos adicionales (si se habilita)
    attachments: [
      {
        uri: "file://documents/ficha_tecnica.pdf",
        name: "ficha_tecnica.pdf",
        type: "application/pdf",
      },
      {
        uri: "file://documents/certificado.pdf",
        name: "certificado_calidad.pdf",
        type: "application/pdf",
      },
    ],

    // Datos adicionales
    metadata: {
      created_by: "mobile_app",
      version: "1.0",
      location: "warehouse_1",
    },
  };

  const formData = objectToFormData(data);
  logFormData(formData, "Producto Completo");

  return formData;
};

// Ejemplo 4: Solo archivos (para endpoints específicos de upload)
const onlyFilesExample = () => {
  const data = {
    images: [
      { uri: "file://temp/img1.jpg", name: "imagen1.jpg", type: "image/jpeg" },
      { uri: "file://temp/img2.jpg", name: "imagen2.jpg", type: "image/jpeg" },
    ],
  };

  const formData = objectToFormData(data);
  logFormData(formData, "Solo Imágenes");

  // Para uso con endpoints como:
  // POST /api/products/123/images

  return formData;
};

// Ejemplo 5: Actualización parcial
const partialUpdateExample = () => {
  const data = {
    name: "Nuevo nombre del producto",
    sale_price: 35.0,
    // Solo actualizar estos campos, el resto permanece igual
  };

  const formData = objectToFormData(data);
  logFormData(formData, "Actualización Parcial");

  return formData;
};

// Función helper para usar en componentes
export const createProductFormData = (productData: any) => {
  return objectToFormData(productData);
};

export const exampleUsage = {
  simpleExample,
  formWithArraysExample,
  completeProductExample,
  onlyFilesExample,
  partialUpdateExample,
  createProductFormData,
};
