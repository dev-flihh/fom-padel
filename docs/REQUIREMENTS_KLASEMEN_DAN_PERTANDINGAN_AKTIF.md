# Requirements Halaman Klasemen dan Pertandingan Aktif

Last Updated: 2026-05-17 (Asia/Jakarta)
Owner: Product / Engineering FOM Play
Basis: current workspace implementation for `KlasemenScreen`, `MatchActiveScreen`, active match mutation flow, round progression flow, and sharing flow.

## 1. Tujuan Dokumen

Dokumen ini menjelaskan requirement detail untuk dua halaman inti FOM Play:

1. Halaman Pertandingan Aktif atau Active Match.
2. Halaman Klasemen atau Standings.

Kedua halaman ini dipakai setelah match berhasil dibuat dari Match Settings dan wallpaper dipilih. Active Match adalah tempat host menjalankan pertandingan, mengubah skor, mengatur ronde, dan menyelesaikan match. Klasemen adalah tempat host, pemain, atau shared viewer melihat posisi sementara maupun hasil final.

## 2. Definisi Utama

### 2.1 Pertandingan Aktif

Pertandingan Aktif adalah state tournament yang masih bisa diedit oleh host dan berisi minimal satu round. Round yang memiliki match berstatus `active` dianggap sebagai round berjalan.

### 2.2 Klasemen Live

Klasemen Live adalah ranking pemain yang dihitung dari score yang sudah masuk, termasuk match yang belum selesai selama sudah memiliki score lebih dari 0. Tujuannya agar pemain bisa melihat pergerakan posisi saat event masih berjalan.

### 2.3 Klasemen Final

Klasemen Final adalah ranking setelah seluruh configured round selesai. Pada titik ini active tournament disimpan ke history, `endedAt` diisi, dan sinkronisasi leaderboard global atau MMR history dapat berjalan untuk pemain FOM yang terdaftar.

### 2.4 Host dan Shared Viewer

Host adalah user yang membuat dan menjalankan match. Host dapat mengedit skor, pemain, round, court, dan menghapus match.

Shared Viewer adalah pengguna yang membuka link share. Shared Viewer hanya dapat melihat Active Match atau Klasemen dalam mode read-only.

## 3. Route dan Entry Point

### 3.1 Active Match

Active Match dibuka dari internal screen `active`.

Sumber masuk:
- Setelah Generate Match dan Select Background selesai.
- Dari Dashboard melalui Continue Match.
- Dari Klasemen melalui tombol View Active Match atau View Round Details.
- Dari shared link `?shared={shareId}`.

### 3.2 Klasemen

Klasemen dibuka dari internal screen `klasemen`.

Sumber masuk:
- Dari Active Match melalui tombol View Live Standings atau View Final Standings.
- Dari History Detail untuk hasil final.
- Dari shared standings link `?shared={shareId}&view=klasemen`.

## 4. Data Minimum

Kedua halaman membutuhkan data tournament dengan field berikut:

- `name`
- `format`: `Americano`, `Mexicano`, atau `Match Play`
- `criteria`: `Matches Won` atau `Points Won`
- `scoringType` untuk Match Play: `Golden Point` atau `Advantage`
- `startedAt`
- `endedAt` jika selesai
- `courts`
- `totalPoints`
- `players`
- `inactivePlayerIds`
- `rounds`
- `numRounds`
- `venueName`
- `location`
- `backgroundId`
- `themeColorId`
- `courtChanges`

Setiap round membutuhkan:

- `id`
- `matches`
- `playersBye`

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

## 5. Requirement Halaman Pertandingan Aktif

### 5.1 Layout Utama

Halaman Active Match wajib menampilkan:

- Background visual sesuai `backgroundId` dan `format`.
- Header dengan status match dan action share.
- Summary panel match.
- Tombol menuju Klasemen.
- Daftar round dan match.
- Sticky CTA untuk Next Round atau Finish & Save History selama match belum selesai dan user bukan read-only.
- Modal atau bottom sheet untuk edit score, swap player, active players, edit round, edit court, regenerate round, dan delete match.

