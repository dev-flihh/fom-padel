# FOM Play SSOT / Product-Technical PRD

Last Updated: 2026-04-24 (Asia/Jakarta)
Document Basis: current workspace codebase snapshot, including latest local source changes
Owner: Product / Engineering (FOM Play)

## 0. Purpose
This document is the single source of truth for how FOM Play works today in code.

It is intentionally broader than a changelog. It combines:
- PRD-style product behavior
- screen-by-screen user actions
- feature logic and constraints
- current persistence model
- current Firestore / Storage / Functions architecture

If code and documentation differ, the codebase is the source of truth and this document must be updated in the same work batch.

## 1. Product Summary
FOM Play is a mobile-first PWA for running social and competitive padel sessions from a phone.

Primary user jobs:
- create a match quickly
- select players from self, friends, and manual entries
- run Americano, Mexicano, or Match Play
- update scores live during play
- view live or final standings
- share live progress and standings through read-only links
- track long-term MMR and match history
- manage profile and friends

Primary user roles:
- Host: creates and manages the active match
- Player: can join the ecosystem as a registered user, appear in ranking, and become a friend
- Shared Viewer: opens a read-only shared link without needing edit permission
- Admin: can read admin-only feedback inbox and use admin-protected server-managed datasets

## 2. Current Product Scope
Supported match formats:
- Americano
- Mexicano
- Match Play

Supported major surfaces:
- authenticated app shell under `/app`
- public marketing pages inside the React marketing shell on selected routes
- static blog / landing artifact at the root hosting entrypoint
- read-only shared live and standings links via query params

Core promises:
- resume active match after refresh / reopen
- persist history and player progression
- keep standings available during and after play
- keep ranking based on server-managed aggregates for registered FOM users

## 3. Stack And Runtime
- Frontend: React 19 + TypeScript + Vite
- Motion / animation: `motion`
- Styling: utility-first CSS in app codebase
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions
- Hosting: Firebase Hosting
- PWA: `vite-plugin-pwa`
- Analytics: Firebase Analytics + custom click / page / scroll tracking

## 4. Current Route And Hosting Model

### 4.1 Public / app entrypoints
- Main authenticated app shell: `/app`
- Marketing routes served by React archive shell: `/fitur`, `/format/americano`, `/format/mexicano`, `/format/match-play`, `/ranking`, `/faq`, `/edukasi/perbedaan-americano-vs-mexicano`
- Static blog / landing artifact is copied to hosting root `/`
- `/blog` is also present as a static blog path

### 4.2 Current build packaging
Build currently prepares hosting entrypoints like this:
- `dist/archive.html` = React app shell
- `dist/index.html` = copied from `dist/blog/index.html`

Implication:
- root `/` is no longer the old hybrid React homepage described in the previous SSOT
- `/app` and React marketing routes rewrite to `archive.html`

### 4.3 Shared routes
- Live shared match: `?shared={shareId}`
- Shared standings: `?shared={shareId}&view=klasemen`

Shared links are read-only.

## 5. App Navigation Map
Current internal `screen` model:
- `login`
- `dashboard`
- `settings`
- `background-picker`
- `active`
- `klasemen`
- `notifications`
- `history`
- `history-detail`
- `leaderboard`
- `rank-discovery`
- `mmr-history`
- `profile`
- `friends`

Notes:
- legacy `preview` is no longer part of the active flow
- match generation now routes to `background-picker` before entering `active`

## 6. Domain Model

### 6.1 Core app entities
- `Player`: player identity used inside tournament logic
- `Tournament`: active editable match state
- `Round`: grouping of matches and byes
- `Match`: per-court game record
- `CourtChange`: future-effective court count changes
- `TournamentHistory`: finalized tournament archive
- `UserProfile`: user account profile and ranking snapshot
- `Friend`: friend network profile reference
- `FriendRequest`: pending / accepted / declined social connection request
- `PlayerMatchLedgerEntry`: immutable per-player match-level MMR ledger row
- `AppNotification`: in-app notification item

