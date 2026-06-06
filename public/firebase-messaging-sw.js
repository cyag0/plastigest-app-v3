/* global firebase, importScripts */

// El SW NO puede leer la config de Firebase desde self.location.search:
// cuando el navegador instala un SW, strip-ea el query string del script.
// Por eso la pagina le manda la config por postMessage y esperamos ack
// antes de llamar a getToken en el cliente.

importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

let messagingInitialized = false;
let app = null;
let messaging = null;

function initFirebase(config) {
  if (messagingInitialized) return;
  if (!config || !config.projectId) {
    console.warn("[SW] Firebase config invalida, no se puede inicializar");
    return;
  }
  try {
    app = firebase.initializeApp(config);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || "PlastiGest";
      const options = {
        body: payload.notification?.body,
        data: payload.data || {},
      };
      self.registration.showNotification(title, options);
    });
    messagingInitialized = true;
    console.log("[SW] Firebase Messaging inicializado:", config.projectId);
  } catch (error) {
    console.error("[SW] Error inicializando Firebase:", error);
  }
}

// La pagina nos manda la config por postMessage. Tambien respondemos por
// el MessageChannel que envia para que la pagina sepa que estamos listos
// antes de pedir el token.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "FIREBASE_CONFIG") {
    initFirebase(data.config);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: "FIREBASE_CONFIG_RECEIVED",
        initialized: messagingInitialized,
      });
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const visibleClient = clients.find((client) => "focus" in client);

      if (visibleClient) {
        visibleClient.postMessage({
          type: "PUSH_NOTIFICATION_OPENED",
          data,
        });
        return visibleClient.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }

      return undefined;
    }),
  );
});
