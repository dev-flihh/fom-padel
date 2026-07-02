import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { rankingDetailBackButtonClassName, rankingDetailHeaderClassName, rankingDetailTitleClassName } from './rankingDetailLayout';
import { formatDisplayMmr, formatRankMmrFloor, formatRankMmrRange, getRankInfo, RANK_TIERS, toRawMmr } from './rankUtils';

export const RankDiscoveryScreen = ({ currentUser, onBack, onOpenMmrHistory }: { currentUser: any; onBack: () => void; onOpenMmrHistory: () => void }) => {
  const currentMmr = toRawMmr(currentUser?.mmr);
  const currentMatches = Number.isFinite(Number(currentUser?.totalMatches)) ? Number(currentUser.totalMatches) : 0;
  const currentRank = getRankInfo(currentMmr);
  const pointsToNext = currentRank.nextRank ? Math.max(0, currentRank.nextRank.min - currentMmr) : 0;
  const progressPercent = currentRank.nextRank
    ? Math.max(0, Math.min(100, ((currentMmr - currentRank.min) / Math.max(1, currentRank.nextRank.min - currentRank.min)) * 100))
    : 100;
  const currentTierFloor = formatRankMmrFloor(currentRank);
  const nextTierFloor = currentRank.nextRank ? formatDisplayMmr(currentRank.nextRank.min) : currentTierFloor;
  const currentTierRange = formatRankMmrRange(currentRank);

  const ruleCards = [
    {
      title: 'Per player, auto finalized',
      detail: "Each player's MMR is tracked individually. Sessions auto-close once the match is logged.",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </>
      ),
    },
    {
      title: 'Team average determines matchup',
      detail: "Before each match, both teams' MMR averages are compared. This decides who's the favorite.",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      title: 'Score share defines dominance',
      detail: 'A team taking 70%+ of the total score is a dominant result, no matter the scoring format.',
      icon: (
        <>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </>
      ),
    },
  ] as const;

  const baseResults: { label: string; detail: string; value: string; valueClass: string }[] = [
    { label: 'Draw reward', detail: 'Match ends level', value: '+8', valueClass: 'text-[#18a486]' },
    { label: 'Standard win', detail: 'Winner takes under 70% of total score', value: '+25', valueClass: 'text-[#18a486]' },
    { label: 'Dominant win', detail: 'Winner takes 70%+ of total score', value: '+40', valueClass: 'text-[#18a486]' },
    { label: 'Standard loss', detail: 'Opponent takes under 70% of total score', value: '-20', valueClass: 'text-[#f03030]' },
    { label: 'Heavy loss', detail: 'Opponent takes 70%+ of total score', value: '-35', valueClass: 'text-[#f03030]' },
  ];

  const modifiers: { label: string; detail: string; value: string; valueClass: string }[] = [
    { label: 'Underdog bonus', detail: 'Win with lower team avg MMR', value: '+15', valueClass: 'text-[#18a486]' },
    { label: 'Underdog draw bonus', detail: 'Draw with lower team avg MMR', value: '+0 to +20', valueClass: 'text-[#18a486]' },
    { label: 'Favorite penalty', detail: 'Lose with higher team avg MMR', value: '-15', valueClass: 'text-[#f03030]' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className={rankingDetailHeaderClassName}>
        <button
          onClick={onBack}
          className={rankingDetailBackButtonClassName}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <h1 className={rankingDetailTitleClassName}>Ranking Guide</h1>
      </header>

      <main className="mx-auto flex max-w-[430px] flex-col pb-12">
        <section className="border-b border-black/[0.07] px-6 pb-6 pt-7">
          <div className="mb-[6px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">Your rating</div>
          <div className="mb-[10px] flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-end gap-1">
                <span className="text-[72px] font-black leading-none tracking-[-0.06em] text-[#0f1117]">{formatDisplayMmr(currentMmr)}</span>
                <span className="mb-2 text-[16px] font-bold uppercase tracking-[0.04em] text-[#7a7f8e]">MMR</span>
              </div>
              <div className="mt-[10px] inline-flex items-center gap-[6px] rounded-full bg-[#f6f6f8] px-[10px] py-[5px] pl-[7px]">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-[12px] font-extrabold tracking-[0.02em] text-[#3a3f4b]">{currentRank.name}</span>
              </div>
              <p className="mt-2 text-[12px] font-medium text-[#7a7f8e]">{currentTierRange}</p>
            </div>

            <div className="pb-1 text-right">
              <p className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-[#b0b5c2]">Next tier</p>
              <p className="text-[15px] font-extrabold tracking-[-0.02em] text-[#0f1117]">{currentRank.nextRank?.name || 'Max Reached'}</p>
              <p className="mt-px text-[12px] font-semibold text-primary">
                {currentRank.nextRank ? `${pointsToNext.toLocaleString()} to go` : 'Highest published tier'}
              </p>
            </div>
          </div>

          <div className="mb-[6px] h-[5px] overflow-hidden rounded-full bg-[#f6f6f8]">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-[#b0b5c2]">
            <span>{currentTierFloor}</span>
            <span>{nextTierFloor}</span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-[#f6f6f8] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold text-[#7a7f8e]">Matches played</p>
              <p className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[#0f1117]">{currentMatches}</p>
            </div>
            <button
              type="button"
              onClick={onOpenMmrHistory}
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#3a3f4b] shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:bg-[#fdf2eb]"
            >
              MMR History
            </button>
          </div>
        </section>

        <section className="border-b border-black/[0.07] px-6 py-7">
          <div className="mb-[6px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">How it works</div>
          <h2 className="text-[20px] font-black leading-[1.2] tracking-[-0.04em] text-[#0f1117]">
            MMR moves
            <br />
            after every match
          </h2>
          <p className="mb-5 mt-1 text-[13px] leading-[1.6] text-[#7a7f8e]">
            Your personal rating adjusts each time a session is finalized. Here&apos;s what drives the numbers.
          </p>

          <div className="space-y-[10px]">
            {ruleCards.map((rule) => (
              <div key={rule.title} className="flex items-start gap-3 rounded-[16px] bg-[#f6f6f8] px-4 py-[14px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65e14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {rule.icon}
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[#0f1117]">{rule.title}</p>
                  <p className="mt-[3px] text-[12px] leading-[1.5] text-[#7a7f8e]">{rule.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-[10px] rounded-[12px] bg-[#fdf2eb] px-[14px] py-3">
            <div className="mt-px shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e65e14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-[12px] leading-[1.55] text-[#3a3f4b]">
              <span className="font-extrabold text-primary">Snapshot, not live.</span> Underdog, draw bonus, and favorite penalty use the team MMR averages captured <em>before</em> the match starts, not the leaderboard after it ends.
            </p>
          </div>
        </section>

        <section className="border-b border-black/[0.07] px-6 py-7">
          <div className="mb-[6px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">Match outcomes</div>
          <h2 className="text-[20px] font-black leading-[1.2] tracking-[-0.04em] text-[#0f1117]">
            What moves
            <br />
            your score
          </h2>
          <p className="mb-5 mt-1 text-[13px] leading-[1.6] text-[#7a7f8e]">
            Every finalized match applies one base result plus any modifier that applies.
          </p>

          <div className="mb-4">
            <p className="mb-2 pl-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b0b5c2]">Base result</p>
            <div className="space-y-[5px]">
              {baseResults.map((scenario) => (
                <div key={scenario.label} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f6f6f8] px-[14px] py-[11px]">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#0f1117]">{scenario.label}</p>
                    <p className="mt-px text-[11px] text-[#b0b5c2]">{scenario.detail}</p>
                  </div>
                  <div className={cn('shrink-0 min-w-11 text-right text-[16px] font-black tracking-[-0.02em]', scenario.valueClass)}>
                    {scenario.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 pl-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b0b5c2]">Modifier</p>
            <div className="space-y-[5px]">
              {modifiers.map((scenario) => (
                <div key={scenario.label} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f6f6f8] px-[14px] py-[11px]">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#0f1117]">{scenario.label}</p>
                    <p className="mt-px text-[11px] text-[#b0b5c2]">{scenario.detail}</p>
                  </div>
                  <div className={cn('shrink-0 min-w-11 text-right text-[16px] font-black tracking-[-0.02em]', scenario.valueClass)}>
                    {scenario.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-7">
          <div className="mb-[6px] text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary">Tier ladder</div>
          <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#0f1117]">8 tiers to climb</h2>
          <p className="mb-6 mt-1 text-[13px] leading-[1.6] text-[#7a7f8e]">
            Tiers unlock as your MMR grows. You&apos;re currently in {currentRank.name}.
          </p>

          <div className="relative">
            <div className="absolute bottom-5 left-[19px] top-5 w-[1.5px] bg-black/[0.07]" />
            <div className="relative z-[1] space-y-[10px]">
              {RANK_TIERS.map((rank) => {
                const isCurrent = rank.name === currentRank.name;
                const rangeLabel = formatRankMmrRange(rank);

                return (
                  <div key={rank.name} className="flex items-center gap-[14px]">
                    <div className="relative z-[2] flex h-[50px] w-10 shrink-0 items-center justify-center bg-white">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-[12px] border-2',
                        rank.color,
                        isCurrent ? 'border-primary shadow-[0_0_0_3px_#fce4d0]' : 'border-transparent'
                      )}>
                        <rank.icon size={18} />
                      </div>
                    </div>
                    <div className={cn('flex flex-1 items-center justify-between rounded-[14px] px-[14px] py-[10px]', isCurrent ? 'bg-[#fdf2eb]' : 'bg-[#f6f6f8]')}>
                      <div>
                        <p className="text-[14px] font-extrabold text-[#0f1117]">{rank.name}</p>
                        <p className="text-[11px] text-[#b0b5c2]">{rangeLabel}</p>
                      </div>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-primary px-[7px] py-[3px] text-[9px] font-extrabold uppercase tracking-[0.05em] text-white">You</span>
                      ) : rank.name === 'Hall of Fame' ? (
                        <span className="shrink-0 rounded-full bg-[#fce4d0] px-[7px] py-[3px] text-[9px] font-extrabold uppercase tracking-[0.07em] text-primary">Top 100</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
