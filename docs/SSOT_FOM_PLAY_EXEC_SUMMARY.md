# FOM Play Executive Summary

Last Updated: 2026-05-12 (Asia/Jakarta)
Source Of Truth: `docs/SSOT_FOM_PLAY.md`

## 1. What FOM Play Is
FOM Play adalah PWA mobile-first untuk mengelola game padel dari HP, mulai dari setup pemain sampai live scoring, klasemen, sharing, ranking, dan history.

Core value saat ini:
- host bisa setup game dengan cepat
- host bisa schedule room sebelum game day dan kumpulkan peserta dulu
- score bisa diupdate live
- hasil dan klasemen bisa dibagikan
- performa pemain tersimpan sebagai history dan MMR

## 2. Product Surfaces Today
- App utama untuk user login ada di `/app`
- Root `/` saat ini berperan sebagai landing/blog artifact hasil build
- Public marketing routes tetap ada di shell React untuk route tertentu
- Shared match dan shared standings dibuka lewat query `?shared=...`
- Room invite dibuka lewat query `?room=...`

## 3. Main User Journey
Flow utama user saat ini:
1. Login atau register
2. Masuk dashboard
3. Start Match
4. Set nama game, venue, format, struktur match, dan pemain, atau buat Room untuk jadwal mendatang
5. Generate match
6. Pilih background visual
7. Masuk ke Active Match
8. Update skor ronde demi ronde
9. Buka standings kapan saja
10. Finish match dan simpan ke history
11. Lihat ranking, MMR history, profile, dan friends

## 4. Key Product Modules

### Match Operations
- Match Settings
- Rooms
- Background Picker
- Active Match
- Live Standings
- History / History Detail

### Identity And Social
- Login
- Profile
- Friends
- Notifications

### Progression
- Leaderboard
- Rank Discovery
- MMR History

## 5. What Makes The Current Version Different
- Ranking sekarang tidak lagi bergantung hanya pada `users`
- SSOT statistik player sekarang berbasis `player_stats`
- Riwayat perubahan MMR sekarang berbasis `player_match_ledger`
- Match generation flow sekarang melewati `background-picker`
- Rooms MVP sekarang tersedia untuk scheduled match planning, participant join/leave, dan launch ke active match
- Rooms sekarang punya invite link, share text, host match setup, dan guard `matchSetupConfiguredAt` sebelum start
- Payload active/share/history sekarang menghapus inline image besar dan avatar player sebelum disimpan
- Root hosting behavior sekarang sudah berubah dari asumsi lama “hybrid homepage”

## 6. Current Business Logic Highlights
- Minimal pemain untuk generate match adalah `courts * 4`
- Minimal pemain untuk start room adalah `max(4, minPlayers)` dari peserta yang sudah join
- Room harus punya match setup tersimpan sebelum host bisa start room
- Americano pre-generate semua ronde
- Mexicano generate ronde berikutnya secara progresif
- Match Play punya scoring `Golden Point` dan `Advantage`
- Edit skor ronde lama bisa mengharuskan regenerasi ronde berikutnya
- Share links selalu read-only untuk viewer
- Delete finalized history akan rollback stats server-side

## 7. Data And Persistence Snapshot
- Active match disimpan lokal dan di `users/{uid}.activeTournament`
- Rooms disimpan di Firestore `rooms`
- Room setup disimpan ke `rooms/{roomId}.settings` dan `matchSetupConfiguredAt`
- History disimpan di local cache dan Firestore `tournaments`
- Shared payload disimpan di `sharedMatches`
- Ranking aggregate disimpan di `player_stats`
- Riwayat delta MMR disimpan di `player_match_ledger`
- Profile photo canonical disimpan di Firebase Storage, dengan fallback Firestore bila upload gagal

## 8. Primary Product Risks To Watch
- Perubahan route/hosting mudah membuat docs cepat basi
- History participant non-owner bergantung pada ledger, `history_summary`, dan permission dokumen tournament
- Edit skor ronde lama bisa bikin ronde masa depan tidak valid
- Rules, visibility semantics, broad read behavior, dan concurrent participant updates untuk `rooms` perlu dijaga sebelum rollout luas
- Social login sensitif terhadap browser yang membatasi temporary auth storage

## 9. Recommended Reading By Role
- Product / Ops: baca dokumen ini lalu `docs/SSOT_FOM_PLAY.md`
- Engineering: baca `docs/SSOT_FOM_PLAY.md` lalu `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`
- Release / QA: baca `docs/DOCS_UPDATE_CHECKLIST.md`
