import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, SlidersHorizontal, X } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { db } from '../../firebase';
import { PLAYER_MATCH_LEDGER_COLLECTION } from '../../services/firestoreCollections';
import { type PlayerMatchLedgerEntry } from '../../types';
import { getRankInfo } from './rankUtils';
import { MMRSessionHistoryCard } from './MMRSessionHistoryCard';
import { formatLedgerEntryDate, formatMmrDelta, getLedgerEntryTimestamp, getLedgerGroupLabel, type MMRSessionHistoryGroup } from './mmrHistoryUtils';
import { rankingDetailBackButtonClassName, rankingDetailHeaderClassName, rankingDetailTitleClassName } from './rankingDetailLayout';

const MMR_HISTORY_PAGE_SIZE = 40;

export const MMRHistoryScreen = ({ currentUser, onBack, onOpenRankDetails, renderLogo }: { currentUser: any; onBack: () => void; onOpenRankDetails: () => void; renderLogo: (className: string) => React.ReactNode }) => {
  const uid = String(currentUser?.uid || '').trim();
  const currentMmr = Number.isFinite(Number(currentUser?.mmr)) ? Number(currentUser.mmr) : 0;
  const currentRank = getRankInfo(currentMmr);
  const [entries, setEntries] = useState<PlayerMatchLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [lastEntryCursor, setLastEntryCursor] = useState<any | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [rangeFilter, setRangeFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMoreEntries(false);
      setLastEntryCursor(null);
      setLoadError('');
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setHasMoreEntries(false);
    setLastEntryCursor(null);

    const buildHistoryQuery = (cursor?: any) => {
      const constraints: any[] = [where('uid', '==', uid)];
      if (rangeFilter === '7d' || rangeFilter === '30d') {
        const days = rangeFilter === '7d' ? 7 : 30;
        const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
        constraints.push(where('playedAt', '>=', Timestamp.fromMillis(cutoffMs)));
      }
      constraints.push(orderBy('playedAt', 'desc'));
      constraints.push(limit(MMR_HISTORY_PAGE_SIZE));
      if (cursor) constraints.push(startAfter(cursor));
      return query(collection(db, PLAYER_MATCH_LEDGER_COLLECTION), ...constraints);
    };

    let isCancelled = false;
    const loadInitialEntries = async () => {
      try {
        const snapshot = await getDocs(buildHistoryQuery());
        if (isCancelled) return;

        const nextEntries = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as PlayerMatchLedgerEntry));
        setEntries(nextEntries);
        setLastEntryCursor(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMoreEntries(snapshot.docs.length === MMR_HISTORY_PAGE_SIZE);
      } catch (error) {
        console.error('MMR history fetch error:', error);
        if (isCancelled) return;
        setEntries([]);
        setLoadError('Unable to load your MMR history right now.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void loadInitialEntries();
    return () => {
      isCancelled = true;
    };
  }, [uid, rangeFilter]);

  const handleLoadMoreEntries = async () => {
    if (!uid || !lastEntryCursor || isLoadingMore || !hasMoreEntries) return;

    setIsLoadingMore(true);
    try {
      const constraints: any[] = [where('uid', '==', uid)];
      if (rangeFilter === '7d' || rangeFilter === '30d') {
        const days = rangeFilter === '7d' ? 7 : 30;
        const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
        constraints.push(where('playedAt', '>=', Timestamp.fromMillis(cutoffMs)));
      }
      constraints.push(orderBy('playedAt', 'desc'));
      constraints.push(startAfter(lastEntryCursor));
      constraints.push(limit(MMR_HISTORY_PAGE_SIZE));

      const snapshot = await getDocs(query(collection(db, PLAYER_MATCH_LEDGER_COLLECTION), ...constraints));
      const nextEntries = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as PlayerMatchLedgerEntry));
      setEntries((prev) => [...prev, ...nextEntries]);
      setLastEntryCursor(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMoreEntries(snapshot.docs.length === MMR_HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error('MMR history load more error:', error);
      setLoadError('Unable to load more MMR history right now.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const rangeOptions: { value: '7d' | '30d' | 'all'; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: 'all', label: 'All' },
  ];
  const resultOptions: { value: 'all' | 'win' | 'loss' | 'draw'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'win', label: 'Wins' },
    { value: 'loss', label: 'Losses' },
    { value: 'draw', label: 'Draws' },
  ];

  const summary = useMemo(() => {
    const nowMs = Date.now();
    const cutoff7d = nowMs - (7 * 24 * 60 * 60 * 1000);
    const cutoff30d = nowMs - (30 * 24 * 60 * 60 * 1000);
    let delta7d = 0;
    let delta30d = 0;

    entries.forEach((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry)?.getTime() || 0;
      const delta = Number(entry.deltaMmr || 0);
      if (timestamp >= cutoff7d) delta7d += delta;
      if (timestamp >= cutoff30d) delta30d += delta;
    });

    return {
      delta7d,
      delta30d,
      totalMatches: rangeFilter === 'all'
        ? Math.max(entries.length, Number(currentUser?.totalMatches || 0))
        : entries.length,
      lastEntry: entries[0] || null
    };
  }, [currentUser?.totalMatches, entries, rangeFilter]);

  const filteredEntries = useMemo(() => {
    const nowMs = Date.now();
    const cutoffMs = rangeFilter === '7d'
      ? nowMs - (7 * 24 * 60 * 60 * 1000)
      : rangeFilter === '30d'
        ? nowMs - (30 * 24 * 60 * 60 * 1000)
        : 0;

    return entries.filter((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry)?.getTime() || 0;
      const matchesRange = rangeFilter === 'all' || timestamp >= cutoffMs;
      const matchesResult = resultFilter === 'all' || entry.result === resultFilter;
      return matchesRange && matchesResult;
    });
  }, [entries, rangeFilter, resultFilter]);

  const groupedEntries = useMemo(() => {
    const groups: { label: string; key: string; items: PlayerMatchLedgerEntry[] }[] = [];
    filteredEntries.forEach((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry);
      const key = timestamp
        ? `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`
        : 'unknown';
      const existingGroup = groups.find((group) => group.key === key);
      if (existingGroup) {
        existingGroup.items.push(entry);
        return;
      }
      groups.push({
        key,
        label: getLedgerGroupLabel(timestamp),
        items: [entry]
      });
    });
    return groups;
  }, [filteredEntries]);
  const sessionGroups = useMemo(() => {
    return groupedEntries.map((group) => {
      const sessions: MMRSessionHistoryGroup[] = [];

      group.items.forEach((entry) => {
        const timestamp = getLedgerEntryTimestamp(entry);
        const key = `${entry.tournamentId || 'unknown'}-${group.key}`;
        const existingSession = sessions.find((session) => session.key === key);
        const targetSession = existingSession || {
          key,
          name: entry.tournamentName || 'Game Padel',
          date: timestamp
            ? timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : group.label,
          net: 0,
          wins: 0,
          losses: 0,
          items: []
        };

        targetSession.net += Number(entry.deltaMmr || 0);
        if (entry.result === 'win') targetSession.wins += 1;
        if (entry.result === 'loss') targetSession.losses += 1;
        targetSession.items.push(entry);

        if (!existingSession) sessions.push(targetSession);
      });

      return { ...group, sessions };
    });
  }, [groupedEntries]);

  const lastFiveResults = useMemo(
    () => entries
      .filter((entry) => entry.result === 'win' || entry.result === 'loss')
      .slice(0, 5),
    [entries]
  );
  const activeFilterCount = (rangeFilter !== '30d' ? 1 : 0) + (resultFilter !== 'all' ? 1 : 0);
  const selectedRangeLabel = rangeOptions.find((option) => option.value === rangeFilter)?.label || '30D';
  const selectedResultLabel = resultOptions.find((option) => option.value === resultFilter)?.label || 'All';
  const latestDelta = Number(summary.lastEntry?.deltaMmr || 0);
  const displayName = String(currentUser?.displayName || currentUser?.username || 'Player').trim();
  const lastFiveWins = lastFiveResults.filter((entry) => entry.result === 'win').length;
  const lastFiveLosses = lastFiveResults.filter((entry) => entry.result === 'loss').length;
  const heroSparkPoints = useMemo(() => {
    const recent = [...entries].slice(0, 12).reverse();
    if (recent.length === 0) return '0,40 60,34 120,30 180,24 240,16 300,18 340,12';
    const values: number[] = [];
    let running = Number(recent[0]?.mmrBefore);
    if (!Number.isFinite(running)) {
      running = Math.max(0, currentMmr - recent.reduce((sum, entry) => sum + Number(entry.deltaMmr || 0), 0));
    }
    recent.forEach((entry) => {
      const after = Number(entry.mmrAfter);
      running = Number.isFinite(after) ? after : running + Number(entry.deltaMmr || 0);
      values.push(running);
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    return values.map((value, index) => {
      const x = values.length === 1 ? 340 : (index / (values.length - 1)) * 340;
      const y = 44 - ((value - min) / span) * 38;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [currentMmr, entries]);
  const resetFilters = () => {
    setRangeFilter('30d');
    setResultFilter('all');
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className={rankingDetailHeaderClassName}>
        <button
          onClick={onBack}
          className={rankingDetailBackButtonClassName}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <h1 className={rankingDetailTitleClassName}>MMR History</h1>
      </header>

      <main className="mx-auto max-w-[430px]">
        <section className="mx-4 mb-3 overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f3460_0%,#08203e_100%)] px-[22px] py-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                {renderLogo('h-[26px] w-[26px] rounded-[7px] brightness-0 invert')}
              <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-white/80">FOM Play</span>
            </div>
            <button
              type="button"
              onClick={onOpenRankDetails}
              className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 active:bg-white/15"
            >
              Ranking Guide
            </button>
          </div>

          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80">Current Rating</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[54px] font-black leading-none tracking-[-0.05em] tabular-nums">{currentMmr.toLocaleString()}</span>
                <span className="text-[15px] font-bold text-white/80">MMR</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
                  {currentRank.name}
                </span>
                <span className="truncate text-[12px] font-bold text-white/75">{displayName}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white/80">Latest Change</p>
              <div className="mb-1.5 inline-block rounded-[14px] bg-white/10 px-4 py-2">
                <span className={cn('text-[30px] font-black leading-none tracking-[-0.04em] tabular-nums', latestDelta >= 0 ? 'text-[#6ee7b7]' : 'text-[#fca5a5]')}>
                  {summary.lastEntry ? formatMmrDelta(latestDelta) : '0'}
                </span>
              </div>
              <p className="text-[11px] text-white/50">{summary.lastEntry ? formatLedgerEntryDate(getLedgerEntryTimestamp(summary.lastEntry)) : 'No matches yet'}</p>
            </div>
          </div>

          <svg viewBox="0 0 340 48" preserveAspectRatio="none" className="mb-3 h-12 w-full overflow-visible">
            <polyline points={heroSparkPoints} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '7 Days', value: formatMmrDelta(summary.delta7d), sub: 'MMR', positive: summary.delta7d >= 0 },
              { label: '30 Days', value: formatMmrDelta(summary.delta30d), sub: 'MMR', positive: summary.delta30d >= 0 },
              { label: 'Matches', value: String(summary.totalMatches), sub: 'played', positive: false },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[14px] bg-white/10 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.05em] text-white/75">{stat.label}</p>
                <p className={cn('text-[20px] font-black leading-none tracking-tight tabular-nums', stat.positive ? 'text-[#6ee7b7]' : 'text-white')}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-white/50">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-4 mb-3 flex items-center justify-between rounded-[18px] bg-white px-[18px] py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[12px] font-bold text-[#6b7280]">Last 5 Matches</p>
          <div className="flex items-center gap-1.5">
            {lastFiveResults.length > 0
              ? lastFiveResults.map((entry) => (
                <span key={entry.id} className={cn('h-2.5 w-2.5 rounded-full', entry.result === 'win' ? 'bg-[#18a486]' : 'bg-[#ef4444]')} />
              ))
              : [0, 1, 2, 3, 4].map((item) => <span key={item} className="h-2.5 w-2.5 rounded-full bg-[#d7d9df]" />)}
          </div>
          <p className="text-[12px] font-extrabold text-[#111827]">{lastFiveWins}W · {lastFiveLosses}L</p>
        </section>

        <section className="mb-2 flex items-center justify-between px-5">
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold tracking-tight text-[#111827]">Match History</p>
            {activeFilterCount > 0 && (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#6b7280]">{selectedRangeLabel} · {selectedResultLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#374151] shadow-[0_1px_4px_rgba(0,0,0,0.07)] active:bg-[#f7f7fa]"
          >
            <SlidersHorizontal size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white">{activeFilterCount}</span>
            )}
          </button>
        </section>

        {isLoading && (
          <section className="mx-4 space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-[20px] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[13px] bg-ios-gray/10" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded-full bg-ios-gray/10" />
                    <div className="mt-2 h-3 w-24 rounded-full bg-ios-gray/10" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!isLoading && loadError && (
          <section className="mx-4 rounded-2xl bg-white px-4 py-5 shadow-sm">
            <p className="text-[13px] font-semibold text-error">{loadError}</p>
          </section>
        )}

        {!isLoading && !loadError && sessionGroups.length === 0 && (
          <section className="mx-4 rounded-2xl bg-white px-4 py-5 shadow-sm">
            <p className="text-[14px] font-semibold text-on-surface">No MMR entries yet</p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-ios-gray">
              Your match-by-match rating timeline will appear after completed sessions finish syncing.
            </p>
          </section>
        )}

        {!isLoading && !loadError && sessionGroups.length > 0 && (
          <section className="pb-5">
            {sessionGroups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2.5 px-5 pb-2 pt-1">
                  <span className="shrink-0 text-[12px] font-bold text-[#9ca3af]">{group.label}</span>
                  <span className="h-px flex-1 bg-black/10" />
                </div>
                {group.sessions.map((session, sessionIndex) => (
                  <React.Fragment key={session.key}>
                    <MMRSessionHistoryCard
                      session={session}
                      defaultOpen={sessionIndex === 0 && group.key === sessionGroups[0]?.key}
                    />
                  </React.Fragment>
                ))}
              </div>
            ))}
            {hasMoreEntries && (
              <div className="px-4 pt-2">
                <button
                  type="button"
                  onClick={handleLoadMoreEntries}
                  disabled={isLoadingMore}
                  className="flex w-full items-center justify-center rounded-[18px] border border-black/5 bg-white px-4 py-3 text-[13px] font-semibold tracking-tight text-on-surface shadow-[0_1px_4px_rgba(0,0,0,0.06)] tap-target transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {isLoadingMore ? 'Loading more...' : 'Load more history'}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="relative w-full max-w-lg rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl sm:max-w-md sm:rounded-[32px] sm:px-6"
            >
              <div className="mx-auto h-1.5 w-14 rounded-full bg-ios-gray/20" />

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Filter</h3>
                  <p className="mt-1 text-[13px] font-medium text-ios-gray">Choose the timeline view you want to see.</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[12px] font-bold text-primary tap-target"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-surface tap-target"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <section>
                  <h4 className="text-[13px] font-bold tracking-tight text-on-surface">Range</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rangeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRangeFilter(option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                          rangeFilter === option.value
                            ? 'border-primary/15 bg-primary/10 text-primary'
                            : 'border-[#cad3e4] bg-white text-[#667085]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[13px] font-bold tracking-tight text-on-surface">Result</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setResultFilter(option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                          resultFilter === option.value
                            ? 'border-primary/15 bg-primary/10 text-primary'
                            : 'border-[#cad3e4] bg-white text-[#667085]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
