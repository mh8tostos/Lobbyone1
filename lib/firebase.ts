import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const missingFirebaseEnvVars = [
  !firebaseConfig.apiKey ? 'NEXT_PUBLIC_FIREBASE_API_KEY' : null,
  !firebaseConfig.authDomain ? 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' : null,
  !firebaseConfig.projectId ? 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' : null,
  !firebaseConfig.storageBucket ? 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' : null,
  !firebaseConfig.messagingSenderId ? 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID' : null,
  !firebaseConfig.appId ? 'NEXT_PUBLIC_FIREBASE_APP_ID' : null,
].filter(Boolean) as string[];

const hasCompleteFirebaseConfig = missingFirebaseEnvVars.length === 0;

const FIREBASE_SKIP_LOG_KEY = '__lobbyone_firebase_skip_logged__';

if (!hasCompleteFirebaseConfig) {
  const diagnosticMessage =
    '[firebase] Firebase client SDK initialization skipped because required NEXT_PUBLIC_FIREBASE_* variables are missing.';

  const globalScope = globalThis as typeof globalThis & { [FIREBASE_SKIP_LOG_KEY]?: boolean };

  if (!globalScope[FIREBASE_SKIP_LOG_KEY]) {
    globalScope[FIREBASE_SKIP_LOG_KEY] = true;

    if (typeof window === 'undefined') {
      console.warn(diagnosticMessage, { missingFirebaseEnvVars });
    } else {
      console.error(diagnosticMessage, { missingFirebaseEnvVars });
    }
  }
}

const firebaseApp: FirebaseApp | null = hasCompleteFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let analyticsInstance: Analytics | null = null;

export const initAnalytics = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (!firebaseApp || !firebaseConfig.measurementId) {
    return null;
  }

  const { isSupported, getAnalytics } = await import('firebase/analytics');

  if (!(await isSupported())) {
    return null;
  }

  analyticsInstance = getAnalytics(firebaseApp);
  return analyticsInstance;
};

export { firebaseApp, firebaseAuth, db, storage, googleProvider };
export { firebaseApp as app, firebaseAuth as auth };
export { hasCompleteFirebaseConfig, missingFirebaseEnvVars };
