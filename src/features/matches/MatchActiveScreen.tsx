import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, BarChart2, CheckCircle2, CircleDot, Flame, Share2, Trophy, X } from 'lucide-react';
import { SharedViewerFomPlayCta } from '../../components/app/SharedViewerFomPlayCta';
import { cn } from '../../lib/utils';
import { type Friend, type Match, type Player, type ToxicIntensity, type Tournament, type TournamentHistory, type TournamentStatsSyncState } from '../../types';
import { getDisplayInitials } from '../ranking/leaderboardUtils';
import { resolveMatchBackground } from './matchBackgrounds';
import { buildLiveShameTicker, type LiveShameTickerEvent } from './liveShameTicker';
import { formatDurationFromMs, getTournamentElapsedMs } from './matchTimeUtils';
import { ActiveMatchActionMenu } from './ActiveMatchActionMenu';
import { ActiveMatchBackdrop } from './ActiveMatchBackdrop';
import { ActiveMatchRoundCard, type ActiveMatchSwapRequest } from './ActiveMatchRoundCard';
import { ActiveMatchRoundStepper } from './ActiveMatchRoundStepper';
import { ActiveMatchSummaryPanel } from './ActiveMatchSummaryPanel';
import { NoActiveMatchScreen } from './NoActiveMatchScreen';
import { SwapPlayerModal } from './SwapPlayerModal';
import { getReadyScoreCountForRound, getStatsSyncBadge } from './activeMatchDerived';
import { useModalBottomOffset, useNowMs } from './useActiveMatchUiState';
import { isFomRegisteredPlayer } from '../players/playerUtils';
import { getMatchThemeColor } from '../tournaments/matchTheme';
import { sanitizeInactivePlayerIds } from '../tournaments/tournamentDraft';
import { useMatchSettingsFriends } from './useMatchSettingsFriends';
import { buildOfficialStandings, buildOfficialTeamStandings } from './standingsUtils';
import { isFixedPartnerTournament } from './partnerMode';
import { getToxicIntensityLabel, normalizeToxicIntensity } from './toxicSettings';

type MatchActiveScreenProps = {
  onBack: () => void;
  onStartNewMatch: () => void;
  tournament: Tournament;
  currentUser?: any;
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void;
  onNextRound: () => void | Promise<void>;
  onStartAmericanoRound: (roundId: number) => void | Promise<void>;
  onCompleteAmericanoRound: (roundId: number, options?: { allowIncomplete?: boolean }) => void | Promise<void>;
  onUpdateRounds: (numRounds: number) => boolean;
  onUpdateCourts: (numCourts: number) => boolean;
  onUpdateToxicSettings: (settings: { toxicModeEnabled: boolean; toxicIntensity: ToxicIntensity }) => void;
  onAddManualPlayer: (player: Player) => void;
  onSaveRosterChanges: (activePlayerIds: string[], replacements: Array<{ manualPlayerId: string; newPlayer: Player }>) => void;
  onDeleteRoundsFrom: (roundId: number) => void;
  onDeleteMatch: () => void | Promise<void>;
  needsRegenerateFromRound: number | null;
  onOpenStandings: () => void;
  onSwapPlayer: (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => void;
  onShareMatch: () => void;
  isReadOnly: boolean;
  isSharedViewer: boolean;
  saveState: 'saved' | 'saving' | 'error';
  statsSyncState?: TournamentStatsSyncState | null;
};

const getLiveShameTickerToneClasses = (event: LiveShameTickerEvent) => {
  if (event.tone === 'danger') {
    // Keluarga gold seperti tab Shame; dot tetap oranye sebagai penanda "panas".
    return {
      container: 'border-[#D4A017]/30 bg-[#FFFBEF] shadow-[0_4px_12px_rgba(120,78,0,0.05)]',
      eyebrow: 'text-[#8A6A1F]',
      headline: 'text-on-surface',
      detail: 'text-on-surface/68',
      chip: 'border-[#D4A017]/18 bg-white/64 text-[#8A6A1F]',
      dot: 'bg-primary',
      arrow: 'text-[#B7861F]',
    };
  }

  if (event.tone === 'gold') {
    return {
      container: 'border-[#C9A14A]/45 bg-[#151008] text-[#F4D77B] shadow-[0_12px_28px_rgba(17,16,8,0.22)]',
      eyebrow: 'text-[#C9A14A]',
      headline: 'text-[#FFF1B8]',
      detail: 'text-[#D8C792]',
      chip: 'border-[#C9A14A]/28 bg-[#C9A14A]/10 text-[#F4D77B]',
      dot: 'bg-[#E8C45A]',
      arrow: 'text-[#E8C45A]',
    };
  }

  if (event.tone === 'amber') {
    return {
      container: 'border-[#D59B2C]/28 bg-[#FFFBF0] shadow-[0_6px_16px_rgba(183,134,31,0.055)]',
      eyebrow: 'text-[#8A6A1F]',
      headline: 'text-on-surface',
      detail: 'text-on-surface/66',
      chip: 'border-[#D59B2C]/14 bg-white/66 text-[#8A6A1F]',
      dot: 'bg-[#D59B2C]',
      arrow: 'text-[#B7861F]',
    };
  }

  return {
    container: 'border-[#D59B2C]/24 bg-[#FFFBF0] shadow-[0_6px_16px_rgba(183,134,31,0.045)]',
    eyebrow: 'text-[#8A6A1F]',
    headline: 'text-on-surface',
    detail: 'text-on-surface/62',
    chip: 'border-[#D59B2C]/12 bg-white/62 text-[#8A6A1F]',
    dot: 'bg-[#D59B2C]',
    arrow: 'text-[#B7861F]',
  };
};

const getLiveShameTickerAnnouncement = ({
  event,
  index,
  total,
}: {
  event: LiveShameTickerEvent;
  index: number;
  total: number;
}) => (
  [
    'Open Hall of Shame standings.',
    'Zona Cupu.',
    event.eyebrow ? `${event.eyebrow}.` : '',
    event.headline,
    event.detail,
    event.chips.length > 0 ? `Evidence: ${event.chips.slice(0, 2).join(', ')}.` : '',
    total > 1 ? `Ticker ${index + 1} of ${total}.` : '',
  ].filter(Boolean).join(' ')
);

const E2E_ACTIVE_MATCH_FRIENDS: Friend[] = [
  { uid: 'e2e-friend-reza', displayName: 'Reza FOM', mmr: 1510 },
  { uid: 'e2e-friend-nanda', displayName: 'Nanda Rally', mmr: 1485 },
];

const getRoundCardDomId = (roundId: number) => `active-round-card-${roundId}`;

const FOCUSABLE_DIALOG_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const useDialogKeyboardScope = ({
  isOpen,
  dialogRef,
  initialFocusRef,
  onClose,
}: {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableItems = (Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_DIALOG_SELECTOR)
      ) as HTMLElement[]).filter((item) => item.offsetParent !== null || item === document.activeElement);
      if (focusableItems.length === 0) return;

      const currentIndex = focusableItems.indexOf(document.activeElement as HTMLElement);
      const fallbackIndex = event.shiftKey ? focusableItems.length - 1 : 0;
      const nextIndex = currentIndex === -1
        ? fallbackIndex
        : event.shiftKey
          ? (currentIndex - 1 + focusableItems.length) % focusableItems.length
          : (currentIndex + 1) % focusableItems.length;
      event.preventDefault();
      focusableItems[nextIndex]?.focus();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown, true);
    window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [dialogRef, initialFocusRef, isOpen, onClose]);
};

