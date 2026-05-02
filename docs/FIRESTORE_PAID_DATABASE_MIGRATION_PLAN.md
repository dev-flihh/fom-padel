# Firestore Paid Database Migration Plan

## Goal

Move production traffic from the current free-tier-limited Firestore database:

- Source: `ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`

to a second paid Firestore database:

- Destination: `fom-play-sg`

The app and Functions must remain rollback-friendly until the new database is verified.

## Current Safe State

- Saver mode is available in the frontend as a manual emergency switch to reduce automatic Firestore reads.
- The frontend primary database can switch via `VITE_FIRESTORE_PRIMARY_DATABASE_ID`.
- The frontend ephemeral database can switch via `VITE_FIRESTORE_EPHEMERAL_DATABASE_ID`.
- Cloud Functions primary database can switch via `FIRESTORE_PRIMARY_DATABASE_ID`.
- Cloud Functions ephemeral database can switch via `FIRESTORE_EPHEMERAL_DATABASE_ID`.
- `firebase.json` includes Firestore rules/indexes for both source and destination database IDs.
- Migration script exists at `scripts/migrate-firestore-database.mjs`.

## Phase 1: Create The Paid Database

1. Open Firebase Console or Google Cloud Console.
2. Create a second Firestore Native database.
3. Use database ID: `fom-play-sg`.
4. Use location: `asia-southeast1`, unless Google blocks same-location/multi-db constraints.
5. Confirm billing is active on the project.

Important: do not delete the old database.

## Phase 2: Deploy Rules And Indexes

Deploy Firestore rules/indexes after the new database exists:

```bash
XDG_CONFIG_HOME=/Users/mac/fom-play/.firebase-config npx firebase-tools deploy --only firestore --project gen-lang-client-0996764238
```

Verify indexes exist for:

- `player_stats`: global leaderboard sort.
- `player_stats`: province leaderboard sort.
- `player_match_ledger`: user MMR/history sort.
- `sharedMatches`: host active share discovery.

## Phase 3: Dry-Run Migration

Use a Firebase access token from the existing local Firebase CLI auth store or a fresh Google OAuth token.

Dry-run reads source counts and does not write destination:

```bash
npm run migrate:firestore:dry -- \
  --token "$FIRESTORE_MIGRATION_TOKEN" \
  --source ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
  --destination fom-play-sg \
  --page-size 100
```

Optional safer sample run:

```bash
npm run migrate:firestore:dry -- \
  --token "$FIRESTORE_MIGRATION_TOKEN" \
  --source ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
  --destination fom-play-sg \
  --max-docs 25
```

By default, `sharedMatches` is excluded because active share links are ephemeral. Add `--include-shared-matches` only if needed.

## Phase 4: Apply Migration

Apply only after dry-run counts look reasonable:

```bash
npm run migrate:firestore:apply -- \
  --token "$FIRESTORE_MIGRATION_TOKEN" \
  --source ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
  --destination fom-play-sg \
  --page-size 100 \
  --batch-size 100
```

Collections included by default:

- `users`
- `users/{uid}/friends`
- `users/{uid}/friendRequests`
- `users/{uid}/sentFriendRequests`
- `users/{uid}/notifications`
- `users/{uid}/history_summary`
- `player_stats`
- `leaderboard_snapshots`
- `leaderboard_refresh_state`
- `tournaments`
- `tournament_details`
- `player_match_ledger`
- `tournament_stat_runs`
- `active_tournament_drafts`
- `feedback_submissions`

## Phase 5: Validate Destination

Run limited read checks against `fom-play-sg`:

- A known user exists in `users`.
- The same user exists in `player_stats`.
- Their `history_summary` subcollection exists.
- `leaderboard_snapshots/global` exists.
- A recent tournament has both `tournaments/{id}` and `tournament_details/{id}`.

Do not run broad scans from the client.

## Phase 6: Cutover App

Deploy frontend with:

```bash
VITE_FIRESTORE_PRIMARY_DATABASE_ID=fom-play-sg \
VITE_FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
npm run build
XDG_CONFIG_HOME=/Users/mac/fom-play/.firebase-config npx firebase-tools deploy --only hosting --project gen-lang-client-0996764238
```

Then deploy Functions with:

```bash
FIRESTORE_PRIMARY_DATABASE_ID=fom-play-sg \
FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635 \
XDG_CONFIG_HOME=/Users/mac/fom-play/.firebase-config \
npx firebase-tools deploy --only functions --project gen-lang-client-0996764238
```

If usage spikes unexpectedly after cutover, turn saver mode on manually in the browser:

```js
window.__fomDbMetrics.saverMode.on()
```

## Phase 7: Monitor

For the first 24 hours:

- Check Firebase Firestore Usage.
- Check Cloud Functions logs.
- Check `window.__fomDbMetrics.table()` after each key flow.
- Watch budget alerts.
- Follow [FIRESTORE_PRODUCTION_SMOKE_TEST.md](/Users/mac/fom-play/docs/FIRESTORE_PRODUCTION_SMOKE_TEST.md) for the production checklist.

Key flows to test:

- Login
- Dashboard
- Create tournament
- Score match
- Share active match
- Finalize tournament
- History detail
- Leaderboard
- Friends search

## Rollback

If anything fails:

1. Redeploy hosting with `VITE_FIRESTORE_PRIMARY_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635` and `VITE_FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`.
2. Redeploy Functions with `FIRESTORE_PRIMARY_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635` and `FIRESTORE_EPHEMERAL_DATABASE_ID=ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`.
3. Keep old database untouched.
4. Turn saver mode on manually until the issue is understood.
