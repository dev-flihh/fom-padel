import { type MatchFormat } from '../../types';

export const getMatchSettingsSummary = ({
  format,
  courts,
  numRounds,
  points,
  selectedPlayerCount
}: {
  format: MatchFormat;
  courts: number;
  numRounds: number;
  points: number;
  selectedPlayerCount: number;
}) => {
  const minPlayersNeeded = courts * 4;
  const isReady = selectedPlayerCount >= minPlayersNeeded;
  const missingPlayersCount = Math.max(0, minPlayersNeeded - selectedPlayerCount);
  const courtCountLabel = `${courts} court${courts > 1 ? 's' : ''}`;
  const roundCountLabel = `${numRounds} round${numRounds > 1 ? 's' : ''}`;
  const pointCountLabel = `${points} point${points > 1 ? 's' : ''}`;
  const structureSummaryLabel = format === 'Match Play'
    ? `${courts}C • ${numRounds}R`
    : `${courts}C • ${numRounds}R • ${points}P`;
  const reviewStructureLabel = format === 'Match Play'
    ? `${courtCountLabel} · ${roundCountLabel}`
    : `${courtCountLabel} · ${roundCountLabel} · ${pointCountLabel}`;

  return {
    minPlayersNeeded,
    isReady,
    missingPlayersCount,
    structureSummaryLabel,
    courtCountLabel,
    roundCountLabel,
    pointCountLabel,
    reviewStructureLabel
  };
};
