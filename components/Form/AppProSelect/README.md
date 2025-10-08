# AppProSelect - Select Automatizado con Cache

Un componente de select avanzado que automáticamente hace fetch de datos desde los servicios basándose en el modelo especificado, con sistema de cache para evitar múltiples requests.

## Características

- ✅ **Fetch automático** de datos basado en el modelo
- ✅ **Cache inteligente** para evitar requests duplicados
- ✅ **Soporte para dependencias** entre selects
- ✅ **Integración completa** con AppForm y HOC
- ✅ **Estados de carga y error** automáticos
- ✅ **TypeScript** completamente tipado
- ✅ **Configuración flexible** de campos de display

## Instalación

```tsx
// 1. Envolver tu app con el provider
import { SelectDataProvider } from '@/components/Form/AppProSelect';

export default function App() {
  return (
    <SelectDataProvider>
      {/* Tu app aquí */}
    </SelectDataProvider>
  );
}
```

## Uso Básico

```tsx
import { FormProSelect } from '@/components/Form/AppProSelect';

// En un formulario
<FormProSelect
  name="role_id"
  label="Rol"
  model="admin.roles"
  placeholder="Selecciona un rol"
/>
```

## Ejemplos Avanzados

### Select Simple con Usuarios

```tsx
<FormProSelect
  name="user_id"
  label="Usuario"
  model="users"
  labelField="name"
  valueField="id"
  placeholder="Selecciona un usuario"
/>
```

### Select Múltiple con Permisos

```tsx
<FormProSelect
  name="permissions"
  label="Permisos"
  model="admin.permissions"
  multiple={true}
  labelField="display_name"
  valueField="name"
/>
```

### Select con Dependencias

```tsx
// Select de categorías (principal)
<FormProSelect
  name="category_id"
  label="Categoría"
  model="categories"
/>

// Select de productos que depende de la categoría seleccionada
<FormProSelect
  name="product_id"
  label="Producto"
  model="products"
  dependsOn={{
    field: 'category_id',
    value: watch('category_id'), // Valor del campo categoria
  }}
/>
```

### Select con Parámetros de Fetch Personalizados

```tsx
<FormProSelect
  name="active_users"
  label="Usuarios Activos"
  model="users"
  fetchParams={{
    is_active: true,
    per_page: 100
  }}
/>
```

### Select con Campos Personalizados

```tsx
<FormProSelect
  name="supplier_id"
  label="Proveedor"
  model="suppliers"
  labelField="company_name"    // Mostrar el nombre de la empresa
  valueField="id"              // Usar el ID como valor
  searchFields={['company_name', 'contact_name']} // Buscar por estos campos
/>
```

## Props Disponibles

### Props Principales

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `model` | `ServicePath` | ✅ | Modelo del cual obtener datos |
| `name` | `string` | ✅ | Nombre del campo en formulario |
| `label` | `string` | ❌ | Label a mostrar |
| `value` | `string[]` \| `number[]` | ❌ | Valor actual del select |
| `onChange` | `function` | ❌ | Callback cuando cambia el valor |

### Configuración de Datos

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `labelField` | `string` | `'name'` | Campo a mostrar como texto |
| `valueField` | `string` | `'id'` | Campo a usar como valor |
| `searchFields` | `string[]` | `['name']` | Campos para búsqueda |

### Dependencias

| Prop | Tipo | Descripción |
|------|------|-------------|
| `dependsOn` | `object` | Configuración de dependencias |
| `dependsOn.field` | `string` | Campo del modelo padre |
| `dependsOn.value` | `any` | Valor actual del campo padre |
| `dependsOn.parentModel` | `ServicePath` | Modelo padre (opcional) |

### Configuración del Select

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `multiple` | `boolean` | `false` | Select múltiple |
| `hideSearchBox` | `boolean` | `false` | Ocultar búsqueda |
| `placeholder` | `string` | - | Texto placeholder |
| `disabled` | `boolean` | `false` | Deshabilitar select |

## Modelos Disponibles

```typescript
type ServicePath = 
  | 'roles'
  | 'users' 
  | 'companies'
  | 'products'
  | 'categories'
  | 'units'
  | 'customers'
  | 'suppliers'
  | 'locations'
  | 'movements'
  | 'purchaseOrders'
  | 'salesOrders'
  | 'admin.roles'
  | 'admin.permissions';
```

## Casos de Uso Comunes

### 1. Select de Roles para Usuarios

```tsx
<FormProSelect
  name="role_ids"
  label="Roles"
  model="admin.roles"
  multiple={true}
  fetchParams={{ is_active: true }}
/>
```

### 2. Select de Productos por Categoría

```tsx
const categoryId = watch('category_id');

<FormProSelect
  name="category_id"
  label="Categoría"
  model="categories"
/>

<FormProSelect
  name="product_id"
  label="Producto"
  model="products"
  dependsOn={{
    field: 'category_id',
    value: categoryId
  }}
  disabled={!categoryId}
/>
```

### 3. Select de Ubicaciones por Empresa

```tsx
const companyId = watch('company_id');

<FormProSelect
  name="company_id"
  label="Empresa"
  model="companies"
/>

<FormProSelect
  name="location_id"
  label="Ubicación"
  model="locations"
  dependsOn={{
    field: 'company_id',
    value: companyId
  }}
/>
```

## Cache y Rendimiento

- **Cache automático**: Los datos se cachean por 5 minutos por defecto
- **Cache por parámetros**: Diferentes parámetros mantienen caches separados
- **Invalidación inteligente**: El cache se invalida automáticamente cuando expira
- **Compartido entre componentes**: Múltiples selects del mismo modelo comparten el cache

## Manejo de Errores

```tsx
<FormProSelect
  name="user_id"
  label="Usuario"
  model="users"
  onError={(error) => {
    console.error('Error cargando usuarios:', error);
    // Mostrar notificación de error
  }}
  onDataLoaded={(data) => {
    console.log('Usuarios cargados:', data.length);
  }}
/>
```

## Provider Personalizado

```tsx
<SelectDataProvider cacheDuration={10 * 60 * 1000}> {/* 10 minutos */}
  <YourApp />
</SelectDataProvider>
```

## Estados del Componente

- **Cargando**: Muestra "Cargando opciones..."
- **Error**: Muestra el mensaje de error
- **Dependencia vacía**: Muestra "Selecciona X primero"
- **Normal**: Funciona como select normal

## Integración con Formularios

El componente se integra perfectamente con `AppForm`:

```tsx
<AppForm service={Services.users}>
  <FormProSelect
    name="role_id"
    label="Rol"
    model="admin.roles"
    rules={{ required: "El rol es requerido" }}
  />
  
  <FormProSelect
    name="permissions"
    label="Permisos Adicionales"
    model="admin.permissions"
    multiple={true}
  />
</AppForm>
```