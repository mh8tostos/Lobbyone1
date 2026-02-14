import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';

const requiredFirebaseEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const missingFirebaseEnvVars = requiredFirebaseEnvVars.filter((envKey) => !process.env[envKey]);

if (missingFirebaseEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}. Configure them in your environment (local .env / Vercel Environment Variables).`
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
