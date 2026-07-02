# Requirements Halaman Room View

Last Updated: 2026-05-24 (Asia/Jakarta)
Owner: Product / Design / Engineering FOM Play
Status: Designer brief
UI Language: English
Basis: current implementation of `RoomDetailScreen`, `RoomListScreen`, room finance model, and room lifecycle in FOM Play.

## 1. Tujuan Dokumen

Dokumen ini menjelaskan requirement detail untuk halaman Room View di FOM Play.

Room View adalah halaman detail sebuah room sebelum match dimulai. Halaman ini berfungsi sebagai lobby pre-match, tempat pemain memahami jadwal, venue, format, biaya, slot, dan daftar peserta sebelum join. Untuk host, halaman ini juga menjadi control center untuk mengedit detail room, mengatur match setup, menambah atau menghapus peserta, memantau payment, dan memulai match.

Dokumen ini ditujukan sebagai brief untuk designer agar desain Room View bisa mencakup semua state penting, role-based visibility, dan behavior yang dibutuhkan produk.

## 2. Product Context

FOM Play membantu host membuat room untuk match padel sebelum hari bermain. Room mengumpulkan pemain dulu, lalu host meluncurkan room menjadi Active Match.

Alur besar:

1. Host membuat room dari Room List.
2. Host mengisi detail room: judul, deskripsi, jadwal, venue, visibility, format, court, round, slot, dan pricing.
3. Pemain membuka Room View dari Room List atau invite link.
4. Pemain join room jika slot tersedia.
5. Host mengatur atau mengonfirmasi match setup.
6. Host menekan Start Match saat minimum pemain terpenuhi.
7. Room berubah menjadi `in_progress` dan user masuk ke Active Match.

## 3. Role Utama

### 3.1 Public Viewer

Public Viewer adalah user yang membuka room public tetapi belum login atau belum join.

Kebutuhan utama:
- memahami jadwal, venue, format, dan harga sebelum login atau join
- melihat apakah slot masih tersedia
- mendapat CTA yang jelas: `Login to Join` atau `Join Room`
- tidak melihat data private host seperti profit/loss, cost, payment status peserta lain, atau player type

### 3.2 Joined Player

Joined Player adalah user non-host yang sudah join ke room.

Kebutuhan utama:
- memastikan dirinya sudah terdaftar
- melihat jadwal, venue, format, slot, dan daftar peserta
- melihat amount due miliknya sendiri jika pricing aktif
- melihat payment status miliknya sendiri jika sudah diatur host
- bisa leave room selama room masih `scheduled`
- tidak bisa mengedit peserta, payment peserta lain, atau match setup

### 3.3 Host

Host adalah user yang membuat room.

Kebutuhan utama:
- melihat ringkasan kesiapan room
- mengedit detail room sebelum match dimulai
- configure match setup sebelum start
- menambah pemain manual atau dari friend list
- menghapus peserta non-host
- mengatur External/Friend dan Paid/Unpaid per peserta jika pricing aktif
- melihat ringkasan Host Finance secara private
- memulai match saat syarat minimum pemain terpenuhi

## 4. Prinsip Desain

Room View harus terasa seperti lobby match yang ringan, jelas, dan siap dipakai saat host sedang terburu-buru di lapangan.

Prinsip:
- Mobile-first. Target utama adalah penggunaan di ponsel.
- Informasi paling penting harus terlihat cepat: tanggal, jam, venue, slot, harga, dan CTA.
- Role-based UI harus tegas. Host controls tidak boleh terasa tersedia untuk pemain.
- Payment tracking harus terlihat praktis, bukan seperti accounting software.
- Status room harus mudah dipahami tanpa membaca banyak teks.
- CTA utama harus konsisten dan selalu mudah dijangkau.
- Desain harus terasa seperti FOM Play: sporty, clean, energetic, tapi tetap utilitarian.

## 5. Scope MVP

In scope:
- Room hero dan header actions.
- Room Info.
- About this room.
- Match Info.
- Join / leave / login / configure / start CTA.
- Your Payment untuk joined player.
- Host Finance untuk host.
- Participants list.
- Host participant management.
- Add player bottom sheet.
- Payment controls per participant.
- Empty, loading, disabled, full, and not-ready states.

