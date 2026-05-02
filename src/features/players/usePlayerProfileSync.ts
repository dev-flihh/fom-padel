import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { PLAYER_STATS_REFRESH_MIN_AGE_MS } from '../history/historyPersistence';
import { isFirestoreSaverModeEnabled } from '../../services/dbMetrics';
import { PLAYER_STATS_COLLECTION } from '../../services/firestoreCollections';
import type { Player, Round, Screen, Tournament, TournamentHistory } from '../../types';

const syncPlayerPhotoInRoster = (players: Player[], uid: string, photoURL: string) => {
  let changed = false;
  const next = players.map((player) => {
    if (player?.id !== uid) return player;
    const nextAvatar = photoURL || '';
    if ((player.avatar || '') === nextAvatar) return player;
    changed = true;
    return { ...player, avatar: nextAvatar };
  });
  return changed ? next : players;
};

const syncPlayerPhotoInRounds = (rounds: Round[], uid: string, photoURL: string) => {
  let changed = false;
  const next = rounds.map((round) => {
    const nextPlayersBye = syncPlayerPhotoInRoster(Array.isArray(round.playersBye) ? round.playersBye : [], uid, photoURL);
    let roundChanged = nextPlayersBye !== (round.playersBye || []);
    const nextMatches = (round.matches || []).map((match) => {
      const nextTeamAPlayers = syncPlayerPhotoInRoster(match.teamA?.players || [], uid, photoURL) as [Player, Player];
      const nextTeamBPlayers = syncPlayerPhotoInRoster(match.teamB?.players || [], uid, photoURL) as [Player, Player];
      const matchChanged = nextTeamAPlayers !== match.teamA.players || nextTeamBPlayers !== match.teamB.players;
      if (!matchChanged) return match;
      roundChanged = true;
      return {
        ...match,
        teamA: {
          ...match.teamA,
          players: nextTeamAPlayers,
        },
        teamB: {
          ...match.teamB,
          players: nextTeamBPlayers,
        },
      };
    });
    if (!roundChanged) return round;
    changed = true;
    return {
      ...round,
      playersBye: nextPlayersBye,
      matches: nextMatches,
    };
  });
  return changed ? next : rounds;
};

const syncPlayerPhotoInTournament = <T extends Tournament | TournamentHistory>(target: T, uid: string, photoURL: string): T => {
  const nextPlayers = syncPlayerPhotoInRoster(Array.isArray(target.players) ? target.players : [], uid, photoURL);
  const nextRounds = syncPlayerPhotoInRounds(Array.isArray(target.rounds) ? target.rounds : [], uid, photoURL);
  if (nextPlayers === target.players && nextRounds === target.rounds) return target;
  return {
    ...target,
    players: nextPlayers,
    rounds: nextRounds,
  };
};

type RecordDbMetric = (input: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type UsePlayerProfileSyncParams = {
  user: any;
  screen: Screen;
  isAppShellRoute: boolean;
  isDocumentVisible: boolean;
  setUser: Dispatch<SetStateAction<any>>;
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setActiveScreenTournament: Dispatch<SetStateAction<Tournament | null>>;
  setSelectedKlasemenTournament: Dispatch<SetStateAction<Tournament | TournamentHistory | null>>;
  setSelectedHistory: Dispatch<SetStateAction<TournamentHistory | null>>;
  setTournaments: Dispatch<SetStateAction<TournamentHistory[]>>;
  recordDbMetric: RecordDbMetric;
};

export const usePlayerProfileSync = ({
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
}: UsePlayerProfileSyncParams) => {
  const lastPlayerStatsRefreshRef = useRef<Record<string, number>>({});

  const shouldRefreshPlayerStats = (
    isDocumentVisible &&
    isAppShellRoute &&
    ['dashboard', 'profile', 'leaderboard', 'rank-discovery', 'mmr-history', 'friends'].includes(screen)
  );

  useEffect(() => {
    const uid = String(user?.uid || '').trim();
    if (!uid) return;
    const photoURL = typeof user?.photoURL === 'string' ? user.photoURL : '';

    setAllPlayers((prev) => {
      let changed = false;
      const next = prev.map((player) => {
        if (player?.id !== uid) return player;
        if ((player.avatar || '') === photoURL) return player;
        changed = true;
        return { ...player, avatar: photoURL };
      });
      return changed ? next : prev;
    });

    setTournament((prev) => syncPlayerPhotoInTournament(prev, uid, photoURL));

    setActiveScreenTournament((prev) => {
      if (!prev) return prev;
      return syncPlayerPhotoInTournament(prev, uid, photoURL);
    });

    setSelectedKlasemenTournament((prev) => {
      if (!prev) return prev;
      return syncPlayerPhotoInTournament(prev as Tournament | TournamentHistory, uid, photoURL);
    });

    setSelectedHistory((prev) => {
      if (!prev) return prev;
      return syncPlayerPhotoInTournament(prev, uid, photoURL);
    });

    setTournaments((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const synced = syncPlayerPhotoInTournament(item, uid, photoURL);
        const itemChanged = synced !== item;
        if (itemChanged) changed = true;
        return itemChanged ? synced : item;
      });
      return changed ? next : prev;
    });
  }, [
    setActiveScreenTournament,
    setAllPlayers,
    setSelectedHistory,
    setSelectedKlasemenTournament,
    setTournament,
    setTournaments,
    user?.photoURL,
    user?.uid,
  ]);

  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;
    if (isFirestoreSaverModeEnabled()) {
      recordDbMetric({ flow: 'profile', operation: 'skip', count: 1, label: `saver_mode_player_stats:${screen}` });
      return;
    }
    if (!shouldRefreshPlayerStats) return;

    const now = Date.now();
    const lastRefresh = lastPlayerStatsRefreshRef.current[uid] || 0;
    if (lastRefresh > 0 && (now - lastRefresh) < PLAYER_STATS_REFRESH_MIN_AGE_MS) return;
    lastPlayerStatsRefreshRef.current[uid] = now;

    let isCancelled = false;
    const refreshVisiblePlayerStats = async () => {
      try {
        const snapshot = await getDoc(doc(db, PLAYER_STATS_COLLECTION, uid));
        if (isCancelled || !snapshot.exists()) return;
        const stats = snapshot.data() || {};
        const mmr = Number(stats?.mmr);
        const totalMatches = Number(stats?.totalMatches);
        const wins = Number(stats?.wins);
        const losses = Number(stats?.losses);

        setUser((prev: any) => {
          if (!prev || prev.uid !== uid) return prev;
          return {
            ...prev,
            ...(Number.isFinite(mmr) ? { mmr } : {}),
            ...(Number.isFinite(totalMatches) && totalMatches >= 0 ? { totalMatches } : {}),
            ...(Number.isFinite(wins) && wins >= 0 ? { wins } : {}),
            ...(Number.isFinite(losses) && losses >= 0 ? { losses } : {}),
          };
        });
      } catch (err) {
        console.error('player_stats refresh error:', err);
        lastPlayerStatsRefreshRef.current[uid] = 0;
      }
    };

    void refreshVisiblePlayerStats();
    return () => {
      isCancelled = true;
    };
  }, [recordDbMetric, screen, setUser, shouldRefreshPlayerStats, user?.uid]);
};
