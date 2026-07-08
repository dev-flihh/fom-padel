# Brief Konten Instagram — FOM Play

Untuk: Tim Design
Dari: Marketing
Update: 3 Juli 2026
Referensi visual hidup: https://fomplay.asia (website baru — section Toxic Mode & Rewind adalah acuan mood)

---

## 0. Tujuan, Audiens, CTA

- **Tujuan:** orang tahu FOM Play itu apa → tertarik karena USP (terutama Toxic Mode & Ranking) → buka app dan bikin match pertama.
- **Audiens:** pemain padel casual–kompetitif Indonesia, 20–40 th, aktif mabar mingguan, hidup di grup WhatsApp.
- **CTA standar semua konten:** `fomplay.asia` (link in bio). Copy CTA: **"Main gratis di fomplay.asia"** — jangan diubah-ubah biar nempel.

---

## 1. BRAND KIT (wajib dipakai konsisten)

### Warna
| Token | Hex | Pakai untuk |
|---|---|---|
| Oranye brand | `#E65E14` | Aksen utama, tombol, highlight kata |
| Oranye logo | `#FF5501` | Elemen logo, aksen di background gelap |
| Navy | `#17233B` | Teks logo "FOM", elemen gelap |
| Navy deep | `#0E1626` | **Background slide gelap** (Toxic Mode, Rewind) |
| Putih permukaan | `#F7F7FA` | Background slide terang |
| Hitam teks | `#111827` | Teks utama di slide terang |

### Font
- **Inter** (Bold/ExtraBold untuk headline, Medium untuk body). Headline tracking rapat (-2%). JANGAN pakai serif — brand kita sans semua.
- Angka besar (statistik, nomor step) boleh Inter ExtraBold ukuran jumbo — itu signature kita.

### Logo (file di repo `public/assets/`)
- `fom-play-logo-light-cropped.png` — logo full untuk background terang
- `fom-play-logo-dark-cropped.png` — logo full untuk background gelap
- `fom-logomark-color.png` — burung oranye saja (watermark pojok slide)

### Screenshot aplikasi ASLI (file di repo `website/public/screenshots/`, 720px)
| File | Isi |
|---|---|
| `app-live.png` | Live scoring + ticker "Zona Cupu" berjalan |
| `app-hall-of-shame.png` | Hall of Shame — "King of Cupu" panggung emas |
| `rewind-cover.png` | Slide cover FOM Rewind |
| `rewind-numbers.png` | Slide "The Numbers" |
| `rewind-podium.png` | Slide podium juara |
| `rewind-champion.png` | Slide Champion (mahkota) |
| `rewind-dreamteam.png` | Slide Dream Team |
| `rewind-cupu.png` | Slide Cupu D'Or (emas, roast) |
| `rewind-awards.png` | Slide Toxic Awards (4 kategori) |

> Screenshot selalu ditampilkan **di dalam frame HP** (bezel tipis rounded, shadow lembut). Kalau butuh screen lain, minta ke tim produk — jangan bikin mockup UI palsu.

### Tone of voice
- **Berani & playful, bahasa mabar.** Bercanda soal performa, tidak pernah soal fisik/pribadi.
- DO: "yang cupu ketahuan", "grup WhatsApp rame", "nggak ada tempat sembunyi".
- DON'T: kata "dummy/test", bahasa korporat ("solusi terintegrasi"), emoji berlebihan (maks 1–2 per slide), roast menyebut orang nyata.

### Spek teknis
- **Carousel:** 1080×1350 px (4:5). Maks 10 slide. Safe area: 100 px dari tiap tepi.
- **Story:** 1080×1920 px. Safe area atas 250 px & bawah 300 px (kena UI IG).
- Watermark: logomark burung + `@fomplay` kecil di pojok kiri bawah tiap slide (kecuali cover).
- Slide terakhir SETIAP carousel = slide CTA (template sama, lihat §2.1 slide 8 sebagai master).

---

## 2. CAROUSEL (7 post)

Urutan posting disarankan: C1 → C2 → C6 → C3 → C7 → C4 → C5 (selang-seling awareness/USP/tutorial, 2–3 post per minggu).

---

### C1 — "Kenalan: FOM Play itu apa?" (8 slide)
**Goal:** awareness. Orang paham FOM dalam 8 swipe.
**Art direction:** dominan terang (`#F7F7FA`), aksen oranye, satu slide gelap sebagai kejutan (slide 5).

