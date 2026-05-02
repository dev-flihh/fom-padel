# Firestore Dual-DB Post-Deploy Monitoring

Last Updated: 2026-04-29 (Asia/Jakarta)

## Tujuan
Checklist ini dipakai 1-3 hari setelah rollout dual-database untuk memastikan:
- source of truth benar-benar pindah ke `fom-play-sg`
- database legacy hanya dipakai untuk collection ephemeral yang memang disengaja
- tidak ada flow utama yang masih bocor ke database lama

## Database Target

### Primary DB
- `fom-play-sg`

Expected collections:
- `users`
- `player_stats`
- `tournaments`
- `tournament_details`
- `player_match_ledger`
- social subcollections under `users/*`

### Ephemeral DB
- `ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`

Expected collections:
- `sharedMatches`
- `active_tournament_drafts`
- `leaderboard_snapshots`
- `leaderboard_refresh_state`
- `feedback_submissions`
- `tournament_stat_runs`

## Daily Checks

### 1. Firestore usage overview
Open Firestore usage/billing view for both databases and compare:

- `fom-play-sg` should carry most reads/writes from login, profile, history, finalize, and social flows
- legacy DB should show lighter activity concentrated around share, draft restore/save, leaderboard snapshot, and feedback

Escalate if:
- legacy DB shows sustained growth that is similar to primary DB
- primary DB suddenly drops to near-zero while app traffic is still normal

### 2. Check legacy DB collection activity
Inspect collection list / usage concentration in legacy DB.

Healthy pattern:
- activity mostly appears in:
  - `sharedMatches`
  - `active_tournament_drafts`
  - `leaderboard_snapshots`
  - `leaderboard_refresh_state`
  - `feedback_submissions`
  - `tournament_stat_runs`

Investigate immediately if you see notable new activity in:
- `users`
- `player_stats`
- `tournaments`
- `tournament_details`
- `player_match_ledger`

That usually means there is still a production path hitting the wrong database.

### 3. Smoke test production flows
Run these flows on production:

- login with existing account
- open profile
- open history
- start active match and wait for autosave
- refresh/reopen app and confirm draft restore
- share active match
- open shared link as viewer
- finish tournament and wait for stats sync
- submit feedback

Expected DB behavior:
- login/profile/history/finalize use primary DB
- draft/share/feedback/snapshot use legacy DB

## Frontend Runtime Checks

### 4. Inspect local DB metrics
Open production app, then in browser console run:

```js
window.__fomDbMetrics.summary()
```

Important fields:
- `dbRoleSummary`
- `collectionRanking`
- `flowRanking`

Healthy pattern:
- `dbRoleSummary` shows both `primary` and `ephemeral`
- `primary` should dominate source-of-truth flows
- `ephemeral` should show collection names like `sharedMatches`, `active_tournament_drafts`, `feedback_submissions`, `leaderboard_snapshots`

Useful helper:

```js
window.__fomDbMetrics.table()
```

### 5. Analytics event validation
The app now emits deduplicated event `firestore_route` for tagged flows.

Reference:
- [FIRESTORE_ROUTE_ANALYTICS_PLAYBOOK.md](/Users/mac/fom-play/docs/FIRESTORE_ROUTE_ANALYTICS_PLAYBOOK.md:1)

Expected examples:
- `db_role=primary`, `collection_name=player_stats`
- `db_role=primary`, `collection_name=tournaments`
- `db_role=ephemeral`, `collection_name=sharedmatches`
- `db_role=ephemeral`, `collection_name=active_tournament_drafts`
- `db_role=ephemeral`, `collection_name=feedback_submissions`

Interpretation note:
- this event is deduplicated per session for each unique route signature
- it is intended as routing evidence, not as a precise billing counter

## Incident Triggers

Treat these as action items:

- legacy DB shows reads/writes on `users`, `player_stats`, `tournaments`, or `player_match_ledger`
- `firestore_route` events show source-of-truth collections under `db_role=ephemeral`
- draft/share/feedback flows stop working after deploy
- tournament finalization works but leaderboard snapshot no longer refreshes
- primary DB writes happen, but history/profile no longer reflect stats updates

## First Places To Check If Something Is Wrong

- frontend routing helpers in `src/firebase.ts`
- tagged client call sites in `src/App.tsx`
- backend routing in `functions/index.js`
- collection map in `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`

## Sign-Off Condition

The rollout can be considered stable when all of the following hold for at least 48 hours:

- primary DB owns all source-of-truth collections in practice
- legacy DB activity is limited to the approved ephemeral collection set
- production smoke tests pass
- no unexplained quota spikes appear on the legacy DB
