# Guía de Navegación - Plastigest

> Documentación completa del sistema de navegación y flujos de acceso
> 
> **Fecha de actualización**: Diciembre 12, 2025

## Índice

1. [Introducción](#introducción)
2. [Flujo de Autenticación Inicial](#flujo-de-autenticación-inicial)
3. [Arquitectura de Navegación](#arquitectura-de-navegación)
4. [Guardias de Navegación](#guardias-de-navegación)
5. [Navegación por Pestañas (Tabs)](#navegación-por-pestañas-tabs)
6. [Navegación Modal (Stacks)](#navegación-modal-stacks)
7. [Patrones de Rutas CRUD](#patrones-de-rutas-crud)
8. [Tabla de Referencia Rápida](#tabla-de-referencia-rápida)
9. [Navegación Específica por Plataforma](#navegación-específica-por-plataforma)

---

## Introducción

Plastigest utiliza **Expo Router**, un sistema de enrutamiento basado en archivos que convierte la estructura de carpetas en rutas de navegación. Cada archivo en la carpeta `app/` se convierte automáticamente en una ruta accesible.

### Conceptos Clave

- **File-based Routing**: La estructura de carpetas define las rutas
- **Dynamic Routes**: Rutas con parámetros usando `[param]`
- **Route Groups**: Carpetas con `(nombre)` agrupan rutas sin afectar la URL
- **Layouts**: Archivos `_layout.tsx` definen la estructura de navegación
- **Index Routes**: Archivos `index.tsx` son la ruta por defecto

---

## Flujo de Autenticación Inicial

### Paso 1: Pantalla de Login

**Cómo llegar**: Ruta inicial de la aplicación o cuando no hay sesión activa

```
Ruta: /login
Archivo: app/login.tsx
```

**Acciones**:
1. Ingresar email y contraseña
2. Presionar botón "Iniciar Sesión"
3. El sistema valida credenciales con el backend
4. Si es exitoso → Paso 2
5. Si falla → Muestra mensaje de error

---

### Paso 2: Selección de Empresa

**Cómo llegar**: Automáticamente después del login si el usuario tiene acceso a múltiples empresas

```
Ruta: /(stacks)/selectCompany
Archivo: app/(stacks)/selectCompany.tsx
```

**Acciones**:
1. El sistema muestra lista de empresas disponibles para el usuario
2. Seleccionar una empresa de la lista
3. La empresa se guarda en el contexto global
4. Navegación automática → Paso 3

**Cambiar empresa después**:
- Desde el Tab "Perfil" → Botón "Cambiar Empresa"
- Desde el menú lateral (web) → Selector de empresa

---

### Paso 3: Selección de Ubicación

**Cómo llegar**: Automáticamente después de seleccionar empresa

```
Ruta: /(stacks)/selectLocation
Archivo: app/(stacks)/selectLocation.tsx
```

**Acciones**:
1. El sistema muestra ubicaciones de la empresa seleccionada
2. Seleccionar ubicación de trabajo
3. La ubicación se guarda en el contexto
4. Navegación automática → Aplicación principal (Tab Home)

**Cambiar ubicación después**:
- Aparece `LocationSelector` flotante cuando se necesita cambiar
- Desde Perfil → Botón "Cambiar Ubicación"

---

### Paso 4: Aplicación Principal

**Cómo llegar**: Después de completar Login → Empresa → Ubicación

```
Ruta por defecto: /(tabs)/home
Archivo: app/(tabs)/home/index.tsx
```

La aplicación está lista para usar con navegación completa.

---

## Arquitectura de Navegación

### Jerarquía de Navegación

```
Aplicación
│
├── Root Level (Autenticación)
│   ├── /login
│   └── /+not-found
│
├── (stacks) - Navegación Modal/Stack
│   ├── /selectCompany
│   ├── /selectLocation
│   ├── /notifications
│   │   ├── /notifications (lista)
│   │   └── /notifications/[id] (detalle)
│   └── /tasks
│       ├── /tasks (lista)
│       └── /tasks/[id] (detalle)
│
└── (tabs) - Navegación Principal por Pestañas
    ├── Tab 1: /home
    ├── Tab 2: /inventory
    ├── Tab 3: /reports
    ├── Tab 4: /administration
    └── Tab 5: /profile
```

---

## Guardias de Navegación

### NavigationHandler (Orquestador Principal)

**Ubicación**: `components/NavigationHandler.tsx`

**Flujo de verificación**:

```
1. ¿Usuario autenticado?
   NO → Redirigir a /login
   SÍ → Continuar
   
2. ¿Empresa seleccionada?
   NO → Redirigir a /(stacks)/selectCompany
   SÍ → Continuar
   
3. ¿Ubicación seleccionada?
   NO → Mostrar LocationSelector
   SÍ → Permitir acceso completo
```

### Wrappers de Protección

#### AuthRequiredWrapper
```typescript
Uso: Proteger rutas que requieren autenticación
Ejemplo: Todas las rutas dentro de (tabs)
Acción si falla: Redirige a /login
```

#### CompanyRequiredWrapper
```typescript
Uso: Proteger rutas que requieren empresa seleccionada
Ejemplo: Módulos de administración, operaciones
Acción si falla: Redirige a /(stacks)/selectCompany
```

#### LocationRequiredWrapper
```typescript
Uso: Proteger rutas que requieren ubicación
Ejemplo: Ventas, Compras, Inventario
Acción si falla: Muestra LocationSelector
```

---

## Navegación por Pestañas (Tabs)

### Acceso a las Pestañas

**En Móvil**:
- Barra de pestañas en la parte inferior
- 5 pestañas visibles con iconos
- Tab activa se resalta con color primario

**En Web**:
- Barra lateral izquierda (280px de ancho)
- Lista de opciones con iconos y texto
- Opción activa resaltada
- Perfil en la parte inferior

### Las 5 Pestañas Principales

#### Tab 1: Inicio (Home)
```
Icono: 🏠 home
Ruta: /(tabs)/home
Descripción: Dashboard y operaciones principales
```

**Cómo navegar**:
1. Hacer clic en pestaña "Inicio" (móvil) o sidebar (web)
2. Se muestra el dashboard con acceso rápido a operaciones

#### Tab 2: Inventario
```
Icono: 📦 archive
Ruta: /(tabs)/inventory
Descripción: Gestión de inventario y productos
```

**Cómo navegar**:
1. Hacer clic en pestaña "Inventario"
2. Se muestra dashboard de inventario con estadísticas

#### Tab 3: Dashboard (Reportes)
```
Icono: 📊 chart-bar
Ruta: /(tabs)/reports
Descripción: Análisis y reportes
```

**Cómo navegar**:
1. Hacer clic en pestaña "Dashboard"
2. Se muestran gráficos y métricas

#### Tab 4: Administración
```
Icono: ⚙️ cog
Ruta: /(tabs)/administration
Descripción: Configuración del sistema
```

**Cómo navegar**:
1. Hacer clic en pestaña "Administración"
2. Se muestra panel con opciones administrativas organizadas por categoría

#### Tab 5: Perfil
```
Icono: 👤 account
Ruta: /(tabs)/profile
Descripción: Perfil de usuario y configuración
```

**Cómo navegar**:
1. Hacer clic en pestaña "Perfil"
2. Se muestra información del usuario y opciones de sesión

---

## Navegación Modal (Stacks)

Las pantallas en `(stacks)` se presentan como modales u overlays sobre la navegación principal.

### Acceso a Notificaciones

**Desde cualquier pantalla**:

1. **Icono de campana** en la barra superior (header)
2. Se muestra badge con número de notificaciones no leídas
3. Hacer clic → Abre `/(stacks)/notifications`

**Navegación en notificaciones**:
```
/(stacks)/notifications → Lista de notificaciones
    ↓ (clic en notificación)
/(stacks)/notifications/[id] → Detalle de notificación
```

### Acceso a Tareas

**Desde**:
- Dashboard de inicio
- Notificaciones de tareas
- Menú del perfil

**Navegación en tareas**:
```
/(stacks)/tasks → Lista de tareas asignadas
    ↓ (clic en tarea)
/(stacks)/tasks/[id] → Detalle de tarea con acciones
```

### Cambiar Empresa

**Desde**:
- Tab Perfil → Botón "Cambiar Empresa"
- Menú de configuración

**Ruta**: `/(stacks)/selectCompany`

### Cambiar Ubicación

**Desde**:
- Tab Perfil → Botón "Cambiar Ubicación"
- LocationSelector flotante (se muestra automáticamente cuando es necesario)

**Ruta**: `/(stacks)/selectLocation`

---

## Patrones de Rutas CRUD

Todos los módulos CRUD siguen el mismo patrón de navegación de 4 pasos.

### Patrón Estándar

```
1. LISTA (Index)
   Ruta: /modulo
   Ejemplo: /(tabs)/inventory/products
   
2. CREAR (Form)
   Ruta: /modulo/form
   Ejemplo: /(tabs)/inventory/products/form
   
3. VER DETALLE (View)
   Ruta: /modulo/[id]
   Ejemplo: /(tabs)/inventory/products/123
   
4. EDITAR (Edit)
   Ruta: /modulo/[id]/edit
   Ejemplo: /(tabs)/inventory/products/123/edit
```

### Ejemplo Completo: Productos

#### 1. Ver lista de productos

**Cómo llegar**:
```
Tab Inventario → Opción "Productos"
o
Ruta directa: /(tabs)/inventory/products
```

**Acciones disponibles**:
- Buscar productos
- Filtrar por categoría
- Ordenar por nombre, precio, stock
- Botón "+ Nuevo Producto" → Paso 2
- Clic en producto → Paso 3

---

#### 2. Crear nuevo producto

**Cómo llegar**:
```
/(tabs)/inventory/products → Botón "Nuevo Producto"
o
Ruta directa: /(tabs)/inventory/products/form
```

**Acciones**:
- Llenar formulario (nombre, SKU, categoría, precio, etc.)
- Subir imagen
- Guardar → Vuelve a la lista (Paso 1)
- Cancelar → Vuelve a la lista (Paso 1)

---

#### 3. Ver detalle de producto

**Cómo llegar**:
```
/(tabs)/inventory/products → Clic en un producto
o
Ruta directa: /(tabs)/inventory/products/[id]
Ejemplo: /(tabs)/inventory/products/123
```

**Acciones disponibles**:
- Ver toda la información del producto
- Ver historial de movimientos
- Botón "Editar" → Paso 4
- Botón "Eliminar" (si tiene permisos)
- Botón "Volver" → Paso 1

---

#### 4. Editar producto

**Cómo llegar**:
```
/(tabs)/inventory/products/[id] → Botón "Editar"
o
Ruta directa: /(tabs)/inventory/products/[id]/edit
Ejemplo: /(tabs)/inventory/products/123/edit
```

**Acciones**:
- Modificar campos del formulario
- Cambiar imagen
- Guardar cambios → Vuelve al detalle (Paso 3)
- Cancelar → Vuelve al detalle (Paso 3)

---

## Tabla de Referencia Rápida

### Módulos de Operaciones (Tab Home)

| Módulo | Ruta Lista | Ruta Crear | Ruta Ver | Ruta Editar |
|--------|------------|------------|----------|-------------|
| **Producción** | `/(tabs)/home/production` | `/production/form` | `/production/[id]` | `/production/[id]/edit` |
| **Compras** | `/(tabs)/home/purchases` | `/purchases/form` | `/purchases/[id]` | N/A |
| **Ventas** | `/(tabs)/home/sales` | `/sales/form` | `/sales/[id]` | `/sales/[id]/edit` |
| **Peticiones** | `/(tabs)/home/petitions` | `/petitions/form` | `/petitions/[id]` | N/A |
| **Recibos** | `/(tabs)/home/receipts` | N/A | `/receipts/[id]` | N/A |
| **Envíos** | `/(tabs)/home/shipments` | N/A | `/shipments/[id]` | N/A |
| **Transferencias** | `/(tabs)/home/transfers` | `/transfers/form` | `/transfers/[id]` | N/A |
| **Ajustes** | `/(tabs)/home/adjustment` | `/adjustment/form` | `/adjustment/[id]` | `/adjustment/[id]/edit` |

### Módulos de Inventario (Tab Inventory)

| Módulo | Ruta Lista | Ruta Crear | Ruta Ver | Ruta Editar |
|--------|------------|------------|----------|-------------|
| **Productos** | `/(tabs)/inventory/products` | `/products/form` | `/products/[id]` | `/products/[id]/edit` |
| **Inventario Semanal** | `/(tabs)/inventory/weekly-inventory` | `/weekly-inventory/form` | `/weekly-inventory/[id]` | `/weekly-inventory/[id]/edit` |
| **Ajustes** | `/(tabs)/inventory/adjustment` | `/adjustment/form` | `/adjustment/[id]` | `/adjustment/[id]/edit` |

### Módulos de Administración (Tab Administration)

| Módulo | Ruta Lista | Ruta Crear | Ruta Ver | Ruta Editar |
|--------|------------|------------|----------|-------------|
| **Empresas** | `/(tabs)/administration/companies` | `/companies/form` | `/companies/[id]` | `/companies/[id]/edit` |
| **Usuarios Sistema** | `/(tabs)/administration/users` | `/users/form` | `/users/[id]` | `/users/[id]/edit` |
| **Usuarios Empresa** | `/(tabs)/administration/company-users` | `/company-users/form` | `/company-users/[id]` | `/company-users/[id]/edit` |
| **Ubicaciones** | `/(tabs)/administration/locations` | `/locations/form` | `/locations/[id]` | `/locations/[id]/edit` |
| **Trabajadores** | `/(tabs)/administration/workers` | `/workers/form` | `/workers/[id]` | `/workers/[id]/edit` |
| **Trabajadores Ubicación** | `/(tabs)/administration/current-workers` | `/current-workers/form` | `/current-workers/[id]` | `/current-workers/[id]/edit` |
| **Categorías** | `/(tabs)/administration/categories` | `/categories/form` | `/categories/[id]` | `/categories/[id]/edit` |
| **Unidades** | `/(tabs)/administration/unidades` | `/unidades/form` | `/unidades/[id]` | `/unidades/[id]/edit` |
| **Proveedores** | `/(tabs)/administration/suppliers` | `/suppliers/form` | `/suppliers/[id]` | `/suppliers/[id]/edit` |
| **Clientes** | `/(tabs)/administration/clientes` | `/clientes/form` | `/clientes/[id]` | `/clientes/[id]/edit` |

---

## Navegación Específica por Plataforma

### Móvil (iOS/Android)

#### Navegación Principal
- **Barra de pestañas inferior** con 5 tabs
- **Swipe horizontal** para cambiar entre pantallas (opcional)
- **Botón "Atrás"** nativo en header

#### Navegación Secundaria
- **Headers** con título y botones de acción
- **Menú hamburguesa** para opciones adicionales (3 puntos)
- **FAB (Floating Action Button)** para acción principal (ej: Crear nuevo)

#### Gestos
- **Swipe hacia atrás**: Volver a pantalla anterior
- **Pull to refresh**: Actualizar lista
- **Tap largo**: Opciones contextuales

---

### Tablet

#### Diseño de 2 Columnas
En pantallas > 768px:
- **Columna izquierda**: Lista de items
- **Columna derecha**: Detalle del item seleccionado
- **Navegación sin salir** de la pantalla de lista

#### Ejemplo en Productos:
```
┌─────────────────┬──────────────────────┐
│ Lista Productos │  Detalle Producto    │
│                 │                      │
│ - Producto A    │  Nombre: Producto B  │
│ > Producto B    │  SKU: 12345          │
│ - Producto C    │  Precio: $100        │
│ - Producto D    │  Stock: 50           │
│                 │                      │
│                 │  [Editar] [Eliminar] │
└─────────────────┴──────────────────────┘
```

---

### Web/Desktop

#### Navegación Principal
- **Sidebar izquierdo** (280px) siempre visible
- **No hay barra de pestañas inferior**
- **Breadcrumbs** en la parte superior

#### Sidebar
```
┌─────────────────────┐
│  📱 Plastigest      │
│                     │
│  🏠 Inicio          │
│  📦 Inventario      │
│  📊 Dashboard       │
│  ⚙️ Administración  │
│                     │
│ ─────────────────── │
│  👤 Perfil          │
│  🔔 Notificaciones  │
└─────────────────────┘
```

#### Atajos de Teclado (si implementado)
- `Ctrl/Cmd + K`: Búsqueda global
- `Ctrl/Cmd + N`: Nuevo registro (en listas)
- `Escape`: Cerrar modal/volver

---

## Flujos de Navegación Comunes

### Flujo 1: Registrar una Venta

```
1. Login → Seleccionar Empresa → Seleccionar Ubicación
   ↓
2. Tab "Inicio" → Sección "Ventas" → Botón "Nueva Venta"
   Ruta: /(tabs)/home/sales/form
   ↓
3. Llenar formulario de venta:
   - Seleccionar cliente
   - Agregar productos
   - Definir cantidades
   - Aplicar descuentos (opcional)
   - Seleccionar método de pago
   ↓
4. Guardar venta
   ↓
5. Redirige a: /(tabs)/home/sales/[id] (Detalle de la venta)
   ↓
6. Opciones:
   - Imprimir ticket
   - Editar venta → /(tabs)/home/sales/[id]/edit
   - Volver a lista → /(tabs)/home/sales
   - Nueva venta → /(tabs)/home/sales/form
```

---

### Flujo 2: Realizar Conteo de Inventario Semanal

```
1. Tab "Inventario" → Opción "Inventario Semanal"
   Ruta: /(tabs)/inventory/weekly-inventory
   ↓
2. Botón "Nuevo Conteo"
   Ruta: /(tabs)/inventory/weekly-inventory/form
   ↓
3. El sistema genera lista de productos a contar
   ↓
4. Ingresar cantidades físicas:
   - Escanear código de barras (opcional)
   - Ingresar cantidad manualmente
   - Avanzar por cada producto
   ↓
5. Guardar conteo
   ↓
6. Sistema compara con inventario en sistema
   ↓
7. Muestra diferencias → /(tabs)/inventory/weekly-inventory/[id]
   ↓
8. Opciones:
   - Generar ajuste automático
   - Editar conteo → /(tabs)/inventory/weekly-inventory/[id]/edit
   - Ver reporte de diferencias
```

---

### Flujo 3: Transferencia entre Ubicaciones

#### Ubicación que Solicita (Recibe):

```
1. Tab "Inicio" → "Transferencias" → "Peticiones"
   Ruta: /(tabs)/home/petitions
   ↓
2. Botón "Nueva Petición"
   Ruta: /(tabs)/home/petitions/form
   ↓
3. Formulario:
   - Seleccionar ubicación de origen
   - Seleccionar productos necesarios
   - Especificar cantidades
   ↓
4. Enviar petición
   ↓
5. Estado: "Pendiente"
   Esperar aprobación de ubicación origen
```

#### Ubicación que Envía:

```
1. Tab "Inicio" → "Transferencias" → "Recibos"
   Ruta: /(tabs)/home/receipts
   ↓
2. Ver petición recibida
   Ruta: /(tabs)/home/receipts/[id]
   ↓
3. Opciones:
   - Aprobar (genera envío)
   - Rechazar (cancela petición)
   ↓
4. Si aprueba → Crear envío
   ↓
5. Tab "Inicio" → "Transferencias" → "Envíos"
   Ruta: /(tabs)/home/shipments
   ↓
6. Procesar envío → Inventario se reduce
```

#### Ubicación que Recibe (Confirmación):

```
1. Tab "Inicio" → "Transferencias" → "Transferencias"
   Ruta: /(tabs)/home/transfers
   ↓
2. Ver transferencia recibida
   Ruta: /(tabs)/home/transfers/[id]
   ↓
3. Confirmar recepción
   ↓
4. Inventario se incrementa
```

---

### Flujo 4: Configurar Nuevo Producto

```
1. Tab "Inventario" → "Productos"
   Ruta: /(tabs)/inventory/products
   ↓
2. Botón "Nuevo Producto"
   Ruta: /(tabs)/inventory/products/form
   ↓
3. Formulario básico:
   - Nombre del producto
   - SKU/Código
   - Categoría → Si no existe:
       a. Ir a Tab "Administración" → "Categorías"
       b. Crear categoría
       c. Volver a producto
   - Unidad de medida → Si no existe:
       a. Ir a Tab "Administración" → "Unidades"
       b. Crear unidad
       c. Volver a producto
   - Precio de costo
   - Precio de venta
   - Stock mínimo
   - Stock máximo
   - Imagen (opcional)
   ↓
4. Guardar producto
   ↓
5. Redirige a: /(tabs)/inventory/products/[id]
   ↓
6. Producto creado y listo para usar en ventas/compras
```

---

## Navegación Contextual

### Navegación por Notificaciones

Cuando recibes una notificación, el clic te lleva directamente al contexto:

```
Notificación: "Stock bajo en Producto X"
  ↓
/(tabs)/inventory/products/[id] (Detalle del producto)

Notificación: "Nueva tarea asignada"
  ↓
/(stacks)/tasks/[id] (Detalle de la tarea)

Notificación: "Transferencia recibida"
  ↓
/(tabs)/home/transfers/[id] (Detalle de la transferencia)
```

### Deep Linking

La aplicación soporta deep links para acceso directo:

```
plastigest://sales/123 → Venta específica
plastigest://products/456 → Producto específico
plastigest://inventory → Dashboard de inventario
```

---

## Navegación de Emergencia

### Volver al Inicio

Desde cualquier pantalla:
- **Móvil**: Tap en tab "Inicio"
- **Web**: Clic en logo de Plastigest o "Inicio" en sidebar

### Refrescar Contexto

Si hay problemas con empresa/ubicación:
1. Ir a Tab "Perfil"
2. "Cambiar Empresa" o "Cambiar Ubicación"
3. Seleccionar nuevamente

### Cerrar Sesión

1. Tab "Perfil"
2. Scroll hasta abajo
3. Botón "Cerrar Sesión"
4. Confirmar
5. Redirige a `/login`

---

## Tips de Navegación

### Navegación Eficiente

1. **Usa breadcrumbs** (web) para navegar rápido entre niveles
2. **Botón "Atrás"** del navegador funciona en web
3. **Botón "Atrás"** nativo en móvil
4. **Gestos swipe** en móvil para volver

### Atajos Visuales

1. **Badges de notificaciones**: Indican items pendientes
2. **Colores de estado**:
   - 🟢 Verde: Completado/Activo
   - 🟡 Amarillo: Pendiente/En proceso
   - 🔴 Rojo: Cancelado/Error/Crítico
   - 🔵 Azul: Información

### Persistencia de Estado

- La navegación mantiene el estado al cambiar de tab
- Los filtros y búsquedas se mantienen
- El scroll position se preserva

---

## Resumen de Comandos de Navegación

| Acción | Móvil | Web | Resultado |
|--------|-------|-----|-----------|
| Ir a Inicio | Tap en tab "🏠" | Clic "Inicio" sidebar | Dashboard principal |
| Ir a Inventario | Tap en tab "📦" | Clic "Inventario" sidebar | Dashboard inventario |
| Ir a Reportes | Tap en tab "📊" | Clic "Dashboard" sidebar | Panel de análisis |
| Ir a Admin | Tap en tab "⚙️" | Clic "Administración" sidebar | Panel admin |
| Ir a Perfil | Tap en tab "👤" | Clic "Perfil" sidebar | Perfil de usuario |
| Ver Notificaciones | Tap icono 🔔 | Clic icono 🔔 | Lista notificaciones |
| Volver atrás | Swipe / Botón ← | Botón ← / Browser ← | Pantalla anterior |
| Crear nuevo | Botón FAB "+" | Botón "+ Nuevo" | Formulario de creación |
| Buscar | Icono 🔍 en header | Ctrl+K (si aplica) | Barra de búsqueda |
| Menú opciones | Icono ⋮ (3 puntos) | Clic derecho (contextual) | Menú de opciones |
| Refrescar | Pull down | F5 / Botón refresh | Actualizar datos |

---

## Diagramas de Flujo

### Flujo Completo de Autenticación y Setup

```
┌─────────────┐
│   INICIO    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  /login         │ ◄─── Si no hay sesión activa
│  Ingresar       │
│  credenciales   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ ¿Autenticado?       │
│ NO → Vuelve a login │
│ SÍ → Continuar      │
└──────────┬──────────┘
           │
           ▼
┌───────────────────────────┐
│ /(stacks)/selectCompany   │
│ Seleccionar empresa       │
└────────────┬──────────────┘
             │
             ▼
┌────────────────────────────┐
│ /(stacks)/selectLocation   │
│ Seleccionar ubicación      │
└─────────────┬──────────────┘
              │
              ▼
┌─────────────────────────────┐
│  /(tabs)/home               │
│  APLICACIÓN LISTA           │
│  Navegación completa activa │
└─────────────────────────────┘
```

---

*Para información detallada sobre cada módulo, consultar [RESUMEN_MODULOS.md](./RESUMEN_MODULOS.md)*
