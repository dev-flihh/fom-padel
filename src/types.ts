export type MatchFormat = 'Match Play' | 'Americano' | 'Mexicano';
export type PartnerMode = 'rotating' | 'fixed';
export type RankingCriteria = 'Matches Won' | 'Points Won';
export type ScoringType = 'Golden Point' | 'Advantage';
// Struktur kemenangan Match Play: 'race' = duluan merebut X game menang;
// 'bestOf' = set penuh (6 game per set), menang mayoritas dari N set.
export type MatchPlayMode = 'race' | 'bestOf';
export type ToxicIntensity = 'mild' | 'medium' | 'savage';

export interface Player {
  id: string;
  name: string;
  rating: number;
  source?: 'fom' | 'manual';
  avatar?: string;
  initials: string;
  team?: string;
  stats: {
    matches: number;
    won: number;
    lost: number;
    draw: number;
    diff: number;
  };
}

export interface Team {
  players: Player[];
  score: number;
  sets?: number[]; // Array of games won in each set
}

// Pasangan tetap untuk partnerMode 'fixed' — ditentukan saat setup dan
// dipertahankan sepanjang sesi. playerIds merujuk ke Tournament.players.
export interface FixedTeam {
  id: string;
  playerIds: [string, string];
  name?: string;
}

export interface Match {
  id: string;
  court: number;
  teamA: Team;
  teamB: Team;
  duration?: string;
  startedAt?: number;
  status: 'active' | 'completed' | 'pending';
  roundId: number;
  currentSet?: number;
  pointsA?: string; // e.g. "0", "15", "30", "40", "Ad"
  pointsB?: string;
}

export interface Round {
  id: number;
  matches: Match[];
  playersBye: Player[];
  // Target poin (Race to X) khusus ronde ini. Absen = pakai
  // tournament.totalPoints (perilaku lama). Host bisa mengubah target mulai
  // ronde tertentu; ronde yang sudah berjalan mempertahankan target lamanya.
  totalPoints?: number;
}

export interface CourtChange {
  effectiveFromRoundId: number;
  fromCourts: number;
  toCourts: number;
  changedAt: number;
}

export interface TournamentRewindSlideRef {
  type: string;
  order: number;
  imageUrl: string;
}

// FOM Rewind hasil generate (PRD_FOM_REWIND.md Section 9) — ikut shared
// snapshot & history sebagai data read-only.
export interface TournamentRewind {
  generatedAt: number;
  generatedBy: string;
  // Rasio export slide: 'story' 9:16 (default, data lama tanpa field ini)
  // atau 'feed' 3:4. Yang dipersist = rasio generate terakhir.
  ratio?: 'story' | 'feed';
  slides: TournamentRewindSlideRef[];
}

export interface Tournament {
  id?: string;
  name: string;
  format: MatchFormat;
  partnerMode?: PartnerMode; // absen = 'rotating' (perilaku lama)
  fixedTeams?: FixedTeam[];
  backgroundId?: string;
  themeColorId?: string;
  toxicModeEnabled?: boolean;
  toxicIntensity?: ToxicIntensity;
  criteria: RankingCriteria;
  scoringType?: ScoringType;
  // Khusus Match Play. Absen = 'race' (data lama). Target game race
  // (matchPlayGamesTarget, default 6) atau jumlah set best-of
  // (matchPlayBestOfSets, 1/3/5, default 3).
  matchPlayMode?: MatchPlayMode;
  matchPlayGamesTarget?: number;
  matchPlayBestOfSets?: number;
  startedAt?: number;
  endedAt?: number;
  courts: number;
  totalPoints: number;
  players: Player[];
  inactivePlayerIds?: string[];
  courtChanges?: CourtChange[];
  rounds: Round[];
  numRounds: number;
  durationMinutes?: number;
  venueName?: string;
  location?: string;
  rewind?: TournamentRewind;
}

export interface TournamentHistory {
  id: string;
  userId: string;
  name: string;
  format: MatchFormat;
  partnerMode?: PartnerMode;
  fixedTeams?: FixedTeam[];
  backgroundId?: string;
  themeColorId?: string;
  toxicModeEnabled?: boolean;
  toxicIntensity?: ToxicIntensity;
  criteria?: RankingCriteria;
  scoringType?: ScoringType;
  matchPlayMode?: MatchPlayMode;
  matchPlayGamesTarget?: number;
  matchPlayBestOfSets?: number;
  date: Date;
  startedAt?: number;
  endedAt?: number;
  courts?: number;
  totalPoints?: number;
  numRounds: number;
  durationMinutes?: number;
  numPlayers: number;
  rounds?: Round[];
  players?: Player[];
  courtChanges?: CourtChange[];
  venueName?: string;
  location?: string;
  completedMatchesCount?: number;
  userMatches?: number;
  userWins?: number;
  userLosses?: number;
  userDraws?: number;
  userPoints?: number;
  userMmrDelta?: number;
  playedAt?: any;
  statsVersion?: number;
  statsAppliedAt?: any;
  rewind?: TournamentRewind;
}

export type RankTier = 'Rookie' | 'Amateur' | 'Challenger' | 'Elite' | 'Master' | 'Grandmaster' | 'Legend' | 'Hall of Fame';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  phoneNumber?: string;
  photoURL?: string;
  mmr: number;
  totalMatches?: number;
  region?: string; // This will be the "Active Zone" (most played location)
  homeBase?: string; // This is the manual input (domicile)
  locationActivity?: Record<string, number>; // Track frequency of play in each location
  createdAt: any;
}

export interface Friend {
  uid: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  mmr: number;
  addedAt?: any;
  lastPlayedAt?: any;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  requesterUid: string;
  targetUid: string;
  status: FriendRequestStatus;
  requesterDisplayName: string;
  requesterPhotoURL?: string;
  requesterUsername?: string;
  requesterMmr?: number;
  targetDisplayName?: string;
  targetPhotoURL?: string;
  targetUsername?: string;
  targetMmr?: number;
  createdAt?: any;
  updatedAt?: any;
  resolvedAt?: any;
}

export type Screen = 'login' | 'dashboard' | 'settings' | 'active' | 'klasemen' | 'profile' | 'notifications' | 'leaderboard' | 'rank-discovery' | 'mmr-history' | 'history' | 'history-detail' | 'friends' | 'rooms' | 'room-editor' | 'room-detail' | 'room-setup';

export type TournamentStatsSyncState = 'syncing' | 'synced' | 'error';

export interface PlayerMatchLedgerEntry {
  id: string;
  uid: string;
  playerName?: string;
  tournamentId: string;
  tournamentName?: string;
  matchId: string;
  roundId: number;
  matchSequence?: number;
  format?: MatchFormat;
  team?: 'A' | 'B';
  scoreFor?: number;
  scoreAgainst?: number;
  scoreDiff?: number;
  result?: 'win' | 'loss' | 'draw';
  teamSummary?: string;
  opponentSummary?: string;
  teamAverageMmr?: number;
  opponentAverageMmr?: number;
  isUnderdog?: boolean;
  isFavorite?: boolean;
  mmrBefore?: number;
  mmrAfter?: number;
  baseDeltaMmr?: number;
  modifierDeltaMmr?: number;
  deltaMmr: number;
  reasonCode?: string;
  reasonLabel?: string;
  baseReasonLabel?: string;
  modifierCode?: string;
  modifierLabel?: string;
  hostUid: string;
  playedAt?: any;
  createdAt?: any;
  source?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'match' | 'tournament' | 'system' | 'achievement';
  tone?: 'info' | 'success' | 'error' | 'achievement';
  read: boolean;
}
