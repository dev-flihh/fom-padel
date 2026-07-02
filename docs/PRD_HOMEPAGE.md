# PRD: Homepage FOM Play

Last Updated: 2026-06-08 (Asia/Jakarta)
Owner: Product / Design / Engineering FOM Play
Status: Draft PRD
UI Language: Indonesian
Document Language: Indonesian
Primary Route: `/`
Related App Route: `/app`

## 1. Ringkasan

Homepage FOM Play adalah public entry point utama untuk visitor baru, returning user, dan search traffic yang ingin memahami apa itu FOM Play sebelum masuk ke app. Homepage harus menjelaskan value FOM Play dalam hitungan detik, memberi akses cepat ke app, dan membuka jalur SEO ke halaman fitur, format padel, ranking, FAQ, dan blog.

FOM Play adalah PWA mobile-first untuk mengelola game padel dari HP, mulai dari setup pemain, format game, live scoring, klasemen otomatis, sharing scoreboard, ranking, history, friends, sampai scheduled room planning.

Homepage bukan hanya landing page marketing. Homepage berperan sebagai:
- gerbang cepat menuju app untuk user yang sudah tahu FOM Play
- penjelasan produk untuk user baru
- pusat navigasi public routes
- SEO hub untuk intent padel app, live score padel, format Americano, Mexicano, Match Play, dan ranking padel
- trust builder untuk host komunitas yang ingin menjalankan game lebih rapi

## 2. Latar Belakang

Sebelum homepage disusun sebagai public product surface, root domain FOM Play lebih banyak dipakai sebagai entry point app atau artifact hosting/blog. Saat produk makin lengkap, root perlu berfungsi sebagai homepage hybrid: tetap app-first, tetapi cukup kaya untuk visitor yang datang dari search, share, komunitas, atau rekomendasi.

Produk saat ini punya beberapa kekuatan yang perlu terlihat sejak homepage:
- Host bisa setup match dari HP.
- Host bisa schedule room sebelum game day dan mengumpulkan peserta.
- Skor bisa diupdate live.
- Klasemen otomatis bergerak setelah skor masuk.
- Share link memungkinkan pemain lain memantau tanpa flow login yang berat.
- Scoreboard cocok untuk dibagikan ke grup atau Instagram Story.
- Ranking global dan daerah memberi konteks kompetitif jangka panjang.
- Format yang didukung mencakup Americano, Mexicano, dan Match Play.

Homepage harus menyatukan semua ini tanpa membuat visitor merasa sedang membaca dokumentasi panjang. Pengalaman utama harus cepat dipahami, mobile-first, dan langsung mengarah ke tindakan.

## 3. Problem Statement

Host padel sering menjalankan game dengan banyak koordinasi manual: format, pemain, court, pairing, skor, klasemen, dan hasil akhir. Di sisi lain, banyak visitor belum tahu bahwa FOM Play menyelesaikan alur itu dalam satu app. Jika homepage tidak menjelaskan value secara jelas, visitor akan:
- tidak paham bedanya FOM Play dengan spreadsheet, chat group, atau scoreboard manual
- tidak tahu format game apa saja yang didukung
- tidak melihat manfaat shared view dan story-ready scoreboard
- tidak sadar ranking global dan daerah tersedia
- tidak menemukan jalur masuk cepat ke app
- tidak menemukan halaman edukasi yang membantu SEO dan product education

Homepage perlu menjawab pertanyaan paling dasar: "Kenapa saya harus pakai FOM Play untuk game padel berikutnya?"

## 4. Product Goals

Goals:
- Menjelaskan FOM Play sebagai aplikasi padel untuk live scoring, klasemen, sharing, format game, dan ranking.
- Memprioritaskan CTA `Buka App` agar returning user dan visitor yang siap mencoba bisa masuk tanpa friction.
- Memberi gambaran visual yang nyata tentang live scoring, shared view, story-ready scoreboard, dan ranking.
- Mengarahkan visitor ke public routes yang relevan: `/fitur`, `/format/americano`, `/format/mexicano`, `/format/match-play`, `/ranking`, `/faq`, dan `/blog`.
- Meningkatkan peluang organic discovery melalui SEO copy, metadata, structured data, dan internal linking.
- Menjaga pengalaman mobile-first karena mayoritas penggunaan FOM Play terjadi di HP dan di sekitar court.
- Menyediakan narasi yang cocok untuk host komunitas, pemain sosial-kompetitif, dan pemain yang tertarik ranking.

