# PRD: App Homepage / Dashboard FOM Play

Last Updated: 2026-06-08 (Asia/Jakarta)
Owner: Product / Design / Engineering FOM Play
Status: Draft PRD
Primary URL: `https://fomplay.asia/app`
Primary Internal Screen: `dashboard`
UI Language: English
Document Language: Indonesian

## 1. Ringkasan

App Homepage FOM Play adalah halaman utama yang user lihat saat membuka `https://fomplay.asia/app` setelah auth state resolved dan user sudah login. Di codebase, halaman ini direpresentasikan sebagai internal screen `dashboard`.

Halaman ini harus menjadi command center mobile-first untuk pemain dan host. Dalam satu layar, user perlu bisa:
- membuka app dengan cepat setelah login
- melihat identitas dan progres kompetitifnya
- mulai match baru
- membuka Rooms untuk scheduled match planning
- melanjutkan active match bila ada
- membuka recent history
- membuka notifications
- mengakses Ranking, History, dan Profile lewat bottom navigation

Homepage `/app` berbeda dari public homepage `/`. Public homepage menjelaskan produk untuk visitor baru, sedangkan `/app` adalah operational home untuk user yang sudah masuk ke aplikasi dan siap melakukan pekerjaan utama: menjalankan game padel.

## 2. Latar Belakang

FOM Play adalah PWA mobile-first untuk menjalankan game padel, mulai dari setup pemain, format, scoring, klasemen, sharing, history, ranking, friends, dan scheduled rooms.

Setelah login, user tidak boleh merasa perlu mencari-cari fitur utama. `/app` harus langsung memberi prioritas pada action yang paling sering:
- `Start Match` untuk menjalankan match hari ini
- `Rooms` untuk planning match yang akan datang
- `Continue Match` jika ada match aktif
- `Recent History` untuk membuka hasil terakhir
- bottom navigation untuk Ranking, History, dan Profile

Karena FOM Play sering dipakai di court, halaman ini harus cepat dibaca, tap-friendly, tetap stabil di mobile, dan tidak bergantung pada terlalu banyak data sebelum action utama bisa dipakai.

## 3. Problem Statement

User FOM Play membuka `/app` dalam beberapa konteks yang berbeda:
- host mau cepat mulai game
- host mau membuat scheduled room
- pemain ingin melihat ranking, MMR, atau history
- host sedang punya active match yang perlu dilanjutkan
- user baru selesai login dan butuh orientasi pertama
- user membuka link room atau shared match dari komunitas

Jika app homepage tidak jelas, user bisa:
- bingung harus mulai dari mana
- tidak sadar ada active match yang bisa dilanjutkan
- sulit menemukan Rooms
- tidak melihat progres MMR/rank sebagai motivasi
- melewatkan history terbaru
- merasa app lebih rumit daripada workflow manual

Homepage `/app` perlu menjawab pertanyaan operasional: "Apa langkah terbaik saya sekarang?"

## 4. Product Goals

Goals:
- Menjadikan `/app` sebagai entry point utama setelah login.
- Memprioritaskan action `Start Match` sebagai CTA utama.
- Menampilkan `Rooms` sebagai CTA planning yang jelas dan setara pentingnya dengan active gameplay workflow.
- Menampilkan active match continuation hanya jika ada active match.
- Menampilkan MMR, rank tier, dan 7-day MMR delta sebagai motivasi kompetitif.
- Menampilkan recent history agar user bisa membuka hasil terakhir tanpa masuk ke History tab dulu.
- Menyediakan akses cepat ke notifications dan PWA install action.
- Menjaga halaman tetap usable walaupun data history, MMR delta, atau notifications sedang loading atau gagal.
- Membuat navigasi app terasa predictable melalui bottom nav.

Non-goals:
- Tidak menjadi public marketing landing page.
- Tidak menggantikan Match Settings wizard.
- Tidak menampilkan full leaderboard di homepage.
- Tidak menampilkan full history list di homepage.
- Tidak menampilkan daftar semua rooms di homepage.
- Tidak menampilkan data finance room di homepage.
- Tidak menampilkan share match viewer di homepage.
- Tidak menjadi onboarding tutorial panjang.
- Tidak mengubah logic ranking, MMR, atau tournament generation.

