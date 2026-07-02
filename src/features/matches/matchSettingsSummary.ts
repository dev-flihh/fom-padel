import { type MatchFormat } from '../../types';

export const getMatchSettingsSummary = ({
  format,
  courts,
  numRounds,
  durationMinutes,
  points,
  selectedPlayerCount
}: {
  format: MatchFormat;
  courts: number;
  numRounds: number;
  durationMinutes?: number;
  points: number;
  selectedPlayerCount: number;
}) => {
  const minPlayersNeeded = courts * 4;
  const isReady = selectedPlayerCount >= minPlayersNeeded;
  const missingPlayersCount = Math.max(0, minPlayersNeeded - selectedPlayerCount);
  const courtCountLabel = `${courts} court${courts > 1 ? 's' : ''}`;
  const roundCountLabel = `${numRounds} round${numRounds > 1 ? 's' : ''}`;
  const durationLabel = durationMinutes ? `${durationMinutes} min` : '';
  const pointCountLabel = `${points} point${points > 1 ? 's' : ''}`;
  const structureSummaryLabel = format === 'Match Play'
    ? `${courts}C • ${numRounds}R${durationLabel ? ` • ${durationLabel}` : ''}`
    : `${courts}C • ${numRounds}R${durationLabel ? ` • ${durationLabel}` : ''} • ${points}P`;
  const reviewStructureLabel = format === 'Match Play'
    ? [courtCountLabel, roundCountLabel, durationLabel].filter(Boolean).join(' · ')
    : [courtCountLabel, roundCountLabel, durationLabel, pointCountLabel].filter(Boolean).join(' · ');

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