### 6.2 Important Tournament fields
- `format`: `Americano` | `Mexicano` | `Match Play`
- `criteria`: standings criteria choice, currently `Matches Won` or `Points Won`
- `scoringType`: `Golden Point` or `Advantage` for Match Play
- `backgroundId`: selected visual background for active / standings presentation
- `inactivePlayerIds`: players parked for upcoming rounds
- `courtChanges`: future-effective court count changes
- `startedAt` / `endedAt`: lifecycle timestamps

## 7. Screen-By-Screen Product Spec

## 7.1 Login (`screen = login`)
What user can do:
- register with email and password
- sign in with email and password
- continue with Google
- continue with Apple on supported desktop Apple environments
- request password reset email

Current feature logic:
- registration creates / merges a `users/{uid}` profile document
- social login uses popup flow
- app warns users when browser storage limitations may break Google / Apple auth
- password reset checks existing sign-in methods first to avoid telling passwordless users to reset a password they do not have
- there is no active OTP phone login flow in current code, despite older documentation

Important constraints:
- email/password provider must be enabled
- Google provider must be enabled for Google sign-in
- Apple provider must be enabled for Apple sign-in
- browser environments that block temporary auth storage may fail social sign-in

## 7.2 Dashboard (`screen = dashboard`)
What user can do:
- start a new match
- continue an existing active match
- jump to ranking from the current user card
- open notifications
- open full history list
- open a recent history item directly

What the page shows:
- welcome header
- current MMR, rank tier, and 7-day MMR delta
- active match summary if an active round exists
- recent finished history cards

Current feature logic:
- 7-day MMR delta is derived from `player_match_ledger`
- 7-day MMR delta is locally cached to reduce repeated dashboard reads
- continue match CTA shows the first active match in the current active round
- recent history is sorted newest first and limited on dashboard

## 7.3 Match Settings (`screen = settings`)
What user can do:
- set match name
- set venue name
- search location / court area
- choose format
- choose standings criteria
- choose Match Play scoring type
- choose number of courts
- choose number of rounds
- choose total points for non-Match-Play formats
- select players from the current local catalog
- add manual players
- open friend picker
- generate match

Player sources:
- current signed-in user is auto-injected into player catalog
- FOM friends are hydrated with latest `player_stats` MMR when possible
- manual players are local tournament players with manual IDs and no registered account dependency

Current feature logic:
- location autocomplete tries Google Places first when configured, then falls back to Photon / Nominatim
- selected players are deduped by ID
- selected players are kept in sync with the broader local player catalog
- player integrity recovery removes duplicates and restores missing selected players
- `Generate Match` is locked until selected player count is at least `courts * 4`
- self player cannot be removed from the local player catalog
- generated settings reset `inactivePlayerIds` and regenerate rounds in the next step

Standings / scoring setup notes:
- `criteria` is used for standings-oriented formats
- `scoringType` only affects Match Play point progression
- total points picker is hidden for Match Play

## 7.4 Match Background Picker (`screen = background-picker`)
What user can do:
- choose a background from the app-curated pool for the selected format
- skip selection and use a random background
- continue into active match

Current feature logic:
- background pool is format-specific
- chosen background is saved into `tournament.backgroundId`
- skip action chooses a random format-compatible background

## 7.5 Active Match (`screen = active`)
What user can do:
- view all rounds and current match state
- expand / collapse rounds
- update scores
- update Match Play point progression
- open standings
- share live match link
- swap players inside a match
- edit total rounds
- edit court count
- edit active players for upcoming rounds
- add new manual player during an active match
- delete future rounds from a chosen round onward
- delete the active match entirely
- continue to next round

What the page shows:
- format-themed live match screen
- tournament meta, elapsed time, venue / date
- save status badge: `saving`, `saved`, `error`
- round cards with status, duration, and court information