### 5.2 Header

Header wajib menampilkan:

- Identitas visual FOM Play.
- Tombol share untuk host.
- Label read-only atau viewer mode untuk shared viewer.

Jika user adalah shared viewer:
- Semua action edit harus disembunyikan atau disabled.
- Halaman menampilkan pesan bahwa viewer mode aktif.

### 5.3 Summary Panel

Summary panel wajib menampilkan:

- Nama match.
- Venue, location, dan tanggal.
- Timer total elapsed.
- Format match.
- Jumlah active players dibanding total players.
- Jumlah court.
- Progress round dalam format `completedRounds/totalRounds`.
- Link Hosted with FOM Play.
- Tombol settings untuk host.

Jika tournament sudah selesai dan ada status sync stats:
- `syncing`: tampilkan pesan bahwa leaderboard dan riwayat rating sedang diperbarui.
- `synced`: tampilkan pesan bahwa leaderboard dan riwayat rating sudah sinkron.
- `error`: tampilkan pesan bahwa match selesai tetapi sinkronisasi stats belum terkonfirmasi.

### 5.4 Daftar Round

Setiap round wajib ditampilkan sebagai card yang bisa collapse dan expand.

Behavior:
- Saat ada round aktif, round aktif terbuka.
- Round lain collapsed secara default.
- Header round menampilkan `Round {id}` dan durasi round.
- Durasi round aktif dihitung dari `startedAt` match aktif paling awal.
- Durasi round selesai mengambil `duration` dari match yang sudah selesai jika tersedia.

### 5.5 Match Row

Setiap match row wajib menampilkan:

- Nomor court.
- Team A dan Team B.
- Avatar atau initials pemain.
- Nama depan pemain pada masing-masing team.
- Score utama dalam format `{teamA.score}-{teamB.score}`.
- Label SKOR.
- Untuk Match Play, tampilkan point berjalan dalam format `(pointsA-pointsB)`.

### 5.6 Edit Score untuk Americano dan Mexicano

Host dapat membuka score editor pada:

- Match di round aktif.
- Match completed untuk format selain Match Play.

Score editor untuk Americano dan Mexicano wajib mendukung:

- Tambah skor per team `+1`.
- Kurangi skor per team `-1`.
- Tambah cepat `+5`.
- Set score team ke `MAX`.
- Reset score menjadi `0-0`.
- Save & Close.

Rules score:
- Nilai score tidak boleh negatif.
- Nilai score tidak boleh melebihi `totalPoints`.
- Saat satu team diubah, score team lain otomatis menjadi `totalPoints - scoreTeam`.
- Match dianggap siap untuk lanjut jika jumlah score kedua team sama dengan `totalPoints` dan minimal salah satu score lebih dari 0.

### 5.7 Edit Score untuk Match Play

Score editor untuk Match Play wajib mendukung:

- Tombol tambah point per team.
- Display games dan points berjalan.
- Reset score menjadi `0-0`.
- Save & Close.

Rules point:
- Urutan point normal adalah `0`, `15`, `30`, `40`, lalu `Game`.
- Pada `Golden Point`, kondisi `40-40` dimenangkan oleh team yang mendapat point berikutnya.
- Pada `Advantage`, kondisi `40-40` memberi `Ad`; jika lawan mendapat point berikutnya, kembali ke `40-40`.
- Saat team mencapai `Game`, game score team bertambah 1 dan points kembali `0-0`.
- Set dianggap selesai jika salah satu team mencapai minimal 6 game dan unggul minimal 2 game.
- Jika set sudah selesai, point tambahan tidak boleh mengubah hasil set.

### 5.8 Swap Player di Round Aktif

Host dapat mengganti pemain pada match di round aktif.

