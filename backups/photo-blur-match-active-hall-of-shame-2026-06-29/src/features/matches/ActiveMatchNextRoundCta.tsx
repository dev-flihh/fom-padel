import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat } from '../../types';

export const ActiveMatchNextRoundCta = ({
  isVisible,
  bottomStyle,
  activeRoundId,
  enteredScoreCount,
  matchCount,
  format,
  isScoreFullyFilled,
  label,
  accentTheme,
  onNext
}: {
  isVisible: boolean;
  bottomStyle: string;
  activeRoundId: number | null;
  enteredScoreCount: number;
  matchCount: number;
  format: MatchFormat;
  isScoreFullyFilled: boolean;
  label: string;
  accentTheme: {
    text: string;
    bgSoft: string;
    borderSoft: string;
    solid: string;
    solidShadow: string;
  };
  onNext: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-x-0 z-[92] px-5 pointer-events-none"
      style={{ bottom: bottomStyle }}
    >
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="relative overflow-hidden rounded-2xl border border-white/45 bg-white/16 backdrop-blur-md shadow-[0_12px_28px_rgba(15,23,42,0.20)] px-2.5 py-2.5">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] pointer-events-none" />
          <div className="relative flex items-center justify-between gap-2 px-1 pb-2">
            <div className="min-w-0 text-[11px] font-bold tracking-tight text-ios-gray truncate">
              {activeRoundId
                ? `Round ${activeRoundId} • ${enteredScoreCount}/${matchCount} match`
                : 'Matches are ready to continue'}
            </div>
            {format !== 'Match Play' && isScoreFullyFilled && (
              <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold shrink-0 border", accentTheme.bgSoft, accentTheme.text, accentTheme.borderSoft)}>
                Ready
              </span>
            )}
          </div>
          <button
            onClick={onNext}
            className={cn(
              "relative w-full h-11 px-4 rounded-xl text-white font-bold text-[14px] tracking-tight whitespace-nowrap tap-target inline-flex items-center justify-center gap-2 border border-white/18",
              accentTheme.solid,
              accentTheme.solidShadow,
              "after:absolute after:inset-0 after:rounded-xl after:bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_55%)] after:pointer-events-none"
            )}
          >
            <span>{label}</span>
            <Zap size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
