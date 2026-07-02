# PRD: Toxic Klasemen dan Match Aktif

Last Updated: 2026-06-29 (Asia/Jakarta)  
Owner: Product / Design / Engineering FOM Play  
Status: Draft PRD detail  
UI Language: English  
Document Language: Indonesian  
Basis: current implementation of `toxicModeEnabled`, `KlasemenScreen`, `toxicStandings`, `MatchActiveScreen`, match setup wizard, active match lifecycle, sharing flow, and history persistence.

## 1. Ringkasan

Toxic Klasemen adalah mode opsional di FOM Play yang menambahkan lapisan social banter ke Klasemen match. Mode ini tidak mengubah skor, pairing, urutan pertandingan, MMR, atau hasil resmi. Toxic Klasemen hanya mengubah cara Klasemen dibaca saat host atau viewer membuka tab `Hall of Shame`.

Dalam mode standar, Klasemen menjawab:

- siapa yang sedang unggul
- siapa yang punya record terbaik
- berapa diff dan total points tiap pemain

Dalam mode Toxic, Klasemen menjawab:

- siapa yang sedang berada di posisi paling bawah match ini
- siapa yang punya performa paling "layak diroast" berdasarkan score, loss, diff, bye, dan margin kekalahan
- copy apa yang bisa dibagikan ke grup sebagai bahan bercanda setelah atau saat match berjalan

Hubungan dengan Match Aktif:

- Match Aktif tetap menjadi surface scoring utama.
- Toxic Mode diaktifkan dari setup match sebelum generate.
- Semua data Toxic Klasemen berasal dari score dan round yang diinput di Match Aktif.
- Link shared active match dan shared standings harus mempertahankan flag `toxicModeEnabled` dan `toxicIntensity`.
- Shared viewer tetap read-only.

## 2. Latar Belakang

FOM Play digunakan di konteks padel komunitas, di mana hasil match sering dibagikan ke grup setelah game. Klasemen standar sudah memenuhi kebutuhan informasional, tetapi belum sepenuhnya menangkap dinamika sosial yang sering muncul di lapangan: saling meledek secara ringan, highlight pemain yang kalah tipis, pemain yang terlalu serius di fun match, atau pemain yang paling sering dapat bye.

Toxic Klasemen dibuat untuk mengubah data match menjadi social content yang mudah dibagikan tanpa mengorbankan kepercayaan pada hasil resmi. Fitur ini harus terasa lucu dan kompetitif, tetapi tetap punya batas:

- opt-in oleh host
- hanya berlaku pada match tersebut
- tidak mempengaruhi leaderboard global atau MMR
- tidak menyerang identitas personal atau atribut sensitif
- selalu bisa kembali ke Klasemen standar

## 3. Problem Statement

Host dan pemain punya dua kebutuhan yang berbeda setelah atau saat match berjalan:

1. Mereka perlu Klasemen resmi yang akurat untuk menentukan posisi dan hasil.
2. Mereka ingin output yang lebih seru untuk dibagikan ke grup.

Jika hanya ada Klasemen standar:

- hasil terasa kering dan kurang shareable
- pemain bawah tidak mendapat momen naratif yang lucu
- story image kurang punya daya tarik sosial

Jika Toxic Mode dibuat tanpa guardrail:

- fitur bisa terasa menghina, bukan playful
- pemain bisa merasa label negatifnya permanen
- data resmi bisa terasa tidak serius
- shared link publik bisa salah dibaca sebagai leaderboard global

Produk harus menjaga dua hal sekaligus: data resmi tetap terpercaya, dan mode banter tetap ringan, jelas konteksnya, serta aman untuk komunitas.

## 4. Product Goals

Goals:

- Menyediakan mode `Hall of Shame` yang opt-in untuk match tertentu.
- Membuat Klasemen punya mode social content tanpa mengubah hasil resmi.
- Membuat Toxic Klasemen live mengikuti progress score di Match Aktif.
- Memberikan highlight lucu untuk posisi bawah, close losses, negative diff, bye collector, big loss, dan champion yang terlalu serius.
- Memungkinkan host membagikan Toxic Klasemen sebagai link dan Story Image.
- Menjaga shared viewer tetap read-only.
- Menjaga tone roast tetap match-only, non-personal, dan tidak menyasar atribut sensitif.
- Menyimpan pilihan Toxic Mode ke active tournament, shared snapshot, dan history agar mode tetap konsisten saat dibuka ulang.

Non-goals:

- Tidak mengubah algoritma Klasemen resmi.
- Tidak mengubah algoritma MMR.
- Tidak mengubah pairing Americano, Mexicano, atau Match Play.
- Tidak membuat toxic ranking global.
- Tidak membuat label toxic permanen di profile user.
- Tidak membuat moderation system penuh untuk user-generated roast.
- Tidak menampilkan Toxic Mode kepada semua match secara default.
- Tidak membuat chat atau comment thread di shared match.
- Tidak mengubah hak edit shared viewer.

## 5. Product Principles

### 5.1 Official First

Klasemen standar tetap menjadi source of truth. Toxic Klasemen adalah interpretasi sosial di atas data yang sama.

