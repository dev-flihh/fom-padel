import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, PlusCircle, Trophy } from 'lucide-react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { InstallAppButton } from '../../components/app/InstallAppButton';
import { PLAYER_MATCH_LEDGER_COLLECTION } from '../../services/firestoreCollections';
import { RankTier, Tournament, TournamentHistory } from '../../types';
import { sortTournamentsByNewest } from '../history/historyUtils';
import { getRankInfo } from '../ranking/rankUtils';

const MMR_DELTA_7D_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

const readCachedMmrDelta7d = (uid: string): number | null => {
  try {
    const raw = localStorage.getItem(`fom_play_mmr_delta_7d_${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; delta?: number };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MMR_DELTA_7D_CACHE_MAX_AGE_MS) return null;
    const delta = Number(parsed.delta);
    return Number.isFinite(delta) ? delta : null;
  } catch {
    return null;
  }
};

const writeCachedMmrDelta7d = (uid: string, delta: number) => {
  try {
    localStorage.setItem(`fom_play_mmr_delta_7d_${uid}`, JSON.stringify({
      savedAt: Date.now(),
      delta
    }));
  } catch {
    // Cache writes are best effort only.
  }
};

export const DashboardScreen = ({
  onStartMatch,
  onOpenRankingForMe,
  tournament,
  onContinueMatch,
  onNotifications,
  onOpenHistoryList,
  onOpenHistoryMatch,
  notificationsEnabled,
  unreadCount,
  tournaments,
  user,
  isHistoryLoading,
  renderLogo,
  renderHistoryCard
}: {
  onStartMatch: () => void,
  onOpenRankingForMe: () => void,
  tournament: Tournament,
  onContinueMatch: () => void,
  onNotifications: () => void,
  onOpenHistoryList: () => void,
  onOpenHistoryMatch: (t: TournamentHistory) => void,
  notificationsEnabled: boolean,
  unreadCount: number,
  tournaments: TournamentHistory[],
  user: any,
  isHistoryLoading: boolean,
  renderLogo: (className: string) => React.ReactNode,
  renderHistoryCard: (tournament: TournamentHistory, onClick: () => void) => React.ReactNode
}) => {
  const activeRound = tournament.rounds?.find(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
  const activeMatches = activeRound ? activeRound.matches.filter(m => m && m.status === 'active') : [];
  const featuredActiveMatch = activeMatches[0] || null;
  const recentTournaments = useMemo(() => sortTournamentsByNewest(tournaments).slice(0, 3), [tournaments]);
  const currentMmr = Number.isFinite(Number(user?.mmr)) ? Number(user.mmr) : 0;
  const currentRank = getRankInfo(currentMmr);
  const compactRankLabel: Record<RankTier, string> = {
    Rookie: 'Rookie',
    Amateur: 'Amat.',
    Challenger: 'Chall.',
    Elite: 'Elite',
    Master: 'Master',
    Grandmaster: 'Grand.',
    Legend: 'Legend',
    'Hall of Fame': 'Hall'
  };
  const [mmrDelta7d, setMmrDelta7d] = useState(0);
  const [isMmrDeltaLoading, setIsMmrDeltaLoading] = useState(false);
  const mmrDeltaLabel = `${mmrDelta7d >= 0 ? '+' : ''}${mmrDelta7d.toLocaleString()} this week`;

  useEffect(() => {
    const uid = String(user?.uid || '').trim();
    if (!uid) {
      setMmrDelta7d(0);
      setIsMmrDeltaLoading(false);
      return;
    }

    const cachedDelta = readCachedMmrDelta7d(uid);
    if (cachedDelta !== null) {
      setMmrDelta7d(cachedDelta);
      setIsMmrDeltaLoading(false);
      return;
    }

    let isCancelled = false;
    const loadMmrDelta7d = async () => {
      setIsMmrDeltaLoading(true);
      try {
        const cutoffMs = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const snapshot = await getDocs(
          query(
            collection(db, PLAYER_MATCH_LEDGER_COLLECTION),
            where('uid', '==', uid),
            where('playedAt', '>=', Timestamp.fromMillis(cutoffMs)),
            orderBy('playedAt', 'desc')
          )
        );
        let delta = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const playedAtMs = data?.playedAt?.toDate ? data.playedAt.toDate().getTime() : 0;
          const createdAtMs = data?.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0;
          const referenceMs = playedAtMs || createdAtMs || 0;
          if (referenceMs < cutoffMs) return;
          const rowDelta = Number(data?.deltaMmr);
          if (!Number.isFinite(rowDelta)) return;
          delta += rowDelta;
        });
        if (!isCancelled) {
          setMmrDelta7d(delta);
          writeCachedMmrDelta7d(uid, delta);
        }
      } catch (err) {
        console.error('Error fetching 7-day MMR delta:', err);
        if (!isCancelled) setMmrDelta7d(0);
      } finally {
        if (!isCancelled) setIsMmrDeltaLoading(false);
      }
    };

    void loadMmrDelta7d();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  return (
    <div className="pb-32">
      <main className="max-w-2xl mx-auto px-4 pt-5 sm:pt-6 space-y-5">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            {renderLogo('h-8 w-auto')}
            <div className="flex items-center gap-1.5">
              <InstallAppButton
                compact
                className="bg-white text-primary border-primary/20"
              />
              {notificationsEnabled && (
                <button
                  onClick={onNotifications}
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-black/5 bg-ios-gray/5 tap-target transition-all active:scale-[0.98]"
                  aria-label="Open notifications"
                >
                  <Bell size={19} className="text-on-surface" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 min-w-[16px] h-4 px-1 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight tracking-tight text-ios-gray">
              <span aria-hidden="true">👋</span> Welcome back
            </p>
            <h1 className="text-[36px] leading-[1.05] font-display font-black tracking-[-0.04em] text-on-surface">
              {user?.displayName || 'Padel Player'}
            </h1>
          </div>
        </section>

        <section className="space-y-3">
          <div className="mb-3 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="flex shrink-0 items-baseline gap-1">
              <span className="font-display text-[15px] leading-none font-extrabold tracking-[-0.02em] tabular-nums text-on-surface">
                {currentMmr.toLocaleString()}
              </span>
              <span className="text-[13px] font-semibold leading-none text-ios-gray">MMR</span>
            </div>
            <div className="h-3.5 w-px shrink-0 bg-black/10" />
            <div className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-bold leading-none text-ios-gray">
              <currentRank.icon size={10} strokeWidth={2.3} className="shrink-0 text-ios-gray/80" />
              <span>{compactRankLabel[currentRank.name]}</span>
            </div>
            <div className="h-3.5 w-px shrink-0 bg-black/10" />
            <span className="inline-flex h-[22px] max-w-[7.25rem] shrink-0 items-center justify-center truncate rounded-full bg-emerald-50 px-2 text-[12px] font-bold leading-none text-emerald-600">
              {isMmrDeltaLoading ? 'Loading...' : mmrDeltaLabel}
            </span>
            <button
              onClick={onOpenRankingForMe}
              className="ml-auto inline-flex h-[22px] shrink-0 items-center justify-end gap-1 text-[13px] font-semibold leading-none text-primary tap-target transition-all active:scale-[0.98]"
            >
              <span>Ranking</span>
              <ChevronRight size={13} strokeWidth={2.4} />
            </button>
          </div>

          <div
            onClick={onStartMatch}
            className="w-full rounded-[24px] border border-primary/15 bg-primary px-5 py-4 text-white tap-target cursor-pointer shadow-[0_8px_18px_rgba(255,85,1,0.12)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="block text-[22px] leading-tight font-display font-black tracking-tight">Start Match</span>
                <span className="mt-1 block text-[12px] font-semibold text-white/78">Set players and start scoring.</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
                <PlusCircle size={24} />
              </div>
            </div>
          </div>
        </section>

        {featuredActiveMatch && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-on-surface">Continue Match</h2>
              </div>
              {activeMatches.length > 1 && (
                <span className="shrink-0 rounded-full border border-black/5 bg-ios-gray/[0.04] px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
                  {activeMatches.length} active
                </span>
              )}
            </div>
            <button
              onClick={onContinueMatch}
              className="w-full rounded-[22px] border border-black/5 bg-ios-gray/[0.045] px-4 py-4 text-left tap-target transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {tournament.name}
                  </span>
                  <h3 className="mt-2 text-[18px] leading-tight font-bold tracking-tight text-on-surface">
                    Round {featuredActiveMatch.roundId} · Court {featuredActiveMatch.court}
                  </h3>
                  <p className="mt-1 text-[13px] text-ios-gray">
                    {featuredActiveMatch.teamA.players?.map((p) => p?.name?.split(' ')[0]).join(' & ')} vs {featuredActiveMatch.teamB.players?.map((p) => p?.name?.split(' ')[0]).join(' & ')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Live score</p>
                  <p className="mt-1 text-[28px] leading-none font-display font-black tracking-tight tabular-nums text-on-surface">
                    <span className="text-on-surface">{featuredActiveMatch.teamA.score}</span>
                    <span className="mx-1 text-ios-gray/35">-</span>
                    <span className="text-on-surface">{featuredActiveMatch.teamB.score}</span>
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-ios-gray">{featuredActiveMatch.duration || '00:00'}</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-[12px] font-semibold text-on-surface/88">
                Continue scoring
                <ChevronRight size={14} />
              </div>
            </button>
          </section>
        )}

        <section className="pb-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-on-surface">Recent History</h2>
            </div>
            <button
              onClick={onOpenHistoryList}
              className="shrink-0 rounded-full border border-black/5 bg-ios-gray/5 px-3 py-2 text-[12px] font-semibold text-on-surface tap-target transition-all active:scale-[0.98]"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {isHistoryLoading ? (
              <div className="rounded-[28px] border border-ios-gray/10 bg-ios-gray/[0.03] p-8 text-center">
                <Trophy size={36} className="text-ios-gray/20 mx-auto mb-3" />
                <p className="text-ios-gray font-medium">Loading history...</p>
              </div>
            ) : recentTournaments.length === 0 ? (
              <div className="rounded-[28px] border border-ios-gray/10 bg-ios-gray/[0.03] p-8 text-center">
                <Trophy size={36} className="text-ios-gray/20 mx-auto mb-3" />
                <p className="text-ios-gray font-medium">No finished matches yet.</p>
              </div>
            ) : (
              recentTournaments.map((item) => (
                <React.Fragment key={item.id}>
                  {renderHistoryCard(item, () => onOpenHistoryMatch(item))}
                </React.Fragment>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
