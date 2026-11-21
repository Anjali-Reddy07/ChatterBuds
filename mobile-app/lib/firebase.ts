import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";

export interface SyncedContact {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  email?: string;
  label?: string;
}

// Fallback Firebase configuration (can be overridden via environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyChatterBudsDemoKeyForGoogleOAuth2",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chatterbuds-prod.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chatterbuds-prod",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "chatterbuds-prod.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1029384756:web:chatterbudsdemo",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): { app: FirebaseApp | null; auth: Auth | null } {
  if (typeof window === "undefined") {
    return { app: null, auth: null };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    return { app, auth };
  } catch (err) {
    console.warn("Firebase initialization notice:", err);
    return { app: null, auth: null };
  }
}

/**
 * Normalizes a phone number to standard international format (E.164-style).
 * - Strips all non-digit and non-plus characters
 * - Normalizes 10-digit Indian numbers to +91XXXXXXXXXX
 * - Normalizes 0XXXXXXXXXX to +91XXXXXXXXXX
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/[^\d+]/g, "").trim();

  // If 10 digits without leading code, default to +91 (India)
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If 11 digits starting with 0, replace 0 with +91
  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // If digits without plus and 11-13 digits
  if (/^\d{11,13}$/.test(cleaned) && !cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }

  if (cleaned && !cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Fetches contacts from Google People API using the OAuth Access Token
 */
export async function fetchGoogleContacts(accessToken: string): Promise<SyncedContact[]> {
  try {
    const url =
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,photos,emailAddresses&pageSize=1000";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Google People API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const connections = data.connections || [];
    const contacts: SyncedContact[] = [];

    for (const person of connections) {
      const names = person.names || [];
      const primaryName = names.find((n: any) => n.metadata?.primary) || names[0];
      const displayName = primaryName?.displayName || primaryName?.givenName || "Unnamed Contact";

      const photos = person.photos || [];
      const photoUrl = photos[0]?.url;

      const emails = person.emailAddresses || [];
      const email = emails[0]?.value;

      const phoneNumbers = person.phoneNumbers || [];
      for (const p of phoneNumbers) {
        const rawValue = p.value;
        if (rawValue) {
          const normPhone = normalizePhoneNumber(rawValue);
          if (normPhone) {
            contacts.push({
              id: person.resourceName || `${normPhone}-${Math.random()}`,
              name: displayName,
              phone: normPhone,
              photoUrl: photoUrl,
              email: email,
              label: p.type || "Mobile",
            });
          }
        }
      }
    }

    return contacts;
  } catch (err) {
    console.error("Error fetching Google Contacts:", err);
    throw err;
  }
}

/**
 * Sign in with Google using Firebase Authentication requesting contacts.readonly scope
 */
export async function signInWithGoogleAndSyncContacts(): Promise<{
  user: User | null;
  accessToken?: string;
  contacts: SyncedContact[];
}> {
  const { auth: fbAuth } = getFirebaseAuth();
  if (!fbAuth) {
    throw new Error("Firebase Auth could not be initialized");
  }

  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
  provider.setCustomParameters({
    prompt: "select_account",
  });

  const result = await signInWithPopup(fbAuth, provider);
  const user = result.user;

  let accessToken: string | undefined = undefined;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    accessToken = credential.accessToken;
  } else if ((result as any)._tokenResponse?.oauthAccessToken) {
    accessToken = (result as any)._tokenResponse.oauthAccessToken;
  }

  let contacts: SyncedContact[] = [];
  if (accessToken) {
    try {
      contacts = await fetchGoogleContacts(accessToken);
    } catch (e) {
      console.warn("Failed to automatically fetch contacts via access token:", e);
    }
  }

  return { user, accessToken, contacts };
}

/**
 * Sign out current user
 */
export async function signOutGoogle(): Promise<void> {
  const { auth: fbAuth } = getFirebaseAuth();
  if (fbAuth) {
    await signOut(fbAuth);
  }
}

/**
 * Default sample contacts for immediate testing & offline fallback
 */
export const DEFAULT_SAMPLE_CONTACTS: SyncedContact[] = [
  {
    id: "sample-1",
    name: "Anjali Reddy",
    phone: "+919876543210",
    label: "Mobile • Telugu (తెలుగు)",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
  },
  {
    id: "sample-2",
    name: "Ramesh Kumar",
    phone: "+919840123456",
    label: "Work • Hindi (हिन्दी)",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
  },
  {
    id: "sample-3",
    name: "Pooja Sharma",
    phone: "+919988776655",
    label: "Friend • Odia (ଓଡ଼ିଆ)",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
  },
  {
    id: "sample-4",
    name: "Dr. Vikram Rao",
    phone: "+919123456780",
    label: "Doctor • English",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&h=100&fit=crop&crop=faces",
  },
];
