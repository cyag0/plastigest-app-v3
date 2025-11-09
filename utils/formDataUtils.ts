// Función auxiliar para convertir blob URL a File
const blobUrlToFile = async (
  blobUrl: string,
  fileName: string,
  mimeType: string
): Promise<File> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
};

// Versión asíncrona para manejar blob URLs correctamente
export const objectToFormDataWithNestedInputsAsync = async (
  obj: Record<string, any>,
  formData?: FormData,
  parentKey?: string
): Promise<FormData> => {
  formData = formData || new FormData();

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const formKey = parentKey ? `${parentKey}[${key}]` : key;

      if (typeof value === "object" && !Array.isArray(value)) {
        await objectToFormDataWithNestedInputsAsync(value, formData, formKey);
      } else if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
          const item = value[index];
          const arrayKey = `${formKey}[${index}]`;

          if (item instanceof File) {
            console.log("Appending file:", item);
            formData.append(arrayKey, item);
          } else if (typeof item === "object" && !Array.isArray(item)) {
            if (item.uri) {
              if (item.uri.startsWith("blob:")) {
                // Para blob URLs (Expo Web), convertir a File real
                try {
                  const file = await blobUrlToFile(
                    item.uri,
                    item.name || `file_${index}`,
                    item.type || "application/octet-stream"
                  );
                  console.log("Appending blob file:", file);
                  formData.append(arrayKey, file);
                } catch (error) {
                  console.error("Error converting blob to file:", error);
                  // Fallback: agregar como objeto
                  formData.append(arrayKey, {
                    uri: item.uri,
                    name: item.name || `file_${index}`,
                    type: item.type || "application/octet-stream",
                  } as any);
                }
              } else {
                await objectToFormDataWithNestedInputsAsync(
                  item,
                  formData,
                  arrayKey
                );
              }
            } else {
              await objectToFormDataWithNestedInputsAsync(
                item,
                formData,
                arrayKey
              );
            }
          } else {
            // Convertir booleanos a 0 o 1
            const itemValue =
              typeof item === "boolean" ? (item ? "1" : "0") : item;
            formData.append(arrayKey, itemValue);
          }
        }
      } else {
        // Convertir booleanos a 0 o 1
        const finalValue =
          typeof value === "boolean" ? (value ? "1" : "0") : value;
        formData.append(formKey, finalValue);
      }
    }
  }

  return formData;
};

// Versión síncrona original (mantenerla para compatibilidad)
export const objectToFormDataWithNestedInputs = (
  obj: Record<string, any>,
  formData?: FormData,
  parentKey?: string
) => {
  formData = formData || new FormData();

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const formKey = parentKey ? `${parentKey}[${key}]` : key;

      if (typeof value === "object" && !Array.isArray(value)) {
        objectToFormDataWithNestedInputs(value, formData, formKey);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const arrayKey = `${formKey}[${index}]`;
          if (item instanceof File) {
            console.log("Appending file:", item);

            formData.append(arrayKey, item);
          } else if (typeof item === "object" && !Array.isArray(item)) {
            if (item.uri) {
              // Manejar diferentes tipos de URIs
              if (item.uri.startsWith("blob:")) {
                // Para blob URLs (Expo Web), crear un File real
                fetch(item.uri)
                  .then((response) => response.blob())
                  .then((blob) => {
                    const file = new File(
                      [blob],
                      item.name || `file_${index}`,
                      {
                        type: item.type || "application/octet-stream",
                      }
                    );
                    formData.append(arrayKey, file);
                  })
                  .catch((error) => {
                    console.error("Error converting blob to file:", error);
                    // Fallback: agregar como objeto
                    formData.append(arrayKey, {
                      uri: item.uri,
                      name: item.name || `file_${index}`,
                      type: item.type || "application/octet-stream",
                    } as any);
                  });
              } else {
                // Para file:// URIs (React Native nativo)
                formData.append(arrayKey, {
                  uri: item.uri,
                  name: item.name || `file_${index}`,
                  type: item.type || "application/octet-stream",
                } as any);
              }
            } else {
              objectToFormDataWithNestedInputs(item, formData, arrayKey);
            }
          } else {
            formData.append(arrayKey, item);
          }
        });
      } else {
        formData.append(formKey, value);
      }
    }
  }

  return formData;
};
