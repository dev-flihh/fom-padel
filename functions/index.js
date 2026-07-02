const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const PRIMARY_DATABASE_ID = process.env.FIRESTORE_PRIMARY_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || 'fom-play-sg';
const EPHEMERAL_DATABASE_ID = process.env.FIRESTORE_EPHEMERAL_DATABASE_ID || 'ai-studio-27d60198-41b0-4446-92d0-3c510bc94635';
const db = getFirestore(undefined, PRIMARY_DATABASE_ID);
const ephemeralDb = getFirestore(undefined, EPHEMERAL_DATABASE_ID);
const LEADERBOARD_SNAPSHOT_COLLECTION = 'leaderboard_snapshots';
const LEADERBOARD_LIMIT = 100;
const TOURNAMENT_DETAILS_COLLECTION = 'tournament_details';
const LEADERBOARD_REFRESH_STATE_COLLECTION = 'leaderboard_refresh_state';
const LEADERBOARD_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const isLikelyFirebaseUid = (value = '') => /^[A-Za-z0-9_-]{20,}$/.test(String(value).trim());
const toSafeDocId = (value) => String(value || '').replace(/[^A-Za-z0-9_-]/g, '_');
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const chunkArray = (list = [], size = 200) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const safeSize = Math.max(1, Math.floor(size) || 1);
  const chunks = [];
  for (let index = 0; index < list.length; index += safeSize) {
    chunks.push(list.slice(index, index + safeSize));
  }
  return chunks;
};
const isAdminRequest = (request) => (
  request?.auth?.token?.email === 'falih.hrmn@gmail.com' &&
  request?.auth?.token?.email_verified === true
);
const getProvinceName = (location = '') => {
  const segments = String(location || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : '';
};
const toSafeLeaderboardDocId = (value = '') => {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'unknown';
};

const DOMINANT_SCORE_SHARE_THRESHOLD = 0.7;
const DRAW_BASE_MMR_CHANGE = 8;
const DRAW_UNDERDOG_MMR_STEP = 50;
const DRAW_UNDERDOG_BONUS_PER_STEP = 3;
const DRAW_UNDERDOG_BONUS_CAP = 20;

const isDominantScoreline = (ownScore, opponentScore) => {
  const safeOwnScore = Math.max(0, toNumber(ownScore, 0));
  const safeOpponentScore = Math.max(0, toNumber(opponentScore, 0));
  if (safeOwnScore === safeOpponentScore) return false;
  const totalScore = safeOwnScore + safeOpponentScore;
  if (totalScore <= 0) return false;
  const winnerScore = Math.max(safeOwnScore, safeOpponentScore);
  return (winnerScore / totalScore) >= DOMINANT_SCORE_SHARE_THRESHOLD;
};

const getDrawMMRChange = (teamAverageMmr, opponentAverageMmr) => {
  const strengthGap = toNumber(opponentAverageMmr, 0) - toNumber(teamAverageMmr, 0);
  if (strengthGap <= 0) return DRAW_BASE_MMR_CHANGE;
  const bonus = Math.min(
    DRAW_UNDERDOG_BONUS_CAP,
    Math.floor(strengthGap / DRAW_UNDERDOG_MMR_STEP) * DRAW_UNDERDOG_BONUS_PER_STEP
  );
  return DRAW_BASE_MMR_CHANGE + bonus;
};

const getBaseMMRChange = (isWin, isDominant) => {
  if (isWin) return isDominant ? 40 : 25;
  return isDominant ? -35 : -20;
};

const getModifierMMRChange = (isWin, isUnderdog, isFavorite) => {
  if (isWin && isUnderdog) return 15;
  if (!isWin && isFavorite) return -15;
  return 0;
};

const calculateMMRChange = (isWin, isDominant, isUnderdog = false, isFavorite = false) => (
  getBaseMMRChange(isWin, isDominant) + getModifierMMRChange(isWin, isUnderdog, isFavorite)
);

const buildResultReason = (isDraw, isWin, isDominant, isUnderdog, isFavorite, modifierDeltaMmr = 0) => {
  if (isDraw) {
    const hasUnderdogBonus = modifierDeltaMmr > 0 && isUnderdog;
    return {
      reasonCode: hasUnderdogBonus ? 'underdog_draw' : 'draw',
      reasonLabel: hasUnderdogBonus ? 'Draw + Underdog Bonus' : 'Draw Reward',
      baseReasonLabel: 'Draw Reward',
      modifierCode: hasUnderdogBonus ? 'underdog_draw_bonus' : 'none',
      modifierLabel: hasUnderdogBonus ? 'Underdog Draw Bonus' : '',
    };
  }

  const reasonCode = isWin
    ? (isDominant ? 'dominant_win' : 'standard_win')
    : (isDominant ? 'heavy_loss' : 'standard_loss');
  const baseReasonLabel = isWin
    ? (isDominant ? 'Dominant Win' : 'Standard Win')
    : (isDominant ? 'Heavy Loss' : 'Standard Loss');
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

const buildPlayerStatsProfileMirror = (userId, userData = {}) => {
  const region = typeof userData?.region === 'string' ? userData.region : '';
  const homeBase = typeof userData?.homeBase === 'string' ? userData.homeBase : '';
  const province = getProvinceName(region || homeBase);
  const payload = {
    uid: userId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof userData?.displayName === 'string') payload.displayName = userData.displayName;
  if (typeof userData?.photoURL === 'string') payload.photoURL = userData.photoURL;
  if (region) payload.region = region;
  if (homeBase) payload.homeBase = homeBase;
  if (province) payload.province = province;
  if (typeof userData?.username === 'string') payload.username = userData.username;

  return payload;
};

const buildFriendMirrorPayload = (userId, userData = {}) => {
  const payload = {
    uid: userId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof userData?.displayName === 'string') payload.displayName = userData.displayName;
  if (typeof userData?.photoURL === 'string') payload.photoURL = userData.photoURL;
  if (typeof userData?.username === 'string') payload.username = userData.username;
  if (Number.isFinite(Number(userData?.mmr))) payload.mmr = Number(userData.mmr);

  return payload;
};

const buildFriendRequestMirrorPatch = (userId, userData = {}, role = 'requester') => {
  const safeRole = role === 'target' ? 'target' : 'requester';
  const payload = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof userData?.displayName === 'string') payload[`${safeRole}DisplayName`] = userData.displayName;
  if (typeof userData?.photoURL === 'string') payload[`${safeRole}PhotoURL`] = userData.photoURL;
  if (typeof userData?.username === 'string') payload[`${safeRole}Username`] = userData.username;
  if (Number.isFinite(Number(userData?.mmr))) payload[`${safeRole}Mmr`] = Number(userData.mmr);

  return payload;
};

const getLeaderboardProvinceFromStats = (stats = {}) => getProvinceName(
  (typeof stats?.province === 'string' && stats.province) ||
  (typeof stats?.region === 'string' && stats.region) ||
  (typeof stats?.homeBase === 'string' && stats.homeBase) ||
  ''
);

const isEligibleLeaderboardUser = (stats = {}, fallbackUid = '') => {
  const uid = typeof stats?.uid === 'string' && stats.uid.trim() ? stats.uid.trim() : fallbackUid;
  const displayName = typeof stats?.displayName === 'string' ? stats.displayName.trim() : '';
  const normalizedDisplayName = displayName.toLowerCase().replace(/\s+/g, ' ').trim();
  const blockedPlaceholderNames = new Set(['player padel', 'pemain padel']);

  if (!uid || !displayName) return false;
  if (blockedPlaceholderNames.has(normalizedDisplayName)) return false;
  if (!isLikelyFirebaseUid(uid)) return false;
  return true;
};

const toLeaderboardEntry = (stats = {}, fallbackUid = '') => {
  const uid = typeof stats?.uid === 'string' && stats.uid.trim() ? stats.uid.trim() : fallbackUid;
  const mmr = toNumber(stats?.mmr, 0);
  const totalMatches = Math.max(0, toNumber(stats?.totalMatches, 0));
  const wins = Math.max(0, toNumber(stats?.wins, 0));
  const losses = Math.max(0, toNumber(stats?.losses, 0));
  const province = getLeaderboardProvinceFromStats(stats);

  return {
    uid,
    displayName: typeof stats?.displayName === 'string' ? stats.displayName : '',
    photoURL: typeof stats?.photoURL === 'string' ? stats.photoURL : '',
    username: typeof stats?.username === 'string' ? stats.username : '',
    region: typeof stats?.region === 'string' ? stats.region : '',
    homeBase: typeof stats?.homeBase === 'string' ? stats.homeBase : '',
    province,
    mmr,
    totalMatches,
    wins,
    losses,
  };
};

const buildLeaderboardSnapshotPayload = (scope, entries, extra = {}) => ({
  scope,
  limit: LEADERBOARD_LIMIT,
  users: entries,
  totalEntries: entries.length,
  updatedAt: FieldValue.serverTimestamp(),
  ...extra,
});

const computeTopLeaderboardEntries = async ({ province = '' } = {}) => {
  let leaderboardQuery = db.collection('player_stats');
  if (province) {
    leaderboardQuery = leaderboardQuery.where('province', '==', province);
  }

  const querySnapshot = await leaderboardQuery
    .orderBy('mmr', 'desc')
    .orderBy('totalMatches', 'desc')
    .orderBy('displayName', 'asc')
    .limit(LEADERBOARD_LIMIT)
    .get();

  const entries = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if (!isEligibleLeaderboardUser(data, docSnap.id)) return;
    entries.push(toLeaderboardEntry(data, docSnap.id));
  });
  return entries;
};

