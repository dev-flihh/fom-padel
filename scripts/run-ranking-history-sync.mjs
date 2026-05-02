#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0996764238';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const AUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/cloudplatformprojects.readonly',
  'https://www.googleapis.com/auth/firebase',
  'openid',
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

if (!process.env.XDG_CONFIG_HOME) {
  process.env.XDG_CONFIG_HOME = path.join(repoRoot, '.firebase-config');
}

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');

const parseArgs = (argv) => {
  const parsed = {
    passthrough: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    parsed.passthrough.push(argv[i]);
  }

  return parsed;
};

const loadRefreshToken = () => {
  const configPath = path.join(process.env.XDG_CONFIG_HOME, 'configstore', 'firebase-tools.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  const refreshToken = parsed?.tokens?.refresh_token;
  if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    throw new Error(`Missing refresh token in ${configPath}`);
  }
  return refreshToken.trim();
};

const loadStoredAccessToken = () => {
  const configPath = path.join(process.env.XDG_CONFIG_HOME, 'configstore', 'firebase-tools.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  const accessToken = parsed?.tokens?.access_token;
  const expiresAt = Number(parsed?.tokens?.expires_at || 0);

  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    return '';
  }

  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= fiveMinutesFromNow) {
    return '';
  }

  return accessToken.trim();
};

const resolveAccessToken = async () => {
  const storedAccessToken = loadStoredAccessToken();
  if (storedAccessToken) return storedAccessToken;

  try {
    const refreshToken = loadRefreshToken();
    const token = await auth.getAccessToken(refreshToken, AUTH_SCOPES);
    const accessToken = token?.access_token;
    if (typeof accessToken === 'string' && accessToken.trim().length > 0) {
      return accessToken.trim();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('credentials are no longer valid')) {
      throw error;
    }
  }

  const token = await auth.getAccessToken(undefined, AUTH_SCOPES);
  const accessToken = token?.access_token;
  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    throw new Error('Failed to resolve Google API access token from Firebase CLI auth.');
  }
  return accessToken.trim();
};

const main = async () => {
  const args = parseArgs(process.argv);
  const accessToken = await resolveAccessToken();

  const backfillScript = path.join(repoRoot, 'scripts', 'backfill-player-stats-ledger.mjs');
  const commandArgs = [
    backfillScript,
    '--token',
    accessToken,
    '--project',
    PROJECT_ID,
    '--database',
    DATABASE_ID,
    '--skip-users-scan',
    '--ended-only',
    ...args.passthrough,
  ];

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });

  process.exit(result.status ?? 1);
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
