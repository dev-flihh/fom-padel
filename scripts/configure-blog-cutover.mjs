import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const firebaseConfigPath = path.join(rootDir, 'firebase.json');
const mode = process.argv[2] || 'off';

const rootRedirect301 = {
  source: '/',
  destination: '/blog/',
  type: 301,
};

const rootRedirect302 = {
  source: '/',
  destination: '/blog/',
  type: 302,
};

async function configureCutover() {
  const raw = await readFile(firebaseConfigPath, 'utf8');
  const config = JSON.parse(raw);
  const hosting = config.hosting || {};
  const redirects = Array.isArray(hosting.redirects) ? hosting.redirects : [];

  const redirectsWithoutRootCutover = redirects.filter(
    (redirect) => !(redirect?.source === '/' && redirect?.destination === '/blog/'),
  );

  let nextRedirects = redirectsWithoutRootCutover;

  if (mode === 'on') {
    nextRedirects = [rootRedirect302, ...redirectsWithoutRootCutover];
  } else if (mode === 'permanent') {
    nextRedirects = [rootRedirect301, ...redirectsWithoutRootCutover];
  } else if (mode !== 'off') {
    throw new Error(`Unsupported mode: ${mode}. Use on, permanent, or off.`);
  }

  config.hosting = {
    ...hosting,
    redirects: nextRedirects,
  };

  await writeFile(firebaseConfigPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Updated Firebase blog cutover mode: ${mode}`);
}

configureCutover().catch((error) => {
  console.error('Failed to configure blog cutover:', error);
  process.exitCode = 1;
});
