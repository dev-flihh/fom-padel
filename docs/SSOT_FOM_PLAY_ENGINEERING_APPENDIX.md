# FOM Play Engineering Appendix

Last Updated: 2026-05-12 (Asia/Jakarta)
Primary Reference: `docs/SSOT_FOM_PLAY.md`

## 1. Scope
Dokumen ini menjelaskan implementasi teknis inti yang paling penting untuk engineer:
- app bootstrap
- active match lifecycle
- persistence and restore
- stats pipeline
- rooms
- Firestore ownership model
- hosting/runtime packaging

## 2. Runtime Shell Model
- Root `/` saat build akhir diisi static blog landing artifact
- React app shell disalin ke `archive.html`
- `/app` dan marketing routes tertentu rewrite ke `archive.html`
- service worker aktif untuk app route, bukan seluruh site

Practical implication:
- perubahan app shell dan perubahan landing/blog sekarang harus dipikirkan sebagai dua surface yang berbeda

## 3. Auth Bootstrap Flow
Saat `onAuthStateChanged` berhasil:
1. restore local players
2. restore local active tournament
3. restore cached history
4. fetch `users/{uid}`
5. fetch `player_stats/{uid}`
6. normalize mmr / totalMatches / wins / losses
7. fallback ke `users.activeTournament` bila local active tournament tidak usable
8. fetch cloud history

Auth bootstrap juga menangani:
- admin-role backfill untuk email admin tertentu
- normalization legacy MMR awal
- merge Firebase Auth profile dengan Firestore profile
- room deep links via `?room={roomId}` after auth state is resolved

## 4. Tournament Draft And Generation

### Draft source
Draft utama hidup di state `tournament` dan dicache ke:
- local storage
- `users/{uid}.activeTournament`

### Generation path
`Match Settings` menghasilkan object tournament settings lalu:
- sanitize inactive players
- generate rounds according to format
- assign new `tournament.id` bila belum ada
- reset share state
- route ke `background-picker`

### Background step
Background final baru masuk ke tournament state setelah user continue atau skip.

## 5. Round Lifecycle

### Active round
- round aktif adalah round pertama yang masih punya match `status === active`
- CTA `Next Round` akan finalize current round dulu

### Historical score edits
Kalau score pada ronde lama diubah dan hasilnya valid untuk standings:
- app menandai future schedule invalid
- `needsRegenerateFromRound` diset
- user harus delete round terkait dan generate ulang lewat flow existing

### Active player changes
- perubahan roster aktif tidak mengubah ronde yang sedang berjalan
- perubahan berlaku mulai ronde berikutnya
- active roster save can also replace manual players with registered FOM friends
- replacement rewrites tournament players, byes, match team references, and inactive IDs

### Court changes
- court changes disimpan sebagai `courtChanges[]`
- perubahan berlaku mulai ronde berikutnya

## 6. Format-Specific Implementation Notes

### Americano
- pre-generated full schedule
- balancing uses repeated-partner and repeated-opponent penalties
- future rounds can be rebuilt after structural changes

### Mexicano
- only first round generated initially
- subsequent rounds generated after standings evolution

### Match Play
- point model stored per match in `pointsA`, `pointsB`, `currentSet`, and team `sets`
- score progression is imperative and stateful

## 7. Standings Computation
Standings are computed client-side from tournament rounds currently loaded in memory.

Current sort:
1. wins desc
2. points differential desc
3. total points desc
4. player name asc

Important note:
- standings are not currently sourced from `player_stats`
- standings are tournament-local, while `player_stats` is cross-tournament aggregate ranking

## 8. Share System

### Host side
- host writes `sharedMatches/{shareId}`
- same share ID is reused when possible for the same active tournament
- share ID is cached locally per `(uid, startedAt)`
- share payloads strip oversized inline image data and player avatars before Firestore writes

### Viewer side
- viewer subscribes directly to the `sharedMatches` doc
- screen resolves to `active` or `klasemen` based on query params
- viewer remains read-only

### Safety note
- `sharedMatches` is public-readable by rules
- payload should therefore be treated as public tournament view data
- app supports a `skipSharePersistence` flag for e2e/offline-style flows that still need share UX feedback without writing the shared document

## 9. History Model

### Finalized history write path
When tournament is finished on client:
- finalized rounds are constructed
- `endedAt` is assigned
- Firestore `tournament_details/{id}` and summary `tournaments/{id}` are written with large inline images and player avatars stripped
- local `tournaments` state prepends the new history item only after the cloud save succeeds
- if the cloud save fails, the finalized active tournament is kept as a recovery snapshot and the finish flow is blocked

