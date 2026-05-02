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
import { withTimeout } from './features/auth/authUtils';
import { DashboardScreen as DashboardFeatureScreen } from './features/dashboard/DashboardScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { MatchBackgroundPickerScreen } from './features/matches/MatchBackgroundPickerScreen';
import { MatchActiveScreen } from './features/matches/MatchActiveScreen';
import { KlasemenScreen } from './features/matches/KlasemenScreen';
import { MatchSettingsScreen } from './features/matches/MatchSettingsScreen';
import { TournamentHistoryCard } from './features/history/HistoryCards';
import { HistoryDetailScreen } from './features/history/HistoryDetailScreen';
import { HistoryScreen as HistoryFeatureScreen } from './features/history/HistoryScreen';
import { useLocalTournamentPersistence } from './features/history/useLocalTournamentPersistence';
import { useTournamentHistorySync } from './features/history/useTournamentHistorySync';
import { NotificationsScreen } from './features/notifications/NotificationsScreen';
import { useNotifications } from './features/notifications/useNotifications';
import { getNotificationVisuals } from './features/notifications/notificationVisuals';
import { buildShareUrl, toShareableTournamentSnapshot } from './features/share/shareUtils';
import { useSharedMatchLifecycle } from './features/share/useSharedMatchLifecycle';
import {
  getTournamentShareStorageKey,
  getTournamentStorageKey,
  getTournamentVisualSeed,
  HISTORY_LEDGER_FALLBACK_LIMIT,
  HISTORY_QUERY_TIMEOUT_MS,
  HISTORY_RECENT_FETCH_LIMIT,
  normalizeCourtChanges,
  normalizeHistoryTournament,
  SHARE_WRITE_TIMEOUT_MS,
} from './features/history/historyPersistence';
import { getTournamentDateMs, sortTournamentsByNewest } from './features/history/historyUtils';
import { RankDiscoveryScreen } from './features/ranking/RankDiscoveryScreen';
import { MMRHistoryScreen } from './features/ranking/MMRHistoryScreen';
import { LeaderboardScreen } from './features/ranking/LeaderboardScreen';
import { getRankInfo } from './features/ranking/rankUtils';
import { FriendsScreen } from './features/friends/FriendsScreen';
import { getRandomMatchBackground } from './features/matches/matchBackgrounds';
import { formatDurationFromMs } from './features/matches/matchTimeUtils';
import { dedupePlayersById, sortPlayersByName } from './features/matches/matchSetupUtils';
import { isLikelyFirebaseUid, MANUAL_PLAYER_ID_PREFIX } from './features/players/playerUtils';
import { usePlayerProfileSync } from './features/players/usePlayerProfileSync';
import { generateTournamentFromSettings } from './features/tournaments/generateTournament';
import { createFreshTournamentDraft, hasSetupDraftChanges, sanitizeInactivePlayerIds } from './features/tournaments/tournamentDraft';
import { useActiveTournamentLifecycle } from './features/tournaments/useActiveTournamentLifecycle';
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
import { deleteSharedMatch, discoverSharedMatchIdsForActiveTournament, getSharedMatchRef, saveSharedMatch } from './services/sharedMatchRepository';
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

