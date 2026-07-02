# PRD: Klasemen, Leaderboard, dan Pertandingan Aktif

Last Updated: 2026-06-11 (Asia/Jakarta)  
Owner: Product / Design / Engineering FOM Play  
Status: Draft PRD detail  
UI Language: English  
Document Language: Indonesian  
Basis: current implementation of `MatchActiveScreen`, `KlasemenScreen`, `LeaderboardScreen`, active match lifecycle, sharing flow, and leaderboard repository.

## 1. Ringkasan

Dokumen ini menjelaskan requirement produk untuk tiga surface penting di FOM Play:

1. `Pertandingan Aktif`: halaman operasional host untuk menjalankan match, input skor, mengatur round, dan menyelesaikan match.
2. `Klasemen`: standings live/final untuk satu match atau tournament yang sedang berlangsung atau sudah selesai.
3. `Leaderboard`: ranking global/provinsi berbasis MMR untuk pemain FOM yang terdaftar.

Ketiga surface ini saling terhubung tetapi memiliki tujuan berbeda:

- Pertandingan Aktif menjawab: "Apa yang harus host lakukan sekarang?"
- Klasemen menjawab: "Siapa yang sedang unggul di match ini?"
- Leaderboard menjawab: "Di mana posisi saya secara jangka panjang?"

## 2. Problem Statement

Host padel sering menjalankan match di lapangan dengan waktu terbatas. Tantangan utamanya:

- skor harus bisa diinput cepat tanpa spreadsheet
- round berikutnya harus jelas tanpa menghitung manual
- pemain sering bertanya klasemen live di tengah game
- hasil akhir harus siap dibagikan ke grup atau Story
- pemain ingin melihat dampak performa mereka ke ranking jangka panjang

Tanpa alur yang rapi, host menjadi admin manual, pemain kehilangan konteks kompetisi, dan data ranking jangka panjang sulit dipercaya.

## 3. Product Goals

Goals:

- Membuat host bisa menjalankan match dari HP dengan kontrol yang cepat, jelas, dan tahan kondisi lapangan.
- Membuat klasemen live selalu dapat dipahami oleh host, pemain, dan shared viewer.
- Membuat finalisasi match aman: hasil tersimpan, shared link terupdate, dan proses sinkronisasi stats transparan.
- Membuat Leaderboard global/provinsi menjadi tempat pemain memahami posisi, MMR, rank tier, dan progres kompetitif.
- Menjaga shared viewer tetap read-only agar link publik tidak bisa mengubah match.

Non-goals untuk scope ini:

- Mengubah algoritma MMR.
- Mengubah setup match sebelum generate.
- Mengubah Room scheduling sebelum match dimulai.
- Membuat payment, chat, atau notification automation baru.
- Membuat sistem dispute score.
- Membuat multi-set Match Play penuh atau tie-break Match Play.

## 4. Primary Users dan Role

### 4.1 Host

Host adalah user yang membuat atau meluncurkan match.

Kebutuhan:

- melihat ringkasan match, round, court, pemain aktif, dan timer
- input dan koreksi skor
- lanjut ke round berikutnya
- mengubah active players, court count, dan round count
- swap pemain ketika ada perubahan di lapangan
- menyelesaikan match dan menyimpan history
- membagikan active match, klasemen, dan story image

Hak akses:

- boleh edit selama match bukan read-only
- boleh delete/regenerate sesuai constraint
- boleh finish match
- boleh share link

### 4.2 Player / Registered User

Player adalah user FOM yang dapat muncul dalam match, klasemen, MMR history, dan Leaderboard.

Kebutuhan:

- melihat skor dan posisi klasemen dengan cepat
- melihat ranking global/provinsi
- melihat rank tier, MMR, total match, dan win rate jika tersedia
- membuka MMR history dan ranking guide

Hak akses:

- tidak otomatis boleh edit active match kecuali dia host
- boleh membuka Leaderboard
- boleh melihat shared match/standings link secara read-only

### 4.3 Shared Viewer

Shared Viewer adalah orang yang membuka link `?shared={shareId}` atau `?shared={shareId}&view=klasemen`.

Kebutuhan:

- melihat progress match atau klasemen tanpa login
- memahami bahwa halaman hanya view-only
- mendapat CTA ringan untuk mencoba FOM Play

Hak akses:

- tidak boleh input skor
- tidak boleh next round / finish
- tidak boleh edit pemain, round, court, atau delete match
- boleh melihat active match, round detail, klasemen, dan link FOM Play

## 5. Product Scope

### 5.1 In Scope

Pertandingan Aktif:

- visual match background sesuai format/theme
- summary match
- daftar round dan match
- score editor per format
- player swap
- active players editor
- round count editor
- court count editor
- regenerate/delete round
- delete active match
- next round / finish sticky CTA
- read-only shared viewer
- stats sync badge setelah match selesai

Klasemen:

- live/final standings untuk satu tournament
- summary progress match
- ranking player dengan W/L/D/M, diff, dan points
- share standings link
- story image export
- read-only shared viewer
- fallback empty/error-safe state

Leaderboard:

- ranking global
- ranking provinsi
- current user standing summary
- list pemain terdaftar FOM
- MMR, rank tier, total match, area, dan win rate
- cached leaderboard read
- fallback query jika snapshot stale atau gagal
- empty/loading state
- open ranking guide dan MMR history

### 5.2 Out of Scope

- Admin moderation leaderboard.
- Search pemain di Leaderboard.
- Pagination UI Leaderboard selain top result yang tersedia.
- Friend-only leaderboard.
- Share image untuk Leaderboard global.
- Manual correction setelah tournament sudah difinalisasi.
- Audit trail detail untuk setiap edit skor.

## 6. Navigation dan Entry Point

### 6.1 Pertandingan Aktif

Internal screen: `active`.

Entry point:

- setelah Match Settings dan Background Picker selesai
- dari Dashboard melalui continue active match
- dari Room Detail setelah host menekan Start Match
- dari Klasemen melalui `View Active Match`
- dari shared live link `?shared={shareId}`
- dari History Detail sebagai round detail untuk match selesai

### 6.2 Klasemen

Internal screen: `klasemen`.

Entry point:

- dari Pertandingan Aktif melalui tombol `Standings`
- setelah host menekan `Finish & Save History`
- dari History Detail
- dari shared standings link `?shared={shareId}&view=klasemen`

### 6.3 Leaderboard

Internal screen: `leaderboard`.

Entry point:

- dari Dashboard user ranking card
- dari Profile atau ranking-related navigation
- dari Rank Discovery / Ranking Guide flow jika ada CTA
- setelah stats sync selesai dan leaderboard refresh token berubah

## 7. Data Requirement

### 7.1 Tournament Data

Pertandingan Aktif dan Klasemen membutuhkan:

- `id`
- `name`
- `format`: `Americano`, `Mexicano`, atau `Match Play`
- `criteria`: `Matches Won` atau `Points Won`
- `scoringType`: `Golden Point` atau `Advantage` untuk Match Play
- `startedAt`
- `endedAt`
- `courts`
- `totalPoints`
- `numRounds`
- `durationMinutes`
- `venueName`
- `location`
- `backgroundId`
- `themeColorId`
- `players`
- `inactivePlayerIds`
- `courtChanges`
- `rounds`

### 7.2 Round Data

Setiap round membutuhkan:

- `id`
- `matches`
- `playersBye`

### 7.3 Match Data

Setiap match membutuhkan:

- `id`
- `court`
- `roundId`
- `status`: `active`, `completed`, atau `pending`
- `startedAt`
- `duration`
- `teamA.players`
- `teamA.score`
- `teamB.players`
- `teamB.score`
- `pointsA` dan `pointsB` untuk Match Play
- `currentSet` jika tersedia

### 7.4 Player Data

Player dalam tournament membutuhkan:

- `id`
- `name`
- `rating`
- `source`: `fom` atau `manual`
- `avatar`
- `initials`
- `stats.matches`
- `stats.won`
- `stats.lost`
- `stats.draw`
- `stats.diff`

### 7.5 Leaderboard Data

Leaderboard menggunakan sumber:

- `leaderboard_snapshots/{global|province_x}` sebagai fast path
- `player_stats` sebagai fallback query
- `users` legacy tidak menjadi sumber utama dalam current flow
- localStorage cache via `leaderboardCache`

Field minimum tiap leaderboard user:

- `uid`
- `displayName`
- `photoURL` atau `avatar`
- `mmr`
- `totalMatches`
- `region`
- `homeBase`
- `locationActivity`
- `wins`
- `losses`
- `province` untuk filter provinsi

