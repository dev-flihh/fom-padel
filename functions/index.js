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

const buildResultReason = (isDraw, isWin, scoreDiff, isUnderdog, isFavorite) => {
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
  const modifierCode = isWin
    ? (isUnderdog ? 'underdog_bonus' : 'none')
    : (isFavorite ? 'favorite_penalty' : 'none');
  const modifierLabel = modifierCode === 'underdog_bonus'
    ? 'Underdog Bonus'
    : modifierCode === 'favorite_penalty'
      ? 'Favorite Penalty'
      : '';

  return {
    reasonCode,
    reasonLabel: modifierLabel ? `${baseReasonLabel} + ${modifierLabel}` : baseReasonLabel,
    baseReasonLabel,
    modifierCode,
    modifierLabel,
  };
};

const summarizePlayers = (players = []) => players
  .map((player) => String(player?.name || '').trim())
  .filter(Boolean)
  .join(' / ');

const getTeamAverageMmr = (players, runningMmrByUid) => {
  if (!Array.isArray(players) || players.length === 0) return 0;
  const total = players.reduce((sum, player) => sum + toNumber(runningMmrByUid.get(player.id), 0), 0);
  return Math.round((total / players.length) * 100) / 100;
};

const getUniqueMatchPlayers = (players = []) => Array.from(
  new Map(
    (Array.isArray(players) ? players : [])
      .filter((player) => player && typeof player?.id === 'string' && player.id.trim().length > 0)
      .map((player) => [player.id, player])
  ).values()
);

const collectParticipantUids = (tournamentData) => {
  const uids = new Set();
  const rounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];

  for (const round of rounds) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    for (const match of matches) {
      const teamAPlayers = getUniqueMatchPlayers(match?.teamA?.players);
      const teamBPlayers = getUniqueMatchPlayers(match?.teamB?.players);
      for (const player of [...teamAPlayers, ...teamBPlayers]) {
        const uid = typeof player?.id === 'string' ? player.id.trim() : '';
        if (uid && isLikelyFirebaseUid(uid)) uids.add(uid);
      }
    }
  }

  return Array.from(uids);
};

const loadCurrentMmrByUid = async (uids) => {
  if (!Array.isArray(uids) || uids.length === 0) return new Map();

  const statsRefs = uids.map((uid) => db.collection('player_stats').doc(uid));
  const userRefs = uids.map((uid) => db.collection('users').doc(uid));
  const [statsDocs, userDocs] = await Promise.all([
    db.getAll(...statsRefs),
    db.getAll(...userRefs),
  ]);

  const baselineMmrByUid = new Map();
  uids.forEach((uid, index) => {
    const statsData = statsDocs[index]?.data() || {};
    const userData = userDocs[index]?.data() || {};
    const statsMmr = toNumber(statsData?.mmr, NaN);
    const userMmr = toNumber(userData?.mmr, NaN);
    baselineMmrByUid.set(
      uid,
      Number.isFinite(statsMmr) ? statsMmr : (Number.isFinite(userMmr) ? userMmr : 0)
    );
  });

  return baselineMmrByUid;
};

