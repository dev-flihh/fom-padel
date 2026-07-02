# PRD Brief: Lobby View And Lobby Detail

Last Updated: 2026-06-08 (Asia/Jakarta)
Owner: Product / Design / Engineering FOM Play
Status: Draft PRD brief
UI Language: English
Document Language: Indonesian

## 1. Ringkasan

Dokumen ini menjelaskan kebutuhan produk untuk dua surface utama fitur lobby FOM Play:

1. `Lobby View`: halaman daftar lobby/room yang membantu user menemukan, memfilter, dan membuka jadwal match yang akan datang.
2. `Lobby Detail`: halaman detail satu lobby/room yang membantu pemain memahami informasi match, join/leave, dan membantu host mengelola participant, setup match, serta payment tracking sebelum match dimulai.

Catatan istilah:
- Di codebase, entity teknis bernama `Room`.
- Di komunikasi produk dan pengalaman user, konsepnya dapat disebut `Lobby`.
- Dokumen ini memakai istilah `Lobby`, tetapi field data dan screen reference tetap mengikuti model `Room`.

## 2. Latar Belakang

FOM Play adalah PWA mobile-first untuk menjalankan session padel. Selain membuat active match secara langsung, host juga perlu menjadwalkan match di masa depan, mengumpulkan pemain sebelum hari main, dan memastikan detail seperti venue, slot, format, serta biaya sudah jelas.

Lobby menjadi jembatan antara rencana match dan active match:
- Host membuat lobby.
- Pemain melihat lobby, memahami detail, lalu join jika eligible.
- Host mengatur participant dan payment sebelum game day.
- Host mengonfigurasi match setup.
- Host meluncurkan lobby menjadi active match saat minimum pemain terpenuhi.

## 3. Problem Statement

Host sering menjalankan open play atau komunitas padel dengan banyak hal kecil yang harus dikelola:
- siapa saja yang sudah daftar
- slot tersisa
- venue dan jam main
- harga public
- teman vs external player
- payment paid/unpaid
- apakah match sudah siap dimulai

Tanpa lobby yang jelas, host harus menggunakan chat manual, spreadsheet, dan pengingat terpisah. Pemain juga sulit mengetahui apakah mereka sudah terdaftar, harus bayar berapa, dan apakah lobby masih tersedia.

## 4. Product Goals

Goals:
- Membuat scheduled match mudah ditemukan dan cepat dipindai.
- Membuat detail lobby cukup jelas sehingga pemain bisa memutuskan join tanpa bertanya ke host.
- Memberi host control center yang praktis untuk participant, finance, dan match readiness.
- Menjaga data finance private host agar tidak bocor ke public/player view.
- Menyediakan transisi yang mulus dari scheduled lobby ke active match.

Non-goals untuk MVP:
- Payment gateway, QRIS automation, refund, invoice, atau settlement otomatis.
- Chat lobby.
- Waitlist.
- Approval flow sebelum join.
- Map/calendar discovery.
- Recommendation engine.
- Multi-currency.
- Advanced reporting di halaman lobby.

## 5. Success Metrics

Product metrics:
- Persentase user yang membuka Lobby View lalu membuka Lobby Detail.
- Persentase public lobby yang mendapat join dari non-host.
- Persentase lobby yang mencapai minimum pemain.
- Persentase lobby yang berhasil diluncurkan menjadi active match.
- Waktu rata-rata host dari buka Lobby Detail sampai `Start Match`.

Quality metrics:
- Tidak ada laporan private finance muncul di non-host view.
- Join/leave/start failure rate rendah dan error state jelas.
- Long title, long venue, high price, dan participant name panjang tetap aman di mobile.
- Page load tidak terasa blank saat hosted/public query salah satu gagal.

## 6. Primary Users And Roles

### 6.1 Guest / Public Viewer

User belum login yang membuka public lobby dari discovery atau share link.

Needs:
- melihat info utama lobby: tanggal, jam, venue, slot, format, dan price
- tahu apakah lobby masih tersedia
- mendapat CTA `Login to Join`
- tidak melihat data finance private host

Restrictions:
- tidak bisa join sebelum login
- tidak bisa leave
- tidak bisa melihat host-only controls
- tidak bisa melihat cost, profit/loss, total collected, atau payment status participant lain

