#!/usr/bin/env node

const parseArgs = (argv) => {
  const parsed = {
    token: '',
    project: '',
    database: '',
    pageSize: 300,
    apply: false,
    includeTournamentsWithoutOwner: false,
    skipUsersScan: false,
    endedOnly: false,
    skipStatsWrite: false,
    skipLedgerWrite: false,
    skipRunWrite: false,
    skipHistorySummaryWrite: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--token') {
      parsed.token = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--project') {
      parsed.project = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--database') {
      parsed.database = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--page-size') {
      const n = Number(argv[i + 1] || '');
      if (Number.isFinite(n) && n > 0) parsed.pageSize = Math.floor(n);
      i += 1;
      continue;
    }
    if (arg === '--apply') {
      parsed.apply = true;
      continue;
    }
    if (arg === '--include-tournaments-without-owner') {
      parsed.includeTournamentsWithoutOwner = true;
      continue;
    }
    if (arg === '--skip-users-scan') {
      parsed.skipUsersScan = true;
      continue;
    }
    if (arg === '--ended-only') {
      parsed.endedOnly = true;
      continue;
    }
    if (arg === '--skip-stats-write') {
      parsed.skipStatsWrite = true;
      continue;
    }
    if (arg === '--skip-ledger-write') {
      parsed.skipLedgerWrite = true;
      continue;
    }
    if (arg === '--skip-run-write') {
      parsed.skipRunWrite = true;
      continue;
    }
    if (arg === '--skip-history-summary-write') {
      parsed.skipHistorySummaryWrite = true;
      continue;
    }
  }

  return parsed;
};

const getStringField = (field) => {
  if (!field) return '';
  if (typeof field.stringValue === 'string') return field.stringValue;
  return '';
};