Rules:

- tab standar harus selalu tersedia
- score, W/L/D/M, Diff, dan Pts harus konsisten antara mode standar dan toxic
- Toxic Mode tidak boleh mempengaruhi final history atau MMR

### 5.2 Opt-In Bukan Default

Toxic Mode harus aktif hanya jika host memilihnya di setup.

Rules:

- default draft tournament: `toxicModeEnabled = false`
- setup wizard boleh mempromosikan fitur, tetapi tidak boleh mengaktifkan otomatis
- state review harus menunjukkan apakah mode enabled atau off

### 5.3 Match-Only Banter

Semua copy harus mengarah ke performa match, bukan identitas personal.

Allowed topics:

- kalah
- diff minus
- total point rendah
- bye
- kalah tipis
- margin kekalahan besar
- terlalu kompetitif di fun match

Disallowed topics:

- fisik, gender, umur, agama, ras, etnis, orientasi seksual, disabilitas, status ekonomi
- hinaan personal yang tidak terkait match
- profanity berat
- doxing atau informasi privat
- label yang terdengar permanen di luar match

### 5.4 Reversible Context

User harus bisa memahami bahwa Toxic Klasemen hanya konteks pertandingan ini.

Rules:

- tampilkan disclaimer singkat: "All roasts are about this match only. Jangan baper, ya."
- shared viewer tidak boleh melihat Toxic Mode sebagai ranking global
- story image harus membawa branding FOM Play dan konteks match

### 5.5 Fast Court UX

Di lapangan, host harus tetap fokus pada scoring.

Rules:

- Match Aktif tidak boleh menjadi lebih berat karena Toxic Mode
- Toxic calculation harus derived, tidak menambah input manual
- host dapat membuka Klasemen/Toxic dari Active Match tanpa kehilangan score state

## 6. Primary Users dan Role

### 6.1 Host

Host adalah user yang membuat match dan menjalankan scoring.

Needs:

- memilih apakah match memakai Hall of Shame
- menjalankan score seperti biasa di Match Aktif
- membuka Toxic Klasemen untuk cek bahan share
- membagikan link standings atau story image
- memastikan shared viewer tidak bisa edit score

Permissions:

- boleh mengaktifkan Toxic Mode sebelum match digenerate
- boleh input score selama match bukan read-only
- boleh share active match atau standings
- boleh finish match dan menyimpan history

### 6.2 Player

Player adalah peserta yang namanya muncul di match.

Needs:

- melihat posisi resmi di Klasemen standar
- melihat Toxic Klasemen sebagai hiburan match
- tahu bahwa roast hanya berlaku untuk match tersebut
- dapat membuka link shared tanpa login jika host membagikan

Permissions:

- tidak otomatis boleh edit score
- boleh melihat standings dan shared content
- boleh share ulang jika browser/share flow tersedia

### 6.3 Shared Viewer

Shared Viewer adalah orang yang membuka link `?shared={shareId}` atau `?shared={shareId}&view=klasemen`.

Needs:

- melihat active match atau standings secara read-only
- memahami mode toxic jika host mengaktifkan
- mendapat CTA ringan untuk mencoba FOM Play

Permissions:

- tidak boleh edit score
- tidak boleh next round
- tidak boleh finish match
- tidak boleh edit roster, court, round, atau delete match
- boleh melihat tab standar/toxic jika mode tersedia

### 6.4 Sensitive / Low-Context Viewer

Viewer ini mungkin membuka story/link tanpa ikut match.

Needs:

- memahami konteks bahwa ini hasil match komunitas
- tidak mengira label toxic sebagai ranking resmi jangka panjang

Product implication:

- copy harus jelas membawa konteks match
- toxic label harus playful dan tidak absolut
- story/link harus punya nama match, tanggal, dan FOM Play branding

## 7. Scope

### 7.1 In Scope

Setup:

- toggle Hall of Shame di `AppearanceStep`
- status Hall of Shame di `ReviewStep`
- penyimpanan `toxicModeEnabled` ke tournament draft

Match Aktif:

- mempertahankan flag `toxicModeEnabled` selama scoring
- scoring tetap normal
- route ke Klasemen tetap tersedia
- share active match membawa snapshot yang menyimpan toxic flag
- finalisasi history menyimpan toxic flag

Toxic Klasemen:

- tab toggle `Standings` / `Toxic`
- default membuka toxic tab jika `toxicModeEnabled = true`
- empty state sebelum ada score
- peaceful tie state
- hero `King of Cupu` / `Co-King of Cupu`
- live ticker saat match belum selesai
- toxic rows dengan W/L/D/M, Diff, Pts, roast, award chip
- toxic awards carousel
- disclaimer match-only
- share button copy `Share the Shame`
- toxic story export dengan format berbeda dari story standar

Sharing:

- shared standings link `?shared={shareId}&view=klasemen`
- shared active match link `?shared={shareId}`
- read-only shared viewer
- story image export/download/share

Persistence:

- active tournament draft
- shared match snapshot
- tournament history summary/detail
- local active cache

### 7.2 Out of Scope

