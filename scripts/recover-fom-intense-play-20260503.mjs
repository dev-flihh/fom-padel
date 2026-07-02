#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'gen-lang-client-0996764238';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const HOST_UID = '2qLcKN5Bj4eRnIuvP2URrruhp7g2';
const TOURNAMENT_ID = 'tm_evxzaa7c';
const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

if (!process.env.XDG_CONFIG_HOME) {
  process.env.XDG_CONFIG_HOME = path.join(repoRoot, '.firebase-config');
}

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
  const params = new URLSearchParams({
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: loadRefreshToken(),
    grant_type: 'refresh_token',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params,
  });
  const token = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to refresh Google API access token: ${JSON.stringify(token)}`);
  }
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

const getInitials = (name) => (
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

const stats = ({ won, lost, draw, matches, diff }) => ({ won, lost, draw, matches, diff });

const player = (id, name, source = 'fom', playerStats = stats({ won: 0, lost: 0, draw: 0, matches: 0, diff: 0 })) => ({
  id,
  name,
  source,
  rating: id === HOST_UID ? 630 : 0,
  initials: getInitials(name),
  stats: playerStats,
});

const PLAYERS = {
  andi: player('kCbAuJd1BhehiZ5Exwqi93jeEH43', 'Andi M Rizky', 'fom', stats({ won: 5, lost: 1, draw: 0, matches: 6, diff: 12 })),
  rudi: player('manual_pj96f4yzs', 'Rudi', 'manual', stats({ won: 4, lost: 2, draw: 3, matches: 9, diff: 10 })),
  steve: player('manual_u61xrwppa', 'Steven Kurniajaya', 'manual', stats({ won: 3, lost: 4, draw: 2, matches: 9, diff: -8 })),
  elaw: player('manual_vgony79h0', 'Elaw', 'manual', stats({ won: 3, lost: 3, draw: 3, matches: 9, diff: 2 })),
  raybah: player('manual_zl00hzsnp', 'Raybah', 'manual'),
  tim: player('manual_q38iofsoa', 'Tim', 'manual', stats({ won: 2, lost: 4, draw: 2, matches: 8, diff: -4 })),
  dika: player('manual_2npiz19qr', 'Andika Ramadhani', 'manual', stats({ won: 6, lost: 2, draw: 2, matches: 10, diff: 6 })),
  aldif: player('GUztTgzyZ0d9ktRAQK9AxO5Pa4X2', 'aldif reza', 'fom', stats({ won: 4, lost: 2, draw: 3, matches: 9, diff: 6 })),
  fenza: player('5Jx30rDbBtewS0eInNAwINe8Dsu1', 'Fenza Kamal', 'fom', stats({ won: 3, lost: 4, draw: 0, matches: 7, diff: -6 })),
  dinar: player('GJS3tP6usvVCAq4OohsJZ1W7mJW2', 'dinar alam', 'fom', stats({ won: 4, lost: 3, draw: 3, matches: 10, diff: 2 })),
  farrel: player('smh5UKLA6VMRAIVxEO3qqkNJsmx2', 'Farrel Alvian Purnama', 'fom'),
  dzikri: player('LuDDRR6BVSZiizRknk25CdMOFaq1', 'Muhammad Dzikri', 'fom'),
  falih: player(HOST_UID, 'Falih', 'fom', stats({ won: 4, lost: 3, draw: 3, matches: 10, diff: 4 })),
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

const round = (roundId, matches, playersBye = []) => ({
  id: roundId,
  matches,
  playersBye: playersBye.map(clonePlayer),
});

const startedAt = 1777813908043;
const endedAt = startedAt + (4 * 60 * 60 * 1000) + (38 * 60 * 1000) + (20 * 1000);
const matchDate = new Date(endedAt);

const tournamentPlayers = [
  PLAYERS.andi,
  PLAYERS.rudi,
  PLAYERS.steve,
  PLAYERS.elaw,
  PLAYERS.raybah,
  PLAYERS.tim,
  PLAYERS.dika,
  PLAYERS.aldif,
  PLAYERS.fenza,
  PLAYERS.dinar,
  PLAYERS.farrel,
  PLAYERS.dzikri,
  PLAYERS.falih,
].map(clonePlayer);

const rounds = [
  round(1, [
    match(1, 1, [PLAYERS.dinar, PLAYERS.falih], 3, [PLAYERS.tim, PLAYERS.aldif], 1),
    match(1, 2, [PLAYERS.raybah, PLAYERS.elaw], 2, [PLAYERS.steve, PLAYERS.rudi], 2),
  ]),
  round(2, [
    match(2, 1, [PLAYERS.dinar, PLAYERS.dzikri], 2, [PLAYERS.falih, PLAYERS.dika], 2),
    match(2, 2, [PLAYERS.andi, PLAYERS.elaw], 4, [PLAYERS.fenza, PLAYERS.farrel], 0),
  ]),
  round(3, [
    match(3, 1, [PLAYERS.andi, PLAYERS.dzikri], 4, [PLAYERS.steve, PLAYERS.elaw], 0),
    match(3, 2, [PLAYERS.rudi, PLAYERS.tim], 2, [PLAYERS.raybah, PLAYERS.aldif], 2),
  ]),
  round(4, [
    match(4, 1, [PLAYERS.dzikri, PLAYERS.dinar], 1, [PLAYERS.andi, PLAYERS.falih], 3),
    match(4, 2, [PLAYERS.dika, PLAYERS.fenza], 3, [PLAYERS.raybah, PLAYERS.farrel], 1),
  ]),
  round(5, [
    match(5, 1, [PLAYERS.falih, PLAYERS.rudi], 1, [PLAYERS.dika, PLAYERS.fenza], 3),
    match(5, 2, [PLAYERS.tim, PLAYERS.farrel], 1, [PLAYERS.aldif, PLAYERS.steve], 3),
  ]),
  round(6, [
    match(6, 1, [PLAYERS.andi, PLAYERS.dzikri], 1, [PLAYERS.dika, PLAYERS.fenza], 3),
    match(6, 2, [PLAYERS.dinar, PLAYERS.steve], 0, [PLAYERS.elaw, PLAYERS.aldif], 4),
  ]),
  round(7, [
    match(7, 1, [PLAYERS.andi, PLAYERS.aldif], 3, [PLAYERS.dika, PLAYERS.fenza], 1),
    match(7, 2, [PLAYERS.raybah, PLAYERS.farrel], 1, [PLAYERS.rudi, PLAYERS.tim], 3),
  ]),
  round(8, [
    match(8, 1, [PLAYERS.elaw, PLAYERS.dzikri], 0, [PLAYERS.falih, PLAYERS.rudi], 4),
    match(8, 2, [PLAYERS.tim, PLAYERS.raybah], 1, [PLAYERS.dinar, PLAYERS.steve], 3),
  ]),
  round(9, [
    match(9, 1, [PLAYERS.andi, PLAYERS.dika], 3, [PLAYERS.aldif, PLAYERS.falih], 1),
    match(9, 2, [PLAYERS.fenza, PLAYERS.farrel], 1, [PLAYERS.rudi, PLAYERS.elaw], 3),
  ]),
  round(10, [
    match(10, 1, [PLAYERS.tim, PLAYERS.farrel], 2, [PLAYERS.dzikri, PLAYERS.raybah], 2),
    match(10, 2, [PLAYERS.aldif, PLAYERS.dinar], 2, [PLAYERS.falih, PLAYERS.elaw], 2),
  ]),
  round(11, [
    match(11, 1, [PLAYERS.falih, PLAYERS.dinar], 2, [PLAYERS.dika, PLAYERS.rudi], 2),
    match(11, 2, [PLAYERS.aldif, PLAYERS.elaw], 2, [PLAYERS.steve, PLAYERS.raybah], 2),
  ]),
  round(12, [
    match(12, 1, [PLAYERS.tim, PLAYERS.dinar], 3, [PLAYERS.fenza, PLAYERS.elaw], 1),
    match(12, 2, [PLAYERS.dika, PLAYERS.steve], 3, [PLAYERS.rudi, PLAYERS.raybah], 1),
  ]),
  round(13, [
    match(13, 1, [PLAYERS.rudi, PLAYERS.aldif], 4, [PLAYERS.dika, PLAYERS.steve], 0),
    match(13, 2, [PLAYERS.falih, PLAYERS.raybah], 3, [PLAYERS.tim, PLAYERS.dinar], 1),
  ]),
  round(14, [
    match(14, 1, [PLAYERS.steve, PLAYERS.falih], 1, [PLAYERS.dinar, PLAYERS.dika], 3),
  ]),
];

const basePayload = {
  id: TOURNAMENT_ID,
  userId: HOST_UID,
  name: 'FOM Intense Play',
  format: 'Mexicano',
  criteria: 'Points Won',
  startedAt,
  endedAt,
  date: matchDate,
  courts: 2,
  totalPoints: 4,
  players: tournamentPlayers,
  rounds,
  numRounds: 14,
  numPlayers: 13,
  venueName: 'Padel Yard',
  location: 'Tangerang',
  courtChanges: [],
  statsVersion: 0,
  hasDetail: true,
  detailCollection: 'tournament_details',
  recoverySource: 'manual_reconstruction_2026_05_04',
  recoveryConfidence: 'final_wld_confirmed_partial_score_reconstruction',
};

const detailPayload = {
  ...basePayload,
  updatedAt: new Date(),
};

const summaryPayload = {
  ...basePayload,
  updatedAt: new Date(),
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
    rounds: rounds.length,
    matches: rounds.reduce((sum, item) => sum + item.matches.length, 0),
  }, null, 2));

  const existingTournament = await getDocument({
    baseUrl,
    documentPath: `tournaments/${TOURNAMENT_ID}`,
    token,
  });
  if (existingTournament && !args.force) {
    throw new Error(`Tournament ${TOURNAMENT_ID} already exists. Use --force to overwrite recovery payload.`);
  }

  if (!args.apply) {
    console.log('Dry run only. Re-run with --apply --force to write Firestore.');
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

  console.log('Tournament detail and summary written. Waiting for stats trigger...');

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
    PLAYERS.andi.id,
    PLAYERS.aldif.id,
    PLAYERS.fenza.id,
    PLAYERS.dinar.id,
    PLAYERS.farrel.id,
    PLAYERS.dzikri.id,
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

  console.log(JSON.stringify({
    success: statsVersion >= 1 && hasRunDoc,
    tournamentId: TOURNAMENT_ID,
    statsVersion,
    tournamentStatRun: hasRunDoc,
    leaderboardTotalPlayers: fieldNumber(leaderboardGlobal?.fields?.totalPlayers) || 0,
    watchedStats,
  }, null, 2));
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
