import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import type { Tournament, TournamentHistory, TournamentStatsSyncState } from '../../types';
import { deleteActiveTournamentDraft, saveActiveTournamentDraft } from '../../services/activeDraftRepository';
import { PLAYER_STATS_COLLECTION, SHARED_MATCHES_COLLECTION, TOURNAMENTS_COLLECTION, ACTIVE_TOURNAMENT_DRAFTS_COLLECTION } from '../../services/firestoreCollections';
import { saveSharedMatches } from '../../services/sharedMatchRepository';
import { invalidateTournamentHistoryCacheMetadata, normalizeHistoryTournament } from '../history/historyPersistence';
import { clearCachedLeaderboardUsers } from '../ranking/leaderboardCache';

const TOURNAMENT_STATS_SYNC_SUCCESS_BADGE_MS = 6000;

type RecordDbMetric = (input: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type RecordDbError = (input: {
  flow: string;
  label?: string;
  err: unknown;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type UseActiveTournamentLifecycleParams = {
  isSharedViewer: boolean;
  userUid: string | null | undefined;
  sharedMatchId: string | null;
  linkedShareIds: string[];
  hydratedHistoryCacheRef: MutableRefObject<string | null>;
  hasTournamentActivity: (targetTournament: Tournament | TournamentHistory) => boolean;
  toFirestoreSafe: <T,>(value: T) => T;
  toShareableTournamentSnapshot: (targetTournament: Tournament | TournamentHistory) => unknown;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
  setUser: Dispatch<SetStateAction<any>>;
  setActiveSaveState: Dispatch<SetStateAction<'saved' | 'saving' | 'error'>>;
  setLeaderboardRefreshToken: Dispatch<SetStateAction<number>>;
  setHasFreshHistoryCache: Dispatch<SetStateAction<boolean>>;
  setHasSyncedHistoryThisSession: Dispatch<SetStateAction<boolean>>;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  setSelectedHistory: Dispatch<SetStateAction<TournamentHistory | null>>;
  setSelectedKlasemenTournament: Dispatch<SetStateAction<Tournament | TournamentHistory | null>>;
};

export const useActiveTournamentLifecycle = ({
  isSharedViewer,
  userUid,
  sharedMatchId,
  linkedShareIds,
  hydratedHistoryCacheRef,
  hasTournamentActivity,
  toFirestoreSafe,
  toShareableTournamentSnapshot,
  recordDbMetric,
  recordDbError,
  setUser,
  setActiveSaveState,
  setLeaderboardRefreshToken,
  setHasFreshHistoryCache,
  setHasSyncedHistoryThisSession,
  setTournaments,
  setSelectedHistory,
  setSelectedKlasemenTournament,
}: UseActiveTournamentLifecycleParams) => {
  const [tournamentStatsSync, setTournamentStatsSync] = useState<{ tournamentId: string; state: TournamentStatsSyncState } | null>(null);
  const tournamentStatsSyncUnsubscribeRef = useRef<(() => void) | null>(null);
  const tournamentStatsSyncTimeoutRef = useRef<number | null>(null);

  const patchTournamentStatsMetadata = (tournamentId: string, patch: Partial<TournamentHistory>) => {
    setTournaments((prev) => prev.map((item) => (
      item.id === tournamentId ? normalizeHistoryTournament({ ...item, ...patch }) : item
    )));
    setSelectedHistory((prev) => (
      prev?.id === tournamentId ? normalizeHistoryTournament({ ...prev, ...patch }) : prev
    ));
    setSelectedKlasemenTournament((prev) => {
      if (!prev || !('id' in prev) || prev.id !== tournamentId) return prev;
      if ('date' in prev) {
        return normalizeHistoryTournament({ ...(prev as TournamentHistory), ...patch });
      }
      return {
        ...(prev as Tournament),
        ...(patch as Partial<Tournament>),
      };
    });
  };

  const clearTournamentStatsSyncWatch = () => {
    tournamentStatsSyncUnsubscribeRef.current?.();
    tournamentStatsSyncUnsubscribeRef.current = null;
    if (tournamentStatsSyncTimeoutRef.current) {
      window.clearTimeout(tournamentStatsSyncTimeoutRef.current);
      tournamentStatsSyncTimeoutRef.current = null;
    }
  };

  useEffect(() => () => {
    clearTournamentStatsSyncWatch();
  }, []);

  const persistActiveTournamentSnapshot = async (nextTournament: Tournament) => {
    if (isSharedViewer) return;
    const currentUid = auth.currentUser?.uid || userUid;
    if (!currentUid) return;
    if (!hasTournamentActivity(nextTournament)) return;

    setActiveSaveState('saving');
    try {
      await saveActiveTournamentDraft(currentUid, toFirestoreSafe(nextTournament));
      recordDbMetric({
        flow: 'active_draft',
        operation: 'write',
        count: 1,
        label: 'persist_snapshot',
        dbRole: 'ephemeral',
        collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION,
      });
      setActiveSaveState('saved');
    } catch (err) {
      recordDbError({
        flow: 'active_draft',
        label: 'persist_snapshot',
        err,
        dbRole: 'ephemeral',
        collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION,
      });
      console.error('Active tournament milestone save error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: userUid || null,
      });
      setActiveSaveState('error');
    }
  };

  const clearActiveTournamentSnapshot = async () => {
    if (isSharedViewer) return;
    const currentUid = auth.currentUser?.uid || userUid;
    if (!currentUid) return;

    setActiveSaveState('saving');
    try {
      await deleteActiveTournamentDraft(currentUid);
      recordDbMetric({
        flow: 'active_draft',
        operation: 'delete',
        count: 1,
        label: 'clear_snapshot',
        dbRole: 'ephemeral',
        collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION,
      });
      setActiveSaveState('saved');
    } catch (err) {
      recordDbError({
        flow: 'active_draft',
        label: 'clear_snapshot',
        err,
        dbRole: 'ephemeral',
        collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION,
      });
      console.error('Active tournament clear sync error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: userUid || null,
      });
      setActiveSaveState('error');
    }
  };

  const refreshCurrentUserStatsFromFirestore = async (uid: string) => {
    const trimmedUid = String(uid || '').trim();
    if (!trimmedUid) return;

    try {
      const statsSnapshot = await getDoc(doc(db, PLAYER_STATS_COLLECTION, trimmedUid));
      recordDbMetric({
        flow: 'finalize',
        operation: 'read',
        count: 1,
        docs: statsSnapshot.exists() ? 1 : 0,
        label: 'refresh_current_user_stats',
        dbRole: 'primary',
        collection: PLAYER_STATS_COLLECTION,
      });
      if (!statsSnapshot.exists()) return;
      const stats = statsSnapshot.data() || {};
      const mmr = Number(stats?.mmr);
      const totalMatches = Number(stats?.totalMatches);
      const wins = Number(stats?.wins);
      const losses = Number(stats?.losses);

      setUser((prev: any) => {
        if (!prev || prev.uid !== trimmedUid) return prev;
        return {
          ...prev,
          ...(Number.isFinite(mmr) ? { mmr } : {}),
          ...(Number.isFinite(totalMatches) && totalMatches >= 0 ? { totalMatches } : {}),
          ...(Number.isFinite(wins) && wins >= 0 ? { wins } : {}),
          ...(Number.isFinite(losses) && losses >= 0 ? { losses } : {}),
        };
      });
    } catch (err) {
      recordDbError({
        flow: 'finalize',
        label: 'refresh_current_user_stats',
        err,
        dbRole: 'primary',
        collection: PLAYER_STATS_COLLECTION,
      });
      console.error('Post-finalization player_stats refresh error:', err);
    }
  };

  const watchTournamentStatsSync = (tournamentId: string) => {
    if (!tournamentId) return;
    clearTournamentStatsSyncWatch();
    setTournamentStatsSync({ tournamentId, state: 'syncing' });

    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
    recordDbMetric({
      flow: 'finalize',
      operation: 'listen',
      count: 1,
      label: 'stats_sync_watch',
      dbRole: 'primary',
      collection: TOURNAMENTS_COLLECTION,
    });
    const unsubscribe = onSnapshot(tournamentRef, (snapshot) => {
      recordDbMetric({
        flow: 'finalize',
        operation: 'read',
        count: 1,
        docs: snapshot.exists() ? 1 : 0,
        label: 'stats_sync_update',
        dbRole: 'primary',
        collection: TOURNAMENTS_COLLECTION,
      });
      if (!snapshot.exists()) return;
      const data = snapshot.data() || {};
      const statsVersion = Number(data?.statsVersion || 0);
      patchTournamentStatsMetadata(tournamentId, {
        statsVersion,
        statsAppliedAt: data?.statsAppliedAt,
      });

      if (statsVersion >= 1 || Boolean(data?.statsAppliedAt)) {
        setTournamentStatsSync({ tournamentId, state: 'synced' });
        const currentUid = String(auth.currentUser?.uid || userUid || '').trim();
        clearCachedLeaderboardUsers();
        setLeaderboardRefreshToken((prev) => prev + 1);
        if (currentUid) {
          invalidateTournamentHistoryCacheMetadata(currentUid);
          hydratedHistoryCacheRef.current = null;
          setHasFreshHistoryCache(false);
          setHasSyncedHistoryThisSession(false);
          void refreshCurrentUserStatsFromFirestore(currentUid);
        }
        clearTournamentStatsSyncWatch();
        tournamentStatsSyncTimeoutRef.current = window.setTimeout(() => {
          setTournamentStatsSync((prev) => (
            prev?.tournamentId === tournamentId && prev.state === 'synced' ? null : prev
          ));
          tournamentStatsSyncTimeoutRef.current = null;
        }, TOURNAMENT_STATS_SYNC_SUCCESS_BADGE_MS);
      }
    }, (err) => {
      recordDbError({
        flow: 'finalize',
        label: 'stats_sync_watch',
        err,
        dbRole: 'primary',
        collection: TOURNAMENTS_COLLECTION,
      });
      console.error('Tournament stats sync watch error:', err);
      setTournamentStatsSync({ tournamentId, state: 'error' });
      clearTournamentStatsSyncWatch();
    });

    tournamentStatsSyncUnsubscribeRef.current = unsubscribe;
  };

  const resolveTournamentStatsSyncState = (targetTournament: Tournament | TournamentHistory | null | undefined): TournamentStatsSyncState | null => {
    const targetId = typeof targetTournament?.id === 'string' ? targetTournament.id.trim() : '';
    if (!targetId) return null;
    return tournamentStatsSync?.tournamentId === targetId ? tournamentStatsSync.state : null;
  };

  const syncSharedMatchesSnapshot = async (nextTournament: Tournament | TournamentHistory) => {
    if (isSharedViewer) return;
    const currentUid = auth.currentUser?.uid || userUid;
    if (!currentUid) return;

    const shareIdsToSync = Array.from(new Set([
      sharedMatchId,
      ...linkedShareIds,
    ].filter((id): id is string => Boolean(id))));
    if (shareIdsToSync.length === 0) return;

    const safeTournament = toShareableTournamentSnapshot(nextTournament);
    await saveSharedMatches(shareIdsToSync, () => ({
      tournament: safeTournament,
      hostUid: currentUid,
      activeStartedAt: Number(nextTournament.startedAt || 0),
      updatedAt: serverTimestamp(),
    }), { merge: true });
    recordDbMetric({
      flow: 'share_host',
      operation: 'write',
      count: shareIdsToSync.length,
      label: 'sync_shared_snapshot',
      dbRole: 'ephemeral',
      collection: SHARED_MATCHES_COLLECTION,
    });
  };

  const resetTournamentStatsSync = () => {
    clearTournamentStatsSyncWatch();
    setTournamentStatsSync(null);
  };

  const markTournamentStatsSyncError = (tournamentId: string) => {
    setTournamentStatsSync({ tournamentId, state: 'error' });
  };

  return {
    clearTournamentStatsSyncWatch,
    persistActiveTournamentSnapshot,
    clearActiveTournamentSnapshot,
    watchTournamentStatsSync,
    resolveTournamentStatsSyncState,
    syncSharedMatchesSnapshot,
    resetTournamentStatsSync,
    markTournamentStatsSyncError,
  };
};