## 5. Success Metrics

Primary metrics:
- App homepage view to `Start Match` click-through rate.
- App homepage view to `Rooms` click-through rate.
- Active match detected to `Continue Match` click-through rate.
- Recent history card click-through rate.
- Bottom nav click-through rate to Ranking, History, and Profile.

Activation metrics:
- New logged-in user starts first match from homepage.
- New logged-in user creates first room from homepage.
- Returning user continues active match from homepage.
- User opens recent history from homepage after finishing a match.

Engagement metrics:
- Average weekly homepage opens per active user.
- Repeat use of `Start Match`.
- Repeat use of `Rooms`.
- Ranking tab opens after seeing MMR summary.
- History tab opens after seeing recent history preview.

Quality metrics:
- Dashboard renders after auth without long blank state.
- Primary CTAs are available even when history is loading.
- MMR delta query failures do not block dashboard.
- No horizontal overflow on mobile.
- CTA labels remain readable on small screens.
- Active match summary does not render broken player names or invalid score values.

## 6. Primary Users And Roles

### 6.1 Logged-Out Visitor Opening `/app`

User membuka `https://fomplay.asia/app` tanpa active authenticated session.

Needs:
- melihat login/register flow
- bisa masuk dengan email/password, Google, atau Apple when supported
- bisa reset password
- mendapat browser warning jika social login tidak cocok dengan environment

Expected screen:
- `login`

Primary action:
- Sign in or sign up.

Homepage implication:
- Dashboard tidak dirender sampai user login.
- Setelah login selesai, user diarahkan ke `dashboard` kecuali query/deep link membutuhkan screen lain.

### 6.2 Newly Registered Player

User baru selesai daftar dan belum punya banyak history.

Needs:
- merasa sudah masuk ke app dengan jelas
- melihat nama sendiri atau fallback `Padel Player`
- melihat MMR awal dan rank tier
- tahu action pertama adalah `Start Match`
- bisa membuka Rooms jika ingin schedule game
- melihat empty state recent history

Primary action:
- `Start Match`

Secondary action:
- `Rooms`

### 6.3 Returning Player

User yang pernah main dan membuka `/app` lagi.

Needs:
- melihat progress kompetitif singkat: MMR, rank tier, 7-day delta
- membuka recent history
- membuka ranking
- membuka profile

Primary action:
- tergantung context, antara `Start Match`, `Continue Match`, atau buka recent history/ranking

### 6.4 Host / Match Organizer

User yang bertanggung jawab menjalankan game.

Needs:
- memulai match baru secepat mungkin
- membuka Rooms untuk scheduled match
- melanjutkan active scoring
- membuka notifications terkait app/social state
- melihat history terbaru untuk follow-up ke pemain

Primary action:
- `Start Match`

Secondary actions:
- `Rooms`
- `Continue Match`

### 6.5 Active Match Host

User punya active tournament dengan satu atau lebih active matches.

Needs:
- homepage menunjukkan active match yang harus dilanjutkan
- melihat round, court, players, current score, dan duration
- tap sekali untuk masuk ke active match screen

Primary action:
- `Continue scoring`

### 6.6 Room Link Visitor

User membuka `/app?room={roomId}`.

Needs:
- auth resolved terlebih dahulu
- jika login diperlukan, login screen muncul
- setelah login, app hydrate room detail, bukan berhenti di dashboard
- jika room tidak ditemukan, error notification muncul

Homepage implication:
- Dashboard adalah fallback, bukan destination utama untuk room deep link.

### 6.7 Shared Match Viewer

User membuka `/app?shared={shareId}` atau shared standings query.

Needs:
- read-only shared match/standings view
- tidak diarahkan ke dashboard unless share target invalid atau selesai fallback

Homepage implication:
- Shared viewer flow harus tetap dipertahankan dan tidak dikacaukan oleh dashboard routing.

## 7. Route And Navigation Model

Primary URL:
- `https://fomplay.asia/app`

Internal screen:
- `dashboard`