### 6.2 Logged-In Player, Not Joined

User sudah login, bukan host, dan belum join lobby.

Needs:
- melihat public information lobby
- melihat apakah slot masih tersedia
- join lobby dengan satu CTA jelas

Restrictions:
- tidak bisa mengedit lobby
- tidak bisa manage participant
- tidak bisa melihat private host finance

### 6.3 Joined Player

User sudah login dan sudah join lobby.

Needs:
- memastikan dirinya sudah terdaftar
- melihat detail jadwal, venue, format, dan participant
- melihat amount due miliknya sendiri jika pricing aktif
- melihat status payment miliknya sendiri
- bisa `Leave Room` selama lobby masih `scheduled`

Restrictions:
- tidak bisa melihat payment peserta lain
- tidak bisa mengubah player type/payment status
- tidak bisa start match

### 6.4 Host

User yang membuat lobby.

Needs:
- melihat semua lobby yang dia host
- edit detail lobby
- configure match setup
- add/remove participant
- add manual player atau FOM friend
- mengatur player type `External`/`Friend`
- mengatur payment `Paid`/`Unpaid`
- melihat finance summary private
- start match saat setup lengkap dan minimum pemain terpenuhi

Restrictions:
- tidak boleh remove host participant
- tidak boleh start jika minimum pemain belum terpenuhi
- tidak boleh menambah player melebihi kapasitas kecuali kapasitas diedit

## 7. Core User Journey

### 7.1 Host Creates And Launches Lobby

1. Host membuka `Lobby View`.
2. Host tap `Create`.
3. Host mengisi detail lobby: name, description, visibility, slot.
4. Host mengisi time and venue.
5. Host mengaktifkan atau menonaktifkan pricing.
6. Host optionally mengundang friends atau manual player.
7. Sistem membuat lobby.
8. Host membuka `Lobby Detail`.
9. Host mengatur match setup jika belum lengkap.
10. Host menambah/menghapus participant dan update payment jika perlu.
11. Saat minimum pemain terpenuhi, host tap `Start Match`.
12. Lobby berubah ke `in_progress` dan active match dibuat.

### 7.2 Player Discovers And Joins Lobby

1. Player membuka `Lobby View`.
2. Player memilih tanggal atau melihat upcoming rooms.
3. Player membuka salah satu lobby.
4. Player membaca date, venue, slot, format, dan price.
5. Jika eligible, player tap `Join Room`.
6. Sistem menambahkan participant sebagai `joined`.
7. Jika pricing aktif, player dapat melihat `Your Payment`.
8. Player bisa leave selama lobby masih `scheduled`.

### 7.3 Guest Opens Shared Lobby Link

1. Guest membuka shared lobby link.
2. Sistem membuka `Lobby Detail` setelah auth state resolved.
3. Guest melihat public-safe info.
4. CTA utama adalah `Login to Join`.
5. Setelah login berhasil, user kembali ke lobby atau bisa join melalui state logged-in.

## 8. Product Scope

### 8.1 Lobby View Scope

In scope:
- Page header `Plan a room`.
- Create lobby action.
- Summary count untuk upcoming dan hosted lobby.
- Date strip 30 hari.
- Filter sheet untuk `All rooms` dan `Hosted by me`.
- Upcoming room list grouped by time.
- Hosted room visual indicator.
- Room card menampilkan host label, title, format/court/point/duration, venue, price, dan capacity.
- Loading skeleton.
- Empty state untuk no rooms.
- Empty state untuk selected date/filter tanpa room.

Out of scope:
- Search.
- Venue/city/format filters.
- Calendar month view.
- Map view.
- Joined-by-me tab.
- Pagination UI.
- Pull-to-refresh visual detail.
- Friend/private discovery selain hosted milik user.

### 8.2 Lobby Detail Scope

In scope:
- Hero dengan status, title, schedule, venue, back, dan share.
- `Room Info`.
- `About this room`.
- `Match Info`.
- Primary action panel untuk join/leave/login/configure/start.
- `Your Payment` untuk joined player.
- `Host Finance` untuk host.
- `Payment Tracking` prompt jika pricing off.
- Participants list.
- Host participant management.
- Host payment controls per participant.
- Draft changes banner untuk participant/payment edits.
- Add player bottom sheet.
- Add manual player modal.
- Add from friends sheet.
- Empty slot rows.
- Loading/disabled copy untuk action.

