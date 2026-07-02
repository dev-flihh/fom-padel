# FOM Rewind & Share Cards (Foto) Implementation Plan

Last Updated: 2026-07-02
Status: Phase A + B + FOM Rewind v1 complete — **deployed to production hosting 2026-07-02** (`firebase deploy --only hosting`, project gen-lang-client-0996764238; functions/rules untouched). Branch `feat/fom-rewind-share-cards`, working tree not yet committed.
Scope: Mockup section 06 (Share Cards · Story 9:16), section 05 (Match Recap · FOM Rewind), dan subset minimal section 04 (cover photo saja)
Out of Scope: Galeri foto multi-user tersimpan, sticker pack (G2), story template drag-overlay (G3), animated GIF card (G4), format 4:5 dan 1:1
Basis: mockup `Match Aktif & Klasemen.dc.html`, `docs/PRD_TOXIC_KLASEMEN_DAN_MATCH_AKTIF.md`, `docs/TOXIC_HALL_OF_SHAME_V2_PLAN.md`

## Product Decisions Locked (2026-07-02)

- Foto pemain TIDAK disimpan di sistem. Semua pemain (login) bisa memilih foto dari device mereka sendiri; foto diproses murni di browser untuk generate card/story PNG, lalu dibuang. Tidak ada upload ke Firebase untuk foto pemain.
- Satu-satunya foto yang disimpan adalah **cover match**: host boleh set 1 foto cover, di-upload terkompresi ke Firebase Storage. Cover dipakai sebagai hero slide Rewind (R1/R8) untuk semua viewer, OG image shared link, dan tampil di shared viewer.
- Urutan pengerjaan: **06 Share Cards dulu**, lalu 05 FOM Rewind. Cover photo dikerjakan di antaranya karena Rewind membutuhkannya.
- Format export fase ini: **9:16 saja** (1080×1920). Tab 4:5 / 1:1 di composer disembunyikan dulu.
- Toxic OFF → slide Cupu Podium (R4) dan Toxic Awards (R5) hilang; Rewind menjadi 6 slide.
- Tanpa foto → semua surface jatuh ke gradient editorial fallback (pola F3). Konsep inti: kombinasi stat per player + stat game + foto user, dan **tidak semua harus ada fotonya**.
- Aturan My Match Card tetap: hanya pemain login non-manual. Upsell `Login to get your Match Card` untuk manual/non-login dipertahankan. (Ide mockup "host generate-kan kartu pemain manual" masuk Open Questions.)
- Watermark FOM Play + link `fomplay.asia/app` tampil di 100% output export.

## Arsitektur yang Sudah Ada (Reuse)

- Export engine: `html-to-image` di `KlasemenScreen.tsx` (`renderStoryImageBlob`, 360×640 view → 1080×1920 canvas, `buildStoryFileName`, multi-page pagination). Dipakai ulang untuk semua card baru dan export per-slide Rewind.
- 4 varian card existing: `standings-card`, `shame-card`, `my-match-card`, `cupu-certificate`. Varian baru = re-skin + background foto, bukan sistem baru.
- Stat per player sudah dihitung: W/L/D/M, DIFF, PTS, worst loss (skor+lawan+margin), bye count, timeline W/L/D/BYE per round (`getToxicEvidenceTimeline`), toxic buckets & awards (`toxicStandings.ts`, `standingsUtils.ts`).
- Pipeline kompresi foto client-side sudah terbukti di ProfileScreen (resize + JPEG quality step-down) — diekstrak jadi util bersama.
- Share snapshot (`shareUtils.ts`) saat ini strip semua avatar/inline image. Kebijakan ini dipertahankan untuk avatar; hanya `coverPhotoUrl` (URL Storage, bukan inline) yang ditambahkan.

## Implementation Log

### 2026-07-02 — Phase A + Phase B core (local, branch `feat/fom-rewind-share-cards`)

Done & verified (type-check `tsc --noEmit` clean, `vite build` clean, dev server boots without console errors):

