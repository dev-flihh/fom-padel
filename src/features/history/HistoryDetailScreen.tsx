import { useMemo, type Key } from 'react';
import { Calendar, ChevronLeft, MapPin, Share2, Trophy, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type TournamentHistory } from '../../types';
import {
  buildCompletedMatchHistoryItems,
  type CompletedMatchHistoryItem
} from './historyUtils';

const formatCount = (value: number) => value.toLocaleString('en-US');

const getTeamPlayersLabel = (item: CompletedMatchHistoryItem, team: 'teamA' | 'teamB') => (
  item.match[team].players
    .map((player) => player.name?.trim())
    .filter(Boolean)
    .join(' / ') || 'TBD'
);

const HistoryMatchArchiveCard = ({ item }: { key?: Key; item: CompletedMatchHistoryItem }) => {
  const teamAScore = Number(item.match.teamA.score || 0);
  const teamBScore = Number(item.match.teamB.score || 0);
  const teamAWin = teamAScore > teamBScore;
  const teamBWin = teamBScore > teamAScore;
  const winnerLabel = teamAWin ? 'Team A won' : teamBWin ? 'Team B won' : 'Draw';

  const renderTeam = (label: 'A' | 'B', players: string, isWinner: boolean) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          'h-[7px] w-[7px] shrink-0 rounded-full',
          isWinner ? 'bg-primary' : 'bg-ios-gray/42'
        )}
        aria-hidden="true"
      />
      <span className="w-4 shrink-0 text-center text-[11px] font-bold leading-none text-ios-gray">
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 truncate text-[14.5px] font-bold leading-tight',
          isWinner ? 'text-on-surface' : 'text-on-surface/72'
        )}
      >
        {players}
      </span>
    </div>
  );

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
      <p className="mb-2.5 text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-ios-gray/82">
        Court {item.match.court || 1}
      </p>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {renderTeam('A', getTeamPlayersLabel(item, 'teamA'), teamAWin)}
          {renderTeam('B', getTeamPlayersLabel(item, 'teamB'), teamBWin)}
        </div>
        <div className="flex w-[78px] shrink-0 flex-col items-end gap-1 text-right">
          <p className="flex items-center gap-2 font-display text-[30px] font-black leading-none text-on-surface tabular-nums">
            <span>{teamAScore}</span>
            <span className="text-ios-gray/45">-</span>
            <span>{teamBScore}</span>
          </p>
          <p className="whitespace-nowrap text-[11px] font-semibold leading-none text-ios-gray">
            {winnerLabel}
          </p>
        </div>
      </div>
    </article>
  );
};

