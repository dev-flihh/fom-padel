import type {
  HostFinanceMatchSnapshot,
  Room,
  RoomCurrency,
  RoomFinancePrivate,
  RoomFinanceSummary,
  RoomParticipant,
  RoomParticipantFinance,
  RoomPublicPricing,
} from './types';

export const ROOM_FINANCE_VERSION = 1;
export const DEFAULT_ROOM_CURRENCY: RoomCurrency = 'IDR';

const clampMoney = (value: unknown) => {
  const amount = Math.floor(Number(value || 0));
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(amount, 999_999_999);
};

const isHostParticipant = (participant: Pick<RoomParticipant, 'id' | 'uid' | 'source'>, hostUid: string) => (
  participant.source === 'host' ||
  participant.uid === hostUid ||
  participant.id === hostUid
);

const isHostFinance = (
  finance: Pick<RoomParticipantFinance, 'participantId' | 'uid'>,
  hostUid: string
) => (
  finance.uid === hostUid ||
  finance.participantId === hostUid
);

const getDateParts = (timestamp: number) => {
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { date, year, month, day };
};

const getPeriodWeek = (timestamp: number) => {
  const { date } = getDateParts(timestamp);
  const monday = new Date(date);
  const day = monday.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diffToMonday);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
};

export const getRoomPublicPricing = (
  room: Pick<Room, 'pricing' | 'feeEnabled' | 'feeAmount'>
): RoomPublicPricing => {
  if (room.pricing) {
    return {
      enabled: Boolean(room.pricing.enabled),
      publicPrice: clampMoney(room.pricing.publicPrice),
      currency: room.pricing.currency || DEFAULT_ROOM_CURRENCY,
      version: ROOM_FINANCE_VERSION,
    };
  }

  return {
    enabled: Boolean(room.feeEnabled),
    publicPrice: clampMoney(room.feeAmount),
    currency: DEFAULT_ROOM_CURRENCY,
    version: ROOM_FINANCE_VERSION,
  };
};

export const buildRoomPublicPricing = ({
  enabled,
  publicPrice,
}: {
  enabled: boolean;
  publicPrice: number;
}): RoomPublicPricing => ({
  enabled,
  publicPrice: enabled ? clampMoney(publicPrice) : 0,
  currency: DEFAULT_ROOM_CURRENCY,
  version: ROOM_FINANCE_VERSION,
});

export const buildRoomFinancePrivate = ({
  roomId,
  hostUid,
  enabled,
  courtCostPerCourt,
  courtCount,
  ballCost,
  publicPrice,
  includeHostInFriendSplit,
  calculatedAt = Date.now(),
}: {
  roomId: string;
  hostUid: string;
  enabled: boolean;
  courtCostPerCourt: number;
  courtCount: number;
  ballCost: number;
  publicPrice: number;
  includeHostInFriendSplit: boolean;
  calculatedAt?: number;
}): RoomFinancePrivate => {
  const safeCourtCostPerCourt = enabled ? clampMoney(courtCostPerCourt) : 0;
  const safeCourtCount = enabled ? Math.max(1, Math.min(24, Math.floor(Number(courtCount || 1)))) : 0;
  const safeBallCost = enabled ? clampMoney(ballCost) : 0;
  const totalCourtCost = safeCourtCostPerCourt * safeCourtCount;
  const totalCost = totalCourtCost + safeBallCost;

  return {
    roomId,
    hostUid,
    enabled,
    currency: DEFAULT_ROOM_CURRENCY,
    courtCostPerCourt: safeCourtCostPerCourt,
    courtCount: safeCourtCount,
    ballCost: safeBallCost,
    totalCourtCost,
    totalCost,
    publicPrice: enabled ? clampMoney(publicPrice) : 0,
    includeHostInFriendSplit,
    lastCalculatedAt: calculatedAt,
  };
};

export const getJoinedFinanceParticipants = (participants: RoomParticipant[]) => (
  (participants || []).filter((participant) => participant.status === 'joined')
);

export const getDefaultFinancePlayerType = (
  participant: RoomParticipant,
  hostUid: string
) => (
  isHostParticipant(participant, hostUid) ? 'friend' : 'external'
);

