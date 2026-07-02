const MANUAL_PLAYER_ID_PREFIX = 'manual_';

export const ALL_PROVINCES_FILTER = 'All Provinces';

export const normalizeLeaderboardUser = (rawUser: any, fallbackUid: string) => {
  const normalizedUid = typeof rawUser?.uid === 'string' && rawUser.uid.trim()
    ? rawUser.uid.trim()
    : fallbackUid;
  const normalizedMmr = Number.isFinite(Number(rawUser?.mmr)) ? Number(rawUser.mmr) : 0;
  const normalizedTotalMatches = Number.isFinite(Number(rawUser?.totalMatches))
    ? Math.max(0, Number(rawUser.totalMatches))
    : 0;
  const locationActivity = rawUser?.locationActivity;
  const totalLocationActivity = locationActivity && typeof locationActivity === 'object'
    ? Object.values(locationActivity).reduce<number>((total, count) => {
      const normalizedCount = Number(count);
      if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return total;
      return total + normalizedCount;
    }, 0)
    : 0;
  const isLegacyInitialMmrWithoutActivity =
    normalizedMmr === 500 &&
    normalizedTotalMatches === 0 &&
    totalLocationActivity === 0;
  const normalizedPhotoURL = typeof rawUser?.photoURL === 'string' && rawUser.photoURL.trim()
    ? rawUser.photoURL.trim()
    : (typeof rawUser?.avatar === 'string' && rawUser.avatar.trim()
      ? rawUser.avatar.trim()
      : '');

  return {
    ...rawUser,
    uid: normalizedUid,
    photoURL: normalizedPhotoURL,
    mmr: isLegacyInitialMmrWithoutActivity ? 0 : normalizedMmr,
    totalMatches: normalizedTotalMatches
  };
};

export const isRegisteredFomUser = (rawUser: any) => {
  const uid = typeof rawUser?.uid === 'string' ? rawUser.uid.trim() : '';
  const displayName = typeof rawUser?.displayName === 'string' ? rawUser.displayName.trim() : '';
  const normalizedDisplayName = displayName.toLowerCase().replace(/\s+/g, ' ').trim();
  const blockedPlaceholderNames = new Set(['player padel', 'pemain padel']);
  const isPlaceholderName = blockedPlaceholderNames.has(normalizedDisplayName);
  if (!uid || !displayName) return false;
  if (uid.startsWith(MANUAL_PLAYER_ID_PREFIX)) return false;
  if (isPlaceholderName) return false;
  return true;
};

export const sortUsersByMmrDesc = (users: any[]) => (
  [...users].sort((a, b) => {
    const mmrDiff = (Number(b?.mmr) || 0) - (Number(a?.mmr) || 0);
    if (mmrDiff !== 0) return mmrDiff;

    const matchDiff = (Number(b?.totalMatches) || 0) - (Number(a?.totalMatches) || 0);
    if (matchDiff !== 0) return matchDiff;

    return String(a?.displayName || '').localeCompare(String(b?.displayName || ''), 'id');
  })
);

export const toProvinceName = (location: string | null | undefined): string => {
  if (!location || typeof location !== 'string') return '';
  const segments = location
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return '';
  return segments[segments.length - 1];
};

export const toLeaderboardSnapshotDocId = (provinceFilter: string) => {
  if (!provinceFilter || provinceFilter === ALL_PROVINCES_FILTER) return 'global';
  const normalizedProvince = provinceFilter
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `province_${normalizedProvince || 'unknown'}`;
};

export const getDisplayInitials = (name: string | null | undefined): string => {
  const safeName = String(name || '').trim();
  if (!safeName) return 'PL';
  const letters = safeName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || 'PL';
};

export const getWinRateLabel = (user: any) => {
  const wins = Number(user?.wins);
  const losses = Number(user?.losses);
  const totalMatches = Number(user?.totalMatches);
  const hasRecord = Number.isFinite(wins) && wins >= 0 && Number.isFinite(losses) && losses >= 0 && wins + losses > 0;
  const denominator = hasRecord ? wins + losses : totalMatches;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  const rate = hasRecord ? Math.round((wins / denominator) * 100) : 0;
  const tone = rate >= 50 ? 'text-[#18a486]' : rate >= 30 ? 'text-[#f59e0b]' : 'text-[#ef4444]';
  return { label: `${rate}% WR`, tone };
};