const hasTournamentDetailPayload = (history: TournamentHistory | null | undefined) => (
  Boolean(
    history &&
    Array.isArray(history.rounds) &&
    history.rounds.length > 0 &&
    Array.isArray(history.players) &&
    history.players.length > 0
  )
);

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

  type ShareDeliveryResult = 'copied' | 'shared' | 'manual' | 'failed';

  const tryCopyToClipboard = async (text: string): Promise<ShareDeliveryResult> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return 'copied';
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const copied = document.execCommand('copy');
      document.body.removeChild(ta);
      if (copied) return 'copied';
      // Some mobile browsers can still copy successfully even when execCommand returns false.
      return 'copied';
    } catch {
      // fallback below
    }

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ url: text });
        return 'shared';
      }
    } catch {
      // fallback below
    }

    try {
      window.prompt('Copy this link:', text);
      return 'manual';
    } catch {
      // ignore
    }
    return 'failed';
  };

  const handleOpenLiveStandings = () => {
    setSelectedKlasemenTournament(activeScreenTournament || tournament);
    setKlasemenBackScreen('active');
    setScreen('klasemen');
  };

  const buildReadOnlyTournamentFromHistory = (history: TournamentHistory): Tournament => {
    const rounds = (history.rounds || []).map((round) => ({
      ...round,
      playersBye: Array.isArray(round.playersBye) ? round.playersBye : []
    }));
    const fallbackStartedAt = typeof history.startedAt === 'number'
      ? history.startedAt
      : (history.date ? new Date(history.date).getTime() : undefined);
    const fallbackEndedAt = typeof history.endedAt === 'number'
      ? history.endedAt
      : fallbackStartedAt;
    const detectedCourts = Math.max(1, ...rounds.flatMap((round) => round.matches.map((match) => match.court || 1)));
    const maxKnownMatchPoints = rounds.reduce((maxPoints, round) => (
      round.matches.reduce((roundMax, match) => (
        Math.max(roundMax, (match.teamA.score || 0) + (match.teamB.score || 0))
      ), maxPoints)
    ), 0);

    return {
      id: history.id,
      name: history.name,
      format: history.format,
      backgroundId: history.backgroundId,
      themeColorId: history.themeColorId,
      criteria: history.criteria || 'Points Won',
      scoringType: history.scoringType,
      startedAt: fallbackStartedAt,
      endedAt: fallbackEndedAt,
      courts: history.courts || detectedCourts,
      totalPoints: history.totalPoints ?? (history.format === 'Match Play' ? 0 : Math.max(21, maxKnownMatchPoints || 21)),
      players: history.players || [],
      courtChanges: normalizeCourtChanges(history.courtChanges),
      rounds,
      numRounds: history.numRounds || rounds.length || 1,
      venueName: history.venueName,
      location: history.location
    };
  };

  const handleOpenHistoryFinalStandings = () => {
    if (!selectedHistory) return;
    setSelectedKlasemenTournament(selectedHistory);
    setKlasemenBackScreen('history-detail');
    setScreen('klasemen');
  };

  const handleOpenHistoryMatchDetails = () => {
    if (!selectedHistory) return;
    setActiveScreenTournament(buildReadOnlyTournamentFromHistory(selectedHistory));
    setActiveBackScreen('history-detail');
    setScreen('active');
  };

  const hydrateTournamentHistoryDetail = async (history: TournamentHistory): Promise<TournamentHistory> => {
    if (hasTournamentDetailPayload(history)) return history;
    if (isFirestoreSaverModeEnabled()) {
      recordDbMetric({ flow: 'history_detail', operation: 'skip', count: 1, label: 'saver_mode_detail_hydration' });
      return history;
    }

    const normalizeDetailDate = (rawDate: any, fallbackDate: Date) => {
      if (rawDate?.toDate) return rawDate.toDate();
      if (rawDate instanceof Date) return rawDate;
      if (typeof rawDate === 'number') return new Date(rawDate);
      if (typeof rawDate === 'string') {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return fallbackDate;
    };

    try {
      const detailResult = await readTournamentDetailRow(history.id);
      recordDbMetric({ flow: 'history_detail', operation: 'read', count: 1, docs: detailResult.exists ? 1 : 0, label: 'tournament_details' });
      if (detailResult.exists) {
        const detailData = detailResult.data || {};
        return normalizeHistoryTournament({
          ...history,
          ...(detailData as TournamentHistory),
          id: history.id,
          date: normalizeDetailDate((detailData as any)?.date, history.date)
        });
      }
    } catch (detailErr) {
      recordDbError({ flow: 'history_detail', label: 'tournament_details', err: detailErr });
      console.error('Tournament detail fetch error:', detailErr);
    }

    try {
      const fallbackResult = await readLegacyTournamentRow(history.id);
      recordDbMetric({ flow: 'history_detail', operation: 'read', count: 1, docs: fallbackResult.exists ? 1 : 0, label: 'legacy_tournaments' });
      if (fallbackResult.exists) {
        const fallbackData = fallbackResult.data || {};
        return normalizeHistoryTournament({
          ...history,
          ...(fallbackData as TournamentHistory),
          id: history.id,
          date: normalizeDetailDate((fallbackData as any)?.date, history.date)
        });
      }
    } catch (fallbackErr) {
      recordDbError({ flow: 'history_detail', label: 'legacy_tournaments', err: fallbackErr });
      console.error('Tournament legacy detail fetch error:', fallbackErr);
    }

    return history;
  };

  const handleOpenHistoryTournament = async (
    history: TournamentHistory,
    backScreen: 'dashboard' | 'history' | 'profile'
  ) => {
    setHistoryBackScreen(backScreen);
    setSelectedHistory(history);
    setScreen('history-detail');
    const detailedHistory = await hydrateTournamentHistoryDetail(history);
    setSelectedHistory(detailedHistory);
    setTournaments((prev) => prev.map((item) => (
      item.id === detailedHistory.id ? detailedHistory : item
    )));
  };

  const handleOpenActiveFromStandings = () => {
    const standingsTournament = selectedKlasemenTournament || tournament;
    if (isSharedViewer) {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if (klasemenBackScreen === 'active') {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if ('numPlayers' in standingsTournament) {
      setActiveScreenTournament(buildReadOnlyTournamentFromHistory(standingsTournament as TournamentHistory));
    } else {
      // Returning from live standings should keep the editable active match context.
      setActiveScreenTournament(null);
    }
    setActiveBackScreen('klasemen');
    setScreen('active');
  };

  const handleShareCurrentMatch = async () => {
    try {
      const currentUid = auth.currentUser?.uid || user?.uid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share matches.', 'system');
        return;
      }

      let shareId = sharedMatchId || Math.random().toString(36).slice(2, 10);
      const safeTournament = toShareableTournamentSnapshot(tournament);
      const writePayload = {
        tournament: safeTournament,
        hostUid: currentUid,
        activeStartedAt: Number(tournament.startedAt || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await persistActiveTournamentSnapshot(tournament);

      try {
        // Update existing share link if available.
        await withTimeout(
          saveSharedMatch(shareId, writePayload, { merge: true }),
          SHARE_WRITE_TIMEOUT_MS,
          'Share link sync'
        );
        recordDbMetric({
          flow: 'share_host',
          operation: 'write',
          count: 1,
          label: 'share_current_match',
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION
        });
      } catch (firstErr) {
        if (firstErr instanceof Error && firstErr.message.includes('timed out')) {
          throw firstErr;
        }
        // Fallback: if existing doc is not writable, mint a fresh share link.
        shareId = Math.random().toString(36).slice(2, 10);
        await withTimeout(
          saveSharedMatch(shareId, writePayload, { merge: false }),
          SHARE_WRITE_TIMEOUT_MS,
          'Share link sync'
        );
        recordDbMetric({
          flow: 'share_host',
          operation: 'write',
          count: 1,
          label: 'share_current_match_fresh',
          dbRole: 'ephemeral',
          collection: SHARED_MATCHES_COLLECTION
        });
      }

      setSharedMatchId(shareId);
      setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
      if (tournament?.startedAt) {
        localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
      }
      const finalUrl = buildShareUrl(shareId, 'active');

      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
      }
    } catch (err) {
      recordDbError({
        flow: 'share_host',
        label: 'share_current_match',
        err,
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION
      });
      console.error('Share current match error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null
      });
      showShareCopiedToast('failed');
    }
  };

  const handleShareStandings = async (targetTournament: Tournament | TournamentHistory) => {
    try {
      if (isSharedViewer && sharedMatchId) {
        const currentSharedUrl = buildShareUrl(sharedMatchId, 'klasemen');
        const shareResult = await tryCopyToClipboard(currentSharedUrl);
        if (shareResult === 'copied') showShareCopiedToast('copied');
        else if (shareResult === 'shared' || shareResult === 'manual') showShareCopiedToast('ready');
        else showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
        return;
      }

      const currentUid = auth.currentUser?.uid || user?.uid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share standings.', 'system');
        return;
      }

      const isActiveTournamentShare =
        !('date' in targetTournament) &&
        Boolean((targetTournament as Tournament)?.startedAt) &&
        Boolean(tournament?.startedAt) &&
        (targetTournament as Tournament).startedAt === tournament.startedAt;
      if (isActiveTournamentShare) {
        await persistActiveTournamentSnapshot(targetTournament as Tournament);
      }
      const shareId = isActiveTournamentShare
        ? (sharedMatchId || Math.random().toString(36).slice(2, 10))
        : Math.random().toString(36).slice(2, 10);
      const safeTournament = toShareableTournamentSnapshot(targetTournament);
      await withTimeout(
        saveSharedMatch(shareId, {
          tournament: safeTournament,
          hostUid: currentUid,
          activeStartedAt: isActiveTournamentShare
            ? Number((targetTournament as Tournament).startedAt || 0)
            : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: isActiveTournamentShare }),
        SHARE_WRITE_TIMEOUT_MS,
        'Share standings sync'
      );
      recordDbMetric({
        flow: 'share_host',
        operation: 'write',
        count: 1,
        label: 'share_standings',
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION
      });
      if (isActiveTournamentShare) {
        setSharedMatchId(shareId);
        setLinkedShareIds((prev) => Array.from(new Set([...prev, shareId])));
        if (tournament?.startedAt) {
          localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
        }
      }
      const finalUrl = buildShareUrl(shareId, 'klasemen');
      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        showShareFeedbackToast('failed', 'Browser menolak akses clipboard. Coba share lagi.');
      }
    } catch (err) {
      recordDbError({
        flow: 'share_host',
        label: 'share_standings',
        err,
        dbRole: 'ephemeral',
        collection: SHARED_MATCHES_COLLECTION
      });
      console.error('Share standings error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null
      });
      showShareCopiedToast('failed');
    }
  };


  const handleGenerateTournament = (settings: Tournament) => {
    const nextTournament = generateTournamentFromSettings(settings);

    setSharedMatchId(null);
    setTournament(nextTournament);
    setDraftMatchBackgroundId(settings.backgroundId || null);
    setNeedsRegenerateFromRound(null);
    void persistActiveTournamentSnapshot(nextTournament);
    if (settings.backgroundId) {
      setActiveScreenTournament(null);
      setActiveBackScreen('dashboard');
      setScreen('active');
    } else {
      // Legacy setup still chooses the background after match generation.
      setScreen('background-picker');
    }
    addNotification('Matches Started!', `${settings.name} has been created with ${settings.players.length} players.`, 'tournament');
  };

  const handleSkipMatchBackground = () => {
    const randomBackgroundId = getRandomMatchBackground(tournament.format);
    setDraftMatchBackgroundId(randomBackgroundId);
    setTournament((prev) => ({
      ...prev,
      backgroundId: randomBackgroundId
    }));
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setScreen('active');
  };

  const upsertPlayerFromFriend = (friend: Friend) => {
    const initials = friend.displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'FR';
    const playerObj: Player = {
      id: friend.uid,
      name: friend.displayName,
      rating: friend.mmr || 0,
      source: 'fom',
      avatar: friend.photoURL || '',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    setAllPlayers((prev) => {
      const existsInList = prev.some((p) => p.id === playerObj.id);
      const next = existsInList ? prev : [playerObj, ...prev];
      if (!existsInList) {
        console.info('[FriendsPicker] Added friend to allPlayers catalog', {
          friendUid: friend.uid,
          friendName: friend.displayName,
          allPlayersBefore: prev.length,
          allPlayersAfter: next.length
        });
      }
      return next;
    });
    setTournament((prev) => {
      const alreadySelected = prev.players.some((p) => p.id === playerObj.id);
      const nextPlayers = alreadySelected
        ? prev.players.filter((p) => p.id !== playerObj.id)
        : [...prev.players, playerObj];
      console.info('[FriendsPicker] Toggle friend selection for match', {
        friendUid: friend.uid,
        friendName: friend.displayName,
        action: alreadySelected ? 'removed' : 'added',
        selectedBefore: prev.players.length,
        selectedAfter: nextPlayers.length
      });
      return {
        ...prev,
        players: nextPlayers
      };
    });

    const uid = auth.currentUser?.uid || user?.uid;
    if (uid) {
      setDoc(doc(db, USERS_COLLECTION, uid, USER_FRIENDS_COLLECTION, friend.uid), { lastPlayedAt: serverTimestamp() }, { merge: true })
        .catch((err) => console.error('Update friend lastPlayedAt error:', err));
    }
  };

  const handleAddPlayerDuringActiveMatch = (newPlayer: Player) => {
    setAllPlayers((prev) => {
      const exists = prev.some((player) => player.id === newPlayer.id);
      return exists ? prev : [newPlayer, ...prev];
    });

    const existsInTournament = (tournament.players || []).some((player) => player.id === newPlayer.id);
    if (existsInTournament) return;

    const nextPlayers = [...(tournament.players || []), newPlayer];
    const sanitizedInactive = sanitizeInactivePlayerIds(nextPlayers, tournament.inactivePlayerIds);
    const nextTournament: Tournament = {
      ...tournament,
      players: nextPlayers,
      inactivePlayerIds: sanitizedInactive
    };
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
          }
        : nextTournament
    );

    setTournament(persistedTournament);

    addNotification(
      'New Player Added',
      `${newPlayer.name} akan ikut mulai ronde berikutnya.`,
      'system'
    );
  };

  const handleDeleteRoundsFrom = (roundId: number) => {
    const safeRoundId = Math.max(2, Math.floor(roundId || 0));
    const now = Date.now();
    const hasAnyDeletion = (tournament.rounds || []).some((round) => round.id >= safeRoundId);
    if (!hasAnyDeletion) return;

    if (!tournament.rounds || tournament.rounds.length === 0) return;

    const keptRounds = tournament.rounds
        .filter((round) => round.id < safeRoundId)
        .map((round) => ({
          ...round,
          playersBye: [...(round.playersBye || [])],
          matches: round.matches.map((match) => ({
            ...match,
            teamA: { ...match.teamA, players: [...match.teamA.players] },
            teamB: { ...match.teamB, players: [...match.teamB.players] }
          }))
        }));

    if (keptRounds.length === tournament.rounds.length) return;

    let normalizedRounds = keptRounds;
    const activeIdx = normalizedRounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
    if (activeIdx === -1 && normalizedRounds.length > 0) {
      const lastIdx = normalizedRounds.length - 1;
      normalizedRounds = normalizedRounds.map((round, idx) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (idx === lastIdx) {
            return {
              ...match,
              status: 'active' as const,
              startedAt: match.startedAt || now
            };
          }
          return {
            ...match,
            status: 'completed' as const,
            duration: match.duration || (match.startedAt ? formatDurationFromMs(now - match.startedAt) : '00:00')
          };
        })
      }));
    }

    const nextTournament: Tournament = {
      ...tournament,
      rounds: normalizedRounds,
      endedAt: undefined
    };

    const persistedTournament = (
      nextTournament.format === 'Americano'
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
          }
        : nextTournament
    );

    setTournament(persistedTournament);
    void persistActiveTournamentSnapshot(persistedTournament);

    setNeedsRegenerateFromRound(null);
    addNotification(
      'Round Dihapus',
      `Round ${safeRoundId} onward has been deleted. Please regenerate from the latest scores.`,
      'system'
    );
  };

  const handleDeleteActiveMatch = async () => {
    const deletedTournamentName = (tournament.name || '').trim() || 'Match';
    const activeTournamentStartedAt = tournament.startedAt;
    const currentSharedMatchId = sharedMatchId;
    const finalizedTournamentId = typeof tournament.id === 'string' ? tournament.id.trim() : '';
    const shouldDeleteFinalizedHistory = Boolean(
      finalizedTournamentId &&
      tournament.endedAt &&
      user?.uid &&
      !isSharedViewer
    );

    if (shouldDeleteFinalizedHistory) {
      try {
        const deleteTournamentHistory = httpsCallable<
          { tournamentId: string },
          {
            success: boolean,
            alreadyDeleted?: boolean,
            rolledBackStats?: boolean,
            deletedLedgerEntries?: number,
            rolledBackParticipants?: number,
          }
        >(firebaseFunctions, 'deleteTournamentHistory');
        await deleteTournamentHistory({ tournamentId: finalizedTournamentId });
        setTournaments((prev) => prev.filter((item) => item.id !== finalizedTournamentId));
        setSelectedHistory((prev) => (prev?.id === finalizedTournamentId ? null : prev));
      } catch (err) {
        console.error('Delete tournament history error:', err);
        addNotification(
          'Hapus Gagal',
          'Riwayat pertandingan dan statistik pemain belum berhasil dihapus. Coba lagi.',
          'system',
          'error'
        );
        return;
      }
    }

    setDraftMatchBackgroundId(null);
    setNeedsRegenerateFromRound(null);
    setSharedMatchId(null);
    setSelectedKlasemenTournament(null);
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setActiveSaveState('saved');
    clearTournamentStatsSyncWatch();
    resetTournamentStatsSync();
    setTournament(createFreshTournamentDraft());
    setScreen('dashboard');

    if (user?.uid) {
      localStorage.removeItem(getTournamentStorageKey(user.uid));
      if (activeTournamentStartedAt) {
        localStorage.removeItem(getTournamentShareStorageKey(user.uid, activeTournamentStartedAt));
      }
    }

    if (user?.uid && !isSharedViewer) {
      try {
        await clearActiveTournamentSnapshot();
      } catch (err) {
        console.error('Delete active match sync error:', err);
      }
    }

    if (currentSharedMatchId && user?.uid && !isSharedViewer) {
      try {
        await deleteSharedMatch(currentSharedMatchId);
      } catch (err) {
        console.error('Delete shared match error:', err);
      }
    }

    addNotification(
      'Pertandingan Dihapus',
      shouldDeleteFinalizedHistory
        ? `${deletedTournamentName} berhasil dihapus, termasuk riwayat pertandingan dan rollback statistik pemain.`
        : `${deletedTournamentName} berhasil dihapus dari match aktif.`,
      'system'
    );
  };

  const handleUpdateScore = (matchId: string, team: 'A' | 'B', score: number) => {
    let shouldInvalidateFutureRounds = false;
    let invalidateFromRoundId: number | null = null;
    setTournament(prev => {
      const editedRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.id === matchId));
      const activeRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
      const canInvalidateFutureRounds = (
        editedRoundIndex !== -1 &&
        activeRoundIndex !== -1 &&
        editedRoundIndex < activeRoundIndex &&
        prev.format !== 'Match Play'
      );
      let updatedMatchIsValidForStanding = false;

      const newRounds = prev.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => {
          if (match.id === matchId) {
            const nextScoreA = team === 'A' ? score : match.teamA.score;
            const nextScoreB = team === 'B' ? score : match.teamB.score;
            updatedMatchIsValidForStanding = (
              nextScoreA + nextScoreB === prev.totalPoints &&
              (nextScoreA > 0 || nextScoreB > 0)
            );
            return {
              ...match,
              teamA: { ...match.teamA, score: nextScoreA },
              teamB: { ...match.teamB, score: nextScoreB }
            };
          }
          return match;
        })
      }));

      if (canInvalidateFutureRounds && updatedMatchIsValidForStanding) {
        shouldInvalidateFutureRounds = true;
        invalidateFromRoundId = editedRoundIndex + 2;
      }

      return { ...prev, rounds: newRounds };
    });

    if (shouldInvalidateFutureRounds && invalidateFromRoundId !== null) {
      const nextFlag = needsRegenerateFromRound === null
        ? invalidateFromRoundId
        : Math.min(needsRegenerateFromRound, invalidateFromRoundId);

      if (nextFlag !== needsRegenerateFromRound) {
        setNeedsRegenerateFromRound(nextFlag);
        addNotification(
          'Schedule Needs Regeneration',
          `Older round scores were updated. Delete round ${nextFlag}+ and regenerate.`,
          'system'
        );
      }
    }
  };

  const handleUpdateActivePlayers = (activePlayerIds: string[]) => {
    const knownIds = new Set((tournament.players || []).map((player) => player.id));
    const requestedActiveIds = Array.from(new Set(activePlayerIds.filter((id) => knownIds.has(id))));
    const requestedActiveSet = new Set(requestedActiveIds);
    const nextInactivePlayerIds = (tournament.players || [])
      .map((player) => player.id)
      .filter((playerId) => !requestedActiveSet.has(playerId));
    const currentInactivePlayerIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
    const hasChanges = (
      nextInactivePlayerIds.length !== currentInactivePlayerIds.length ||
      nextInactivePlayerIds.some((playerId, idx) => playerId !== currentInactivePlayerIds[idx])
    );

    if (!hasChanges) return;

    const sanitizedInactive = sanitizeInactivePlayerIds(tournament.players || [], nextInactivePlayerIds);
    const nextTournament: Tournament = {
      ...tournament,
      inactivePlayerIds: sanitizedInactive
    };
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
          }
        : nextTournament
    );

    setTournament(persistedTournament);

    addNotification(
      'Active Players Updated',
      'Changes are saved and will apply starting from the next round.',
      'system'
    );
  };

  const handleNextRound = async () => {
    const now = Date.now();
    if (!tournament.rounds) return;
    if (needsRegenerateFromRound !== null) {
      addNotification(
        'Regeneration Required',
        `Delete round ${needsRegenerateFromRound}+ before continuing to the next round.`,
        'system'
      );
      return;
    }
    const activePlayers = getActivePlayersFromTournament(tournament);
    const activeRoundIndex = tournament.rounds.findIndex(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const currentRoundIndex = activeRoundIndex !== -1 ? activeRoundIndex : latestLockedRoundIndex;
    if (currentRoundIndex === -1) return;
    const activeRound = tournament.rounds[currentRoundIndex];
    if (tournament.format !== 'Match Play' && activeRound) {
      const incompleteMatches = activeRound.matches.filter((match) => (
        (match.teamA.score || 0) + (match.teamB.score || 0) !== tournament.totalPoints
      ));
      if (incompleteMatches.length > 0) {
        const proceed = window.confirm(
          `${incompleteMatches.length} matches in the active round have incomplete scores. Continue to the next round now?\n\nYou can still edit this round's scores, then delete the new round and regenerate.`
        );
        if (!proceed) return;
        addNotification(
          'Continue With Incomplete Scores',
          `Round continued with ${incompleteMatches.length} incomplete matches.`,
          'system'
        );
      }
    }
    const nextRoundId = currentRoundIndex + 2;
    const isConfiguredLastRound = currentRoundIndex >= (tournament.numRounds - 1);
    if (!isConfiguredLastRound && activePlayers.length < 4) {
      addNotification(
        'Not Enough Active Players',
        'At least 4 active players are required to continue to the next round.',
        'system'
      );
      return;
    }
    const hasPreGeneratedNextRound = Boolean(tournament.rounds[currentRoundIndex + 1]);
    const shouldFinishBecauseNoPreparedRound = tournament.format === 'Americano' && !hasPreGeneratedNextRound;
    const finalizedRounds = tournament.rounds.map((round, idx) => {
      if (idx !== currentRoundIndex) return round;
      return {
        ...round,
        matches: round.matches.map((m) => m ? ({
          ...m,
          status: 'completed' as const,
          duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
        }) : m)
      };
    });

    if (isConfiguredLastRound || shouldFinishBecauseNoPreparedRound) {
      // Tournament finished - mark last round as completed
      let finalizedTournamentId = typeof tournament.id === 'string' && tournament.id.trim()
        ? tournament.id.trim()
        : Math.random().toString(36).substr(2, 9);
      const finalizedTournament = {
        ...tournament,
        id: finalizedTournamentId,
        rounds: finalizedRounds,
        endedAt: now
      };
      setTournament(finalizedTournament);
      addNotification('Matches Completed!', `Congratulations to the winners of ${tournament.name}!`, 'achievement');

      // Save tournament to history. Aggregate stats are handled by Cloud Functions.
      if (user) {
        const historyItem: TournamentHistory = {
          id: finalizedTournamentId,
          userId: user.uid,
          name: tournament.name,
          format: tournament.format,
          backgroundId: tournament.backgroundId,
          themeColorId: tournament.themeColorId,
          criteria: tournament.criteria,
          scoringType: tournament.scoringType,
          date: new Date(),
          startedAt: tournament.startedAt,
          endedAt: now,
          courts: tournament.courts,
          totalPoints: tournament.totalPoints,
          numRounds: tournament.numRounds,
          numPlayers: tournament.players.length,
          rounds: finalizedRounds,
          players: tournament.players,
          courtChanges: normalizeCourtChanges(tournament.courtChanges),
          venueName: tournament.venueName,
          location: tournament.location,
          statsVersion: 0
        };
        setTournaments(prev => [historyItem, ...prev]);
        try {
          const tournamentSummary = {
            id: historyItem.id,
            userId: historyItem.userId,
            name: historyItem.name,
            format: historyItem.format,
            ...(historyItem.backgroundId ? { backgroundId: historyItem.backgroundId } : {}),
            ...(historyItem.themeColorId ? { themeColorId: historyItem.themeColorId } : {}),
            ...(historyItem.criteria ? { criteria: historyItem.criteria } : {}),
            ...(historyItem.scoringType ? { scoringType: historyItem.scoringType } : {}),
            ...(typeof historyItem.startedAt === 'number' ? { startedAt: historyItem.startedAt } : {}),
            ...(typeof historyItem.endedAt === 'number' ? { endedAt: historyItem.endedAt } : {}),
            ...(Number.isFinite(Number(historyItem.courts)) ? { courts: Number(historyItem.courts) } : {}),
            ...(Number.isFinite(Number(historyItem.totalPoints)) ? { totalPoints: Number(historyItem.totalPoints) } : {}),
            numRounds: historyItem.numRounds,
            numPlayers: historyItem.numPlayers,
            ...(historyItem.venueName ? { venueName: historyItem.venueName } : {}),
            ...(historyItem.location ? { location: historyItem.location } : {}),
            statsVersion: 0,
            hasDetail: true,
            detailCollection: TOURNAMENT_DETAILS_COLLECTION,
            date: serverTimestamp()
          };
          await saveTournamentDetailAndSummary(
            historyItem.id,
            toFirestoreSafe(historyItem),
            tournamentSummary
          );
          recordDbMetric({
            flow: 'finalize',
            operation: 'write',
            count: 2,
            label: 'tournament_detail_and_summary',
            dbRole: 'primary',
            collection: 'tournament_details+tournaments'
          });
          watchTournamentStatsSync(historyItem.id);
        } catch (err) {
          recordDbError({
            flow: 'finalize',
            label: 'tournament_detail_and_summary',
            err,
            dbRole: 'primary',
            collection: 'tournament_details+tournaments'
          });
          console.error('Error saving tournament:', err);
          markTournamentStatsSyncError(historyItem.id);
        }
      }

      setSelectedKlasemenTournament(finalizedTournament);
      await clearActiveTournamentSnapshot();
      try {
        await syncSharedMatchesSnapshot(finalizedTournament);
      } catch (err) {
        console.error('Shared match completion sync error:', err, {
          authUid: auth.currentUser?.uid || null,
          userUid: user?.uid || null
        });
      }
      return;
    }

    if (tournament.format === 'Mexicano') {
      // Generate next round for Mexicano:
      // 1) Balance total match count first (fair play opportunity)
      // 2) Then apply Mexicano ranking rules (W / Points + Diff)
      const playerStatsMap: Record<string, { id: string, w: number, pointsDiff: number, totalPoints: number, matchCount: number }> = {};
      activePlayers.forEach(p => {
        playerStatsMap[p.id] = { id: p.id, w: 0, pointsDiff: 0, totalPoints: 0, matchCount: 0 };
      });

      tournament.rounds.forEach(round => {
        round.matches.forEach(match => {
          // Include the current round which is about to be marked as completed
          const isCurrentRound = match.roundId === currentRoundIndex + 1;
          if (match.status === 'completed' || isCurrentRound) {
            const scoreA = match.teamA.score;
            const scoreB = match.teamB.score;
            match.teamA.players.forEach(p => {
              const s = playerStatsMap[p.id];
              if (!s) return;
              s.totalPoints += scoreA;
              s.pointsDiff += (scoreA - scoreB);
              if (scoreA > scoreB) s.w++;
              s.matchCount++;
            });
            match.teamB.players.forEach(p => {
              const s = playerStatsMap[p.id];
              if (!s) return;
              s.totalPoints += scoreB;
              s.pointsDiff += (scoreB - scoreA);
              if (scoreB > scoreA) s.w++;
              s.matchCount++;
            });
          }
        });
      });

      const compareByStanding = (a: Player, b: Player) => {
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (tournament.criteria === 'Matches Won') {
          if (statsB.w !== statsA.w) return statsB.w - statsA.w;
        } else {
          if (statsB.totalPoints !== statsA.totalPoints) return statsB.totalPoints - statsA.totalPoints;
        }
        if (statsB.pointsDiff !== statsA.pointsDiff) return statsB.pointsDiff - statsA.pointsDiff;
        return 0;
      };

      const sortedByFairnessThenStanding = [...activePlayers].sort((a, b) => {
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (!statsA || !statsB) return 0;

        // Priority #1: players with fewer matches must be selected first
        if (statsA.matchCount !== statsB.matchCount) return statsA.matchCount - statsB.matchCount;

        // Priority #2: within same match count bucket, follow Mexicano standing
        const standingDiff = compareByStanding(a, b);
        if (standingDiff !== 0) return standingDiff;

        // Final tie-break to avoid deterministic lock-ins
        return Math.random() - 0.5;
      });

      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(activePlayers.length / 4) * 4, tournament.courts * 4);
      const selectedPlayers = sortedByFairnessThenStanding.slice(0, playersNeeded);
      const playersBye = sortedByFairnessThenStanding.slice(playersNeeded);

      // Apply Mexicano ranking structure inside selected players
      const playersInRound = [...selectedPlayers].sort((a, b) => {
        const standingDiff = compareByStanding(a, b);
        if (standingDiff !== 0) return standingDiff;
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (!statsA || !statsB) return 0;
        if (statsA.matchCount !== statsB.matchCount) return statsA.matchCount - statsB.matchCount;
        return Math.random() - 0.5;
      });

      for (let m = 0; m < playersNeeded / 4; m++) {
        // Mexicano pairing: 1&4 vs 2&3 within each group of 4
        const p1 = playersInRound[m * 4];
        const p2 = playersInRound[m * 4 + 1];
        const p3 = playersInRound[m * 4 + 2];
        const p4 = playersInRound[m * 4 + 3];

        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [p1, p4], score: 0, sets: [0] },
          teamB: { players: [p2, p3], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      const nextTournament = (() => {
        const newRounds = tournament.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...tournament, rounds: newRounds, endedAt: undefined };
      })();
      setTournament(nextTournament);
      await persistActiveTournamentSnapshot(nextTournament);
      try {
        await syncSharedMatchesSnapshot(nextTournament);
      } catch (err) {
        console.error('Shared match next round sync error:', err, {
          authUid: auth.currentUser?.uid || null,
          userUid: user?.uid || null
        });
      }
    } else if (tournament.format === 'Match Play') {
      // Generate next round for Match Play (randomized like Americano but with tennis scoring)
      const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(shuffled.length / 4) * 4, tournament.courts * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0, sets: [0] },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      const nextTournament = (() => {
        const newRounds = tournament.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...tournament, rounds: newRounds, endedAt: undefined };
      })();
      setTournament(nextTournament);
      await persistActiveTournamentSnapshot(nextTournament);
      try {
        await syncSharedMatchesSnapshot(nextTournament);
      } catch (err) {
        console.error('Shared match next round sync error:', err, {
          authUid: auth.currentUser?.uid || null,
          userUid: user?.uid || null
        });
      }
    } else {
      // Americano uses pending rounds (kept in sync with current active roster)
      const nextTournament = (() => {
        const newRounds = tournament.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          if (idx === currentRoundIndex + 1) {
            return { ...round, matches: round.matches.map(m => ({ ...m, status: 'active' as const, startedAt: m.startedAt || now })) };
          }
          return round;
        });
        return { ...tournament, rounds: newRounds, endedAt: undefined };
      })();
      setTournament(nextTournament);
      await persistActiveTournamentSnapshot(nextTournament);
      try {
        await syncSharedMatchesSnapshot(nextTournament);
      } catch (err) {
        console.error('Shared match next round sync error:', err, {
          authUid: auth.currentUser?.uid || null,
          userUid: user?.uid || null
        });
      }
    }
    addNotification('New Round!', `Round ${nextRoundId} has started. Check your match schedule.`, 'match');
  };

  const handleUpdateRounds = (requestedRounds: number) => {
    const safeRequested = Number.isFinite(requestedRounds) ? Math.floor(requestedRounds) : NaN;
    if (!Number.isFinite(safeRequested) || safeRequested < 1) return false;

    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const minAllowedRounds = Math.max(1, latestLockedRoundIndex + 1);
    const nextNumRounds = Math.max(minAllowedRounds, Math.min(50, safeRequested));

    let nextRounds = [...tournament.rounds];

    if (nextNumRounds < nextRounds.length) {
      // Only trim future rounds; active/completed rounds are protected by minAllowedRounds.
      nextRounds = nextRounds.slice(0, nextNumRounds);
    }

    if (tournament.format === 'Americano') {
      const nextTournamentBase = {
        ...tournament,
        inactivePlayerIds: sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds)
      };
      nextRounds = rebuildAmericanoFutureRounds(nextTournamentBase, nextNumRounds);
    }

    const completedRoundCount = nextRounds.filter((round) => (
      (round.matches || []).length > 0 &&
      round.matches.every((match) => match.status === 'completed')
    )).length;
    const effectiveTotalRounds = Math.max(nextNumRounds, nextRounds.length);
    const shouldRemainEnded = effectiveTotalRounds > 0 && completedRoundCount >= effectiveTotalRounds;
    const nextTournament: Tournament = {
      ...tournament,
      numRounds: nextNumRounds,
      rounds: nextRounds,
      endedAt: shouldRemainEnded ? tournament.endedAt : undefined
    };

    setTournament(nextTournament);

    if (nextNumRounds === safeRequested) {
      addNotification('Round Updated', `Total rounds updated to ${nextNumRounds}.`, 'system');
    } else {
      addNotification('Round Adjusted', `Total rounds were adjusted to ${nextNumRounds} to keep the setup valid.`, 'system');
    }
    return true;
  };

  const handleUpdateCourts = (requestedCourts: number) => {
    const safeRequested = Number.isFinite(requestedCourts) ? Math.floor(requestedCourts) : NaN;
    if (!Number.isFinite(safeRequested) || safeRequested < 1) return false;
    const nextCourts = Math.max(1, Math.min(12, safeRequested));

    if (nextCourts === tournament.courts) return true;

    const activeRoundIndex = tournament.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const currentRoundIndex = activeRoundIndex !== -1 ? activeRoundIndex : latestLockedRoundIndex;
    const effectiveFromRoundId = currentRoundIndex === -1 ? 1 : currentRoundIndex + 2;
    const nextCourtChanges = [
      ...(tournament.courtChanges || []),
      {
        effectiveFromRoundId,
        fromCourts: tournament.courts,
        toCourts: nextCourts,
        changedAt: Date.now()
      }
    ];
    const nextTournament: Tournament = {
      ...tournament,
      courts: nextCourts,
      courtChanges: nextCourtChanges
    };
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
          }
        : nextTournament
    );

    setTournament(persistedTournament);
    void persistActiveTournamentSnapshot(persistedTournament);

    addNotification(
      'Court Updated',
      `Court count updated to ${nextCourts}. Changes apply starting from the next round.`,
      'system'
    );
    return true;
  };

  const handleUpdateMatchPlayScore = (matchId: string, team: 'A' | 'B') => {
    let setWinMessage: string | null = null;

    setTournament(prev => {
      const newRounds = prev.rounds.map(round => {
        const isMatchInRound = round.matches.some(m => m.id === matchId);
        if (!isMatchInRound) return round;

        const newMatches = round.matches.map(match => {
          if (match.id === matchId) {
            const scoringType = prev.scoringType || 'Golden Point';
            let pA = match.pointsA || '0';
            let pB = match.pointsB || '0';
            let gamesA = [...(match.teamA.sets || [0])];
            let gamesB = [...(match.teamB.sets || [0])];
            const currentSet = Number.isFinite(match.currentSet) ? (match.currentSet as number) : 0;
            if (gamesA[currentSet] === undefined || Number.isNaN(gamesA[currentSet])) gamesA[currentSet] = 0;
            if (gamesB[currentSet] === undefined || Number.isNaN(gamesB[currentSet])) gamesB[currentSet] = 0;

            // Once a set is already decided, keep it immutable to avoid corrupted states.
            const isSetAlreadyFinished =
              (gamesA[currentSet] >= 6 || gamesB[currentSet] >= 6) &&
              Math.abs(gamesA[currentSet] - gamesB[currentSet]) >= 2;
            if (isSetAlreadyFinished) {
              return {
                ...match,
                teamA: { ...match.teamA, sets: gamesA, score: gamesA.reduce((a, b) => a + b, 0) },
                teamB: { ...match.teamB, sets: gamesB, score: gamesB.reduce((a, b) => a + b, 0) }
              };
            }

            if (team === 'A') {
              if (pA === '0') pA = '15';
              else if (pA === '15') pA = '30';
              else if (pA === '30') pA = '40';
              else if (pA === '40') {
                if (pB === '40') {
                  if (scoringType === 'Golden Point') {
                    pA = 'Game';
                  } else {
                    pA = 'Ad';
                  }
                } else if (pB === 'Ad') {
                  pB = '40';
                } else {
                  pA = 'Game';
                }
              } else if (pA === 'Ad') {
                pA = 'Game';
              }
            } else {
              if (pB === '0') pB = '15';
              else if (pB === '15') pB = '30';
              else if (pB === '30') pB = '40';
              else if (pB === '40') {
                if (pA === '40') {
                  if (scoringType === 'Golden Point') {
                    pB = 'Game';
                  } else {
                    pB = 'Ad';
                  }
                } else if (pA === 'Ad') {
                  pA = '40';
                } else {
                  pB = 'Game';
                }
              } else if (pB === 'Ad') {
                pB = 'Game';
              }
            }

            // Check if game won
            if (pA === 'Game') {
              gamesA[currentSet]++;
              pA = '0';
              pB = '0';
            } else if (pB === 'Game') {
              gamesB[currentSet]++;
              pA = '0';
              pB = '0';
            }

            // Check if set won (simplified: first to 6 games)
            if (gamesA[currentSet] >= 6 && gamesA[currentSet] - gamesB[currentSet] >= 2) {
              setWinMessage = `Team A memenangkan set ${currentSet + 1} with score ${gamesA[currentSet]} - ${gamesB[currentSet]}`;
            } else if (gamesB[currentSet] >= 6 && gamesB[currentSet] - gamesA[currentSet] >= 2) {
              setWinMessage = `Team B memenangkan set ${currentSet + 1} with score ${gamesB[currentSet]} - ${gamesA[currentSet]}`;
            } else if (gamesA[currentSet] === 6 && gamesB[currentSet] === 6) {
              // Tie-break logic could go here, but let's keep it simple for now
            }

            return {
              ...match,
              pointsA: pA,
              pointsB: pB,
              teamA: { ...match.teamA, sets: gamesA, score: gamesA.reduce((a, b) => a + b, 0) },
              teamB: { ...match.teamB, sets: gamesB, score: gamesB.reduce((a, b) => a + b, 0) }
            };
          }
          return match;
        });
        return { ...round, matches: newMatches };
      });
      return { ...prev, rounds: newRounds };
    });

    if (setWinMessage) {
      addNotification('Set Done!', setWinMessage, 'achievement');
    }
  };

  const handleSwapPlayer = (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => {
    const newRounds = tournament.rounds.map(round => {
      const isMatchInRound = round.matches.some(m => m.id === matchId);
      if (!isMatchInRound) return round;

      let oldPlayer: Player | null = null;
      const newMatches = round.matches.map(match => {
        if (match.id === matchId) {
          const players = team === 'A' ? [...match.teamA.players] : [...match.teamB.players];
          oldPlayer = players[playerIndex];
          players[playerIndex] = newPlayer;
          return {
            ...match,
            teamA: team === 'A' ? { ...match.teamA, players } : match.teamA,
            teamB: team === 'B' ? { ...match.teamB, players } : match.teamB
          };
        }
        return match;
      });

      // If the new player was in the bye list, swap them with the old player
      const newPlayersBye = round.playersBye.map(p => p.id === newPlayer.id ? oldPlayer! : p);

      return { ...round, matches: newMatches, playersBye: newPlayersBye };
    });
    const nextTournament: Tournament = { ...tournament, rounds: newRounds };
    setTournament(nextTournament);
    addNotification('Player Replaced', 'The player has been replaced on the active court.', 'system');
  };

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
