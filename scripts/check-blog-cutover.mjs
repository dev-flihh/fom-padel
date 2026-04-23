import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const checks = [
  {
    name: 'Preview homepage exists',
    path: path.join(rootDir, 'public', 'blog-next', 'index.html'),
  },
  {
    name: 'Final homepage exists',
    path: path.join(rootDir, 'public', 'blog', 'index.html'),
  },
  {
    name: 'Preview article exists',
    path: path.join(rootDir, 'public', 'blog-next', 'articles', 'americano-vs-mexicano', 'index.html'),
  },
  {
    name: 'Final article exists',
    path: path.join(rootDir, 'public', 'blog', 'articles', 'americano-vs-mexicano', 'index.html'),
  },
];

async function ensureExists(item) {
  await access(item.path);
  return `${item.name}: OK`;
}

async function ensurePreviewNoindex() {
  const previewIndex = path.join(rootDir, 'public', 'blog-next', 'index.html');
  const html = await readFile(previewIndex, 'utf8');
  if (!html.includes('name="robots" content="noindex, nofollow, noarchive"')) {
    throw new Error('Preview homepage is missing noindex meta tag');
  }
  return 'Preview noindex meta: OK';
}

async function ensureSitemapContainsBlog() {
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  const sitemap = await readFile(sitemapPath, 'utf8');
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  const requiredEntries = [
    'https://fomplay.asia/',
    'https://fomplay.asia/blog/articles/americano-vs-mexicano/',
    'https://fomplay.asia/blog/articles/cara-mulai-turnamen-padel/',
    'https://fomplay.asia/blog/articles/kenapa-live-scoring-padel-penting/',
    'https://fomplay.asia/blog/articles/ranking-mmr-fom-play/',
    'https://fomplay.asia/blog/articles/klasemen-otomatis-padel/',
  ];

  for (const entry of requiredEntries) {
    if (!locs.includes(entry)) {
      throw new Error(`Sitemap is missing ${entry}`);
    }
  }

  return 'Sitemap blog entries: OK';
}

async function ensureFirebaseRedirectsExist() {
  const firebasePath = path.join(rootDir, 'firebase.json');
  const config = JSON.parse(await readFile(firebasePath, 'utf8'));
  const redirects = config?.hosting?.redirects || [];
  const rewrites = config?.hosting?.rewrites || [];
  const hasPreview = redirects.some(
    (redirect) => redirect?.source === '/blog-next' && redirect?.destination === '/blog-next/index.html',
  );
  const appShellSources = [
    '/app',
    '/app/**',
    '/archive',
    '/archive/**',
    '/fitur',
    '/format/americano',
    '/format/mexicano',
    '/format/match-play',
    '/edukasi/perbedaan-americano-vs-mexicano',
    '/ranking',
    '/faq',
  ];
  const hasAppShellRewrites = appShellSources.every((source) =>
    rewrites.some(
      (rewrite) => rewrite?.source === source && rewrite?.destination === '/archive.html',
    ),
  );

  if (!hasPreview || !hasAppShellRewrites) {
    throw new Error('Firebase routing for /blog-next, /app, or public marketing routes is missing');
  }

  return 'Firebase blog routing: OK';
}

async function run() {
  const results = [];

  for (const item of checks) {
    results.push(await ensureExists(item));
  }

  results.push(await ensurePreviewNoindex());
  results.push(await ensureSitemapContainsBlog());
  results.push(await ensureFirebaseRedirectsExist());

  for (const line of results) {
    console.log(line);
  }
}

run().catch((error) => {
  console.error('Blog cutover check failed:', error.message);
  process.exitCode = 1;
});
