#!/usr/bin/env node

// Recovery: match yang nyangkut (selesai di lapangan tapi tidak pernah
// difinalisasi, dan draft aktifnya sudah tertimpa match baru) dipulihkan ke
// history dari salinan sharedMatches/{shareId}. Menulis tournament_details/{id}
// + tournaments/{id} (statsVersion 0) persis seperti finalize di app — Cloud
// Function onTournamentFinalized lalu membangun history_summary + ledger +
// stats otomatis.
//
// Pakai: node scripts/recover-shared-match-to-history.mjs --share <shareId> [--apply]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0996764238';
const PRIMARY_DB = process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const SHARED_DB = process.env.FIRESTORE_SHARED_DATABASE_ID || 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';
const AUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/cloudplatformprojects.readonly',
  'https://www.googleapis.com/auth/firebase',
  'openid',
];

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
if (!process.env.XDG_CONFIG_HOME) {
  process.env.XDG_CONFIG_HOME = path.join(repoRoot, '.firebase-config');
}
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');

const parseArgs = (argv) => {
  const parsed = { shareId: '', apply: false };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--share') { parsed.shareId = String(argv[index + 1] || '').trim(); index += 1; continue; }
    if (argv[index] === '--apply') parsed.apply = true;
  }
  return parsed;
};

const loadRefreshToken = () => {
  const configPath = path.join(process.env.XDG_CONFIG_HOME, 'configstore', 'firebase-tools.json');
  const fallbackPath = path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json');
  const usePath = fs.existsSync(configPath) ? configPath : fallbackPath;
  const parsed = JSON.parse(fs.readFileSync(usePath, 'utf8'));
  const refreshToken = parsed?.tokens?.refresh_token;
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    throw new Error(`Missing refresh token in ${usePath}`);
  }
  return refreshToken.trim();
};

const resolveAccessToken = async () => {
  const token = await auth.getAccessToken(loadRefreshToken(), AUTH_SCOPES);
  const accessToken = token?.access_token;
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Failed to resolve Google API access token from Firebase CLI auth.');
  }
  return accessToken.trim();
};

const baseUrl = (db) => `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${db}/documents`;

const getJson = async (url, token, { allow404 = false } = {}) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  if (response.status === 404 && allow404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

const patchDocument = async ({ url, token, fields }) => {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

const str = (field) => (field && typeof field.stringValue === 'string' ? field.stringValue : '');
const num = (field) => {
  if (!field) return null;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  return null;
};

// Hapus field avatar dari players (paritas dengan stripTournamentPlayerAvatars
// di app — detail history tidak menyimpan avatar).
const stripAvatarFields = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (value.mapValue) {
    const fields = { ...(value.mapValue.fields || {}) };
    delete fields.avatar;
    return { mapValue: { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, stripAvatarFields(v)])) } };
  }
  if (value.arrayValue) {
    return { arrayValue: { values: (value.arrayValue.values || []).map(stripAvatarFields) } };
  }
  return value;
};