const getNumberField = (field) => {
  if (!field) return null;
  if (field.integerValue !== undefined) {
    const n = Number(field.integerValue);
    return Number.isFinite(n) ? n : null;
  }
  if (field.doubleValue !== undefined) {
    const n = Number(field.doubleValue);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const getTimestampMs = (field) => {
  if (!field?.timestampValue) return null;
  const ms = Date.parse(field.timestampValue);
  return Number.isFinite(ms) ? ms : null;
};

const extractDocId = (fullDocName) => {
  const parts = String(fullDocName || '').split('/');
  return parts.length ? parts[parts.length - 1] : '';
};

const isLikelyFirebaseUid = (value = '') => /^[A-Za-z0-9_-]{20,}$/.test(String(value).trim());

const sanitizeDocId = (value) => String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');

const integerValue = (value) => ({ integerValue: String(Math.trunc(Number(value) || 0)) });

const stringValue = (value) => ({ stringValue: String(value || '') });

const timestampValue = (field, fallbackMs = Date.now()) => {
  if (field?.timestampValue) return field;
  return { timestampValue: new Date(fallbackMs).toISOString() };
};

const calculateMMRChange = (isWin, scoreDiff, isUnderdog = false, isFavorite = false) => {
  let change = 0;
  if (isWin) {
    change = scoreDiff >= 10 ? 40 : 25;
    if (isUnderdog) change += 15;
  } else {
    change = scoreDiff >= 10 ? -35 : -20;
    if (isFavorite) change -= 15;
  }
  return change;
};

const requestJson = async (url, init = {}) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

const listCollectionDocuments = async ({
  baseUrl,
  collectionId,
  token,
  pageSize,
}) => {
  const docs = [];
  let nextPageToken = '';
  do {
    const pageTokenQuery = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '';
    const url = `${baseUrl}/documents/${collectionId}?pageSize=${pageSize}${pageTokenQuery}`;
    const payload = await requestJson(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (Array.isArray(payload.documents)) docs.push(...payload.documents);
    nextPageToken = payload.nextPageToken || '';
  } while (nextPageToken);
  return docs;
};

const runStructuredQuery = async ({
  baseUrl,
  token,
  structuredQuery,
}) => {
  const url = `${baseUrl}/documents:runQuery`;
  const payload = await requestJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => item?.document || null)
    .filter(Boolean);
};

const listEndedTournamentDocuments = async ({
  baseUrl,
  token,
}) => runStructuredQuery({
  baseUrl,
  token,
  structuredQuery: {
    from: [{ collectionId: 'tournaments' }],
    where: {
      unaryFilter: {
        field: { fieldPath: 'endedAt' },
        op: 'IS_NOT_NULL',
      },
    },
  },
});

const patchDocument = async ({
  baseUrl,
  collectionId,
  docId,
  token,
  fields,
  merge = true,
}) => {
  const updateMask = Object.keys(fields)
    .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
    .join('&');
  const queryPart = merge && updateMask ? `?${updateMask}` : '';
  const url = `${baseUrl}/documents/${collectionId}/${encodeURIComponent(docId)}${queryPart}`;
  return requestJson(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
};

const patchDocumentPath = async ({
  baseUrl,
  documentPath,
  token,
  fields,
  merge = true,
}) => {
  const updateMask = Object.keys(fields)
    .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
    .join('&');
  const queryPart = merge && updateMask ? `?${updateMask}` : '';
  const encodedPath = documentPath.split('/').map(encodeURIComponent).join('/');
  const url = `${baseUrl}/documents/${encodedPath}${queryPart}`;
  return requestJson(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
};

const countCompletedMatchesFromFields = (fields) => {
  const rounds = fields.rounds?.arrayValue?.values;
  if (!Array.isArray(rounds)) return 0;

  return rounds.reduce((total, roundValue) => {
    const matches = roundValue?.mapValue?.fields?.matches?.arrayValue?.values;
    if (!Array.isArray(matches)) return total;
    return total + matches.filter((matchValue) => {
      const status = getStringField(matchValue?.mapValue?.fields?.status);
      return status && status !== 'pending';
    }).length;
  }, 0);
};

const buildHistorySummaryFields = (tournamentDoc, summary) => {
  const fields = tournamentDoc?.fields || {};
  const tournamentId = extractDocId(tournamentDoc?.name);
  const playersCount = fields.players?.arrayValue?.values?.length || 0;
  const roundsCount = fields.rounds?.arrayValue?.values?.length || 0;
  const fallbackPlayedAtMs = getTimestampMs(fields.endedAt) ?? getTimestampMs(fields.date) ?? Date.now();
  const payload = {
    id: stringValue(tournamentId),
    userId: fields.userId || stringValue(''),
    name: fields.name || stringValue(''),
    format: fields.format || stringValue('Americano'),
    date: timestampValue(fields.endedAt || fields.date, fallbackPlayedAtMs),
    numRounds: integerValue(getNumberField(fields.numRounds) ?? roundsCount),
    numPlayers: integerValue(getNumberField(fields.numPlayers) ?? playersCount),
    completedMatchesCount: integerValue(countCompletedMatchesFromFields(fields)),
    userMatches: integerValue(summary.matches),
    userWins: integerValue(summary.wins),
    userLosses: integerValue(summary.losses),
    userDraws: integerValue(summary.draws),
    userPoints: integerValue(summary.points),
    userMmrDelta: integerValue(summary.mmrDelta),
    playedAt: timestampValue(fields.endedAt, fallbackPlayedAtMs),
    updatedAt: { timestampValue: new Date().toISOString() },
    source: stringValue('backfill_v1'),
  };

  [
    'backgroundId',
    'criteria',
    'scoringType',
    'startedAt',
    'endedAt',
    'courts',
    'totalPoints',
    'rounds',
    'players',
    'courtChanges',
    'venueName',
    'location',
  ].forEach((fieldName) => {
    if (fields[fieldName] !== undefined) payload[fieldName] = fields[fieldName];
  });

  return payload;
};

const buildUserIdentityByUid = (userDocs) => {
  const map = new Map();
  for (const userDoc of userDocs) {
    const fields = userDoc?.fields || {};
    const uid = getStringField(fields.uid) || extractDocId(userDoc?.name);
    if (!uid) continue;
    map.set(uid, {
      uid,
      displayName: getStringField(fields.displayName),
      photoURL: getStringField(fields.photoURL),
      region: getStringField(fields.region),
    });
  }
  return map;
};

const parseTournamentForEntries = (tournamentDoc, opts) => {
  const fields = tournamentDoc?.fields || {};
  const tournamentId = extractDocId(tournamentDoc?.name);
  const ownerUid = getStringField(fields.userId);
  if (!opts.includeTournamentsWithoutOwner && !ownerUid) return [];
  const format = getStringField(fields.format) || 'Americano';
  const rounds = fields.rounds?.arrayValue?.values;
  const endedAtMs = getTimestampMs(fields.endedAt) ?? getTimestampMs(fields.date) ?? 0;
  if (!Array.isArray(rounds)) return [];

  const entries = [];

  for (const roundValue of rounds) {
    const roundFields = roundValue?.mapValue?.fields || {};
    const roundId = getNumberField(roundFields.id) ?? 0;
    const matches = roundFields.matches?.arrayValue?.values;
    if (!Array.isArray(matches)) continue;

    for (const matchValue of matches) {
      const matchFields = matchValue?.mapValue?.fields || {};
      const status = getStringField(matchFields.status);
      if (!status || status === 'pending') continue;

      const matchId = getStringField(matchFields.id) || `r${roundId}_unknown`;
      const teamA = matchFields.teamA?.mapValue?.fields || {};
      const teamB = matchFields.teamB?.mapValue?.fields || {};
      const teamAScore = getNumberField(teamA.score) ?? 0;
      const teamBScore = getNumberField(teamB.score) ?? 0;
      const teamAPlayers = teamA.players?.arrayValue?.values || [];
      const teamBPlayers = teamB.players?.arrayValue?.values || [];

      const normalizePlayers = (players) => players
        .map((p) => p?.mapValue?.fields || {})
        .map((pf) => ({
          uid: getStringField(pf.id),
          displayName: getStringField(pf.name),
          photoURL: getStringField(pf.avatar),
        }))
        .filter((p) => isLikelyFirebaseUid(p.uid));

      const aParticipants = normalizePlayers(teamAPlayers);
      const bParticipants = normalizePlayers(teamBPlayers);

      for (const participant of aParticipants) {
        const isWin = teamAScore > teamBScore;
        const isDraw = teamAScore === teamBScore;
        const deltaMmr = isDraw ? 0 : calculateMMRChange(isWin, Math.abs(teamAScore - teamBScore), false, false);
        entries.push({
          uid: participant.uid,
          displayName: participant.displayName,
          photoURL: participant.photoURL,
          tournamentId,
          ownerUid,
          format,
          roundId,
          matchId,
          team: 'A',
          scoreFor: teamAScore,
          scoreAgainst: teamBScore,
          result: isDraw ? 'draw' : (isWin ? 'win' : 'loss'),
          deltaMmr,
          playedAtMs: endedAtMs,
        });
      }

      for (const participant of bParticipants) {
        const isWin = teamBScore > teamAScore;
        const isDraw = teamAScore === teamBScore;
        const deltaMmr = isDraw ? 0 : calculateMMRChange(isWin, Math.abs(teamAScore - teamBScore), false, false);
        entries.push({
          uid: participant.uid,
          displayName: participant.displayName,
          photoURL: participant.photoURL,
          tournamentId,
          ownerUid,
          format,
          roundId,
          matchId,
          team: 'B',
          scoreFor: teamBScore,
          scoreAgainst: teamAScore,
          result: isDraw ? 'draw' : (isWin ? 'win' : 'loss'),
          deltaMmr,
          playedAtMs: endedAtMs,
        });
      }
    }
  }

  return entries;
};

const run = async () => {
  const args = parseArgs(process.argv);
  if (!args.token || !args.project || !args.database) {
    console.error(
      'Usage: node scripts/backfill-player-stats-ledger.mjs --token <token> --project <projectId> --database <databaseId> [--apply] [--page-size <n>] [--include-tournaments-without-owner] [--skip-users-scan] [--ended-only] [--skip-stats-write] [--skip-ledger-write] [--skip-run-write] [--skip-history-summary-write]'
    );
    process.exit(1);
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${args.project}/databases/${args.database}`;
  const users = args.skipUsersScan
    ? []
    : await listCollectionDocuments({
      baseUrl,
      collectionId: 'users',
      token: args.token,
      pageSize: args.pageSize,
    });
  const tournaments = args.endedOnly
    ? await listEndedTournamentDocuments({
      baseUrl,
      token: args.token,
    })
    : await listCollectionDocuments({
      baseUrl,
      collectionId: 'tournaments',
      token: args.token,
      pageSize: args.pageSize,
    });

  const userIdentityByUid = buildUserIdentityByUid(users);
  const allEntries = tournaments.flatMap((tournamentDoc) => parseTournamentForEntries(tournamentDoc, args));
  allEntries.sort((a, b) => {
    if (a.playedAtMs !== b.playedAtMs) return a.playedAtMs - b.playedAtMs;
    if (a.tournamentId !== b.tournamentId) return a.tournamentId.localeCompare(b.tournamentId);
    if (a.roundId !== b.roundId) return a.roundId - b.roundId;
    if (a.matchId !== b.matchId) return a.matchId.localeCompare(b.matchId);
    return a.uid.localeCompare(b.uid);
  });

  const ledgerById = new Map();
  const statsByUid = new Map();
  const tournamentRunById = new Map();
  const historySummaryByPath = new Map();
  const tournamentDocById = new Map(tournaments.map((tournamentDoc) => [extractDocId(tournamentDoc?.name), tournamentDoc]));

  for (const entry of allEntries) {
    const ledgerId = sanitizeDocId(`${entry.tournamentId}_${entry.matchId}_${entry.uid}`);
    if (!ledgerById.has(ledgerId)) {
      ledgerById.set(ledgerId, {
        id: ledgerId,
        uid: entry.uid,
        tournamentId: entry.tournamentId,
        matchId: entry.matchId,
        roundId: entry.roundId,
        format: entry.format,
        team: entry.team,
        scoreFor: entry.scoreFor,
        scoreAgainst: entry.scoreAgainst,
        result: entry.result,
        deltaMmr: entry.deltaMmr,
        hostUid: entry.ownerUid || '',
        playedAtMs: entry.playedAtMs,
      });
    }

    if (!tournamentRunById.has(entry.tournamentId)) {
      tournamentRunById.set(entry.tournamentId, {
        tournamentId: entry.tournamentId,
        hostUid: entry.ownerUid || '',
      });
    }

    const identity = userIdentityByUid.get(entry.uid) || {};
    const existing = statsByUid.get(entry.uid) || {
      uid: entry.uid,
      displayName: entry.displayName || identity.displayName || '',
      photoURL: entry.photoURL || identity.photoURL || '',
      region: identity.region || '',
      totalMatches: 0,
      wins: 0,
      losses: 0,
      mmr: 0,
      mmrDeltaTotal: 0,
      lastMatchMs: 0,
      lastTournamentId: '',
    };

    existing.totalMatches += 1;
    if (entry.result === 'win') existing.wins += 1;
    if (entry.result === 'loss') existing.losses += 1;
    existing.mmr = Math.max(0, existing.mmr + entry.deltaMmr);
    existing.mmrDeltaTotal += entry.deltaMmr;
    if (entry.playedAtMs >= existing.lastMatchMs) {
      existing.lastMatchMs = entry.playedAtMs;
      existing.lastTournamentId = entry.tournamentId;
    }
    if (!existing.displayName && entry.displayName) existing.displayName = entry.displayName;
    if (!existing.photoURL && entry.photoURL) existing.photoURL = entry.photoURL;

    statsByUid.set(entry.uid, existing);

    const historyKey = `${entry.uid}/${entry.tournamentId}`;
    const existingHistory = historySummaryByPath.get(historyKey) || {
      uid: entry.uid,
      tournamentId: entry.tournamentId,
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      mmrDelta: 0,
    };
    existingHistory.matches += 1;
    if (entry.result === 'win') existingHistory.wins += 1;
    if (entry.result === 'loss') existingHistory.losses += 1;
    if (entry.result === 'draw') existingHistory.draws += 1;
    existingHistory.points += Math.max(0, Math.trunc(entry.scoreFor || 0));
    existingHistory.mmrDelta += Math.trunc(entry.deltaMmr || 0);
    historySummaryByPath.set(historyKey, existingHistory);
  }

  console.log(`Users scanned: ${args.skipUsersScan ? 'skipped (--skip-users-scan)' : users.length}`);
  console.log(`Tournaments scanned: ${tournaments.length}${args.endedOnly ? ' (--ended-only)' : ''}`);
  console.log(`Parsed participant entries: ${allEntries.length}`);
  console.log(`Ledger docs to upsert: ${ledgerById.size}`);
  console.log(`player_stats docs to upsert: ${statsByUid.size}`);
  console.log(`tournament_stat_runs docs to upsert: ${tournamentRunById.size}`);
  console.log(`history_summary docs to upsert: ${historySummaryByPath.size}`);

  const sampleStats = Array.from(statsByUid.values())
    .sort((a, b) => b.totalMatches - a.totalMatches || b.mmr - a.mmr)
    .slice(0, 10);
  if (sampleStats.length > 0) {
    console.log('Sample stats (first 10):');
    sampleStats.forEach((stat, idx) => {
      console.log(
        `${idx + 1}. ${stat.displayName || stat.uid} uid=${stat.uid} matches=${stat.totalMatches} wins=${stat.wins} losses=${stat.losses} mmr=${stat.mmr}`
      );
    });
  }

  if (!args.apply) {
    console.log('Dry-run mode. Re-run with --apply to write changes.');
    return;
  }

  let statsSuccess = 0;
  let statsFail = 0;
  if (!args.skipStatsWrite) {
    for (const stat of statsByUid.values()) {
      const fields = {
        uid: { stringValue: stat.uid },
        mmr: { integerValue: String(Math.max(0, Math.trunc(stat.mmr))) },
        totalMatches: { integerValue: String(Math.max(0, Math.trunc(stat.totalMatches))) },
        wins: { integerValue: String(Math.max(0, Math.trunc(stat.wins))) },
        losses: { integerValue: String(Math.max(0, Math.trunc(stat.losses))) },
        updatedAt: { timestampValue: new Date().toISOString() },
      };
      if (stat.displayName) fields.displayName = { stringValue: stat.displayName };
      if (stat.photoURL) fields.photoURL = { stringValue: stat.photoURL };
      if (stat.region) fields.region = { stringValue: stat.region };
      if (stat.lastTournamentId) fields.lastTournamentId = { stringValue: stat.lastTournamentId };
      if (stat.lastMatchMs > 0) fields.lastMatchAt = { timestampValue: new Date(stat.lastMatchMs).toISOString() };

      try {
        await patchDocument({
          baseUrl,
          collectionId: 'player_stats',
          docId: stat.uid,
          token: args.token,
          fields,
          merge: true,
        });
        statsSuccess += 1;
      } catch (err) {
        statsFail += 1;
        console.error(`Failed player_stats upsert for ${stat.uid}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  let ledgerSuccess = 0;
  let ledgerFail = 0;
  if (!args.skipLedgerWrite) {
    for (const ledger of ledgerById.values()) {
      const fields = {
        id: { stringValue: ledger.id },
        uid: { stringValue: ledger.uid },
        tournamentId: { stringValue: ledger.tournamentId },
        matchId: { stringValue: ledger.matchId },
        roundId: { integerValue: String(Math.max(0, Math.trunc(ledger.roundId))) },
        format: { stringValue: ledger.format || '' },
        team: { stringValue: ledger.team || '' },
        scoreFor: { integerValue: String(Math.max(0, Math.trunc(ledger.scoreFor))) },
        scoreAgainst: { integerValue: String(Math.max(0, Math.trunc(ledger.scoreAgainst))) },
        result: { stringValue: ledger.result || 'draw' },
        deltaMmr: { integerValue: String(Math.trunc(ledger.deltaMmr || 0)) },
        hostUid: { stringValue: ledger.hostUid || '' },
        playedAt: {
          timestampValue: new Date(ledger.playedAtMs || Date.now()).toISOString(),
        },
        createdAt: {
          timestampValue: new Date().toISOString(),
        },
        source: { stringValue: 'backfill_v1' },
      };
      try {
        await patchDocument({
          baseUrl,
          collectionId: 'player_match_ledger',
          docId: ledger.id,
          token: args.token,
          fields,
          merge: true,
        });
        ledgerSuccess += 1;
      } catch (err) {
        ledgerFail += 1;
        console.error(`Failed player_match_ledger upsert for ${ledger.id}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  let runSuccess = 0;
  let runFail = 0;
  if (!args.skipRunWrite) {
    for (const run of tournamentRunById.values()) {
      if (!run.hostUid) continue;
      const fields = {
        tournamentId: { stringValue: run.tournamentId },
        hostUid: { stringValue: run.hostUid },
        source: { stringValue: 'backfill_v1' },
        appliedAt: { timestampValue: new Date().toISOString() },
      };
      try {
        await patchDocument({
          baseUrl,
          collectionId: 'tournament_stat_runs',
          docId: run.tournamentId,
          token: args.token,
          fields,
          merge: true,
        });
        runSuccess += 1;
      } catch (err) {
        runFail += 1;
        console.error(`Failed tournament_stat_runs upsert for ${run.tournamentId}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  let historySuccess = 0;
  let historyFail = 0;
  if (!args.skipHistorySummaryWrite) {
    for (const summary of historySummaryByPath.values()) {
      const tournamentDoc = tournamentDocById.get(summary.tournamentId);
      if (!tournamentDoc) continue;
      try {
        await patchDocumentPath({
          baseUrl,
          documentPath: `users/${summary.uid}/history_summary/${summary.tournamentId}`,
          token: args.token,
          fields: buildHistorySummaryFields(tournamentDoc, summary),
          merge: true,
        });
        historySuccess += 1;
      } catch (err) {
        historyFail += 1;
        console.error(
          `Failed history_summary upsert for ${summary.uid}/${summary.tournamentId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  console.log(`Applied player_stats: ${args.skipStatsWrite ? 'skipped (--skip-stats-write)' : `success=${statsSuccess} failed=${statsFail}`}`);
  console.log(`Applied player_match_ledger: ${args.skipLedgerWrite ? 'skipped (--skip-ledger-write)' : `success=${ledgerSuccess} failed=${ledgerFail}`}`);
  console.log(`Applied tournament_stat_runs: ${args.skipRunWrite ? 'skipped (--skip-run-write)' : `success=${runSuccess} failed=${runFail}`}`);
  console.log(`Applied history_summary: ${args.skipHistorySummaryWrite ? 'skipped (--skip-history-summary-write)' : `success=${historySuccess} failed=${historyFail}`}`);
  if (statsFail > 0 || ledgerFail > 0 || runFail > 0 || historyFail > 0) process.exit(2);
};

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
