import fs from 'node:fs';
import path from 'node:path';

const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL;
const secret = process.env.APPS_SCRIPT_WEBHOOK_SECRET;

if (!webhookUrl) {
  console.error('Missing APPS_SCRIPT_WEBHOOK_URL');
  process.exit(1);
}
if (!secret) {
  console.error('Missing APPS_SCRIPT_WEBHOOK_SECRET');
  process.exit(1);
}

const ssotPath = path.resolve(process.cwd(), 'docs/SSOT_FOM_PLAY.md');
if (!fs.existsSync(ssotPath)) {
  console.error('SSOT file not found:', ssotPath);
  process.exit(1);
}

const markdown = fs.readFileSync(ssotPath, 'utf8');

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret,
    markdown,
    source: 'local-script'
  }),
});

const text = await response.text();
if (!response.ok) {
  console.error('Sync failed:', response.status, text);
  process.exit(1);
}

let payload = null;
try {
  payload = JSON.parse(text);
} catch {
  payload = null;
}

if (payload && (payload.ok === false || (typeof payload.status === 'number' && payload.status >= 400))) {
  console.error('Sync failed:', payload);
  process.exit(1);
}

console.log('Sync success:', text);