Score editing logic:
- non-Match-Play score editor keeps both team scores bounded by total points
- Match Play uses tennis-like point progression through `0 -> 15 -> 30 -> 40 -> Ad/Game`
- Golden Point removes `Ad` and converts 40-40 directly into game point
- completed Match Play set/game state is kept stable to avoid corrupting finished set counts

Round progression logic:
- current round is finalized before moving on
- for non-Match-Play, incomplete scores trigger a confirmation before continuing
- if older completed rounds are edited in a way that affects standings, the app flags future rounds as invalid and requires deletion/regeneration from the impacted round onward
- if active players drop below 4, next round is blocked

Live roster logic:
- active-player edits apply starting from the next round
- court count changes apply starting from the next round
- new manual players added during active play join from the next round
- for Americano, future rounds are rebuilt whenever roster / active player / court changes require it

Deletion logic:
- deleting a live unfinished match clears active local state, clears cloud `activeTournament`, and deletes associated `sharedMatches` doc when applicable
- deleting a finalized match also calls the Cloud Function rollback path that removes tournament history and reverses server-side player stats / ledger entries

Read-only behavior:
- shared viewers cannot modify scores, players, or structure
- history-detail match view also opens inside `active` as read-only

## 7.6 Standings / Klasemen (`screen = klasemen`)
What user can do:
- view live standings while a tournament is running
- view final standings for finished history
- share standings link
- export/share Story Image
- return to active match or history context

What the page shows:
- format-themed standings page
- live / ended badge
- tournament progress summary
- sorted standings table
- story export preview

Standings logic:
- standings are computed from tournament rounds and matches currently loaded in memory
- standings include live entered scores, not just completed matches
- sort order is:
  - wins descending
  - points differential descending
  - total points descending
  - name ascending
- displayed `matches` count is strictly `W + L + D`

Share logic:
- host can share a read-only standings URL through `sharedMatches`
- shared viewers can re-share the same standings URL but cannot edit anything
- story export renders a 1080x1920 PNG using DOM-to-image
- browser share is attempted first when supported; download fallback is used otherwise
- live shared match payload is intentionally milestone-based, not per-score live sync
- score edits stay local to host until the host advances to the next round or finishes the tournament

## 7.7 Notifications (`screen = notifications`)
Current product status:
- notification feature is temporarily disabled
- notification inbox is hidden from the app shell
- local toast notifications are disabled
- app must not write to `users/{uid}/notifications`
- notification code is retained behind a feature flag for future reuse

## 7.8 History (`screen = history`)
What user can do:
- browse finished tournament archive
- open any archived tournament

What the page shows:
- archive summary cards
- counts for events, matches, players, latest event date
- newest-first archive list

Current feature logic:
- archive list is sorted newest first
- archive list is written to local cache for fast restore
- cloud fetch attempts to hydrate history from player participation ledger first, then fallback strategies

## 7.9 History Detail (`screen = history-detail`)
What user can do:
- inspect event summary
- open final standings
- open round / match detail view
- jump between round groups

What the page shows:
- tournament metadata
- format, players, rounds, match counts
- grouped completed matches by round

Current feature logic:
- `Round Details` opens the archived tournament inside read-only `active`
- `View Final Standings` opens the archived tournament inside `klasemen`
- round chip navigation scrolls to grouped sections

## 7.10 Leaderboard (`screen = leaderboard`)
What user can do:
- view global ranking
- filter ranking by province
- open ranking guide
- open own MMR history

What the page shows:
- summary cards for current user rank, MMR, total matches
- ranked user list
- global vs province filter controls

Leaderboard logic:
- primary source is `player_stats`
- `leaderboard_snapshots` is treated as a short-lived cache, not the ranking SSOT
- app only uses snapshot data when it is still fresh; stale snapshot reads fall back to direct `player_stats` query
- fallback source is legacy `users` data when needed
- non-organic / placeholder players are excluded
- sort order is:
  - MMR descending
  - total matches descending
  - display name ascending