| # | Visual | Copy (persis) |
|---|---|---|
| 1 (cover) | Background terang, logo full atas-tengah, mockup HP `app-live.png` miring 5° keluar dari bawah kanan, headline besar kiri | **Mabar padel kamu, tapi rapi.** — sub: "Kenalan sama FOM Play." |
| 2 | Teks besar tengah, tanpa gambar. Kata "ribet" dicoret garis oranye | **Yang ngatur skor selalu orang yang sama. Yang ~~ribet~~ juga.** — sub: "Kita kenal kok orangnya. Mungkin itu kamu." |
| 3 | Frame HP `app-live.png` besar tengah, 3 label panah oranye menunjuk ke bagian layar: "skor live", "ronde otomatis", "ticker zona cupu" | **FOM yang nyatet. Kamu tinggal main.** |
| 4 | Grid 2×2 ikon+teks (ikon garis, style Lucide): ⚡ Live scoring · 📊 Klasemen otomatis · 🔀 3 format (Americano, Mexicano, Match Play) · 🔗 Share tanpa login | **Semua urusan mabar, satu aplikasi.** |
| 5 (gelap!) | Background `#0E1626` + pola titik halus. Frame HP `app-hall-of-shame.png`. Glow oranye di belakang HP | **Dan satu hal yang nggak ada di aplikasi lain: Toxic Mode.** — sub: "Yang kalah, ketahuan. Detailnya di post berikutnya 👀" |
| 6 | Frame HP `rewind-podium.png` + `rewind-cupu.png` berdampingan miring | **Tiap mabar ditutup recap ala Wrapped.** — sub: "Namanya FOM Rewind. Siap dishare ke Story." |
| 7 | 7 badge tier berjejer naik seperti tangga (Rookie→Legend), badge terakhir glow oranye | **Setiap match naikin (atau nurunin) ranking kamu.** — sub: "MMR global & per kota." |
| 8 (CTA master) | Background navy deep, logo dark tengah, tombol pill oranye | **Main gratis di fomplay.asia** — sub: "Link di bio. Teman kamu nggak perlu install buat nonton skor." |

**Caption:** "Kenalan dulu. FOM Play = aplikasi buat jalanin mabar padel: live scoring, klasemen otomatis, ranking, dan… Toxic Mode. Gratis, temanmu nggak perlu login buat lihat skor. → fomplay.asia (link di bio)"
**Hashtag (pakai set ini untuk semua post):** #padel #padelindonesia #mabarpadel #padeljakarta #americanopadel #fomplay

---

### C2 — USP #1: "Toxic Mode" (9 slide) ⭐ konten unggulan
**Goal:** USP paling beda — bikin orang ngetag temannya.
**Art direction:** FULL gelap `#0E1626`, aksen oranye `#FF5501` + emas untuk Cupu D'Or. Mood: award show / roast night.

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | Teks jumbo tengah, kata "Toxic Mode" oranye glow, siluet trofi emas samar di belakang | **Menang dapat gengsi. Kalah dapat Cupu D'Or.** — sub kecil: "Kenalan sama Toxic Mode." |
| 2 | Teks besar + emoji 💀 kecil | **Tiap grup punya satu: paling rame di chat, paling sepi di skor.** — sub: "Aplikasi lain membiarkan dia lupa. FOM enggak." |
| 3 | Frame HP `app-live.png`, crop fokus ke kartu kuning "ZONA CUPU", panah oranye | **Ticker Zona Cupu — live.** — sub: "Begitu ada yang melorot, semua orang tahu. Real-time." |
| 4 | 3 kartu level bertingkat (kecil→besar): Mild 🙂 / Medium 😏 / Savage 💀, kartu Savage glow oranye | **Pilih level pedasnya.** — bullet: "Mild: sentilan halus · Medium: grup mulai screenshot · Savage: nggak ada yang selamat" |
| 5 | Bubble chat ala roast, background kartu gelap, teks italic | Contoh roast asli: *"Budi resmi nyumbang poin ke semua tim di court. Dermawan."* — sub: "Roast ditulis otomatis dari hasil beneran." |
| 6 | Frame HP `app-hall-of-shame.png` besar tengah, spotlight emas | **Hall of Shame: klasemen kedua yang lebih ditunggu dari klasemen asli.** |
| 7 | Frame HP `rewind-awards.png`, 4 kategori terlihat | **Ditutup upacara penghargaan.** — sub: "MVP = Minus Value Player. King of Bye. Kekalahan Terbesar. Dan sang juara: Cupu D'Or." |
| 8 | Teks tengah, ikon toggle off | **Tenang: roast-nya soal performa, bukan orangnya.** — sub: "Default-nya mati. Host yang pegang kendali. Bisa dimatiin kapan aja." |
| 9 | CTA master + tambahan | **Nyalain malam ini. Semoga Cupu D'Or jatuh ke orang lain.** — tombol: "fomplay.asia" |