Related app screens:
- `login`
- `settings`
- `background-picker`
- `active`
- `klasemen`
- `notifications`
- `history`
- `history-detail`
- `leaderboard`
- `rank-discovery`
- `mmr-history`
- `profile`
- `friends`
- `rooms`
- `room-editor`
- `room-detail`
- `room-setup`

Default behavior:
- If auth is not resolved, show app loading screen.
- If user is not logged in, show `login`.
- If user is logged in and no deep link overrides destination, show `dashboard`.
- If `?room={roomId}` exists, hydrate room detail after auth state resolves.
- If `?shared={shareId}` exists, open shared viewer flow.

Bottom navigation tabs:
- Home -> `dashboard`
- Ranking -> `leaderboard`
- History -> `history`
- Profile -> `profile`

Back behavior:
- Browser history state should reflect internal screen changes.
- Back from many child screens should return to `dashboard` if launched from dashboard.
- iOS-like edge swipe back should call browser history back where supported.

## 8. Information Architecture

Recommended visible order on dashboard:

1. Top app bar
2. Welcome identity block
3. MMR summary row
4. Primary action group
5. Continue Match card, conditional
6. Recent History
7. Bottom navigation

Current core layout:
- App logo on top left.
- Install app button and notification button on top right.
- Welcome text and user display name.
- MMR, rank tier, and 7-day MMR delta row.
- CTA group with `Start Match` and `Rooms`.
- Conditional `Continue Match` section.
- `Recent History` section with `View All`.
- Fixed bottom nav.

## 9. Functional Requirements

### 9.1 App Loading State

Requirements:
- Show loading screen while auth state is not checked.
- Show loading screen while shared viewer data is not ready.
- Loading screen should visually align with FOM Play brand.
- Loading screen must not expose partial dashboard data.

Priority:
- P0.

Acceptance criteria:
- `/app` does not flash dashboard for logged-out user.
- `/app?shared=...` does not flash dashboard before shared payload resolves.
- Loading screen covers full viewport including safe area.

### 9.2 Logged-Out State

Requirements:
- Logged-out users opening `/app` see login/register surface.
- Login supports email/password.
- Register captures name, email, password.
- Password reset flow is available.
- Social auth is available where browser/environment supports it.
- Errors are clear and actionable.

Priority:
- P0.

Acceptance criteria:
- Successful login routes to dashboard unless a deep link requires another screen.
- Successful registration creates profile baseline where possible.
- Auth failures do not leave user in a loading state.

### 9.3 Top App Bar

Requirements:
- Show FOM logo.
- Show compact PWA install button when eligible.
- Show notification button when notifications feature is enabled.
- Show unread badge when unread count is greater than 0.
- Notification badge displays `9+` for counts above 9.

Priority:
- P0 for logo and notification affordance.
- P1 for install CTA polish.

Acceptance criteria:
- Logo remains visible on mobile.
- Install button does not crowd notification button.
- Notification tap opens notifications screen.
- Notification unread badge does not obscure the icon.

### 9.4 Welcome Identity Block

Requirements:
- Show greeting copy `Welcome back`.
- Show display name from user profile when available.
- Fallback to `Padel Player`.
- Name should not overflow or break layout.

Priority:
- P0.

Acceptance criteria:
- Long display names wrap or truncate gracefully.
- Missing display name does not create blank H1.
- Greeting remains secondary to user name.

### 9.5 MMR Summary

Requirements:
- Show current MMR.
- Show label `MMR`.
- Show current rank tier name and icon.
- Show 7-day MMR delta with label format like `+12 this week`.
- Show loading state for MMR delta while query is running.
- Cache 7-day MMR delta locally for a limited period to reduce repeated reads.

Data source:
- Current MMR from current user profile / stats model.
- Rank tier from rank utility.
- 7-day delta derived from `player_match_ledger`.
- 7-day delta cache key is user-specific.

Priority:
- P0.

Acceptance criteria:
- MMR displays a valid formatted number.
- Missing or invalid MMR falls back safely.
- Delta loading shows `Loading...`.
- Delta query failure falls back to `+0 this week` and does not block dashboard.
- Rank name and icon stay aligned on small screens.

### 9.6 Primary CTA: Start Match