- province filter uses the last segment of `region` or `homeBase`

## 7.11 Rank Discovery (`screen = rank-discovery`)
What user can do:
- read rank tier ladder
- understand MMR system explanation
- jump to personal MMR history

Current feature logic:
- rank ladder is static in code and tied to MMR thresholds
- Hall of Fame is presented as top 100 only
- copy clarifies that upset bonus and favorite penalty come from pre-match average team MMR, not live leaderboard position after the match

## 7.12 MMR History (`screen = mmr-history`)
What user can do:
- inspect personal MMR ledger entries
- filter by time range: `7d`, `30d`, `all`
- filter by result: `all`, `win`, `loss`, `draw`
- jump back to rank discovery

What the page shows:
- current MMR summary
- grouped ledger timeline
- MMR deltas per entry
- reason labels for each result

Current feature logic:
- source of truth is `player_match_ledger`
- data subscribes live through Firestore snapshot
- entries are sorted newest first
- each row can include:
  - result
  - MMR before / after
  - base delta
  - modifier delta
  - reason labels
  - match / tournament context

## 7.13 Profile (`screen = profile`)
What user can do:
- view own profile card and performance summary
- upload profile photo
- edit display name, username, phone number, and home base
- open MMR history
- notification entrypoint is currently disabled
- open friends
- send password reset link
- submit product feedback
- if admin, open feedback inbox and update feedback status
- log out

Profile logic:
- profile save merges into `users/{uid}`
- photo upload path is resilient:
  - resize image client-side
  - save compressed data URL fallback into Firestore first
  - mirror photo URL into `player_stats`
  - sync auth profile photo
  - then attempt canonical Storage upload to `profile-photos/{uid}/avatar.jpg`
  - if Storage upload fails, Firestore data URL fallback is retained
- profile stats card prefers server SSOT from `player_stats`, with tournament-derived fallback for some display calculations
- live `player_stats` listener is only attached while the app is visible and the user is on stats-heavy screens such as dashboard, profile, leaderboard, rank discovery, MMR history, or friends
- admin feedback inbox reads `feedback_submissions`

## 7.14 Friends (`screen = friends`)
Modes:
- profile mode
- match-settings picker mode

What user can do in profile mode:
- search users by username, email, or phone number
- send friend requests
- review incoming friend requests
- accept or decline requests
- browse current friend list

What user can do in picker mode:
- select or deselect friends as tournament players
- review currently selected friends
- finish and return to match settings

Friends logic:
- friend list lives under `users/{uid}/friends`
- incoming requests live under `users/{uid}/friendRequests`
- sent requests live under `users/{uid}/sentFriendRequests`
- accepted requests create reciprocal friend documents for both users
- friend list is enriched with latest `player_stats` MMR where available
- friends screen uses a short session cache to reduce repeated reads when the screen is reopened
- picker mode toggles friend presence inside `tournament.players`
- selecting a friend also ensures the friend exists in the broader local `allPlayers` catalog
- friend `lastPlayedAt` can be updated when a friend is brought into match flow

## 8. Match Format Logic

## 8.1 Americano
Generation model:
- all rounds are pre-generated at match creation
- only active players are considered
- players are prioritized by lower current match count first
- algorithm tries to minimize repeated partners and repeated opponents
- algorithm also avoids immediate repeated partners using a heavier penalty

Operational implications:
- future Americano rounds can be rebuilt if active roster, inactive players, or court count changes
- if historical scores are edited, future Americano rounds may need regeneration

## 8.2 Mexicano
Generation model:
- only first round is generated up front
- next rounds are generated progressively
- fairness of match-count distribution is prioritized first
- standing logic then influences pairing / ordering

Operational implications:
- Mexicano is more sensitive to score changes because future rounds depend on prior performance
- editing earlier rounds can invalidate future generated rounds

## 8.3 Match Play
Generation model:
- first round is generated from a shuffled active roster
- match score uses set / game / point fields