**Caption:** "Tag teman yang paling deket sama Cupu D'Or 🏆 (kamu tahu siapa). Toxic Mode: Hall of Shame live, roast otomatis dari hasil match, upacara penghargaan. Tiga level, bisa dimatiin kapan aja. → fomplay.asia"

---

### C3 — USP #2: "Ranking MMR" (8 slide)
**Goal:** engagement kompetitif — "posisi kamu di mana?"
**Art direction:** terang, angka-angka jumbo, aksen oranye. Slide 4 gelap.

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | Angka MMR jumbo "1.842 ↗" oranye, background terang | **Menang, naik. Kalah, turun. Semua kelihatan.** — sub: "Ranking MMR di FOM Play." |
| 2 | Teks besar | **Menang semalam itu enak. Lihat angka naik berminggu-minggu itu nagih.** |
| 3 | Infografik: skor match → panah → angka MMR berubah (+24 hijau / −8 merah) | **Tiap sesi, MMR kamu di-update otomatis.** — sub: "Nggak perlu ngitung apa-apa." |
| 4 (gelap) | 7 badge tier tangga naik, Legend paling atas glow | **7 tier: Rookie → Amateur → Challenger → Elite → Master → Grandmaster → Legend.** — sub: "Semua mulai dari Rookie. Naiknya? Usaha." |
| 5 | Mock leaderboard sederhana (pakai style kartu website): 5 baris nama + MMR + delta, toggle "Global / Jakarta" | **Global atau per kota.** — sub: "Perdebatan 'siapa paling jago di kota ini' akhirnya ada jawabannya." |
| 6 | Teks + ikon ⚠️ playful | **Bolos mabar 3 minggu? Ada yang nyalip.** — sub: "Justru itu serunya." |
| 7 | Screenshot `app-hall-of-shame.png` crop bagian "YOUR SHAME RANK #8 · Official #1" | **Oh iya — kalau Toxic Mode nyala, ada ranking kedua juga.** 😏 |
| 8 | CTA master | **Satu sesi langsung keranking. Malam ini juga kehitung.** — tombol: "fomplay.asia" |

**Caption:** "Kotamu punya #1. Itu kamu? Main satu sesi dengan FOM → langsung masuk papan. MMR naik-turun otomatis tiap mabar, 7 tier dari Rookie sampai Legend. → fomplay.asia"

---

### C4 — USP #3: "FOM Rewind" (7 slide)
**Goal:** viral loop — orang pengen recap-nya.
**Art direction:** gelap, slide Rewind asli jadi bintang (mereka sudah cantik — jangan ditutupi).

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | 3 frame HP kipas (`rewind-cover`, `rewind-podium`, `rewind-cupu`) | **Mabar kelar. Recap-nya abadi.** — sub: "FOM Rewind: Wrapped-nya mabar kamu." |
| 2 | Teks besar | **Malam terbaik kalian nggak layak cuma jadi 'GG' di grup.** |
| 3 | Frame HP `rewind-numbers.png` | **The Numbers.** — sub: "Total poin, match, menit di court. Angka nggak bohong. Sayangnya." |
| 4 | Frame `rewind-champion.png` + `rewind-dreamteam.png` | **Podium, Champion, Dream Team.** — sub: "Yang jago dapat panggung." |
| 5 | Frame `rewind-cupu.png` besar, spotlight emas | **…dan yang tragis dapat bingkai emas.** — sub: "Cupu D'Or. Slide yang paling cepat nyampe grup." |
| 6 | Ilustrasi 3 langkah ringkas: selesai match → tap banner Rewind → share | **Bikinnya satu tap setelah match selesai.** — sub: "Bisa tambah 10 foto. Diproses di HP kamu, nggak diupload." |
| 7 | CTA master | **Main → Rewind → Story. Ulangi minggu depan.** — tombol: "fomplay.asia" |

**Caption:** "POV: mabar kamu punya Wrapped sendiri. Podium, dream team, match paling seru — dan satu Cupu D'Or yang lagi apes. Generate sekali tap, langsung share ke Story. → fomplay.asia"

---

