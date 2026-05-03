import type { Tournament, TournamentHistory } from '../../types';
import { normalizeCourtChanges } from './historyPersistence';

export const hasTournamentDetailPayload = (history: TournamentHistory | null | undefined) => (
  Boolean(
    history &&
    Array.isArray(history.rounds) &&
    history.rounds.length > 0 &&
    Array.isArray(history.players) &&
    history.players.length > 0
  )
);

export const buildReadOnlyTournamentFromHistory = (history: TournamentHistory): Tournament => {
  const rounds = (history.rounds || []).map((round) => ({
    ...round,
    playersBye: Array.isArray(round.playersBye) ? round.playersBye : [],
  }));
  const fallbackStartedAt = typeof history.startedAt === 'number'
    ? history.startedAt
    : (history.date ? new Date(history.date).getTime() : undefined);
  const fallbackEndedAt = typeof history.endedAt === 'number'
    ? history.endedAt
    : fallbackStartedAt;
  const detectedCourts = Math.max(1, ...rounds.flatMap((round) => round.matches.map((match) => match.court || 1)));
  const maxKnownMatchPoints = rounds.reduce((maxPoints, round) => (
    round.matches.reduce((roundMax, match) => (
      Math.max(roundMax, (match.teamA.score || 0) + (match.teamB.score || 0))
    ), maxPoints)
  ), 0);

  return {
    id: history.id,
    name: history.name,
    format: history.format,
    backgroundId: history.backgroundId,
    themeColorId: history.themeColorId,
    criteria: history.criteria || 'Points Won',
    scoringType: history.scoringType,
    startedAt: fallbackStartedAt,
    endedAt: fallbackEndedAt,
    courts: history.courts || detectedCourts,
    totalPoints: history.totalPoints ?? (history.format === 'Match Play' ? 0 : Math.max(21, maxKnownMatchPoints || 21)),
    players: history.players || [],
    courtChanges: normalizeCourtChanges(history.courtChanges),
    rounds,
    numRounds: history.numRounds || rounds.length || 1,
    venueName: history.venueName,
    location: history.location,
  };
};