Non-goals:
- Tidak menggantikan app shell di `/app`.
- Tidak membuat full onboarding interaktif di homepage.
- Tidak meminta user login di homepage.
- Tidak menampilkan data user, room, ranking real-time, atau history personal di homepage MVP.
- Tidak menjadi pricing page atau checkout page.
- Tidak menjelaskan semua detail rules Americano, Mexicano, dan Match Play secara penuh. Detail format berada di halaman masing-masing.
- Tidak menjadi blog listing lengkap. Blog hanya perlu terlihat sebagai nav entry atau supporting link.

## 5. Success Metrics

Product metrics:
- Homepage visitor to app open click-through rate.
- Homepage visitor to feature page click-through rate.
- Homepage visitor to format page click-through rate.
- Homepage visitor to ranking page click-through rate.
- Share of returning users who open `/` then continue to `/app`.
- Organic sessions landing on `/`.
- Organic sessions continuing from `/` to format or FAQ pages.

Activation metrics:
- Visitor opens `/app` after homepage session.
- New visitor reaches login/register flow from homepage CTA.
- New visitor starts match or creates room after entering app.

SEO metrics:
- Indexed homepage status for `https://fomplay.asia/`.
- Search impressions for homepage target queries.
- Click-through rate for homepage search result.
- Internal link discovery to format, ranking, FAQ, and blog routes.
- Core Web Vitals pass rate on mobile.

Quality metrics:
- No broken public nav links.
- No public route regression for shared match query `?shared=...` and room invite query `?room=...`.
- Homepage loads without blank state under slow network.
- Text does not overflow cards, CTA buttons, or mobile nav.
- Lighthouse accessibility score remains healthy for public marketing route.

## 6. Primary Users

### 6.1 New Visitor

User yang baru mendengar FOM Play dari teman, komunitas, search, atau social link.

Needs:
- memahami FOM Play dalam 5-10 detik
- melihat manfaat utama tanpa harus login
- tahu bahwa app bisa dipakai di HP
- menemukan CTA untuk mencoba app
- melihat format game yang didukung

Primary action:
- Tap `Buka App`

Secondary actions:
- Tap `Lihat Fitur`
- Buka halaman format
- Buka ranking atau FAQ

### 6.2 Returning User

User yang sudah tahu FOM Play dan membuka root domain karena lebih mudah diingat daripada `/app`.

Needs:
- akses cepat ke app
- tidak terjebak di marketing page terlalu lama
- CTA terlihat di header, hero, education block, dan final CTA

Primary action:
- Tap `Buka App`

### 6.3 Host Komunitas

User yang mengatur game untuk teman, komunitas, club, atau court.

Needs:
- melihat bahwa FOM Play membantu flow host dari setup sampai share hasil
- memahami bahwa pemain lain bisa memantau tanpa login rumit
- melihat manfaat live scoring, klasemen otomatis, story-ready scoreboard, dan scheduled rooms
- percaya bahwa app cukup praktis dipakai saat game berjalan

Primary action:
- Tap `Buka App`

Secondary actions:
- Tap `Lihat Fitur`
- Baca format game

### 6.4 Player Kompetitif

User yang tertarik posisi, MMR, ranking kota, dan progres jangka panjang.

Needs:
- melihat bahwa ranking global dan daerah adalah fitur utama
- memahami bahwa tiap match punya efek terhadap reputasi/performa
- masuk ke halaman `/ranking` untuk detail

Primary action:
- Tap `Ranking`

Secondary action:
- Tap `Buka App`

### 6.5 SEO Visitor

Visitor yang datang dari query seperti `americano padel`, `mexicano padel`, `aplikasi padel`, `live score padel`, atau `ranking padel`.

Needs:
- menemukan jawaban yang relevan dengan intent pencarian
- menemukan link lanjutan yang lebih spesifik
- melihat FOM Play sebagai produk yang bisa dipakai setelah membaca

Primary action:
- Tap halaman edukasi atau format terkait

Secondary action:
- Tap `Buka App`

## 7. Positioning And Messaging