- Host mengedit daftar roast copy dari UI.
- User voting untuk award.
- Toxic leaderboard antar match.
- Toxic badge di profile.
- Toxic notification otomatis ke pemain.
- Report/appeal flow untuk roast.
- Paid custom templates.
- Multi-language roast engine.
- Manual override pemenang Toxic Awards.

## 8. Entry Point dan Navigation

### 8.1 Setup Wizard

Entry point:

- user membuka `Start Match`
- user masuk ke Match Settings wizard
- user berada di step `Appearance`
- user memilih toggle `Hall of Shame`
- user melihat status ulang di step `Review`
- user generate match

Expected behavior:

- toggle off by default
- saat on, tournament draft menyimpan `toxicModeEnabled = true`
- review card menampilkan status `Enabled`
- generate match membawa flag yang sama ke active tournament

### 8.2 Match Aktif

Entry point:

- setelah setup selesai
- dari dashboard `Continue Match`
- dari Room Detail setelah host menekan Start Match
- dari shared active link `?shared={shareId}`
- dari Klasemen via tombol `Active` / `Rounds`

Expected behavior:

- screen tetap fokus pada scoring
- tidak ada perubahan score rules karena toxic mode
- setiap score update menjadi input untuk Toxic Klasemen
- tombol Standings membawa host/viewer ke Klasemen

### 8.3 Klasemen

Entry point:

- dari Active Match
- setelah finish match
- dari History Detail
- dari shared standings link `?shared={shareId}&view=klasemen`

Expected behavior:

- jika `toxicModeEnabled = true`, default tab adalah `Toxic`
- user bisa pindah ke `Standings`
- jika `toxicModeEnabled = false`, tab toxic tidak ditampilkan

### 8.4 Share Cards

Entry point:

- share menu dari Klasemen
- `Standings Card` untuk ranking normal
- `Shame Card` untuk Hall of Shame
- `My Match Card` untuk logged-in player yang benar-benar menjadi player non-manual di match

Expected behavior:

- card shame memakai source rows toxic
- card standings memakai source rows standings normal
- My Match Card memakai row player login saja
- manual/non-login player melihat disabled upsell `Login to get your Match Card`
- export tetap multi-page jika player melebihi kapasitas per image
- background card memakai dark editorial gradient, bukan foto match

## 9. Data Requirement

### 9.1 Tournament Fields

Required fields:

- `id`
- `name`
- `format`
- `toxicModeEnabled`
- `toxicIntensity`
- `criteria`
- `scoringType`
- `startedAt`
- `endedAt`
- `courts`
- `totalPoints`
- `players`
- `inactivePlayerIds`
- `rounds`
- `numRounds`
- `durationMinutes`
- `venueName`
- `location`
- `backgroundId`
- `themeColorId`

### 9.2 Round Fields

Required fields:

- `id`
- `matches`
- `playersBye`

Usage:

- `playersBye` dipakai untuk award `Sultan of Bye`
- round order dipakai untuk latest progress round dan losing streak

### 9.3 Match Fields

Required fields:

- `id`
- `court`
- `teamA.players`
- `teamA.score`
- `teamB.players`
- `teamB.score`
- `status`
- `roundId`
- `pointsA`
- `pointsB`

Usage:

- score team dipakai untuk W/L/D, Diff, total points, big loss, close loss
- `status = completed` menentukan W/L/D dan losing streak
- active score yang belum completed tetap boleh menghitung live ranking dan ticker
- Match Play point score non-zero menjadi sinyal progress

### 9.4 Player Fields

Required fields:

- `id`
- `name`
- `avatar`
- `initials`
- `source`
- `stats`

Profile refresh:

- current user name/avatar di-refresh dari auth profile jika tersedia
- friend name/avatar di-refresh dari friends jika tersedia
- fallback initials dipakai jika avatar kosong

## 10. Setup Requirements

### 10.1 Appearance Step

UI:

- card `Hall of Shame`
- icon flame
- title `Hall of Shame`
- subtitle:
  - off: `Optional toxic leaderboard after scoring.`
  - on: `Toxic mode enabled for this match.`
- toggle visual

Rules:

- default off
- tap card toggle on/off
- state disimpan di `toxicModeEnabled`
- toggle tidak bergantung pada format match
- toggle tidak boleh mengubah selected color/theme/background

Acceptance criteria:

- Saat user toggle on, review step harus melihat status yang sama.
- Saat user kembali ke Appearance, state toggle tidak reset.
- Saat user mengganti format, Toxic Mode tetap mengikuti pilihan terakhir user.

### 10.2 Review Step

UI:

- card `Hall of Shame`
- status:
  - `Enabled` jika on
  - `Off by default` jika off
- helper copy: `Adds a match-only roast tab in Klasemen. All banter stays about scores, losses, byes, and diff.`

Rules:

- user bisa toggle ulang dari review
- generate match memakai state terakhir dari review
- helper copy harus menjaga framing match-only

Acceptance criteria:

- Jika user toggle off di Review, match tidak punya toxic tab.
- Jika user toggle on di Review, Klasemen default ke Toxic.

## 11. Match Aktif Requirements

### 11.1 Scoring Behavior

