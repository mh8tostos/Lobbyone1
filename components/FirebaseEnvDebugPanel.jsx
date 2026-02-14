'use client';

const envDiagnostics = [
  {
    name: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    present: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  },
];

const isDebugEnabled = process.env.NEXT_PUBLIC_FIREBASE_ENV_DEBUG === 'true';

export default function FirebaseEnvDebugPanel() {
  if (!isDebugEnabled) {
    return null;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[9999] w-full max-w-md rounded-lg border bg-white/95 p-4 shadow-2xl backdrop-blur">
      <h2 className="text-sm font-semibold text-slate-900">Temporary Firebase Env Debug (remove before merge)</h2>
      <p className="mt-1 text-xs text-slate-600">
        Controlled by <code>NEXT_PUBLIC_FIREBASE_ENV_DEBUG=true</code>. This panel only reports presence, not values.
      </p>
      <ul className="mt-3 space-y-1 text-xs">
        {envDiagnostics.map((item) => (
          <li key={item.name} className="flex items-center justify-between rounded border px-2 py-1">
            <code>{item.name}</code>
            <span className={item.present ? 'text-emerald-700' : 'text-rose-700'}>
              {item.present ? 'present' : 'missing'}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