export const calculateParticipantFinances = ({
  settings,
  participants,
  existingFinances = [],
  calculatedAt = Date.now(),
}: {
  settings: RoomFinancePrivate;
  participants: RoomParticipant[];
  existingFinances?: RoomParticipantFinance[];
  calculatedAt?: number;
}): RoomParticipantFinance[] => {
  const existingByParticipantId = new Map(
    existingFinances.map((finance) => [finance.participantId, finance])
  );
  const joinedParticipants = getJoinedFinanceParticipants(participants);
  const splitParticipants = joinedParticipants.filter((participant) => (
    settings.includeHostInFriendSplit || !isHostParticipant(participant, settings.hostUid)
  ));
  const friendSplitParticipantCount = splitParticipants.length;
  const friendAmountDue = settings.enabled && friendSplitParticipantCount > 0
    ? Math.ceil(settings.totalCost / friendSplitParticipantCount)
    : 0;

  return joinedParticipants.map((participant) => {
    const existing = existingByParticipantId.get(participant.id);
    const playerType = existing?.playerType || getDefaultFinancePlayerType(participant, settings.hostUid);
    const hostExcluded = isHostParticipant(participant, settings.hostUid) && !settings.includeHostInFriendSplit;
    const amountDue = !settings.enabled || hostExcluded
      ? 0
      : playerType === 'friend'
        ? friendAmountDue
        : settings.publicPrice;

    return {
      roomId: settings.roomId,
      participantId: participant.id,
      uid: participant.uid,
      displayName: participant.displayName,
      playerType,
      paymentStatus: existing?.paymentStatus || 'unpaid',
      amountDue,
      paidAt: existing?.paidAt,
      markedPaidBy: existing?.markedPaidBy,
      lastCalculatedAt: calculatedAt,
      createdAt: existing?.createdAt,
      updatedAt: existing?.updatedAt,
    };
  });
};

export const calculateRoomFinanceSummary = ({
  settings,
  participantFinances,
}: {
  settings: RoomFinancePrivate;
  participantFinances: RoomParticipantFinance[];
}): RoomFinanceSummary => {
  const revenueFinances = participantFinances.filter((item) => !isHostFinance(item, settings.hostUid));
  const totalCharged = revenueFinances.reduce((sum, item) => sum + clampMoney(item.amountDue), 0);
  const totalPaid = revenueFinances
    .filter((item) => item.paymentStatus === 'paid')
    .reduce((sum, item) => sum + clampMoney(item.amountDue), 0);
  const totalUnpaid = Math.max(0, totalCharged - totalPaid);

  return {
    currency: settings.currency || DEFAULT_ROOM_CURRENCY,
    totalCost: clampMoney(settings.totalCost),
    totalCharged,
    totalPaid,
    totalUnpaid,
    projectedProfit: totalCharged - clampMoney(settings.totalCost),
    realizedProfit: totalPaid - clampMoney(settings.totalCost),
    externalPlayerCount: participantFinances.filter((item) => item.playerType === 'external').length,
    friendPlayerCount: participantFinances.filter((item) => item.playerType === 'friend').length,
    paidPlayerCount: participantFinances.filter((item) => item.paymentStatus === 'paid').length,
    unpaidPlayerCount: participantFinances.filter((item) => item.paymentStatus !== 'paid').length,
  };
};

export const buildHostFinanceMatchSnapshot = ({
  room,
  settings,
  participantFinances,
  completedAt,
}: {
  room: Room;
  settings: RoomFinancePrivate;
  participantFinances: RoomParticipantFinance[];
  completedAt?: number;
}): HostFinanceMatchSnapshot => {
  const scheduledFor = Number(room.scheduledFor || Date.now());
  const { year, month, day } = getDateParts(scheduledFor);
  const summary = calculateRoomFinanceSummary({ settings, participantFinances });

  return {
    id: room.id,
    hostUid: room.hostUid,
    roomId: room.id,
    launchedTournamentId: room.launchedTournamentId,
    title: room.title,
    venueName: room.settings?.venueName,
    location: room.settings?.location,
    scheduledFor,
    completedAt,
    ...summary,
    periodDay: `${year}-${month}-${day}`,
    periodWeek: getPeriodWeek(scheduledFor),
    periodMonth: `${year}-${month}`,
    participants: participantFinances.map((finance) => ({
      participantId: finance.participantId,
      uid: finance.uid,
      displayName: finance.displayName,
      playerType: finance.playerType,
      paymentStatus: finance.paymentStatus,
      amountDue: clampMoney(finance.amountDue),
    })),
  };
};
