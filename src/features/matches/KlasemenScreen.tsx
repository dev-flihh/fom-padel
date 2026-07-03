import { Fragment, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, ChevronDown, CircleDot, Flame, Share2, UserRound, Zap } from 'lucide-react';
import { AppLogo } from '../../components/app/AppLogo';
import { SharedViewerFomPlayCta } from '../../components/app/SharedViewerFomPlayCta';
import { cn } from '../../lib/utils';
import { fetchToxicCopyConfig } from '../../services/toxicCopyRemoteConfig';
import { type Player, type Round, type Tournament, type TournamentHistory, type TournamentStatsSyncState } from '../../types';
import { getMatchThemeColor } from '../tournaments/matchTheme';
import { formatDurationFromMs, formatElapsedForStat, getTournamentElapsedMs } from './matchTimeUtils';
import { buildOfficialStandings, buildOfficialTeamStandings, hasMatchScoreProgress, type StandingsPlayer } from './standingsUtils';
import { isFixedPartnerTournament } from './partnerMode';
import type { ToxicCopyConfig } from './toxicCopyConfig';
import { buildToxicStandings, type ToxicAwardCard, type ToxicHeroStat as ToxicHeroStatData, type ToxicStandingRow, type ToxicStandingsData } from './toxicStandings';
import { getToxicIntensityLabel } from './toxicSettings';
import { trackRewindEvent } from '../../analytics';
import { getTournamentShareStorageKey } from '../history/historyPersistence';
import { RewindFlow, type RewindResult } from '../rewind/RewindFlow';
import { useMatchSettingsFriends } from './useMatchSettingsFriends';

const STANDINGS_TAB_OFFICIAL_ID = 'standings-tab-official';
const STANDINGS_TAB_TOXIC_ID = 'standings-tab-toxic';
const STANDINGS_PANEL_OFFICIAL_ID = 'standings-panel-official';
const STANDINGS_PANEL_TOXIC_ID = 'standings-panel-toxic';

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

