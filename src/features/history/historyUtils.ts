import { type Match, type TournamentHistory } from '../../types';

export type CompletedMatchHistoryItem = {
  id: string;
  tournament: TournamentHistory;
  roundId: number;
  match: Match;
};

export const getTournamentDateMs = (tournament: TournamentHistory) => {
  const rawDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
  return Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();
};

export const sortTournamentsByNewest = (tournaments: TournamentHistory[]) => (
  [...tournaments].sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a))
);

export const buildCompletedMatchHistoryItems = (
  tournaments: TournamentHistory[],
  limit: number = Number.MAX_SAFE_INTEGER
): CompletedMatchHistoryItem[] => {
  const sortedTournaments = sortTournamentsByNewest(tournaments);
  const items: CompletedMatchHistoryItem[] = [];

  for (const tournament of sortedTournaments) {
    const rounds = [...(tournament.rounds || [])].sort((a, b) => b.id - a.id);
    for (const round of rounds) {
      const matches = (round.matches || []).filter((match) => match.status !== 'pending');
      for (const match of matches) {
        items.push({
          id: `${tournament.id}-${round.id}-${match.id}`,
          tournament,
          roundId: round.id,
          match
        });
        if (items.length >= limit) return items;
      }
    }
  }

  return items;
};

export const getCompletedMatchesCount = (tournament: TournamentHistory) => {
  const storedCount = Number(tournament?.completedMatchesCount);
  if (Number.isFinite(storedCount) && storedCount >= 0) return storedCount;
  return buildCompletedMatchHistoryItems([tournament]).length;
};
