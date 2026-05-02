#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
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
    uid: '',
    apply: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--uid') {
      parsed.uid = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--apply') {
      parsed.apply = true;
    }
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

const resolveAccessToken = async () => {
  const refreshToken = loadRefreshToken();
  const token = await auth.getAccessToken(refreshToken, AUTH_SCOPES);
  const accessToken = token?.access_token;
  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    throw new Error('Failed to resolve Google API access token from Firebase CLI auth.');
  }
  return accessToken.trim();
};

const getJson = async (url, token) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return JSON.parse(text);
};

const patchDocument = async ({ url, token, fields }) => {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return JSON.parse(text);
};

const fieldNumber = (field) => {
  if (!field) return null;
  if (field.integerValue !== undefined) {
    const value = Number(field.integerValue);
    return Number.isFinite(value) ? value : null;
  }
  if (field.doubleValue !== undefined) {
    const value = Number(field.doubleValue);
    return Number.isFinite(value) ? value : null;
  }
  return null;
};

const fieldString = (field) => {
  if (!field) return '';
  return typeof field.stringValue === 'string' ? field.stringValue : '';
};

const main = async () => {
  const args = parseArgs(process.argv);
  if (!args.uid) {
    throw new Error('Missing required --uid argument.');
  }

  const token = await resolveAccessToken();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;
  const userDoc = await getJson(`${baseUrl}/documents/users/${encodeURIComponent(args.uid)}`, token);
  const userFields = userDoc?.fields || {};
  const activeTournamentFields = userFields?.activeTournament?.mapValue?.fields || null;

  if (!activeTournamentFields) {
    throw new Error(`User ${args.uid} has no activeTournament payload.`);
  }

  const tournamentId = fieldString(activeTournamentFields.id);
  const tournamentName = fieldString(activeTournamentFields.name);
  const endedAt = fieldNumber(activeTournamentFields.endedAt);
  if (!tournamentId) {
    throw new Error('activeTournament.id is missing.');
  }
  if (!endedAt) {
    throw new Error(`Tournament ${tournamentId} is not finalized yet (missing endedAt).`);
  }

  const tournamentDocUrl = `${baseUrl}/documents/tournaments/${encodeURIComponent(tournamentId)}`;
  let existingTournament = null;
  try {
    existingTournament = await getJson(tournamentDocUrl, token);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('HTTP 404')) {
      throw error;
    }
  }

  const payloadFields = {
    ...activeTournamentFields,
    userId: { stringValue: args.uid },
    statsVersion: { integerValue: '0' },
    date: { timestampValue: new Date(endedAt).toISOString() },
    recoveredFromActiveTournamentAt: { timestampValue: new Date().toISOString() },
  };

  const summary = {
    uid: args.uid,
    tournamentId,
    tournamentName,
    startedAt: fieldNumber(activeTournamentFields.startedAt),
    endedAt,
    rounds: activeTournamentFields.rounds?.arrayValue?.values?.length || 0,
    players: activeTournamentFields.players?.arrayValue?.values?.length || 0,
    existingTournamentDoc: Boolean(existingTournament),
    apply: args.apply,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!args.apply) {
    console.log('Dry run only. Re-run with --apply to write the tournament document.');
    return;
  }

  await patchDocument({
    url: tournamentDocUrl,
    token,
    fields: payloadFields,
  });

  console.log(`Recovered tournament ${tournamentId} (${tournamentName || 'Untitled'}) into tournaments/${tournamentId}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
