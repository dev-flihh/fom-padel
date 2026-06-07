import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { type Friend, type Player, type Tournament } from '../../types';
import { resolveLivePlayerMmr } from './matchSetupUtils';

export const useMatchSettingsRosterSync = ({
  currentUser,
  currentUserUid,
  friends,
  setAllPlayers,
  setTournament
}: {
  currentUser: any;
  currentUserUid?: string | null;
  friends: Friend[];
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
}) => {
  const resolveLiveMmr = (uid: string, fallback = 0) => {
    return resolveLivePlayerMmr({
      uid,
      fallback,
      currentUserUid,
      currentUserMmr: currentUser?.mmr,
      friends
    });
  };
  const buildCurrentUserPlayer = (uid: string): Player => {
    const displayName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'You').trim();
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map((namePart: string) => namePart[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME';
    const liveRating = resolveLiveMmr(uid, currentUser?.mmr || 0);

    return {
      id: uid,
      name: displayName,
      rating: liveRating,
      source: 'fom',
      avatar: currentUser?.photoURL || '',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };
  };
  const resolveLiveProfile = (uid: string) => {
    const normalizedUid = String(uid || '').trim();
    if (!normalizedUid) return null;

    if (normalizedUid === String(currentUserUid || '').trim()) {
      return {
        name: (currentUser?.displayName || currentUser?.email?.split('@')[0] || '').trim(),
        avatar: currentUser?.photoURL || '',
        rating: resolveLiveMmr(normalizedUid, currentUser?.mmr || 0)
      };
    }

    const friend = friends.find((entry) => String(entry?.uid || '').trim() === normalizedUid);
    if (!friend) return null;

    return {
      name: friend.displayName || '',
      avatar: friend.photoURL || '',
      rating: resolveLiveMmr(normalizedUid, friend.mmr || 0)
    };
  };
  const syncRosterProfiles = (players: Player[]) => {
    let changed = false;
    const next = players.map((player) => {
      const playerId = String(player?.id || '').trim();
      if (!playerId || player?.source !== 'fom') return player;

      const liveProfile = resolveLiveProfile(playerId);
      if (!liveProfile) return player;

      const normalizedLiveRating = Number.isFinite(Number(liveProfile.rating)) ? Number(liveProfile.rating) : 0;
      const nextName = liveProfile.name || player.name;
      const nextAvatar = liveProfile.avatar || player.avatar || '';
      const shouldUpdate =
        player.name !== nextName ||
        Number(player?.rating || 0) !== normalizedLiveRating ||
        (player.avatar || '') !== nextAvatar;
      if (!shouldUpdate) return player;

      changed = true;
      return {
        ...player,
        name: nextName,
        rating: normalizedLiveRating,
        avatar: nextAvatar
      };
    });
    return changed ? next : players;
  };

  useEffect(() => {
    setAllPlayers((prev) => {
      const next = syncRosterProfiles(prev);
      return next === prev ? prev : next;
    });
    setTournament((prev) => {
      const nextPlayers = syncRosterProfiles(prev.players || []);
      if (nextPlayers === prev.players) return prev;
      return { ...prev, players: nextPlayers };
    });
  }, [currentUser?.displayName, currentUser?.email, currentUser?.mmr, currentUser?.photoURL, currentUserUid, friends, setAllPlayers, setTournament]);

  useEffect(() => {
    const uid = currentUserUid;
    if (!uid) return;

    const currentUserPlayer = buildCurrentUserPlayer(uid);
    setAllPlayers((prev) => {
      const existingIndex = prev.findIndex((player) => player.id === uid);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const nextAvatar = currentUserPlayer.avatar || existing.avatar || '';
        const shouldUpdate =
          existing.name !== currentUserPlayer.name ||
          Number(existing.rating || 0) !== currentUserPlayer.rating ||
          (existing.avatar || '') !== nextAvatar ||
          existing.source !== 'fom';
        if (!shouldUpdate) return prev;
        const next = [...prev];
        next[existingIndex] = {
          ...existing,
          ...currentUserPlayer,
          avatar: nextAvatar,
          source: 'fom'
        };
        return next;
      }
      return [currentUserPlayer, ...prev];
    });

    setTournament((prev) => {
      if (prev.startedAt) return prev;

      const existingIndex = (prev.players || []).findIndex((player) => player.id === uid);
      if (existingIndex >= 0) {
        const existing = prev.players[existingIndex];
        const nextAvatar = currentUserPlayer.avatar || existing.avatar || '';
        const shouldUpdate =
          existing.name !== currentUserPlayer.name ||
          Number(existing.rating || 0) !== currentUserPlayer.rating ||
          (existing.avatar || '') !== nextAvatar ||
          existing.source !== 'fom';
        if (!shouldUpdate) return prev;

        const nextPlayers = [...prev.players];
        nextPlayers[existingIndex] = {
          ...existing,
          ...currentUserPlayer,
          avatar: nextAvatar,
          source: 'fom'
        };
        return { ...prev, players: nextPlayers };
      }

      return {
        ...prev,
        players: [currentUserPlayer, ...(prev.players || [])]
      };
    });
  }, [
    currentUser?.uid,
    currentUser?.displayName,
    currentUser?.email,
    currentUser?.photoURL,
    currentUser?.mmr,
    currentUserUid,
    friends,
    setAllPlayers,
    setTournament
  ]);
};