Requirements:
- `Start Match` is the strongest visual CTA.
- CTA includes supporting label `Quick`.
- CTA body: `Set players and start scoring.`
- Tapping starts Match Settings flow.
- If existing setup draft has no changes, app resets to a fresh tournament draft.
- Match Settings wizard starts at first step.
- Draft background selection is cleared.

Priority:
- P0.

Acceptance criteria:
- CTA is visible without deep scrolling on common mobile viewport.
- Tap target is large enough for one-handed mobile use.
- Tap routes to `settings`.
- CTA remains usable while history or MMR delta is loading.

### 9.7 Secondary CTA: Rooms

Requirements:
- `Rooms` appears in the same CTA group as Start Match.
- CTA includes supporting label `Plan`.
- CTA body: `Schedule, invite, and prep players.`
- Tapping opens `rooms`.

Priority:
- P0.

Acceptance criteria:
- CTA routes to `rooms`.
- CTA clearly communicates scheduled match planning, not active scoring.
- CTA remains visible near Start Match.

### 9.8 Continue Match Section

Requirements:
- Show only if there is an active round with at least one active match.
- Select first active match as featured active match.
- Show section title `Continue Match`.
- If multiple active matches exist, show active count pill.
- Card shows tournament name.
- Card shows round and court.
- Card shows player names for both teams.
- Card shows live score.
- Card shows duration or `00:00` fallback.
- CTA copy includes `Continue scoring`.
- Tapping card opens active match screen.

Data source:
- Current active tournament local/app state.
- Active round is first round with match status `active`.
- Featured match is first active match in that round.

Priority:
- P0 when active match exists.

Acceptance criteria:
- Section is hidden when no active match exists.
- Score values render safely.
- Player names are readable even when full names are long.
- Multiple active matches indicator uses correct count.
- Tap routes to `active`.

### 9.9 Recent History Section

Requirements:
- Show section title `Recent History`.
- Show `View All` button.
- Show up to 3 recent finished tournaments.
- Recent history is sorted newest first.
- Each recent item can open history detail.
- Loading state appears while initial history hydration is unresolved.
- Empty state appears if user has no finished matches.

Priority:
- P0.

Acceptance criteria:
- `View All` routes to `history`.
- Recent cards route to `history-detail`.
- Loading state says `Loading history...`.
- Empty state says `No finished matches yet.`
- Empty/loading cards do not shift primary CTA section.

### 9.10 Bottom Navigation

Requirements:
- Show bottom nav only for logged-in non-shared-viewer app screens:
  - `dashboard`
  - `leaderboard`
  - `history`
  - `profile`
- Tabs:
  - Home
  - Ranking
  - History
  - Profile
- Active tab expands with label.
- Inactive tabs show icon-only.
- Profile tab shows unread badge when unread count exists.
- Bottom nav respects safe-area inset.

Priority:
- P0.

Acceptance criteria:
- Home tab routes to `dashboard`.
- Ranking tab routes to `leaderboard`.
- History tab routes to `history`.
- Profile tab routes to `profile`.
- Bottom nav does not overlap tappable content in a way that blocks page use.

### 9.11 Notifications Entry

Requirements:
- Show notification button only when notifications feature flag is enabled.
- Tap opens `notifications`.
- Dashboard should remember notification back target as `dashboard`.

Priority:
- P1 if notifications are feature-flagged off.
- P0 if notifications are enabled in production.

Acceptance criteria:
- Unread badge count is accurate based on unread notifications state.
- Returning from notifications lands back on dashboard.

### 9.12 PWA Install Entry

Requirements:
- Show compact install app affordance when applicable.
- Entry should not distract from primary CTAs.
- iOS and browser-specific behavior should follow existing InstallAppButton logic.

Priority:
- P1.

Acceptance criteria:
- Button does not render broken if app is already installed.
- Button remains compact on mobile.

## 10. State Requirements

### 10.1 No Active Match

Expected behavior:
- Hide `Continue Match`.
- Keep Start Match and Rooms as primary actions.
- Recent History remains visible.

### 10.2 Active Match Exists

Expected behavior:
- Show `Continue Match`.
- Place after Start Match / Rooms group.
- Do not hide Start Match; user may still start a new match if product allows it.

Open product question:
- Should starting a new match while another match is active be allowed, warned, or blocked?