Out of scope:
- Lobby chat.
- Payment proof upload.
- Payment gateway.
- Refund workflow.
- Cancel room action dari detail.
- Waitlist.
- Result/history summary untuk completed room.

## 9. Information Architecture

### 9.1 Lobby View IA

Recommended order:

1. Header
   - eyebrow: `Lobby`
   - title: `Plan a room`
   - subtitle
   - `Create` button
   - count summary: upcoming, hosted
2. Date/filter bar
   - filter icon button
   - 30-day horizontal date strip
   - room-count dot on days with rooms
3. Active date header
   - date label
   - section title: `Upcoming rooms` or `Hosted rooms`
   - scope pill: `All rooms` or `Hosted by me`
   - room count
4. Time groups
   - time heading
   - grouped room cards
5. Empty/loading states
6. Filter bottom sheet

### 9.2 Lobby Detail IA

Recommended order:

1. Hero
2. Room Info
3. About this room
4. Match Info
5. Primary action panel
6. Your Payment or Host Finance or Payment Tracking
7. Participants
8. Add player/friend sheets and manual player modal

Visibility:
- `Your Payment` only appears for joined non-host when pricing is enabled.
- `Host Finance` only appears for host when pricing is enabled.
- `Payment Tracking` only appears for host when pricing is disabled.
- Participant management controls only appear for host.

## 10. Lobby View Requirements

### 10.1 Header

Required UI:
- eyebrow: `Lobby`
- title: `Plan a room`
- subtitle: `Pick a time, find a court, and collect players before game day.`
- button: `Create`
- summary metrics:
  - `{n} upcoming`
  - `{n} hosted`

Behavior:
- Tap `Create` opens Room Editor create flow.
- Header remains visible above date/filter bar.
- Counts are derived from upcoming visible room set after dedupe and status filtering.

### 10.2 Date Strip

Required UI:
- horizontal scroll list of 30 days starting today
- weekday label
- day number
- room-count dot when selected scope has room(s) on that date
- selected state

Behavior:
- Default selected date should be first date with rooms in current scope; fallback to today.
- Tap date filters the list to that date.
- Changing filter scope resets selected date to best available date.

Rules:
- Date options use local timezone.
- Date labels in current implementation use English short weekday.
- Future localization may switch to Indonesian locale, but UI copy should stay consistent within one release.

### 10.3 Filter Sheet

Required UI:
- trigger icon button with active indicator when filter is not default
- bottom sheet title: `Room scope`
- options:
  - `All rooms`
  - `Hosted by me`
- count per option
- selected check icon
- disabled state when option has zero rooms

Behavior:
- `All rooms` shows public upcoming rooms plus hosted upcoming rooms, deduped.
- `Hosted by me` shows upcoming rooms where `hostUid = currentUserUid`.
- Closing sheet keeps selected scope.

### 10.4 Room List Grouping

Required UI:
- active date header
- time group header, e.g. `7:00 PM`
- number of rooms in the time group
- cards inside each group

Behavior:
- Rooms are sorted by `scheduledFor` ascending.
- Rooms with the same date+hour+minute are grouped together.
- Completed, cancelled, and in-progress rooms are excluded from Lobby View upcoming list.
- Past rooms are excluded.

### 10.5 Room Card

Required UI:
- host label:
  - hosted room: `Hosted by you` or host display
  - public room: host display or fallback `FOM room`
- hosted pill: `Host`
- title
- game meta:
  - format
  - court count
  - total points if available
  - duration if available
- venue label
- price label
- capacity pill

Data display:
- Venue: `settings.venueName · settings.location`, fallback `Venue TBA`.
- Price: `Rp {amount} / player` if pricing enabled and public price > 0; else `No fee`.
- Capacity: `{joinedCount}/{maxPlayers}` when max exists; else `{joinedCount}`.

Behavior:
- Entire card is clickable.
- Tap opens Lobby Detail.
- Title, venue, and price truncate safely.
- Full lobby state should visually reduce optimism but remain readable.

