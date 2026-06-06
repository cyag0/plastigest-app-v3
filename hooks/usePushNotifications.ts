import axiosClient from "@/utils/axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import type { FirebaseOptions } from "firebase/app";
import type { MessagePayload } from "firebase/messaging";

type NativeMessaging = typeof import("@react-native-firebase/messaging").default;
type PushNotification = FirebaseMessagingTypes.RemoteMessage | MessagePayload;

interface UsePushNotificationsOptions {
  enabled?: boolean;
}

interface PushSetupResult {
  token?: string;
  cleanup?: () => void;
}

const WEB_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function usePushNotifications({
  enabled = true,
}: UsePushNotificationsOptions = {}) {
  const [fcmToken, setFcmToken] = useState<string>();
  const [notification, setNotification] = useState<PushNotification>();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const configurePushNotifications = async () => {
      const setupResult =
        Platform.OS === "web"
          ? await setupWebPushNotifications(setNotification)
          : await setupNativePushNotifications(setNotification, setFcmToken);

      if (!isMounted) {
        setupResult?.cleanup?.();
        return;
      }

      cleanup = setupResult?.cleanup;

      if (setupResult?.token) {
        setFcmToken(setupResult.token);
      }
    };

    configurePushNotifications().catch((error) => {
      console.error("Error configurando Firebase push notifications:", error);
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [enabled]);

  return {
    fcmToken,
    notification,
  };
}

async function setupNativePushNotifications(
  setNotification: (notification: PushNotification) => void,
  setFcmToken: (token: string) => void,
): Promise<PushSetupResult | undefined> {
  let messaging: NativeMessaging;

  try {
    // RNFirebase no tiene runtime web; cargarlo solo en native evita romper el bundle web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    messaging = require("@react-native-firebase/messaging").default;
  } catch {
    console.warn(
      "Firebase Messaging nativo no esta disponible. Usa un development build, no Expo Go.",
    );
    return undefined;
  }

  const hasPermission = await requestNativePermission(messaging);

  if (!hasPermission) {
    return undefined;
  }

  const messagingInstance = messaging();

  if (
    Platform.OS === "ios" &&
    !messagingInstance.isDeviceRegisteredForRemoteMessages
  ) {
    await messagingInstance.registerDeviceForRemoteMessages();
  }

  const token = await messagingInstance.getToken();

  if (token) {
    await registerTokenInBackend(token);
    console.log("FCM token nativo registrado:", token);
  }

  const unsubscribeForeground = messagingInstance.onMessage(
    async (remoteMessage) => {
      console.log("Notificacion FCM en primer plano:", remoteMessage);
      setNotification(remoteMessage);
      await showNativeForegroundNotification(remoteMessage);
    },
  );

  const unsubscribeOpened = messagingInstance.onNotificationOpenedApp(
    (remoteMessage) => {
      console.log("Notificacion abrio la app desde background:", remoteMessage);
      handleNotificationAction(remoteMessage);
    },
  );

  messagingInstance.getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      console.log("App abierta desde notificacion FCM:", remoteMessage);
      handleNotificationAction(remoteMessage);
    }
  });

  const unsubscribeTokenRefresh = messagingInstance.onTokenRefresh(
    async (nextToken) => {
      setFcmToken(nextToken);
      await registerTokenInBackend(nextToken);
      console.log("FCM token actualizado:", nextToken);
    },
  );

  return {
    token,
    cleanup: () => {
      unsubscribeForeground();
      unsubscribeOpened();
      unsubscribeTokenRefresh();
    },
  };
}

async function setupWebPushNotifications(
  setNotification: (notification: PushNotification) => void,
): Promise<PushSetupResult | undefined> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return undefined;
  }

  if (!window.isSecureContext) {
    console.warn("Firebase Web Push requiere HTTPS o localhost.");
    return undefined;
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("Este navegador no soporta Web Push Notifications.");
    return undefined;
  }

  const firebaseConfig = getWebFirebaseConfig();
  const missingConfig = getMissingWebConfigKeys(firebaseConfig);

  if (missingConfig.length > 0 || !WEB_VAPID_KEY) {
    console.warn(
      "Faltan variables EXPO_PUBLIC_FIREBASE_* para activar Firebase Web Push:",
      [...missingConfig, !WEB_VAPID_KEY ? "vapidKey" : undefined].filter(
        Boolean,
      ),
    );
    return undefined;
  }

  const [{ getApps, initializeApp }, messagingModule] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);

  const isMessagingSupported = await messagingModule.isSupported();

  if (!isMessagingSupported) {
    console.warn("Firebase Messaging no esta soportado en este navegador.");
    return undefined;
  }

  const permission = await getWebNotificationPermission();

  if (permission !== "granted") {
    console.log("Permisos de notificacion web denegados.");
    return undefined;
  }

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${getServiceWorkerConfigQuery(firebaseConfig)}`,
    { scope: "/" },
  );
  const messaging = messagingModule.getMessaging(app);
  const token = await messagingModule.getToken(messaging, {
    vapidKey: WEB_VAPID_KEY,
    serviceWorkerRegistration,
  });

  if (!token) {
    console.warn("Firebase Web Messaging no devolvio token FCM.");
    return undefined;
  }

  await registerTokenInBackend(token);
  console.log("FCM token web registrado:", token);

  const unsubscribeForeground = messagingModule.onMessage(
    messaging,
    (payload) => {
      console.log("Notificacion FCM web en primer plano:", payload);
      setNotification(payload);
      showWebForegroundNotification(payload);
    },
  );

  return {
    token,
    cleanup: unsubscribeForeground,
  };
}

async function requestNativePermission(messaging: NativeMessaging) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    if (Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permisos de notificacion Android denegados.");
        return false;
      }
    }

    return true;
  }

  const authStatus = await messaging().requestPermission();

  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

async function getWebNotificationPermission() {
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

function getWebFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function getMissingWebConfigKeys(config: FirebaseOptions) {
  const requiredKeys: (keyof FirebaseOptions)[] = [
    "apiKey",
    "projectId",
    "messagingSenderId",
    "appId",
  ];

  return requiredKeys.filter((key) => !config[key]);
}

function getServiceWorkerConfigQuery(config: FirebaseOptions) {
  const params = new URLSearchParams();

  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

async function registerTokenInBackend(token: string) {
  try {
    await axiosClient.post(
      "/auth/admin/device-tokens/register",
      {
        token,
        device_type: getBackendDeviceType(),
        device_name: getDeviceName(),
        app_version: Constants.expoConfig?.version || "1.0.0",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error al registrar token FCM en el backend:", error);
  }
}

function getBackendDeviceType() {
  if (Platform.OS === "web") {
    return "web";
  }

  return Platform.OS === "ios" ? "ios" : "android";
}

function getDeviceName() {
  const deviceName =
    Platform.OS === "web"
      ? navigator.userAgent
      : Device.deviceName || Device.modelName || "Unknown";

  return deviceName.slice(0, 255);
}

async function showNativeForegroundNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) {
  const title = remoteMessage.notification?.title;
  const body = remoteMessage.notification?.body;

  if (!title && !body) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || "PlastiGest",
      body,
      data: remoteMessage.data || {},
    },
    trigger: null,
  });
}

function showWebForegroundNotification(payload: MessagePayload) {
  if (Notification.permission !== "granted") {
    return;
  }

  new Notification(payload.notification?.title || "PlastiGest", {
    body: payload.notification?.body,
    data: payload.data,
  });
}

function handleNotificationAction(remoteMessage: PushNotification) {
  if (remoteMessage.data) {
    console.log("Datos de la notificacion:", remoteMessage.data);
  }
}
