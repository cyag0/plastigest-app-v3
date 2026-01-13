# Arquitectura General del Sistema Plastigest

> Diagrama completo de la arquitectura del sistema, incluyendo frontend, backend e integraciones
> 
> **Fecha de actualización**: Diciembre 12, 2025

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Componentes del Sistema](#componentes-del-sistema)
5. [Flujos de Datos](#flujos-de-datos)
6. [Integraciones Externas](#integraciones-externas)
7. [Flujos de Procesos de Negocio](#flujos-de-procesos-de-negocio)
8. [Seguridad y Autenticación](#seguridad-y-autenticación)

---

## Visión General

Plastigest es un sistema de gestión empresarial (ERP) completo que abarca:
- **Inventario**: Control de stock en tiempo real
- **Ventas**: Punto de venta (POS) y gestión de ventas
- **Compras**: Órdenes de compra a proveedores
- **Producción**: Manufactura y control de fórmulas
- **Transferencias**: Movimientos entre ubicaciones
- **Reportes**: Análisis y dashboard de negocio
- **Administración**: Multi-empresa, multi-ubicación

---

## Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph "Dispositivos de Usuario"
        A1[📱 App Móvil iOS]
        A2[📱 App Móvil Android]
        A3[💻 Web Browser]
    end
    
    subgraph "Frontend - Expo/React Native"
        B1[Navegación Expo Router]
        B2[Contextos React AuthContext, SalesContext]
        B3[Componentes UI React Native Paper]
        B4[Hooks Personalizados]
        B5[API Client Axios]
    end
    
    subgraph "Backend - Laravel 10"
        C1[API REST Controllers]
        C2[Services Layer Lógica de Negocio]
        C3[Models Eloquent ORM]
        C4[Middleware Auth & Permissions]
        C5[Jobs & Queues]
    end
    
    subgraph "Base de Datos"
        D1[(MySQL Database)]
    end
    
    subgraph "Servicios Externos"
        E1[🔔 Firebase FCM Push Notifications]
        E2[💬 WhatsApp Cloud API Meta/Facebook]
        E3[📧 Email SMTP]
        E4[☁️ Storage S3/Local Imágenes & PDFs]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> B1
    
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> B5
    
    B5 -->|HTTPS/JSON| C1
    
    C1 --> C2
    C2 --> C3
    C3 --> D1
    
    C2 -->|Notificaciones Push| E1
    C2 -->|Mensajes WhatsApp| E2
    C2 -->|Emails| E3
    C2 -->|Upload/Download| E4
    
    E1 -.->|Push| A1
    E1 -.->|Push| A2
    
    C4 --> C1
    C5 --> C2
    
    style E1 fill:#FFA500
    style E2 fill:#25D366
    style E3 fill:#0078D4
    style E4 fill:#FF9900
```

---

## Stack Tecnológico

### Frontend (Mobile & Web)

```mermaid
graph LR
    A[Expo SDK 51] --> B[React Native]
    B --> C[TypeScript]
    C --> D[React Native Paper UI]
    D --> E[Expo Router Navegación]
    E --> F[Context API Estado Global]
    F --> G[Axios API Client]
    G --> H[React Hook Form Formularios]
    
    style A fill:#000020,color:#fff
    style D fill:#6200EE,color:#fff
    style E fill:#000020,color:#fff
```

#### Bibliotecas Principales
- **Expo SDK 51**: Framework para React Native
- **React Native**: Framework de UI
- **TypeScript**: Tipado estático
- **React Native Paper**: Biblioteca de componentes Material Design
- **Expo Router**: Navegación basada en archivos
- **Axios**: Cliente HTTP
- **React Hook Form**: Gestión de formularios
- **React Query** (opcional): Cache de datos
- **Firebase SDK**: Notificaciones push
- **Expo Image Picker**: Selección de imágenes
- **Expo Camera**: Escaneo de códigos de barras

### Backend (API)

```mermaid
graph LR
    A[Laravel 10] --> B[PHP 8.2+]
    B --> C[Laravel Sanctum Auth]
    C --> D[Eloquent ORM]
    D --> E[MySQL 8.0]
    E --> F[Redis Cache]
    F --> G[Laravel Queue]
    
    style A fill:#FF2D20,color:#fff
    style C fill:#00D1B2,color:#fff
    style E fill:#4479A1,color:#fff
    style F fill:#DC382D,color:#fff
```

#### Paquetes Principales
- **Laravel 10**: Framework PHP
- **Laravel Sanctum**: Autenticación API
- **Eloquent ORM**: Mapeo objeto-relacional
- **Spatie Laravel Permission**: Roles y permisos
- **Kreait Firebase PHP**: Integración Firebase
- **Netflie WhatsApp API**: Integración WhatsApp
- **Laravel Excel**: Exportación de datos
- **Barryvdh DomPDF**: Generación de PDFs
- **Laravel Telescope**: Debugging y monitoreo

### Infraestructura

- **Servidor Web**: Nginx / Apache
- **Base de Datos**: MySQL 8.0
- **Cache**: Redis
- **Storage**: Local / AWS S3
- **SSL/TLS**: Let's Encrypt
- **Deployment**: Docker (opcional)

---

## Componentes del Sistema

### 1. Frontend Mobile/Web

```mermaid
graph TD
    subgraph "Capa de Presentación"
        A[Screens/Pages]
        A --> B[Components Reutilizables]
        B --> C[UI Components Paper]
    end
    
    subgraph "Capa de Lógica"
        D[Hooks Personalizados]
        D --> E[Context Providers]
        E --> F[API Services]
    end
    
    subgraph "Capa de Datos"
        G[Local Storage AsyncStorage]
        G --> H[API Cache]
        H --> I[API Client Axios]
    end
    
    A --> D
    B --> D
    D --> G
    F --> I
    
    I -.->|HTTP Requests| J[Backend API]
    
    style A fill:#E3F2FD
    style D fill:#FFF3E0
    style G fill:#F3E5F5
```

#### Estructura de Navegación

```mermaid
graph TD
    A[Root _layout.tsx] --> B{Usuario Autenticado?}
    B -->|No| C[/login]
    B -->|Sí| D{Empresa Seleccionada?}
    D -->|No| E[/stacks/selectCompany]
    D -->|Sí| F{Ubicación Seleccionada?}
    F -->|No| G[LocationSelector Modal]
    F -->|Sí| H[/tabs Navegación Principal]
    
    H --> I[Tab: Home]
    H --> J[Tab: Inventory]
    H --> K[Tab: Reports]
    H --> L[Tab: Administration]
    H --> M[Tab: Profile]
    
    style C fill:#FF5252,color:#fff
    style E fill:#FFC107
    style G fill:#FFC107
    style H fill:#4CAF50,color:#fff
```

---

### 2. Backend API

```mermaid
graph TD
    subgraph "Capa de Presentación API"
        A[Routes/api.php]
        A --> B[Middleware]
        B --> C[Controllers]
    end
    
    subgraph "Capa de Lógica de Negocio"
        D[Services]
        D --> E[Validations]
        E --> F[Business Rules]
    end
    
    subgraph "Capa de Datos"
        G[Models Eloquent]
        G --> H[Database Migrations]
        H --> I[MySQL Database]
    end
    
    subgraph "Integraciones"
        J[Firebase Service]
        K[WhatsApp Service]
        L[Email Service]
    end
    
    C --> D
    D --> G
    D --> J
    D --> K
    D --> L
    
    style A fill:#FF2D20,color:#fff
    style D fill:#FFB74D
    style G fill:#81C784
    style J fill:#FFA726
```

#### Flujo de Petición HTTP

```mermaid
sequenceDiagram
    participant F as Frontend
    participant M as Middleware
    participant C as Controller
    participant S as Service
    participant D as Database
    participant E as External API
    
    F->>+M: HTTP Request + Token
    M->>M: Verify Authentication
    M->>M: Check Permissions
    M->>+C: Forward Request
    C->>C: Validate Input
    C->>+S: Execute Business Logic
    S->>+D: Query/Update Data
    D-->>-S: Return Data
    S->>E: Call External Service (if needed)
    E-->>S: Response
    S-->>-C: Return Result
    C-->>-M: JSON Response
    M-->>-F: HTTP Response + Data
```

---

## Flujos de Datos

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App Frontend
    participant B as Backend API
    participant D as Database
    participant F as Firebase
    
    U->>A: Ingresar credenciales
    A->>B: POST /api/auth/login
    B->>D: Verificar usuario
    D-->>B: Usuario válido
    B->>B: Generar token Sanctum
    B-->>A: Token + Datos de usuario
    A->>A: Guardar token en AsyncStorage
    A->>A: Actualizar AuthContext
    
    A->>F: Registrar FCM token
    A->>B: POST /api/device-tokens
    B->>D: Guardar FCM token
    
    A->>B: GET /api/auth/me (con token)
    B->>D: Obtener datos de usuario
    D-->>B: Empresas y ubicaciones
    B-->>A: Datos completos
    
    A->>A: Navegar a selectCompany
    U->>A: Seleccionar empresa
    A->>A: Actualizar contexto
    A->>A: Navegar a selectLocation
    U->>A: Seleccionar ubicación
    A->>A: Actualizar contexto
    A->>A: Navegar a Home
```

---

### Flujo de Compra con WhatsApp

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App
    participant B as Backend
    participant D as Database
    participant W as WhatsApp API
    participant P as Proveedor
    
    U->>A: Crear orden de compra
    A->>B: POST /api/purchases (status: draft)
    B->>D: Guardar compra
    D-->>B: Compra #123
    B-->>A: Compra creada
    
    U->>A: Confirmar orden
    A->>B: POST /api/purchases/123/transition-to (status: ordered)
    B->>B: Validar cambio de estado
    B->>D: Actualizar status
    
    B->>B: Detectar cambio draft → ordered
    B->>B: Obtener teléfono del proveedor
    B->>W: Enviar mensaje WhatsApp
    
    Note over B,W: Mensaje con detalles:<br/>- Número de orden<br/>- Lista de productos<br/>- Cantidades y precios<br/>- Total<br/>- Fecha de entrega
    
    W->>P: 💬 Mensaje de WhatsApp
    W-->>B: Mensaje enviado exitosamente
    
    B->>D: Crear tarea "Recibir compra"
    B-->>A: Compra actualizada
    
    P->>W: Responder mensaje (opcional)
    W->>B: Webhook /api/webhooks/whatsapp
    B->>D: Registrar respuesta
```

---

### Flujo de Notificación Push por Stock Bajo

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App
    participant B as Backend
    participant D as Database
    participant F as Firebase FCM
    
    U->>A: Completar conteo de inventario
    A->>B: POST /api/inventory-counts/456/complete
    
    B->>D: Actualizar stock en product_location
    D-->>B: Stock actualizado
    
    B->>D: Query: Productos con stock < mínimo
    D-->>B: 5 productos con stock bajo
    
    B->>D: Crear notificación en DB
    B->>D: Obtener tokens FCM del usuario
    D-->>B: [token1, token2, token3]
    
    B->>F: Enviar push notification
    Note over B,F: Título: "⚠️ Alerta de Stock Bajo"<br/>Body: "5 productos por debajo del mínimo"<br/>Data: {product_ids, location_id}
    
    F->>A: 🔔 Push Notification
    F-->>B: Envío exitoso
    
    B->>D: Actualizar last_sent_at en tokens
    B-->>A: 200 OK - Conteo completado
    
    U->>A: Tap en notificación
    A->>A: Navegar a /inventory?filter=low_stock
```

---

### Flujo de Transferencia entre Ubicaciones

```mermaid
sequenceDiagram
    participant U1 as Usuario Ubicación B
    participant U2 as Usuario Ubicación A
    participant A as App
    participant B as Backend
    participant D as Database
    participant N as NotificationService
    participant F as Firebase
    
    Note over U1: Ubicación B necesita productos
    
    U1->>A: Crear petición de transferencia
    A->>B: POST /api/transfers
    Note over A,B: {<br/>  from_location: A,<br/>  to_location: B,<br/>  products: [...]<br/>}
    
    B->>D: Crear transfer (status: draft)
    B->>B: Cambiar a status: ordered
    
    B->>N: Notificar a usuarios de Ubicación A
    N->>D: Crear notificación
    N->>F: Enviar push
    F->>U2: 🔔 "Nueva solicitud de transferencia"
    
    B-->>A: Petición creada
    
    Note over U2: Usuario de Ubicación A recibe notificación
    
    U2->>A: Ver petición
    A->>B: GET /api/transfers/789
    B-->>A: Detalles de transferencia
    
    U2->>A: Aprobar petición
    A->>B: POST /api/transfers/789/approve
    B->>D: Actualizar status: ordered
    B->>N: Notificar a Ubicación B
    N->>F: Push "Transferencia aprobada"
    F->>U1: 🔔 Notificación
    
    U2->>A: Enviar productos
    A->>B: POST /api/transfers/789/ship
    B->>D: Decrementar stock en Ubicación A
    B->>D: Cambiar status: in_transit
    B->>D: Crear registro en kardex
    B->>N: Notificar a Ubicación B
    N->>F: Push "Transferencia enviada"
    F->>U1: 🔔 Notificación
    
    Note over U1: Productos en camino
    
    U1->>A: Recibir productos
    A->>B: POST /api/transfers/789/receive
    B->>D: Incrementar stock en Ubicación B
    B->>D: Cambiar status: received
    B->>D: Registrar en kardex
    B->>N: Notificar a Ubicación A
    N->>F: Push "Transferencia recibida"
    F->>U2: 🔔 Notificación
    
    B-->>A: Transferencia completada
```

---

## Integraciones Externas

### 1. Firebase Cloud Messaging (FCM)

```mermaid
graph LR
    A[Backend Laravel] -->|SDK Firebase PHP| B[Firebase Project]
    B -->|FCM API| C[APNs Apple]
    B -->|FCM API| D[FCM Android]
    C --> E[📱 iOS Device]
    D --> F[📱 Android Device]
    
    G[App Frontend] -->|Register Token| A
    A -->|Store Token| H[(Database)]
    
    style B fill:#FFA500,color:#000
    style C fill:#000,color:#fff
    style D fill:#3DDC84,color:#000
```

**Flujo**:
1. App se registra y obtiene FCM token
2. App envía token al backend
3. Backend almacena token en tabla `device_tokens`
4. Cuando hay evento, backend usa Firebase SDK
5. Firebase enruta a APNs (iOS) o FCM (Android)
6. Dispositivo recibe notificación

**Eventos que generan notificaciones**:
- Stock bajo en inventario
- Tarea asignada
- Tarea próxima a vencer
- Transferencia recibida
- Compra pendiente de recibir

---

### 2. WhatsApp Cloud API (Meta)

```mermaid
graph LR
    A[Backend Laravel] -->|HTTP Request| B[WhatsApp Cloud API]
    B -->|Business API| C[WhatsApp Server]
    C -->|WhatsApp| D[📱 Proveedor]
    
    D -->|Respuesta| C
    C -->|Webhook| E[Backend /webhooks/whatsapp]
    E -->|Procesar| F[(Database)]
    
    style B fill:#25D366,color:#fff
    style C fill:#128C7E,color:#fff
```

**Configuración**:
- App ID en Meta Developer Console
- Phone Number ID
- Access Token
- Webhook URL: `https://api.plastigest.com/api/webhooks/whatsapp`
- Verify Token: `plastigest_webhook_token_2024`

**Uso**:
- Envío de órdenes de compra a proveedores
- Confirmaciones automáticas
- Recepción de respuestas (webhook)

---

### 3. Storage de Archivos

```mermaid
graph TD
    A[Usuario sube imagen] --> B[App Frontend]
    B -->|FormData| C[Backend API]
    C --> D{Tipo de Storage}
    D -->|Local| E[Storage Local /storage/app/public]
    D -->|Cloud| F[AWS S3 Bucket]
    
    C --> G[Guardar URL en Database]
    G --> H[(MySQL)]
    
    I[Usuario solicita imagen] --> J[App Frontend]
    J -->|GET URL| K[Backend]
    K -->|Signed URL| J
    J -->|Download| E
    J -->|Download| F
    
    style F fill:#FF9900,color:#000
```

**Tipos de archivos**:
- Imágenes de productos
- PDFs de reportes
- Códigos de barras
- Logos de empresas
- Documentos de compras/ventas

---

## Flujos de Procesos de Negocio

### Proceso de Venta Completo

```mermaid
flowchart TD
    A[Inicio] --> B[Usuario abre POS]
    B --> C[Seleccionar cliente opcional]
    C --> D[Buscar producto]
    D --> E[Agregar al carrito]
    E --> F{Más productos?}
    F -->|Sí| D
    F -->|No| G[Calcular total]
    G --> H[Aplicar descuento opcional]
    H --> I[Seleccionar método de pago]
    I --> J{Validar stock disponible}
    J -->|No suficiente| K[Mostrar error]
    K --> E
    J -->|Suficiente| L[Confirmar venta]
    L --> M[Backend: Decrementar stock]
    M --> N[Backend: Registrar movimiento]
    N --> O[Backend: Crear venta en DB]
    O --> P[Backend: Registrar kardex]
    P --> Q{Stock bajo mínimo?}
    Q -->|Sí| R[Crear notificación]
    Q -->|No| S[Generar ticket/factura]
    R --> S
    S --> T[Mostrar confirmación]
    T --> U{Imprimir ticket?}
    U -->|Sí| V[Generar PDF]
    V --> W[Fin]
    U -->|No| W
    
    style L fill:#4CAF50,color:#fff
    style M fill:#FF9800
    style R fill:#F44336,color:#fff
```

---

### Proceso de Compra a Proveedor

```mermaid
flowchart TD
    A[Inicio] --> B[Crear orden de compra]
    B --> C[Seleccionar proveedor]
    C --> D[Agregar productos]
    D --> E[Especificar cantidades]
    E --> F[Guardar como DRAFT]
    F --> G{Revisar y confirmar?}
    G -->|No| H[Editar orden]
    H --> E
    G -->|Sí| I[Cambiar a ORDERED]
    I --> J[Backend: Validar datos]
    J --> K{Proveedor tiene WhatsApp?}
    K -->|Sí| L[Enviar mensaje WhatsApp]
    K -->|No| M[Crear tarea manual]
    L --> N[Backend: Crear tarea recepción]
    M --> N
    N --> O[Notificar responsable]
    O --> P[Estado: ORDERED]
    
    P --> Q[Esperar llegada de productos]
    Q --> R[Cambiar a IN_TRANSIT]
    R --> S[Usuario notificado vía push]
    S --> T[Recibir productos]
    T --> U[Verificar cantidades]
    U --> V{Cantidades correctas?}
    V -->|No| W[Reportar diferencias]
    W --> X[Crear ajuste]
    V -->|Sí| Y[Confirmar recepción]
    X --> Y
    Y --> Z[Backend: Incrementar stock]
    Z --> AA[Backend: Registrar movimiento]
    AA --> AB[Backend: Actualizar kardex]
    AB --> AC[Cambiar a RECEIVED]
    AC --> AD[Completar tarea]
    AD --> AE[Fin]
    
    style I fill:#FFC107
    style L fill:#25D366,color:#fff
    style Z fill:#4CAF50,color:#fff
```

---

### Proceso de Conteo de Inventario

```mermaid
flowchart TD
    A[Inicio] --> B[Crear conteo de inventario]
    B --> C[Seleccionar ubicación]
    C --> D[Sistema genera lista de productos]
    D --> E[Usuario cuenta físicamente]
    E --> F{Escanear código de barras?}
    F -->|Sí| G[Scan producto]
    F -->|No| H[Buscar manualmente]
    G --> I[Ingresar cantidad contada]
    H --> I
    I --> J{Más productos?}
    J -->|Sí| E
    J -->|No| K[Completar conteo]
    K --> L[Backend: Comparar con sistema]
    L --> M{Hay discrepancias?}
    M -->|Sí| N[Marcar productos con diferencias]
    N --> O[Calcular variación]
    O --> P{Variación > 10%?}
    P -->|Sí| Q[Crear tarea de revisión]
    P -->|No| R[Generar ajustes automáticos]
    Q --> R
    M -->|No| S[Marcar conteo OK]
    R --> T[Aplicar ajustes al stock]
    T --> U[Actualizar product_location]
    U --> V[Registrar en kardex]
    V --> W{Productos con stock bajo?}
    W -->|Sí| X[Crear notificación stock bajo]
    X --> Y[Enviar push notification]
    W -->|No| Z[Generar reporte PDF]
    Y --> Z
    S --> Z
    Z --> AA[Fin]
    
    style K fill:#2196F3,color:#fff
    style Q fill:#FF9800
    style X fill:#F44336,color:#fff
    style Y fill:#FFA500
```

---

## Seguridad y Autenticación

### Sistema de Autenticación

```mermaid
flowchart TD
    subgraph "Autenticación"
        A[Usuario ingresa credenciales]
        A --> B[Backend valida con bcrypt]
        B --> C{Credenciales válidas?}
        C -->|No| D[Error 401]
        C -->|Sí| E[Generar token Sanctum]
        E --> F[Retornar token al cliente]
    end
    
    subgraph "Autorización"
        G[Request con token]
        G --> H[Middleware auth:sanctum]
        H --> I{Token válido?}
        I -->|No| J[Error 401 Unauthorized]
        I -->|Sí| K[Cargar usuario]
        K --> L[Middleware de permisos]
        L --> M{Usuario tiene permiso?}
        M -->|No| N[Error 403 Forbidden]
        M -->|Sí| O[Ejecutar acción]
    end
    
    F -.-> G
    
    style E fill:#4CAF50,color:#fff
    style J fill:#F44336,color:#fff
    style N fill:#F44336,color:#fff
    style O fill:#4CAF50,color:#fff
```

---

### Modelo de Permisos

```mermaid
graph TD
    A[Usuario] -->|tiene múltiples| B[Roles]
    B -->|tiene múltiples| C[Permisos]
    
    A -->|pertenece a| D[Empresa]
    A -->|trabaja en| E[Ubicación]
    
    D -->|tiene múltiples| E
    E -->|tiene| F[Inventario]
    
    C --> G[manage_products]
    C --> H[manage_inventory]
    C --> I[manage_sales]
    C --> J[manage_purchases]
    C --> K[view_reports]
    C --> L[manage_users]
    
    style A fill:#2196F3,color:#fff
    style B fill:#FF9800
    style C fill:#4CAF50,color:#fff
```

**Roles comunes**:
- **Super Admin**: Control total del sistema
- **Administrador de Empresa**: Gestiona su empresa
- **Gerente de Sucursal**: Gestiona su ubicación
- **Vendedor**: Solo ventas y consultas
- **Almacenista**: Inventario y recepciones
- **Operador**: Operaciones básicas

---

### Contexto Multi-Empresa y Multi-Ubicación

```mermaid
graph TD
    A[Usuario autenticado] --> B{Seleccionar Empresa}
    B --> C[Empresa A]
    B --> D[Empresa B]
    B --> E[Empresa C]
    
    C --> F{Seleccionar Ubicación}
    F --> G[Matriz]
    F --> H[Sucursal Norte]
    F --> I[Sucursal Sur]
    
    G --> J[Contexto establecido]
    H --> J
    I --> J
    
    J --> K[Todas las operaciones filtradas por:]
    K --> L[company_id]
    K --> M[location_id]
    
    M --> N[Inventario independiente]
    M --> O[Ventas de la ubicación]
    M --> P[Compras de la ubicación]
    
    style J fill:#4CAF50,color:#fff
    style L fill:#2196F3,color:#fff
    style M fill:#FF9800,color:#fff
```

**Helpers en Backend**:
```php
CurrentCompany::get()  // Empresa actual del usuario
CurrentLocation::get() // Ubicación actual del usuario
```

**Contextos en Frontend**:
```typescript
const { selectedCompany, location } = useAuth()
```

---

## Diagrama de Despliegue

```mermaid
graph TB
    subgraph "Cliente"
        A[📱 iOS App]
        B[📱 Android App]
        C[💻 Web Browser]
    end
    
    subgraph "CDN / App Stores"
        D[App Store]
        E[Google Play]
        F[Expo OTA Updates]
    end
    
    subgraph "Servidor Web"
        G[Nginx/Apache]
        G --> H[Laravel API]
        H --> I[PHP-FPM]
    end
    
    subgraph "Servicios"
        J[(MySQL 8.0)]
        K[(Redis Cache)]
        L[Queue Worker]
    end
    
    subgraph "Cloud Services"
        M[Firebase FCM]
        N[WhatsApp API]
        O[AWS S3 opcional]
    end
    
    A --> D
    B --> E
    A --> F
    B --> F
    
    A -->|HTTPS| G
    B -->|HTTPS| G
    C -->|HTTPS| G
    
    H --> J
    H --> K
    H --> L
    
    H --> M
    H --> N
    H --> O
    
    style G fill:#009688,color:#fff
    style J fill:#4479A1,color:#fff
    style K fill:#DC382D,color:#fff
    style M fill:#FFA500
    style N fill:#25D366,color:#fff
```

---

## Resumen de Comunicación entre Componentes

### Frontend → Backend

**Métodos de comunicación**:
- HTTP/HTTPS requests (REST API)
- JSON como formato de datos
- Autenticación: Bearer Token (Sanctum)
- Headers: `Authorization: Bearer {token}`

**Tipos de peticiones**:
```
GET    /api/products         → Listar
POST   /api/products         → Crear
GET    /api/products/{id}    → Detalle
PUT    /api/products/{id}    → Actualizar
DELETE /api/products/{id}    → Eliminar
```

---

### Backend → Servicios Externos

#### Firebase FCM
- **Protocolo**: HTTPS
- **Autenticación**: Service Account JSON
- **Uso**: Envío de push notifications

#### WhatsApp Cloud API
- **Protocolo**: HTTPS
- **Autenticación**: Bearer Token (Meta)
- **Uso**: Envío de mensajes a proveedores
- **Webhook**: Recepción de respuestas

#### Email SMTP
- **Protocolo**: SMTP/TLS
- **Autenticación**: Usuario/Contraseña
- **Uso**: Notificaciones por email (opcional)

---

### Backend → Base de Datos

- **Conexión**: PDO MySQL
- **ORM**: Eloquent
- **Migrations**: Control de versiones de esquema
- **Transactions**: Garantía de integridad en operaciones críticas

---

## Escalabilidad y Performance

### Estrategias de Optimización

```mermaid
graph LR
    A[Request] --> B[Redis Cache]
    B -->|Cache Hit| C[Return Cached]
    B -->|Cache Miss| D[Query Database]
    D --> E[Store in Cache]
    E --> C
    
    F[Queue Jobs] --> G[Background Processing]
    G --> H[Send Emails]
    G --> I[Generate PDFs]
    G --> J[Process Images]
    
    style B fill:#DC382D,color:#fff
    style G fill:#FF9800
```

**Técnicas**:
1. **Cache de consultas frecuentes** (Redis)
   - Catálogos (categorías, unidades)
   - Datos de usuario
   - Configuraciones

2. **Lazy Loading de relaciones** (Eloquent)
   - Cargar relaciones solo cuando se necesitan
   - Evitar N+1 queries

3. **Paginación**
   - Todas las listas paginadas
   - Límite de 50-100 items por página

4. **Queue Jobs**
   - Procesamiento en background
   - Envío de emails
   - Generación de PDFs
   - Procesamiento de imágenes

5. **Índices en base de datos**
   - Índices en columnas de búsqueda frecuente
   - Índices compuestos para filtros comunes

---

## Monitoreo y Logging

```mermaid
graph TD
    A[Aplicación] --> B[Laravel Telescope]
    A --> C[Log Files]
    A --> D[Error Tracking Sentry]
    
    B --> E[HTTP Requests]
    B --> F[Database Queries]
    B --> G[Cache Operations]
    B --> H[Queue Jobs]
    
    C --> I[Application Log]
    C --> J[Error Log]
    C --> K[Access Log]
    
    style B fill:#4951C9,color:#fff
    style D fill:#362D59,color:#fff
```

**Herramientas**:
- **Laravel Telescope**: Debug y monitoreo en desarrollo
- **Logs**: Registro de errores y eventos
- **Sentry** (opcional): Tracking de errores en producción
- **New Relic** (opcional): Monitoreo de performance

---

## Backup y Recuperación

```mermaid
graph LR
    A[MySQL Database] -->|Backup Diario| B[Dump SQL]
    B --> C[Compresión gzip]
    C --> D[Storage Local]
    C --> E[S3 Bucket]
    
    F[Storage Files] -->|Sync| E
    
    G[Redis Cache] -.->|Opcional| H[Persistencia RDB]
    
    style A fill:#4479A1,color:#fff
    style E fill:#FF9900,color:#000
```

**Estrategia**:
- Backup diario automático de base de datos
- Retención: 7 días locales, 30 días en cloud
- Backup de archivos: sincronización a S3
- Scripts de restauración documentados

---

## Documentos Relacionados

Para más información detallada sobre cada componente:

### Frontend
- [RESUMEN_MODULOS.md](RESUMEN_MODULOS.md) - Módulos del frontend
- [NAVEGACION.md](NAVEGACION.md) - Sistema de navegación

### Backend
- [RESUMEN_MODULOS_BACKEND.md](/home/cyag/plastigest/back/plastigest-back/docs/new/RESUMEN_MODULOS_BACKEND.md) - Módulos del backend

### Documentación Técnica Backend
- TASKS_AND_NOTIFICATIONS_SYSTEM.md
- PUSH_NOTIFICATIONS_LOW_STOCK.md
- WHATSAPP_WEBHOOK_SETUP.md
- INVENTORY_SYSTEM_DOCUMENTATION.md
- TRANSFER_REQUISITION_FLOW.md

---

## Glosario de Términos

- **ERP**: Enterprise Resource Planning
- **FCM**: Firebase Cloud Messaging
- **ORM**: Object-Relational Mapping
- **CRUD**: Create, Read, Update, Delete
- **API**: Application Programming Interface
- **REST**: Representational State Transfer
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **Sanctum**: Sistema de autenticación de Laravel
- **Eloquent**: ORM de Laravel
- **Expo**: Framework para React Native
- **OTA**: Over-The-Air (actualizaciones sin app store)

---

*Última actualización: Diciembre 12, 2025*
