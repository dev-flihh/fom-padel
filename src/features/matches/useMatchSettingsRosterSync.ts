import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { type Friend, type Player } from '../../types';
import { resolveLivePlayerMmr } from './matchSetupUtils';

export const useMatchSettingsRosterSync = ({
  currentUser,
  currentUserUid,
  friends,
  setAllPlayers
}: {
  currentUser: any;
  currentUserUid?: string | null;
  friends: Friend[];
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
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

  useEffect(() => {
    setAllPlayers((prev) => {
      let changed = false;
      const next = prev.map((player) => {
        const playerId = String(player?.id || '').trim();
        if (!playerId || player?.source !== 'fom') return player;
        const liveMmr = resolveLiveMmr(playerId, player?.rating || 0);
        if (!Number.isFinite(liveMmr)) return player;
        const normalizedLive = Math.max(0, Number(liveMmr));
        if (Number(player?.rating || 0) === normalizedLive) return player;
        changed = true;
        return { ...player, rating: normalizedLive };
      });
      return changed ? next : prev;
    });
  }, [currentUser?.mmr, currentUserUid, friends, setAllPlayers]);

  useEffect(() => {
    const uid = currentUserUid;
    if (!uid) return;

    const displayName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Saya').trim();
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map((namePart: string) => namePart[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME';

    const liveRating = resolveLiveMmr(uid, currentUser?.mmr || 0);
    setAllPlayers((prev) => {
      const existingIndex = prev.findIndex((player) => player.id === uid);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const shouldUpdate =
          existing.name !== displayName ||
          Number(existing.rating || 0) !== liveRating ||
          (existing.avatar || '') !== (currentUser?.photoURL || '');
        if (!shouldUpdate) return prev;
        const next = [...prev];
        next[existingIndex] = {
          ...existing,
          name: displayName,
          rating: liveRating,
          avatar: currentUser?.photoURL || existing.avatar || '',
          source: 'fom'
        };
        return next;
      }
      return [
        {
          id: uid,
          name: displayName,
          rating: liveRating,
          source: 'fom',
          avatar: currentUser?.photoURL || '',
          initials,
          stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
        },
        ...prev
      ];
    });
  }, [
    currentUser?.uid,
    currentUser?.displayName,
    currentUser?.email,
    currentUser?.photoURL,
    currentUser?.mmr,
    currentUserUid,
    friends,
    setAllPlayers
  ]);
};
