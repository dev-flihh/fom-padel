import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitialE2EScenario, getInitialSharedContext, isAppShellQuery } from './appBootstrap';
import {
  Trophy,
  ChevronLeft,
  X,
  BarChart2,
  SlidersHorizontal,
  Award,
  Calendar,
  Star,
  CircleHelp,
  BookOpen,
} from 'lucide-react';
import { cn } from './lib/utils';
import { Screen, Player, Tournament, Match, Round, TournamentHistory, Friend, CourtChange } from './types';
import { INITIAL_PLAYERS, INITIAL_TOURNAMENT } from './constants';
import {
  auth,
  db,
  functions as firebaseFunctions,
} from './firebase';
import {
  trackFirestoreRoute,
} from './analytics';
import { ARCHIVE_BASE_PATH, TOP_LEVEL_PATHS, getTopLevelPath, type TopLevelRoute, type PublicTopLevelRoute, resolveTopLevelRoute, PublicMarketingRouter } from './marketing';
import { RegionSelector } from './components/RegionSelector';
import { AppLoadingScreen } from './components/app/AppLoadingScreen';
import { AppLogo } from './components/app/AppLogo';
import { BottomNav } from './components/app/BottomNav';
import { InstallAppButton, detectIOSDevice } from './components/app/InstallAppButton';
import { useAppChrome } from './features/app/useAppChrome';
import { LoginScreen } from './features/auth/LoginScreen';
import { useAuthBootstrap } from './features/auth/useAuthBootstrap';
import { useAppShellNavigation } from './features/app/useAppShellNavigation';
import { DashboardScreen as DashboardFeatureScreen } from './features/dashboard/DashboardScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { MatchBackgroundPickerScreen } from './features/matches/MatchBackgroundPickerScreen';
import { MatchActiveScreen } from './features/matches/MatchActiveScreen';
import { useActiveMatchDeletionAction } from './features/matches/useActiveMatchDeletionAction';
import { KlasemenScreen } from './features/matches/KlasemenScreen';
import { MatchSettingsScreen } from './features/matches/MatchSettingsScreen';
import { useMatchMutationActions } from './features/matches/useMatchMutationActions';
import { useRoundProgressionActions } from './features/matches/useRoundProgressionActions';
import { TournamentHistoryCard } from './features/history/HistoryCards';
import { HistoryDetailScreen } from './features/history/HistoryDetailScreen';
import { HistoryScreen as HistoryFeatureScreen } from './features/history/HistoryScreen';
import { buildReadOnlyTournamentFromHistory } from './features/history/historyDetailUtils';
import { useLocalTournamentPersistence } from './features/history/useLocalTournamentPersistence';
import { useHistoryNavigationActions } from './features/history/useHistoryNavigationActions';
import { useTournamentHistorySync } from './features/history/useTournamentHistorySync';
import { NotificationsScreen } from './features/notifications/NotificationsScreen';
import { useNotifications } from './features/notifications/useNotifications';
import { getNotificationVisuals } from './features/notifications/notificationVisuals';
import { buildShareUrl, toShareableTournamentSnapshot } from './features/share/shareUtils';
import { useShareActions } from './features/share/useShareActions';
import { useSharedMatchLifecycle } from './features/share/useSharedMatchLifecycle';
import {
  getTournamentShareStorageKey,
  getTournamentStorageKey,
  getTournamentVisualSeed,
  HISTORY_LEDGER_FALLBACK_LIMIT,
  HISTORY_QUERY_TIMEOUT_MS,
  HISTORY_RECENT_FETCH_LIMIT,
  normalizeHistoryTournament,
} from './features/history/historyPersistence';
import { getTournamentDateMs, sortTournamentsByNewest } from './features/history/historyUtils';
import { RankDiscoveryScreen } from './features/ranking/RankDiscoveryScreen';
import { MMRHistoryScreen } from './features/ranking/MMRHistoryScreen';
import { LeaderboardScreen } from './features/ranking/LeaderboardScreen';
import { getRankInfo } from './features/ranking/rankUtils';
import { FriendsScreen } from './features/friends/FriendsScreen';
import { useFriendMatchPickerActions } from './features/friends/useFriendMatchPickerActions';
import { dedupePlayersById, sortPlayersByName } from './features/matches/matchSetupUtils';
import { isLikelyFirebaseUid, MANUAL_PLAYER_ID_PREFIX } from './features/players/playerUtils';
import { usePlayerProfileSync } from './features/players/usePlayerProfileSync';
import { createFreshTournamentDraft, hasSetupDraftChanges, sanitizeInactivePlayerIds } from './features/tournaments/tournamentDraft';
import { useActiveTournamentLifecycle } from './features/tournaments/useActiveTournamentLifecycle';
import { useTournamentSetupActions } from './features/tournaments/useTournamentSetupActions';
import {
  SHARED_MATCHES_COLLECTION,
  TOURNAMENT_DETAILS_COLLECTION,
  USERS_COLLECTION,
  USER_FRIENDS_COLLECTION,
  USER_FRIEND_REQUESTS_COLLECTION,
  USER_NOTIFICATIONS_COLLECTION,
  USER_SENT_FRIEND_REQUESTS_COLLECTION
} from './services/firestoreCollections';
import { createDbMetricsRecorder, isFirestoreSaverModeEnabled } from './services/dbMetrics';
import { toFirestoreSafe } from './services/firestoreSerialization';
import { deleteSharedMatch, discoverSharedMatchIdsForActiveTournament, getSharedMatchRef } from './services/sharedMatchRepository';
import {
  readLegacyTournamentRow,
  readTournamentDetailRow,
  saveTournamentDetailAndSummary
} from './services/tournamentHistoryRepository';
import {
  signOut,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { addDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, orderBy, onSnapshot, limit } from 'firebase/firestore';

// --- Constants & Helpers ---

const getScoreToneClass = (score: number) => {
  void score;
  return 'text-on-surface';
};


const ADMIN_EMAILS = ['falih.hrmn@gmail.com'];

const isAdminEmail = (email?: string | null) => (
  ADMIN_EMAILS.includes((email || '').trim().toLowerCase())
);

// Keep notification flows behind a single switch so we can restore them later
// without rewriting the app surface.
const NOTIFICATIONS_ENABLED = false;

const normalizePlayerSource = (player: Player, currentUid?: string | null): Player => {
  const id = (player?.id || '').trim();
  if (!id) return player;
  if (player.source === 'fom' || player.source === 'manual') return player;

  const inferredSource: Player['source'] =
    id.startsWith(MANUAL_PLAYER_ID_PREFIX)
      ? 'manual'
      : (currentUid && id === currentUid) || isLikelyFirebaseUid(id)
        ? 'fom'
        : 'manual';

  return { ...player, source: inferredSource };
};

const calculateMMRChange = (isWin: boolean, scoreDiff: number, isUnderdog: boolean, isFavorite: boolean) => {
  let change = 0;
  if (isWin) {
    change = scoreDiff >= 10 ? 40 : 25;
    if (isUnderdog) change += 15;
  } else {
    change = scoreDiff >= 10 ? -35 : -20;
    if (isFavorite) change -= 15;
  }
  return change;
};

const getActivePlayersFromTournament = (tournament: Tournament) => {
  const inactiveIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
  const inactiveSet = new Set(inactiveIds);
  return (tournament.players || []).filter((player) => !inactiveSet.has(player.id));
};

const rebuildAmericanoFutureRounds = (
  tournament: Tournament,
  targetNumRounds: number
): Round[] => {
  const safeTarget = Math.max(1, Math.floor(targetNumRounds || 1));
  const currentRoundIndex = tournament.rounds.findIndex((round) => (
    (round.matches || []).some((match) => match.status === 'active')
  ));
  const lockedRoundCount = currentRoundIndex === -1
    ? Math.min(tournament.rounds.length, safeTarget)
    : Math.min(currentRoundIndex + 1, safeTarget);

  const nextRounds: Round[] = tournament.rounds.slice(0, lockedRoundCount).map((round) => ({
    ...round,
    playersBye: [...(round.playersBye || [])],
    matches: round.matches.map((match) => ({
      ...match,
      teamA: { ...match.teamA, players: [...match.teamA.players] },
      teamB: { ...match.teamB, players: [...match.teamB.players] }
    }))
  }));

  const activePlayers = getActivePlayersFromTournament(tournament);
  const playerMatchCounts: Record<string, number> = {};
  const partnerCounts: Record<string, Record<string, number>> = {};
  const opponentCounts: Record<string, Record<string, number>> = {};
  const lastPartnerByPlayer: Record<string, string | null> = {};

  activePlayers.forEach((player) => {
    playerMatchCounts[player.id] = 0;
    partnerCounts[player.id] = {};
    opponentCounts[player.id] = {};
    lastPartnerByPlayer[player.id] = null;
  });

  const getPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
    if (map[a.id] === undefined || map[b.id] === undefined) return 0;
    return map[a.id]?.[b.id] || 0;
  };

  const incrementPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
    if (map[a.id] === undefined || map[b.id] === undefined) return;
    map[a.id][b.id] = (map[a.id][b.id] || 0) + 1;
    map[b.id][a.id] = (map[b.id][a.id] || 0) + 1;
  };

  nextRounds.forEach((round) => {
    round.matches.forEach((match) => {
      const [p1, p2] = match.teamA.players;
      const [p3, p4] = match.teamB.players;
      if (!p1 || !p2 || !p3 || !p4) return;

      [p1, p2, p3, p4].forEach((player) => {
        if (playerMatchCounts[player.id] === undefined) return;
        playerMatchCounts[player.id] = (playerMatchCounts[player.id] || 0) + 1;
      });

      incrementPairCount(partnerCounts, p1, p2);
      incrementPairCount(partnerCounts, p3, p4);
      incrementPairCount(opponentCounts, p1, p3);
      incrementPairCount(opponentCounts, p1, p4);
      incrementPairCount(opponentCounts, p2, p3);
      incrementPairCount(opponentCounts, p2, p4);

      if (playerMatchCounts[p1.id] !== undefined && playerMatchCounts[p2.id] !== undefined) {
        lastPartnerByPlayer[p1.id] = p2.id;
        lastPartnerByPlayer[p2.id] = p1.id;
      }
      if (playerMatchCounts[p3.id] !== undefined && playerMatchCounts[p4.id] !== undefined) {
        lastPartnerByPlayer[p3.id] = p4.id;
        lastPartnerByPlayer[p4.id] = p3.id;
      }
    });
  });

  const listCombinationsOf3 = (arr: Player[]) => {
    const combos: Player[][] = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        for (let k = j + 1; k < arr.length; k++) {
          combos.push([arr[i], arr[j], arr[k]]);
        }
      }
    }
    return combos;
  };

  const evaluateSplitPenalty = (group: Player[]) => {
    const splits: [number, number, number, number][] = [
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [0, 3, 1, 2]
    ];
    let best = {
      penalty: Number.POSITIVE_INFINITY,
      teamA: [group[0], group[1]] as [Player, Player],
      teamB: [group[2], group[3]] as [Player, Player]
    };

    for (const [a1, a2, b1, b2] of splits) {
      const teamA: [Player, Player] = [group[a1], group[a2]];
      const teamB: [Player, Player] = [group[b1], group[b2]];

      const partnerPenaltyA =
        getPairCount(partnerCounts, teamA[0], teamA[1]) * 100 +
        (lastPartnerByPlayer[teamA[0].id] === teamA[1].id ? 180 : 0);
      const partnerPenaltyB =
        getPairCount(partnerCounts, teamB[0], teamB[1]) * 100 +
        (lastPartnerByPlayer[teamB[0].id] === teamB[1].id ? 180 : 0);

      const opponentPenalty =
        getPairCount(opponentCounts, teamA[0], teamB[0]) * 12 +
        getPairCount(opponentCounts, teamA[0], teamB[1]) * 12 +
        getPairCount(opponentCounts, teamA[1], teamB[0]) * 12 +
        getPairCount(opponentCounts, teamA[1], teamB[1]) * 12;

      const penalty = partnerPenaltyA + partnerPenaltyB + opponentPenalty;
      if (penalty < best.penalty) {
        best = { penalty, teamA, teamB };
      }
    }

    return best;
  };

  const playersPerRound = Math.min(Math.floor(activePlayers.length / 4) * 4, tournament.courts * 4);
  while (nextRounds.length < safeTarget) {
    const roundId = nextRounds.length + 1;
    const sortedPlayers = [...activePlayers].sort((a, b) => {
      const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
      return diff !== 0 ? diff : (Math.random() - 0.5);
    });
    const playersInRound = sortedPlayers.slice(0, playersPerRound);
    const playersBye = sortedPlayers.slice(playersPerRound);
    const roundMatches: Match[] = [];

    if (playersPerRound > 0) {
      const remaining = [...playersInRound];
      for (let m = 0; m < playersPerRound / 4; m++) {
        if (remaining.length < 4) break;
        remaining.sort((a, b) => {
          const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
          return diff !== 0 ? diff : (Math.random() - 0.5);
        });

        const seed = remaining[0];
        const candidates = remaining.slice(1);
        const trios = listCombinationsOf3(candidates);
        let bestGroup: Player[] = [seed, ...candidates.slice(0, 3)];
        let bestPenalty = Number.POSITIVE_INFINITY;

        trios.forEach((trio) => {
          const group = [seed, ...trio];
          const pairwisePenalty = group.reduce((sum, playerA, i) => {
            for (let j = i + 1; j < group.length; j++) {
              const playerB = group[j];
              const interactions =
                getPairCount(partnerCounts, playerA, playerB) * 16 +
                getPairCount(opponentCounts, playerA, playerB) * 6;
              sum += interactions;
              if (
                lastPartnerByPlayer[playerA.id] === playerB.id ||
                lastPartnerByPlayer[playerB.id] === playerA.id
              ) {
                sum += 30;
              }
            }
            return sum;
          }, 0);

          if (pairwisePenalty < bestPenalty) {
            bestPenalty = pairwisePenalty;
            bestGroup = group;
          }
        });

        const { teamA, teamB } = evaluateSplitPenalty(bestGroup);
        const [p1, p2] = teamA;
        const [p3, p4] = teamB;
        roundMatches.push({
          id: `r${roundId}-m${m + 1}`,
          court: m + 1,
          roundId,
          status: 'pending',
          teamA: { players: [p1, p2], score: 0 },
          teamB: { players: [p3, p4], score: 0 }
        });

        [p1, p2, p3, p4].forEach((player) => {
          playerMatchCounts[player.id] = (playerMatchCounts[player.id] || 0) + 1;
        });
        incrementPairCount(partnerCounts, p1, p2);
        incrementPairCount(partnerCounts, p3, p4);
        incrementPairCount(opponentCounts, p1, p3);
        incrementPairCount(opponentCounts, p1, p4);
        incrementPairCount(opponentCounts, p2, p3);
        incrementPairCount(opponentCounts, p2, p4);
        lastPartnerByPlayer[p1.id] = p2.id;
        lastPartnerByPlayer[p2.id] = p1.id;
        lastPartnerByPlayer[p3.id] = p4.id;
        lastPartnerByPlayer[p4.id] = p3.id;

        const groupIds = new Set(bestGroup.map((player) => player.id));
        const nextRemaining = remaining.filter((player) => !groupIds.has(player.id));
        remaining.splice(0, remaining.length, ...nextRemaining);
      }
    }

    nextRounds.push({
      id: roundId,
      matches: roundMatches,
      playersBye
    });
  }

  return nextRounds;
};

