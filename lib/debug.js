export function logJoinError(error, ctx = {}) {
  const firebaseCode = error?.code || 'unknown';
  const timestamp = ctx?.timestamp || new Date().toISOString();

  const context = {
    ...ctx,
    timestamp,
  };

  const hints = {
    'permission-denied': 'Firestore rules blocked the operation. Verify read/write rules for this collection and authenticated user role.',
    'firebase/permission-denied': 'Firestore rules blocked the operation. Verify read/write rules for this collection and authenticated user role.',
    unauthenticated: 'User is not authenticated for this request. Check auth state and token refresh before writing/reading Firestore.',
    'firebase/unauthenticated': 'User is not authenticated for this request. Check auth state and token refresh before writing/reading Firestore.',
  };

  const hint = hints[firebaseCode];
  const groupLabel = `[JOIN_EVENT_FAIL] ${context?.action || 'joinEvent'} @ ${timestamp}`;

  console.groupCollapsed(groupLabel);
  console.error('code:', firebaseCode);
  console.error('message:', error?.message || String(error));
  console.error('stack:', error?.stack || 'No stack trace available');
  console.error('context:', context);

  if (hint) {
    console.warn('hint:', hint);
  }

  console.groupEnd();
}