Toxic Mode tidak mengubah scoring behavior.

Rules:

- Americano/Mexicano tetap memakai score editor existing
- Match Play tetap memakai point scoring existing
- validation Next Round tetap sama
- incomplete score handling tetap sama
- active players editor tetap sama
- swap player tetap sama

Acceptance criteria:

- Match dengan Toxic Mode dan match tanpa Toxic Mode menghasilkan score official yang sama untuk input yang sama.
- Host tidak perlu mengisi field tambahan untuk Toxic Mode.

### 11.2 Data Flow ke Toxic Klasemen

Setiap update di Match Aktif harus langsung bisa tercermin di Klasemen.

Trigger:

- score team berubah
- match status menjadi completed
- round aktif berubah
- round ditambah
- round dihapus/regenerate
- roster aktif berubah untuk round berikutnya
- player swap dilakukan
- match difinalisasi

Rules:

- Toxic Klasemen harus derived dari `tournament.rounds`
- tidak menyimpan toxic rows sebagai state permanen
- tidak menyimpan award result sebagai data permanen
- recalculation dilakukan saat Klasemen render/update

Acceptance criteria:

- Setelah host input score live, Toxic Klasemen menampilkan row jika ada countable score.
- Setelah round completed, W/L/D dan award berbasis completed match ikut terupdate.
- Setelah match selesai, ticker live hilang.

### 11.3 Active Match Link dan Standings Link

Requirement:

- share active match harus menyimpan `toxicModeEnabled` di payload shared match
- share standings harus membuka Klasemen dengan mode yang sesuai
- shared viewer tetap read-only

Acceptance criteria:

- Viewer yang membuka active shared link bisa lanjut ke Klasemen dan melihat Toxic tab jika enabled.
- Viewer yang membuka standings shared link langsung melihat Toxic tab jika enabled.
- Viewer tidak bisa edit score dari active shared link.

### 11.4 Active Match UI Indicator

Current behavior:

- Toxic Mode tidak menambahkan kontrol scoring khusus di Match Aktif.
- Akses utama tetap melalui tombol Standings/Klasemen.

Recommended P1 enhancement:

- tambahkan subtle badge `Hall of Shame On` di summary/action menu saat toxic enabled
- badge hanya informatif, bukan CTA utama
- tap badge boleh membuka Klasemen toxic

Rationale:

- host tahu bahwa match ini akan punya toxic standings
- tidak mengganggu scoring
- mengurangi kebingungan setelah match dimulai

## 12. Toxic Klasemen Requirements

### 12.1 Tab Behavior

Rules:

- jika `toxicModeEnabled = true`, state awal `standingsTab = toxic`
- jika `toxicModeEnabled = false`, active tab selalu `standings`
- button toggle muncul hanya jika toxic enabled
- button label:
  - saat toxic aktif: `Standings`
  - saat standings aktif: `Toxic`
- aria-label:
  - saat toxic aktif: `Standings`
  - saat standings aktif: `Hall of Shame`

Acceptance criteria:

- Refresh page tidak menghilangkan toxic mode selama tournament payload punya flag.
- Saat user pindah ke Standings, row kembali ke sorting resmi.
- Saat user pindah ke Toxic, story action memakai toxic story mode.

### 12.2 Countable Score Rules

Toxic Klasemen boleh muncul jika ada countable score.

Countable score:

- match `status = completed`
- atau team score A/B lebih dari 0
- atau Match Play points A/B bukan `0`

Empty state:

- jika belum ada countable score, tampilkan:
  - title `Belum ada korban.`
  - copy `Main dulu, baru kita hina.`

Acceptance criteria:

- Match baru tanpa skor tidak menampilkan Hall of Shame rows.
- Score live yang belum completed tetap cukup untuk menampilkan toxic state.

### 12.3 Official Standings Source

Toxic rows harus menggunakan hasil standings resmi sebagai input.

Official sorting current behavior:

1. wins terbanyak
2. points diff tertinggi
3. total points tertinggi
4. nama alfabetis `id-ID`

Important note:

- label toxic yang tampil saat ini adalah `L > -DIFF > PTS`
- current implementation membuat toxic rows dengan membalik urutan official standings
- ini secara umum menaruh pemain terburuk di atas, tetapi bukan direct sort by losses

Product decision:

- P0 mengikuti current behavior untuk konsistensi implementasi.
- P1 perlu eksplisit memutuskan apakah toxic sorting harus benar-benar direct by losses desc, diff asc, points asc.

Acceptance criteria:

- Angka W/L/D/M, Diff, dan Pts sama dengan Klasemen standar.
- Urutan Toxic menampilkan bottom standing sebagai row pertama.

### 12.4 Peaceful Tie State

Peaceful tie terjadi jika semua pemain punya standing value yang sama.

Same standing value:

- W sama
- pointsDiff sama
- totalPoints sama

UI:

- title `Match paling damai sedunia`
- copy `Gak ada yang bisa dihina. Untuk sekarang.`
- tidak menampilkan hero King of Cupu
- award cards kosong

Acceptance criteria:

