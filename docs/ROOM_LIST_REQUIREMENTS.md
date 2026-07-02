    # Requirements Halaman Room List

    Last Updated: 2026-05-24 (Asia/Jakarta)
    Owner: Product / Design / Engineering FOM Play
    Status: Designer brief
    UI Language: English
    Basis: current implementation of `RoomListScreen`, `useRooms`, `roomRepository`, and Rooms section in `SSOT_FOM_PLAY`.

    ## 1. Tujuan Dokumen

    Dokumen ini menjelaskan requirement detail untuk halaman Room List di FOM Play.

    Room List adalah entry point utama untuk fitur Rooms. Halaman ini menampilkan room yang dibuat oleh user, room public yang akan datang, dan CTA untuk membuat room baru. Dari halaman ini user bisa membuat room, membuka detail room, dan menemukan room public yang tersedia untuk diikuti.

    Nama UI saat ini: `Plan a room`.

    ## 2. Product Context

    Rooms adalah surface pre-match planning untuk schedule match di masa depan. Host membuat room agar pemain bisa join sebelum game day. Room List membantu user melihat semua room relevan dalam satu halaman sebelum masuk ke Room View atau Room Editor.

    Alur utama:

    1. User membuka menu Rooms dari Dashboard.
    2. Sistem mengambil hosted rooms milik user jika user login.
    3. Sistem mengambil upcoming public rooms.
    4. User bisa membuat room baru.
    5. User bisa membuka Room View dari card room.
    6. Jika user membuat room, user diarahkan ke Room Editor.

    ## 3. Role Utama

    ### 3.1 Logged-In Host

    Logged-In Host adalah user yang sudah login dan bisa membuat room.

    Kebutuhan utama:
    - melihat room yang ia host
    - membuat room baru
    - membuka room detail untuk mengelola participant, payment, dan start match
    - melihat public rooms dari host lain

    ### 3.2 Logged-In Player

    Logged-In Player adalah user yang sudah login tetapi belum tentu pernah membuat room.

    Kebutuhan utama:
    - menemukan public rooms yang akan datang
    - membuka room detail untuk melihat info dan join
    - membuat room jika ingin menjadi host

    ### 3.3 Guest / Logged-Out User

    Guest adalah user yang belum login.

    Kebutuhan utama:
    - melihat public rooms jika produk mengizinkan discovery sebelum login
    - memahami bahwa ia bisa membuat atau join room setelah login
    - tidak melihat hosted rooms pribadi

    Catatan implementasi saat ini:
    - hosted rooms hanya diambil jika ada `userUid`
    - public upcoming rooms tetap diambil
    - akses create room tetap perlu mengikuti auth flow di parent screen

    ## 4. Prinsip Desain

    Room List harus terasa seperti planner yang cepat dipindai, bukan halaman katalog yang berat.

    Prinsip:
    - Mobile-first.
    - Prioritaskan action `Create Room`.
    - Hosted rooms harus lebih mudah dikenali daripada public rooms.
    - Card harus menampilkan informasi yang cukup untuk mengambil keputusan tanpa membuka detail.
    - Public price harus jelas, tetapi tidak menampilkan data finance private.
    - Empty state harus mendorong user membuat room tanpa terasa memaksa.
    - Loading state harus tetap menjaga struktur halaman.

    ## 5. Scope MVP

    In scope:
    - Page heading `Plan a room`.
    - Create room panel.
    - Empty state untuk hosted rooms.
    - Loading skeleton.
    - Section `Your Rooms / Hosted by you`.
    - Section `Discover / Public rooms`.
    - Room card untuk hosted dan public room.
    - Open Room Detail action.
    - Create Room action.
    - No public rooms empty state.

    Out of scope untuk MVP:
    - search room
    - filter by venue, city, format, or date
    - calendar view
    - map view
    - invite-only room discovery
    - friend rooms list
    - waitlist
    - room recommendations
    - pull-to-refresh visual treatment detail
    - pagination UI

    ## 6. Data Yang Ditampilkan

    Room List memakai data:

    - `id`
    - `title`
    - `scheduledFor`
    - `settings.venueName`
    - `settings.location`
    - `participants`
    - `maxPlayers`
    - `pricing.enabled`
    - `pricing.publicPrice`
    - legacy `feeEnabled`
    - legacy `feeAmount`
    - `hostUid`
    - `visibility`

    Derived data:
    - joined participant count: jumlah participant dengan `status = joined`
    - capacity label: contoh `3 / 12 players`
    - remaining slots: contoh `9 slots left`
    - progress percent: `joinedCount / maxPlayers`
    - venue label: `venueName · location`
    - price label: `Rp 60.000 / player` atau `No fee`
    - schedule label: contoh `15 Mei, 20.00`

    ## 7. Information Architecture

    Urutan konten yang direkomendasikan:

    1. Page heading
    2. Create Room panel
    3. Initial loading state jika data belum ada
    4. Hosted rooms section
    5. Public rooms section

    Detail struktur:
    - Heading selalu tampil.
    - Create Room panel tampil sebagai empty-state CTA besar jika user belum punya hosted room.
    - Create Room panel tampil sebagai compact action jika user sudah punya hosted room.
    - Hosted rooms section hanya tampil jika ada hosted room.
    - Public rooms section selalu tampil setelah hosted rooms atau setelah create panel.

    ## 8. Requirement Per Section

    ### 8.1 Page Heading

    Wajib menampilkan:
    - title: `Plan a room`
    - subtitle: `Schedule a match and collect players before game day.`

    Desain:
    - title besar, kuat, dan mudah dibaca
    - subtitle menjelaskan value halaman tanpa terlalu panjang
    - harus aman terhadap safe area iOS

    ### 8.2 Create Room Panel

    Create Room panel memiliki dua state.

    State A: user belum punya hosted rooms.

    Wajib menampilkan:
    - icon calendar
    - title: `No rooms yet`
    - description: `Create one when you want players to join before the match starts.`
    - primary button: `Create Room`

    Behavior:
    - tap button membuka Room Editor / create room flow

    State B: user sudah punya hosted rooms.

    Wajib menampilkan:
    - title: `Create room`
    - description: `Schedule a match for later.`
    - plus icon button

    Behavior:
    - tap plus membuka Room Editor / create room flow

    Design notes:
    - State A boleh lebih instructional.
    - State B harus compact agar list room tetap menjadi fokus.
    - Plus icon harus punya tap target jelas.

    ### 8.3 Initial Loading State

    Loading state tampil ketika data sedang dimuat dan belum ada hosted rooms maupun public rooms.

    Wajib menampilkan:
    - skeleton panel di area create/room summary
    - skeleton card untuk public room list

    Behavior:
    - jangan tampilkan pesan empty sebelum loading selesai
    - heading tetap tampil
    - layout tidak boleh shift terlalu agresif setelah data masuk

    ### 8.4 Hosted Rooms Section

    Section ini tampil jika user memiliki hosted rooms.

    Wajib menampilkan:
    - eyebrow: `Your Rooms`
    - title: `Hosted by you`
    - daftar room card dengan tone hosted

    Behavior:
    - tap card membuka Room View / Room Detail
    - hosted rooms diurutkan berdasarkan `scheduledFor` ascending
    - public rooms yang host-nya adalah user saat ini tidak boleh muncul lagi di public section

    Design notes:
    - hosted card harus punya visual emphasis berbeda dari public card
    - gunakan tone FOM orange secara proporsional
    - section harus tetap mudah discan jika room banyak

    ### 8.5 Public Rooms Section

    Section ini tampil untuk upcoming public rooms.

    Wajib menampilkan:
    - eyebrow: `Discover`
    - title: `Public rooms`
    - daftar public room cards jika tersedia
    - empty state jika tidak ada public room

    Empty state:
    - title: `No public rooms`
    - description: `Public rooms will appear here when hosts schedule upcoming matches.`

    Behavior:
    - tap card membuka Room View / Room Detail
    - hanya room `visibility = public` dan `scheduledFor >= now` yang tampil
    - public rooms diurutkan berdasarkan `scheduledFor` ascending
    - maksimal list data saat ini mengikuti repository limit 50

    Design notes:
    - public card boleh lebih netral dibanding hosted card
    - jangan tampilkan private/friends room di public section

    ### 8.6 Room Card

    Room Card adalah komponen utama di Room List.

    Wajib menampilkan:
    - leading calendar icon
    - room title
    - schedule date/time
    - venue/location
    - public price atau `No fee`
    - joined capacity
    - remaining slots jika `maxPlayers` tersedia
    - progress bar jika `maxPlayers` tersedia
    - chevron / affordance bahwa card bisa dibuka

    Hosted card:
    - background lebih hangat atau tinted
    - icon primary orange dengan white icon
    - digunakan di section `Hosted by you`

    Public card:
    - background lebih netral
    - icon boleh white/neutral
    - digunakan di section `Public rooms`

    Behavior:
    - seluruh card harus clickable
    - active/tap state memberi feedback
    - title panjang truncate
    - venue panjang truncate
    - price panjang truncate
    - jika `maxPlayers` kosong, tampilkan capacity tanpa progress bar dan tanpa slots left
    - jika remaining slots 0, tampilkan `0 slots left` atau design state full

    ### 8.7 Schedule Display

    Schedule harus ringkas dan lokal.

    Format saat ini:
    - `day month, HH.mm`
    - contoh: `15 Mei, 20.00`

    Requirement:
    - gunakan locale Indonesia untuk tanggal
    - jam harus 2 digit
    - jika tanggal invalid, tampilkan fallback `-`

    ### 8.8 Venue Display

    Venue label:
    - gabungkan `settings.venueName` dan `settings.location` dengan separator `·`
    - contoh: `Sand Padel · Tangerang`

    Fallback:
    - jika venue dan location kosong, tampilkan `Venue belum ditentukan`

    Requirement:
    - venue harus satu baris dan truncate di card
    - jangan menampilkan field kosong atau separator menggantung

    ### 8.9 Price Display

    Price label:
    - jika pricing aktif dan public price lebih dari 0: `Rp {amount} / player`
    - jika pricing mati atau amount 0: `No fee`

    Requirement:
    - gunakan IDR tanpa desimal
    - hanya public price yang tampil
    - jangan tampilkan court cost, ball cost, profit/loss, collected, atau payment status di Room List
    - legacy `feeEnabled` dan `feeAmount` tetap harus menghasilkan label masuk akal

    ### 8.10 Capacity And Progress

    Capacity wajib membantu user memahami seberapa penuh room.

    Wajib menampilkan:
    - joined participant count
    - max players jika tersedia
    - slots left jika max players tersedia
    - progress bar jika max players tersedia

    Formula:
    - `joinedCount = participants.filter(status = joined).length`
    - `remainingSlots = max(maxPlayers - joinedCount, 0)`
    - `progressPercent = min(joinedCount / maxPlayers * 100, 100)`

    Display:
    - contoh capacity: `3 / 12 players`
    - contoh slots: `9 slots left`

    Edge cases:
    - jika maxPlayers kosong: tampilkan `{joinedCount} players`
    - jika joinedCount lebih besar dari maxPlayers karena data lama/bug, progress bar tetap max 100%
    - jika room full: visual slots left harus jelas

    ## 9. State Requirements

    Designer perlu membuat state berikut:

    - initial loading dengan skeleton
    - no hosted rooms, no public rooms
    - no hosted rooms, ada public rooms
    - ada hosted rooms, no public rooms
    - ada hosted rooms dan public rooms
    - hosted room card
    - public room card
    - room card full
    - room card no fee
    - room card no venue
    - long room title
    - long venue/location
    - high price value
    - many hosted rooms
    - many public rooms
    - guest view
    - logged-in empty view

    ## 10. Error And Refresh Behavior

    Current implementation:
    - fetch hosted rooms dan public rooms berjalan paralel
    - jika salah satu gagal, error dicatat di console dan list lain tetap bisa tampil
    - `refresh` tersedia dari hook

    Design requirement:
    - siapkan non-blocking error treatment untuk future iteration
    - jika hosted rooms gagal tetapi public rooms berhasil, halaman tidak boleh total blank
    - jika public rooms gagal tetapi hosted rooms berhasil, hosted rooms tetap tampil
    - jika semua gagal, tampilkan empty/error yang memberi user opsi retry

    Suggested copy for future error state:
    - `Could not load rooms`
    - `Check your connection and try again.`
    - CTA: `Try Again`

    ## 11. Navigation And Actions

    Actions:
    - `Create Room`: membuka Room Editor
    - tap hosted room card: membuka Room View untuk room tersebut
    - tap public room card: membuka Room View untuk room tersebut
    - refresh: mengambil ulang hosted/public rooms
    - back/return to dashboard: mengikuti navigation shell app

    Route/screen relation:
    - Room List: `screen = rooms`
    - Room Editor: `screen = room-editor`
    - Room View / Room Detail: `screen = room-detail`
    - Room Setup: `screen = room-setup`

    ## 12. Privacy And Visibility

    Room List boleh menampilkan:
    - public room title
    - public room schedule
    - public venue/location
    - joined capacity
    - public price
    - hosted rooms milik current user

    Room List tidak boleh menampilkan:
    - private/friends rooms milik orang lain
    - court cost
    - ball cost
    - host profit/loss
    - collected/unpaid totals
    - payment status peserta
    - player type External/Friend
    - private finance snapshot

    Filtering:
    - hosted section menampilkan rooms dengan `hostUid = currentUserUid`
    - public section menampilkan rooms dengan `visibility = public`
    - public section hanya menampilkan upcoming rooms
    - public section exclude rooms yang di-host current user

    ## 13. Responsive Requirements

    Target utama:
    - mobile width 360px sampai 430px
    - small Android 320px
    - PWA standalone mode
    - iOS safe area

    Rules:
    - content max width mengikuti app shell saat ini
    - room title tidak boleh mendorong chevron keluar card
    - venue dan price harus truncate dengan rapi
    - progress bar harus stabil dan tidak shift saat data berubah
    - Create Room button/icon harus punya tap target minimal 40px
    - card spacing harus tetap nyaman untuk scroll panjang
    - bottom padding harus aman terhadap bottom nav

    ## 14. Visual Direction

    Tone:
    - clean
    - energetic
    - planner-like
    - mobile-native
    - light, not dense

    Komponen:
    - large page title
    - subtitle
    - soft create panel
    - icon button
    - section eyebrow
    - section title
    - room card
    - progress bar
    - skeleton card
    - empty state panel

    Warna:
    - primary FOM orange untuk action, date, icon hosted, progress bar
    - hosted card bisa memakai warm tint
    - public card lebih neutral
    - muted gray untuk metadata
    - avoid overusing orange sampai semua elemen terlihat sama penting

    ## 15. Copy Requirements

    UI label utama menggunakan English.

    Required copy:
    - `Plan a room`
    - `Schedule a match and collect players before game day.`
    - `No rooms yet`
    - `Create one when you want players to join before the match starts.`
    - `Create Room`
    - `Create room`
    - `Schedule a match for later.`
    - `Your Rooms`
    - `Hosted by you`
    - `Discover`
    - `Public rooms`
    - `No public rooms`
    - `Public rooms will appear here when hosts schedule upcoming matches.`
    - `{n} / {max} players`
    - `{n} players`
    - `{n} slots left`
    - `No fee`
    - `Venue belum ditentukan`

    Designer boleh memperhalus microcopy, tetapi harus menjaga meaning utama.

    ## 16. Designer Deliverables

    Designer diharapkan membuat:

    - Mobile Room List untuk user tanpa hosted rooms dan tanpa public rooms.
    - Mobile Room List untuk user tanpa hosted rooms tetapi ada public rooms.
    - Mobile Room List untuk user dengan hosted rooms dan public rooms.
    - Mobile Room List loading skeleton.
    - Hosted room card component.
    - Public room card component.
    - Room card full state.
    - Room card no fee state.
    - Room card no venue state.
    - Long title / long venue stress test.
    - Error/retry state untuk future iteration.

    Optional:
    - Tablet/narrow desktop preview.
    - Search/filter exploration untuk future iteration.
    - Pull-to-refresh treatment.

    ## 17. Acceptance Criteria

    Desain dianggap siap handoff jika:

    - User langsung memahami bahwa halaman ini untuk membuat dan menemukan scheduled rooms.
    - `Create Room` mudah ditemukan pada empty maupun non-empty state.
    - Hosted rooms dan public rooms terlihat berbeda tetapi tetap satu keluarga visual.
    - Room card menampilkan title, schedule, venue, price, capacity, slots left, dan progress.
    - Empty states tidak membingungkan.
    - Loading state tidak menyebabkan layout jump besar.
    - Long title, long venue, high price, dan full room tetap aman di mobile.
    - Tidak ada private finance data yang tampil di Room List.
    - Semua card jelas bisa diklik menuju Room View.

    ## 18. Open Questions

    - Apakah guest boleh melihat public rooms, atau harus login sebelum melihat list?
    - Apakah Room List perlu tab/filter untuk `Hosted`, `Joined`, dan `Discover`?
    - Apakah user perlu melihat rooms yang sudah ia join tetapi bukan public lagi?
    - Apakah hosted rooms harus dipisah antara upcoming, in progress, completed, dan cancelled?
    - Apakah public rooms perlu search/filter by city, venue, format, atau date?
    - Apakah full rooms tetap muncul di Discover atau disembunyikan?
    - Apakah Room List perlu menampilkan host name pada public room card?
    - Apakah perlu surface format match pada card, misalnya `Americano` atau `Match Play`?