### 10.3 History Loading

Expected behavior:
- Show loading card only inside Recent History section.
- Do not block Start Match, Rooms, or Continue Match.

### 10.4 No History

Expected behavior:
- Show empty state.
- Empty state should encourage first match implicitly through presence of Start Match, not through extra verbose copy.

### 10.5 MMR Delta Loading

Expected behavior:
- Show `Loading...` pill.
- Do not block rest of page.

### 10.6 MMR Delta Error

Expected behavior:
- Fallback to `+0 this week`.
- Optionally log error for diagnostics.
- Do not show scary error to user.

### 10.7 Notifications Disabled

Expected behavior:
- Hide notification button.
- Top app bar remains balanced with logo and install CTA.

### 10.8 Missing User Display Name

Expected behavior:
- Show `Padel Player`.

### 10.9 Deep Link To Room

Expected behavior:
- Auth resolves first.
- If logged out, login is shown.
- After login, hydrate room and open `room-detail`.
- If not found, show notification error and fallback to dashboard.

### 10.10 Deep Link To Shared Match

Expected behavior:
- Shared viewer flow takes priority.
- Dashboard should not appear unless shared viewer flow exits/fails.

## 11. Content Requirements

Current UI copy:
- `Welcome back`
- `Padel Player`
- `MMR`
- `Loading...`
- `this week`
- `Start Match`
- `Quick`
- `Set players and start scoring.`
- `Rooms`
- `Plan`
- `Schedule, invite, and prep players.`
- `Continue Match`
- `Live score`
- `Continue scoring`
- `Recent History`
- `View All`
- `Loading history...`
- `No finished matches yet.`
- `Home`
- `Ranking`
- `History`
- `Profile`

Copy principles:
- Keep UI short because dashboard is action-oriented.
- Prefer direct verbs.
- Avoid explaining full feature mechanics on dashboard.
- Avoid marketing language inside app homepage.
- Keep English labels consistent across app surface unless a localization project changes UI language globally.

Potential future copy improvements:
- Add contextual greeting based on time of day.
- Add first-match empty state copy if onboarding becomes a priority.
- Add room-specific prompt if user has upcoming hosted rooms.

## 12. Design And UX Requirements

Design principles:
- Mobile-first.
- Prioritize action clarity over decoration.
- CTA hierarchy must be obvious.
- Keep cards compact but readable.
- Use rounded, touch-friendly controls consistent with current app style.
- Keep bottom nav floating and reachable.

Visual hierarchy:
- User identity and MMR establish personal context.
- Start Match must be highest visual weight.
- Rooms must be visually adjacent as planning action.
- Continue Match must become prominent only when relevant.
- Recent History is useful but lower priority than active action.

Responsive behavior:
- Main content max width remains constrained for large screens.
- Mobile viewport should show top identity, MMR, and primary CTA quickly.
- Long display names, tournament names, and player names must not break layout.
- Bottom padding must account for bottom nav.

Interaction behavior:
- CTAs use active/tap feedback.
- Cards should be fully tappable where expected.
- History card tap target should be clear.
- Notification badge should not interfere with tap.

Accessibility:
- Notification button has accessible label.
- Bottom nav buttons have labels.
- Icon-only inactive bottom nav still has accessible names.
- Focus order should follow visual order.
- Text contrast should remain readable.
- Loading and empty states should be understandable without icon recognition.

## 13. Data Requirements

Required data:
- current user uid
- display name
- user MMR
- unread notifications count
- current active tournament
- active round and active matches
- recent tournament history
- `player_match_ledger` rows for 7-day MMR delta

Derived data:
- current rank tier from MMR
- formatted MMR label
- 7-day MMR delta
- recent tournaments sorted newest first and sliced to 3
- featured active match
- active match count

Local cache:
- 7-day MMR delta cache key: user-specific
- cache max age: 1 hour

Data failure policy:
- Missing MMR -> safe fallback.
- MMR delta query failure -> show zero delta.
- History loading failure -> should eventually show empty/fallback state or remain recoverable from History tab.
- Notifications failure -> badge should not block page.

## 14. Technical Requirements