### C5 — "Fitur sunyi yang paling kepake" (7 slide)
**Goal:** USP pendukung (share link, rooms, split bill, friends) — angle: pain host.
**Art direction:** terang, ilustrasi chat/receipt, playful.

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | Bubble chat WhatsApp bertumpuk: "skor berapa?" ×5 | **"Skor berapa?" — pertanyaan yang nggak akan kamu dengar lagi.** |
| 2 | Frame HP `app-live.png` + ikon link, garis putus ke 4 avatar | **Satu link. Semua nonton live dari HP masing-masing.** — sub: "Tanpa login. Tanpa install. Serius." |
| 3 | Kartu event ala app: "Padel Kamis · 19:00 · 6/8 pemain" | **Rooms: jadwal mingguan yang ngurus dirinya sendiri.** — sub: "RSVP jelas, slot jelas, drama berkurang." |
| 4 | Struk playful: "Court 420k + bola ÷ 8 = 52.500/orang" dicap "LUNAS" oranye | **Patungan dihitungin. Sampai ke recehnya.** — sub: "Nggak ada lagi 'nanti gue ganti'." |
| 5 | 3 kartu profil mini + tombol "+ Tambah" | **Squad kamu tersimpan. Setup match tinggal 2 tap.** — sub: "Sekalian pantau MMR mereka. Buat bahan." |
| 6 | Kolase 4 fitur kecil | **Hal-hal kecil yang bikin mabar jalan terus.** |
| 7 | CTA master | **Jadi host itu berat. FOM yang gendong.** — tombol: "fomplay.asia" |

**Caption:** "Fitur yang jarang dipamerin tapi paling kepake: share skor tanpa login, jadwal + RSVP, patungan otomatis, squad tersimpan. Host senang, mabar awet. → fomplay.asia"

---

### C6 — Tutorial: "Cara pakai FOM, dari nol" (8 slide)
**Goal:** hilangkan friksi "ribet nggak sih?". Format checklist.
**Art direction:** terang, nomor step JUMBO oranye (01–05), screenshot frame HP tiap step.

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | Angka "5" jumbo + teks | **Dari buka app sampai mabar: 5 menit.** — sub: "Ikutin aja." |
| 2 | "01" jumbo, mock layar login sederhana | **Buka fomplay.asia → login.** — sub: "Bisa Google. Yang butuh akun cuma kamu (host) — pemain lain enggak." |
| 3 | "02" jumbo, chip 3 format | **Pilih format.** — sub: "Baru pertama? Americano. Semua main sama semua, adil, seru." |
| 4 | "03" jumbo, daftar nama pemain + tombol + | **Masukin pemain.** — sub: "Ketik nama atau tarik dari Friends. 8 orang = ideal." |
| 5 | "04" jumbo, chip court & poin | **Set court & poin.** — sub: "2 court, 24 poin per ronde — default yang aman." |
| 6 | "05" jumbo, tombol "Generate Match" oranye besar | **Tap Generate.** — sub: "Jadwal, pairing, rotasi — FOM yang mikir." |
| 7 | Frame HP `app-live.png` | **Sisanya tinggal main. Skor di-tap, klasemen jalan sendiri.** |
| 8 | CTA master | **Cobain malam ini. Gratis.** — tombol: "fomplay.asia" |

**Caption:** "Nggak ribet. Ini semua langkahnya — beneran cuma segini. Simpan buat mabar berikutnya 📌 → fomplay.asia"

---

### C7 — Tutorial: "Bikin pertandingan pertama kamu" (9 slide)
**Goal:** konversi — deep tutorial bikin match + fitur pendukung, versi lebih detail dari C6 dengan bonus Toxic & Rewind.
**Art direction:** sama dengan C6 (satu keluarga visual), plus 2 slide gelap di bonus.

| # | Visual | Copy |
|---|---|---|
| 1 (cover) | Teks + tombol "Start Match" mock | **Bikin pertandingan pertamamu. Bedah tuntas.** |
| 2 | Step 01 — form nama match | **Kasih nama match-nya.** — sub: "'Jumat Malam Americano' udah cukup. Nama ini muncul di Rewind kamu." |
| 3 | Step 02 — 3 kartu format dengan penjelasan singkat masing-masing | **Pilih format sesuai vibe.** — "Americano: santai, rotasi · Mexicano: makin malam makin ketat · Match Play: tim tetap, personal" |
| 4 | Step 03 — player picker | **Tambah pemain (mereka nggak perlu app).** |
| 5 | Step 04 — toggle Toxic Mode, glow oranye (slide gelap) | **Opsional tapi direkomendasikan: nyalain Toxic Mode.** — sub: "Mild dulu kalau grupnya baru. Medium kalau udah saling kenal dosanya." |
| 6 | Step 05 — Generate + layar live | **Generate → main → skor di-tap.** — sub: "Ronde ganti otomatis. Klasemen ngurut sendiri." |
| 7 | Ikon share + 4 HP kecil | **Share link ke grup — semua bisa mantau live.** |
| 8 (gelap) | Frame `rewind-cover.png` | **Match selesai? Tutup dengan Rewind.** — sub: "Satu tap. Langsung jadi konten." |
| 9 | CTA master | **Court udah dibooking? Sisanya FOM. → fomplay.asia** |

