import { useEffect, useRef, useState } from 'react';
import { type Friend, type Player, type UserProfile } from '../../types';
import { searchFriendUsers } from '../../services/friendsRepository';

// R2.2: pencarian FOM player global memakai cloud function `searchUsers` yang
// sama dengan flow add-friend — menambahkan hasilnya ke match TIDAK membuat
// pertemanan dan tidak mengirim friend request.
const GLOBAL_SEARCH_MIN_CHARS = 3;
const GLOBAL_SEARCH_DEBOUNCE_MS = 350;

export const buildInitialsFromName = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P';

export const mapProfileToPlayer = (profile: UserProfile): Player & { username?: string } => ({
  id: profile.uid,
  name: profile.displayName || profile.username || 'Player',
  rating: Number.isFinite(Number(profile.mmr)) ? Number(profile.mmr) : 0,
  source: 'fom',
  avatar: profile.photoURL || '',
  initials: buildInitialsFromName(profile.displayName || profile.username || 'P'),
  username: profile.username || '',
  stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
});

// R2.1: teman FOM bisa dipilih langsung dari daftar (tanpa harus pernah main
// bareng). Dipetakan ke Player yang sama seperti hasil search global.
export const mapFriendToPlayer = (friend: Friend): Player & { username?: string } => ({
  id: friend.uid,
  name: friend.displayName || friend.username || 'Player',
  rating: Number.isFinite(Number(friend.mmr)) ? Number(friend.mmr) : 0,
  source: 'fom',
  avatar: friend.photoURL || '',
  initials: buildInitialsFromName(friend.displayName || friend.username || 'P'),
  username: friend.username || '',
  stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
});

export const usePlayerSearch = (query: string) => {
  const [globalResults, setGlobalResults] = useState<UserProfile[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalSearchFailed, setGlobalSearchFailed] = useState(false);
  const latestRequestRef = useRef(0);

  const trimmedQuery = query.trim();
  const canSearchGlobal = trimmedQuery.length >= GLOBAL_SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!canSearchGlobal) {
      latestRequestRef.current += 1;
      setGlobalResults([]);
      setIsSearchingGlobal(false);
      setGlobalSearchFailed(false);
      return;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setIsSearchingGlobal(true);
    setGlobalSearchFailed(false);

    const timerId = window.setTimeout(async () => {
      try {
        const { results } = await searchFriendUsers(trimmedQuery);
        if (latestRequestRef.current !== requestId) return;
        setGlobalResults(results);
      } catch (err) {
        console.error('Global player search error:', err);
        if (latestRequestRef.current !== requestId) return;
        // R2.7: pencarian global gagal → hasil lokal & guest tetap jalan.
        setGlobalResults([]);
        setGlobalSearchFailed(true);
      } finally {
        if (latestRequestRef.current === requestId) setIsSearchingGlobal(false);
      }
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [trimmedQuery, canSearchGlobal]);

  return {
    globalResults,
    isSearchingGlobal,
    globalSearchFailed,
    canSearchGlobal,
    globalSearchMinChars: GLOBAL_SEARCH_MIN_CHARS,
  };
};