Category statement:
- FOM Play adalah aplikasi padel untuk hosting game, live scoring, klasemen otomatis, shareable scoreboard, dan ranking pemain.

Core message:
- `Mabar padel makin seru dengan FOM Play.`

Supporting message:
- `Atur format dan ronde, nikmati live score real-time, dan bagikan klasemen langsung ke Instagram Story tanpa ribet, langsung jadi.`

Primary proof points:
- Live scoring
- Shareable scoreboard
- Ranking global dan daerah

Differentiators:
- Mendukung Americano, Mexicano, dan Match Play.
- Shared match view bisa dipantau dari HP pemain lain.
- Scoreboard cukup rapi untuk dibagikan ke Story atau grup.
- Ranking global dan daerah memberi konteks performa.
- App dirancang mobile-first untuk situasi game berjalan.
- Flow host lebih ringan dibanding koordinasi manual.

Tone:
- Casual, confident, Indonesia-first.
- Pakai bahasa yang dekat dengan komunitas padel.
- Hindari tone enterprise yang terlalu kaku.
- Hindari klaim berlebihan yang belum didukung data.

## 8. Core User Journeys

### 8.1 Visitor Opens Homepage And Starts App

1. Visitor membuka `/`.
2. Header dan hero muncul tanpa blank state panjang.
3. Visitor membaca headline dan supporting copy.
4. Visitor melihat visual live scoring dan proof points.
5. Visitor tap `Buka App`.
6. Sistem mengarahkan ke `/app`.
7. App bootstrap menentukan apakah user harus login atau bisa masuk dashboard.

Acceptance criteria:
- CTA `Buka App` tersedia above the fold di desktop dan mobile.
- CTA tetap terlihat di header desktop dan mobile menu.
- Route `/app` tidak menghilangkan query behavior app shell yang sudah ada.

### 8.2 Visitor Explores Feature Details

1. Visitor membuka `/`.
2. Visitor tap `Lihat Fitur` atau nav `Fitur`.
3. Sistem mengarahkan ke `/fitur` atau section fitur sesuai nav behavior yang disepakati.
4. Visitor melihat fitur utama dan CTA kembali ke app.

Acceptance criteria:
- Link feature tidak broken.
- Copy feature konsisten dengan homepage.
- Visitor tetap bisa kembali ke app melalui CTA.

### 8.3 Visitor Learns Game Format

1. Visitor membuka homepage.
2. Visitor scroll ke `Format Game`.
3. Visitor memilih Americano, Mexicano, atau Match Play.
4. Sistem mengarahkan ke route format terkait.
5. Visitor membaca detail format dan dapat membuka app.

Acceptance criteria:
- Setiap format card punya CTA yang jelas.
- Route target sesuai `TOP_LEVEL_PATHS`.
- Internal links membantu SEO crawl.

### 8.4 Ranking-Oriented Visitor

1. Visitor melihat ranking preview di hero atau section ranking.
2. Visitor tap nav `Ranking` atau CTA ranking.
3. Sistem membuka `/ranking`.
4. Visitor memahami ranking global dan daerah.
5. Visitor bisa membuka app untuk bermain atau melihat ranking di app.

Acceptance criteria:
- Ranking terlihat sebagai product differentiator, bukan hanya secondary feature.
- Copy tidak menjanjikan hal yang belum tersedia.

### 8.5 Mobile Visitor Opens Menu

1. Visitor membuka homepage di mobile.
2. Visitor tap `Menu`.
3. Menu menampilkan links public route dan CTA.
4. Visitor memilih route atau `Coba Gratis`.

Acceptance criteria:
- Menu bisa dibuka dan ditutup.
- Menu item cukup besar untuk tap.
- Tidak ada horizontal scrolling.
- Header tidak menutupi content secara permanen.

## 9. Information Architecture

Recommended homepage section order:

1. Header
2. Hero
3. Quick proof
4. Why FOM Play
5. Core Features
6. How It Works
7. Format Game
8. Sharing & Story
9. Ranking
10. Edukasi
11. FAQ
12. Final CTA
13. Footer

Public route map:
- `/` = Homepage
- `/app` = Main app shell
- `/fitur` = Feature overview
- `/format/americano` = Americano education page
- `/format/mexicano` = Mexicano education page
- `/format/match-play` = Match Play education page
- `/edukasi/perbedaan-americano-vs-mexicano` = Comparison article
- `/ranking` = Ranking explanation page
- `/faq` = FAQ page
- `/blog` = Blog entry point

