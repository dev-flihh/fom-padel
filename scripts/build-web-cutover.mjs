#!/usr/bin/env node
/*
 * Bangun direktori deploy GABUNGAN untuk hosting fomplay.asia:
 *   - Website marketing (Astro, folder website/) di root + turunannya (/features, /id, /blog, ...)
 *   - Aplikasi FOM (SPA) tetap di /app  (rewrite /app -> /archive.html, lihat firebase.cutover.json)
 *
 * Pakai:
 *   npm run build                 # build APP dulu (menghasilkan dist/ + archive.html app shell)
 *   npm --prefix website run build# build WEBSITE (menghasilkan website/dist/)
 *   node scripts/build-web-cutover.mjs
 *   firebase deploy --only hosting --config firebase.cutover.json --project <id>
 *
 * Hasil merge ada di folder deploy/.
 */
import { rm, cp, stat, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const appDist = path.join(root, 'dist');
const webDist = path.join(root, 'website', 'dist');
const out = path.join(root, 'deploy');

const exists = async (p) => access(p).then(() => true).catch(() => false);

if (!(await exists(path.join(appDist, 'archive.html')))) {
  console.error('✗ dist/archive.html tidak ada. Jalankan `npm run build` (build app) dulu.');
  process.exit(1);
}
if (!(await exists(path.join(webDist, 'index.html')))) {
  console.error('✗ website/dist tidak ada. Jalankan `npm --prefix website run build` dulu.');
  process.exit(1);
}

// 1) Basis = build app (punya /app shell + assets + service worker).
await rm(out, { recursive: true, force: true });
await cp(appDist, out, { recursive: true });

// 2) Buang aset lama yang digantikan website.
for (const p of ['blog', 'sitemap.xml', 'robots.txt']) {
  await rm(path.join(out, p), { recursive: true, force: true });
}

// 3) Overlay website (root + turunan) menimpa landing lama.
await cp(webDist, out, { recursive: true });

// 4) KRITIS: buang stub /app dari website supaya rewrite /app -> archive.html jalan.
//    Juga stub redirect Astro (firebase 301 yang menangani).
for (const p of ['app', 'fitur', 'format', 'edukasi']) {
  await rm(path.join(out, p), { recursive: true, force: true });
}

// 5) Sanity check.
const mustHave = ['archive.html', 'index.html', 'blog-index.json', 'assets', 'sw.js'];
for (const p of mustHave) {
  if (!(await exists(path.join(out, p)))) {
    console.error(`✗ deploy/${p} hilang setelah merge.`);
    process.exit(1);
  }
}
if (await exists(path.join(out, 'app'))) {
  console.error('✗ deploy/app masih ada — /app bakal ke stub, bukan aplikasi. Batalkan deploy.');
  process.exit(1);
}
const { size } = await stat(path.join(out, 'index.html'));
console.log(`✓ deploy/ siap. root index.html ${size}B, archive.html (app shell) OK, /app stub bersih.`);
console.log('  Lanjut: firebase deploy --only hosting --config firebase.cutover.json --project <id>');
