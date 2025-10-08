# 🎨 Diagrama Visual del Sistema PlastiGest

## 📊 Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    🏢 SISTEMA PLASTIGEST                        │
│                     Multi-Tenant por Compañía                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              🔐 AUTENTICACIÓN  📱 FRONTEND    🗄️ BACKEND
                    │               │               │
        ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
        │ Laravel      │    │ React Native │   │ Laravel API  │
        │ Sanctum      │    │ + Expo       │   │ + MySQL      │
        │ Multi-Roles  │    │ Router       │   │ CrudController│
        └──────────────┘    └──────────────┘   └──────────────┘
```

## 🏗️ Estructura de Entidades Principales

```
                    ┌─────────────────┐
                    │    🏢 COMPANY    │
                    │  - id           │
                    │  - name         │
                    │  - rfc          │
                    │  - address      │
                    └─────────┬───────┘
                             │ (1:N)
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │ 👤 USER │         │🏪 LOCATION│       │📦 PRODUCT│
   │- name   │         │- name     │       │- code    │
   │- email  │         │- address  │       │- name    │
   │- roles  │         │- phone    │       │- price   │
   └─────────┘         └───────────┘       └─────┬────┘
        │                    │                   │
        │(N:M)              │(N:M)              │(N:1)
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │ 🎭 ROLE │         │📋 MOVEMENT│       │🏷️ CATEGORY│
   │- name   │         │- type     │       │- name    │
   │- perms  │         │- quantity │       │- desc    │
   └─────────┘         │- date     │       └─────────┘
                       └───────────┘
```

## 🔄 Flujo de Navegación Frontend

```
📱 APP PRINCIPAL
│
├── 🔑 LOGIN ──────────► 🏢 SELECT COMPANY ──────────► 🏠 HOME DASHBOARD
│                                                           │
└── 🚪 LOGOUT                                              │
                                                           │
    ┌──────────────────────────────────────────────────────┤
    │                                                      │
    ▼                                                      ▼