Requirement:
- Swap hanya tersedia pada round aktif.
- Swap tidak tersedia untuk read-only viewer.
- Replacement list berisi pemain tournament yang tidak sedang berada di match yang sama.
- Setelah swap, pemain lama masuk ke `playersBye` jika pemain baru sebelumnya ada di bye list.
- Sistem menampilkan jumlah match pemain agar host bisa mengambil keputusan yang fair.
- Pemain terdaftar menampilkan MMR.
- Manual player menampilkan label bahwa tidak memiliki MMR.

### 5.9 Active Players Editor

Host dapat mengatur pemain yang aktif untuk round berikutnya.

Requirement:
- List semua pemain tournament.
- Host bisa select all, clear all, toggle per player, dan add manual player.
- Host bisa mengganti manual player menjadi friend/FOM player.
- Perubahan active players berlaku mulai round berikutnya.
- Pemain yang tidak dipilih disimpan sebagai `inactivePlayerIds`.
- Untuk Americano, future rounds harus dibangun ulang setelah active player berubah.

### 5.10 Edit Round Count

Host dapat mengubah total round.

Requirement:
- Nilai minimal 1.
- Nilai maksimal efektif 50.
- Total round tidak boleh lebih kecil dari round yang sudah locked atau sudah dimainkan.
- Jika input terlalu kecil, sistem menyesuaikan ke jumlah minimum yang valid.
- Untuk Americano, future rounds dibangun ulang sesuai jumlah round baru.
- Jika total round baru membuat seluruh round sudah completed, status ended boleh dipertahankan; selain itu `endedAt` harus dikosongkan.

### 5.11 Edit Court Count

Host dapat mengubah jumlah court.

Requirement:
- Nilai minimal 1.
- Nilai maksimal 12.
- Perubahan berlaku mulai round berikutnya.
- Sistem mencatat `courtChanges` dengan `effectiveFromRoundId`, `fromCourts`, `toCourts`, dan `changedAt`.
- Untuk Americano, future rounds dibangun ulang setelah court berubah.

### 5.12 Delete atau Regenerate Rounds

Host dapat menghapus round dari round tertentu ke depan.

Requirement:
- Hanya round 2 dan seterusnya yang bisa dihapus dari menu regenerate.
- Sistem meminta konfirmasi sebelum menghapus.
- Setelah round dihapus, jika tidak ada round aktif, round terakhir yang tersisa menjadi active.
- Round sebelum active dinormalisasi sebagai completed.
- Untuk Americano, future rounds dibangun ulang setelah penghapusan.
- Flag `needsRegenerateFromRound` harus dihapus setelah regenerate selesai.

### 5.13 Delete Match

Host dapat menghapus active match.

Requirement:
- Sistem wajib meminta konfirmasi.
- Jika match sudah memiliki `endedAt`, pesan konfirmasi harus menyebut bahwa history dan player stats yang sudah tersimpan dapat ikut terhapus.
- Jika match belum selesai, pesan konfirmasi cukup menyebut active match data akan dihapus.

### 5.14 Next Round dan Finish

Sticky CTA wajib muncul jika:

- User bukan read-only.
- Tournament belum selesai.

CTA menampilkan:
- Round aktif.
- Jumlah match yang sudah memiliki score progress.
- Total match di round aktif.
- Badge Ready untuk Americano/Mexicano jika seluruh match sudah memenuhi target score.
- Label `Next Round` jika belum round terakhir.
- Label `Finish & Save History` jika sudah round terakhir.

Behavior saat Next Round ditekan:
- Jika `needsRegenerateFromRound` aktif, sistem tidak boleh lanjut dan harus memberi notifikasi regenerate required.
- Untuk Americano/Mexicano, jika ada match yang score totalnya belum sama dengan `totalPoints`, sistem wajib meminta konfirmasi untuk lanjut dengan incomplete score.
- Jika belum round terakhir dan active players kurang dari 4, sistem tidak boleh lanjut.
- Round berjalan harus diubah menjadi completed dan `duration` diisi.
- Round berikutnya dibuat atau diaktifkan sesuai format.