## 10. Functional Requirements

### 10.1 Header

Requirements:
- Display FOM logo/logotype.
- Link logo to `/`.
- Desktop nav includes `Fitur`, `Format`, `Ranking`, `Blog`, and `FAQ`.
- Desktop primary CTA label is `Coba Gratis`.
- Mobile header includes logo and `Menu` button.
- Mobile menu includes the same public nav links and CTA.
- Header remains sticky at top.
- Current route state highlights active nav route.

Priority:
- P0 for logo, nav, CTA, mobile menu.
- P1 for active state polish.

Acceptance criteria:
- All header links navigate correctly.
- CTA opens `/app`.
- Header remains readable on white background.
- Menu interaction works on touch devices.

### 10.2 Hero

Requirements:
- Hero communicates product value immediately.
- Include badge: `PWA - Jalan di HP` or equivalent copy.
- Include H1: `Mabar padel makin seru dengan FOM Play.`
- Include supporting copy about format, rounds, live score, and sharing to Story.
- Include primary CTA `Buka App`.
- Include secondary CTA `Lihat Fitur`.
- Include quick tags for `Americano`, `Mexicano`, `Match Play`, and `Ranking Global & Daerah`.
- Include product visual showing live scoring, shared view, story-ready output, and ranking.

Priority:
- P0 for H1, supporting copy, primary CTA, product visual.
- P1 for tags and animation polish.

Acceptance criteria:
- H1 is the most prominent text in the first viewport.
- Primary CTA is visible without scrolling on common mobile viewport.
- Visual supports the product story and does not feel like generic stock art.
- Motion does not block content or create layout shift.

### 10.3 Quick Proof

Requirements:
- Show three proof cards:
  - `Live scoring`
  - `Shareable scoreboard`
  - `Ranking global & daerah`
- Each card includes icon, title, and one-sentence body.

Priority:
- P0.

Acceptance criteria:
- Proof cards are scannable in under 5 seconds.
- Cards stack cleanly on mobile.

### 10.4 Why FOM Play

Requirements:
- Explain pain points of manual game hosting.
- Include section title: `Begitu pemainnya makin banyak, papan tulis mulai nggak cukup.`
- Include short body about host burden.
- Include pain point cards:
  - pairing and rotation takes time
  - players ask standings mid-game
  - flow depends on one person
  - other apps require every player to log in
  - screenshots look bad in groups or Story
  - player level comparison is hard

Priority:
- P0.

Acceptance criteria:
- Pain points map directly to features later on the page.
- Copy feels specific to padel hosting.

### 10.5 Core Features

Requirements:
- Present six feature cards:
  - Live Scoring
  - Klasemen Otomatis
  - Shared Match View
  - Story-Ready Scoreboard
  - Ranking Global & Daerah
  - Format Lengkap
- Each card includes concise value statement.

Priority:
- P0.

Acceptance criteria:
- Feature names match app capability.
- Copy avoids unsupported claims.
- Section is readable on dark background.

### 10.6 How It Works

Requirements:
- Explain the flow in three steps:
  - choose format, players, and court
  - update live score
  - standings appear and result can be shared
- Use numbered visual treatment.

Priority:
- P0.

Acceptance criteria:
- Steps are sequential and easy to understand.
- The section reduces perceived complexity before CTA.

### 10.7 Format Game

Requirements:
- Show three cards: Americano, Mexicano, Match Play.
- Each card includes one paragraph explaining when the format is useful.
- Each card links to its corresponding route:
  - Americano -> `/format/americano`
  - Mexicano -> `/format/mexicano`
  - Match Play -> `/format/match-play`

Priority:
- P0.

Acceptance criteria:
- Cards are equal weight.
- CTAs are accessible via keyboard.
- Internal links support crawlability where possible.

### 10.8 Sharing & Story

Requirements:
- Explain shared match view and story-ready scoreboard.
- Mention that players can monitor from their own phone through a shared link.
- Mention that final scoreboard can be shared to group or Story without heavy editing.

Priority:
- P0.

