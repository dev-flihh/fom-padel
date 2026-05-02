import { type Player } from '../../types';

export const MANUAL_PLAYER_ID_PREFIX = 'manual_';

export const isLikelyFirebaseUid = (value?: string | null) => /^[A-Za-z0-9_-]{20,}$/.test((value || '').trim());

export const isFomRegisteredPlayer = (player?: Player | null) => {
  if (!player) return false;
  if (player.source === 'fom') return true;
  if (player.source === 'manual') return false;
  if ((player.id || '').startsWith(MANUAL_PLAYER_ID_PREFIX)) return false;
  return isLikelyFirebaseUid(player.id);
};