### History read path
Current cloud fetch aims to:
1. use `player_match_ledger` as the participation SSOT
2. collect tournament IDs from ledger
3. fetch related tournament docs
4. fallback when ledger path fails

### Read-only replay
Archived tournaments are replayed by converting `TournamentHistory` into a read-only `Tournament` object for `active` and `klasemen`.

## 9A. Rooms Model

### Current implementation surface
- `src/features/rooms/RoomListScreen.tsx`
- `src/features/rooms/RoomEditorScreen.tsx`
- `src/features/rooms/RoomDetailScreen.tsx`
- `src/features/rooms/RoomMatchSetupScreen.tsx`
- `src/features/rooms/useRooms.ts`
- `src/features/rooms/roomRepository.ts`
- `src/features/rooms/roomMappers.ts`
- `src/features/rooms/types.ts`

### Data source
- collection constant: `ROOMS_COLLECTION = 'rooms'`
- repository uses primary `db`
- hosted room list currently reads the collection and filters by `hostUid` client-side, then sorts by `scheduledFor asc`
- public upcoming list currently reads the collection and filters by `visibility = public` plus `scheduledFor >= Date.now()` client-side, then sorts by `scheduledFor asc`
- host room setup saves `settings` and `matchSetupConfiguredAt`
- invite sharing builds `/app?room={roomId}` text and uses native share, clipboard, or prompt fallback

### Launch path
When a host starts a room:
1. verify caller is room host
2. verify room status is `scheduled`
3. verify `matchSetupConfiguredAt` exists
4. verify joined players meet `max(4, minPlayers)`
5. convert joined room participants into match `Player` records
6. map room `settings` into a fresh tournament draft
7. call normal tournament generation
8. persist active tournament snapshot
9. update room to `in_progress`
10. write `launchedTournamentId` and `launchPayload`
11. route to `active`

### Implementation caveats
- participant join / leave currently rewrites the room `participants` array after a document read
- room repository currently uses broad collection reads and client-side filters, which should be revisited before scale
- invite, cancellation, completion, and private/friends discoverability are modeled but not fully productized
- current rules are MVP-level: authenticated read, public unauthenticated read when `visibility = public`, host create/delete/update, and authenticated participant-array updates

## 10. Ranking And Stats Pipeline

### Source collections
- `player_stats`
- `player_match_ledger`
- `tournament_stat_runs`

### Finalization trigger
Cloud Function `onTournamentFinalized` runs when a tournament document is written and meets finalization conditions.

### Idempotency
- `statsVersion` on tournament
- `tournament_stat_runs/{tournamentId}`

### Aggregate writes
Per eligible registered participant:
- increment `player_stats.mmr`
- increment `player_stats.totalMatches`
- increment `player_stats.wins`
- increment `player_stats.losses`
- mirror MMR and total matches into `users`

### Ledger writes
Each participant-match combination gets one immutable ledger row with:
- tournament metadata
- score context
- average team MMR context
- before/after MMR
- base and modifier deltas
- human-readable reason labels

## 10A. Collection-To-Database Map

### Primary database: `fom-play-sg`
Gunakan database ini untuk semua source of truth produk.

- `users`
- `player_stats`
- `tournaments`
- `tournament_details`
- `rooms`
- `player_match_ledger`
- `users/{uid}/history_summary`
- `users/{uid}/friends`
- `users/{uid}/friendRequests`
- `users/{uid}/sentFriendRequests`
- `users/{uid}/notifications`

### Ephemeral database: `ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`
Gunakan database ini untuk public-share, draft, derived snapshot, dan operational sidecar data.

- `sharedMatches`
- `active_tournament_drafts`
- `leaderboard_snapshots`
- `leaderboard_refresh_state`
- `feedback_submissions`
- `tournament_stat_runs`

### Decision rule
- Jika data adalah identitas user, ranking agregat, history permanen, ledger, atau trigger source backend, simpan di primary DB.
- Jika data adalah planning match yang harus bertahan sampai diluncurkan sebagai tournament, simpan di primary DB.
- Jika data bisa direbuild, hanya dipakai untuk restore sementara, atau aman diperlakukan sebagai public/share snapshot, simpan di ephemeral DB.
- Jangan memecah satu flow bisnis inti ke dua database bila keduanya mewakili source of truth yang sama.

