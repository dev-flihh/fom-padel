import { ALL_PROVINCES_FILTER, toLeaderboardSnapshotDocId } from './leaderboardUtils';

const LEADERBOARD_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

const getLeaderboardStorageKey = (provinceFilter = ALL_PROVINCES_FILTER) => `fom_play_leaderboard_cache_v1_${toLeaderboardSnapshotDocId(provinceFilter)}`;

export const readCachedLeaderboardUsers = (provinceFilter = ALL_PROVINCES_FILTER): any[] | null => {
  try {
    const raw = localStorage.getItem(getLeaderboardStorageKey(provinceFilter));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; users?: any[] };
    if (!Array.isArray(parsed?.users)) return null;
    const savedAt = Number(parsed?.savedAt || 0);
    if (!Number.isFinite(savedAt) || (Date.now() - savedAt) > LEADERBOARD_CACHE_MAX_AGE_MS) return null;
    return parsed.users;
  } catch (err) {
    console.error('Read leaderboard cache error:', err);
    return null;
  }
};

export const writeCachedLeaderboardUsers = (users: any[], provinceFilter = ALL_PROVINCES_FILTER) => {
  try {
    localStorage.setItem(getLeaderboardStorageKey(provinceFilter), JSON.stringify({
      savedAt: Date.now(),
      users,
    }));
  } catch (err) {
    console.error('Write leaderboard cache error:', err);
  }
};

export const clearCachedLeaderboardUsers = () => {
  try {
    const keysToDelete: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith('fom_play_leaderboard_cache_v1_')) keysToDelete.push(key);
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Clear leaderboard cache error:', err);
  }
};
