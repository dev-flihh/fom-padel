import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { type Friend, type Player } from '../../types';
import { AddPlayerModal } from '../matches/AddPlayerModal';
import { useMatchSettingsFriends } from '../matches/useMatchSettingsFriends';
import { formatDisplayMmr } from '../ranking/rankUtils';
import type { FinancePaymentStatus, FinancePlayerType, Room, RoomFinancePrivate, RoomParticipant, RoomParticipantFinance } from './types';
import { calculateParticipantFinances, calculateRoomFinanceSummary, getRoomPublicPricing } from './roomFinance';

const avatarPalette = [
  'bg-[#2563eb] text-white',
  'bg-[#16a085] text-white',
  'bg-[#9d4edd] text-white',
  'bg-[#334155] text-white',
  'bg-primary text-white',
  'bg-[#0f766e] text-white',
];

const formatRoomSchedule = (scheduledFor: number) => {
  try {
    const date = new Date(scheduledFor);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: '-', time: '-' };
  }
};

const formatRoomHeroDate = (scheduledFor: number) => {
  try {
    return new Date(scheduledFor).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatDurationLabel = (minutes?: number) => {
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  if (!safeMinutes) return '';
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (!hours) return `${safeMinutes} min`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatDurationText = (minutes?: number) => {
  const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  if (!safeMinutes) return '';
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (!hours) return `${safeMinutes} min`;
  if (!remainingMinutes) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
};

const formatRoomDetailDateTime = (scheduledFor: number) => {
  try {
    const date = new Date(scheduledFor);
    return `${date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })} at ${date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
};

const formatCurrency = (amount?: number) => {
  if (!amount || amount <= 0) return 'Free';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatFinanceCurrency = (amount?: number) => (
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.floor(Number(amount) || 0)))
);

const getInitials = (name: string) => (
  String(name || 'Player')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

const clampNumericInput = (value: string, min: number, max: number) => {
  const parsed = Number(value.replace(/[^\d]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

const buildManualParticipant = (player: Player): RoomParticipant => ({
  id: player.id,
  playerId: player.id,
  displayName: player.name,
  avatar: player.avatar || '',
  initials: player.initials || getInitials(player.name),
  rating: Number(player.rating || 0),
  source: 'manual',
  status: 'joined',
  joinedAt: Date.now(),
});

const buildFriendParticipant = (friend: Friend): RoomParticipant => ({
  id: friend.uid,
  uid: friend.uid,
  playerId: friend.uid,
  displayName: friend.displayName || friend.username || 'Friend',
  avatar: friend.photoURL || '',
  initials: getInitials(friend.displayName || friend.username || 'Friend'),
  rating: Number(friend.mmr || 0),
  source: 'fom',
  status: 'joined',
  joinedAt: Date.now(),
});

const getJoinedParticipants = (room: Room) => (
  (room.participants || []).filter((participant) => participant.status === 'joined')
);

const getVisibleParticipants = (room: Room) => (
  [...(room.participants || [])].sort((a, b) => {
    const statusWeight = (status: RoomParticipant['status']) => (
      status === 'joined' ? 0 : status === 'invited' ? 1 : 2
    );
    return statusWeight(a.status) - statusWeight(b.status);
  })
);

const getParticipantInitials = (participant: RoomParticipant) => (
  participant.initials ||
  participant.displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ||
  'PL'
);

const getAvatarTone = (participant: RoomParticipant, index: number) => {
  const seed = `${participant.id}-${participant.displayName}`;
  const hash = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), index);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const getStatusLabel = (status: Room['status']) => {
  if (status === 'draft') return 'Draft';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'open') return 'Open';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return 'Cancelled';
};

const getVisibilityMeta = (visibility: Room['visibility']) => {
  if (visibility === 'private') {
    return { label: 'Private', caption: 'Only invited players can access this room.' };
  }
  if (visibility === 'friends') {
    return { label: 'Friends', caption: 'Visible to your FOM friends.' };
  }
  return { label: 'Public', caption: 'Shown in public room discovery.' };
};

const getRoomVisualMeta = (format?: string) => {
  const normalizedFormat = String(format || '').toLowerCase();
  if (normalizedFormat.includes('mexicano')) {
    return {
      accentRgb: '238, 109, 30',
      deepRgb: '31, 24, 19',
      imageSrc: '/mockups/active-v2/images/Mexicano-03.jpg',
    };
  }
  if (normalizedFormat.includes('match')) {
    return {
      accentRgb: '47, 111, 228',
      deepRgb: '16, 28, 48',
      imageSrc: '/mockups/active-v2/images/match-06.jpg',
    };
  }
  return {
    accentRgb: '17, 148, 123',
    deepRgb: '16, 40, 44',
    imageSrc: '/mockups/active-v2/images/Americano-03.jpg',
  };
};

const IconInfoRow = ({
  icon: Icon,
  primary,
  secondary,
  emphasis = false,
}: {
  icon: React.ElementType;
  primary?: string | null;
  secondary?: string | null;
  emphasis?: boolean;
}) => {
  if (!String(primary || '').trim()) return null;

  return (
    <div className="flex min-w-0 gap-3">
      <div className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ring-1 ring-black/[0.025]',
        emphasis ? 'bg-[#ff5500]/10 text-[#ff5500]' : 'bg-ios-gray/[0.06] text-on-surface/80'
      )}>
        <Icon size={17} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] font-semibold leading-[1.2] text-on-surface', emphasis && 'text-[#ff5500]')}>
          {primary}
        </p>
        {secondary && (
          <p className="mt-0.5 text-[12px] font-medium leading-[1.3] text-ios-gray">{secondary}</p>
        )}
      </div>
    </div>
  );
};

const HostOnlyBadge = ({ label = 'Host only' }: { label?: string }) => (
  <span className="inline-flex shrink-0 rounded-full bg-[#ff5500]/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ff5500]">
    {label}
  </span>
);

const PaymentMiniToggle = ({
  checked,
  label,
  onClick,
  disabled,
  tone = 'orange',
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'orange' | 'green';
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onClick}
    className="tap-target flex h-9 min-w-0 items-center justify-between gap-2 rounded-[14px] bg-white px-2.5 text-left ring-1 ring-black/[0.05] transition-colors disabled:opacity-60"
  >
    <span className={cn(
      'truncate text-[11px] font-semibold',
      checked
        ? tone === 'green'
          ? 'text-emerald-700'
          : 'text-[#ff5500]'
        : 'text-ios-gray'
    )}>
      {label}
    </span>
    <span className={cn(
      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
      checked
        ? tone === 'green'
          ? 'bg-emerald-500'
          : 'bg-[#ff5500]'
        : 'bg-ios-gray/18'
    )}>
      <span className={cn(
        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
      )} />
    </span>
  </button>
);

const sectionLabelClassName = 'text-[11px] font-bold uppercase tracking-[0.16em] text-ios-gray/72';
const editChipClassName = 'tap-target rounded-full border border-[rgba(var(--room-accent-rgb),0.26)] bg-white/85 px-3 py-1 text-[12px] font-semibold text-[rgb(var(--room-accent-rgb))] shadow-sm backdrop-blur-sm';
const roomCardClassName = 'rounded-[20px] border border-white/65 bg-white/[0.78] shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-white/35 backdrop-blur-md';

export const RoomDetailScreen = ({
  room,
  currentUserUid,
  currentUserPhotoURL,
  roomFinance,
  participantFinances = [],
  isSavingFinance = false,
  isSavingParticipation,
  isStartingRoom,
  onJoin,
  onLoginToJoin,
  onLeave,
  onStartRoom,
  onConfigureSetup,
  onEditRoom,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipantFinance,
  onSaveParticipantChanges,
  onShare,
  onBack,
}: {
  room: Room;
  currentUserUid?: string | null;
  currentUserPhotoURL?: string | null;
  roomFinance?: RoomFinancePrivate | null;
  participantFinances?: RoomParticipantFinance[];
  isSavingFinance?: boolean;
  isSavingParticipation: boolean;
  isStartingRoom: boolean;
  onJoin: () => void;
  onLoginToJoin: () => void;
  onLeave: () => void;
  onStartRoom: () => void;
  onConfigureSetup: () => void;
  onEditRoom?: () => void;
  onAddParticipant?: (participant: RoomParticipant) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onUpdateParticipantFinance?: (participantId: string, patch: {
    playerType?: FinancePlayerType;
    paymentStatus?: FinancePaymentStatus;
  }) => void;
  onSaveParticipantChanges?: (payload: {
    participants: RoomParticipant[];
    participantFinances: RoomParticipantFinance[];
  }) => void | Promise<void>;
  onShare: () => void;
  onBack: () => void;
}) => {
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [isAddSlotPickerOpen, setIsAddSlotPickerOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [draftParticipants, setDraftParticipants] = useState<RoomParticipant[]>(room.participants || []);
  const [draftParticipantFinances, setDraftParticipantFinances] = useState<RoomParticipantFinance[]>(participantFinances);
  const [hasParticipantDraftChanges, setHasParticipantDraftChanges] = useState(false);
  const [expandedPaymentParticipantIds, setExpandedPaymentParticipantIds] = useState<Set<string>>(() => new Set());
  const schedule = formatRoomSchedule(room.scheduledFor);
  const heroDate = formatRoomHeroDate(room.scheduledFor);
  const isHost = Boolean(currentUserUid && room.hostUid === currentUserUid);
  const usesParticipantDraft = isHost && Boolean(onSaveParticipantChanges);

  useEffect(() => {
    if (hasParticipantDraftChanges) return;
    setDraftParticipants(room.participants || []);
    setDraftParticipantFinances(participantFinances);
  }, [hasParticipantDraftChanges, participantFinances, room.id, room.participants]);

  const effectiveRoom = usesParticipantDraft
    ? { ...room, participants: draftParticipants }
    : room;
  const effectiveParticipantFinances = usesParticipantDraft ? draftParticipantFinances : participantFinances;
  const joinedParticipants = getJoinedParticipants(effectiveRoom);
  const visibleParticipants = getVisibleParticipants(effectiveRoom);
  const isJoined = Boolean(
    currentUserUid &&
    joinedParticipants.some((participant) => participant.uid === currentUserUid || participant.id === currentUserUid)
  );
  const minPlayers = Math.max(4, Number(room.minPlayers || 4));
  const maxPlayers = Number(room.maxPlayers || 0);
  const openSlots = maxPlayers ? Math.max(maxPlayers - joinedParticipants.length, 0) : null;
  const hasOpenSlot = openSlots === null || openSlots > 0;
  const capacityLabel = maxPlayers ? `${joinedParticipants.length}/${maxPlayers}` : `${joinedParticipants.length}`;
  const canStartRoom = isHost && room.status === 'scheduled' && joinedParticipants.length >= minPlayers;
  const isMatchSetupConfigured = Boolean(room.matchSetupConfiguredAt);
  const needsLoginToJoin = !currentUserUid && room.status === 'scheduled' && hasOpenSlot;
  const canJoin = Boolean(currentUserUid) && !isHost && !isJoined && room.status === 'scheduled' && hasOpenSlot;
  const canLeave = !isHost && isJoined && room.status === 'scheduled';
  const visibilityMeta = getVisibilityMeta(room.visibility);
  const pricing = getRoomPublicPricing(room);
  const courtCount = Math.max(0, Number(room.settings.courts || 0));
  const roundsCount = Math.max(0, Number(room.settings.numRounds || 0));
  const durationLabel = formatDurationLabel(room.settings.durationMinutes);
  const durationText = formatDurationText(room.settings.durationMinutes);
  const detailDateTimeLabel = formatRoomDetailDateTime(room.scheduledFor);
  const heroVenueName = room.settings.venueName?.trim();
  const hostName = room.hostDisplayName?.trim();
  const roomDescription = room.description?.trim() || '';
  const hasLongDescription = roomDescription.length > 260 || roomDescription.split('\n').length > 5;
  const venueName = room.settings.venueName?.trim();
  const cityName = room.settings.location?.trim();
  const playerCourtLabel = [
    `${capacityLabel} players`,
    courtCount > 0 ? `${courtCount} court${courtCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');
  const playerCourtCaption = [
    openSlots === null ? '' : `${openSlots} slot${openSlots === 1 ? '' : 's'} open`,
    `min ${minPlayers} to start`,
  ].filter(Boolean).join(' · ');
  const heroMetaItems = [heroDate, schedule.time, durationLabel].filter((item): item is string => (
    String(item || '').trim().length > 0
  ));
  const scoringLabel = room.settings.scoringType || (
    Number(room.settings.totalPoints || 0) > 0 ? `${Number(room.settings.totalPoints)} points` : ''
  );
  const feeInfoLabel = pricing.enabled ? `Per player · ${formatCurrency(pricing.publicPrice)}` : 'No fee';
  const roomTrustLabel = [`${visibilityMeta.label} room`, hostName ? `Host ${hostName}` : ''].filter(Boolean).join(' · ');
  const matchSummaryItems = [
    room.settings.format,
    roundsCount > 0 ? `${roundsCount} rounds` : '',
    scoringLabel,
  ].filter((item): item is string => String(item || '').trim().length > 0);
  const financeByParticipantId = new Map<string, RoomParticipantFinance>(
    effectiveParticipantFinances.map((finance) => [finance.participantId, finance])
  );
  const currentUserFinance = participantFinances.find((finance) => (
    Boolean(currentUserUid) &&
    (finance.uid === currentUserUid || finance.participantId === currentUserUid)
  ));
  const financeSummary = roomFinance
    ? calculateRoomFinanceSummary({ settings: roomFinance, participantFinances: effectiveParticipantFinances })
    : null;
  const currentAmountDue = currentUserFinance?.amountDue ?? (pricing.enabled && isJoined ? pricing.publicPrice : 0);
  const currentPaymentStatus = currentUserFinance?.paymentStatus || 'unpaid';
  const { friends, loadingFriends } = useMatchSettingsFriends(isHost ? currentUserUid || undefined : undefined);
  const availableFriends = useMemo(
    () => friends
      .filter((friend) => !visibleParticipants.some((participant) => (
        participant.uid === friend.uid || participant.id === friend.uid
      )))
      .sort((a, b) => (
        (a.displayName || a.username || '').localeCompare(
          b.displayName || b.username || '',
          undefined,
          { sensitivity: 'base' }
        )
      )),
    [friends, visibleParticipants]
  );
  const emptySlotCount = maxPlayers ? Math.max(maxPlayers - visibleParticipants.length, 0) : 0;
  const emptySlots = useMemo(
    () => Array.from({ length: emptySlotCount }, (_, index) => index + 1),
    [emptySlotCount]
  );
  const playersNeeded = Math.max(minPlayers - joinedParticipants.length, 0);
  const minimumProgressLabel = `${joinedParticipants.length}/${minPlayers} minimum joined`;
  const slotProgressLabel = `${openSlots === null ? 'Open room' : `${openSlots} slots open`} · ${capacityLabel} joined`;
  const footerDisabled = isHost
    ? isMatchSetupConfigured
      ? !canStartRoom || isStartingRoom
      : false
    : canJoin
      ? isSavingParticipation
      : needsLoginToJoin
        ? false
      : canLeave
        ? isSavingParticipation
        : true;
  const footerLabel = isHost
    ? !isMatchSetupConfigured
      ? 'Configure Match'
      : isStartingRoom
      ? 'Starting...'
      : room.status !== 'scheduled'
        ? getStatusLabel(room.status)
        : canStartRoom
          ? 'Start Match'
          : `Need ${playersNeeded} more`
    : canLeave
      ? isSavingParticipation
        ? 'Leaving...'
        : 'Leave Room'
      : canJoin
        ? isSavingParticipation
          ? 'Joining...'
          : 'Join Room'
        : needsLoginToJoin
          ? 'Login to Join'
        : isJoined
          ? 'Joined'
          : hasOpenSlot
            ? 'Unavailable'
            : 'Room Full';
  const isSavingParticipantDraft = isSavingFinance || isSavingParticipation;

  const handleFooterAction = () => {
    if (footerDisabled) return;
    if (isHost) {
      if (!isMatchSetupConfigured) {
        onConfigureSetup();
        return;
      }
      onStartRoom();
      return;
    }
    if (canLeave) {
      onLeave();
      return;
    }
    if (needsLoginToJoin) {
      onLoginToJoin();
      return;
    }
    if (canJoin) onJoin();
  };

  const handleOpenEditRoom = () => {
    onEditRoom?.();
  };

  const calculateNextDraftFinances = (
    participants: RoomParticipant[],
    existingFinances: RoomParticipantFinance[]
  ) => {
    if (!roomFinance) return existingFinances;
    const calculatedAt = Date.now();
    const nextPrivateFinance = {
      ...roomFinance,
      lastCalculatedAt: calculatedAt,
    };
    return calculateParticipantFinances({
      settings: nextPrivateFinance,
      participants,
      existingFinances,
      calculatedAt,
    });
  };

  const updateParticipantDraft = (
    participants: RoomParticipant[],
    existingFinances = draftParticipantFinances
  ) => {
    setDraftParticipants(participants);
    setDraftParticipantFinances(calculateNextDraftFinances(participants, existingFinances));
    setHasParticipantDraftChanges(true);
  };

  const handleAddManualParticipant = (player: Player) => {
    const participant = buildManualParticipant(player);
    if (!usesParticipantDraft) {
      onAddParticipant?.(participant);
      setIsAddPlayerOpen(false);
      return;
    }

    const joinedCount = draftParticipants.filter((item) => item.status === 'joined').length;
    const alreadyExists = draftParticipants.some((item) => item.id === participant.id);
    if (room.maxPlayers && joinedCount >= room.maxPlayers && !alreadyExists) {
      window.alert('Room is full. Increase player slots before adding more players.');
      return;
    }

    updateParticipantDraft([
      ...draftParticipants.filter((item) => item.id !== participant.id),
      participant,
    ]);
    setIsAddPlayerOpen(false);
  };

  const handleAddFriendParticipant = (friend: Friend) => {
    const participant = buildFriendParticipant(friend);
    if (!usesParticipantDraft) {
      onAddParticipant?.(participant);
      setIsFriendPickerOpen(false);
      return;
    }

    const joinedCount = draftParticipants.filter((item) => item.status === 'joined').length;
    const alreadyExists = draftParticipants.some((item) => item.id === participant.id);
    if (room.maxPlayers && joinedCount >= room.maxPlayers && !alreadyExists) {
      window.alert('Room is full. Increase player slots before adding more players.');
      return;
    }

    updateParticipantDraft([
      ...draftParticipants.filter((item) => item.id !== participant.id),
      participant,
    ]);
    setIsFriendPickerOpen(false);
  };

  const handleRemoveParticipant = (participant: RoomParticipant) => {
    const confirmed = window.confirm(`Remove ${participant.displayName} from this room?`);
    if (!confirmed) return;
    if (!usesParticipantDraft) {
      onRemoveParticipant?.(participant.id);
      return;
    }
    updateParticipantDraft(draftParticipants.filter((item) => item.id !== participant.id));
  };

  const handleUpdateDraftParticipantFinance = (
    participantId: string,
    patch: {
      playerType?: FinancePlayerType;
      paymentStatus?: FinancePaymentStatus;
    }
  ) => {
    if (!usesParticipantDraft) {
      onUpdateParticipantFinance?.(participantId, patch);
      return;
    }

    const baseFinances = calculateNextDraftFinances(draftParticipants, draftParticipantFinances);
    const calculatedAt = Date.now();
    const patchedFinances = baseFinances.map((finance) => {
      if (finance.participantId !== participantId) return finance;
      const paymentStatus = patch.paymentStatus || finance.paymentStatus;
      return {
        ...finance,
        ...patch,
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? (finance.paidAt || calculatedAt) : finance.paidAt,
        markedPaidBy: paymentStatus === 'paid' ? currentUserUid || finance.markedPaidBy : finance.markedPaidBy,
      };
    });
    setDraftParticipantFinances(calculateNextDraftFinances(draftParticipants, patchedFinances));
    setHasParticipantDraftChanges(true);
  };

  const handleDiscardParticipantDraft = () => {
    setDraftParticipants(room.participants || []);
    setDraftParticipantFinances(participantFinances);
    setHasParticipantDraftChanges(false);
    setExpandedPaymentParticipantIds(new Set());
  };

  const handleSaveParticipantDraft = async () => {
    if (!onSaveParticipantChanges || !hasParticipantDraftChanges) return;
    try {
      await onSaveParticipantChanges({
        participants: draftParticipants,
        participantFinances: draftParticipantFinances,
      });
      setHasParticipantDraftChanges(false);
      setExpandedPaymentParticipantIds(new Set());
    } catch {
      // Parent owns the user-facing error notification.
    }
  };

  const togglePaymentControls = (participantId: string) => {
    setExpandedPaymentParticipantIds((current) => {
      const next = new Set(current);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const roomVisualMeta = getRoomVisualMeta(room.settings.format);
  const pageVisualStyle = {
    '--room-accent-rgb': roomVisualMeta.accentRgb,
    '--room-deep-rgb': roomVisualMeta.deepRgb,
  } as React.CSSProperties;
  const heroOverlayStyle = {
    background: [
      `linear-gradient(180deg, rgba(${roomVisualMeta.deepRgb}, 0.34) 0%, rgba(${roomVisualMeta.deepRgb}, 0.18) 30%, rgba(245,250,253,0.72) 54%, rgba(241,247,251,0.94) 100%)`,
      `linear-gradient(160deg, rgba(${roomVisualMeta.accentRgb}, 0.25), rgba(${roomVisualMeta.accentRgb}, 0.11))`,
    ].join(', '),
  };
  const summaryStats = [
    { label: 'Mode', value: room.settings.format === 'Match Play' ? 'Match' : room.settings.format || 'Room' },
    { label: 'Player', value: capacityLabel },
    { label: 'Court', value: courtCount > 0 ? String(courtCount) : '-' },
    { label: 'Round', value: roundsCount > 0 ? String(roundsCount) : '-' },
  ];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#eef2f6] pb-[calc(env(safe-area-inset-bottom,0px)+28px)]"
      style={pageVisualStyle}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[590px] overflow-hidden">
        <img
          src={roomVisualMeta.imageSrc}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0" style={heroOverlayStyle} />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-md px-3 pb-2 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
        <div className="grid min-h-[42px] grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="tap-target inline-flex h-10 min-w-0 items-center gap-1.5 rounded-full border border-white/45 bg-white/15 px-3 text-[12px] font-bold text-white shadow-sm backdrop-blur-md"
            aria-label="Back to rooms"
          >
            <ChevronLeft size={17} strokeWidth={2.45} />
            <span>Lobby</span>
          </button>
          <img
            src="/fom-long-logotype-white.png"
            alt="FOM"
            className="h-[22px] justify-self-center drop-shadow-[0_1px_10px_rgba(0,0,0,0.2)]"
          />
          <button
            type="button"
            onClick={onShare}
            className="tap-target inline-flex h-10 items-center gap-1.5 rounded-full border border-white/45 bg-white/15 px-3 text-[12px] font-bold text-white shadow-sm backdrop-blur-md"
          >
            <Share2 size={15.5} strokeWidth={2.45} />
            <span>Share</span>
          </button>
        </div>

        <section className="mt-3 rounded-[22px] border border-white/50 bg-white/20 p-3.5 text-white shadow-[0_18px_36px_rgba(7,12,18,0.18)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/36 bg-[rgba(var(--room-accent-rgb),0.9)] px-3 py-1.5 text-[10.5px] font-black uppercase tracking-[0.1em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
                {getStatusLabel(room.status)}
              </span>
              <h1 className="mt-3 text-[22px] font-black leading-[1.08] text-white min-[520px]:text-[26px]">
                {room.title}
              </h1>
              <p className="mt-1.5 truncate text-[12px] font-semibold leading-snug text-white/92">
                {[venueName, cityName].filter(Boolean).join(' · ') || 'Venue TBA'}
              </p>
              <p className="mt-1 truncate text-[11.5px] font-semibold leading-snug text-white/82">
                {heroMetaItems.join(' · ') || detailDateTimeLabel}
              </p>
            </div>
            <div className="min-w-[86px] rounded-[14px] border border-white/48 bg-white/15 px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/88">Duration</p>
              <p className="mt-1 text-[27px] font-black leading-none text-white">
                {durationLabel || 'TBA'}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr] gap-2">
            {summaryStats.map((item) => (
              <div key={item.label} className="min-w-0 rounded-[13px] border border-white/40 bg-white/15 px-2 py-2">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-white/84">{item.label}</p>
                <p className="mt-1 truncate text-[10.5px] font-black leading-tight text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/28 pt-3">
            <p className="min-w-0 truncate text-[12px] font-medium text-white/90">
              Hosted by <span className="font-black text-white">{hostName || 'FOM Play'}</span>
            </p>
            <span className="shrink-0 rounded-full border border-white/45 bg-white/15 px-3 py-1.5 text-[11px] font-black text-white">
              {pricing.enabled ? formatCurrency(pricing.publicPrice) : visibilityMeta.label}
            </span>
          </div>
        </section>

        <div className="space-y-3.5 pt-3.5">
          <section>
            <div className="flex items-center justify-between gap-3 px-1">
              <p className={sectionLabelClassName}>Room Info</p>
              {isHost && (
                <button
                  type="button"
                  onClick={handleOpenEditRoom}
                  className={editChipClassName}
                >
                  Edit
                </button>
              )}
            </div>
            <div className={cn('mt-2.5 p-3.5 min-[520px]:p-4', roomCardClassName)}>
              <div className="space-y-3">
                <IconInfoRow
                  icon={CalendarDays}
                  primary={detailDateTimeLabel}
                  secondary={durationText}
                />
                <IconInfoRow
                  icon={MapPin}
                  primary={venueName}
                  secondary={cityName}
                />
                <IconInfoRow
                  icon={Users}
                  primary={playerCourtLabel}
                  secondary={playerCourtCaption}
                />
                <IconInfoRow
                  icon={CircleDollarSign}
                  primary={feeInfoLabel}
                  secondary={roomTrustLabel}
                  emphasis={pricing.enabled}
                />
              </div>
            </div>
          </section>

          {(roomDescription || isHost) && (
            <section>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className={sectionLabelClassName}>About this room</p>
                <div className="flex items-center gap-2">
                  {hasLongDescription && (
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded((value) => !value)}
                      className={editChipClassName}
                    >
                      {isDescriptionExpanded ? 'Less' : 'Read more'}
                    </button>
                  )}
                  {isHost && (
                    <button
                      type="button"
                      onClick={handleOpenEditRoom}
                      className={editChipClassName}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className={cn(
                'relative mt-2.5 overflow-hidden p-3.5 min-[520px]:p-4',
                roomCardClassName,
                !roomDescription && 'border border-dashed border-[#ff5500]/18 bg-[#fff7f2]'
              )}>
                {roomDescription ? (
                  <>
                    <p
                      className={cn(
                        'whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-on-surface/82',
                        hasLongDescription && !isDescriptionExpanded && 'max-h-[118px] overflow-hidden'
                      )}
                    >
                      {roomDescription}
                    </p>
                    {hasLongDescription && !isDescriptionExpanded && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-white/0" />
                    )}
                  </>
                ) : (
                  <p className="text-[13px] font-medium leading-[1.5] text-[#9a4a1c]">
                    Add host notes, rules, payment instructions, or player requirements.
                  </p>
                )}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3 px-1">
              <p className={sectionLabelClassName}>Match Info</p>
              {isHost && room.status === 'scheduled' && (
                <button
                  type="button"
                  onClick={onConfigureSetup}
                  className={editChipClassName}
                >
                  Edit
                </button>
              )}
            </div>
            <div className={cn('mt-2.5 p-3.5 min-[520px]:p-4', roomCardClassName)}>
              {matchSummaryItems.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {matchSummaryItems.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[12px] font-semibold leading-none',
                        index === 0 ? 'bg-[#ff5500]/10 text-[#ff5500]' : 'bg-ios-gray/[0.07] text-on-surface'
                      )}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] font-medium leading-[1.45] text-ios-gray">
                  Match format has not been configured yet.
                </p>
              )}
            </div>
          </section>

          {(!isHost || isMatchSetupConfigured) && (
            <section className={cn('p-3.5', roomCardClassName)}>
              {isHost && isMatchSetupConfigured && !canStartRoom && room.status === 'scheduled' ? (
                <div className="rounded-[18px] bg-[#fff7f2] px-4 py-3 text-center ring-1 ring-[#ff5500]/10">
                  <p className="text-[15px] font-semibold text-on-surface">Not ready to start</p>
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">
                    Need {playersNeeded} more player{playersNeeded === 1 ? '' : 's'} · {minimumProgressLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-ios-gray/82">{slotProgressLabel}</p>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-center text-[12px] font-semibold text-ios-gray">
                    {slotProgressLabel}
                  </p>
                  <button
                    type="button"
                    onClick={handleFooterAction}
                    disabled={footerDisabled}
                    className={cn(
                      'tap-target flex h-14 w-full min-w-0 items-center justify-center rounded-[18px] px-5 text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(230,94,20,0.22)] disabled:opacity-55 disabled:shadow-none',
                      canLeave && !isHost ? 'bg-on-surface' : 'bg-[#ff5500]'
                    )}
                  >
                    <span className="truncate">{canJoin ? 'Join this room' : footerLabel}</span>
                  </button>
                </>
              )}
            </section>
          )}

          {pricing.enabled && !isHost && isJoined && (
            <section>
              <div className="px-1">
                <p className={sectionLabelClassName}>Your Payment</p>
              </div>
              <div className={cn('mt-2.5 p-3.5 min-[520px]:p-4', roomCardClassName)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[19px] font-semibold leading-tight text-on-surface">{formatFinanceCurrency(currentAmountDue)}</h2>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">
                      {currentUserFinance ? 'Your host has set your current amount due.' : 'Public price is shown until the host updates payment details.'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em]',
                      currentPaymentStatus === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    )}
                  >
                    {currentPaymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {pricing.enabled && isHost && (
            <section>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className={sectionLabelClassName}>Host Finance</p>
                <HostOnlyBadge />
              </div>
              <div className={cn('mt-2.5 p-3.5 min-[520px]:p-4', roomCardClassName)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={cn(
                      'text-[18px] font-semibold leading-tight',
                      financeSummary
                        ? financeSummary.realizedProfit >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                        : 'text-on-surface'
                    )}>
                      {financeSummary
                        ? financeSummary.realizedProfit >= 0
                          ? `${formatFinanceCurrency(financeSummary.realizedProfit)} Profit`
                          : `${formatFinanceCurrency(Math.abs(financeSummary.realizedProfit))} Loss`
                        : 'Not calculated yet'}
                    </h2>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">
                      Based on joined players and payment status.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-primary/[0.08] text-primary">
                    <CircleDollarSign size={19} strokeWidth={2.3} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Cost', value: formatFinanceCurrency(financeSummary?.totalCost || 0) },
                    { label: 'Collected', value: formatFinanceCurrency(financeSummary?.totalPaid || 0) },
                    { label: 'Unpaid', value: formatFinanceCurrency(financeSummary?.totalUnpaid || 0) },
                    {
                      label: 'Projected P/L',
                      value: financeSummary
                        ? `${financeSummary.projectedProfit >= 0 ? '+' : '-'}${formatFinanceCurrency(Math.abs(financeSummary.projectedProfit))}`
                        : '-',
                      valueClassName: financeSummary
                        ? financeSummary.projectedProfit >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                        : 'text-on-surface',
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[17px] bg-ios-gray/[0.045] px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ios-gray/78">{item.label}</p>
                      <p className={cn('mt-1 truncate text-[13px] font-semibold text-on-surface', 'valueClassName' in item && item.valueClassName)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!pricing.enabled && isHost && (
            <section>
              <div className="flex items-center justify-between gap-3 px-1">
                <p className={sectionLabelClassName}>Payment Tracking</p>
                <HostOnlyBadge />
              </div>
              <div className={cn('mt-2.5 p-3.5 min-[520px]:p-4', roomCardClassName)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-semibold leading-tight text-on-surface">Pricing is off</h2>
                    <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ios-gray">
                      Turn on pricing to mark players as External/Friend and Paid/Unpaid.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-primary/[0.08] text-primary">
                    <CircleDollarSign size={19} strokeWidth={2.3} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditRoom}
                  className="tap-target mt-3 flex h-11 w-full items-center justify-center rounded-[16px] bg-primary text-[13px] font-semibold text-white"
                >
                  Edit Pricing
                </button>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3 px-1">
              <p className={sectionLabelClassName}>Participants</p>
              {isHost && <HostOnlyBadge label="Host controls" />}
            </div>
            <div className={cn('mt-2.5 overflow-hidden', roomCardClassName)}>
              <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-semibold leading-tight text-on-surface">
                    {visibleParticipants.length} player{visibleParticipants.length === 1 ? '' : 's'}
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium leading-snug text-ios-gray">
                    {maxPlayers
                      ? `${emptySlotCount} empty · ${visibleParticipants.length}/${maxPlayers} filled`
                      : 'No capacity limit'}
                  </p>
                </div>
                {room.status === 'scheduled' && hasOpenSlot && (
                  <span className="inline-flex rounded-full bg-[#ff5500]/[0.08] px-3 py-2 text-[12px] font-semibold text-[#ff5500]">
                    Open
                  </span>
                )}
              </div>

            {isHost && usesParticipantDraft && hasParticipantDraftChanges && (
              <div className="mx-4 mb-3 rounded-[18px] bg-[#fff7f2] p-3 ring-1 ring-[#ff5500]/10">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5500]" />
                  <p className="text-[12px] font-semibold leading-snug text-[#9a4a1c]">
                    Participant changes are not saved yet.
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-[0.7fr_1fr] gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardParticipantDraft}
                    disabled={isSavingParticipantDraft}
                    className="tap-target h-10 rounded-[14px] bg-white text-[12px] font-semibold text-ios-gray ring-1 ring-black/[0.05] disabled:opacity-55"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveParticipantDraft()}
                    disabled={isSavingParticipantDraft}
                    className="tap-target h-10 rounded-[14px] bg-[#ff5500] text-[12px] font-semibold text-white shadow-[0_10px_20px_rgba(255,85,0,0.18)] disabled:opacity-55 disabled:shadow-none"
                  >
                    {isSavingParticipantDraft ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            <div>
              {visibleParticipants.map((participant, index) => {
                  const participantIsHost = (
                    participant.uid === room.hostUid ||
                    participant.id === room.hostUid ||
                    participant.source === 'host'
                  );
                  const hideHostPaymentControls = participantIsHost && roomFinance?.includeHostInFriendSplit === false;
                  const isParticipantJoined = participant.status === 'joined';
                  const canEditParticipantPayment = isHost && pricing.enabled && isParticipantJoined && !hideHostPaymentControls;
                  const finance = financeByParticipantId.get(participant.id);
                  const playerType = finance?.playerType || (participantIsHost ? 'friend' : 'external');
                  const paymentStatus = finance?.paymentStatus || 'unpaid';
                  const amountDue = finance?.amountDue ?? (playerType === 'external' ? pricing.publicPrice : 0);
                  const isPaymentExpanded = expandedPaymentParticipantIds.has(participant.id);
                  const ratingLabel = participant.source !== 'manual' && typeof participant.rating === 'number'
                    ? `${formatDisplayMmr(participant.rating)} MMR`
                    : '';
                  const participantAvatar = participant.avatar ||
                    (
                      currentUserPhotoURL &&
                      (participant.uid === currentUserUid || participant.id === currentUserUid)
                        ? currentUserPhotoURL
                        : ''
                    );
                  return (
                    <div key={participant.id} className="border-t border-black/[0.045] px-4 py-3">
                      <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                        <div className={cn('relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-[16px] font-black', getAvatarTone(participant, index))}>
                          {participantAvatar ? (
                            <img
                              src={participantAvatar}
                              alt={participant.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getParticipantInitials(participant)
                          )}
                          {participantIsHost && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#ff5500] text-white">
                              <Sparkles size={11} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-[15px] font-semibold text-on-surface">
                              {participant.displayName}
                            </p>
                            {participantIsHost && (
                              <span className="shrink-0 rounded-full bg-[#ff5500]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#ff5500]">
                                Host
                              </span>
                            )}
                            {ratingLabel && (
                              <span className="shrink-0 rounded-full bg-ios-gray/[0.055] px-2 py-0.5 text-[10px] font-semibold text-ios-gray">
                                {ratingLabel}
                              </span>
                            )}
                          </div>
                          {canEditParticipantPayment && (
                            <button
                              type="button"
                              onClick={() => togglePaymentControls(participant.id)}
                              className={cn(
                                'tap-target mt-2 flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-ios-gray/[0.045] px-2.5 py-1.5 text-left ring-1 ring-black/[0.025] transition-colors',
                                isPaymentExpanded && 'bg-white ring-black/[0.08]'
                              )}
                              aria-expanded={isPaymentExpanded}
                              aria-label={`Edit payment for ${participant.displayName}`}
                            >
                              <span className="shrink-0 text-[10px] font-semibold text-on-surface">
                                {formatFinanceCurrency(amountDue)}
                              </span>
                              <span className="shrink-0 text-ios-gray/50">·</span>
                              <span className={cn(
                                'min-w-0 truncate text-[10px] font-semibold',
                                playerType === 'external' ? 'text-on-surface' : 'text-ios-gray'
                              )}>
                                {playerType === 'external' ? 'External price' : 'Friend split'}
                              </span>
                              <span className="shrink-0 text-ios-gray/50">·</span>
                              <span className={cn(
                                'shrink-0 text-[10px] font-semibold',
                                paymentStatus === 'paid' ? 'text-emerald-700' : 'text-ios-gray'
                              )}>
                                {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                              </span>
                              <ChevronDown
                                size={12}
                                strokeWidth={2.5}
                                className={cn('shrink-0 text-ios-gray transition-transform', isPaymentExpanded && 'rotate-180 text-on-surface')}
                              />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          {isHost && !participantIsHost && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(participant)}
                              className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-ios-gray/[0.04] text-ios-gray ring-1 ring-black/[0.035] transition-colors hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-100"
                              aria-label={`Remove ${participant.displayName}`}
                            >
                              <Trash2 size={14} strokeWidth={2.35} />
                            </button>
                          )}
                        </div>
                      </div>

                      {canEditParticipantPayment && isPaymentExpanded && (
                        <div className="mt-3 rounded-[16px] bg-ios-gray/[0.03] p-2.5 ring-1 ring-black/[0.025]">
                          {(() => {
                            const controlsDisabled = isSavingParticipantDraft || (!usesParticipantDraft && !onUpdateParticipantFinance);

                            return (
                              <>
                                <div className="flex items-center justify-between gap-2 px-0.5">
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-ios-gray">Payment</p>
                                    <p className="mt-0.5 truncate text-[11px] font-medium text-ios-gray/82">
                                      {playerType === 'external'
                                        ? 'External price uses the public player fee.'
                                        : 'Friend split divides court and ball cost evenly.'}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-[12px] font-semibold text-on-surface">{formatFinanceCurrency(amountDue)}</p>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                  <PaymentMiniToggle
                                    checked={playerType === 'external'}
                                    label={playerType === 'external' ? 'External' : 'Friend split'}
                                    disabled={controlsDisabled}
                                    onClick={() => handleUpdateDraftParticipantFinance(participant.id, {
                                      playerType: playerType === 'external' ? 'friend' : 'external',
                                    })}
                                  />
                                  <PaymentMiniToggle
                                    checked={paymentStatus === 'paid'}
                                    label={paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                    disabled={controlsDisabled}
                                    tone="green"
                                    onClick={() => handleUpdateDraftParticipantFinance(participant.id, {
                                      paymentStatus: paymentStatus === 'paid' ? 'unpaid' : 'paid',
                                    })}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
              })}
              {emptySlots.map((slotNumber) => (
                <button
                  key={`empty-slot-${slotNumber}`}
                  type="button"
                  disabled={!isHost}
                  onClick={() => setIsAddSlotPickerOpen(true)}
                  className={cn(
                    'tap-target grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-t border-black/[0.045] px-4 py-3 text-left',
                    isHost ? 'transition-colors active:bg-[#ff5500]/[0.025]' : 'cursor-default'
                  )}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-ios-gray/30 bg-ios-gray/[0.025] text-ios-gray">
                    <Plus size={18} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-on-surface/72">
                      Open slot
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium text-ios-gray">
                      {isHost ? 'Tap to add' : 'Available'}
                    </span>
                  </span>
                  {isHost && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-gray/[0.045] text-ios-gray ring-1 ring-black/[0.025]">
                      <UserPlus size={14} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            </div>
          </section>

        </div>
      </main>

      <AnimatePresence>
        {isAddSlotPickerOpen && (
          <div className="fixed inset-0 z-[154] flex items-end justify-center">
            <motion.button
              type="button"
              aria-label="Close add player options"
              className="absolute inset-0 bg-black/38 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddSlotPickerOpen(false)}
            />
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 330 }}
              className="relative w-full max-w-md rounded-t-[30px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ios-gray/20" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ios-gray/78">Open Slot</p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-on-surface">Add player</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSlotPickerOpen(false)}
                  className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.08] text-on-surface"
                  aria-label="Close"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSlotPickerOpen(false);
                    setIsAddPlayerOpen(true);
                  }}
                  className="tap-target flex items-center gap-3 rounded-[20px] bg-ios-gray/[0.035] p-3 text-left ring-1 ring-black/[0.03]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.055] text-[#ff5500] ring-1 ring-black/[0.025]">
                    <UserPlus size={18} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-on-surface">Manual player</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-ios-gray">Add a guest or external player.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSlotPickerOpen(false);
                    setIsFriendPickerOpen(true);
                  }}
                  className="tap-target flex items-center gap-3 rounded-[20px] bg-ios-gray/[0.035] p-3 text-left ring-1 ring-black/[0.03]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.055] text-[#ff5500] ring-1 ring-black/[0.025]">
                    <Users size={18} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-on-surface">FOM friend</span>
                    <span className="mt-0.5 block text-[12px] font-medium text-ios-gray">Pick from your friend list.</span>
                  </span>
                </button>
              </div>
            </motion.section>
          </div>
        )}

        {isFriendPickerOpen && (
          <div className="fixed inset-0 z-[155] flex items-end justify-center">
            <motion.button
              type="button"
              aria-label="Close friend picker"
              className="absolute inset-0 bg-black/42 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFriendPickerOpen(false)}
            />
            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 330 }}
              className="relative max-h-[78vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-4 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ios-gray/20" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ios-gray/72">Invite Friends</p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-on-surface">Add From Friends</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFriendPickerOpen(false)}
                  className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.08] text-on-surface"
                  aria-label="Close"
                >
                  <X size={19} strokeWidth={2.4} />
                </button>
              </div>

              <div className="mt-4">
                {loadingFriends ? (
                  <div className="rounded-[20px] bg-ios-gray/[0.035] px-4 py-6 text-center text-[13px] font-medium text-ios-gray">
                    Loading friends...
                  </div>
                ) : availableFriends.length === 0 ? (
                  <div className="rounded-[20px] bg-ios-gray/[0.035] px-4 py-6 text-center">
                    <p className="text-[14px] font-medium text-on-surface">No friends available</p>
                    <p className="mt-1 text-[12px] font-medium text-ios-gray">Friends already in this room are hidden.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.045]">
                    {availableFriends.map((friend) => (
                      <button
                        key={friend.uid}
                        type="button"
                        onClick={() => handleAddFriendParticipant(friend)}
                        className="tap-target flex w-full items-center gap-3 border-b border-black/[0.045] px-3 py-3 text-left last:border-b-0 active:bg-ios-gray/[0.025]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/[0.055] text-[15px] font-medium text-[#ff5500] ring-1 ring-black/[0.025]">
                          {friend.photoURL ? (
                            <img src={friend.photoURL} alt={friend.displayName || friend.username || 'Friend'} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(friend.displayName || friend.username || 'Friend')
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-on-surface">{friend.displayName || friend.username || 'Friend'}</p>
                          <p className="mt-0.5 text-[12px] font-medium text-ios-gray">
                            {typeof friend.mmr === 'number' ? `${formatDisplayMmr(friend.mmr)} MMR` : 'FOM friend'}
                          </p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.045] text-ios-gray ring-1 ring-black/[0.025]">
                          <Plus size={16} strokeWidth={2.4} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <AddPlayerModal
        isOpen={isAddPlayerOpen}
        onClose={() => setIsAddPlayerOpen(false)}
        onAdd={handleAddManualParticipant}
      />
    </div>
  );
};