Privacy:
- Room card must never show private host finance data.
- Do not show court cost, ball cost, profit/loss, collected, unpaid, player type, or participant payment status.

### 10.6 Loading And Empty States

Initial loading:
- Show skeleton groups/cards if data is loading and no upcoming rooms are available yet.
- Do not show empty state before loading has resolved.

No rooms:
- Title: `No room available`
- Copy: `Rooms will appear here when hosts schedule future matches.`

No rooms for selected filter/date:
- Title: `No room available`
- Copy: `Try another date or switch back to all rooms.`

Error future treatment:
- If hosted rooms fail but public rooms load, still show public rooms.
- If public rooms fail but hosted rooms load, still show hosted rooms.
- If all queries fail, show retry state:
  - `Could not load rooms`
  - `Check your connection and try again.`
  - CTA: `Try Again`

## 11. Lobby Detail Requirements

### 11.1 Hero

Required UI:
- back button
- share button
- status badge
- lobby title
- compact schedule pill:
  - date
  - time
  - duration if available
  - venue if available

Status labels:
- `Draft`
- `Scheduled`
- `Open`
- `In Progress`
- `Completed`
- `Cancelled`

Behavior:
- Back returns to Lobby View or previous screen.
- Share opens native/web share flow with lobby link.
- Long title wraps within hero without covering actions.
- Venue in schedule pill truncates if too long.

### 11.2 Room Info

Required UI:
- section label: `Room Info`
- `Edit` chip for host
- date and time
- duration
- venue
- city/area
- player/court label
- slot/minimum caption
- fee label
- visibility + host trust label

Display examples:
- date/time: `Mon, Jun 8 at 07:00 PM`
- duration: `2 hours`
- venue: `Sand Padel`
- city: `Tangerang`
- players/court: `6/8 players · 2 courts`
- caption: `2 slots open · min 4 to start`
- fee: `Per player · Rp 60.000`
- trust: `Public room · Host Budi`

Behavior:
- Host tap `Edit` opens Room Editor edit flow.
- Missing venue should not create broken row; use fallback or omit row if primary value is empty.
- Pricing off should show `No fee`.

### 11.3 About This Room

Required UI:
- section label: `About this room`
- description text if present
- `Read more` / `Less` for long description
- `Edit` chip for host
- empty host prompt if description missing

Behavior:
- Non-host should not see an empty About section.
- Host should see empty-state prompt:
  - `Add host notes, rules, payment instructions, or player requirements.`
- Long description collapses by default and expands on tap.

### 11.4 Match Info

Required UI:
- section label: `Match Info`
- `Edit` chip for host if lobby is still `scheduled`
- chips for:
  - format
  - rounds
  - scoring/points

Behavior:
- Tap host `Edit` opens Room Match Setup.
- If no setup exists, show:
  - `Match format has not been configured yet.`
- `matchSetupConfiguredAt` determines whether host primary action should configure or start.

### 11.5 Primary Action Panel

Host states:
- Setup missing:
  - CTA: `Configure Match`
  - tap opens Room Match Setup
- Setup complete and minimum players met:
  - CTA: `Start Match`
  - tap launches active match
- Setup complete but minimum players missing:
  - show `Not ready to start`
  - show `Need {n} more player(s)`
  - show `{joined}/{min} minimum joined`
  - CTA disabled or replaced by not-ready panel
- Non-scheduled status:
  - CTA disabled/status label reflects room status

Non-host states:
- Guest:
  - CTA: `Login to Join`
- Logged-in, not joined, slot available:
  - CTA: `Join Room` or `Join this room`
- Joined, scheduled:
  - CTA: `Leave Room`
- Joined, not scheduled:
  - CTA disabled/status label
- Full:
  - CTA disabled `Room Full`
- Unavailable:
  - CTA disabled `Unavailable`

Loading copy:
- `Joining...`
- `Leaving...`
- `Starting...`

### 11.6 Your Payment

Visibility:
- Show only for joined non-host user when pricing is enabled.

Required UI:
- amount due
- payment status badge: `Paid` or `Unpaid`
- explanation copy:
  - if finance row exists: `Your host has set your current amount due.`
  - if finance row missing: `Public price is shown until the host updates payment details.`