Behavior saat Finish ditekan:
- Round terakhir diubah menjadi completed.
- `endedAt` diisi.
- Tournament disimpan ke history detail dan summary.
- Active tournament snapshot dibersihkan setelah save sukses.
- Shared match snapshot disinkronkan.
- Halaman diarahkan ke Klasemen Final.
- Jika save history gagal, active match tetap dipertahankan dan user mendapat notifikasi error.

### 5.15 Round Generation per Format

Americano:
- Semua round bisa dipersiapkan sejak generate match.
- Next Round mengubah round aktif menjadi completed dan mengaktifkan round pending berikutnya.
- Jika tidak ada prepared next round, tournament dianggap selesai.
- Future rounds dibangun ulang saat roster/court/round berubah.

Mexicano:
- Round berikutnya dibuat saat Next Round.
- Sorting pemain menggunakan fairness match count terlebih dahulu.
- Dalam match count yang sama, pemain disusun dari standing.
- Jika criteria `Matches Won`, prioritas pertama adalah wins.
- Jika criteria `Points Won`, prioritas pertama adalah total points.
- Tie breaker berikutnya adalah points diff.
- Pola pairing grup 4 pemain: rank 1 + rank 4 melawan rank 2 + rank 3.

Match Play:
- Round berikutnya dibuat saat Next Round.
- Pemain aktif diacak.
- Setiap match terdiri dari 4 pemain.
- Players di luar kapasitas court masuk bye.

## 6. Requirement Halaman Klasemen

### 6.1 Layout Utama

Halaman Klasemen wajib menampilkan:

- Background visual sesuai `backgroundId` dan `format`.
- Header status `Live` atau `Ended`.
- Logo FOM Play.
- Install app button.
- Share menu untuk host.
- Label View Only untuk shared viewer.
- Summary panel.
- Tombol kembali ke Active Match atau Round Details.
- Ranking Player.
- CTA Share Standings.
- Hidden story export canvas untuk membuat gambar story.

### 6.2 Header Status

Jika tournament belum selesai:
- Badge harus menampilkan `Live`.
- Badge boleh memakai animasi pulse untuk memberi sinyal realtime.

Jika tournament selesai:
- Badge harus menampilkan `Ended`.

Shared viewer:
- Menampilkan `View Only`.
- Tidak menampilkan share menu host kecuali fungsi copy link shared standings yang read-only.

### 6.3 Summary Panel Klasemen

Summary panel wajib menampilkan:

- Nama match.
- Venue, location, dan tanggal.
- Total elapsed.
- Mode atau format.
- Jumlah player.
- Jumlah court.
- Round progress.
- Match progress dalam format `progressedMatches/totalMatches`.
- Completion percentage.
- Progress bar.
- Hosted with FOM Play.

Round progress:
- Jika ada round aktif, displayed round adalah round aktif.
- Jika tidak ada round aktif tetapi ada score progress, displayed round adalah latest scored round.
- Jika tidak ada score progress, displayed round berdasarkan completed rounds.

Match progress:
- Match dianggap progressed jika status completed, score team lebih dari 0, atau Match Play points bukan `0-0`.

### 6.4 Ranking Player

Ranking Player wajib menampilkan:

- Ranking number.
- Avatar atau initials.
- Nama pemain.
- W, L, D, dan M.
- Points Diff.
- Total Points.

Urutan ranking saat ini:

1. Wins terbanyak.
2. Points diff tertinggi.
3. Total points tertinggi.
4. Nama pemain secara alfabetis lokal `id-ID`.

Catatan requirement:
- Walaupun tournament memiliki `criteria`, halaman Klasemen saat ini menampilkan order eksplisit `Wins (W) - Diff - Points`.
- Jika product ingin `criteria = Points Won` mempengaruhi urutan Klasemen, requirement baru harus dibuat karena behavior saat ini selalu mendahulukan wins.

### 6.5 Perhitungan Stat Pemain

Klasemen wajib membuat registry pemain dari:

- `tournament.players`.
- Semua pemain yang muncul di `round.matches`.
- Semua pemain yang muncul di `round.playersBye`.

Nama dan avatar pemain harus di-refresh dari:
- Current user profile jika player adalah current user.
- Friend profile jika player adalah friend.
- Data player di tournament sebagai fallback.

Match dihitung untuk standings jika:
- Match status `completed`, atau
- Team A score lebih dari 0, atau
- Team B score lebih dari 0.

Untuk match yang dihitung:
- Team A mendapat `teamA.score` sebagai total points.
- Team B mendapat `teamB.score` sebagai total points.
- Points diff dihitung dari score team dikurangi score lawan.

Win/loss/draw hanya dihitung jika match status `completed`:
- Jika score team lebih besar, win +1.
- Jika score team lebih kecil, loss +1.
- Jika score sama, draw +1.
- Matches adalah jumlah W + L + D.

Fallback:
- Jika tidak ada score yang bisa dihitung dari round, halaman memakai `player.stats` dan optional `player.totalPoints`.

### 6.6 Empty State

Jika tidak ada pemain:
- Tampilkan pesan bahwa player data belum tersedia.
- Halaman tidak boleh crash.

### 6.7 Tombol View Active Match atau View Round Details

Jika tournament belum selesai:
- Tombol menampilkan `View Active Match`.
- Tombol membawa user kembali ke Active Match.

Jika tournament selesai:
- Tombol menampilkan `View Round Details`.
- Tombol tetap membuka halaman Active Match dalam mode detail round.

### 6.8 Share Standings Link

Host dapat membagikan standings link.

Requirement:
- Jika user host belum login, sistem meminta login.
- Jika standings berasal dari active tournament yang sama, shared snapshot active match harus dipersist.
- Share URL menggunakan format `?shared={shareId}&view=klasemen`.
- Browser harus mencoba copy link ke clipboard.
- Jika clipboard gagal, fallback ke Web Share API.
- Jika Web Share API gagal, fallback ke prompt manual.
- Jika semua gagal, tampilkan feedback failed.

Shared viewer:
- Jika membuka standings dari shared link, share action cukup menyalin shared standings URL yang sama.

### 6.9 Story Image Export

Klasemen wajib mendukung export gambar story.

Requirement:
- Ukuran logical export 360 x 640.
- Ukuran canvas output 1080 x 1920.
- Export memakai background match, logo FOM Play, summary, ranking, dan footer.
- Maksimal 10 pemain per image.
- Jika pemain lebih dari 10, sistem membuat beberapa gambar dengan suffix page.
- File name memakai nama match dan tanggal.
- Jika `navigator.share` mendukung file sharing, sistem membagikan file.
- Jika tidak, sistem mengunduh file.
- Jika export gagal, preview tetap dibuka dan user mendapat pesan gagal.

## 7. Read-Only dan Permission

Read-only mode berlaku untuk:

- Shared viewer.
- Kondisi lain ketika `isReadOnly` true.

Dalam read-only:
- Tidak boleh edit score.
- Tidak boleh swap player.
- Tidak boleh edit active players.
- Tidak boleh edit round count.
- Tidak boleh edit court count.
- Tidak boleh regenerate round.
- Tidak boleh delete match.
- Tidak boleh Next Round atau Finish.
- Tetap boleh melihat match detail, round detail, klasemen, dan link FOM Play.

## 8. Persistence dan Sinkronisasi

### 8.1 Active Tournament Snapshot

Perubahan penting pada active match harus dipersist ke active tournament snapshot, terutama:

- Share current match.
- Next Round.
- Court update.
- Roster update.
- Manual player replacement.
- Delete/regenerate round.

### 8.2 Shared Match Snapshot

Jika match sudah pernah dishare:
- Next Round harus menyinkronkan snapshot shared match.
- Finish match harus menyinkronkan snapshot final.
- Share link harus menulis payload ke collection shared match.

### 8.3 History Save