📊 MOVIMIENTOS                                        📋 CATÁLOGOS
│                                                      │
├── 🛒 COMPRAS                                        ├── 📦 PRODUCTOS
│   └── /home/compras/*                               │   └── /home/productos/*
├── 💰 VENTAS                                         ├── 🏷️ CATEGORÍAS
│   └── /home/ventas/*                                │   └── /home/categorias/*
├── 🔄 TRANSFERENCIAS                                 ├── 📏 UNIDADES
│   └── /home/transferencias/*                        │   └── /home/unidades/*
└── 🏭 USO EMPRESA                                    ├── 👥 CLIENTES
    └── /home/uso-empresa/*                           │   └── /home/clientes/*
                                                      ├── 🚚 PROVEEDORES
                                                      │   └── /home/proveedores/*
                                                      ├── 🏪 SUCURSALES ✅
                                                      │   └── /home/locations/*
                                                      ├── 🏢 COMPAÑÍAS ✅
                                                      │   └── /home/companies/*
                                                      ├── 👤 USUARIOS
                                                      │   └── /home/users/*
                                                      └── 🎭 ROLES ✅
                                                          └── /home/roles/*
```

## 🗂️ Estructura de Carpetas por Módulo

```
/app/(tabs)/home/[MODULO]/
│
├── 📄 _layout.tsx ──────────► AppBar + Stack Navigation
├── 📋 index.tsx ────────────► AppList (Lista principal)
├── 📝 form.tsx ─────────────► AppForm (Crear/Editar)
└── 🔍 [id].tsx ─────────────► Detalle/Vista (usa form.tsx)

EJEMPLO: /app/(tabs)/home/productos/
│
├── 📄 _layout.tsx ──────────► AppBar "Productos"
├── 📋 index.tsx ────────────► Lista de productos con paginación
├── 📝 form.tsx ─────────────► Formulario producto (crear/editar)
└── 🔍 [id].tsx ─────────────► Ver/Editar producto específico
```

## 🔧 Componentes del Sistema

```
📁 /components/
│
├── 🎛️ Form/ ─────────────────► Componentes de Formulario
│   ├── AppForm/             │   ✅ SIEMPRE USAR
│   ├── AppInput.tsx         │   ✅ SIEMPRE USAR
│   ├── AppSelect/           │   ✅ SIEMPRE USAR
│   ├── AppDatePicker.tsx    │   ✅ SIEMPRE USAR
│   └── AppCheckBox.tsx      │   ✅ SIEMPRE USAR
│
├── 📱 App/ ──────────────────► Componentes de Aplicación
│   ├── AppBar/              │   ✅ SIEMPRE USAR
│   └── AppList/             │   ✅ SIEMPRE USAR
│
└── 🪟 Modal/ ────────────────► Modales y Overlays
    ├── AppModal.tsx
    └── FilterModal.tsx
```

## 🌐 Servicios API

```
📁 /utils/services/
│
├── 📄 index.ts ─────────────► Registry Central
│                              │
│   const Services = {         │
│     admin,        ──────────►├── 👥 admin/
│     catalogos,   ──────────►├── 📋 catalogos/
│     inventarios, ──────────►├── 📦 inventarios/
│     operaciones  ──────────►└── 🔄 operaciones/
│   }
│
├── 🏛️ admin/ ──────────────── Administración del Sistema
│   ├── companies/
│   ├── locations/ ✅
│   ├── users/
│   ├── roles/ ✅
│   └── workers/ ⏳ PENDIENTE
│
├── 📋 catalogos/ ⏳ ────────── Catálogos de Productos
│   ├── productos/
│   ├── categorias/
│   ├── unidades/
│   ├── clientes/
│   └── proveedores/
│
├── 📦 inventarios/ ⏳ ──────── Gestión de Inventario
│   ├── movimientos/
│   ├── conteos/
│   └── reportes/
│
└── 🔄 operaciones/ ⏳ ──────── Compras/Ventas
    ├── compras/
    ├── ventas/
    └── transferencias/
```

## 🎯 Patrón de Desarrollo CRUD

```
1️⃣ PLANIFICAR
   │
   ├── Definir modelo de datos
   ├── Crear interfaz TypeScript
   └── Planificar validaciones Yup
   │
   ▼
2️⃣ BACKEND (Laravel)
   │
   ├── Migración + Modelo + Relaciones
   ├── Controller (extends CrudController)
   ├── Resource (transformación de datos)
   └── Rutas API
   │
   ▼
3️⃣ FRONTEND (React Native)
   │
   ├── Actualizar dashboard (index.tsx)
   ├── Crear carpeta /home/[modulo]/
   ├── _layout.tsx (AppBar)
   ├── index.tsx (AppList)
   ├── form.tsx (AppForm + Form/*)
   ├── [id].tsx (reutiliza form.tsx)
   └── Crear servicio en utils/services/
   │
   ▼
4️⃣ INTEGRACIÓN
   │
   ├── Registrar servicio en index.ts
   ├── Probar CRUD completo
   ├── Validar navegación
   └── Testing end-to-end
```

## 🎨 Sistema de Colores

```
📄 /constants/palette.ts ──────► ✅ SIEMPRE USAR

const palette = {
  primary: "#007AFF",     ────► 🔵 Azul principal
  secondary: "#5856D6",   ────► 🟣 Púrpura secundario
  accent: "#FF9500",      ────► 🟠 Naranja acento
  background: "#F2F2F7",  ────► ⬜ Fondo principal
  surface: "#FFFFFF",     ────► ⬜ Superficie cards
  text: "#000000",        ────► ⬜ Texto principal
  textSecondary: "#666",  ────► 🔘 Texto secundario
  error: "#FF3B30",       ────► 🔴 Errores
  warning: "#FF9500",     ────► 🟡 Advertencias
  success: "#34C759",     ────► 🟢 Éxito
  info: "#007AFF"         ────► 🔵 Información
}
```

## ⚡ Estado Actual de Módulos

```
✅ COMPLETADOS:
├── 🏢 companies/     (Compañías)
├── 🏪 locations/     (Sucursales)
└── 🎭 roles/         (Roles y Permisos)

⏳ PENDIENTES (Siguen el patrón):
├── 👤 users/         (Usuarios)
├── 👷 workers/       (Empleados) ⚠️ CRÍTICO
├── 📦 productos/     (Productos)
├── 🏷️ categorias/    (Categorías)
├── 📏 unidades/      (Unidades)
├── 👥 clientes/      (Clientes)
├── 🚚 proveedores/   (Proveedores)
├── 🛒 compras/       (Compras)
├── 💰 ventas/        (Ventas)
└── 🔄 transferencias/ (Transferencias)
```

## 🚨 Workers - Sistema Faltante Crítico

```
⚠️ PROBLEMA IDENTIFICADO:
Los Workers/Empleados NO están implementados

📋 NECESARIO IMPLEMENTAR:

1️⃣ Backend:
├── Migración: create_workers_table
├── Modelo: Worker con relaciones
├── Controller: WorkerController
└── Resource: WorkerResource

2️⃣ Frontend:
├── Dashboard: link en catalogos
├── /home/workers/ (carpeta completa)
├── Servicio: admin.workers
└── Registro en Services

3️⃣ Relaciones:
├── User ──(1:N)──► Worker ──(N:1)──► Company
├── Worker permisos por compañía
└── Worker asignado a Location
```

Este diagrama visual muestra la estructura completa del sistema PlastiGest y los patrones que deben seguirse para mantener consistencia en el desarrollo.

---

## 📋 Checklist Rápido para Nuevos Módulos

- [ ] 📍 Link agregado en dashboard
- [ ] 📁 Carpeta creada en /home/
- [ ] 📄 \_layout.tsx con AppBar
- [ ] 📋 index.tsx con AppList
- [ ] 📝 form.tsx con AppForm
- [ ] 🔍 [id].tsx reutilizando form
- [ ] 🌐 Servicio en utils/services
- [ ] 📄 Registrado en index.ts
- [ ] ✅ CRUD funcionando completo
