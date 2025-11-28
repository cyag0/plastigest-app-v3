# 🔥 Configuración de Firebase Cloud Messaging (FCM) - PlastiGest

## 📋 Índice
1. [Crear Proyecto en Firebase](#1-crear-proyecto-en-firebase)
2. [Configurar Android](#2-configurar-android)
3. [Configurar iOS](#3-configurar-ios)
4. [Instalar Dependencias](#4-instalar-dependencias)
5. [Configurar Backend Laravel](#5-configurar-backend-laravel)
6. [Probar Notificaciones](#6-probar-notificaciones)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Crear Proyecto en Firebase

### Paso 1.1: Acceder a Firebase Console
1. Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Click en **"Agregar proyecto"** o **"Add project"**

### Paso 1.2: Crear el Proyecto
1. **Nombre del proyecto:** `PlastiGest` (o el que prefieras)
2. Click en **Continuar**
3. **Google Analytics:** Puedes desactivarlo si no lo necesitas
4. Click en **Crear proyecto**
5. Espera a que se cree (1-2 minutos)
6. Click en **Continuar**

---

## 2. Configurar Android

### Paso 2.1: Agregar App Android a Firebase

1. En Firebase Console, ve a **Configuración del proyecto** (ícono de engranaje ⚙️)
2. En la pestaña **General**, scroll hasta **Tus apps**
3. Click en el ícono de **Android** (robot verde)

### Paso 2.2: Registrar la App

**Datos requeridos:**

```
Nombre del paquete Android: com.alejandrotrejo.plastigest
```

- **Sobrenombre de la app (opcional):** PlastiGest Android
- **Certificado de firma SHA-1 (opcional):** Déjalo en blanco por ahora

Click en **Registrar app**

### Paso 2.3: Descargar google-services.json

1. Click en **Descargar google-services.json**
2. **IMPORTANTE:** Guarda este archivo en la raíz de tu proyecto:

```
/mnt/c/Users/cesar/Desktop/New frontend plastigest/plastigest/google-services.json
```

3. Click en **Siguiente** y luego **Continuar a la consola**

### Paso 2.4: Verificar el Archivo

El archivo `google-services.json` debe verse así:

```json
{
  "project_info": {
    "project_number": "123456789",
    "project_id": "plastigest-xxxxx",
    "storage_bucket": "plastigest-xxxxx.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789:android:xxxxx",
        "android_client_info": {
          "package_name": "com.alejandrotrejo.plastigest"
        }
      },
      "api_key": [
        {
          "current_key": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        }
      ]
    }
  ]
}
```

---

## 3. Configurar iOS

### Paso 3.1: Agregar App iOS a Firebase

1. En Firebase Console, en **Tus apps**, click en el ícono de **iOS** (manzana)

### Paso 3.2: Registrar la App

**Datos requeridos:**

```
ID del paquete de iOS: com.alejandrotrejo.plastigest
```

- **Sobrenombre de la app (opcional):** PlastiGest iOS
- **ID de App Store (opcional):** Déjalo en blanco

Click en **Registrar app**

### Paso 3.3: Descargar GoogleService-Info.plist

1. Click en **Descargar GoogleService-Info.plist**
2. **IMPORTANTE:** Guarda este archivo en la raíz de tu proyecto:

```
/mnt/c/Users/cesar/Desktop/New frontend plastigest/plastigest/GoogleService-Info.plist
```

3. Click en **Siguiente** y luego **Continuar a la consola**

---

## 4. Instalar Dependencias

### Paso 4.1: Instalar Paquetes de Firebase

```bash
cd "/mnt/c/Users/cesar/Desktop/New frontend plastigest/plastigest"

npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Paso 4.2: Desinstalar Expo Notifications (opcional)

```bash
npm uninstall expo-notifications
```

### Paso 4.3: Ejecutar Prebuild

```bash
npx expo prebuild --clean
```

Esto configurará Firebase en Android e iOS automáticamente.

### Paso 4.4: Compilar la App

**Android:**
```bash
npx expo run:android
```

**iOS:**
```bash
npx expo run:ios
```

---

## 5. Configurar Backend Laravel

### Paso 5.1: Obtener Clave del Servidor (Server Key)

1. En Firebase Console, ve a **Configuración del proyecto** ⚙️
2. Pestaña **Cloud Messaging**
3. En **Cloud Messaging API (Legacy)**, click en **⋮ > Gestionar API en Google Cloud Console**
4. **Habilita** la API si está deshabilitada
5. Vuelve a Firebase Console, copia el **Server Key**

```
Server Key: AAAA...XXXX (largo, guárdalo seguro)
```

### Paso 5.2: Agregar al .env de Laravel

Edita `/home/cyag/plastigest/back/plastigest-back/.env`:

```env
FCM_SERVER_KEY=AAAA...XXXX
```

### Paso 5.3: Instalar Paquete FCM en Laravel

```bash
cd /home/cyag/plastigest/back/plastigest-back
composer require kreait/laravel-firebase
```

### Paso 5.4: Publicar Configuración

```bash
php artisan vendor:publish --provider="Kreait\Laravel\Firebase\ServiceProvider" --tag=config
```

### Paso 5.5: Descargar Service Account Key

1. En Firebase Console, **Configuración del proyecto** ⚙️
2. Pestaña **Cuentas de servicio**
3. Click en **Generar nueva clave privada**
4. Descarga el archivo JSON
5. Guárdalo en:

```
/home/cyag/plastigest/back/plastigest-back/storage/app/firebase/service-account.json
```

### Paso 5.6: Configurar firebase.php

Edita `config/firebase.php`:

```php
return [
    'credentials' => [
        'file' => storage_path('app/firebase/service-account.json'),
    ],
];
```

### Paso 5.7: Crear Servicio de Notificaciones

Crea `app/Services/PushNotificationService.php`:

```php
<?php

namespace App\Services;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class PushNotificationService
{
    protected $messaging;

    public function __construct()
    {
        $firebase = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
        $this->messaging = $firebase->createMessaging();
    }

    /**
     * Enviar notificación a un dispositivo
     */
    public function sendToDevice(string $fcmToken, string $title, string $body, array $data = [])
    {
        $message = CloudMessage::withTarget('token', $fcmToken)
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        try {
            $this->messaging->send($message);
            return true;
        } catch (\Exception $e) {
            \Log::error('Error enviando notificación FCM: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Enviar notificación a múltiples dispositivos
     */
    public function sendToMultipleDevices(array $fcmTokens, string $title, string $body, array $data = [])
    {
        $message = CloudMessage::new()
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        try {
            $this->messaging->sendMulticast($message, $fcmTokens);
            return true;
        } catch (\Exception $e) {
            \Log::error('Error enviando notificaciones FCM: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Enviar notificación a un topic
     */
    public function sendToTopic(string $topic, string $title, string $body, array $data = [])
    {
        $message = CloudMessage::withTarget('topic', $topic)
            ->withNotification(Notification::create($title, $body))
            ->withData($data);

        try {
            $this->messaging->send($message);
            return true;
        } catch (\Exception $e) {
            \Log::error('Error enviando notificación a topic: ' . $e->getMessage());
            return false;
        }
    }
}
```

### Paso 5.8: Ejemplo de Uso

```php
// En cualquier controlador
use App\Services\PushNotificationService;
use App\Models\DeviceToken;

$notificationService = new PushNotificationService();

// Enviar a un usuario específico
$user = auth()->user();
$tokens = DeviceToken::forUser($user->id)->active()->pluck('token')->toArray();

$notificationService->sendToMultipleDevices(
    $tokens,
    '⚠️ Stock Bajo',
    'El producto "Bolsa Plástica" tiene stock bajo (5 unidades)',
    [
        'type' => 'low_stock',
        'product_id' => '123',
        'screen' => 'ProductDetail'
    ]
);
```

---

## 6. Probar Notificaciones

### Opción 1: Desde Firebase Console (Más Fácil)

1. En Firebase Console, ve a **Cloud Messaging**
2. Click en **Enviar tu primer mensaje**
3. **Título:** "Prueba PlastiGest"
4. **Texto:** "Esta es una notificación de prueba"
5. Click en **Enviar mensaje de prueba**
6. Pega tu **FCM Token** (lo ves en los logs de la app)
7. Click en **Probar**

### Opción 2: Desde Postman/cURL

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=TU_SERVER_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN_DEL_DISPOSITIVO",
    "notification": {
      "title": "Prueba PlastiGest",
      "body": "Stock bajo en producto X"
    },
    "data": {
      "product_id": "123",
      "type": "low_stock"
    }
  }'
```

### Opción 3: Desde Laravel (Recomendado)

Crea una ruta de prueba en `routes/api.php`:

```php
Route::post('test-notification', function(Request $request) {
    $service = new \App\Services\PushNotificationService();
    
    $service->sendToDevice(
        $request->fcm_token,
        '🔥 Prueba Firebase',
        'Notificación enviada desde Laravel',
        ['test' => true]
    );
    
    return response()->json(['message' => 'Notificación enviada']);
});
```

**Llamar desde Postman:**

```
POST http://localhost/api/test-notification
Body: { "fcm_token": "TU_FCM_TOKEN" }
```

---

## 7. Troubleshooting

### Error: "google-services.json not found"

**Solución:**
- Verifica que el archivo esté en la raíz del proyecto
- Ejecuta `npx expo prebuild --clean`

### Error: "Firebase is not initialized"

**Solución:**
- Verifica que `google-services.json` tenga el `package_name` correcto
- Limpia build: `cd android && ./gradlew clean`

### No recibo notificaciones en Android

**Solución:**
- Verifica permisos: Settings > Apps > PlastiGest > Notifications (Enabled)
- Revisa logs: `adb logcat | grep FCM`

### No recibo notificaciones en iOS

**Solución:**
- Verifica que descargaste `GoogleService-Info.plist`
- Configura APNs en Firebase Console
- Habilita Push Notifications en Xcode

### Token no se registra en backend

**Solución:**
- Verifica que la ruta `/auth/admin/device-tokens/register` existe
- Revisa logs de red en la app
- Verifica que el usuario esté autenticado

---

## ✅ Checklist de Configuración

### Frontend
- [x] `@react-native-firebase/app` instalado
- [x] `@react-native-firebase/messaging` instalado
- [x] `google-services.json` en raíz (Android)
- [x] `GoogleService-Info.plist` en raíz (iOS)
- [x] `app.json` configurado con plugins de Firebase
- [x] `usePushNotifications` hook actualizado
- [ ] `npx expo prebuild --clean` ejecutado
- [ ] App compilada y corriendo

### Backend
- [ ] `kreait/laravel-firebase` instalado
- [ ] Service Account JSON descargado
- [ ] `config/firebase.php` configurado
- [ ] `PushNotificationService` creado
- [ ] Endpoint de prueba funcionando

### Firebase Console
- [ ] Proyecto creado
- [ ] App Android registrada
- [ ] App iOS registrada
- [ ] Cloud Messaging API habilitada

---

## 📚 Recursos Adicionales

- [Firebase Console](https://console.firebase.google.com/)
- [React Native Firebase Docs](https://rnfirebase.io/)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Laravel Firebase Package](https://github.com/kreait/laravel-firebase)

---

**Última actualización:** 27 de noviembre de 2025
