importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA1Msk318DI0ts3vWANmOTDEyAt1N7GZ4w",
  authDomain: "skychat-aad20.firebaseapp.com",
  projectId: "skychat-aad20",
  storageBucket: "skychat-aad20.appspot.com",
  messagingSenderId: "314283798926",
  appId: "1:314283798926:web:95d9beff0be911576634df"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'SkyChat 💕';
  const body = payload.notification?.body || 'New message';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'skychat-message',
    renotify: true
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if (client.url.includes('skychat') && 'focus' in client) return client.focus();
    }
    return clients.openWindow('/');
  }));
});