Scoring model:
- points progress through tennis-like progression
- `Golden Point` and `Advantage` are both supported
- set win is currently simplified around six-game lead by two games

## 8.4 Shared Viewer Logic
- shared viewer opens tournament state from `sharedMatches/{shareId}`
- shared viewer can switch between active and standings mode
- shared viewer is read-only everywhere

## 9. Ranking, Stats, And History Logic

## 9.1 Server-side stats pipeline
Current stats SSOT is server-managed.

When a tournament document is finalized:
- Cloud Function `onTournamentFinalized` runs on `tournaments/{tournamentId}`
- function prevents duplicate application using `tournament_stat_runs/{tournamentId}`
- function reads participant baseline MMR from `player_stats`, with `users` fallback
- function computes participant summaries and immutable match ledger rows
- function increments `player_stats`
- function does not mirror finalized MMR or total match increments back into `users`; frontend prefers `player_stats` as stats SSOT
- function writes `player_match_ledger`
- leaderboard snapshot refresh is no longer tied to every ranking stat change; automatic refresh is reserved for profile/location changes while ranking reads can fall back directly to `player_stats`

## 9.2 MMR formula
Current formula:
- win with score diff under 10: `+25`
- win with score diff 10 or more: `+40`
- loss with score diff under 10: `-20`
- loss with score diff 10 or more: `-35`
- underdog win bonus: `+15`
- favorite loss penalty: `-15`
- draw: `0`

Team strength logic:
- underdog / favorite is decided from average pre-match team MMR
- manual players and non-Firebase IDs do not participate in server MMR updates

## 9.3 History sourcing
Current app attempts:
1. read `player_match_ledger` for the current user
2. resolve tournament IDs from ledger rows
3. fetch tournament documents for those tournaments
4. fallback to owner-based tournament query if ledger path fails

Important note:
- `tournaments` documents are owner-scoped by rules
- participant history hydration therefore depends on what the current client is allowed to read and may fall back to owner-oriented history behavior

## 9.4 Deleting finalized history
Deleting a finalized tournament:
- calls `deleteTournamentHistory`
- removes tournament doc
- deletes all related `player_match_ledger` entries
- rolls back `player_stats`
- deletes `tournament_stat_runs` marker

## 10. Persistence And Sync

## 10.1 Local storage keys
- player catalog: `gas_padel_players_{uid}`
- active tournament draft / session: `fom_play_active_tournament_{uid}`
- tournament history cache: `fom_play_tournament_history_{uid}`
- share ID per active tournament: `fom_play_share_id_{uid}_{startedAt}`
- optional network host override for local sharing: `fom_share_network_host`

## 10.2 Restore order on login
Current restore sequence:
1. restore local player catalog
2. restore local active tournament, but ignore ended/finalized drafts
3. restore local history cache immediately
4. fetch `users/{uid}` and `player_stats/{uid}`
5. merge normalized user data
6. if no useful local active tournament exists, fallback to cloud `users/{uid}.activeTournament`, but ignore ended/finalized snapshots
7. fetch tournament history from cloud strategy

## 10.3 Active tournament sync
- active tournament is always cached locally for signed-in non-shared users
- active tournament cloud sync is milestone-based, not time-based
- app writes `users/{uid}.activeTournament` only on important host actions such as creating a match, sharing, changing courts, deleting rounds, advancing to the next round, or deleting the match
- when a tournament is finished, app does not persist the full final tournament snapshot back into `activeTournament`; instead it clears cloud active state with a lightweight fresh draft payload to avoid stale restore and reduce write size
- adding players during an active match, changing active-player setup, changing total rounds, and swapping players stay local first and are only persisted when the next milestone save happens
- score edits and live point updates stay local until one of those milestone actions happens
- UI save state badge reflects `saving`, `saved`, or `error`

## 10.4 Finalization sync feedback
- after final tournament save, the app watches `tournaments/{tournamentId}`
- host UI can show `Stats syncing`, then `Stats updated` once `statsVersion` / `statsAppliedAt` is present
- this feedback is informational only; stats SSOT remains server-managed in Firestore and Cloud Functions

