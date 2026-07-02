import React, { useMemo, useState } from 'react';
import { AppPageHeader } from '../../components/app/AppPageHeader';
import { cn } from '../../lib/utils';
import { TournamentHistory } from '../../types';
import {
  countUniqueHistoryPlayers,
  getCompletedMatchesCount,
  getHistoryFormatTheme,
  groupTournamentsByMonth,
  normalizeHistoryFormat,
  sortTournamentsByNewest,
  type HistoryFormatFilter
} from './historyUtils';

const HISTORY_FILTERS: { key: Exclude<HistoryFormatFilter, 'unknown'>; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mexicano', label: 'Mexicano' },
  { key: 'americano', label: 'Americano' },
  { key: 'match-play', label: 'Match Play' }
];

export const HistoryScreen = ({
  tournaments,
  onOpenTournament,
  isHistoryLoading,
  renderHistoryCard
}: {
  tournaments: TournamentHistory[];
  onOpenTournament: (tournament: TournamentHistory) => void;
  isHistoryLoading: boolean;
  renderHistoryCard: (
    tournament: TournamentHistory,
    onClick: () => void,
    options: { isLatest: boolean }
  ) => React.ReactNode;
}) => {
  const [activeFilter, setActiveFilter] = useState<Exclude<HistoryFormatFilter, 'unknown'>>('all');
  const sortedTournaments = useMemo(() => sortTournamentsByNewest(tournaments), [tournaments]);
  const filteredTournaments = useMemo(
    () => activeFilter === 'all'
      ? sortedTournaments
      : sortedTournaments.filter((tournament) => normalizeHistoryFormat(tournament.format) === activeFilter),
    [activeFilter, sortedTournaments]
  );
  const tournamentGroups = useMemo(() => groupTournamentsByMonth(filteredTournaments), [filteredTournaments]);
  const totalCompletedMatches = useMemo(
    () => sortedTournaments.reduce((sum, tournament) => sum + getCompletedMatchesCount(tournament), 0),
    [sortedTournaments]
  );
  const totalPlayers = useMemo(() => countUniqueHistoryPlayers(sortedTournaments), [sortedTournaments]);
  const latestEventLabel = sortedTournaments[0]?.date
    ? sortedTournaments[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const latestTournamentId = sortedTournaments[0]?.id || null;
  const eventCount = sortedTournaments.length;
  const matchCount = totalCompletedMatches;
  const playerCount = totalPlayers;
  const summaryItems = [
    { label: eventCount === 1 ? 'event' : 'events', value: isHistoryLoading ? '...' : eventCount.toLocaleString('en-US') },
    { label: matchCount === 1 ? 'match' : 'matches', value: isHistoryLoading ? '...' : matchCount.toLocaleString('en-US') },
    { label: playerCount === 1 ? 'player' : 'players', value: isHistoryLoading ? '...' : playerCount.toLocaleString('en-US') },
    { label: 'latest', value: isHistoryLoading ? 'loading' : (latestEventLabel || 'none yet'), labelFirst: true }
  ];

  return (
    <div className="min-h-screen bg-white pb-24">
      <main className="mx-auto w-full max-w-2xl pb-20 pt-[calc(env(safe-area-inset-top,0px)+34px)]">
        <AppPageHeader
          eyebrow="History"
          title="Match archive"
          subtitle="Completed events, standings, and round details."
          metaItems={summaryItems}
        />

        <section className="mt-4 border-b border-black/[0.055] bg-white px-4 py-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HISTORY_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const theme = filter.key === 'all' ? null : getHistoryFormatTheme(filter.label);

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold leading-none transition-colors',
                    isActive
                      ? 'bg-[#111827] text-white'
                      : 'bg-white text-on-surface ring-1 ring-black/[0.08] active:bg-black/[0.035]'
                  )}
                >
                  {theme && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: theme.color }}
                      aria-hidden="true"
                    />
                  )}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          {isHistoryLoading ? (
            <div className="border-b border-black/[0.055] bg-white px-4 py-8">
              <p className="text-[15px] font-semibold text-on-surface">Loading history</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Completed events are being synced from the cloud.
              </p>
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div className="border-b border-black/[0.055] bg-white px-4 py-8">
              <p className="text-[15px] font-semibold text-on-surface">No history yet</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Completed events will show up here once your matches are finalized.
              </p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="border-b border-black/[0.055] bg-white px-4 py-8">
              <p className="text-[15px] font-semibold text-on-surface">No {HISTORY_FILTERS.find((filter) => filter.key === activeFilter)?.label} events</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Try another archive filter to see completed events.
              </p>
            </div>
          ) : (
            <div className="bg-white px-4">
              {tournamentGroups.map((group) => (
                <section key={group.id} className="pt-8 first:pt-7">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex shrink-0 items-baseline gap-2">
                      <h2 className="font-display text-[28px] font-black uppercase leading-none tracking-[-0.04em] text-on-surface">
                        {group.monthLabel}
                      </h2>
                      <span className="text-[13px] font-black leading-none tracking-[0.08em] text-ios-gray">
                        {group.yearLabel}
                      </span>
                    </div>
                    <span className="h-px min-w-0 flex-1 bg-black/[0.08]" />
                    <span className="text-[13px] font-black leading-none text-ios-gray tabular-nums">
                      {group.tournaments.length.toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="divide-y divide-black/[0.055] border-b border-black/[0.055]">
                    {group.tournaments.map((item) => (
                      <React.Fragment key={item.id}>
                        {renderHistoryCard(item, () => onOpenTournament(item), {
                          isLatest: item.id === latestTournamentId
                        })}
                      </React.Fragment>
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
