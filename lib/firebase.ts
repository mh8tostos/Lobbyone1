import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

const requiredFirebaseEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const missingFirebaseEnvVars = requiredFirebaseEnvVars.filter((envKey) => !process.env[envKey]);
const hasCompleteFirebaseConfig = missingFirebaseEnvVars.length === 0;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!hasCompleteFirebaseConfig) {
  const diagnosticMessage =
    `[firebase] Missing Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}. ` +
    'Firebase client SDK initialization was skipped. Set these values in local .env and Vercel (Preview + Production), then redeploy.';

  if (typeof window === 'undefined') {
    console.warn(diagnosticMessage);
  } else {
    console.error(diagnosticMessage);
  }
}

const app: FirebaseApp | null = hasCompleteFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const auth: Auth | null = app ? getAuth(app) : null;
const db: Firestore | null = app ? getFirestore(app) : null;
const storage: FirebaseStorage | null = app ? getStorage(app) : null;

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

  if (!app) {
    return null;
  }

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  const { isSupported, getAnalytics } = await import('firebase/analytics');

  if (!(await isSupported())) {
    return null;
  }

  analyticsInstance = getAnalytics(app);
  return analyticsInstance;
};

export { app, auth, db, storage, googleProvider };
export { hasCompleteFirebaseConfig, missingFirebaseEnvVars, requiredFirebaseEnvVars };
