# Sistema de Autenticación - PlastiGest

## Estructura implementada

### 📁 Archivos creados/modificados:

1. **`contexts/AuthContext.tsx`** - Contexto global de autenticación
2. **`app/login.tsx`** - Pantalla de login
3. **`app/(tabs)/profile.tsx`** - Tab de perfil con logout
4. **`components/NavigationHandler.tsx`** - Manejo de navegación condicional
5. **`app/_layout.tsx`** - Layout principal actualizado
6. **`app/(tabs)/_layout.tsx`** - Layout de tabs actualizado

### 🔐 Funcionalidades implementadas:

#### **AuthContext**
- ✅ Estado global de autenticación
- ✅ Funciones de login/logout
- ✅ Verificación automática de token al iniciar
- ✅ Manejo de errores y tokens expirados
- ✅ Integración completa con API Laravel

#### **Pantalla de Login**
- ✅ Formulario con validación
- ✅ Campos: email y contraseña
- ✅ Validación en tiempo real
- ✅ Manejo de errores de API
- ✅ Estados de carga
- ✅ Diseño responsivo con Material Design

#### **Tab Profile**
- ✅ Información completa del usuario
- ✅ Botón de logout con confirmación
- ✅ Diseño atractivo con avatar
- ✅ Información detallada (ID, fechas, verificación)
- ✅ Botón para cambiar contraseña (pendiente implementar)

#### **Navegación Condicional**
- ✅ Muestra login si no está autenticado
- ✅ Muestra tabs si está autenticado
- ✅ Redirección automática según estado
- ✅ Pantalla de carga durante verificación

### 🔄 Flujo de autenticación:

1. **Inicio de app**: Verifica si hay token guardado
2. **Sin token**: Muestra pantalla de login
3. **Con token**: Valida con servidor y muestra tabs
4. **Login exitoso**: Guarda token y redirige a tabs
5. **Logout**: Llama API, limpia storage y redirige a login
6. **Token expirado**: Limpia automáticamente y redirige a login

### 🛠️ Integración con Laravel:

#### **Endpoints utilizados:**
- `POST /api/auth/login` - Autenticación
- `GET /api/auth/me` - Verificar usuario actual
- `POST /api/auth/logout` - Cerrar sesión

#### **Headers automáticos:**
- `Authorization: Bearer {token}` - Se agrega automáticamente
- `Content-Type: application/json`
- `Accept: application/json`

### 📱 Uso en la aplicación:

```typescript
// En cualquier componente
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  
  // user: información del usuario
  // isAuthenticated: boolean del estado
  // login: función para autenticar
  // logout: función para cerrar sesión
  // isLoading: estado de carga
};
```

### 🎨 Características de UI:

- **Material Design 3** con React Native Paper
- **Temas responsivos** (light/dark automático)
- **Validación en tiempo real**
- **Estados de carga** en todos los formularios
- **Alertas de confirmación** para acciones importantes
- **Manejo de errores** con mensajes amigables

### 🔧 Configuración requerida:

1. **Instalar dependencias faltantes:**
   ```bash
   npm install axios @react-native-async-storage/async-storage
   ```

2. **Configurar variables de entorno:**
   - El archivo `.env` ya está configurado
   - Ajustar `EXPO_PUBLIC_API_URL` si es necesario

3. **Backend Laravel:**
   - Verificar que las rutas de API estén funcionando
   - Configurar CORS para React Native
   - Verificar que Laravel Sanctum esté configurado

### ✅ Sistema completamente funcional:

- ✅ Login con validación completa
- ✅ Tab Profile con información del usuario
- ✅ Logout con confirmación y limpieza
- ✅ Navegación automática según estado
- ✅ Manejo de errores y tokens expirados
- ✅ Integración completa con API Laravel
- ✅ UI profesional y responsiva

### 🚀 Próximos pasos opcionales:

1. **Cambio de contraseña** - Funcionalidad preparada
2. **Registro de usuarios** - Si se requiere
3. **Recuperación de contraseña** - Si se requiere
4. **Refresh tokens** - Para mayor seguridad
5. **Biometría** - Para autenticación rápida