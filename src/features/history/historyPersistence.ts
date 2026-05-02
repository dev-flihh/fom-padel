import { type CourtChange, type Tournament, type TournamentHistory } from '../../types';
import { formatDurationFromMs } from '../matches/matchTimeUtils';

export const SHARE_WRITE_TIMEOUT_MS = 3500;
export const HISTORY_QUERY_TIMEOUT_MS = 6000;
export const TOURNAMENT_HISTORY_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
export const HISTORY_RECENT_FETCH_LIMIT = 12;
export const HISTORY_LEDGER_FALLBACK_LIMIT = 120;
export const PLAYER_STATS_REFRESH_MIN_AGE_MS = 5 * 60 * 1000;

export const normalizeCourtChanges = (rawCourtChanges?: CourtChange[]) => {
  if (!Array.isArray(rawCourtChanges) || rawCourtChanges.length === 0) return [];
  return rawCourtChanges
    .map((change) => ({
      effectiveFromRoundId: Math.max(1, Math.floor(Number(change?.effectiveFromRoundId) || 1)),
      fromCourts: Math.max(1, Math.floor(Number(change?.fromCourts) || 1)),
      toCourts: Math.max(1, Math.floor(Number(change?.toCourts) || 1)),
      changedAt: Number.isFinite(Number(change?.changedAt))
        ? Number(change.changedAt)
        : Date.now()
    }))
    .sort((a, b) => a.changedAt - b.changedAt);
};

const hashStringToInt = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

export const getTournamentVisualSeed = (tournament: Tournament | TournamentHistory) => {
  const explicitId =
    'id' in tournament && typeof tournament.id === 'string' && tournament.id.trim().length > 0
      ? tournament.id.trim()
      : '';
  const startedAtOrDate =
    'startedAt' in tournament && typeof tournament.startedAt === 'number'
      ? tournament.startedAt
      : ('date' in tournament && tournament.date ? new Date(tournament.date).getTime() : 0);
  const stableKey = explicitId || [
    tournament.name || '',
    tournament.format || '',
    tournament.venueName || '',
    tournament.location || '',
    String(startedAtOrDate || 0)
  ].join('|');
  return Math.abs(hashStringToInt(stableKey));
};

export const normalizeHistoryTournament = (rawItem: TournamentHistory): TournamentHistory => {
  const rawDate: any = rawItem?.date;
  const normalizedDate = rawDate?.toDate
    ? rawDate.toDate()
    : rawDate instanceof Date
      ? rawDate
      : typeof rawDate === 'number'
        ? new Date(rawDate)
        : typeof rawDate === 'string'
          ? new Date(rawDate)
          : new Date();
  const rounds = Array.isArray(rawItem.rounds) ? rawItem.rounds : [];
  if (rounds.length === 0) {
    return { ...rawItem, date: normalizedDate };
  }

  const fallbackEndedAt = typeof rawItem.endedAt === 'number'
    ? rawItem.endedAt
    : normalizedDate.getTime();

  let hasStatusRepair = false;
  const normalizedRounds = rounds.map((round) => ({
    ...round,
    playersBye: Array.isArray(round.playersBye) ? round.playersBye : [],
    matches: (round.matches || []).map((match) => {
      if (match.status === 'completed') return match;
      hasStatusRepair = true;
      const repairedDuration = match.duration || (
        typeof match.startedAt === 'number'
          ? formatDurationFromMs(Math.max(0, fallbackEndedAt - match.startedAt))
          : '00:00'
      );
      return {
        ...match,
        status: 'completed' as const,
        duration: repairedDuration
      };
    })
  }));

  return {
    ...rawItem,
    date: normalizedDate,
    endedAt: rawItem.endedAt ?? (hasStatusRepair ? fallbackEndedAt : rawItem.endedAt),
    courtChanges: normalizeCourtChanges(rawItem.courtChanges),
    rounds: normalizedRounds
  };
};

export const getPlayersStorageKey = (uid: string) => `gas_padel_players_${uid}`;
export const getTournamentStorageKey = (uid: string) => `fom_play_active_tournament_${uid}`;
export const getTournamentHistoryStorageKey = (uid: string) => `fom_play_tournament_history_${uid}`;
export const getTournamentHistoryMetaStorageKey = (uid: string) => `fom_play_tournament_history_meta_${uid}`;
export const getTournamentShareStorageKey = (uid: string, startedAt?: number) => `fom_play_share_id_${uid}_${startedAt || 'none'}`;

export const invalidateTournamentHistoryCacheMetadata = (uid: string) => {
  try {
    localStorage.removeItem(getTournamentHistoryMetaStorageKey(uid));
  } catch (err) {
    console.error('Invalidate tournament history cache metadata error:', err);
  }
};

export const readTournamentHistoryCacheSavedAt = (uid: string) => {
  try {
    const raw = localStorage.getItem(getTournamentHistoryMetaStorageKey(uid));
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { savedAt?: number };
    const savedAt = Number(parsed?.savedAt || 0);
    return Number.isFinite(savedAt) ? savedAt : 0;
  } catch (err) {
    console.error('Read tournament history cache metadata error:', err);
    return 0;
  }
};