Out of scope untuk desain MVP:
- Payment gateway.
- QRIS atau bank transfer automation.
- Refund.
- Discount code.
- Chat room.
- Push notification.
- Waitlist.
- Approval flow sebelum join.
- Multi-currency.

## 6. Data Yang Ditampilkan

Room View memakai data utama:

- `title`
- `description`
- `status`: `draft`, `scheduled`, `open`, `in_progress`, `completed`, `cancelled`
- `visibility`: `private`, `friends`, `public`
- `scheduledFor`
- `hostDisplayName`
- `settings.format`
- `settings.criteria`
- `settings.scoringType`
- `settings.courts`
- `settings.totalPoints`
- `settings.numRounds`
- `settings.durationMinutes`
- `settings.venueName`
- `settings.location`
- `participants`
- `minPlayers`
- `maxPlayers`
- `pricing.enabled`
- `pricing.publicPrice`
- `matchSetupConfiguredAt`
- `launchedTournamentId`

Jika finance aktif untuk host:

- `courtCostPerCourt`
- `courtCount`
- `ballCost`
- `totalCost`
- `publicPrice`
- `includeHostInFriendSplit`
- participant `playerType`: `external` atau `friend`
- participant `paymentStatus`: `paid` atau `unpaid`
- participant `amountDue`
- `projectedProfit`
- `realizedProfit`
- `totalPaid`
- `totalUnpaid`

## 7. Information Architecture

Urutan konten yang direkomendasikan:

1. Hero
2. Room Info
3. About this room
4. Match Info
5. Primary action panel
6. Your Payment atau Host Finance
7. Participants
8. Add player / payment bottom sheets

Catatan:
- `Your Payment` hanya untuk joined player non-host jika pricing aktif.
- `Host Finance` hanya untuk host jika pricing aktif.
- Jika pricing mati, host melihat panel `Payment Tracking` dengan CTA `Edit Pricing`.
- Participants tetap wajib tampil untuk semua role.

## 8. Requirement Per Section

### 8.1 Hero

Hero adalah sinyal pertama bahwa user sedang melihat room spesifik.

Wajib menampilkan:
- back button
- share button
- status badge
- room title
- tanggal
- jam
- durasi jika tersedia
- venue name jika tersedia

Desain:
- gunakan visual hero yang sporty dan energetic
- title harus tetap terbaca untuk nama room panjang
- metadata harus ringkas dan bisa truncate venue jika terlalu panjang
- header action harus aman untuk safe area iOS

Status badge:
- `Scheduled`
- `Open`
- `In Progress`
- `Completed`
- `Cancelled`
- `Draft`

Behavior:
- back button kembali ke Room List atau screen sebelumnya
- share button membuka share text/link room
- jika room `in_progress`, hero tetap menunjukkan status tetapi CTA join/start tidak aktif
- jika room `completed` atau `cancelled`, hero harus memberi sinyal final/closed

### 8.2 Room Info

Room Info adalah ringkasan operasional.

Wajib menampilkan:
- date and time lengkap
- durasi atau fallback jika belum tersedia
- venue name
- location atau city/area
- joined capacity: contoh `8/12 players`
- court count
- slots open
- minimum players to start
- public price atau `No fee`
- visibility + host trust label: contoh `Public room · Host Budi`

Host behavior:
- tampilkan `Edit` chip di header section
- tap `Edit` membuka Room Editor

Fallback:
- venue kosong: tampilkan pesan netral seperti `Venue belum ditentukan` atau desain placeholder
- maxPlayers kosong: tampilkan `Open room` atau `No capacity limit`
- pricing mati: tampilkan `No fee`

### 8.3 About This Room

About section berisi catatan host.

Wajib menampilkan:
- deskripsi room jika tersedia
- tombol `Read more` / `Less` jika teks panjang
- tombol `Edit` untuk host
- empty state untuk host jika belum ada deskripsi

Isi yang mungkin ada:
- aturan main
- instruksi pembayaran
- level pemain yang dicari
- catatan venue
- kontak host

