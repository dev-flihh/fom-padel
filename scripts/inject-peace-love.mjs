#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'gen-lang-client-0996764238';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const HOST_UID = '2qLcKN5Bj4eRnIuvP2URrruhp7g2';
const TOURNAMENT_ID = 'tm_peace_love_20260426';
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
  const parsed = { apply: false, force: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') parsed.apply = true;
    if (arg === '--force') parsed.force = true;
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
  falih: player('2qLcKN5Bj4eRnIuvP2URrruhp7g2', 'Falih Hermon'),
  diva: player('DPMN3aYxy0bVcjIhgPGZlBqdP2u1', 'Diva andzani'),
  jonathan: player('Z4ohGsrxMSdpvXJEVTCa8ceqe8v2', 'Jonathan Edward'),
  shalsa: player('kxUK8Lkikna8hSOVoxf6n8R5gO63', 'Shalsabila Arsya'),
  nova: player('REDBGH4GniU96sxwsrmRRsPaJLj1', 'Nova Liana'),
  sherlly: player('eZ9m0aSY9mfI4gVrM9pEyIvemZ82', 'sherlly mellynda'),
  audra: player('Alc04rtIptUF0wEr7i4TAYtWaRz2', 'Audra nblk'),
  adit: manualPlayer('manual.adit.peace.love', 'Adit'),
};

const clonePlayer = (entry) => JSON.parse(JSON.stringify(entry));

const team = (score, members) => ({
  score,
  players: members.map(clonePlayer),
});

const match = (roundId, teamAPlayers, scoreA, teamBPlayers, scoreB, duration) => ({
  id: `r${roundId}-m1`,
  court: 1,
  teamA: team(scoreA, teamAPlayers),
  teamB: team(scoreB, teamBPlayers),
  status: 'completed',
  roundId,
  duration,
});

const round = (roundId, matchItem, playersBye) => ({
  id: roundId,
  matches: [matchItem],
  playersBye: playersBye.map(clonePlayer),
});

const startedAt = Date.parse('2026-04-26T17:20:00+07:00');
const endedAt = Date.parse('2026-04-26T18:17:42+07:00');
const matchDate = new Date('2026-04-26T18:17:42+07:00');

const tournamentPlayers = [
  PLAYERS.adit,
  PLAYERS.audra,
  PLAYERS.nova,
  PLAYERS.sherlly,
  PLAYERS.falih,
  PLAYERS.diva,
  PLAYERS.jonathan,
  PLAYERS.shalsa,
].map(clonePlayer);

