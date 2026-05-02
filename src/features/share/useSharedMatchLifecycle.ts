import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { getTournamentShareStorageKey } from '../history/historyPersistence';
import { discoverSharedMatchIdsForActiveTournament, getSharedMatchRef } from '../../services/sharedMatchRepository';
import { SHARED_MATCHES_COLLECTION } from '../../services/firestoreCollections';
import type { Screen, Tournament, TournamentHistory } from '../../types';

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

type UseSharedMatchLifecycleParams = {
  sharedMatchId: string | null;
  isSharedViewer: boolean;
  sharedTargetScreen: Screen;
  userUid: string | null | undefined;
  tournament: Tournament;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
  sharedLinkDiscoveryKeyRef: MutableRefObject<string>;
  hasTournamentActivity: (targetTournament: Tournament | TournamentHistory) => boolean;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setScreen: Dispatch<SetStateAction<Screen>>;
  setIsSharedDataReady: Dispatch<SetStateAction<boolean>>;
  setLinkedShareIds: Dispatch<SetStateAction<string[]>>;
  setSharedMatchId: Dispatch<SetStateAction<string | null>>;
  setActiveSaveState: Dispatch<SetStateAction<'saved' | 'saving' | 'error'>>;
};

export const useSharedMatchLifecycle = ({
  sharedMatchId,
  isSharedViewer,
  sharedTargetScreen,
  userUid,
  tournament,
  recordDbMetric,
  recordDbError,
  sharedLinkDiscoveryKeyRef,
  hasTournamentActivity,
  setTournament,
  setScreen,
  setIsSharedDataReady,
  setLinkedShareIds,
  setSharedMatchId,
  setActiveSaveState,
}: UseSharedMatchLifecycleParams) => {
  useEffect(() => {
    if (!sharedMatchId || !isSharedViewer) return;
    const sharedRef = getSharedMatchRef(sharedMatchId);
    recordDbMetric({
      flow: 'share_viewer',
      operation: 'listen',
      count: 1,
      label: 'shared_match',
      dbRole: 'ephemeral',
      collection: SHARED_MATCHES_COLLECTION,
    });
    const unsub = onSnapshot(sharedRef, (snap) => {
      recordDbMetric({
        flow: 'share_viewer',
        operation: 'read',
        count: 1,
        docs: snap.exists() ? 1 : 0,
        label: 'shared_match_update',
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION,
      });
      if (!snap.exists()) {
        setIsSharedDataReady(true);
        return;
      }
      const data = snap.data();
      if (data?.tournament) {
        setTournament(data.tournament as Tournament);
        setScreen(sharedTargetScreen);
      }
      setIsSharedDataReady(true);
    }, (err) => {
      recordDbError({
        flow: 'share_viewer',
        label: 'shared_match',
        err,
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION,
      });
      console.error('Shared match subscribe error:', err);
      setIsSharedDataReady(true);
    });
    return () => unsub();
  }, [
    isSharedViewer,
    recordDbError,
    recordDbMetric,
    setIsSharedDataReady,
    setScreen,
    setTournament,
    sharedMatchId,
    sharedTargetScreen,
  ]);

  useEffect(() => {
    if (isSharedViewer) return;
    if (!userUid) return;
    if (!tournament?.startedAt) return;

    const discoveryKey = `${userUid}:${tournament.startedAt}`;
    if (sharedLinkDiscoveryKeyRef.current === discoveryKey) return;
    sharedLinkDiscoveryKeyRef.current = discoveryKey;

    let cancelled = false;
    const discoverShareLinksForActiveTournament = async () => {
      const discoveredIds = new Set<string>();
      if (sharedMatchId) discoveredIds.add(sharedMatchId);

      try {
        const discovery = await discoverSharedMatchIdsForActiveTournament(userUid, Number(tournament.startedAt));
        recordDbMetric({
          flow: 'share_host',
          operation: 'read',
          count: 1,
          docs: discovery.docsCount,
          label: 'discover_share_links',
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION,
        });
        discovery.ids.forEach((shareId) => discoveredIds.add(shareId));
      } catch (err) {
        recordDbError({
          flow: 'share_host',
          label: 'discover_share_links',
          err,
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION,
        });
        console.error('Shared match discovery error:', err);
      }

      if (cancelled || discoveredIds.size === 0) return;
      const nextIds = Array.from(discoveredIds);
      setLinkedShareIds((prev) => Array.from(new Set([...prev, ...nextIds])));
      if (!sharedMatchId && nextIds[0]) {
        setSharedMatchId(nextIds[0]);
        localStorage.setItem(getTournamentShareStorageKey(userUid, tournament.startedAt), nextIds[0]);
      }
    };

    void discoverShareLinksForActiveTournament();
    return () => {
      cancelled = true;
    };
  }, [
    isSharedViewer,
    recordDbError,
    recordDbMetric,
    setLinkedShareIds,
    setSharedMatchId,
    sharedLinkDiscoveryKeyRef,
    sharedMatchId,
    tournament?.startedAt,
    userUid,
  ]);

  useEffect(() => {
    if (isSharedViewer) return;
    if (!userUid) return;
    if (!hasTournamentActivity(tournament)) {
      setActiveSaveState('saved');
    }
  }, [hasTournamentActivity, isSharedViewer, setActiveSaveState, tournament, userUid]);

  useEffect(() => {
    if (isSharedViewer) return;
    if (!userUid) return;
    if (sharedMatchId) return;
    if (!tournament?.startedAt) return;

    const storedShareId = localStorage.getItem(getTournamentShareStorageKey(userUid, tournament.startedAt));
    if (storedShareId) {
      setSharedMatchId(storedShareId);
    }
  }, [isSharedViewer, setSharedMatchId, sharedMatchId, tournament?.startedAt, userUid]);
};