const main = async () => {
  const args = parseArgs(process.argv);
  if (!args.shareId) throw new Error('Missing required --share argument.');

  const token = await resolveAccessToken();

  // 1. Salinan match dari sharedMatches (share DB).
  const sharedDoc = await getJson(`${baseUrl(SHARED_DB)}/sharedMatches/${encodeURIComponent(args.shareId)}`, token);
  const sharedFields = sharedDoc?.fields || {};
  const hostUid = str(sharedFields.hostUid);
  const tournamentFields = sharedFields.tournament?.mapValue?.fields;
  if (!hostUid || !tournamentFields) throw new Error('sharedMatches doc missing hostUid/tournament.');

  const tournamentId = str(tournamentFields.id);
  const name = str(tournamentFields.name);
  const rounds = tournamentFields.rounds?.arrayValue?.values || [];
  const players = tournamentFields.players?.arrayValue?.values || [];
  if (!tournamentId) throw new Error('tournament.id missing in shared copy.');

  const allRoundsCompleted = rounds.length > 0 && rounds.every((round) => {
    const matches = round?.mapValue?.fields?.matches?.arrayValue?.values || [];
    return matches.length > 0 && matches.every((match) => str(match?.mapValue?.fields?.status) === 'completed');
  });

  const alreadyEndedAt = num(tournamentFields.endedAt);
  const updatedAtIso = str(sharedFields.updatedAt) || sharedFields.updatedAt?.timestampValue || '';
  const endedAt = alreadyEndedAt || (updatedAtIso ? Date.parse(updatedAtIso) : Date.now());

  // 2. Status akun host: apakah draft aktif masih match ini?
  const userDoc = await getJson(`${baseUrl(PRIMARY_DB)}/users/${encodeURIComponent(hostUid)}`, token, { allow404: true });
  const activeTournamentId = str(userDoc?.fields?.activeTournament?.mapValue?.fields?.id);
  const draftDoc = await getJson(`${baseUrl(SHARED_DB)}/active_tournament_drafts/${encodeURIComponent(hostUid)}`, token, { allow404: true });
  const draftTournamentId = str(draftDoc?.fields?.tournament?.mapValue?.fields?.id);

  // 3. Apakah sudah ada di history?
  const existingSummary = await getJson(`${baseUrl(PRIMARY_DB)}/tournaments/${encodeURIComponent(tournamentId)}`, token, { allow404: true });
  const existingHistoryRow = await getJson(
    `${baseUrl(PRIMARY_DB)}/users/${encodeURIComponent(hostUid)}/history_summary/${encodeURIComponent(tournamentId)}`,
    token,
    { allow404: true }
  );

  const report = {
    shareId: args.shareId,
    tournamentId,
    name,
    hostUid,
    rounds: rounds.length,
    players: players.length,
    allRoundsCompleted,
    endedAtToUse: new Date(endedAt).toISOString(),
    activeTournamentIdOnUserDoc: activeTournamentId || '(none)',
    activeDraftTournamentId: draftTournamentId || '(none)',
    stuckMatchStillActiveDraft: activeTournamentId === tournamentId || draftTournamentId === tournamentId,
    existingTournamentsDoc: Boolean(existingSummary),
    existingHistorySummaryRow: Boolean(existingHistoryRow),
    apply: args.apply,
  };
  console.log(JSON.stringify(report, null, 2));

  if (existingHistoryRow) {
    console.log('Sudah ada di history_summary — tidak ada yang perlu dipulihkan.');
    return;
  }
  if (!allRoundsCompleted) throw new Error('Belum semua ronde completed — tidak aman dipulihkan otomatis.');
  if (!args.apply) {
    console.log('Dry run. Jalankan ulang dengan --apply untuk menulis dokumen history.');
    return;
  }

  const nowIso = new Date().toISOString();
  const detailFields = {
    ...Object.fromEntries(Object.entries(tournamentFields).map(([k, v]) => [k, stripAvatarFields(v)])),
    id: { stringValue: tournamentId },
    userId: { stringValue: hostUid },
    endedAt: { integerValue: String(endedAt) },
    numRounds: { integerValue: String(rounds.length) },
    numPlayers: { integerValue: String(players.length) },
    statsVersion: { integerValue: '0' },
    date: { timestampValue: new Date(endedAt).toISOString() },
    updatedAt: { timestampValue: nowIso },
    recoveredFromSharedMatchAt: { timestampValue: nowIso },
  };

  const copyIf = (key) => (tournamentFields[key] !== undefined ? { [key]: tournamentFields[key] } : {});
  const summaryFields = {
    id: { stringValue: tournamentId },
    userId: { stringValue: hostUid },
    name: { stringValue: name },
    ...copyIf('format'),
    ...copyIf('partnerMode'),
    ...copyIf('backgroundId'),
    ...copyIf('themeColorId'),
    ...copyIf('toxicModeEnabled'),
    ...copyIf('toxicIntensity'),
    ...copyIf('criteria'),
    ...copyIf('scoringType'),
    ...copyIf('startedAt'),
    endedAt: { integerValue: String(endedAt) },
    ...copyIf('courts'),
    ...copyIf('totalPoints'),
    numRounds: { integerValue: String(rounds.length) },
    numPlayers: { integerValue: String(players.length) },
    ...copyIf('venueName'),
    ...copyIf('location'),
    statsVersion: { integerValue: '0' },
    hasDetail: { booleanValue: true },
    detailCollection: { stringValue: 'tournament_details' },
    date: { timestampValue: nowIso },
    recoveredFromSharedMatchAt: { timestampValue: nowIso },
  };

  await patchDocument({ url: `${baseUrl(PRIMARY_DB)}/tournament_details/${encodeURIComponent(tournamentId)}`, token, fields: detailFields });
  console.log(`Wrote tournament_details/${tournamentId}`);
  await patchDocument({ url: `${baseUrl(PRIMARY_DB)}/tournaments/${encodeURIComponent(tournamentId)}`, token, fields: summaryFields });
  console.log(`Wrote tournaments/${tournamentId} (statsVersion 0 → Cloud Function akan membangun history_summary + ledger + stats).`);

  // Tandai share page sebagai Ended juga.
  try {
    const shareUrlWithMask = `${baseUrl(SHARED_DB)}/sharedMatches/${encodeURIComponent(args.shareId)}?updateMask.fieldPaths=tournament.endedAt`;
    await patchDocument({
      url: shareUrlWithMask,
      token,
      fields: { tournament: { mapValue: { fields: { endedAt: { integerValue: String(endedAt) } } } } },
    });
    console.log('Updated sharedMatches tournament.endedAt (share page tampil Ended).');
  } catch (err) {
    console.warn('Share endedAt update failed (non-fatal):', err instanceof Error ? err.message : err);
  }

  console.log(`Recovered "${name}" (${tournamentId}) into history for uid ${hostUid}.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
