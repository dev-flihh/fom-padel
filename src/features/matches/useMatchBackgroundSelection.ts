import { useEffect, useMemo } from 'react';
import { ALL_MATCH_BACKGROUNDS, FALLBACK_MATCH_BACKGROUND } from './matchBackgrounds';

export const useMatchBackgroundSelection = ({
  selectedBackgroundId,
  onSelectBackground,
  enabled
}: {
  selectedBackgroundId?: string | null;
  onSelectBackground?: (backgroundId: string) => void;
  enabled: boolean;
}) => {
  const backgroundOptions = useMemo(
    () => (ALL_MATCH_BACKGROUNDS.length > 0 ? ALL_MATCH_BACKGROUNDS : [FALLBACK_MATCH_BACKGROUND]),
    []
  );
  const effectiveSelectedBackgroundId = (
    selectedBackgroundId && backgroundOptions.includes(selectedBackgroundId)
      ? selectedBackgroundId
      : backgroundOptions[0] || null
  );

  useEffect(() => {
    if (!enabled || !effectiveSelectedBackgroundId || selectedBackgroundId === effectiveSelectedBackgroundId) return;
    onSelectBackground?.(effectiveSelectedBackgroundId);
  }, [effectiveSelectedBackgroundId, enabled, onSelectBackground, selectedBackgroundId]);

  return {
    backgroundOptions,
    effectiveSelectedBackgroundId
  };
};
