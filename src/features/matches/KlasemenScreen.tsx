import { Fragment, type ChangeEvent, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob as htmlToImageBlob } from 'html-to-image';
import { BarChart2, ChevronDown, CircleDot, Download, FileImage, Flame, Lock, RefreshCw, Share2, UserRound, X, Zap } from 'lucide-react';
import { AppLogo } from '../../components/app/AppLogo';
import { SharedViewerFomPlayCta } from '../../components/app/SharedViewerFomPlayCta';
import { cn } from '../../lib/utils';
import { fetchToxicCopyConfig } from '../../services/toxicCopyRemoteConfig';
import { type Player, type Round, type Tournament, type TournamentHistory, type TournamentStatsSyncState } from '../../types';
import { getMatchThemeColor } from '../tournaments/matchTheme';
import { formatDurationFromMs, getTournamentElapsedMs } from './matchTimeUtils';
import { buildOfficialStandings, hasMatchScoreProgress, type StandingsPlayer } from './standingsUtils';
import type { ToxicCopyConfig } from './toxicCopyConfig';
import { buildToxicStandings, type ToxicAwardCard, type ToxicHeroStat as ToxicHeroStatData, type ToxicStandingRow, type ToxicStandingsData } from './toxicStandings';
import { getToxicIntensityLabel } from './toxicSettings';
import {
  buildRankTimelines,
  findGlowDownAward,
  getGlowDownRoast,
} from './matchNightStats';
import {
  processLocalCardPhoto,
  getAdaptiveScrimOpacity,
  type ProcessedCardPhoto,
} from './localPhotoProcessing';
import { trackRewindEvent } from '../../analytics';
import { getTournamentShareStorageKey } from '../history/historyPersistence';
import { RewindFlow, type RewindResult } from '../rewind/RewindFlow';
import { useMatchSettingsFriends } from './useMatchSettingsFriends';

const TOXIC_THIRD_PLACE_BADGE_SRC = '/assets/toxic/manchester-united-crest.png';
const STANDINGS_TAB_OFFICIAL_ID = 'standings-tab-official';
const STANDINGS_TAB_TOXIC_ID = 'standings-tab-toxic';
const STANDINGS_PANEL_OFFICIAL_ID = 'standings-panel-official';
const STANDINGS_PANEL_TOXIC_ID = 'standings-panel-toxic';

type ShareCardVariant = 'standings-card' | 'shame-card' | 'my-match-card' | 'cupu-certificate';
type StoryExportDimensions = {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
};

const getToxicAwardCardKey = (award: ToxicAwardCard) => (
  `${award.id}-${award.player.id}${award.secondaryPlayer ? `-${award.secondaryPlayer.id}` : ''}`
);

const getStandingTickerEvidence = (message: string) => {
  const scoreMatch = message.match(/\b(\d+)\s*-\s*(\d+)\b/);
  if (!scoreMatch) return [];
  const scoreA = Number(scoreMatch[1]);
  const scoreB = Number(scoreMatch[2]);
  const chips = [`${scoreA}-${scoreB}`];
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB)) {
    chips.push(`Gap ${Math.abs(scoreA - scoreB)}`);
  }
  return chips;
};

const getImageBlobDimensions = async (blob: Blob) => (
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode story image export.'));
    };
    image.src = url;
  })
);

const validateStoryImageBlob = async (blob: Blob, dimensions: StoryExportDimensions) => {
  if (blob.size < 1500) {
    throw new Error('Story image export is unexpectedly small.');
  }

  const imageSize = await getImageBlobDimensions(blob);
  if (
    imageSize.width !== dimensions.canvasWidth ||
    imageSize.height !== dimensions.canvasHeight
  ) {
    throw new Error(`Story image export has invalid dimensions: ${imageSize.width}x${imageSize.height}.`);
  }
};

