# Backfill `hotelNameLower` for existing events

To support prefix hotel search (`/events?hotel=...`), every event document must include a normalized `hotelNameLower` field.

## What is stored

`hotelNameLower` is generated as:
- source hotel field priority: `hotelName`, then `hotel`, then `venueName`, then `placeName`
- lowercased and trimmed

## Recommended one-off migration

Run a backfill with Firebase Admin SDK (script or console) that:

1. Reads every `events` document.
2. Computes `hotelNameLower` from the source hotel field.
3. Updates only documents where `hotelNameLower` is missing and source hotel name is present.

## Firestore indexing note

The hotel search query intentionally uses:

- `orderBy('hotelNameLower')`
- `startAt(qLower)`
- `endAt(qLower + '\uf8ff')`
- `limit(50)`

without extra filters to avoid requiring a composite index.
