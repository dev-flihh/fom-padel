# FOM Play — Blog & Landing Page Revamp Plan

Last Updated: 2026-07-03 (Asia/Jakarta)
Status: ✅ LIVE di produksi — website di `fomplay.asia` (root + turunan), aplikasi FOM tetap di `fomplay.asia/app`.

### Cutover produksi (3 Juli 2026)
Deploy gabungan ke satu hosting site Firebase: base = build app (`dist/` + `archive.html` app shell + service worker), overlay = website (`website/dist/`) di root & turunan. `/app`→`/archive.html` via `firebase.cutover.json`.
- Deploy ulang: `npm run build` → `npm --prefix website run build` → `node scripts/build-web-cutover.mjs` → `firebase deploy --only hosting --config firebase.cutover.json --project gen-lang-client-0996764238`.
- Caveat: service worker app ber-scope `/`; user lama bisa lihat landing lama di root sampai SW update. Follow-up: batasi scope SW ke `/app` di rilis app berikutnya.

Menggantikan arah lama di `docs/LANDING_PAGE_STRATEGY.md` (April 2026) yang belum mencakup Toxic Mode, FOM Rewind, Rooms, dan friend system.

## 0. Keputusan yang Sudah Diambil

| Keputusan | Pilihan |
|---|---|
| Arsitektur | Rebuild site statis baru (Astro + Tailwind 4), satu design system senada app. App tetap di `/app`, tidak disentuh. |
| Positioning | Padel-first |
| Bahasa | Bilingual — root `/` = English (default), `/id/` = Bahasa Indonesia, hreflang + language switcher, 301 redirect dari URL lama |
| Tone Toxic Mode | Berani & playful — roast humor jadi bintang |
| Tujuan utama | Orang tertarik → register di app → secepatnya paham USP |

## 1. Positioning & Messaging

**Category statement (EN):**
> FOM Play is the padel app that runs your game nights — live scoring, automatic standings, global rankings, and a Toxic Mode your group chat will never forget.

**Category statement (ID):**
> FOM Play adalah aplikasi padel untuk menjalankan mabar — live scoring, klasemen otomatis, ranking global, dan Toxic Mode yang bikin grup WhatsApp rame.

**Hierarki USP (urutan penekanan):**

1. **Toxic Mode / Hall of Shame** — 3 level (Mild/Medium/Savage), Cupu D'Or, Zona Cupu, live shame ticker, toxic awards. Angle: "game jadi lebih seru", satu-satunya app padel dengan ini.
2. **Global & City Ranking (MMR)** — 7 tier Rookie→Legend, ranking per kota/provinsi, MMR history per sesi. Angle: "setiap mabar ada taruhannya — reputasi jangka panjang."
3. **FOM Rewind** — recap 17 slide ala Spotify Wrapped, photo dump, siap share IG Story. Angle: viral loop / kenang-kenangan.
4. **Live scoring + klasemen otomatis** — inti workflow host.
5. **Shared link tanpa login** — semua pemain pantau dari HP masing-masing, penonton tidak perlu install/daftar.
6. **3 format + auto-pairing** — Americano, Mexicano, Match Play; rotating & fixed partner.
7. **Rooms: jadwal + RSVP + split biaya** — court fee & bola dibagi otomatis, status bayar per pemain.
8. **Friend system & profil pemain** — squad, quick-add teman saat setup match.

**Contoh headline hero:**
- EN: `Score the game. Climb the ranks. Roast your friends.`
- EN alt: `Padel nights, organized. Rivalries, immortalized.`
- ID: `Skor tercatat. Ranking naik. Yang cupu, ketahuan.`
- ID alt: `Menang dapat gengsi. Kalah dapat Cupu D'Or.`

## 2. Arsitektur Site & URL Map

Stack: **Astro + Tailwind CSS 4** (+ React islands untuk komponen interaktif), konten blog dalam **MDX/Markdown collections**, deploy ke **Firebase Hosting** yang sama. Design token diimpor dari nilai app (`src/index.css`, `matchTheme.ts`).