const { recordDbMetric, recordDbError } = createDbMetricsRecorder(trackFirestoreRoute);

const hasTournamentActivity = (targetTournament: Tournament | TournamentHistory) => (
  (targetTournament.rounds && targetTournament.rounds.length > 0) ||
  (targetTournament.players && targetTournament.players.length > 0)
);

// --- Screens ---

// --- Play App ---

export default function App() {
  const initialSharedContext = getInitialSharedContext();
  const initialE2EScenario = getInitialE2EScenario();
  const initialForceAppShell = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return isAppShellQuery(params);
  }, []);
  const marketingBasePath = useMemo(() => {
    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
    return normalizedPath === ARCHIVE_BASE_PATH || normalizedPath.startsWith(`${ARCHIVE_BASE_PATH}/`)
      ? ARCHIVE_BASE_PATH
      : '';
  }, []);
  const [topLevelRoute, setTopLevelRoute] = useState<TopLevelRoute>(() => (
    resolveTopLevelRoute(window.location.pathname, initialForceAppShell, marketingBasePath)
  ));
  const isIOSDevice = useMemo(() => detectIOSDevice(), []);
  const isMockupV3 = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mockup') === 'v3';
    } catch {
      return false;
    }
  }, []);
  const e2eFinishedHistory = useMemo<TournamentHistory | null>(() => {
    if (initialE2EScenario !== 'finished-flow') return null;
    const playerPool: Player[] = Array.from({ length: 16 }).map((_, idx) => ({
      id: `e2e-p${idx + 1}`,
      name: `Player ${idx + 1}`,
      rating: 3 + ((idx % 5) * 0.2),
      initials: `P${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
    const startedAt = Date.now() - 78 * 60 * 1000;
    const roundDurationMs = 22 * 60 * 1000;
    const rounds: Round[] = [];
    for (let roundId = 1; roundId <= 3; roundId++) {
      const roundStartedAt = startedAt + ((roundId - 1) * roundDurationMs);
      const matches: Match[] = [];
      for (let court = 1; court <= 4; court++) {
        const baseIndex = ((roundId - 1) * 4 + (court - 1)) % playerPool.length;
        const picked = Array.from({ length: 4 }).map((__, pickIdx) => playerPool[(baseIndex + pickIdx) % playerPool.length]);
        const scoreA = 6 + ((roundId + court) % 3);
        const scoreB = 4 + ((roundId + court + 1) % 3);
        matches.push({
          id: `e2e-r${roundId}-m${court}`,
          court,
          roundId,
          status: 'completed',
          startedAt: roundStartedAt,
          duration: '22:00',
          teamA: { players: [picked[0], picked[1]], score: scoreA, sets: [scoreA] },
          teamB: { players: [picked[2], picked[3]], score: scoreB, sets: [scoreB] }
        });
      }
      rounds.push({ id: roundId, matches, playersBye: [] });
    }
    const endedAt = startedAt + (3 * roundDurationMs);
    return {
      id: 'e2e-finished-flow',
      userId: 'e2e-user',
      name: 'E2E Finished Matches',
      format: 'Match Play',
      criteria: 'Matches Won',
      scoringType: 'Advantage',
      date: new Date(endedAt),
      startedAt,
      endedAt,
      courts: 4,
      totalPoints: 0,
      numRounds: 3,
      numPlayers: playerPool.length,
      rounds,
      players: playerPool,
      venueName: 'FOM Test Court',
      location: 'Jakarta Selatan, DKI Jakarta'
    };
  }, [initialE2EScenario]);
  const e2eBackgroundPlayers = useMemo<Player[]>(() => {
    if (initialE2EScenario !== 'background-flow' && initialE2EScenario !== 'start-match-flow') return [];
    return Array.from({ length: 4 }).map((_, idx) => ({
      id: `e2e-bg-p${idx + 1}`,
      name: `BG Player ${idx + 1}`,
      rating: 3.5 + (idx * 0.1),
      initials: `B${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
  }, [initialE2EScenario]);
  const e2eBackgroundTournament = useMemo<Tournament | null>(() => {
    if (initialE2EScenario !== 'background-flow' && initialE2EScenario !== 'start-match-flow') return null;
    return {
      id: 'e2e-background-flow',
      name: 'E2E Background Flow',
      format: 'Mexicano',
      themeColorId: 'orange',
      criteria: 'Matches Won',
      scoringType: 'Golden Point',
      courts: 1,
      totalPoints: 21,
      players: e2eBackgroundPlayers,
      inactivePlayerIds: [],
      rounds: [],
      numRounds: 8,
      venueName: 'E2E Court',
      location: 'Jakarta Selatan'
    };
  }, [e2eBackgroundPlayers, initialE2EScenario]);
  const e2eProfileHistory = useMemo<TournamentHistory[]>(() => {
    if (initialE2EScenario !== 'profile-flow' && initialE2EScenario !== 'standings-6p') return [];
    const currentUid = 'e2e-user';
    const currentPlayer = {
      id: currentUid,
      name: 'Falih Harman',
      rating: 4.3,
      initials: 'FH',
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };
    const teammate = {
      id: 'e2e-teammate',
      name: 'Ari Putra',
      rating: 4.1,
      initials: 'AP',
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };
    const opponents = [
      {
        id: 'e2e-op-1',
        name: 'Nanda Wijaya',
        rating: 4.0,
        initials: 'NW',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-2',
        name: 'Reza Mahendra',
        rating: 4.2,
        initials: 'RM',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-3',
        name: 'Dino Arya',
        rating: 3.9,
        initials: 'DA',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-4',
        name: 'Bimo Satya',
        rating: 4.0,
        initials: 'BS',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-5',
        name: 'Kevin Prasetyo',
        rating: 4.4,
        initials: 'KP',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-6',
        name: 'Rifqi Aditya',
        rating: 4.1,
        initials: 'RA',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      }
    ];
    const now = Date.now();

    return [
      {
        id: 'e2e-profile-h1',
        userId: currentUid,
        name: 'Senayan Night Session',
        format: 'Match Play',
        criteria: 'Matches Won',
        scoringType: 'Advantage',
        date: new Date(now - (6 * 24 * 60 * 60 * 1000)),
        startedAt: now - (6 * 24 * 60 * 60 * 1000) - (70 * 60 * 1000),
        endedAt: now - (6 * 24 * 60 * 60 * 1000),
        courts: 1,
        totalPoints: 0,
        numRounds: 2,
        numPlayers: 6,
        rounds: [
          {
            id: 1,
            matches: [
              {
                id: 'e2e-profile-h1-r1',
                court: 1,
                roundId: 1,
                status: 'completed',
                teamA: { players: [currentPlayer, teammate], score: 6, sets: [6] },
                teamB: { players: [opponents[0], opponents[1]], score: 3, sets: [3] }
              }
            ],
            playersBye: []
          },
          {
            id: 2,
            matches: [
              {
                id: 'e2e-profile-h1-r2',
                court: 1,
                roundId: 2,
                status: 'completed',
                teamA: { players: [currentPlayer, opponents[2]], score: 5, sets: [5] },
                teamB: { players: [teammate, opponents[3]], score: 6, sets: [6] }
              }
            ],
            playersBye: []
          }
        ],
        players: [currentPlayer, teammate, ...opponents.slice(0, 4)],
        venueName: 'Racquet Padel Club',
        location: 'Jakarta Selatan, DKI Jakarta'
      },
      {
        id: 'e2e-profile-h2',
        userId: currentUid,
        name: 'Thursday Competitive Mix',
        format: 'Americano',
        criteria: 'Points',
        scoringType: 'Golden Point',
        date: new Date(now - (25 * 24 * 60 * 60 * 1000)),
        startedAt: now - (25 * 24 * 60 * 60 * 1000) - (80 * 60 * 1000),
        endedAt: now - (25 * 24 * 60 * 60 * 1000),
        courts: 1,
        totalPoints: 0,
        numRounds: 2,
        numPlayers: 6,
        rounds: [
          {
            id: 1,
            matches: [
              {
                id: 'e2e-profile-h2-r1',
                court: 1,
                roundId: 1,
                status: 'completed',
                teamA: { players: [currentPlayer, opponents[4]], score: 6, sets: [6] },
                teamB: { players: [opponents[1], opponents[5]], score: 4, sets: [4] }
              }
            ],
            playersBye: []
          },
          {
            id: 2,
            matches: [
              {
                id: 'e2e-profile-h2-r2',
                court: 1,
                roundId: 2,
                status: 'completed',
                teamA: { players: [currentPlayer, teammate], score: 6, sets: [6] },
                teamB: { players: [opponents[0], opponents[2]], score: 2, sets: [2] }
              }
            ],
            playersBye: []
          }
        ],
        players: [currentPlayer, teammate, ...opponents],
        venueName: 'Orange Garden Padel',
        location: 'Jakarta Barat, DKI Jakarta'
      }
    ];
  }, [initialE2EScenario]);
  const [screen, setScreen] = useState<Screen>(initialSharedContext.isShared ? initialSharedContext.targetView : 'login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sharedMatchId, setSharedMatchId] = useState<string | null>(initialSharedContext.sharedId);
  const [isSharedViewer, setIsSharedViewer] = useState(initialSharedContext.isShared);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [sharedTargetScreen, setSharedTargetScreen] = useState<'active' | 'klasemen'>(initialSharedContext.targetView);
  const [isSharedDataReady, setIsSharedDataReady] = useState(!initialSharedContext.isShared);
  const [linkedShareIds, setLinkedShareIds] = useState<string[]>(
    initialSharedContext.sharedId ? [initialSharedContext.sharedId] : []
  );
  const [tournament, setTournament] = useState<Tournament>(createFreshTournamentDraft());
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
  const [hasFreshHistoryCache, setHasFreshHistoryCache] = useState(false);
  const [hasSyncedHistoryThisSession, setHasSyncedHistoryThisSession] = useState(false);
  const [isHistorySyncing, setIsHistorySyncing] = useState(false);
  const [hasResolvedInitialHistoryHydration, setHasResolvedInitialHistoryHydration] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<TournamentHistory | null>(null);
  const [selectedKlasemenTournament, setSelectedKlasemenTournament] = useState<Tournament | TournamentHistory | null>(null);
  const [klasemenBackScreen, setKlasemenBackScreen] = useState<'dashboard' | 'active' | 'history-detail'>('dashboard');
  const [activeScreenTournament, setActiveScreenTournament] = useState<Tournament | null>(null);
  const [activeBackScreen, setActiveBackScreen] = useState<'dashboard' | 'history-detail' | 'klasemen' | 'history' | 'profile'>('dashboard');
  const [historyBackScreen, setHistoryBackScreen] = useState<'dashboard' | 'profile'>('dashboard');
  const [notificationBackScreen, setNotificationBackScreen] = useState<'dashboard' | 'profile'>('dashboard');
  const [mmrHistoryBackScreen, setMmrHistoryBackScreen] = useState<'profile' | 'rank-discovery' | 'leaderboard'>('profile');
  const [friendsEntrySource, setFriendsEntrySource] = useState<'profile' | 'settings'>('profile');
  const [settingsFocusSection, setSettingsFocusSection] = useState<'players' | null>(null);
  const [matchSettingsWizardStep, setMatchSettingsWizardStep] = useState(0);
  const [rankingFocusRequestId, setRankingFocusRequestId] = useState(0);
  const [leaderboardRefreshToken, setLeaderboardRefreshToken] = useState(0);
  const [draftMatchBackgroundId, setDraftMatchBackgroundId] = useState<string | null>(null);
  const [activeSaveState, setActiveSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [needsRegenerateFromRound, setNeedsRegenerateFromRound] = useState<number | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => (
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  ));
  const isAuthResolvedRef = useRef(false);
  const sharedLinkDiscoveryKeyRef = useRef('');
  const hydratedHistoryCacheRef = useRef<string | null>(null);
  const historySyncInFlightRef = useRef(false);
  const lastFriendPickerSummaryRef = useRef('');
  const hasForcedAppShellQuery = isAppShellQuery(new URLSearchParams(window.location.search));
  const isAppShellRoute = hasForcedAppShellQuery || topLevelRoute === 'app';
  const publicRoute = (topLevelRoute === 'app' || topLevelRoute === 'blog' ? 'home' : topLevelRoute) as PublicTopLevelRoute;
  const isArchivedMarketingRoute = !isAppShellRoute && marketingBasePath === ARCHIVE_BASE_PATH;
  const {
    notifications,
    notificationToasts,
    unreadNotificationsCount,
    addNotification,
    handleMarkAsRead,
    handleClearAll,
    replaceNotifications,
    removeNotificationToast,
    showShareFeedbackToast,
    showShareCopiedToast,
  } = useNotifications({ enabled: NOTIFICATIONS_ENABLED });
  const {
    clearTournamentStatsSyncWatch,
    persistActiveTournamentSnapshot,
    clearActiveTournamentSnapshot,
    watchTournamentStatsSync,
    resolveTournamentStatsSyncState,
    syncSharedMatchesSnapshot,
    resetTournamentStatsSync,
    markTournamentStatsSyncError,
  } = useActiveTournamentLifecycle({
    isSharedViewer,
    userUid: user?.uid,
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
  });
  const {
    handleShareCurrentMatch,
    handleShareStandings,
  } = useShareActions({
    userUid: user?.uid,
    tournament,
    isSharedViewer,
    sharedMatchId,
    setSharedMatchId,
    setLinkedShareIds,
    addNotification,
    showShareFeedbackToast,
    showShareCopiedToast,
    persistActiveTournamentSnapshot,
    toShareableTournamentSnapshot,
    buildShareUrl,
    recordDbMetric,
    recordDbError,
    serverTimestamp,
  });
  const {
    handleDeleteRoundsFrom,
    handleUpdateScore,
    handleUpdateActivePlayers,
    handleUpdateRounds,
    handleUpdateCourts,
    handleUpdateMatchPlayScore,
    handleSwapPlayer,
  } = useMatchMutationActions({
    tournament,
    needsRegenerateFromRound,
    setTournament,
    setNeedsRegenerateFromRound,
    persistActiveTournamentSnapshot,
    addNotification,
    rebuildAmericanoFutureRounds,
  });
  const {
    handleNextRound,
    handleStartAmericanoRound,
    handleCompleteAmericanoRound,
  } = useRoundProgressionActions({
    tournament,
    user,
    needsRegenerateFromRound,
    setTournament,
    setTournaments,
    setSelectedKlasemenTournament,
    addNotification,
    persistActiveTournamentSnapshot,
    clearActiveTournamentSnapshot,
    syncSharedMatchesSnapshot,
    watchTournamentStatsSync,
    markTournamentStatsSyncError,
    recordDbMetric,
    recordDbError,
    saveTournamentDetailAndSummary,
    serverTimestamp,
    toTournamentDetailCollectionLabel: TOURNAMENT_DETAILS_COLLECTION,
    getActivePlayersFromTournament,
    rebuildAmericanoFutureRounds,
  });
  const {
    handleGenerateTournament,
    handleSkipMatchBackground,
    handleAddPlayerDuringActiveMatch,
  } = useTournamentSetupActions({
    tournament,
    setTournament,
    setAllPlayers,
    setSharedMatchId,
    setDraftMatchBackgroundId,
    setNeedsRegenerateFromRound,
    setActiveScreenTournament,
    setActiveBackScreen,
    setScreen,
    persistActiveTournamentSnapshot,
    addNotification,
    rebuildAmericanoFutureRounds,
  });
  const { handleDeleteActiveMatch } = useActiveMatchDeletionAction({
    tournament,
    sharedMatchId,
    userUid: user?.uid,
    isSharedViewer,
    firebaseDeleteTournamentHistory: async (tournamentId: string) => {
      const deleteTournamentHistory = httpsCallable<
        { tournamentId: string },
        {
          success: boolean;
          alreadyDeleted?: boolean;
          rolledBackStats?: boolean;
          deletedLedgerEntries?: number;
          rolledBackParticipants?: number;
        }
      >(firebaseFunctions, 'deleteTournamentHistory');
      await deleteTournamentHistory({ tournamentId });
    },
    deleteSharedMatch,
    clearActiveTournamentSnapshot,
    clearTournamentStatsSyncWatch,
    resetTournamentStatsSync,
    getTournamentStorageKey,
    getTournamentShareStorageKey,
    addNotification,
    setTournaments,
    setSelectedHistory,
    setDraftMatchBackgroundId,
    setNeedsRegenerateFromRound,
    setSharedMatchId,
    setSelectedKlasemenTournament,
    setActiveScreenTournament,
    setActiveBackScreen,
    setActiveSaveState,
    setTournament,
    setScreen,
  });
  const {
    handleOpenLiveStandings,
    handleOpenHistoryFinalStandings,
    handleOpenHistoryMatchDetails,
    handleOpenHistoryTournament,
    handleOpenActiveFromStandings,
  } = useHistoryNavigationActions({
    tournament,
    selectedHistory,
    selectedKlasemenTournament,
    activeScreenTournament,
    klasemenBackScreen,
    isSharedViewer,
    setScreen,
    setSelectedHistory,
    setSelectedKlasemenTournament,
    setKlasemenBackScreen,
    setActiveScreenTournament,
    setActiveBackScreen,
    setHistoryBackScreen,
    setTournaments,
    isFirestoreSaverModeEnabled,
    readTournamentDetailRow,
    readLegacyTournamentRow,
    normalizeHistoryTournament,
    recordDbMetric,
    recordDbError,
  });
  const { upsertPlayerFromFriend } = useFriendMatchPickerActions({
    userUid: user?.uid,
    setAllPlayers,
    setTournament,
    serverTimestamp,
    usersCollection: USERS_COLLECTION,
    userFriendsCollection: USER_FRIENDS_COLLECTION,
  });

  const navigateTopLevel = (nextRoute: TopLevelRoute) => {
    const nextPath = getTopLevelPath(nextRoute, nextRoute === 'app' || nextRoute === 'blog' ? '' : marketingBasePath);
    if (nextRoute === 'blog') {
      window.location.assign(nextPath);
      return;
    }
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ __fomRoute: nextRoute }, '', nextPath);
    }
    setTopLevelRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED && screen === 'notifications') {
      setScreen(isLoggedIn ? 'dashboard' : 'login');
    }
  }, [isLoggedIn, screen]);

  useEffect(() => {
    const root = document.documentElement;
    const isStandalonePwa =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    root.classList.toggle('platform-ios', isIOSDevice);
    root.style.setProperty('--app-safe-top', isIOSDevice ? 'env(safe-area-inset-top, 0px)' : '0px');
    root.style.setProperty('--app-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--app-bottom-nav-gap', isIOSDevice ? (isStandalonePwa ? '4px' : '14px') : '10px');
  }, [isIOSDevice]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useAppChrome({
    isAppShellRoute,
    isArchivedMarketingRoute,
    screen,
    publicRoute,
    topLevelRoute,
    marketingBasePath,
    userUid: user?.uid,
    tournament,
    activeScreenTournament,
    selectedKlasemenTournament,
    selectedHistoryId: selectedHistory?.id,
    selectedKlasemenTournamentId: selectedKlasemenTournament?.id,
    activeScreenTournamentId: activeScreenTournament?.id,
  });

  usePlayerProfileSync({
    user,
    screen,
    isAppShellRoute,
    isDocumentVisible,
    setUser,
    setAllPlayers,
    setTournament,
    setActiveScreenTournament,
    setSelectedKlasemenTournament,
    setSelectedHistory,
    setTournaments,
    recordDbMetric,
  });

  useTournamentHistorySync({
    userUid: user?.uid,
    isSharedViewer,
    screen,
    tournamentsLength: tournaments.length,
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
  });

  useEffect(() => {
    if (initialE2EScenario === 'finished-flow' && e2eFinishedHistory) {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({ uid: 'e2e-user', displayName: 'E2E User', mmr: 1500 });
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments([e2eFinishedHistory]);
      setSelectedHistory(e2eFinishedHistory);
      setTournament(buildReadOnlyTournamentFromHistory(e2eFinishedHistory));
      setScreen('history-detail');
      return;
    }

    if (initialE2EScenario === 'background-flow' && e2eBackgroundTournament) {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({ uid: 'e2e-user', displayName: 'E2E User', mmr: 1500 });
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments([]);
      setSelectedHistory(null);
      setAllPlayers(e2eBackgroundPlayers);
      setTournament(e2eBackgroundTournament);
      setDraftMatchBackgroundId(null);
      setMatchSettingsWizardStep(0);
      setScreen('settings');
      return;
    }

    if (initialE2EScenario === 'start-match-flow' && e2eBackgroundTournament) {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({ uid: 'e2e-user', displayName: 'E2E User', mmr: 1500 });
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments([]);
      setSelectedHistory(null);
      setAllPlayers(e2eBackgroundPlayers);
      setTournament(e2eBackgroundTournament);
      setDraftMatchBackgroundId(null);
      setMatchSettingsWizardStep(0);
      setScreen('dashboard');
      return;
    }

    if (initialE2EScenario === 'profile-flow') {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({
        uid: 'e2e-user',
        displayName: 'Falih Harman',
        username: 'falihh',
        email: 'falih.harman@example.com',
        mmr: 2840,
        role: 'admin',
        homeBase: 'Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
        region: 'Jakarta Selatan, DKI Jakarta',
        totalMatches: 4,
        wins: 3,
        losses: 1
      });
      replaceNotifications([
        {
          id: 'e2e-notif-1',
          title: 'Weekly recap ready',
          message: 'Your April performance summary is available.',
          timestamp: new Date(),
          type: 'system',
          read: false
        }
      ]);
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments(e2eProfileHistory);
      setSelectedHistory(null);
      setAllPlayers([]);
      setTournament(createFreshTournamentDraft());
      setScreen(new URLSearchParams(window.location.search).get('screen') === 'leaderboard' ? 'leaderboard' : 'profile');
      return;
    }

    if (initialE2EScenario === 'standings-6p') {
      const sixPlayerHistory = e2eProfileHistory[0] || null;
      if (sixPlayerHistory) {
        setIsSharedViewer(false);
        setSharedMatchId(null);
        setIsSharedDataReady(true);
        setUser({
          uid: 'e2e-user',
          displayName: 'Falih Harman',
          username: 'falihh',
          email: 'falih.harman@example.com',
          mmr: 2840,
          role: 'admin',
          homeBase: 'Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
          region: 'Jakarta Selatan, DKI Jakarta',
          totalMatches: 4,
          wins: 3,
          losses: 1
        });
        setIsLoggedIn(true);
        setIsAuthChecked(true);
        setTournaments([sixPlayerHistory]);
        setSelectedHistory(sixPlayerHistory);
        setSelectedKlasemenTournament(sixPlayerHistory);
        setKlasemenBackScreen('history-detail');
        setTournament(buildReadOnlyTournamentFromHistory(sixPlayerHistory));
        setScreen('klasemen');
        return;
      }
    }

    if (initialE2EScenario) {
      setIsAuthChecked(true);
      return;
    }
  }, [
    e2eBackgroundPlayers,
    e2eBackgroundTournament,
    e2eFinishedHistory,
    initialE2EScenario,
    isSharedViewer,
    sharedTargetScreen
  ]);

  useAuthBootstrap({
    disabled: Boolean(initialE2EScenario),
    isSharedViewer,
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
  });

  useAppShellNavigation({
    isAppShellRoute,
    isLoggedIn,
    screen,
    marketingBasePath,
    sharedTargetScreen,
    isAuthResolvedRef,
    setTopLevelRoute,
    setScreen,
  });

  useSharedMatchLifecycle({
    sharedMatchId,
    isSharedViewer,
    sharedTargetScreen,
    userUid: user?.uid,
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
  });

  useLocalTournamentPersistence({
    userUid: user?.uid,
    isSharedViewer,
    allPlayers,
    tournament,
    tournaments,
    hydratedHistoryCacheRef,
  });

  const mockupV3Tournament = useMemo<Tournament>(() => {
    const basePlayers = [...INITIAL_PLAYERS].slice(0, 10).map((p, idx) => ({
      ...p,
      id: `mock-${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
    const matchOneTeamA = [basePlayers[0], basePlayers[1]].filter(Boolean) as Player[];
    const matchOneTeamB = [basePlayers[2], basePlayers[3]].filter(Boolean) as Player[];
    const matchTwoTeamA = [basePlayers[4], basePlayers[5]].filter(Boolean) as Player[];
    const matchTwoTeamB = [basePlayers[6], basePlayers[7]].filter(Boolean) as Player[];
    const playersBye = [basePlayers[8], basePlayers[9]].filter(Boolean) as Player[];

    return {
      ...INITIAL_TOURNAMENT,
      name: 'Padel Matches',
      format: 'Americano',
      players: basePlayers,
      courts: 2,
      numRounds: 5,
      rounds: [
        {
          id: 1,
          playersBye,
          matches: [
            {
              id: 'mock-r1-m1',
              court: 1,
              roundId: 1,
              status: 'active',
              startedAt: Date.now() - 11 * 60 * 1000,
              duration: '00:11',
              teamA: { players: matchOneTeamA, score: 0 },
              teamB: { players: matchOneTeamB, score: 0 }
            },
            {
              id: 'mock-r1-m2',
              court: 2,
              roundId: 1,
              status: 'active',
              startedAt: Date.now() - 7 * 60 * 1000,
              duration: '00:07',
              teamA: { players: matchTwoTeamA, score: 0 },
              teamB: { players: matchTwoTeamB, score: 0 }
            }
          ]
        }
      ],
      startedAt: Date.now() - 11 * 60 * 1000
    };
  }, []);

  if (isMockupV3) {
    return (
      <MatchActiveScreen
        onBack={() => { }}
        onStartNewMatch={() => { }}
        tournament={mockupV3Tournament}
        currentUser={null}
        onUpdateScore={() => { }}
        onNextRound={() => { }}
        onStartAmericanoRound={() => { }}
        onCompleteAmericanoRound={() => { }}
        onUpdateRounds={() => false}
        onUpdateCourts={() => false}
        onUpdateActivePlayers={() => { }}
        onAddManualPlayer={() => { }}
        onDeleteRoundsFrom={() => { }}
        onDeleteMatch={() => { }}
        needsRegenerateFromRound={null}
        onOpenStandings={() => { }}
        onSwapPlayer={() => { }}
        onUpdateMatchPlayScore={() => { }}
        onShareMatch={() => { }}
        isReadOnly={false}
        isSharedViewer={false}
        saveState="saved"
        statsSyncState={null}
      />
    );
  }

  if (!isAppShellRoute) {
    return (
      <PublicMarketingRouter
        route={publicRoute}
        isLoggedIn={isLoggedIn}
        onOpenApp={() => navigateTopLevel('app')}
        onNavigate={navigateTopLevel}
      />
    );
  }

  if (!isAuthChecked) {
    return <AppLoadingScreen />;
  }

  if (isSharedViewer && !isSharedDataReady) {
    return <AppLoadingScreen />;
  }

  const showBottomNav =
    isLoggedIn &&
    !isSharedViewer &&
    ['dashboard', 'leaderboard', 'history', 'profile'].includes(screen);
  const isHistoryLoadingForUi =
    !hasResolvedInitialHistoryHydration &&
    tournaments.length === 0 &&
    (isHistorySyncing || !hasSyncedHistoryThisSession);
  const notificationToastOffset = showBottomNav
    ? 'calc(var(--app-safe-bottom, 0px) + 92px)'
    : 'calc(var(--app-safe-bottom, 0px) + 16px)';

  return (
    <div className="min-h-screen bg-white">
      <div>
        {screen === 'login' && <LoginScreen />}
        {screen === 'dashboard' && (
          <DashboardFeatureScreen
            onStartMatch={() => {
              if (!hasSetupDraftChanges(tournament)) {
                setTournament(createFreshTournamentDraft());
              }
              setDraftMatchBackgroundId(null);
              setMatchSettingsWizardStep(0);
              setScreen('settings');
            }}
            onOpenRankingForMe={() => {
              setRankingFocusRequestId((prev) => prev + 1);
              setScreen('leaderboard');
            }}
            tournament={tournament}
            onContinueMatch={() => {
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen('active');
            }}
            onNotifications={() => {
              setNotificationBackScreen('dashboard');
              setScreen('notifications');
            }}
            onOpenHistoryList={() => {
              setHistoryBackScreen('dashboard');
              setScreen('history');
            }}
            onOpenHistoryMatch={(t) => handleOpenHistoryTournament(t, 'dashboard')}
            notificationsEnabled={NOTIFICATIONS_ENABLED}
            unreadCount={unreadNotificationsCount}
            tournaments={tournaments}
            user={user}
            isHistoryLoading={isHistoryLoadingForUi}
            renderLogo={(className) => <AppLogo className={className} />}
            renderHistoryCard={(item, onClick) => (
              <TournamentHistoryCard
                tournament={item}
                onClick={onClick}
              />
            )}
          />
        )}
        {screen === 'leaderboard' && (
          <LeaderboardScreen
            currentUser={user}
            onOpenRankDetails={() => setScreen('rank-discovery')}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('leaderboard');
              setScreen('mmr-history');
            }}
            focusRequestId={rankingFocusRequestId}
            refreshToken={leaderboardRefreshToken}
            isFirestoreSaverModeEnabled={isFirestoreSaverModeEnabled}
            recordDbMetric={recordDbMetric}
            recordDbError={recordDbError}
          />
        )}
        {screen === 'rank-discovery' && (
          <RankDiscoveryScreen
            currentUser={user}
            onBack={() => setScreen('leaderboard')}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('rank-discovery');
              setScreen('mmr-history');
            }}
          />
        )}
        {screen === 'mmr-history' && (
          <MMRHistoryScreen
            currentUser={user}
            onBack={() => setScreen(mmrHistoryBackScreen)}
            onOpenRankDetails={() => setScreen('rank-discovery')}
            renderLogo={(className) => <AppLogo className={className} />}
          />
        )}
        {screen === 'history-detail' && selectedHistory && (
          <HistoryDetailScreen
            tournament={selectedHistory}
            onBack={() => {
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen(historyBackScreen);
            }}
            onViewFinalStandings={handleOpenHistoryFinalStandings}
            onViewMatchDetails={handleOpenHistoryMatchDetails}
          />
        )}
        {screen === 'history' && (
          <HistoryFeatureScreen
            tournaments={tournaments}
            onOpenTournament={(t) => handleOpenHistoryTournament(t, 'history')}
            isHistoryLoading={isHistoryLoadingForUi}
            renderHistoryCard={(item, onClick) => (
              <TournamentHistoryCard
                tournament={item}
                onClick={onClick}
              />
            )}
          />
        )}
        {screen === 'settings' && (
          <MatchSettingsScreen
            onBack={() => setScreen('dashboard')}
            onGenerate={handleGenerateTournament}
            onOpenFriends={() => {
              const selectedIds = new Set((tournament.players || []).filter(Boolean).map((p) => p.id));
              const allIds = new Set((allPlayers || []).filter(Boolean).map((p) => p.id));
              const missingFromList = Array.from(selectedIds).filter((id) => !allIds.has(id)).length;
              console.info('[FriendsPicker] Open from match settings', {
                selectedCount: selectedIds.size,
                allPlayersCount: allIds.size,
                missingFromList
              });
              setMatchSettingsWizardStep(2);
              setFriendsEntrySource('settings');
              setScreen('friends');
            }}
            tournament={tournament}
            setTournament={setTournament}
            allPlayers={allPlayers}
            setAllPlayers={setAllPlayers}
            onAddNotification={addNotification}
            currentUser={user}
            focusSection={settingsFocusSection}
            onFocusHandled={() => setSettingsFocusSection(null)}
            wizardStep={matchSettingsWizardStep}
            onWizardStepChange={setMatchSettingsWizardStep}
            selectedBackgroundId={draftMatchBackgroundId}
            onSelectBackground={setDraftMatchBackgroundId}
          />
        )}
        {screen === 'background-picker' && (
          <MatchBackgroundPickerScreen
            tournament={tournament}
            selectedBackgroundId={draftMatchBackgroundId}
            onSelectBackground={setDraftMatchBackgroundId}
            onBack={() => setScreen('settings')}
            onSkip={handleSkipMatchBackground}
            onContinue={() => {
              if (!draftMatchBackgroundId) return;
              setTournament((prev) => ({
                ...prev,
                backgroundId: draftMatchBackgroundId
              }));
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen('active');
            }}
          />
        )}
        {screen === 'active' && (
          <MatchActiveScreen
            onBack={() => {
              if (activeBackScreen === 'history-detail') {
                setScreen('history-detail');
                return;
              }
              if (activeBackScreen === 'history') {
                setScreen('history');
                return;
              }
              if (activeBackScreen === 'profile') {
                setScreen('profile');
                return;
              }
              if (activeBackScreen === 'klasemen') {
                setScreen('klasemen');
                return;
              }
              setScreen('dashboard');
            }}
            onStartNewMatch={() => {
              setDraftMatchBackgroundId(null);
              setMatchSettingsWizardStep(0);
              setScreen('settings');
            }}
            tournament={activeScreenTournament || tournament}
            currentUser={user}
            onUpdateScore={handleUpdateScore}
            onNextRound={handleNextRound}
            onStartAmericanoRound={handleStartAmericanoRound}
            onCompleteAmericanoRound={handleCompleteAmericanoRound}
            onUpdateRounds={handleUpdateRounds}
            onUpdateCourts={handleUpdateCourts}
            onUpdateActivePlayers={handleUpdateActivePlayers}
            onAddManualPlayer={handleAddPlayerDuringActiveMatch}
            onDeleteRoundsFrom={handleDeleteRoundsFrom}
            onDeleteMatch={handleDeleteActiveMatch}
            needsRegenerateFromRound={needsRegenerateFromRound}
            onOpenStandings={handleOpenLiveStandings}
            onSwapPlayer={handleSwapPlayer}
            onUpdateMatchPlayScore={handleUpdateMatchPlayScore}
            onShareMatch={handleShareCurrentMatch}
            isReadOnly={isSharedViewer || Boolean(activeScreenTournament)}
            isSharedViewer={isSharedViewer}
            saveState={activeSaveState}
            statsSyncState={resolveTournamentStatsSyncState(activeScreenTournament || tournament)}
          />
        )}
        {screen === 'klasemen' && (
          <KlasemenScreen
            tournament={selectedKlasemenTournament || tournament}
            currentUser={user}
            onBack={() => setScreen(isSharedViewer ? 'active' : klasemenBackScreen)}
            onShare={handleShareStandings}
            onShareFeedback={showShareFeedbackToast}
            onOpenActive={handleOpenActiveFromStandings}
            isSharedViewer={isSharedViewer}
            statsSyncState={resolveTournamentStatsSyncState(selectedKlasemenTournament || tournament)}
          />
        )}
        {NOTIFICATIONS_ENABLED && screen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClearAll={handleClearAll}
            onBack={() => setScreen(notificationBackScreen)}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            onLogout={async () => {
              try {
                await signOut(auth);
              } catch (err) {
                console.error('Logout error:', err);
              }
            }}
            user={user}
            tournaments={tournaments}
            setUser={setUser}
            addNotification={addNotification}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('profile');
              setScreen('mmr-history');
            }}
            onOpenNotifications={() => {
              setNotificationBackScreen('profile');
              setScreen('notifications');
            }}
            onOpenFriends={() => {
              setFriendsEntrySource('profile');
              setScreen('friends');
            }}
            unreadCount={unreadNotificationsCount}
            notificationsEnabled={NOTIFICATIONS_ENABLED}
            isAdminEmail={isAdminEmail}
            recordDbMetric={recordDbMetric}
            recordDbError={recordDbError}
          />
        )}
        {screen === 'friends' && (
          <FriendsScreen
            currentUser={user}
            onBack={() => {
              if (friendsEntrySource === 'settings') {
                setMatchSettingsWizardStep(2);
                setScreen('settings');
                return;
              }
              setScreen('profile');
            }}
            addNotification={addNotification}
            notificationsEnabled={NOTIFICATIONS_ENABLED}
            isFirestoreSaverModeEnabled={isFirestoreSaverModeEnabled}
            recordDbMetric={recordDbMetric}
            recordDbError={recordDbError}
            pickerMode={friendsEntrySource === 'settings'}
            selectedPlayerIds={tournament.players.map((p) => p.id)}
            onTogglePickForMatch={upsertPlayerFromFriend}
            onDonePick={() => {
              const selectedIds = new Set((tournament.players || []).filter(Boolean).map((p) => p.id));
              const allIds = new Set((allPlayers || []).filter(Boolean).map((p) => p.id));
              const missingFromList = Array.from(selectedIds).filter((id) => !allIds.has(id)).length;
              const summarySignature = `${selectedIds.size}:${allIds.size}:${missingFromList}`;
              if (lastFriendPickerSummaryRef.current !== summarySignature) {
                lastFriendPickerSummaryRef.current = summarySignature;
                console.info('[FriendsPicker] Done selecting players', {
                  selectedCount: selectedIds.size,
                  allPlayersCount: allIds.size,
                  missingFromList
                });
              }
              setSettingsFocusSection('players');
              setMatchSettingsWizardStep(2);
              setScreen('settings');
            }}
          />
        )}
      </div>

      {showBottomNav && (
        <BottomNav
          currentScreen={screen}
          setScreen={setScreen}
          unreadCount={unreadNotificationsCount}
        />
      )}

      <AnimatePresence>
        {NOTIFICATIONS_ENABLED && notificationToasts.length > 0 && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[145] w-[min(92vw,420px)] space-y-2"
            style={{ bottom: notificationToastOffset }}
          >
            <AnimatePresence initial={false}>
              {notificationToasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className={cn(
                    'w-full rounded-[20px] border shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur px-4 py-3 text-left',
                    getNotificationVisuals(toast).cardClass
                  )}
                >
                  {(() => {
                    const visuals = getNotificationVisuals(toast);
                    const Icon = visuals.icon;
                    return (
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center shrink-0', visuals.iconWrapClass)}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13px] font-bold truncate', visuals.titleClass)}>
                        {toast.title}
                      </p>
                      <p className={cn('mt-0.5 text-[12px] leading-snug', visuals.messageClass)}>
                        {toast.message}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotificationToast(toast.id)}
                      className={cn('shrink-0 p-1 -mr-1 tap-target', visuals.dismissClass)}
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                    );
                  })()}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