Data:
- Prefer `RoomParticipantFinance.amountDue` for current user.
- Fallback to public price when no finance row exists.
- Default status is `Unpaid`.

Privacy:
- User sees only their own payment amount/status.
- User must not see participant finance rows for others.
- User must not see host cost/profit.

### 11.7 Host Finance

Visibility:
- Show only for host when pricing is enabled.

Required UI:
- section label: `Host Finance`
- `Host only` badge
- headline realized P/L:
  - `{amount} Profit`
  - `{amount} Loss`
  - `Not calculated yet`
- supporting copy:
  - `Based on joined players and payment status.`
- metric tiles:
  - `Total Cost`
  - `Collected`
  - `Unpaid`
  - `Projected P/L`

Behavior:
- Recalculate when participants, player type, or payment status changes.
- Profit uses positive tone.
- Loss uses warning/destructive tone.
- Values use IDR format without decimals.

Privacy:
- Must never appear to non-host.
- Must never be duplicated into public room document/card.

### 11.8 Payment Tracking Prompt

Visibility:
- Show only for host when pricing is disabled.

Required UI:
- section label: `Payment Tracking`
- `Host only` badge
- title: `Pricing is off`
- copy: `Turn on pricing to mark players as External/Friend and Paid/Unpaid.`
- CTA: `Edit Pricing`

Behavior:
- Tap opens Room Editor edit flow at pricing or keeps editor navigable to pricing step.

### 11.9 Participants

Required UI:
- section label: `Participants`
- `Host controls` badge for host
- participant count
- capacity/empty summary
- room open badge if scheduled and slots available
- participant rows:
  - avatar or initials
  - display name
  - host badge
  - MMR badge when available
  - remove action for non-host participant, host only
- empty slot rows up to `maxPlayers`

Sorting:
- Joined participants should appear before invited/declined/removed if surfaced.
- Host should be visibly identifiable.
- Empty slots appear after filled rows.

Open slot row:
- title: `Open slot`
- host caption: `Tap to add`
- non-host caption: `Available`

Host behavior:
- Tap empty slot opens add player options.
- Host can remove non-host participants.
- Host cannot remove themself.
- Host cannot add above `maxPlayers` unless maxPlayers is edited.

Non-host behavior:
- Participant list is informational.
- Empty slots are not actionable.
- Remove/add/payment controls hidden.

### 11.10 Participant Payment Controls

Visibility:
- Host only.
- Pricing must be enabled.
- Participant must be joined.
- Hide host payment controls if host is excluded from friend split.

Collapsed summary:
- amount due
- player type:
  - `External price`
  - `Friend split`
- payment status:
  - `Paid`
  - `Unpaid`
- expand/collapse affordance

Expanded controls:
- amount due
- explanatory copy:
  - External: `External price uses the public player fee.`
  - Friend: `Friend split divides court and ball cost evenly.`
- toggle `External`/`Friend split`
- toggle `Paid`/`Unpaid`

Behavior:
- Changing player type recalculates amount due.
- Changing payment status updates `Collected`, `Unpaid`, and `Realized P/L`.
- In draft mode, changes are local until `Save Changes`.
- `Paid` should set `paidAt` and `markedPaidBy` when saved.

### 11.11 Draft Changes Banner

Visibility:
- Host only.
- Shows when participant/payment changes exist and are not saved.

Required UI:
- copy: `Participant changes are not saved yet.`
- CTA: `Discard`
- CTA: `Save Changes`
- loading copy: `Saving...`

Behavior:
- `Discard` restores latest saved participants and finance rows.
- `Save Changes` persists participants and participant finance.
- Banner should be above participant list rows so host sees pending changes early.

### 11.12 Add Player Flow

Trigger:
- Host taps an open slot row.

Add player option sheet:
- eyebrow: `Open Slot`
- title: `Add player`
- option: `Manual player`
- option: `FOM friend`

Manual player:
- Opens existing manual player modal.
- Adds participant with:
  - `source = manual`
  - `status = joined`
  - `joinedAt = now`

