'use client';

import { hasCompleteFirebaseConfig, missingFirebaseEnvVars } from '@/lib/firebase';

export default function FirebaseConfigGuard({ children }) {
  if (hasCompleteFirebaseConfig) {
    return children;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Configuration Firebase manquante</h1>
      <p className="text-sm text-slate-600">
        L&apos;application est en mode sécurisé et a désactivé l&apos;authentification Firebase pour éviter un crash.
      </p>
      <p className="text-xs text-slate-500">
        Variables manquantes: {missingFirebaseEnvVars.join(', ') || 'NEXT_PUBLIC_FIREBASE_*'}
      </p>
    </main>
  );
}
