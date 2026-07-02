import { cn } from '../../lib/utils';
import type { Round } from '../../types';

export const ActiveMatchRoundStepper = ({
  rounds,
  totalRounds,
  activeRoundId,
  collapsedRounds,
  needsRegenerateFromRound,
  onSelectRound,
}: {
  rounds: Round[];
  totalRounds: number;
  activeRoundId: number | null;
  collapsedRounds: Set<number>;
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
          const isActive = Boolean(round && (round.id === activeRoundId || round.matches.some((match) => match.status === 'active')));
          const isOpen = Boolean(round && !collapsedRounds.has(round.id));
          const needsRegenerate = Boolean(round && needsRegenerateFromRound !== null && needsRegenerateFromRound !== undefined && round.id >= needsRegenerateFromRound);

          return (
            <button
              key={roundId}
              type="button"
              onClick={() => round && onSelectRound(round.id)}
              disabled={!round}
              className={cn(
                'tap-target relative min-w-[24px] shrink-0 border-0 bg-transparent px-0 pb-0.5 text-center tabular-nums transition-all active:scale-[0.98]',
                isActive
                  ? 'text-on-surface'
                  : needsRegenerate
                    ? 'text-amber-700'
                  : isCompleted
                    ? 'text-on-surface/78'
                    : 'text-ios-gray/34',
                !round && 'opacity-55 active:scale-100'
              )}
              aria-pressed={isOpen}
              aria-label={round ? `Open round ${round.id}` : `Round ${roundId} is not generated yet`}
            >
              <span className={cn(
                'block leading-none tabular-nums',
                isActive
                  ? 'font-display text-[15px] font-bold tracking-[-0.01em]'
                  : isCompleted
                    ? 'font-display text-[15px] font-bold tracking-[-0.01em]'
                    : 'font-display text-[15px] font-bold tracking-[-0.01em]'
              )}>
                {String(roundId).padStart(2, '0')}
              </span>
              <span className={cn(
                'mx-auto mt-1 block h-[2.5px] w-3.5 rounded-full',
                isActive
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
                {needsRegenerate ? 'Needs regeneration' : isOpen ? 'Open' : 'Round'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