**Caption:** "Tutorial lengkap bikin match di FOM — termasuk dua langkah yang bikin mabar kamu beda: Toxic Mode & Rewind. Simpan & share ke host di grupmu 📌 → fomplay.asia"

---

## 3. BRIEF INSTAGRAM STORY

### Prinsip story
- 1080×1920, konten inti di tengah (safe area atas 250 / bawah 300).
- Setiap seri ditutup frame CTA dengan **link sticker** ke `fomplay.asia` (atau langsung ke `fomplay.asia/toxic-mode` untuk seri toxic).
- Gunakan sticker interaktif IG asli (poll/quiz/slider/tanya) — jangan digambar palsu.
- Simpan tiap seri sebagai **Highlight**: "Apa itu FOM" / "Toxic Mode" / "Tutorial".

### Story S1 — Launch/awareness (5 frame, posting bareng C1)
| Frame | Visual | Copy + interaksi |
|---|---|---|
| 1 | Gelap, teks jumbo | "Mabar kamu udah punya aplikasi belum?" + **poll: Udah / Masih catat manual** |
| 2 | Frame HP `app-live.png`, zoom-in pelan (motion) | "Live scoring. Klasemen otomatis. Semua dari satu HP." |
| 3 | Crop `app-hall-of-shame.png` bagian King of Cupu | "Dan yang kalah… dinobatkan. 👑" |
| 4 | 3 slide rewind kipas | "Ditutup recap ala Wrapped." |
| 5 (CTA) | Navy deep + logo + link sticker | "Main gratis → fomplay.asia" |

### Story S2 — Interaktif Toxic Mode (4 frame, posting bareng C2)
| Frame | Visual | Copy + interaksi |
|---|---|---|
| 1 | Gelap, trofi emas | "Di tiap grup padel ada satu calon Cupu D'Or." + **sticker tanya: "Di grupmu siapa? (inisial aja 😌)"** |
| 2 | Kartu 3 level | "Grupmu kuat di level mana?" + **poll 3 opsi via slider/quiz: Mild / Medium / Savage** |
| 3 | Bubble roast contoh | "Roast-nya otomatis dari hasil match. Ini contoh aslinya." |
| 4 (CTA) | Link sticker → `fomplay.asia/toxic-mode` | "Baca cara kerja Toxic Mode →" |
| Follow-up | Repost jawaban sticker tanya terbaik (blur nama) — konten gratis 2–3 story |

### Story S3 — Tutorial 60 detik (5 frame, posting bareng C6/C7)
| Frame | Visual | Copy + interaksi |
|---|---|---|
| 1 | Angka "5 menit" jumbo | "Bikin match padel < 5 menit. Timer jalan ⏱" |
| 2–4 | Screen recording ASLI app (minta ke tim produk): pilih format → tambah pemain → generate → skor | Step 01–03 overlay teks singkat. **Countdown sticker** di frame 2 |
| 5 (CTA) | Quiz sticker | **Quiz: "Berapa orang yang harus install app biar semua bisa lihat skor?" A. Semua B. Cuma host ✓** + link sticker fomplay.asia |

### Template story evergreen — "Rewind Repost"
Bikin 1 template kosong (frame oranye tipis + logomark + teks "FOM REWIND MALAM INI") untuk **repost story user** yang share slide Rewind mereka & tag @fomplay. Ini mesin UGC kita — prioritaskan.

---

## 4. Catatan produksi
1. **Jangan pakai nama orang asli** di contoh roast/leaderboard. Nama aman: Budi, Raka, Dinda, Sasha, Yoga.
2. Screenshot jangan di-crop sampai kehilangan konteks UI (header app harus kelihatan minimal sekali per post).
3. Semua angka statistik di konten harus dari screenshot asli — jangan ngarang angka pengguna ("10.000 pemain") sebelum ada data resmi.
4. Deliverable per post: file feed (4:5) + versi story 9:16 dari slide cover (buat promosi post di story).
5. Butuh screen tambahan (mis. layar pilih format, player picker, toggle Toxic)? Minta ke tim produk — bisa di-generate dari app dengan data demo yang realistis.