FOM friend:
- Opens friend picker sheet.
- Hides friends already in lobby.
- Shows loading state: `Loading friends...`
- Shows empty state:
  - `No friends available`
  - `Friends already in this room are hidden.`
- Adds participant with:
  - `source = fom`
  - `status = joined`
  - `joinedAt = now`

## 12. Data Model And Derived Values

### 12.1 Main Room Fields

Lobby uses:
- `id`
- `hostUid`
- `hostDisplayName`
- `title`
- `description`
- `status`
- `visibility`
- `scheduledFor`
- `settings`
- `participants`
- `minPlayers`
- `maxPlayers`
- `pricing`
- legacy `feeEnabled`
- legacy `feeAmount`
- `matchSetupConfiguredAt`
- `launchedTournamentId`

### 12.2 Settings Fields

`settings` uses:
- `name`
- `format`
- `criteria`
- `scoringType`
- `backgroundId`
- `themeColorId`
- `courts`
- `totalPoints`
- `numRounds`
- `durationMinutes`
- `venueName`
- `location`

### 12.3 Participant Fields

Participant uses:
- `id`
- `uid`
- `playerId`
- `displayName`
- `avatar`
- `initials`
- `rating`
- `source`: `host`, `fom`, `manual`
- `status`: `invited`, `joined`, `declined`, `removed`
- `joinedAt`
- `invitedAt`
- `removedAt`

### 12.4 Public Pricing Fields

Public pricing uses:
- `pricing.enabled`
- `pricing.publicPrice`
- `pricing.currency`
- `pricing.version`

Legacy fallback:
- `feeEnabled`
- `feeAmount`

Display rule:
- If `pricing` exists, use it.
- Else use legacy fee fields.
- If not enabled or amount <= 0, show `No fee` or `Free` depending screen context.

### 12.5 Private Host Finance Fields

Private finance uses:
- `roomId`
- `hostUid`
- `enabled`
- `currency`
- `courtCostPerCourt`
- `courtCount`
- `ballCost`
- `totalCourtCost`
- `totalCost`
- `publicPrice`
- `includeHostInFriendSplit`
- `lastCalculatedAt`

Participant finance uses:
- `roomId`
- `participantId`
- `uid`
- `displayName`
- `playerType`: `external` or `friend`
- `paymentStatus`: `unpaid` or `paid`
- `amountDue`
- `paidAt`
- `markedPaidBy`

### 12.6 Derived Values

Joined count:
`participants.filter(status = joined).length`

Open slots:
`max(maxPlayers - joinedCount, 0)` when `maxPlayers` exists.

Capacity label:
- With max: `{joinedCount}/{maxPlayers}`
- Without max: `{joinedCount}`

Minimum readiness:
`joinedCount >= max(4, minPlayers || 4)`

Public price:
Use `pricing.publicPrice` when enabled, fallback to `feeAmount`, formatted as IDR.

Friend split amount:
If pricing enabled:
`ceil(totalCost / eligibleFriendSplitParticipants)`

External amount:
`publicPrice`

Finance summary:
- `totalCharged`: sum amount due for non-host revenue participants
- `totalPaid`: sum paid amount due
- `totalUnpaid`: `totalCharged - totalPaid`
- `projectedProfit`: `totalCharged - totalCost`
- `realizedProfit`: `totalPaid - totalCost`

## 13. Status And Business Rules

### 13.1 Scheduled

Allowed:
- Player can join if slot available.
- Joined player can leave.
- Host can edit room.
- Host can configure setup.
- Host can manage participants.
- Host can start if setup complete and minimum players met.

### 13.2 Open

Expected:
- Treated similar to scheduled if product enables open status.
- CTA rules should be explicit before implementation expands this status.

### 13.3 In Progress

Expected:
- Join/leave/start unavailable.
- Status badge says `In Progress`.
- Room info and participants remain readable.
- Future CTA may link to active match.
- Host finance may remain editable if finance policy allows post-launch updates.

### 13.4 Completed

Expected:
- Join/leave/start unavailable.
- Status badge says `Completed`.
- Participants remain readable.
- Host finance remains visible to host.
- Future CTA may link to result/history.

### 13.5 Cancelled

