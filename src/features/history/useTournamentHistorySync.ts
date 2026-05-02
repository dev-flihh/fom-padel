import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { auth } from '../../firebase';
import { type TournamentHistory } from '../../types';
import { HISTORY_RECENT_FETCH_LIMIT } from './historyPersistence';
import { fetchTournamentHistoryForUser } from './fetchTournamentHistory';

type RecordDbMetric = (record: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type RecordDbError = (record: {
  flow: string;
  label?: string;
  err: any;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

export const useTournamentHistorySync = ({
  userUid,
  isSharedViewer,
  screen,
  tournamentsLength,
  hasFreshHistoryCache,
  hasSyncedHistoryThisSession,
  historySyncInFlightRef,
  isFirestoreSaverModeEnabled,
  recordDbMetric,
  recordDbError,
  setTournaments,
  setHasFreshHistoryCache,
  setHasSyncedHistoryThisSession,
  setIsHistorySyncing,
  setHasResolvedInitialHistoryHydration,
}: {
  userUid?: string | null;
  isSharedViewer: boolean;
  screen: string;
  tournamentsLength: number;
  hasFreshHistoryCache: boolean;
  hasSyncedHistoryThisSession: boolean;
  historySyncInFlightRef: MutableRefObject<boolean>;
  isFirestoreSaverModeEnabled: () => boolean;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  setHasFreshHistoryCache: Dispatch<SetStateAction<boolean>>;
  setHasSyncedHistoryThisSession: Dispatch<SetStateAction<boolean>>;
  setIsHistorySyncing: Dispatch<SetStateAction<boolean>>;
  setHasResolvedInitialHistoryHydration: Dispatch<SetStateAction<boolean>>;
}) => {
  useEffect(() => {
    const uid = String(userUid || '').trim();
    if (!uid || isSharedViewer) return;
    const hasCachedHistoryEntries = tournamentsLength > 0;
    if (isFirestoreSaverModeEnabled() && (hasFreshHistoryCache || hasCachedHistoryEntries)) {
      recordDbMetric({ flow: 'history', operation: 'skip', count: 1, label: `saver_mode_cache_only:${screen}` });
      return;
    }
    if (historySyncInFlightRef.current) return;

    const needsFullHistoryNow = ['history', 'history-detail', 'profile'].includes(screen);
    const needsHistoryNow = needsFullHistoryNow;
    if (hasSyncedHistoryThisSession && !needsHistoryNow) return;

    let isCancelled = false;
    const syncTournamentHistory = async () => {
      historySyncInFlightRef.current = true;
      setIsHistorySyncing(true);
      try {
        const fetchedTournaments = await fetchTournamentHistoryForUser({
          uid,
          limitCount: needsFullHistoryNow ? undefined : HISTORY_RECENT_FETCH_LIMIT,
          getIdToken: async () => auth.currentUser?.getIdToken(),
          recordDbMetric,
          recordDbError
        });
        if (isCancelled) return;
        setTournaments((prev) => {
          const merged = new Map<string, TournamentHistory>();
          [...prev, ...fetchedTournaments].forEach((item) => {
            const existing = merged.get(item.id);
            if (!existing) {
              merged.set(item.id, item);
              return;
            }
            const existingTs = new Date(existing.date).getTime();
            const itemTs = new Date(item.date).getTime();
            if (itemTs >= existingTs) merged.set(item.id, item);
          });
          return Array.from(merged.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
        setHasFreshHistoryCache(true);
        setHasSyncedHistoryThisSession(true);
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      } finally {
        historySyncInFlightRef.current = false;
        if (!isCancelled) {
          setIsHistorySyncing(false);
          setHasResolvedInitialHistoryHydration(true);
        }
      }
    };

    void syncTournamentHistory();
    return () => {
      isCancelled = true;
    };
  }, [
    hasFreshHistoryCache,
    hasSyncedHistoryThisSession,
    historySyncInFlightRef,
    isFirestoreSaverModeEnabled,
    isSharedViewer,
    recordDbError,
    recordDbMetric,
    screen,
    setHasFreshHistoryCache,
    setHasResolvedInitialHistoryHydration,
    setHasSyncedHistoryThisSession,
    setIsHistorySyncing,
    setTournaments,
    tournamentsLength,
    userUid,
  ]);
};
