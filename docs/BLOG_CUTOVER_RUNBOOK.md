# Blog Cutover Runbook

Last Updated: 2026-04-21 (Asia/Jakarta)

## Goal

Mengganti blog/landing page lama di `fomplay.asia` dengan blog baru secara bertahap dan aman.

## Current Model

- Source blog baru ada di `fom-blog/site/`
- Preview/staging publish ada di `public/blog-next/`
- Final publish ada di `public/blog/`
- Root cutover dikontrol lewat script:
  - `npm run blog:cutover:on`
  - `npm run blog:cutover:off`
  - `npm run blog:cutover:permanent`

## URLs

- Preview candidate: `https://fomplay.asia/blog-next/`
- Final blog target: `https://fomplay.asia/blog/`
- Existing landing/root: `https://fomplay.asia/`

## Pre-Cutover Checklist

- Semua copy, link CTA, dan asset di `fom-blog/site/` sudah final
- `npm run blog:sync` sudah dijalankan
- Preview `/blog-next/` sudah dicek di desktop dan mobile
- Semua halaman artikel utama terbuka normal dari `/blog-next/`
- Meta preview dasar sudah benar:
  - title
  - description
  - og image
  - canonical
- `/blog-next/` masih `noindex`
- `npm run build` lolos
- Semua pihak yang perlu tahu jadwal switch sudah aligned

## Operator Shortcuts

Kalau ingin alur yang lebih ringkas, pakai command berikut:

- Status saat ini: `npm run blog:status`
- Preview prep: `npm run blog:prepare:preview`
- Final `/blog` prep: `npm run blog:prepare:final`
- Soft cutover prep: `npm run blog:prepare:cutover-soft`
- Permanent cutover prep: `npm run blog:prepare:cutover-permanent`
- Rollback prep: `npm run blog:prepare:rollback`

Kalau operator ingin sekaligus sampai ke langkah deploy hosting, gunakan helper berikut:

- `npm run blog:deploy:preview`
- `npm run blog:deploy:final`
- `npm run blog:deploy:cutover-soft`
- `npm run blog:deploy:cutover-permanent`
- `npm run blog:deploy:rollback`

Kalau operator ingin langsung menjalankan deploy hosting setelah preparation:

- `npm run blog:deploy:preview:now`
- `npm run blog:deploy:final:now`
- `npm run blog:deploy:cutover-soft:now`
- `npm run blog:deploy:cutover-permanent:now`
- `npm run blog:deploy:rollback:now`

Catatan:

- helper `blog:deploy:*` default-nya belum mengeksekusi deploy; dia akan menampilkan command deploy final
- helper `blog:deploy:*:now` akan mengeksekusi deploy otomatis
- untuk mengeksekusi otomatis dari script dasar, jalankan file Node yang sama dengan flag `--deploy`
- project Firebase default di helper adalah `gen-lang-client-0996764238`

## Smoke Test On Preview

Sebelum promote:

1. Jalankan `npm run blog:prepare:preview`
2. Buka `/blog-next/`
3. Cek nav, CTA, artikel, footer
4. Buka semua artikel utama:
   - `/blog-next/articles/americano-vs-mexicano/`
   - `/blog-next/articles/cara-mulai-turnamen-padel/`
   - `/blog-next/articles/kenapa-live-scoring-padel-penting/`
5. Pastikan semua asset gambar tampil
6. Pastikan CTA ke `/app` tidak broken
7. Pastikan tidak ada link yang masih menunjuk ke path lama yang salah

## Promote To `/blog`

Saat content sudah stabil:

1. Jalankan `npm run blog:prepare:final`
2. Deploy hosting
3. Verifikasi `/blog/` dan semua artikel final

Tujuan tahap ini:

- blog baru sudah hidup di path final `/blog`
- root `/` belum berubah
- final URL sudah bisa diuji tanpa mengganggu landing lama

## Root Cutover (Soft Launch)

Gunakan redirect sementara dulu agar rollback cepat dan sinyal produksi bisa dipantau:

1. Jalankan `npm run blog:prepare:cutover-soft`
2. Deploy hosting
3. Verifikasi bahwa `/` redirect ke `/blog/` dengan status sementara

Checklist setelah soft launch:

- buka `/`
- buka `/blog/`
- buka `/app`
- cek 3 artikel utama
- cek favicon, og tags, canonical, dan layout mobile
- cek tidak ada loop redirect
- cek analytics/event utama jika ada pemantauan aktif

Jika ada masalah:

1. Jalankan `npm run blog:prepare:rollback`
2. Deploy hosting
3. Root kembali ke flow sebelumnya

## Permanent Cutover

Kalau soft launch sudah aman:

1. Jalankan `npm run blog:prepare:cutover-permanent`
2. Deploy hosting
3. Verifikasi root redirect permanen ke `/blog/`

Catatan:

- lakukan ini hanya setelah yakin tidak perlu rollback cepat
- redirect permanen bisa lebih “lengket” di cache/browser/search engine

## Rollback Plan

Kalau issue muncul setelah `blog:cutover:on`:

1. `npm run blog:prepare:rollback`
2. deploy hosting
3. cek root `/`
4. cek `/app`
5. cek bahwa landing lama tampil lagi

Kalau issue muncul setelah `blog:cutover:permanent`:

1. tetap jalankan `npm run blog:prepare:rollback`
2. deploy hosting
3. validasi ulang dengan browser baru/incognito karena cache redirect 301 bisa bertahan

## Recommended Deployment Sequence

### Phase 1: Preview

1. `npm run blog:prepare:preview`
3. deploy hosting
4. review `/blog-next/`

### Phase 2: Final Blog Path

1. `npm run blog:prepare:final`
3. deploy hosting
4. review `/blog/`

### Phase 3: Root Redirect Trial

1. `npm run blog:prepare:cutover-soft`
2. deploy hosting
3. review `/`

### Phase 4: Permanent Root Switch

1. `npm run blog:prepare:cutover-permanent`
2. deploy hosting
3. review `/`

## Notes

- `blog-next` sengaja tidak untuk indexing
- `blog` adalah kandidat final
- `cutover:on` adalah mode paling aman untuk hari migrasi
- jangan lompat langsung ke `permanent` kalau belum ada validasi produksi
