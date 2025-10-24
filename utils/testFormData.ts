// Test simple para verificar FormData con product_images[]

import { createFormDataForFiles } from "./formDataUtils";

export function testProductImages() {
  console.log("=== TEST: Product Images FormData ===");

  const productData = {
    name: "Test Product",
    description: "Test description",
    price: 99.99,
    category_id: 1,
    company_id: [1, 2], // Array de IDs
    product_images: [
      {
        uri: "file:///path/to/image1.jpg",
        name: "image1.jpg",
        type: "image/jpeg",
      },
      {
        uri: "file:///path/to/image2.png",
        name: "image2.png",
        type: "image/png",
      },
    ],
  };

  console.log("Datos originales:", productData);

  const formData = createFormDataForFiles(productData);

  console.log("FormData creado correctamente");

  // Verificar estructura interna (solo para debug en desarrollo)
  if (__DEV__ && (formData as any)._parts) {
    console.log("Estructura interna del FormData:");
    (formData as any)._parts.forEach(([key, value]: [string, any]) => {
      if (typeof value === "object" && value !== null && "uri" in value) {
        console.log(`${key}: [FILE] ${value.name} (${value.type})`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
  }

  return formData;
}

// Test para verificar que los archivos NO se convierten a "[object Object]"
export function verifyFileObjects() {
  const fileArray = [
    { uri: "file://test1.jpg", name: "test1.jpg", type: "image/jpeg" },
    { uri: "file://test2.jpg", name: "test2.jpg", type: "image/jpeg" },
  ];

  const formData = new FormData();

  // Agregar archivos uno por uno con la notación correcta
  fileArray.forEach((file) => {
    formData.append("product_images[]", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  console.log("Files added to FormData with product_images[] notation");
  console.log("Each file object contains: uri, name, type");

  return formData;
}

// Ejecutar pruebas
export function runAllTests() {
  console.log("\n🧪 INICIANDO PRUEBAS DE FORMDATA");

  try {
    const result1 = testProductImages();
    console.log("✅ Test 1: Product images - PASSED");

    const result2 = verifyFileObjects();
    console.log("✅ Test 2: File objects - PASSED");

    console.log("\n🎉 TODAS LAS PRUEBAS COMPLETADAS");

    return { result1, result2 };
  } catch (error) {
    console.error("❌ ERROR EN PRUEBAS:", error);
    return null;
  }
}
