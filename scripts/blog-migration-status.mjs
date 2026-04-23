import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const paths = {
  firebase: path.join(rootDir, 'firebase.json'),
  packageJson: path.join(rootDir, 'package.json'),
  sitemap: path.join(rootDir, 'public', 'sitemap.xml'),
  previewIndex: path.join(rootDir, 'public', 'blog-next', 'index.html'),
  finalIndex: path.join(rootDir, 'public', 'blog', 'index.html'),
};

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getCutoverMode() {
  const packageJson = JSON.parse(await readFile(paths.packageJson, 'utf8'));
  const firebase = JSON.parse(await readFile(paths.firebase, 'utf8'));
  const redirects = firebase?.hosting?.redirects || [];
  const rewrites = firebase?.hosting?.rewrites || [];
  const buildScript = packageJson?.scripts?.build || '';
  const rootRedirect = redirects.find(
    (redirect) => redirect?.source === '/' && redirect?.destination === '/blog/',
  );
  const rootRewrite = rewrites.find(
    (rewrite) => rewrite?.source === '/' && rewrite?.destination === '/blog/index.html',
  );

  if (rootRewrite) return 'root-blog';
  if (rootRedirect?.type === 302) return 'soft';
  if (rootRedirect?.type === 301) return 'permanent';
  if (buildScript.includes('prepare-hosting-entrypoints')) return 'root-static-blog';
  if (!rootRedirect) return 'off';
  return `custom (${rootRedirect.type})`;
}

async function getPreviewIndexingState() {
  if (!(await exists(paths.previewIndex))) return 'missing';
  const html = await readFile(paths.previewIndex, 'utf8');
  return html.includes('name="robots" content="noindex, nofollow, noarchive"')
    ? 'noindex'
    : 'indexable';
}

async function getSitemapState() {
  if (!(await exists(paths.sitemap))) return 'missing';
  const sitemap = await readFile(paths.sitemap, 'utf8');
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  const requiredEntries = [
    'https://fomplay.asia/',
    'https://fomplay.asia/blog/articles/americano-vs-mexicano/',
    'https://fomplay.asia/blog/articles/cara-mulai-turnamen-padel/',
    'https://fomplay.asia/blog/articles/kenapa-live-scoring-padel-penting/',
    'https://fomplay.asia/blog/articles/ranking-mmr-fom-play/',
    'https://fomplay.asia/blog/articles/klasemen-otomatis-padel/',
  ];

  const missing = requiredEntries.filter((entry) => !locs.includes(entry));
  return missing.length === 0 ? 'complete' : `missing ${missing.length} entries`;
}

async function main() {
  const previewExists = await exists(paths.previewIndex);
  const finalExists = await exists(paths.finalIndex);
  const cutoverMode = await getCutoverMode();
  const previewIndexing = await getPreviewIndexingState();
  const sitemapState = await getSitemapState();

  console.log('FOM Blog Migration Status');
  console.log('');
  console.log(`Preview site: ${previewExists ? 'ready' : 'missing'} (/blog-next/)`);
  console.log(`Final site: ${finalExists ? 'ready' : 'missing'} (/blog/)`);
  console.log(`Preview indexing: ${previewIndexing}`);
  console.log(`Sitemap: ${sitemapState}`);
  console.log(`Root cutover mode: ${cutoverMode}`);
  console.log('');
  console.log('Recommended commands');
  console.log('- Preview prep: npm run blog:prepare:preview');
  console.log('- Final prep: npm run blog:prepare:final');
  if (cutoverMode === 'root-static-blog') {
    console.log('- Root is already prepared by npm run build via prepare-hosting-entrypoints');
  } else {
    console.log('- Soft cutover: npm run blog:prepare:cutover-soft');
    console.log('- Permanent cutover: npm run blog:prepare:cutover-permanent');
    console.log('- Rollback: npm run blog:prepare:rollback');
  }
}

main().catch((error) => {
  console.error('Failed to read blog migration status:', error.message);
  process.exitCode = 1;
});
