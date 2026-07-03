import { cn } from '../../lib/utils';
import type { Round } from '../../types';

// Tab ronde punya 3 kondisi:
// 1. Fokus (tab-nya sedang dibuka)          → oranye + underline solid
// 2. Complete (semua skor sudah masuk)      → gelap redup + underline tipis
// 3. Incomplete (belum diinput, tidak buka) → abu muted tanpa underline
export const ActiveMatchRoundStepper = ({
  rounds,
  totalRounds,
  focusedRoundId,
  needsRegenerateFromRound,
  onSelectRound,
}: {
  rounds: Round[];
  totalRounds: number;
  focusedRoundId: number | null;
  needsRegenerateFromRound?: number | null;
  onSelectRound: (roundId: number) => void;
}) => {
  const roundCount = Math.max(totalRounds, rounds.length);
  if (roundCount <= 1) return null;
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const roundSlots = Array.from({ length: roundCount }, (_, index) => index + 1);

  return (
    <section className="-mx-6 overflow-hidden px-6">
      <div className="flex items-baseline gap-4 overflow-x-auto pb-0 pt-2.5 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_90%,transparent)] [&::-webkit-scrollbar]:hidden">
        {roundSlots.map((roundId) => {
          const round = roundById.get(roundId);
          const isCompleted = Boolean(round && round.matches.length > 0 && round.matches.every((match) => match.status === 'completed'));
          const isFocused = Boolean(round && round.id === focusedRoundId);
          const needsRegenerate = Boolean(round && needsRegenerateFromRound !== null && needsRegenerateFromRound !== undefined && round.id >= needsRegenerateFromRound);

          return (
            <button
              key={roundId}
              type="button"
              onClick={() => round && onSelectRound(round.id)}
              disabled={!round}
              className={cn(
                'tap-target relative min-w-[24px] shrink-0 border-0 bg-transparent px-0 pb-0.5 text-center tabular-nums transition-all active:scale-[0.98]',
                isFocused
                  ? 'text-on-surface'
                  : needsRegenerate
                    ? 'text-amber-700'
                  : isCompleted
                    ? 'text-on-surface/78'
                    : 'text-ios-gray/34',
                !round && 'opacity-55 active:scale-100'
              )}
              aria-pressed={isFocused}
              aria-label={round ? `Open round ${round.id}` : `Round ${roundId} is not generated yet`}
            >
              <span className="block font-display text-[15px] font-bold leading-none tracking-[-0.01em] tabular-nums">
                {String(roundId).padStart(2, '0')}
              </span>
              <span className={cn(
                'mx-auto mt-1 block h-[2.5px] w-3.5 rounded-full',
                isFocused
                  ? 'bg-[#E65E14]'
                  : needsRegenerate
                    ? 'bg-amber-500'
                    : isCompleted
                      ? 'bg-on-surface/16'
                      : 'bg-transparent'
              )} />
              {needsRegenerate && (
                <span className="absolute -right-1 top-0 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              )}
              <span className="sr-only">
                {needsRegenerate ? 'Needs regeneration' : isFocused ? 'Open' : isCompleted ? 'Completed' : 'Round'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
