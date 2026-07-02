import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, CircleDollarSign, Globe2, Lock, MapPin, Minus, Plus, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Friend, type MatchFormat, type Player, type RankingCriteria, type ScoringType } from '../../types';
import { AddPlayerModal } from '../matches/AddPlayerModal';
import { MatchSettingsWizardShell } from '../matches/MatchSettingsWizardShell';
import { MATCH_SETTINGS_WIZARD_CLASSNAMES } from '../matches/matchSettingsStyles';
import { useMatchSettingsFriends } from '../matches/useMatchSettingsFriends';
import { getRoomPublicPricing } from './roomFinance';
import type { Room, RoomFinancePrivate, RoomParticipant } from './types';

const toDateInputValue = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const toTimeInputValue = (timestamp: number) => {
  try {
    const date = new Date(timestamp);
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(11, 16);
  } catch {
    return '';
  }
};

const getInitials = (name: string) => (
  String(name || 'Player')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PL'
);

const getFriendAvatarStyle = (seed: string, index: number) => {
  const palette = [
    { backgroundColor: '#2563eb', color: '#ffffff' },
    { backgroundColor: '#16a085', color: '#ffffff' },
    { backgroundColor: '#6b7280', color: '#ffffff' },
    { backgroundColor: '#9333ea', color: '#ffffff' },
    { backgroundColor: '#111827', color: '#ffffff' },
    { backgroundColor: '#e65e14', color: '#ffffff' },
  ];
  const hash = String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), index);
  return palette[Math.abs(hash) % palette.length];
};

const clampNumericInput = (value: string, min: number, max: number) => {
  const parsed = Number(value.replace(/[^\d]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

const parseMoneyInput = (value: string) => {
  const normalized = Number(String(value).replace(/[^\d]/g, ''));
  return Number.isFinite(normalized) ? normalized : 0;
};

const formatMoneyInput = (value: number) => (
  value > 0
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
    : ''
);

const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.floor(Number(amount) || 0)))
);

const equationRowClassName = 'grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[12px] font-semibold leading-relaxed';

const EquationRow = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'profit' | 'loss';
}) => (
  <div className={cn(
    equationRowClassName,
    tone === 'profit' ? 'text-emerald-700' : tone === 'loss' ? 'text-rose-700' : 'text-ios-gray'
  )}>
    <span className="min-w-0">{label}</span>
    <span className="shrink-0 text-right font-black tabular-nums">{value}</span>
  </div>
);

const e2eFriends: Friend[] = [
  { uid: 'e2e-friend-aditya', displayName: 'Aditya Avif', mmr: 1510 },
  { uid: 'e2e-friend-anggahardy', displayName: 'Anggahardy P', mmr: 1490 },
  { uid: 'e2e-friend-audra', displayName: 'Audra Nblk', mmr: 1460 },
  { uid: 'e2e-friend-carolus', displayName: 'Carolus N', mmr: 1435 },
  { uid: 'e2e-friend-daffa', displayName: 'Daffa Ulil', mmr: 1525 },
  { uid: 'e2e-friend-genta', displayName: 'Genta R', mmr: 1505 },
];

const buildFriendParticipant = (friend: Friend): RoomParticipant => ({
  id: friend.uid,
  uid: friend.uid,
  playerId: friend.uid,
  displayName: friend.displayName || friend.username || 'Friend',
  avatar: friend.photoURL || '',
  initials: getInitials(friend.displayName || friend.username || 'Friend'),
  rating: Number(friend.mmr || 0),
  source: 'fom',
  status: 'invited',
  invitedAt: Date.now(),
});

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