export const KlasemenScreen = ({
  tournament,
  currentUser,
  onBack,
  onShare,
  onShareFeedback,
  onOpenActive,
  isSharedViewer,
  statsSyncState
}: {
  tournament: Tournament | TournamentHistory;
  currentUser?: any;
  onBack: () => void;
  onShare: (t: Tournament | TournamentHistory) => void;
  onShareFeedback: (state: 'success' | 'ready' | 'failed', message?: string) => void;
  onOpenActive: () => void;
  isSharedViewer?: boolean;
  statsSyncState?: TournamentStatsSyncState | null;
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  const [isStoryPreviewOpen, setIsStoryPreviewOpen] = useState(false);
  const [isStoryImageBusy, setIsStoryImageBusy] = useState(false);
  const [storyImageError, setStoryImageError] = useState('');
  const [storyImageBlob, setStoryImageBlob] = useState<Blob | null>(null);
  const [storyImageDownloads, setStoryImageDownloads] = useState<Array<{ blob: Blob; fileName: string }>>([]);
  const [storyImageFileName, setStoryImageFileName] = useState('');
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyExportPageIndex, setStoryExportPageIndex] = useState(0);
  const [shareCardVariant, setShareCardVariant] = useState<ShareCardVariant>('standings-card');
  const [selectedCertificateAwardKey, setSelectedCertificateAwardKey] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [cardPhoto, setCardPhoto] = useState<ProcessedCardPhoto | null>(null);
  const [isProcessingCardPhoto, setIsProcessingCardPhoto] = useState(false);
  const cardPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isRewindOpen, setIsRewindOpen] = useState(false);
  const [rewindResult, setRewindResult] = useState<RewindResult | null>(null);
  const hasRemoteRewind = Boolean(tournament.rewind?.slides?.length);
  const rewindShareId = useMemo(() => {
    const startedAt = Number(tournament.startedAt || 0);
    const uid = String(currentUser?.uid || '').trim();
    if (!uid || !startedAt) return undefined;
    try {
      return localStorage.getItem(getTournamentShareStorageKey(uid, startedAt)) || undefined;
    } catch {
      return undefined;
    }
  }, [currentUser?.uid, tournament.startedAt]);
  const [toxicCopyConfig, setToxicCopyConfig] = useState<ToxicCopyConfig | null>(null);
  const [standingsTab, setStandingsTab] = useState<'standings' | 'toxic'>(() => (
    tournament.toxicModeEnabled ? 'toxic' : 'standings'
  ));
  const [expandedStandingPlayerId, setExpandedStandingPlayerId] = useState<string | null>(null);
  const [highlightedOfficialStandingPlayerId, setHighlightedOfficialStandingPlayerId] = useState<string | null>(null);
  const [expandedToxicStandingPlayerId, setExpandedToxicStandingPlayerId] = useState<string | null>(null);
  const [highlightedToxicStandingPlayerId, setHighlightedToxicStandingPlayerId] = useState<string | null>(null);
  const [showAllOfficialHistoryPlayerId, setShowAllOfficialHistoryPlayerId] = useState<string | null>(null);
  const [toxicConfettiRunId, setToxicConfettiRunId] = useState(0);
  const [activeAwardCardIndex, setActiveAwardCardIndex] = useState(0);
  const [isMiniHeaderVisible, setIsMiniHeaderVisible] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const shareMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const storyPreviewDialogRef = useRef<HTMLDivElement | null>(null);
  const storyPreviewCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const storyPreviewReturnFocusRef = useRef<HTMLElement | null>(null);
  const storyImageUrlRef = useRef<string | null>(null);
  const storyExportRef = useRef<HTMLDivElement | null>(null);
  const officialRowHighlightTimerRef = useRef<number | null>(null);
  const toxicRowHighlightTimerRef = useRef<number | null>(null);
  const currentUserUid = String(currentUser?.uid || '').trim();
  const currentUserPhotoURL = typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '';
  const { friends } = useMatchSettingsFriends(currentUserUid);
  const closeStoryPreview = useCallback(() => {
    if (storyImageUrlRef.current) {
      URL.revokeObjectURL(storyImageUrlRef.current);
      storyImageUrlRef.current = null;
    }
    setIsStoryPreviewOpen(false);
    setStoryImageBlob(null);
    setStoryImageDownloads([]);
    setStoryImageFileName('');
    setStoryImageUrl('');
    setStoryImageError('');
    const returnFocusTarget = storyPreviewReturnFocusRef.current || shareMenuButtonRef.current;
    storyPreviewReturnFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (!returnFocusTarget?.isConnected) return;
      returnFocusTarget.focus();
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (storyImageUrlRef.current) URL.revokeObjectURL(storyImageUrlRef.current);
      if (officialRowHighlightTimerRef.current) window.clearTimeout(officialRowHighlightTimerRef.current);
      if (toxicRowHighlightTimerRef.current) window.clearTimeout(toxicRowHighlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isShareMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (shareMenuRef.current?.contains(event.target as Node)) return;
      setIsShareMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsShareMenuOpen(false);
      window.requestAnimationFrame(() => shareMenuButtonRef.current?.focus());
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isShareMenuOpen]);

  useEffect(() => {
    if (!isStoryPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeStoryPreview();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = storyPreviewDialogRef.current;
      if (!dialog) return;
      const focusableItems = (Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
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
    window.requestAnimationFrame(() => storyPreviewCloseButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [closeStoryPreview, isStoryPreviewOpen]);

  useEffect(() => {
    setToxicConfettiRunId(0);
    setExpandedStandingPlayerId(null);
    setHighlightedOfficialStandingPlayerId(null);
    setExpandedToxicStandingPlayerId(null);
    setHighlightedToxicStandingPlayerId(null);
    setShowAllOfficialHistoryPlayerId(null);
    setStandingsTab(tournament.toxicModeEnabled ? 'toxic' : 'standings');
  }, [tournament.id, tournament.startedAt, tournament.toxicModeEnabled]);

  useEffect(() => {
    if (!tournament.toxicModeEnabled) return;
    let isMounted = true;
    void fetchToxicCopyConfig().then((nextConfig) => {
      if (!isMounted || !nextConfig) return;
      setToxicCopyConfig(nextConfig);
    });
    return () => {
      isMounted = false;
    };
  }, [tournament.toxicModeEnabled]);

  useEffect(() => {
    const updateMiniHeaderVisibility = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const nextIsVisible = scrollTop > 220;
      setIsMiniHeaderVisible((current) => (current === nextIsVisible ? current : nextIsVisible));
    };

    updateMiniHeaderVisibility();
    window.addEventListener('scroll', updateMiniHeaderVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateMiniHeaderVisibility);
  }, []);

  const tournamentRounds = tournament.rounds || [];
  const configuredCourts = 'courts' in tournament ? tournament.courts : undefined;
  const detectedCourts = Math.max(1, ...tournamentRounds.flatMap((round) => round.matches.map((match) => match.court || 1)));
  const courtsCount = configuredCourts || detectedCourts;
  const completedRounds = tournamentRounds.filter((round) => round.matches.every((match) => match.status === 'completed')).length;
  const totalRounds = Math.max(tournament.numRounds || 0, tournamentRounds.length);
  const totalMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.filter((match) => match.status === 'completed').length, 0);
  void completedMatches;

  const officialStandings = useMemo(() => (
    buildOfficialStandings({
      tournament,
      friends,
      currentUserUid,
      currentUserDisplayName: currentUser?.displayName,
      currentUserEmail: currentUser?.email,
      currentUserPhotoURL,
    })
  ), [currentUser?.displayName, currentUser?.email, currentUserPhotoURL, currentUserUid, friends, tournament]);
  const sortedPlayers = officialStandings.players;
  const hasCountableStandingScore = officialStandings.hasCountableScore;
  const rankTimelines = useMemo(
    () => buildRankTimelines(tournament, sortedPlayers),
    [tournament, sortedPlayers]
  );
  const glowDownAward = useMemo(
    () => findGlowDownAward(rankTimelines, sortedPlayers),
    [rankTimelines, sortedPlayers]
  );


  const activeRoundIndex = tournamentRounds.findIndex((round) => (
    round.matches.some((match) => match.status === 'active')
  ));
  const latestScoredRoundIndex = tournamentRounds.reduce((latestIndex, round, index) => (
    round.matches.some(hasMatchScoreProgress) ? index : latestIndex
  ), -1);
  const displayedRoundCount = activeRoundIndex !== -1
    ? activeRoundIndex + 1
    : (latestScoredRoundIndex !== -1 ? latestScoredRoundIndex + 1 : completedRounds);
  const progressedMatches = tournamentRounds.reduce((sum, round) => (
    sum + round.matches.filter(hasMatchScoreProgress).length
  ), 0);
  const isTournamentEnded = totalRounds > 0 ? completedRounds >= totalRounds : true;
  const statsSyncBadge = isTournamentEnded && !isSharedViewer && statsSyncState
    ? (
        statsSyncState === 'syncing'
          ? {
              tone: 'border-sky-200/70 bg-sky-50/95 text-sky-900',
              title: 'Stats syncing',
              message: 'Leaderboard global dan MMR history sedang diperbarui.'
            }
          : statsSyncState === 'synced'
            ? {
                tone: 'border-emerald-200/70 bg-emerald-50/95 text-emerald-900',
                title: 'Stats updated',
                message: 'Leaderboard global dan MMR history sudah sinkron.'
              }
            : {
                tone: 'border-amber-200/70 bg-amber-50/95 text-amber-900',
                title: 'Sync needs retry',
                message: 'Hasil final tersimpan, tapi sinkronisasi stats belum terkonfirmasi.'
              }
      )
    : null;
  const completionPercent = totalMatches > 0 ? Math.min(100, Math.round((progressedMatches / totalMatches) * 100)) : 0;
  const dateLabel = 'date' in tournament && tournament.date
    ? tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : ('startedAt' in tournament && tournament.startedAt
        ? new Date(tournament.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '');
  const venueLabel = (tournament.venueName || '').trim();
  const locationLabel = (tournament.location || '').trim();
  const placeLabel = [venueLabel, locationLabel].filter(Boolean).join(' | ');
  const locationDateLabel = placeLabel ? `${placeLabel} | ${dateLabel}` : dateLabel;
  const headerMetaParts = locationDateLabel
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const headerDatePart = headerMetaParts.length > 0 ? headerMetaParts[headerMetaParts.length - 1] : '';
  const headerPlaceParts = headerMetaParts.slice(0, -1);
  const showSharedTrialCta = Boolean(isSharedViewer && !currentUserUid);
  const totalElapsedMs = getTournamentElapsedMs(
    tournamentRounds,
    nowMs,
    'endedAt' in tournament ? tournament.endedAt : undefined
  );
  const totalElapsed = formatDurationFromMs(totalElapsedMs);
  const totalElapsedStat = totalElapsedMs > 0
    ? formatElapsedForStat(totalElapsed)
    : isTournamentEnded
      ? 'Final'
      : '0:00';
  const totalStandingPoints = sortedPlayers.reduce((sum, player) => sum + player.totalPoints, 0);

  const standingsThemeColor = getMatchThemeColor(tournament.format, tournament.themeColorId);
  const infoTheme = standingsThemeColor;

  const toxicModeEnabled = Boolean(tournament.toxicModeEnabled);
  const toxicIntensityLabel = getToxicIntensityLabel(tournament.toxicIntensity);
  const activeStandingsTab = toxicModeEnabled ? standingsTab : 'standings';
  const isToxicTabActive = activeStandingsTab === 'toxic';
  const handleStandingsTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (!toxicModeEnabled) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    let nextTab: 'standings' | 'toxic';
    if (event.key === 'Home') {
      nextTab = 'standings';
    } else if (event.key === 'End') {
      nextTab = 'toxic';
    } else {
      nextTab = isToxicTabActive ? 'standings' : 'toxic';
    }

    setStandingsTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(
        nextTab === 'toxic' ? STANDINGS_TAB_TOXIC_ID : STANDINGS_TAB_OFFICIAL_ID
      )?.focus();
    });
  }, [isToxicTabActive, toxicModeEnabled]);
  const standingsDetailLineOne = [
    ...headerPlaceParts,
    headerDatePart,
  ].filter(Boolean);
  const standingsDetailLineTwo = [
    tournament.format,
    `${sortedPlayers.length} players`,
    toxicModeEnabled ? 'Shame on' : '',
  ].filter(Boolean);
  const shouldShowOfficialStandings = hasCountableStandingScore && sortedPlayers.length > 0;
  const officialDisplayPlayers = shouldShowOfficialStandings ? sortedPlayers : [];
  const showOfficialChampionStrip = !isToxicTabActive && isTournamentEnded && shouldShowOfficialStandings;
  const officialListPlayers = showOfficialChampionStrip ? sortedPlayers.slice(1) : officialDisplayPlayers;
  const officialPanelState = shouldShowOfficialStandings
    ? isTournamentEnded
      ? {
          label: 'Final standings',
          chip: 'Final',
          helper: 'Official rank is locked for this match.',
          sortLabel: 'Ranked W > Diff > Pts',
        }
      : {
          label: 'Live standings',
          chip: 'Live',
          helper: 'Points move live; W/L locks after games finish.',
          sortLabel: 'Ranked W > Diff > Pts',
        }
    : {
        label: 'Standings pending',
        chip: 'Waiting',
        helper: 'Score one game to start the official table.',
        sortLabel: '',
      };
  const toxicStandings = useMemo(() => (
    buildToxicStandings({
      tournament,
      sortedPlayers,
      hasCountableScore: hasCountableStandingScore,
      isEnded: isTournamentEnded,
      toxicCopyConfig,
    })
  ), [hasCountableStandingScore, isTournamentEnded, sortedPlayers, tournament, toxicCopyConfig]);
  const toxicSummaryItems = useMemo(() => (
    buildToxicSummaryItems(toxicStandings, tournamentRounds)
  ), [toxicStandings, tournamentRounds]);
  useEffect(() => {
    setActiveAwardCardIndex(0);
  }, [toxicStandings.awardCards.length, tournament.id]);
  const toxicTickerEvidenceChips = useMemo(
    () => getStandingTickerEvidence(toxicStandings.tickerMessage),
    [toxicStandings.tickerMessage]
  );
  const toxicTickerAnnouncement = useMemo(() => (
    [
      'Live Shame.',
      toxicStandings.tickerMessage,
      toxicTickerEvidenceChips.length > 0 ? `Evidence: ${toxicTickerEvidenceChips.join(', ')}.` : '',
    ].filter(Boolean).join(' ')
  ), [toxicStandings.tickerMessage, toxicTickerEvidenceChips]);

  const officialRankById = useMemo(() => (
    new Map(sortedPlayers.map((player, index) => [player.id, index + 1]))
  ), [sortedPlayers]);
  const previousOfficialStandings = useMemo(() => {
    if (isTournamentEnded || latestScoredRoundIndex <= 0) return null;
    return buildOfficialStandings({
      tournament: {
        ...tournament,
        rounds: tournamentRounds.slice(0, latestScoredRoundIndex),
      },
      friends,
      currentUserUid,
      currentUserDisplayName: currentUser?.displayName,
      currentUserEmail: currentUser?.email,
      currentUserPhotoURL,
    });
  }, [currentUser?.displayName, currentUser?.email, currentUserPhotoURL, currentUserUid, friends, isTournamentEnded, latestScoredRoundIndex, tournament, tournamentRounds]);
  const previousOfficialRankById = useMemo(() => (
    new Map((previousOfficialStandings?.players || []).map((player, index) => [player.id, index + 1]))
  ), [previousOfficialStandings]);
  const previousToxicRankById = useMemo(() => {
    if (!toxicModeEnabled || !previousOfficialStandings?.hasCountableScore) return new Map<string, number>();
    const previousToxicStandings = buildToxicStandings({
      tournament: {
        ...tournament,
        rounds: tournamentRounds.slice(0, latestScoredRoundIndex),
      },
      sortedPlayers: previousOfficialStandings.players,
      hasCountableScore: previousOfficialStandings.hasCountableScore,
      isEnded: false,
      toxicCopyConfig,
    });
    return new Map(previousToxicStandings.rows.map((player) => [player.id, player.toxicRank]));
  }, [latestScoredRoundIndex, previousOfficialStandings, tournament, tournamentRounds, toxicCopyConfig, toxicModeEnabled]);
  const liveScorePlayerIds = useMemo(() => {
    if (isTournamentEnded) return new Set<string>();
    const playerIds = new Set<string>();
    tournamentRounds.forEach((round) => {
      round.matches.forEach((match) => {
        if (match.status === 'completed' || !hasMatchScoreProgress(match)) return;
        match.teamA.players.forEach((player) => playerIds.add(player.id));
        match.teamB.players.forEach((player) => playerIds.add(player.id));
      });
    });
    return playerIds;
  }, [isTournamentEnded, tournamentRounds]);
  const currentUserMatchPlayer = useMemo(() => {
    if (!currentUserUid) return null;
    return (tournament.players || []).find((player) => (
      player.id === currentUserUid && player.source !== 'manual'
    )) || null;
  }, [currentUserUid, tournament.players]);
  const myMatchStanding = currentUserMatchPlayer
    ? sortedPlayers.find((player) => player.id === currentUserMatchPlayer.id) || null
    : null;
  const myMatchToxicRow = myMatchStanding
    ? toxicStandings.rows.find((player) => player.id === myMatchStanding.id) || null
    : null;
  const myMatchOfficialRank = myMatchStanding ? officialRankById.get(myMatchStanding.id) || 0 : 0;
  const myMatchRankTimeline = myMatchStanding ? rankTimelines.get(myMatchStanding.id) : undefined;
  const myMatchFirstRank = myMatchRankTimeline?.firstRank;
  const myMatchGlowRoast = myMatchStanding
    ? getGlowDownRoast(glowDownAward, myMatchStanding.id, tournament, toxicCopyConfig)
    : '';
  const canExportStandingsCard = shouldShowOfficialStandings;
  const canExportShameCard = toxicModeEnabled && !toxicStandings.isEmpty;
  const hasLoginMatchPlayer = Boolean(currentUserUid && myMatchStanding);
  const canExportMyMatchCard = Boolean(hasLoginMatchPlayer && shouldShowOfficialStandings);
  const shareCtaIsShame = isToxicTabActive && canExportShameCard;
  const shareCtaLabel = isToxicTabActive
    ? shareCtaIsShame ? 'Share the Shame' : 'Share Match Link'
    : shouldShowOfficialStandings
      ? 'Share Standings'
      : 'Share Match Link';

  useEffect(() => {
    if (!toxicModeEnabled || !isToxicTabActive || toxicStandings.isEmpty || toxicStandings.isPeacefulTie) return;
    setToxicConfettiRunId((prev) => prev + 1);
  }, [isToxicTabActive, toxicModeEnabled, toxicStandings.isEmpty, toxicStandings.isPeacefulTie]);

  useEffect(() => {
    if (!isTournamentEnded || isSharedViewer) return;
    trackRewindEvent('rewind_entrypoint_viewed', {
      tab: isToxicTabActive ? 'shame' : 'official',
      state: rewindResult ? 'generated' : 'new',
    });
    // Fire on mount/end-state only — tab switches shouldn't re-count impressions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTournamentEnded, isSharedViewer]);

  const hasCoKingHero = toxicStandings.heroPlayers.length > 1;
  const isToxicStoryMode = shareCardVariant === 'shame-card' && toxicModeEnabled;
  const isMyMatchStoryMode = shareCardVariant === 'my-match-card';
  const storyShowAvatars = true;
  const storyPlayersPerImage = isToxicStoryMode ? 6 : isMyMatchStoryMode ? 1 : 10;
  const storyPlayerSource: StandingsPlayer[] = (
    isMyMatchStoryMode && myMatchStanding
      ? [myMatchStanding]
      : isToxicStoryMode && !toxicStandings.isEmpty
      ? toxicStandings.rows
      : sortedPlayers
  );
  const storyPlayerPages = useMemo(() => {
    if (storyPlayerSource.length === 0) return [[]];
    const pages: StandingsPlayer[][] = [];
    for (let index = 0; index < storyPlayerSource.length; index += storyPlayersPerImage) {
      pages.push(storyPlayerSource.slice(index, index + storyPlayersPerImage));
    }
    return pages;
  }, [storyPlayerSource, storyPlayersPerImage]);
  const storyPageCount = storyPlayerPages.length;
  const activeStoryPageIndex = Math.min(storyExportPageIndex, storyPageCount - 1);
  const storyPlayers = storyPlayerPages[activeStoryPageIndex] || [];
  const toxicStoryRows = storyPlayers as ToxicStandingRow[];
  const storyCompactRows = storyPlayers.length >= 9;
  const storyDenseRows = storyCompactRows || storyPlayerSource.length > 12;
  const storyRankOffset = activeStoryPageIndex * storyPlayersPerImage;
  const storyUsesCompactRankingCard = storyPlayers.length > 0 && storyPlayers.length < 8;
  const storyExportShellClass = cn(
    'relative z-10 flex h-full flex-col px-4 text-white',
    storyCompactRows ? 'pb-2 pt-3' : 'pb-3 pt-3'
  );
  const storyExportLogoHeaderClass = cn(
    'flex shrink-0 items-center justify-center',
    'mb-3 h-10'
  );
  const storyExportLogoClass = 'h-[26px] w-auto object-contain';
  const storySummaryCardClass = cn(
    'relative mt-0 isolate shrink-0 overflow-hidden rounded-[22px] border border-white/42 bg-white/10 shadow-[0_14px_30px_rgba(15,23,42,0.10)] backdrop-blur-md',
    storyCompactRows ? 'px-3 py-2' : 'px-3.5 py-2.5'
  );
  const storySummaryCardStyle = {
    clipPath: 'inset(0 round 22px)',
    WebkitClipPath: 'inset(0 round 22px)'
  };
  const storySummaryStatClass = cn(
    'rounded-[11px] border border-white/26 bg-white/18 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    storyCompactRows ? 'py-0.5' : 'py-1'
  );
  const storyTitleClass = cn('truncate font-black leading-[1.04] tracking-tight text-white', storyCompactRows ? 'text-[14.5px]' : 'text-[15.5px]');
  const storySubtitleClass = cn('mt-0.5 truncate font-semibold leading-[1.15] text-white/82', storyCompactRows ? 'text-[8px]' : 'text-[8.5px]');
  const storyTimerClass = cn('shrink-0 font-black leading-none tabular-nums text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]', storyCompactRows ? 'text-[10.5px]' : 'text-[11px]');
  const storyStatLabelClass = 'text-[7px] font-bold uppercase leading-none tracking-wider text-white/66';
  const storyStatValueClass = cn('truncate text-[9.5px] font-bold leading-none text-white', storyCompactRows ? 'mt-0.5' : 'mt-1');
  const storyRankingCardClass = cn(
    'mt-1.5 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/52 bg-white/95 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
    storyUsesCompactRankingCard ? 'shrink-0' : 'flex-1'
  );
  const storyFooterSpacerClass = storyUsesCompactRankingCard ? 'flex-1' : '';
  const storyFooterClass = cn('flex shrink-0 justify-center text-white/78', storyCompactRows ? 'mt-1 pt-1' : 'mt-1.5 pt-2');
  const storyFooterTextClass = cn('font-medium leading-none', storyCompactRows ? 'text-[8px]' : 'text-[8.5px]');
  const storyFooterRowClass = 'inline-flex items-center justify-center gap-2.5';
  const selectedCertificateAward = useMemo(() => (
    toxicStandings.awardCards.find((award) => getToxicAwardCardKey(award) === selectedCertificateAwardKey) ||
    toxicStandings.awardCards[0] ||
    null
  ), [selectedCertificateAwardKey, toxicStandings.awardCards]);
  const selectedCertificateRows = useMemo(() => {
    if (!selectedCertificateAward) return [];
    const ids = [selectedCertificateAward.player.id, selectedCertificateAward.secondaryPlayer?.id].filter(Boolean);
    return ids
      .map((playerId) => toxicStandings.rows.find((row) => row.id === playerId))
      .filter((row): row is ToxicStandingRow => Boolean(row));
  }, [selectedCertificateAward, toxicStandings.rows]);
  const isCupuCertificateStoryMode = shareCardVariant === 'cupu-certificate';
  const canRenderCurrentShareCard = shareCardVariant === 'cupu-certificate'
    ? Boolean(selectedCertificateAward)
    : shareCardVariant === 'my-match-card'
      ? canExportMyMatchCard
      : shareCardVariant === 'shame-card'
        ? canExportShameCard
        : canExportStandingsCard;
  const getExportDimensionsForVariant = (variant: ShareCardVariant) => (
    variant === 'cupu-certificate'
      ? { width: 360, height: 450, canvasWidth: 1080, canvasHeight: 1350 }
      : { width: 360, height: 640, canvasWidth: 1080, canvasHeight: 1920 }
  );
  const storyExportDimensions = getExportDimensionsForVariant(shareCardVariant);
  const getShareCardPageCount = (variant: ShareCardVariant) => {
    if (variant === 'cupu-certificate') return 1;
    const playersLength = variant === 'my-match-card'
      ? (myMatchStanding ? 1 : 0)
      : variant === 'shame-card' && !toxicStandings.isEmpty
        ? toxicStandings.rows.length
        : sortedPlayers.length;
    const playersPerImage = variant === 'shame-card' ? 6 : variant === 'my-match-card' ? 1 : 10;
    return Math.max(1, Math.ceil(playersLength / playersPerImage));
  };
  const previewShareCardPageCount = getShareCardPageCount(shareCardVariant);
  const storyRankingRowsClass = cn(
    'min-h-0 flex flex-col overflow-hidden',
    storyUsesCompactRankingCard ? 'gap-1' : storyCompactRows ? 'flex-1 justify-between gap-0.5' : storyDenseRows ? 'flex-1 justify-between gap-px' : 'flex-1 justify-between gap-1'
  );
  const storyRankBadgeClass = cn(
    'flex shrink-0 items-center justify-center rounded-full border font-black leading-none tabular-nums',
    storyCompactRows ? 'h-5 w-5 text-[8px]' : storyDenseRows ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'
  );
  const storyAvatarClass = cn(
    'shrink-0 overflow-hidden rounded-full border border-ios-gray/10 bg-ios-gray/10 flex items-center justify-center',
    storyCompactRows ? 'h-6 w-6' : 'h-8 w-8'
  );
  const getStoryRankBadgeClass = (rankIndex: number) => {
    if (rankIndex === 0) return 'bg-[#fff8dc] text-[#9a6a00] border-[#e8c84f]/80 ring-1 ring-[#f8e6a2]/70 shadow-[0_3px_10px_rgba(232,200,79,0.22)]';
    if (rankIndex === 1) return 'bg-[#f7f9fc] text-[#687382] border-[#cdd5df]/90 ring-1 ring-[#e5e9ef]/80 shadow-[0_3px_10px_rgba(148,163,184,0.18)]';
    if (rankIndex === 2) return 'bg-[#fff1e8] text-[#9a5a35] border-[#daa17d]/80 ring-1 ring-[#f0c8af]/70 shadow-[0_3px_10px_rgba(200,131,90,0.18)]';
    return 'bg-ios-gray/10 text-ios-gray border-transparent';
  };
  const getToxicRankBadgeClass = (rankIndex: number, isChampion: boolean) => {
    if (isChampion) return 'bg-transparent text-ios-gray/55 border-transparent';
    if (rankIndex === 0) return 'bg-[#fde8a8] text-[#8a6200] border-[#d4a017]/80 ring-1 ring-[#f8dea8]/80 shadow-[0_3px_12px_rgba(212,160,23,0.28)]';
    if (rankIndex === 1) return 'bg-[#f5f7f9] text-[#5b6470] border-[#aeb6bf]/80 ring-1 ring-[#d3dae1]/80';
    if (rankIndex === 2) return 'bg-white text-[#d40000] border-[#f7d117]/90 ring-1 ring-[#d40000]/35 shadow-[0_3px_12px_rgba(212,0,0,0.14)]';
    return 'bg-ios-gray/10 text-ios-gray border-transparent';
  };
  const renderToxicRankBadgeContent = (rankIndex: number, isChampion: boolean) => (
    rankIndex === 2 && !isChampion
      ? (
          <img
            src={TOXIC_THIRD_PLACE_BADGE_SRC}
            alt="Manchester United crest"
            className="h-[82%] w-[82%] object-contain"
          />
        )
      : (
          <span>
            {isChampion ? rankIndex + 1 : rankIndex === 0 ? '👑' : rankIndex === 1 ? '🥲' : rankIndex + 1}
          </span>
        )
  );
  const getToxicAwardChipClass = (isGold?: boolean) => (
    isGold
      ? 'border-[#d4a017]/55 bg-[linear-gradient(135deg,#fbe7a2,#e3b341)] text-[#6b4e00]'
      : 'border-ios-gray/20 bg-ios-gray/10 text-ios-gray'
  );
  const formatStoryDiff = (value: number) => (value > 0 ? `+${value}` : String(value));
  const isStoryMyRow = (playerId: string) => Boolean(myMatchStanding && playerId === myMatchStanding.id);
  const storyMyRowHighlightClass = 'rounded-[12px] bg-primary/[0.07] ring-1 ring-primary/40';
  const storyTitleDate = useMemo(() => {
    const sourceDate =
      ('date' in tournament && tournament.date)
        ? tournament.date
        : ('startedAt' in tournament && tournament.startedAt ? new Date(tournament.startedAt) : new Date());
    const safeDate = sourceDate instanceof Date && !Number.isNaN(sourceDate.getTime()) ? sourceDate : new Date();
    const day = String(safeDate.getDate()).padStart(2, '0');
    const month = String(safeDate.getMonth() + 1).padStart(2, '0');
    const year = String(safeDate.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }, [tournament]);
  const getShareCardVariantTitle = (variant: ShareCardVariant) => {
    if (variant === 'my-match-card') return 'My Match Card';
    if (variant === 'shame-card') return 'Hall of Shame Card';
    if (variant === 'cupu-certificate') return 'Sertifikat Cupu';
    return 'Standings Card';
  };
  const buildStorySavedTitle = (variant: ShareCardVariant) => (
    `${(tournament.name || 'FOM Play Klasemen').trim()} ${getShareCardVariantTitle(variant)} ${storyTitleDate}`
  );
  const buildStoryFileName = (title: string, pageIndex = 0, pageCount = 1) => {
    const fileSafeTitle = title
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'fom-play-klasemen';
    return pageCount > 1 ? `${fileSafeTitle}-${pageIndex + 1}-of-${pageCount}.png` : `${fileSafeTitle}.png`;
  };
  const syncStoryVariantBeforeExport = async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  const renderStoryImageBlob = async (dimensions = storyExportDimensions) => {
    const sourceNode = storyExportRef.current;
    if (!sourceNode) throw new Error('Share card preview is not ready yet.');
    await document.fonts?.ready;
    const exportImages = Array.from(sourceNode.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(exportImages.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      try {
        await image.decode();
      } catch {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
    }));

    const blob = await htmlToImageBlob(sourceNode, {
      width: dimensions.width,
      height: dimensions.height,
      canvasWidth: dimensions.canvasWidth,
      canvasHeight: dimensions.canvasHeight,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: 'transparent'
    });
    if (!blob) throw new Error('Unable to export story image.');
    await validateStoryImageBlob(blob, dimensions);
    return blob;
  };
  const renderStoryImageBlobs = async (variant: ShareCardVariant) => {
    const blobs: Blob[] = [];
    const pageCount = getShareCardPageCount(variant);
    const exportDimensions = getExportDimensionsForVariant(variant);
    setShareCardVariant(variant);
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      setStoryExportPageIndex(pageIndex);
      await syncStoryVariantBeforeExport();
      blobs.push(await renderStoryImageBlob(exportDimensions));
    }
    setStoryExportPageIndex(0);
    return blobs;
  };
  const downloadStoryBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const showStoryBlobInPreview = (
    blob: Blob,
    fileName = '',
    downloads: Array<{ blob: Blob; fileName: string }> = []
  ) => {
    if (storyImageUrlRef.current) URL.revokeObjectURL(storyImageUrlRef.current);
    const url = URL.createObjectURL(blob);
    storyImageUrlRef.current = url;
    setStoryImageBlob(blob);
    setStoryImageDownloads(downloads.length > 0 ? downloads : [{ blob, fileName }]);
    setStoryImageFileName(fileName);
    setStoryImageUrl(url);
  };
  const downloadStoryPreviewFiles = () => {
    const downloads = storyImageDownloads.length > 0
      ? storyImageDownloads
      : storyImageBlob
        ? [{ blob: storyImageBlob, fileName: storyImageFileName || 'fom-play-share.png' }]
        : [];
    downloads.forEach((download, index) => {
      window.setTimeout(() => {
        downloadStoryBlob(download.blob, download.fileName || `fom-play-share-${index + 1}.png`);
      }, index * 120);
    });
  };
  const handleStoryAction = async (variant: ShareCardVariant) => {
    if (isStoryImageBusy) return;
    if (variant === 'my-match-card' && !canExportMyMatchCard) return;
    if (variant === 'standings-card' && !canExportStandingsCard) return;
    if (variant === 'shame-card' && !canExportShameCard) return;
    storyPreviewReturnFocusRef.current = shareMenuButtonRef.current;
    setStoryImageError('');
    setIsStoryImageBusy(true);
    try {
      const storySavedTitle = buildStorySavedTitle(variant);
      const blobs = await renderStoryImageBlobs(variant);
      const firstBlob = blobs[0];
      if (!firstBlob) throw new Error('Unable to export story image.');
      const storyFileNames = blobs.map((_, pageIndex) => buildStoryFileName(storySavedTitle, pageIndex, blobs.length));
      showStoryBlobInPreview(
        firstBlob,
        storyFileNames[0] || '',
        blobs.map((blob, pageIndex) => ({ blob, fileName: storyFileNames[pageIndex] || '' }))
      );
      setIsStoryPreviewOpen(true);
      const files = blobs.map((blob, pageIndex) => (
        new File([blob], storyFileNames[pageIndex] || buildStoryFileName(storySavedTitle, pageIndex, blobs.length), { type: 'image/png' })
      ));
      const sharePayload = {
        files,
        title: storySavedTitle,
        text: variant === 'my-match-card'
          ? 'My Match Card dari FOM Play'
          : variant === 'shame-card'
            ? 'Hall of Shame dari FOM Play'
            : 'Klasemen dari FOM Play'
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
        await navigator.share(sharePayload);
        onShareFeedback('success', files.length > 1 ? `${files.length} share card berhasil dibagikan.` : 'Share card berhasil dibagikan.');
      } else {
        blobs.forEach((blob, pageIndex) => {
          downloadStoryBlob(blob, buildStoryFileName(storySavedTitle, pageIndex, blobs.length));
        });
        onShareFeedback('ready', blobs.length > 1 ? `${blobs.length} share card berhasil dibuat dan diunduh.` : 'Share card berhasil dibuat dan diunduh.');
      }
    } catch (err) {
      console.error('Share card export failed:', err);
      setStoryImageError('Gagal membuat share card. Preview tetap bisa discreenshot.');
      setIsStoryPreviewOpen(true);
      onShareFeedback('failed', 'Gagal membuat share card. Coba lagi sebentar.');
    } finally {
      setIsStoryImageBusy(false);
    }
  };
  const handlePickCardPhoto = () => {
    if (isProcessingCardPhoto || isStoryImageBusy) return;
    cardPhotoInputRef.current?.click();
  };
  const handleCardPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      onShareFeedback('failed', 'Foto terlalu besar. Pilih foto di bawah 12 MB.');
      return;
    }
    setIsProcessingCardPhoto(true);
    try {
      const processed = await processLocalCardPhoto(file);
      setCardPhoto(processed);
      // Let React commit the photo card before the exporter reads the DOM node,
      // otherwise the first capture races the re-render and grabs the no-photo layout.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await handleStoryAction('my-match-card');
    } catch (err) {
      console.error('Local card photo processing failed:', err);
      onShareFeedback('failed', 'Foto tidak bisa diproses. Coba foto lain.');
    } finally {
      setIsProcessingCardPhoto(false);
    }
  };
  const handleRemoveCardPhoto = async () => {
    if (isProcessingCardPhoto || isStoryImageBusy) return;
    setCardPhoto(null);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await handleStoryAction('my-match-card');
  };
  const handleCertificateAction = async (award: ToxicAwardCard) => {
    if (isStoryImageBusy) return;
    storyPreviewReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSelectedCertificateAwardKey(getToxicAwardCardKey(award));
    setShareCardVariant('cupu-certificate');
    setStoryExportPageIndex(0);
    setStoryImageError('');
    setIsStoryImageBusy(true);
    try {
      await syncStoryVariantBeforeExport();
      const blob = await renderStoryImageBlob(getExportDimensionsForVariant('cupu-certificate'));
      const fileName = buildStoryFileName(`${tournament.name || 'FOM Play'} ${award.label} Sertifikat Cupu ${storyTitleDate}`);
      showStoryBlobInPreview(blob, fileName, [{ blob, fileName }]);
      setIsStoryPreviewOpen(true);
      onShareFeedback('ready', 'Sertifikat Cupu siap diunduh.');
    } catch (err) {
      console.error('Certificate export failed:', err);
      setStoryImageError('Gagal membuat sertifikat. Preview tetap bisa discreenshot.');
      setIsStoryPreviewOpen(true);
      onShareFeedback('failed', 'Gagal membuat sertifikat. Coba lagi sebentar.');
  } finally {
      setIsStoryImageBusy(false);
    }
  };
  const scrollToOfficialStandingPlayer = useCallback((playerId: string) => {
    setExpandedStandingPlayerId(playerId);
    setShowAllOfficialHistoryPlayerId(null);
    setHighlightedOfficialStandingPlayerId(playerId);
    if (officialRowHighlightTimerRef.current) {
      window.clearTimeout(officialRowHighlightTimerRef.current);
    }
    officialRowHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedOfficialStandingPlayerId((current) => (current === playerId ? null : current));
      officialRowHighlightTimerRef.current = null;
    }, 1800);
    window.requestAnimationFrame(() => {
      const row = document.getElementById(getOfficialPlayerRowId(playerId));
      if (!row) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  }, []);
  const scrollToToxicStandingPlayer = useCallback((playerId: string) => {
    setExpandedToxicStandingPlayerId(playerId);
    setHighlightedToxicStandingPlayerId(playerId);
    if (toxicRowHighlightTimerRef.current) {
      window.clearTimeout(toxicRowHighlightTimerRef.current);
    }
    toxicRowHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedToxicStandingPlayerId((current) => (current === playerId ? null : current));
      toxicRowHighlightTimerRef.current = null;
    }, 1800);
    window.requestAnimationFrame(() => {
      const row = document.getElementById(getToxicPlayerRowId(playerId));
      if (!row) return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  }, []);
  const handleToxicSummaryAction = useCallback((action?: ToxicSummaryAction) => {
    if (!action) return;
    if (action.type === 'player') {
      scrollToToxicStandingPlayer(action.playerId);
      return;
    }

    const award = toxicStandings.awardCards.find((item) => getToxicAwardCardKey(item) === action.awardKey);
    if (!award) return;
    void handleCertificateAction(award);
  }, [handleCertificateAction, scrollToToxicStandingPlayer, toxicStandings.awardCards]);
  const personalStandingShortcut = (() => {
    if (!hasLoginMatchPlayer || !myMatchStanding) return null;
    if (isToxicTabActive) {
      if (!myMatchToxicRow || toxicStandings.isEmpty) return null;
      return {
        tone: 'toxic' as const,
        eyebrow: 'Your shame rank',
        value: `#${myMatchToxicRow.toxicRank}`,
        detail: `Official #${myMatchToxicRow.normalRank} · ${myMatchToxicRow.totalPoints} pts`,
        metric: `DIFF ${formatToxicPodiumDiff(myMatchToxicRow.pointsDiff)}`,
      };
    }
    if (!shouldShowOfficialStandings || !myMatchOfficialRank) return null;
    return {
      tone: 'official' as const,
      eyebrow: 'Your rank',
      value: `#${myMatchOfficialRank}`,
      detail: `${myMatchStanding.w}W · ${myMatchStanding.l}L · ${myMatchStanding.matches}M`,
      metric: `${myMatchStanding.totalPoints} pts`,
    };
  })();
  const usesPhotoBackground = isMyMatchStoryMode && Boolean(cardPhoto);
  const renderShareCardBackground = () => {
    if (usesPhotoBackground && cardPhoto) {
      const scrim = getAdaptiveScrimOpacity(cardPhoto.bottomLuminance);
      return (
        <>
          <div className="absolute inset-0 bg-black" />
          <img
            src={cardPhoto.dataUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(16,16,16,0.04) 38%, rgba(16,16,16,${Math.min(0.55, scrim * 0.6)}) 72%, rgba(16,16,16,${scrim}) 100%)`,
            }}
          />
        </>
      );
    }
    return (
      <>
        <div className="absolute inset-0 bg-[#07111f]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_10%,rgba(255,85,0,0.44)_0%,rgba(255,85,0,0.16)_28%,rgba(7,17,31,0)_56%),radial-gradient(circle_at_78%_84%,rgba(245,158,11,0.36)_0%,rgba(245,158,11,0.12)_24%,rgba(7,17,31,0)_55%),linear-gradient(160deg,#09111f_0%,#15100a_54%,#05070b_100%)]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
        <div className="absolute left-[-22%] top-[32%] h-px w-[144%] bg-white/10" />
        <div className="absolute right-[-22%] bottom-[-10%] h-[240px] w-[240px] rounded-full border border-white/10" />
        <div className="absolute left-[-28%] top-[-12%] h-[220px] w-[220px] rounded-full border border-white/8" />
      </>
    );
  };
  const renderCupuCertificateExportContent = (showError = false) => {
    const award = selectedCertificateAward;
    const recipientPlayers = award ? [award.player, award.secondaryPlayer].filter((player): player is NonNullable<typeof award.player> => Boolean(player)) : [];
    const recipientName = recipientPlayers.map((player) => player.name).join(' & ') || 'Pemain Cupu';
    const recipientFontSize = recipientName.length > 36 ? 23 : recipientName.length > 25 ? 26 : 31;
    const primaryRow = selectedCertificateRows[0] || null;
    const recordLabel = primaryRow ? `${primaryRow.w}W-${primaryRow.l}L` : '-';
    const diffLabel = primaryRow ? formatStoryDiff(primaryRow.pointsDiff) : '-';
    const witnessCount = Math.max(1, sortedPlayers.length - recipientPlayers.length);
    const title = award?.label || 'King of Cupu';
    const bodyCopy = award
      ? `adalah penerima ${award.label} pada mabar ${tournament.name || 'FOM Play'}, ${dateLabel}, dengan rekor ${recordLabel} dan DIFF ${diffLabel}.`
      : `adalah pemain paling cupu pada mabar ${tournament.name || 'FOM Play'}, ${dateLabel}.`;

    return (
      <div className="relative h-full w-full overflow-hidden bg-[#FBF7EC] p-[14px] text-[#101010]">
        <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-8%,rgba(201,161,74,0.24),rgba(251,247,236,0)_54%),linear-gradient(135deg,rgba(255,255,255,0.56),rgba(245,226,175,0.28))]" />
        <div className="absolute inset-[10px] rounded-lg border-2 border-[#C9A14A]" />
        <div className="absolute inset-[15px] rounded-[5px] border border-[#C9A14A]/45" />
        <div className="absolute inset-0 opacity-[0.035] bg-[url('/assets/fom-logomark-app.png')] bg-[length:44px_44px] rotate-[-10deg] scale-125" />

        <div className="relative flex h-full flex-col items-center px-5 pb-[18px] pt-[19px] text-center">
          <div className="h-[24px] w-[124px] overflow-hidden" aria-label="FOM Play">
            <img
              src="/assets/fom-play-logo-direction-b-light.png"
              alt="FOM Play"
              className="h-[62px] w-auto max-w-none -translate-x-[27px] -translate-y-[19px] object-contain"
            />
          </div>

          {showError && storyImageError && (
            <p className="mt-2 rounded-full bg-black/8 px-3 py-1 text-[8px] font-bold text-[#8A6A1F]">
              {storyImageError}
            </p>
          )}

          <p className="mt-[9px] text-[8px] font-black uppercase leading-none tracking-[0.30em] text-[#B7861F]">Sertifikat</p>
          <h2 className="font-ceremony mt-1 text-[29px] font-normal leading-none text-[#101010]">{title}</h2>

          <p className="mt-3 max-w-[238px] text-[10px] font-medium leading-[1.52] text-[#6E6E73]">
            Dengan ini menyatakan secara sah dan tidak bisa diganggu gugat bahwa
          </p>

          <p
            className="font-ceremony mt-2 max-w-[276px] border-b border-[#C9A14A]/55 px-4 pb-1.5 font-normal italic leading-[1.08] text-[#8A6A1F]"
            style={{ fontSize: recipientFontSize }}
          >
            {recipientName}
          </p>

          <p className="mt-2.5 max-w-[258px] text-[10px] font-medium leading-[1.5] text-[#6E6E73]">
            {bodyCopy}
          </p>

          {award?.note && (
            <div className="mt-3 w-full rounded-2xl border border-[#C9A14A]/35 bg-white/52 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]">
              <p className="text-[7.2px] font-black uppercase leading-none tracking-[0.15em] text-[#B7861F]">Reason</p>
              <p className="mt-1.5 text-[9.4px] font-bold italic leading-snug text-[#6B5A38]">{award.note}</p>
            </div>
          )}

          <div className="mt-auto grid w-full grid-cols-[88px_minmax(0,1fr)_62px] items-end gap-3">
            <div className="min-w-0 text-left">
              <p className="font-ceremony text-[17px] font-normal italic leading-none text-[#101010]">Panitia Mabar</p>
              <p className="mt-1 w-[86px] border-t border-black/30 pt-1 text-[7px] font-black uppercase leading-none tracking-[0.12em] text-[#9A9AA0]">
                {witnessCount} saksi mata
              </p>
            </div>

            <div className="justify-self-center rounded-2xl border border-[#C9A14A]/60 bg-[#101010] px-4 py-3 text-center rotate-[-1.5deg]">
              <p className="max-w-[104px] text-[12px] font-black uppercase leading-tight text-[#E8C45A]">{title} {award?.emoji || '👑'}</p>
              <p className="mt-1.5 text-[6.5px] font-black uppercase leading-none tracking-[0.14em] text-[#E8C45A]/55">Penobatan Sah</p>
            </div>

            <div className="relative h-[62px] w-[62px] shrink-0 justify-self-end">
              <div className="absolute inset-0 rotate-[-14deg] rounded-full border-2 border-[#B7861F]/65" />
              <div className="absolute inset-[7px] rotate-[-14deg] rounded-full border border-[#B7861F]/50" />
              <div className="absolute inset-[7px] flex rotate-[-14deg] items-center justify-center text-center text-[6px] font-black uppercase leading-[1.5] tracking-[0.10em] text-[#8A6A1F]">
                Certified<br />Cupu<br />2026
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderMyMatchPhotoCardContent = (showError = false) => {
    const player = myMatchStanding;
    const glowRoast = toxicModeEnabled ? myMatchGlowRoast : '';
    return (
      <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-5 text-white">
        <header className="flex shrink-0 items-center">
          <img
            src="/fom-long-logotype-white.png"
            alt=""
            className="h-6 w-auto object-contain drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)]"
          />
        </header>

        {showError && storyImageError && (
          <p className="mt-2 rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-bold text-white/90">
            {storyImageError}
          </p>
        )}

        <div className="flex-1" />

        <section>
          <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/82 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            {(tournament.name || 'FOM Play Match')} · {storyTitleDate}
          </p>
          <h2 className="mt-2 text-[34px] font-black leading-[0.96] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            {player?.name || 'Player'}
          </h2>

          <div className="mt-4 grid grid-cols-3">
            <div>
              <p className="text-[7.5px] font-black uppercase tracking-[0.16em] text-white/62">Record</p>
              <p className="mt-1 text-[19px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {player ? `${player.w}W-${player.l}L` : '-'}
              </p>
            </div>
            <div className="border-l border-white/28 pl-3">
              <p className="text-[7.5px] font-black uppercase tracking-[0.16em] text-white/62">Diff</p>
              <p className={cn('mt-1 text-[19px] font-black leading-none tabular-nums drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]', (player?.pointsDiff || 0) < 0 ? 'text-red-300' : 'text-white')}>
                {player ? formatStoryDiff(player.pointsDiff) : '-'}
              </p>
            </div>
            <div className="border-l border-white/28 pl-3">
              <p className="text-[7.5px] font-black uppercase tracking-[0.16em] text-white/62">Pts</p>
              <p className="mt-1 text-[19px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                {player?.totalPoints ?? '-'}
              </p>
            </div>
          </div>

          {toxicModeEnabled && myMatchToxicRow && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {glowDownAward?.playerId === player?.id && (
                <span className="rounded-full border border-amber-300/60 bg-black/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 backdrop-blur-sm">
                  Glow Down
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold italic text-white/78 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                {glowRoast || `"${myMatchToxicRow.roast}"`}
              </span>
            </div>
          )}

          <div className="mt-4">
            <img
              src="/fom-long-logotype-white.png"
              alt="FOM Play"
              className="h-3 w-auto object-contain opacity-80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            />
          </div>
        </section>
      </div>
    );
  };
  const renderMyMatchStoryExportContent = (showError = false) => {
    const player = myMatchStanding;
    const toxicRank = myMatchToxicRow?.toxicRank;
    return (
      <div className="relative z-10 flex h-full flex-col px-5 pb-4 pt-4 text-white">
        <header className="mb-4 flex h-9 shrink-0 items-center justify-center">
          <img src="/fom-long-logotype-white.png" alt="" className="h-7 w-auto object-contain" />
        </header>

        {showError && storyImageError && (
          <p className="mb-2 rounded-full bg-black/28 px-3 py-1.5 text-[10px] font-bold text-white/90">
            {storyImageError}
          </p>
        )}

        <section className="relative overflow-hidden rounded-2xl border border-white/16 bg-white/[0.08] px-5 py-5 text-center shadow-[0_18px_46px_rgba(0,0,0,0.30)] backdrop-blur-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_46%)]" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.24em] text-white/62">My Match Card</p>
          <div className="relative mx-auto mt-5 flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white/35 bg-white/12 text-[30px] font-black text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            {player?.avatar ? (
              <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span>{player?.initials || 'ME'}</span>
            )}
          </div>
          <h2 className="relative mt-4 text-[27px] font-black leading-tight tracking-tight text-white">
            {player?.name || 'Login Player'}
          </h2>
          <p className="relative mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/58">
            {tournament.name || 'FOM Play Match'}
          </p>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/14 bg-white/[0.09] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/48">Official Rank</p>
            <p className="mt-2 text-[26px] font-black leading-none text-white tabular-nums">#{myMatchOfficialRank || '-'}</p>
          </div>
          <div className="rounded-xl border border-white/14 bg-white/[0.09] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/48">Record</p>
            <p className="mt-2 text-[26px] font-black leading-none text-white tabular-nums">
              {player ? `${player.w}-${player.l}-${player.d}` : '-'}
            </p>
          </div>
          <div className="rounded-xl border border-white/14 bg-white/[0.09] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/48">Diff</p>
            <p className={cn('mt-2 text-[26px] font-black leading-none tabular-nums', (player?.pointsDiff || 0) < 0 ? 'text-red-300' : 'text-amber-200')}>
              {player ? formatStoryDiff(player.pointsDiff) : '-'}
            </p>
          </div>
          <div className="rounded-xl border border-white/14 bg-white/[0.09] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/48">Points</p>
            <p className="mt-2 text-[26px] font-black leading-none text-white tabular-nums">{player?.totalPoints ?? '-'}</p>
          </div>
        </section>

        {toxicModeEnabled && myMatchToxicRow && (
          <section className="mt-3 rounded-2xl border border-amber-300/30 bg-[#fff4db]/95 px-4 py-4 text-[#18120a] shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-800/70">Hall of Shame</p>
                <p className="mt-1 text-[18px] font-black leading-tight">#{toxicRank} Toxic Rank</p>
              </div>
              <span className="rounded-full bg-[linear-gradient(135deg,#f59e0b,#e65e14)] px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-white">
                {toxicIntensityLabel}
              </span>
            </div>
            {(myMatchFirstRank || glowDownAward?.playerId === player?.id) && (
              <div className="mt-3 flex items-center gap-2">
                {typeof myMatchFirstRank === 'number' && (
                  <span className="rounded-full border border-amber-800/25 bg-white/70 px-2 py-1 text-[8.5px] font-black uppercase tracking-wide text-amber-900/80 tabular-nums">
                    R1 #{myMatchFirstRank} → Final #{myMatchOfficialRank || '-'}
                  </span>
                )}
                {glowDownAward?.playerId === player?.id && (
                  <span className="rounded-full bg-[linear-gradient(135deg,#e8c45a,#b7861f)] px-2 py-1 text-[8.5px] font-black uppercase tracking-wide text-[#3a2a05]">
                    Glow Down
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 text-[12px] font-semibold italic leading-snug text-[#6b4a18]">"{myMatchGlowRoast || myMatchToxicRow.roast}"</p>
          </section>
        )}

        <div className="flex-1" />
        <footer className="mt-4 flex shrink-0 justify-center text-white/74">
          <div className="inline-flex items-center justify-center gap-2.5">
            <span className="text-[8.5px] font-medium leading-none">fomplay.asia/app</span>
            <span className="text-[8.5px] font-medium leading-none text-white/38">|</span>
            <span className="text-[8.5px] font-medium leading-none">{storyTitleDate}</span>
          </div>
        </footer>
      </div>
    );
  };
  const renderStandingsStoryContent = (showError = false) => {
    const rowPadClass = storyCompactRows
      ? 'min-h-[40px] py-1'
      : storyDenseRows
        ? 'min-h-[44px] py-1.5'
        : 'min-h-[52px] py-2';
    const nameClass = storyDenseRows ? 'text-[12px]' : 'text-[13px]';
    const ptsClass = storyDenseRows ? 'text-[15px]' : 'text-[16px]';
    return (
      <div className={storyExportShellClass}>
        <header className={storyExportLogoHeaderClass}>
          <img src="/fom-long-logotype-white.png" alt="Friends of Motion" className={storyExportLogoClass} />
        </header>

        {showError && storyImageError && (
          <p className="mb-1 rounded-full bg-black/28 px-3 py-1.5 text-[10px] font-bold text-white/90">
            {storyImageError}
          </p>
        )}

        <section className={storySummaryCardClass} style={storySummaryCardStyle}>
          <p className="text-[8px] font-black uppercase leading-none tracking-[0.2em] text-[#ffb27a]">Final Standings</p>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className={storyTitleClass}>{tournament.name || '-'}</h2>
              <p className={storySubtitleClass}>{locationDateLabel}</p>
            </div>
            <span className={storyTimerClass}>{totalElapsed}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center">
            <div className={storySummaryStatClass}>
              <p className={storyStatLabelClass}>Mode</p>
              <p className={storyStatValueClass}>{tournament.format}</p>
            </div>
            <div className={storySummaryStatClass}>
              <p className={storyStatLabelClass}>Players</p>
              <p className={cn(storyStatValueClass, 'tabular-nums')}>{sortedPlayers.length}</p>
            </div>
            <div className={storySummaryStatClass}>
              <p className={storyStatLabelClass}>Court</p>
              <p className={cn(storyStatValueClass, 'tabular-nums')}>{courtsCount}</p>
            </div>
            <div className={storySummaryStatClass}>
              <p className={storyStatLabelClass}>Round</p>
              <p className={cn(storyStatValueClass, 'tabular-nums')}>{displayedRoundCount}/{totalRounds || 0}</p>
            </div>
          </div>
        </section>

        <section className={storyRankingCardClass}>
          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-black/[0.06] px-1.5 pb-1.5 text-[7.5px] font-black uppercase leading-none tracking-wider text-on-surface/45">
            <span>Player</span>
            <span className="text-right">Pts · Diff</span>
          </div>
          <div className={storyRankingRowsClass}>
            {storyPlayers.map((player, i) => {
              const rank = storyRankOffset + i;
              const diff = player.pointsDiff;
              return (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center justify-between gap-2 border-b border-black/[0.055] px-1.5 last:border-b-0',
                    rowPadClass,
                    isStoryMyRow(player.id) && cn(storyMyRowHighlightClass, 'border-b-transparent')
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className={cn(
                      storyRankBadgeClass,
                      rank === 0 && 'standings-medal-badge standings-medal-gold',
                      rank === 1 && 'standings-medal-badge standings-medal-silver',
                      rank === 2 && 'standings-medal-badge standings-medal-bronze',
                      getStoryRankBadgeClass(rank)
                    )}>
                      {rank + 1}
                    </div>
                    {storyShowAvatars && (
                      <div className={storyAvatarClass}>
                        {player.avatar ? (
                          <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[9px] font-bold text-ios-gray">{player.initials}</span>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-bold leading-tight text-on-surface', nameClass)}>
                        {player.name}
                        {isStoryMyRow(player.id) && (
                          <span className="ml-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-primary">· ME</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[7.5px] font-black uppercase leading-none tracking-[0.06em] text-ios-gray/50 tabular-nums">
                        {player.w}W · {player.l}L · {player.matches}M
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right leading-none">
                    <p className={cn('font-black tabular-nums text-on-surface', ptsClass)}>{player.totalPoints}</p>
                    <p className={cn(
                      'mt-0.5 text-[9px] font-black tabular-nums',
                      diff > 0 ? 'text-[#1E8E3E]' : diff < 0 ? 'text-error' : 'text-ios-gray/60'
                    )}>
                      {formatStoryDiff(diff)}
                    </p>
                  </div>
                </div>
              );
            })}
            {storyPlayers.length === 0 && (
              <div className="rounded-[12px] border border-white/18 bg-white/54 p-4 text-center text-[12px] font-medium text-ios-gray">
                Player data is not available yet.
              </div>
            )}
          </div>
        </section>

        <div className={storyFooterSpacerClass} />
        <footer className={storyFooterClass}>
          <div className={storyFooterRowClass}>
            <span className={storyFooterTextClass}>fomplay.asia/app</span>
            <span className={cn(storyFooterTextClass, 'text-white/38')}>|</span>
            <span className={storyFooterTextClass}>@fo.motion</span>
            {storyPageCount > 1 && (
              <>
                <span className={cn(storyFooterTextClass, 'text-white/38')}>|</span>
                <span className={storyFooterTextClass}>{activeStoryPageIndex + 1}/{storyPageCount}</span>
              </>
            )}
          </div>
        </footer>
      </div>
    );
  };
  const renderToxicStoryExportContent = (showError = false) => (
    <div className="relative z-10 flex h-full flex-col px-4 pb-3 pt-2.5 text-white">
      <header className="mb-1.5 flex h-7 shrink-0 items-center justify-center">
        <img src="/fom-long-logotype-white.png" alt="" className="h-[22px] w-auto object-contain" />
      </header>

      {showError && storyImageError && (
        <p className="mb-1 rounded-full bg-black/28 px-3 py-1.5 text-[10px] font-bold text-white/90">
          {storyImageError}
        </p>
      )}

      <section className="relative shrink-0 overflow-hidden rounded-[20px] border border-[#b78a1c]/75 bg-[#111008] px-3.5 py-3 text-center shadow-[0_14px_36px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,215,128,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(196,145,23,0.34)_0%,rgba(68,50,5,0.34)_32%,rgba(17,16,8,0.96)_64%),linear-gradient(145deg,rgba(44,34,3,0.95),rgba(8,8,4,0.98))]" />
        <p className="relative z-10 text-[8px] font-black uppercase tracking-[0.22em] text-[#c89a2c]">The Cupu D&apos;Or 2026</p>

        {toxicStandings.isEmpty ? (
          <div className="relative z-10 py-5">
            <div className="text-[26px] leading-none">🎾</div>
            <h3 className="mt-2 text-[18px] font-black leading-tight text-[#f3c64c]">Belum ada korban.</h3>
            <p className="mt-1 text-[11px] font-semibold text-[#d8c792]">{toxicStandings.heroRoast}</p>
          </div>
        ) : (
          <>
            <div className="relative z-10 mt-2.5 flex justify-center gap-3">
              {toxicStandings.heroPlayers.map((player) => (
                <div key={player.id} className="flex min-w-0 flex-col items-center">
                  <div className="mb-[-7px] text-[24px] leading-none drop-shadow-[0_3px_8px_rgba(252,211,77,0.35)]">👑</div>
                  <div className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#d7a827] bg-[#9a430a] text-[22px] font-black text-white shadow-[0_0_0_1px_rgba(255,230,140,0.16),0_0_28px_rgba(197,145,23,0.34)]">
                    {player.avatar ? (
                      <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{player.initials}</span>
                    )}
                  </div>
                  <p className="mt-2 max-w-[118px] truncate text-[18px] font-black leading-tight tracking-tight text-[#f3c64c]">{player.name}</p>
                </div>
              ))}
            </div>
            <span className="relative z-10 mt-2 inline-flex max-w-full items-center rounded-full border border-[#b78a1c]/80 bg-black/18 px-3.5 py-1 text-[8.6px] font-black uppercase tracking-[0.12em] text-[#f6d36b]">
              {toxicStandings.heroTitle} 👑
            </span>
            <p className="relative z-10 mx-auto mt-2 max-w-[270px] text-[10.5px] font-semibold italic leading-snug text-[#d8c792]">
              “{toxicStandings.heroRoast}”
            </p>
          </>
        )}
      </section>

      <section className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-amber-300/55 bg-[#fffaf0]/96 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-1 pb-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.14em] text-on-surface">Hall of Shame</h3>
          <span className="rounded-full bg-[linear-gradient(135deg,#f59e0b,#e65e14)] px-2 py-0.5 text-[6.7px] font-black uppercase tracking-wide text-white">
            {toxicStandings.sortLabel}
          </span>
        </div>
        {!toxicStandings.isEmpty && (
          <div className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-1 border-b border-black/[0.055] px-1 py-0.5 text-[6.2px] font-black uppercase leading-none tracking-wide text-on-surface/46">
            <span>Player / Evidence</span>
            <span className="text-center">Pts</span>
          </div>
        )}

        {toxicStandings.isEmpty ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center">
            <p className="text-[12px] font-semibold leading-relaxed text-ios-gray">
              Belum ada ranking toxic untuk dibagikan.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex flex-1 flex-col justify-between gap-0.5 pt-0.5">
            {toxicStoryRows.map((player, i) => {
              const rankIndex = storyRankOffset + i;
              const isChampion = Boolean(player.isChampion);
              const storyEvidenceChips = getToxicStoryEvidenceChips(player, tournamentRounds);
              return (
                <div
                  key={player.id}
                  className={cn(
                    'grid grid-cols-[minmax(0,1fr)_42px] items-center gap-1 border-b border-black/[0.055] px-1 py-1 last:border-b-0',
                    isChampion && 'opacity-70'
                  )}
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[8px] font-black leading-none',
                      getToxicRankBadgeClass(rankIndex, isChampion)
                    )}>
                      {renderToxicRankBadgeContent(rankIndex, isChampion)}
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/10 text-[7.5px] font-black text-ios-gray">
                      {player.avatar ? (
                        <img className="h-full w-full object-cover" src={player.avatar} alt="" referrerPolicy="no-referrer" />
                      ) : player.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9.7px] font-black leading-tight text-on-surface">{player.name}</p>
                      {player.award && (
                        <span className={cn('mt-0.5 inline-flex max-w-full rounded-full border px-[5px] py-[1px] text-[5.8px] font-black uppercase leading-none tracking-wide', getToxicAwardChipClass(player.award.isGold))}>
                          {player.award.label} {player.award.emoji || ''}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {storyEvidenceChips.map((chip) => (
                          <span
                            key={chip.label}
                            className={cn(
                              'inline-flex rounded-full border px-[5px] py-[1px] text-[5.8px] font-black uppercase leading-none tracking-wide',
                              chip.tone === 'danger' && 'border-red-200 bg-red-50 text-error',
                              chip.tone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                              chip.tone === 'gold' && 'border-amber-300 bg-amber-50 text-[#8b6410]',
                              chip.tone === 'default' && 'border-black/[0.08] bg-white/72 text-ios-gray'
                            )}
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                      <p className="mt-0.5 truncate text-[6.8px] font-semibold italic leading-tight text-ios-gray/78">
                        {player.roast}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black leading-none text-on-surface tabular-nums">{player.totalPoints}</p>
                    <p className={cn('mt-0.5 text-[7px] font-black leading-none tabular-nums', player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                      {formatToxicPodiumDiff(player.pointsDiff)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="mt-1.5 flex shrink-0 justify-center text-white/78">
        <div className="inline-flex items-center justify-center gap-2.5">
          <span className="text-[8px] font-medium leading-none">fomplay.asia/app</span>
          <span className="text-[8px] font-medium leading-none text-white/38">|</span>
          <span className="text-[8px] font-medium leading-none">Jangan baper, ya</span>
          {storyPageCount > 1 && (
            <>
              <span className="text-[8px] font-medium leading-none text-white/38">|</span>
              <span className="text-[8px] font-medium leading-none">{activeStoryPageIndex + 1}/{storyPageCount}</span>
            </>
          )}
        </div>
      </footer>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-white z-0">
      <main
        className="standings-main relative z-10 mx-auto min-h-screen w-full max-w-md bg-white px-6"
        style={{
          paddingTop: 'calc(var(--app-safe-top, 0px) + 24px)',
          paddingBottom: showSharedTrialCta
            ? 'calc(var(--app-safe-bottom, 0px) + 216px)'
            : 'calc(var(--app-safe-bottom, 0px) + 154px)'
        }}
      >
        {isSharedViewer && (
          <p className="rounded-full border border-black/[0.06] bg-white px-3 py-2 text-center text-[9px] font-black uppercase leading-none tracking-[0.14em] text-ios-gray">
            This page is read-only.
          </p>
        )}

        {statsSyncBadge && (
          <section className="-mt-1">
            <div className={cn('w-full rounded-2xl px-4 py-3 border backdrop-blur-md flex items-start gap-3', statsSyncBadge.tone)}>
              <div className="min-w-0">
                <p className="text-[12px] font-bold tracking-tight">{statsSyncBadge.title}</p>
                <p className="mt-1 text-[12px] leading-snug font-medium">
                  {statsSyncBadge.message}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="relative standings-summary-section">
          <h2 className="sr-only">Standings summary</h2>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <AppLogo className="standings-header-logo h-5 w-[26px] shrink-0" />
              <span className="font-display text-[16px] font-extrabold leading-none text-on-surface">
                FOM<span className="text-primary">Play</span>
              </span>
            </div>
            <span className={cn(
              'mt-0.5 inline-flex h-[23px] shrink-0 items-center justify-center rounded-full px-2.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em]',
              isTournamentEnded ? 'bg-[#111111] text-white' : 'bg-primary text-white'
            )}>
              {!isTournamentEnded && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />}
              {isTournamentEnded ? 'Ended' : 'Live'}
            </span>
          </div>

          <h1 className="truncate text-[22px] font-display font-bold leading-[1.16] tracking-[-0.028em] text-on-surface">
            {tournament.name || '-'}
          </h1>
          <div className="mt-2 flex flex-col gap-0.5 text-[9.5px] font-extrabold uppercase leading-[1.5] tracking-[0.12em] text-ios-gray/68">
            {standingsDetailLineOne.length > 0 && <p>{standingsDetailLineOne.join(' · ')}</p>}
            {standingsDetailLineTwo.length > 0 && <p>{standingsDetailLineTwo.join(' · ')}</p>}
          </div>

          <div className="mt-5 grid min-h-[46px] grid-cols-3 items-center">
            <SummaryStripStat label="Rounds" value={isTournamentEnded ? `${totalRounds || displayedRoundCount}` : `${displayedRoundCount}/${totalRounds || 0}`} />
            <SummaryStripStat label="Duration" value={totalElapsedStat} />
            <SummaryStripStat label="Points" value={totalStandingPoints} />
          </div>

          <div
            className="mt-4 flex h-11 items-end gap-5 border-b border-black/[0.08]"
            role="group"
            aria-label="Standings view"
          >
            <button
              id={STANDINGS_TAB_OFFICIAL_ID}
              type="button"
              onClick={() => setStandingsTab('standings')}
              onKeyDown={handleStandingsTabKeyDown}
              className={cn(
                'tap-target relative flex h-11 items-center text-[15px] leading-none tracking-[-0.015em] after:absolute after:bottom-[-1px] after:left-0 after:h-[2.5px] after:rounded-full after:bg-primary after:transition-all after:motion-reduce:transition-none',
                !isToxicTabActive
                  ? 'font-extrabold text-on-surface after:w-full'
                  : 'font-bold text-ios-gray/72 after:w-0'
              )}
              aria-label="Standings"
              aria-pressed={!isToxicTabActive}
              aria-current={!isToxicTabActive ? 'page' : undefined}
              aria-controls={STANDINGS_PANEL_OFFICIAL_ID}
            >
              Official
            </button>
            {toxicModeEnabled && (
              <button
                id={STANDINGS_TAB_TOXIC_ID}
                type="button"
                onClick={() => setStandingsTab('toxic')}
                onKeyDown={handleStandingsTabKeyDown}
                className={cn(
                  'tap-target relative flex h-11 items-center gap-1.5 text-[15px] leading-none tracking-[-0.015em] after:absolute after:bottom-[-1px] after:left-0 after:h-[2.5px] after:rounded-full after:bg-primary after:transition-all after:motion-reduce:transition-none',
                  isToxicTabActive
                    ? 'font-extrabold text-on-surface after:w-full'
                    : 'font-bold text-ios-gray/72 after:w-0'
                )}
                aria-label="Hall of Shame"
                aria-pressed={isToxicTabActive}
                aria-current={isToxicTabActive ? 'page' : undefined}
                aria-controls={STANDINGS_PANEL_TOXIC_ID}
              >
                Shame <span aria-hidden="true">🔥</span>
              </button>
            )}
            <div className="flex-1" />
            <div ref={shareMenuRef} className="relative self-center pb-1.5">
              <button
                ref={shareMenuButtonRef}
                type="button"
                onClick={() => setIsShareMenuOpen((open) => !open)}
                className={cn(
                  'tap-target flex h-8 w-12 flex-col items-center justify-center gap-1 rounded-full border transition-colors',
                  isShareMenuOpen
                    ? 'border-primary/20 bg-primary/[0.07] text-primary'
                    : 'border-transparent bg-transparent text-primary'
                )}
                aria-expanded={isShareMenuOpen}
                aria-haspopup="menu"
                aria-controls={isShareMenuOpen ? 'standings-share-options-menu' : undefined}
                aria-label="Share options"
              >
                <span className="h-[2.5px] w-6 rounded-full bg-current" />
                <span className="h-[2.5px] w-9 rounded-full bg-current opacity-70" />
                <span className="h-[2.5px] w-5 rounded-full bg-current opacity-35" />
              </button>
              {isShareMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[118] cursor-default bg-black/[0.08] sm:hidden"
                    aria-label="Close share options"
                    onClick={() => setIsShareMenuOpen(false)}
                  />
                  <div
                    id="standings-share-options-menu"
                    className="fixed inset-x-4 bottom-[calc(var(--app-safe-bottom,0px)+86px)] z-[119] mx-auto w-[min(22rem,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-black/[0.08] bg-white/96 p-2.5 text-on-surface shadow-[0_22px_56px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[min(18rem,calc(100vw-40px))] sm:rounded-[20px] sm:p-2 sm:shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
                    role="menu"
                  >
                    <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ios-gray/18 sm:hidden" />
                    <div className="px-2 pb-2 pt-1">
                      <p className="text-[8.5px] font-black uppercase leading-none tracking-[0.18em] text-ios-gray/54">
                        Share
                      </p>
                      <p className="mt-1 text-[11px] font-semibold leading-snug text-ios-gray/74">
                        Link dan kartu siap preview sebelum download.
                      </p>
                    </div>
                    <div className="h-px bg-black/[0.055]" />
                    <div className="mt-1 flex flex-col gap-0.5">
                      <ShareMenuItem
                        label="Share Link"
                        description="Copy match link untuk dibuka bareng."
                        meta="Link"
                        icon={<Share2 size={15} strokeWidth={2.3} />}
                        onClick={() => {
                          setIsShareMenuOpen(false);
                          onShare(tournament);
                        }}
                      />
                      {toxicModeEnabled && (
                        <ShareMenuItem
                          label={isStoryImageBusy ? 'Preparing' : canExportShameCard ? 'Shame Card · Story' : 'Score first: Shame Card'}
                          description={canExportShameCard ? '9:16 Hall of Shame buat grup.' : 'Butuh score dulu agar toxic valid.'}
                          meta="Story"
                          preview="shame"
                          tone={canExportShameCard ? 'shame' : 'locked'}
                          disabled={isStoryImageBusy || !canExportShameCard}
                          icon={isStoryImageBusy ? (
                            <RefreshCw size={15} strokeWidth={2.3} className="animate-spin motion-reduce:animate-none" />
                          ) : canExportShameCard ? (
                            <Flame size={15} strokeWidth={2.3} />
                          ) : (
                            <Lock size={15} strokeWidth={2.3} />
                          )}
                          onClick={() => {
                            if (!canExportShameCard) return;
                            setIsShareMenuOpen(false);
                            void handleStoryAction('shame-card');
                          }}
                        />
                      )}
                      <ShareMenuItem
                        label={isStoryImageBusy ? 'Preparing' : canExportStandingsCard ? 'Standings Card · Story' : 'Score first: Standings Card'}
                        description={canExportStandingsCard ? '9:16 official ranking siap share.' : 'Ranking muncul setelah ada score.'}
                        meta="Official"
                        preview="official"
                        tone={canExportStandingsCard ? 'primary' : 'locked'}
                        disabled={isStoryImageBusy || !canExportStandingsCard}
                        icon={isStoryImageBusy ? (
                          <RefreshCw size={15} strokeWidth={2.3} className="animate-spin motion-reduce:animate-none" />
                        ) : canExportStandingsCard ? (
                          <FileImage size={15} strokeWidth={2.3} />
                        ) : (
                          <Lock size={15} strokeWidth={2.3} />
                        )}
                        onClick={() => {
                          if (!canExportStandingsCard) return;
                          setIsShareMenuOpen(false);
                          void handleStoryAction('standings-card');
                        }}
                      />
                      <ShareMenuItem
                        label={isStoryImageBusy ? 'Preparing' : canExportMyMatchCard ? 'My Match Card · Personal' : hasLoginMatchPlayer ? 'Score first: My Match Card' : 'Login to get your Match Card'}
                        description={canExportMyMatchCard ? '9:16 kartu pribadi login player.' : hasLoginMatchPlayer ? 'Butuh score player login dulu.' : 'Manual player tetap bisa lihat standings.'}
                        meta="Login"
                        preview="personal"
                        tone={canExportMyMatchCard ? 'primary' : 'locked'}
                        disabled={isStoryImageBusy || !canExportMyMatchCard}
                        icon={isStoryImageBusy ? (
                          <RefreshCw size={15} strokeWidth={2.3} className="animate-spin motion-reduce:animate-none" />
                        ) : canExportMyMatchCard ? (
                          <UserRound size={15} strokeWidth={2.3} />
                        ) : (
                          <Lock size={15} strokeWidth={2.3} />
                        )}
                        onClick={() => {
                          if (!canExportMyMatchCard) return;
                          setIsShareMenuOpen(false);
                          void handleStoryAction('my-match-card');
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {isTournamentEnded && (!isSharedViewer || hasRemoteRewind) && (
          <section className="pt-3">
            <button
              type="button"
              onClick={() => setIsRewindOpen(true)}
              className="tap-target relative flex w-full items-center gap-3.5 overflow-hidden rounded-[20px] bg-[#111111] px-4 py-4 text-left shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100"
              aria-label={rewindResult || hasRemoteRewind ? 'View FOM Rewind' : 'Bikin FOM Rewind'}
            >
              <span className="pointer-events-none absolute -right-8 -top-8 h-[110px] w-[110px] rounded-full bg-[rgba(230,94,20,0.25)]" style={{ filter: 'blur(24px)' }} />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
                <Zap size={19} strokeWidth={2.3} fill="currentColor" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase leading-none tracking-[0.16em] text-primary">FOM Rewind</span>
                <span className="mt-1 block truncate text-[14px] font-bold leading-tight text-white">
                  {rewindResult || hasRemoteRewind ? 'View FOM Rewind →' : 'Match selesai. Bikin Rewind-nya →'}
                </span>
              </span>
            </button>
          </section>
        )}

        {personalStandingShortcut && (
          <section className="flex flex-col gap-2 pt-3">
            <button
              type="button"
              onClick={() => {
                if (personalStandingShortcut.tone === 'toxic' && myMatchToxicRow) {
                  scrollToToxicStandingPlayer(myMatchToxicRow.id);
                  return;
                }
                if (myMatchStanding) {
                  scrollToOfficialStandingPlayer(myMatchStanding.id);
                }
              }}
              className={cn(
                'tap-target flex w-full items-center gap-2.5 rounded-[18px] border px-3 py-2.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.045)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100',
                personalStandingShortcut.tone === 'toxic'
                  ? 'border-[#D4A017]/28 bg-[#FFFBEF] text-[#8A6A1F]'
                  : 'border-primary/14 bg-[#FFF8F3] text-primary'
              )}
              aria-label={`Jump to ${personalStandingShortcut.eyebrow} ${personalStandingShortcut.value}`}
            >
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                personalStandingShortcut.tone === 'toxic'
                  ? 'bg-[#151008] text-[#F4D77B]'
                  : 'bg-primary text-white'
              )}>
                <UserRound size={15} strokeWidth={2.35} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn(
                  'block text-[7.5px] font-black uppercase leading-none tracking-[0.16em]',
                  personalStandingShortcut.tone === 'toxic' ? 'text-[#B7861F]/78' : 'text-primary/72'
                )}>
                  {personalStandingShortcut.eyebrow}
                </span>
                <span className="mt-1 flex min-w-0 items-baseline gap-2">
                  <span className="text-[16px] font-black leading-none tracking-[-0.02em] tabular-nums text-on-surface">
                    {personalStandingShortcut.value}
                  </span>
                  <span className="min-w-0 truncate text-[10.5px] font-bold leading-none text-ios-gray/72">
                    {personalStandingShortcut.detail}
                  </span>
                </span>
              </span>
              <span className={cn(
                'shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.08em]',
                personalStandingShortcut.tone === 'toxic'
                  ? 'border-[#D4A017]/28 bg-white/64 text-[#8A6A1F]'
                  : 'border-primary/12 bg-white text-primary'
              )}>
                {personalStandingShortcut.metric}
              </span>
            </button>
            {canExportMyMatchCard && (
              <button
                type="button"
                onClick={() => {
                  if (isStoryImageBusy) return;
                  void handleStoryAction('my-match-card');
                }}
                disabled={isStoryImageBusy}
                className="tap-target inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-extrabold text-white shadow-[0_10px_24px_rgba(230,94,20,0.24)] transition-transform active:scale-[0.992] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {isStoryImageBusy ? (
                  <RefreshCw size={16} strokeWidth={2.4} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <UserRound size={16} strokeWidth={2.4} />
                )}
                Get My Match Card
              </button>
            )}
          </section>
        )}

        {isMiniHeaderVisible && (
          <div
            className="standings-mini-header-in fixed left-1/2 z-[70] w-full max-w-[640px] -translate-x-1/2 px-5"
            style={{ top: 'calc(var(--app-safe-top, 0px) + 8px)' }}
            aria-label="Current standings context"
          >
            <div className="flex min-h-11 items-center gap-3 rounded-full border border-black/[0.06] bg-white/92 px-3 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-extrabold leading-tight tracking-[-0.01em] text-on-surface">
                  {tournament.name || '-'}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-black uppercase leading-none tracking-[0.14em] text-ios-gray/58">
                  {isToxicTabActive ? 'Hall of Shame' : 'Official'} · {isTournamentEnded ? 'Final' : 'Live'} · {sortedPlayers.length} players
                </p>
              </div>
              <button
                type="button"
                onClick={() => onShare(tournament)}
                className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.09] text-primary active:bg-primary/[0.14]"
                aria-label="Quick share match"
              >
                <Share2 size={15} strokeWidth={2.3} />
              </button>
            </div>
          </div>
        )}

        {isToxicTabActive && toxicStandings.tickerMessage && (
          <section
            className="toxic-ticker relative isolate overflow-hidden rounded-[18px] border border-[#B7861F]/45 bg-[#151008] px-3.5 py-3 text-[#E8C45A] shadow-[0_12px_28px_rgba(17,16,8,0.18)]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={toxicTickerAnnouncement}
          >
            <div className="pointer-events-none absolute inset-y-[-60%] right-[-18%] -z-10 w-[44%] rotate-[18deg] bg-[linear-gradient(90deg,transparent,rgba(232,196,90,0.12),transparent)]" />
            <div className="flex items-start gap-2.5">
              <span className="toxic-live-ticker-dot mt-[5px] h-2 w-2 shrink-0 rounded-full bg-[#E8C45A] shadow-[0_0_0_5px_rgba(232,196,90,0.12)]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="shrink-0 text-[8.5px] font-black uppercase leading-none tracking-[0.16em] text-[#C9A14A]">
                    Live Shame
                  </p>
                  {toxicTickerEvidenceChips.length > 0 && (
                    <span className="shrink-0 rounded-full border border-[#C9A14A]/22 bg-[#C9A14A]/10 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-[#F4D77B]">
                      Evidence
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] font-bold italic leading-snug text-[#F6DFA0]">
                  {toxicStandings.tickerMessage}
                </p>
                {toxicTickerEvidenceChips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {toxicTickerEvidenceChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-[#C9A14A]/24 bg-white/[0.06] px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.04em] text-[#F4D77B]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {isToxicTabActive && (
          <section
            id={STANDINGS_PANEL_TOXIC_ID}
            className="standings-tab-panel-in -mx-6 pt-3"
            role="region"
            aria-labelledby={STANDINGS_TAB_TOXIC_ID}
          >
            {toxicStandings.isEmpty ? (
              <div className="mx-5 rounded-[22px] border border-[#B7861F]/35 bg-[#FFFBEF] px-5 py-7 text-center shadow-[0_12px_28px_rgba(15,23,42,0.10)]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#D4A017]/28 bg-white/66 text-[#B7861F] shadow-[0_8px_20px_rgba(120,78,0,0.10)]">
                  <Flame size={20} strokeWidth={2.35} />
                </div>
                <p className="mt-3 text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">Shame committee</p>
                <h3 className="mt-2 text-[19px] font-black tracking-tight text-on-surface">Masih observasi.</h3>
                <p className="mx-auto mt-1 max-w-[270px] text-[12.5px] font-semibold leading-snug text-ios-gray">
                  Belum ada korban yang layak dinobatkan. Score dulu, baru sidang dimulai.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {[
                    ['Skor dulu', 'pemicu'],
                    ['Ticker hidup', 'live'],
                    ['Award nanti', 'final'],
                  ].map(([label, caption]) => (
                    <div key={label} className="rounded-[14px] border border-[#D4A017]/16 bg-white/54 px-2 py-2">
                      <p className="text-[9.5px] font-black leading-none tracking-[-0.01em] text-on-surface">{label}</p>
                      <p className="mt-1 text-[7px] font-black uppercase leading-none tracking-[0.11em] text-[#B7861F]/72">{caption}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : toxicStandings.isPeacefulTie ? (
              <div className="mx-5 rounded-[22px] border border-[#B7861F]/35 bg-[#FFFBEF] px-5 py-7 text-center shadow-[0_12px_28px_rgba(15,23,42,0.10)]">
                <p className="text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">No public victim</p>
                <h3 className="mt-2 text-[18px] font-black tracking-tight text-on-surface">{toxicStandings.heroTitle}</h3>
                <p className="mx-auto mt-2 max-w-[270px] text-[12.5px] font-semibold italic leading-relaxed text-ios-gray">
                  {toxicStandings.heroRoast}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 px-5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-[#8A6A1F]">
                      {isTournamentEnded ? 'Final Hall of Shame' : 'Hall of Shame'}
                    </p>
                    {isTournamentEnded && (
                      <p className="mt-1 text-[9px] font-bold leading-none text-ios-gray/52">
                        Results locked after finish.
                      </p>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[8px] font-black uppercase leading-none tracking-[0.14em] text-[#C5C5CA]/75">
                      {toxicStandings.sortLabel}
                    </span>
                    {isTournamentEnded && (
                      <span className="shrink-0 rounded-full border border-[#D4A017]/35 bg-[#151008] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-[#F4D77B]">
                        Locked Final
                      </span>
                    )}
                    <span className="shrink-0 rounded-full border border-[#D4A017]/35 bg-[#FFF7E0] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-[#9A6500]">
                      {toxicIntensityLabel}
                    </span>
                  </div>
                </div>

                <div
                  key={`toxic-ceremony-${toxicConfettiRunId}`}
                  data-ceremony-run-id={toxicConfettiRunId}
                  data-toxic-hero-layout={hasCoKingHero ? 'duo' : 'solo'}
                  className={cn(
                    'toxic-ceremony-card relative mx-5 mt-3 overflow-hidden rounded-[24px] border border-[#C9A14A]/45 bg-[#131008] text-center shadow-[0_18px_48px_rgba(17,16,8,0.36),inset_0_1px_0_rgba(255,215,128,0.16)]',
                    hasCoKingHero ? 'px-5 py-5' : 'px-5 py-[22px]'
                  )}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(201,161,74,0.28),rgba(201,161,74,0.04)_55%),#131008]" />
                  <div className="absolute inset-0 opacity-[0.035] bg-[url('/assets/fom-logomark-app.png')] bg-[length:54px_54px] rotate-[-8deg] scale-125" />
                  <div className="absolute left-[14%] top-[-30%] h-[140%] w-[74px] skew-x-[-16deg] bg-[linear-gradient(180deg,rgba(232,196,90,0.20),rgba(232,196,90,0)_72%)]" />
                  <div className="absolute right-[10%] top-[-30%] h-[140%] w-[54px] skew-x-[14deg] bg-[linear-gradient(180deg,rgba(232,196,90,0.13),rgba(232,196,90,0)_65%)]" />
                  <div className="toxic-spotlight-ambient toxic-spotlight-ambient-a absolute inset-y-[-42%] left-[-24%] z-[1] w-[56%] rotate-[-12deg]" />
                  <div className="toxic-spotlight-ambient toxic-spotlight-ambient-b absolute inset-y-[-44%] right-[-26%] z-[1] w-[52%] rotate-[13deg]" />
                  <div className="toxic-spotlight-ambient toxic-spotlight-ambient-c absolute inset-y-[-42%] left-[22%] z-[1] w-[44%] rotate-[4deg]" />
                  <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(72%_62%_at_50%_42%,rgba(0,0,0,0.34),rgba(0,0,0,0.06)_58%,rgba(0,0,0,0.24)_100%)]" />
                  <div className="toxic-ambient-dust pointer-events-none absolute inset-0 z-[2] overflow-hidden">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <span
                        key={index}
                        style={{
                          left: `${(index * 23 + 11) % 94}%`,
                          top: `${(index * 31 + 18) % 86}%`,
                          animationDelay: `${index * 0.72}s`,
                          animationDuration: `${7.5 + (index % 4) * 1.1}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="toxic-gold-shimmer absolute inset-y-[-28%] left-[-58%] z-10 w-[48%] rotate-[17deg] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.06)_26%,rgba(255,232,153,0.60)_50%,rgba(255,255,255,0.08)_74%,transparent_100%)]" />
                  {toxicConfettiRunId > 0 && (
                    <div key={toxicConfettiRunId} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                      {Array.from({ length: 26 }).map((_, index) => (
                        <span
                          key={index}
                          className="toxic-confetti-piece"
                          style={{
                            left: `${(index * 37 + 13) % 100}%`,
                            width: `${5 + (index % 3) * 2}px`,
                            height: `${8 + (index % 4) * 3}px`,
                            backgroundColor: ['#f5c842', '#e8b53a', '#fde68a', '#e65e14', '#ffffff'][index % 5],
                            borderRadius: index % 2 ? '999px' : '2px',
                            animationDelay: `${(index % 9) * 0.06}s`,
                            animationDuration: `${1.2 + (index % 6) * 0.13}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <p className="toxic-hero-title-reveal relative z-20 text-[10px] font-black uppercase leading-none tracking-[0.26em] text-[#C9A14A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.72)]">
                    {isTournamentEnded ? 'The Cupu D\u2019Or Final 2026' : 'The Cupu D\u2019Or 2026'}
                  </p>
                  <div className={cn(
                    'relative z-20',
                    hasCoKingHero ? 'mt-3.5 grid grid-cols-2 items-start gap-4' : 'mt-4 flex justify-center gap-5'
                  )}>
                    {toxicStandings.heroPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className={cn(
                          'toxic-hero-player-reveal flex min-w-0 flex-col items-center',
                          hasCoKingHero ? 'w-full px-1' : ''
                        )}
                        style={{ animationDelay: `${0.16 + index * 0.08}s` }}
                      >
                        <div className={cn(
                          'toxic-crown-drop toxic-crown-glint relative z-10 leading-none drop-shadow-[0_3px_8px_rgba(252,211,77,0.35)]',
                          hasCoKingHero ? 'mb-[-7px] text-[22px]' : 'mb-[-8px] text-[25px]'
                        )}>👑</div>
                        <ToxicAvatar
                          player={player}
                          className={cn(
                            'toxic-avatar-reveal border-[2px] border-[#C9A14A] bg-[#2A2415] text-[#E8C45A] shadow-[0_0_0_1px_rgba(255,230,140,0.16),0_0_34px_rgba(197,145,23,0.34)]',
                            hasCoKingHero ? 'h-[60px] w-[60px] text-[21px]' : 'h-[72px] w-[72px] text-[25px]'
                          )}
                          initialsClassName={cn('font-ceremony font-normal', hasCoKingHero ? 'text-[24px]' : 'text-[29px]')}
                        />
                        <p className={cn(
                          'toxic-name-reveal font-ceremony font-normal tracking-normal text-[#F0D88A] drop-shadow-[0_3px_12px_rgba(0,0,0,0.62)]',
                          hasCoKingHero
                            ? 'mt-2 min-h-[44px] w-full max-w-[132px] text-[26px] leading-[0.94] [overflow-wrap:anywhere]'
                            : 'mt-3 max-w-[220px] text-[38px] leading-none'
                        )}>
                          {player.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <span className="toxic-award-reveal relative z-20 mt-4 inline-flex max-w-full items-center rounded-full border border-[#b78a1c]/80 bg-black/32 px-4 py-1.5 text-[9px] font-black uppercase leading-none tracking-[0.18em] text-[#f6d36b] shadow-[0_0_20px_rgba(197,145,23,0.18)]">
                    {toxicStandings.heroTitle}
                  </span>
                  {toxicStandings.heroStats.length > 0 && (
                    <div className={cn(
                      'toxic-stats-reveal relative z-20 grid grid-cols-3 text-left',
                      hasCoKingHero ? 'mt-3.5' : 'mt-4'
                    )}>
                      {toxicStandings.heroStats.map((stat) => (
                        <Fragment key={`${stat.label}-${stat.value}`}>
                          <ToxicHeroStatCell stat={stat} />
                        </Fragment>
                      ))}
                    </div>
                  )}
                  <p className="toxic-roast-reveal relative z-20 mx-auto mt-4 max-w-[270px] text-[13px] font-semibold italic leading-relaxed text-[#d8c792]">
                    “{toxicStandings.heroRoast}”
                  </p>
                </div>

                {toxicSummaryItems.length > 0 && (
                  <div className="mx-5 mt-3 grid grid-cols-3 gap-1.5">
                    {toxicSummaryItems.map((item) => (
                      <button
                        type="button"
                        key={`${item.label}-${item.value}`}
                        onClick={() => handleToxicSummaryAction(item.action)}
                        disabled={!item.action}
                        className={cn(
                          'tap-target min-w-0 rounded-[16px] border px-2.5 py-2.5 text-left shadow-[0_8px_18px_rgba(120,78,0,0.055)] transition-transform disabled:active:scale-100 disabled:opacity-100 motion-reduce:transition-none',
                          item.tone === 'danger'
                            ? 'border-red-200/70 bg-red-50 text-error'
                            : item.tone === 'gold'
                              ? 'border-[#D4A017]/30 bg-[#FFF7E0] text-[#8A6A1F]'
                              : 'border-black/[0.055] bg-white text-on-surface',
                          item.action && 'active:shadow-[0_6px_14px_rgba(120,78,0,0.08)]'
                        )}
                        aria-label={`${item.label}: ${item.value}. ${item.ctaLabel || item.detail}`}
                      >
                        <p className="truncate text-[7.2px] font-black uppercase leading-none tracking-[0.13em] opacity-65">
                          {item.label}
                        </p>
                        <p className="mt-1.5 truncate text-[12px] font-black leading-tight tracking-[-0.01em]">
                          {item.value}
                        </p>
                        <p className="mt-0.5 truncate text-[8.5px] font-bold leading-tight opacity-58">
                          {item.detail}
                        </p>
                        {item.ctaLabel && (
                          <p className="mt-2 text-[7px] font-black uppercase leading-none tracking-[0.12em] opacity-70">
                            {item.ctaLabel} →
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {toxicStandings.rows.length >= 3 && (
                  <div className="relative mx-5 mt-3.5 overflow-hidden rounded-[22px] bg-[#141414] px-4 pb-0 pt-4 shadow-[0_14px_32px_rgba(17,16,8,0.24)]">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('/assets/fom-logomark-app.png')] bg-[length:54px_54px] rotate-[-8deg] scale-125" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[8.5px] font-black uppercase leading-none tracking-[0.2em] text-[#C9A14A]">Podium Cupu</p>
                          <h3 className="mt-1.5 text-[15px] font-extrabold leading-tight tracking-[-0.015em] text-white">
                            Tiga besar dari bawah.
                          </h3>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#C9A14A]/22 bg-white/[0.06] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.1em] text-[#E8C45A]">
                          Top 3
                        </span>
                      </div>
                      <div className="-mx-4 mt-2.5 overflow-hidden border-y border-[#C9A14A]/16 py-1">
                        <div className="fom-marquee flex w-max gap-6">
                          {[0, 1].map((copyIndex) => (
                            <span key={copyIndex} className="text-[7px] font-black uppercase leading-none tracking-[0.22em] text-[#E8C45A]/65 whitespace-nowrap">
                              SEREMONI RESMI ★ JANGAN BAPER ★ SEREMONI RESMI ★ JANGAN BAPER ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 items-end gap-2">
                        <ToxicPodiumColumn player={toxicStandings.rows[1]} place={2} />
                        <ToxicPodiumColumn player={toxicStandings.rows[0]} place={1} />
                        <ToxicPodiumColumn player={toxicStandings.rows[2]} place={3} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {!isToxicTabActive && (
          <section
            id={STANDINGS_PANEL_OFFICIAL_ID}
            className="standings-tab-panel-in -mx-6 pt-0"
            role="region"
            aria-labelledby={STANDINGS_TAB_OFFICIAL_ID}
          >
            <div className="px-6 pb-1.5 pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">
                    {officialPanelState.label}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-ios-gray/78">
                    {officialPanelState.helper}
                  </p>
                </div>
                <div className="mt-[-1px] flex shrink-0 flex-col items-end gap-1">
                  <span className={cn(
                    'rounded-full border px-2.5 py-1 text-[8px] font-black uppercase leading-none tracking-[0.1em]',
                    isTournamentEnded
                      ? 'border-black/[0.08] bg-[#111111] text-white'
                      : shouldShowOfficialStandings
                        ? 'border-primary/18 bg-[#FFF3ED] text-primary'
                        : 'border-black/[0.06] bg-ios-gray/[0.05] text-ios-gray'
                  )}>
                    {officialPanelState.chip}
                  </span>
                  {officialPanelState.sortLabel && (
                    <span className="text-[7px] font-black uppercase leading-none tracking-[0.11em] text-ios-gray/42">
                      {officialPanelState.sortLabel}
                    </span>
                  )}
                </div>
              </div>
              {shouldShowOfficialStandings && (
                <div className="mt-2.5 flex items-center gap-3.5">
                  <div className="min-w-0 flex-1 text-[8px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/52">
                    Player
                  </div>
                  <div className="grid w-[88px] grid-cols-4 rounded-full bg-ios-gray/[0.045] px-1.5 py-1 text-center text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-ios-gray/58">
                    <span>W</span>
                    <span>L</span>
                    <span>D</span>
                    <span>M</span>
                  </div>
                  <div className="w-[48px] text-right text-[7px] font-black uppercase leading-none tracking-[0.045em] text-ios-gray/52">
                    Pts/Diff
                  </div>
                </div>
              )}
            </div>

            {showOfficialChampionStrip && sortedPlayers[0] && (() => {
              const champion = sortedPlayers[0];
              const isChampionExpanded = expandedStandingPlayerId === champion.id;
              const isChampionHighlighted = highlightedOfficialStandingPlayerId === champion.id;
              const championRoundHistory = buildOfficialRoundHistory(tournamentRounds, champion.id);
              const championDetailId = getOfficialPlayerDetailId(champion.id);
              return (
                <div className="mx-5 mt-2.5">
                  <button
                    type="button"
                    id={getOfficialPlayerRowId(champion.id)}
                    className={cn(
                      'relative flex w-full items-center gap-3.5 rounded-[22px] bg-[#141414] px-4 py-4 text-left shadow-[0_16px_34px_rgba(15,23,42,0.16)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100',
                      isChampionExpanded && 'rounded-b-[18px]',
                      isChampionHighlighted && 'standings-row-highlight-pulse ring-2 ring-primary/38 ring-offset-2 ring-offset-white'
                    )}
                    aria-expanded={isChampionExpanded}
                    aria-controls={championDetailId}
                    aria-label={getOfficialStandingControlLabel({
                      player: champion,
                      rankNumber: 1,
                      isExpanded: isChampionExpanded,
                    })}
                    onClick={() => {
                      setExpandedStandingPlayerId(isChampionExpanded ? null : champion.id);
                      setShowAllOfficialHistoryPlayerId(null);
                    }}
                  >
                    <div className="flex w-[31px] shrink-0 flex-col items-center">
                      <OfficialCrownIcon className="h-[10px] w-[14px] text-primary" />
                      <span className="mt-1 text-[18px] font-extrabold leading-none text-white tabular-nums">
                        01
                      </span>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[14px] font-extrabold leading-none text-white">
                      {champion.avatar ? (
                        <img className="h-full w-full object-cover" src={champion.avatar} alt={champion.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span>{champion.initials.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="text-[8px] font-extrabold uppercase leading-none tracking-[0.18em] text-primary">Champion</p>
                        {champion.id === myMatchStanding?.id && (
                          <span className="inline-flex rounded-full bg-white/10 px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.08em] text-white/72">
                            You
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-[1.25] text-white">
                        {champion.name}
                      </p>
                      <p className="mt-1.5 text-[10px] font-semibold leading-none text-white/50">
                        {champion.w}W · {champion.l}L · {champion.d}D · {champion.matches}M
                      </p>
                    </div>
                    <div className="w-[48px] shrink-0 pr-3 text-right">
                      <p className="text-[20px] font-extrabold leading-none text-white tabular-nums">
                        {champion.totalPoints}
                      </p>
                      <p className={cn('mt-1 text-[12px] font-bold leading-none tabular-nums', champion.pointsDiff > 0 ? 'text-[#7BCB92]' : champion.pointsDiff < 0 ? 'text-red-300' : 'text-white/52')}>
                        {champion.pointsDiff > 0 ? `+${champion.pointsDiff}` : champion.pointsDiff}
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      className={cn(
                        'absolute right-3 top-1/2 -translate-y-1/2 text-white/38 transition-transform motion-reduce:transition-none',
                        isChampionExpanded && 'rotate-180 text-primary'
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {isChampionExpanded && (
                    <div
                      id={championDetailId}
                      className="standings-detail-reveal rounded-b-[22px] border border-t-0 border-black/[0.055] bg-[#FAFAFB] px-3 pb-3 pt-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
                      role="region"
                      aria-label={`${champion.name} round history`}
                    >
                      <OfficialPlayerDetailCard
                        player={champion}
                        roundHistory={championRoundHistory}
                        showAllRoundHistory={showAllOfficialHistoryPlayerId === champion.id}
                        onToggleRoundHistory={() => setShowAllOfficialHistoryPlayerId((current) => (
                          current === champion.id ? null : champion.id
                        ))}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            <div className={cn(showOfficialChampionStrip && 'pt-2')}>
              {officialListPlayers.map((player, displayIndex) => {
                const rankIndex = showOfficialChampionStrip ? displayIndex + 1 : displayIndex;
                const rankNumber = rankIndex + 1;
                const isLeader = rankIndex === 0;
                const isExpanded = expandedStandingPlayerId === player.id;
                const isHighlighted = highlightedOfficialStandingPlayerId === player.id;
                const isCurrentUserStanding = player.id === myMatchStanding?.id;
                const roundHistory = buildOfficialRoundHistory(tournamentRounds, player.id);
                const playerDetailId = getOfficialPlayerDetailId(player.id);
                const previousRank = previousOfficialRankById.get(player.id);
                const officialMovement = getRankMovement(rankNumber, previousRank, previousOfficialRankById.size > 0);
                const hasLiveScore = liveScorePlayerIds.has(player.id);
                return (
                  <Fragment key={player.id}>
                    <div
                      id={getOfficialPlayerRowId(player.id)}
                      className={cn(
                        'relative flex cursor-pointer items-center gap-3.5 border-b border-black/[0.055] px-5 py-3.5 transition-colors active:bg-[#F5F5F7]',
                        isCurrentUserStanding && 'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary/80',
                        isCurrentUserStanding && !isExpanded && 'bg-[#FFF8F3]',
                        isExpanded && 'border-b-transparent bg-[#FAFAFB]',
                        isHighlighted && 'standings-row-highlight-pulse z-[1] rounded-[18px] ring-2 ring-primary/35 ring-offset-2 ring-offset-white'
                      )}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-controls={playerDetailId}
                      aria-label={getOfficialStandingControlLabel({
                        player,
                        rankNumber,
                        isExpanded,
                      })}
                      onClick={() => {
                        setExpandedStandingPlayerId(isExpanded ? null : player.id);
                        setShowAllOfficialHistoryPlayerId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        setExpandedStandingPlayerId(isExpanded ? null : player.id);
                        setShowAllOfficialHistoryPlayerId(null);
                      }}
                    >
                      <div className="flex w-[30px] shrink-0 flex-col items-start">
                        {isLeader && (
                          <OfficialCrownIcon className="mb-0.5 h-[9px] w-3 text-primary" />
                        )}
                        <span className={cn(
                          'text-[20px] font-extrabold leading-none tabular-nums',
                          isLeader ? 'text-primary' : rankIndex <= 2 ? 'text-on-surface' : 'text-[#C5C5CA]'
                        )}>
                          {String(rankNumber).padStart(2, '0')}
                        </span>
                      </div>

                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-bold leading-none ring-1 ring-black/[0.025]',
                        getOfficialAvatarTone(rankIndex)
                      )}>
                        {player.avatar ? (
                          <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{player.initials.slice(0, 1)}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-[1.25] text-on-surface">
                          {player.name}
                        </p>
                        {(isCurrentUserStanding || officialMovement || hasLiveScore) && (
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                            {isCurrentUserStanding && (
                              <span className="shrink-0 rounded-full bg-primary/[0.09] px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.08em] text-primary">
                                You
                              </span>
                            )}
                            {hasLiveScore && (
                              <span className="shrink-0 rounded-full bg-primary/[0.08] px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.08em] text-primary">
                                Live score
                              </span>
                            )}
                            <RankMovementBadge movement={officialMovement} mode="official" />
                          </div>
                        )}
                      </div>

                      <div className={cn(
                        'grid w-[88px] grid-cols-4 rounded-full border px-1.5 py-1.5 text-center text-[11.5px] leading-none tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]',
                        isExpanded
                          ? 'border-black/[0.055] bg-white'
                          : 'border-black/[0.035] bg-[#FAFAFB]'
                      )}>
                        <span className="font-extrabold text-on-surface">{player.w}</span>
                        <span className={cn('font-bold', player.l > 0 ? 'text-ios-gray/88' : 'text-ios-gray/34')}>{player.l}</span>
                        <span className={cn('font-bold', player.d > 0 ? 'text-ios-gray/72' : 'text-ios-gray/32')}>{player.d}</span>
                        <span className="font-bold text-ios-gray/78">{player.matches}</span>
                      </div>

                      <div className="w-[48px] shrink-0 text-right">
                        <p className="text-[20px] font-extrabold leading-none text-on-surface tabular-nums">
                          {player.totalPoints}
                        </p>
                        <p className={cn('mt-1 text-[12px] font-bold leading-none tabular-nums', player.pointsDiff > 0 ? 'text-[#1E8E3E]' : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                          {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                        </p>
                      </div>

                      <ChevronDown
                        size={13}
                        strokeWidth={2.4}
                        className={cn(
                          'absolute right-1.5 top-1/2 -translate-y-1/2 text-ios-gray/36 transition-transform motion-reduce:transition-none',
                          isExpanded && 'rotate-180 text-primary/80'
                        )}
                        aria-hidden="true"
                      />
                    </div>

                    {isExpanded && (
                      <div
                        id={playerDetailId}
                        className="standings-detail-reveal border-b border-black/[0.055] bg-[#FAFAFB] px-5 pb-4"
                        role="region"
                        aria-label={`${player.name} round history`}
                      >
                        <OfficialPlayerDetailCard
                          player={player}
                          roundHistory={roundHistory}
                          showAllRoundHistory={showAllOfficialHistoryPlayerId === player.id}
                          onToggleRoundHistory={() => setShowAllOfficialHistoryPlayerId((current) => (
                            current === player.id ? null : player.id
                          ))}
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}

              {!shouldShowOfficialStandings && (
                <div className="mx-5 mt-4 rounded-[22px] border border-dashed border-black/[0.09] bg-[#FAFAFB] px-5 py-7 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                    <BarChart2 size={18} strokeWidth={2.2} />
                  </div>
                  <p className="mt-3 text-[17px] font-display font-bold tracking-[-0.028em] text-on-surface">
                    Score dulu, standings menyusul.
                  </p>
                  <p className="mx-auto mt-2 max-w-[260px] text-[12px] font-semibold leading-snug text-ios-gray/82">
                    Begitu satu game punya skor, W/L/D/M, points, dan diff langsung kebuka otomatis.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {isToxicTabActive && toxicStandings.awardCards.length > 0 && (
          <section className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h3 className="text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#8A6A1F]">Amunisi Grup WA</h3>
                <p className="mt-1 text-[10.5px] font-semibold italic leading-snug text-ios-gray/58">
                  Sertifikat resmi buat bahan ketawa setelah match.
                </p>
              </div>
              <div className="mt-[-1px] flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full border border-[#D4A017]/30 bg-[#FFF7E0] px-2 py-1 text-[7px] font-black uppercase leading-none tracking-[0.12em] text-[#A06B00]">
                  {toxicStandings.awardCards.length} Sertifikat
                </span>
                {toxicStandings.awardCards.length > 1 && (
                  <span className="text-[7px] font-black uppercase leading-none tracking-[0.12em] text-[#B7861F]/62">
                    Swipe →
                  </span>
                )}
              </div>
            </div>
            <div className="relative -mx-5">
              {toxicStandings.awardCards.length > 1 && (
                <>
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(255,255,255,0)_100%)]" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-[linear-gradient(270deg,#FFFFFF_0%,rgba(255,255,255,0)_100%)]" />
                </>
              )}
              <div className={cn(
                'flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                toxicStandings.awardCards.length === 1 && 'justify-center'
              )}
              onScroll={(event) => {
                if (toxicStandings.awardCards.length <= 1) return;
                const nextIndex = Math.max(0, Math.min(
                  toxicStandings.awardCards.length - 1,
                  Math.round(event.currentTarget.scrollLeft / 270)
                ));
                setActiveAwardCardIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
              }}
              >
                {toxicStandings.awardCards.map((award, index) => (
                  <button
                    type="button"
                    key={getToxicAwardCardKey(award)}
                    onClick={() => void handleCertificateAction(award)}
                    disabled={isStoryImageBusy}
                    className="tap-target relative isolate min-w-[258px] max-w-[258px] snap-start overflow-hidden rounded-[22px] border border-[#D4A017]/45 bg-[linear-gradient(135deg,#FFFDF6_0%,#FFFAEC_48%,#F5E2AF_100%)] p-4 text-left shadow-[0_16px_34px_rgba(120,78,0,0.16),inset_0_1px_0_rgba(255,255,255,0.72)] transition-transform active:scale-[0.985] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
                    aria-label={`Open certificate ${award.label}, ${index + 1} of ${toxicStandings.awardCards.length}`}
                  >
                    <div className="absolute inset-0 -z-10 opacity-[0.04] bg-[url('/assets/fom-logomark-app.png')] bg-[length:44px_44px] rotate-[-10deg] scale-125" />
                    <div className="absolute -right-9 -top-9 -z-10 h-28 w-28 rounded-full bg-[#D4A017]/18 blur-xl" />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[7.4px] font-black uppercase leading-none tracking-[0.18em] text-[#A06B00]">Sertifikat Resmi</p>
                        <p className="mt-1.5 text-[7.4px] font-black uppercase leading-none tracking-[0.12em] text-[#C4A36A]">
                          Certificate #{String(index + 1).padStart(2, '0')} · {index + 1}/{toxicStandings.awardCards.length}
                        </p>
                      </div>
                      <div className={cn(
                        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[21px] shadow-[0_9px_20px_rgba(120,78,0,0.18)]',
                        award.isGold
                          ? 'border-[#B7861F]/50 bg-[linear-gradient(135deg,#FDE68A,#D4A017)]'
                          : 'border-[#D4A017]/35 bg-white/70'
                      )}>
                        <span className="absolute -bottom-1 left-2 h-3 w-1.5 rotate-[16deg] rounded-b-sm bg-[#D4A017]/45" />
                        <span className="absolute -bottom-1 right-2 h-3 w-1.5 rotate-[-16deg] rounded-b-sm bg-[#D4A017]/45" />
                        <span className="relative z-10 leading-none">{award.emoji || '🏅'}</span>
                      </div>
                    </div>

                    <p className="mt-3.5 text-[16px] font-black leading-tight tracking-[-0.025em] text-on-surface">{award.label}</p>
                    <div className="mt-3 space-y-1.5">
                      {[award.player, award.secondaryPlayer].map((awardPlayer) => (
                        awardPlayer ? (
                          <div key={awardPlayer.id} className="flex min-w-0 items-center gap-2 rounded-full border border-[#D4A017]/18 bg-white/58 py-1.5 pl-1.5 pr-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1E3BE] text-[8.5px] font-black text-[#8A6A1F]">
                              {awardPlayer.avatar ? (
                                <img className="h-full w-full object-cover" src={awardPlayer.avatar} alt="" referrerPolicy="no-referrer" />
                              ) : awardPlayer.initials}
                            </span>
                            <span className="min-w-0 truncate text-[11.5px] font-extrabold text-on-surface/84">{awardPlayer.name}</span>
                          </div>
                        ) : null
                      ))}
                    </div>
                    <div className="mt-3.5 border-t border-dashed border-[#B7861F]/35 pt-2.5">
                      <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">Reason</p>
                      <p className="mt-1.5 line-clamp-3 text-[10.5px] font-semibold italic leading-snug text-[#7A6A4C]">{award.note}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-full border border-[#D4A017]/20 bg-white/54 px-2.5 py-1.5">
                      <span className="min-w-0 truncate text-[7.4px] font-black uppercase leading-none tracking-[0.12em] text-[#B7861F]/75">
                        Tap to open certificate
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#151008] px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.08em] text-[#F4D77B]">
                        <FileImage size={10} strokeWidth={2.4} />
                        Open
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {toxicStandings.awardCards.length > 1 && (
              <div className="flex items-center justify-center gap-2.5 px-1">
                <div
                  className="flex min-w-0 items-center gap-1.5"
                  role="status"
                  aria-label={`Certificate ${activeAwardCardIndex + 1} of ${toxicStandings.awardCards.length}`}
                >
                  {toxicStandings.awardCards.map((award, index) => (
                    <span
                      key={`award-indicator-${getToxicAwardCardKey(award)}`}
                      className={cn(
                        'h-1.5 rounded-full transition-all motion-reduce:transition-none',
                        index === activeAwardCardIndex
                          ? 'w-5 bg-[#B7861F]'
                          : 'w-1.5 bg-[#D4A017]/28'
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="shrink-0 text-[7.5px] font-black uppercase leading-none tracking-[0.12em] text-[#B7861F]/54">
                  {activeAwardCardIndex + 1}/{toxicStandings.awardCards.length}
                </p>
              </div>
            )}
          </section>
        )}

        {isToxicTabActive && !toxicStandings.isEmpty && (
          <section className="-mx-6 pt-7">
            <div className="border-t border-[#D4A017]/14 px-5 pb-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-[#8A6A1F]">Full Shame Table</p>
                  <p className="mt-1 text-[11px] font-semibold italic leading-snug text-ios-gray/62">
                    Semua korban, dari paling cupu ke paling aman.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full border border-[#D4A017]/25 bg-[#FFF7E0] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-[#9A6500]">
                    {toxicStandings.rows.length} players
                  </span>
                  <span className="text-[7px] font-black uppercase leading-none tracking-[0.12em] text-ios-gray/42">
                    Worst first
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3.5 px-5 pb-1">
              <div className="min-w-0 flex-1 text-[8px] font-extrabold uppercase leading-none tracking-[0.14em] text-[#C5C5CA]">
                Player / Roast
              </div>
              <div className="w-[58px] text-right text-[8px] font-extrabold uppercase leading-none tracking-[0.08em] text-[#C5C5CA]">
                Pts / Diff
              </div>
            </div>
            <div>
              {toxicStandings.rows.map((player, i) => {
                const isKing = i === 0;
                const isOfficialChampion = Boolean(player.isChampion);
                const toxicEvidenceChips = getToxicTableEvidenceChips(player);
                const primaryEvidenceChip = getPrimaryToxicEvidenceChip(player, toxicEvidenceChips);
                const isExpanded = expandedToxicStandingPlayerId === player.id;
                const isHighlighted = highlightedToxicStandingPlayerId === player.id;
                const detailId = getToxicPlayerDetailId(player.id);
                const rankNumber = i + 1;
                const toxicMovement = getRankMovement(rankNumber, previousToxicRankById.get(player.id), previousToxicRankById.size > 0);
                return (
                  <Fragment key={player.id}>
                    <button
                      type="button"
                      id={getToxicPlayerRowId(player.id)}
                      className={cn(
                        'relative flex w-full items-start gap-3.5 border-b border-black/[0.05] px-5 py-3 text-left transition-colors active:bg-[#F7F7FA]',
                        isExpanded && 'border-b-transparent bg-[#FAFAFB]',
                        isHighlighted && 'toxic-row-highlight-pulse z-[1] rounded-[18px] ring-2 ring-[#D4A017]/52 ring-offset-2 ring-offset-white',
                        isKing && 'bg-[linear-gradient(90deg,#FFF6D8_0%,#FFFBEF_48%,#FFFFFF_100%)] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#D4A017]',
                        isOfficialChampion && !isKing && !isExpanded && 'bg-[#FAFAFB]'
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      aria-label={getToxicStandingControlLabel({ player, rankNumber, isExpanded })}
                      onClick={() => setExpandedToxicStandingPlayerId(isExpanded ? null : player.id)}
                    >
                      <div className="flex w-[28px] shrink-0 flex-col items-start">
                        {isKing && (
                          <span className="mb-0.5 text-[11px] leading-none text-[#B7861F]" aria-hidden="true">👑</span>
                        )}
                        <span className={cn(
                          'text-[19px] font-extrabold leading-none tabular-nums',
                          isKing ? 'text-[#B7861F]' : i <= 2 ? 'text-on-surface' : 'text-[#C5C5CA]'
                        )}>
                          {String(rankNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <ToxicAvatar
                        player={player}
                        className={cn(
                          'h-10 w-10 text-[13px]',
                          isKing
                            ? 'border-[#D7B156]/70 bg-[linear-gradient(135deg,#E8C45A,#B7861F)] text-[#141414]'
                            : isOfficialChampion
                              ? 'border-primary/18 bg-[#FFF3ED] text-primary'
                              : getOfficialAvatarTone(i)
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight text-on-surface">
                            {player.name}
                          </p>
                        </div>
                        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                          {player.award && (
                            <span className={cn('inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.08em] whitespace-normal break-words', getToxicAwardChipClass(player.award.isGold))}>
                              {player.award.label} {player.award.emoji || ''}
                            </span>
                          )}
                          <span className={cn(
                            'rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em]',
                            isOfficialChampion
                              ? 'border-primary/16 bg-primary/[0.07] text-primary'
                              : 'border-black/[0.055] bg-white/72 text-ios-gray/68'
                          )}>
                            Official #{player.normalRank}
                          </span>
                          <RankMovementBadge movement={toxicMovement} mode="toxic" />
                          <span
                            className={cn(
                              'rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em]',
                              primaryEvidenceChip.tone === 'danger'
                                ? 'border-red-200/75 bg-red-50 text-error'
                                : primaryEvidenceChip.tone === 'good'
                                  ? 'border-emerald-200/75 bg-emerald-50 text-[#1E8E3E]'
                                  : isKing
                                    ? 'border-[#D4A017]/30 bg-white/64 text-[#8A6A1F]'
                                    : isOfficialChampion
                                      ? 'border-primary/12 bg-white text-primary/78'
                                      : 'border-black/[0.06] bg-ios-gray/[0.045] text-ios-gray/72'
                            )}
                          >
                            {primaryEvidenceChip.label}
                          </span>
                        </div>
                      </div>
                      <div className="w-[58px] shrink-0 text-right">
                        <p className="text-[20px] font-extrabold leading-none text-on-surface tabular-nums">
                          {player.totalPoints}
                        </p>
                        <p className={cn('mt-1 text-[12px] font-bold leading-none tabular-nums', player.pointsDiff > 0 ? 'text-[#1E8E3E]' : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                          {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                        </p>
                      </div>
                      <ChevronDown
                        size={13}
                        strokeWidth={2.4}
                        className={cn(
                          'absolute bottom-3 right-2 text-ios-gray/34 transition-transform motion-reduce:transition-none',
                          isExpanded && 'rotate-180 text-[#B7861F]'
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {isExpanded && (
                      (() => {
                        const evidenceDetailCards = getToxicEvidenceDetailCards(player, tournamentRounds);
                        const whyReasons = getToxicWhyReasons(player, tournamentRounds);
                        const evidenceTimeline = getToxicEvidenceTimeline(player, tournamentRounds);
                        return (
                      <div
                        id={detailId}
                        role="region"
                        aria-label={`${player.name} shame evidence`}
                        className="standings-detail-reveal border-b border-black/[0.05] bg-[#FAFAFB] px-5 pb-3"
                      >
                        <div className="rounded-[18px] border border-black/[0.055] bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
                          <div className="grid grid-cols-4 gap-1.5">
                            <OfficialDetailStat label="W" value={player.w} tone={player.w > player.l ? 'win' : 'default'} />
                            <OfficialDetailStat label="L" value={player.l} tone={player.l > player.w ? 'loss' : 'default'} />
                            <OfficialDetailStat label="D" value={player.d} />
                            <OfficialDetailStat label="M" value={player.matches} />
                          </div>
                          <p className="mt-3 text-[11.5px] font-semibold italic leading-snug text-ios-gray">
                            “{player.roast}”
                          </p>
                          {whyReasons.length > 0 && (
                            <div className="mt-3 rounded-[15px] border border-[#D4A017]/18 bg-[#FFFBEF] px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">
                                  Why am I here?
                                </p>
                                <span className="rounded-full bg-white/70 px-2 py-1 text-[7px] font-black uppercase leading-none tracking-[0.1em] text-[#8A6A1F]/64">
                                  Data-driven
                                </span>
                              </div>
                              <div className="mt-2 space-y-1.5">
                                {whyReasons.map((reason) => (
                                  <div key={reason} className="flex gap-2 text-[10.5px] font-semibold leading-snug text-[#6F5B34]">
                                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A017]" aria-hidden="true" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {evidenceDetailCards.map((card) => (
                              <div
                                key={`${player.id}-${card.label}`}
                                className={cn(
                                  'min-w-0 rounded-[13px] border px-2 py-2',
                                  card.tone === 'danger'
                                    ? 'border-red-200/70 bg-red-50 text-error'
                                    : card.tone === 'good'
                                      ? 'border-emerald-200/70 bg-emerald-50 text-[#1E8E3E]'
                                      : card.tone === 'gold'
                                        ? 'border-[#D4A017]/24 bg-[#FFF7E0] text-[#8A6A1F]'
                                        : 'border-black/[0.055] bg-[#FAFAFB] text-on-surface'
                                )}
                              >
                                <p className="truncate text-[7px] font-black uppercase leading-none tracking-[0.12em] opacity-60">
                                  {card.label}
                                </p>
                                <p className="mt-1.5 truncate text-[12px] font-black leading-none tabular-nums">
                                  {card.value}
                                </p>
                                <p className="mt-1 truncate text-[8px] font-bold leading-tight opacity-62">
                                  {card.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                          {evidenceTimeline.length > 0 && (
                            <div className="mt-3 rounded-[15px] border border-black/[0.055] bg-[#FAFAFB] p-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">
                                  Evidence timeline
                                </p>
                                <p className="text-[8px] font-bold leading-none text-ios-gray/46">
                                  {evidenceTimeline.length} rounds
                                </p>
                              </div>
                              <div className="mt-2 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {evidenceTimeline.map((item) => (
                                  <div
                                    key={`${player.id}-toxic-timeline-${item.roundId}-${item.scoreLabel}`}
                                    className={cn(
                                      'min-w-[118px] max-w-[138px] snap-start rounded-[13px] border bg-white px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                                      item.tone === 'danger'
                                        ? 'border-red-200/70 bg-red-50/72'
                                        : item.tone === 'good'
                                          ? 'border-emerald-200/70 bg-emerald-50/72'
                                          : item.tone === 'gold'
                                            ? 'border-[#D4A017]/24 bg-[#FFF7E0]'
                                            : 'border-black/[0.05]'
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="text-[7.5px] font-black uppercase leading-none tracking-[0.1em] text-ios-gray/58 tabular-nums">
                                        R{item.roundId}
                                      </span>
                                      <span className={cn('inline-flex min-w-[24px] justify-center rounded-full px-1.5 py-1 text-[7px] font-black uppercase leading-none', getRoundResultChipClass(item.resultLabel))}>
                                        {item.resultLabel}
                                      </span>
                                    </div>
                                    <p className={cn(
                                      'mt-1.5 truncate text-[12px] font-black leading-tight tracking-[-0.01em]',
                                      item.tone === 'danger'
                                        ? 'text-error'
                                        : item.tone === 'good'
                                          ? 'text-[#1E7A38]'
                                          : item.tone === 'gold'
                                            ? 'text-[#8A6A1F]'
                                            : 'text-on-surface'
                                    )}>
                                      {item.title}
                                    </p>
                                    <p className="mt-1 truncate text-[8.5px] font-semibold leading-tight text-ios-gray/68">
                                      {item.detail}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {player.award && (
                            <div className="mt-3 rounded-[14px] border border-[#D4A017]/18 bg-[#FFFBEF] px-3 py-2.5">
                              <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">Award Reason</p>
                              <p className="mt-1.5 text-[10.5px] font-semibold italic leading-snug text-[#7A6A4C]">
                                {player.award.note}
                              </p>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {toxicEvidenceChips.map((chip) => (
                              <span
                                key={chip.label}
                                className={cn(
                                  'rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em]',
                                  chip.tone === 'danger'
                                    ? 'border-red-200/75 bg-red-50 text-error'
                                    : chip.tone === 'good'
                                      ? 'border-emerald-200/75 bg-emerald-50 text-[#1E8E3E]'
                                      : 'border-black/[0.06] bg-ios-gray/[0.045] text-ios-gray/72'
                                )}
                              >
                                {chip.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                        );
                      })()
                    )}
                  </Fragment>
                );
              })}
            </div>
          </section>
        )}

        {isToxicTabActive && (
          <div className="mx-auto mt-3 flex w-fit max-w-full items-center justify-center gap-1.5 rounded-full border border-[#D4A017]/18 bg-[#FFFBEF] px-3 py-2 text-center text-[#8A6A1F]">
            <Flame size={12} strokeWidth={2.4} className="shrink-0" />
            <p className="text-[9.5px] font-bold leading-snug">
              All roasts are about this match only. Jangan baper, ya.
            </p>
          </div>
        )}

        <section className={cn('px-0 pb-8', isToxicTabActive ? 'pt-5' : 'pt-9')}>
          <button
            onClick={() => onShare(tournament)}
            className={cn(
              'mx-auto flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-white/12 text-[15px] font-bold tracking-[0.01em] text-white tap-target',
              shareCtaIsShame
                ? 'bg-[linear-gradient(135deg,#f59e0b,#e65e14)] shadow-[0_8px_22px_rgba(245,158,11,0.28)]'
                : 'bg-primary shadow-[0_10px_26px_rgba(230,94,20,0.28)]'
            )}
          >
            <Share2 size={16} />
            {shareCtaLabel}
          </button>
        </section>
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[93] h-[96px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.58)_58%,#FFFFFF_100%)]"
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 z-[94] px-4"
        style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 14px)' }}
      >
        <div className="mx-auto grid w-[min(100%,258px)] grid-cols-2 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/88 px-2 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.13)] backdrop-blur-xl">
          <button
            type="button"
            onClick={onOpenActive}
            className="tap-target flex h-10 items-center justify-center gap-1.5 rounded-full bg-transparent px-3 text-ios-gray transition-colors active:bg-[#F7F7FA] active:text-on-surface"
          >
            <CircleDot size={17} strokeWidth={2.15} />
            <span className="text-[12px] font-semibold leading-none tracking-tight">Match</span>
          </button>
          <button
            type="button"
            className="tap-target flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#FFF3ED] px-3 text-[#E65E14]"
            aria-current="page"
          >
            <BarChart2 size={17} strokeWidth={2.15} />
            <span className="text-[12px] font-semibold leading-none tracking-tight">Standings</span>
          </button>
        </div>
      </nav>

      {showSharedTrialCta && <SharedViewerFomPlayCta />}

      <input
        ref={cardPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardPhotoChange}
      />

      <div
        aria-hidden="true"
        data-share-exporter="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ width: storyExportDimensions.width, height: storyExportDimensions.height }}
      >
        <div
          ref={storyExportRef}
          className="relative overflow-hidden bg-black"
          style={{ width: storyExportDimensions.width, height: storyExportDimensions.height }}
        >
          {canRenderCurrentShareCard ? (
            <>
              {!isCupuCertificateStoryMode && renderShareCardBackground()}

              {isCupuCertificateStoryMode ? renderCupuCertificateExportContent() : isMyMatchStoryMode ? (usesPhotoBackground ? renderMyMatchPhotoCardContent() : renderMyMatchStoryExportContent()) : isToxicStoryMode ? renderToxicStoryExportContent() : renderStandingsStoryContent()}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black text-[12px] font-black uppercase tracking-[0.16em] text-white/35">
              Share card locked
            </div>
          )}
        </div>
      </div>

      {isStoryPreviewOpen && (
        <div
          ref={storyPreviewDialogRef}
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/86 px-3 py-3"
          role="dialog"
          aria-modal="true"
          aria-label="Share card preview"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            closeStoryPreview();
          }}
        >
          <button
            ref={storyPreviewCloseButtonRef}
            type="button"
            onClick={closeStoryPreview}
            className="tap-target absolute right-4 z-[250] h-10 w-10 rounded-full border border-white/15 bg-white/12 text-white backdrop-blur-xl inline-flex items-center justify-center"
            style={{ top: 'calc(var(--app-safe-top, 0px) + 12px)' }}
            aria-label="Close story preview"
          >
            <X size={19} />
          </button>

          {storyImageBlob && (
            <button
              type="button"
              onClick={downloadStoryPreviewFiles}
              className="tap-target absolute left-4 z-[250] inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/12 px-4 text-[12px] font-extrabold text-white backdrop-blur-xl"
              style={{ top: 'calc(var(--app-safe-top, 0px) + 12px)' }}
              aria-label={isCupuCertificateStoryMode ? 'Download certificate' : 'Download share card'}
            >
              <Download size={16} />
              {storyImageDownloads.length > 1 ? 'Download all' : 'Download'}
            </button>
          )}

          {previewShareCardPageCount > 1 && (
            <div
              className="absolute left-1/2 z-[250] inline-flex h-8 -translate-x-1/2 items-center justify-center rounded-full border border-white/12 bg-white/10 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white/82 backdrop-blur-xl"
              style={{ top: 'calc(var(--app-safe-top, 0px) + 16px)' }}
            >
              1/{previewShareCardPageCount} cards
            </div>
          )}

          {isMyMatchStoryMode && (
            <div
              className="absolute left-1/2 z-[250] flex -translate-x-1/2 items-center gap-2"
              style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 16px)' }}
            >
              <button
                type="button"
                onClick={handlePickCardPhoto}
                disabled={isProcessingCardPhoto || isStoryImageBusy}
                className="tap-target inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/12 px-5 text-[13px] font-extrabold text-white backdrop-blur-xl disabled:opacity-60"
              >
                {isProcessingCardPhoto ? (
                  <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <FileImage size={16} />
                )}
                {isProcessingCardPhoto ? 'Memproses' : cardPhoto ? 'Ganti foto' : 'Tambah foto'}
              </button>
              {cardPhoto && (
                <button
                  type="button"
                  onClick={handleRemoveCardPhoto}
                  disabled={isProcessingCardPhoto || isStoryImageBusy}
                  className="tap-target inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 text-[13px] font-extrabold text-white/85 backdrop-blur-xl disabled:opacity-60"
                >
                  Hapus
                </button>
              )}
            </div>
          )}

          {storyImageUrl ? (
            <img
              src={storyImageUrl}
              alt="Generated share card"
              className={cn(
                'max-h-[calc(100dvh-24px)] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
                isCupuCertificateStoryMode ? 'aspect-[4/5] bg-[#FBF7EC]' : 'aspect-[9/16] bg-black'
              )}
              style={{ width: isCupuCertificateStoryMode ? 'min(calc(100vw - 24px), 420px)' : 'min(calc(100vw - 24px), 430px)' }}
            />
          ) : (
            <div
              className={cn(
                'relative max-h-[calc(100dvh-24px)] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
                isCupuCertificateStoryMode ? 'aspect-[4/5] bg-[#FBF7EC]' : 'aspect-[9/16] bg-black'
              )}
              style={{ width: isCupuCertificateStoryMode ? 'min(calc(100vw - 24px), 420px)' : 'min(calc(100vw - 24px), 430px)' }}
            >
              {!isCupuCertificateStoryMode && renderShareCardBackground()}

              {isCupuCertificateStoryMode ? renderCupuCertificateExportContent(true) : isMyMatchStoryMode ? (usesPhotoBackground ? renderMyMatchPhotoCardContent(true) : renderMyMatchStoryExportContent(true)) : isToxicStoryMode ? renderToxicStoryExportContent(true) : renderStandingsStoryContent(true)}
            </div>
          )}
        </div>
      )}

      {isRewindOpen && (
        <RewindFlow
          tournament={tournament}
          sortedPlayers={sortedPlayers}
          toxicStandings={toxicStandings}
          shareId={rewindShareId}
          currentUserUid={currentUserUid || undefined}
          isReadOnly={Boolean(isSharedViewer)}
          existingResult={rewindResult}
          onGenerated={setRewindResult}
          onClose={() => setIsRewindOpen(false)}
        />
      )}
    </div>
  );
};

const OfficialCrownIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 14 10"
    className={className}
    aria-hidden="true"
  >
    <path d="M1 9h12l-1.2-6.6-3 2.8L7 1 5.2 5.2l-3-2.8L1 9Z" fill="currentColor" />
  </svg>
);

type ToxicSummaryItem = {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'danger' | 'gold';
  action?: ToxicSummaryAction;
  ctaLabel?: string;
};

type ToxicSummaryAction =
  | { type: 'player'; playerId: string }
  | { type: 'award'; awardKey: string };

type SharePreviewVariant = 'shame' | 'official' | 'personal';

const getSharePreviewFrameClass = (preview: SharePreviewVariant) => (
  preview === 'shame'
    ? 'border-[#B7861F]/32 bg-[#151008]'
    : preview === 'personal'
      ? 'border-primary/16 bg-[#FFF3ED]'
      : 'border-black/[0.06] bg-white'
);

const getSharePreviewAccentClass = (preview: SharePreviewVariant) => (
  preview === 'shame' ? 'bg-[#E8C45A]' : 'bg-primary'
);

const getSharePreviewAvatarClass = (preview: SharePreviewVariant) => (
  preview === 'shame' ? 'bg-[#D4A017]' : 'bg-ios-gray/18'
);

const getSharePreviewFooterClass = (preview: SharePreviewVariant) => (
  preview === 'shame' ? 'bg-[#E8C45A]/50' : 'bg-ios-gray/16'
);

const getWorstToxicLossSummary = (rounds: Round[]) => {
  let worstLoss: { score: string; losers: string; loserIds: string[]; margin: number } | null = null;

  rounds.forEach((round) => {
    (round.matches || []).forEach((match) => {
      if (!hasMatchScoreProgress(match)) return;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const margin = Math.abs(scoreA - scoreB);
      if (margin <= 0 || (worstLoss && worstLoss.margin >= margin)) return;

      const losingTeam = scoreA > scoreB ? match.teamB : match.teamA;
      const scoreFor = scoreA > scoreB ? scoreB : scoreA;
      const scoreAgainst = scoreA > scoreB ? scoreA : scoreB;
      worstLoss = {
        score: `${scoreFor}-${scoreAgainst}`,
        losers: formatPlayerNames(losingTeam.players),
        loserIds: losingTeam.players.map((player) => player.id),
        margin,
      };
    });
  });

  return worstLoss;
};

const buildToxicSummaryItems = (toxicStandings: ToxicStandingsData, rounds: Round[]): ToxicSummaryItem[] => {
  if (toxicStandings.isEmpty || toxicStandings.isPeacefulTie) return [];

  const heroNames = toxicStandings.heroPlayers.map((player) => getShortPlayerName(player.name)).join(' & ');
  const diffStat = toxicStandings.heroStats.find((stat) => stat.label === 'Diff');
  const worstLoss = getWorstToxicLossSummary(rounds);
  const toxicPlayerIds = new Set(toxicStandings.rows.map((player) => player.id));
  const worstLossPlayerId = worstLoss?.loserIds.find((playerId) => toxicPlayerIds.has(playerId));
  const duoPetakaAward = toxicStandings.awardCards.find((award) => award.id === 'duo-petaka');
  const summaryItems: ToxicSummaryItem[] = [
    {
      label: toxicStandings.heroPlayers.length > 1 ? 'Co-King' : 'King',
      value: heroNames || '-',
      detail: diffStat ? `Diff ${diffStat.value}` : toxicStandings.heroTitle,
      tone: 'gold',
      action: toxicStandings.heroPlayers[0] ? { type: 'player', playerId: toxicStandings.heroPlayers[0].id } : undefined,
      ctaLabel: 'Lihat row',
    },
  ];

  if (worstLoss) {
    summaryItems.push({
      label: 'Worst Loss',
      value: worstLoss.score,
      detail: worstLoss.losers,
      tone: 'danger',
      action: worstLossPlayerId ? { type: 'player', playerId: worstLossPlayerId } : undefined,
      ctaLabel: 'Buka bukti',
    });
  }

  if (duoPetakaAward) {
    const duoNames = [
      duoPetakaAward.player,
      duoPetakaAward.secondaryPlayer,
    ].filter(Boolean).map((player) => getShortPlayerName(player?.name || '')).join(' & ');
    summaryItems.push({
      label: 'Pair Award',
      value: duoNames || 'Awarded',
      detail: 'Chemistry perlu diselamatkan',
      tone: 'gold',
      action: { type: 'award', awardKey: getToxicAwardCardKey(duoPetakaAward) },
      ctaLabel: 'Sertifikat',
    });
  } else {
    summaryItems.push({
      label: 'Awards',
      value: `${toxicStandings.awardCards.length}`,
      detail: 'Sertifikat aktif',
    });
  }

  return summaryItems.slice(0, 3);
};

const ShareMenuItem = ({
  label,
  description,
  icon,
  meta,
  preview,
  tone = 'default',
  disabled = false,
  onClick,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  meta?: string;
  preview?: SharePreviewVariant;
  tone?: 'default' | 'primary' | 'shame' | 'locked';
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'tap-target group flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors active:bg-ios-gray/[0.06] disabled:opacity-58 disabled:active:bg-transparent',
      tone === 'shame' && !disabled && 'active:bg-[#FFF6E0]',
      tone === 'primary' && !disabled && 'active:bg-[#FFF3ED]'
    )}
    role="menuitem"
    aria-label={label}
  >
    <span className={cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
      tone === 'shame'
        ? 'bg-[#151008] text-[#E8C45A]'
        : tone === 'primary'
          ? 'bg-primary/[0.09] text-primary'
          : tone === 'locked'
            ? 'bg-ios-gray/[0.08] text-ios-gray'
            : 'bg-[#F7F7FA] text-ios-gray'
    )}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-extrabold leading-tight tracking-[-0.01em] text-on-surface">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-[10.5px] font-semibold leading-tight text-ios-gray/72">
        {description}
      </span>
    </span>
    {preview && (
      <span
        className={cn(
          'relative h-10 w-7 shrink-0 overflow-hidden rounded-[7px] border shadow-[0_5px_12px_rgba(15,23,42,0.08)]',
          getSharePreviewFrameClass(preview)
        )}
        aria-hidden="true"
      >
        <span className={cn('absolute inset-x-1 top-1 h-1 rounded-full', getSharePreviewAccentClass(preview))} />
        <span className={cn('absolute left-1 top-3 h-3 w-3 rounded-full', getSharePreviewAvatarClass(preview))} />
        <span className={cn('absolute bottom-1.5 left-1 right-1 h-1 rounded-full', getSharePreviewFooterClass(preview))} />
      </span>
    )}
    {meta && (
      <span className={cn(
        'shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.08em]',
        tone === 'shame'
          ? 'bg-[#FFF6D8] text-[#9A6A00]'
          : tone === 'locked'
            ? 'bg-ios-gray/[0.08] text-ios-gray'
            : 'bg-primary/[0.08] text-primary'
      )}>
        {meta}
      </span>
    )}
  </button>
);

type RankMovement = {
  kind: 'up' | 'down' | 'same' | 'new';
  amount: number;
};

const getRankMovement = (
  currentRank: number,
  previousRank: number | undefined,
  hasBaseline: boolean
): RankMovement | null => {
  if (!hasBaseline) return null;
  if (!previousRank) return { kind: 'new', amount: 0 };
  const delta = previousRank - currentRank;
  if (delta > 0) return { kind: 'up', amount: delta };
  if (delta < 0) return { kind: 'down', amount: Math.abs(delta) };
  return { kind: 'same', amount: 0 };
};

const getRankMovementLabel = (movement: RankMovement) => {
  if (movement.kind === 'up') return `↑${movement.amount}`;
  if (movement.kind === 'down') return `↓${movement.amount}`;
  if (movement.kind === 'new') return 'New';
  return 'Stuck';
};

const getRankMovementAriaLabel = (movement: RankMovement, mode: 'official' | 'toxic') => {
  if (movement.kind === 'new') return 'New in ranking since the previous scored round.';
  if (movement.kind === 'same') return 'Rank unchanged since the previous scored round.';
  if (mode === 'toxic') {
    return movement.kind === 'up'
      ? `Moved ${movement.amount} places closer to King of Cupu since the previous scored round.`
      : `Moved ${movement.amount} places safer in Shame ranking since the previous scored round.`;
  }
  return movement.kind === 'up'
    ? `Moved up ${movement.amount} places since the previous scored round.`
    : `Moved down ${movement.amount} places since the previous scored round.`;
};

const RankMovementBadge = ({
  movement,
  mode,
}: {
  movement: RankMovement | null;
  mode: 'official' | 'toxic';
}) => {
  if (!movement) return null;

  const isToxic = mode === 'toxic';
  const badgeClass = movement.kind === 'up'
    ? isToxic
      ? 'border-[#D4A017]/34 bg-[#FFF7E0] text-[#8A6A1F]'
      : 'border-emerald-200/75 bg-emerald-50 text-[#1E7A38]'
    : movement.kind === 'down'
      ? isToxic
        ? 'border-emerald-200/75 bg-emerald-50 text-[#1E7A38]'
        : 'border-red-200/75 bg-red-50 text-error'
      : movement.kind === 'new'
        ? isToxic
          ? 'border-[#D4A017]/24 bg-white/72 text-[#8A6A1F]'
          : 'border-primary/14 bg-primary/[0.07] text-primary'
        : 'border-black/[0.055] bg-ios-gray/[0.045] text-ios-gray/68';

  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em]',
        badgeClass
      )}
      aria-label={getRankMovementAriaLabel(movement, mode)}
      title={getRankMovementAriaLabel(movement, mode)}
    >
      {getRankMovementLabel(movement)}
    </span>
  );
};

type ToxicAvatarPlayer = Pick<StandingsPlayer, 'name' | 'avatar' | 'initials'>;

const ToxicAvatar = ({
  player,
  className,
  initialsClassName,
}: {
  player: ToxicAvatarPlayer;
  className?: string;
  initialsClassName?: string;
}) => (
  <div className={cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ios-gray/10 bg-ios-gray/10 font-bold leading-none',
    className
  )}>
    {player.avatar ? (
      <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
    ) : (
      <span className={initialsClassName}>{player.initials.slice(0, 1)}</span>
    )}
  </div>
);

const ToxicHeroStatCell = ({ stat }: { stat: ToxicHeroStatData }) => (
  <div className="border-l border-white/12 pl-4 first:border-l-0 first:pl-0">
    <p className="text-[8px] font-extrabold uppercase leading-none tracking-[0.16em] text-[#C9A14A]/70">
      {stat.label}
    </p>
    <p className={cn(
      'mt-1 text-[19px] font-extrabold leading-none tabular-nums',
      stat.tone === 'danger' ? 'text-[#FF7B72]' : 'text-white'
    )}>
      {stat.value}
    </p>
  </div>
);

const ToxicPodiumColumn = ({
  player,
  place,
}: {
  player?: ToxicStandingRow;
  place: 1 | 2 | 3;
}) => {
  if (!player) return null;

  const podiumCopy = {
    1: {
      badge: 'EMAS AIR MATA',
      quote: 'Podium tertinggi, pencapaian terendah.',
      avatarClass: 'h-10 w-10 border-[2px] border-[#E8C45A] bg-[#2A2415] text-[#E8C45A]',
      nameClass: 'text-[12px] font-extrabold text-white',
      labelClass: 'text-[#E8C45A]',
      barClass: 'h-[58px] bg-[linear-gradient(180deg,#E8C45A,#B7861F)] text-[#141414] text-[23px]',
    },
    2: {
      badge: 'PERAK NYARIS RAJA',
      quote: 'Selangkah lagi takhta. Untungnya gagal.',
      avatarClass: 'h-9 w-9 border-white/30 bg-[#2C2C2E] text-white',
      nameClass: 'text-[11.5px] font-bold text-white',
      labelClass: 'text-white/55',
      barClass: 'h-[42px] bg-[#2C2C2E] text-white/65 text-[20px]',
    },
    3: {
      badge: 'PERUNGGU PENGHIBUR',
      quote: 'Salah arah, tapi tetap naik podium.',
      avatarClass: 'h-9 w-9 border-[#A77B33]/60 bg-[#241C0F] text-[#C99C5F]',
      nameClass: 'text-[11.5px] font-bold text-white',
      labelClass: 'text-[#C99C5F]',
      barClass: 'h-[32px] bg-[#241C0F] text-[#A77B33] text-[18px]',
    },
  }[place];
  const podiumQuote = getToxicPodiumQuote(player, place);

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="relative">
        <ToxicAvatar player={player} className={cn('text-[12px]', podiumCopy.avatarClass)} />
        {place === 1 && (
          <span className="absolute right-[-9px] top-[-12px] rotate-[22deg] text-[17px] leading-none" aria-hidden="true">👑</span>
        )}
      </div>
      <p className={cn('mt-1.5 max-w-full truncate leading-tight', podiumCopy.nameClass)}>
        {getShortPlayerName(player.name)}
      </p>
      <p className={cn('mt-0.5 line-clamp-2 text-[7px] font-extrabold uppercase leading-tight tracking-[0.12em]', podiumCopy.labelClass)}>
        {player.award?.label || podiumCopy.badge}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[30px] text-[9px] font-semibold italic leading-[1.25] text-white/48">
        “{podiumQuote || podiumCopy.quote}”
      </p>
      <div className={cn(
        'mt-1.5 flex w-full items-center justify-center rounded-t-[10px] font-extrabold leading-none tabular-nums',
        podiumCopy.barClass
      )}>
        {String(place).padStart(2, '0')}
      </div>
    </div>
  );
};

const formatToxicPodiumDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const formatToxicPodiumRecord = (player: ToxicStandingRow) => `${player.w}W-${player.l}L`;

const getToxicTableEvidenceChips = (player: ToxicStandingRow) => ([
  {
    label: `${player.w}W-${player.l}L`,
    tone: player.w > player.l ? 'good' : player.l > player.w ? 'danger' : 'default',
  },
  {
    label: `${player.matches}M`,
    tone: 'default',
  },
  {
    label: `DIFF ${formatToxicPodiumDiff(player.pointsDiff)}`,
    tone: player.pointsDiff > 0 ? 'good' : player.pointsDiff < 0 ? 'danger' : 'default',
  },
] as Array<{ label: string; tone: 'default' | 'good' | 'danger' }>);

type ToxicEvidenceChip = ReturnType<typeof getToxicTableEvidenceChips>[number];

const getToxicStoryEvidenceChips = (player: ToxicStandingRow, rounds: Round[]) => {
  const worstGame = getToxicPlayerWorstGameSummary(player, rounds);

  return [
    {
      label: `${player.w}W-${player.l}L`,
      tone: player.w > player.l ? 'good' : player.l > player.w ? 'danger' : 'default',
    },
    {
      label: `DIFF ${formatToxicPodiumDiff(player.pointsDiff)}`,
      tone: player.pointsDiff > 0 ? 'good' : player.pointsDiff < 0 ? 'danger' : 'default',
    },
    worstGame ? {
      label: `Worst ${worstGame.score}`,
      tone: 'gold',
    } : {
      label: `${player.matches}M`,
      tone: 'default',
    },
  ] as Array<{ label: string; tone: 'default' | 'good' | 'danger' | 'gold' }>;
};

type ToxicEvidenceDetailCard = {
  label: string;
  value: string;
  detail: string;
  tone: 'default' | 'danger' | 'good' | 'gold';
};

type ToxicEvidenceTimelineItem = {
  roundId: number;
  resultLabel: OfficialRoundHistoryItem['resultLabel'];
  scoreLabel: string;
  title: string;
  detail: string;
  tone: 'default' | 'danger' | 'good' | 'gold';
};

const getPrimaryToxicEvidenceChip = (player: ToxicStandingRow, chips: ToxicEvidenceChip[]) => (
  chips.find((chip) => chip.label.startsWith('DIFF') && player.pointsDiff !== 0) ||
  chips.find((chip) => chip.label.includes('W-') || chip.label.includes('L')) ||
  chips[0]
);

const getToxicPlayerWorstGameSummary = (player: ToxicStandingRow, rounds: Round[]) => {
  let worstGame: { score: string; opponents: string; roundNumber: number; margin: number } | null = null;

  rounds.forEach((round, roundIndex) => {
    (round.matches || []).forEach((match) => {
      if (!hasMatchScoreProgress(match)) return;
      const isTeamAPlayer = match.teamA.players.some((teamPlayer) => teamPlayer.id === player.id);
      const isTeamBPlayer = match.teamB.players.some((teamPlayer) => teamPlayer.id === player.id);
      if (!isTeamAPlayer && !isTeamBPlayer) return;

      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const scoreFor = isTeamAPlayer ? scoreA : scoreB;
      const scoreAgainst = isTeamAPlayer ? scoreB : scoreA;
      if (scoreFor >= scoreAgainst) return;

      const margin = scoreAgainst - scoreFor;
      if (margin <= 0 || (worstGame && worstGame.margin >= margin)) return;

      const opponents = isTeamAPlayer ? match.teamB.players : match.teamA.players;
      worstGame = {
        score: `${scoreFor}-${scoreAgainst}`,
        opponents: formatPlayerNames(opponents),
        roundNumber: roundIndex + 1,
        margin,
      };
    });
  });

  return worstGame;
};

const getToxicWhyReasons = (player: ToxicStandingRow, rounds: Round[]) => {
  const reasons: string[] = [];
  const worstGame = getToxicPlayerWorstGameSummary(player, rounds);

  if (player.bucket === 'champion') {
    reasons.push(`Official #${player.normalRank}; masuk Shame sebagai upside-down cameo.`);
  } else if (player.toxicRank === 1) {
    reasons.push(`Toxic rank #1 dari ${player.matches} match yang punya score.`);
  } else {
    reasons.push(`Toxic #${player.toxicRank}, sementara official #${player.normalRank}.`);
  }

  if (player.l > player.w) {
    reasons.push(`Record ${player.w}W-${player.l}L: kalahnya lebih sering dari menangnya.`);
  } else if (player.w > player.l) {
    reasons.push(`Record ${player.w}W-${player.l}L masih kuat, tapi ranking toxic tetap kebalik.`);
  } else if (player.matches > 0) {
    reasons.push(`Record imbang ${player.w}W-${player.l}L, jadi DIFF dan poin ikut menentukan.`);
  }

  if (player.pointsDiff < 0) {
    reasons.push(`DIFF ${formatToxicPodiumDiff(player.pointsDiff)} jadi bukti utama zona cupu.`);
  } else if (player.pointsDiff > 0) {
    reasons.push(`DIFF ${formatToxicPodiumDiff(player.pointsDiff)} aman, tapi konteks award tetap dihitung.`);
  }

  if (worstGame) {
    reasons.push(`Kalah terbesar ${worstGame.score} di R${worstGame.roundNumber} vs ${worstGame.opponents}.`);
  }

  return reasons.slice(0, 3);
};

const buildToxicTimelineTitle = (resultLabel: OfficialRoundHistoryItem['resultLabel'], scoreLabel: string) => {
  if (resultLabel === 'W') return `Menang ${scoreLabel}`;
  if (resultLabel === 'L') return `Kalah ${scoreLabel}`;
  if (resultLabel === 'D') return `Draw ${scoreLabel}`;
  if (resultLabel === 'BYE') return 'Sitting';
  return scoreLabel === '—' ? 'On court' : `Live ${scoreLabel}`;
};

const getToxicEvidenceTimeline = (player: ToxicStandingRow, rounds: Round[]): ToxicEvidenceTimelineItem[] => {
  const timeline: ToxicEvidenceTimelineItem[] = [];

  rounds.forEach((round) => {
    const byePlayers = round.playersBye || [];
    if (byePlayers.some((roundPlayer) => roundPlayer.id === player.id)) {
      timeline.push({
        roundId: round.id,
        resultLabel: 'BYE',
        scoreLabel: '—',
        title: 'Sitting',
        detail: 'Tidak main ronde ini',
        tone: 'gold',
      });
      return;
    }

    const match = (round.matches || []).find((candidate) => (
      candidate.teamA.players.some((roundPlayer) => roundPlayer.id === player.id) ||
      candidate.teamB.players.some((roundPlayer) => roundPlayer.id === player.id)
    ));
    if (!match) return;

    const isTeamA = match.teamA.players.some((roundPlayer) => roundPlayer.id === player.id);
    const playerTeam = isTeamA ? match.teamA : match.teamB;
    const opponentTeam = isTeamA ? match.teamB : match.teamA;
    const scoreFor = Number(playerTeam.score || 0);
    const scoreAgainst = Number(opponentTeam.score || 0);
    const hasScore = match.status === 'completed' || scoreFor > 0 || scoreAgainst > 0 || (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
    const teammateNames = formatPlayerNames(playerTeam.players.filter((roundPlayer) => roundPlayer.id !== player.id));
    const opponentNames = formatPlayerNames(opponentTeam.players);
    const scoreLabel = hasScore ? `${scoreFor}-${scoreAgainst}` : '—';
    let resultLabel: OfficialRoundHistoryItem['resultLabel'] = 'LIVE';
    if (match.status === 'completed') {
      resultLabel = scoreFor > scoreAgainst ? 'W' : scoreFor < scoreAgainst ? 'L' : 'D';
    }

    timeline.push({
      roundId: round.id,
      resultLabel,
      scoreLabel,
      title: buildToxicTimelineTitle(resultLabel, scoreLabel),
      detail: [
        teammateNames ? `w/ ${teammateNames}` : '',
        opponentNames ? `vs ${opponentNames}` : '',
      ].filter(Boolean).join(' ') || `Court ${match.court || '-'}`,
      tone: resultLabel === 'L' ? 'danger' : resultLabel === 'W' ? 'good' : 'default',
    });
  });

  return timeline;
};

const getToxicEvidenceDetailCards = (player: ToxicStandingRow, rounds: Round[]): ToxicEvidenceDetailCard[] => {
  const worstGame = getToxicPlayerWorstGameSummary(player, rounds);
  const recordTone = player.l > player.w ? 'danger' : player.w > player.l ? 'good' : 'default';
  const diffTone = player.pointsDiff < 0 ? 'danger' : player.pointsDiff > 0 ? 'good' : 'default';

  return [
    {
      label: 'Shame',
      value: `#${player.toxicRank}`,
      detail: `Official #${player.normalRank}`,
      tone: player.toxicRank === 1 ? 'gold' : 'default',
    },
    {
      label: 'Record',
      value: `${player.w}W-${player.l}L`,
      detail: `${player.matches} match`,
      tone: recordTone,
    },
    worstGame
      ? {
          label: 'Worst',
          value: worstGame.score,
          detail: `R${worstGame.roundNumber} vs ${worstGame.opponents}`,
          tone: 'danger',
        }
      : {
          label: 'Diff',
          value: formatToxicPodiumDiff(player.pointsDiff),
          detail: `${player.totalPoints} pts`,
          tone: diffTone,
        },
  ];
};

const getToxicPlayerDetailId = (playerId: string) => (
  `toxic-player-detail-${playerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

const getToxicPlayerRowId = (playerId: string) => (
  `toxic-player-row-${playerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

const getToxicStandingControlLabel = ({
  player,
  rankNumber,
  isExpanded,
}: {
  player: ToxicStandingRow;
  rankNumber: number;
  isExpanded: boolean;
}) => (
  `${isExpanded ? 'Collapse' : 'Expand'} ${player.name} shame evidence. Toxic rank ${rankNumber}, normal rank ${player.normalRank}, ${formatAccessibleCount(player.w, 'win')}, ${formatAccessibleCount(player.l, 'loss', 'losses')}, ${formatAccessibleCount(player.matches, 'match', 'matches')}, ${formatAccessibleCount(player.totalPoints, 'point')}, diff ${formatAccessibleDiff(player.pointsDiff)}.`
);

const getToxicPodiumQuote = (player: ToxicStandingRow, place: 1 | 2 | 3) => {
  const diff = formatToxicPodiumDiff(player.pointsDiff);
  const record = formatToxicPodiumRecord(player);
  const pts = player.totalPoints;

  switch (player.award?.id) {
    case 'king-of-cupu':
      return `${record}, DIFF ${diff}. Takhta bawah valid.`;
    case 'runner-up-cupu':
      return `${pts} pts, DIFF ${diff}. Nyalip takhta dari pinggir.`;
    case 'sultan-of-bye':
      return player.award.note || 'Bangku cadangan ikut jadi saksi.';
    case 'tukang-nyumbang-poin':
      return `DIFF ${diff}. Poin lawan ikut kenyang.`;
    case 'spesialis-kalah-tipis':
      return `${player.l}x kalah. Drama tipis, ending tetap sakit.`;
    case 'bulldozer-korban':
      return player.award.note || `DIFF ${diff}. Pernah kena tabrak scoreboard.`;
    case 'sweaty-tryhard':
      return `${player.w}x menang. Juara normal, cameo di Shame.`;
    case 'mr-konsisten':
      return `${record}. Stabil, tapi tetap kena panggung.`;
    case 'duo-petaka':
      return player.award.note || 'Chemistry perlu evaluasi publik.';
    default:
      break;
  }

  if (player.bucket === 'last-place') return `${record}, DIFF ${diff}. Cupu D'Or mendarat.`;
  if (player.bucket === 'near-bottom') return `${pts} pts, DIFF ${diff}. Masih bau zona cupu.`;
  if (player.bucket === 'big-minus') return `DIFF ${diff}. Kalkulator sudah menyerah.`;
  if (player.bucket === 'bye-collector') return 'Sitting rapi. Energi aman, reputasi rawan.';
  if (player.bucket === 'losing-streak') return `${player.l}x kalah. Streak-nya salah arah.`;
  if (player.bucket === 'heartbreaker') return 'Kalah tipis, lukanya tetap tebal.';
  if (player.bucket === 'champion') return `${player.w}x menang. Terlalu serius untuk fun match.`;
  if (place === 1) return `${record}, DIFF ${diff}. Podium bawah resmi.`;
  if (place === 2) return `${pts} pts. Hampir jadi headline.`;
  return `DIFF ${diff}. Cukup kacau untuk podium.`;
};

const OfficialPlayerDetailCard = ({
  player,
  roundHistory,
  showAllRoundHistory = false,
  onToggleRoundHistory,
}: {
  player: StandingsPlayer;
  roundHistory: OfficialRoundHistoryItem[];
  showAllRoundHistory?: boolean;
  onToggleRoundHistory?: () => void;
}) => {
  const canToggleRoundHistory = roundHistory.length > 3 && onToggleRoundHistory;
  const visibleRoundHistory = showAllRoundHistory ? roundHistory : roundHistory.slice(0, 3);
  const matchReadInsights = getOfficialMatchReadInsights(roundHistory);
  const historyLabel = roundHistory.length > 0
    ? showAllRoundHistory
      ? `All ${roundHistory.length}`
      : `Last ${Math.min(3, roundHistory.length)}`
    : 'No rounds';

  return (
    <div className="rounded-[18px] border border-black/[0.06] bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.035)]">
      <div className="grid grid-cols-4 gap-1.5">
        <OfficialDetailStat label="W" value={player.w} tone="win" />
        <OfficialDetailStat label="L" value={player.l} tone="loss" />
        <OfficialDetailStat label="D" value={player.d} />
        <OfficialDetailStat label="M" value={player.matches} />
      </div>
      <div className="mt-2.5 rounded-[15px] border border-black/[0.045] bg-[#FAFAFB] p-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[8px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">
            Match read
          </p>
          <p className="text-[8.5px] font-bold leading-none text-ios-gray/48">
            Official only
          </p>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {matchReadInsights.map((insight) => (
            <div key={insight.label} className="min-w-0 rounded-[12px] bg-white px-2 py-2 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]">
              <p className="truncate text-[7.5px] font-black uppercase leading-none tracking-[0.1em] text-ios-gray/52">
                {insight.label}
              </p>
              <p className={cn(
                'mt-1.5 truncate text-[13px] font-extrabold leading-none tabular-nums',
                insight.tone === 'win'
                  ? 'text-[#1E7A38]'
                  : insight.tone === 'loss'
                    ? 'text-error'
                    : insight.tone === 'live'
                      ? 'text-[#2563EB]'
                      : 'text-on-surface'
              )}>
                {insight.value}
              </p>
              <p className="mt-1 truncate text-[8.5px] font-semibold leading-none text-ios-gray/58">
                {insight.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 border-t border-black/[0.06] pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[8px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">
            Round history
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[9px] font-bold leading-none text-ios-gray/52">
              {historyLabel}
            </span>
            {canToggleRoundHistory && (
              <button
                type="button"
                onClick={onToggleRoundHistory}
                className="tap-target inline-flex h-6 items-center justify-center rounded-full bg-[#FFF3ED] px-2.5 text-[8.5px] font-extrabold leading-none text-primary"
                aria-label={showAllRoundHistory ? `Show latest ${Math.min(3, roundHistory.length)} rounds` : `Show all ${roundHistory.length} rounds`}
              >
                {showAllRoundHistory ? `Latest ${Math.min(3, roundHistory.length)}` : `Show all ${roundHistory.length}`}
              </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleRoundHistory.length > 0 ? visibleRoundHistory.map((item) => (
            <div
              key={`${player.id}-${item.roundId}-${item.detail}`}
              className="min-w-[104px] max-w-[132px] snap-start rounded-[14px] border border-black/[0.045] bg-ios-gray/[0.035] px-2.5 py-2 text-[11px] leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
              aria-label={`Round ${item.roundId}, ${item.resultLabel}, score ${item.scoreLabel}, ${item.detail}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[8px] font-black uppercase leading-none tracking-[0.09em] text-ios-gray/58 tabular-nums">
                  R{item.roundId}
                </span>
                <span className={cn('inline-flex min-w-[22px] shrink-0 items-center justify-center rounded-full px-[6px] py-[3px] text-[8px] font-black leading-none', getRoundResultChipClass(item.resultLabel))}>
                  {item.resultLabel}
                </span>
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <span className="text-[16px] font-black leading-none text-on-surface tabular-nums">
                  {item.scoreLabel}
                </span>
                <span className={cn(
                  'mb-px inline-flex h-5 min-w-0 items-center justify-center rounded-full px-1.5 text-[7px] font-black uppercase leading-none tracking-[0.04em]',
                  item.resultLabel === 'BYE'
                    ? 'bg-[#FFF4DF] text-[#9A6A00]'
                    : 'bg-white text-ios-gray/62 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.05)]'
                )}>
                  {item.courtLabel}
                </span>
              </div>
              <p className="mt-1.5 truncate text-[8.5px] font-semibold leading-tight text-ios-gray/68">
                {item.detail}
              </p>
            </div>
          )) : (
            <p className="rounded-[12px] bg-ios-gray/[0.035] px-3 py-3 text-[11px] font-semibold text-ios-gray">No round history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const OfficialDetailStat = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'win' | 'loss';
}) => (
  <div className="rounded-[12px] bg-ios-gray/[0.04] px-2.5 py-2 text-center">
    <p className="text-[8px] font-black uppercase leading-none tracking-[0.14em] text-ios-gray/58">{label}</p>
    <p className={cn(
      'mt-1.5 text-[17px] font-extrabold leading-none tabular-nums',
      tone === 'win' ? 'text-[#1E8E3E]' : tone === 'loss' ? 'text-error' : 'text-on-surface'
    )}>
      {value}
    </p>
  </div>
);

type OfficialRoundHistoryItem = {
  roundId: number;
  courtLabel: string;
  detail: string;
  scoreLabel: string;
  resultLabel: 'W' | 'L' | 'D' | 'BYE' | 'LIVE';
};

type OfficialMatchReadInsight = {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'win' | 'loss' | 'live';
};

const parseRoundScoreMargin = (scoreLabel: string) => {
  const match = scoreLabel.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return Number(match[1]) - Number(match[2]);
};

const getOfficialMatchReadInsights = (roundHistory: OfficialRoundHistoryItem[]): OfficialMatchReadInsight[] => {
  const playedRounds = roundHistory.filter((item) => item.resultLabel !== 'BYE');
  const completedRounds = playedRounds.filter((item) => item.resultLabel !== 'LIVE');
  const scoredRounds = completedRounds
    .map((item) => ({ item, margin: parseRoundScoreMargin(item.scoreLabel) }))
    .filter((entry): entry is { item: OfficialRoundHistoryItem; margin: number } => entry.margin !== null);
  const form = completedRounds.slice(0, 3).map((item) => item.resultLabel).join(' ');
  const latestRound = playedRounds[0];
  const latestResult = completedRounds[0]?.resultLabel;
  const bestWin = scoredRounds
    .filter((entry) => entry.margin > 0)
    .sort((a, b) => b.margin - a.margin)[0];
  const hardestLoss = scoredRounds
    .filter((entry) => entry.margin < 0)
    .sort((a, b) => a.margin - b.margin)[0];

  return [
    {
      label: 'Form',
      value: form || (latestRound?.resultLabel === 'LIVE' ? 'Live' : '—'),
      detail: latestRound ? `Latest R${latestRound.roundId}` : 'No games yet',
      tone: latestRound?.resultLabel === 'LIVE'
        ? 'live'
        : latestResult === 'W'
          ? 'win'
          : latestResult === 'L'
            ? 'loss'
            : 'neutral',
    },
    {
      label: 'Best',
      value: bestWin ? `+${bestWin.margin}` : '—',
      detail: bestWin ? `R${bestWin.item.roundId} ${bestWin.item.scoreLabel}` : 'No win yet',
      tone: bestWin ? 'win' : 'neutral',
    },
    {
      label: 'Hardest',
      value: hardestLoss ? `${hardestLoss.margin}` : '—',
      detail: hardestLoss ? `R${hardestLoss.item.roundId} ${hardestLoss.item.scoreLabel}` : 'No loss yet',
      tone: hardestLoss ? 'loss' : 'neutral',
    },
  ];
};

const getShortPlayerName = (name = '') => (
  name.trim().split(/\s+/)[0] || name
);

const getOfficialPlayerDetailId = (playerId: string) => (
  `official-player-detail-${playerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

const getOfficialPlayerRowId = (playerId: string) => (
  `official-player-row-${playerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
);

const formatAccessibleCount = (value: number, singular: string, plural = `${singular}s`) => (
  `${value} ${value === 1 ? singular : plural}`
);

const formatAccessibleDiff = (value: number) => {
  if (value > 0) return `plus ${value}`;
  if (value < 0) return `minus ${Math.abs(value)}`;
  return 'zero';
};

const getOfficialStandingControlLabel = ({
  player,
  rankNumber,
  isExpanded,
}: {
  player: StandingsPlayer;
  rankNumber: number;
  isExpanded: boolean;
}) => (
  `${isExpanded ? 'Collapse' : 'Expand'} ${player.name} round history. Rank ${rankNumber}, ${formatAccessibleCount(player.w, 'win')}, ${formatAccessibleCount(player.l, 'loss', 'losses')}, ${formatAccessibleCount(player.d, 'draw')}, ${formatAccessibleCount(player.matches, 'match', 'matches')}, ${formatAccessibleCount(player.totalPoints, 'point')}, diff ${formatAccessibleDiff(player.pointsDiff)}.`
);

const formatPlayerNames = (players: Player[]) => (
  players.map((player) => getShortPlayerName(player.name)).join(' & ')
);

const buildOfficialRoundHistory = (rounds: Round[], playerId: string): OfficialRoundHistoryItem[] => {
  const history: OfficialRoundHistoryItem[] = [];

  rounds.forEach((round) => {
    const byePlayers = round.playersBye || [];
    if (byePlayers.some((player) => player.id === playerId)) {
      history.push({
        roundId: round.id,
        courtLabel: 'BYE',
        detail: 'Sitting this round',
        scoreLabel: '—',
        resultLabel: 'BYE',
      });
      return;
    }

    const match = (round.matches || []).find((candidate) => (
      candidate.teamA.players.some((player) => player.id === playerId) ||
      candidate.teamB.players.some((player) => player.id === playerId)
    ));
    if (!match) return;

    const isTeamA = match.teamA.players.some((player) => player.id === playerId);
    const playerTeam = isTeamA ? match.teamA : match.teamB;
    const opponentTeam = isTeamA ? match.teamB : match.teamA;
    const scoreFor = Number(playerTeam.score || 0);
    const scoreAgainst = Number(opponentTeam.score || 0);
    const hasScore = match.status === 'completed' || scoreFor > 0 || scoreAgainst > 0 || (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
    const teammateNames = formatPlayerNames(playerTeam.players.filter((player) => player.id !== playerId));
    const opponentNames = formatPlayerNames(opponentTeam.players);
    const detail = [
      teammateNames ? `w/ ${teammateNames}` : '',
      opponentNames ? `vs ${opponentNames}` : '',
    ].filter(Boolean).join(' ');

    let resultLabel: OfficialRoundHistoryItem['resultLabel'] = 'LIVE';
    if (match.status === 'completed') {
      resultLabel = scoreFor > scoreAgainst ? 'W' : scoreFor < scoreAgainst ? 'L' : 'D';
    }

    history.push({
      roundId: round.id,
      courtLabel: `C${match.court || '-'}`,
      detail: detail || `Court ${match.court || '-'}`,
      scoreLabel: hasScore ? `${scoreFor}-${scoreAgainst}` : '—',
      resultLabel,
    });
  });

  return history.reverse();
};

const getRoundResultChipClass = (resultLabel: OfficialRoundHistoryItem['resultLabel']) => {
  if (resultLabel === 'W') return 'bg-[#E7F4EA] text-[#1E7A38]';
  if (resultLabel === 'L') return 'bg-[#FDECEC] text-[#C0353C]';
  if (resultLabel === 'D') return 'bg-[#F2F2F4] text-ios-gray';
  if (resultLabel === 'BYE') return 'bg-[#FFF4DF] text-[#9A6A00]';
  return 'bg-[#EAF2FF] text-[#2563EB]';
};

const formatElapsedForMeta = (value: string) => {
  const parts = value.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [hours, minutes] = parts;
    return `${hours}H ${minutes}M`;
  }
  if (parts.length === 2 && parts.every((part) => Number.isFinite(part))) {
    const [minutes] = parts;
    return `${minutes}M`;
  }
  return value;
};

const formatElapsedForStat = (value: string) => {
  const parts = value.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [hours, minutes] = parts;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }
  return value;
};

const getOfficialAvatarTone = (rankIndex: number) => {
  if (rankIndex === 0) return 'bg-[#111111] text-white';
  const tones = [
    'bg-[#F1F1F3] text-on-surface',
    'bg-[#E8EDF1] text-on-surface',
    'bg-[#EFE7DA] text-on-surface',
    'bg-[#F3E8E1] text-on-surface',
    'bg-[#E5F0E6] text-on-surface',
    'bg-[#EDE8F5] text-on-surface',
  ];
  return tones[(rankIndex - 1) % tones.length];
};

const SummaryStripStat = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="flex min-w-0 flex-col justify-center border-l border-black/[0.07] pl-5 first:border-l-0 first:pl-0">
    <p className="text-[8.5px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/62">{label}</p>
    <p className="mt-1.5 whitespace-nowrap text-[20px] font-display font-bold leading-none tracking-[-0.025em] text-on-surface/92 tabular-nums">{value}</p>
  </div>
);