Acceptance criteria:
- Section ties live scoring to social sharing outcome.
- Copy does not imply Instagram API integration unless implemented.

### 10.9 Ranking

Requirements:
- Explain ranking global and daerah.
- Include three ranking concept cards:
  - Global
  - Daerah
  - Progress
- Link or CTA should make `/ranking` discoverable through nav and supporting content.

Priority:
- P0.

Acceptance criteria:
- Ranking is positioned as long-term motivation.
- Copy remains consistent with ranking logic in the app.

### 10.10 Edukasi

Requirements:
- Include educational link cards:
  - `Apa itu Americano padel`
  - `Apa itu Mexicano padel`
  - `Perbedaan Americano vs Mexicano`
  - `Cara membuat game padel yang rapi untuk komunitas`
- Link to relevant public routes.
- Include a `Buka App` text CTA.

Priority:
- P1.

Acceptance criteria:
- Educational links give visitor a next step if not ready to open app.
- Route mapping is correct.

### 10.11 FAQ

Requirements:
- Include homepage FAQ questions:
  - `FOM Play itu app untuk apa?`
  - `Apakah pemain lain harus login untuk melihat hasil?`
  - `Apakah FOM Play bisa dipakai di HP?`
  - `Format apa saja yang didukung?`
  - `Apakah scoreboard bisa dibagikan?`
  - `Apa manfaat ranking global dan daerah?`
- FAQ answers are short and product-specific.

Priority:
- P0.

Acceptance criteria:
- FAQ copy matches structured data where applicable.
- FAQ does not introduce features outside current scope.

### 10.12 Final CTA

Requirements:
- Include headline: `Buka game-nya di court, bukan ribetnya di grup.`
- Include body about host flow, score, standings, and sharing.
- Include primary CTA `Buka App`.
- Include secondary CTA `Pelajari Format Game`.

Priority:
- P0.

Acceptance criteria:
- Final CTA gives a clear end-of-page action.
- Secondary CTA routes to format education.

### 10.13 Footer

Requirements:
- Include FOM Play identity.
- Include short product description.
- Include grouped links for product, format, support/company as appropriate.
- Include copyright line.

Priority:
- P1.

Acceptance criteria:
- Footer links do not duplicate broken or unavailable pages.
- Footer remains compact on mobile.

## 11. Content Requirements

Homepage copy must:
- use Indonesian as default UI language
- keep sentences short
- use padel and mabar language naturally
- avoid over-explaining technical terms
- avoid promising automated payment, chat, or tournament management if not shown on homepage
- keep CTA labels consistent:
  - `Buka App`
  - `Coba Gratis`
  - `Lihat Fitur`
  - `Pelajari format game`
  - `Baca selengkapnya`

Homepage copy should emphasize:
- live score real-time
- automatic standings
- shared link for players
- story-ready scoreboard
- Americano, Mexicano, Match Play
- global and regional ranking
- mobile-first PWA
- lighter host workflow

Do not emphasize:
- "WhatsApp is bad" as the main pain point
- payment features as homepage differentiator
- advanced admin tooling
- claims about official rankings unless verified
- social media automation beyond sharing/screenshot readiness

## 12. Design And UX Requirements

Visual direction:
- Mobile-first, energetic, sport/social feel.
- Primary orange brand accent remains prominent.
- Product visuals should look like actual FOM Play states, not abstract illustration.
- Cards may be used for repeated feature/proof items, but page should not feel like nested cards everywhere.
- Avoid generic stock imagery if it does not show product value.

Responsive behavior:
- Mobile first viewport must show headline, supporting copy, and primary CTA quickly.
- Desktop layout can use split hero with copy and product visual.
- Cards stack on mobile and become grids on tablet/desktop.
- Sticky header must not consume too much mobile vertical space.
- Text must not overflow card widths.

Interaction:
- Buttons should have clear active/pressed states.
- Header menu should be tap-friendly.
- Internal nav should preserve expected route behavior.
- Motion should be subtle and not required for comprehension.

Accessibility:
- Logo image has meaningful `alt`.
- Menu button has accessible label.
- Buttons and links are keyboard reachable.
- Text contrast passes reasonable accessibility thresholds.
- Section order is logical for screen readers.
- H1 appears once.
- Headings follow a sensible hierarchy.

## 13. SEO Requirements

