import { INITIAL_TOURNAMENT } from '../../constants';
import { Player, Tournament } from '../../types';
import { getDefaultMatchThemeColorId } from './matchTheme';

export const sanitizeInactivePlayerIds = (players: Player[], rawInactiveIds?: string[]) => {
  if (!Array.isArray(rawInactiveIds) || rawInactiveIds.length === 0) return [];
  const knownIds = new Set(players.map((player) => player.id));
  const unique = new Set<string>();
  const sanitized: string[] = [];
  rawInactiveIds.forEach((id) => {
    if (!id || !knownIds.has(id) || unique.has(id)) return;
    unique.add(id);
    sanitized.push(id);
  });
  return sanitized;
};

export const createFreshTournamentDraft = (): Tournament => ({
  ...INITIAL_TOURNAMENT,
  id: undefined,
  name: '',
  backgroundId: undefined,
  startedAt: undefined,
  endedAt: undefined,
  players: [],
  inactivePlayerIds: [],
  courtChanges: [],
  rounds: [],
  venueName: '',
  location: ''
});

export const hasSetupDraftChanges = (tournament: Tournament) => {
  const trimmedName = (tournament.name || '').trim();
  const trimmedVenue = (tournament.venueName || '').trim();
  const trimmedLocation = (tournament.location || '').trim();
  const normalizedScoringType = tournament.scoringType || 'Golden Point';

  return (
    !tournament.startedAt &&
    (
      trimmedName.length > 0 ||
      trimmedVenue.length > 0 ||
      trimmedLocation.length > 0 ||
      (tournament.players || []).length > 0 ||
      tournament.format !== INITIAL_TOURNAMENT.format ||
      (tournament.themeColorId || getDefaultMatchThemeColorId(tournament.format)) !== (INITIAL_TOURNAMENT.themeColorId || getDefaultMatchThemeColorId(INITIAL_TOURNAMENT.format)) ||
      tournament.criteria !== INITIAL_TOURNAMENT.criteria ||
      normalizedScoringType !== 'Golden Point' ||
      tournament.courts !== INITIAL_TOURNAMENT.courts ||
      tournament.totalPoints !== INITIAL_TOURNAMENT.totalPoints ||
      tournament.numRounds !== INITIAL_TOURNAMENT.numRounds
    )
  );
};
