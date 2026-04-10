export type MatchFormat = 'Match Play' | 'Americano' | 'Mexicano';
export type RankingCriteria = 'Matches Won' | 'Points Won';
export type ScoringType = 'Golden Point' | 'Advantage';

export interface Player {
  id: string;
  name: string;
  rating: number;
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

export interface Tournament {
  name: string;
  format: MatchFormat;
  criteria: RankingCriteria;
  scoringType?: ScoringType;
  startedAt?: number;
  courts: number;
  totalPoints: number;
  players: Player[];
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
  date: Date;
  numRounds: number;
  numPlayers: number;
  rounds?: Round[];
  players?: Player[];
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
}

export type Screen = 'login' | 'dashboard' | 'settings' | 'preview' | 'active' | 'klasemen' | 'profile' | 'notifications' | 'leaderboard' | 'rank-discovery' | 'history' | 'history-detail' | 'friends';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'match' | 'tournament' | 'system' | 'achievement';
  read: boolean;
}