Designer perlu menyiapkan:
- state deskripsi pendek
- state deskripsi panjang dengan gradient fade
- state kosong khusus host
- state kosong untuk non-host sebaiknya section bisa disembunyikan agar halaman tidak ramai

### 8.4 Match Info

Match Info menjelaskan format match yang akan dibuat dari room.

Wajib menampilkan:
- format: `Americano`, `Mexicano`, atau `Match Play`
- rounds
- scoring: total points atau `Golden Point` / `Advantage` untuk Match Play
- ranking criteria jika ruang desain memungkinkan: `Matches Won` atau `Points Won`

Host behavior:
- jika room masih `scheduled`, tampilkan `Edit`
- tap `Edit` membuka Room Match Setup

State:
- jika setup belum lengkap, tampilkan empty message seperti `Match format has not been configured yet.`
- jika setup sudah lengkap, tampilkan compact chips agar mudah discan

### 8.5 Primary Action Panel

Primary Action Panel adalah area keputusan utama.

Untuk host:
- jika match setup belum dikonfigurasi: CTA `Configure Match`
- jika setup sudah dikonfigurasi dan minimum pemain terpenuhi: CTA `Start Match`
- jika setup sudah dikonfigurasi tetapi pemain kurang: tampilkan not-ready state dan CTA disabled
- jika room bukan `scheduled`: tampilkan status final, bukan action start

Untuk non-host:
- belum login: CTA `Login to Join`
- login dan belum join: CTA `Join Room`
- sudah join: CTA `Leave Room`
- room penuh: CTA disabled `Room Full`
- room sudah berjalan/selesai/cancelled: CTA disabled sesuai status

Not-ready state untuk host:
- tampilkan jumlah pemain yang masih dibutuhkan
- tampilkan progress minimum: contoh `6/8 minimum joined`
- tampilkan slot progress: contoh `4 slots open · 6/10 joined`

Loading state:
- `Joining...`
- `Leaving...`
- `Starting...`
- CTA disabled saat action sedang berjalan

### 8.6 Your Payment

Section ini hanya untuk joined player non-host ketika pricing aktif.

Wajib menampilkan:
- amount due milik user
- payment status user: `Paid` atau `Unpaid`
- explanatory copy singkat

Visibility:
- player hanya boleh melihat amount due miliknya sendiri
- player tidak boleh melihat amount due peserta lain jika peserta tersebut Friend
- player tidak boleh melihat host profit/loss
- player tidak boleh melihat total cost host

State:
- jika host belum membuat participant finance khusus user, tampilkan public price
- jika sudah ada finance row, tampilkan amount due dari host
- status default `Unpaid`

### 8.7 Host Finance

Section ini hanya untuk host ketika pricing aktif.

Wajib menampilkan:
- Realized P/L sebagai headline: Profit atau Loss
- Total Cost
- Collected
- Unpaid
- Projected P/L
- Host-only badge

Desain:
- Profit gunakan tone positif
- Loss gunakan tone warning/destructive
- angka harus mudah dibaca pada ponsel
- jangan tampilkan detail terlalu accounting-heavy

Privacy:
- section ini tidak boleh tampil untuk non-host
- cost dan profit/loss tidak boleh muncul di public room info

Jika pricing mati:
- tampilkan panel `Payment Tracking`
- headline: `Pricing is off`
- copy: `Turn on pricing to mark players as External/Friend and Paid/Unpaid.`
- CTA: `Edit Pricing`

### 8.8 Participants

Participants adalah daftar pemain room.

Wajib menampilkan:
- jumlah peserta visible
- kapasitas filled/empty
- status open jika room masih scheduled dan slot tersedia
- avatar atau initials
- display name
- host badge untuk host participant
- MMR badge jika tersedia
- open slot rows sampai `maxPlayers`

Sorting:
- host sebaiknya tampil paling atas
- joined participants tampil sebelum invited/removed jika nanti status tersebut disurfacing
- empty slots tampil di bawah peserta

Untuk host:
- bisa menambah pemain lewat open slot
- bisa menghapus peserta non-host
- bisa membuka payment controls jika pricing aktif
- jika ada perubahan peserta belum disimpan, tampilkan draft changes banner