Saat finish:
- Simpan tournament detail.
- Simpan tournament summary.
- `statsVersion` awal bernilai 0.
- Jika save berhasil, local history list ditambah item terbaru.
- Jika save gagal, active match tetap ada sebagai recovery state.

### 8.4 Stats Sync Badge

Setelah finish:
- Active Match dan Klasemen dapat menampilkan status sinkronisasi stats.
- Badge hanya muncul untuk non-shared viewer.
- Badge tidak muncul jika tournament belum selesai.

## 9. Edge Case Wajib

Halaman harus tetap aman ketika:

- `rounds` kosong.
- Tidak ada round active.
- Ada active tournament tanpa prepared next round.
- Ada player di match tetapi tidak ada di `tournament.players`.
- Ada friend/current user data baru yang berbeda dari snapshot tournament.
- Score active round belum lengkap.
- User mengedit score round lama saat round baru sudah dibuat.
- Jumlah active players kurang dari 4.
- Jumlah pemain tidak habis dibagi 4.
- Court lebih banyak dari kapasitas pemain.
- Shared link dibuka tanpa permission edit.
- Browser tidak mengizinkan clipboard.
- Browser tidak mendukung Web Share API atau file sharing.
- Story image export gagal.
- Save history gagal.

## 10. Acceptance Criteria

### 10.1 Active Match

- Host bisa melihat summary, round, court, player, score, dan timer.
- Host bisa mengubah score sesuai format.
- Host bisa melanjutkan round jika score lengkap.
- Host mendapat konfirmasi jika ingin lanjut dengan score belum lengkap untuk Americano/Mexicano.
- Host tidak bisa lanjut jika regenerate required.
- Host tidak bisa lanjut ke round berikutnya jika active players kurang dari 4.
- Host bisa finish match dan diarahkan ke Klasemen Final.
- Shared viewer tidak melihat atau tidak bisa memakai kontrol edit.

### 10.2 Klasemen

- Klasemen menghitung live score sebelum match selesai.
- Klasemen menghitung W/L/D hanya dari completed match.
- Ranking terurut berdasarkan Wins, Diff, Points, lalu nama.
- Progress match dan round tampil benar.
- Tombol kembali membuka Active Match atau Round Details.
- Share link standings berhasil dibuat atau memberikan fallback yang jelas.
- Story image berhasil dibuat untuk jumlah pemain 1 sampai lebih dari 10.
- Empty player state tidak crash.

### 10.3 Finalisasi

- Round terakhir menjadi completed.
- `endedAt` terisi.
- History detail dan summary tersimpan.
- Active tournament snapshot dibersihkan setelah save sukses.
- Shared snapshot final tersinkron.
- Stats sync badge tampil sesuai state.

## 11. Out of Scope

Hal-hal berikut tidak didefinisikan sebagai requirement baru dalam dokumen ini:

- Perubahan algoritma MMR global.
- Perubahan ranking global Leaderboard.
- Perubahan Match Settings sebelum generate match.
- Perubahan Room scheduling sebelum launch.
- Perubahan desain marketing atau blog.
- Multi-set Match Play penuh.
- Tie-break Match Play.
- Undo granular per point.

## 12. Referensi Implementasi

File utama:

- `src/features/matches/MatchActiveScreen.tsx`
- `src/features/matches/KlasemenScreen.tsx`
- `src/features/matches/ActiveMatchRoundCard.tsx`
- `src/features/matches/ActiveMatchSummaryPanel.tsx`
- `src/features/matches/ActiveMatchNextRoundCta.tsx`
- `src/features/matches/ScoreEditorModal.tsx`
- `src/features/matches/useRoundProgressionActions.ts`
- `src/features/matches/useMatchMutationActions.ts`
- `src/features/share/useShareActions.ts`
- `src/types.ts`

Dokumen terkait:

- `docs/SSOT_FOM_PLAY.md`
- `docs/mekanisme-match-setting-wallpaper-active-match.md`