## 8. Requirement Pertandingan Aktif

### 8.1 Layout dan Visual

Halaman harus mobile-first dan aman untuk penggunaan di lapangan.

Wajib menampilkan:

- background visual sesuai `backgroundId`, `format`, dan `themeColorId`
- header FOM Play dengan action share
- label read-only untuk shared viewer
- summary panel match
- warning regenerate jika skor round lama berubah
- daftar round
- match row per court
- sticky CTA Next Round / Finish untuk host
- CTA FOM Play untuk shared viewer belum login

### 8.2 Header

Header harus:

- menampilkan identitas FOM Play
- menyediakan share active match untuk host
- menyembunyikan action edit di read-only mode
- memberi sinyal bahwa shared viewer tidak bisa edit

Acceptance criteria:

- Shared viewer tidak melihat kontrol edit.
- Tap share membuat/menggunakan shared match snapshot.
- Header tetap terbaca di background terang maupun gelap.

### 8.3 Summary Panel

Summary panel harus menampilkan:

- match name
- venue, location, tanggal
- total elapsed timer
- mode/format
- active player count dibanding total player
- court count
- completed round dibanding total round
- link `Hosted with FOM Play`
- tombol settings untuk host
- tombol `Standings`

Jika stats sync state tersedia setelah match selesai:

- `syncing`: tampilkan bahwa leaderboard dan MMR history sedang diperbarui
- `synced`: tampilkan bahwa leaderboard dan MMR history sudah sinkron
- `error`: tampilkan bahwa hasil tersimpan tetapi sinkronisasi belum terkonfirmasi

### 8.4 Round List

Round list harus:

- menampilkan semua round yang ada
- membuka round aktif secara default
- membuat round non-aktif collapsed secara default
- menampilkan durasi round
- menampilkan players bye jika ada
- membedakan status `active`, `completed`, dan `pending`

Behavior:

- round aktif adalah round yang memiliki minimal satu match `active`
- jika tidak ada round aktif tetapi ada skor, tampilkan round terbaru dengan progress sebagai konteks
- round completed tetap bisa dibuka untuk review

### 8.5 Match Row

Setiap match row harus menampilkan:

- court number
- team A dan team B
- avatar atau initials pemain
- nama depan pemain
- score utama `{scoreA}-{scoreB}`
- status match
- Match Play points `(pointsA-pointsB)` jika relevan
- affordance edit score untuk host
- affordance swap player untuk round aktif host

Acceptance criteria:

- Nama panjang tidak merusak layout mobile.
- Score selalu tabular dan mudah dipindai.
- Shared viewer bisa melihat detail tetapi tidak bisa membuka editor.

### 8.6 Score Editor: Americano dan Mexicano

Host harus bisa:

- tambah skor per team `+1`
- kurang skor per team `-1`
- tambah cepat `+5`
- set team score ke `MAX`
- reset score ke `0-0`
- save & close

Rules:

- skor tidak boleh negatif
- skor tidak boleh melebihi `totalPoints`
- jika satu team diubah, skor lawan otomatis menjadi `totalPoints - scoreTeam`
- match dianggap ready jika total skor sama dengan `totalPoints` dan minimal satu skor lebih dari 0

Acceptance criteria:

- Input skor 13 dari total 21 otomatis membuat lawan 8.
- Score `0-0` tidak dianggap ready.
- Host bisa menyimpan skor incomplete, tetapi akan mendapat konfirmasi saat Next Round.

### 8.7 Score Editor: Match Play

Host harus bisa:

- tambah point untuk team A/B
- melihat game score dan point score
- reset match score
- save & close

Rules:

- urutan point normal: `0`, `15`, `30`, `40`, `Game`
- `Golden Point`: poin setelah `40-40` memenangkan game
- `Advantage`: poin setelah `40-40` memberi `Ad`, poin lawan mengembalikan ke `40-40`
- setelah game dimenangkan, score game bertambah dan points reset ke `0-0`
- set selesai jika team mencapai minimal 6 game dan unggul minimal 2 game
- point tambahan setelah set selesai tidak boleh mengubah hasil

### 8.8 Player Swap

Host dapat swap pemain hanya pada round aktif.

Requirement:

- replacement list berisi pemain tournament yang tidak sedang berada di match yang sama
- list menampilkan match count agar host bisa memilih fair replacement
- pemain FOM menampilkan MMR
- manual player diberi label manual/no MMR
- jika pemain replacement sebelumnya berada di bye list, pemain lama masuk ke bye list

