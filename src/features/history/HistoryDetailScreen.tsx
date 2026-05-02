import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, Trophy, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type TournamentHistory } from '../../types';
import { getHistoryFormatTheme } from '../tournaments/matchTheme';
import { CompletedMatchHistoryCard } from './HistoryCards';
import { buildCompletedMatchHistoryItems, type CompletedMatchHistoryItem } from './historyUtils';

export const HistoryDetailScreen = ({
  tournament,
  onBack,
  onViewFinalStandings,
  onViewMatchDetails
}: {
  tournament: TournamentHistory,
  onBack: () => void,
  onViewFinalStandings: () => void,
  onViewMatchDetails: () => void
}) => {
  const completedMatches = useMemo(
    () => buildCompletedMatchHistoryItems([tournament]),
    [tournament]
  );
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, CompletedMatchHistoryItem[]>();
    completedMatches.forEach((item) => {
      const roundItems = grouped.get(item.roundId) || [];
      roundItems.push(item);
      grouped.set(item.roundId, roundItems);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([roundId, items]) => ({ roundId, items }));
  }, [completedMatches]);
  const formatTheme = getHistoryFormatTheme(tournament.format, tournament.themeColorId);
  const eventMeta = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');
  const [focusedRoundId, setFocusedRoundId] = useState<number | null>(null);
  const roundSectionRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    setFocusedRoundId(matchesByRound[0]?.roundId ?? null);
  }, [matchesByRound]);

  const handleFocusRound = (roundId: number) => {
    setFocusedRoundId(roundId);
    roundSectionRefs.current[roundId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center justify-between px-4 h-14 border-b border-ios-gray/10">
        <button onClick={onBack} className="text-primary flex items-center -ml-2 tap-target p-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[17px] tracking-tight">History Detail</h1>
        <div className="w-10" />
      </header>

      <main className="pt-4 px-4 space-y-4 max-w-2xl mx-auto">
        <div className="overflow-hidden rounded-[28px] sm:rounded-[30px] border border-black/5 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Event Summary</p>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.chip)}>
              {tournament.format}
            </span>
          </div>
          <h2 className="mt-2 text-[28px] leading-tight font-display font-black tracking-tight text-on-surface">
            {tournament.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] font-medium text-ios-gray">
            <Calendar size={14} />
            <span>{tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {eventMeta && (
              <>
                <span className="h-1 w-1 rounded-full bg-ios-gray/45" />
                <span className="truncate">{eventMeta}</span>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Format</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.format}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Players</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.numPlayers}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Rounds</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.numRounds}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Matches</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{completedMatches.length}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={onViewFinalStandings}
              className={cn(
                'w-full h-12 rounded-[18px] border text-[13px] font-semibold tracking-tight inline-flex items-center justify-center gap-2 tap-target shadow-sm',
                formatTheme.chip
              )}
            >
              <Trophy size={16} />
              View Final Standings
            </button>
            <button
              onClick={onViewMatchDetails}
              className="w-full h-12 rounded-[18px] border border-black/5 bg-surface text-[13px] font-semibold tracking-tight text-on-surface/88 inline-flex items-center justify-center gap-2 tap-target shadow-sm"
            >
              <Zap size={16} />
              Round Details
            </button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Completed Matches</p>
              <h3 className="mt-1 text-[18px] font-bold tracking-tight text-on-surface">
                Match history
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
                Skor final tiap court dan ronde, supaya recap pertandingan lebih cepat dipindai.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
              {completedMatches.length} {completedMatches.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {matchesByRound.length > 0 && (
            <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar">
              <div className="flex w-max gap-2">
              {matchesByRound.map((group) => (
                <button
                  key={group.roundId}
                  type="button"
                  onClick={() => handleFocusRound(group.roundId)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold tracking-tight shadow-sm tap-target transition-all active:scale-[0.98]',
                    focusedRoundId === group.roundId ? formatTheme.badge : formatTheme.chip
                  )}
                >
                  <span>Round {group.roundId}</span>
                  <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                  <span>{group.items.length} match{group.items.length === 1 ? '' : 'es'}</span>
                </button>
              ))}
              </div>
            </div>
          )}

          {completedMatches.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-black/8 bg-surface p-8 text-center">
              <p className="text-[14px] font-medium text-ios-gray">No completed matches in this history yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchesByRound.map((group) => (
                <section
                  key={group.roundId}
                  ref={(node) => {
                    roundSectionRefs.current[group.roundId] = node;
                  }}
                  className="rounded-[26px] border border-black/5 bg-[linear-gradient(180deg,rgba(249,250,251,0.98)_0%,rgba(255,255,255,0.98)_100%)] p-3.5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Round Group</p>
                      <h4 className="mt-0.5 text-[16px] font-bold tracking-tight text-on-surface">
                        Round {group.roundId}
                      </h4>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-tight', formatTheme.badge)}>
                      {group.items.length} match{group.items.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <CompletedMatchHistoryCard
                        key={item.id}
                        item={item}
                        showTournamentMeta={false}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-black/5 bg-surface p-3.5">
          <div>
            <p className="text-[11px] font-semibold tracking-tight text-ios-gray">More Details</p>
            <p className="mt-1 text-[13px] font-semibold tracking-tight text-on-surface">
              Open standings or round-by-round details if you need the full breakdown.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={onViewFinalStandings}
              className="w-full h-11 rounded-full border border-primary/12 bg-white text-[13px] font-semibold tracking-tight text-primary inline-flex items-center justify-center gap-2 tap-target"
            >
              <Trophy size={16} />
              View Final Standings
            </button>
            <button
              onClick={onViewMatchDetails}
              className="w-full h-11 rounded-full border border-black/5 bg-white text-[13px] font-semibold tracking-tight text-on-surface/88 inline-flex items-center justify-center gap-2 tap-target"
            >
              <Zap size={16} />
              Round Details
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