Expected:
- Join/leave/start unavailable.
- Status badge says `Cancelled`.
- Room info remains readable for context.
- Finance edits should be disabled unless refund/manual settlement flow is defined.

### 13.6 Draft

Expected:
- Host-only.
- Non-host should not access draft lobby.
- Primary action should guide host to edit/configure, not join.

## 14. Privacy And Security Requirements

Lobby View may show:
- public room title
- public schedule
- public venue/location
- public host display name
- joined capacity
- public price
- hosted rooms owned by current user

Lobby View must not show:
- private/friends rooms owned by other users
- court cost
- ball cost
- total cost
- profit/loss
- collected/unpaid totals
- payment status
- player type
- private finance snapshot

Lobby Detail public/player view may show:
- room title and description
- status
- date/time/duration
- venue/location
- public price
- participant list if product allows public participant visibility
- current user's own payment amount/status if joined and pricing enabled

Lobby Detail public/player view must not show:
- host finance section
- participant finance rows for other users
- total cost, projected profit, realized profit
- court cost or ball cost
- host-only action controls

Host view may show:
- all participant finance rows
- host finance summary
- participant management controls
- room edit/setup actions

## 15. Navigation

Screens:
- Lobby View: `screen = rooms`
- Lobby Editor: `screen = room-editor`
- Lobby Detail: `screen = room-detail`
- Lobby Match Setup: `screen = room-setup`

Actions:
- `Create`: opens Lobby Editor create flow.
- Tap room card: opens Lobby Detail.
- Back from Lobby Detail: returns to Lobby View/previous screen.
- `Edit` in detail: opens Lobby Editor edit flow.
- `Configure Match` or Match Info `Edit`: opens Lobby Match Setup.
- `Start Match`: launches active match.
- Shared lobby link: hydrates Lobby Detail via `?room={roomId}`.

## 16. Copy Requirements

Primary UI copy should remain English in this release.

Lobby View:
- `Lobby`
- `Plan a room`
- `Pick a time, find a court, and collect players before game day.`
- `Create`
- `upcoming`
- `hosted`
- `Upcoming rooms`
- `Hosted rooms`
- `All rooms`
- `Hosted by me`
- `Room scope`
- `No room available`
- `Rooms will appear here when hosts schedule future matches.`
- `Try another date or switch back to all rooms.`
- `No fee`
- `Venue TBA`

Lobby Detail:
- `Room Info`
- `About this room`
- `Match Info`
- `Your Payment`
- `Host Finance`
- `Payment Tracking`
- `Participants`
- `Host only`
- `Host controls`
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
- `Unavailable`
- `Not ready to start`
- `Need {n} more`
- `Participant changes are not saved yet.`
- `Discard`
- `Save Changes`
- `Saving...`
- `External price`
- `Friend split`
- `Paid`
- `Unpaid`
- `Open slot`
- `Tap to add`
- `Available`
- `Manual player`
- `FOM friend`
- `No friends available`

## 17. UX And Visual Direction

General:
- Mobile-first, optimized for 360px-430px.
- Works down to 320px small Android.
- Safe-area friendly in PWA standalone mode.
- Feels sporty, clean, energetic, and utilitarian.
- Avoid making finance feel like heavy accounting software.

Lobby View:
- Should feel like a lightweight planner.
- Date strip should make browsing by day fast.
- Filter icon should be compact but discoverable.
- Cards should be dense enough for scanning but not cramped.
- Hosted rooms should be distinguishable without overpowering public rooms.

Lobby Detail:
- Hero should make the lobby feel specific and event-like.
- CTA should be obvious and role-aware.
- Host controls should look actionable but clearly private.
- Finance cards should use green/rose/amber carefully for profit/loss/payment status.
- Participant rows should support long names and currency values without overflow.

Responsive rules:
- Buttons/tap targets should be at least about 40px high/wide.
- Currency and title text must not overflow containers.
- Bottom sheets must be scrollable when content is long.
- Bottom CTA/action areas must respect safe-area and bottom nav.

## 18. Analytics Events