### Code ownership points
- Frontend database routing hidup di `src/firebase.ts`
- Frontend call sites utama hidup di `src/App.tsx`
- Backend database routing hidup di `functions/index.js`
- Bila menambah collection baru, engineer harus menambahkan collection itu ke appendix ini pada PR yang sama

## 11. Rollback Pipeline
Cloud callable `deleteTournamentHistory` handles destructive rollback for finalized tournaments.

What it does:
- validate caller ownership or admin privilege
- query all ledger rows for tournament
- aggregate rollback amounts by uid
- decrement `player_stats`
- decrement mirrored `users`
- delete ledger rows
- delete `tournament_stat_runs`
- delete tournament doc

This means finalized delete is not a UI-only delete. It is a real stats rollback.

## 12. Firestore Ownership Model

### User-owned docs
- `users/{uid}`
- `users/{uid}/friends/*`
- `users/{uid}/friendRequests/*`
- `users/{uid}/sentFriendRequests/*`
- `users/{uid}/notifications/*`
- `tournaments/{tournamentId}` when `userId == auth.uid`
- `rooms/{roomId}` when `hostUid == auth.uid`
- `tournaments/{tournamentId}` read access also applies to authenticated participants with matching `users/{uid}/history_summary/{tournamentId}`
- `tournament_details/{tournamentId}` read access also applies to authenticated participants with matching `users/{uid}/history_summary/{tournamentId}`

### Public-read docs
- `sharedMatches/{shareId}`
- `rooms/{roomId}` only when room visibility and product rules explicitly allow it

### Server-controlled docs
- `player_stats/*`
- `player_match_ledger/*`
- `tournament_stat_runs/*`

### Admin-only operational docs
- `feedback_submissions/*` read/update/delete

## 13. Profile Photo Storage Strategy
Current upload path is multi-stage by design:
1. client resizes image
2. writes Firestore fallback `photoURL` as data URL
3. mirrors same to `player_stats`
4. syncs Firebase Auth profile photo
5. attempts canonical Storage upload
6. if upload succeeds, replaces Firestore/Auth photoURL with Storage download URL
7. old Storage object cleanup is attempted best-effort

Reason:
- user should still succeed even when Storage path is flaky

## 14. Local Persistence Keys
- `gas_padel_players_{uid}`
- `fom_play_active_tournament_{uid}`
- `fom_play_tournament_history_{uid}`
- `fom_play_share_id_{uid}_{startedAt}`
- `fom_share_network_host`

## 15. Important Engineering Caveats
- history by participation is stronger after ledger pipeline exists, but full participant history still depends on readable tournament docs
- standings are computed client-side per loaded tournament, not server-side materialized
- dual-database routing is intentional: primary DB is the product SSOT, while legacy DB is limited to ephemeral/derived collections
- `sharedMatches` and `active_tournament_drafts` may keep the legacy database ID visible in the frontend bundle by design; that alone is not evidence of a failed cutover
- route/hosting changes can create documentation drift quickly because app shell and landing shell now diverge
- some docs and comments may still use older mental models like “hybrid homepage”; current build packaging should override those assumptions
- rooms currently use primary `db`; seeing `rooms` in the primary database is expected, not a failed ephemeral routing decision
- because room participation rewrites an array, concurrent join / leave behavior needs extra care if rooms are opened to larger public usage
- local active cache, shared payloads, and finalized history writes strip large inline image data / tournament player avatars to avoid oversized storage and public payload bloat

## 16. Firestore Observability

### Frontend runtime markers
- `recordDbMetric(...)` in `src/App.tsx` now accepts optional `dbRole` and `collection`
- the helper stores local per-day summaries in `localStorage`
- the same helper emits one deduplicated analytics event `firestore_route` per session for each `(dbRole, collection, operation, flow, label)` combination

### Local debugging
- open the app and run `window.__fomDbMetrics.summary()` to inspect current per-day totals
- `dbRoleSummary` shows primary vs ephemeral usage split
- `collectionRanking` shows the heaviest tagged collections for the current day

## 17. When To Update This Appendix
Update this file if there are changes in:
- auth bootstrap
- route packaging / hosting rewrites
- share sync
- rooms lifecycle, rules, indexes, or database routing
- history sourcing
- Cloud Functions behavior
- Firestore collection roles or collection-to-database routing
- rollback logic
- Storage strategy
