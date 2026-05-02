import { type Friend, type Player } from '../../types';
import { INITIAL_PLAYERS } from '../../constants';

export const dedupePlayersById = (players: Player[]) => {
  const deduped = new Map<string, Player>();
  players.forEach((player) => {
    if (!player?.id) return;
    if (!deduped.has(player.id)) deduped.set(player.id, player);
  });
  return Array.from(deduped.values());
};

export const sortPlayersByName = (players: Player[]) => (
  [...players].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' }))
);

export type PlayerDataIntegrity = {
  missingFromList: number;
  duplicateInSelected: number;
  duplicateInList: number;
};

export const getPlayerDataIntegrity = (selectedPlayers: Player[], allPlayers: Player[]): PlayerDataIntegrity => {
  const normalizedSelected = dedupePlayersById(selectedPlayers || []);
  const normalizedAll = dedupePlayersById(allPlayers || []);
  const allIds = new Set(normalizedAll.map((p) => p.id));
  const missingFromList = normalizedSelected.filter((p) => !allIds.has(p.id)).length;
  const duplicateInSelected = Math.max(0, (selectedPlayers || []).filter(Boolean).length - normalizedSelected.length);
  const duplicateInList = Math.max(0, (allPlayers || []).filter(Boolean).length - normalizedAll.length);
  return { missingFromList, duplicateInSelected, duplicateInList };
};

export const hasPlayerDataIntegrityIssue = (integrity: PlayerDataIntegrity) => (
  integrity.missingFromList > 0 ||
  integrity.duplicateInSelected > 0 ||
  integrity.duplicateInList > 0
);

export const resolveLivePlayerMmr = ({
  uid,
  fallback = 0,
  currentUserUid,
  currentUserMmr,
  friends
}: {
  uid: string;
  fallback?: number;
  currentUserUid?: string | null;
  currentUserMmr?: number;
  friends: Friend[];
}) => {
  const normalizedUid = String(uid || '').trim();
  if (normalizedUid) {
    if (normalizedUid === String(currentUserUid || '').trim()) {
      const currentMmr = Number(currentUserMmr);
      if (Number.isFinite(currentMmr)) return currentMmr;
    }
    const friendMmr = Number(friends.find((friend) => String(friend?.uid || '').trim() === normalizedUid)?.mmr);
    if (Number.isFinite(friendMmr)) return friendMmr;
  }
  const normalizedFallback = Number(fallback);
  return Number.isFinite(normalizedFallback) ? normalizedFallback : 0;
};

const DEFAULT_PLAYER_SEED_NAMES = new Set(INITIAL_PLAYERS.map((player) => player.name.toLowerCase()));

export const isLegacySeedPlayers = (players: Player[] | null | undefined) => {
  if (!players || players.length === 0) return false;
  if (players.length !== INITIAL_PLAYERS.length) return false;
  return players.every((player) => DEFAULT_PLAYER_SEED_NAMES.has((player?.name || '').toLowerCase()));
};
