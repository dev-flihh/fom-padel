# Docs Update Checklist (Wajib)

Gunakan checklist ini setiap ada perubahan fitur.

## 1. Update SSOT
File utama:
- `docs/SSOT_FOM_PLAY.md`

Checklist:
- Update section halaman yang terdampak.
- Update bagian logic/rules jika ada perubahan behavior.
- Update persistence/share/auth bila terdampak.
- Update tanggal `Last Updated`.
- Update section `Production Deploy Version Log` dengan:
  - commit hash
  - tanggal push production (Asia/Jakarta)
  - ringkasan fitur/perubahan user-facing

## 2. Sync ke Google Docs
- Jalankan sync local script:
- `npm run docs:sync:gdocs`

Sebelum run, pastikan env sudah ada:
- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_WEBHOOK_SECRET`

## 3. Release Notes singkat
Tambahkan ringkasan perubahan pada pesan commit atau catatan release internal.