## 10.5 History cache
- tournament history array is cached locally
- cloud history fetch merges with local cache by ID and prefers newer dates
- non-history screens can refresh only a recent subset first, while history/profile flows still hydrate the broader archive when needed

## 10.6 Shared match sync
- active host writes `sharedMatches/{shareId}`
- current active share ID is reused when possible
- share ID can be restored from local storage for the same active tournament
- shared viewers subscribe live to the shared document
- score edits do not sync to `sharedMatches` immediately
- active shared payload sync happens when the host advances to the next round
- final shared payload sync also happens when the host finishes the tournament

## 11. Current Technical Data Storage

## 11.1 Firestore collections

### `users/{uid}`
Purpose:
- canonical user profile
- active match restore source
- mirrored ranking snapshot

Common fields in code:
- `uid`
- `email`
- `displayName`
- `username`
- `photoURL`
- `phoneNumber`
- `mmr`
- `totalMatches`
- `wins`
- `losses`
- `region`
- `homeBase`
- `locationActivity`
- `role`
- `activeTournament`
- `activeTournamentUpdatedAt`
- `createdAt`

### `users/{uid}/friends/{friendUid}`
Purpose:
- friend graph for the current user

Common fields:
- `uid`
- `displayName`
- `photoURL`
- `username`
- `mmr`
- `addedAt`
- `lastPlayedAt`

### `users/{uid}/friendRequests/{requesterUid}`
Purpose:
- incoming friend requests for target user

Common fields:
- requester / target IDs
- requester identity snapshot
- status
- timestamps

### `users/{uid}/sentFriendRequests/{targetUid}`
Purpose:
- outgoing friend requests from requester side

### `users/{uid}/notifications/{notifId}`
Purpose:
- per-user inbox

Current status:
- writes are temporarily disabled
- legacy documents may still exist from older builds

Common fields:
- `id`
- `title`
- `message`
- `timestamp`
- `type`
- `read`

### `tournaments/{tournamentId}`
Purpose:
- finalized tournament history documents
- source event for server-side stats aggregation

Stored fields include:
- tournament summary
- players snapshot
- rounds snapshot
- court changes
- location / venue
- lifecycle timestamps
- `statsVersion`
- `statsAppliedAt`

### `sharedMatches/{shareId}`
Purpose:
- read-only shared tournament payload for live / standings viewers

Common fields:
- `tournament`
- `hostUid`
- `createdAt`
- `updatedAt`

### `player_stats/{uid}`
Purpose:
- server-controlled aggregate ranking SSOT

Common fields:
- `uid`
- `displayName`
- `photoURL`
- `mmr`
- `totalMatches`
- `wins`
- `losses`
- `lastTournamentId`
- `lastUpdatedBy`
- `lastMatchAt`
- `updatedAt`

### `player_match_ledger/{entryId}`
Purpose:
- immutable per-player, per-match MMR ledger

Common fields:
- `id`
- `uid`
- `playerName`
- `tournamentId`
- `tournamentName`
- `matchId`
- `roundId`
- `matchSequence`
- `format`
- `team`
- `scoreFor`
- `scoreAgainst`
- `scoreDiff`
- `result`
- `teamSummary`
- `opponentSummary`
- `teamAverageMmr`
- `opponentAverageMmr`
- `isUnderdog`
- `isFavorite`
- `mmrBefore`
- `mmrAfter`
- `baseDeltaMmr`
- `modifierDeltaMmr`
- `deltaMmr`
- `reasonCode`
- `reasonLabel`
- `baseReasonLabel`
- `modifierCode`
- `modifierLabel`
- `hostUid`
- `playedAt`
- `createdAt`
- `source`

### `tournament_stat_runs/{tournamentId}`
Purpose:
- idempotency guard so finalized tournament stats are applied once