Rendering:
- Dashboard component must be pure enough to render from props and local derived state.
- Firestore read for 7-day MMR delta should be isolated and cancellable.
- Dashboard should not write to Firestore.
- Local cache writes are best effort.

Routing:
- `onStartMatch` sets up fresh draft when appropriate and routes to `settings`.
- `onOpenRooms` routes to `rooms`.
- `onContinueMatch` routes to `active`.
- `onNotifications` routes to `notifications`.
- `onOpenHistoryList` routes to `history`.
- `onOpenHistoryMatch` opens `history-detail`.
- Bottom nav sets top-level app screens.

Performance:
- Dashboard must not wait for history before rendering CTAs.
- MMR delta cache should reduce repeated Firestore reads.
- Recent history list is capped at 3.
- Avoid expensive re-sorting by memoizing recent tournaments.

Security and privacy:
- Dashboard only shows current user's data.
- No private room finance data should appear.
- Shared viewer should remain read-only and separate.
- Deep link room access should respect room rules and auth model.

## 15. Analytics Requirements

Recommended events:
- `app_home_viewed`
- `app_home_start_match_clicked`
- `app_home_rooms_clicked`
- `app_home_continue_match_clicked`
- `app_home_notifications_clicked`
- `app_home_history_view_all_clicked`
- `app_home_recent_history_clicked`
- `app_home_bottom_nav_clicked`
- `app_home_install_clicked`
- `app_home_mmr_delta_loaded`
- `app_home_mmr_delta_failed`

Recommended event properties:
- `screen`
- `uid_hash` or non-PII stable user analytics id
- `is_logged_in`
- `has_active_match`
- `active_match_count`
- `has_recent_history`
- `recent_history_count`
- `current_rank_tier`
- `mmr_delta_7d_bucket`
- `target_screen`
- `source_route`
- `has_room_query`
- `has_shared_query`

Analytics principles:
- Do not block navigation.
- Do not log player names, email, phone, or raw private data.
- Bucket sensitive numeric values where possible.

## 16. Edge Cases

Auth and routing:
- User opens `/app` logged out.
- User opens `/app` logged in.
- User opens `/app?room=...` logged out.
- User opens `/app?room=...` logged in.
- User opens `/app?shared=...`.
- User auth expires while on dashboard.
- User signs out from profile then returns to `/app`.

Data:
- User has no display name.
- User has invalid MMR value.
- User has no ledger rows in last 7 days.
- Ledger query is denied or times out.
- History is still hydrating.
- History has fewer than 3 items.
- Active tournament exists but no active match exists.
- Active match player list has missing player names.
- Active match duration is missing.

Layout:
- Very long user display name.
- Very long tournament name.
- Very long player names.
- Small mobile viewport.
- Large desktop viewport.
- Bottom nav overlaps long history list.
- Browser safe-area inset changes after install/PWA mode.

Product:
- User has active match and taps Start Match.
- User has upcoming hosted room but dashboard only shows generic Rooms CTA.
- Notifications disabled but unread count exists.
- Install button renders on unsupported browser.

## 17. Acceptance Criteria

P0 acceptance:
- `/app` shows loading screen until auth is resolved.
- Logged-out user sees login/register flow.
- Logged-in user without deep link sees dashboard.
- Dashboard shows logo, welcome identity, MMR summary, Start Match, Rooms, Recent History, and bottom nav.
- `Start Match` routes to match settings.
- `Rooms` routes to rooms list.
- Active match summary appears only when active match exists.
- `Continue Match` routes to active match screen.
- `View All` routes to History.
- Recent history item routes to History Detail.
- Bottom nav routes correctly to Home, Ranking, History, Profile.
- MMR delta loading/error does not block page.
- No history state renders clearly.
- No horizontal overflow on mobile.

P1 acceptance:
- Notification button opens notifications and shows unread badge correctly.
- Install app button renders compactly and does not disrupt header.
- 7-day MMR delta cache reduces repeated Firestore reads.
- Browser back behavior returns user through recent internal screen states.
- iOS-like edge swipe back behavior works where supported.

P2 acceptance:
- Dashboard can later surface upcoming room preview.
- Dashboard can later include onboarding prompt for first-time users.
- Dashboard can later include personalized recommendations without restructuring core layout.