const refreshGlobalLeaderboardSnapshot = async () => {
  const entries = await computeTopLeaderboardEntries();
  await ephemeralDb.collection(LEADERBOARD_SNAPSHOT_COLLECTION).doc('global').set(
    buildLeaderboardSnapshotPayload('global', entries),
    { merge: true }
  );
};

const refreshProvinceLeaderboardSnapshot = async (province) => {
  const safeProvince = String(province || '').trim();
  if (!safeProvince) return;

  const entries = await computeTopLeaderboardEntries({ province: safeProvince });
  await ephemeralDb.collection(LEADERBOARD_SNAPSHOT_COLLECTION).doc(`province_${toSafeLeaderboardDocId(safeProvince)}`).set(
    buildLeaderboardSnapshotPayload('province', entries, {
      province: safeProvince,
    }),
    { merge: true }
  );
};

const buildLeaderboardRefreshScope = ({ province = '' } = {}) => {
  const safeProvince = String(province || '').trim();
  if (!safeProvince) {
    return {
      id: 'global',
      type: 'global',
      province: '',
      snapshotDocId: 'global',
    };
  }

  return {
    id: `province_${toSafeLeaderboardDocId(safeProvince)}`,
    type: 'province',
    province: safeProvince,
    snapshotDocId: `province_${toSafeLeaderboardDocId(safeProvince)}`,
  };
};