const collectTournamentAggregates = (tournamentData, tournamentId, baselineMmrByUid = new Map()) => {
  const rounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];
  const format = tournamentData?.format || 'Americano';
  const tournamentName = typeof tournamentData?.name === 'string' ? tournamentData.name : '';
  const hostUid = typeof tournamentData?.userId === 'string' ? tournamentData.userId : '';
  const participantMap = new Map();
  const ledgerEntries = [];
  const runningMmrByUid = new Map(baselineMmrByUid);
  let matchSequence = 0;

  const upsertParticipant = ({
    participant,
    ownScore,
    opponentScore,
    match,
    team,
    ownTeamPlayers,
    opponentPlayers,
    ownTeamAverageMmr,
    opponentTeamAverageMmr,
    isUnderdog,
    isFavorite,
  }) => {
    const uid = typeof participant?.id === 'string' ? participant.id.trim() : '';
    if (!uid || !isLikelyFirebaseUid(uid)) return;

    const safeOwnScore = toNumber(ownScore, 0);
    const safeOpponentScore = toNumber(opponentScore, 0);
    const scoreDiff = Math.abs(safeOwnScore - safeOpponentScore);
    const isDraw = safeOwnScore === safeOpponentScore;
    const isWin = safeOwnScore > safeOpponentScore;
    const currentMmrBefore = toNumber(runningMmrByUid.get(uid), 0);
    const baseDeltaMmr = isDraw ? 0 : getBaseMMRChange(isWin, scoreDiff);
    const modifierDeltaMmr = isDraw ? 0 : getModifierMMRChange(isWin, isUnderdog, isFavorite);
    const deltaMmr = isDraw ? 0 : calculateMMRChange(isWin, scoreDiff, isUnderdog, isFavorite);
    const mmrAfter = currentMmrBefore + deltaMmr;
    const reason = buildResultReason(isDraw, isWin, scoreDiff, isUnderdog, isFavorite);
    const existing = participantMap.get(uid) || {
      uid,
      displayName: participant?.name || '',
      photoURL: participant?.avatar || '',
      matches: 0,
      wins: 0,
      losses: 0,
      mmrDelta: 0,
      latestMmr: currentMmrBefore,
    };

    existing.matches += 1;
    if (isWin) existing.wins += 1;
    if (!isWin && !isDraw) existing.losses += 1;
    existing.mmrDelta += deltaMmr;
    existing.latestMmr = mmrAfter;
    if (!existing.displayName && participant?.name) existing.displayName = participant.name;
    if (!existing.photoURL && participant?.avatar) existing.photoURL = participant.avatar;
    participantMap.set(uid, existing);
    runningMmrByUid.set(uid, mmrAfter);

    const ledgerId = toSafeDocId(`${tournamentId}_${match.id}_${uid}`);
    ledgerEntries.push({
      id: ledgerId,
      uid,
      playerName: participant?.name || '',
      tournamentId,
      tournamentName,
      matchId: match.id,
      roundId: Number(match.roundId || 0),
      matchSequence,
      format,
      team,
      scoreFor: safeOwnScore,
      scoreAgainst: safeOpponentScore,
      scoreDiff,
      result: isDraw ? 'draw' : (isWin ? 'win' : 'loss'),
      teamSummary: summarizePlayers(ownTeamPlayers),
      opponentSummary: summarizePlayers(opponentPlayers),
      teamAverageMmr: ownTeamAverageMmr,
      opponentAverageMmr: opponentTeamAverageMmr,
      isUnderdog: Boolean(!isDraw && isUnderdog),
      isFavorite: Boolean(!isDraw && isFavorite),
      mmrBefore: currentMmrBefore,
      mmrAfter,
      baseDeltaMmr,
      modifierDeltaMmr,
      reasonCode: reason.reasonCode,
      reasonLabel: reason.reasonLabel,
      baseReasonLabel: reason.baseReasonLabel,
      modifierCode: reason.modifierCode,
      modifierLabel: reason.modifierLabel,
      deltaMmr,
      hostUid,
      playedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      source: 'cloud_function_v2',
    });
  };

  for (const round of rounds.sort((a, b) => toNumber(a?.id, 0) - toNumber(b?.id, 0))) {
    const matches = Array.isArray(round?.matches) ? round.matches : [];
    for (const match of matches) {
      if (!match || match.status === 'pending') continue;
      matchSequence += 1;
      const teamAPlayers = getUniqueMatchPlayers(match?.teamA?.players).filter((player) => isLikelyFirebaseUid(player.id));
      const teamBPlayers = getUniqueMatchPlayers(match?.teamB?.players).filter((player) => isLikelyFirebaseUid(player.id));
      const teamAScore = toNumber(match?.teamA?.score, 0);
      const teamBScore = toNumber(match?.teamB?.score, 0);
      const teamAAverageMmr = getTeamAverageMmr(teamAPlayers, runningMmrByUid);
      const teamBAverageMmr = getTeamAverageMmr(teamBPlayers, runningMmrByUid);
      const teamAIsUnderdog = teamAAverageMmr < teamBAverageMmr;
      const teamAIsFavorite = teamAAverageMmr > teamBAverageMmr;
      const teamBIsUnderdog = teamBAverageMmr < teamAAverageMmr;
      const teamBIsFavorite = teamBAverageMmr > teamAAverageMmr;

      for (const player of teamAPlayers) {
        upsertParticipant({
          participant: player,
          ownScore: teamAScore,
          opponentScore: teamBScore,
          match,
          team: 'A',
          ownTeamPlayers: teamAPlayers,
          opponentPlayers: teamBPlayers,
          ownTeamAverageMmr: teamAAverageMmr,
          opponentTeamAverageMmr: teamBAverageMmr,
          isUnderdog: teamAIsUnderdog,
          isFavorite: teamAIsFavorite,
        });
      }
      for (const player of teamBPlayers) {
        upsertParticipant({
          participant: player,
          ownScore: teamBScore,
          opponentScore: teamAScore,
          match,
          team: 'B',
          ownTeamPlayers: teamBPlayers,
          opponentPlayers: teamAPlayers,
          ownTeamAverageMmr: teamBAverageMmr,
          opponentTeamAverageMmr: teamAAverageMmr,
          isUnderdog: teamBIsUnderdog,
          isFavorite: teamBIsFavorite,
        });
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

    const participantUids = collectParticipantUids(after);
    const baselineMmrByUid = await loadCurrentMmrByUid(participantUids);
    const aggregates = collectTournamentAggregates(after, tournamentId, baselineMmrByUid);
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