### 8.9 Active Players Editor

Host dapat mengatur pemain aktif untuk round berikutnya.

Requirement:

- tampilkan semua pemain tournament
- support select all, clear all, dan toggle per player
- support add manual player
- support replace manual player dengan friend/FOM player
- simpan inactive player sebagai `inactivePlayerIds`
- perubahan berlaku mulai round berikutnya
- Americano harus regenerate future rounds setelah roster berubah

Acceptance criteria:

- Host tidak bisa lanjut ke round berikutnya jika active players kurang dari 4.
- Pemain inactive tidak muncul di generated next round.
- Manual replacement mempertahankan fairness sejauh data match count memungkinkan.

### 8.10 Round Count Editor

Requirement:

- minimum 1
- maksimum efektif 50
- tidak boleh lebih kecil dari round yang sudah dimainkan/locked
- jika input terlalu kecil, sistem menyesuaikan ke minimum valid
- Americano regenerate future rounds
- jika total round baru lebih besar dari completed rounds, `endedAt` harus dikosongkan

### 8.11 Court Count Editor

Requirement:

- minimum 1
- maksimum 12
- berlaku mulai round berikutnya
- tulis `courtChanges` berisi `effectiveFromRoundId`, `fromCourts`, `toCourts`, dan `changedAt`
- Americano regenerate future rounds

### 8.12 Regenerate / Delete Round

Requirement:

- hanya round 2 dan seterusnya yang bisa dipilih untuk delete/regenerate
- sistem meminta konfirmasi
- round sebelum active dinormalisasi sebagai completed
- jika setelah delete tidak ada round aktif, round terakhir tersisa menjadi active
- `needsRegenerateFromRound` dihapus setelah regenerate sukses

### 8.13 Delete Match

Requirement:

- host harus mendapat konfirmasi
- jika match sudah memiliki `endedAt`, copy konfirmasi harus menyebut history dan player stats bisa ikut terdampak
- jika match belum selesai, copy konfirmasi cukup menyebut active match akan dihapus
- delete tidak tersedia untuk shared viewer

### 8.14 Next Round / Finish CTA

CTA muncul jika:

- user bukan read-only
- tournament belum selesai
- ada round aktif

CTA menampilkan:

- round aktif
- jumlah match yang sudah memiliki score progress
- total match round aktif
- badge `Ready` untuk Americano/Mexicano jika semua score lengkap
- label `Next Round` jika belum round terakhir
- label `Finish & Save History` jika round terakhir

Next Round behavior:

- jika `needsRegenerateFromRound` aktif, block dan tampilkan feedback
- jika Americano/Mexicano score belum lengkap, tampilkan konfirmasi
- jika active players kurang dari 4, block
- mark round aktif sebagai completed
- isi duration
- aktifkan atau generate round berikutnya sesuai format
- sync active tournament snapshot
- sync shared snapshot jika pernah dishare

Finish behavior:

- mark round terakhir completed
- isi `endedAt`
- simpan tournament detail ke history
- simpan tournament summary
- update shared snapshot final
- clear active tournament jika save sukses
- arahkan ke Klasemen Final
- jika save gagal, pertahankan active match dan tampilkan error

## 9. Requirement Klasemen

### 9.1 Layout dan Visual

Halaman Klasemen harus menampilkan:

- background visual sesuai match
- header status `Live` atau `Ended`
- logo FOM Play
- install app button
- share menu
- label view-only untuk shared viewer
- summary standings
- ranking player
- tombol `View Active Match` atau `View Round Details`
- story export preview
- CTA FOM Play untuk shared viewer belum login

### 9.2 Header Status

Rules:

- tournament belum selesai: badge `Live` dengan pulse
- tournament selesai: badge `Ended`
- shared viewer: tampilkan konteks read-only

Acceptance criteria:

- Status tidak bergantung hanya pada `endedAt`; completion round juga dipakai sebagai sinyal.
- Header action tidak overflow di mobile narrow.

### 9.3 Summary Klasemen

Summary harus menampilkan:

- match name
- venue, location, tanggal
- total elapsed
- format/mode
- player count
- court count
- round progress
- match progress
- completion percentage
- progress bar
- hosted with FOM Play

Progress rules:

- displayed round = active round jika ada
- jika tidak ada active round, displayed round = latest scored round
- jika belum ada score, displayed round = completed rounds
- match progressed jika completed, score > 0, atau Match Play points bukan `0-0`

### 9.4 Ranking Player

Ranking row harus menampilkan:

- rank number
- avatar atau initials
- player name
- W/L/D/M
- points diff
- total points

Perhitungan:

- registry player dibangun dari `tournament.players`, semua match players, dan `playersBye`
- nama/avatar current user dan friend di-refresh dari profile/friend terbaru jika tersedia
- score dihitung jika match completed atau score > 0
- total points = akumulasi score team
- points diff = score team - score lawan
- W/L/D hanya dihitung dari match completed
- Matches = W + L + D

Sorting current behavior:

1. wins terbanyak
2. points diff tertinggi
3. total points tertinggi
4. nama alfabetis `id-ID`

Catatan produk:

- `criteria = Points Won` saat ini mempengaruhi Mexicano pairing, bukan sorting Klasemen match.
- Jika ingin Klasemen mengikuti criteria, perlu requirement dan implementation change terpisah.

### 9.5 Empty dan Fallback State

Requirement:

- jika tidak ada player, tampilkan empty state
- jika rounds kosong, halaman tidak crash
- jika belum ada countable round score, gunakan fallback `player.stats`
- jika avatar gagal/empty, gunakan initials

### 9.6 Share Standings Link

Host dapat membagikan standings link.

Requirement:

- jika host belum login, minta login
- jika active tournament pernah dishare, update snapshot
- URL format: `?shared={shareId}&view=klasemen`
- coba copy clipboard
- fallback ke Web Share API
- fallback ke prompt manual jika API tidak tersedia
- tampilkan feedback success/ready/failed

Shared viewer:

- share action cukup membagikan link standings yang sedang dibuka
- tidak boleh membuat edit-capable link

### 9.7 Story Image Export

Requirement:

- logical export 360 x 640
- output canvas 1080 x 1920
- memakai background match, logo, summary, ranking, footer
- maksimal 10 pemain per image
- jika pemain lebih dari 10, buat beberapa file
- filename memakai match name dan tanggal
- jika `navigator.share` mendukung files, share file langsung
- jika tidak, download PNG
- jika export gagal, buka preview dan tampilkan error

Acceptance criteria:

- 1 sampai 10 pemain menghasilkan 1 image.
- 11 sampai 20 pemain menghasilkan 2 image.
- Story tetap readable untuk nama pemain panjang.

## 10. Requirement Leaderboard

### 10.1 Layout dan Visual

Leaderboard harus menampilkan:

- App page header dengan eyebrow `Ranking`, title `Leaderboard`, dan subtitle
- scope control `Global` / `Province`
- current user standing card
- board header `Global Ranking` atau `Province Ranking`
- actions `History` dan `Guide`
- ranked user list
- loading state
- empty state
- region selector untuk provinsi

### 10.2 Scope Control

Requirement:

- default scope adalah `All Provinces` atau Global
- tap `Global` mengembalikan filter global
- tap `Province` membuka `RegionSelector`
- province selection mengubah query/cache key
- label province harus truncate jika panjang

### 10.3 Current User Standing Card

Card harus menampilkan:

- current rank jika user ada dalam rankedUsers
- MMR current user
- total matches
- rank tier

Rules:

- jika current user tidak ada di leaderboard result, rank tampil `-`
- jika current user photoURL lebih baru dari cached user, gunakan photoURL current user
- MMR ditampilkan melalui formatter ranking

### 10.4 Ranked User Row

Setiap row harus menampilkan:

- rank number atau medal chip untuk top 3
- avatar/fallback initials
- display name
- badge `You` untuk current user
- area/province label
- total match label
- win rate jika wins/losses tersedia
- formatted MMR
- rank tier badge

Sorting:

1. MMR tertinggi
2. total matches tertinggi
3. display name alfabetis lokal `id`

Filtering:

- tampilkan hanya registered FOM user
- exclude manual player ID prefix `manual_`
- exclude placeholder name `Player Padel` / `Pemain Padel`
- normalize legacy initial MMR 500 tanpa activity menjadi 0

### 10.5 Data Loading

Load order:

