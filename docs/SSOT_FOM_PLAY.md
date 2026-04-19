# FOM Play SSOT (Single Source of Truth)

Last Updated: 2026-04-11 (Asia/Jakarta)
Owner: Product/Engineering (FOM Play)

## 1. Product Scope
FOM Play is a mobile-first PWA for padel tournament setup, live match tracking, standings, sharing, ranking, and player community connection.

Main goals:
- Run Americano, Mexicano, and Match Play quickly.
- Track live score and standings.
- Share read-only live view to non-host players.
- Persist data safely across app close/reopen.

## 2. Core Tech Stack
- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS + Motion
- Backend: Firebase (Auth, Firestore, Storage)
- Hosting: Firebase Hosting
- PWA: `vite-plugin-pwa` with service worker auto-update

## 3. Environments and URLs
- Primary hosting URL: `https://gen-lang-client-0996764238.web.app`
- Custom domain target: `https://fomplay.asia` (when SSL fully active)

## 4. Data Model (Canonical)
From `src/types.ts`:
- `Player`: player identity, avatar, initials, stats snapshot
- `Tournament`: setup + active state (`format`, `players`, `rounds`, `numRounds`, venue/city)
- `Round`: `matches[]` + `playersBye[]`
- `Match`: team A/B, score, duration, startedAt, status
- `TournamentHistory`: finished tournament archive
- `Friend`: friend profile (`uid`, name, rank/mmr, recency metadata)

Firestore collections:
- `users/{uid}`: profile + active state metadata
- `users/{uid}/friends/{friendUid}`: friend list
- `users/{uid}/notifications/{notifId}`: in-app notifications
- `tournaments/{tournamentId}`: completed tournament history
- `sharedMatches/{shareId}`: read-only shared live/standings payload

## 5. Persistence Strategy
### 5.1 Local persistence
- Active tournament cached per user in local storage.
- Players list cached per user.
- Tournament history cached per user.

### 5.2 Cloud persistence
- Completed tournaments saved to Firestore `tournaments`.
- Active tournament autosave throttled to `users/{uid}.activeTournament`.
- Shared match payload synced to `sharedMatches`.

### 5.3 Restore behavior
On login:
- Load local cache first for fast UI restore.
- Merge/refresh with Firestore data.
- If local active tournament empty, fallback to cloud `activeTournament`.

## 6. Screen-by-Screen Feature Reference

## 6.1 Login (`screen = login`)
Features:
- Email/password register/login.
- Google sign-in.
- Forgot password.
- OTP phone login flow scaffold.

Rules:
- Email provider must be enabled in Firebase Auth.
- Register writes user profile to `users/{uid}`.

## 6.2 Dashboard / Beranda (`screen = dashboard`)
Features:
- Active tournament widget and continue CTA.
- Tournament history summary access.
- Entry points to settings, ranking, notifications.

## 6.3 Match Settings (`screen = settings`)
Features:
- Input game name.
- Input venue name and city search.
- Select format: Match Play / Americano / Mexicano.
- Scoring/ranking criteria controls.
- Courts / rounds / set points with preset + custom.
- Player pool and selection.
- Friend section (always visible) before manual player list.

Friend section behavior:
- If no friends: empty state CTA to Friends screen.
- If has friends: quick list with circular avatar, name, rank.
- Sorted by recency (`lastPlayedAt` then `addedAt`, then name).
- “Lihat Semua” opens full Friends picker mode.

## 6.4 Friends (`screen = friends`)
Modes:
- Profile mode: standard friend management.
- Settings picker mode: choose friends into current match setup.

Features:
- Search user by username/email/phone.
- Add friend to Firestore subcollection.
- In picker mode, toggle friend as selected player for tournament.
- Back from picker mode returns to Match Settings.

## 6.5 Match Preview (`screen = preview`)
Features:
- Pre-start overview of generated rounds/matches.
- Start tournament action.
- Top sticky nav.

## 6.6 Match Active (`screen = active`)
Features:
- Live match cards by round.
- Score editing popup.
- Player swap by tapping player identity.
- Standings entry point.
- Share live link button.
- Round progression button.
- Edit rounds popup (“Ubah Ronde”).
- Save-state badge: `Menyimpan...`, `Tersimpan`, `Gagal Simpan`.

Rules:
- Read-only shared viewers cannot modify scores/players.
- Next round logic depends on format.
- Tournament finish routes to standings.