Untuk non-host:
- tidak bisa menambah peserta
- tidak bisa menghapus peserta
- open slot hanya informatif

### 8.9 Participant Payment Controls

Payment controls tampil inline/expandable di row peserta, hanya untuk host.

Wajib menampilkan pada collapsed summary:
- amount due
- player type: `External price` atau `Friend split`
- payment status: `Paid` atau `Unpaid`
- affordance expand/collapse

Saat expanded:
- amount due
- penjelasan singkat:
  - External: `External price uses the public player fee.`
  - Friend: `Friend split divides court and ball cost evenly.`
- toggle External/Friend
- toggle Paid/Unpaid

Behavior:
- host participant bisa disembunyikan payment control-nya jika `includeHostInFriendSplit = false`
- perubahan type harus recalculates friend split
- perubahan Paid/Unpaid memengaruhi collected, unpaid, dan realized P/L
- jika menggunakan draft mode, perubahan belum tersimpan sampai host menekan `Save Changes`

### 8.10 Draft Changes Banner

Jika host mengubah peserta atau payment dalam draft mode, tampilkan banner.

Wajib menampilkan:
- pesan: `Participant changes are not saved yet.`
- CTA `Discard`
- CTA `Save Changes`
- loading state `Saving...`

Behavior:
- `Discard` mengembalikan data ke versi terakhir tersimpan
- `Save Changes` menyimpan participants dan participant finance
- banner harus terlihat sebelum daftar peserta terlalu panjang membuat host lupa ada perubahan

### 8.11 Add Player Bottom Sheet

Dipicu saat host tap open slot.

Wajib menampilkan:
- sheet title: `Add player`
- close button
- pilihan tambah pemain manual
- pilihan tambah dari friends

Manual player flow:
- membuka picker/form pemain manual yang sudah ada di app
- hasilnya masuk sebagai participant `manual`

Friend player flow:
- membuka friend picker
- friend yang sudah ada di room tidak muncul lagi
- loading state jika friends sedang dimuat
- empty state jika tidak ada friend tersedia

Constraints:
- jika room sudah penuh, host tidak bisa menambah pemain kecuali maxPlayers dinaikkan dari editor
- jika participant sudah ada, jangan duplikasi row

## 9. Room Status Behavior

### 9.1 Scheduled

Status utama sebelum match dimulai.

Allowed:
- user bisa join jika slot tersedia
- joined player bisa leave
- host bisa edit room
- host bisa configure setup
- host bisa manage participants
- host bisa start jika setup lengkap dan minimum pemain terpenuhi

### 9.2 In Progress

Room sudah diluncurkan menjadi Active Match.

Expected UI:
- CTA join/leave/start disabled
- status jelas `In Progress`
- jika memungkinkan, sediakan CTA sekunder ke Active Match untuk host atau participant
- participants dan room info tetap bisa dilihat
- payment tracking tetap boleh host edit jika produk mengizinkan post-launch finance update

### 9.3 Completed

Match sudah selesai.

Expected UI:
- status `Completed`
- join/leave/start tidak tersedia
- peserta tetap terlihat
- finance tetap bisa dibaca host
- jika nanti tersedia, tampilkan link ke hasil/history

### 9.4 Cancelled

Room dibatalkan.

Expected UI:
- status `Cancelled`
- CTA utama disabled
- info room tetap terlihat untuk konteks
- payment controls sebaiknya nonaktif kecuali ada kebutuhan refund/manual note di fase berikutnya

### 9.5 Draft

Draft adalah state data yang sudah dimodelkan, tetapi bukan state utama Room View saat ini.

Expected UI:
- hanya host yang boleh melihat
- CTA utama mengarah ke edit/configure, bukan join
- non-host sebaiknya tidak bisa membuka draft room

## 10. Empty, Error, And Edge States

Designer perlu membuat state berikut:

- room loading skeleton
- room not found
- user not logged in
- room full
- no participants selain host
- no venue
- no description
- no pricing
- pricing enabled tetapi finance detail belum selesai
- friends loading
- no friends available
- save participant changes failed
- join failed
- leave failed
- start failed
- long room title
- long venue name
- long participant name
- very high amount due
- minimum players belum terpenuhi
- host excluded from friend split

