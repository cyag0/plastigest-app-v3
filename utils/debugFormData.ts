// Debug específico para FormData en React Native
export function debugFormData(formData: FormData, label = "FormData") {
  console.log(`\n=== DEBUG: ${label} ===`);

  try {
    // React Native expone _parts para inspección en desarrollo
    if (__DEV__ && (formData as any)._parts) {
      console.log("Estructura _parts:");
      (formData as any)._parts.forEach(
        ([key, value]: [string, any], index: number) => {
          console.log(`[${index}] ${key}:`);

          if (value && typeof value === "object" && "uri" in value) {
            console.log(`  📁 FILE: ${value.name || "unnamed"}`);
            console.log(`     URI: ${value.uri}`);
            console.log(`     Type: ${value.type || "unknown"}`);
          } else {
            console.log(`  📝 VALUE: ${value}`);
          }
        }
      );
    } else {
      console.log("FormData created (cannot inspect in production)");
    }
  } catch (error) {
    console.warn("Cannot debug FormData:", error);
  }
}

// Verificar específicamente product_images[]
export function checkProductImagesFormData() {
  console.log("\n🔍 VERIFICANDO PRODUCT_IMAGES[] EN FORMDATA");

  const testFiles = [
    { uri: "file://image1.jpg", name: "image1.jpg", type: "image/jpeg" },
    { uri: "file://image2.png", name: "image2.png", type: "image/png" },
  ];

  const formData = new FormData();

  // Método correcto para React Native
  testFiles.forEach((file) => {
    console.log(`Agregando archivo: ${file.name}`);

    // Crear el objeto exacto que React Native espera
    const fileObj = {
      uri: file.uri,
      name: file.name,
      type: file.type,
    };

    console.log("Objeto archivo:", fileObj);

    // Usar la notación [] para arrays
    formData.append("product_images[]", fileObj as any);
  });

  debugFormData(formData, "Product Images Array");

  return formData;
}
