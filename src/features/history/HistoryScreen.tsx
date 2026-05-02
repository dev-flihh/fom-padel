import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { TournamentHistory } from '../../types';
import { getCompletedMatchesCount, sortTournamentsByNewest } from './historyUtils';

export const HistoryScreen = ({
  tournaments,
  onOpenTournament,
  isHistoryLoading,
  renderHistoryCard
}: {
  tournaments: TournamentHistory[];
  onOpenTournament: (tournament: TournamentHistory) => void;
  isHistoryLoading: boolean;
  renderHistoryCard: (tournament: TournamentHistory, onClick: () => void) => React.ReactNode;
}) => {
  const sortedTournaments = useMemo(() => sortTournamentsByNewest(tournaments), [tournaments]);
  const totalCompletedMatches = useMemo(
    () => sortedTournaments.reduce((sum, tournament) => sum + getCompletedMatchesCount(tournament), 0),
    [sortedTournaments]
  );
  const totalPlayers = useMemo(
    () => sortedTournaments.reduce((sum, tournament) => sum + Number(tournament.numPlayers || 0), 0),
    [sortedTournaments]
  );
  const latestEventLabel = sortedTournaments[0]?.date
    ? sortedTournaments[0].date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bg-white min-h-screen pb-32">
      <main className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-[28px] sm:rounded-[32px] border border-black/5 bg-white p-4 sm:p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-primary/80">History</p>
              <h1 className="mt-1 text-[clamp(24px,7vw,36px)] leading-[1.02] font-display font-black tracking-tight text-on-surface">
                Match archive.
              </h1>
              <p className="mt-1.5 max-w-md text-[13px] sm:text-[14px] leading-relaxed text-ios-gray">
                Semua event yang sudah selesai terkumpul di sini, jadi lebih gampang buat cek recap, standings, dan detail per ronde.
              </p>
            </div>
            <div className="shrink-0 rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-2 text-right">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Events</p>
              <p className="mt-1 text-[20px] sm:text-[24px] leading-none font-display font-black tracking-tight tabular-nums text-on-surface">
                {isHistoryLoading ? '...' : sortedTournaments.length}
              </p>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Matches</p>
              <p className="mt-1 text-[16px] sm:text-[18px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                {isHistoryLoading ? '...' : totalCompletedMatches}
              </p>
            </div>
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Players</p>
              <p className="mt-1 text-[16px] sm:text-[18px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                {isHistoryLoading ? '...' : totalPlayers}
              </p>
            </div>
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Latest</p>
              <p className="mt-1 text-[12px] sm:text-[13px] leading-tight font-semibold tracking-tight text-on-surface">
                {isHistoryLoading ? 'Loading...' : (latestEventLabel || 'Belum ada')}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Archive List</p>
              <h2 className="mt-1 text-[17px] sm:text-[18px] font-bold tracking-tight text-on-surface">Completed events</h2>
            </div>
            {sortedTournaments.length > 0 && (
              <span className="shrink-0 rounded-full border border-black/5 bg-surface px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-tight text-ios-gray">
                newest first
              </span>
            )}
          </div>

          {isHistoryLoading ? (
            <div className="rounded-[28px] border border-dashed border-black/8 bg-surface p-10 text-center">
              <Trophy size={40} className="mx-auto mb-3 text-ios-gray/20" />
              <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Loading history</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ios-gray">
                Completed events are being synced from the cloud.
              </p>
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/8 bg-surface p-10 text-center">
              <Trophy size={40} className="mx-auto mb-3 text-ios-gray/20" />
              <h3 className="text-[18px] font-bold tracking-tight text-on-surface">No history yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ios-gray">
                Completed events will show up here once your matches are finalized.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTournaments.map((item) => (
                <React.Fragment key={item.id}>
                  {renderHistoryCard(item, () => onOpenTournament(item))}
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