Metadata:
- Homepage title:
  - `FOM Play | Aplikasi Padel untuk Live Scoring, Klasemen, dan Ranking`
- Homepage description:
  - `FOM Play membantu host mengatur Americano, Mexicano, dan Match Play dari HP, dengan live scoring, klasemen otomatis, hasil yang siap dibagikan, dan ranking pemain.`
- Canonical URL should resolve to homepage public URL.
- Public social image should use existing FOM public social image asset.

Structured data:
- Include `Organization`.
- Include `SoftwareApplication`.
- Include `WebPage`.
- Include `WebSite` for homepage.
- FAQ structured data can live on `/faq`; homepage FAQ may remain visible content unless schema is intentionally added.

Internal linking:
- Homepage links to feature overview.
- Homepage links to each format route.
- Homepage links to ranking route through nav and contextual section.
- Homepage links to FAQ through nav.
- Homepage links to blog through nav/footer if blog route is active.

Indexability:
- Homepage should be indexable.
- Avoid client-only blank render that prevents crawlers from reading core content.
- Preserve sitemap and robots behavior.

SEO target queries:
- aplikasi padel
- live score padel
- klasemen padel
- ranking padel
- americano padel
- mexicano padel
- match play padel
- aplikasi turnamen padel

## 14. Analytics Requirements

Recommended events:
- `homepage_viewed`
- `homepage_cta_clicked`
- `homepage_nav_clicked`
- `homepage_feature_clicked`
- `homepage_format_clicked`
- `homepage_ranking_clicked`
- `homepage_faq_clicked`
- `homepage_mobile_menu_opened`
- `homepage_mobile_menu_clicked`

