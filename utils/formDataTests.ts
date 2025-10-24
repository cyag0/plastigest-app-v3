// Test para verificar la conversión correcta de archivos a FormData

import { logFormData } from "./formDataUtils";

// Test de la función corregida
export function testFileArrayFormData() {
  console.log("=== TEST: Array de archivos a FormData ===");

  const testData = {
    name: "Producto Test",
    code: "PT-001",
    company_id: ["1"],
    product_images: [
      {
        uri: "file:///storage/emulated/0/Pictures/image1.jpg",
        name: "image1.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file:///storage/emulated/0/Pictures/image2.png",
        name: "image2.png",
        type: "image/png",
      },
      {
        uri: "file:///storage/emulated/0/Pictures/image3.jpg",
        name: "image3.jpg",
        type: "image/jpeg",
      },
    ],
  };

  console.log("Datos de entrada:", testData);

  const formData = objectToFormDataRN(testData);

  console.log("FormData generado:", formData);

  // Intentar inspeccionar el contenido (solo funciona en navegador)
  logFormData(formData, "Test Array de Archivos");

  return formData;
}

// Test con archivo único
export function testSingleFileFormData() {
  console.log("=== TEST: Archivo único a FormData ===");

  const testData = {
    name: "Producto con imagen única",
    main_image: {
      uri: "file:///storage/emulated/0/Pictures/main.jpg",
      name: "main.jpg",
      type: "image/jpeg",
    },
  };

  const formData = objectToFormDataRN(testData);
  logFormData(formData, "Test Archivo Único");

  return formData;
}

// Test mixto (archivos + datos normales)
export function testMixedFormData() {
  console.log("=== TEST: Datos mixtos a FormData ===");

  const testData = {
    // Datos normales
    name: "Producto Completo",
    code: "PC-001",
    price: 25.99,
    is_active: true,
    company_id: ["1"],
    category_id: ["2"],

    // Arrays normales
    tags: ["plastico", "reciclable"],

    // Objetos anidados
    specifications: {
      weight: "100g",
      dimensions: {
        width: 10,
        height: 20,
      },
    },

    // Archivos
    product_images: [
      {
        uri: "file:///path/to/image1.jpg",
        name: "image1.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file:///path/to/image2.jpg",
        name: "image2.jpg",
        type: "image/jpeg",
      },
    ],

    // Archivo único
    main_document: {
      uri: "file:///path/to/document.pdf",
      name: "document.pdf",
      type: "application/pdf",
    },
  };

  const formData = objectToFormDataRN(testData);
  logFormData(formData, "Test Datos Mixtos");

  return formData;
}

// Función para ejecutar todos los tests
export function runAllFormDataTests() {
  console.log("🚀 Iniciando tests de FormData...\n");

  try {
    testSingleFileFormData();
    console.log("✅ Test archivo único: PASSED\n");
  } catch (error) {
    console.error("❌ Test archivo único: FAILED", error, "\n");
  }

  try {
    testFileArrayFormData();
    console.log("✅ Test array de archivos: PASSED\n");
  } catch (error) {
    console.error("❌ Test array de archivos: FAILED", error, "\n");
  }

  try {
    testMixedFormData();
    console.log("✅ Test datos mixtos: PASSED\n");
  } catch (error) {
    console.error("❌ Test datos mixtos: FAILED", error, "\n");
  }

  console.log("🏁 Tests de FormData completados");
}

// Función específica para probar el problema reportado
export function testProductImagesArray() {
  console.log("=== TEST ESPECÍFICO: product_images[] ===");

  const productData = {
    name: "Bolsa Plástica",
    code: "BP-001",
    product_images: [
      {
        uri: "file:///storage/emulated/0/DCIM/Camera/IMG_001.jpg",
        name: "producto_1.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file:///storage/emulated/0/DCIM/Camera/IMG_002.jpg",
        name: "producto_2.jpg",
        type: "image/jpeg",
      },
    ],
  };

  console.log("📥 Entrada:", productData);

  const formData = objectToFormDataRN(productData);

  console.log("📤 FormData generado");

  // Simular lo que el servidor debería recibir
  console.log("✅ Esperado en servidor:");
  console.log('- name: "Bolsa Plástica"');
  console.log('- code: "BP-001"');
  console.log("- product_images[]: File object con uri, name, type");
  console.log("- product_images[]: File object con uri, name, type");
  console.log('- NO debería aparecer: "[object Object]"');

  return formData;
}

export default {
  testFileArrayFormData,
  testSingleFileFormData,
  testMixedFormData,
  testProductImagesArray,
  runAllFormDataTests,
};