- Semua pemain imbang tidak menghasilkan award negatif.
- User tetap bisa melihat rows jika data tersedia, tetapi hero toxic memakai peaceful tie state.

### 12.5 Toxic Hero

Hero menampilkan pemain terbawah berdasarkan official standings yang dibalik.

Rules:

- bottom players adalah semua pemain yang standing value-nya sama dengan last player official standings
- jika satu bottom player: title `King of Cupu`
- jika lebih dari satu bottom player: title `Co-King of Cupu`
- hero maksimal menampilkan 2 pemain
- hero stat:
  - Record
  - Diff
  - Pts atau Verdict
- hero roast dipilih secara seeded agar stabil untuk match dan pemain yang sama

Acceptance criteria:

- Hero tidak berubah random setiap render.
- Jika ada dua pemain bottom tie, title dan stats mencerminkan tie.
- Avatar fallback initials tetap tampil.

### 12.6 Toxic Rows

Row harus menampilkan:

- toxic rank badge
- avatar atau initials
- player name
- award chip jika ada
- roast line
- W/L/D/M
- Diff
- Pts

Visual rules:

- row champion official boleh tampil lebih muted saat berada di daftar toxic
- top toxic rank memakai treatment paling mencolok
- third toxic rank memakai asset crest yang tersedia saat ini
- long names dan long awards harus wrap/truncate secara aman

Content rules:

- roast berasal dari bucket performa, bukan random bebas
- roast harus pendek
- roast tidak boleh menyebut atribut personal

Acceptance criteria:

- Nama panjang tidak overflow.
- Award chip panjang tidak merusak grid.
- Row tetap readable di mobile 390px width.

### 12.7 Toxic Buckets

Bucket digunakan untuk menentukan tone roast per pemain.

Buckets:

- `champion`
- `last-place`
- `near-bottom`
- `big-minus`
- `bye-collector`
- `losing-streak`
- `heartbreaker`
- `mid-table`
- `no-data`

Bucket rules current behavior:

- `no-data`: player belum punya match/countable appearance
- `champion`: official rank 1
- `last-place`: masuk bottom player set
- `near-bottom`: dua pemain tepat di atas bottom set
- `big-minus`: pointsDiff <= -8
- `bye-collector`: bye count >= 2
- `losing-streak`: max completed losing streak >= 3
- `heartbreaker`: close losses count >= 2
- `mid-table`: fallback

Acceptance criteria:

- Player tanpa data tidak mendapat roast berbasis kekalahan.
- Player dengan diff sangat negatif mendapat bucket big-minus jika tidak masuk bucket prioritas sebelumnya.

### 12.8 Toxic Awards

Awards current behavior:

- `King of Cupu`
- `Si Cupu Kedua`
- `Sultan of Bye`
- `Tukang Nyumbang Poin`
- `Spesialis Kalah Tipis`
- `Bulldozer Korban`
- `Sweaty Tryhard`
- `Mr. Konsisten`

Award assignment rules:

- award tidak diberikan jika peaceful tie
- player hanya menerima satu award pertama yang assigned
- `King of Cupu`: semua bottom players
- `Si Cupu Kedua`: best candidate tepat di atas bottom
- `Sultan of Bye`: max bye >= 2 dan lebih besar dari median bye
- `Tukang Nyumbang Poin`: min diff negatif
- `Spesialis Kalah Tipis`: close loss max >= 2, margin close loss 1 sampai 2 poin
- `Bulldozer Korban`: biggest loss margin tertinggi lebih dari 0
- `Sweaty Tryhard`: official rank 1
- `Mr. Konsisten`: balanced or mid-table candidate yang belum punya award

Award cards:

- tampil jika ada minimal 2 award cards
- award `King of Cupu` tidak ditampilkan di carousel karena sudah menjadi hero
- card menampilkan label, player, dan note

Acceptance criteria:

- Award tidak duplikat untuk pemain yang sama.
- Award cards tidak muncul jika hanya ada satu non-king award.
- Award note tetap spesifik ke data match.

### 12.9 Live Toxic Ticker

Ticker muncul hanya saat:

- toxic tab aktif
- tournament belum selesai
- ada `tickerMessage`

Message rules current behavior:

- jika latest progress round punya big loss margin >= 4, tampilkan message dari loser dan score
- jika tidak, tampilkan bottom player masuk zona cupu
- jika tournament ended, ticker kosong

Acceptance criteria:

- Ticker hilang setelah match selesai.
- Ticker tidak muncul pada empty state tanpa data.
- Ticker copy truncate aman di mobile.

### 12.10 Disclaimer

Requirement:

- tampil di toxic tab
- copy: `All roasts are about this match only. Jangan baper, ya.`
- ukuran kecil tapi readable
- tidak mengalahkan content utama

Acceptance criteria:

- Disclaimer terlihat sebelum share CTA.
- Shared viewer juga melihat disclaimer.

## 13. Sharing dan Share Card Requirements

### 13.1 Share Link

Rules:

- jika toxic tab aktif, CTA label `Share the Shame`
- jika standings tab aktif, CTA label `Share Standings`
- link tetap menuju shared standings atau active match sesuai share flow existing
- payload shared harus menyimpan `toxicModeEnabled`

