import { getNotificationEntityId } from "@/components/Notifications/notificationLinks";
import { APP_VERSION, notifyChunkLoadError } from "@/utils/appVersion";
import axiosClient, { describeError } from "@/utils/axios";
import { reportClientError } from "@/utils/errorReporting";
import {
  notificationOpenedBus,
  type NotificationOpenedPayload,
} from "@/utils/notificationEvents";
import { isChunkLoadError } from "@/utils/versionCheck";
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
  // Se llama cada vez que llega un push con la app abierta (nativo y web,
  // ya con la notificación visible). AuthContext refresca ahí el contador
  // de no leídas de la campana.
  onForegroundMessage?: (message: PushNotification) => void;
}

interface PushSetupResult {
  token?: string;
  cleanup?: () => void;
}

// Resultado del setup web: "unavailable" no se arregla reintentando (faltan
// claves de Firebase en el build, navegador sin soporte, sin HTTPS);
// "failed" sí (falló el token o el registro en el backend).
type WebPushSetup =
  | { status: "registered"; token: string; cleanup: () => void }
  | { status: "unavailable"; reason: string }
  | { status: "failed"; reason: string };

type WebPushState = "idle" | "registered" | "failed" | "unavailable";

const WEB_VAPID_KEY = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

// Marca en `data` de las notificaciones locales que se muestran cuando llega
// un push con la app abierta (ver addNotificationResponseReceivedListener).
const FOREGROUND_NOTIFICATION_MARKER = "__plastigest_foreground";

// getInitialNotification() puede devolver el mismo push en cada setup (p. ej.
// al cerrar sesión y volver a entrar sin cerrar la app): solo se atiende una
// vez por arranque.
let initialNotificationHandled = false;

// Trazas del flujo de push solo en desarrollo: en producción no se imprimen
// tokens FCM ni el contenido de los mensajes.
const debugLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