- **Phase A** — `src/features/matches/matchNightStats.ts` (new): `buildRankTimelines` (posisi per round), `findGlowDownAward`, `buildMatchNightAggregate` (total points, biggest win, longest win streak, duration), `buildMyNightSummary`, `buildGlowDownAwardCard`, `getGlowDownRoast`. Runtime-verified with a fixture (Glow Down, biggest win, streak, duration assertions pass).
- **Phase A** — Award `Glow Down` didaftarkan ke `toxicStandings.ts` (`ToxicAwardId`) dan `toxicCopyConfig.ts` (label + bank `glowDownRoasts` per intensity + merge/remote-config support).
- **Phase B** — `src/features/matches/localPhotoProcessing.ts` (new): pipeline foto lokal-only (`processLocalCardPhoto`, `releaseLocalCardPhoto`, `getAdaptiveScrimOpacity`). Downscale + re-encode JPEG di browser (EXIF hilang), object URL, sampel luminance bawah untuk scrim adaptif. Tidak ada upload.
- **Phase B** — `KlasemenScreen.tsx`: state foto + hidden file input + handler (`handlePickCardPhoto`/`handleCardPhotoChange`/`handleRemoveCardPhoto`), render My Match Card F1 (foto full-bleed + scrim adaptif) via `renderMyMatchPhotoCardContent`, fallback ke layout gradient (F3) saat tanpa foto, kontrol Tambah/Ganti/Hapus foto di preview dialog. Phase A ter-hook: My Match Card menampilkan `R1 #x → Final #y` + badge/roast `Glow Down`.

### 2026-07-02 (lanjutan) — Phase B: entry point, Standings F4, verifikasi visual

Done & verified:

