export type MatchFormat = 'Match Play' | 'Americano' | 'Mexicano';
export type RankingCriteria = 'Matches Won' | 'Points Won';
export type ScoringType = 'Golden Point' | 'Advantage';

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
}

export interface CourtChange {
  effectiveFromRoundId: number;
  fromCourts: number;
  toCourts: number;
  changedAt: number;
}

export interface Tournament {
  id?: string;
  name: string;
  format: MatchFormat;
  backgroundId?: string;
  criteria: RankingCriteria;
  scoringType?: ScoringType;
  startedAt?: number;
  endedAt?: number;
  courts: number;
  totalPoints: number;
  players: Player[];
  inactivePlayerIds?: string[];
  courtChanges?: CourtChange[];
  rounds: Round[];
  numRounds: number;
  venueName?: string;
  location?: string;
}

export interface TournamentHistory {
  id: string;
  userId: string;
  name: string;
  format: MatchFormat;
  backgroundId?: string;
  criteria?: RankingCriteria;
  scoringType?: ScoringType;
  date: Date;
  startedAt?: number;
  endedAt?: number;
  courts?: number;
  totalPoints?: number;
  numRounds: number;
  numPlayers: number;
  rounds?: Round[];
  players?: Player[];
  courtChanges?: CourtChange[];
  venueName?: string;
  location?: string;
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

export type Screen = 'login' | 'dashboard' | 'settings' | 'background-picker' | 'active' | 'klasemen' | 'profile' | 'notifications' | 'leaderboard' | 'rank-discovery' | 'history' | 'history-detail' | 'friends';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'match' | 'tournament' | 'system' | 'achievement';
  read: boolean;
}