| English (default, root) | Bahasa Indonesia (`/id/`) | Catatan |
|---|---|---|
| `/` | `/id/` | Landing utama |
| `/features` | `/id/fitur` | Overview semua fitur |
| `/toxic-mode` | `/id/toxic-mode` | **Halaman USP khusus** — baru |
| `/ranking` | `/id/ranking` | Sistem MMR, tier, ranking kota — baru versi lengkap |
| `/rewind` | `/id/rewind` | Showcase FOM Rewind — baru |
| `/formats/americano` | `/id/format/americano` | Refresh konten lama |
| `/formats/mexicano` | `/id/format/mexicano` | Refresh konten lama |
| `/formats/match-play` | `/id/format/match-play` | Refresh konten lama |
| `/faq` | `/id/faq` | Refresh |
| `/blog` + `/blog/{slug}` | `/id/blog` + `/id/blog/{slug}` | Hub artikel |

**Redirect 301 dari URL lama** (konten lama semua bahasa Indonesia → pindah ke `/id/`):
- `/fitur` → `/id/fitur`
- `/format/*` → `/id/format/*`
- `/ranking` → `/id/ranking` (konten ID)
- `/faq` → `/id/faq`
- `/edukasi/perbedaan-americano-vs-mexicano` → `/id/blog/americano-vs-mexicano`
- `/blog/articles/{slug}/` → `/id/blog/{slug}`

**SEO minimum:** hreflang pair EN↔ID di semua halaman, canonical, sitemap ganda, schema `SoftwareApplication` (root), `FAQPage`, `Article` + `BreadcrumbList` (blog), OG image template konsisten per halaman/artikel.

**Embed mode untuk app (permintaan khusus):** setiap artikel tersedia di `/blog/{slug}?embed=1` — tanpa header/footer/nav, typography ringkas, CTA disembunyikan, tinggi menyesuaikan konten. Homepage app FOM tinggal render iframe/webview ke URL ini untuk tutorial fitur baru. Artikel diberi frontmatter `embeddable: true` + `appFeature: "toxic-mode"` supaya app bisa fetch daftar tutorial per fitur dari `blog-index.json` yang di-generate saat build.

## 3. Landing Page — Struktur Section (Mobile First)

Referensi visual: Originix / Streamline / AppSpace / FleetOps (21st.dev) — hero dengan device mockup, bento grid, block-based section, banyak whitespace, scroll animation halus (Motion).

