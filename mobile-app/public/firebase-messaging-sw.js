// Firebase Cloud Messaging Service Worker for ChatterBuds
// Handles background incoming call push notifications when browser tab is closed

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Initialize Firebase compat inside the service worker
const firebaseConfig = {
  apiKey: "AIzaSyChatterBudsDemoKeyForGoogleOAuth2",
  authDomain: "chatterbuds-prod.firebaseapp.com",
  projectId: "chatterbuds-prod",
  storageBucket: "chatterbuds-prod.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:chatterbudsdemo",
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn("FCM messaging could not be initialized in SW:", e);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message:", payload);

    const data = payload.data || {};
    const caller = data.callerNumber || "Someone";
    const roomId = data.roomId || "1234";
    const callerLang = data.callerLang || "Foreign Language";
    const clickUrl = `/?incomingRoom=${encodeURIComponent(roomId)}&caller=${encodeURIComponent(caller)}&autoJoin=1`;

    const title = payload.notification?.title || "Incoming Translation Call";
    const options = {
      body: payload.notification?.body || `${caller} (${callerLang}) is calling you for live speech translation.`,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: "chatterbuds-incoming-call",
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 200, 400, 200, 800],
      actions: [
        {
          action: "accept",
          title: "🟢 Accept & Talk",
        },
        {
          action: "decline",
          title: "🔴 Decline",
        },
      ],
      data: {
        url: clickUrl,
        roomId: roomId,
        caller: caller,
      },
    };

    return self.registration.showNotification(title, options);
  });
}

// Notification Click Handler: Open / Focus App and Auto-Join Room
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || "/";

  if (action === "decline") {
    // Dismiss without opening app
    return;
  }

  // Focus existing open window or open a new one
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