const rounds = [
  round(1, match(1, [PLAYERS.adit, PLAYERS.audra], 13, [PLAYERS.nova, PLAYERS.sherlly], 8, '51:48'), [PLAYERS.falih, PLAYERS.diva, PLAYERS.jonathan, PLAYERS.shalsa]),
  round(2, match(2, [PLAYERS.falih, PLAYERS.diva], 16, [PLAYERS.shalsa, PLAYERS.jonathan], 5, '00:28'), [PLAYERS.audra, PLAYERS.adit, PLAYERS.sherlly, PLAYERS.nova]),
  round(3, match(3, [PLAYERS.audra, PLAYERS.nova], 14, [PLAYERS.diva, PLAYERS.shalsa], 7, '00:25'), [PLAYERS.sherlly, PLAYERS.adit, PLAYERS.jonathan, PLAYERS.falih]),
  round(4, match(4, [PLAYERS.falih, PLAYERS.sherlly], 12, [PLAYERS.adit, PLAYERS.jonathan], 9, '00:37'), [PLAYERS.audra, PLAYERS.diva, PLAYERS.nova, PLAYERS.shalsa]),
  round(5, match(5, [PLAYERS.falih, PLAYERS.audra], 8, [PLAYERS.nova, PLAYERS.diva], 13, '00:22'), [PLAYERS.adit, PLAYERS.sherlly, PLAYERS.jonathan, PLAYERS.shalsa]),
  round(6, match(6, [PLAYERS.adit, PLAYERS.shalsa], 15, [PLAYERS.sherlly, PLAYERS.jonathan], 6, '00:24'), [PLAYERS.falih, PLAYERS.diva, PLAYERS.nova, PLAYERS.audra]),
  round(7, match(7, [PLAYERS.adit, PLAYERS.audra], 6, [PLAYERS.diva, PLAYERS.falih], 15, '00:21'), [PLAYERS.nova, PLAYERS.shalsa, PLAYERS.sherlly, PLAYERS.jonathan]),
  round(8, match(8, [PLAYERS.nova, PLAYERS.jonathan], 14, [PLAYERS.shalsa, PLAYERS.sherlly], 7, '00:22'), [PLAYERS.falih, PLAYERS.diva, PLAYERS.adit, PLAYERS.audra]),
  round(9, match(9, [PLAYERS.falih, PLAYERS.nova], 13, [PLAYERS.adit, PLAYERS.jonathan], 8, '00:25'), [PLAYERS.audra, PLAYERS.shalsa, PLAYERS.diva, PLAYERS.sherlly]),
  round(10, match(10, [PLAYERS.diva, PLAYERS.sherlly], 12, [PLAYERS.audra, PLAYERS.shalsa], 9, '00:17'), [PLAYERS.falih, PLAYERS.nova, PLAYERS.adit, PLAYERS.jonathan]),
  round(11, match(11, [PLAYERS.shalsa, PLAYERS.adit], 14, [PLAYERS.diva, PLAYERS.nova], 7, '00:20'), [PLAYERS.audra, PLAYERS.sherlly, PLAYERS.falih, PLAYERS.jonathan]),
  round(12, match(12, [PLAYERS.falih, PLAYERS.shalsa], 9, [PLAYERS.audra, PLAYERS.sherlly], 12, '00:16'), [PLAYERS.diva, PLAYERS.nova, PLAYERS.adit, PLAYERS.jonathan]),
  round(13, match(13, [PLAYERS.audra, PLAYERS.nova], 9, [PLAYERS.diva, PLAYERS.jonathan], 12, '00:22'), [PLAYERS.adit, PLAYERS.falih, PLAYERS.sherlly, PLAYERS.shalsa]),
  round(14, match(14, [PLAYERS.diva, PLAYERS.jonathan], 13, [PLAYERS.adit, PLAYERS.audra], 8, '00:24'), [PLAYERS.falih, PLAYERS.nova, PLAYERS.sherlly, PLAYERS.shalsa]),
  round(15, match(15, [PLAYERS.falih, PLAYERS.jonathan], 11, [PLAYERS.nova, PLAYERS.adit], 10, '00:16'), [PLAYERS.sherlly, PLAYERS.shalsa, PLAYERS.diva, PLAYERS.audra]),
  round(16, match(16, [PLAYERS.diva, PLAYERS.shalsa], 11, [PLAYERS.falih, PLAYERS.sherlly], 10, '00:17'), [PLAYERS.nova, PLAYERS.jonathan, PLAYERS.adit, PLAYERS.audra]),
  round(17, match(17, [PLAYERS.shalsa, PLAYERS.jonathan], 12, [PLAYERS.nova, PLAYERS.falih], 9, '00:18'), [PLAYERS.adit, PLAYERS.sherlly, PLAYERS.audra, PLAYERS.diva]),
];

const detailPayload = {
  id: TOURNAMENT_ID,
  userId: HOST_UID,
  name: 'PEACE LOVE',
  format: 'Mexicano',
  criteria: 'Points Won',
  startedAt,
  endedAt,
  date: matchDate,
  courts: 1,
  totalPoints: 21,
  players: tournamentPlayers,
  rounds,
  numRounds: 17,
  numPlayers: 8,
  venueName: 'HQ Padel Tennis',
  location: 'Jakarta',
  courtChanges: [],
  statsVersion: 0,
  hasDetail: true,
  detailCollection: 'tournament_details',
  updatedAt: new Date(),
};

const summaryPayload = {
  id: TOURNAMENT_ID,
  userId: HOST_UID,
  name: 'PEACE LOVE',
  format: 'Mexicano',
  criteria: 'Points Won',
  startedAt,
  endedAt,
  date: matchDate,
  courts: 1,
  totalPoints: 21,
  numRounds: 17,
  numPlayers: 8,
  venueName: 'HQ Padel Tennis',
  location: 'Jakarta',
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
    date: matchDate.toISOString(),
    players: tournamentPlayers.map((entry) => ({ id: entry.id, name: entry.name, source: entry.source })),
  }, null, 2));

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
    PLAYERS.diva.id,
    PLAYERS.jonathan.id,
    PLAYERS.shalsa.id,
    PLAYERS.nova.id,
    PLAYERS.sherlly.id,
    PLAYERS.audra.id,
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
  const globalUsers = leaderboardGlobal?.fields?.users?.arrayValue?.values || [];

  console.log(JSON.stringify({
    success: statsVersion >= 1 && hasRunDoc,
    tournamentId: TOURNAMENT_ID,
    statsVersion,
    tournamentStatRun: hasRunDoc,
    leaderboardUsers: globalUsers.length,
    watchedStats,
  }, null, 2));
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