1. **Header sticky** — logo FOM, nav: Features · Toxic Mode · Ranking · Formats · Blog, language switcher (EN/ID), CTA `Open App`. Mobile: sticky bottom CTA.
2. **Hero** — headline roast-flavored (lihat §1), subheadline 1 kalimat, CTA primer `Start Free` → `/app`, sekunder `See Toxic Mode ↓`. Visual: mockup HP live match + klasemen, badge tier melayang. Latar putih/`#F7F7FA`, aksen oranye `#E65E14`.
3. **Proof strip** — 3–4 angka: matches scored, players ranked, cities on leaderboard, rewinds generated (ambil snapshot data asli saat build).
4. **USP spotlight #1: Toxic Mode** — section paling besar setelah hero. Mock ticker "Zona Cupu" beranimasi, contoh roast asli dari app, kartu 3 level intensitas (Mild → Medium → Savage), trofi Cupu D'Or. Copy EN: `Losing has never been this entertaining.` CTA → `/toxic-mode`.
5. **USP spotlight #2: Global Ranking** — 7 badge tier (Rookie→Legend), grafik MMR naik-turun, toggle Global ↔ per kota. Copy: `Every match counts. Everyone can see it.` CTA → `/ranking`.
6. **Bento grid fitur** — 6 kartu: Live Scoring, Auto Standings, Share Link (no login), FOM Rewind, Rooms + Split Bill, 3 Formats. Tiap kartu pakai warna tema format app (hijau/oranye/biru/teal).
7. **FOM Rewind showcase** — carousel slide Rewind asli (podium, Dream Team, Cupu D'Or, photo dump) dengan frame IG Story. Copy: `Your game night, wrapped.`
8. **How it works** — 3 langkah: Set up (format, pemain, court) → Play (live scoring) → Flex (share, rewind, ranking naik).
9. **Formats** — 3 kartu Americano/Mexicano/Match Play → format pages.
10. **Testimoni komunitas** — quote host/pemain + IG handle (kumpulkan dari komunitas; placeholder dulu di prototype).
11. **Blog preview** — 3 artikel terbaru.
12. **FAQ** — 5–6 teratas dengan schema FAQPage.
13. **Final CTA** — `Your friends are already on the leaderboard. / Temanmu sudah ada di leaderboard. Kamu kapan?` + footer lengkap.

## 4. Halaman Turunan

- **`/toxic-mode`** — halaman penjualan penuh: apa itu, 3 level dengan contoh copy roast per level, Cupu D'Or & toxic awards, Zona Cupu live ticker, etika ("roast antar teman, bukan bully — bisa dimatikan kapan saja"), FAQ singkat, CTA. Target keyword: "toxic mode padel", "aplikasi padel seru".
- **`/ranking`** — cara kerja MMR (naik/turun per sesi, otomatis), 7 tier dengan visual badge, ranking global vs kota, MMR history, cara mulai terindeks (main 1 sesi). Target: "ranking padel indonesia", "mmr padel".
- **`/rewind`** — galeri contoh slide, cara generate, privasi foto (diproses lokal, tidak diupload kecuali disimpan).
- **`/features`** — semua fitur dalam format block, tiap block link ke artikel tutorialnya (internal linking kuat).
- **Format pages** — refresh konten lama: aturan main, kapan cocok dipakai, cara menjalankannya di FOM (auto-pairing), CTA + link artikel tutorial.
- **`/faq`** — gabungan FAQ lama + baru (toxic mode bisa dimatikan? rewind ke mana? data ranking dari mana? gratis?).

## 5. Blog — Rencana Konten

Semua artikel ditulis EN + ID (satu slug, dua bahasa). Kategori: `Getting Started` · `Features` · `Formats & Rules` · `Community & Tips`.

**Prioritas konten: seri Getting Started = prioritas 1, artikel marketing/SEO = prioritas 2.**

### Seri Getting Started (prioritas 1 — juga jadi tutorial embed di app)

| # | Judul (EN / ID) | Embed target di app |
|---|---|---|
| 1 | Host Your First Padel Game in 5 Minutes / Mulai Mabar Padel Pertamamu dalam 5 Menit | Onboarding |
| 2 | Setting Up an Americano Night / Cara Bikin Sesi Americano | Match setup |
| 3 | Running a Mexicano Session / Menjalankan Sesi Mexicano | Match setup |
| 4 | Match Play & Fixed Partners Explained / Panduan Match Play & Partner Tetap | Match setup |
| 5 | Turn On Toxic Mode (You Know You Want To) / Nyalakan Toxic Mode, Jangan Pura-Pura Nggak Mau | Toxic settings |
| 6 | Understanding Your MMR & Rank Tiers / Memahami MMR dan Tier Ranking | Leaderboard |
| 7 | Create Your First FOM Rewind / Bikin FOM Rewind Pertamamu | Rewind flow |
| 8 | Share Live Scores Without Anyone Logging In / Share Skor Live Tanpa Ribet Login | Share |
| 9 | Rooms: Schedule Games & Split Court Costs / Rooms: Atur Jadwal & Patungan Biaya Court | Rooms |
| 10 | Build Your Squad with Friends / Bangun Squad dengan Fitur Friends | Friends |

### Artikel Marketing / SEO (prioritas 2 — top & mid funnel)

| # | Judul (EN / ID) | Catatan |
|---|---|---|
| 11 | Americano vs Mexicano: Which Format Fits Your Group? | Refresh artikel lama (sudah ada traksi SEO) |
| 12 | What Is Padel? A Beginner's Guide / Apa Itu Padel? Panduan Pemula | Top funnel, volume tinggi di ID |
| 13 | How to Grow a Padel Community That Keeps Coming Back / Cara Bangun Komunitas Padel yang Awet | Target host/organizer |
| 14 | Why Live Scoring Changes Everything / Kenapa Live Scoring Itu Penting | Refresh artikel lama |
| 15 | 7 Ways to Make Your Padel Night More Fun / 7 Cara Bikin Mabar Padel Lebih Seru | Listicle, Toxic Mode sebagai #1 |
| 16 | Cupu D'Or: The Trophy Nobody Wants / Cupu D'Or: Trofi yang Tidak Ada yang Mau | Viral piece, shareable |
| 17 | How MMR Ranking Actually Works / Cara Kerja Ranking MMR | Refresh artikel lama |
| 18 | Padel Etiquette: Unwritten Rules of Mabar / Etika Mabar Padel | Community tips |
| 19 | Auto Standings: Never Do Math at the Court Again / Klasemen Otomatis Tanpa Hitung Manual | Refresh artikel lama |
| 20 | Stop Being the Host Who Does Everything / Jangan Jadi Host yang Ngerjain Semuanya | Pain-point piece → Rooms + share link |

**Kanal distribusi tiap artikel fitur baru:** blog post (EN+ID) → embed di homepage app sebagai tutorial → potongan carousel IG → share ke komunitas WhatsApp.

## 6. Design Direction

- **Senada app:** primary orange `#E65E14`, surface `#F7F7FA`/putih, teks `#111827`, radius kartu 16–24px, Inter (body) + Instrument Serif (display headline), ikon Lucide, aksen gradient tema format (hijau `#18A486`, biru `#2F6FE4`, teal `#0891B2`, rose `#E11D48`).
- **Dari benchmark:** bento grid (Originix/Streamline), device mockup hero (AppSpace), block section modular, scroll reveal halus, angka proof besar (FleetOps).
- **Mobile first:** semua section didesain 375px dulu, sticky bottom CTA di mobile, tabel/carousel scrollable horizontal, target LCP < 2.5s (statis, gambar AVIF/WebP, font preload).
- **Khusus section toxic:** boleh sedikit "nakal" — reuse animasi app (`toxic-confetti-fall`, `toxic-gold-shimmer-sweep`) supaya rasa app dan web nyambung.

## 7. Ide Brainstorm (belum diminta, layak dipertimbangkan)

1. **Live Top-10 leaderboard di landing** — snapshot ranking global asli (dari `player_stats`) di-generate saat build/harian. Social proof paling jujur + konten selalu segar di mata Google. ⭐ paling direkomendasikan
2. **Public player profile / shareable rank card** — halaman `fomplay.asia/p/{username}` berisi tier, MMR, win rate → SEO long-tail nama pemain + viral loop ("cek profilku"). *Catatan:* datanya sudah ada di Firestore `player_stats`, jadi sisi web tidak menunggu apa-apa — tapi butuh kerja kecil di app dulu: (a) username/slug publik yang unik (jangan pakai Firebase UID di URL), (b) setting privasi opt-in "profil publik" (default off — nama + kota + performa itu data pribadi), (c) tombol "Share profil" di ProfileScreen sebagai entry point viral. Karena itu fitur ini ditaruh di fase paling akhir.
3. **Roast Preview widget** — widget kecil di `/toxic-mode`: ketik nama teman → keluar contoh roast ala Savage mode → tombol share. Murah dibuat, sangat shareable.
4. **Changelog / What's New page** — feed rilis fitur; artikel tutorial otomatis muncul di sini juga; bisa jadi sumber notifikasi in-app.
5. **OG image generator** — template OG otomatis per artikel (judul + aksen warna kategori) supaya share di WA/IG selalu rapi.
6. **Newsletter / WhatsApp Channel CTA** — tangkap audiens yang belum siap install; kirim rekap fitur baru + artikel.
7. **Kalkulator/generator Americano versi web-lite** — tool gratis "generate rotasi Americano" di blog sebagai SEO magnet & backlink bait, ujungnya CTA ke app.
8. **Season & komunitas spotlight** — artikel bulanan "Top climbers bulan ini" per kota; komunitas yang disebut pasti ikut share.

## 8. Fase Development

Prinsip urutan: yang menghasilkan konversi register duluan (landing + USP pages), lalu konten prioritas 1 (Getting Started + embed app), baru SEO & growth. Fase 0–2 = **penting (harus ada sebelum cutover dianggap selesai)**, Fase 3 = penting tapi tidak memblokir, Fase 4–5 = **nice to have**.

### Fase 0 — Fondasi & Prototype ⛰️ penting
- Scaffold project site statis baru (Astro + Tailwind 4) di folder terpisah dalam repo, terpisah dari app.
- Port design token dari app (`src/index.css`, `matchTheme.ts`): warna, font Inter + Instrument Serif, radius, animasi toxic.
- Layout dasar: header sticky + language switcher + footer; i18n routing EN root + `/id/`.
- **Prototype untuk review:** homepage EN lengkap + `/toxic-mode` + 1 template artikel — mobile first, review visual sebelum lanjut.
- Deploy pipeline ke Firebase Hosting preview channel (reuse pola `blog:*` scripts).

### Fase 1 — Landing MVP & Cutover ⛰️ penting — ✅ SELESAI (prototype)
- Semua section homepage final (EN + ID); testimoni boleh placeholder, proof strip boleh angka manual dulu.
- Halaman USP: `/toxic-mode`, `/ranking`, `/features` (EN + ID).
- Refresh 3 format pages + `/faq` (EN + ID).
- SEO teknis: 301 redirect semua URL lama, hreflang, canonical, sitemap, schema (SoftwareApplication, FAQPage), OG image statis per halaman.
- QA mobile (375px), Lighthouse/LCP, lalu cutover produksi menggantikan landing + blog lama.

### Fase 2 — Blog + Getting Started (konten prioritas 1) ⛰️ penting — ✅ SELESAI (10/10 artikel Getting Started)
- Blog hub `/blog` + `/id/blog`, template artikel MDX, kategori, artikel terkait.
- Embed mode `?embed=1` + generate `blog-index.json` saat build.
- Tulis & publish 10 artikel Getting Started (EN + ID). Batch pertama: #1 (mulai mabar), #5 (Toxic Mode), #6 (MMR), #7 (Rewind), #2 (Americano); sisanya menyusul.
- Integrasi sisi app: ✅ SELESAI — section "Panduan / Belajar FOM Play" di dashboard (`src/features/tutorials/`) fetch `blog-index.json` (cache TTL), buka artikel sebagai in-app webview `?embed=1`. Gated `TUTORIALS_ENABLED` di App.tsx.

### Fase 3 — Artikel SEO / Marketing (konten prioritas 2) 🏔️ penting, tidak memblokir
- Refresh 5 artikel lama yang sudah punya traksi (#11, #14, #17, #19 + edukasi lama).
- Artikel baru top-funnel (#12, #13, #15, #18, #20) + viral piece #16 (Cupu D'Or).
- Halaman `/rewind` dedicated.
- Testimoni asli komunitas menggantikan placeholder.

### Fase 4 — Growth Features 🌱 nice to have
- Live Top-10 leaderboard di landing (build-time fetch `player_stats`, butuh service account di CI).
- Roast Preview widget di `/toxic-mode`.
- OG image generator otomatis per artikel.
- Newsletter / WhatsApp Channel CTA + changelog page.
- Web-lite generator rotasi Americano (SEO magnet).
- Rubrik bulanan "Top climbers per kota".

### Fase 5 — Public Player Profile 🌱 nice to have, butuh kerja app dulu
- Sisi app: username/slug unik + setting privasi opt-in "profil publik" (default off) + tombol Share di ProfileScreen.
- Sisi web: halaman `/p/{username}` (tier, MMR, win rate, riwayat singkat) + rank card shareable.
