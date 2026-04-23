## FOM Blog Workspace

Folder ini menyimpan source statis untuk FOM Blog agar tetap terpisah dari aplikasi utama FOM Play di `src/`.

Struktur:

- `site/` source yang ingin dipublish ke `/blog`
- `site/assets/` asset khusus blog
- `reference/` file referensi desain yang tidak ikut dipublish

Workflow:

1. Edit file blog di `fom-blog/site/`
2. Untuk preview cepat, jalankan `npm run blog:prepare:preview`
3. Hasil preview akan tersalin ke `public/blog-next/` dan otomatis diberi `noindex`
4. Jika sudah stabil, jalankan `npm run blog:prepare:final`
5. Hasil final akan tersalin ke `public/blog/`
6. Saat siap mengganti landing lama, jalankan `npm run blog:prepare:cutover-soft`
7. Jika sudah aman, jalankan `npm run blog:prepare:cutover-permanent`
8. Jika perlu rollback cepat, jalankan `npm run blog:prepare:rollback`
9. Jika ingin sekalian menyiapkan fase deploy, gunakan `npm run blog:deploy:*`
10. Jika ingin langsung eksekusi hosting deploy, gunakan `npm run blog:deploy:*:now`
11. Untuk cek status migrasi saat ini, jalankan `npm run blog:status`

Catatan:

- `public/blog-next/` dipakai untuk preview/stabilisasi.
- `public/blog/` dipakai sebagai output final saat blog baru sudah siap menggantikan blog lama.
- `blog:cutover:on` memakai redirect `302` agar aman untuk smoke test di production.
- `blog:cutover:permanent` mengubah redirect root menjadi `301`.
- `blog:status` menampilkan status preview/final site, indexing preview, sitemap, dan mode cutover root.
- script `blog:prepare:*` sudah merangkai sync/check/build supaya operator tinggal menjalankan satu command per fase.
- script `blog:deploy:*` menyiapkan fase terkait lalu menampilkan command deploy hosting final.
- script `blog:deploy:*:now` menyiapkan fase terkait lalu langsung menjalankan deploy hosting.
- Kalau nanti blog punya banyak halaman, tambahkan langsung di `fom-blog/site/` dengan struktur folder yang sama seperti URL yang diinginkan.