## 6.7 Standings / Klasemen (`screen = klasemen`)
Features:
- Live standings and final standings views.
- Share standings link.
- Themed visual per format.
- Bottom nav hidden.

Data source:
- Uses current active tournament state or selected history tournament.

## 6.8 Notifications (`screen = notifications`)
Features:
- List, mark as read, clear all.

## 6.9 Profile (`screen = profile`)
Features:
- User profile display.
- Profile photo update.
- Season performance card (real data, no hardcoded growth).
- Entry to friends.

## 6.10 Leaderboard (`screen = leaderboard`)
Features:
- MMR ranking list.
- Region filter.
- Challenge CTA.

## 6.11 Rank Discovery (`screen = rank-discovery`)
Features:
- Rank tier explanation and MMR calculation guide.

## 6.12 History Detail (`screen = history-detail`)
Features:
- Finished tournament details.
- Entry point to final standings.

## 7. Match Format Logic

## 7.1 Americano
- Pre-generates rounds.
- Partner/opponent diversity balancing algorithm.
- Supports in-active-session round count update.

## 7.2 Mexicano
- Round generated progressively.
- Prioritizes fair match count distribution first.
- Then applies standing logic (`W / points / diff` based on criteria).

## 7.3 Match Play
- Tennis-like point progression (`0,15,30,40,Ad,Game`).
- Supports Golden Point or Advantage.

## 8. Sharing Logic
- Host creates/updates `sharedMatches/{shareId}`.
- Viewer opens `?shared={id}` (active) or `?shared={id}&view=klasemen`.
- Shared view is read-only.
- Share flow attempts clipboard, fallback to Web Share / prompt.

## 9. PWA Behavior
- Install button available in top nav context.
- App name target on home screen: `FOM Play`.
- Auto update strategy enabled.
- Extra update checks on foreground and interval.
- Zoom prevention enabled for app-like UX.

## 10. Known Operational Dependencies
- Firebase Auth providers must be enabled (Email/Password, Google as needed).
- Firestore rules must allow scoped read/write per design.
- Custom domain SSL issuance may take propagation time.

## 11. Release Process (Current)
1. Local changes.
2. Build verification (`npm run build`).
3. Commit to `main` when approved.
4. Push to GitHub.
5. Deploy Firebase Hosting.

## 12. Documentation Update Policy (Mandatory)
Every feature/logic change must update this SSOT in the same work batch.

Required update points:
- Affected screen section.
- Data model/rules changes.
- Any new navigation or share behavior.
- Any persistence behavior changes.

## 13. Production Deploy Version Log

Format entry:
- Version: commit hash
- Production Push Date: `YYYY-MM-DD HH:mm (Asia/Jakarta)`
- Scope: perubahan utama yang user-facing

### v2026.04.11-a (`e997472`)
- Production Push Date: 2026-04-11 00:32 (Asia/Jakarta)
- Scope:
  - Menambahkan cache riwayat turnamen di local storage per akun.
  - Restore riwayat dari cache lokal saat login, lalu merge dengan Firestore.
  - Menambahkan autosave tournament aktif ke cloud (`users/{uid}.activeTournament`) dengan throttle.
  - Menambahkan indikator status simpan di halaman pertandingan aktif (`Menyimpan...`, `Tersimpan`, `Gagal Simpan`).
  - PWA metadata dan update flow disempurnakan (nama app dan auto-update behavior).

### v2026.04.11-b (`6dc05cc`)
- Production Push Date: 2026-04-11 00:23 (Asia/Jakarta)
- Scope:
  - Menambahkan section Teman di Match Setting (selalu tampil, sebelum daftar pemain manual).
  - Menambahkan empty state Teman + CTA ke halaman Friends.
  - Menambahkan quick friends list (avatar bulat, nama, rank) dan tombol `Lihat Semua`.
  - Menambahkan picker mode di Friends untuk pilih teman langsung ke roster match setting.
  - Menambahkan recency sorting untuk teman (`lastPlayedAt`/`addedAt`).

### v2026.04.10-a (`23b1db2`)
- Production Push Date: 2026-04-10 21:34 (Asia/Jakarta)
- Scope:
  - Menambahkan fitur `Ubah Ronde` pada halaman pertandingan aktif.
  - Menambahkan popup edit jumlah ronde saat match berjalan.
  - Menambahkan validasi aman saat menurunkan/menaikkan ronde.
  - Menambahkan pre-generate ronde tambahan untuk Americano jika ronde dinaikkan.