// Permiso actual del navegador (en el teléfono no se usa: "default").
function readWebPermission(): WebPermission {
  if (Platform.OS !== "web") return "default";
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

// Un build web sin las claves de Firebase deja el push apagado para todos: se
// reporta al servidor (utils/errorReporting) como mucho una vez al día por
// navegador, para que se note sin llenar el log.
const PUSH_CONFIG_REPORT_KEY = "web_push_config_reported_at";
function reportMissingWebPushConfig(missing: string[]) {
  try {
    const last = Number(globalThis.localStorage?.getItem(PUSH_CONFIG_REPORT_KEY) ?? 0);
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    globalThis.localStorage?.setItem(PUSH_CONFIG_REPORT_KEY, String(Date.now()));
  } catch {
    // sin almacenamiento: se reporta (el reporte también deduplica)
  }
  reportClientError(
    new Error(`Notificaciones push web sin configurar: faltan ${missing.join(", ")}`),
    { source: "web-push" },
  );
}

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
  // Permiso del navegador (web). En native mantenemos "default": el sistema
  // operativo maneja su propio dialog.
  const [permissionStatus, setPermissionStatus] = useState<WebPermission>(readWebPermission);
  // Si el token web quedó registrado en el backend (ver exposedPermission).
  const [webPushState, setWebPushState] = useState<WebPushState>("idle");

  // Mantemos el callback en un ref para que setupNative... no se vuelva a
  // ejecutar cada vez que el padre pasa una función nueva (mala práctica que
  // duplicaría listeners de onMessage).
  const onForegroundMessageRef = useRef(onForegroundMessage);
  useEffect(() => {
    onForegroundMessageRef.current = onForegroundMessage;
  }, [onForegroundMessage]);

  // Refs del setup web. Evitan suscribir listeners (onMessage / service worker)
  // o pedir el token dos veces cuando el effect y requestPermission intentan
  // correr el setup al mismo tiempo. Guardamos el cleanup para liberar los
  // listeners en logout / cuando el hook se deshabilita.
  const webCleanupRef = useRef<(() => void) | null>(null);
  const webSetupStartedRef = useRef(false);

  // Corre el setup web (registra el SW, pide el token FCM y lo manda al
  // backend) UNA sola vez. Lo invocan tanto el effect (cuando el permiso ya
  // estaba concedido al cargar) como requestPermission (justo despues de que
  // el usuario concede el permiso desde el banner).
  const ensureWebPush = useCallback(async () => {
    if (Platform.OS !== "web") return;
    if (webSetupStartedRef.current) return;
    webSetupStartedRef.current = true;
    try {
      const result = await setupWebPushNotifications(setNotification, (message) =>
        onForegroundMessageRef.current?.(message),
      );
      if (result.status === "registered") {
        webCleanupRef.current = result.cleanup;
        setFcmToken(result.token);
        setWebPushState("registered");
        return;
      }
      // No quedó registrado: no se dice que el push está activo.
      console.warn(`Notificaciones push web no activadas: ${result.reason}`);
      setWebPushState(result.status);
      // Lo que se puede arreglar reintentando libera el guard (otro intento al
      // volver a "Activar" o en el siguiente inicio de sesión).
      if (result.status === "failed") webSetupStartedRef.current = false;
    } catch (error) {
      webSetupStartedRef.current = false;
      setWebPushState("failed");
      // Firebase se carga aparte: con un despliegue nuevo ese archivo ya no
      // existe y hay que recargar.
      if (isChunkLoadError(error)) notifyChunkLoadError();
      throw error;
    }
  }, []);

  // Si el permiso YA esta concedido al cargar (sesion previa donde el usuario
  // ya acepto), corremos el setup automaticamente. Si esta en "default" o
  // "denied", esperamos a que la UI llame a requestPermission().
  useEffect(() => {
    if (!enabled) {
      // Logout o sesion expirada: liberamos los listeners web y reseteamos el
      // guard para que el proximo usuario que inicie sesion vuelva a registrar
      // su propio token FCM.
      if (Platform.OS === "web") {
        webCleanupRef.current?.();
        webCleanupRef.current = null;
        webSetupStartedRef.current = false;
      }
      return;
    }

    // WEB: solo auto-corremos el setup si el permiso ya estaba concedido al
    // cargar (sesion previa). Si esta en "default"/"denied", la UI muestra el
    // banner y al conceder, requestPermission() llama a ensureWebPush().
    if (Platform.OS === "web") {
      if (permissionStatus === "granted" && webPushState !== "unavailable") {
        ensureWebPush().catch((error) => {
          console.error("Error configurando Firebase web push:", describeError(error));
        });
      }
      // Los listeners web persisten entre renders (se liberan en logout); no
      // retornamos cleanup aqui para no re-suscribirlos en cada cambio de deps.
      return;
    }

    // NATIVE (iOS/Android): RNFirebase maneja su propio dialog de permiso al
    // llamar getToken, asi que corremos el setup directamente.
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const runSetup = async () => {
      const setupResult = await setupNativePushNotifications(
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
      console.error("Error configurando Firebase push notifications:", describeError(error));
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
    // webPushState solo evita reintentos inútiles; no debe volver a correr el setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, permissionStatus, ensureWebPush]);

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
      debugLog("[web-push] Permiso resultado:", result);
      setPermissionStatus(result);

      if (result === "granted") {
        // Registramos el token FCM de inmediato, dentro del mismo user-gesture,
        // en vez de depender solo de que el effect se vuelva a disparar al
        // cambiar permissionStatus. El guard en ensureWebPush evita un registro
        // doble si el effect tambien llega a correr.
        try {
          await ensureWebPush();
        } catch (error) {
          console.error(
            "Error registrando el token FCM web tras conceder el permiso:",
            describeError(error),
          );
        }
      }

      return result;
    }

    // En native (Android/iOS) el setupNative ya invoca
    // messaging.requestPermission() internamente, asi que solo forzamos un
    // re-run del effect cambiando permissionStatus. En la practica, en native
    // rara vez se necesita este callback porque el sistema operativo
    // dispara su propio dialog la primera vez que se llama getToken().
    setPermissionStatus("granted");
    return "granted";
  }, [ensureWebPush]);

  // Desactiva el token actual en el backend. Se invoca desde el logout para
  // no seguir recibiendo pushes de la cuenta anterior.
  const deactivateToken = useCallback(async () => {
    if (!fcmToken) return;
    try {
      await axiosClient.post("/auth/admin/device-tokens/deactivate", {
        token: fcmToken,
      });
    } catch (error) {
      console.warn("No se pudo desactivar el token FCM en el backend:", describeError(error));
    }
  }, [fcmToken]);

  // Lo que ve la UI (banner de notificaciones): "granted" sólo si el push
  // puede funcionar. Con el permiso del navegador concedido pero sin token
  // registrado no se dice que está activo: si no se puede en este build o
  // navegador, "unsupported" (sin banner; el aviso queda en consola y en el
  // reporte); si falló el registro, "default", y "Activar" lo reintenta.
  // Mientras se registra por primera vez se mantiene "granted" para no
  // parpadear el banner en cada carga.
  const exposedPermission: WebPermission =
    Platform.OS === "web" && permissionStatus === "granted"
      ? webPushState === "unavailable"
        ? "unsupported"
        : webPushState === "failed"
          ? "default"
          : "granted"
      : permissionStatus;

  return {
    fcmToken,
    notification,
    deactivateToken,
    permissionStatus: exposedPermission,
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
      "Firebase Messaging nativo no está disponible. Usa un development build, no Expo Go.",
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

  if (token && (await registerTokenInBackend(token))) {
    debugLog("FCM token nativo registrado");
  }

  const unsubscribeForeground = messagingInstance.onMessage(
    async (remoteMessage) => {
      debugLog("Notificación FCM en primer plano:", remoteMessage.messageId);
      setNotification(remoteMessage);
      onForegroundMessage?.(remoteMessage);
      await showNativeForegroundNotification(remoteMessage);
    },
  );

  const unsubscribeOpened = messagingInstance.onNotificationOpenedApp(
    (remoteMessage) => {
      debugLog("Notificación abrio la app desde background:", remoteMessage.messageId);
      handleNotificationAction(remoteMessage);
    },
  );

  messagingInstance.getInitialNotification().then((remoteMessage) => {
    if (remoteMessage && !initialNotificationHandled) {
      initialNotificationHandled = true;
      debugLog("App abierta desde notificación FCM:", remoteMessage.messageId);
      handleNotificationAction(remoteMessage);
    }
  });

  // Los pushes que llegan con la app abierta se muestran como notificación
  // local de expo-notifications (showNativeForegroundNotification). Tocar esa
  // notificación no pasa por RNFirebase, así que sin este listener no llevaba
  // a ningún lado. Solo se atienden las marcadas como locales para no navegar
  // dos veces con las que sí maneja onNotificationOpenedApp.
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (!data || data[FOREGROUND_NOTIFICATION_MARKER] !== "1") return;

      const normalized: Record<string, string> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value == null || key === FOREGROUND_NOTIFICATION_MARKER) return;
        normalized[key] = String(value);
      });

      notificationOpenedBus.emit({
        eventType: normalized.event_type,
        entityId: pickEntityId(normalized),
        rawData: normalized,
      });
    });

  const unsubscribeTokenRefresh = messagingInstance.onTokenRefresh(
    async (nextToken) => {
      setFcmToken(nextToken);
      await registerTokenInBackend(nextToken);
      debugLog("FCM token actualizado");
    },
  );

  return {
    token,
    cleanup: () => {
      unsubscribeForeground();
      unsubscribeOpened();
      responseSubscription.remove();
      unsubscribeTokenRefresh();
    },
  };
}

