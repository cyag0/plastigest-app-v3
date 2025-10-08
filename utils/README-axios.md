# Configuración de Axios para Laravel

## Instalación de dependencias requeridas

Para usar el cliente axios configurado, necesitas instalar las siguientes dependencias:

```bash
npm install axios @react-native-async-storage/async-storage
```

O con yarn:

```bash
yarn add axios @react-native-async-storage/async-storage
```

## Configuración

El cliente axios está configurado para trabajar con tu backend Laravel usando variables de entorno.

### Variables de entorno

Copia el archivo `.env.example` a `.env` y configura las variables según tu entorno:

```bash
cp .env.example .env
```

Variables principales:
- `EXPO_PUBLIC_API_URL`: URL base de tu API Laravel (ej: http://localhost:8000/api)
- `EXPO_PUBLIC_API_TIMEOUT`: Timeout para requests en milisegundos
- `EXPO_PUBLIC_LOG_REQUESTS`: Habilitar/deshabilitar logs de requests (true/false)
- `EXPO_PUBLIC_AUTH_TOKEN_KEY`: Clave para guardar el token en AsyncStorage
- `EXPO_PUBLIC_USER_DATA_KEY`: Clave para guardar datos del usuario

### Características incluidas:

1. **Configuración base**: URL base, timeout y headers por defecto
2. **Interceptores de request**: Agrega automáticamente el token de autenticación
3. **Interceptores de response**: Maneja errores globalmente y tokens expirados
4. **Funciones helper**: Para manejo de tokens en AsyncStorage
5. **API de autenticación**: Funciones específicas para las rutas de auth de Laravel

### Uso básico:

```typescript
import axiosClient, { authAPI, setAuthToken } from "./utils/axios";

// Login
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data;

    // Guardar token
    await setAuthToken(token);

    console.log("Login exitoso:", user);
  } catch (error) {
    console.error("Error en login:", error);
  }
};

// Hacer request autenticado
const fetchUserData = async () => {
  try {
    const response = await axiosClient.get("/user");
    console.log("Usuario:", response.data);
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
  }
};
```

### Configuración del backend Laravel

Asegúrate de que tu backend Laravel tenga configurado CORS para permitir requests desde tu app React Native.

En `config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['*'], // En producción, especifica dominios específicos
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => false,
```

## Estructura de respuestas esperadas

El cliente está configurado para trabajar con las respuestas estándar de Laravel Sanctum:

### Login/Register exitoso:

```json
{
  "token": "1|abc123...",
  "user": {
    "id": 1,
    "name": "Usuario",
    "email": "user@example.com"
  }
}
```

### Error:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```