## 18. QA Checklist

Manual QA:
- Open `/app` logged out.
- Login with valid email/password.
- Register a new account.
- Reset password flow from login.
- Open `/app` logged in.
- Tap `Start Match`.
- Tap `Rooms`.
- Create or open a room from Rooms, then return.
- Start an active match, return to dashboard, verify Continue Match appears.
- Tap Continue Match.
- Finish or remove active state, verify Continue Match disappears.
- Verify Recent History loading state.
- Verify Recent History empty state.
- Verify Recent History with 1, 2, and 3+ items.
- Tap `View All`.
- Tap each bottom nav tab.
- Open notifications from dashboard.
- Verify unread badge `9+` behavior.
- Verify display name fallback.
- Verify long names on mobile.

Deep link QA:
- Open `/app?room=<validRoomId>` logged out.
- Open `/app?room=<validRoomId>` logged in.
- Open `/app?room=<invalidRoomId>`.
- Open `/app?shared=<validShareId>`.
- Open `/app?shared=<validShareId>&view=klasemen`.

Performance QA:
- Open dashboard on slow network.
- Confirm Start Match and Rooms are usable before history finishes.
- Confirm repeated dashboard opens use cached MMR delta within cache window.

Accessibility QA:
- Navigate with keyboard.
- Verify notification button accessible label.
- Verify bottom nav accessible labels.
- Verify focus visibility.
- Check color contrast on CTA and cards.

Regression QA:
- Existing E2E flows:
  - auth flow
  - start match flow
  - finished flow
  - share flow
  - room flow if available
- Confirm `/` public homepage behavior remains separate from `/app`.

## 19. Rollout Plan

Phase 1: Dashboard baseline
- Keep current `/app` route behavior.
- Ensure logged-in dashboard has all P0 sections.
- Ensure CTAs route correctly.
- Ensure deep links are not broken.

Phase 2: Measurement
- Add analytics events for dashboard actions.
- Track Start Match, Rooms, Continue Match, and History click-through.
- Track MMR delta load/failure rates.

Phase 3: Reliability polish
- Review Firestore reads for dashboard.
- Confirm MMR delta cache behavior.
- Confirm auth/deep-link edge cases.
- Add tests around dashboard route and active match visibility.

Phase 4: Product iteration
- Consider upcoming room preview.
- Consider first-time user guidance.
- Consider contextual CTA based on active match, upcoming room, or recent play.
- Consider rank progress preview that links into MMR History.

## 20. Dependencies

Product:
- Confirm whether Start Match should be allowed when an active match exists.
- Confirm if Rooms should eventually show upcoming room count on homepage.
- Confirm if dashboard should mention scheduled rooms by name.
- Confirm UI language should remain English.

Design:
- Final visual hierarchy for Start Match vs Rooms.
- Long-name and mobile safe-area treatment.
- Empty state visual style.
- Notification and install button placement.

Engineering:
- App routing and history state.
- Auth bootstrap.
- MMR/rank utilities.
- Player ledger query/index.
- History hydration.
- Rooms data model.
- Notifications state.
- PWA install component behavior.

Analytics:
- Event taxonomy.
- Non-PII user identifier policy.
- Funnel definition from `/app` to match/room creation.

## 21. Open Questions

- Should dashboard show an upcoming hosted room preview below Rooms?
- Should user see a warning before starting a new match while another active match exists?
- Should MMR delta show negative values in red, positive in green, and zero in neutral?
- Should first-time users see an onboarding hint or keep dashboard minimal?
- Should `Rooms` be renamed to `Plan Room` or `Schedule Match` for clarity?
- Should notification entry remain in top bar or move into Profile tab only?
- Should Recent History show match format/venue summary more prominently?
- Should dashboard expose direct link to MMR History from the MMR summary row?

## 22. Related Documents

- `docs/SSOT_FOM_PLAY.md`
- `docs/SSOT_FOM_PLAY_EXEC_SUMMARY.md`
- `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`
- `docs/DOCS_UPDATE_CHECKLIST.md`
- `docs/PRD_HOMEPAGE.md`
- `docs/PRD_BRIEF_LOBBY_VIEW_AND_DETAIL.md`
