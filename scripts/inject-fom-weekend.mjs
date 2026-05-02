#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'gen-lang-client-0996764238';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const HOST_UID = '2qLcKN5Bj4eRnIuvP2URrruhp7g2';
const TOURNAMENT_ID = 'tm_fom_weekend_20260425';
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
  const parsed = { apply: false, force: false, rollback: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') parsed.apply = true;
    if (arg === '--force') parsed.force = true;
    if (arg === '--rollback') parsed.rollback = true;
  }
  return parsed;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
};

const getDocument = async ({ baseUrl, documentPath, token }) => {
  const response = await fetch(`${baseUrl}/documents/${documentPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
};

const patchDocumentPath = async ({ baseUrl, documentPath, token, fields, merge = false }) => {
  const updateMask = merge
    ? Object.keys(fields)
      .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
      .join('&')
    : '';
  const url = `${baseUrl}/documents/${documentPath}${updateMask ? `?${updateMask}` : ''}`;
  return requestJson(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
};

const deleteDocumentPath = async ({ baseUrl, documentPath, token }) => {
  const response = await fetch(`${baseUrl}/documents/${documentPath}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return;
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
};

const listCollectionDocuments = async ({
  baseUrl,
  collectionId,
  token,
  pageSize = 500,
}) => {
  const documents = [];
  let pageToken = '';
  do {
    const url = new URL(`${baseUrl}/documents/${collectionId}`);
    url.searchParams.set('pageSize', String(pageSize));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await requestJson(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return documents;
};

const getInitials = (name) => (
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

const makeStats = () => ({
  matches: 0,
  won: 0,
  lost: 0,
  draw: 0,
  diff: 0,
});

const toFirestoreFieldValue = (value) => {
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreFieldValue(item)) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, toFirestoreFieldValue(nestedValue)])
        ),
      },
    };
  }
  return { nullValue: null };
};

const toFirestoreFields = (value) => Object.fromEntries(
  Object.entries(value).map(([key, nestedValue]) => [key, toFirestoreFieldValue(nestedValue)])
);

const player = (id, name, source = 'fom') => ({
  id,
  name,
  rating: 0,
  source,
  initials: getInitials(name),
  stats: makeStats(),
});

const manualPlayer = (id, name) => player(id, name, 'manual');

const PLAYERS = {
  falih: player('2qLcKN5Bj4eRnIuvP2URrruhp7g2', 'Falih'),
  geraldi: player('x7pROYCaOZTxbUUKZHWLArwNEss2', 'Geraldi alazzami'),
  singgih: player('jjQTL5wKDMV2onUFZCQnc0TugsE3', 'Singgih Berlan'),
  ilham: player('A9IJ5h86IiS7tcjELEXagxh0rdb2', 'ilham syah'),
  hanky: manualPlayer('manual.hanky.fom.weekend', 'Hanky'),
  angga: player('PSfgqOnEnidLZDOEU0MIi2q6aN63', 'anggahardy putra'),
  jjalty: player('3w0WQ8pFptcsUNHYO9tiwhkGilz2', 'Jjalty Lab'),
  wildan: player('BIyqXFYl6sQbZ2V8sODgGTjAhHZ2', 'Wildan Khawarizmii'),
  febrian: player('o7lSGEsuuIUTOFAfboSl2IV3K8h2', 'Febrian Yudhosatrio'),
  aditya: player('YzreoYAl7TaZPH2QYIFE8UTrCel2', 'Aditya Avif Chan'),
  daffa: player('jAVUa7NmL8U4VNxp6MQrUT1ZQS93', 'Daffa Ulil'),
};

const clonePlayer = (entry) => JSON.parse(JSON.stringify(entry));

const team = (score, members) => ({
  score,
  players: members.map(clonePlayer),
});

const match = (roundId, court, teamAPlayers, scoreA, teamBPlayers, scoreB) => ({
  id: `r${roundId}-m${court}`,
  court,
  teamA: team(scoreA, teamAPlayers),
  teamB: team(scoreB, teamBPlayers),
  status: 'completed',
  roundId,
});

const round = (roundId, matches, playersBye) => ({
  id: roundId,
  matches,
  playersBye: playersBye.map(clonePlayer),
});

const startedAt = Date.parse('2026-04-25T20:00:00+07:00');
const endedAt = Date.parse('2026-04-25T20:29:30+07:00');
const matchDate = new Date('2026-04-25T20:29:30+07:00');

const tournamentPlayers = [
  PLAYERS.falih,
  PLAYERS.geraldi,
  PLAYERS.singgih,
  PLAYERS.ilham,
  PLAYERS.hanky,
  PLAYERS.angga,
  PLAYERS.jjalty,
  PLAYERS.wildan,
  PLAYERS.febrian,
  PLAYERS.aditya,
  PLAYERS.daffa,
].map(clonePlayer);

