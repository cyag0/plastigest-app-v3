import Constants from "expo-constants";
import * as Device from "expo-device";
import { useState } from "react";
import { Platform } from "react-native";

// Firebase DESHABILITADO - No se está usando actualmente
// Importación condicional de Firebase
// let messaging: any = null;
// let PermissionsAndroid: any = null;

// try {
//   messaging = require("@react-native-firebase/messaging").default;
//   if (Platform.OS === "android") {
//     PermissionsAndroid = require("react-native").PermissionsAndroid;
//   }
// } catch (error) {
//   console.log(
//     "Firebase no disponible en Expo Go - Push notifications deshabilitadas"
//   );
// }

interface RemoteMessage {
  messageId?: string;
  data?: { [key: string]: string };
  notification?: {
    title?: string;
    body?: string;
  };
}

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<RemoteMessage | undefined>();

  /*   useEffect(() => {
    // Solo ejecutar si Firebase está disponible
    if (!messaging) {
      console.log(
        "Firebase no disponible - Saltando configuración de push notifications"
      );
      return;
    }

    // Solicitar permisos y obtener token
    requestUserPermission().then((token) => {
      if (token) {
        setFcmToken(token);
        //registerTokenInBackend(token);
      }
    });

    // Verificar periódicamente si el token está registrado en el backend
    const checkInterval = setInterval(async () => {
      const currentToken = await messaging()?.getToken();
      if (currentToken) {
        // Intentar registrar nuevamente en caso de que haya fallado antes
        // registerTokenInBackend(currentToken);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    // Listener para notificaciones en primer plano
    const unsubscribeForeground = messaging().onMessage(
      async (remoteMessage: RemoteMessage) => {
        console.log("Notificación recibida en primer plano:", remoteMessage);
        setNotification(remoteMessage);
      }
    );

    // Listener para cuando el usuario toca la notificación (app en background)
    messaging().onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
      console.log("Notificación abrió la app desde background:", remoteMessage);
      handleNotificationAction(remoteMessage);
    });

    // Listener para cuando la app se abre desde una notificación (app cerrada)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: RemoteMessage | null) => {
        if (remoteMessage) {
          console.log("App abierta desde notificación:", remoteMessage);
          handleNotificationAction(remoteMessage);
        }
      });

    // Listener para actualización de token
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(
      (token: string) => {
        console.log("FCM Token actualizado:", token);
        setFcmToken(token);
        //registerTokenInBackend(token);
      }
    );

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
      clearInterval(checkInterval);
    };
  }, []); */

  return {
    fcmToken,
    notification,
  };
}

async function requestUserPermission(): Promise<string | undefined> {
  try {
    // Solo ejecutar si Firebase está disponible
    if (!messaging) {
      return undefined;
    }

    // Solicitar permisos en Android 13+
    if (
      Platform.OS === "android" &&
      Platform.Version >= 33 &&
      PermissionsAndroid
    ) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permisos de notificación denegados");
        return undefined;
      }
    }

    // Solicitar permisos de Firebase Messaging
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("Permisos de notificación denegados");
      return undefined;
    }

    // Obtener FCM token
    const token = await messaging().getToken();
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error al solicitar permisos:", error);
    return undefined;
  }
}

async function registerTokenInBackend(token: string, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 segundos

  try {
    const deviceInfo = {
      token,
      device_type: Platform.OS, // 'ios' | 'android'
      device_name: Device.deviceName || "Unknown",
      app_version: Constants.expoConfig?.version || "1.0.0",
    };

    //await axiosClient.post("/auth/admin/device-tokens/register", deviceInfo);
    console.log("FCM Token registrado en el backend exitosamente");
  } catch (error: any) {
    console.error("Error al registrar token en el backend:", error);

    // Reintentar si no se alcanzó el máximo de reintentos
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Reintentando registro de token (${retryCount + 1}/${MAX_RETRIES})...`
      );

      /* setTimeout(() => {
        registerTokenInBackend(token, retryCount + 1);
      }, RETRY_DELAY * (retryCount + 1)); // Incrementar delay en cada reintento */
    } else {
      console.error(
        `No se pudo registrar el token después de ${MAX_RETRIES} intentos`
      );
    }
  }
}

function handleNotificationAction(remoteMessage: RemoteMessage) {
  // Manejar la acción cuando el usuario toca la notificación
  if (remoteMessage.data) {
    console.log("Datos de la notificación:", remoteMessage.data);

    // Ejemplo: navegar a una pantalla específica según el tipo
    // if (remoteMessage.data.type === 'low_stock') {
    //   navigation.navigate('Products', { id: remoteMessage.data.product_id });
    // }
  }
}
