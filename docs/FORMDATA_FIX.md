# Solución al problema "[object Object]" en product_images[]

## Problema identificado

Cuando se enviaban arrays de archivos como `product_images[]` desde React Native al backend Laravel, el servidor recibía "[object Object]" en lugar de los datos de archivo correctos.

## Causa raíz

React Native maneja FormData de manera diferente a los navegadores web. Los objetos de archivo necesitan una estructura específica con propiedades `uri`, `name` y `type`.

## Solución implementada

### 1. Función `createFormDataForFiles`

Ubicación: `utils/formDataUtils.ts`

```typescript
export function createFormDataForFiles(obj: Record<string, any>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;

    // Array de archivos
    if (Array.isArray(value) && value.length > 0 && value[0]?.uri) {
      for (const file of value) {
        if (file?.uri) {
          formData.append(`${key}[]`, {
            uri: file.uri,
            name: file.name || `image_${Date.now()}.jpg`,
            type: file.type || "image/jpeg",
          } as any);
        }
      }
      continue;
    }

    // Otros tipos de datos...
  }
  
  return formData;
}
```

### 2. Integración en AppForm

Ubicación: `components/Form/AppForm/AppForm.tsx`

- Detección automática de archivos con `hasFiles()`
- Conversión automática a FormData cuando se detectan archivos
- Uso de `createFormDataForFiles` específico para React Native

### 3. Backend compatible

El backend Laravel ya estaba preparado para recibir `product_images[]` correctamente:

```php
// ProductController.php
if ($request->hasFile('product_images')) {
    $this->handleProductImages($product, $request->file('product_images'));
}
```

## Resultados esperados

### Antes (Problema)

```
product_images[] => "[object Object]"
product_images[] => "[object Object]"
```

### Después (Solución)

```
product_images[] => {uri: "file://...", name: "image1.jpg", type: "image/jpeg"}
product_images[] => {uri: "file://...", name: "image2.png", type: "image/png"}
```

## Archivos modificados

1. ✅ `utils/formDataUtils.ts` - Nueva función `createFormDataForFiles`
2. ✅ `components/Form/AppForm/AppForm.tsx` - Integración automática
3. ✅ `utils/testFormData.ts` - Pruebas de verificación
4. ✅ `utils/debugFormData.ts` - Herramientas de debug

## Uso en el código

La conversión es ahora **automática** en AppForm:

```typescript
// El formulario detecta archivos automáticamente
const productData = {
  name: "Producto Test",
  product_images: [
    { uri: "file://image1.jpg", name: "image1.jpg", type: "image/jpeg" },
    { uri: "file://image2.png", name: "image2.png", type: "image/png" }
  ]
};

// AppForm convierte automáticamente a FormData si detecta archivos
// No se requiere conversión manual
```

## Validación

Para verificar que funciona correctamente:

```typescript
import { testProductImages } from '@/utils/testFormData';

// Ejecutar en desarrollo
const result = testProductImages();
```

La solución garantiza que:

- ✅ Los archivos se envían correctamente al backend
- ✅ Se usa la notación `product_images[]` para arrays
- ✅ No se genera "[object Object]" en el servidor
- ✅ Es compatible con React Native y Expo
- ✅ La conversión es automática y transparente
