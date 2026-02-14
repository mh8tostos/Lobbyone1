# Migration: `eventParticipants` deterministic document IDs

## Why
Event chat access rules need a safe document lookup for membership checks using Firestore `exists()`.

## New key format
Each participant document in `eventParticipants` now uses this ID pattern:

- `${eventId}_${userId}`

## Impact
- Joining an event is now idempotent (`setDoc` on deterministic ID).
- Duplicate participant documents are prevented by key design.
- Security rules can safely validate access with:
  - `exists(/databases/$(database)/documents/eventParticipants/$(eventId + '_' + request.auth.uid))`

## One-time backfill for existing data
Existing participant docs created with random IDs should be migrated.

Pseudo-process:
1. Read each `eventParticipants` document.
2. Compute `newId = eventId + '_' + userId`.
3. Write document to `eventParticipants/{newId}`.
4. Delete old random-ID document (if different).
5. Optionally deduplicate or recompute `events.participantsCount` for consistency.

Run this once in an admin context (Cloud Function / Admin script) before enforcing strict rules in production.