### `feedback_submissions/{feedbackId}`
Purpose:
- product feedback inbox

Common fields:
- user identity snapshot
- category
- message
- route / viewport / user-agent context
- status
- app version / provider IDs
- created and reviewed metadata

## 11.2 Firebase Storage
Current primary path:
- `profile-photos/{uid}/avatar.jpg`

Purpose:
- canonical hosted profile photo asset

Fallback:
- if Storage upload fails, Firestore data URL can still temporarily hold profile photo data

## 11.3 Local-only data
Stored in browser local storage:
- local player catalog
- active tournament draft / session
- tournament history cache
- persisted share ID for active session
- optional network host override for local network sharing

## 12. Access Control And Rules Summary

### 12.1 Authenticated read/write behavior
- `users`: readable by authenticated users; writable by owner; admin has broader privileges
- `friends`: owner reads; owner and certain self-document writes allowed
- `friendRequests` / `sentFriendRequests`: scoped to owner or involved actor
- `notifications`: rule remains in place for legacy compatibility, but app writes are currently disabled
- `tournaments`: owner or admin read/write/delete
- `sharedMatches`: public read; authenticated host-owned write/delete

### 12.2 Server-controlled collections
- `player_stats`: admin-only write
- `player_match_ledger`: admin-only write
- `tournament_stat_runs`: admin-only write
- `feedback_submissions`: authenticated users create, admin reads/updates

## 13. PWA And Client Runtime Behavior
- service worker is actively registered only for `/app`
- non-app routes clear registered service workers and caches
- app checks updates immediately, on interval, and on foreground
- zoom prevention is enabled for mobile app-like feel
- theme color changes dynamically based on active surface / format

## 14. Analytics And Instrumentation
- page view tracking for app screens and marketing routes
- click / button tracking through DOM heuristics
- scroll depth tracking for milestones
- analytics user sync includes app surface type

Tracked surface examples:
- iOS web
- iOS PWA
- Android web
- Android PWA
- desktop web

## 15. Current Build / Deploy Notes
- `npm run build` runs Vite build, then `scripts/prepare-hosting-entrypoints.mjs`
- blog migration / cutover tooling exists in scripts and docs
- current codebase includes helper scripts for blog prepare / deploy phases
- Firebase Functions are deployed from `functions/`

## 16. Known Product / Technical Realities
- login currently supports email, Google, and Apple; phone OTP is not an active product surface
- legacy preview screen is gone from the current flow
- ranking now depends on server-managed `player_stats`, not only `users`
- history hydration for non-owner participants depends on readable tournament documents and fallback logic
- root hosting behavior has shifted from old React hybrid homepage assumptions to a blog-first landing artifact in current build packaging

## 17. Documentation Update Policy
Every feature or logic change must update this SSOT in the same work batch when it affects:
- user-facing screen behavior
- routing or navigation
- match logic
- ranking logic
- persistence or restore behavior
- database schema or collection usage
- permissions / rules assumptions

## 18. Recent Codebase Milestones
This log reflects relevant repo milestones for the current behavior described above. It is a codebase reference, not a guaranteed production deploy log.

### 2026-04-23 (`efb354f`)
- Route packaging and blog cutover checkpoint
- Current hosting model reinforced around root landing/blog plus `/app` archive shell

### 2026-04-19 (`8452aca`)
- Ranking screen UX unified and polished
- Current leaderboard, rank discovery, and MMR history experience shaped here

### 2026-04-19 (`ff4cbc1`)
- Match settings rating seed switched to `player_stats` SSOT

### 2026-04-19 (`c24d096`)
- Friend request MMR resolution moved to `player_stats` SSOT

### 2026-04-19 (`fe65bc0`)
- Profile and friends data hydration improved from `player_stats`

### 2026-04-19 (`4d2bf96`)
- Server-side stats pipeline and backfill introduced
- `player_stats`, `player_match_ledger`, and stats application workflow became core to ranking/history behavior
