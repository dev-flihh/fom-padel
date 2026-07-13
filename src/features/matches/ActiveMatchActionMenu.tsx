import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Building2, ChevronRight, Flame, Hash, Link2, Minus, Plus, RefreshCw, Share2, Target, Trash2, UserCheck, UserMinus, UserRound, Users, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { Friend, MatchFormat, Player, ScoringType, ToxicIntensity } from '../../types';
import { MANUAL_PLAYER_ID_PREFIX } from '../players/playerUtils';
import { formatDisplayMmr } from '../ranking/rankUtils';
import { TOXIC_INTENSITY_OPTIONS, getToxicIntensityLabel } from './toxicSettings';

type ManageMatchView = 'main' | 'rounds' | 'courts' | 'points' | 'regenerate' | 'players' | 'add-player' | 'link-fom' | 'shame' | 'delete-match';

export const ActiveMatchActionMenu = ({
  isOpen,
  modalBottomOffset,
  matchDateLabel,
  format,
  courts,
  totalPoints,
  scoringType,
  matchPlayModeLabel,
  numRounds,
  players,
  activePlayerCount,
  draftActivePlayerIds,
  hasPlayerChanges,
  friends,
  loadingFriends,
  canResetRounds,
  roundIds,
  recommendedRoundId,
  toxicModeEnabled,
  toxicIntensity,
  isToxicSettingsLocked,
  renderPlayerAvatar,
  isManualPlayer,
  onClose,
  onTogglePlayer,
  onSelectAllPlayers,
  onClearPlayers,
  onSavePlayers,
  onAddPlayer,
  onReplaceManualPlayer,
  onUpdateRounds,
  onUpdateCourts,
  onUpdatePoints,
  onDeleteRoundsFrom,
  onToxicModeChange,
  onToxicIntensityChange,
  onShareMatch,
  onDeleteMatch
}: {
  isOpen: boolean;
  modalBottomOffset: number;
  matchDateLabel: string;
  format: MatchFormat;
  courts: number;
  totalPoints: number;
  scoringType?: ScoringType;
  // Label mode Match Play (mis. "Race to 6 games") untuk chip ringkasan.
  matchPlayModeLabel?: string;
  numRounds: number;
  players: Player[];
  activePlayerCount: number;
  draftActivePlayerIds: Set<string>;
  hasPlayerChanges: boolean;
  friends: Friend[];
  loadingFriends: boolean;
  canResetRounds: boolean;
  roundIds: number[];
  recommendedRoundId: number | null;
  toxicModeEnabled: boolean;
  toxicIntensity: ToxicIntensity;
  isToxicSettingsLocked?: boolean;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  isManualPlayer: (player: Player) => boolean;
  onClose: () => void;
  onTogglePlayer: (playerId: string) => void;
  onSelectAllPlayers: () => void;
  onClearPlayers: () => void;
  onSavePlayers: () => boolean;
  onAddPlayer: (player: Player) => void;
  onReplaceManualPlayer: (manualPlayer: Player, friend: Friend) => void;
  onUpdateRounds: (numRounds: number) => boolean;
  onUpdateCourts: (numCourts: number) => boolean;
  onUpdatePoints: (totalPoints: number) => boolean;
  onDeleteRoundsFrom: (roundId: number) => void;
  onToxicModeChange: (enabled: boolean) => void;
  onToxicIntensityChange: (value: ToxicIntensity) => void;
  onShareMatch: () => void;
  onDeleteMatch: () => void;
}) => {
  const [view, setView] = useState<ManageMatchView>('main');
  const [roundValue, setRoundValue] = useState(String(numRounds || 1));
  const [courtValue, setCourtValue] = useState(String(courts || 1));
  const [pointsValue, setPointsValue] = useState(String(totalPoints || 1));
  const [newPlayerName, setNewPlayerName] = useState('');
  const [manualPlayerToLink, setManualPlayerToLink] = useState<Player | null>(null);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  // Match Play tidak memakai target poin — tampilkan mode + metode deuce,
  // bukan "Race {totalPoints}" warisan format race-to-points.
  const scoringLabel = format === 'Match Play'
    ? [matchPlayModeLabel, scoringType].filter(Boolean).join(' · ') || 'Tennis scoring'
    : totalPoints > 0 ? `Race ${totalPoints}` : (scoringType || 'Score');
  const compactMatchDateLabel = compactDateLabel(matchDateLabel);
  const isMainView = view === 'main';
  const isTallView = isMainView || view === 'players' || view === 'link-fom' || view === 'regenerate';
  const titleId = 'manage-match-sheet-title';
  const minimumActivePlayers = players.length > 0 ? Math.min(4, players.length) : 0;
  const playerValidationMessage = (
    view === 'players' &&
    minimumActivePlayers > 0 &&
    draftActivePlayerIds.size < minimumActivePlayers
  )
    ? `Keep at least ${minimumActivePlayers} active player${minimumActivePlayers > 1 ? 's' : ''} to create the next round.`
    : '';

  useEffect(() => {
    if (!isOpen) {
      setView('main');
      setFormError('');
      setNewPlayerName('');
      setManualPlayerToLink(null);
      return;
    }
    setRoundValue(String(numRounds || 1));
    setCourtValue(String(courts || 1));
    setPointsValue(String(totalPoints || 1));
  }, [courts, isOpen, numRounds, totalPoints]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusCloseButton = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialogElement = dialogRef.current;
      if (!dialogElement) return;

      const focusableElements = Array.from(dialogElement.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )).filter((element): element is HTMLElement => (
        element instanceof HTMLElement && !element.hasAttribute('aria-hidden')
      ));

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusCloseButton);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown, true);
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  const goToView = (nextView: ManageMatchView) => {
    setFormError('');
    if (nextView === 'rounds') setRoundValue(String(numRounds || 1));
    if (nextView === 'courts') setCourtValue(String(courts || 1));
    if (nextView === 'points') setPointsValue(String(totalPoints || 1));
    if (nextView === 'add-player') setNewPlayerName('');
    if (nextView !== 'link-fom') setManualPlayerToLink(null);
    setView(nextView);
  };

  const handleBack = () => {
    if (view === 'add-player' || view === 'link-fom') {
      goToView('players');
      return;
    }
    goToView('main');
  };

  const handleSaveRounds = () => {
    const parsed = Number.parseInt(roundValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setFormError('Enter at least 1 round.');
      return;
    }
    const ok = onUpdateRounds(parsed);
    if (!ok) {
      setFormError('Round count is invalid for the current match setup.');
      return;
    }
    setView('main');
  };

  const handleSaveCourts = () => {
    const parsed = Number.parseInt(courtValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setFormError('Enter at least 1 court.');
      return;
    }
    const ok = onUpdateCourts(parsed);
    if (!ok) {
      setFormError('Court count is invalid for the current match setup.');
      return;
    }
    setView('main');
  };

  const handleSavePoints = () => {
    const parsed = Number.parseInt(pointsValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setFormError('Enter at least 1 point.');
      return;
    }
    const ok = onUpdatePoints(parsed);
    if (!ok) {
      setFormError('Points value is invalid for the current match setup.');
      return;
    }
    setView('main');
  };

  const handleDeleteRoundsFrom = (roundId: number) => {
    onDeleteRoundsFrom(roundId);
    setView('main');
  };

  const handleAddPlayerSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      setFormError('Enter player name.');
      return;
    }
    const initials = trimmedName
      .split(' ')
      .filter(Boolean)
      .map((namePart) => namePart[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'P';
    onAddPlayer({
      id: `${MANUAL_PLAYER_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`,
      name: trimmedName,
      rating: 0,
      source: 'manual',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
    });
    setNewPlayerName('');
    goToView('players');
  };

  const handleSavePlayers = () => {
    const ok = onSavePlayers();
    if (ok) goToView('main');
  };

  const title = view === 'rounds'
    ? 'Edit rounds'
    : view === 'courts'
    ? 'Edit courts'
    : view === 'points'
    ? 'Edit points'
    : view === 'regenerate'
    ? 'Regenerate rounds'
    : view === 'players'
    ? 'Edit players'
    : view === 'add-player'
    ? 'Add player'
    : view === 'link-fom'
    ? 'Link FOM friend'
    : view === 'shame'
    ? 'Hall of Shame'
    : view === 'delete-match'
    ? 'Delete match'
    : 'Manage match';

  const subtitle = view === 'main'
    ? [
        compactMatchDateLabel,
        format,
        `${courts} court${courts > 1 ? 's' : ''}`,
        `${numRounds} rounds`,
        scoringLabel,
      ].filter(Boolean).join(' · ')
    : view === 'players'
    ? `${players.length} players · changes apply next round`
    : view === 'add-player'
    ? 'Manual player for this match.'
    : view === 'link-fom'
    ? `Replace ${manualPlayerToLink?.name || 'manual player'}`
    : view === 'shame'
    ? 'Host-only toxic settings.'
    : view === 'delete-match'
    ? 'This cannot be undone.'
    : 'Changes apply to the active match.';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center px-0 pt-4 sm:items-center sm:px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/58"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 310 }}
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-18px_52px_rgba(15,23,42,0.22)] sm:rounded-[28px]"
            style={{
              maxHeight: 'calc(100dvh - 18px)',
              minHeight: isTallView ? 'min(640px, calc(100dvh - 18px))' : undefined,
            }}
          >
            <div className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-ios-gray/20" />

            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-5">
              <div className="min-w-0">
                {!isMainView && (
                  <button
                    type="button"
                    aria-label={view === 'shame' ? 'Back' : view === 'add-player' || view === 'link-fom' ? 'Return to edit players' : 'Return to manage match'}
                    onClick={handleBack}
                    className="tap-target mb-3 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-ios-gray"
                  >
                    <ArrowLeft size={15} />
                    {view === 'add-player' || view === 'link-fom' ? 'Edit players' : 'Manage match'}
                  </button>
                )}
                <h3 id={titleId} className="text-[21px] font-display font-bold leading-none tracking-[-0.03em] text-on-surface">
                  {title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-snug text-ios-gray">
                  {subtitle}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="tap-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/10"
                aria-label="Close manage match"
              >
                <X size={18} className="text-on-surface" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-0">
              {isMainView ? (
                <>
                  <div className="divide-y divide-ios-gray/10 border-y border-ios-gray/10">
                    <ManageActionRow
                      icon={<Users size={17} />}
                      title="Players"
                      description={`${players.length} total · ${activePlayerCount} active`}
                      onClick={() => goToView('players')}
                    />
                    <ManageActionRow
                      icon={<Flame size={17} />}
                      title="Hall of Shame"
                      description={toxicModeEnabled ? `On · ${getToxicIntensityLabel(toxicIntensity)}` : 'Off'}
                      tone={toxicModeEnabled ? 'gold' : 'muted'}
                      trailing={(
                        <span className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[0.08em]',
                          toxicModeEnabled ? 'bg-[#FFF2CB] text-[#946818]' : 'bg-ios-gray/[0.07] text-ios-gray'
                        )}>
                          {toxicModeEnabled ? 'On' : 'Off'}
                        </span>
                      )}
                      onClick={() => goToView('shame')}
                    />
                    <ManageActionRow
                      icon={<Share2 size={17} />}
                      title="Share link"
                      description="Copy active match link."
                      onClick={() => {
                        onClose();
                        onShareMatch();
                      }}
                    />
                    <ManageActionRow
                      icon={<Hash size={17} />}
                      title="Edit rounds"
                      description={`${numRounds} rounds`}
                      onClick={() => goToView('rounds')}
                    />
                    <ManageActionRow
                      icon={<Building2 size={17} />}
                      title="Edit courts"
                      description={`${courts} court${courts > 1 ? 's' : ''}`}
                      onClick={() => goToView('courts')}
                    />
                    {format !== 'Match Play' && (
                      <ManageActionRow
                        icon={<Target size={17} />}
                        title="Edit points"
                        description={scoringLabel}
                        onClick={() => goToView('points')}
                      />
                    )}
                    <ManageActionRow
                      icon={<RefreshCw size={17} />}
                      title="Regenerate rounds"
                      description="Delete from selected round."
                      disabled={!canResetRounds}
                      tone={canResetRounds ? 'warning' : 'muted'}
                      onClick={() => goToView('regenerate')}
                    />
                  </div>

                  <section className="mt-2">
                    <button
                      type="button"
                      onClick={() => goToView('delete-match')}
                      className="tap-target flex min-h-[48px] w-full items-center gap-3 rounded-[14px] px-1 text-left text-[13.5px] font-extrabold text-red-500 active:scale-[0.99]"
                    >
                      <Trash2 size={17} />
                      Delete match
                    </button>
                  </section>
                </>
              ) : view === 'rounds' ? (
                <NumberSubview
                  label="Total rounds"
                  value={roundValue}
                  currentValue={numRounds || 1}
                  helper="You can add rounds anytime. Reducing played rounds is limited."
                  error={formError}
                  onValueChange={(value) => {
                    setRoundValue(value);
                    if (formError) setFormError('');
                  }}
                  onCancel={() => setView('main')}
                  onSave={handleSaveRounds}
                />
              ) : view === 'courts' ? (
                <NumberSubview
                  label="Total courts"
                  value={courtValue}
                  currentValue={courts || 1}
                  helper="Court changes apply starting from the next round."
                  error={formError}
                  onValueChange={(value) => {
                    setCourtValue(value);
                    if (formError) setFormError('');
                  }}
                  onCancel={() => setView('main')}
                  onSave={handleSaveCourts}
                />
              ) : view === 'points' ? (
                <NumberSubview
                  label="Points per match"
                  value={pointsValue}
                  currentValue={totalPoints || 1}
                  helper="Race target applies to rounds that haven't started yet. Rounds already in play keep their points."
                  error={formError}
                  onValueChange={(value) => {
                    setPointsValue(value);
                    if (formError) setFormError('');
                  }}
                  onCancel={() => setView('main')}
                  onSave={handleSavePoints}
                />
              ) : view === 'regenerate' ? (
                <RegenerateSubview
                  roundIds={roundIds}
                  recommendedRoundId={recommendedRoundId}
                  onCancel={() => setView('main')}
                  onSelectRound={handleDeleteRoundsFrom}
                />
              ) : view === 'players' ? (
                <PlayersSubview
                  players={players}
                  draftActivePlayerIds={draftActivePlayerIds}
                  hasChanges={hasPlayerChanges}
                  validationMessage={playerValidationMessage}
                  renderPlayerAvatar={renderPlayerAvatar}
                  isManualPlayer={isManualPlayer}
                  onOpenAddPlayer={() => goToView('add-player')}
                  onOpenLinkFom={(player) => {
                    setManualPlayerToLink(player);
                    goToView('link-fom');
                  }}
                  onSelectAll={onSelectAllPlayers}
                  onClearAll={onClearPlayers}
                  onTogglePlayer={onTogglePlayer}
                  onCancel={() => goToView('main')}
                  onSave={handleSavePlayers}
                />
              ) : view === 'add-player' ? (
                <AddPlayerSubview
                  name={newPlayerName}
                  error={formError}
                  onNameChange={(value) => {
                    setNewPlayerName(value);
                    if (formError) setFormError('');
                  }}
                  onCancel={() => goToView('players')}
                  onSubmit={handleAddPlayerSubmit}
                />
              ) : view === 'link-fom' ? (
                <LinkFomSubview
                  manualPlayer={manualPlayerToLink}
                  players={players}
                  friends={friends}
                  loadingFriends={loadingFriends}
                  renderPlayerAvatar={renderPlayerAvatar}
                  onCancel={() => goToView('players')}
                  onSelectFriend={(friend) => {
                    if (!manualPlayerToLink) return;
                    onReplaceManualPlayer(manualPlayerToLink, friend);
                    setManualPlayerToLink(null);
                    goToView('players');
                  }}
                />
              ) : view === 'shame' ? (
                <ShameSettingsSubview
                  enabled={toxicModeEnabled}
                  intensity={toxicIntensity}
                  locked={Boolean(isToxicSettingsLocked)}
                  onEnabledChange={onToxicModeChange}
                  onIntensityChange={onToxicIntensityChange}
                />
              ) : (
                <DeleteMatchSubview
                  onCancel={() => goToView('main')}
                  onConfirm={() => {
                    onClose();
                    onDeleteMatch();
                  }}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const NumberSubview = ({
  label,
  value,
  currentValue,
  helper,
  error,
  onValueChange,
  onCancel,
  onSave,
}: {
  label: string;
  value: string;
  currentValue: number;
  helper: string;
  error: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const parsedValue = Math.max(1, Number.parseInt(value, 10) || 1);
  const hasChanges = parsedValue !== Math.max(1, currentValue || 1);
  const setNumberValue = (nextValue: number) => onValueChange(String(Math.max(1, nextValue)));

  return (
    <div className="pt-1">
      <label className="block text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">
        {label}
      </label>
      <div className="mt-3 flex items-center rounded-[18px] border border-ios-gray/12 bg-ios-gray/[0.028] p-1.5">
        <button
          type="button"
          onClick={() => setNumberValue(parsedValue - 1)}
          disabled={parsedValue <= 1}
          className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-ios-gray shadow-[0_1px_2px_rgba(15,23,42,0.035)] disabled:opacity-35"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} strokeWidth={2.4} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(event) => onValueChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
          className="h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 text-center font-display text-[24px] font-bold leading-none tracking-[-0.03em] text-on-surface outline-none"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => setNumberValue(parsedValue + 1)}
          className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white text-primary shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} strokeWidth={2.4} />
        </button>
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-snug text-ios-gray">{helper}</p>
      {error && <p className="mt-2 text-[12px] font-bold text-red-500">{error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="tap-target h-11 rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={hasChanges ? onSave : onCancel}
          className={cn(
            'tap-target h-11 rounded-[14px] text-[14px] font-extrabold',
            hasChanges
              ? 'bg-primary text-white shadow-[0_8px_18px_rgba(230,94,20,0.18)]'
              : 'border border-ios-gray/12 bg-ios-gray/[0.035] text-on-surface/72'
          )}
        >
          {hasChanges ? 'Save' : 'Done'}
        </button>
      </div>
    </div>
  );
};

const RegenerateSubview = ({
  roundIds,
  recommendedRoundId,
  onCancel,
  onSelectRound,
}: {
  roundIds: number[];
  recommendedRoundId: number | null;
  onCancel: () => void;
  onSelectRound: (roundId: number) => void;
}) => {
  const [pendingRoundId, setPendingRoundId] = useState<number | null>(null);

  if (pendingRoundId !== null) {
    return (
      <ConfirmDangerSubview
        icon={<RefreshCw size={17} />}
        title={`Delete round ${pendingRoundId}+?`}
        description={`Round ${pendingRoundId} and every round after it will be removed. Scores already entered in earlier rounds stay safe.`}
        confirmLabel="Delete rounds"
        onCancel={() => setPendingRoundId(null)}
        onConfirm={() => onSelectRound(pendingRoundId)}
      />
    );
  }

  return (
    <div className="pt-1">
      <p className="text-[12px] font-semibold leading-snug text-ios-gray">
        Select the first round to rebuild. That round and every round after it will be deleted.
      </p>
      {recommendedRoundId !== null && roundIds.includes(recommendedRoundId) && (
        <div className="mt-3 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-bold text-amber-800">
          Recommended: start from round {recommendedRoundId}+.
        </div>
      )}
      <div className="mt-3 divide-y divide-ios-gray/10 border-y border-ios-gray/10">
        {roundIds.map((roundId) => (
          <button
            key={roundId}
            type="button"
            onClick={() => setPendingRoundId(roundId)}
            className={cn(
              'tap-target flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left active:scale-[0.99]',
              recommendedRoundId === roundId && 'text-amber-800'
            )}
          >
            <span>
              <span className="block text-[14px] font-extrabold text-on-surface">Start from round {roundId}</span>
              <span className="mt-0.5 block text-[11.5px] font-semibold text-ios-gray">Delete round {roundId} onward.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ios-gray/50" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="tap-target mt-5 h-11 w-full rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
      >
        Back
      </button>
    </div>
  );
};

const PlayersSubview = ({
  players,
  draftActivePlayerIds,
  hasChanges,
  validationMessage,
  renderPlayerAvatar,
  isManualPlayer,
  onOpenAddPlayer,
  onOpenLinkFom,
  onSelectAll,
  onClearAll,
  onTogglePlayer,
  onCancel,
  onSave,
}: {
  players: Player[];
  draftActivePlayerIds: Set<string>;
  hasChanges: boolean;
  validationMessage: string;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  isManualPlayer: (player: Player) => boolean;
  onOpenAddPlayer: () => void;
  onOpenLinkFom: (player: Player) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onTogglePlayer: (playerId: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) => {
  const sittingCount = Math.max(0, players.length - draftActivePlayerIds.size);
  const hasPlayers = players.length > 0;
  const isAllSelected = !hasPlayers || draftActivePlayerIds.size >= players.length;
  const hasAnyActivePlayer = draftActivePlayerIds.size > 0;

  return (
  <div className="pt-1">
    <div className="flex items-center gap-2 rounded-[15px] bg-ios-gray/[0.035] px-3 py-2 text-[12px] font-extrabold text-on-surface">
      <span className="inline-flex items-center gap-1.5">
        <UserCheck size={14} className="text-primary" />
        {draftActivePlayerIds.size} active
      </span>
      <span className="text-ios-gray/40">·</span>
      <span className="inline-flex items-center gap-1.5 text-ios-gray">
        <UserMinus size={14} />
        {sittingCount} sitting
      </span>
    </div>

    <div className="mt-2.5 grid grid-cols-[1fr_auto_auto] gap-2">
      <button
        type="button"
        onClick={onOpenAddPlayer}
        className="tap-target inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[13px] border border-primary/12 bg-primary/[0.045] px-3 text-[12px] font-extrabold text-primary active:scale-[0.99]"
      >
        <Plus size={13} />
        Add player
      </button>
      <button
        type="button"
        onClick={onSelectAll}
        disabled={isAllSelected}
        className="tap-target h-10 rounded-[13px] border border-ios-gray/12 bg-white px-3 text-[12px] font-extrabold text-on-surface active:scale-[0.99] disabled:bg-ios-gray/[0.035] disabled:text-ios-gray/42 disabled:active:scale-100"
      >
        All
      </button>
      <button
        type="button"
        onClick={onClearAll}
        disabled={!hasAnyActivePlayer}
        className="tap-target h-10 rounded-[13px] border border-ios-gray/10 bg-ios-gray/[0.025] px-3 text-[12px] font-extrabold text-ios-gray active:scale-[0.99] disabled:text-ios-gray/38 disabled:active:scale-100"
      >
        Sit all
      </button>
    </div>

    <div className="mt-3">
      {players.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-[18px] border border-ios-gray/10 bg-ios-gray/[0.04] text-[12px] font-semibold text-ios-gray">
          No players in this match yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-ios-gray/10 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
          {players.map((player, index) => {
            const isChecked = draftActivePlayerIds.has(player.id);
            const isManual = isManualPlayer(player);
            return (
              <div
                key={player.id}
                className={cn(
                  'w-full px-3.5 py-2.5 transition-colors',
                  index > 0 && 'border-t border-ios-gray/10',
                  !isChecked && 'bg-ios-gray/[0.018]'
                )}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2.5">
                    {renderPlayerAvatar(
                      player,
                      cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors',
                        isChecked ? 'bg-on-surface text-white' : 'bg-ios-gray/[0.08] text-ios-gray'
                      ),
                      isChecked ? 'text-white' : 'text-ios-gray'
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">{player.name}</p>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <StatusPill tone={isChecked ? 'active' : 'muted'}>{isChecked ? 'Active' : 'Sitting'}</StatusPill>
                        <StatusPill tone={isManual ? 'muted' : 'fom'}>{isManual ? 'Manual' : 'FOM'}</StatusPill>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isManual && (
                      <button
                        type="button"
                        onClick={() => onOpenLinkFom(player)}
                        className="tap-target inline-flex h-8 items-center gap-1 rounded-full border border-ios-gray/12 bg-white px-2.5 text-[10.5px] font-extrabold text-on-surface/70 active:scale-[0.99]"
                        aria-label={`Link FOM profile for ${player.name}`}
                      >
                        <Link2 size={11} />
                        Link
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onTogglePlayer(player.id)}
                      className={cn(
                        'relative h-7 w-12 rounded-full border transition-colors',
                        isChecked ? 'border-primary bg-primary' : 'border-ios-gray/18 bg-ios-gray/[0.08]'
                      )}
                      aria-label={`${isChecked ? 'Deactivate' : 'Activate'} ${player.name}`}
                      aria-pressed={isChecked}
                    >
                      <span className={cn(
                        'absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform',
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      )} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {validationMessage && (
      <p className="mt-2 rounded-[13px] bg-amber-50 px-3 py-2 text-[11.5px] font-bold leading-snug text-amber-800">
        {validationMessage}
      </p>
    )}

    <div className="sticky bottom-0 -mx-6 mt-4 grid grid-cols-2 gap-2.5 border-t border-ios-gray/10 bg-white px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-3">
      <button
        type="button"
        onClick={onCancel}
        className="tap-target h-11 rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={Boolean(validationMessage)}
        className={cn(
          'tap-target h-11 rounded-[14px] text-[14px] font-extrabold disabled:bg-ios-gray/[0.08] disabled:text-ios-gray/58 disabled:shadow-none disabled:active:scale-100',
          hasChanges
            ? 'bg-primary text-white shadow-[0_8px_18px_rgba(230,94,20,0.18)]'
            : 'border border-ios-gray/12 bg-ios-gray/[0.035] text-on-surface/72'
        )}
      >
        {hasChanges ? 'Save' : 'Done'}
      </button>
    </div>
  </div>
  );
};

const AddPlayerSubview = ({
  name,
  error,
  onNameChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  error: string;
  onNameChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) => (
  <form onSubmit={onSubmit} className="pt-1">
    <label className="block text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">Full name</label>
    <input
      type="text"
      value={name}
      onChange={(event) => onNameChange(event.target.value)}
      placeholder="Example: Falih Hermon"
      className="mt-3 h-12 w-full rounded-[14px] border border-ios-gray/16 bg-ios-gray/[0.035] px-4 text-[16px] font-extrabold text-on-surface outline-none transition-colors focus:border-primary focus:bg-white"
      autoFocus
    />
    {error && <p className="mt-2 text-[12px] font-bold text-red-500">{error}</p>}
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="tap-target h-11 rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="tap-target h-11 rounded-[14px] bg-primary text-[14px] font-extrabold text-white shadow-[0_8px_18px_rgba(230,94,20,0.18)]"
      >
        Save player
      </button>
    </div>
  </form>
);

const LinkFomSubview = ({
  manualPlayer,
  players,
  friends,
  loadingFriends,
  renderPlayerAvatar,
  onCancel,
  onSelectFriend,
}: {
  manualPlayer: Player | null;
  players: Player[];
  friends: Friend[];
  loadingFriends: boolean;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  onCancel: () => void;
  onSelectFriend: (friend: Friend) => void;
}) => {
  const usedPlayerIds = new Set((players || []).map((player) => player.id));
  const availableFriends = (friends || []).filter((friend) => !usedPlayerIds.has(friend.uid));

  return (
    <div className="pt-1">
      {manualPlayer && (
        <div className="flex items-center gap-3 rounded-[16px] border border-ios-gray/10 bg-ios-gray/[0.035] px-3.5 py-3">
          {renderPlayerAvatar(
            manualPlayer,
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.08] text-xs font-black text-ios-gray',
            'text-ios-gray'
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">{manualPlayer.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-ios-gray">Manual player placeholder</p>
          </div>
        </div>
      )}

      <h4 className="mb-2 mt-4 text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">Choose FOM friend</h4>
      {loadingFriends ? (
        <div className="flex h-28 items-center justify-center rounded-[18px] border border-ios-gray/10 bg-ios-gray/[0.04] text-[12px] font-semibold text-ios-gray">
          Loading friends...
        </div>
      ) : availableFriends.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-[18px] border border-ios-gray/10 bg-ios-gray/[0.04] px-5 text-center">
          <UserRound size={18} className="text-ios-gray/50" />
          <p className="text-[12px] font-extrabold text-on-surface">No eligible friend found</p>
          <p className="text-[11px] font-semibold text-ios-gray">
            Add the player as a friend first, or remove their account from this match before replacing.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-ios-gray/10 bg-white">
          {availableFriends.map((friend, index) => {
            const initials = friend.displayName
              .split(' ')
              .filter(Boolean)
              .map((namePart) => namePart[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'FR';
            const friendPlayer: Player = {
              id: friend.uid,
              name: friend.displayName,
              rating: friend.mmr || 0,
              source: 'fom',
              avatar: friend.photoURL || '',
              initials,
              stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
            };

            return (
              <button
                key={friend.uid}
                type="button"
                onClick={() => onSelectFriend(friend)}
                className={cn(
                  'tap-target flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:scale-[0.99]',
                  index > 0 && 'border-t border-ios-gray/10'
                )}
              >
                {renderPlayerAvatar(
                  friendPlayer,
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-black text-primary',
                  'text-primary'
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">{friend.displayName}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-ios-gray">
                    MMR: {formatDisplayMmr(friend.mmr)}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ios-gray/30" />
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="tap-target mt-5 h-11 w-full rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
      >
        Back
      </button>
    </div>
  );
};

const StatusPill = ({
  tone = 'muted',
  children,
}: {
  tone?: 'active' | 'fom' | 'muted';
  children: ReactNode;
}) => (
  <span className={cn(
    'shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-black uppercase leading-none tracking-[0.06em]',
    tone === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'fom'
        ? 'bg-sky-50 text-sky-700'
        : 'bg-ios-gray/[0.07] text-ios-gray'
  )}>
    {children}
  </span>
);

const ShameSettingsSubview = ({
  enabled,
  intensity,
  locked,
  onEnabledChange,
  onIntensityChange,
}: {
  enabled: boolean;
  intensity: ToxicIntensity;
  locked: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onIntensityChange: (value: ToxicIntensity) => void;
}) => {
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);

  if (isConfirmingDisable) {
    return (
      <ConfirmDangerSubview
        icon={<Flame size={17} />}
        title="Turn off Hall of Shame?"
        description="Shame tab, toxic ticker, and shame share cards will disappear from this active match and shared views."
        confirmLabel="Turn off"
        onCancel={() => setIsConfirmingDisable(false)}
        onConfirm={() => {
          onEnabledChange(false);
          setIsConfirmingDisable(false);
        }}
      />
    );
  }

  return (
    <div className="pt-1">
      <section className={cn(
        'rounded-[18px] border px-4 py-4',
        enabled ? 'border-[#E1B45D]/40 bg-[#FFF9EA]' : 'border-ios-gray/12 bg-ios-gray/[0.035]'
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase leading-none tracking-[0.12em] text-[#946818]">
              <Flame size={13} />
              Hall of Shame
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-on-surface/62">
              Applies to Shame tab, ticker, and share cards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (enabled) {
                setIsConfirmingDisable(true);
                return;
              }
              onEnabledChange(true);
            }}
            disabled={locked}
            className={cn(
              'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
              enabled ? 'border-primary bg-primary' : 'border-ios-gray/18 bg-ios-gray/[0.08]',
              locked && 'cursor-not-allowed opacity-50'
            )}
            aria-label={`${enabled ? 'Disable' : 'Enable'} Hall of Shame`}
            aria-pressed={enabled}
          >
            <span className={cn(
              'absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-0'
            )} />
          </button>
        </div>
      </section>

      <section className={cn('mt-3', (!enabled || locked) && 'opacity-55')}>
        <h4 className="mb-2 text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">Roast intensity</h4>
        <div className="grid gap-2">
          {TOXIC_INTENSITY_OPTIONS.map((option) => {
            const isSelected = intensity === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!enabled) onEnabledChange(true);
                  onIntensityChange(option.value);
                }}
                disabled={locked}
                className={cn(
                  'tap-target flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[16px] border px-4 text-left active:scale-[0.99]',
                  isSelected && enabled
                    ? 'border-[#E1B45D]/50 bg-[#FFF9EA] text-[#946818]'
                    : 'border-ios-gray/10 bg-white text-on-surface',
                  locked && 'cursor-not-allowed active:scale-100'
                )}
                aria-pressed={isSelected && enabled}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold leading-tight tracking-[-0.015em]">{option.label}</span>
                  <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-ios-gray">{option.description}</span>
                </span>
                <span className={cn(
                  'h-5 w-5 shrink-0 rounded-full border',
                  isSelected && enabled ? 'border-primary bg-primary shadow-[inset_0_0_0_5px_white]' : 'border-ios-gray/20 bg-ios-gray/[0.03]'
                )} />
              </button>
            );
          })}
        </div>
      </section>

      {locked && (
        <p className="mt-3 rounded-[14px] bg-ios-gray/[0.045] px-3 py-2 text-[11.5px] font-semibold leading-snug text-ios-gray">
          Finished matches keep the Hall of Shame setting locked.
        </p>
      )}
    </div>
  );
};

const DeleteMatchSubview = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <ConfirmDangerSubview
    icon={<Trash2 size={17} />}
    title="Delete this match?"
    description="All active match data, scores, shared link state, and unfinished progress will be removed."
    confirmLabel="Delete match"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);

const ConfirmDangerSubview = ({
  icon,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div className="pt-1">
    <section className="rounded-[18px] border border-red-200 bg-red-50/70 px-4 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {icon}
      </div>
      <h4 className="mt-3 text-[18px] font-display font-bold leading-tight tracking-[-0.025em] text-on-surface">
        {title}
      </h4>
      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-on-surface/62">
        {description}
      </p>
    </section>
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="tap-target h-11 rounded-[14px] border border-ios-gray/16 text-[14px] font-extrabold text-ios-gray"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="tap-target h-11 rounded-[14px] bg-red-500 text-[14px] font-extrabold text-white shadow-[0_8px_18px_rgba(239,68,68,0.18)] active:scale-[0.99]"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
);

const compactDateLabel = (label: string) => {
  const trimmed = String(label || '').trim();
  if (!trimmed) return '';

  const monthAliases: Record<string, string> = {
    Januari: 'Jan',
    Februari: 'Feb',
    Maret: 'Mar',
    April: 'Apr',
    Mei: 'Mei',
    Juni: 'Jun',
    Juli: 'Jul',
    Agustus: 'Agu',
    September: 'Sep',
    Oktober: 'Okt',
    November: 'Nov',
    Desember: 'Des',
  };
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && monthAliases[parts[1]]) {
    return `${parts[0]} ${monthAliases[parts[1]]}`;
  }
  return trimmed;
};

const ManageActionRow = ({
  icon,
  title,
  description,
  disabled,
  tone = 'default',
  trailing,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
  tone?: 'default' | 'warning' | 'muted' | 'gold';
  trailing?: ReactNode;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'tap-target flex min-h-[54px] w-full items-center gap-3 py-3 text-left active:scale-[0.99]',
      disabled && 'cursor-not-allowed opacity-48 active:scale-100'
    )}
  >
    <span className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
      tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'gold'
        ? 'bg-[#FFF2CB] text-[#946818]'
        : tone === 'muted'
        ? 'bg-ios-gray/[0.06] text-ios-gray'
        : 'bg-ios-gray/[0.055] text-on-surface/58'
    )}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">{title}</span>
      {description && (
        <span className="mt-0.5 block line-clamp-2 text-[11.5px] font-semibold leading-snug text-ios-gray">{description}</span>
      )}
    </span>
    {trailing || (
      disabled ? <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.08em] text-ios-gray/55">N/A</span> : <ChevronRight size={18} className="shrink-0 text-ios-gray/50" />
    )}
  </button>
);