export const RoomEditorScreen = ({
  mode = 'create',
  editingRoom,
  roomFinance,
  isSaving,
  currentUser,
  onBack,
  onSave,
  onUpdate,
  onOpenCreatedRoom,
  onOpenUpdatedRoom,
}: {
  mode?: 'create' | 'edit';
  editingRoom?: Room | null;
  roomFinance?: RoomFinancePrivate | null;
  isSaving: boolean;
  currentUser?: any;
  onBack: () => void;
  onSave: (input: {
    title: string;
    description: string;
    visibility: 'private' | 'friends' | 'public';
    scheduledFor: number;
    format: MatchFormat;
    criteria: RankingCriteria;
    scoringType?: ScoringType;
    courts: number;
    numRounds: number;
    durationMinutes: number;
    maxPlayers: number;
    venueName: string;
    location: string;
    feeEnabled: boolean;
    feeAmount: number;
    courtCostPerCourt: number;
    ballCost: number;
    publicPrice: number;
    includeHostInFriendSplit: boolean;
    invitedParticipants: RoomParticipant[];
  }) => Promise<Room>;
  onUpdate?: (input: {
    title: string;
    description: string;
    visibility: Room['visibility'];
    scheduledFor: number;
    venueName: string;
    location: string;
    maxPlayers: number;
    pricingEnabled: boolean;
    courtCount: number;
    courtCostPerCourt: number;
    ballCost: number;
    publicPrice: number;
    includeHostInFriendSplit: boolean;
  }) => Promise<void> | void;
  onOpenCreatedRoom: (room: Room) => void;
  onOpenUpdatedRoom?: () => void;
}) => {
  const isEditMode = mode === 'edit' && Boolean(editingRoom);
  const editingPricing = editingRoom ? getRoomPublicPricing(editingRoom) : null;
  const defaultSchedule = editingRoom?.scheduledFor || Date.now() + (2 * 24 * 60 * 60 * 1000);
  const [settingsStep, setSettingsStep] = useState(0);
  const [title, setTitle] = useState(editingRoom?.title || '');
  const [description, setDescription] = useState(editingRoom?.description || '');
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>(editingRoom?.visibility || 'friends');
  const [maxPlayers, setMaxPlayers] = useState(Number(editingRoom?.maxPlayers || 8));
  const [courtCount, setCourtCount] = useState(Number(roomFinance?.courtCount || editingRoom?.settings.courts || 2));
  const [hasEditedCourtCount, setHasEditedCourtCount] = useState(isEditMode);
  const [dateInput, setDateInput] = useState(() => toDateInputValue(defaultSchedule));
  const [timeInput, setTimeInput] = useState(() => toTimeInputValue(defaultSchedule));
  const [venueName, setVenueName] = useState(editingRoom?.settings.venueName || '');
  const [location, setLocation] = useState(editingRoom?.settings.location || '');
  const [feeEnabled, setFeeEnabled] = useState(Boolean(editingPricing?.enabled));
  const [feeAmountInput, setFeeAmountInput] = useState(() => formatMoneyInput(Number(editingPricing?.publicPrice || 0)));
  const [courtCostPerCourtInput, setCourtCostPerCourtInput] = useState(() => formatMoneyInput(Number(roomFinance?.courtCostPerCourt || 0)));
  const [ballCostInput, setBallCostInput] = useState(() => formatMoneyInput(Number(roomFinance?.ballCost || 0)));
  const [includeHostInFriendSplit, setIncludeHostInFriendSplit] = useState(roomFinance?.includeHostInFriendSplit ?? true);
  const [selectedFriendUids, setSelectedFriendUids] = useState<string[]>([]);
  const [manualPlayers, setManualPlayers] = useState<Player[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const settingsUserUid = currentUser?.uid;
  const { friends, loadingFriends } = useMatchSettingsFriends(settingsUserUid);
  const visibleFriends = settingsUserUid === 'e2e-user' && friends.length === 0 ? e2eFriends : friends;

  const scheduledFor = useMemo(() => {
    const parsed = new Date(`${dateInput}T${timeInput || '00:00'}`).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }, [dateInput, timeInput]);

  const feeAmount = useMemo(() => parseMoneyInput(feeAmountInput), [feeAmountInput]);
  const courtCostPerCourt = useMemo(() => parseMoneyInput(courtCostPerCourtInput), [courtCostPerCourtInput]);
  const ballCost = useMemo(() => parseMoneyInput(ballCostInput), [ballCostInput]);
  const suggestedCourtCount = Math.max(1, Math.ceil(maxPlayers / 4));
  const totalCourtCost = feeEnabled ? courtCostPerCourt * courtCount : 0;
  const totalCost = totalCourtCost + (feeEnabled ? ballCost : 0);
  const friendSplitCount = Math.max(1, includeHostInFriendSplit ? maxPlayers : maxPlayers - 1);
  const friendEstimate = feeEnabled && totalCost > 0 ? Math.ceil(totalCost / friendSplitCount) : 0;
  const projectedPayingPlayerCount = Math.max(0, includeHostInFriendSplit ? maxPlayers - 1 : maxPlayers);
  const hostRevenueExclusion = includeHostInFriendSplit ? feeAmount : 0;
  const projectedGrossRevenue = feeEnabled ? feeAmount * maxPlayers : 0;
  const projectedPublicRevenue = feeEnabled ? feeAmount * projectedPayingPlayerCount : 0;
  const projectedProfit = projectedPublicRevenue - totalCost;

  const handleMoneyInputChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(formatMoneyInput(parseMoneyInput(value)));
  };

  const selectedFriends = useMemo(
    () => visibleFriends.filter((friend) => selectedFriendUids.includes(friend.uid)),
    [selectedFriendUids, visibleFriends]
  );

  const invitedParticipants = useMemo(
    () => [
      ...selectedFriends.map(buildFriendParticipant),
      ...manualPlayers.map(buildManualParticipant),
    ],
    [manualPlayers, selectedFriends]
  );

  const canContinueDetail = title.trim().length > 0;
  const canContinueVenue = (isEditMode ? scheduledFor > 0 : scheduledFor > Date.now()) && venueName.trim().length > 0;
  const canContinuePricing = !feeEnabled || (courtCount > 0 && courtCostPerCourt > 0 && feeAmount > 0);
  const isReady = canContinueDetail && canContinueVenue;
  const canContinue = settingsStep === 0
    ? canContinueDetail
    : settingsStep === 1
      ? canContinueVenue
      : settingsStep === 2
        ? canContinuePricing
        : isReady && canContinuePricing;

  const wizardSteps = isEditMode
    ? [
        { label: 'detail', context: 'Room Details' },
        { label: 'venue', context: 'Time & Venue' },
        { label: 'pricing', context: 'Pricing' },
      ]
    : [
        { label: 'detail', context: 'Room Details' },
        { label: 'venue', context: 'Time & Venue' },
        { label: 'pricing', context: 'Pricing' },
        { label: 'friends', context: 'Invite Friends' },
      ];
  const ctaLabel = settingsStep === wizardSteps.length - 1
    ? (isSaving ? (isEditMode ? 'Saving changes...' : 'Creating room...') : (isEditMode ? 'Save Changes' : 'Create Room'))
    : 'Continue';
  const statusLabel = settingsStep === 0
    ? 'Add a room name first.'
    : settingsStep === 1
      ? 'Complete the time and venue.'
      : settingsStep === 2
        ? 'Add court cost and public price, or turn pricing off.'
        : 'The room details are not complete yet.';

  const toggleFriend = (friend: Friend) => {
    setSelectedFriendUids((prev) => (
      prev.includes(friend.uid)
        ? prev.filter((uid) => uid !== friend.uid)
        : [...prev, friend.uid]
    ));
  };

  const handleAddManualPlayer = (player: Player) => {
    setManualPlayers((prev) => (
      prev.some((item) => item.id === player.id) ? prev : [...prev, player]
    ));
    setIsAddModalOpen(false);
  };

  useEffect(() => {
    if (hasEditedCourtCount) return;
    setCourtCount(suggestedCourtCount);
  }, [hasEditedCourtCount, suggestedCourtCount]);

  const handleSubmit = async () => {
    if (!isReady || isSaving) return;
    setSubmitError(null);
    try {
      if (isEditMode) {
        await onUpdate?.({
          title: title.trim(),
          description: description.trim(),
          visibility,
          scheduledFor,
          venueName: venueName.trim(),
          location: location.trim(),
          maxPlayers,
          pricingEnabled: feeEnabled,
          courtCount,
          courtCostPerCourt: feeEnabled ? courtCostPerCourt : 0,
          ballCost: feeEnabled ? ballCost : 0,
          publicPrice: feeEnabled ? feeAmount : 0,
          includeHostInFriendSplit,
        });
        onOpenUpdatedRoom?.();
        return;
      }

      const nextRoom = await onSave({
        title: title.trim(),
        description: description.trim(),
        visibility,
        scheduledFor,
        format: 'Mexicano',
        criteria: 'Matches Won',
        scoringType: undefined,
        courts: courtCount,
        numRounds: 8,
        durationMinutes: 120,
        maxPlayers,
        venueName: venueName.trim(),
        location: location.trim(),
        feeEnabled,
        feeAmount: feeEnabled ? feeAmount : 0,
        courtCostPerCourt: feeEnabled ? courtCostPerCourt : 0,
        ballCost: feeEnabled ? ballCost : 0,
        publicPrice: feeEnabled ? feeAmount : 0,
        includeHostInFriendSplit,
        invitedParticipants,
      });
      setCreatedRoom(nextRoom);
      setIsSuccess(true);
    } catch (err) {
      console.error('Room editor submit error:', err);
      setSubmitError(isEditMode
        ? 'We could not save this room yet. Please try again.'
        : 'We could not create this room yet. Please try again.');
    }
  };

  const goToNext = () => {
    if (!canContinue || isSaving) return;
    if (settingsStep < wizardSteps.length - 1) {
      setSettingsStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
      return;
    }
    void handleSubmit();
  };

  useEffect(() => {
    if (!isSuccess) return undefined;
    const redirectId = window.setTimeout(() => {
      if (createdRoom) {
        onOpenCreatedRoom(createdRoom);
        return;
      }
      onBack();
    }, 2700);

    return () => window.clearTimeout(redirectId);
  }, [createdRoom, isSuccess, onBack, onOpenCreatedRoom]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-7 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+72px)]">
          <section className="flex flex-1 flex-col items-center justify-center pb-14 text-center">
            <div aria-hidden="true" className="relative mb-9 h-[176px] w-full max-w-[286px] overflow-hidden">
              <div className="absolute inset-x-10 top-1/2 h-px bg-primary/12" />
              <motion.div
                className="absolute left-[54px] top-[58px] h-[74px] w-[48px]"
                animate={{ rotate: [-18, -8, -18], y: [0, -3, 0] }}
                transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute left-1 top-0 h-[48px] w-[38px] rotate-[-18deg] rounded-full border-[5px] border-on-surface bg-white shadow-[0_10px_22px_rgba(15,23,42,0.08)]" />
                <div className="absolute left-[25px] top-[42px] h-[36px] w-[9px] rotate-[-18deg] rounded-full bg-on-surface" />
                <div className="absolute left-[27px] top-[60px] h-[18px] w-[13px] rotate-[-18deg] rounded-full bg-primary" />
              </motion.div>
              <motion.div
                className="absolute right-[54px] top-[58px] h-[74px] w-[48px]"
                animate={{ rotate: [18, 8, 18], y: [0, 3, 0] }}
                transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut', delay: 0.72 }}
              >
                <div className="absolute right-1 top-0 h-[48px] w-[38px] rotate-[18deg] rounded-full border-[5px] border-primary bg-white shadow-[0_10px_22px_rgba(230,94,20,0.12)]" />
                <div className="absolute right-[25px] top-[42px] h-[36px] w-[9px] rotate-[18deg] rounded-full bg-primary" />
                <div className="absolute right-[27px] top-[60px] h-[18px] w-[13px] rotate-[18deg] rounded-full bg-on-surface" />
              </motion.div>
              <motion.div
                className="absolute left-[76px] top-[78px] h-4 w-4 rounded-full bg-primary shadow-[0_0_18px_rgba(230,94,20,0.42)]"
                animate={{ x: [0, 126, 0], y: [0, -16, 0], scale: [1, 0.9, 1] }}
                transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-x-9 bottom-8 h-1 rounded-full bg-primary/10" />
            </div>

            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Room created</p>
            <h1 className="max-w-[300px] text-[32px] font-extrabold leading-[1.04] text-on-surface">
              Congratulations, your room is ready.
            </h1>
            <p className="mt-3 max-w-[310px] text-[15px] font-medium leading-[1.48] text-ios-gray">
              You successfully created {title.trim() || 'your room'}. Play with your friends and make every point more competitive on court.
            </p>
            <p className="mt-6 text-[12px] font-semibold text-ios-gray/78">Opening your room...</p>
          </section>

          <button
            type="button"
            onClick={() => (createdRoom ? onOpenCreatedRoom(createdRoom) : onBack())}
            className="tap-target mt-auto flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(255,85,1,0.18)]"
          >
            View Room
          </button>
        </main>
      </div>
    );
  }

  return (
    <MatchSettingsWizardShell
      settingsStep={settingsStep}
      wizardSteps={wizardSteps}
      currentStepContext={wizardSteps[settingsStep]?.context || wizardSteps[0].context}
      ctaLabel={ctaLabel}
      ctaDisabled={!canContinue || isSaving}
      statusLabel={statusLabel}
      showStatusLabel={!canContinue}
      onBack={onBack}
      onGoToStep={setSettingsStep}
      onNext={goToNext}
      modalSlot={(
        <AnimatePresence>
          {isAddModalOpen && (
            <AddPlayerModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onAdd={handleAddManualPlayer}
            />
          )}
          {isFriendPickerOpen && (
            <div className="fixed inset-0 z-[155] flex items-end justify-center sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFriendPickerOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                className="relative w-full max-w-md rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl sm:rounded-[32px]"
              >
                <div className="mx-auto h-1.5 w-14 rounded-full bg-ios-gray/20" />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Choose friends</h3>
                    <p className="mt-1 text-[13px] font-medium text-ios-gray">Select players you want to invite.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFriendPickerOpen(false)}
                    className="tap-target flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-surface"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-5 max-h-[55vh] overflow-y-auto">
                  {loadingFriends && visibleFriends.length === 0 ? (
                    <div className="rounded-[20px] bg-surface p-4 text-[13px] font-semibold text-ios-gray">Loading friends...</div>
                  ) : visibleFriends.length === 0 ? (
                    <div className="rounded-[20px] bg-surface p-4">
                      <p className="text-[14px] font-bold text-on-surface">No friends yet</p>
                      <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">You can still share the room link after it is created.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleFriends.map((friend, index) => {
                        const selected = selectedFriendUids.includes(friend.uid);
                        const displayName = friend.displayName || friend.username || 'Friend';
                        return (
                          <button
                            key={friend.uid}
                            type="button"
                            onClick={() => toggleFriend(friend)}
                            className="tap-target flex w-full items-center gap-3 rounded-[20px] bg-surface px-3.5 py-3 text-left"
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[14px] font-black"
                              style={getFriendAvatarStyle(displayName, index)}
                            >
                              {friend.photoURL ? (
                                <img src={friend.photoURL} alt={displayName} className="h-full w-full object-cover" />
                              ) : (
                                getInitials(displayName)
                              )}
                            </div>
                            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-on-surface">{displayName}</span>
                            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', selected ? 'bg-primary text-white' : 'bg-white text-primary')}>
                              {selected ? <Check size={15} strokeWidth={2.6} /> : <Plus size={16} strokeWidth={2.5} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFriendPickerOpen(false)}
                  className="tap-target mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-black text-white"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
    >
      {settingsStep === 0 && (
        <section className="space-y-6 pb-28">
          <div className={MATCH_SETTINGS_WIZARD_CLASSNAMES.heading}>
            <h2 className={MATCH_SETTINGS_WIZARD_CLASSNAMES.title}>Room details.</h2>
            <p className={MATCH_SETTINGS_WIZARD_CLASSNAMES.subtitle}>Name, description, and who can join this room.</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Room Name *</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Friday Sunset Match"
                className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'outline-none placeholder:font-normal placeholder:text-on-surface/40')}
              />
            </label>

            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Description (Optional)</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Friendly mix game, all levels welcome."
                rows={3}
                className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'h-auto min-h-[88px] resize-none items-start rounded-[28px] py-4 outline-none placeholder:font-normal placeholder:text-on-surface/40')}
              />
            </label>

            <section>
              <p className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Who Can Join?</p>
              <div className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.softPanel, 'space-y-2')}>
                {[
                  {
                    value: 'private' as const,
                    label: 'Private',
                    description: 'Hidden from discovery. Join is by direct share only.',
                    icon: Lock,
                  },
                  {
                    value: 'friends' as const,
                    label: 'Friends',
                    description: 'Visible to your FOM friends before match day.',
                    icon: Users,
                  },
                  {
                    value: 'public' as const,
                    label: 'Public',
                    description: 'Listed in Public rooms for anyone on FOM.',
                    icon: Globe2,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        'tap-target flex w-full items-center gap-3 rounded-[20px] border px-3 py-2.5 text-left transition-all',
                        active ? 'border-primary bg-primary text-white' : 'border-transparent bg-white text-on-surface'
                      )}
                    >
                      <span className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px]',
                        active ? 'bg-white/14 text-white' : 'bg-ios-gray/[0.04] text-on-surface'
                      )}>
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-tight">{option.label}</span>
                        <span className={cn(
                          'mt-0.5 block text-[11px] font-medium leading-[1.34]',
                          active ? 'text-white/78' : 'text-ios-gray'
                        )}>
                          {option.description}
                        </span>
                      </span>
                      {active && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                          <Check size={14} strokeWidth={2.6} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[26px] bg-ios-gray/[0.03] p-4">
              <div className="rounded-[20px] bg-white px-4 py-3.5">
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface">Player slots</p>
                    <p className="mt-1 text-[12px] font-medium leading-[1.45] text-ios-gray">Maximum players who can join this room.</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMaxPlayers((prev) => Math.max(4, prev - 1))}
                      className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-[#fbfbfd] text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={4}
                      max={24}
                      value={maxPlayers}
                      aria-label="Player slots value"
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        if (event.target.value.trim() === '') return;
                        const nextValue = clampNumericInput(event.target.value, 4, 24);
                        if (nextValue !== null) setMaxPlayers(nextValue);
                      }}
                      className="h-9 w-12 rounded-[12px] border border-transparent bg-transparent text-center text-[20px] font-bold tracking-[-0.03em] text-on-surface outline-none transition-all focus:border-primary/20 focus:bg-primary/[0.06] focus:ring-2 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxPlayers((prev) => Math.min(24, prev + 1))}
                      className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-[#fbfbfd] text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      )}

      {settingsStep === 1 && (
        <section className="space-y-7">
          <div className={MATCH_SETTINGS_WIZARD_CLASSNAMES.heading}>
            <h2 className={MATCH_SETTINGS_WIZARD_CLASSNAMES.title}>When and where?</h2>
            <p className={MATCH_SETTINGS_WIZARD_CLASSNAMES.subtitle}>Date, time, and where you’ll play.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Date *</span>
              <div className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'pr-4')}>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Time</span>
              <div className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'pr-4')}>
                <input
                  type="time"
                  value={timeInput}
                  onChange={(event) => setTimeInput(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-medium outline-none"
                />
              </div>
            </label>
          </div>

          <div className="space-y-6">
            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Venue / Court Name *</span>
              <div className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'gap-3.5')}>
                <MapPin size={20} strokeWidth={2.1} className="shrink-0 text-on-surface/38" />
                <input
                  type="text"
                  value={venueName}
                  onChange={(event) => setVenueName(event.target.value)}
                  placeholder="FOM Court Senayan"
                  className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-on-surface/40"
                />
              </div>
            </label>

            <label className="block">
              <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>City / Area</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Jakarta Selatan"
                className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'outline-none placeholder:font-normal placeholder:text-on-surface/40')}
              />
            </label>
          </div>

        </section>
      )}

      {settingsStep === 2 && (
        <section className="space-y-7 pb-28">
          <div className={MATCH_SETTINGS_WIZARD_CLASSNAMES.heading}>
            <h2 className={MATCH_SETTINGS_WIZARD_CLASSNAMES.title}>Set pricing.</h2>
            <p className={MATCH_SETTINGS_WIZARD_CLASSNAMES.subtitle}>Make the public price clear and keep your host costs easy to track.</p>
          </div>

          <section className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.softPanel, 'bg-white ring-1 ring-black/5')}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-primary/[0.08] text-primary">
                  <CircleDollarSign size={19} strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-on-surface">Pricing</p>
                  <p className="mt-1 text-[14px] font-medium leading-[1.42] text-ios-gray">Set public price and host cost tracking.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeeEnabled((prev) => !prev)}
                className={cn(
                  'tap-target flex h-12 w-[72px] items-center rounded-full p-1 transition-colors',
                  feeEnabled ? 'justify-end bg-primary' : 'justify-start bg-ios-gray/15'
                )}
                aria-pressed={feeEnabled}
              >
                <span className="h-10 w-10 rounded-full bg-white shadow-[0_1px_3px_rgba(17,24,39,0.12)]" />
              </button>
            </div>
            {feeEnabled && (
              <div className="mt-5 space-y-4">
                <section className="rounded-[20px] bg-ios-gray/[0.035] px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-on-surface">Number of Courts</p>
                      <p className="mt-1 text-[12px] font-semibold leading-[1.42] text-ios-gray">
                        Suggested {suggestedCourtCount} for {maxPlayers} player slots.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHasEditedCourtCount(true);
                          setCourtCount((prev) => Math.max(1, prev - 1));
                        }}
                        className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-white text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={24}
                        value={courtCount}
                        aria-label="Number of courts"
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => {
                          if (event.target.value.trim() === '') return;
                          const nextValue = clampNumericInput(event.target.value, 1, 24);
                          if (nextValue !== null) {
                            setHasEditedCourtCount(true);
                            setCourtCount(nextValue);
                          }
                        }}
                        className="h-9 w-12 rounded-[12px] border border-transparent bg-transparent text-center text-[20px] font-bold tracking-[-0.03em] text-on-surface outline-none transition-all focus:border-primary/20 focus:bg-primary/[0.06] focus:ring-2 focus:ring-primary/10"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHasEditedCourtCount(true);
                          setCourtCount((prev) => Math.min(24, prev + 1));
                        }}
                        className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-white text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Court Cost / Court</span>
	                    <input
	                      type="text"
	                      inputMode="numeric"
	                      value={courtCostPerCourtInput}
	                      onChange={(event) => handleMoneyInputChange(event.target.value, setCourtCostPerCourtInput)}
	                      placeholder="Rp 240.000"
                      className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'h-12 rounded-[18px] px-3 text-[13px] outline-none placeholder:font-normal placeholder:text-on-surface/40')}
                    />
                  </label>
                  <label className="block">
                    <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Ball Cost</span>
	                    <input
	                      type="text"
	                      inputMode="numeric"
	                      value={ballCostInput}
	                      onChange={(event) => handleMoneyInputChange(event.target.value, setBallCostInput)}
                      placeholder="Rp 80.000"
                      className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'h-12 rounded-[18px] px-3 text-[13px] outline-none placeholder:font-normal placeholder:text-on-surface/40')}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={MATCH_SETTINGS_WIZARD_CLASSNAMES.label}>Public Price / External Player</span>
	                  <input
	                    type="text"
	                    inputMode="numeric"
	                    value={feeAmountInput}
	                    onChange={(event) => handleMoneyInputChange(event.target.value, setFeeAmountInput)}
                    placeholder="Rp 75.000"
                    className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.field, 'outline-none placeholder:font-normal placeholder:text-on-surface/40')}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIncludeHostInFriendSplit((prev) => !prev)}
                  className="tap-target flex w-full items-center justify-between gap-4 rounded-[20px] bg-ios-gray/[0.04] px-3.5 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-on-surface">Include Host in Friend Split</span>
                    <span className="mt-0.5 block text-[11px] font-semibold leading-[1.35] text-ios-gray">
                      {includeHostInFriendSplit ? 'Host shares the friend cost.' : 'Host amount due is zero.'}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-8 w-[52px] shrink-0 items-center rounded-full p-1 transition-colors',
                      includeHostInFriendSplit ? 'justify-end bg-primary' : 'justify-start bg-ios-gray/20'
                    )}
                    aria-hidden="true"
                  >
                    <span className="h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(17,24,39,0.12)]" />
                  </span>
                </button>

                <div className="space-y-2 rounded-[22px] bg-ios-gray/[0.035] p-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Total Cost', value: formatCurrency(totalCost), tone: 'default' },
                      { label: 'Friend Est.', value: formatCurrency(friendEstimate), tone: 'default' },
                      { label: 'Public Price', value: formatCurrency(feeAmount), tone: 'default' },
                      {
                        label: projectedProfit >= 0 ? 'Projected Profit' : 'Projected Loss',
                        value: formatCurrency(Math.abs(projectedProfit)),
                        tone: projectedProfit >= 0 ? 'profit' : 'loss',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={cn(
                          'rounded-[18px] px-3 py-2.5',
                          item.tone === 'profit'
                            ? 'bg-emerald-50 ring-1 ring-emerald-200'
                            : item.tone === 'loss'
                              ? 'bg-rose-50 ring-1 ring-rose-200'
                              : 'bg-white'
                        )}
                      >
                        <p className={cn(
                          'text-[10px] font-black uppercase tracking-[0.1em]',
                          item.tone === 'profit'
                            ? 'text-emerald-700'
                            : item.tone === 'loss'
                              ? 'text-rose-700'
                              : 'text-ios-gray/80'
                        )}>
                          {item.label}
                        </p>
                        <p className={cn(
                          'mt-1 truncate text-[13px] font-black',
                          item.tone === 'profit'
                            ? 'text-emerald-700'
                            : item.tone === 'loss'
                              ? 'text-rose-700'
                              : 'text-on-surface'
                        )}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

	                  <div className="rounded-[18px] bg-white px-3.5 py-3">
	                    <p className="text-[11px] font-black uppercase tracking-[0.1em] text-ios-gray/80">Calculation Detail</p>
	                    <div className="mt-3 space-y-3">
	                      <div className="space-y-1.5">
	                        <EquationRow label="Court cost" value={`${formatCurrency(courtCostPerCourt)} x ${courtCount}`} />
	                        <EquationRow label="Ball cost" value={formatCurrency(ballCost)} />
	                        <div className="border-t border-black/[0.06] pt-1.5">
	                          <EquationRow label="Total cost" value={formatCurrency(totalCost)} />
	                        </div>
	                      </div>

	                      <div className="space-y-1.5 rounded-[14px] bg-ios-gray/[0.035] px-3 py-2.5">
	                        <EquationRow label="Friend estimate" value={`${formatCurrency(totalCost)} / ${friendSplitCount}`} />
	                        <div className="border-t border-black/[0.06] pt-1.5">
	                          <EquationRow label="Per friend" value={formatCurrency(friendEstimate)} />
	                        </div>
	                      </div>

	                      <div className="space-y-1.5">
	                        <EquationRow label="Gross public revenue" value={`${formatCurrency(feeAmount)} x ${maxPlayers}`} />
	                        {includeHostInFriendSplit && (
	                          <EquationRow label="Host share excluded" value={`- ${formatCurrency(hostRevenueExclusion)}`} tone="loss" />
	                        )}
	                        <div className="border-t border-black/[0.06] pt-1.5">
	                          <EquationRow label="Projected revenue" value={formatCurrency(projectedPublicRevenue)} />
	                        </div>
	                        <EquationRow label="Total cost" value={`- ${formatCurrency(totalCost)}`} tone="loss" />
	                        <div className="border-t border-black/[0.06] pt-1.5">
	                          <EquationRow
	                            label="Projected P/L"
	                            value={`${projectedProfit >= 0 ? '+' : '-'}${formatCurrency(Math.abs(projectedProfit))}`}
	                            tone={projectedProfit >= 0 ? 'profit' : 'loss'}
	                          />
	                        </div>
	                      </div>
	                    </div>
	                  </div>
                </div>
              </div>
            )}
          </section>
        </section>
      )}

      {settingsStep === 3 && (
        <section className="space-y-7 pb-28">
          <div className={MATCH_SETTINGS_WIZARD_CLASSNAMES.heading}>
            <h2 className={MATCH_SETTINGS_WIZARD_CLASSNAMES.title}>Invite friends.</h2>
            <p className={MATCH_SETTINGS_WIZARD_CLASSNAMES.subtitle}>Or let them join from the link later.</p>
          </div>

          <section className={cn(MATCH_SETTINGS_WIZARD_CLASSNAMES.softPanel, 'space-y-0 bg-white ring-1 ring-black/5')}>
            <button
              type="button"
              onClick={() => setIsFriendPickerOpen(true)}
              className="tap-target flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                <Users size={19} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-on-surface">Choose from friend list</p>
                <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-ios-gray">
                  {selectedFriends.length > 0 ? `${selectedFriends.length} selected` : 'Open your full friend list.'}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-on-surface/35" />
            </button>
          </section>

          {(selectedFriends.length > 0 || manualPlayers.length > 0) && (
            <section className={MATCH_SETTINGS_WIZARD_CLASSNAMES.softPanel}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Selected invitees</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-on-surface">
                  {selectedFriends.length + manualPlayers.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...selectedFriends.map((friend) => friend.displayName || friend.username || 'Friend'), ...manualPlayers.map((player) => player.name)].map((name) => (
                  <span key={name} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-on-surface">
                    {name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="text-center">
            <p className="text-[14px] font-medium text-ios-gray">or share the link after the room is created</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="tap-target mt-3 inline-flex items-center gap-1.5 text-[15px] font-black text-primary"
            >
              <Plus size={17} strokeWidth={2.5} />
              Add manual participant
            </button>
            {submitError && (
              <p className="mt-4 text-[13px] font-semibold text-rose-600">
                {submitError}
              </p>
            )}
          </div>
        </section>
      )}
    </MatchSettingsWizardShell>
  );
};
