import axiosClient from "@/utils/axios";
import {
  notificationOpenedBus,
  type NotificationOpenedPayload,
} from "@/utils/notificationEvents";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import type { FirebaseOptions } from "firebase/app";
import type { MessagePayload } from "firebase/messaging";

type NativeMessaging = typeof import("@react-native-firebase/messaging").default;
type PushNotification = FirebaseMessagingTypes.RemoteMessage | MessagePayload;

type WebPermission = NotificationPermission | "unsupported";

interface UsePushNotificationsOptions {
  enabled?: boolean;
  // Se llama cada vez que llega un push en foreground (ya con notificación
  // visible). Útil para incrementar el contador de no leídas en el badge.
  onForegroundMessage?: (message: PushNotification) => void;
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
      // Permitimos que expo-notifications actualice el badge del sistema;
      // el valor real lo controlamos desde AuthContext con setBadgeCountAsync.
      shouldSetBadge: true,
    }),
  });
}

export function usePushNotifications({
  enabled = true,
  onForegroundMessage,
}: UsePushNotificationsOptions = {}) {
  const [fcmToken, setFcmToken] = useState<string>();
  const [notification, setNotification] = useState<PushNotification>();
  // Estado del permiso de notificaciones. En web partimos de "default" y la
  // UI lo actualizara cuando el usuario haga click en "Activar". En native
  // mantenemos "default" (el sistema operativo maneja su propio dialog).
  const [permissionStatus, setPermissionStatus] = useState<WebPermission>("default");

  // Mantemos el callback en un ref para que setupNative... no se vuelva a
  // ejecutar cada vez que el padre pasa una función nueva (mala práctica que
  // duplicaría listeners de onMessage).
  const onForegroundMessageRef = useRef(onForegroundMessage);
  useEffect(() => {
    onForegroundMessageRef.current = onForegroundMessage;
  }, [onForegroundMessage]);

  // Lee el estado actual del permiso (solo web). En native no usamos este
  // estado; RNFirebase resuelve internamente.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionStatus("unsupported");
      return;
    }
    setPermissionStatus(Notification.permission);
  }, []);

  // Si el permiso YA esta concedido al cargar (sesion previa donde el usuario
  // ya acepto), corremos el setup automaticamente. Si esta en "default" o
  // "denied", esperamos a que la UI llame a requestPermission().
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const runSetup = async () => {
      if (Platform.OS === "web" && permissionStatus !== "granted") {
        // En web solo auto-corremos setup si ya tenemos permiso. Si no, la
        // UI mostrara un banner con el boton que dispara requestPermission().
        return;
      }

      const setupResult =
        Platform.OS === "web"
          ? await setupWebPushNotifications(setNotification)
          : await setupNativePushNotifications(
              setNotification,
              setFcmToken,
              (message) => onForegroundMessageRef.current?.(message),
            );

      if (!isMounted) {
        setupResult?.cleanup?.();
        return;
      }

      cleanup = setupResult?.cleanup;

      if (setupResult?.token) {
        setFcmToken(setupResult.token);
      }
    };

    runSetup().catch((error) => {
      console.error("Error configurando Firebase push notifications:", error);
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [enabled, permissionStatus]);

  // Pide permiso al usuario y, si lo concede, dispara el setup. ESTA funcion
  // debe llamarse desde un user gesture (onClick, onPress) porque los
  // navegadores modernos ignoran Notification.requestPermission() fuera de
  // uno. Por eso la UI muestra un boton/banner en vez de pedirlo en un useEffect.
  const requestPermission = useCallback(async (): Promise<WebPermission> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
      }
      const result = await Notification.requestPermission();
      console.log("[web-push] Permiso resultado:", result);
      setPermissionStatus(result);
      // No llamamos a setup aca: el useEffect anterior esta observando
      // permissionStatus, asi que al cambiar a "granted" correra el setup
      // automaticamente.
      return result;
    }

    // En native (Android/iOS) el setupNative ya invoca
    // messaging.requestPermission() internamente, asi que solo forzamos un
    // re-run del effect cambiando permissionStatus. En la practica, en native
    // rara vez se necesita este callback porque el sistema operativo
    // dispara su propio dialog la primera vez que se llama getToken().
    setPermissionStatus("granted");
    return "granted";
  }, []);

  // Desactiva el token actual en el backend. Se invoca desde el logout para
  // no seguir recibiendo pushes de la cuenta anterior.
  const deactivateToken = useCallback(async () => {
    if (!fcmToken) return;
    try {
      await axiosClient.post("/auth/admin/device-tokens/deactivate", {
        token: fcmToken,
      });
    } catch (error) {
      console.warn("No se pudo desactivar el token FCM en el backend:", error);
    }
  }, [fcmToken]);

  return {
    fcmToken,
    notification,
    deactivateToken,
    permissionStatus,
    requestPermission,
  };
}