export const MatchActiveScreen = ({
  onBack,
  onStartNewMatch,
  tournament,
  currentUser,
  onUpdateScore,
  onNextRound,
  onStartAmericanoRound,
  onCompleteAmericanoRound,
  onUpdateRounds,
  onUpdateCourts,
  onUpdateToxicSettings,
  onAddManualPlayer,
  onSaveRosterChanges,
  onDeleteRoundsFrom,
  onDeleteMatch,
  needsRegenerateFromRound,
  onOpenStandings,
  onSwapPlayer,
  onShareMatch,
  isReadOnly,
  isSharedViewer,
  saveState,
  statsSyncState
}: MatchActiveScreenProps) => {
  const [swappingPlayer, setSwappingPlayer] = useState<ActiveMatchSwapRequest | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [pendingManualReplacements, setPendingManualReplacements] = useState<Record<string, Player>>({});
  const [draftActivePlayerIds, setDraftActivePlayerIds] = useState<Set<string>>(new Set());
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [toxicTickerIndex, setToxicTickerIndex] = useState(0);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isFinishingMatch, setIsFinishingMatch] = useState(false);
  const [incompleteRoundConfirm, setIncompleteRoundConfirm] = useState<{
    roundId: number;
    incompleteCount: number;
    readyCount: number;
    totalCount: number;
    courtLabel: string;
    pointProgress: {
      entered: number;
      target: number;
      remaining: number;
    };
  } | null>(null);
  const [isCompletingIncompleteRound, setIsCompletingIncompleteRound] = useState(false);
  const finishMatchButtonRef = useRef<HTMLButtonElement | null>(null);
  const finishConfirmDialogRef = useRef<HTMLElement | null>(null);
  const finishConfirmCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const incompleteRoundDialogRef = useRef<HTMLElement | null>(null);
  const incompleteRoundCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const nowMs = useNowMs();
  const modalBottomOffset = useModalBottomOffset();
  const currentUserUid = String(currentUser?.uid || '').trim();
  const currentUserPhotoURL = typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '';
  const { friends, loadingFriends } = useMatchSettingsFriends(currentUserUid);
  // Live top-3 klasemen berjalan — pengisi ruang di bawah panel aksi,
  // sekaligus shortcut ke tab Standings.
  const liveTopThree = useMemo(() => {
    const standings = buildOfficialStandings({
      tournament,
      friends,
      currentUserUid,
      currentUserDisplayName: currentUser?.displayName,
      currentUserEmail: currentUser?.email,
      currentUserPhotoURL,
    });
    if (!standings.hasCountableScore) return [];
    const rows = isFixedPartnerTournament(tournament) && (tournament.fixedTeams || []).length > 0
      ? buildOfficialTeamStandings({ tournament, officialStandings: standings }).players
      : standings.players;
    return rows.slice(0, 3);
  }, [tournament, friends, currentUserUid, currentUser?.displayName, currentUser?.email, currentUserPhotoURL]);
  const isE2EUser = currentUserUid === 'e2e-user';
  const visibleFriends = isE2EUser && friends.length === 0 ? E2E_ACTIVE_MATCH_FRIENDS : friends;
  const visibleLoadingFriends = isE2EUser ? false : loadingFriends;
  void saveState;
  const closeFinishConfirm = useCallback(() => {
    setIsFinishConfirmOpen(false);
    window.requestAnimationFrame(() => {
      if (!finishMatchButtonRef.current?.isConnected) return;
      finishMatchButtonRef.current.focus();
    });
  }, []);
  const closeIncompleteRoundConfirm = useCallback(() => {
    if (isCompletingIncompleteRound) return;
    const triggerRoundId = incompleteRoundConfirm?.roundId;
    setIncompleteRoundConfirm(null);
    if (!triggerRoundId) return;
    window.requestAnimationFrame(() => {
      const triggerButton = document.querySelector<HTMLButtonElement>(`[data-americano-round-action="${triggerRoundId}"]`);
      if (!triggerButton?.isConnected || triggerButton.disabled) return;
      triggerButton.focus();
    });
  }, [incompleteRoundConfirm?.roundId, isCompletingIncompleteRound]);

  const buildPlayerFromFriend = (friend: Friend): Player => {
    const initials = friend.displayName
      .split(' ')
      .filter(Boolean)
      .map((namePart) => namePart[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'FR';

    return {
      id: friend.uid,
      name: friend.displayName,
      rating: friend.mmr || 0,
      source: 'fom',
      avatar: friend.photoURL || '',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
    };
  };

  const playerMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tournament.players.forEach((player) => {
      counts[player.id] = 0;
    });
    tournament.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        [...match.teamA.players, ...match.teamB.players].forEach((player) => {
          if (counts[player.id] !== undefined) counts[player.id] += 1;
        });
      });
    });
    return counts;
  }, [tournament]);

  const currentRoundIndex = useMemo(() => {
    const activeIndex = tournament.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
    if (activeIndex !== -1) return activeIndex;
    for (let index = tournament.rounds.length - 1; index >= 0; index -= 1) {
      const round = tournament.rounds[index];
      const hasProgress = round.matches.some((match) => (
        match.status === 'completed' ||
        (match.teamA.score || 0) > 0 ||
        (match.teamB.score || 0) > 0 ||
        (match.pointsA || '0') !== '0' ||
        (match.pointsB || '0') !== '0'
      ));
      if (hasProgress) return index;
    }
    return tournament.rounds.length > 0 ? 0 : -1;
  }, [tournament.rounds]);
  const hasActiveTournament = currentRoundIndex !== -1;
  const hasTournamentData = tournament.rounds.length > 0;
  const shouldShowActiveMatchScreen = hasTournamentData;
  const inactivePlayerIds = useMemo(
    () => sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds),
    [tournament.players, tournament.inactivePlayerIds]
  );
  const inactivePlayerIdSet = useMemo(() => new Set(inactivePlayerIds), [inactivePlayerIds]);
  const currentActivePlayerIds = useMemo(
    () => tournament.players
      .map((player) => player.id)
      .filter((playerId) => !inactivePlayerIdSet.has(playerId)),
    [tournament.players, inactivePlayerIdSet]
  );
  const draftPlayers = useMemo(
    () => tournament.players.map((player) => pendingManualReplacements[player.id] || player),
    [tournament.players, pendingManualReplacements]
  );
  const tournamentPlayerById = useMemo(() => {
    const registry = new Map<string, Player>();
    tournament.players.forEach((player) => {
      registry.set(player.id, player);
    });
    return registry;
  }, [tournament.players]);
  const friendById = useMemo(() => {
    const registry = new Map<string, Friend>();
    visibleFriends.forEach((friend) => {
      const friendUid = String(friend?.uid || '').trim();
      if (friendUid) registry.set(friendUid, friend);
    });
    return registry;
  }, [visibleFriends]);

  const getPlayerDisplay = (player: Player) => {
    const registeredPlayer = tournamentPlayerById.get(player.id);
    const friendProfile = friendById.get(player.id);
    const isCurrentUserPlayer = Boolean(currentUserUid) && player.id === currentUserUid;
    const liveName = isCurrentUserPlayer
      ? (currentUser?.displayName || currentUser?.email?.split('@')[0] || '')
      : (friendProfile?.displayName || '');
    const liveAvatar = isCurrentUserPlayer
      ? currentUserPhotoURL
      : (friendProfile?.photoURL || '');
    const resolvedAvatar = isCurrentUserPlayer
      ? (liveAvatar || registeredPlayer?.avatar || player.avatar)
      : (liveAvatar || registeredPlayer?.avatar || player.avatar);
    const resolvedName = liveName || player.name || registeredPlayer?.name || 'Player';
    return {
      ...registeredPlayer,
      ...player,
      name: resolvedName,
      avatar: resolvedAvatar,
      initials: player.initials || registeredPlayer?.initials || getDisplayInitials(resolvedName)
    } as Player;
  };

  const renderPlayerAvatar = (
    player: Player,
    className: string,
    fallbackClassName = 'text-ios-gray'
  ) => {
    const displayPlayer = getPlayerDisplay(player);

    return (
      <div className={cn(className, 'overflow-hidden')}>
        {displayPlayer.avatar ? (
          <img
            src={displayPlayer.avatar}
            alt={displayPlayer.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={fallbackClassName}>{displayPlayer.initials}</span>
        )}
      </div>
    );
  };

  const activePlayerCount = useMemo(
    () => tournament.players.filter((player) => !inactivePlayerIdSet.has(player.id)).length,
    [tournament.players, inactivePlayerIdSet]
  );
  const activeRound = currentRoundIndex !== -1 ? (tournament.rounds[currentRoundIndex] ?? null) : null;
  const activeRoundId = activeRound?.id ?? null;
  const isLastRound = currentRoundIndex !== -1 && currentRoundIndex >= (tournament.numRounds - 1);
  const activeRoundMatchCount = activeRound?.matches.length || 0;
  const activeRoundReadyScoreCount = useMemo(() => (
    getReadyScoreCountForRound({
      round: activeRound,
      format: tournament.format,
      totalPoints: tournament.totalPoints
    })
  ), [activeRound, tournament.format, tournament.totalPoints]);
  const isActiveRoundScoreFullyFilled = (
    activeRoundMatchCount > 0 &&
    activeRoundReadyScoreCount === activeRoundMatchCount
  );
  const activeRoundPointProgress = useMemo(() => (
    getRoundPointProgress({
      round: activeRound,
      format: tournament.format,
      totalPoints: tournament.totalPoints,
    })
  ), [activeRound, tournament.format, tournament.totalPoints]);
  const totalElapsed = formatDurationFromMs(
    getTournamentElapsedMs(
      tournament.rounds,
      nowMs,
      (tournament as TournamentHistory).endedAt
    )
  );
  const activeHeroPhoto = useMemo(
    () => resolveMatchBackground(tournament.format, tournament.backgroundId),
    [tournament.backgroundId, tournament.format]
  );
  const fomPlayUrl = useMemo(() => {
    const configuredBase = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
    const runtimeBase = `${window.location.protocol}//${window.location.host}`;
    return (configuredBase || runtimeBase).replace(/\/+$/, '');
  }, []);
  const matchThemeColor = getMatchThemeColor(tournament.format, tournament.themeColorId);
  const toxicIntensity = normalizeToxicIntensity(tournament.toxicIntensity);
  const pageBgTheme = {
    base: matchThemeColor.pageBase,
    photoBlend: matchThemeColor.photoBlend
  };
  const gameDateLabel = tournament.startedAt
    ? new Date(tournament.startedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : '';
  const venueLabel = (tournament.venueName || '').trim();
  const cityLabel = (tournament.location || '').trim();
  const placeLabel = [venueLabel, cityLabel].filter(Boolean).join(' | ');
  const locationDateLabel = placeLabel ? `${placeLabel} | ${gameDateLabel}` : gameDateLabel;
  const completedRounds = tournament.rounds.filter((round) => round.matches.every((match) => match.status === 'completed')).length;
  const totalRounds = Math.max(tournament.numRounds || 0, tournament.rounds.length);
  const isTournamentEnded = totalRounds > 0 && completedRounds >= totalRounds;
  const statsSyncBadge = getStatsSyncBadge({
    isTournamentEnded,
    isSharedViewer,
    statsSyncState
  });
  const incompleteActiveCourtLabels = useMemo(() => {
    if (!activeRound || isTournamentEnded) return [];
    return activeRound.matches
      .filter((match) => !isRoundMatchScoreReady({
        match,
        format: tournament.format,
        totalPoints: tournament.totalPoints,
      }))
      .map((match) => `Court ${match.court || '-'}`);
  }, [activeRound, isTournamentEnded, tournament.format, tournament.totalPoints]);
  const incompleteActiveCourtSummary = formatCourtList(incompleteActiveCourtLabels);
  const showSharedTrialCta = isSharedViewer && !currentUserUid;
  const pageBottomPadding = showSharedTrialCta
    ? 'calc(var(--app-safe-bottom, 0px) + 168px)'
    : 'calc(var(--app-safe-bottom, 0px) + 112px)';
  const roundIdsForReset = useMemo(
    () => tournament.rounds.map((round) => round.id).filter((roundId) => roundId > 1).sort((a, b) => b - a),
    [tournament.rounds]
  );
  const hasDraftRosterChanges = useMemo(() => {
    const nextActiveIds = draftPlayers
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));
    const hasActivePlayerChanges = (
      nextActiveIds.length !== currentActivePlayerIds.length ||
      nextActiveIds.some((playerId, idx) => playerId !== currentActivePlayerIds[idx])
    );
    return hasActivePlayerChanges || Object.keys(pendingManualReplacements).length > 0;
  }, [draftPlayers, draftActivePlayerIds, currentActivePlayerIds, pendingManualReplacements]);
  const infoTheme = {
    shadow: matchThemeColor.shadow
  };
  const accentTheme = {
    text: matchThemeColor.accent,
    textSoft: matchThemeColor.accentSoft,
    bgSoft: matchThemeColor.accentBg,
    bgSoftHover: 'hover:bg-ios-gray/[0.055]',
    borderSoft: matchThemeColor.accentBorder,
    solid: matchThemeColor.accentSolid,
    solidShadow: matchThemeColor.accentSolidShadow,
    headingStrong: matchThemeColor.accent,
    headingSoft: matchThemeColor.accentSoft,
    headingIdle: 'text-[#4B5563]',
    headingSurface: 'bg-white/58',
    headingSurfaceBorder: 'border-white/60'
  };
  const roundIdsKey = useMemo(() => (
    tournament.rounds.map((round) => round.id).join('|')
  ), [tournament.rounds]);

  const scrollRoundCardIntoView = useCallback((roundId: number) => {
    window.requestAnimationFrame(() => {
      const card = document.getElementById(getRoundCardDomId(roundId));
      if (!card) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      card.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  // Transisi ronde: begitu ronde lain jadi aktif (mis. habis tekan Start
  // Round), fokuskan viewport ke kartunya supaya pergantian tidak bikin
  // bingung. Load pertama tidak di-scroll.
  const previousActiveRoundIdRef = useRef<number | null>(null);
  const hasSyncedActiveRoundRef = useRef(false);
  useEffect(() => {
    if (!hasActiveTournament || activeRoundId === null) return;
    const collapsed = new Set<number>();
    tournament.rounds.forEach((round) => {
      if (round.id !== activeRoundId) collapsed.add(round.id);
    });
    setCollapsedRounds(collapsed);
    if (hasSyncedActiveRoundRef.current && previousActiveRoundIdRef.current !== activeRoundId) {
      scrollRoundCardIntoView(activeRoundId);
    }
    hasSyncedActiveRoundRef.current = true;
    previousActiveRoundIdRef.current = activeRoundId;
  }, [activeRoundId, hasActiveTournament, roundIdsKey, scrollRoundCardIntoView]);

  const toggleRound = (roundId: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  const focusRound = (roundId: number) => {
    setCollapsedRounds(new Set(tournament.rounds.filter((round) => round.id !== roundId).map((round) => round.id)));
    scrollRoundCardIntoView(roundId);
  };

  // Americano: habis Complete Round N, ronde N+1 tadinya tersembunyi total
  // (kartu collapsed tidak dirender) — buka & scroll ke sana supaya CTA
  // "Start Round N+1" langsung kelihatan.
  const focusNextRoundAfterComplete = (completedRoundId: number) => {
    const nextRound = tournament.rounds.find((round) => round.id === completedRoundId + 1);
    if (!nextRound) return;
    focusRound(nextRound.id);
  };

  const handleAdjustMatchScore = (match: Match, team: 'A' | 'B', delta: number) => {
    if (isReadOnly) return;
    const currentScore = team === 'A' ? match.teamA.score : match.teamB.score;
    const pointTarget = Math.max(0, tournament.totalPoints || 0);
    const nextScore = pointTarget > 0
      ? Math.max(0, Math.min(pointTarget, currentScore + delta))
      : Math.max(0, currentScore + delta);

    if (tournament.format !== 'Match Play' && pointTarget > 0) {
      const otherScore = Math.max(0, pointTarget - nextScore);
      if (team === 'A') {
        onUpdateScore(match.id, 'A', nextScore);
        onUpdateScore(match.id, 'B', otherScore);
        return;
      }
      onUpdateScore(match.id, 'A', otherScore);
      onUpdateScore(match.id, 'B', nextScore);
      return;
    }

    onUpdateScore(match.id, team, nextScore);
  };

  const handleSetMatchScore = (match: Match, team: 'A' | 'B', score: number) => {
    if (isReadOnly) return;
    const pointTarget = Math.max(0, tournament.totalPoints || 0);
    const safeScore = pointTarget > 0 ? Math.max(0, Math.min(pointTarget, score)) : Math.max(0, score);

    if (tournament.format !== 'Match Play' && pointTarget > 0) {
      const otherScore = Math.max(0, pointTarget - safeScore);
      if (team === 'A') {
        onUpdateScore(match.id, 'A', safeScore);
        onUpdateScore(match.id, 'B', otherScore);
        return;
      }
      onUpdateScore(match.id, 'A', otherScore);
      onUpdateScore(match.id, 'B', safeScore);
      return;
    }

    onUpdateScore(match.id, team, safeScore);
  };

  const handleOpenManageMatch = () => {
    setDraftActivePlayerIds(new Set(currentActivePlayerIds));
    setPendingManualReplacements({});
    setIsActionMenuOpen(true);
  };

  const handleDeleteMatch = () => {
    setIsActionMenuOpen(false);
    void onDeleteMatch();
  };

  const handleToxicModeChange = (enabled: boolean) => {
    if (isTournamentEnded) return;
    onUpdateToxicSettings({
      toxicModeEnabled: enabled,
      toxicIntensity,
    });
  };

  const handleToxicIntensityChange = (value: ToxicIntensity) => {
    if (isTournamentEnded) return;
    onUpdateToxicSettings({
      toxicModeEnabled: true,
      toxicIntensity: normalizeToxicIntensity(value),
    });
  };

  const toggleDraftActivePlayer = (playerId: string) => {
    setDraftActivePlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleSaveActivePlayers = () => {
    const nextActiveIds = draftPlayers
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));

    if (!hasDraftRosterChanges) {
      return true;
    }

    onSaveRosterChanges(
      nextActiveIds,
      (Object.entries(pendingManualReplacements) as Array<[string, Player]>).map(([manualPlayerId, newPlayer]) => ({
        manualPlayerId,
        newPlayer,
      }))
    );
    setPendingManualReplacements({});
    return true;
  };

  const handleAddPlayerFromActive = (newPlayer: Player) => {
    onAddManualPlayer(newPlayer);
    setDraftActivePlayerIds((prev) => {
      const next = new Set(prev);
      next.add(newPlayer.id);
      return next;
    });
  };

  const handleReplaceManualPlayerFromFriend = (manualPlayer: Player, friend: Friend) => {
    const replacementPlayer = buildPlayerFromFriend(friend);
    setPendingManualReplacements((prev) => ({
      ...prev,
      [manualPlayer.id]: replacementPlayer,
    }));
    setDraftActivePlayerIds((prev) => {
      if (!prev.has(manualPlayer.id)) return prev;
      const next = new Set(prev);
      next.delete(manualPlayer.id);
      next.add(replacementPlayer.id);
      return next;
    });
  };

  const handleProceedToNextRound = () => {
    void onNextRound();
  };

  const handleCompleteAmericanoRoundRequest = (roundId: number) => {
    if (isReadOnly) return;
    if (tournament.format !== 'Americano') {
      void onCompleteAmericanoRound(roundId);
      return;
    }

    const targetRound = tournament.rounds.find((round) => round.id === roundId);
    if (!targetRound) return;

    const incompleteMatches = targetRound.matches.filter((match) => !isRoundMatchScoreReady({
      match,
      format: tournament.format,
      totalPoints: tournament.totalPoints,
    }));

    if (incompleteMatches.length === 0) {
      void Promise.resolve(onCompleteAmericanoRound(roundId)).then(() => focusNextRoundAfterComplete(roundId));
      return;
    }

    const courtLabels = incompleteMatches.map((match) => `Court ${match.court || '-'}`);
    setIncompleteRoundConfirm({
      roundId,
      incompleteCount: incompleteMatches.length,
      readyCount: Math.max(0, targetRound.matches.length - incompleteMatches.length),
      totalCount: targetRound.matches.length,
      courtLabel: formatCourtList(courtLabels),
      pointProgress: getRoundPointProgress({
        round: targetRound,
        format: tournament.format,
        totalPoints: tournament.totalPoints,
      }),
    });
  };

  const handleConfirmIncompleteRound = async () => {
    if (!incompleteRoundConfirm || isCompletingIncompleteRound) return;
    const completedRoundId = incompleteRoundConfirm.roundId;
    setIsCompletingIncompleteRound(true);
    try {
      await onCompleteAmericanoRound(completedRoundId, { allowIncomplete: true });
      setIncompleteRoundConfirm(null);
      focusNextRoundAfterComplete(completedRoundId);
    } finally {
      setIsCompletingIncompleteRound(false);
    }
  };

  const handleConfirmFinishMatch = async () => {
    if (isFinishingMatch) return;
    setIsFinishingMatch(true);
    setIsFinishConfirmOpen(false);
    try {
      await onNextRound();
    } finally {
      setIsFinishingMatch(false);
    }
  };

  const toxicTicker = useMemo(() => (
    buildLiveShameTicker({
      tournament,
      activeRound,
    })
  ), [activeRound, tournament]);
  const toxicTickerEventKey = toxicTicker.events.map((event) => event.id).join('|');
  const activeToxicTickerEvent = toxicTicker.events[toxicTickerIndex % toxicTicker.events.length] || toxicTicker.events[0];
  const activeToxicTickerTone = getLiveShameTickerToneClasses(activeToxicTickerEvent);
  const activeToxicTickerAnnouncement = useMemo(() => (
    getLiveShameTickerAnnouncement({
      event: activeToxicTickerEvent,
      index: toxicTickerIndex % toxicTicker.events.length,
      total: toxicTicker.events.length,
    })
  ), [activeToxicTickerEvent, toxicTicker.events.length, toxicTickerIndex]);

  useEffect(() => {
    setToxicTickerIndex(0);
  }, [toxicTickerEventKey]);

  useDialogKeyboardScope({
    isOpen: isFinishConfirmOpen,
    dialogRef: finishConfirmDialogRef,
    initialFocusRef: finishConfirmCloseButtonRef,
    onClose: closeFinishConfirm,
  });

  useDialogKeyboardScope({
    isOpen: Boolean(incompleteRoundConfirm),
    dialogRef: incompleteRoundDialogRef,
    initialFocusRef: incompleteRoundCloseButtonRef,
    onClose: closeIncompleteRoundConfirm,
  });

  useEffect(() => {
    if (toxicTicker.events.length <= 1) return undefined;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const intervalId = window.setInterval(() => {
      setToxicTickerIndex((currentIndex) => (currentIndex + 1) % toxicTicker.events.length);
    }, 4600);

    return () => window.clearInterval(intervalId);
  }, [toxicTicker.events.length, toxicTickerEventKey]);

  const showActionPanel = isTournamentEnded || (!isReadOnly && tournament.format !== 'Americano');
  const actionPanelEyebrow = isTournamentEnded
    ? 'Match complete'
    : isLastRound
      ? 'Final step'
      : 'Next action';
  // Satu judul saja per state — status + sisa poin tidak diulang di subteks.
  const actionPanelTitle = isTournamentEnded
    ? 'Results are ready'
    : isActiveRoundScoreFullyFilled
      ? (isLastRound ? 'Finish and save this match' : `Move to round ${(activeRoundId || 0) + 1}`)
      : activeRoundPointProgress.entered > 0 && incompleteActiveCourtSummary
        ? `${formatPointRemainder(activeRoundPointProgress.remaining)} left on ${incompleteActiveCourtSummary}`
      : incompleteActiveCourtSummary
        ? `Complete ${incompleteActiveCourtSummary} to continue`
        : 'Complete every court score to continue';
  const actionPanelHelper = isTournamentEnded
    ? 'Review standings or share the match link.'
    : '';
  const actionPanelPrimaryLabel = isTournamentEnded
    ? 'View Standings'
    : !isLastRound && !isActiveRoundScoreFullyFilled
      ? activeRoundPointProgress.entered > 0
        ? 'Finish score first'
        : 'Complete score first'
    : isLastRound
      ? 'Finish Match'
      : 'Next Round';
  const actionPanelPrimaryDisabled = !isTournamentEnded && !isActiveRoundScoreFullyFilled;
  const handleActionPanelPrimary = () => {
    if (isTournamentEnded) {
      onOpenStandings();
      return;
    }
    if (actionPanelPrimaryDisabled) return;
    if (isLastRound) {
      setIsFinishConfirmOpen(true);
      return;
    }
    handleProceedToNextRound();
  };

  if (!shouldShowActiveMatchScreen) {
    return (
      <NoActiveMatchScreen
        onBack={onBack}
        onStartNewMatch={onStartNewMatch}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white z-0">
      <ActiveMatchBackdrop
        heroPhoto={activeHeroPhoto}
        pageBgTheme={pageBgTheme}
      />

      <main
        className="standings-main relative z-10 mx-auto min-h-screen w-full max-w-md bg-white px-6"
        style={{
          paddingTop: 'calc(var(--app-safe-top, 0px) + 24px)',
          paddingBottom: pageBottomPadding
        }}
      >
        <ActiveMatchSummaryPanel
          isSharedViewer={isSharedViewer}
          statsSyncBadge={statsSyncBadge}
          infoShadowClass={infoTheme.shadow}
          navIconClass={accentTheme.text}
          navBorderClass={accentTheme.borderSoft}
          matchName={tournament.name || '-'}
          locationDateLabel={locationDateLabel}
          totalElapsed={totalElapsed}
          format={tournament.format}
          activePlayerCount={activePlayerCount}
          totalPlayerCount={tournament.players.length}
          courts={tournament.courts}
          completedRounds={completedRounds}
          totalRounds={totalRounds}
          isReadOnly={isReadOnly}
          needsRegenerateFromRound={needsRegenerateFromRound}
          onOpenFomPlay={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
          onOpenSettings={handleOpenManageMatch}
          onOpenStandings={onOpenStandings}
          onShareMatch={onShareMatch}
        />

        <ActiveMatchRoundStepper
          rounds={tournament.rounds}
          totalRounds={totalRounds}
          activeRoundId={activeRoundId}
          collapsedRounds={collapsedRounds}
          needsRegenerateFromRound={needsRegenerateFromRound}
          onSelectRound={focusRound}
        />

        {tournament.rounds.map((round) => {
          const isActive = activeRoundId !== null && round.id === activeRoundId;
          const isCollapsed = collapsedRounds.has(round.id);

          return (
            <div
              key={round.id}
              id={getRoundCardDomId(round.id)}
              className={!isCollapsed ? 'mt-2.5' : undefined}
              style={{ scrollMarginTop: 'calc(var(--app-safe-top, 0px) + 16px)' }}
            >
              <ActiveMatchRoundCard
                round={round}
                format={tournament.format}
                isActive={isActive}
                isCollapsed={isCollapsed}
                isReadOnly={isReadOnly}
                totalPoints={tournament.totalPoints}
                accentTheme={accentTheme}
                scoreToneClass="text-[#E65E14]"
                onStartRound={onStartAmericanoRound}
                onCompleteRound={handleCompleteAmericanoRoundRequest}
                onAdjustScore={handleAdjustMatchScore}
                onSetScore={handleSetMatchScore}
                onOpenSwapPlayer={setSwappingPlayer}
              />
            </div>
          );
        })}

        {tournament.toxicModeEnabled && (
          <button
            type="button"
            onClick={onOpenStandings}
            className={cn(
              'toxic-live-ticker tap-target relative mt-2.5 flex w-full items-center gap-3 overflow-hidden rounded-[17px] border px-3.5 py-3 text-left active:scale-[0.99]',
              activeToxicTickerTone.container
            )}
            aria-label={activeToxicTickerAnnouncement}
            aria-live="polite"
            aria-atomic="true"
          >
              <span className="toxic-live-ticker-sheen" aria-hidden="true" />
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/10 bg-white/46">
                <span className={cn('toxic-live-ticker-dot h-2 w-2 rounded-full', activeToxicTickerTone.dot)} />
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className={cn('shrink-0 text-[9px] font-black uppercase leading-none tracking-[0.16em]', activeToxicTickerTone.eyebrow)}>
                    Zona Cupu
                  </p>
                  <span className={cn('shrink-0 rounded-full border border-current/10 bg-white/32 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.06em]', activeToxicTickerTone.eyebrow)}>
                    {activeToxicTickerEvent.eyebrow}
                  </span>
                  {toxicTicker.events.length > 1 && (
                    <span className="shrink-0 rounded-full border border-current/10 bg-white/42 px-1.5 py-0.5 text-[8px] font-black leading-none tabular-nums opacity-70">
                      {(toxicTickerIndex % toxicTicker.events.length) + 1}/{toxicTicker.events.length}
                    </span>
                  )}
                </div>
                <div key={activeToxicTickerEvent.id} className="toxic-live-ticker-event mt-1.5 min-w-0">
                  <p className={cn('line-clamp-2 text-[12.5px] font-black leading-tight tracking-[-0.012em]', activeToxicTickerTone.headline)}>
                    {activeToxicTickerEvent.headline}
                  </p>
                  {activeToxicTickerEvent.chips.length > 0 && (
                    <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
                      {activeToxicTickerEvent.chips.slice(0, 2).map((chip) => (
                        <span
                          key={`${activeToxicTickerEvent.id}:${chip}`}
                          className={cn('rounded-full border px-2 py-[3px] text-[9px] font-black uppercase leading-none tracking-[0.04em]', activeToxicTickerTone.chip)}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight size={17} strokeWidth={2.1} className={cn('relative z-10 shrink-0', activeToxicTickerTone.arrow)} aria-hidden="true" />
          </button>
        )}

        {showActionPanel && (
          <section className={cn(
            'mt-2.5 rounded-[18px] border border-black/10 bg-white shadow-[0_6px_18px_rgba(17,19,23,0.035)]',
            actionPanelPrimaryDisabled ? 'px-4 py-3.5' : 'px-4.5 py-4'
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9.5px] font-extrabold uppercase leading-none tracking-[0.18em] text-primary">
                  {actionPanelEyebrow}
                </p>
                <h3 className={cn(
                  'font-display font-bold leading-tight tracking-[-0.018em] text-on-surface',
                  actionPanelPrimaryDisabled ? 'mt-1.5 text-[16px]' : 'mt-2 text-[17px]'
                )}>
                  {actionPanelTitle}
                </h3>
                {actionPanelHelper && (
                  <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-on-surface/60">
                    {actionPanelHelper}
                  </p>
                )}
              </div>
              {isTournamentEnded && (
                <button
                  type="button"
                  onClick={onShareMatch}
                  className="tap-target inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary/[0.08] px-3 text-primary"
                  aria-label="Share match"
                >
                  <Share2 size={16} strokeWidth={2.2} />
                  <span className="text-[12px] font-bold leading-none tracking-[-0.01em]">Share</span>
                </button>
              )}
            </div>

            <button
              ref={isLastRound ? finishMatchButtonRef : undefined}
              type="button"
              onClick={handleActionPanelPrimary}
              disabled={actionPanelPrimaryDisabled}
              className={cn(
                'tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] font-bold active:scale-[0.99]',
                actionPanelPrimaryDisabled
                  ? 'h-10 bg-ios-gray/[0.045] text-[13.5px] text-ios-gray/50'
                  : isTournamentEnded
                    ? 'h-[42px] bg-primary text-[14px] text-white shadow-[0_10px_20px_rgba(230,94,20,0.16)]'
                    : isLastRound
                      ? 'h-[42px] bg-[#E65E14] text-[14px] text-white font-extrabold shadow-[0_10px_22px_rgba(230,94,20,0.24)]'
                      : 'h-[42px] bg-primary/10 text-[14px] text-primary'
              )}
            >
              {actionPanelPrimaryLabel}
              {!actionPanelPrimaryDisabled && <ArrowRight size={15} strokeWidth={2.4} />}
            </button>
          </section>
        )}

        {!isTournamentEnded && liveTopThree.length >= 2 && (
          <button
            type="button"
            onClick={onOpenStandings}
            className="tap-target mt-2.5 flex w-full flex-col gap-2 rounded-[18px] border border-black/[0.06] bg-white px-4 py-3.5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-transform active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
            aria-label="Open live standings"
          >
            <div className="flex w-full items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/62">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Live standings
              </p>
              <span className="text-[9px] font-black uppercase leading-none tracking-[0.1em] text-primary">Lihat semua →</span>
            </div>
            {liveTopThree.map((player, index) => (
              <div key={player.id} className="flex w-full items-center gap-2.5">
                <span className={cn(
                  'w-[20px] shrink-0 text-[13px] font-extrabold leading-none tabular-nums',
                  index === 0 ? 'text-primary' : 'text-[#C5C5CA]'
                )}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/10 text-[8px] font-black text-ios-gray">
                  {player.avatar ? (
                    <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
                  ) : player.initials.slice(0, 2)}
                </span>
                <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold leading-tight text-on-surface">{player.name}</p>
                <span className="shrink-0 text-[12.5px] font-extrabold leading-none tabular-nums text-on-surface">{player.totalPoints}</span>
                <span className={cn(
                  'w-[30px] shrink-0 text-right text-[10.5px] font-bold leading-none tabular-nums',
                  player.pointsDiff > 0 ? 'text-[#1E8E3E]' : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray/60'
                )}>
                  {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                </span>
              </div>
            ))}
          </button>
        )}
      </main>

      <nav
        className="fixed inset-x-0 z-[94] px-4"
        style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 14px)' }}
      >
        <div className="mx-auto grid w-[min(100%,258px)] grid-cols-2 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/88 px-2 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.13)] backdrop-blur-xl">
          <button
            type="button"
            className="tap-target flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#FFF3ED] px-3 text-[#E65E14]"
            aria-current="page"
          >
            <CircleDot size={17} strokeWidth={2.15} />
            <span className="text-[12px] font-semibold leading-none tracking-tight">Match</span>
          </button>
          <button
            type="button"
            onClick={onOpenStandings}
            className="tap-target flex h-10 items-center justify-center gap-1.5 rounded-full bg-transparent px-3 text-ios-gray transition-colors active:bg-[#F7F7FA] active:text-on-surface"
          >
            <BarChart2 size={17} strokeWidth={2.15} />
            <span className="text-[12px] font-semibold leading-none tracking-tight">Standings</span>
          </button>
        </div>
      </nav>

      {showSharedTrialCta && <SharedViewerFomPlayCta />}

      <FinishMatchConfirmSheet
        isOpen={isFinishConfirmOpen}
        isSaving={isFinishingMatch}
        dialogRef={finishConfirmDialogRef}
        closeButtonRef={finishConfirmCloseButtonRef}
        matchName={tournament.name || 'This match'}
        roundsLabel={`${totalRounds || tournament.rounds.length} rounds`}
        courtsLabel={`${tournament.courts} court${tournament.courts > 1 ? 's' : ''}`}
        playersLabel={`${activePlayerCount} active players`}
        durationLabel={totalElapsed}
        toxicModeEnabled={Boolean(tournament.toxicModeEnabled)}
        toxicIntensityLabel={getToxicIntensityLabel(toxicIntensity)}
        onCancel={closeFinishConfirm}
        onConfirm={() => void handleConfirmFinishMatch()}
      />

      <IncompleteRoundConfirmSheet
        confirmState={incompleteRoundConfirm}
        isSaving={isCompletingIncompleteRound}
        dialogRef={incompleteRoundDialogRef}
        closeButtonRef={incompleteRoundCloseButtonRef}
        onCancel={closeIncompleteRoundConfirm}
        onConfirm={() => void handleConfirmIncompleteRound()}
      />

      <ActiveMatchActionMenu
        isOpen={isActionMenuOpen && !isReadOnly}
        modalBottomOffset={modalBottomOffset}
        matchDateLabel={gameDateLabel}
        format={tournament.format}
        courts={tournament.courts}
        totalPoints={tournament.totalPoints}
        scoringType={tournament.scoringType}
        numRounds={tournament.numRounds}
        players={draftPlayers}
        activePlayerCount={activePlayerCount}
        draftActivePlayerIds={draftActivePlayerIds}
        hasPlayerChanges={hasDraftRosterChanges}
        friends={visibleFriends}
        loadingFriends={visibleLoadingFriends}
        canResetRounds={roundIdsForReset.length > 0}
        roundIds={roundIdsForReset}
        recommendedRoundId={needsRegenerateFromRound}
        toxicModeEnabled={Boolean(tournament.toxicModeEnabled)}
        toxicIntensity={toxicIntensity}
        isToxicSettingsLocked={isTournamentEnded}
        renderPlayerAvatar={renderPlayerAvatar}
        isManualPlayer={(player) => !isFomRegisteredPlayer(player)}
        onClose={() => setIsActionMenuOpen(false)}
        onTogglePlayer={toggleDraftActivePlayer}
        onSelectAllPlayers={() => setDraftActivePlayerIds(new Set(draftPlayers.map((player) => player.id)))}
        onClearPlayers={() => setDraftActivePlayerIds(new Set())}
        onSavePlayers={handleSaveActivePlayers}
        onAddPlayer={handleAddPlayerFromActive}
        onReplaceManualPlayer={handleReplaceManualPlayerFromFriend}
        onUpdateRounds={onUpdateRounds}
        onUpdateCourts={onUpdateCourts}
        onDeleteRoundsFrom={onDeleteRoundsFrom}
        onToxicModeChange={handleToxicModeChange}
        onToxicIntensityChange={handleToxicIntensityChange}
        onShareMatch={onShareMatch}
        onDeleteMatch={handleDeleteMatch}
      />

      <SwapPlayerModal
        swapRequest={swappingPlayer}
        modalBottomOffset={modalBottomOffset}
        players={tournament.players}
        rounds={tournament.rounds}
        playerMatchCounts={playerMatchCounts}
        accentTheme={accentTheme}
        renderPlayerAvatar={renderPlayerAvatar}
        isRegisteredPlayer={isFomRegisteredPlayer}
        onClose={() => setSwappingPlayer(null)}
        onSelectPlayer={(request, player) => {
          onSwapPlayer(request.matchId, request.team, request.playerIndex, player);
          setSwappingPlayer(null);
        }}
      />

    </div>
  );
};

const IncompleteRoundConfirmSheet = ({
  confirmState,
  isSaving,
  dialogRef,
  closeButtonRef,
  onCancel,
  onConfirm,
}: {
  confirmState: {
    roundId: number;
    incompleteCount: number;
    readyCount: number;
    totalCount: number;
    courtLabel: string;
    pointProgress: {
      entered: number;
      target: number;
      remaining: number;
    };
  } | null;
  isSaving: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <AnimatePresence>
    {confirmState && (
      <div className="fixed inset-0 z-[138] flex items-end justify-center px-0 pt-4 sm:items-center sm:px-4">
        <motion.button
          type="button"
          aria-label="Cancel complete round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/64"
        />
        <motion.section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Complete round with incomplete scores"
          initial={{ y: '100%', opacity: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.98 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-white px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-3 shadow-[0_-18px_52px_rgba(15,23,42,0.22)] sm:rounded-[28px]"
        >
          <div className="mx-auto h-1.5 w-16 rounded-full bg-ios-gray/20" />
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-amber-700">
                Score check
              </p>
              <h3 className="mt-2 text-[23px] font-display font-bold leading-none tracking-[-0.035em] text-on-surface">
                Complete round {confirmState.roundId}?
              </h3>
              <p className="mt-2 max-w-[312px] text-[13px] font-semibold leading-snug text-on-surface/62">
                {confirmState.courtLabel} still {confirmState.incompleteCount > 1 ? 'have' : 'has'} incomplete scores. You can complete now, but standings will use the current numbers.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/10 text-on-surface disabled:opacity-50"
              aria-label="Close incomplete score confirmation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-[18px] border border-amber-500/24 bg-[#FFF9EA] p-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-amber-700">
                <AlertTriangle size={16} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold leading-tight text-on-surface">
                  {confirmState.pointProgress.entered > 0
                    ? `${confirmState.pointProgress.entered}/${confirmState.pointProgress.target} points entered`
                    : `${confirmState.readyCount}/${confirmState.totalCount} scores ready`}
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-on-surface/58">
                  {confirmState.pointProgress.entered > 0
                    ? `${formatPointRemainder(confirmState.pointProgress.remaining)} left before this round is fully ready.`
                    : 'Better for accuracy: go back and finish the missing court score first.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[0.82fr_1.18fr] gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="tap-target h-12 rounded-[16px] border border-black/[0.08] bg-white text-[14px] font-extrabold text-ios-gray disabled:opacity-50"
            >
              Review scores
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSaving}
              className="tap-target inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-primary text-[14px] font-extrabold text-white shadow-[0_12px_24px_rgba(230,94,20,0.22)] disabled:opacity-70"
            >
              {isSaving ? 'Completing round' : 'Complete anyway'}
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </motion.section>
      </div>
    )}
  </AnimatePresence>
);

const FinishMatchConfirmSheet = ({
  isOpen,
  isSaving,
  dialogRef,
  closeButtonRef,
  matchName,
  roundsLabel,
  courtsLabel,
  playersLabel,
  durationLabel,
  toxicModeEnabled,
  toxicIntensityLabel,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  isSaving: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  matchName: string;
  roundsLabel: string;
  courtsLabel: string;
  playersLabel: string;
  durationLabel: string;
  toxicModeEnabled: boolean;
  toxicIntensityLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[138] flex items-end justify-center px-0 pt-4 sm:items-center sm:px-4">
        <motion.button
          type="button"
          aria-label="Cancel finish match"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/62"
        />
        <motion.section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Finish match confirmation"
          initial={{ y: '100%', opacity: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.98 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-white px-6 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-3 shadow-[0_-18px_52px_rgba(15,23,42,0.22)] sm:rounded-[28px]"
        >
          <div className="mx-auto h-1.5 w-16 rounded-full bg-ios-gray/20" />
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9.5px] font-black uppercase leading-none tracking-[0.18em] text-primary">
                Final save
              </p>
              <h3 className="mt-2 text-[24px] font-display font-bold leading-none tracking-[-0.035em] text-on-surface">
                Finish this match?
              </h3>
              <p className="mt-2 max-w-[300px] text-[13px] font-semibold leading-snug text-on-surface/62">
                {matchName} will be saved to history with final standings.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onCancel}
              className="tap-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/10 text-on-surface"
              aria-label="Close finish confirmation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <FinishConfirmStat label="Rounds" value={roundsLabel} />
            <FinishConfirmStat label="Courts" value={courtsLabel} />
            <FinishConfirmStat label="Players" value={playersLabel} />
            <FinishConfirmStat label="Duration" value={durationLabel} />
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-start gap-3 rounded-[18px] border border-black/[0.06] bg-ios-gray/[0.035] p-3.5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                <Trophy size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold leading-tight text-on-surface">Official standings lock in</p>
                <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-on-surface/58">
                  Final scores, W/L/D/M, points, and diff are stored for history and shared views.
                </p>
              </div>
            </div>

            <div className={cn(
              'flex items-start gap-3 rounded-[18px] border p-3.5',
              toxicModeEnabled
                ? 'border-[#D4A017]/35 bg-[#FFF8E6]'
                : 'border-black/[0.06] bg-ios-gray/[0.025]'
            )}>
              <span className={cn(
                'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                toxicModeEnabled ? 'bg-[#151008] text-[#F4D77B]' : 'bg-white text-ios-gray'
              )}>
                {toxicModeEnabled ? <Flame size={16} /> : <CheckCircle2 size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold leading-tight text-on-surface">
                  {toxicModeEnabled ? `Hall of Shame locks as ${toxicIntensityLabel}` : 'Hall of Shame is off'}
                </p>
                <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-on-surface/58">
                  {toxicModeEnabled
                    ? 'Cupu awards, ticker context, and shame share cards use this final snapshot.'
                    : 'Only official standings will be saved for this match.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[0.82fr_1.18fr] gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="tap-target h-12 rounded-[16px] border border-black/[0.08] bg-white text-[14px] font-extrabold text-ios-gray disabled:opacity-50"
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSaving}
              className="tap-target inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-primary text-[14px] font-extrabold text-white shadow-[0_12px_24px_rgba(230,94,20,0.24)] disabled:opacity-70"
            >
              {isSaving ? 'Saving final results' : 'Save final results'}
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </motion.section>
      </div>
    )}
  </AnimatePresence>
);

const FinishConfirmStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[16px] bg-ios-gray/[0.04] px-3 py-3">
    <p className="text-[8px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">{label}</p>
    <p className="mt-1.5 truncate text-[15px] font-display font-bold leading-none tracking-[-0.02em] text-on-surface">{value}</p>
  </div>
);

const isRoundMatchScoreReady = ({
  match,
  format,
  totalPoints,
}: {
  match: Match;
  format: Tournament['format'];
  totalPoints: number;
}) => {
  if (match.status === 'completed') return true;
  const scoreA = Number(match.teamA.score || 0);
  const scoreB = Number(match.teamB.score || 0);
  if (format !== 'Match Play' && totalPoints > 0) {
    return scoreA + scoreB === totalPoints && (scoreA > 0 || scoreB > 0);
  }
  return scoreA > 0 || scoreB > 0;
};

const getRoundPointProgress = ({
  round,
  format,
  totalPoints,
}: {
  round: Tournament['rounds'][number] | null;
  format: Tournament['format'];
  totalPoints: number;
}) => {
  if (!round || format === 'Match Play' || totalPoints <= 0) {
    return { entered: 0, target: 0, remaining: 0 };
  }

  const target = Math.max(0, round.matches.length * totalPoints);
  const entered = round.matches.reduce((sum, match) => {
    const scoreA = Math.max(0, Number(match.teamA.score || 0));
    const scoreB = Math.max(0, Number(match.teamB.score || 0));
    return sum + Math.min(totalPoints, scoreA + scoreB);
  }, 0);
  return {
    entered,
    target,
    remaining: Math.max(0, target - entered),
  };
};

const formatPointRemainder = (remaining: number) => {
  const safeRemaining = Math.max(0, Math.round(remaining));
  return `${safeRemaining} point${safeRemaining === 1 ? '' : 's'}`;
};

const formatCourtList = (courtLabels: string[]) => {
  if (courtLabels.length === 0) return '';
  if (courtLabels.length === 1) return courtLabels[0];
  if (courtLabels.length === 2) return `${courtLabels[0]} and ${courtLabels[1]}`;
  return `${courtLabels.slice(0, -1).join(', ')}, and ${courtLabels[courtLabels.length - 1]}`;
};
