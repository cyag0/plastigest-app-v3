import {
  objectToFormDataWithNestedInputs,
  objectToFormDataWithNestedInputsAsync,
} from "./formDataUtils";

/**
 * Detecta si un objeto contiene blob URLs
 */
const hasBlobUrls = (obj: any): boolean => {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => hasBlobUrls(item));
  }

  if (obj.uri && typeof obj.uri === "string" && obj.uri.startsWith("blob:")) {
    return true;
  }

  return Object.values(obj).some((value) => hasBlobUrls(value));
};

/**
 * Convierte un objeto a FormData, eligiendo automáticamente
 * la versión síncrona o asíncrona según el contenido
 */
export const smartObjectToFormData = async (
  obj: Record<string, any>
): Promise<FormData> => {
  if (hasBlobUrls(obj)) {
    console.log("🔄 Detected blob URLs, using async conversion");
    return await objectToFormDataWithNestedInputsAsync(obj);
  } else {
    console.log("⚡ No blob URLs detected, using sync conversion");
    return objectToFormDataWithNestedInputs(obj);
  }
};

/**
 * Versión síncrona que fuerza el uso de la función síncrona
 * (útil cuando sabes que no hay blob URLs)
 */
export const syncObjectToFormData = (obj: Record<string, any>): FormData => {
  return objectToFormDataWithNestedInputs(obj);
};

export default smartObjectToFormData;
