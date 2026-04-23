#!/usr/bin/env node

const parseArgs = (argv) => {
  const parsed = {
    token: '',
    project: '',
    database: '',
    pageSize: 300,
    apply: false,
    createMissing: false,
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
    if (arg === '--create-missing') {
      parsed.createMissing = true;
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

const getBooleanField = (field) => {
  if (!field) return null;
  if (typeof field.booleanValue === 'boolean') return field.booleanValue;
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

const sanitizeDocId = (value) => String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');
const isLikelyFirebaseUid = (value = '') => /^[A-Za-z0-9_-]{20,}$/.test(String(value).trim());
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getBaseMMRChange = (isWin, scoreDiff) => {
  if (isWin) return scoreDiff >= 10 ? 40 : 25;
  return scoreDiff >= 10 ? -35 : -20;
};

const getModifierMMRChange = (isWin, isUnderdog, isFavorite) => {
  if (isWin && isUnderdog) return 15;
  if (!isWin && isFavorite) return -15;
  return 0;
};

const calculateMMRChange = (isWin, scoreDiff, isUnderdog = false, isFavorite = false) => (
  getBaseMMRChange(isWin, scoreDiff) + getModifierMMRChange(isWin, isUnderdog, isFavorite)
);

const buildReasonFromAppliedModifier = (isDraw, isWin, scoreDiff, modifierDeltaMmr) => {
  if (isDraw) {
    return {
      reasonCode: 'draw',
      reasonLabel: 'Draw',
      baseReasonLabel: 'Draw',
      modifierCode: 'none',
      modifierLabel: '',
    };
  }

  const dominant = scoreDiff >= 10;
  const reasonCode = isWin
    ? (dominant ? 'dominant_win' : 'standard_win')
    : (dominant ? 'heavy_loss' : 'standard_loss');
  const baseReasonLabel = isWin
    ? (dominant ? 'Dominant Win' : 'Standard Win')
    : (dominant ? 'Heavy Loss' : 'Standard Loss');

  let modifierCode = 'none';
  let modifierLabel = '';
  if (modifierDeltaMmr === 15) {
    modifierCode = 'underdog_bonus';
    modifierLabel = 'Underdog Bonus';
  } else if (modifierDeltaMmr === -15) {
    modifierCode = 'favorite_penalty';
    modifierLabel = 'Favorite Penalty';
  }

  return {
    reasonCode,
    reasonLabel: modifierLabel ? `${baseReasonLabel} + ${modifierLabel}` : baseReasonLabel,
    baseReasonLabel,
    modifierCode,
    modifierLabel,
  };
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

const getUniqueMatchPlayers = (players = []) => Array.from(
  new Map(
    (Array.isArray(players) ? players : [])
      .filter((player) => player && typeof player?.uid === 'string' && player.uid.trim().length > 0)
      .map((player) => [player.uid, player])
  ).values()
);

const getTeamAverageMmr = (players, runningMmrByUid) => {
  if (!Array.isArray(players) || players.length === 0) return 0;
  const total = players.reduce((sum, player) => sum + toNumber(runningMmrByUid.get(player.uid), 0), 0);
  return Math.round((total / players.length) * 100) / 100;
};

const summarizePlayers = (players = []) => players
  .map((player) => String(player?.displayName || '').trim())
  .filter(Boolean)
  .join(' / ');

const parsePlayers = (rawPlayers) => (Array.isArray(rawPlayers) ? rawPlayers : [])
  .map((playerValue) => playerValue?.mapValue?.fields || {})
  .map((playerFields) => ({
    uid: getStringField(playerFields.id),
    displayName: getStringField(playerFields.name),
    photoURL: getStringField(playerFields.avatar),
  }))
  .filter((player) => isLikelyFirebaseUid(player.uid));

const parseTournamentMatchEvents = (tournamentDoc) => {
  const fields = tournamentDoc?.fields || {};
  const tournamentId = extractDocId(tournamentDoc?.name);
  const tournamentName = getStringField(fields.name);
  const hostUid = getStringField(fields.userId);
  const format = getStringField(fields.format) || 'Americano';
  const endedAtMs = getTimestampMs(fields.endedAt) ?? getTimestampMs(fields.date) ?? 0;
  const rounds = fields.rounds?.arrayValue?.values;
  if (!Array.isArray(rounds)) return [];

  const events = [];
  for (const roundValue of rounds) {
    const roundFields = roundValue?.mapValue?.fields || {};
    const roundId = getNumberField(roundFields.id) ?? 0;
    const matches = roundFields.matches?.arrayValue?.values;
    if (!Array.isArray(matches)) continue;

    matches.forEach((matchValue, matchIndex) => {
      const matchFields = matchValue?.mapValue?.fields || {};
      const status = getStringField(matchFields.status);
      if (!status || status === 'pending') return;

      const teamAFields = matchFields.teamA?.mapValue?.fields || {};
      const teamBFields = matchFields.teamB?.mapValue?.fields || {};
      const teamAScore = getNumberField(teamAFields.score) ?? 0;
      const teamBScore = getNumberField(teamBFields.score) ?? 0;

      events.push({
        tournamentId,
        tournamentName,
        hostUid,
        format,
        playedAtMs: endedAtMs,
        roundId,
        matchIndex,
        matchId: getStringField(matchFields.id) || `r${roundId}_m${matchIndex + 1}`,
        teamAScore,
        teamBScore,
        teamAPlayers: getUniqueMatchPlayers(parsePlayers(teamAFields.players?.arrayValue?.values)),
        teamBPlayers: getUniqueMatchPlayers(parsePlayers(teamBFields.players?.arrayValue?.values)),
      });
    });
  }

  return events;
};

const buildExistingLedgerMap = (ledgerDocs) => {
  const map = new Map();
  for (const doc of ledgerDocs) {
    const fields = doc?.fields || {};
    const id = extractDocId(doc?.name);
    if (!id) continue;
    map.set(id, {
      id,
      uid: getStringField(fields.uid),
      deltaMmr: getNumberField(fields.deltaMmr),
      playedAtMs: getTimestampMs(fields.playedAt),
      createdAtMs: getTimestampMs(fields.createdAt),
      source: getStringField(fields.source),
      result: getStringField(fields.result),
      scoreFor: getNumberField(fields.scoreFor),
      scoreAgainst: getNumberField(fields.scoreAgainst),
      mmrBefore: getNumberField(fields.mmrBefore),
      mmrAfter: getNumberField(fields.mmrAfter),
      isUnderdog: getBooleanField(fields.isUnderdog),
      isFavorite: getBooleanField(fields.isFavorite),
    });
  }
  return map;
};

const toFirestoreFieldValue = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  return { nullValue: null };
};

const run = async () => {
  const args = parseArgs(process.argv);
  if (!args.token || !args.project || !args.database) {
    console.error(
      'Usage: node scripts/backfill-ledger-v2.mjs --token <token> --project <projectId> --database <databaseId> [--apply] [--page-size <n>] [--create-missing]'
    );
    process.exit(1);
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${args.project}/databases/${args.database}`;
  const [tournaments, ledgerDocs] = await Promise.all([
    listCollectionDocuments({
      baseUrl,
      collectionId: 'tournaments',
      token: args.token,
      pageSize: args.pageSize,
    }),
    listCollectionDocuments({
      baseUrl,
      collectionId: 'player_match_ledger',
      token: args.token,
      pageSize: args.pageSize,
    }),
  ]);

  const existingLedgerById = buildExistingLedgerMap(ledgerDocs);
  const matchEvents = tournaments.flatMap((tournamentDoc) => parseTournamentMatchEvents(tournamentDoc));
  matchEvents.sort((a, b) => {
    if (a.playedAtMs !== b.playedAtMs) return a.playedAtMs - b.playedAtMs;
    if (a.tournamentId !== b.tournamentId) return a.tournamentId.localeCompare(b.tournamentId);
    if (a.roundId !== b.roundId) return a.roundId - b.roundId;
    if (a.matchIndex !== b.matchIndex) return a.matchIndex - b.matchIndex;
    return a.matchId.localeCompare(b.matchId);
  });

  const runningMmrByUid = new Map();
  const ledgerUpdates = [];
  let skippedMissing = 0;
  let createdMissing = 0;

  for (const event of matchEvents) {
    const teamAAverageMmr = getTeamAverageMmr(event.teamAPlayers, runningMmrByUid);
    const teamBAverageMmr = getTeamAverageMmr(event.teamBPlayers, runningMmrByUid);
    const teamAIsUnderdog = teamAAverageMmr < teamBAverageMmr;
    const teamAIsFavorite = teamAAverageMmr > teamBAverageMmr;
    const teamBIsUnderdog = teamBAverageMmr < teamAAverageMmr;
    const teamBIsFavorite = teamBAverageMmr > teamAAverageMmr;

    const participantDescriptors = [
      ...event.teamAPlayers.map((player) => ({
        player,
        team: 'A',
        ownScore: event.teamAScore,
        opponentScore: event.teamBScore,
        ownTeamPlayers: event.teamAPlayers,
        opponentPlayers: event.teamBPlayers,
        ownTeamAverageMmr: teamAAverageMmr,
        opponentTeamAverageMmr: teamBAverageMmr,
        isUnderdog: teamAIsUnderdog,
        isFavorite: teamAIsFavorite,
      })),
      ...event.teamBPlayers.map((player) => ({
        player,
        team: 'B',
        ownScore: event.teamBScore,
        opponentScore: event.teamAScore,
        ownTeamPlayers: event.teamBPlayers,
        opponentPlayers: event.teamAPlayers,
        ownTeamAverageMmr: teamBAverageMmr,
        opponentTeamAverageMmr: teamAAverageMmr,
        isUnderdog: teamBIsUnderdog,
        isFavorite: teamBIsFavorite,
      })),
    ];

    for (const descriptor of participantDescriptors) {
      const ledgerId = sanitizeDocId(`${event.tournamentId}_${event.matchId}_${descriptor.player.uid}`);
      const existing = existingLedgerById.get(ledgerId);
      const scoreDiff = Math.abs(descriptor.ownScore - descriptor.opponentScore);
      const isDraw = descriptor.ownScore === descriptor.opponentScore;
      const isWin = descriptor.ownScore > descriptor.opponentScore;
      const baseDeltaMmr = isDraw ? 0 : getBaseMMRChange(isWin, scoreDiff);

      let deltaMmr = Number.isFinite(existing?.deltaMmr) ? Number(existing.deltaMmr) : NaN;
      if (!Number.isFinite(deltaMmr)) {
        if (!args.createMissing) {
          skippedMissing += 1;
          continue;
        }
        deltaMmr = isDraw ? 0 : calculateMMRChange(isWin, scoreDiff, descriptor.isUnderdog, descriptor.isFavorite);
        createdMissing += 1;
      }

      const modifierDeltaMmr = isDraw ? 0 : deltaMmr - baseDeltaMmr;
      const mmrBefore = toNumber(runningMmrByUid.get(descriptor.player.uid), 0);
      const mmrAfter = mmrBefore + deltaMmr;
      runningMmrByUid.set(descriptor.player.uid, mmrAfter);

      const reason = buildReasonFromAppliedModifier(isDraw, isWin, scoreDiff, modifierDeltaMmr);
      ledgerUpdates.push({
        id: ledgerId,
        isNew: !existing,
        fields: {
          id: ledgerId,
          uid: descriptor.player.uid,
          playerName: descriptor.player.displayName || '',
          tournamentId: event.tournamentId,
          tournamentName: event.tournamentName || '',
          matchId: event.matchId,
          roundId: event.roundId,
          matchSequence: event.matchIndex + 1,
          format: event.format || '',
          team: descriptor.team,
          scoreFor: descriptor.ownScore,
          scoreAgainst: descriptor.opponentScore,
          scoreDiff,
          result: isDraw ? 'draw' : (isWin ? 'win' : 'loss'),
          teamSummary: summarizePlayers(descriptor.ownTeamPlayers),
          opponentSummary: summarizePlayers(descriptor.opponentPlayers),
          teamAverageMmr: descriptor.ownTeamAverageMmr,
          opponentAverageMmr: descriptor.opponentTeamAverageMmr,
          isUnderdog: Boolean(!isDraw && descriptor.isUnderdog),
          isFavorite: Boolean(!isDraw && descriptor.isFavorite),
          mmrBefore,
          mmrAfter,
          baseDeltaMmr,
          modifierDeltaMmr,
          deltaMmr,
          reasonCode: reason.reasonCode,
          reasonLabel: reason.reasonLabel,
          baseReasonLabel: reason.baseReasonLabel,
          modifierCode: reason.modifierCode,
          modifierLabel: reason.modifierLabel,
          hostUid: event.hostUid || '',
          playedAt: new Date((existing?.playedAtMs || event.playedAtMs || Date.now())).toISOString(),
          createdAt: new Date((existing?.createdAtMs || event.playedAtMs || Date.now())).toISOString(),
          source: existing?.source || (!existing ? 'backfill_v2' : 'backfill_v2_enriched'),
        },
      });
    }
  }

  console.log(`Tournaments scanned: ${tournaments.length}`);
  console.log(`Existing ledger docs scanned: ${ledgerDocs.length}`);
  console.log(`Match events parsed: ${matchEvents.length}`);
  console.log(`Ledger docs to enrich: ${ledgerUpdates.length}`);
  console.log(`Missing ledger docs skipped: ${skippedMissing}`);
  console.log(`Missing ledger docs to create: ${createdMissing}`);

  const sampleUpdates = ledgerUpdates.slice(0, 8);
  if (sampleUpdates.length > 0) {
    console.log('Sample ledger updates:');
    sampleUpdates.forEach((item, idx) => {
      console.log(
        `${idx + 1}. ${item.id} delta=${item.fields.deltaMmr} before=${item.fields.mmrBefore} after=${item.fields.mmrAfter} reason="${item.fields.reasonLabel}"`
      );
    });
  }

  if (!args.apply) {
    console.log('Dry-run mode. Re-run with --apply to write changes.');
    return;
  }

  let success = 0;
  let failed = 0;
  for (const item of ledgerUpdates) {
    const firestoreFields = Object.fromEntries(
      Object.entries(item.fields).map(([key, value]) => {
        if (key === 'playedAt' || key === 'createdAt') {
          return [key, { timestampValue: value }];
        }
        return [key, toFirestoreFieldValue(value)];
      })
    );

    try {
      await patchDocument({
        baseUrl,
        collectionId: 'player_match_ledger',
        docId: item.id,
        token: args.token,
        fields: firestoreFields,
        merge: true,
      });
      success += 1;
    } catch (err) {
      failed += 1;
      console.error(`Failed ledger v2 enrich for ${item.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Applied player_match_ledger enrichments: success=${success} failed=${failed}`);
  if (failed > 0) process.exit(2);
};

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
