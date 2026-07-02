import { type MatchFormat, type PartnerMode } from '../../types';

export const getMatchSettingsSummary = ({
  format,
  partnerMode = 'rotating',
  courts,
  numRounds,
  durationMinutes,
  points,
  selectedPlayerCount
}: {
  format: MatchFormat;
  partnerMode?: PartnerMode;
  courts: number;
  numRounds: number;
  durationMinutes?: number;
  points: number;
  selectedPlayerCount: number;
}) => {
  const minPlayersNeeded = courts * 4;
  // Fix partner butuh jumlah pemain genap supaya semua kebagian pasangan.
  const needsEvenPlayers = partnerMode === 'fixed' && selectedPlayerCount % 2 !== 0;
  const isReady = selectedPlayerCount >= minPlayersNeeded && !needsEvenPlayers;
  const missingPlayersCount = Math.max(
    needsEvenPlayers ? 1 : 0,
    minPlayersNeeded - selectedPlayerCount
  );
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
