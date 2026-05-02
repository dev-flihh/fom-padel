import { useMemo } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Tournament } from '../../types';
import { ALL_MATCH_BACKGROUNDS, FALLBACK_MATCH_BACKGROUND } from './matchBackgrounds';

export const MatchBackgroundPickerScreen = ({
  tournament,
  selectedBackgroundId,
  onSelectBackground,
  onBack,
  onSkip,
  onContinue
}: {
  tournament: Tournament,
  selectedBackgroundId: string | null,
  onSelectBackground: (backgroundId: string) => void,
  onBack: () => void,
  onSkip: () => void,
  onContinue: () => void
}) => {
  const backgroundOptions = useMemo(
    () => (ALL_MATCH_BACKGROUNDS.length > 0 ? ALL_MATCH_BACKGROUNDS : [FALLBACK_MATCH_BACKGROUND]),
    []
  );

  return (
    <div className="bg-white min-h-screen pb-36">
      <nav
        className="ios-blur sticky top-0 z-50 w-full"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="flex justify-between items-center w-full px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="tap-target p-2 -ml-2">
              <ChevronLeft size={24} className="text-primary" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Select Background</h1>
          </div>
          <button
            onClick={onSkip}
            className="font-bold tap-target px-2 text-primary transition-colors"
          >
            Skip
          </button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <section className="space-y-1">
          <p className="text-[15px] font-semibold text-on-surface">Choose from the app collection</p>
          <p className="text-[12px] text-ios-gray">This background will be shown in Active Match.</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {backgroundOptions.map((backgroundId, index) => {
            const isSelected = backgroundId === selectedBackgroundId;
            return (
              <button
                key={backgroundId}
                onClick={() => onSelectBackground(backgroundId)}
                className={cn(
                  'relative overflow-hidden rounded-2xl border tap-target transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/15'
                    : 'border-ios-gray/15'
                )}
              >
                <img
                  src={backgroundId}
                  alt={`Background ${index + 1}`}
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                {isSelected && (
                  <div className="absolute right-2 top-2 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30">
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </section>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-ios-gray/10">
        <div
          className="max-w-md mx-auto px-4 py-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <button
            onClick={onContinue}
            disabled={!selectedBackgroundId}
            className="w-full h-12 bg-primary text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 tap-target transition-all"
          >
            Continue to Match
          </button>
          <button
            onClick={onSkip}
            className="w-full h-11 rounded-2xl border border-ios-gray/15 text-ios-gray font-semibold text-[14px] tap-target"
          >
            Skip (Random)
          </button>
        </div>
      </div>
    </div>
  );
};
