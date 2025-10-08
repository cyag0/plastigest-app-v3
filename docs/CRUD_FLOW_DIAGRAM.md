# 🔄 Diagrama de Flujo CRUD - PlastiGest

## 📋 Flujo Completo para Crear un Nuevo Módulo

```mermaid
flowchart TD
    A[🎯 Nuevo Módulo Requerido] --> B{📍 Tipo de Módulo}

    B -->|📊 Movimiento| C[📝 Actualizar 'movimientos' en dashboard]
    B -->|📋 Catálogo| D[📝 Actualizar 'catalogos' en dashboard]

    C --> E[📁 Crear carpeta /home/nuevo-modulo/]
    D --> E

    E --> F[📄 Crear _layout.tsx]
    F --> G[📋 Crear index.tsx]
    G --> H[📝 Crear form.tsx]
    H --> I[🔍 Crear paréntesis-id-paréntesis.tsx]

    I --> J[🌐 Crear servicio API]
    J --> K[📄 Registrar en index.ts]

    K --> L[✅ Probar CRUD completo]

    style A fill:#ff9999
    style L fill:#99ff99
```

## 🏗️ Componentes Obligatorios por Archivo

```mermaid
graph LR
    subgraph "📄 _layout.tsx"
        L1[AppBar] --> L2[Stack Navigator]
    end

    subgraph "📋 index.tsx"
        I1[AppList] --> I2[Service Connection]
    end

    subgraph "📝 form.tsx"
        F1[AppForm] --> F2[AppInput/AppSelect/etc]
        F2 --> F3[Yup Validation]
    end

    subgraph "🔍 [id].tsx"
        ID1[Reuse form.tsx] --> ID2[Pass ID prop]
    end

    style L1 fill:#e1f5fe
    style I1 fill:#e8f5e8
    style F1 fill:#fff3e0
    style ID1 fill:#f3e5f5
```

## 🎯 Template Específico por Archivo

### 📄 \_layout.tsx Template

```tsx
// SIEMPRE usar este template
import { AppBar } from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function [Module]Layout() {
  return (
    <>
      <AppBar title="[Nombre del Módulo]" showBackButton />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="form" />
        <Stack.Screen name="[id]" />
      </Stack>
    </>
  );
}
```

### 📋 index.tsx Template

```tsx
// SIEMPRE usar AppList
import { AppList } from "@/components/App/AppList/AppList";
import Services from "@/utils/services";

export default function [Module]Index() {
  return (
    <AppList
      service={Services.[categoria].[modulo]}
      title="[Título de la Lista]"
      searchPlaceholder="Buscar [elementos]..."
      usePagination={true}
      itemsPerPage={10}
    />
  );
}
```

### 📝 form.tsx Template

```tsx
// SIEMPRE usar AppForm + componentes Form/
import { AppForm } from "@/components/Form/AppForm/AppForm";
import { AppInput } from "@/components/Form/AppInput";
// Importar otros componentes según necesidad
import Services from "@/utils/services";
import * as Yup from "yup";

interface [Module]Data {
  id?: number;
  name: string;
  // ... otros campos
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Nombre es requerido"),
  // ... otras validaciones
});

interface Props {
  id?: string;
}

export default function [Module]Form({ id }: Props) {
  return (
    <AppForm<[Module]Data>
      service={Services.[categoria].[modulo]}
      validationSchema={validationSchema}
      initialValues={{
        name: "",
        // ... valores por defecto
      }}
      id={id}
    >
      <AppInput name="name" label="Nombre" />
      {/* Otros componentes Form/ según necesidad */}
    </AppForm>
  );
}
```

### 🔍 [id].tsx Template

```tsx
// SIEMPRE reutilizar form.tsx
import { useLocalSearchParams } from "expo-router";
import [Module]Form from "./form";

export default function [Module]Detail() {
  const { id } = useLocalSearchParams();

  return <[Module]Form id={id as string} />;
}
```

## 🌐 Estructura de Servicios