const claimLeaderboardRefreshScope = async (scope) => {
  const nowMs = Date.now();
  const stateRef = ephemeralDb.collection(LEADERBOARD_REFRESH_STATE_COLLECTION).doc(scope.id);

  return ephemeralDb.runTransaction(async (tx) => {
    const stateSnap = await tx.get(stateRef);
    const state = stateSnap.exists ? (stateSnap.data() || {}) : {};
    const lastRefreshedAtMs = toNumber(state?.lastRefreshedAtMs, 0);
    const isCoolingDown = lastRefreshedAtMs > 0 && (nowMs - lastRefreshedAtMs) < LEADERBOARD_REFRESH_COOLDOWN_MS;

    if (isCoolingDown) {
      tx.set(stateRef, {
        scopeId: scope.id,
        scopeType: scope.type,
        province: scope.province || '',
        snapshotDocId: scope.snapshotDocId,
        pending: true,
        lastRequestedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return false;
    }

    tx.set(stateRef, {
      scopeId: scope.id,
      scopeType: scope.type,
      province: scope.province || '',
      snapshotDocId: scope.snapshotDocId,
      pending: false,
      lastRequestedAtMs: nowMs,
      lastRefreshedAtMs: nowMs,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
};

const refreshLeaderboardSnapshotWithCooldown = async (scope) => {
  const shouldRefresh = await claimLeaderboardRefreshScope(scope);
  if (!shouldRefresh) {
    logger.info('Leaderboard snapshot refresh deferred by cooldown', {
      scopeId: scope.id,
      scopeType: scope.type,
      province: scope.province || '',
    });
    return false;
  }

  if (scope.type === 'province') {
    await refreshProvinceLeaderboardSnapshot(scope.province);
  } else {
    await refreshGlobalLeaderboardSnapshot();
  }

  logger.info('Leaderboard snapshot refreshed', {
    scopeId: scope.id,
    scopeType: scope.type,
    province: scope.province || '',
  });
  return true;
};

const normalizeProvinceList = (value) => Array.from(new Set(
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
));

const normalizeUserSearchValue = (value = '') => String(value || '').trim();

const toPhoneSearchVariants = (value = '') => {
  const raw = normalizeUserSearchValue(value);
  const digitsOnly = raw.replace(/[^\d+]/g, '');
  return Array.from(new Set([raw, digitsOnly].filter(Boolean)));
};

const buildUserSearchSpecs = (rawValue = '') => {
  const searchVal = normalizeUserSearchValue(rawValue);
  if (!searchVal) return [];

  const usernameValue = searchVal.toLowerCase().replace(/\s/g, '');
  const emailValue = searchVal.toLowerCase();
  const phoneVariants = toPhoneSearchVariants(searchVal);
  const looksLikeEmail = emailValue.includes('@');
  const looksLikePhone = !looksLikeEmail && /^[+\d][\d\s\-()]{5,}$/.test(searchVal);
  const specs = [];
  const pushSpec = (key, field, value) => {
    if (!value) return;
    if (specs.some((item) => item.key === key)) return;
    specs.push({ key, field, value });
  };

  if (looksLikeEmail) {
    pushSpec(`email:${emailValue}`, 'email', emailValue);
  } else if (looksLikePhone) {
    phoneVariants.forEach((phoneValue) => pushSpec(`phone:${phoneValue}`, 'phoneNumber', phoneValue));
  } else {
    pushSpec(`username:${usernameValue}`, 'username', usernameValue);
  }

  pushSpec(`username:${usernameValue}`, 'username', usernameValue);
  pushSpec(`email:${emailValue}`, 'email', emailValue);
  phoneVariants.forEach((phoneValue) => pushSpec(`phone:${phoneValue}`, 'phoneNumber', phoneValue));

  return specs.slice(0, 6);
};

const toSearchUserResult = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    uid: typeof data.uid === 'string' && data.uid.trim() ? data.uid.trim() : docSnap.id,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    username: typeof data.username === 'string' ? data.username : '',
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
    mmr: toNumber(data.mmr, 0),
    totalMatches: Math.max(0, toNumber(data.totalMatches, 0)),
    region: typeof data.region === 'string' ? data.region : '',
    homeBase: typeof data.homeBase === 'string' ? data.homeBase : '',
  };
};

const countCompletedMatches = (rounds = []) => (
  (Array.isArray(rounds) ? rounds : []).reduce((total, round) => (
    total + (Array.isArray(round?.matches) ? round.matches.filter((match) => match && match.status !== 'pending').length : 0)
  ), 0)
);

const buildUserHistorySummaryDoc = (tournamentData, tournamentId, participantSummary = {}) => {
  const safeRounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];
  const safePlayers = Array.isArray(tournamentData?.players) ? tournamentData.players : [];
  const safeDate = tournamentData?.endedAt || tournamentData?.date || FieldValue.serverTimestamp();
  const normalizedNumPlayers = Number.isFinite(Number(tournamentData?.numPlayers))
    ? Number(tournamentData.numPlayers)
    : safePlayers.length;
  const normalizedNumRounds = Number.isFinite(Number(tournamentData?.numRounds))
    ? Number(tournamentData.numRounds)
    : safeRounds.length;

  return {
    id: tournamentId,
    userId: typeof tournamentData?.userId === 'string' ? tournamentData.userId : '',
    name: typeof tournamentData?.name === 'string' ? tournamentData.name : '',
    format: typeof tournamentData?.format === 'string' ? tournamentData.format : 'Americano',
    ...(typeof tournamentData?.backgroundId === 'string' ? { backgroundId: tournamentData.backgroundId } : {}),
    ...(typeof tournamentData?.themeColorId === 'string' ? { themeColorId: tournamentData.themeColorId } : {}),
    ...(typeof tournamentData?.criteria === 'string' ? { criteria: tournamentData.criteria } : {}),
    ...(typeof tournamentData?.scoringType === 'string' ? { scoringType: tournamentData.scoringType } : {}),
    ...(typeof tournamentData?.startedAt === 'number' ? { startedAt: tournamentData.startedAt } : {}),
    ...(tournamentData?.endedAt ? { endedAt: tournamentData.endedAt } : {}),
    date: safeDate,
    ...(Number.isFinite(Number(tournamentData?.courts)) ? { courts: Number(tournamentData.courts) } : {}),
    ...(Number.isFinite(Number(tournamentData?.totalPoints)) ? { totalPoints: Number(tournamentData.totalPoints) } : {}),
    numRounds: normalizedNumRounds,
    numPlayers: normalizedNumPlayers,
    ...(safePlayers.length > 0 ? { players: safePlayers } : {}),
    ...(safeRounds.length > 0 ? { rounds: safeRounds } : {}),
    ...(Array.isArray(tournamentData?.courtChanges) ? { courtChanges: tournamentData.courtChanges } : {}),
    ...(typeof tournamentData?.venueName === 'string' ? { venueName: tournamentData.venueName } : {}),
    ...(typeof tournamentData?.location === 'string' ? { location: tournamentData.location } : {}),
    completedMatchesCount: countCompletedMatches(safeRounds),
    userMatches: Math.max(0, toNumber(participantSummary?.matches, 0)),
    userWins: Math.max(0, toNumber(participantSummary?.wins, 0)),
    userLosses: Math.max(0, toNumber(participantSummary?.losses, 0)),
    userDraws: Math.max(0, toNumber(participantSummary?.draws, 0)),
    userPoints: Math.max(0, toNumber(participantSummary?.points, 0)),
    userMmrDelta: toNumber(participantSummary?.mmrDelta, 0),
    playedAt: tournamentData?.endedAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    hasDetail: true,
    statsVersion: Number.isFinite(Number(tournamentData?.statsVersion)) ? Number(tournamentData.statsVersion) : 1,
    source: 'cloud_function_v2',
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
    const isDominant = isDominantScoreline(safeOwnScore, safeOpponentScore);
    const currentMmrBefore = toNumber(runningMmrByUid.get(uid), 0);
    const drawDeltaMmr = isDraw ? getDrawMMRChange(ownTeamAverageMmr, opponentTeamAverageMmr) : 0;
    const baseDeltaMmr = isDraw ? DRAW_BASE_MMR_CHANGE : getBaseMMRChange(isWin, isDominant);
    const modifierDeltaMmr = isDraw ? Math.max(0, drawDeltaMmr - DRAW_BASE_MMR_CHANGE) : getModifierMMRChange(isWin, isUnderdog, isFavorite);
    const deltaMmr = isDraw ? drawDeltaMmr : calculateMMRChange(isWin, isDominant, isUnderdog, isFavorite);
    const mmrAfter = currentMmrBefore + deltaMmr;
    const reason = buildResultReason(isDraw, isWin, isDominant, isUnderdog, isFavorite, modifierDeltaMmr);
    const existing = participantMap.get(uid) || {
      uid,
      displayName: participant?.name || '',
      photoURL: participant?.avatar || '',
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      mmrDelta: 0,
      latestMmr: currentMmrBefore,
    };

    existing.matches += 1;
    if (isWin) existing.wins += 1;
    if (!isWin && !isDraw) existing.losses += 1;
    if (isDraw) existing.draws += 1;
    existing.points += safeOwnScore;
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
      isUnderdog: Boolean(isUnderdog),
      isFavorite: Boolean(isFavorite),
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
      if (teamAScore + teamBScore <= 0) continue;
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
    database: PRIMARY_DATABASE_ID,
    retry: true,
  },
  async (event) => {
    const tournamentId = event.params.tournamentId;
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;

    const after = afterSnap.data() || {};
    if (!after?.endedAt) return;
    if (Number(after?.statsVersion || 0) >= 1) return;

    const runRef = ephemeralDb.collection('tournament_stat_runs').doc(tournamentId);
    const tournamentRef = db.collection('tournaments').doc(tournamentId);

    const shouldApply = await db.runTransaction(async (tx) => {
      const tournamentDoc = await tx.get(tournamentRef);
      if (!tournamentDoc.exists) return false;
      const tournamentData = tournamentDoc.data() || {};
      if (!tournamentData?.endedAt) return false;
      if (Number(tournamentData?.statsVersion || 0) >= 1) return false;
      tx.set(tournamentRef, {
        statsVersion: 1,
        statsAppliedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });

    if (!shouldApply) return;

    await runRef.set({
      tournamentId,
      hostUid: typeof after?.userId === 'string' ? after.userId : '',
      source: 'cloud_function_v1',
      appliedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    let tournamentDataForStats = after;
    if (!Array.isArray(after?.rounds) || after.rounds.length === 0) {
      const detailSnap = await db.collection(TOURNAMENT_DETAILS_COLLECTION).doc(tournamentId).get();
      if (detailSnap.exists) {
        tournamentDataForStats = {
          ...after,
          ...(detailSnap.data() || {}),
          id: tournamentId,
        };
      }
    }

    const participantUids = collectParticipantUids(tournamentDataForStats);
    const baselineMmrByUid = await loadCurrentMmrByUid(participantUids);
    const aggregates = collectTournamentAggregates(tournamentDataForStats, tournamentId, baselineMmrByUid);
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

      const historyRef = db.collection('users').doc(summary.uid).collection('history_summary').doc(tournamentId);
      batch.set(historyRef, buildUserHistorySummaryDoc(tournamentDataForStats, tournamentId, summary), { merge: true });
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

exports.syncUserProfileToPlayerStats = onDocumentWritten(
  {
    document: 'users/{userId}',
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (event) => {
    const userId = typeof event.params?.userId === 'string' ? event.params.userId.trim() : '';
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    if (!userId || !afterSnap?.exists) return;

    const before = beforeSnap?.exists ? (beforeSnap.data() || {}) : {};
    const after = afterSnap.data() || {};
    const trackedFields = ['displayName', 'photoURL', 'region', 'homeBase', 'username'];
    const hasTrackedProfileChange = trackedFields.some((field) => {
      const beforeValue = typeof before?.[field] === 'string' ? before[field] : '';
      const afterValue = typeof after?.[field] === 'string' ? after[field] : '';
      return beforeValue !== afterValue;
    });

    if (!hasTrackedProfileChange) return;

    await db.collection('player_stats').doc(userId).set(
      buildPlayerStatsProfileMirror(userId, after),
      { merge: true }
    );
  }
);

exports.syncUserProfileToSocialDocs = onDocumentWritten(
  {
    document: 'users/{userId}',
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (event) => {
    const userId = typeof event.params?.userId === 'string' ? event.params.userId.trim() : '';
    const afterSnap = event.data?.after;
    const beforeSnap = event.data?.before;
    if (!userId || !afterSnap?.exists) return;

    const before = beforeSnap?.exists ? (beforeSnap.data() || {}) : {};
    const after = afterSnap.data() || {};
    const trackedFields = ['displayName', 'photoURL', 'username'];
    const hasTrackedChange = trackedFields.some((field) => {
      const beforeValue = before?.[field] ?? null;
      const afterValue = after?.[field] ?? null;
      return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
    });

    if (!hasTrackedChange) return;

    const writer = db.bulkWriter();
    const friendPatch = buildFriendMirrorPayload(userId, after);
    const requesterPatch = buildFriendRequestMirrorPatch(userId, after, 'requester');
    const targetPatch = buildFriendRequestMirrorPatch(userId, after, 'target');

    const [
      friendDocs,
      incomingRequestDocs,
      outgoingRequestDocs,
      sentAsRequesterDocs,
      sentAsTargetDocs,
    ] = await Promise.all([
      db.collectionGroup('friends').where('uid', '==', userId).get(),
      db.collectionGroup('friendRequests').where('requesterUid', '==', userId).get(),
      db.collectionGroup('friendRequests').where('targetUid', '==', userId).get(),
      db.collectionGroup('sentFriendRequests').where('requesterUid', '==', userId).get(),
      db.collectionGroup('sentFriendRequests').where('targetUid', '==', userId).get(),
    ]);

    friendDocs.forEach((docSnap) => {
      writer.set(docSnap.ref, friendPatch, { merge: true });
    });
    incomingRequestDocs.forEach((docSnap) => {
      writer.set(docSnap.ref, requesterPatch, { merge: true });
    });
    outgoingRequestDocs.forEach((docSnap) => {
      writer.set(docSnap.ref, targetPatch, { merge: true });
    });
    sentAsRequesterDocs.forEach((docSnap) => {
      writer.set(docSnap.ref, requesterPatch, { merge: true });
    });
    sentAsTargetDocs.forEach((docSnap) => {
      writer.set(docSnap.ref, targetPatch, { merge: true });
    });

    await writer.close();
  }
);

exports.refreshLeaderboardSnapshots = onDocumentWritten(
  {
    document: 'player_stats/{userId}',
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const before = beforeSnap?.exists ? (beforeSnap.data() || {}) : {};
    const after = afterSnap?.exists ? (afterSnap.data() || {}) : {};
    const trackedProfileFields = ['displayName', 'photoURL', 'username', 'region', 'homeBase', 'province'];
    const trackedRankingFields = ['mmr', 'totalMatches', 'wins', 'losses'];
    const hasRelevantChange =
      !beforeSnap?.exists ||
      !afterSnap?.exists ||
      [...trackedProfileFields, ...trackedRankingFields].some((field) => {
        const beforeValue = before?.[field] ?? null;
        const afterValue = after?.[field] ?? null;
        return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
      });

    if (!hasRelevantChange) return;

    const affectedProvinces = new Set([
      getLeaderboardProvinceFromStats(before),
      getLeaderboardProvinceFromStats(after),
    ].filter(Boolean));

    const scopes = [
      buildLeaderboardRefreshScope(),
      ...Array.from(affectedProvinces).map((province) => buildLeaderboardRefreshScope({ province })),
    ];

    await Promise.all(scopes.map((scope) => refreshLeaderboardSnapshotWithCooldown(scope)));
  }
);

exports.deleteTournamentHistory = onCall(
  {
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (request) => {
    const requesterUid = typeof request.auth?.uid === 'string' ? request.auth.uid.trim() : '';
    if (!requesterUid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    const tournamentId = typeof request.data?.tournamentId === 'string'
      ? request.data.tournamentId.trim()
      : '';
    if (!tournamentId) {
      throw new HttpsError('invalid-argument', 'Tournament ID is required.');
    }

    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) {
      return {
        success: true,
        tournamentId,
        alreadyDeleted: true,
        rolledBackStats: false,
        deletedLedgerEntries: 0,
      };
    }

    const tournamentData = tournamentSnap.data() || {};
    const ownerUid = typeof tournamentData?.userId === 'string' ? tournamentData.userId.trim() : '';
    if (ownerUid !== requesterUid && !isAdminRequest(request)) {
      throw new HttpsError('permission-denied', 'You do not have access to delete this tournament.');
    }

    const ledgerSnapshot = await db.collection('player_match_ledger')
      .where('tournamentId', '==', tournamentId)
      .get();

    const rollbackByUid = new Map();
    ledgerSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
      if (!uid) return;

      const existing = rollbackByUid.get(uid) || {
        uid,
        mmrDelta: 0,
        matches: 0,
        wins: 0,
        losses: 0,
      };

      existing.mmrDelta += toNumber(data?.deltaMmr, 0);
      existing.matches += 1;
      if (data?.result === 'win') existing.wins += 1;
      if (data?.result === 'loss') existing.losses += 1;
      rollbackByUid.set(uid, existing);
    });

    const writer = db.bulkWriter();
    const rollbackEntries = Array.from(rollbackByUid.values());

    rollbackEntries.forEach((summary) => {
      writer.set(db.collection('player_stats').doc(summary.uid), {
        uid: summary.uid,
        mmr: FieldValue.increment(-summary.mmrDelta),
        totalMatches: FieldValue.increment(-summary.matches),
        wins: FieldValue.increment(-summary.wins),
        losses: FieldValue.increment(-summary.losses),
        updatedAt: FieldValue.serverTimestamp(),
        lastDeletedTournamentId: tournamentId,
      }, { merge: true });

      writer.delete(db.collection('users').doc(summary.uid).collection('history_summary').doc(tournamentId));
    });

    chunkArray(ledgerSnapshot.docs, 400).forEach((batchDocs) => {
      batchDocs.forEach((docSnap) => writer.delete(docSnap.ref));
    });

    writer.delete(db.collection(TOURNAMENT_DETAILS_COLLECTION).doc(tournamentId));
    writer.delete(tournamentRef);

    await writer.close();
    await ephemeralDb.collection('tournament_stat_runs').doc(tournamentId).delete().catch(() => {});

    logger.info('Tournament history deleted', {
      tournamentId,
      requesterUid,
      ownerUid,
      rolledBackParticipants: rollbackEntries.length,
      deletedLedgerEntries: ledgerSnapshot.size,
    });

    return {
      success: true,
      tournamentId,
      alreadyDeleted: false,
      rolledBackStats: ledgerSnapshot.size > 0,
      deletedLedgerEntries: ledgerSnapshot.size,
      rolledBackParticipants: rollbackEntries.length,
    };
  }
);

exports.rebuildLeaderboardSnapshots = onCall(
  {
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    if (!isAdminRequest(request)) {
      throw new HttpsError('permission-denied', 'Only admins can rebuild leaderboard snapshots.');
    }

    const requestedProvinces = normalizeProvinceList(request.data?.provinces);
    await refreshGlobalLeaderboardSnapshot();

    if (requestedProvinces.length > 0) {
      await Promise.all(requestedProvinces.map((province) => refreshProvinceLeaderboardSnapshot(province)));
    }

    logger.info('Leaderboard snapshots rebuilt manually', {
      requesterUid: request.auth.uid,
      provinces: requestedProvinces,
    });

    return {
      success: true,
      scope: requestedProvinces.length > 0 ? 'global+provinces' : 'global',
      provinces: requestedProvinces,
    };
  }
);

exports.processPendingLeaderboardRefreshes = onCall(
  {
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    if (!isAdminRequest(request)) {
      throw new HttpsError('permission-denied', 'Only admins can process pending leaderboard refreshes.');
    }

    const pendingSnapshot = await ephemeralDb.collection(LEADERBOARD_REFRESH_STATE_COLLECTION)
      .where('pending', '==', true)
      .limit(20)
      .get();

    const refreshed = [];
    for (const docSnap of pendingSnapshot.docs) {
      const state = docSnap.data() || {};
      const scopeType = state.scopeType === 'province' ? 'province' : 'global';
      const province = typeof state.province === 'string' ? state.province : '';
      const scope = scopeType === 'province'
        ? buildLeaderboardRefreshScope({ province })
        : buildLeaderboardRefreshScope();

      const didRefresh = await refreshLeaderboardSnapshotWithCooldown(scope);
      if (didRefresh) refreshed.push(scope.id);
    }

    return {
      success: true,
      checked: pendingSnapshot.size,
      refreshed,
    };
  }
);

exports.searchUsers = onCall(
  {
    database: PRIMARY_DATABASE_ID,
    retry: false,
  },
  async (request) => {
    const requesterUid = typeof request.auth?.uid === 'string' ? request.auth.uid.trim() : '';
    if (!requesterUid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    const rawQuery = typeof request.data?.query === 'string' ? request.data.query.trim() : '';
    if (rawQuery.length < 2 || rawQuery.length > 120) {
      throw new HttpsError('invalid-argument', 'Search query must be between 2 and 120 characters.');
    }

    const specs = buildUserSearchSpecs(rawQuery);
    const seenUids = new Set();
    const results = [];
    let queryCount = 0;
    let readDocs = 0;

    for (const spec of specs) {
      queryCount += 1;
      const snapshot = await db.collection('users')
        .where(spec.field, '==', spec.value)
        .limit(5)
        .get();
      readDocs += snapshot.size;

      snapshot.forEach((docSnap) => {
        const user = toSearchUserResult(docSnap);
        if (!user.uid || user.uid === requesterUid || seenUids.has(user.uid)) return;
        seenUids.add(user.uid);
        results.push(user);
      });

      if (results.length > 0) break;
    }

    return {
      results: results.slice(0, 5),
      meta: {
        queryCount,
        readDocs,
      },
    };
  }
);