Recommended events:
- `lobby_view_opened`
- `lobby_create_tapped`
- `lobby_filter_opened`
- `lobby_filter_applied`
- `lobby_date_selected`
- `lobby_card_opened`
- `lobby_detail_opened`
- `lobby_share_tapped`
- `lobby_join_tapped`
- `lobby_join_succeeded`
- `lobby_join_failed`
- `lobby_leave_tapped`
- `lobby_leave_succeeded`
- `lobby_leave_failed`
- `lobby_configure_match_tapped`
- `lobby_start_tapped`
- `lobby_start_succeeded`
- `lobby_start_failed`
- `lobby_participant_added`
- `lobby_participant_removed`
- `lobby_payment_status_changed`
- `lobby_payment_type_changed`
- `lobby_participant_changes_saved`
- `lobby_participant_changes_discarded`

Suggested common properties:
- `roomId`
- `viewerRole`: `guest`, `player`, `joined_player`, `host`
- `roomStatus`
- `visibility`
- `joinedCount`
- `maxPlayers`
- `pricingEnabled`
- `selectedDate`
- `filterMode`

## 19. Edge States

Lobby View edge states:
- loading, no data yet
- no upcoming rooms
- no rooms for selected date
- hosted filter with zero hosted rooms
- long room title
- long venue/location
- high public price
- room full
- legacy fee fields only
- invalid scheduled date
- public query fails
- hosted query fails

Lobby Detail edge states:
- room loading
- room not found
- guest view
- user logged in but not joined
- joined player
- host
- room full
- no venue
- no description
- long description
- pricing disabled
- pricing enabled without finance row for current user
- host excluded from friend split
- minimum players not met
- setup missing
- setup complete
- saving participant changes
- save participant changes failed
- friends loading
- no friends available
- long participant name
- high amount due
- in progress
- completed
- cancelled
- draft

## 20. Acceptance Criteria

Lobby View is ready when:
- User can understand this page is for planning and discovering future lobby/room sessions.
- `Create` is visible and opens create flow.
- Date strip filters rooms by selected day.
- Filter sheet switches between `All rooms` and `Hosted by me`.
- Upcoming rooms are deduped, sorted by schedule, and grouped by time.
- Past, completed, cancelled, and in-progress rooms do not appear in upcoming list.
- Room cards show title, host context, format meta, venue, public price, and capacity.
- Hosted rooms are visually identifiable.
- Loading and empty states are clear.
- No private finance data appears in Lobby View.
- Long text and high price remain safe on mobile.

Lobby Detail is ready when:
- Every primary role has a clear state: guest, not-joined player, joined player, host.
- Hero communicates lobby identity, status, schedule, and venue.
- Room Info, About, and Match Info are readable and editable only by host.
- CTA behavior matches role, room status, setup state, capacity, and minimum players.
- Joined player sees only their own payment.
- Host sees Host Finance only when pricing is enabled.
- Host sees Payment Tracking prompt when pricing is disabled.
- Participants list supports host controls, open slots, and non-host read-only view.
- Host payment controls recalculate finance summary correctly.
- Unsaved participant/payment changes show a draft banner with save/discard.
- Add manual player and add friend flows prevent duplicates and respect capacity.
- Private finance data is never visible to guest/player views.

## 21. Dependencies

Product/Design:
- Final terminology: `Room` vs `Lobby` in UI.
- Final policy for public participant visibility.
- Final policy for finance edits after `in_progress`/`completed`.

Engineering:
- Firestore room queries and indexes.
- Firestore rules for public vs private data.
- Auth hydration for shared lobby links.
- Room finance private subcollections.
- Active match launch flow from lobby.
- Friend list integration.
- Existing manual player modal.

## 22. Open Questions

- Should UI labels use `Room` or `Lobby` consistently, or should product migrate all user-facing copy to `Lobby`?
- Should `Joined by me` become a dedicated filter/tab in Lobby View?
- Should public viewers see participant names before login?
- Should full public lobbies remain discoverable or be hidden from Lobby View?
- Should private/friends lobby links show a gate if user is not invited/friend?
- Should host be able to cancel lobby from Lobby Detail in the next MVP?
- Should in-progress Lobby Detail include `Open Active Match` CTA for host and joined players?
- Should payment controls remain editable after active match starts and after match is completed?
- Should payment instructions become structured fields instead of free text in description?
- Should lobby support waitlist when full?