Acceptance criteria:

- Link yang dibuka ulang mempertahankan toxic enabled state.
- Jika toxic disabled, shared viewer tidak melihat toggle toxic.
- Shared viewer tidak mendapat edit actions.

### 13.2 Shame Card Export

Rules:

- Shame Card tersedia saat Hall of Shame aktif
- source rows = `toxicStandings.rows`
- players per image = 6
- card title menambahkan konteks `Hall of Shame`
- empty state: `Belum ada ranking toxic untuk dibagikan.`
- jika export gagal, preview error tetap bisa dibuka

Compared to standard standings card:

- standard standings card memakai 10 players per image
- Shame Card lebih longgar karena row punya roast/award

Acceptance criteria:

- 1 sampai 6 toxic rows menghasilkan 1 image.
- 7 sampai 12 toxic rows menghasilkan 2 images.
- Long roast tidak keluar dari canvas.
- Filename menyertakan match name dan tanggal.

### 13.3 My Match Card

Rules:

- hanya tersedia untuk logged-in player yang menjadi peserta match
- manual player dan shared viewer tanpa login melihat disabled upsell
- card menampilkan rank official, record, diff, points
- jika Hall of Shame aktif, card boleh menampilkan toxic rank dan roast personal

Acceptance criteria:

- non-login/shared viewer tidak bisa membuat My Match Card
- manual-only player tidak bisa membuat My Match Card
- logged-in match player bisa membuat My Match Card

### 13.4 Share Card Fallback

Share order:

1. render DOM ke PNG
2. jika Web Share API mendukung file, share file
3. jika tidak, download PNG
4. jika render gagal, tampilkan preview dan error

Acceptance criteria:

- Browser tanpa file share tetap bisa download.
- Browser yang memblokir canvas/export tidak membuat UI crash.

## 14. Persistence Requirements

### 14.1 Active Tournament Draft

`toxicModeEnabled` dan `toxicIntensity` harus tersimpan saat:

- user toggle di setup
- setup draft berubah
- active tournament dibuat
- active tournament disimpan lokal/cloud
- score update terjadi

Acceptance criteria:

- Refresh setelah match dimulai tidak menghilangkan Toxic Mode.
- Continue Match dari dashboard tetap membawa toxic flag dan intensity.

### 14.2 Shared Match Snapshot

Shared payload harus menyertakan:

- `toxicModeEnabled`
- `toxicIntensity`
- fields match/round/player yang dibutuhkan Klasemen
- score/status terbaru saat snapshot diupdate

Acceptance criteria:

- Shared standings link dari match toxic membuka tab Toxic.
- Shared active link dari match toxic bisa route ke Klasemen toxic.

### 14.3 History

History summary/detail harus menyimpan `toxicModeEnabled` dan `toxicIntensity`.

Acceptance criteria:

- History Detail dari match toxic masih bisa membuka Klasemen toxic.
- History Detail dari match non-toxic tidak menampilkan toxic toggle.

## 15. Permissions dan Read-Only Rules

Read-only applies to both Active Match and Klasemen.

Shared viewer cannot:

- edit score
- open score editor
- swap player
- edit active players
- add player
- edit round count
- edit court count
- delete/regenerate round
- delete active match
- next round
- finish match

Shared viewer can:

- view active match
- view standings
- toggle between standings and toxic if enabled
- open FOM Play CTA
- share/copy read-only link if UI allows

Acceptance criteria:

- Toxic Mode does not bypass any read-only restrictions.
- Toxic story/share does not expose host-only actions.

## 16. Content Safety dan Tone Guardrails

### 16.1 Copy Style

Tone:

- playful
- short
- match-specific
- Indonesian casual
- no harsh profanity
- no identity-based insult

Good copy pattern:

- "DIFF-nya butuh recovery."
- "Kalah tipis, berkali-kali."
- "Serius amat bro, ini fun match."

Bad copy pattern:

- insult based on body, religion, ethnicity, gender, age, disability, or social status
- copy that implies permanent personal inferiority
- copy that references private information
- copy that encourages harassment outside the match

### 16.2 Sensitive Edge

Because Toxic Mode is intentionally teasing, the product must maintain clear boundaries.

Requirements:

- opt-in only
- disclaimer visible
- standard standings always one tap away
- no toxic labels on profile/global leaderboard
- no user-generated custom roast in P0
- no push notification that publicly calls out a player with toxic label

### 16.3 Future Moderation

P2 considerations:

- host can disable Toxic Mode after match start
- user can hide toxic view for themselves
- copy set can be remotely configured
- report inappropriate copy if custom copy exists later

## 17. Analytics dan Instrumentation

Recommended events:

- `toxic_mode_toggled`
- `toxic_mode_review_toggled`
- `toxic_match_generated`
- `toxic_standings_viewed`
- `toxic_tab_toggled`
- `toxic_empty_viewed`
- `toxic_peaceful_tie_viewed`
- `toxic_hero_viewed`
- `toxic_award_card_viewed`
- `toxic_share_clicked`
- `toxic_story_export_started`
- `toxic_story_export_completed`
- `toxic_story_export_failed`
- `toxic_shared_view_opened`

