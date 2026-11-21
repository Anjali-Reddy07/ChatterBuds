import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { getFirestore, doc, setDoc, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyChatterBudsDemoKeyForGoogleOAuth2",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chatterbuds-prod.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chatterbuds-prod",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "chatterbuds-prod.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1029384756:web:chatterbudsdemo",
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let messaging: Messaging | null = null;

export function getFirebaseClient() {
  if (typeof window === "undefined") {
    return { app: null, firestore: null, messaging: null };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    try {
      firestore = getFirestore(app);
    } catch (e) {
      // ignore
    }

    return { app, firestore, messaging };
  } catch (e) {
    console.warn("Firebase client init notice:", e);
    return { app: null, firestore: null, messaging: null };
  }
}

/**
 * Requests Notification permission and generates FCM Device Token.
 * Stores token in Firestore users/{phoneNumber} and syncs with backend /api/fcm/register.
 */
export async function registerFcmDeviceToken(
  phoneNumber: string,
  backendHttpUrl: string
): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }

  const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, "");
  if (!cleanPhone || cleanPhone.length < 5) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted:", permission);
      return null;
    }

    const { app: fbApp, firestore: db } = getFirebaseClient();
    if (!fbApp) return null;

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    const vapidKey =
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuYTr3qhuiVpvZ65yAUxWBST4Y";

    const fbMessaging = getMessaging(fbApp);
    messaging = fbMessaging;

    const token = await getToken(fbMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Device Token generated:", token);
      localStorage.setItem("chatterbuds_fcm_token", token);

      // 1. Save in Firestore users/{phoneNumber}
      if (db) {
        try {
          const userDoc = doc(db, "users", cleanPhone);
          await setDoc(
            userDoc,
            {
              phoneNumber: cleanPhone,
              fcmToken: token,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Could not save token directly to Firestore:", err);
        }
      }

      // 2. Register with backend endpoint /api/fcm/register
      try {
        const cleanHttpBase = backendHttpUrl
          .replace(/^ws:\/\//i, "http://")
          .replace(/^wss:\/\//i, "https://")
          .replace(/\/+$/, "")
          .replace(/\/ws\/?$/i, "");

        await fetch(`${cleanHttpBase}/api/fcm/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: cleanPhone, fcmToken: token }),
        });
      } catch (err) {
        console.warn("Could not notify backend of FCM token:", err);
      }

      return token;
    }
  } catch (err) {
    console.warn("FCM token registration notice:", err);
  }

  return null;
}

/**
 * Syncs user profile (phoneNumber, displayName, preferredLanguage, fcmToken)
 * directly with Firestore users collection and backend /api/user/profile.
 */
export async function syncUserProfile({
  phoneNumber,
  displayName,
  preferredLanguage,
  fcmToken,
  backendHttpUrl,
}: {
  phoneNumber: string;
  displayName: string;
  preferredLanguage: string;
  fcmToken?: string | null;
  backendHttpUrl?: string;
}): Promise<boolean> {
  const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, "");
  if (!cleanPhone || cleanPhone.length < 5) return false;

  const profileData = {
    phoneNumber: cleanPhone,
    displayName: displayName.trim() || "User",
    preferredLanguage: preferredLanguage || "English",
    fcmToken: fcmToken || null,
    updatedAt: new Date().toISOString(),
  };

  // 1. Direct Firestore write
  const { firestore: db } = getFirebaseClient();
  if (db) {
    try {
      const userDoc = doc(db, "users", cleanPhone);
      await setDoc(userDoc, profileData, { merge: true });
    } catch (e) {
      console.warn("Firestore profile sync warning:", e);
    }
  }

  // 2. Sync with backend /api/user/profile
  try {
    const baseUrl = backendHttpUrl
      ? backendHttpUrl
          .replace(/^ws:\/\//i, "http://")
          .replace(/^wss:\/\//i, "https://")
          .replace(/\/+$/, "")
          .replace(/\/ws\/?$/i, "")
      : "";

    const endpoint = baseUrl ? `${baseUrl}/api/user/profile` : "/api/user/profile";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    return true;
  } catch (err) {
    console.warn("Backend user profile sync warning:", err);
    return false;
  }
}

/**
 * Listen for foreground FCM push notifications while the app is active
 */
export function listenToForegroundPush(onIncomingCall: (callData: any) => void): () => void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return () => {};
  }

  try {
    const { app: fbApp } = getFirebaseClient();
    if (!fbApp) return () => {};

    const fbMessaging = getMessaging(fbApp);
    const unsubscribe = onMessage(fbMessaging, (payload) => {
      console.log("Foreground FCM message received:", payload);
      const data = payload.data || {};
      if (data.type === "INCOMING_CALL" || payload.notification?.title?.includes("Incoming Call")) {
        onIncomingCall({
          roomId: data.roomId || "1234",
          fromPhone: data.callerNumber || "Unknown",
          callerLang: data.callerLang || "Foreign Language",
        });
      }
    });

    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}
