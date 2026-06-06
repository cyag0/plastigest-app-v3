/* global firebase, importScripts */

importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
  measurementId: params.get("measurementId"),
};

const requiredKeys = ["apiKey", "projectId", "messagingSenderId", "appId"];
const hasConfig = requiredKeys.every((key) => firebaseConfig[key]);

if (hasConfig) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "PlastiGest";
    const options = {
      body: payload.notification?.body,
      data: payload.data || {},
    };

    self.registration.showNotification(title, options);
  });
} else {
  console.warn("Firebase Messaging service worker sin configuracion web completa.");
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const visibleClient = clients.find((client) => "focus" in client);

      if (visibleClient) {
        return visibleClient.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }

      return undefined;
    }),
  );
});