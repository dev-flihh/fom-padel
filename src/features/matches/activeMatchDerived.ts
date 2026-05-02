import { type Match, type Round, type TournamentStatsSyncState } from '../../types';
import { formatDurationFromMs } from './matchTimeUtils';

export const getEnteredScoreCountForRound = ({
  round,
  format
}: {
  round: Round | null;
  format: string;
}) => {
  if (!round) return 0;
  if (format === 'Match Play') {
    return round.matches.filter((match) => {
      const hasPointsProgress = (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
      const hasGamesProgress = (match.teamA.score || 0) > 0 || (match.teamB.score || 0) > 0;
      return match.status === 'completed' || hasPointsProgress || hasGamesProgress;
    }).length;
  }
  return round.matches.filter((match) => hasBasicScoreProgress(match)).length;
};

export const getReadyScoreCountForRound = ({
  round,
  format,
  totalPoints
}: {
  round: Round | null;
  format: string;
  totalPoints: number;
}) => {
  if (!round) return 0;
  if (format === 'Match Play') {
    return round.matches.filter((match) => match.status === 'completed').length;
  }

  const hasPointTarget = (totalPoints || 0) > 0;
  return round.matches.filter((match) => {
    const scoreA = match.teamA.score || 0;
    const scoreB = match.teamB.score || 0;
    if (match.status === 'completed') return true;
    if (hasPointTarget) {
      return (scoreA + scoreB === totalPoints) && (scoreA > 0 || scoreB > 0);
    }
    return scoreA > 0 || scoreB > 0;
  }).length;
};

export const getRoundDurationLabel = (round: Round, nowMs: number) => {
  const activeStarted = round.matches
    .filter((match) => match.status === 'active' && typeof match.startedAt === 'number')
    .map((match) => match.startedAt as number);
  if (activeStarted.length > 0) {
    const earliestStartedAt = Math.min(...activeStarted);
    return formatDurationFromMs(nowMs - earliestStartedAt);
  }
  const firstCompletedWithDuration = round.matches.find((match) => !!match.duration);
  return firstCompletedWithDuration?.duration || '00:00';
};

export const getStatsSyncBadge = ({
  isTournamentEnded,
  isSharedViewer,
  statsSyncState
}: {
  isTournamentEnded: boolean;
  isSharedViewer: boolean;
  statsSyncState?: TournamentStatsSyncState | null;
}) => {
  if (!isTournamentEnded || isSharedViewer || !statsSyncState) return null;

  if (statsSyncState === 'syncing') {
    return {
      tone: 'border-sky-200/70 bg-sky-50/95 text-sky-900',
      title: 'Stats syncing',
      message: 'Leaderboard dan riwayat rating sedang diperbarui.'
    };
  }

  if (statsSyncState === 'synced') {
    return {
      tone: 'border-emerald-200/70 bg-emerald-50/95 text-emerald-900',
      title: 'Stats updated',
      message: 'Leaderboard dan riwayat rating sudah sinkron.'
    };
  }

  return {
    tone: 'border-amber-200/70 bg-amber-50/95 text-amber-900',
    title: 'Sync needs retry',
    message: 'Match sudah selesai, tapi sinkronisasi stats belum terkonfirmasi.'
  };
};

const hasBasicScoreProgress = (match: Match) => {
  const scoreA = match.teamA.score || 0;
  const scoreB = match.teamB.score || 0;
  return match.status === 'completed' || scoreA > 0 || scoreB > 0;
};
