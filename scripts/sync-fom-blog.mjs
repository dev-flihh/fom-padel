import {cp, mkdir, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'fom-blog', 'site');
const outputSlug = process.argv[2] || 'blog-next';
const outputDir = path.join(rootDir, 'public', outputSlug);
const isPreviewOutput = outputSlug !== 'blog';

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry);
      const entryStat = await stat(fullPath);

      if (entryStat.isDirectory()) {
        return collectHtmlFiles(fullPath);
      }

      return fullPath.endsWith('.html') ? [fullPath] : [];
    }),
  );

  return files.flat();
}

async function markPreviewAsNoIndex(dir) {
  const htmlFiles = await collectHtmlFiles(dir);

  await Promise.all(
    htmlFiles.map(async (filePath) => {
      const html = await readFile(filePath, 'utf8');
      if (html.includes('name="robots" content="noindex, nofollow, noarchive"')) return;

      const injected = html.replace(
        '</head>',
        '    <meta name="robots" content="noindex, nofollow, noarchive" />\n    <meta name="googlebot" content="noindex, nofollow, noarchive" />\n  </head>',
      );

      await writeFile(filePath, injected);
    }),
  );
}

async function syncBlog() {
  await mkdir(outputDir, {recursive: true});
  await rm(outputDir, {recursive: true, force: true});
  await cp(sourceDir, outputDir, {recursive: true});

  if (isPreviewOutput) {
    await markPreviewAsNoIndex(outputDir);
  }

  console.log(`Synced FOM Blog from ${sourceDir} to ${outputDir}`);
}

syncBlog().catch((error) => {
  console.error('Failed to sync FOM Blog:', error);
  process.exitCode = 1;
});