const rounds = [
  round(1, [
    match(1, 1, [PLAYERS.falih, PLAYERS.geraldi], 10, [PLAYERS.singgih, PLAYERS.ilham], 11),
    match(1, 2, [PLAYERS.hanky, PLAYERS.angga], 7, [PLAYERS.jjalty, PLAYERS.wildan], 14),
  ], [PLAYERS.febrian, PLAYERS.aditya, PLAYERS.daffa]),
  round(2, [
    match(2, 1, [PLAYERS.geraldi, PLAYERS.singgih], 5, [PLAYERS.wildan, PLAYERS.ilham], 16),
    match(2, 2, [PLAYERS.aditya, PLAYERS.jjalty], 6, [PLAYERS.febrian, PLAYERS.daffa], 15),
  ], [PLAYERS.falih, PLAYERS.hanky, PLAYERS.angga]),
  round(3, [
    match(3, 1, [PLAYERS.angga, PLAYERS.daffa], 6, [PLAYERS.falih, PLAYERS.febrian], 15),
    match(3, 2, [PLAYERS.ilham, PLAYERS.hanky], 13, [PLAYERS.wildan, PLAYERS.aditya], 8),
  ], [PLAYERS.geraldi, PLAYERS.singgih, PLAYERS.jjalty]),
  round(4, [
    match(4, 1, [PLAYERS.febrian, PLAYERS.hanky], 11, [PLAYERS.falih, PLAYERS.daffa], 10),
    match(4, 2, [PLAYERS.jjalty, PLAYERS.geraldi], 16, [PLAYERS.singgih, PLAYERS.aditya], 5),
  ], [PLAYERS.angga, PLAYERS.ilham, PLAYERS.wildan]),
  round(5, [
    match(5, 1, [PLAYERS.angga, PLAYERS.ilham], 7, [PLAYERS.febrian, PLAYERS.wildan], 14),
    match(5, 2, [PLAYERS.jjalty, PLAYERS.falih], 13, [PLAYERS.hanky, PLAYERS.geraldi], 8),
  ], [PLAYERS.daffa, PLAYERS.singgih, PLAYERS.aditya]),
  round(6, [
    match(6, 1, [PLAYERS.aditya, PLAYERS.angga], 12, [PLAYERS.daffa, PLAYERS.singgih], 9),
    match(6, 2, [PLAYERS.ilham, PLAYERS.febrian], 10, [PLAYERS.wildan, PLAYERS.jjalty], 11),
  ], [PLAYERS.falih, PLAYERS.hanky, PLAYERS.geraldi]),
  round(7, [
    match(7, 1, [PLAYERS.geraldi, PLAYERS.daffa], 6, [PLAYERS.falih, PLAYERS.hanky], 15),
    match(7, 2, [PLAYERS.angga, PLAYERS.singgih], 13, [PLAYERS.febrian, PLAYERS.aditya], 8),
  ], [PLAYERS.wildan, PLAYERS.jjalty, PLAYERS.ilham]),
  round(8, [
    match(8, 1, [PLAYERS.jjalty, PLAYERS.ilham], 8, [PLAYERS.wildan, PLAYERS.falih], 13),
    match(8, 2, [PLAYERS.angga, PLAYERS.daffa], 8, [PLAYERS.hanky, PLAYERS.singgih], 13),
  ], [PLAYERS.geraldi, PLAYERS.aditya, PLAYERS.febrian]),
  round(9, [
    match(9, 1, [PLAYERS.wildan, PLAYERS.geraldi], 12, [PLAYERS.falih, PLAYERS.aditya], 9),
    match(9, 2, [PLAYERS.hanky, PLAYERS.ilham], 9, [PLAYERS.jjalty, PLAYERS.febrian], 12),
  ], [PLAYERS.singgih, PLAYERS.angga, PLAYERS.daffa]),
  round(10, [
    match(10, 1, [PLAYERS.angga, PLAYERS.geraldi], 9, [PLAYERS.singgih, PLAYERS.ilham], 12),
    match(10, 2, [PLAYERS.falih, PLAYERS.aditya], 9, [PLAYERS.jjalty, PLAYERS.febrian], 12),
  ], [PLAYERS.wildan, PLAYERS.hanky, PLAYERS.daffa]),
  round(11, [
    match(11, 1, [PLAYERS.aditya, PLAYERS.singgih], 6, [PLAYERS.daffa, PLAYERS.hanky], 15),
    match(11, 2, [PLAYERS.geraldi, PLAYERS.febrian], 9, [PLAYERS.angga, PLAYERS.wildan], 12),
  ], [PLAYERS.jjalty, PLAYERS.falih, PLAYERS.ilham]),
  round(12, [
    match(12, 1, [PLAYERS.hanky, PLAYERS.aditya], 8, [PLAYERS.jjalty, PLAYERS.daffa], 13),
    match(12, 2, [PLAYERS.ilham, PLAYERS.singgih], 9, [PLAYERS.falih, PLAYERS.angga], 12),
  ], [PLAYERS.geraldi, PLAYERS.wildan, PLAYERS.febrian]),
];

