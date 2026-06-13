/* global firebase, importScripts */

// Service Worker de Firebase Cloud Messaging (Web Push).
//
// IMPORTANTE: Firebase se inicializa AQUI, al arranque del SW (top-level), y NO
// via postMessage desde la pagina. El navegador TERMINA el Service Worker
// cuando esta inactivo y lo reinicia "en frio" para entregar un push; en ese
// reinicio se pierde todo el estado global. Si dependieramos de que la pagina
// mande la config, al llegar el push el SW arrancaria SIN `onBackgroundMessage`
// registrado, no mostraria nuestra notificacion, y Chrome mostraria el generico
// "Este sitio se actualizo en segundo plano".
//
// La config web de Firebase es PUBLICA (ya viaja en el bundle del cliente), por
// lo que incrustarla aqui es seguro y es el enfoque oficial de Firebase.

importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDBBPRKx0JLScdzfrZjCJ-ladtVrbnMsuc",
  authDomain: "plastigest-976ac.firebaseapp.com",
  projectId: "plastigest-976ac",
  storageBucket: "plastigest-976ac.firebasestorage.app",
  messagingSenderId: "554935375196",
  appId: "1:554935375196:web:87bc63e1fff9d1d7fbdd99",
});

const messaging = firebase.messaging();

// Push recibido mientras la app esta en segundo plano (o sin pestañas abiertas).
// Mostramos la notificacion nosotros para que tenga titulo/cuerpo reales y no
// salga el generico de Chrome.
messaging.onBackgroundMessage((payload) => {
  // En web los mensajes llegan data-only (el backend NO manda `notification`
  // payload para evitar la notificacion duplicada que Chrome auto-mostraria),
  // asi que tomamos titulo/cuerpo de `data`. Dejamos el fallback a
  // `notification` por si llega un mensaje con ese formato.
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "PlastiGest";
  const options = {
    body: data.body || payload.notification?.body || "",
    icon: "/favicon.ico",
    data: data,
  };
  self.registration.showNotification(title, options);
});

// La pagina sigue mandando la config por postMessage (el cliente espera un ack
// antes de pedir el token). Firebase ya esta inicializado arriba, asi que aqui
// solo confirmamos para que el cliente no espere el timeout de 5s.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "FIREBASE_CONFIG") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: "FIREBASE_CONFIG_RECEIVED",
        initialized: true,
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