export const HistoryDetailScreen = ({
  tournament,
  onBack,
  onShareStandings,
  onViewFinalStandings,
  onViewMatchDetails
}: {
  tournament: TournamentHistory,
  onBack: () => void,
  onShareStandings: () => void,
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

  const eventMeta = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');
  const eventDateLabel = tournament.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const playerCount = Number(tournament.numPlayers || 0);
  const roundCount = Number(tournament.numRounds || 0);
  const matchCount = completedMatches.length;
  const detectedCourtCount = completedMatches.reduce(
    (maxCourt, item) => Math.max(maxCourt, Number(item.match.court || 0)),
    0
  );
  const courtCount = Math.max(1, Number(tournament.courts || 0), detectedCourtCount);
  const statItems = [
    { label: 'Players', value: formatCount(playerCount) },
    { label: 'Rounds', value: formatCount(roundCount) },
    { label: 'Courts', value: formatCount(courtCount) },
    { label: 'Format', value: tournament.format },
  ];

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="sticky top-0 z-50 grid h-[52px] w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-ios-gray/16 bg-white px-3 text-on-surface">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface tap-target active:bg-ios-gray/10"
          aria-label="Back to history"
        >
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <h1 className="truncate text-center text-[15px] font-bold leading-none text-on-surface">History</h1>
        <button
          onClick={onShareStandings}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface tap-target active:bg-ios-gray/10"
          aria-label="Share standings"
        >
          <Share2 size={19} strokeWidth={2.1} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl pb-20">
        <section className="bg-white px-[22px] pb-6 pt-[22px] text-on-surface">
          <p className="text-[11.5px] font-bold uppercase leading-none tracking-[0.16em] text-primary">Event recap</p>

          <div className="mt-3 flex items-start justify-between gap-3.5">
            <h2 className="max-w-[230px] text-[40px] font-display font-black leading-[0.94] text-on-surface">
              {tournament.name}
            </h2>
            <div className="shrink-0 pt-0.5 text-right">
              <p className="font-display text-[58px] font-black leading-[0.8] text-on-surface tabular-nums">
                {matchCount}
              </p>
              <p className="mt-2 text-[9.5px] font-bold uppercase leading-none tracking-[0.22em] text-ios-gray">Matches</p>
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-[7px] text-[13.5px] font-medium leading-snug text-on-surface/62">
            <div className="flex min-w-0 items-center gap-2">
              <Calendar size={15} className="shrink-0 text-ios-gray" />
              <span className="min-w-0 truncate">{eventDateLabel}</span>
            </div>
            {eventMeta && (
              <div className="flex min-w-0 items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ios-gray" />
                <span className="min-w-0 leading-snug">{eventMeta}</span>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-4 border-y border-ios-gray/16">
            {statItems.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  'min-w-0 py-3.5',
                  index > 0 && 'border-l border-ios-gray/16 pl-3',
                  index === 0 && 'pr-2',
                  index > 0 && index < statItems.length - 1 && 'pr-2'
                )}
              >
                <p className="truncate text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-ios-gray">
                  {item.label}
                </p>
                <div className={cn(
                  'mt-2 flex min-w-0 items-center gap-1.5 text-[13px] font-black text-on-surface',
                  item.label === 'Format' ? 'leading-[1.08]' : 'leading-none'
                )}>
                  <span className={cn(
                    'min-w-0 tabular-nums',
                    item.label === 'Format' ? 'whitespace-normal' : 'truncate'
                  )}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              onClick={onViewFinalStandings}
              className="inline-flex h-[50px] min-w-0 items-center justify-center gap-2 rounded-full bg-primary px-3 text-[14.5px] font-bold text-white shadow-[0_2px_8px_rgba(230,94,20,0.14)] tap-target active:scale-[0.98]"
            >
              <Trophy size={16} />
              <span className="truncate sm:hidden">Standings</span>
              <span className="hidden truncate sm:inline">Final Standings</span>
            </button>
            <button
              onClick={onViewMatchDetails}
              className="inline-flex h-[50px] min-w-0 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 text-[14.5px] font-bold text-on-surface tap-target active:scale-[0.98]"
            >
              <Zap size={16} />
              <span className="truncate">Round Details</span>
            </button>
          </div>
        </section>

        <section className="bg-white px-[22px] pb-[30px] pt-1">
          <div className="pb-1.5 pt-[18px]">
            <p className="text-[11.5px] font-bold uppercase leading-none tracking-[0.16em] text-primary">Score archive</p>
            <div className="mt-1.5">
              <h3 className="text-[22px] font-bold leading-tight text-on-surface">Match history</h3>
              <div className="mt-2 flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 rounded-full border border-black/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-ios-gray">
                  Final scores
                </span>
                <span className="shrink-0 text-[13px] font-semibold leading-none text-ios-gray">
                  {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                </span>
              </div>
            </div>
          </div>

          {completedMatches.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-ios-gray/10 bg-surface px-4 py-6">
              <p className="text-[15px] font-semibold text-on-surface">No completed matches</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Final scores will appear here after the event is completed.
              </p>
            </div>
          ) : (
            <div>
              {matchesByRound.map((group) => (
                <section key={group.roundId} className="pt-6 first:pt-3">
                  <div className="mb-3 flex items-baseline gap-2.5">
                    <h4 className="shrink-0 text-[17px] font-bold leading-none text-on-surface">
                      Round {group.roundId}
                    </h4>
                    <span className="shrink-0 text-[12px] font-semibold leading-none text-ios-gray">
                      {group.items.length} match{group.items.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {group.items.map((item) => (
                      <HistoryMatchArchiveCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
