import axios from "@/utils/axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (token) {
        // Registrar el token en el backend
        registerTokenInBackend(token);
      }
    });

    // Listener para notificaciones recibidas
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    // Listener para cuando el usuario toca la notificación
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notificación tocada:", response);
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("No se obtuvieron permisos para notificaciones push");
      return;
    }

    // Obtener el token de Expo Push
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;

    console.log("Token de notificación:", token);
  } else {
    console.log("Debe usar un dispositivo físico para notificaciones push");
  }

  return token;
}

async function registerTokenInBackend(token: string) {
  try {
    const deviceInfo = {
      token,
      device_type: Platform.OS, // 'ios' | 'android' | 'web'
      device_name: Device.deviceName || "Unknown",
      app_version: Constants.expoConfig?.version || "1.0.0",
    };

    await axios.post("/device-tokens/register", deviceInfo);
    console.log("Token registrado en el backend");
  } catch (error) {
    console.error("Error al registrar token en el backend:", error);
  }
}

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