1. baca cache lokal untuk scope aktif
2. jika cache ada, render cache dan stop
3. jika Firestore saver mode aktif, skip read dan tampilkan empty state
4. baca `leaderboard_snapshots/{scope}`
5. jika snapshot fresh dan berisi user valid, gunakan snapshot
6. jika snapshot stale/kosong/gagal, fallback ke query `player_stats`
7. cache hasil query

Snapshot freshness:

- snapshot dianggap stale setelah 30 menit

Firestore query:

- global: order by `mmr desc`, `totalMatches desc`, `displayName asc`, limit 100
- province: where `province == selectedProvince`, order by `mmr desc`, `totalMatches desc`, `displayName asc`, limit 100

### 10.6 Loading, Empty, dan Error

Loading:

- tampilkan spinner dan copy `Loading ranking...`

Empty:

- tampilkan copy bahwa belum ada organic FOM players di ranking
- jelaskan hanya registered FOM accounts yang ditampilkan

Error:

- error fetch dicatat ke console dan `recordDbError`
- UI tidak crash
- jika semua source gagal, tampilkan empty state

### 10.7 Focus Current User

Requirement:

- jika `focusRequestId` berubah dan current user ada di list, scroll row user ke tengah
- highlight row user sementara
- highlight hilang otomatis setelah sekitar 1.7 detik

### 10.8 Ranking Guide dan MMR History

Actions:

- `Guide` membuka rank detail/ranking guide
- `History` membuka MMR history current user

Acceptance criteria:

- button tetap terlihat di Global dan Province scope
- action tidak mengubah province filter
- action tidak menghapus leaderboard cache

## 11. Cross-Surface Rules

### 11.1 Read-Only Permission

Read-only harus berlaku konsisten di Active Match dan Klasemen.

Tidak boleh tersedia:

- edit score
- swap player
- edit active players
- edit round count
- edit court count
- regenerate round
- delete match
- next round
- finish match

Tetap boleh:

- melihat skor
- melihat standings
- membuka FOM Play CTA
- share/copy read-only link jika surface menyediakan action tersebut

### 11.2 Stats Sync Visibility

Stats sync badge muncul hanya jika:

- tournament selesai
- user bukan shared viewer
- `statsSyncState` tersedia

State:

- `syncing`
- `synced`
- `error`

### 11.3 Persistence

Active tournament snapshot harus dipersist ketika:

- score berubah
- round berubah
- roster berubah
- court berubah
- round regenerate/delete
- next round
- finish
- share link dibuat

Shared match snapshot harus diupdate ketika:

- shared link pertama kali dibuat
- score/round berubah setelah dishare
- match difinalisasi

History harus tersimpan ketika:

- host menekan Finish
- round terakhir completed
- `endedAt` terisi
- detail dan summary history sukses ditulis

Leaderboard cache harus di-clear/refresh ketika:

- stats player berhasil disinkronkan setelah finalisasi
- profile yang mempengaruhi leaderboard berubah

## 12. Edge Cases

Halaman harus tetap aman ketika:

- tournament rounds kosong
- tidak ada active round
- active round ada tetapi tidak ada match
- score incomplete saat Next Round
- active players kurang dari 4
- jumlah pemain tidak habis dibagi 4
- court lebih banyak dari kapasitas pemain
- player muncul di match tetapi tidak ada di `tournament.players`
- friend/current user profile berubah setelah tournament dibuat
- shared link dibuka tanpa login
- clipboard diblokir browser
- Web Share API tidak tersedia
- file sharing tidak didukung
- story export gagal
- save history gagal
- leaderboard snapshot stale
- `player_stats` query kosong
- Firestore saver mode aktif
- current user tidak masuk top 100 leaderboard
- province filter tidak memiliki pemain

## 13. Analytics dan Instrumentation

Recommended events:

- `active_match_viewed`
- `active_match_score_editor_opened`
- `active_match_score_saved`
- `active_match_next_round_clicked`
- `active_match_next_round_blocked`
- `active_match_finished`
- `active_match_delete_clicked`
- `active_match_shared`
- `standings_viewed`
- `standings_shared_link`
- `standings_story_export_started`
- `standings_story_export_completed`
- `standings_story_export_failed`
- `leaderboard_viewed`
- `leaderboard_scope_changed`
- `leaderboard_cache_hit`
- `leaderboard_snapshot_read`
- `leaderboard_fallback_read`
- `leaderboard_empty`
- `leaderboard_current_user_focused`

Required event properties:

