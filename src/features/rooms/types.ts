import type { MatchFormat, Player, RankingCriteria, ScoringType, ToxicIntensity, Tournament } from '../../types';

export type RoomStatus =
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RoomParticipantStatus =
  | 'invited'
  | 'joined'
  | 'declined'
  | 'removed';

export interface RoomParticipant {
  id: string;
  uid?: string;
  playerId?: string;
  displayName: string;
  avatar?: string;
  initials?: string;
  rating?: number;
  source: 'host' | 'fom' | 'manual';
  status: RoomParticipantStatus;
  joinedAt?: number;
  invitedAt?: number;
  removedAt?: number;
}

export type RoomCurrency = 'IDR';

export interface RoomPublicPricing {
  enabled: boolean;
  publicPrice: number;
  currency: RoomCurrency;
  version: 1;
}

export type FinancePlayerType = 'external' | 'friend';
export type FinancePaymentStatus = 'unpaid' | 'paid';

export interface RoomFinancePrivate {
  roomId: string;
  hostUid: string;
  enabled: boolean;
  currency: RoomCurrency;
  courtCostPerCourt: number;
  courtCount: number;
  ballCost: number;
  totalCourtCost: number;
  totalCost: number;
  publicPrice: number;
  includeHostInFriendSplit: boolean;
  lastCalculatedAt?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoomParticipantFinance {
  roomId: string;
  participantId: string;
  uid?: string;
  displayName: string;
  playerType: FinancePlayerType;
  paymentStatus: FinancePaymentStatus;
  amountDue: number;
  paidAt?: number;
  markedPaidBy?: string;
  lastCalculatedAt?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoomFinanceSummary {
  currency: RoomCurrency;
  totalCost: number;
  totalCharged: number;
  totalPaid: number;
  totalUnpaid: number;
  projectedProfit: number;
  realizedProfit: number;
  externalPlayerCount: number;
  friendPlayerCount: number;
  paidPlayerCount: number;
  unpaidPlayerCount: number;
}

export interface HostFinanceMatchSnapshot extends RoomFinanceSummary {
  id: string;
  hostUid: string;
  roomId: string;
  launchedTournamentId?: string;
  title: string;
  venueName?: string;
  location?: string;
  scheduledFor: number;
  completedAt?: number;
  periodDay: string;
  periodWeek: string;
  periodMonth: string;
  participants: Array<{
    participantId: string;
    uid?: string;
    displayName: string;
    playerType: FinancePlayerType;
    paymentStatus: FinancePaymentStatus;
    amountDue: number;
  }>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoomSettingsSnapshot {
  name: string;
  format: MatchFormat;
  criteria: RankingCriteria;
  scoringType?: ScoringType;
  backgroundId?: string;
  themeColorId?: string;
  toxicModeEnabled?: boolean;
  toxicIntensity?: ToxicIntensity;
  courts: number;
  totalPoints: number;
  numRounds: number;
  durationMinutes?: number;
  venueName?: string;
  location?: string;
}

export interface RoomMatchLaunchPayload {
  roomId: string;
  launchedAt: number;
  launchedBy: string;
  tournamentDraft: Tournament;
}

export interface Room {
  id: string;
  hostUid: string;
  hostDisplayName?: string;
  title: string;
  description?: string;
  status: RoomStatus;
  visibility: 'private' | 'friends' | 'public';
  scheduledFor: number;
  settings: RoomSettingsSnapshot;
  participants: RoomParticipant[];
  minPlayers?: number;
  maxPlayers?: number;
  pricing?: RoomPublicPricing;
  feeEnabled?: boolean;
  feeAmount?: number;
  matchSetupConfiguredAt?: number;
  launchedTournamentId?: string;
  launchPayload?: RoomMatchLaunchPayload;
  createdAt?: unknown;
  updatedAt?: unknown;
  cancelledAt?: unknown;
  completedAt?: unknown;
}

export type CreateRoomInput = Omit<
  Room,
  'id' | 'createdAt' | 'updatedAt' | 'cancelledAt' | 'completedAt' | 'launchPayload'
> & {
  id?: string;
};

export type UpdateRoomInput = Partial<Omit<Room, 'id' | 'hostUid' | 'createdAt'>> & {
  updatedAt?: unknown;
};