const detailPayload = {
  id: TOURNAMENT_ID,
  userId: HOST_UID,
  name: 'FOM WEEKEND',
  format: 'Mexicano',
  criteria: 'Points Won',
  startedAt,
  endedAt,
  date: matchDate,
  courts: 2,
  totalPoints: 21,
  players: tournamentPlayers,
  rounds,
  numRounds: 12,
  numPlayers: 11,
  venueName: 'Star Padel',
  location: 'Tangerang',
  courtChanges: [],
  statsVersion: 0,
  hasDetail: true,
  detailCollection: 'tournament_details',
  updatedAt: new Date(),
};

const summaryPayload = {
  id: TOURNAMENT_ID,
  userId: HOST_UID,
  name: 'FOM WEEKEND',
  format: 'Mexicano',
  criteria: 'Points Won',
  startedAt,
  endedAt,
  date: matchDate,
  courts: 2,
  totalPoints: 21,
  numRounds: 12,
  numPlayers: 11,
  venueName: 'Star Padel',
  location: 'Tangerang',
  statsVersion: 0,
  hasDetail: true,
  detailCollection: 'tournament_details',
  rounds,
  players: tournamentPlayers,
  courtChanges: [],
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

const getDocumentPath = (docName = '') => {
  const marker = '/documents/';
  const markerIndex = docName.indexOf(marker);
  return markerIndex >= 0 ? docName.slice(markerIndex + marker.length) : docName;
};

const rollbackTournament = async ({ baseUrl, token }) => {
  const ledgerDocs = await listCollectionDocuments({
    baseUrl,
    collectionId: 'player_match_ledger',
    token,
  });
  const targetLedgerDocs = ledgerDocs.filter((doc) => fieldString(doc?.fields?.tournamentId) === TOURNAMENT_ID);
  const aggregateByUid = new Map();

  for (const doc of targetLedgerDocs) {
    const fields = doc.fields || {};
    const uid = fieldString(fields.uid);
    if (!uid) continue;
    const existing = aggregateByUid.get(uid) || {
      uid,
      matches: 0,
      wins: 0,
      losses: 0,
      mmrDelta: 0,
    };
    existing.matches += 1;
    if (fieldString(fields.result) === 'win') existing.wins += 1;
    if (fieldString(fields.result) === 'loss') existing.losses += 1;
    existing.mmrDelta += fieldNumber(fields.deltaMmr) || 0;
    aggregateByUid.set(uid, existing);
  }

  for (const aggregate of aggregateByUid.values()) {
    const statDoc = await getDocument({
      baseUrl,
      documentPath: `player_stats/${aggregate.uid}`,
      token,
    });
    const fields = statDoc?.fields || {};
    const nextMmr = Math.max(0, (fieldNumber(fields.mmr) || 0) - aggregate.mmrDelta);
    const nextTotalMatches = Math.max(0, (fieldNumber(fields.totalMatches) || 0) - aggregate.matches);
    const nextWins = Math.max(0, (fieldNumber(fields.wins) || 0) - aggregate.wins);
    const nextLosses = Math.max(0, (fieldNumber(fields.losses) || 0) - aggregate.losses);
    const docPath = `player_stats/${aggregate.uid}`;

    if (nextTotalMatches === 0 && aggregate.uid.includes('manual.')) {
      await deleteDocumentPath({ baseUrl, documentPath: docPath, token });
      continue;
    }

    await patchDocumentPath({
      baseUrl,
      documentPath: docPath,
      token,
      fields: toFirestoreFields({
        mmr: nextMmr,
        totalMatches: nextTotalMatches,
        wins: nextWins,
        losses: nextLosses,
        updatedAt: new Date(),
      }),
      merge: true,
    });
  }

  const historyUids = tournamentPlayers
    .map((entry) => entry.id)
    .filter((uid) => !uid.includes('manual.'));

  for (const uid of historyUids) {
    await deleteDocumentPath({
      baseUrl,
      documentPath: `users/${uid}/history_summary/${TOURNAMENT_ID}`,
      token,
    });
  }

  for (const doc of targetLedgerDocs) {
    await deleteDocumentPath({
      baseUrl,
      documentPath: getDocumentPath(doc.name),
      token,
    });
  }

  await deleteDocumentPath({
    baseUrl,
    documentPath: `tournament_stat_runs/${TOURNAMENT_ID}`,
    token,
  });
  await deleteDocumentPath({
    baseUrl,
    documentPath: `tournaments/${TOURNAMENT_ID}`,
    token,
  });
  await deleteDocumentPath({
    baseUrl,
    documentPath: `tournament_details/${TOURNAMENT_ID}`,
    token,
  });

  return {
    affectedPlayers: Array.from(aggregateByUid.values()),
    deletedLedgerDocs: targetLedgerDocs.length,
  };
};

const main = async () => {
  const args = parseArgs(process.argv);
  const token = await resolveAccessToken();
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;

  console.log(JSON.stringify({
    project: PROJECT_ID,
    database: DATABASE_ID,
    tournamentId: TOURNAMENT_ID,
    hostUid: HOST_UID,
    apply: args.apply,
    force: args.force,
    rollback: args.rollback,
    date: matchDate.toISOString(),
    players: tournamentPlayers.map((entry) => ({ id: entry.id, name: entry.name, source: entry.source })),
  }, null, 2));

  if (args.rollback) {
    const rollbackResult = await rollbackTournament({ baseUrl, token });
    console.log(JSON.stringify({
      rolledBack: true,
      tournamentId: TOURNAMENT_ID,
      deletedLedgerDocs: rollbackResult.deletedLedgerDocs,
      affectedPlayers: rollbackResult.affectedPlayers,
    }, null, 2));
    return;
  }

  const existingTournament = await getDocument({
    baseUrl,
    documentPath: `tournaments/${TOURNAMENT_ID}`,
    token,
  });
  if (existingTournament && !args.force) {
    throw new Error(`Tournament ${TOURNAMENT_ID} already exists. Use --force only if you intend to overwrite it.`);
  }

  if (!args.apply) {
    console.log('Dry run only. Re-run with --apply to write Firestore.');
    return;
  }

  await patchDocumentPath({
    baseUrl,
    documentPath: `tournament_details/${TOURNAMENT_ID}`,
    token,
    fields: toFirestoreFields(detailPayload),
    merge: false,
  });
  await patchDocumentPath({
    baseUrl,
    documentPath: `tournaments/${TOURNAMENT_ID}`,
    token,
    fields: toFirestoreFields(summaryPayload),
    merge: false,
  });

  console.log('Tournament payload written. Waiting for stats trigger...');

  let statsVersion = 0;
  let hasRunDoc = false;
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    await sleep(2500);
    const [tournamentDoc, runDoc] = await Promise.all([
      getDocument({ baseUrl, documentPath: `tournaments/${TOURNAMENT_ID}`, token }),
      getDocument({ baseUrl, documentPath: `tournament_stat_runs/${TOURNAMENT_ID}`, token }),
    ]);
    statsVersion = fieldNumber(tournamentDoc?.fields?.statsVersion) || 0;
    hasRunDoc = Boolean(runDoc);
    console.log(`Poll ${attempt}: statsVersion=${statsVersion}, runDoc=${hasRunDoc}`);
    if (statsVersion >= 1 && hasRunDoc) break;
  }

  const watchedUids = [
    PLAYERS.falih.id,
    PLAYERS.jjalty.id,
    PLAYERS.wildan.id,
    PLAYERS.daffa.id,
    PLAYERS.aditya.id,
  ];
  const watchedStats = await Promise.all(
    watchedUids.map(async (uid) => {
      const doc = await getDocument({ baseUrl, documentPath: `player_stats/${uid}`, token });
      const fields = doc?.fields || {};
      return {
        uid,
        displayName: fieldString(fields.displayName),
        mmr: fieldNumber(fields.mmr),
        totalMatches: fieldNumber(fields.totalMatches),
        wins: fieldNumber(fields.wins),
        losses: fieldNumber(fields.losses),
        lastTournamentId: fieldString(fields.lastTournamentId),
      };
    })
  );

  const leaderboardGlobal = await getDocument({
    baseUrl,
    documentPath: 'leaderboard_snapshots/global',
    token,
  });
  const leaderboardCount = fieldNumber(leaderboardGlobal?.fields?.totalPlayers) || 0;

  console.log(JSON.stringify({
    success: statsVersion >= 1 && hasRunDoc,
    tournamentId: TOURNAMENT_ID,
    statsVersion,
    tournamentStatRun: hasRunDoc,
    leaderboardTotalPlayers: leaderboardCount,
    watchedStats,
  }, null, 2));
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