async function setupNativePushNotifications(
  setNotification: (notification: PushNotification) => void,
  setFcmToken: (token: string) => void,
  onForegroundMessage?: (message: PushNotification) => void,
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
      onForegroundMessage?.(remoteMessage);
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

  // El hook se encarga de NO llamarnos si el permiso no esta "granted",
  // pero validamos otra vez por seguridad.
  if (Notification.permission !== "granted") {
    console.log(
      "[web-push] Permiso aun no concedido, saltando setup. La UI debe llamar a requestPermission().",
    );
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

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

  // Registramos el SW sin query string: el navegador se lo strip-ea al SW
  // y la config no llegaria. En su lugar, despues de registrar le mandamos
  // la config por postMessage y esperamos el ack.
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/" },
  );

  console.log("[web-push] SW registrado, mandando config...");
  await sendConfigToServiceWorker(serviceWorkerRegistration, firebaseConfig);

  const messaging = messagingModule.getMessaging(app);
  console.log("[web-push] Pidiendo token FCM...");
  const token = await messagingModule.getToken(messaging, {
    vapidKey: WEB_VAPID_KEY,
    serviceWorkerRegistration,
  });

  if (!token) {
    console.warn(
      "Firebase Web Messaging no devolvio token FCM. Revisa que el SW este activo y la VAPID key sea correcta.",
    );
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

  // El service worker entrega pushes en background; al hacer click
  // notifica a la pestaña via postMessage y desde aqui reemitimos al bus
  // para que NavigationHandler haga el deep-link.
  const onSwMessage = (event: MessageEvent) => {
    if (event.data?.type !== "PUSH_NOTIFICATION_OPENED") return;
    const data = event.data.data as Record<string, string> | undefined;
    if (!data) return;
    const payload: NotificationOpenedPayload = {
      eventType: data.event_type,
      entityId:
        data.task_id ??
        data.purchase_id ??
        data.product_id ??
        data.inventory_count_id,
      rawData: data,
    };
    console.log("SW notifico push abierto:", payload);
    notificationOpenedBus.emit(payload);
  };
  navigator.serviceWorker.addEventListener("message", onSwMessage);

  return {
    token,
    cleanup: () => {
      unsubscribeForeground();
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    },
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

// Envia la config de Firebase al service worker por postMessage y espera el
// ack. Es necesario porque el navegador strip-ea el query string al instalar
// un SW, asi que no podemos pasarle la config por la URL de registro.
async function sendConfigToServiceWorker(
  registration: ServiceWorkerRegistration,
  config: FirebaseOptions,
): Promise<void> {
  // Si el SW ya esta activo, lo usamos directo. Si no (primera vez que se
  // registra en esta sesion), esperamos a navigator.serviceWorker.ready que
  // resuelve con un ServiceWorker ya activado para el scope.
  let worker: ServiceWorker | null = registration.active;

  if (!worker) {
    try {
      // navigator.serviceWorker.ready resuelve con un ServiceWorker (no la
      // registration). Lo usamos para postMessage directamente.
      const readyWorker = await navigator.serviceWorker.ready;
      worker = readyWorker;
    } catch {
      worker = null;
    }
  }

  if (!worker) {
    throw new Error("Service worker no esta activo, no se puede enviar config");
  }

  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      console.warn(
        "[web-push] Timeout esperando confirmacion del SW; continuando de todas formas",
      );
      resolve();
    }, 5000);

    channel.port1.onmessage = (event) => {
      if (event.data?.type === "FIREBASE_CONFIG_RECEIVED") {
        clearTimeout(timeout);
        if (event.data.initialized) {
          console.log("[web-push] SW confirmo config e inicializo Firebase");
        } else {
          console.warn(
            "[web-push] SW recibio config pero NO se inicializo (revisar consola del SW)",
          );
        }
        resolve();
      }
    };

    worker.postMessage({ type: "FIREBASE_CONFIG", config }, [channel.port2]);
  });
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
  const data = extractPushData(remoteMessage);

  if (!data) {
    console.log("Notificacion sin data payload, ignorando deep-link");
    return;
  }

  const payload: NotificationOpenedPayload = {
    eventType: data.event_type,
    entityId: pickEntityId(data),
    rawData: data,
  };

  console.log("Emitiendo evento notificationOpened:", payload);
  notificationOpenedBus.emit(payload);
}

// Normaliza el shape heterogeneo entre plataformas (RemoteMessage vs
// MessagePayload web) y los tipos (string|string[]|undefined) que FCM entrega.
function extractPushData(
  message: PushNotification,
): Record<string, string> | undefined {
  const raw = "data" in message ? message.data : undefined;
  if (!raw) return undefined;

  const out: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value == null) return;
    out[key] = Array.isArray(value) ? String(value[0] ?? "") : String(value);
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

function pickEntityId(data: Record<string, string>): string | undefined {
  // Orden de preferencia segun los templates del backend
  return (
    data.task_id ??
    data.purchase_id ??
    data.product_id ??
    data.inventory_count_id
  );
}