## 11. Responsive Requirements

Target utama:
- mobile width 360px sampai 430px
- safe area iOS
- PWA standalone mode

Juga perlu tetap rapi di:
- small Android 320px
- tablet/narrow desktop dengan max content width seperti app saat ini

Rules:
- CTA tidak boleh tertutup bottom nav atau safe area
- long text harus truncate atau wrap dengan baik
- angka currency tidak boleh keluar dari card
- action icon harus tetap punya tap target minimal 40px
- bottom sheet harus bisa discroll jika kontennya panjang

## 12. Visual Direction

Tone:
- sporty
- premium casual
- fast to scan
- mobile-native
- not corporate accounting

Komponen yang dibutuhkan:
- hero dengan status badge
- icon button
- section label
- compact info card
- pill/chip
- avatar row
- host badge
- MMR badge
- payment status badge
- finance metric tile
- inline expandable controls
- bottom sheet
- disabled CTA
- draft changes banner

Warna:
- primary FOM orange tetap menjadi action color utama
- profit menggunakan green
- loss/error menggunakan red/rose
- unpaid/pending dapat memakai amber
- card background tetap terang dan ringan

## 13. Copy Requirements

UI label utama menggunakan English.

Recommended copy:

- `Room Info`
- `About this room`
- `Match Info`
- `Your Payment`
- `Host Finance`
- `Payment Tracking`
- `Participants`
- `Edit`
- `Read more`
- `Less`
- `Configure Match`
- `Start Match`
- `Join Room`
- `Join this room`
- `Leave Room`
- `Login to Join`
- `Room Full`
- `Need {n} more`
- `Not ready to start`
- `Participant changes are not saved yet.`
- `Discard`
- `Save Changes`
- `External price`
- `Friend split`
- `Paid`
- `Unpaid`
- `Open slot`
- `Tap to add`
- `Available`

Designer boleh memperhalus microcopy, tetapi meaning dan role visibility tidak boleh berubah.

## 14. Designer Deliverables

Designer diharapkan membuat:

- Mobile Room View untuk Host, setup belum lengkap.
- Mobile Room View untuk Host, setup lengkap tetapi minimum players belum terpenuhi.
- Mobile Room View untuk Host, ready to start.
- Mobile Room View untuk Public Viewer belum login.
- Mobile Room View untuk logged-in player belum join.
- Mobile Room View untuk joined player.
- Mobile Room View untuk room full.
- Mobile Room View untuk pricing off.
- Mobile Room View untuk pricing on dengan Host Finance.
- Participants expanded payment control.
- Draft changes banner.
- Add player bottom sheet.
- Friend picker state.
- Empty/error states yang paling penting.

Optional but useful:
- Desktop/tablet preview.
- Completed room state.
- In-progress room state dengan CTA ke Active Match.

## 15. Acceptance Criteria

Desain dianggap siap handoff jika:

- Semua role utama punya state yang jelas.
- CTA utama tidak ambigu untuk host dan player.
- Host-only finance tidak terlihat pada player/public view.
- Joined player hanya melihat payment miliknya sendiri.
- Minimum-player readiness terlihat sebelum host start.
- Empty slot dan full room state jelas.
- Add player dan payment edit flow cukup detail untuk diimplementasikan.
- Long title, long venue, long names, dan currency besar tetap aman di layout mobile.
- Semua section dapat dipetakan ke data model room yang ada.
- UI label tetap konsisten dengan bahasa produk saat ini.

## 16. Open Questions

- Apakah Room View untuk `in_progress` perlu CTA eksplisit `Open Active Match` untuk participant, atau hanya host?
- Apakah payment controls tetap editable setelah room `in_progress` dan `completed` di UI, atau hanya melalui finance/reporting screen berikutnya?
- Apakah public viewer boleh melihat daftar participant lengkap sebelum login?
- Apakah private/friends room link harus menampilkan gate khusus jika user bukan invitee/friend?
- Apakah host bisa membatalkan room dari Room View pada MVP berikutnya?
- Apakah room membutuhkan waitlist saat full?
- Apakah note pembayaran sebaiknya field terstruktur, bukan hanya masuk ke description?
