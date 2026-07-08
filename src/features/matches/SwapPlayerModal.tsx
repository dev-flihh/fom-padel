import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronRight, UserRound, Users, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { type Player, type Round } from '../../types';
import { formatDisplayMmr } from '../ranking/rankUtils';
import { getFixedTeamLabel } from './partnerMode';
import type { ActiveFixedTeam } from './fixedTeamScheduler';
import type { ActiveMatchSwapRequest } from './ActiveMatchRoundCard';

type SwapView = 'pair' | 'player';

// Bottom sheet dengan bahasa desain yang sama seperti Manage Match
// (ActiveMatchActionMenu): handle, header judul+subjudul, subview dengan
// tombol back. Mode fix partner default ke swap per pasangan; ganti satu
// pemain tersedia sebagai subview (mengubah komposisi tim permanen).
export const SwapPlayerModal = ({
  swapRequest,
  players,
  rounds,
  playerMatchCounts,
  isFixedPartnerMode,
  fixedTeamOptions,
  renderPlayerAvatar,
  isRegisteredPlayer,
  onClose,
  onSelectPlayer,
  onSelectTeam
}: {
  swapRequest: ActiveMatchSwapRequest | null;
  players: Player[];
  rounds: Round[];
  playerMatchCounts: Record<string, number>;
  isFixedPartnerMode: boolean;
  fixedTeamOptions: ActiveFixedTeam[];
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  isRegisteredPlayer: (player: Player) => boolean;
  onClose: () => void;
  onSelectPlayer: (request: ActiveMatchSwapRequest, player: Player) => void;
  onSelectTeam: (request: ActiveMatchSwapRequest, playerIds: [string, string]) => void;
}) => {
  const [view, setView] = useState<SwapView>('player');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isOpen = Boolean(swapRequest);
  const titleId = 'swap-player-sheet-title';

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Reset tampilan tiap kali dibuka: fix partner mulai dari swap pasangan.
  useEffect(() => {
    if (isOpen) setView(isFixedPartnerMode ? 'pair' : 'player');
  }, [isOpen, isFixedPartnerMode]);

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

  const currentRound = swapRequest
    ? rounds.find((round) => round.matches.some((match) => match.id === swapRequest.matchId)) || null
    : null;
  const currentMatch = currentRound && swapRequest
    ? currentRound.matches.find((match) => match.id === swapRequest.matchId) || null
    : null;
  const playerIdsInMatch = new Set(
    currentMatch ? [...currentMatch.teamA.players, ...currentMatch.teamB.players].map((player) => player.id) : []
  );
  const outgoingPair = currentMatch && swapRequest
    ? (swapRequest.team === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)
    : [];
  const outgoingPairLabel = outgoingPair.map((player) => player.name.split(' ')[0]).join(' & ');

  // Kandidat pasangan: tim tetap aktif di luar court ini. Pasangan yang
  // sedang main di court lain ikut ditawarkan — memilihnya menukar court.
  const pairOptions = currentRound && currentMatch
    ? fixedTeamOptions
        .filter((entry) => entry.players.every((player) => !playerIdsInMatch.has(player.id)))
        .map((entry) => {
          const pairIdSet = new Set<string>(entry.team.playerIds);
          const holdsPair = (sidePlayers: Player[]) => (
            sidePlayers.length === 2 && sidePlayers.every((player) => pairIdSet.has(player.id))
          );
          const sourceMatch = currentRound.matches.find((match) => (
            match.id !== currentMatch.id && (holdsPair(match.teamA.players) || holdsPair(match.teamB.players))
          )) || null;
          return { entry, sourceCourt: sourceMatch ? sourceMatch.court : null };
        })
    : [];

  const replacementPlayers = swapRequest
    ? players.filter((player) => !playerIdsInMatch.has(player.id))
    : [];

  const showBack = isFixedPartnerMode && view === 'player';
  const title = view === 'pair' ? 'Swap pair' : 'Swap player';
  const subtitle = view === 'pair'
    ? `Court ${currentMatch?.court ?? '-'} · Replace ${outgoingPairLabel || 'this pair'}`
    : `Replace ${swapRequest?.currentPlayer.name || 'player'}`;
  const pairAvatarClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-black text-primary ring-2 ring-white';

  return (
    <AnimatePresence>
      {swapRequest && (
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
              minHeight: 'min(440px, calc(100dvh - 18px))',
            }}
          >
            <div className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-ios-gray/20" />

            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-5">
              <div className="min-w-0">
                {showBack && (
                  <button
                    type="button"
                    aria-label="Return to swap pair"
                    onClick={() => setView('pair')}
                    className="tap-target mb-3 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-ios-gray"
                  >
                    <ArrowLeft size={15} />
                    Swap pair
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
                aria-label="Close swap player"
              >
                <X size={18} className="text-on-surface" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-0">
              {view === 'pair' ? (
                <div className="pt-1">
                  <h4 className="mb-2 text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">
                    Choose replacement pair
                  </h4>
                  {pairOptions.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-[18px] border border-ios-gray/10 bg-ios-gray/[0.04] px-5 text-center">
                      <Users size={18} className="text-ios-gray/50" />
                      <p className="text-[12px] font-extrabold text-on-surface">No other pair available</p>
                      <p className="text-[11px] font-semibold text-ios-gray">
                        Every active pair is already on this court. Replace one player instead.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[18px] border border-ios-gray/10 bg-white">
                      {pairOptions.map(({ entry, sourceCourt }, index) => (
                        <button
                          key={entry.team.id}
                          type="button"
                          onClick={() => onSelectTeam(swapRequest, entry.team.playerIds)}
                          className={cn(
                            'tap-target flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:scale-[0.99]',
                            index > 0 && 'border-t border-ios-gray/10'
                          )}
                          aria-label={`Swap in ${getFixedTeamLabel(entry.team, players)}${sourceCourt ? ` from court ${sourceCourt}` : ''}`}
                        >
                          <span className="flex shrink-0 items-center">
                            {renderPlayerAvatar(entry.players[0], pairAvatarClass, 'text-primary')}
                            <span className="-ml-2.5">
                              {renderPlayerAvatar(entry.players[1], pairAvatarClass, 'text-primary')}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">
                              {getFixedTeamLabel(entry.team, players)}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-ios-gray">
                              {sourceCourt
                                ? `Playing on court ${sourceCourt} · both pairs exchange courts`
                                : 'Sitting this round'}
                            </span>
                          </span>
                          <span className={cn(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[8.5px] font-black uppercase leading-none tracking-[0.06em]',
                            sourceCourt ? 'bg-sky-50 text-sky-700' : 'bg-ios-gray/[0.07] text-ios-gray'
                          )}>
                            {sourceCourt ? `Court ${sourceCourt}` : 'Sitting'}
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-ios-gray/30" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 border-t border-ios-gray/10">
                    <button
                      type="button"
                      onClick={() => setView('player')}
                      className="tap-target flex min-h-[54px] w-full items-center gap-3 py-3 text-left active:scale-[0.99]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.055] text-on-surface/58">
                        <UserRound size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">
                          Replace one player
                        </span>
                        <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-ios-gray">
                          Swap {swapRequest.currentPlayer.name.split(' ')[0]} out and update this pair.
                        </span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-ios-gray/50" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <h4 className="mb-2 text-[10px] font-black uppercase leading-none tracking-[0.15em] text-ios-gray/72">
                    Choose replacement player
                  </h4>
                  {replacementPlayers.length === 0 ? (
                    <div className="flex h-28 items-center justify-center rounded-[18px] border border-ios-gray/10 bg-ios-gray/[0.04] text-[12px] font-semibold text-ios-gray">
                      No replacement player available.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[18px] border border-ios-gray/10 bg-white">
                      {replacementPlayers.map((player, index) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => onSelectPlayer(swapRequest, player)}
                          className={cn(
                            'tap-target flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left active:scale-[0.99]',
                            index > 0 && 'border-t border-ios-gray/10'
                          )}
                        >
                          {renderPlayerAvatar(
                            player,
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-black text-primary',
                            'text-primary'
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-extrabold leading-tight tracking-[-0.015em] text-on-surface">
                              {player.name}
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-[11px] font-semibold text-ios-gray">
                                {isRegisteredPlayer(player) ? `MMR: ${formatDisplayMmr(player.rating)}` : 'Manual player · no MMR'}
                              </span>
                              <span className="shrink-0 rounded-full bg-ios-gray/[0.07] px-1.5 py-0.5 text-[8.5px] font-black uppercase leading-none tracking-[0.06em] text-ios-gray">
                                {playerMatchCounts[player.id] || 0} match
                              </span>
                            </span>
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-ios-gray/30" />
                        </button>
                      ))}
                    </div>
                  )}

                  {isFixedPartnerMode && (
                    <p className="mt-3 rounded-[13px] bg-amber-50 px-3 py-2 text-[11.5px] font-bold leading-snug text-amber-800">
                      Replacing one player permanently updates this fixed pair for the rest of the match.
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