Required properties:

- `tournamentId`
- `format`
- `hostUid`
- `isSharedViewer`
- `isReadOnly`
- `toxicModeEnabled`
- `activeTab`
- `roundCount`
- `completedRoundCount`
- `matchCount`
- `completedMatchCount`
- `playerCount`
- `hasCountableScore`
- `isEnded`
- `shareId`
- `sourceScreen`
- `exportPageCount`
- `errorCode`

Success metrics:

- percentage of generated matches with Toxic Mode enabled
- Toxic tab open rate among toxic-enabled matches
- share click rate from Toxic tab
- story export success rate
- shared viewer open rate from toxic shared links
- return to standard standings rate after opening Toxic tab

Quality metrics:

- toxic calculation render time
- story export failure rate
- mobile overflow incidents
- shared viewer permission errors
- reported copy issues, if feedback channel exists

## 18. Edge Cases

System must handle:

- tournament has no rounds
- tournament has rounds but no matches
- no countable score yet
- all players tied
- one player missing from `tournament.players` but present in match team
- player appears in `playersBye` only
- player has no avatar
- player has very long name
- player has same score and stats as another player
- match score is zero but Match Play points show progress
- active match has multiple active matches in one round
- round deleted/regenerated after toxic standings viewed
- roster changed between rounds
- manual player replaced by FOM friend
- shared link opened without login
- shared payload stale but local active match newer
- browser blocks clipboard
- browser does not support file share
- image export fails because of cross-origin avatar/background
- tournament ended without full round count because no prepared round exists
- stats sync fails after finish

## 19. Acceptance Criteria

### 19.1 Setup

- New match draft has Toxic Mode off by default.
- User can enable Hall of Shame from Appearance step.
- User can enable/disable Hall of Shame again from Review step.
- Generated tournament persists `toxicModeEnabled`.

### 19.2 Match Aktif

- Toxic enabled match scores exactly like normal match.
- Score updates are reflected in Klasemen without extra host input.
- Shared active match remains read-only for shared viewer.
- Finish match saves history with toxic flag.

### 19.3 Klasemen

- Toxic enabled match opens Klasemen on Toxic tab by default.
- Toxic disabled match does not show Toxic toggle.
- Empty toxic state appears before any countable score.
- Peaceful tie state appears when all players have same W, Diff, and Pts.
- Toxic rows show player, W/L/D/M, Diff, Pts, roast, and award when available.
- Standard standings remains available from Toxic tab.

### 19.4 Awards

- Bottom player receives King of Cupu hero.
- Bottom tie shows Co-King of Cupu.
- Sultan of Bye appears only when bye count qualifies.
- Close loss award appears only when close loss count qualifies.
- Sweaty Tryhard can apply to official rank 1 without affecting official rank.
- Award cards do not duplicate the same player.

### 19.5 Sharing

- Toxic tab share CTA says `Share the Shame`.
- Shared standings link preserves toxic mode.
- Toxic Story uses 6 rows per image.
- Story export handles more than 6 players through multiple images.
- Story export fallback works when file sharing is unavailable.

### 19.6 Safety

- Disclaimer appears on Toxic tab.
- Copy only references match performance.
- No toxic label is written to user profile, leaderboard, or MMR history.
- Shared viewer cannot edit anything.

## 20. QA Test Plan

### 20.1 Manual Smoke Tests

Test 1: default off

- start new match
- reach Appearance step
- verify Hall of Shame off
- generate match
- open Klasemen
- verify no Toxic toggle

Test 2: enable toxic

- start new match
- enable Hall of Shame
- verify Review shows Enabled
- generate match
- open Klasemen before scoring
- verify empty toxic state

Test 3: live scoring

- input score in Active Match
- open Klasemen
- verify Toxic rows appear
- verify ticker appears if match not ended
- switch to Standings
- verify official sorting

Test 4: finish match

- complete all rounds
- finish and save history
- open final Klasemen
- verify ticker hidden
- verify toxic flag persists
- verify stats sync badge behavior unchanged

Test 5: shared viewer

- share standings from toxic tab
- open shared link logged out
- verify read-only
- verify Toxic tab default
- verify no edit actions

Test 6: story export

- create match with more than 6 players
- open toxic tab
- export story
- verify multi-page output
- verify long names/roasts fit

### 20.2 Calculation Tests

Test cases:

- one bottom player
- two bottom players tied
- all players tied
- player with 2 byes and max bye above median
- player with 2 close losses
- player with biggest loss margin
- player with 3 completed loss streak
- player with no data
- champion appears muted in toxic rows

Expected:

- bucket and awards follow rules in this PRD
- rows remain deterministic for same tournament seed

### 20.3 Regression Tests

Regression areas:

- normal Klasemen sorting
- story export standard mode
- active match score editor
- shared active match read-only
- history detail replay
- leaderboard/MMR sync after finish

## 21. Rollout Plan

### Phase 0: Current Implementation Hardening

Scope:

