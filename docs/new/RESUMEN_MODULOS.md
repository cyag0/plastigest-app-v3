# Resumen de Módulos - Plastigest

> Documentación completa de todos los módulos de la aplicación Plastigest
> 
> **Fecha de actualización**: Diciembre 12, 2025

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Pantallas Raíz](#pantallas-raíz)
3. [Módulos Stack (Modales)](#módulos-stack-modales)
4. [Tab 1: Inicio (Home)](#tab-1-inicio-home)
5. [Tab 2: Inventario](#tab-2-inventario)
6. [Tab 3: Dashboard (Reportes)](#tab-3-dashboard-reportes)
7. [Tab 4: Administración](#tab-4-administración)
8. [Tab 5: Perfil](#tab-5-perfil)

---

## Arquitectura General

La aplicación utiliza **Expo Router** con enrutamiento basado en archivos. La estructura de navegación se organiza en:

- **Pantallas Raíz**: Login y error 404
- **(stacks)**: Pantallas modales/overlay (selección de empresa, ubicación, notificaciones, tareas)
- **(tabs)**: Navegación principal con 5 pestañas

### Tecnologías de Navegación
- **Framework**: Expo Router (file-based routing)
- **UI**: React Native Paper
- **Estado**: Context API (AuthContext, SelectDataProvider, AlertsProvider)
- **Guardias**: AuthRequiredWrapper, CompanyRequiredWrapper, LocationRequiredWrapper

---

## Pantallas Raíz

### Login
- **Ruta**: `/login`
- **Archivo**: [login.tsx](../app/login.tsx)
- **Propósito**: Autenticación de usuarios
- **Funcionalidad**:
  - Validación de credenciales (email/password)
  - Integración con backend API
  - Navegación automática tras login exitoso
  - Manejo de errores de autenticación

### Pantalla 404
- **Ruta**: `/+not-found`
- **Archivo**: [+not-found.tsx](../app/+not-found.tsx)
- **Propósito**: Manejo de rutas inválidas

---

## Módulos Stack (Modales)

Estos módulos se presentan como pantallas modales u overlay sobre la navegación principal.

### 1. Selección de Empresa
- **Ruta**: `/(stacks)/selectCompany`
- **Archivo**: [selectCompany.tsx](../app/(stacks)/selectCompany.tsx)
- **Propósito**: Seleccionar/cambiar entre empresas disponibles
- **Características**:
  - Lista de empresas asociadas al usuario
  - Cambio rápido entre empresas
  - Validación de permisos por empresa

### 2. Selección de Ubicación
- **Ruta**: `/(stacks)/selectLocation`
- **Archivo**: [selectLocation.tsx](../app/(stacks)/selectLocation.tsx)
- **Propósito**: Seleccionar ubicación/sucursal de trabajo actual
- **Características**:
  - Lista de ubicaciones de la empresa seleccionada
  - Filtrado por permisos del usuario
  - Establece contexto de trabajo

### 3. Notificaciones
- **Rutas**:
  - `/(stacks)/notifications` - Lista de notificaciones
  - `/(stacks)/notifications/[id]` - Detalle de notificación
- **Archivos**:
  - [index.tsx](../app/(stacks)/notifications/index.tsx)
  - [[id].tsx](../app/(stacks)/notifications/[id].tsx)
- **Propósito**: Sistema de notificaciones de la aplicación
- **Características**:
  - Notificaciones de inventario bajo
  - Alertas de tareas pendientes
  - Notificaciones de transferencias
  - Marcado de leído/no leído

### 4. Tareas
- **Rutas**:
  - `/(stacks)/tasks` - Lista de tareas
  - `/(stacks)/tasks/[id]` - Detalle de tarea
- **Archivos**:
  - [index.tsx](../app/(stacks)/tasks/index.tsx)
  - [[id].tsx](../app/(stacks)/tasks/[id].tsx)
- **Propósito**: Gestión de tareas asignadas
- **Características**:
  - Tareas recurrentes (inventarios semanales, reportes)
  - Asignación de tareas a usuarios
  - Estado de tareas (pendiente, en progreso, completada)
  - Fechas de vencimiento

---

## Tab 1: Inicio (Home)

**Ruta base**: `/(tabs)/home`

Dashboard principal con acceso rápido a todas las operaciones del negocio.

### Módulos de Operaciones

#### 1. Producción
- **Rutas**:
  - `/(tabs)/home/production` - Lista de órdenes
  - `/(tabs)/home/production/form` - Nueva orden
  - `/(tabs)/home/production/[id]` - Ver orden
  - `/(tabs)/home/production/[id]/edit` - Editar orden
- **Propósito**: Gestión de órdenes de producción/manufactura
- **Funcionalidad**:
  - Crear órdenes de producción
  - Especificar productos a fabricar
  - Control de materia prima utilizada
  - Registro de productos terminados
  - Actualización automática de inventario

#### 2. Compras
- **Rutas**:
  - `/(tabs)/home/purchases` - Lista de compras
  - `/(tabs)/home/purchases/form` - Nueva compra
  - `/(tabs)/home/purchases/formv2` - Formulario alternativo
  - `/(tabs)/home/purchases/[id]` - Ver compra
- **Propósito**: Gestión de compras a proveedores
- **Funcionalidad**:
  - Registro de compras
  - Selección de proveedor
  - Ingreso de productos comprados
  - Control de precios y costos
  - Actualización de inventario
  - Gestión de documentos (facturas, remisiones)

#### 3. Ventas
- **Rutas**:
  - `/(tabs)/home/sales` - Lista de ventas
  - `/(tabs)/home/sales/form` - Nueva venta
  - `/(tabs)/home/sales/formv2` - Formulario alternativo
  - `/(tabs)/home/sales/POS` - Punto de venta
  - `/(tabs)/home/sales/[id]` - Ver venta
  - `/(tabs)/home/sales/[id]/edit` - Editar venta
- **Propósito**: Sistema de ventas y punto de venta (POS)
- **Funcionalidad**:
  - Registro de ventas
  - Sistema POS para ventas rápidas
  - Selección de cliente
  - Cálculo de totales e impuestos
  - Métodos de pago
  - Descuentos y promociones
  - Impresión de tickets/facturas
  - Actualización de inventario

#### 4. Menú de Transferencias
- **Ruta**: `/(tabs)/home/transfers-menu`
- **Propósito**: Hub central de operaciones de transferencias
- **Funcionalidad**:
  - Acceso rápido a:
    - Peticiones (solicitudes enviadas)
    - Recibos (solicitudes recibidas)
    - Envíos (transferencias enviadas)
    - Transferencias (transferencias recibidas)

##### 4a. Peticiones (Solicitudes de Transferencia)
- **Rutas**:
  - `/(tabs)/home/petitions` - Lista de peticiones
  - `/(tabs)/home/petitions/form` - Nueva petición
  - `/(tabs)/home/petitions/[id]` - Ver petición
- **Propósito**: Solicitar productos de otras ubicaciones
- **Funcionalidad**:
  - Crear solicitud de transferencia
  - Especificar ubicación origen
  - Seleccionar productos necesarios
  - Seguimiento de estado (pendiente, aprobada, rechazada, enviada)

##### 4b. Recibos (Solicitudes Recibidas)
- **Rutas**:
  - `/(tabs)/home/receipts` - Lista de recibos
  - `/(tabs)/home/receipts/[id]` - Ver recibo
- **Propósito**: Ver y procesar solicitudes de otras ubicaciones
- **Funcionalidad**:
  - Ver solicitudes recibidas de otras ubicaciones
  - Aprobar o rechazar solicitudes
  - Convertir a envío cuando se procesa

##### 4c. Envíos (Transferencias Enviadas)
- **Rutas**:
  - `/(tabs)/home/shipments` - Lista de envíos
  - `/(tabs)/home/shipments/[id]` - Ver envío
- **Propósito**: Gestionar transferencias enviadas a otras ubicaciones
- **Funcionalidad**:
  - Ver productos enviados
  - Estado de envío
  - Confirmación de recepción
  - Disminución de inventario local

##### 4d. Transferencias (Transferencias Recibidas)
- **Rutas**:
  - `/(tabs)/home/transfers` - Lista de transferencias
  - `/(tabs)/home/transfers/form` - Nueva transferencia directa
  - `/(tabs)/home/transfers/[id]` - Ver transferencia
- **Propósito**: Recibir transferencias de otras ubicaciones
- **Funcionalidad**:
  - Ver transferencias recibidas
  - Confirmar recepción de productos
  - Incremento de inventario local
  - Verificación de cantidades

#### 5. Ajustes de Inventario
- **Rutas**:
  - `/(tabs)/home/adjustment` - Lista de ajustes
  - `/(tabs)/home/adjustment/form` - Nuevo ajuste
  - `/(tabs)/home/adjustment/[id]` - Ver ajuste
  - `/(tabs)/home/adjustment/[id]/edit` - Editar ajuste
- **Propósito**: Correcciones y ajustes de inventario
- **Funcionalidad**:
  - Ajustes por merma
  - Corrección de errores de conteo
  - Pérdidas y daños
  - Productos vencidos
  - Registro de motivo del ajuste
  - Incremento o decremento de stock

#### 6. Reportes de Ventas
- **Rutas**:
  - `/(tabs)/home/sales-reports` - Lista de reportes
  - `/(tabs)/home/sales-reports/form` - Nuevo reporte
  - `/(tabs)/home/sales-reports/[id]` - Ver reporte
- **Propósito**: Generación y análisis de reportes de ventas
- **Funcionalidad**:
  - Reportes por período
  - Análisis de ventas por producto
  - Análisis de ventas por cliente
  - Comparativas de períodos
  - Exportación de datos

#### 7. Otras Funcionalidades
- **Upload Test**: `/(tabs)/home/upload-test` - Página de prueba de carga de archivos

---

## Tab 2: Inventario

**Ruta base**: `/(tabs)/inventory`

Gestión completa del inventario y control de stock.

### 1. Dashboard de Inventario
- **Ruta**: `/(tabs)/inventory`
- **Archivo**: [index.tsx](../app/(tabs)/inventory/index.tsx)
- **Propósito**: Visión general del inventario
- **Características**:
  - Estadísticas de inventario
  - Productos con stock bajo
  - Gráficos de movimientos
  - Valor total del inventario
  - Alertas y notificaciones

### 2. Productos
- **Rutas**:
  - `/(tabs)/inventory/products` - Catálogo de productos
  - `/(tabs)/inventory/products/form` - Nuevo producto
  - `/(tabs)/inventory/products/[id]` - Ver producto
  - `/(tabs)/inventory/products/[id]/edit` - Editar producto
- **Propósito**: Gestión del catálogo de productos
- **Funcionalidad**:
  - Crear/editar productos
  - Información detallada (nombre, SKU, categoría, unidad)
  - Control de stock (mínimo, máximo, actual)
  - Precios (costo, venta)
  - Imágenes de producto
  - Código de barras
  - Paquetes de producto (agrupaciones)
  - Historial de movimientos

### 3. Inventario Semanal
- **Rutas**:
  - `/(tabs)/inventory/weekly-inventory` - Lista de conteos
  - `/(tabs)/inventory/weekly-inventory/form` - Nuevo conteo
  - `/(tabs)/inventory/weekly-inventory/[id]` - Ver conteo
  - `/(tabs)/inventory/weekly-inventory/[id]/edit` - Editar conteo
- **Propósito**: Conteos físicos periódicos del inventario
- **Funcionalidad**:
  - Programación de conteos semanales
  - Captura de cantidades físicas
  - Comparación con sistema
  - Generación automática de ajustes
  - Asignación de responsables
  - Historial de conteos

### 4. Ajustes de Inventario
- **Rutas**:
  - `/(tabs)/inventory/adjustment` - Lista de ajustes
  - `/(tabs)/inventory/adjustment/form` - Nuevo ajuste
  - `/(tabs)/inventory/adjustment/[id]` - Ver ajuste
  - `/(tabs)/inventory/adjustment/[id]/edit` - Editar ajuste
- **Propósito**: Ajustes y correcciones de inventario
- **Nota**: Duplicado del módulo en Home para facilitar el acceso desde Inventario

---

## Tab 3: Dashboard (Reportes)

**Ruta**: `/(tabs)/reports`

**Archivo**: [reports.tsx](../app/(tabs)/reports.tsx)

### Propósito
Panel de inteligencia de negocio con análisis y métricas en tiempo real.

### Funcionalidades

#### Estadísticas Generales
- Total de productos en catálogo
- Valor total del inventario
- Productos con stock bajo
- Indicadores clave de rendimiento (KPIs)

#### Análisis de Movimientos
- Entradas (compras, transferencias recibidas)
- Salidas (ventas, transferencias enviadas)
- Producción
- Ajustes
- Balance de movimientos

#### Gráficos y Visualizaciones
- **PieChart**: Distribución de movimientos por tipo
- **BarChart**: Comparativas de movimientos
- **LineChart**: Tendencias de inventario y ventas

#### Top Productos
- Productos más vendidos
- Productos con mayor movimiento
- Productos rentables
- Productos de baja rotación

#### Análisis Financiero
- Ingresos por ventas
- Costos de compras
- Márgenes de ganancia
- Proyecciones

#### Filtros y Configuración
- Filtrado por ubicación específica o general
- Selección de períodos (día, semana, mes, año)
- Exportación de reportes
- Visualización interactiva

---

## Tab 4: Administración

**Ruta base**: `/(tabs)/administration`

Centro de configuración del sistema, empresa y ubicaciones.

### Dashboard de Administración
- **Ruta**: `/(tabs)/administration`
- **Archivo**: [index.tsx](../app/(tabs)/administration/index.tsx)
- **Propósito**: Panel de acceso a todas las funciones administrativas
- **Características**:
  - Opciones organizadas por categoría
  - Acceso basado en permisos
  - Búsqueda de opciones administrativas

---

### Categoría: Configuración del Sistema
*(Solo Super Administradores)*

#### 1. Empresas
- **Rutas**:
  - `/(tabs)/administration/companies` - Lista de empresas
  - `/(tabs)/administration/companies/form` - Nueva empresa
  - `/(tabs)/administration/companies/[id]` - Ver empresa
  - `/(tabs)/administration/companies/[id]/edit` - Editar empresa
- **Propósito**: Gestión de empresas en el sistema
- **Funcionalidad**:
  - Crear/editar empresas
  - Configuración de empresa
  - Asignación de usuarios
  - Gestión de ubicaciones
- **Permisos**: `MANAGE_COMPANIES`

#### 2. Usuarios del Sistema
- **Rutas**:
  - `/(tabs)/administration/users` - Lista de usuarios
  - `/(tabs)/administration/users/form` - Nuevo usuario
  - `/(tabs)/administration/users/[id]` - Ver usuario
  - `/(tabs)/administration/users/[id]/edit` - Editar usuario
- **Propósito**: Gestión global de usuarios
- **Funcionalidad**:
  - Crear usuarios de sistema
  - Asignar empresas
  - Configurar roles y permisos
  - Activar/desactivar cuentas
- **Permisos**: `MANAGE_USERS`

---

### Categoría: Configuración de Empresa

#### 3. Usuarios de Empresa
- **Rutas**:
  - `/(tabs)/administration/company-users` - Lista de usuarios
  - `/(tabs)/administration/company-users/form` - Nuevo usuario
  - `/(tabs)/administration/company-users/[id]` - Ver usuario
  - `/(tabs)/administration/company-users/[id]/edit` - Editar usuario
- **Propósito**: Usuarios con acceso a la empresa actual
- **Funcionalidad**:
  - Ver usuarios de la empresa
  - Asignar permisos específicos
  - Gestión de acceso por ubicación
- **Permisos**: `MANAGE_COMPANY_USERS`

#### 4. Ubicaciones
- **Rutas**:
  - `/(tabs)/administration/locations` - Lista de ubicaciones
  - `/(tabs)/administration/locations/form` - Nueva ubicación
  - `/(tabs)/administration/locations/[id]` - Ver ubicación
  - `/(tabs)/administration/locations/[id]/edit` - Editar ubicación
- **Propósito**: Gestión de sucursales/almacenes
- **Funcionalidad**:
  - Crear sucursales
  - Configuración de ubicación
  - Asignación de trabajadores
  - Control de inventario por ubicación
- **Permisos**: `MANAGE_LOCATIONS`

#### 5. Trabajadores (Empresa)
- **Rutas**:
  - `/(tabs)/administration/workers` - Lista de trabajadores
  - `/(tabs)/administration/workers/form` - Nuevo trabajador
  - `/(tabs)/administration/workers/[id]` - Ver trabajador
  - `/(tabs)/administration/workers/[id]/edit` - Editar trabajador
- **Propósito**: Gestión de empleados a nivel empresa
- **Funcionalidad**:
  - Registro de empleados
  - Asignación a ubicaciones
  - Datos de contacto
  - Roles y responsabilidades
- **Permisos**: `MANAGE_WORKERS`

---

### Categoría: Configuración de Ubicación Actual

#### 6. Ubicación Actual
- **Ruta**: `/(tabs)/administration/current-location`
- **Propósito**: Ver y editar configuración de la ubicación actual
- **Funcionalidad**:
  - Información de la ubicación
  - Configuración específica
  - Parámetros de operación
- **Permisos**: `VIEW_LOCATION_INFO`

#### 7. Trabajadores de Ubicación Actual
- **Rutas**:
  - `/(tabs)/administration/current-workers` - Lista de trabajadores
  - `/(tabs)/administration/current-workers/form` - Nuevo trabajador
  - `/(tabs)/administration/current-workers/[id]` - Ver trabajador
  - `/(tabs)/administration/current-workers/[id]/edit` - Editar trabajador
- **Propósito**: Gestión de empleados de la ubicación actual
- **Funcionalidad**:
  - Ver trabajadores de la ubicación
  - Asignar trabajadores
  - Gestión de horarios
  - Asignación de tareas
- **Permisos**: `MANAGE_LOCATION_WORKERS`

---

### Categoría: Catálogos

#### 8. Categorías
- **Rutas**:
  - `/(tabs)/administration/categories` - Lista de categorías
  - `/(tabs)/administration/categories/form` - Nueva categoría
  - `/(tabs)/administration/categories/[id]` - Ver categoría
  - `/(tabs)/administration/categories/[id]/edit` - Editar categoría
- **Propósito**: Organización de productos por categorías
- **Funcionalidad**:
  - Crear categorías
  - Jerarquía de categorías
  - Asignación a productos
- **Permisos**: `MANAGE_CATEGORIES`

#### 9. Unidades de Medida
- **Rutas**:
  - `/(tabs)/administration/unidades` - Lista de unidades
  - `/(tabs)/administration/unidades/form` - Nueva unidad
  - `/(tabs)/administration/unidades/[id]` - Ver unidad
  - `/(tabs)/administration/unidades/[id]/edit` - Editar unidad
- **Propósito**: Catálogo de unidades de medida
- **Funcionalidad**:
  - Crear unidades (kg, pcs, caja, litro, etc.)
  - Conversiones entre unidades
  - Asignación a productos
- **Permisos**: `MANAGE_UNITS`

#### 10. Proveedores
- **Rutas**:
  - `/(tabs)/administration/suppliers` - Lista de proveedores
  - `/(tabs)/administration/suppliers/form` - Nuevo proveedor
  - `/(tabs)/administration/suppliers/[id]` - Ver proveedor
  - `/(tabs)/administration/suppliers/[id]/edit` - Editar proveedor
- **Propósito**: Gestión de proveedores
- **Funcionalidad**:
  - Registro de proveedores
  - Datos de contacto
  - Historial de compras
  - Evaluación de proveedores
- **Permisos**: `MANAGE_SUPPLIERS`

#### 11. Clientes
- **Rutas**:
  - `/(tabs)/administration/clientes` - Lista de clientes
  - `/(tabs)/administration/clientes/form` - Nuevo cliente
  - `/(tabs)/administration/clientes/[id]` - Ver cliente
  - `/(tabs)/administration/clientes/[id]/edit` - Editar cliente
- **Propósito**: Gestión de clientes
- **Funcionalidad**:
  - Registro de clientes
  - Datos fiscales
  - Historial de compras
  - Análisis de clientes frecuentes
- **Permisos**: `MANAGE_CLIENTS`

---

## Tab 5: Perfil

**Ruta**: `/(tabs)/profile`

**Archivo**: [profile.tsx](../app/(tabs)/profile.tsx)

### Propósito
Perfil del usuario y configuración de la aplicación.

### Funcionalidades

#### Información del Usuario
- Nombre completo
- Email
- Foto de perfil
- Rol en el sistema

#### Información de Contexto
- Empresa actual seleccionada
- Ubicación actual de trabajo
- Cambio rápido de empresa/ubicación

#### Permisos y Acceso
- Visualización de permisos asignados
- Módulos a los que tiene acceso
- Limitaciones de acceso

#### Permisos de Aplicación
- **Cámara**: Para escaneo de códigos de barras y fotos
- **Notificaciones**: Alertas push
- **Ubicación**: Geolocalización (si aplica)
- **Biblioteca de medios**: Acceso a galería de fotos
- Botones para solicitar/verificar permisos

#### Configuración
- Preferencias de la aplicación
- Modo oscuro/claro
- Idioma (si aplica)

#### Acciones
- **Cerrar Sesión**: Logout y retorno a pantalla de login
- Limpiar caché
- Versión de la aplicación

---

## Patrones de Diseño

### Patrón CRUD Estándar
Todos los módulos CRUD siguen el mismo patrón:

1. **Index** (`index.tsx`): Lista de registros con búsqueda, filtros y paginación
2. **Form** (`form.tsx`): Formulario de creación de nuevo registro
3. **View** (`[id]/index.tsx`): Vista de detalle del registro
4. **Edit** (`[id]/edit.tsx`): Formulario de edición del registro

### Convenciones de Rutas
- Carpetas con paréntesis `(tabs)`, `(stacks)`: Agrupación de rutas sin afectar la URL
- Carpetas con corchetes `[id]`: Parámetros dinámicos
- `_layout.tsx`: Configuración de navegación del grupo
- `index.tsx`: Ruta por defecto de la carpeta

### Componentes Reutilizables
- **AppSelect**: Selects personalizados con búsqueda
- **AppButton**: Botones estandarizados
- **AppTextInput**: Inputs de texto
- **SkeletonLoader**: Indicadores de carga
- **ResponsiveGrid**: Layouts adaptativos
- **ErrorText**: Mensajes de error

---

## Sistema de Permisos

La aplicación utiliza un sistema de permisos granular. Ejemplos:

- `MANAGE_COMPANIES`: Gestionar empresas
- `MANAGE_USERS`: Gestionar usuarios del sistema
- `MANAGE_COMPANY_USERS`: Gestionar usuarios de empresa
- `MANAGE_LOCATIONS`: Gestionar ubicaciones
- `MANAGE_WORKERS`: Gestionar trabajadores
- `MANAGE_CATEGORIES`: Gestionar categorías
- `MANAGE_UNITS`: Gestionar unidades
- `MANAGE_SUPPLIERS`: Gestionar proveedores
- `MANAGE_CLIENTS`: Gestionar clientes
- `MANAGE_PRODUCTS`: Gestionar productos
- `MANAGE_INVENTORY`: Gestionar inventario
- `MANAGE_SALES`: Gestionar ventas
- `MANAGE_PURCHASES`: Gestionar compras
- `VIEW_REPORTS`: Ver reportes

Cada usuario tiene permisos específicos que determinan qué módulos puede ver y qué acciones puede realizar.

---

## Guardias de Navegación

### AuthRequiredWrapper
Verifica que el usuario esté autenticado antes de acceder a cualquier ruta protegida.

### CompanyRequiredWrapper
Asegura que el usuario haya seleccionado una empresa antes de acceder a funcionalidades.

### LocationRequiredWrapper
Valida que se haya seleccionado una ubicación para operaciones que la requieren.

### NavigationHandler
Orquesta toda la lógica de navegación:
1. Verifica autenticación → Redirige a `/login` si no está autenticado
2. Verifica empresa → Redirige a `/(stacks)/selectCompany` si falta
3. Verifica ubicación → Muestra `LocationSelector` si falta
4. Permite acceso a la aplicación cuando todo está configurado

---

## Notas Técnicas

### Multiplataforma
La aplicación está optimizada para:
- **Móvil**: Navegación con pestañas inferiores
- **Tablet**: Layouts adaptativos de 2 columnas
- **Web**: Navegación lateral (sidebar) en lugar de pestañas

### Estado Global
- **AuthContext**: Usuario, empresa y ubicación seleccionados
- **SelectDataProvider**: Datos de catálogos (categorías, unidades, etc.)
- **AlertsProvider**: Sistema de alertas y mensajes
- **SalesContext**: Estado de ventas y carrito (POS)

### Responsive Design
- Uso de `ResponsiveGrid` para layouts adaptativos
- Breakpoints: móvil (<768px), tablet (768-1024px), desktop (>1024px)
- Componentes que ajustan su diseño según el tamaño de pantalla

---

## Resumen de Conteo de Módulos

- **Pantallas Raíz**: 2 (Login, 404)
- **Módulos Stack**: 4 (Empresas, Ubicaciones, Notificaciones, Tareas)
- **Tab Home**: 8 módulos principales (Producción, Compras, Ventas, Transferencias+4, Ajustes, Reportes)
- **Tab Inventario**: 3 módulos (Dashboard, Productos, Inventario Semanal, Ajustes)
- **Tab Dashboard**: 1 módulo (Reportes y análisis)
- **Tab Administración**: 11 módulos CRUD
- **Tab Perfil**: 1 módulo

**Total aproximado**: ~30 módulos funcionales principales

---

*Esta documentación es un resumen ejecutivo. Para detalles sobre navegación específica, consultar [NAVEGACION.md](./NAVEGACION.md)*