- `tournamentId`
- `format`
- `roundId`
- `isSharedViewer`
- `isReadOnly`
- `shareId` jika ada
- `leaderboardScope`
- `province`
- `source`: cache, snapshot, fallback
- `errorCode` jika gagal

## 14. Acceptance Criteria

### 14.1 Pertandingan Aktif

- Host bisa melihat match summary, active players, court, round progress, dan timer.
- Host bisa input score untuk Americano/Mexicano sesuai `totalPoints`.
- Host bisa input score Match Play sesuai Golden Point atau Advantage.
- Host bisa lanjut round saat score lengkap.
- Host mendapat konfirmasi saat score incomplete untuk Americano/Mexicano.
- Host diblokir saat active players kurang dari 4.
- Host diblokir saat regenerate required.
- Host bisa finish match dan diarahkan ke Klasemen Final.
- Shared viewer tidak bisa melakukan action edit.
- Save history failure tidak menghapus active match.

### 14.2 Klasemen

- Klasemen menghitung live score sebelum match completed.
- W/L/D hanya dihitung dari completed match.
- Ranking match terurut Wins, Diff, Points, lalu nama.
- Summary menampilkan round progress, match progress, dan completion percentage.
- Share link standings menghasilkan URL `?shared={shareId}&view=klasemen`.
- Story image berhasil dibuat untuk lebih dari 10 pemain dengan multi-page export.
- Empty player atau rounds kosong tidak crash.

### 14.3 Leaderboard

- Default menampilkan Global Ranking.
- User bisa mengganti scope ke Province Ranking.
- Leaderboard mengutamakan cache lokal jika tersedia.
- Snapshot fresh dipakai sebelum fallback query.
- Snapshot stale tidak dipakai sebagai sumber akhir.
- Hanya registered FOM users yang tampil.
- Ranking terurut MMR, total matches, lalu display name.
- Current user card menampilkan rank jika user ada di result.
- Focus current user scroll dan highlight row yang benar.
- Empty state tampil jika tidak ada eligible user.

## 15. Design Notes

Pertandingan Aktif:

- Prioritaskan kontrol besar, cepat, dan mudah ditap.
- Jangan sembunyikan status readiness di copy panjang.
- Sticky CTA harus jelas tetapi tidak menutup score row penting.

Klasemen:

- Ranking harus mudah dibaca dalam 3 detik.
- Status `Live` harus terasa aktif, tetapi tidak mengganggu.
- Share menu harus ringkas: link dan story image.

Leaderboard:

- Jangan membuat Leaderboard terasa seperti table enterprise.
- Top 3 boleh punya treatment khusus, row lain tetap dense dan scan-friendly.
- Province selector harus terasa ringan karena ini filter utama, bukan form.

## 16. Open Questions

- Apakah sorting Klasemen match harus mengikuti `criteria = Points Won` untuk format tertentu?
- Apakah Leaderboard perlu filter city/club selain province?
- Apakah current user yang tidak masuk top 100 harus tetap disisipkan sebagai pinned row?
- Apakah Story Image perlu pilihan template atau cukup satu template standar?
- Apakah shared viewer boleh share ulang link standings dari UI yang sama?

## 17. Referensi Implementasi

File utama:

- `src/features/matches/MatchActiveScreen.tsx`
- `src/features/matches/KlasemenScreen.tsx`
- `src/features/matches/ActiveMatchRoundCard.tsx`
- `src/features/matches/ActiveMatchSummaryPanel.tsx`
- `src/features/matches/ActiveMatchNextRoundCta.tsx`
- `src/features/matches/ScoreEditorModal.tsx`
- `src/features/matches/useRoundProgressionActions.ts`
- `src/features/matches/useMatchMutationActions.ts`
- `src/features/ranking/LeaderboardScreen.tsx`
- `src/features/ranking/leaderboardUtils.ts`
- `src/features/ranking/leaderboardCache.ts`
- `src/services/leaderboardRepository.ts`
- `src/features/share/useShareActions.ts`
- `src/types.ts`

Dokumen terkait:

- `docs/REQUIREMENTS_KLASEMEN_DAN_PERTANDINGAN_AKTIF.md`
- `docs/mekanisme-match-setting-wallpaper-active-match.md`
- `docs/SSOT_FOM_PLAY.md`
- `docs/PRD_BRIEF_LOBBY_VIEW_AND_DETAIL.md`
