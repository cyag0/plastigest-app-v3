# Generador de CRUD - Plastigest

Este script genera automáticamente toda la estructura necesaria para un CRUD completo en la aplicación Plastigest.

## Uso

```bash
npm run generate:crud
```

## ¿Qué genera?

El script creará automáticamente:

### Estructura de archivos:

```
app/(tabs)/{modulePath}/{entityPlural}/
├── _layout.tsx          # Layout del módulo
├── index.tsx           # Lista/índice
├── form.tsx            # Formulario de creación/edición
└── [id]/
    ├── index.tsx       # Vista de detalle (solo lectura)
    └── edit.tsx        # Vista de edición
```

### Servicio:

```
utils/services/{modulePath}/{entityPlural}/
└── index.ts            # Servicio CRUD
```

## Parámetros que solicita:

1. **Ruta del módulo**: La ubicación donde se creará el CRUD

   - Ejemplos: `home/users`, `admin/products`, `inventory/categories`

2. **Nombre del modelo**: El nombre de la entidad en singular

   - Ejemplos: `user`, `product`, `category`

3. **Endpoint de la API**: La URL de la API para este recurso
   - Ejemplos: `/auth/admin/users`, `/api/products`, `/api/inventory/categories`

## Ejemplo de uso:

```bash
npm run generate:crud

📁 Ingresa la ruta del módulo (ej: home/users, admin/products): admin/users
📝 Ingresa el nombre del modelo (ej: user, product): user
🌐 Ingresa el endpoint de la API (ej: /auth/admin/users, /api/products): /auth/admin/users

📋 Resumen de configuración:
   Ruta del módulo: admin/users
   Nombre del modelo: user
   Endpoint API: /auth/admin/users

✅ ¿Continuar con la generación? (y/n): y

🔨 Generando archivos...
   ✓ app/(tabs)/admin/users/_layout.tsx
   ✓ app/(tabs)/admin/users/index.tsx
   ✓ app/(tabs)/admin/users/form.tsx
   ✓ app/(tabs)/admin/users/[id]/index.tsx
   ✓ app/(tabs)/admin/users/[id]/edit.tsx
   ✓ utils/services/admin/users/index.ts

✅ ¡CRUD generado exitosamente!
```

## Características generadas:

### Lista (index.tsx):

- Componente `AppList` configurado
- Navegación a detalle y formulario
- Búsqueda integrada
- Botón de crear nuevo registro

### Formulario (form.tsx):

- Formulario base con campos comunes (name, description, is_active)
- Validaciones básicas
- Soporte para creación y edición
- Modo de solo lectura

### Detalle ([id]/index.tsx):

- Vista de solo lectura del registro
- Usa el mismo formulario en modo readonly

### Edición ([id]/edit.tsx):

- Vista de edición del registro
- Usa el mismo formulario en modo edición

### Servicio:

- CRUD completo usando `createCrudService`
- Configurado con el endpoint especificado
- TypeScript tipado

## Personalización posterior:

Después de generar los archivos, puedes personalizar:

1. **Campos del formulario**: Editar `form.tsx` para agregar campos específicos
2. **Vista de lista**: Modificar `renderCard` en `index.tsx`
3. **Validaciones**: Agregar reglas de validación en el formulario
4. **Servicios**: Extender el servicio con métodos personalizados

## Notas importantes:

- El script respeta la estructura de carpetas existente
- Los servicios se integran automáticamente con el sistema de servicios existente
- Los tipos TypeScript deben definirse en el archivo de tipos global
- El generador sigue las convenciones de nomenclatura del proyecto
