import { execFileSync } from 'node:child_process';

const DEFAULT_APP_URL = 'https://gen-lang-client-0996764238.web.app/app';
const DEFAULT_EXPECTED_DATABASE = 'fom-play-sg';
const LEGACY_DATABASE = 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';

const parseArgs = (argv) => {
  const parsed = {
    url: DEFAULT_APP_URL,
    expectedDatabase: DEFAULT_EXPECTED_DATABASE,
    legacyDatabase: LEGACY_DATABASE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url') parsed.url = String(argv[index + 1] || parsed.url).trim();
    if (arg === '--expected-db') {
      parsed.expectedDatabase = String(argv[index + 1] || parsed.expectedDatabase).trim();
    }
    if (arg === '--legacy-db') {
      parsed.legacyDatabase = String(argv[index + 1] || parsed.legacyDatabase).trim();
    }
  }

  return parsed;
};

const fetchTextWithCurl = (url, label) => {
  try {
    return execFileSync('curl', ['-fsSL', '-H', 'cache-control: no-cache', url], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : '';
    throw new Error(`${label} failed${stderr ? `: ${stderr}` : ''}`);
  }
};

const resolveAssetUrl = (baseUrl, assetPath) => new URL(assetPath, baseUrl).toString();

const extractScriptPath = (html) => {
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i);
  if (!match) {
    throw new Error('Could not find module script in production HTML');
  }
  return match[1];
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const html = fetchTextWithCurl(args.url, 'App HTML');
  const scriptPath = extractScriptPath(html);
  const assetUrl = resolveAssetUrl(args.url, scriptPath);
  const bundle = fetchTextWithCurl(assetUrl, 'App bundle');

  const hasExpectedDatabase = bundle.includes(args.expectedDatabase);
  const hasLegacyDatabase = bundle.includes(args.legacyDatabase);

  console.log(`App URL: ${args.url}`);
  console.log(`Bundle URL: ${assetUrl}`);
  console.log(`Expected database present: ${hasExpectedDatabase ? 'YES' : 'NO'}`);
  console.log(`Legacy database string present: ${hasLegacyDatabase ? 'YES' : 'NO'}`);

  if (!hasExpectedDatabase) {
    throw new Error(`Expected database "${args.expectedDatabase}" not found in live bundle`);
  }

  console.log('Firestore cutover check: OK');
};

run().catch((error) => {
  console.error('Firestore cutover check failed:', error.message);
  process.exitCode = 1;
});