- backup current photo-blur Match Active, Klasemen, Hall of Shame, and related e2e code to `backups/photo-blur-match-active-hall-of-shame-2026-06-29/`
- document rules
- confirm persistence of `toxicModeEnabled`
- confirm persistence of `toxicIntensity`
- verify shared viewer behavior
- verify story export layouts
- add QA scenarios

### Phase 1: UX Polish

Scope:

- active match badge `Hall of Shame On`
- direct open to toxic standings from active badge
- better copy for tied bottom players
- clearer sort explanation

Status on 2026-06-29:

- implemented as part of the Match Active and Klasemen redesign
- visible toxic sort label is `OFFICIAL UPSIDE DOWN`
- bottom ties use `Co-King of Cupu`

### Phase 2: Safety and Configurability

Scope:

- host can disable toxic after match start
- remote config for roast copy
- optional "hide toxic for me" local preference
- feedback/report copy issue flow

Status on 2026-06-29:

- host can disable Hall of Shame during active match
- host can change intensity during active match
- finished match locks `toxicModeEnabled` and `toxicIntensity`
- roast copy remote config is implemented in Phase 4.5
- local hide preference and report-copy issue flow remain outside current phase

### Phase 3: Court Editorial Redesign

Status on 2026-06-29:

- Match Active and Klasemen visible pages moved away from the photo-blur surface
- current photo-blur code is backed up in `backups/photo-blur-match-active-hall-of-shame-2026-06-29/`
- active round stepper and expandable official ranking rows are implemented

### Phase 4: Hall of Shame v2 Engine

Status on 2026-06-29:

- toxic ranking is reverse official standings
- default intensity is `savage`
- `mild`, `medium`, and `savage` copy banks are implemented
- row roasts avoid duplicates within one Hall of Shame until the copy bank is exhausted
- `Duo Petaka` pair award is implemented with minimum 2 countable matches together
- share cards remain photo-free in this phase

### Phase 4.5: Toxic Copy Config

Status on 2026-06-29:

- toxic copy is isolated in `src/features/matches/toxicCopyConfig.ts`
- ranking logic receives optional `toxicCopyConfig` and no longer owns roast banks
- Firebase Remote Config key: `toxic_copy_v1`
- QA/dev localStorage override key: `fom_toxic_copy_config_v1`
- partial config is allowed and merges with default copy
- invalid config fails closed to default copy
- supported override areas:
  - `sortLabel`
  - `awards`
  - `rowRoasts`
  - `heroRoasts`
  - `emptyRoasts`
  - `peacefulRoasts`
  - `coKingRoasts`
- e2e coverage confirms JSON override updates sort label, award label, hero roast, and row roast

Example Remote Config JSON:

```json
{
  "version": 1,
  "sortLabel": "OFFICIAL UPSIDE DOWN",
  "awards": {
    "king-of-cupu": { "label": "King of Cupu", "emoji": "👑", "isGold": true }
  },
  "heroRoasts": {
    "savage": ["Remote hero roast active."]
  },
  "rowRoasts": {
    "savage": {
      "last-place": ["Remote row roast active."]
    }
  }
}
```

### Phase 5: Share Cards Without Photos

Status on 2026-06-29:

- share menu exposes `Share Link`, `Standings Card`, `Shame Card`, and `My Match Card`
- Shame Card is available when Hall of Shame is enabled
- My Match Card is login-player-only
- manual/non-login state shows disabled upsell `Login to get your Match Card`
- share cards export as stable 9:16 PNG cards
- card background uses dark editorial gradient and court lines without photo/gallery dependency

## 22. Open Questions

Resolved decisions:

- Toxic sorting uses reverse official standings.
- Tied last place becomes `Co-King of Cupu`.
- Default intensity is `savage`.
- Host can turn Hall of Shame off during active match.
- Host can change intensity during active match.
- Toxic settings can change while active, then lock after finish.
- Share card background uses dark editorial gradient without photo gallery.
- My Match Card is login-only; manual/non-login players get a soft login CTA.
- `Duo Petaka` requires the pair to play together at least 2 times.

Parked for later:

- Vote/H2H prototype.
- Photo gallery and photo-backed share cards.
- Local "hide toxic for me" preference.
- Feedback/report copy issue flow.

Still open:

- Should Toxic Mode need format-specific rules if Match Play singles/team variations expand later?

## 23. Implementation References

Primary files:

- `src/features/matches/KlasemenScreen.tsx`
- `src/features/matches/toxicStandings.ts`
- `src/features/matches/MatchActiveScreen.tsx`
- `src/features/matches/AppearanceStep.tsx`
- `src/features/matches/ReviewStep.tsx`
- `src/features/matches/useMatchSettingsDraft.ts`
- `src/features/matches/useRoundProgressionActions.ts`
- `src/features/tournaments/tournamentDraft.ts`
- `src/features/history/historyDetailUtils.ts`
- `src/types.ts`

Related docs:

- `docs/PRD_KLASEMEN_LEADERBOARD_DAN_PERTANDINGAN_AKTIF.md`
- `docs/PRD_APP_HOMEPAGE.md`
- `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`
- `docs/REQUIREMENTS_KLASEMEN_DAN_PERTANDINGAN_AKTIF.md`