Recommended event properties:
- `route`
- `cta_label`
- `target_route`
- `section`
- `is_logged_in`
- `viewport_category`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`

Analytics notes:
- Do not block navigation if analytics call fails.
- Avoid collecting personally identifiable data on public homepage.
- Keep app activation funnel traceable from homepage CTA into `/app`.

## 15. Technical Requirements

Routing:
- Root `/` renders homepage when app shell is not forced.
- `/app` renders authenticated app shell or login flow.
- Existing query-driven app behavior must remain intact:
  - `?shared=...`
  - `?room=...`
  - E2E scenario query handling
- Public route resolution should use the established top-level route map.

Rendering:
- Homepage should render without requiring authenticated user data.
- Auth state may affect CTA behavior or app entry, but homepage content must not wait on private data.
- Public structured data should be generated per route.

Assets:
- Use existing FOM logo/logotype assets.
- Use public social image asset for metadata.
- Product visuals can be UI-composed if they represent the real app accurately.

Performance:
- Initial load should avoid heavy third-party scripts.
- Motion and icons should not meaningfully increase page weight.
- Images should have stable dimensions to reduce layout shift.
- Homepage should remain usable on mobile network conditions.

Security and privacy:
- Do not expose private user, room, finance, ranking ledger, or history data on homepage.
- Do not make homepage dependent on Firestore reads.
- Keep public content safe for unauthenticated visitors.

## 16. Edge Cases

Navigation:
- Visitor opens `/` while already logged in.
- Visitor opens `/` while auth bootstrap is still resolving.
- Visitor opens `/` with unknown path and router falls back.
- Visitor opens homepage with UTM parameters.
- Visitor opens homepage on old browser.

Layout:
- Very long localized copy.
- Small mobile viewport.
- Large desktop viewport.
- Slow font loading.
- Reduced motion preference.

Routing conflicts:
- Root homepage must not break `/app`.
- Public routes must not break shared match links.
- Blog route must not conflict with archive or static blog hosting behavior.

SEO:
- Search crawler may not execute full client-side app.
- Duplicate canonical URLs can dilute ranking.
- Homepage FAQ content should not conflict with dedicated `/faq` route.

## 17. Acceptance Criteria

P0 acceptance:
- `/` renders a complete homepage with header, hero, proof points, features, format cards, sharing/ranking sections, FAQ, final CTA, and footer.
- `Buka App` opens `/app`.
- `Coba Gratis` opens `/app`.
- `Lihat Fitur` opens `/fitur` or intended features route behavior.
- Format cards route to their respective format pages.
- Header nav works on desktop and mobile.
- Homepage title and meta description match SEO requirements.
- Homepage structured data includes Organization, SoftwareApplication, WebPage, and WebSite.
- Existing `/app`, `?shared=...`, and `?room=...` behavior remains functional.
- Homepage has no horizontal scroll on mobile.
- No CTA or card text overflows its container.

P1 acceptance:
- Mobile menu active/closed states feel polished.
- Product visual reinforces live scoring, shared view, story-ready result, and ranking.
- Education links route correctly.
- Footer contains useful public links.
- Analytics events are emitted for key homepage CTAs.

P2 acceptance:
- A/B copy variants can be tested for hero headline and CTA.
- Additional public content modules can be added for testimonials, screenshots, or community proof after real data is available.

## 18. QA Checklist

Manual QA:
- Open `/` on mobile viewport.
- Open `/` on desktop viewport.
- Tap logo.
- Tap `Buka App` in hero.
- Tap `Coba Gratis` in desktop header.
- Open mobile menu and tap each nav item.
- Tap `Lihat Fitur`.
- Tap each format card.
- Tap ranking nav.
- Tap FAQ nav.
- Verify footer links.
- Verify page with UTM params.
- Verify logged-out and logged-in behavior.

Regression QA:
- Open `/app`.
- Open `/app?room=<roomId>` with a known room where possible.
- Open `/app?shared=<sharedId>` with a known shared match where possible.
- Run existing route/bootstrap e2e tests if available.

SEO QA:
- Inspect document title.
- Inspect meta description.
- Inspect canonical URL.
- Inspect structured data output.
- Confirm sitemap includes intended public pages.
- Confirm robots does not block homepage.

Accessibility QA:
- Navigate header and CTAs by keyboard.
- Check mobile menu with keyboard.
- Confirm one H1.
- Confirm visible focus states.
- Check color contrast in dark feature section and orange final CTA.

## 19. Rollout Plan

Phase 1: MVP homepage
- Ship root homepage with all P0 sections.
- Preserve `/app` behavior.
- Preserve shared match and room invite query behavior.
- Ship metadata and structured data.

Phase 2: Public route strengthening
- Confirm `/fitur`, format pages, `/ranking`, `/faq`, and `/blog` are linked and indexable.
- Align copy across homepage and public route pages.
- Add or refine sitemap entries.

Phase 3: Measurement
- Add homepage analytics events.
- Track CTA and internal link click-through.
- Review organic search impressions and route engagement.

Phase 4: Iteration
- Improve product visual with real screenshots or richer app mockups.
- Add community proof when trustworthy data exists.
- Add testimonials or use cases if validated.
- Consider route-specific landing variants for host, club, or format-specific traffic.

## 20. Dependencies

Product:
- Confirm current positioning and supported features.
- Confirm whether scheduled rooms should be mentioned on homepage MVP or reserved for feature page.
- Confirm ranking copy matches current MMR/rank model.

Design:
- Final visual direction for hero mockup.
- Logo and social image assets.
- Responsive spacing and typography polish.

Engineering:
- Public route resolution.
- App shell `/app` bootstrap.
- SEO metadata generation.
- Structured data generation.
- Mobile nav behavior.
- Existing query compatibility.

Marketing/Content:
- Final Indonesian copy.
- Target SEO keywords.
- Blog route availability.
- FAQ copy sync between homepage and `/faq`.

## 21. Open Questions

- Should scheduled rooms/lobby be visible as a homepage differentiator, or only appear in `/fitur` until adoption data is stronger?
- Should `Coba Gratis` and `Buka App` both remain, or should CTA language be unified across header and hero?
- Should homepage FAQ receive FAQ schema, or should FAQ schema stay only on dedicated `/faq` route?
- Should public ranking page show live ranking examples or static educational content only?
- Should homepage include testimonials/community proof after early user quotes are available?
- Should blog be a prominent nav item or footer-only until blog content volume is higher?

## 22. Related Documents

- `docs/LANDING_PAGE_STRATEGY.md`
- `docs/SSOT_FOM_PLAY.md`
- `docs/SSOT_FOM_PLAY_EXEC_SUMMARY.md`
- `docs/SSOT_FOM_PLAY_ENGINEERING_APPENDIX.md`
- `docs/DOCS_UPDATE_CHECKLIST.md`