export const KlasemenScreen = ({
  tournament,
  currentUser,
  onBack,
  onShare,
  onShareFeedback,
  onOpenActive,
  isSharedViewer,
  statsSyncState,
  autoPromptRewind,
  onRewindPromptConsumed,
}: {
  tournament: Tournament | TournamentHistory;
  currentUser?: any;
  onBack: () => void;
  onShare: (t: Tournament | TournamentHistory) => void;
  onShareFeedback: (state: 'success' | 'ready' | 'failed', message?: string) => void;
  onOpenActive: () => void;
  isSharedViewer?: boolean;
  statsSyncState?: TournamentStatsSyncState | null;
  autoPromptRewind?: boolean;
  onRewindPromptConsumed?: () => void;
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  const [isRewindOpen, setIsRewindOpen] = useState(false);
  const [rewindResult, setRewindResult] = useState<RewindResult | null>(null);
  const [rewindEntrySource, setRewindEntrySource] = useState<'banner' | 'finish_flow'>('banner');
  const hasRemoteRewind = Boolean(tournament.rewind?.slides?.length);

  // FR-4.5: after finishing a match, host lands on Klasemen and is prompted
  // straight into the Rewind upload (skippable). One-shot, host-only.
  useEffect(() => {
    if (!autoPromptRewind || isSharedViewer) return;
    setRewindEntrySource('finish_flow');
    setIsRewindOpen(true);
    onRewindPromptConsumed?.();
  }, [autoPromptRewind, isSharedViewer, onRewindPromptConsumed]);
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
  const officialRowHighlightTimerRef = useRef<number | null>(null);
  const toxicRowHighlightTimerRef = useRef<number | null>(null);
  const currentUserUid = String(currentUser?.uid || '').trim();
  const currentUserPhotoURL = typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '';
  const { friends } = useMatchSettingsFriends(currentUserUid);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (officialRowHighlightTimerRef.current) window.clearTimeout(officialRowHighlightTimerRef.current);
      if (toxicRowHighlightTimerRef.current) window.clearTimeout(toxicRowHighlightTimerRef.current);
    };
  }, []);

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
  // Mode fix partner: unit peringkat adalah tim. officialRows dipakai untuk tab
  // official, toxic Hall of Shame, dan seluruh deck Rewind supaya tidak ada
  // baris kembar per tim. Rotating tetap pakai sortedPlayers (per-pemain).
  const isFixedPartnerMode = isFixedPartnerTournament(tournament) && (tournament.fixedTeams || []).length > 0;
  const officialRows = useMemo(() => (
    isFixedPartnerMode
      ? buildOfficialTeamStandings({ tournament, officialStandings }).players
      : sortedPlayers
  ), [isFixedPartnerMode, officialStandings, sortedPlayers, tournament]);
  // Basis peringkat untuk toxic & rewind: per-tim saat fixed, per-pemain saat rotating.
  const rankedStandings = isFixedPartnerMode ? officialRows : sortedPlayers;

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
    isFixedPartnerMode ? 'Fix Partner' : '',
    `${sortedPlayers.length} players`,
    isTournamentEnded
      ? `${totalRounds || displayedRoundCount} rounds`
      : `Round ${displayedRoundCount}/${totalRounds || 0}`,
    totalElapsedMs > 0 ? totalElapsedStat : '',
  ].filter(Boolean);
  const shouldShowOfficialStandings = hasCountableStandingScore && officialRows.length > 0;
  const officialDisplayPlayers = shouldShowOfficialStandings ? officialRows : [];
  const showOfficialChampionStrip = !isToxicTabActive && isTournamentEnded && shouldShowOfficialStandings;
  const officialListPlayers = showOfficialChampionStrip ? officialRows.slice(1) : officialDisplayPlayers;
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
      sortedPlayers: rankedStandings,
      hasCountableScore: hasCountableStandingScore,
      isEnded: isTournamentEnded,
      toxicCopyConfig,
    })
  ), [hasCountableStandingScore, isTournamentEnded, rankedStandings, tournament, toxicCopyConfig]);
  // Tab Shame memakai satu panggung gelap dari bawah tab bar sampai dasar
  // halaman; state kosong tetap terang.
  const isToxicDarkTheme = isToxicTabActive && !toxicStandings.isEmpty;
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
    new Map(officialRows.map((player, index) => [player.id, index + 1]))
  ), [officialRows]);
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
  const previousOfficialRankById = useMemo(() => {
    if (!previousOfficialStandings) return new Map<string, number>();
    const previousRows = isFixedPartnerMode
      ? buildOfficialTeamStandings({ tournament, officialStandings: previousOfficialStandings }).players
      : previousOfficialStandings.players;
    return new Map(previousRows.map((player, index) => [player.id, index + 1]));
  }, [isFixedPartnerMode, previousOfficialStandings, tournament]);
  const previousToxicRankById = useMemo(() => {
    if (!toxicModeEnabled || !previousOfficialStandings?.hasCountableScore) return new Map<string, number>();
    const previousRankedStandings = isFixedPartnerMode
      ? buildOfficialTeamStandings({ tournament, officialStandings: previousOfficialStandings }).players
      : previousOfficialStandings.players;
    const previousToxicStandings = buildToxicStandings({
      tournament: {
        ...tournament,
        rounds: tournamentRounds.slice(0, latestScoredRoundIndex),
      },
      sortedPlayers: previousRankedStandings,
      hasCountableScore: previousOfficialStandings.hasCountableScore,
      isEnded: false,
      toxicCopyConfig,
    });
    return new Map(previousToxicStandings.rows.map((player) => [player.id, player.toxicRank]));
  }, [isFixedPartnerMode, latestScoredRoundIndex, previousOfficialStandings, tournament, tournamentRounds, toxicCopyConfig, toxicModeEnabled]);
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
  // Di mode fixed baris toxic adalah baris tim (id = anchor); user bisa jadi
  // anchor atau partner, jadi cocokkan lewat id maupun partnerId.
  const myMatchToxicRow = myMatchStanding
    ? toxicStandings.rows.find((player) => (
        player.id === myMatchStanding.id || player.partnerId === myMatchStanding.id
      )) || null
    : null;
  // Baris official milik user: di mode fixed bisa jadi baris tim yang
  // menampung user sebagai partner (id baris = id anchor, bukan id user).
  const myOfficialRow = currentUserMatchPlayer
    ? officialRows.find((row) => (
        row.id === currentUserMatchPlayer.id || row.partnerId === currentUserMatchPlayer.id
      )) || null
    : null;
  const myMatchOfficialRank = myOfficialRow ? officialRankById.get(myOfficialRow.id) || 0 : 0;
  const hasLoginMatchPlayer = Boolean(currentUserUid && myMatchStanding);

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
    if (!shouldShowOfficialStandings || !myMatchOfficialRank || !myOfficialRow) return null;
    return {
      tone: 'official' as const,
      eyebrow: myOfficialRow.isTeamRow ? 'Your team rank' : 'Your rank',
      value: `#${myMatchOfficialRank}`,
      detail: `${myOfficialRow.w}W · ${myOfficialRow.l}L · ${myOfficialRow.matches}M`,
      metric: `${myOfficialRow.totalPoints} pts`,
    };
  })();
  return (
    <div className="relative min-h-screen overflow-hidden bg-white z-0">
      <main
        className="standings-main relative z-10 mx-auto min-h-screen w-full max-w-md bg-white px-6"
        style={{
          paddingTop: 'calc(var(--app-safe-top, 0px) + 24px)',
          // Saat panggung gelap aktif, clearance bawah dipindah ke padding
          // dalam blok gelap penutup supaya tidak ada sisa putih di dasar.
          paddingBottom: isToxicDarkTheme
            ? '0px'
            : showSharedTrialCta
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
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onShare(tournament)}
                className="tap-target inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.08] text-primary"
                aria-label="Share match link"
              >
                <Share2 size={15} strokeWidth={2.2} />
              </button>
              <span className={cn(
                'mt-0.5 inline-flex h-[23px] shrink-0 items-center justify-center rounded-full px-2.5 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em]',
                isTournamentEnded ? 'bg-[#111111] text-white' : 'bg-primary text-white'
              )}>
                {!isTournamentEnded && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />}
                {isTournamentEnded ? 'Ended' : 'Live'}
              </span>
            </div>
          </div>

          <h1 className="truncate text-[22px] font-display font-bold leading-[1.16] tracking-[-0.028em] text-on-surface">
            {tournament.name || '-'}
          </h1>
          <div className="mt-2 flex flex-col gap-0.5 text-[9.5px] font-extrabold uppercase leading-[1.5] tracking-[0.12em] text-ios-gray/68">
            {standingsDetailLineOne.length > 0 && <p>{standingsDetailLineOne.join(' · ')}</p>}
            {standingsDetailLineTwo.length > 0 && <p>{standingsDetailLineTwo.join(' · ')}</p>}
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
          </div>
        </section>

        {isTournamentEnded && (!isSharedViewer || hasRemoteRewind) && (
          <section className={isToxicDarkTheme ? '-mx-6 bg-[#131008]' : 'pt-3'}>
            <button
              type="button"
              onClick={() => { setRewindEntrySource('banner'); setIsRewindOpen(true); }}
              className={cn(
                'tap-target relative flex w-full items-center gap-3.5 overflow-hidden text-left',
                isToxicDarkTheme
                  ? 'border-b border-[#C9A14A]/14 px-5 py-4 transition-colors active:bg-white/[0.03]'
                  : 'rounded-[20px] bg-[#111111] px-4 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.10)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100'
              )}
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
          <section className={cn(
            personalStandingShortcut.tone === 'toxic'
              ? '-mx-6 bg-[#131008]'
              : 'flex flex-col gap-2 pt-3'
          )}>
            <button
              type="button"
              onClick={() => {
                if (personalStandingShortcut.tone === 'toxic' && myMatchToxicRow) {
                  scrollToToxicStandingPlayer(myMatchToxicRow.id);
                  return;
                }
                if (myOfficialRow) {
                  scrollToOfficialStandingPlayer(myOfficialRow.id);
                }
              }}
              className={cn(
                'tap-target flex w-full items-center gap-2.5 text-left',
                personalStandingShortcut.tone === 'toxic'
                  ? 'border-b border-[#C9A14A]/14 px-5 py-3 text-[#E8C45A] transition-colors active:bg-white/[0.03]'
                  : 'rounded-[18px] border border-primary/14 bg-[#FFF8F3] px-3 py-2.5 text-primary shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100'
              )}
              aria-label={`Jump to ${personalStandingShortcut.eyebrow} ${personalStandingShortcut.value}`}
            >
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                personalStandingShortcut.tone === 'toxic'
                  ? 'border border-[#C9A14A]/40 bg-[#2A2415] text-[#F4D77B]'
                  : 'bg-primary text-white'
              )}>
                <UserRound size={15} strokeWidth={2.35} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn(
                  'block text-[7.5px] font-black uppercase leading-none tracking-[0.16em]',
                  personalStandingShortcut.tone === 'toxic' ? 'text-[#C9A14A]' : 'text-primary/72'
                )}>
                  {personalStandingShortcut.eyebrow}
                </span>
                <span className="mt-1 flex min-w-0 items-baseline gap-2">
                  <span className={cn(
                    'text-[16px] font-black leading-none tracking-[-0.02em] tabular-nums',
                    personalStandingShortcut.tone === 'toxic' ? 'text-white' : 'text-on-surface'
                  )}>
                    {personalStandingShortcut.value}
                  </span>
                  <span className={cn(
                    'min-w-0 truncate text-[10.5px] font-bold leading-none',
                    personalStandingShortcut.tone === 'toxic' ? 'text-white/50' : 'text-ios-gray/72'
                  )}>
                    {personalStandingShortcut.detail}
                  </span>
                </span>
              </span>
              <span className={cn(
                'shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.08em]',
                personalStandingShortcut.tone === 'toxic'
                  ? 'border-[#C9A14A]/28 bg-white/[0.06] text-[#E8C45A]'
                  : 'border-primary/12 bg-white text-primary'
              )}>
                {personalStandingShortcut.metric}
              </span>
            </button>
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

        {isToxicTabActive && (
          <section
            id={STANDINGS_PANEL_TOXIC_ID}
            className={cn('standings-tab-panel-in -mx-6', isToxicDarkTheme ? 'bg-[#131008]' : 'pt-3')}
            role="region"
            aria-labelledby={STANDINGS_TAB_TOXIC_ID}
          >
            {toxicStandings.isEmpty ? (
              <div className="mx-5 rounded-[22px] border border-[#B7861F]/35 bg-[#FFFBEF] px-5 py-7 text-center shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#D4A017]/28 bg-white/66 text-[#B7861F]">
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
              <div className="mx-5 rounded-[22px] border border-[#B7861F]/35 bg-[#FFFBEF] px-5 py-7 text-center shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
                <p className="text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#B7861F]">No public victim</p>
                <h3 className="mt-2 text-[18px] font-black tracking-tight text-on-surface">{toxicStandings.heroTitle}</h3>
                <p className="mx-auto mt-2 max-w-[270px] text-[12.5px] font-semibold italic leading-relaxed text-ios-gray">
                  {toxicStandings.heroRoast}
                </p>
              </div>
            ) : (
              <div className="relative overflow-hidden bg-[#131008]">
                {toxicStandings.tickerMessage && (
                  <div
                    className="toxic-ticker relative isolate overflow-hidden border-b border-[#C9A14A]/16 px-5 py-3.5 text-[#E8C45A]"
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
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <p className="min-w-0 truncate text-[9px] font-black uppercase leading-none tracking-[0.18em] text-[#C9A14A]">
                    {isTournamentEnded ? 'Final Hall of Shame' : 'Hall of Shame'}
                  </p>
                  <span className="shrink-0 rounded-full border border-[#C9A14A]/30 bg-white/[0.06] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-[#E8C45A]">
                    {toxicIntensityLabel}
                  </span>
                </div>

                <div
                  key={`toxic-ceremony-${toxicConfettiRunId}`}
                  data-ceremony-run-id={toxicConfettiRunId}
                  data-toxic-hero-layout={hasCoKingHero ? 'duo' : 'solo'}
                  className={cn(
                    'toxic-ceremony-card relative mt-3 overflow-hidden bg-[#131008] text-center',
                    hasCoKingHero ? 'px-6 py-6' : 'px-6 py-7'
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
                    {toxicStandings.heroPlayers.map((player, index) => {
                      // Mode fixed: hero adalah satu tim → tampilkan dua wajah +
                      // nama ringkas (nama panjang gabungan overflow di font seremonial).
                      const heroName = player.isTeamRow
                        ? [player.name.split(' & ')[0], player.partnerName]
                            .filter(Boolean)
                            .map((part) => getShortPlayerName(part as string))
                            .join(' & ')
                        : player.name;
                      return (
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
                          partner={player.isTeamRow ? { avatar: player.partnerAvatar, initials: player.partnerInitials, name: player.partnerName } : null}
                          partnerRingClassName="ring-[#2A2415]"
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
                          {heroName}
                        </p>
                      </div>
                      );
                    })}
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
                  <p className="relative z-20 mt-3.5 text-[7.5px] font-black uppercase leading-none tracking-[0.2em] text-[#C9A14A]/50">
                    {toxicStandings.sortLabel}
                  </p>
                </div>

                {toxicStandings.rows.length >= 3 && (
                  <div className="relative overflow-hidden border-t border-[#C9A14A]/14 px-5 pb-0 pt-4">
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
                      <div className="-mx-5 mt-2.5 overflow-hidden border-y border-[#C9A14A]/16 py-1">
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
              </div>
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
                    {isFixedPartnerMode ? 'Team' : 'Player'}
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

            {showOfficialChampionStrip && officialRows[0] && (() => {
              const champion = officialRows[0];
              const isChampionExpanded = expandedStandingPlayerId === champion.id;
              const isChampionHighlighted = highlightedOfficialStandingPlayerId === champion.id;
              const championRoundHistory = buildOfficialRoundHistory(tournamentRounds, champion.id, Boolean(champion.isTeamRow));
              const championDetailId = getOfficialPlayerDetailId(champion.id);
              return (
                <div className="mx-5 mt-2.5">
                  <button
                    type="button"
                    id={getOfficialPlayerRowId(champion.id)}
                    className={cn(
                      'relative flex w-full items-center gap-3.5 rounded-[22px] bg-[#141414] px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.10)] transition-transform active:scale-[0.992] motion-reduce:transition-none motion-reduce:active:scale-100',
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
                    <div className="relative h-11 w-11 shrink-0">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-primary text-[14px] font-extrabold leading-none text-white">
                        {champion.avatar ? (
                          <img className="h-full w-full object-cover" src={champion.avatar} alt={champion.name} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{champion.initials.slice(0, 1)}</span>
                        )}
                      </div>
                      {champion.isTeamRow && (
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/25 text-[9px] font-extrabold leading-none text-white ring-2 ring-[#141414]">
                          {champion.partnerAvatar ? (
                            <img className="h-full w-full object-cover" src={champion.partnerAvatar} alt={champion.partnerName || ''} referrerPolicy="no-referrer" />
                          ) : (
                            <span>{(champion.partnerInitials || '?').slice(0, 1)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="text-[8px] font-extrabold uppercase leading-none tracking-[0.18em] text-primary">Champion</p>
                        {champion.id === myOfficialRow?.id && (
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
                const isCurrentUserStanding = player.id === myOfficialRow?.id;
                const roundHistory = buildOfficialRoundHistory(tournamentRounds, player.id, Boolean(player.isTeamRow));
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

                      <div className="relative h-10 w-10 shrink-0">
                        <div className={cn(
                          'flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[13px] font-bold leading-none ring-1 ring-black/[0.025]',
                          getOfficialAvatarTone(rankIndex)
                        )}>
                          {player.avatar ? (
                            <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                          ) : (
                            <span>{player.initials.slice(0, 1)}</span>
                          )}
                        </div>
                        {player.isTeamRow && (
                          <div className={cn(
                            'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[9px] font-bold leading-none ring-2 ring-white',
                            getOfficialAvatarTone(rankIndex)
                          )}>
                            {player.partnerAvatar ? (
                              <img className="h-full w-full object-cover" src={player.partnerAvatar} alt={player.partnerName || ''} referrerPolicy="no-referrer" />
                            ) : (
                              <span>{(player.partnerInitials || '?').slice(0, 1)}</span>
                            )}
                          </div>
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
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
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
          <section className="-mx-6 space-y-3 border-t border-[#C9A14A]/14 bg-[#131008] px-6 pb-5 pt-5">
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <h3 className="text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#C9A14A]">Amunisi Grup WA</h3>
                <p className="mt-1 text-[10.5px] font-semibold italic leading-snug text-[#D8C792]/70">
                  Versi story siap share ada di FOM Rewind.
                </p>
              </div>
              <div className="mt-[-1px] flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full border border-[#C9A14A]/28 bg-white/[0.06] px-2 py-1 text-[7px] font-black uppercase leading-none tracking-[0.12em] text-[#E8C45A]">
                  {toxicStandings.awardCards.length} Award
                </span>
                {toxicStandings.awardCards.length > 1 && (
                  <span className="text-[7px] font-black uppercase leading-none tracking-[0.12em] text-[#C9A14A]/62">
                    Swipe →
                  </span>
                )}
              </div>
            </div>
            <div className="relative -mx-6">
              {toxicStandings.awardCards.length > 1 && (
                <>
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-[linear-gradient(90deg,#131008_0%,rgba(19,16,8,0)_100%)]" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-[linear-gradient(270deg,#131008_0%,rgba(19,16,8,0)_100%)]" />
                </>
              )}
              <div className={cn(
                'flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                toxicStandings.awardCards.length === 1 && 'justify-center'
              )}
              onScroll={(event) => {
                if (toxicStandings.awardCards.length <= 1) return;
                const nextIndex = Math.max(0, Math.min(
                  toxicStandings.awardCards.length - 1,
                  Math.round(event.currentTarget.scrollLeft / 208)
                ));
                setActiveAwardCardIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
              }}
              >
                {toxicStandings.awardCards.map((award, index) => (
                  <button
                    type="button"
                    key={getToxicAwardCardKey(award)}
                    onClick={() => scrollToToxicStandingPlayer(award.player.id)}
                    className="tap-target relative isolate min-w-[196px] max-w-[196px] snap-start overflow-hidden rounded-[18px] border border-[#D4A017]/40 bg-[linear-gradient(135deg,#FFFDF6_0%,#FFFAEC_52%,#F7EBC4_100%)] p-3 text-left shadow-[0_6px_16px_rgba(120,78,0,0.07),inset_0_1px_0_rgba(255,255,255,0.72)] transition-transform active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100"
                    aria-label={`Lihat ${award.label} di Full Shame Table, ${index + 1} of ${toxicStandings.awardCards.length}`}
                  >
                    <div className="absolute inset-0 -z-10 opacity-[0.04] bg-[url('/assets/fom-logomark-app.png')] bg-[length:44px_44px] rotate-[-10deg] scale-125" />
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[15px]',
                        award.isGold
                          ? 'border-[#B7861F]/50 bg-[linear-gradient(135deg,#FDE68A,#D4A017)]'
                          : 'border-[#D4A017]/30 bg-white/70'
                      )}>
                        {award.emoji || '🏅'}
                      </span>
                      <p className="min-w-0 flex-1 text-[13px] font-black leading-tight tracking-[-0.02em] text-on-surface">{award.label}</p>
                    </div>
                    <div className="mt-2.5 space-y-1">
                      {[award.player, award.secondaryPlayer].map((awardPlayer) => (
                        awardPlayer ? (
                          <div key={awardPlayer.id} className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#D4A017]/16 bg-white/58 py-1 pl-1 pr-2">
                            {/* Mode fixed: satu entri award = satu tim → tampilkan dua wajah. */}
                            <span className="flex shrink-0 -space-x-1.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1E3BE] text-[7.5px] font-black text-[#8A6A1F]">
                                {awardPlayer.avatar ? (
                                  <img className="h-full w-full object-cover" src={awardPlayer.avatar} alt="" referrerPolicy="no-referrer" />
                                ) : awardPlayer.initials}
                              </span>
                              {awardPlayer.isTeamRow && awardPlayer.partnerId && (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1E3BE] text-[7.5px] font-black text-[#8A6A1F] ring-2 ring-white/80">
                                  {awardPlayer.partnerAvatar ? (
                                    <img className="h-full w-full object-cover" src={awardPlayer.partnerAvatar} alt="" referrerPolicy="no-referrer" />
                                  ) : (awardPlayer.partnerInitials || '?').slice(0, 1)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 truncate text-[10.5px] font-extrabold text-on-surface/84">{awardPlayer.name}</span>
                          </div>
                        ) : null
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-[24px] text-[9.5px] font-semibold italic leading-snug text-[#7A6A4C]">{award.note}</p>
                    <p className="mt-2 border-t border-dashed border-[#B7861F]/30 pt-1.5 text-[7.2px] font-black uppercase leading-none tracking-[0.12em] text-[#B7861F]/75">
                      Lihat evidence →
                    </p>
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
                          ? 'w-5 bg-[#E8C45A]'
                          : 'w-1.5 bg-white/[0.18]'
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="shrink-0 text-[7.5px] font-black uppercase leading-none tracking-[0.12em] text-[#C9A14A]/58">
                  {activeAwardCardIndex + 1}/{toxicStandings.awardCards.length}
                </p>
              </div>
            )}
          </section>
        )}

        {isToxicTabActive && !toxicStandings.isEmpty && (
          <section className="-mx-6 bg-[#131008]">
            <div className="border-t border-[#C9A14A]/14 px-5 pb-2 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-[#C9A14A]">Full Shame Table</p>
                  <p className="mt-1 text-[11px] font-semibold italic leading-snug text-[#D8C792]/68">
                    Semua korban, dari paling cupu ke paling aman.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full border border-[#C9A14A]/28 bg-white/[0.06] px-2 py-1 text-[7.5px] font-black uppercase leading-none tracking-[0.08em] text-[#E8C45A]">
                    {toxicStandings.rows.length} players
                  </span>
                  <span className="text-[7px] font-black uppercase leading-none tracking-[0.12em] text-white/38">
                    Worst first
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3.5 px-5 pb-1">
              <div className="min-w-0 flex-1 text-[8px] font-extrabold uppercase leading-none tracking-[0.14em] text-white/40">
                Player / Roast
              </div>
              <div className="w-[58px] text-right text-[8px] font-extrabold uppercase leading-none tracking-[0.08em] text-white/40">
                Pts / Diff
              </div>
            </div>
            <div className="[&>button:last-of-type]:border-b-transparent">
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
                        'relative flex w-full items-start gap-3.5 border-b border-white/[0.05] px-5 py-3 text-left transition-colors active:bg-white/[0.04]',
                        isExpanded && 'border-b-transparent bg-white/[0.04]',
                        isHighlighted && 'toxic-row-highlight-pulse z-[1] rounded-[18px] ring-2 ring-[#E8C45A]/55 ring-offset-2 ring-offset-[#131008]',
                        isKing && 'bg-[linear-gradient(90deg,rgba(232,196,90,0.15)_0%,rgba(232,196,90,0.05)_48%,rgba(232,196,90,0)_100%)] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#E8C45A]',
                        isOfficialChampion && !isKing && !isExpanded && 'bg-white/[0.03]'
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      aria-label={getToxicStandingControlLabel({ player, rankNumber, isExpanded })}
                      onClick={() => setExpandedToxicStandingPlayerId(isExpanded ? null : player.id)}
                    >
                      <div className="flex w-[28px] shrink-0 flex-col items-start">
                        {isKing && (
                          <span className="mb-0.5 text-[11px] leading-none text-[#E8C45A]" aria-hidden="true">👑</span>
                        )}
                        <span className={cn(
                          'text-[19px] font-extrabold leading-none tabular-nums',
                          isKing ? 'text-[#E8C45A]' : i <= 2 ? 'text-white' : 'text-white/32'
                        )}>
                          {String(rankNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <ToxicAvatar
                        player={player}
                        partner={player.isTeamRow ? { avatar: player.partnerAvatar, initials: player.partnerInitials, name: player.partnerName } : null}
                        partnerRingClassName="ring-[#131008]"
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
                          <p className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight text-white">
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
                              ? 'border-primary/40 bg-primary/[0.16] text-[#FFAF87]'
                              : 'border-white/[0.09] bg-white/[0.06] text-white/55'
                          )}>
                            Official #{player.normalRank}
                          </span>
                          <RankMovementBadge movement={toxicMovement} mode="toxic" />
                          <span
                            className={cn(
                              'rounded-full border px-2 py-1 text-[8px] font-black uppercase leading-none tracking-[0.06em]',
                              primaryEvidenceChip.tone === 'danger'
                                ? 'border-red-400/25 bg-red-500/[0.12] text-[#F49E9E]'
                                : primaryEvidenceChip.tone === 'good'
                                  ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-[#8ED6A5]'
                                  : isKing
                                    ? 'border-[#C9A14A]/30 bg-[#C9A14A]/[0.12] text-[#E8C45A]'
                                    : isOfficialChampion
                                      ? 'border-primary/30 bg-primary/[0.10] text-[#FFAF87]'
                                      : 'border-white/[0.08] bg-white/[0.06] text-white/55'
                            )}
                          >
                            {primaryEvidenceChip.label}
                          </span>
                        </div>
                      </div>
                      <div className="w-[58px] shrink-0 text-right">
                        <p className="text-[20px] font-extrabold leading-none text-white tabular-nums">
                          {player.totalPoints}
                        </p>
                        <p className={cn('mt-1 text-[12px] font-bold leading-none tabular-nums', player.pointsDiff > 0 ? 'text-[#7BCB92]' : player.pointsDiff < 0 ? 'text-[#F49E9E]' : 'text-white/45')}>
                          {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                        </p>
                      </div>
                      <ChevronDown
                        size={13}
                        strokeWidth={2.4}
                        className={cn(
                          'absolute bottom-3 right-2 text-white/28 transition-transform motion-reduce:transition-none',
                          isExpanded && 'rotate-180 text-[#E8C45A]'
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
                        className="standings-detail-reveal border-b border-white/[0.05] bg-white/[0.03] px-5 pb-3"
                      >
                        <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3">
                          <div className="grid grid-cols-4 gap-1.5">
                            <OfficialDetailStat label="W" value={player.w} tone={player.w > player.l ? 'win' : 'default'} dark />
                            <OfficialDetailStat label="L" value={player.l} tone={player.l > player.w ? 'loss' : 'default'} dark />
                            <OfficialDetailStat label="D" value={player.d} dark />
                            <OfficialDetailStat label="M" value={player.matches} dark />
                          </div>
                          <p className="mt-3 text-[11.5px] font-semibold italic leading-snug text-[#D8C792]">
                            “{player.roast}”
                          </p>
                          {whyReasons.length > 0 && (
                            <div className="mt-3 rounded-[15px] border border-[#C9A14A]/20 bg-[#C9A14A]/[0.07] px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-[#E8C45A]">
                                  Why am I here?
                                </p>
                                <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[7px] font-black uppercase leading-none tracking-[0.1em] text-[#E8C45A]/60">
                                  Data-driven
                                </span>
                              </div>
                              <div className="mt-2 space-y-1.5">
                                {whyReasons.map((reason) => (
                                  <div key={reason} className="flex gap-2 text-[10.5px] font-semibold leading-snug text-[#D8C792]">
                                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8C45A]" aria-hidden="true" />
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
                                    ? 'border-red-400/25 bg-red-500/[0.10] text-[#F49E9E]'
                                    : card.tone === 'good'
                                      ? 'border-emerald-400/25 bg-emerald-500/[0.10] text-[#8ED6A5]'
                                      : card.tone === 'gold'
                                        ? 'border-[#C9A14A]/26 bg-[#C9A14A]/[0.10] text-[#E8C45A]'
                                        : 'border-white/[0.07] bg-white/[0.04] text-white/85'
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
                            <div className="mt-3 rounded-[15px] border border-white/[0.06] bg-white/[0.025] p-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-white/45">
                                  Evidence timeline
                                </p>
                                <p className="text-[8px] font-bold leading-none text-white/35">
                                  {evidenceTimeline.length} rounds
                                </p>
                              </div>
                              <div className="mt-2 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {evidenceTimeline.map((item) => (
                                  <div
                                    key={`${player.id}-toxic-timeline-${item.roundId}-${item.scoreLabel}`}
                                    className={cn(
                                      'min-w-[118px] max-w-[138px] snap-start rounded-[13px] border bg-white/[0.04] px-2.5 py-2',
                                      item.tone === 'danger'
                                        ? 'border-red-400/25 bg-red-500/[0.10]'
                                        : item.tone === 'good'
                                          ? 'border-emerald-400/25 bg-emerald-500/[0.10]'
                                          : item.tone === 'gold'
                                            ? 'border-[#C9A14A]/26 bg-[#C9A14A]/[0.10]'
                                            : 'border-white/[0.06]'
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="text-[7.5px] font-black uppercase leading-none tracking-[0.1em] text-white/45 tabular-nums">
                                        R{item.roundId}
                                      </span>
                                      <span className={cn('inline-flex min-w-[24px] justify-center rounded-full px-1.5 py-1 text-[7px] font-black uppercase leading-none', getRoundResultChipClass(item.resultLabel, true))}>
                                        {item.resultLabel}
                                      </span>
                                    </div>
                                    <p className={cn(
                                      'mt-1.5 truncate text-[12px] font-black leading-tight tracking-[-0.01em]',
                                      item.tone === 'danger'
                                        ? 'text-[#F49E9E]'
                                        : item.tone === 'good'
                                          ? 'text-[#8ED6A5]'
                                          : item.tone === 'gold'
                                            ? 'text-[#E8C45A]'
                                            : 'text-white/90'
                                    )}>
                                      {item.title}
                                    </p>
                                    <p className="mt-1 truncate text-[8.5px] font-semibold leading-tight text-white/48">
                                      {item.detail}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {player.award && (
                            <div className="mt-3 rounded-[14px] border border-[#C9A14A]/20 bg-[#C9A14A]/[0.07] px-3 py-2.5">
                              <p className="text-[7.6px] font-black uppercase leading-none tracking-[0.16em] text-[#E8C45A]">Award Reason</p>
                              <p className="mt-1.5 text-[10.5px] font-semibold italic leading-snug text-[#D8C792]">
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
                                    ? 'border-red-400/25 bg-red-500/[0.12] text-[#F49E9E]'
                                    : chip.tone === 'good'
                                      ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-[#8ED6A5]'
                                      : 'border-white/[0.08] bg-white/[0.06] text-white/55'
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
          toxicStandings.isEmpty ? (
            <div className="mx-auto mt-3 flex w-fit max-w-full items-center justify-center gap-1.5 rounded-full border border-[#D4A017]/18 bg-[#FFFBEF] px-3 py-2 text-center text-[#8A6A1F]">
              <Flame size={12} strokeWidth={2.4} className="shrink-0" />
              <p className="text-[9.5px] font-bold leading-snug">
                All roasts are about this match only. Jangan baper, ya.
              </p>
            </div>
          ) : (
            <div
              className="-mx-6 bg-[#131008] px-6 pt-1"
              style={{ paddingBottom: `calc(var(--app-safe-bottom, 0px) + ${showSharedTrialCta ? '196px' : '104px'})` }}
            >
              <div className="mx-auto flex w-fit max-w-full items-center justify-center gap-1.5 px-3 py-2 text-center text-[#C9A14A]/72">
                <Flame size={11} strokeWidth={2.4} className="shrink-0" />
                <p className="text-[9.5px] font-bold leading-snug">
                  All roasts are about this match only. Jangan baper, ya.
                </p>
              </div>
            </div>
          )
        )}

        {!isToxicDarkTheme && <div className={cn('pb-8', isToxicTabActive ? 'pt-2' : 'pt-6')} />}
      </main>

      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-0 z-[93] h-[96px]',
          isToxicDarkTheme
            ? 'bg-[linear-gradient(180deg,rgba(19,16,8,0)_0%,rgba(19,16,8,0.58)_58%,#131008_100%)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.58)_58%,#FFFFFF_100%)]'
        )}
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 z-[94] px-4"
        style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + 14px)' }}
      >
        <div className="mx-auto grid w-[min(100%,258px)] grid-cols-2 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/88 px-2 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl">
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

      {isRewindOpen && (
        <RewindFlow
          tournament={tournament}
          sortedPlayers={rankedStandings}
          toxicStandings={toxicStandings}
          shareId={rewindShareId}
          currentUserUid={currentUserUid || undefined}
          currentUserPlayerId={myMatchStanding?.id}
          currentUserStanding={myMatchStanding || undefined}
          isReadOnly={Boolean(isSharedViewer)}
          entrySource={rewindEntrySource}
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

  // Mode toxic tampil di atas panggung gelap (#131008), jadi butuh palet gelap.
  const isToxic = mode === 'toxic';
  const badgeClass = movement.kind === 'up'
    ? isToxic
      ? 'border-[#C9A14A]/30 bg-[#C9A14A]/[0.12] text-[#E8C45A]'
      : 'border-emerald-200/75 bg-emerald-50 text-[#1E7A38]'
    : movement.kind === 'down'
      ? isToxic
        ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-[#8ED6A5]'
        : 'border-red-200/75 bg-red-50 text-error'
      : movement.kind === 'new'
        ? isToxic
          ? 'border-white/[0.10] bg-white/[0.07] text-white/60'
          : 'border-primary/14 bg-primary/[0.07] text-primary'
        : isToxic
          ? 'border-white/[0.10] bg-white/[0.06] text-white/55'
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
  partner,
  partnerRingClassName = 'ring-white',
}: {
  player: ToxicAvatarPlayer;
  className?: string;
  initialsClassName?: string;
  // Mode fix partner: kedua wajah tampil sejajar dan sama besar (bukan badge
  // kecil di pojok) supaya tim terbaca sebagai dua pemain setara.
  partner?: { avatar?: string; initials?: string; name?: string } | null;
  partnerRingClassName?: string;
}) => {
  const renderFace = (
    face: { avatar?: string; initials?: string; name?: string },
    extraClassName?: string
  ) => (
    <div className={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ios-gray/10 bg-ios-gray/10 font-bold leading-none',
      className,
      extraClassName
    )}>
      {face.avatar ? (
        <img className="h-full w-full object-cover" src={face.avatar} alt={face.name || ''} referrerPolicy="no-referrer" />
      ) : (
        <span className={initialsClassName}>{(face.initials || '?').slice(0, 1)}</span>
      )}
    </div>
  );
  if (!partner) return renderFace(player);
  return (
    <div className="flex shrink-0 items-center -space-x-2">
      {renderFace(player)}
      {renderFace(partner, cn('ring-2', partnerRingClassName))}
    </div>
  );
};

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

  // Mahkota parodi seremoni cupu: raja dapat mahkota beneran,
  // runner-up dapat topi miring, peringkat 3 dapat sandal jepit.
  const podiumCopy = {
    1: {
      badge: 'EMAS AIR MATA',
      quote: 'Podium tertinggi, pencapaian terendah.',
      crown: '👑',
      crownClass: 'right-[-9px] top-[-12px] rotate-[22deg] text-[17px]',
      avatarClass: 'h-10 w-10 border-[2px] border-[#E8C45A] bg-[#2A2415] text-[#E8C45A]',
      nameClass: 'text-[12px] font-extrabold text-white',
      labelClass: 'text-[#E8C45A]',
      barClass: 'h-[58px] bg-[linear-gradient(180deg,#E8C45A,#B7861F)] text-[#141414] text-[23px]',
    },
    2: {
      badge: 'PERAK NYARIS RAJA',
      quote: 'Selangkah lagi takhta. Untungnya gagal.',
      crown: '🧢',
      crownClass: 'left-[-6px] top-[-7px] rotate-[-24deg] text-[13px] -scale-x-100',
      avatarClass: 'h-9 w-9 border-white/30 bg-[#2C2C2E] text-white',
      nameClass: 'text-[11.5px] font-bold text-white',
      labelClass: 'text-white/55',
      barClass: 'h-[42px] bg-[#2C2C2E] text-white/65 text-[20px]',
    },
    3: {
      badge: 'PERUNGGU PENGHIBUR',
      quote: 'Salah arah, tapi tetap naik podium.',
      crown: '🩴',
      crownClass: 'right-[-6px] top-[-8px] rotate-[30deg] text-[13px]',
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
        <ToxicAvatar
          player={player}
          partner={player.isTeamRow ? { avatar: player.partnerAvatar, initials: player.partnerInitials, name: player.partnerName } : null}
          partnerRingClassName="ring-[#131008]"
          className={cn('text-[12px]', podiumCopy.avatarClass)}
        />
        <span className={cn('absolute leading-none', podiumCopy.crownClass)} aria-hidden="true">{podiumCopy.crown}</span>
      </div>
      <p className={cn('mt-1.5 max-w-full truncate leading-tight', podiumCopy.nameClass)}>
        {getShortPlayerName(player.name)}
      </p>
      <p className={cn('mt-0.5 line-clamp-2 text-[7px] font-extrabold uppercase leading-tight tracking-[0.12em]', podiumCopy.labelClass)}>
        {player.award?.label || podiumCopy.badge}
      </p>
      <p className="mt-1 text-[8px] font-bold leading-none tabular-nums text-[#E8C45A]/72">
        {player.totalPoints} PTS · {formatToxicPodiumDiff(player.pointsDiff)}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[24px] text-[9px] font-semibold italic leading-[1.25] text-white/48">
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

const getToxicAwardChipClass = (isGold?: boolean) => (
  isGold
    ? 'border-[#d4a017]/55 bg-[linear-gradient(135deg,#fbe7a2,#e3b341)] text-[#6b4e00]'
    : 'border-white/[0.10] bg-white/[0.07] text-white/62'
);

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

// Satu kalimat pendek saja — stat (pts/diff) tampil terpisah di kolom podium,
// supaya quote tidak pernah terpotong "…".
const getToxicPodiumQuote = (player: ToxicStandingRow, place: 1 | 2 | 3) => {
  switch (player.award?.id) {
    case 'king-of-cupu':
      return 'Takhta bawah valid.';
    case 'runner-up-cupu':
      return 'Nyalip takhta dari pinggir.';
    case 'sultan-of-bye':
      return 'Bangku cadangan ikut jadi saksi.';
    case 'tukang-nyumbang-poin':
      return 'Poin lawan ikut kenyang.';
    case 'spesialis-kalah-tipis':
      return 'Drama tipis, ending tetap sakit.';
    case 'bulldozer-korban':
      return 'Pernah kena tabrak scoreboard.';
    case 'sweaty-tryhard':
      return 'Juara normal, cameo di Shame.';
    case 'mr-konsisten':
      return 'Stabil, tapi tetap kena panggung.';
    case 'duo-petaka':
      return 'Chemistry perlu evaluasi publik.';
    default:
      break;
  }

  if (player.bucket === 'last-place') return "Cupu D'Or mendarat.";
  if (player.bucket === 'near-bottom') return 'Masih bau zona cupu.';
  if (player.bucket === 'big-minus') return 'Kalkulator sudah menyerah.';
  if (player.bucket === 'bye-collector') return 'Sitting rapi, reputasi rawan.';
  if (player.bucket === 'losing-streak') return 'Streak-nya salah arah.';
  if (player.bucket === 'heartbreaker') return 'Kalah tipis, lukanya tetap tebal.';
  if (player.bucket === 'champion') return 'Terlalu serius untuk fun match.';
  if (place === 1) return 'Podium bawah resmi.';
  if (place === 2) return 'Hampir jadi headline.';
  return 'Cukup kacau untuk podium.';
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
  dark = false,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'win' | 'loss';
  dark?: boolean;
}) => (
  <div className={cn('rounded-[12px] px-2.5 py-2 text-center', dark ? 'bg-white/[0.05]' : 'bg-ios-gray/[0.04]')}>
    <p className={cn('text-[8px] font-black uppercase leading-none tracking-[0.14em]', dark ? 'text-white/45' : 'text-ios-gray/58')}>{label}</p>
    <p className={cn(
      'mt-1.5 text-[17px] font-extrabold leading-none tabular-nums',
      tone === 'win'
        ? (dark ? 'text-[#8ED6A5]' : 'text-[#1E8E3E]')
        : tone === 'loss'
          ? (dark ? 'text-[#F49E9E]' : 'text-error')
          : (dark ? 'text-white' : 'text-on-surface')
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

const buildOfficialRoundHistory = (rounds: Round[], playerId: string, omitTeammate = false): OfficialRoundHistoryItem[] => {
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
    // Baris tim (fix partner): partner selalu sama & sudah tampil di nama tim,
    // jadi cukup tampilkan lawan agar tidak redundan.
    const teammateNames = omitTeammate
      ? ''
      : formatPlayerNames(playerTeam.players.filter((player) => player.id !== playerId));
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

const getRoundResultChipClass = (resultLabel: OfficialRoundHistoryItem['resultLabel'], dark = false) => {
  if (dark) {
    if (resultLabel === 'W') return 'bg-emerald-500/[0.16] text-[#8ED6A5]';
    if (resultLabel === 'L') return 'bg-red-500/[0.16] text-[#F49E9E]';
    if (resultLabel === 'D') return 'bg-white/[0.08] text-white/60';
    if (resultLabel === 'BYE') return 'bg-[#C9A14A]/[0.16] text-[#E8C45A]';
    return 'bg-blue-500/[0.18] text-[#9DBEFF]';
  }
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

