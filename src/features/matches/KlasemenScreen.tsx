import { useEffect, useMemo, useRef, useState } from 'react';
import { toBlob as htmlToImageBlob } from 'html-to-image';
import { ChevronRight, Instagram, RefreshCw, Share2, X, Zap } from 'lucide-react';
import { InstallAppButton } from '../../components/app/InstallAppButton';
import { cn } from '../../lib/utils';
import { type Match, type Player, type Tournament, type TournamentHistory, type TournamentStatsSyncState } from '../../types';
import { getMatchThemeColor } from '../tournaments/matchTheme';
import { resolveMatchBackground } from './matchBackgrounds';
import { formatDurationFromMs, getTournamentElapsedMs } from './matchTimeUtils';

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
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const storyImageUrlRef = useRef<string | null>(null);
  const storyExportRef = useRef<HTMLDivElement | null>(null);
  const currentUserUid = String(currentUser?.uid || '').trim();
  const currentUserPhotoURL = typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '';

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (storyImageUrlRef.current) URL.revokeObjectURL(storyImageUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isShareMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (shareMenuRef.current?.contains(event.target as Node)) return;
      setIsShareMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isShareMenuOpen]);

  useEffect(() => {
    if (!isStoryPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isStoryPreviewOpen]);

  const fomPlayUrl = useMemo(() => {
    const configuredBase = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
    const runtimeBase = `${window.location.protocol}//${window.location.host}`;
    return (configuredBase || runtimeBase).replace(/\/+$/, '');
  }, []);
  const tournamentPlayers = tournament.players || [];
  const tournamentRounds = tournament.rounds || [];
  const configuredCourts = 'courts' in tournament ? tournament.courts : undefined;
  const detectedCourts = Math.max(1, ...tournamentRounds.flatMap((round) => round.matches.map((match) => match.court || 1)));
  const courtsCount = configuredCourts || detectedCourts;
  const completedRounds = tournamentRounds.filter((round) => round.matches.every((match) => match.status === 'completed')).length;
  const totalRounds = Math.max(tournament.numRounds || 0, tournamentRounds.length);
  const totalMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.filter((match) => match.status === 'completed').length, 0);
  void completedMatches;

  const hasMatchScoreProgress = (match: Match) => {
    const scoreA = match.teamA.score || 0;
    const scoreB = match.teamB.score || 0;
    const hasPointScore = (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
    return match.status === 'completed' || scoreA > 0 || scoreB > 0 || hasPointScore;
  };

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
  const totalElapsed = formatDurationFromMs(
    getTournamentElapsedMs(
      tournamentRounds,
      nowMs,
      'endedAt' in tournament ? tournament.endedAt : undefined
    )
  );

  const standingsThemeColor = getMatchThemeColor(tournament.format, tournament.themeColorId);
  const infoTheme = standingsThemeColor;
  const klasemenHeroPhoto = useMemo(
    () => resolveMatchBackground(tournament.format, tournament.backgroundId),
    [tournament.backgroundId, tournament.format]
  );
  const klasemenPageBgTheme = {
    base: standingsThemeColor.pageBase,
    photoBlend: standingsThemeColor.photoBlend
  };

  const sortedPlayers = useMemo(() => {
    const playerRegistry = new Map<string, Player>();
    const registerPlayer = (player: Player | undefined) => {
      if (!player) return;
      const isCurrentUserPlayer = Boolean(currentUserUid) && player.id === currentUserUid;
      const normalizedPlayer = isCurrentUserPlayer
        ? { ...player, avatar: currentUserPhotoURL || player.avatar || '' }
        : player;
      const existing = playerRegistry.get(player.id);
      if (!existing) {
        playerRegistry.set(player.id, normalizedPlayer);
        return;
      }
      const merged = {
        ...existing,
        ...normalizedPlayer,
        avatar: normalizedPlayer.avatar || existing.avatar,
        initials: normalizedPlayer.initials || existing.initials
      };
      playerRegistry.set(player.id, merged);
    };

    tournamentPlayers.forEach(registerPlayer);
    tournamentRounds.forEach((round) => {
      round.matches.forEach((match) => {
        match.teamA.players.forEach(registerPlayer);
        match.teamB.players.forEach(registerPlayer);
      });
      (round.playersBye || []).forEach(registerPlayer);
    });

    const playerStatsMap: Record<string, {
      id: string;
      name: string;
      avatar?: string;
      initials: string;
      matches: number;
      w: number;
      l: number;
      d: number;
      pointsDiff: number;
      totalPoints: number;
    }> = {};

    playerRegistry.forEach((player) => {
      playerStatsMap[player.id] = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        initials: player.initials || player.name.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase(),
        matches: 0,
        w: 0,
        l: 0,
        d: 0,
        pointsDiff: 0,
        totalPoints: 0
      };
    });

    tournamentRounds.forEach((round) => {
      round.matches.forEach((match) => {
        const scoreA = match.teamA.score || 0;
        const scoreB = match.teamB.score || 0;
        const hasLiveScore = scoreA > 0 || scoreB > 0;
        const shouldCountStandingScore = match.status === 'completed' || hasLiveScore;
        if (!shouldCountStandingScore && match.status !== 'completed') return;

        match.teamA.players.forEach((player) => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreA;
            stats.pointsDiff += (scoreA - scoreB);
          }
          if (match.status === 'completed') {
            if (scoreA > scoreB) stats.w += 1;
            else if (scoreA < scoreB) stats.l += 1;
            else stats.d += 1;
          }
        });

        match.teamB.players.forEach((player) => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreB;
            stats.pointsDiff += (scoreB - scoreA);
          }
          if (match.status === 'completed') {
            if (scoreB > scoreA) stats.w += 1;
            else if (scoreB < scoreA) stats.l += 1;
            else stats.d += 1;
          }
        });
      });
    });

    Object.values(playerStatsMap).forEach((stats) => {
      stats.matches = stats.w + stats.l + stats.d;
    });

    return Object.values(playerStatsMap).sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [currentUserPhotoURL, currentUserUid, tournamentPlayers, tournamentRounds]);

  const storyShowAvatars = true;
  const storyPlayerLimit = sortedPlayers.length > 10 ? 10 : sortedPlayers.length;
  const storyPlayers = sortedPlayers.slice(0, storyPlayerLimit);
  const storyCompactRows = storyPlayers.length >= 9;
  const storyDenseRows = storyCompactRows || sortedPlayers.length > 12;
  const storyHiddenPlayerCount = Math.max(0, sortedPlayers.length - storyPlayers.length);
  void storyHiddenPlayerCount;
  const storyUsesCompactRankingCard = storyPlayers.length > 0 && storyPlayers.length < 8;
  const storyExportShellClass = cn(
    'relative z-10 flex h-full flex-col px-4 text-white',
    storyCompactRows ? 'pb-2.5 pt-3' : 'pb-3 pt-4'
  );
  const storyExportLogoHeaderClass = cn(
    'flex shrink-0 items-center justify-center',
    storyCompactRows ? 'mb-2 h-7' : 'mb-4 h-8'
  );
  const storyExportLogoClass = cn('w-auto object-contain', storyCompactRows ? 'h-7' : 'h-8');
  const storySummaryCardClass = cn(
    'mt-0 isolate shrink-0 overflow-hidden rounded-[16px] border border-white/32 bg-white/12 shadow-[0_10px_20px_rgba(15,23,42,0.07)] backdrop-blur-xl',
    storyCompactRows ? 'px-3 py-1.5' : 'px-3 py-2'
  );
  const storySummaryCardStyle = { clipPath: 'inset(0 round 16px)' } as const;
  const storySummaryStatClass = cn(
    'rounded-[10px] border border-white/18 bg-white/18 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    storyCompactRows ? 'py-0.5' : 'py-1'
  );
  const storyTitleClass = cn('truncate font-semibold leading-[1.04] text-white', storyCompactRows ? 'text-[14.5px]' : 'text-[15.5px]');
  const storySubtitleClass = cn('mt-0.5 truncate font-medium leading-[1.15] text-white/76', storyCompactRows ? 'text-[8px]' : 'text-[8.5px]');
  const storyTimerClass = cn('shrink-0 font-semibold leading-none tabular-nums text-white/90', storyCompactRows ? 'text-[10.5px]' : 'text-[11px]');
  const storyStatLabelClass = 'text-[7px] font-semibold uppercase leading-none text-white/56';
  const storyStatValueClass = cn('truncate text-[9.5px] font-semibold leading-none text-white', storyCompactRows ? 'mt-0.5' : 'mt-1');
  const storyRankingCardClass = cn(
    'mt-1.5 flex min-h-0 flex-col overflow-hidden rounded-[17px] border border-white/45 bg-white/78 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm',
    storyUsesCompactRankingCard ? 'shrink-0' : 'flex-1'
  );
  const storyRankingHeaderClass = 'grid shrink-0 grid-cols-[minmax(0,1fr)_42px_42px_42px] gap-1.5 px-2.5 pb-1.5 text-[7.5px] font-semibold uppercase leading-none text-on-surface/54';
  const storyBaseRowClass = 'grid grid-cols-[minmax(0,1fr)_42px_42px_42px] items-center gap-1.5 rounded-[12px] border border-white/45 bg-white/96';
  const storyPlayerHeaderGridClass = cn(
    'grid items-center gap-2',
    storyShowAvatars ? 'grid-cols-[28px_32px_minmax(0,1fr)]' : 'grid-cols-[28px_minmax(0,1fr)]'
  );
  const storyPlayerHeaderNameClass = cn(storyShowAvatars ? 'col-start-3' : 'col-start-2');
  const storyWldmHeaderClass = 'grid grid-cols-4 items-center text-center';
  const storyPlayerNameClass = cn('truncate leading-tight text-on-surface', storyDenseRows ? 'text-[10px] font-semibold' : 'text-[10.5px] font-semibold');
  const storyPlayerMetaValueClass = storyDenseRows
    ? 'text-[10px] font-medium leading-none tabular-nums text-ios-gray/55'
    : 'text-[10.5px] font-medium leading-none tabular-nums text-ios-gray/55';
  const storyWldmValueClass = cn(
    'grid grid-cols-4 items-center text-center tabular-nums',
    storyPlayerMetaValueClass
  );
  const storyDiffClass = 'text-[10.5px] font-semibold';
  const storyPtsClass = 'text-[10.5px] font-semibold';
  const storyFooterSpacerClass = storyUsesCompactRankingCard ? 'flex-1' : '';
  const storyFooterClass = cn('flex shrink-0 justify-center text-white/78', storyCompactRows ? 'mt-1 pt-1' : 'mt-1.5 pt-2');
  const storyFooterTextClass = cn('font-medium leading-none', storyCompactRows ? 'text-[8px]' : 'text-[8.5px]');
  const storyFooterRowClass = 'inline-flex items-center justify-center gap-2.5';
  const storyRankingRowsClass = cn(
    'min-h-0 flex flex-col overflow-hidden',
    storyUsesCompactRankingCard ? 'gap-1' : storyCompactRows ? 'flex-1 justify-between gap-0.5' : storyDenseRows ? 'flex-1 justify-between gap-px' : 'flex-1 justify-between gap-1'
  );
  const storyRowClass = cn(
    storyBaseRowClass,
    storyPlayers.length === 9
      ? 'min-h-[38px] px-2 py-0.5'
      : storyCompactRows
        ? 'min-h-[34px] px-2 py-0.5'
        : storyShowAvatars
          ? 'min-h-[48px] px-2.5 py-1.5'
          : storyDenseRows
            ? 'min-h-[39px] px-2.5 py-1.5'
            : 'min-h-[43px] px-2.5 py-1.5'
  );
  const storyRankBadgeClass = cn(
    'flex shrink-0 items-center justify-center rounded-full font-black leading-none tabular-nums',
    storyCompactRows ? 'h-5 w-5 text-[8px]' : storyDenseRows ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'
  );
  const storyAvatarClass = cn(
    'shrink-0 overflow-hidden rounded-full border border-ios-gray/10 bg-ios-gray/10 flex items-center justify-center',
    storyCompactRows ? 'h-6 w-6' : 'h-8 w-8'
  );
  const getStoryRankBadgeClass = (index: number) => {
    if (index === 0) return 'bg-[linear-gradient(135deg,#fff4c7_0%,#f7d66b_55%,#e9b93e_100%)] text-[#8b5e00] border border-[#f4cf67]/90 shadow-[0_6px_16px_rgba(233,185,62,0.35)]';
    if (index === 1) return 'bg-[linear-gradient(135deg,#f9fbff_0%,#dde6f5_52%,#c7d0e0_100%)] text-[#5b6472] border border-[#d6dde8]/90 shadow-[0_6px_16px_rgba(148,163,184,0.28)]';
    if (index === 2) return 'bg-[linear-gradient(135deg,#ffe6d8_0%,#e8b08e_52%,#c8835a_100%)] text-[#8a4d2e] border border-[#dfaa8b]/90 shadow-[0_6px_16px_rgba(200,131,90,0.28)]';
    return 'bg-ios-gray/10 text-ios-gray border border-transparent';
  };
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
  const buildStorySavedTitle = () => (
    `${(tournament.name || 'FOM Play Klasemen').trim()} ${storyTitleDate}`
  );
  const buildStoryFileName = (title: string) => {
    const fileSafeTitle = title
      .toLowerCase()
      .replace(/\//g, '-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'fom-play-klasemen';
    return `${fileSafeTitle}.png`;
  };
  const syncStoryVariantBeforeExport = async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  const renderStoryImageBlob = async () => {
    const sourceNode = storyExportRef.current;
    if (!sourceNode) throw new Error('Story preview is not ready yet.');
    await document.fonts?.ready;

    const blob = await htmlToImageBlob(sourceNode, {
      width: 360,
      height: 640,
      canvasWidth: 1080,
      canvasHeight: 1920,
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: 'transparent'
    });
    if (!blob) throw new Error('Unable to export story image.');
    return blob;
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
  const showStoryBlobInPreview = (blob: Blob) => {
    if (storyImageUrlRef.current) URL.revokeObjectURL(storyImageUrlRef.current);
    const url = URL.createObjectURL(blob);
    storyImageUrlRef.current = url;
    setStoryImageUrl(url);
  };
  const handleStoryAction = async () => {
    if (isStoryImageBusy) return;
    setStoryImageError('');
    setIsStoryImageBusy(true);
    try {
      await syncStoryVariantBeforeExport();
      const storySavedTitle = buildStorySavedTitle();
      const storyFileName = buildStoryFileName(storySavedTitle);
      const blob = await renderStoryImageBlob();
      showStoryBlobInPreview(blob);
      setIsStoryPreviewOpen(true);
      const file = new File([blob], storyFileName, { type: 'image/png' });
      const sharePayload = {
        files: [file],
        title: storySavedTitle,
        text: 'Klasemen dari FOM Play'
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
        await navigator.share(sharePayload);
        onShareFeedback('success', 'Gambar klasemen berhasil dibagikan.');
      } else {
        downloadStoryBlob(blob, storyFileName);
        onShareFeedback('ready', 'Gambar klasemen berhasil dibuat dan diunduh.');
      }
    } catch (err) {
      console.error('Story image export failed:', err);
      setStoryImageError('Gagal membuat gambar Story. Preview tetap bisa discreenshot.');
      setIsStoryPreviewOpen(true);
      onShareFeedback('failed', 'Gagal membuat gambar Story. Coba lagi sebentar.');
    } finally {
      setIsStoryImageBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen pb-12 overflow-hidden bg-transparent z-0">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn('absolute inset-0', klasemenPageBgTheme.base)} />
        <div className="absolute inset-x-0 top-0 h-screen min-h-screen max-h-none overflow-hidden">
          {klasemenHeroPhoto && (
            <img
              src={klasemenHeroPhoto}
              alt="Standings background"
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12]"
            />
          )}
          <div className={cn('absolute inset-0', klasemenPageBgTheme.photoBlend)} />
        </div>
      </div>

      <header
        className="relative z-20 bg-transparent border-b border-transparent"
        style={{ paddingTop: 'calc(var(--app-safe-top, 0px) + 16px)' }}
      >
        <div className="max-w-lg mx-auto h-11 px-5 relative flex items-center justify-between">
          <div className="shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full", infoTheme.accentSolid, infoTheme.accentSolidShadow)}>
              {!isTournamentEnded && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/55 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
              )}
              <span className={cn(!isTournamentEnded && "animate-pulse")}>
                {isTournamentEnded ? 'Ended' : 'Live'}
              </span>
            </span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
            <img src="/fom-long-logotype-white.png" alt="Friends of Motion" className="h-8 w-auto object-contain" />
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <InstallAppButton compact variant="minimum" className="text-white" />
            {isSharedViewer ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">View Only</span>
            ) : (
              <div ref={shareMenuRef} className="relative">
                <button
                  onClick={() => setIsShareMenuOpen((open) => !open)}
                  className="tap-target h-8 px-0 inline-flex items-center gap-1.5 border-0 bg-transparent text-white"
                  aria-expanded={isShareMenuOpen}
                  aria-haspopup="menu"
                >
                  <Share2 size={16} />
                  <span className="text-[12px] font-semibold">Share</span>
                </button>
                {isShareMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+10px)] z-50 w-44 overflow-hidden rounded-2xl border border-white/28 bg-white/92 p-1.5 text-on-surface shadow-[0_16px_40px_rgba(15,23,42,0.22)] backdrop-blur-xl"
                    role="menu"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsShareMenuOpen(false);
                        onShare(tournament);
                      }}
                      className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-on-surface"
                      role="menuitem"
                    >
                      <Share2 size={15} className="text-ios-gray" />
                      Share Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsShareMenuOpen(false);
                        void handleStoryAction();
                      }}
                      disabled={isStoryImageBusy}
                      className="tap-target flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-on-surface disabled:opacity-60"
                      role="menuitem"
                    >
                      {isStoryImageBusy ? <RefreshCw size={15} className="animate-spin text-primary" /> : <Instagram size={15} className="text-primary" />}
                      {isStoryImageBusy ? 'Preparing' : 'Story Image'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className="relative z-10 px-5 space-y-6 max-w-lg mx-auto"
        style={{
          paddingTop: '16px',
          paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 16px)'
        }}
      >
        {isSharedViewer && (
          <p className="px-1 text-[10px] font-medium leading-tight text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            Standings viewer mode is active. This page is read-only.
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

        <section className={cn('relative overflow-hidden rounded-2xl p-4 border border-white/40 bg-white/8 backdrop-blur-md', infoTheme.shadow)}>
          <div className="relative flex items-baseline justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-white truncate">{tournament.name || '-'}</h2>
              <p className="mt-1 text-[11px] text-white/85 truncate">{locationDateLabel}</p>
            </div>
            <span className="shrink-0 text-[16px] leading-none font-display font-bold tabular-nums text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]">
              {totalElapsed}
            </span>
          </div>

          <div className="relative grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Mode</p>
              <p className="text-[12px] font-semibold text-white truncate">{tournament.format}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Player</p>
              <p className="text-[12px] font-semibold text-white">{sortedPlayers.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Court</p>
              <p className="text-[12px] font-semibold text-white">{courtsCount}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Round</p>
              <p className="text-[12px] font-semibold text-white">{displayedRoundCount}/{totalRounds || 0}</p>
            </div>
          </div>

          <div className="relative mt-2.5 pt-2 flex items-center justify-between text-[10px] font-semibold text-white/78 tabular-nums">
            <span>Match {progressedMatches}/{totalMatches}</span>
            <span>Progress {completionPercent}%</span>
          </div>
          <div className="relative mt-1.5">
            <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white/90 transition-all duration-300" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          <div className="relative mt-3.5 pt-2.5 min-h-[30px] flex items-center justify-start gap-2">
            <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
            <p className="relative z-10 text-[11px] text-white/88 whitespace-nowrap">
              Hosted with{' '}
              <button
                type="button"
                onClick={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
                className="inline p-0 bg-transparent border-0 font-bold text-white underline-offset-2 hover:underline cursor-pointer"
              >
                FOM Play
              </button>
            </p>
          </div>
        </section>

        <section className="-mt-1">
          <button
            onClick={onOpenActive}
            className={cn(
              "tap-target w-full h-12 rounded-2xl px-4 flex items-center justify-between border border-white/40 bg-white/8 backdrop-blur-md text-white",
              infoTheme.shadow
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/35 bg-white/20">
                <Zap size={15} />
              </span>
              <span className="text-[13px] font-bold truncate">
                {isTournamentEnded ? 'View Round Details' : 'View Active Match'}
              </span>
            </div>
            <ChevronRight size={16} className="opacity-80 shrink-0" />
          </button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Ranking Player</h3>
          </div>
          <p className="px-1 text-[10px] font-semibold text-white/92 drop-shadow-[0_1px_2px_rgba(0,0,0,0.32)]">Order: Wins (W) - Diff - Points.</p>

          <div className="rounded-2xl bg-white/78 backdrop-blur-sm border border-white/45 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-[1fr_48px_44px] gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface/55">
              <span>Player</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Points</span>
            </div>
            <div className="space-y-1.5">
              {sortedPlayers.map((player, i) => (
                <div key={player.id} className="bg-white/88 p-3 rounded-[14px] border border-white/45 grid grid-cols-[1fr_48px_44px] gap-2 items-center">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0', i < 3 ? cn(infoTheme.accentBg, infoTheme.accent) : 'bg-ios-gray/10 text-ios-gray')}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-ios-gray/10 border border-ios-gray/10 overflow-hidden flex items-center justify-center shrink-0">
                      {player.avatar ? (
                        <img className="w-full h-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[11px] font-bold text-ios-gray">{player.initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13px] text-on-surface truncate">{player.name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-ios-gray/85 truncate">
                        W {player.w} · L {player.l} · D {player.d} · M {player.matches}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-[14px] font-display font-black leading-none tabular-nums', player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                      {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold leading-none text-on-surface tabular-nums">{player.totalPoints}</p>
                  </div>
                </div>
              ))}
              {sortedPlayers.length === 0 && (
                <div className="bg-white/95 p-4 rounded-[14px] border border-ios-gray/10 text-center text-[12px] font-semibold text-ios-gray">
                  Player data is not available yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pt-1 pb-8">
          <button onClick={() => onShare(tournament)} className={cn('w-full h-[52px] rounded-[14px] text-white font-bold text-[15px] tracking-[0.01em] tap-target inline-flex items-center justify-center gap-2 border border-white/12', infoTheme.accentSolid, infoTheme.accentSolidShadow)}>
            <Share2 size={16} />
            Share Standings
          </button>
        </section>
      </main>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed -z-10 opacity-0"
        style={{ left: '-10000px', top: 0, width: 360, height: 640 }}
      >
        <div
          ref={storyExportRef}
          className="relative h-[640px] w-[360px] overflow-hidden bg-black"
        >
          <div className={cn('absolute inset-0', klasemenPageBgTheme.base)} />
          {klasemenHeroPhoto && (
            <img
              src={klasemenHeroPhoto}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.08]"
            />
          )}
          <div className={cn('absolute inset-0', klasemenPageBgTheme.photoBlend)} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.46)_0%,rgba(0,0,0,0.20)_22%,rgba(0,0,0,0.10)_46%,rgba(0,0,0,0.24)_100%)]" />

          <div className={storyExportShellClass}>
            <header className={storyExportLogoHeaderClass}>
              <img src="/fom-long-logotype-white.png" alt="" className={storyExportLogoClass} />
            </header>

            <section className={storySummaryCardClass} style={storySummaryCardStyle}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={storyTitleClass}>{tournament.name || '-'}</h2>
                  <p className={storySubtitleClass}>{locationDateLabel}</p>
                </div>
                <span className={storyTimerClass}>{totalElapsed}</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
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
              <div className={storyRankingHeaderClass}>
                <div className={storyPlayerHeaderGridClass}>
                  <span className="text-center">Ranking</span>
                  {storyShowAvatars && <span aria-hidden="true" />}
                  <span className={storyPlayerHeaderNameClass}>Player</span>
                </div>
                <div className={storyWldmHeaderClass}>
                  <span>W</span>
                  <span>L</span>
                  <span>D</span>
                  <span>M</span>
                </div>
                <span className="text-center">Diff</span>
                <span className="text-center">Pts</span>
              </div>
              <div className={storyRankingRowsClass}>
                {storyPlayers.map((player, i) => (
                  <div
                    key={player.id}
                    className={storyRowClass}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className={cn(
                        storyRankBadgeClass,
                        getStoryRankBadgeClass(i)
                      )}>
                        {i + 1}
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
                        <p className={storyPlayerNameClass}>{player.name}</p>
                      </div>
                    </div>
                    <div className={storyWldmValueClass}>
                      <span>{player.w}</span>
                      <span>{player.l}</span>
                      <span>{player.d}</span>
                      <span>{player.matches}</span>
                    </div>
                    <p className={cn('text-center leading-none tabular-nums', storyDiffClass, player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                      {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                    </p>
                    <p className={cn("text-center leading-none text-on-surface tabular-nums", storyPtsClass)}>{player.totalPoints}</p>
                  </div>
                ))}
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
              </div>
            </footer>
          </div>
        </div>
      </div>

      {isStoryPreviewOpen && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/86 px-3 py-3"
          role="dialog"
          aria-modal="true"
          aria-label="Story standings preview"
        >
          <button
            type="button"
            onClick={() => setIsStoryPreviewOpen(false)}
            className="tap-target absolute right-4 z-[250] h-10 w-10 rounded-full border border-white/15 bg-white/12 text-white backdrop-blur-xl inline-flex items-center justify-center"
            style={{ top: 'calc(var(--app-safe-top, 0px) + 12px)' }}
            aria-label="Close story preview"
          >
            <X size={19} />
          </button>

          {storyImageUrl ? (
            <img
              src={storyImageUrl}
              alt="Generated standings story"
              className="aspect-[9/16] max-h-[calc(100dvh-24px)] bg-black object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              style={{ width: 'min(calc(100vw - 24px), 430px)' }}
            />
          ) : (
            <div
              className="relative aspect-[9/16] max-h-[calc(100dvh-24px)] overflow-hidden bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              style={{ width: 'min(calc(100vw - 24px), 430px)' }}
            >
              <div className={cn('absolute inset-0', klasemenPageBgTheme.base)} />
              {klasemenHeroPhoto && (
                <img
                  src={klasemenHeroPhoto}
                  alt="Standings story background"
                  className="absolute inset-0 h-full w-full object-cover object-center scale-[1.08]"
                />
              )}
              <div className={cn('absolute inset-0', klasemenPageBgTheme.photoBlend)} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.46)_0%,rgba(0,0,0,0.20)_22%,rgba(0,0,0,0.10)_46%,rgba(0,0,0,0.24)_100%)]" />

              <div className={storyExportShellClass}>
                <header className={storyExportLogoHeaderClass}>
                  <img src="/fom-long-logotype-white.png" alt="Friends of Motion" className={storyExportLogoClass} />
                </header>

                {storyImageError && (
                  <p className="mb-1 rounded-full bg-black/28 px-3 py-1.5 text-[10px] font-bold text-white/90">
                    {storyImageError}
                  </p>
                )}

                <section className={storySummaryCardClass} style={storySummaryCardStyle}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className={storyTitleClass}>{tournament.name || '-'}</h2>
                      <p className={storySubtitleClass}>{locationDateLabel}</p>
                    </div>
                    <span className={storyTimerClass}>{totalElapsed}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
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
                  <div className={storyRankingHeaderClass}>
                    <div className={storyPlayerHeaderGridClass}>
                      <span className="text-center">Ranking</span>
                      {storyShowAvatars && <span aria-hidden="true" />}
                      <span className={storyPlayerHeaderNameClass}>Player</span>
                    </div>
                    <div className={storyWldmHeaderClass}>
                      <span>W</span>
                      <span>L</span>
                      <span>D</span>
                      <span>M</span>
                    </div>
                    <span className="text-center">Diff</span>
                    <span className="text-center">Pts</span>
                  </div>
                  <div className={storyRankingRowsClass}>
                    {storyPlayers.map((player, i) => (
                      <div
                        key={player.id}
                        className={storyRowClass}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <div className={cn(
                            storyRankBadgeClass,
                            getStoryRankBadgeClass(i)
                          )}>
                            {i + 1}
                          </div>
                          {storyShowAvatars && (
                            <div className={storyAvatarClass}>
                              {player.avatar ? (
                                <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[9px] font-bold text-ios-gray">{player.initials}</span>
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={storyPlayerNameClass}>{player.name}</p>
                          </div>
                        </div>
                        <div className={storyWldmValueClass}>
                          <span>{player.w}</span>
                          <span>{player.l}</span>
                          <span>{player.d}</span>
                          <span>{player.matches}</span>
                        </div>
                        <p className={cn('text-center leading-none tabular-nums', storyDiffClass, player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                          {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                        </p>
                        <p className={cn("text-center leading-none text-on-surface tabular-nums", storyPtsClass)}>{player.totalPoints}</p>
                      </div>
                    ))}
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
                  </div>
                </footer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
