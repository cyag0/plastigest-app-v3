import axiosClient from "@/utils/axios";
import messaging from "@react-native-firebase/messaging";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

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

  useEffect(() => {
    // Solicitar permisos y obtener token
    requestUserPermission().then((token) => {
      if (token) {
        setFcmToken(token);
        registerTokenInBackend(token);
      }
    });

    // Listener para notificaciones en primer plano
    const unsubscribeForeground = messaging().onMessage(
      async (remoteMessage) => {
        console.log("Notificación recibida en primer plano:", remoteMessage);
        setNotification(remoteMessage);
      }
    );

    // Listener para cuando el usuario toca la notificación (app en background)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("Notificación abrió la app desde background:", remoteMessage);
      handleNotificationAction(remoteMessage);
    });

    // Listener para cuando la app se abre desde una notificación (app cerrada)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log("App abierta desde notificación:", remoteMessage);
          handleNotificationAction(remoteMessage);
        }
      });

    // Listener para actualización de token
    const unsubscribeTokenRefresh = messaging().onTokenRefresh((token) => {
      console.log("FCM Token actualizado:", token);
      setFcmToken(token);
      registerTokenInBackend(token);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  }, []);

  return {
    fcmToken,
    notification,
  };
}

async function requestUserPermission(): Promise<string | undefined> {
  try {
    // Solicitar permisos en Android 13+
    if (Platform.OS === "android" && Platform.Version >= 33) {
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

async function registerTokenInBackend(token: string) {
  try {
    const deviceInfo = {
      token,
      device_type: Platform.OS, // 'ios' | 'android'
      device_name: Device.deviceName || "Unknown",
      app_version: Constants.expoConfig?.version || "1.0.0",
    };

    await axiosClient.post("/auth/admin/device-tokens/register", deviceInfo);
    console.log("FCM Token registrado en el backend");
  } catch (error) {
    console.error("Error al registrar token en el backend:", error);
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
