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
  const title = data.title || payload.notification?.title || "GCStock";
  const options = {
    body: data.body || payload.notification?.body || "",
    icon: "/notification-icon.png",
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

// Id de entidad válido (en FCM los nulos llegan como "").
function readId(data, key) {
  const value = data && data[key] != null ? String(data[key]).trim() : "";
  return /^\d+$/.test(value) && Number(value) > 0 ? value : null;
}

// URL web a la que lleva cada aviso. Es la misma tabla que
// components/Notifications/notificationLinks.ts (allá con los grupos
// "(tabs)" de expo-router, que no aparecen en la URL): mantenerlas iguales.
function routeForNotification(data) {
  const type = (data && data.event_type) || "";
  const id = (key) => readId(data, key);
  let route = null;

  switch (type) {
    case "task_event":
      route = id("task_id") && `/tasks/${id("task_id")}`;
      break;
    case "purchase_update":
      route = id("purchase_id") && `/home/purchases/${id("purchase_id")}`;
      break;
    case "low_stock":
      route = id("product_id") && `/inventory/products/${id("product_id")}`;
      break;
    case "inventory_adjustment":
      route = id("adjustment_id")
        ? `/home/adjustment/${id("adjustment_id")}`
        : id("product_id") && `/inventory/products/${id("product_id")}`;
      break;
    case "inventory_count_discrepancy":
      route =
        id("inventory_count_id") &&
        `/inventory/weekly-inventory/${id("inventory_count_id")}`;
      break;
    case "transfer_update":
      route = id("transfer_id") && `/home/transfers/${id("transfer_id")}`;
      break;
    case "reminder":
      route = "/home/reminders";
      break;
    default:
      if (id("task_id")) route = `/tasks/${id("task_id")}`;
      else if (id("transfer_id")) route = `/home/transfers/${id("transfer_id")}`;
      else if (id("purchase_id")) route = `/home/purchases/${id("purchase_id")}`;
      else if (id("inventory_count_id"))
        route = `/inventory/weekly-inventory/${id("inventory_count_id")}`;
      else if (id("adjustment_id")) route = `/home/adjustment/${id("adjustment_id")}`;
      else if (id("product_id")) route = `/inventory/products/${id("product_id")}`;
      else if (id("reminder_id")) route = "/home/reminders";
  }

  if (route) return route;
  // Sin registro relacionado: el detalle del aviso o, si no, la bandeja.
  return id("notification_id")
    ? `/notifications/${id("notification_id")}`
    : "/notifications";
}

// URL con la que se abre la app cuando no hay pestaña: la misma regla que
// resolvePushRoute (notificationLinks.ts) en los toques nativos. Con
// notification_id se abre el detalle del aviso con ?open=1: marca el aviso
// como leído, abre solo su registro y, si ya no existe, es de otra sucursal
// o no hay permiso, lo explica ahí (antes se abría directo el registro).
function openUrlForNotification(data) {
  const route = routeForNotification(data);
  const notificationId = readId(data, "notification_id");
  if (!notificationId) return route;
  const detail = `/notifications/${notificationId}`;
  // Sin registro relacionado, routeForNotification ya dio el detalle.
  return route === detail ? detail : `${detail}?open=1`;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const route = routeForNotification(data);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const windows = clients.filter((client) => "focus" in client);
      const target =
        windows.find((client) => client.focused) ||
        windows.find((client) => client.visibilityState === "visible") ||
        windows[0];

      if (target) {
        // La pestaña navega sin recargar (NavigationHandler) y marca el aviso
        // como leído (notification_id).
        target.postMessage({
          type: "PUSH_NOTIFICATION_OPENED",
          data,
          url: route,
        });
        return target.focus();
      }

      if (self.clients.openWindow) {
        // Sin pestaña abierta: se abre en el detalle del aviso (o, si el push
        // no se guardó en la bandeja, en la pantalla del registro).
        return self.clients.openWindow(openUrlForNotification(data));
      }

      return undefined;
    }),
  );
});
