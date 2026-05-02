import { type Friend, type FriendRequest, type FriendRequestStatus } from '../../types';

const FRIENDS_SCREEN_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

const getFriendsScreenCacheStorageKey = (uid: string) => `fom_play_friends_screen_cache_${uid}`;

export const readCachedFriendsScreenData = (uid: string): {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequestStatuses: Record<string, FriendRequestStatus>;
} | null => {
  try {
    const raw = sessionStorage.getItem(getFriendsScreenCacheStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      friends?: Friend[];
      incomingRequests?: FriendRequest[];
      outgoingRequestStatuses?: Record<string, FriendRequestStatus>;
    };
    const savedAt = Number(parsed?.savedAt || 0);
    if (!Number.isFinite(savedAt) || (Date.now() - savedAt) > FRIENDS_SCREEN_CACHE_MAX_AGE_MS) return null;
    return {
      friends: Array.isArray(parsed?.friends) ? parsed.friends : [],
      incomingRequests: Array.isArray(parsed?.incomingRequests) ? parsed.incomingRequests : [],
      outgoingRequestStatuses: parsed?.outgoingRequestStatuses && typeof parsed.outgoingRequestStatuses === 'object'
        ? parsed.outgoingRequestStatuses
        : {},
    };
  } catch (err) {
    console.error('Read friends screen cache error:', err);
    return null;
  }
};

export const writeCachedFriendsScreenData = (
  uid: string,
  payload: {
    friends: Friend[];
    incomingRequests: FriendRequest[];
    outgoingRequestStatuses: Record<string, FriendRequestStatus>;
  }
) => {
  try {
    sessionStorage.setItem(getFriendsScreenCacheStorageKey(uid), JSON.stringify({
      savedAt: Date.now(),
      ...payload,
    }));
  } catch (err) {
    console.error('Write friends screen cache error:', err);
  }
};
