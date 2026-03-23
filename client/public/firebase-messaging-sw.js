// Firebase Messaging Service Worker
// Handles background push notifications from FCM

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config is injected via self.__FIREBASE_CONFIG (set by the app at registration time)
// or falls back to hardcoded values for the service worker context
const firebaseConfig = self.__FIREBASE_CONFIG || {
  apiKey: "AIzaSyAUyYulp5z_uIpDWys_6NRNLeDZkhVS39U",
  authDomain: "jarvistravelapp.firebaseapp.com",
  projectId: "jarvistravelapp",
  storageBucket: "jarvistravelapp.firebasestorage.app",
  messagingSenderId: "630076196109",
  appId: "1:630076196109:web:abc123",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages (app is not in foreground)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};

  const notificationTitle = title || 'Flyisa – Alerta de viagem';
  const notificationOptions = {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tripId || 'flyisa-alert',
    data: payload.data || {},
    requireInteraction: payload.data?.severity === 'critical' || payload.data?.severity === 'urgent',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Open/focus the app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
