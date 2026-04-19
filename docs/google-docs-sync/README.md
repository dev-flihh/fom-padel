# Google Docs Sync Setup (Auth Sekali)

Tujuan:
- Dokumen SSOT utama ada di repo: `docs/SSOT_FOM_PLAY.md`
- Konten otomatis dikirim ke Google Docs agar bisa dibaca kapanpun.

## A. Setup sekali di Google Apps Script
1. Buka `https://script.new`
2. Ganti isi `Code.gs` dengan file ini:
- `docs/google-docs-sync/apps-script/Code.gs`
3. Save project, misal nama: `FOM Play Docs Sync`
4. Buka `Project Settings` > `Script properties`, lalu tambahkan:
- `DOC_ID` = ID Google Docs tujuan
- `WEBHOOK_SECRET` = secret bebas (contoh random 32+ char)
- `SOURCE_RAW_URL` = URL raw markdown SSOT dari GitHub

Contoh `SOURCE_RAW_URL`:
- `https://raw.githubusercontent.com/dev-flihh/fom-padel/main/docs/SSOT_FOM_PLAY.md`

## B. Deploy web app endpoint
1. Klik `Deploy` > `New deployment`
2. Type: `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Deploy
6. Copy URL web app, simpan sebagai `APPS_SCRIPT_WEBHOOK_URL`

## C. Auth sekali
1. Di editor Apps Script, jalankan function `syncFromRawNow`
2. Klik `Review permissions`
3. Allow semua izin yang diminta
4. Jika sukses, Google Doc akan terisi SSOT

Setelah ini auth tidak perlu diulang kecuali script diganti scope/owner.

## D. Kirim update dari local/repo
Gunakan script local:
- `scripts/sync-docs-to-gdocs.mjs`

Env yang dibutuhkan:
- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_WEBHOOK_SECRET`

Contoh command:
- `APPS_SCRIPT_WEBHOOK_URL='https://script.google.com/macros/s/.../exec' APPS_SCRIPT_WEBHOOK_SECRET='xxx' node scripts/sync-docs-to-gdocs.mjs`

## E. Workflow yang disarankan (setiap ada perubahan fitur)
1. Update code.
2. Update `docs/SSOT_FOM_PLAY.md` pada section terkait.
3. Push code.
4. Jalankan sync script ke Google Docs.

## F. Troubleshooting cepat
- `Unauthorized`: secret di script dan local tidak sama.
- `DOC_ID not configured`: script property belum diisi.
- Doc tidak update: cek URL web app deployment yang terbaru.
- Raw URL 404: cek branch/path file SSOT di GitHub.
