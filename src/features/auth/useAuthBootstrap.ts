import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { withTimeout } from './authUtils';
import { PLAYER_STATS_COLLECTION, USERS_COLLECTION } from '../../services/firestoreCollections';
import { readActiveTournamentDraft } from '../../services/activeDraftRepository';
import { ACTIVE_TOURNAMENT_DRAFTS_COLLECTION } from '../../services/firestoreCollections';
import {
  getPlayersStorageKey,
  getTournamentHistoryStorageKey,
  getTournamentStorageKey,
  normalizeHistoryTournament,
  readTournamentHistoryCacheSavedAt,
  TOURNAMENT_HISTORY_CACHE_MAX_AGE_MS,
} from '../history/historyPersistence';
import { isLegacySeedPlayers } from '../matches/matchSetupUtils';
import { type Player, type Tournament, type TournamentHistory } from '../../types';

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

export const useAuthBootstrap = ({
  disabled,
  isSharedViewer,
  hasRoomLinkTarget,
  sharedTargetScreen,
  hydratedHistoryCacheRef,
  isAuthResolvedRef,
  isAdminEmail,
  isFirestoreSaverModeEnabled,
  normalizePlayerSource,
  createFreshTournamentDraft,
  hasSetupDraftChanges,
  recordDbMetric,
  recordDbError,
  setUser,
  setIsLoggedIn,
  setIsAuthChecked,
  setDraftMatchBackgroundId,
  setAllPlayers,
  setTournament,
  setScreen,
  setTournaments,
  setHasFreshHistoryCache,
  setHasSyncedHistoryThisSession,
  setIsHistorySyncing,
  setHasResolvedInitialHistoryHydration,
}: {
  disabled: boolean;
  isSharedViewer: boolean;
  hasRoomLinkTarget: boolean;
  sharedTargetScreen: string;
  hydratedHistoryCacheRef: MutableRefObject<string | null>;
  isAuthResolvedRef: MutableRefObject<boolean>;
  isAdminEmail: (email?: string | null) => boolean;
  isFirestoreSaverModeEnabled: () => boolean;
  normalizePlayerSource: (player: Player, currentUid?: string | null) => Player;
  createFreshTournamentDraft: () => Tournament;
  hasSetupDraftChanges: (tournament: Tournament) => boolean;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
  setUser: Dispatch<SetStateAction<any>>;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>;
  setIsAuthChecked: Dispatch<SetStateAction<boolean>>;
  setDraftMatchBackgroundId: Dispatch<SetStateAction<string | null>>;
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setScreen: Dispatch<SetStateAction<any>>;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  setHasFreshHistoryCache: Dispatch<SetStateAction<boolean>>;
  setHasSyncedHistoryThisSession: Dispatch<SetStateAction<boolean>>;
  setIsHistorySyncing: Dispatch<SetStateAction<boolean>>;
  setHasResolvedInitialHistoryHydration: Dispatch<SetStateAction<boolean>>;
}) => {
  useEffect(() => {
    if (disabled) {
      setIsAuthChecked(true);
      isAuthResolvedRef.current = true;
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const shouldForceAdminRole = isAdminEmail(firebaseUser.email);
          const savedPlayers = localStorage.getItem(getPlayersStorageKey(firebaseUser.uid));
          const parsedPlayers: Player[] = savedPlayers ? JSON.parse(savedPlayers) : [];
          const normalizedPlayers = parsedPlayers.map((player) => normalizePlayerSource(player, firebaseUser.uid));
          setAllPlayers(isLegacySeedPlayers(normalizedPlayers) ? [] : normalizedPlayers);
          const savedTournament = localStorage.getItem(getTournamentStorageKey(firebaseUser.uid));
          const hasLocalTournament = Boolean(savedTournament);

          if (!isSharedViewer) {
            const restoredTournament = savedTournament
              ? (() => {
                  const parsedTournament = JSON.parse(savedTournament) as Tournament;
                  if (parsedTournament?.endedAt) return createFreshTournamentDraft();
                  const hasStartedMatch = Boolean(parsedTournament?.startedAt);
                  const hasRounds = Array.isArray(parsedTournament?.rounds) && parsedTournament.rounds.length > 0;
                  return hasSetupDraftChanges(parsedTournament) || hasStartedMatch || hasRounds
                    ? parsedTournament
                    : createFreshTournamentDraft();
                })()
              : createFreshTournamentDraft();
            setTournament(restoredTournament);
          }

          setUser(firebaseUser);
          setIsLoggedIn(true);
          setHasSyncedHistoryThisSession(false);
          setIsHistorySyncing(false);
          setHasResolvedInitialHistoryHydration(false);
          if (!isSharedViewer && !hasRoomLinkTarget) setScreen('dashboard');

          try {
            const rawHistory = localStorage.getItem(getTournamentHistoryStorageKey(firebaseUser.uid));
            if (rawHistory) {
              hydratedHistoryCacheRef.current = rawHistory;
              const parsedHistory = JSON.parse(rawHistory) as TournamentHistory[];
              const normalized = parsedHistory.map((item) => normalizeHistoryTournament(item));
              setTournaments(normalized);
              setHasResolvedInitialHistoryHydration(normalized.length > 0);
              const historySavedAt = readTournamentHistoryCacheSavedAt(firebaseUser.uid);
              setHasFreshHistoryCache(
                Number.isFinite(historySavedAt) &&
                  historySavedAt > 0 &&
                  (Date.now() - historySavedAt) <= TOURNAMENT_HISTORY_CACHE_MAX_AGE_MS
              );
            } else {
              hydratedHistoryCacheRef.current = null;
              setTournaments([]);
              setHasFreshHistoryCache(false);
              setHasResolvedInitialHistoryHydration(false);
            }
          } catch (historyErr) {
            console.error('Read local history cache error:', historyErr);
            hydratedHistoryCacheRef.current = null;
            setTournaments([]);
            setHasFreshHistoryCache(false);
            setHasResolvedInitialHistoryHydration(false);
          }

          if (isFirestoreSaverModeEnabled()) {
            recordDbMetric({ flow: 'login', operation: 'skip', count: 1, label: 'saver_mode_profile_bootstrap' });
            return;
          }

          const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
          const userStatsRef = doc(db, PLAYER_STATS_COLLECTION, firebaseUser.uid);
          const [userDoc, userStatsDoc] = await withTimeout(
            Promise.all([getDoc(userDocRef), getDoc(userStatsRef)]),
            8000,
            'Auth profile bootstrap'
          );
          recordDbMetric({
            flow: 'login',
            operation: 'read',
            count: 2,
            docs: (userDoc.exists() ? 1 : 0) + (userStatsDoc.exists() ? 1 : 0),
            label: 'profile_bootstrap',
            dbRole: 'primary',
            collection: 'users+player_stats'
          });
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userStatsData = userStatsDoc.exists() ? (userStatsDoc.data() || {}) : {};
            const existingMmr = Number(userData?.mmr);
            const existingTotalMatches = Number(userData?.totalMatches);
            const statsMmr = Number(userStatsData?.mmr);
            const statsTotalMatches = Number(userStatsData?.totalMatches);
            const statsWins = Number(userStatsData?.wins);
            const statsLosses = Number(userStatsData?.losses);
            const locationActivity = userData?.locationActivity;
            const totalLocationActivity =
              locationActivity && typeof locationActivity === 'object'
                ? Object.values(locationActivity).reduce<number>((total, count) => {
                    const normalizedCount = Number(count);
                    if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return total;
                    return total + normalizedCount;
                  }, 0)
                : 0;
            const shouldNormalizeLegacyInitialMmr =
              existingMmr === 500 &&
              (!Number.isFinite(existingTotalMatches) || existingTotalMatches <= 0) &&
              totalLocationActivity === 0;

            const normalizedUserData: Record<string, any> = {
              ...userData,
              ...(shouldForceAdminRole ? { role: 'admin' } : {}),
              mmr: Number.isFinite(statsMmr)
                ? statsMmr
                : shouldNormalizeLegacyInitialMmr
                  ? 0
                  : Number.isFinite(existingMmr)
                    ? existingMmr
                    : 0,
              totalMatches:
                Number.isFinite(statsTotalMatches) && statsTotalMatches >= 0
                  ? statsTotalMatches
                  : Number.isFinite(existingTotalMatches) && existingTotalMatches >= 0
                    ? existingTotalMatches
                    : 0,
              wins: Number.isFinite(statsWins) && statsWins >= 0 ? statsWins : Number(userData?.wins || 0),
              losses: Number.isFinite(statsLosses) && statsLosses >= 0 ? statsLosses : Number(userData?.losses || 0)
            };

            const needsBackfill =
              !Number.isFinite(existingMmr) ||
              !Number.isFinite(existingTotalMatches) ||
              existingTotalMatches < 0 ||
              shouldNormalizeLegacyInitialMmr;

            if (needsBackfill) {
              setDoc(
                userDocRef,
                {
                  mmr: normalizedUserData.mmr,
                  totalMatches: normalizedUserData.totalMatches
                },
                { merge: true }
              ).catch((err) => console.error('User profile backfill error:', err));
            }

            if (shouldForceAdminRole && userData?.role !== 'admin') {
              setDoc(userDocRef, { role: 'admin' }, { merge: true }).catch((err) =>
                console.error('Admin role backfill error:', err)
              );
            }

            setUser({ ...firebaseUser, ...normalizedUserData });
            if (normalizedUserData?.activeTournament) {
              setDoc(
                userDocRef,
                {
                  activeTournament: null,
                  activeTournamentDraftVersion: 2,
                  activeTournamentClearedAt: serverTimestamp()
                },
                { merge: true }
              ).catch((err) => console.error('Legacy active tournament cleanup error:', err));
            }
            if (!isSharedViewer && !hasLocalTournament) {
              if (isFirestoreSaverModeEnabled()) {
                recordDbMetric({ flow: 'login', operation: 'skip', count: 1, label: 'saver_mode_active_draft_restore' });
              } else {
                try {
                  const draftResult = await readActiveTournamentDraft(firebaseUser.uid);
                  recordDbMetric({
                    flow: 'login',
                    operation: 'read',
                    count: 1,
                    docs: draftResult.exists ? 1 : 0,
                    label: 'active_draft_restore',
                    dbRole: 'ephemeral',
                    collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION
                  });
                  const draftTournament = draftResult.tournament;
                  if (
                    draftTournament &&
                    !draftTournament.endedAt &&
                    Array.isArray(draftTournament.rounds) &&
                    draftTournament.rounds.length > 0
                  ) {
                    setTournament(draftTournament as Tournament);
                  }
                } catch (draftErr) {
                  recordDbError({
                    flow: 'login',
                    label: 'active_draft_restore',
                    err: draftErr,
                    dbRole: 'ephemeral',
                    collection: ACTIVE_TOURNAMENT_DRAFTS_COLLECTION
                  });
                  console.error('Active tournament draft restore error:', draftErr);
                }
              }
            }
          } else {
            const initialData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Padel Player',
              username:
                firebaseUser.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') ||
                'user' + Math.floor(Math.random() * 1000),
              photoURL: firebaseUser.photoURL,
              phoneNumber: '',
              mmr: 0,
              totalMatches: 0,
              region: 'Jakarta Selatan, DKI Jakarta',
              homeBase: 'Jakarta Selatan, DKI Jakarta',
              locationActivity: { 'Jakarta Selatan, DKI Jakarta': 0 },
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, initialData);
            if (shouldForceAdminRole) {
              await setDoc(userDocRef, { role: 'admin' }, { merge: true }).catch((err) => {
                console.error('Initial admin role backfill error:', err);
              });
            }
            setUser({ ...firebaseUser, ...initialData, ...(shouldForceAdminRole ? { role: 'admin' } : {}) });
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
          setDraftMatchBackgroundId(null);
          setAllPlayers([]);
          if (!isSharedViewer) {
            setTournament(createFreshTournamentDraft());
          }
          if (!isSharedViewer) {
            if (!hasRoomLinkTarget) setScreen('login');
          } else {
            setScreen(sharedTargetScreen);
          }
          hydratedHistoryCacheRef.current = null;
          setTournaments([]);
          setHasFreshHistoryCache(false);
          setHasSyncedHistoryThisSession(false);
          setIsHistorySyncing(false);
          setHasResolvedInitialHistoryHydration(false);
        }
      } catch (err) {
        recordDbError({ flow: 'login', label: 'auth_bootstrap', err });
        console.error('Auth bootstrap error:', err);
      } finally {
        setIsAuthChecked(true);
        isAuthResolvedRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [
    createFreshTournamentDraft,
    disabled,
    hasSetupDraftChanges,
    hydratedHistoryCacheRef,
    isAdminEmail,
    isAuthResolvedRef,
    isFirestoreSaverModeEnabled,
    isSharedViewer,
    hasRoomLinkTarget,
    normalizePlayerSource,
    recordDbError,
    recordDbMetric,
    setAllPlayers,
    setDraftMatchBackgroundId,
    setHasFreshHistoryCache,
    setHasResolvedInitialHistoryHydration,
    setHasSyncedHistoryThisSession,
    setIsAuthChecked,
    setIsHistorySyncing,
    setIsLoggedIn,
    setScreen,
    setTournaments,
    setTournament,
    setUser,
    sharedTargetScreen,
  ]);
};