- **Entry point** — CTA prominan `Get My Match Card` di panel personal shortcut Klasemen (pemain login), memicu flow My Match Card.
- **Standings Card F4** — baris pemain login di-highlight (ring + bg primary) + chip `· ME`, via helper `renderStoryPlayerName` dan `isStoryMyRow` (dipakai di kedua blok render: export node & preview). Venue+tanggal sudah ada via `locationDateLabel`.
- **Bugfix export foto** — foto memakai **data URL** (bukan blob URL): `html-to-image` menambah cache-bust query yang merusak `blob:` URL → export gagal. `localPhotoProcessing` sekarang mengembalikan `dataUrl` (tanpa object-URL/cleanup).
- **Bugfix race timing** — setelah `setCardPhoto`, tunggu 2 rAF sebelum export agar capture tidak mengambil layout no-photo.
- **Verifikasi visual in-browser** (dev server, scenario `?e2e=standings-6p`, current user = pemain login):
  - My Match Card tanpa foto (gradient) render benar.
  - My Match Card DENGAN foto: F1 full-bleed + scrim adaptif + strip RECORD/DIFF/PTS + watermark; **export PNG sukses** (blob ter-generate, tanpa error banner). Diverifikasi dengan menyuntik foto sintetis ke input file (menjalankan `processLocalCardPhoto` asli).
  - Standings Card: chip `· ME` + highlight tepat di baris pemain login (rank #2).
  - CTA `Get My Match Card` muncul & berfungsi.
- **Regresi e2e**: `story-image-style`, `toxic-standings`, `share-flow` semua pass. `finished-flow` (2) gagal, tetapi **pre-existing** — gagal juga saat perubahan KlasemenScreen di-stash ke HEAD (selector test `{name:'Match'}` ambigu terhadap aria-label baris standings, bukan akibat kerja ini).

### 2026-07-02 (lanjutan) — Polish desain card (visual verified)

Feedback: desain card masih berantakan. Diperbaiki:

- **Standings Card di-redesign** (F4). Sebelumnya tiap baris menampilkan subline `1W-1L · DIFF +2 · 11 PTS` PLUS kolom W/L/D/M PLUS DIFF PLUS PTS — data sama diulang 2–3× sehingga nama ter-truncate. Sekarang: rank + avatar + **nama penuh** (+chip `· ME`) + subline record ringkas (`1W · 1L · 2M`) + kanan PTS besar & DIFF kecil berwarna. Eyebrow `FINAL STANDINGS`. Jauh lebih bersih; nama panjang seperti "Airlangga Sundawa" muat penuh.
- **Dedup dihapus**: markup standings yang tadinya di-inline 2× (export node + preview) diekstrak ke satu fungsi `renderStandingsStoryContent`. Dead code (storyRowClass, storyWldmValueClass, renderStoryPlayerName, dll.) dihapus.
- **Verifikasi visual** semua card via node export (screenshot): Standings (6p & 8p) bersih & nama penuh; My Match Card foto (F1) + no-photo (F3) rapi; Shame Card (hero King of Cupu + rows) koheren.
- **Regresi e2e diperbaiki** (akibat perubahan teks desain): `toxic-standings` keyboard-nav (scope `getByText('Final standings')` ke `#standings-panel-official` karena export card kini juga punya teks itu) dan `share-flow` guest CTA (assertion format record/diff → `0W · 0L · 0M`, `+1`, `PTS · DIFF`).
- Build, `tsc`, dan 52 e2e (`story-image-style` + `toxic-standings` + `share-flow`) semua pass.

Belum dikerjakan (sisa Phase B/lanjutan):

- Composer sheet F0 penuh (picker card/background/format terpadu) — saat ini foto masuk lewat preview dialog, bukan composer.
- Shame Card F5 reskin (piagam single-hero `THE CUPU D'OR`) — `cupu-certificate` existing sudah mendekati; perlu keputusan apakah butuh format 9:16 terpisah.
- My Match Card toxic F2 layout penuh (saat ini enhancement `R1→Final` + badge Glow Down pada layout existing).
- Foto background untuk Standings/Shame card (saat ini foto hanya My Match Card).
- Format 4:5 / 1:1.

### 2026-07-02 (malam) — FOM Rewind v1 sesuai PRD_FOM_REWIND.md + mockup v2 (12 slide)

Keputusan produk (dari user):
- **Hybrid storage**: foto pemain lokal-only (tidak pernah di-upload); PNG hasil Rewind akan disimpan di Phase 2 supaya shared viewer bisa melihat.
- **12 slide penuh mockup v2** termasuk usulan Dream Team & Match of the Night. Toxic OFF → slide gold hilang.
- **Fase 1 dulu** (viewer + slides + generate + banner, foto lokal); upload/persist/shared-viewer menyusul.
- **Cupu D'Or quote pakai pool copy bank Rewind sendiri** (seeded deterministic), bukan string roast klasemen.

Implemented & verified:
- `src/features/rewind/rewindCopyBank.ts` — copy bank config-driven sesuai `COPY_BANK_FOM_REWIND.md` (struktur {id, slide, slot, conditions, intensity, template, requiredSlots, priority}); engine seleksi: filter kondisi subset → prefer intensity aktif (fallback tier bawah) → priority → seeded pick → anti-duplikat → slot templating (kandidat dibuang jika slot kosong). Bugfix penting: intensity awalnya `≤ setting` gabungan sehingga savage bisa dapat copy mild — sekarang exact-match dulu.
- `src/features/rewind/rewindData.ts` — satu snapshot payload 12 slide (FR-6.2), reuse standings/toxicStandings/matchNightStats (FR-6.7 zero drift) + scan ringan: pair wins (Dream Team = 100% winrate ≥2 main), Match of the Night (margin terkecil ≤2, fallback poin terbanyak), evidence King (worst loss/bye/streak/winless), 25+ kondisi copy bank.
- `src/features/rewind/RewindSlideTemplates.tsx` — 12 template sesuai mockup v2 (eyebrow/headline/footer konsisten, orb blur + confetti statis, podium bar, gold treatment, standings putih, cover/outro foto full-bleed + fallback gradient).
- `src/features/rewind/RewindFlow.tsx` — overlay upload (multi-select lokal, cover picker, skip, max 10) → generating (progress "Menyiapkan slide N dari M…", gagal 1 slide di-skip FR-6.4, gagal total → retry) → viewer (progress segmented, tap 40/60 sesuai konvensi IG FR-8.2, swipe, Share/Download per slide, ⋯ Download semua + Regenerate, posisi persist localStorage, aria-label per slide).
- Banner entrypoint di `KlasemenScreen` (kedua tab, hanya ENDED, disembunyikan untuk shared viewer di fase ini): "Match selesai. Bikin Rewind-nya →" ↔ "View FOM Rewind →" (state in-session).
- **e2e baru** `tests/e2e/rewind-flow.spec.ts` (4 pass di chromium+iphone-13): banner→upload→generate tanpa foto→viewer→tap nav→reopen; banner hidden saat match live.
- **Verifikasi visual 12/12 slide** (screenshot per slide via Playwright, fixture toxic + 4 foto): copy conditional bekerja (gap 1-2 tipis, win-rate 100%, shutout, margin-1, tie, kalah telak 0-6 savage). Generate 12 slide ~5 detik (target PRD ≤10s). Build + 56 e2e pass.
- Catatan environment: browser preview (CDP) sempat membuat `html-to-image` hang setelah resize emulation — bukan bug kode (e2e di Chromium bersih selalu lolos); verifikasi visual dipindah ke Playwright.

### 2026-07-02 (sore) — Rewind Phase 2 (deployed to production hosting)

Implemented & deployed:
- **QR asli** di slide Outro (lib `qrcode` → data URL; menunjuk `?shared={shareId}` dari localStorage share key host, fallback fomplay.asia/app). Verified visual: pattern QR scannable di PNG hasil.
- **Copy bank via Remote Config**: key `rewind_copy_v1`, override QA `fom_rewind_copy_config_v1` (localStorage) / `VITE_REWIND_COPY_CONFIG_JSON`. Format `{version, lines:[{id, slide, slot, template, conditions?, intensity?, priority?}]}` — id existing me-replace, id baru append; invalid fail-closed ke default (`parseRewindCopyBankJson`).
- **Analytics** (PRD Section 10): `trackRewindEvent` di `src/analytics.ts` + wiring lengkap (entrypoint_viewed, upload_opened, photo_added, generate_started/completed, slide_failed, viewed, slide_viewed, completed, slide_shared/downloaded, regenerated).
- **Persist PNG (hybrid)**: `rewindPersistence.ts` upload slide PNG ke Storage `rewind/{tournamentId}/{order}-{type}.png` (best-effort), tulis `tournament.rewind {generatedAt, generatedBy, slides[{type,order,imageUrl}]}` ke shared snapshot (merge, host-only per rules) + history doc (`tournaments/{id}`, aman krn `isValidTournament` pakai hasAll). Shared viewer/History: banner `View FOM Rewind →` + viewer replay dari imageUrl (read-only, tanpa Regenerate; Share/Download fetch blob dari URL). Foto sumber tetap lokal-only.
- Regression: tsc + build + 56 e2e pass. Deploy hosting sukses (dengan insiden singkat: deploy pertama memakai dist tanpa `prepare-hosting-entrypoints` → `/app` 404 beberapa menit; diperbaiki dengan `npm run build` penuh + redeploy).

**RESOLVED 2026-07-02 sore**: akar masalah ternyata **Firebase Storage belum pernah di-setup** di project (tidak ada bucket default) — sekaligus menjelaskan kenapa upload avatar Storage selalu gagal → fallback data-URL. User membuat bucket via console Get Started (`gen-lang-client-0996764238.firebasestorage.app`, Blaze trial), lalu `storage.rules` dideploy dan diverifikasi perilaku: `rewind/**` read → 404 (allowed, objek belum ada), path lain → 403 (deny-all utuh). Persist PNG Rewind kini aktif end-to-end di production. Config app sudah menunjuk bucket yang sama sejak awal — tanpa perubahan kode.

Phase berikutnya (belum): dot indicator foto berubah (FR-4.3), entrypoint finish-flow host (FR-4.5), pre-load foto galeri match (FR-5.3), auto-create share saat generate (supaya QR selalu punya shareId).

## Phase A — Data Layer: Stat Baru

Goal: melengkapi stat yang dibutuhkan card & Rewind, semuanya derived (tidak disimpan).

Work:

- `standingsUtils.ts` / util baru `matchNightStats.ts`:
  - `rankTimeline` per pemain: posisi official standings setelah tiap completed round (untuk `R1 POS` vs `FINAL` di card toxic F2, dan award `Glow Down`).
  - Match-night aggregate: `totalPoints` (seluruh match), `roundCount`, `matchCount`, `biggestWin` (skor + margin tertinggi), `longestWinStreak` (pemain + angka), `durationMinutes` (startedAt→endedAt).
  - `myNight` summary per pemain login: final rank, record, diff, pts, badge award (jika ada), roast personal (dari engine existing).
- Award baru `Glow Down` (turun terbanyak dari posisi round awal ke final, min. turun 3 posisi atau dari #1) — masuk copy bank via `toxicCopyConfig.ts`, ikut aturan anti-duplikasi existing.

Tests:

- Unit: rankTimeline deterministic, biggest win/streak benar untuk fixture toxic existing, Glow Down tidak muncul jika tidak ada penurunan signifikan.

## Phase B — Share Composer + Card Redesign (Mockup 06)

Goal: mengganti share menu existing dengan composer sheet F0 dan card sesuai desain final F1–F5.

Work:

1. **Composer sheet (F0)** — 3 keputusan, semua ber-default:
   - CARD: `My Match Card` / `Standings` / `Shame` (Shame hilang jika toxic OFF; `cupu-certificate` tetap diakses dari Hall of Shame seperti sekarang).
   - BACKGROUND: foto lokal (file picker) · preset solid (2 warna editorial) · gradient editorial. Default pemain: prompt foto; default tanpa foto: gradient.
   - FORMAT: `9:16 Story` saja (chip lain hidden fase ini).
   - Default: pemain login → My Match Card; host non-pemain → Standings. Tombol `Share` + `Download` memakai fallback chain existing (Web Share file → download → preview error).
2. **Pipeline foto lokal**: file input → downscale max 1920px sisi panjang + re-encode JPEG (EXIF otomatis hilang) → object URL → render di card → export → `revokeObjectURL`. Foto tidak pernah meninggalkan device.
3. **My Match Card aesthetic (F1)**: foto full-bleed + scrim gradient bawah + nama besar + strip RECORD/DIFF/PTS + konteks match + watermark.
   - Scrim adaptif: sampel luminance sepertiga bawah foto → foto terang memakai scrim lebih pekat (rule mockup).
4. **My Match Card toxic (F2)**: bg gold-dark, `HALL OF SHAME · CERTIFIED`, rank official + shame rank, badge award, quote roast serif, strip RECORD / R1 POS / FINAL, disclaimer.
5. **Fallback gradient (F3)**: layout `MATCH PLAYED` untuk card tanpa foto.
6. **Standings Card (F4)**: re-skin ringan — highlight row `ME` untuk pemain login, venue+tanggal, tetap 10 rows/halaman.
7. **Shame Card (F5)**: format piagam `THE CUPU D'OR {tahun}` single-hero (King of Cupu + roast + stats). Multi-page rows shame existing tetap ada sebagai halaman lanjutan.
8. Entry point pemain: panel `Your Night` (D3) versi ringkas di Klasemen ended — kartu stat pribadi + CTA `Get My Match Card`.

Acceptance criteria:

- 2 tap dari Klasemen ended ke share (composer → Share) di happy path.
- Foto gagal load / avatar gagal → fallback initials/gradient, export tetap jalan.
- Toxic OFF → opsi Shame tidak ada; non-login → My Match Card jadi upsell.
- Tidak ada foto pemain yang ter-upload ke network (verifikasi via devtools/e2e).
- Watermark + link tampil di semua output; teks stat tetap terbaca di foto terang (scrim adaptif).

## Phase C — Cover Match (Subset Minimal Mockup 04)

Goal: satu foto cover tersimpan agar Rewind, shared viewer, dan OG image bisa hidup.

Work:

- Host-only: set / ganti / hapus cover dari finish flow (step skippable 1 tap, pola D1 yang disederhanakan: 1 slot cover saja) dan dari Klasemen ended.
- Upload: kompres client-side (max ~1600px, target <500KB, EXIF stripped) → Firebase Storage `match-covers/{hostUid}/{tournamentId}.jpg` → simpan `coverPhotoUrl` di tournament, shared snapshot, dan history summary/detail.
- Storage security rules: write hanya host, read publik (cover memang konten publik saat di-share).
- `shareUtils.ts`: tetap strip avatar, tambah passthrough `coverPhotoUrl`.
- Shared viewer + History Detail menampilkan cover di header (opsional, kecil).
- OG image shared link = `coverPhotoUrl` jika ada; fallback OG existing jika tidak. (Butuh investigasi kecil: cara meta tag shared link dirender sekarang di `functions/index.js` — jika belum ada dynamic OG, masuk sub-task.)
- Hapus cover saat match dihapus (cleanup best-effort).

Acceptance criteria:

- Finish tanpa cover → semua surface pakai gradient, tidak ada prompt memaksa.
- Cover tampil untuk semua viewer shared link; pemain non-host tidak bisa mengubah cover.
- Refresh/continue match tidak menghilangkan cover.

## Phase D — FOM Rewind (Mockup 05)

Goal: seremoni 8 slide 9:16, swipe horizontal, auto-play untuk host setelah finish, bisa dibuka ulang.

Slides:

| # | Slide | Sumber data | Kondisi |
|---|-------|-------------|---------|
| R1 | Cover | cover photo / gradient, nama match, venue, tanggal, durasi | selalu |
| R2 | The Numbers | total points, rounds, matches, biggest win, longest streak + tagline | selalu |
| R3 | Podium Juara | top 3 official + confetti oranye 1x ≤2s | selalu |
| R4 | Podium Cupu | bottom 3 reversed + confetti gold, marquee `JANGAN BAPER` | toxic ON |
| R5 | Toxic Awards | max 3 award cards (Duo Petaka, Sultan of Bye, Glow Down, dst.) + disclaimer | toxic ON, ≥1 award |
| R6 | My Night | rank besar, record/diff/pts, badge, roast personal viewer login | viewer adalah pemain login; selain itu di-skip |
| R7 | Final Standings | top 3 + bottom 1 highlight, light surface | selalu |
| R8 | Outro | cover/foto grup / gradient, QR + link shared match, CTA Share, tagline FOMO | selalu |

Work:

- Komponen `RewindScreen` (route baru): carousel swipe horizontal + progress dots + parallax halus antar slide, tanpa loop.
- Entry points: auto-open host setelah finish (setelah step cover, skippable); tombol `View Recap` di banner Klasemen ended (sudah ada di mockup B2); History Detail; shared viewer (read-only, tanpa R6 jika tidak login).
- Export per-slide: tombol ↗ di tiap slide → render node slide 1080×1920 via pipeline existing; filename `{match}-rewind-{slide}.png`.
- QR code slide R8 → shared link match (generate shareId saat finish jika belum ada); pakai library QR ringan (mis. `qrcode`) — render ke data URL agar aman untuk html-to-image.
- Confetti: implementasi CSS/JS ringan sekali jalan, dimatikan saat export PNG.
- Persist: tidak ada state Rewind yang disimpan — semua derived dari tournament + cover, sehingga History Detail bisa replay kapan pun.

Acceptance criteria:

- Toxic OFF → 6 slide, tidak ada jejak toxic sama sekali.
- Tanpa cover → R1/R8 gradient fallback, tetap terlihat niat (bukan rusak).
- Viewer bukan pemain → R6 tidak muncul; shared viewer tetap read-only.
- Tiap slide bisa di-export PNG 1080×1920 dengan watermark + link.
- Buka ulang dari History menghasilkan slide yang identik (deterministic).

## Phase E — QA, Analytics, Docs

Work:

- Playwright e2e: composer flow (default per role, toxic OFF, tanpa foto), export My Match Card dengan foto lokal (fixture image), Rewind slide count toxic ON/OFF, cover upload host-only, shared viewer melihat cover.
- Analytics events baru: `share_composer_opened`, `share_card_generated` (variant, background, hasPhoto), `match_cover_set`, `rewind_opened`, `rewind_slide_viewed`, `rewind_slide_exported`, `rewind_completed`.
- Update `docs/PRD_TOXIC_KLASEMEN_DAN_MATCH_AKTIF.md` (section 13 + rollout) dan `DOCS_UPDATE_CHECKLIST.md`.

## Open Questions

- Host generate-kan My Match Card untuk pemain manual (ide mockup D3) — fase ini tetap upsell login; putuskan di fase berikutnya.
- Galeri foto multi-user tersimpan (full section 04) — parked; keputusan saat ini hanya cover 1 foto.
- Dynamic OG meta untuk shared link: perlu cek apakah `functions/index.js` sudah merender meta per-share; jika belum, tentukan pendekatan (function rewrite vs prerender).
- Sertifikat Cupu (G1) sudah ada — apakah ikut di-attach sebagai slide bonus Rewind? Default: tidak, tetap dari Hall of Shame.
