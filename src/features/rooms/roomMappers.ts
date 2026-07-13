import type { Player, Tournament } from '../../types';
import type { RoomParticipant, RoomSettingsSnapshot } from './types';

export const buildRoomSettingsSnapshotFromTournament = (
  tournament: Tournament
): RoomSettingsSnapshot => ({
  name: tournament.name,
  format: tournament.format,
  partnerMode: tournament.partnerMode || 'rotating',
  criteria: tournament.criteria,
  scoringType: tournament.scoringType,
  matchPlayMode: tournament.matchPlayMode,
  matchPlayGamesTarget: tournament.matchPlayGamesTarget,
  matchPlayBestOfSets: tournament.matchPlayBestOfSets,
  backgroundId: tournament.backgroundId,
  themeColorId: tournament.themeColorId,
  toxicModeEnabled: Boolean(tournament.toxicModeEnabled),
  toxicIntensity: tournament.toxicIntensity || 'savage',
  courts: tournament.courts,
  totalPoints: tournament.totalPoints,
  numRounds: tournament.numRounds,
  durationMinutes: tournament.durationMinutes,
  venueName: tournament.venueName,
  location: tournament.location,
});

export const buildTournamentDraftFromRoom = ({
  baseTournament,
  players,
  settings,
}: {
  baseTournament: Tournament;
  players: Player[];
  settings: RoomSettingsSnapshot;
}): Tournament => ({
  ...baseTournament,
  name: settings.name,
  format: settings.format,
  partnerMode: settings.partnerMode || 'rotating',
  // Pairing tim tetap dibentuk di wizard match (auto-pair saat pemain final),
  // bukan di level room — roster room masih bisa berubah sampai launch.
  fixedTeams: [],
  criteria: settings.criteria,
  scoringType: settings.scoringType,
  matchPlayMode: settings.matchPlayMode,
  matchPlayGamesTarget: settings.matchPlayGamesTarget,
  matchPlayBestOfSets: settings.matchPlayBestOfSets,
  backgroundId: settings.backgroundId,
  themeColorId: settings.themeColorId,
  toxicModeEnabled: Boolean(settings.toxicModeEnabled),
  toxicIntensity: settings.toxicIntensity || 'savage',
  courts: settings.courts,
  totalPoints: settings.totalPoints,
  numRounds: settings.numRounds,
  durationMinutes: settings.durationMinutes,
  venueName: settings.venueName,
  location: settings.location,
  players,
});

export const buildRoomParticipantFromPlayer = (
  player: Player,
  overrides?: Partial<RoomParticipant>
): RoomParticipant => ({
  id: overrides?.id || player.id,
  uid: overrides?.uid,
  playerId: player.id,
  displayName: player.name,
  avatar: player.avatar,
  initials: player.initials,
  rating: player.rating,
  source: player.source === 'fom' ? 'fom' : 'manual',
  status: 'joined',
  joinedAt: Date.now(),
  ...overrides,
});

export const buildPlayerFromRoomParticipant = (
  participant: RoomParticipant
): Player => ({
  id: participant.playerId || participant.uid || participant.id,
  name: participant.displayName,
  rating: Number.isFinite(Number(participant.rating)) ? Number(participant.rating) : 0,
  source: participant.source === 'manual' ? 'manual' : 'fom',
  avatar: participant.avatar || '',
  initials: participant.initials || participant.displayName.slice(0, 2).toUpperCase(),
  stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
});

export const buildJoinedPlayersFromRoom = (
  participants: RoomParticipant[]
): Player[] => (
  (participants || [])
    .filter((participant) => participant.status === 'joined')
    .map(buildPlayerFromRoomParticipant)
);
