# Firestore Route Analytics Playbook

Last Updated: 2026-04-29 (Asia/Jakarta)

## Tujuan
Dokumen ini membantu reviewer non-engineer membaca event analytics `firestore_route` setelah rollout dual-database.

Event ini dipakai untuk menjawab pertanyaan:
- flow ini menuju database primary atau ephemeral?
- collection apa yang disentuh oleh flow tersebut?
- apakah ada source-of-truth collection yang salah masuk ke DB legacy?

## Event Yang Dipakai

### Event name
- `firestore_route`

### Event parameters
- `db_role`
- `collection_name`
- `firestore_operation`
- `flow_name`
- `route_label`
- `page_path`
- `app_surface`

## Arti Parameter

### `db_role`
- `primary`: operasi diarahkan ke `fom-play-sg`
- `ephemeral`: operasi diarahkan ke `ai-studio-27d60198-41b0-4446-92d0-3c510bc94635`

### `collection_name`
Nama collection yang ditandai oleh call site, misalnya:
- `player_stats`
- `tournaments`
- `sharedmatches`
- `active_tournament_drafts`
- `feedback_submissions`
- `leaderboard_snapshots`

Catatan:
- nama sudah dinormalisasi ke snake/lowercase style
- beberapa label agregat memang disengaja, misalnya `users+player_stats` atau `tournament_details+tournaments`

### `firestore_operation`
- `read`
- `write`
- `delete`
- `listen`
- `skip`
- `error`

Interpretasi:
- `skip` biasanya artinya flow itu sengaja tidak hit Firestore, misalnya saver mode
- `error` adalah sinyal routing yang gagal, bukan volume usage

### `flow_name`
Contoh flow:
- `login`
- `leaderboard`
- `finalize`
- `share_host`
- `share_viewer`
- `feedback_submit`
- `feedback_inbox`

### `route_label`
Label finer-grained dalam satu flow, misalnya:
- `profile_bootstrap`
- `active_draft_restore`
- `share_current_match`
- `share_standings`
- `tournament_detail_and_summary`

## Setup Di GA4 / Firebase Analytics

Jika parameter belum terlihat rapi di report, register custom definitions berikut di GA4:

- Event-scoped dimension: `db_role`
- Event-scoped dimension: `collection_name`
- Event-scoped dimension: `firestore_operation`
- Event-scoped dimension: `flow_name`
- Event-scoped dimension: `route_label`
- Event-scoped dimension: `page_path`
- Event-scoped dimension: `app_surface`

Catatan operasional:
- custom definitions tidak berlaku retroaktif untuk data lama
- event bisa muncul dulu di DebugView/Realtime sebelum nyaman dipakai di report standar

## Report Yang Disarankan

### Realtime sanity check
Gunakan saat habis smoke test.

Lihat:
- event name `firestore_route`
- parameter `db_role`
- parameter `collection_name`
- parameter `flow_name`

Target:
- saat login/profile/history/finalize, event yang muncul dominan `db_role=primary`
- saat share/draft/feedback, event yang muncul `db_role=ephemeral`

### Explorations report
Buat free-form exploration dengan:

- Rows:
  - `db_role`
  - `collection_name`
  - `flow_name`
- Columns:
  - optional `firestore_operation`
- Values:
  - `Event count`
  - `Total users`

Tujuannya bukan billing presisi, tapi routing evidence.

## Pola Yang Dianggap Sehat

### Harus terlihat di `primary`
- `player_stats`
- `tournaments`
- `tournament_details+tournaments`
- `users+player_stats`

### Harus terlihat di `ephemeral`
- `sharedmatches`
- `active_tournament_drafts`
- `feedback_submissions`
- `leaderboard_snapshots`

### Masih normal jika kedua DB muncul
Ini sehat selama collection-nya sesuai peta. Dual-DB memang sengaja menghasilkan event di kedua role.

## Red Flags

Investigasi jika Anda melihat:

- `db_role=ephemeral` untuk:
  - `player_stats`
  - `tournaments`
  - `users`
  - `player_match_ledger`
- `db_role=primary` untuk:
  - `sharedmatches`
  - `active_tournament_drafts`
  - `feedback_submissions`
  - `leaderboard_snapshots`
- event `error` muncul berulang pada flow share, draft, finalize, atau feedback

## Cara Membaca Event Count Dengan Benar

Jangan baca event ini sebagai “jumlah read/write Firestore sebenarnya”.

Karena desainnya:
- event dideduplicate per session untuk kombinasi routing yang sama
- tujuan event adalah membuktikan arah database, bukan menghitung billing

Untuk volume sebenarnya, tetap gunakan:
- Firestore usage dashboard
- local runtime helper `window.__fomDbMetrics.summary()`

## Triage Cepat

Jika ada sinyal merah:

1. Cocokkan event `firestore_route` yang aneh
2. Buka [FIRESTORE_DUAL_DB_POST_DEPLOY_MONITORING.md](/Users/mac/fom-play/docs/FIRESTORE_DUAL_DB_POST_DEPLOY_MONITORING.md:1)
3. Cek collection map di [SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md](/Users/mac/fom-play/docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md:1)
4. Audit routing di:
   - `src/firebase.ts`
   - `src/App.tsx`
   - `functions/index.js`

## Decision Rule Singkat Untuk Non-Engineer

- Jika event menyebut ranking, history, profile, tournament final, atau social data, expected role = `primary`
- Jika event menyebut share, draft, feedback, atau leaderboard snapshot materialized, expected role = `ephemeral`
