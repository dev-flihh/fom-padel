const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';
const db = getFirestore(undefined, DATABASE_ID);

const isLikelyFirebaseUid = (value = '') => /^[A-Za-z0-9_-]{20,}$/.test(String(value).trim());
const toSafeDocId = (value) => String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');

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

const collectTournamentAggregates = (tournamentData, tournamentId) => {
  const rounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];
  const format = tournamentData?.format || 'Americano';
  const hostUid = typeof tournamentData?.userId === 'string' ? tournamentData.userId : '';
  const participantMap = new Map();
  const ledgerEntries = [];

  const upsertParticipant = (participant, ownScore, opponentScore, match, team) => {
    const uid = typeof participant?.id === 'string' ? participant.id.trim() : '';
    if (!uid || !isLikelyFirebaseUid(uid)) return;

    const isDraw = ownScore === opponentScore;
    const isWin = ownScore > opponentScore;
    const deltaMmr = isDraw ? 0 : calculateMMRChange(isWin, Math.abs(ownScore - opponentScore), false, false);
    const existing = participantMap.get(uid) || {
      uid,
      displayName: participant?.name || '',
      photoURL: participant?.avatar || '',
      matches: 0,
      wins: 0,
      losses: 0,
      mmrDelta: 0,
    };

    existing.matches += 1;
    if (isWin) existing.wins += 1;
    if (!isWin && !isDraw) existing.losses += 1;
    existing.mmrDelta += deltaMmr;
    if (!existing.displayName && participant?.name) existing.displayName = participant.name;
    if (!existing.photoURL && participant?.avatar) existing.photoURL = participant.avatar;
    participantMap.set(uid, existing);

    const ledgerId = toSafeDocId(`${tournamentId}_${match.id}_${uid}`);
    ledgerEntries.push({
      id: ledgerId,
      uid,
      tournamentId,
      matchId: match.id,
      roundId: Number(match.roundId || 0),
      format,
      team,
      scoreFor: Number(ownScore || 0),
      scoreAgainst: Number(opponentScore || 0),
      result: isDraw ? 'draw' : (isWin ? 'win' : 'loss'),
      deltaMmr,
      hostUid,
      playedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      source: 'cloud_function_v1',
    });
  };

  for (const round of rounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    for (const match of matches) {
      if (!match || match.status === 'pending') continue;
      const teamAPlayersRaw = Array.isArray(match?.teamA?.players) ? match.teamA.players : [];
      const teamBPlayersRaw = Array.isArray(match?.teamB?.players) ? match.teamB.players : [];
      const teamAPlayers = Array.from(new Map(teamAPlayersRaw.map((p) => [p?.id, p])).values()).filter(Boolean);
      const teamBPlayers = Array.from(new Map(teamBPlayersRaw.map((p) => [p?.id, p])).values()).filter(Boolean);
      const teamAScore = Number(match?.teamA?.score || 0);
      const teamBScore = Number(match?.teamB?.score || 0);

      for (const player of teamAPlayers) {
        upsertParticipant(player, teamAScore, teamBScore, match, 'A');
      }
      for (const player of teamBPlayers) {
        upsertParticipant(player, teamBScore, teamAScore, match, 'B');
      }
    }
  }

  return {
    hostUid,
    participantSummaries: Array.from(participantMap.values()),
    ledgerEntries,
  };
};

exports.onTournamentFinalized = onDocumentWritten(
  {
    document: 'tournaments/{tournamentId}',
    database: DATABASE_ID,
    retry: true,
  },
  async (event) => {
    const tournamentId = event.params.tournamentId;
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;

    const after = afterSnap.data() || {};
    if (!after?.endedAt) return;
    if (Number(after?.statsVersion || 0) >= 1) return;

    const runRef = db.collection('tournament_stat_runs').doc(tournamentId);
    const tournamentRef = db.collection('tournaments').doc(tournamentId);

    const shouldApply = await db.runTransaction(async (tx) => {
      const [runDoc, tournamentDoc] = await Promise.all([
        tx.get(runRef),
        tx.get(tournamentRef),
      ]);
      if (!tournamentDoc.exists) return false;
      const tournamentData = tournamentDoc.data() || {};
      if (!tournamentData?.endedAt) return false;
      if (Number(tournamentData?.statsVersion || 0) >= 1) return false;
      if (runDoc.exists) return false;

      tx.set(runRef, {
        tournamentId,
        hostUid: typeof tournamentData?.userId === 'string' ? tournamentData.userId : '',
        source: 'cloud_function_v1',
        appliedAt: FieldValue.serverTimestamp(),
      });
      tx.set(tournamentRef, {
        statsVersion: 1,
        statsAppliedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });

    if (!shouldApply) return;

    const aggregates = collectTournamentAggregates(after, tournamentId);
    const batch = db.batch();

    for (const summary of aggregates.participantSummaries) {
      const statsRef = db.collection('player_stats').doc(summary.uid);
      batch.set(statsRef, {
        uid: summary.uid,
        ...(summary.displayName ? { displayName: summary.displayName } : {}),
        ...(summary.photoURL ? { photoURL: summary.photoURL } : {}),
        mmr: FieldValue.increment(summary.mmrDelta),
        totalMatches: FieldValue.increment(summary.matches),
        wins: FieldValue.increment(summary.wins),
        losses: FieldValue.increment(summary.losses),
        lastTournamentId: tournamentId,
        lastUpdatedBy: aggregates.hostUid || '',
        lastMatchAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      const userRef = db.collection('users').doc(summary.uid);
      batch.set(userRef, {
        mmr: FieldValue.increment(summary.mmrDelta),
        totalMatches: FieldValue.increment(summary.matches),
      }, { merge: true });
    }

    for (const ledger of aggregates.ledgerEntries) {
      const ledgerRef = db.collection('player_match_ledger').doc(ledger.id);
      batch.set(ledgerRef, ledger, { merge: true });
    }

    await batch.commit();
    logger.info('Tournament stats applied', {
      tournamentId,
      participants: aggregates.participantSummaries.length,
      ledgerEntries: aggregates.ledgerEntries.length,
    });
  }
);
