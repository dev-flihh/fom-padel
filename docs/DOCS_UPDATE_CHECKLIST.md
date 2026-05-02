# Docs Update Checklist (Wajib)

Gunakan checklist ini setiap ada perubahan fitur, logic, data model, route, atau deployment behavior.

## 1. Dokumen Utama Yang Harus Dicek
- `docs/SSOT_FOM_PLAY.md`
- `docs/SSOT_FOM_PLAY_EXEC_SUMMARY.md`
- `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`

## 2. Checklist Global
- Update `Last Updated`.
- Pastikan behavior yang ditulis sesuai codebase saat ini, bukan rencana lama.
- Pastikan route, flow, dan istilah screen masih sesuai implementasi aktif.
- Pastikan data source disebut jelas: local state, Firestore, Storage, atau Cloud Functions.
- Pastikan section auth, share, persistence, dan ranking ikut dicek bila terdampak.

## 3. Matrix Wajib Update Per Area

### Auth / Login
Update jika ada perubahan pada:
- email/password flow
- Google / Apple login
- password reset
- browser compatibility warning

Wajib cek:
- `7.1 Login` di SSOT utama
- auth section di exec summary bila user-facing
- persistence / bootstrap notes di engineering appendix bila flow bootstrap berubah

### Dashboard / Home App
Update jika ada perubahan pada:
- CTA utama
- continue match card
- MMR summary
- recent history block

Wajib cek:
- `7.2 Dashboard`
- exec summary bagian user journey

### Match Settings
Update jika ada perubahan pada:
- field setup
- player selection
- friend picker entry
- court / round / points setup
- location search provider
- validation minimum player

Wajib cek:
- `7.3 Match Settings`
- domain model bila field tournament berubah
- engineering appendix bagian tournament draft and generation

### Background Picker
Update jika ada perubahan pada:
- flow setelah generate
- background source
- random background behavior

Wajib cek:
- `7.4 Match Background Picker`

### Active Match
Update jika ada perubahan pada:
- score editing
- Match Play scoring
- next round logic
- round deletion / regeneration
- active player edit
- court change
- share live match
- delete active / finalized match

Wajib cek:
- `7.5 Active Match`
- `8. Match Format Logic`
- persistence section
- engineering appendix bagian round progression, share sync, delete flow

### Standings / Klasemen
Update jika ada perubahan pada:
- sorting rules
- live standings behavior
- final standings behavior
- Story export
- share standings

Wajib cek:
- `7.6 Standings / Klasemen`
- ranking / stats logic bila formula atau source berubah

### Notifications
Update jika ada perubahan pada:
- inbox rendering
- read / clear behavior
- notification creation source

Wajib cek:
- `7.7 Notifications`
- engineering appendix bila write path Firestore berubah

### History / History Detail
Update jika ada perubahan pada:
- archive source
- history hydration
- read-only history detail flow
- open final standings / round details

Wajib cek:
- `7.8 History`
- `7.9 History Detail`
- ranking / history sourcing section

### Leaderboard / Rank Discovery / MMR History
Update jika ada perubahan pada:
- ranking source
- sort order
- province filter
- rank tiers
- MMR formula
- ledger rendering / filters

Wajib cek:
- `7.10 Leaderboard`
- `7.11 Rank Discovery`
- `7.12 MMR History`
- `9. Ranking, Stats, And History Logic`
- engineering appendix backend stats section

### Profile
Update jika ada perubahan pada:
- profile fields
- photo upload flow
- password reset
- feedback submission
- admin feedback inbox

Wajib cek:
- `7.13 Profile`
- technical storage section bila photo path / fallback berubah

### Friends
Update jika ada perubahan pada:
- friend search
- friend request lifecycle
- picker mode
- reciprocal friend creation

Wajib cek:
- `7.14 Friends`
- Firestore collection section
- rules / permission summary bila security model berubah

### Routes / Marketing / Hosting
Update jika ada perubahan pada:
- `/app`
- public routes
- root landing behavior
- blog cutover / archive shell behavior
- hosting rewrites

Wajib cek:
- `4. Current Route And Hosting Model`
- exec summary deployment snapshot
- engineering appendix hosting/runtime section

### Data Model / Firestore / Functions
Update jika ada perubahan pada:
- collection names
- document shapes
- Storage paths
- Cloud Functions
- rules
- local storage keys

Wajib cek:
- `6. Domain Model`
- `10. Persistence And Sync`
- `11. Current Technical Data Storage`
- `12. Access Control And Rules Summary`
- engineering appendix technical sections

## 4. Commit / Release Hygiene
- Tambahkan ringkasan perubahan pada commit message atau release note internal.
- Bila perubahan user-facing besar, tambahkan milestone singkat di akhir `docs/SSOT_FOM_PLAY.md`.
- Jangan tulis deployment log palsu. Kalau status production belum pasti, tandai sebagai codebase milestone saja.

## 5. Google Docs Sync
Setelah dokumen final:
- jalankan `npm run docs:sync:gdocs`

Sebelum run, pastikan env tersedia:
- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_WEBHOOK_SECRET`
