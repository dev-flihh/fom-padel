import { type Match, type TournamentHistory } from '../../types';

export type HistoryFormatFilter = 'all' | 'mexicano' | 'americano' | 'match-play' | 'unknown';

export type CompletedMatchHistoryItem = {
  id: string;
  tournament: TournamentHistory;
  roundId: number;
  match: Match;
};

export type TournamentHistoryMonthGroup = {
  id: string;
  monthLabel: string;
  yearLabel: string;
  tournaments: TournamentHistory[];
};

export const getTournamentDateMs = (tournament: TournamentHistory) => {
  const rawDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
  return Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();
};

export const sortTournamentsByNewest = (tournaments: TournamentHistory[]) => (
  [...tournaments].sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a))
);

export const normalizeHistoryFormat = (format?: string): HistoryFormatFilter => {
  const normalized = (format || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (normalized === 'mexicano') return 'mexicano';
  if (normalized === 'americano') return 'americano';
  if (normalized === 'match-play' || normalized === 'matchplay') return 'match-play';
  return 'unknown';
};

export const getHistoryFormatTheme = (format?: string) => {
  const key = normalizeHistoryFormat(format);
  if (key === 'mexicano') return { key, label: 'Mexicano', color: '#e65e14' };
  if (key === 'americano') return { key, label: 'Americano', color: '#2f6fe4' };
  if (key === 'match-play') return { key, label: 'Match Play', color: '#18a486' };
  return { key, label: format || 'Unknown', color: '#8e8e93' };
};

export const groupTournamentsByMonth = (tournaments: TournamentHistory[]): TournamentHistoryMonthGroup[] => {
  const groups: TournamentHistoryMonthGroup[] = [];
  const groupIndexById = new Map<string, number>();

  for (const tournament of tournaments) {
    const rawDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
    const hasValidDate = !Number.isNaN(rawDate.getTime());
    const id = hasValidDate
      ? `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}`
      : 'unknown-date';
    const monthLabel = hasValidDate
      ? rawDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
      : 'UNKNOWN';
    const yearLabel = hasValidDate
      ? rawDate.getFullYear().toString()
      : 'DATE';
    const existingIndex = groupIndexById.get(id);

    if (existingIndex === undefined) {
      groupIndexById.set(id, groups.length);
      groups.push({ id, monthLabel, yearLabel, tournaments: [tournament] });
    } else {
      groups[existingIndex].tournaments.push(tournament);
    }
  }

  return groups;
};

export const countUniqueHistoryPlayers = (tournaments: TournamentHistory[]) => {
  const players = new Set<string>();
  let fallbackPlayerEntries = 0;

  for (const tournament of tournaments) {
    if (!tournament.players?.length) {
      fallbackPlayerEntries += Number(tournament.numPlayers || 0);
      continue;
    }

    for (const player of tournament.players) {
      const id = player.id?.trim();
      const name = player.name?.trim().toLowerCase().replace(/\s+/g, ' ');
      if (id) {
        players.add(`id:${id}`);
      } else if (name) {
        players.add(`name:${name}`);
      }
    }
  }

  return players.size || fallbackPlayerEntries;
};

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