async function setupWebPushNotifications(
  setNotification: (notification: PushNotification) => void,
  onForegroundMessage?: (message: PushNotification) => void,
): Promise<WebPushSetup> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { status: "unavailable", reason: "sin navegador" };
  }

  if (!window.isSecureContext) {
    return { status: "unavailable", reason: "Firebase Web Push requiere HTTPS o localhost." };
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { status: "unavailable", reason: "este navegador no soporta notificaciones push." };
  }

  // El hook se encarga de NO llamarnos si el permiso no esta "granted",
  // pero validamos otra vez por seguridad.
  if (Notification.permission !== "granted") {
    debugLog(
      "[web-push] Permiso aún no concedido, saltando setup. La UI debe llamar a requestPermission().",
    );
    return { status: "failed", reason: "el permiso del navegador no está concedido." };
  }

  // Sin estas variables de compilación (Cloudflare) el push web no puede
  // funcionar; la app sí, y la campana se actualiza cada minuto.
  const missingConfig = getMissingWebConfigEnv();
  if (missingConfig.length > 0) {
    reportMissingWebPushConfig(missingConfig);
    return {
      status: "unavailable",
      reason: `faltan ${missingConfig.join(", ")} en las variables de compilación del build web.`,
    };
  }
  const firebaseConfig = getWebFirebaseConfig();

  const [{ getApps, initializeApp }, messagingModule] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);

  const isMessagingSupported = await messagingModule.isSupported();

  if (!isMessagingSupported) {
    return { status: "unavailable", reason: "Firebase Messaging no está soportado en este navegador." };
  }

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

  // Registramos el SW sin query string: el navegador se lo strip-ea al SW
  // y la config no llegaria. En su lugar, despues de registrar le mandamos
  // la config por postMessage y esperamos el ack.
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/" },
  );

  debugLog("[web-push] SW registrado, mandando config...");
  await sendConfigToServiceWorker(serviceWorkerRegistration, firebaseConfig);

  const messaging = messagingModule.getMessaging(app);
  debugLog("[web-push] Pidiendo token FCM...");
  const token = await messagingModule.getToken(messaging, {
    vapidKey: WEB_VAPID_KEY,
    serviceWorkerRegistration,
  });

  if (!token) {
    return {
      status: "failed",
      reason: "Firebase no devolvió token FCM (revisa que el service worker esté activo y la VAPID key sea correcta).",
    };
  }

  if (!(await registerTokenInBackend(token))) {
    return { status: "failed", reason: "no se pudo registrar el token en el servidor." };
  }
  debugLog("FCM token web registrado");

  const unsubscribeForeground = messagingModule.onMessage(
    messaging,
    (payload) => {
      debugLog("Notificación FCM web en primer plano:", payload.messageId);
      setNotification(payload);
      // Antes solo nativo avisaba: en web la campana no se movía hasta
      // recargar.
      onForegroundMessage?.(payload);
      showWebForegroundNotification(payload, serviceWorkerRegistration);
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
      entityId: pickEntityId(data),
      rawData: data,
    };
    debugLog("SW notifico push abierto:", payload);
    notificationOpenedBus.emit(payload);
  };
  navigator.serviceWorker.addEventListener("message", onSwMessage);

  return {
    status: "registered",
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
        debugLog("Permisos de notificación Android denegados.");
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
      // navigator.serviceWorker.ready resuelve con un ServiceWorkerRegistration
      // (NO con un ServiceWorker), una vez que el SW del scope ya tiene un
      // worker activo. El worker real para postMessage esta en .active.
      const readyRegistration = await navigator.serviceWorker.ready;
      worker = readyRegistration.active;
    } catch {
      worker = null;
    }
  }

  if (!worker) {
    throw new Error("Service worker no está activo, no se puede enviar config");
  }

  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      console.warn(
        "[web-push] Timeout esperando confirmación del SW; continuando de todas formas",
      );
      resolve();
    }, 5000);

    channel.port1.onmessage = (event) => {
      if (event.data?.type === "FIREBASE_CONFIG_RECEIVED") {
        clearTimeout(timeout);
        if (event.data.initialized) {
          debugLog("[web-push] SW confirmo config e inicializo Firebase");
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

// Variables de compilación obligatorias para el push web, por su nombre real
// (para el aviso). Se leen una por una: Expo sólo incrusta process.env.X.
function getMissingWebConfigEnv(): string[] {
  const required: [string, string | undefined][] = [
    ["EXPO_PUBLIC_FIREBASE_API_KEY", process.env.EXPO_PUBLIC_FIREBASE_API_KEY],
    ["EXPO_PUBLIC_FIREBASE_PROJECT_ID", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID],
    ["EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
    ["EXPO_PUBLIC_FIREBASE_APP_ID", process.env.EXPO_PUBLIC_FIREBASE_APP_ID],
    ["EXPO_PUBLIC_FIREBASE_VAPID_KEY", WEB_VAPID_KEY],
  ];
  return required.filter(([, value]) => !value).map(([name]) => name);
}

/** Registra el token en el backend; false si no se pudo (el push no llegará). */
async function registerTokenInBackend(token: string): Promise<boolean> {
  try {
    await axiosClient.post(
      "/auth/admin/device-tokens/register",
      {
        token,
        device_type: getBackendDeviceType(),
        device_name: getDeviceName(),
        app_version: APP_VERSION,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return true;
  } catch (error) {
    console.error("Error al registrar token FCM en el backend:", describeError(error));
    return false;
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
      title: title || "GCStock",
      body,
      // La marca permite que el listener de respuestas lleve al detalle al
      // tocarla (y que no se dupliquen navegaciones con RNFirebase).
      data: { ...(remoteMessage.data || {}), [FOREGROUND_NOTIFICATION_MARKER]: "1" },
    },
    trigger: null,
  });
}

function showWebForegroundNotification(
  payload: MessagePayload,
  registration?: ServiceWorkerRegistration,
) {
  if (Notification.permission !== "granted") {
    return;
  }

  // En web los mensajes llegan data-only (sin `notification` payload, para
  // evitar duplicados en segundo plano), asi que tomamos titulo/cuerpo de
  // `data`. Mantenemos el fallback a `notification` por compatibilidad.
  const data = payload.data ?? {};
  const title = data.title || payload.notification?.title || "GCStock";
  const options: NotificationOptions = {
    body: data.body || payload.notification?.body,
    icon: "/notification-icon.png",
    data,
  };

  // Preferimos showNotification() del Service Worker: en varios navegadores
  // (Chrome en Android, y segun configuracion tambien en desktop) el
  // constructor `new Notification()` esta restringido y lanza "Illegal
  // constructor". El SW funciona de forma consistente y ademas permite
  // acciones/click handling desde el propio SW.
  if (registration) {
    registration.showNotification(title, options).catch((error) => {
      console.warn(
        "[web-push] showNotification del SW fallo, intentando new Notification():",
        error,
      );
      try {
        new Notification(title, options);
      } catch (fallbackError) {
        console.error(
          "[web-push] No se pudo mostrar la notificación en primer plano:",
          fallbackError,
        );
      }
    });
    return;
  }

  try {
    new Notification(title, options);
  } catch (error) {
    console.error(
      "[web-push] No se pudo mostrar la notificación en primer plano:",
      error,
    );
  }
}

function handleNotificationAction(remoteMessage: PushNotification) {
  const data = extractPushData(remoteMessage);

  if (!data) {
    debugLog("Notificación sin data payload, ignorando deep-link");
    return;
  }

  const payload: NotificationOpenedPayload = {
    eventType: data.event_type,
    entityId: pickEntityId(data),
    rawData: data,
  };

  debugLog("Emitiendo evento notificationOpened:", payload);
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
  // Según el tipo de evento (un ajuste trae adjustment_id y product_id, y en
  // FCM los nulos llegan como ""). La ruta la resuelve NavigationHandler con
  // el mismo helper a partir de rawData.
  return getNotificationEntityId(data.event_type, data);
}