```mermaid
graph TD
    subgraph "📄 /utils/services/index.ts"
        MAIN[Services Registry]
    end

    subgraph "🏛️ Admin Services"
        ADM[admin/admin.ts]
        ADM --> COMP[companies/]
        ADM --> LOC[locations/]
        ADM --> USERS[users/]
        ADM --> ROLES[roles/]
        ADM --> WORK[workers/]
    end

    subgraph "📋 Catálogos Services"
        CAT[catalogos/catalogos.ts]
        CAT --> PROD[productos/]
        CAT --> CATEG[categorias/]
        CAT --> UNIT[unidades/]
        CAT --> CLI[clientes/]
        CAT --> PROV[proveedores/]
    end

    subgraph "📦 Inventarios Services"
        INV[inventarios/inventarios.ts]
        INV --> MOV[movimientos/]
        INV --> COUNT[conteos/]
        INV --> REP[reportes/]
    end

    subgraph "🔄 Operaciones Services"
        OPE[operaciones/operaciones.ts]
        OPE --> BUY[compras/]
        OPE --> SELL[ventas/]
        OPE --> TRANS[transferencias/]
    end

    MAIN --> ADM
    MAIN --> CAT
    MAIN --> INV
    MAIN --> OPE

    style MAIN fill:#ff9999
    style ADM fill:#e1f5fe
    style CAT fill:#e8f5e8
    style INV fill:#fff3e0
    style OPE fill:#f3e5f5
```

## 📱 Flujo de Navegación Usuario

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant D as 🏠 Dashboard
    participant L as 📋 Lista (index.tsx)
    participant F as 📝 Formulario (form.tsx)
    participant API as 🌐 Backend API

    U->>D: Selecciona módulo
    D->>L: Navega a /home/modulo/
    L->>API: Fetch datos con AppList
    API-->>L: Retorna lista paginada
    L-->>U: Muestra lista

    alt Crear nuevo
        U->>F: Presiona "Crear"
        F->>F: AppForm modo creación
        U->>F: Llena formulario
        F->>API: POST datos
        API-->>F: Confirma creación
        F-->>L: Regresa a lista
    else Editar existente
        U->>L: Selecciona item
        L->>F: Navega a /[id]
        F->>API: GET datos por ID
        API-->>F: Retorna datos
        F-->>U: Muestra formulario lleno
        U->>F: Modifica datos
        F->>API: PUT datos actualizados
        API-->>F: Confirma actualización
        F-->>L: Regresa a lista
    end
```

## 🎨 Componentes Form/ Disponibles

```mermaid
graph LR
    subgraph "📁 Form Components"
        AF[AppForm] --> AI[AppInput]
        AF --> AS[AppSelect]
        AF --> AD[AppDatePicker]
        AF --> AC[AppCheckBox]
        AF --> AR[AppRadioButton]
        AF --> AT[AppTimePicker]
    end

    subgraph "🎯 Casos de Uso"
        AI --> T1[Texto simple]
        AI --> T2[Texto multilínea]
        AS --> S1[Selección simple]
        AS --> S2[Selección múltiple]
        AD --> D1[Fecha]
        AC --> C1[Sí/No]
        AR --> R1[Opciones exclusivas]
        AT --> TM1[Tiempo/Hora]
    end

    style AF fill:#ff9999
```

## 🔄 Estados del AppForm

```mermaid
stateDiagram-v2
    [*] --> Creando: id = undefined
    [*] --> Cargando: id existe

    Cargando --> Readonly: Datos cargados
    Creando --> Editando: Usuario llena form
    Readonly --> Editando: Presiona "Editar"

    Editando --> Guardando: Presiona "Guardar"
    Guardando --> Readonly: Éxito (modo edición)
    Guardando --> Lista: Éxito (modo creación)
    Guardando --> Editando: Error

    Readonly --> Lista: Presiona "Volver"
    Editando --> Readonly: Presiona "Cancelar"
```

## 📋 Checklist Detallado

### ✅ Dashboard Updated

```
□ Link agregado en movimientos[] o catalogos[]
□ Ruta correcta: /(tabs)/home/[modulo]
□ Ícono y descripción agregados
□ Colores de palette.ts usados
```

### ✅ Module Structure

```
□ Carpeta /home/[modulo]/ creada
□ _layout.tsx implementado con AppBar
□ index.tsx implementado con AppList
□ form.tsx implementado con AppForm
□ [id].tsx implementado reutilizando form
```

### ✅ Service Integration

```
□ Servicio creado en utils/services/[categoria]/
□ Interface TypeScript definida
□ CrudService configurado con baseURL
□ Registrado en [categoria]/[categoria].ts
□ Registrado en services/index.ts
```

### ✅ Form Components

```
□ AppForm usado como wrapper principal
□ AppInput para campos de texto
□ AppSelect para selecciones
□ AppDatePicker para fechas
□ AppCheckBox para booleanos
□ Validación Yup implementada
```

### ✅ Testing

```
□ Navegación funciona desde dashboard
□ Lista carga correctamente con AppList
□ Formulario crea nuevos registros
□ Formulario edita registros existentes
□ Validaciones funcionan
□ Navegación entre pantallas fluida
```

Este flujo garantiza que cada módulo siga exactamente el mismo patrón establecido en el sistema PlastiGest.
