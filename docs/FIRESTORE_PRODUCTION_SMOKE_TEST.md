# Firestore Production Smoke Test

## Goal

Validate that production traffic is safely using the paid Firestore database:

- Database: `fom-play-sg`
- App URL: `https://gen-lang-client-0996764238.web.app`

Saver mode should remain off during normal production verification. Turn it on only if you need emergency read reduction.

## Before Testing

1. Use a real account that already has:
   - profile data
   - at least one history item
   - friends or friend requests
2. Open browser devtools on `/app`.
3. Prepare these console helpers:

```js
window.__fomDbMetrics.clear()
window.__fomDbMetrics.table()
window.__fomDbMetrics.summary()
```

## Smoke Test Flows

### 1. Login

Expected:

- app loads without blank screen
- auth succeeds
- no repeated loading loop
- no `resource-exhausted` error in console

Check after login:

```js
window.__fomDbMetrics.table()
```

Look for:

- no unexpected burst of `read`
- `skip` should usually stay at `0` during normal verification

### 2. Dashboard

Expected:

- user name/avatar/profile section appears
- active tournament state does not break the page
- no crash if cloud recovery is skipped

Look for:

- dashboard remains usable even when some cloud reads are intentionally skipped

### 3. Create Tournament

Steps:

1. Create a small test tournament
2. Use 4 players if possible for faster testing
3. Save and start

Expected:

- tournament creates successfully
- no duplicate writes
- round generation works

### 4. Score Match

Steps:

1. Enter one or two scores
2. Move to next match or next round

Expected:

- score persists
- UI remains responsive
- no repeated retry loop

Look for:

- write count should increase, but not explode

### 5. Finalize Tournament

Steps:

1. Finish all required matches
2. Finalize the tournament

Expected:

- final standings render
- finalize succeeds once
- no duplicate history/stat writes

Look for:

- Functions logs should show normal finalize flow
- no repeated leaderboard refresh storm

### 6. Leaderboard

Expected:

- leaderboard screen opens
- snapshot-backed data appears
- page does not issue broad fallback queries unless snapshot is missing

### 7. History

Expected:

- history list loads
- summary cards appear
- no unbounded history scan behavior

### 8. Friends Search

Expected:

- search returns results
- no client-side query storm
- callable path works normally

## What To Watch

### Browser

Run after each flow:

```js
window.__fomDbMetrics.summary()
window.__fomDbMetrics.table()
```

Warning signs:

- repeated `resource-exhausted`
- repeated `listen` or `read` on the same flow
- large spikes from leaderboard/history/friends

### Firebase Console

Check:

- Firestore Usage
- Functions logs
- Error Reporting

Warning signs:

- sudden read spike after login/dashboard
- repeated function trigger on the same document
- error loop on `onTournamentFinalized` or `refreshLeaderboardSnapshots`

## First 24 Hours

Recommended cadence:

1. Test immediately after cutover
2. Check again after 1 hour
3. Check again after 24 hours

Track:

- total reads
- total writes
- any user-facing errors
- any rollback decision

## Quick Rollback

If production shows serious issues, revert both frontend and functions back to the old database:

```bash
cd /Users/mac/fom-play
VITE_FIRESTORE_PRIMARY_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
VITE_FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
npm run build
XDG_CONFIG_HOME=/Users/mac/fom-play/.firebase-config npx firebase-tools deploy --only hosting --project gen-lang-client-0996764238
```

```bash
cd /Users/mac/fom-play
FIRESTORE_PRIMARY_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
XDG_CONFIG_HOME=/Users/mac/fom-play/.firebase-config \
npx firebase-tools deploy --only functions --project gen-lang-client-0996764238
```

After rollback:

- turn saver mode on manually if you need emergency read reduction
- stop broad testing
- inspect logs before trying cutover again
