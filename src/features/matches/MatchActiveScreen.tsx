import { Fragment, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { type Player, type Tournament, type TournamentHistory, type TournamentStatsSyncState } from '../../types';
import { getDisplayInitials } from '../ranking/leaderboardUtils';
import { resolveMatchBackground } from './matchBackgrounds';
import { formatDurationFromMs, getTournamentElapsedMs } from './matchTimeUtils';
import { ActiveMatchActionMenu } from './ActiveMatchActionMenu';
import { ActiveMatchBackdrop } from './ActiveMatchBackdrop';
import { ActiveMatchHeader } from './ActiveMatchHeader';
import { ActiveMatchNextRoundCta } from './ActiveMatchNextRoundCta';
import { ActiveMatchNumberEditorModal } from './ActiveMatchNumberEditorModal';
import { ActiveMatchRoundCard, type ActiveMatchSwapRequest } from './ActiveMatchRoundCard';
import { ActiveMatchSummaryPanel } from './ActiveMatchSummaryPanel';
import { ActivePlayersEditorModal } from './ActivePlayersEditorModal';
import { AddPlayerModal } from './AddPlayerModal';
import { NoActiveMatchScreen } from './NoActiveMatchScreen';
import { RoundResetSelectorModal } from './RoundResetSelectorModal';
import { ScoreEditorModal } from './ScoreEditorModal';
import { SwapPlayerModal } from './SwapPlayerModal';
import { getEnteredScoreCountForRound, getReadyScoreCountForRound, getRoundDurationLabel, getStatsSyncBadge } from './activeMatchDerived';
import { useModalBottomOffset, useNowMs } from './useActiveMatchUiState';
import { isFomRegisteredPlayer } from '../players/playerUtils';
import { getMatchThemeColor } from '../tournaments/matchTheme';
import { sanitizeInactivePlayerIds } from '../tournaments/tournamentDraft';

type MatchActiveScreenProps = {
  onBack: () => void;
  onStartNewMatch: () => void;
  tournament: Tournament;
  currentUser?: any;
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void;
  onNextRound: () => void | Promise<void>;
  onStartAmericanoRound: (roundId: number) => void | Promise<void>;
  onCompleteAmericanoRound: (roundId: number) => void | Promise<void>;
  onUpdateRounds: (numRounds: number) => boolean;
  onUpdateCourts: (numCourts: number) => boolean;
  onUpdateActivePlayers: (activePlayerIds: string[]) => void;
  onAddManualPlayer: (player: Player) => void;
  onDeleteRoundsFrom: (roundId: number) => void;
  onDeleteMatch: () => void | Promise<void>;
  needsRegenerateFromRound: number | null;
  onOpenStandings: () => void;
  onSwapPlayer: (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => void;
  onUpdateMatchPlayScore: (matchId: string, team: 'A' | 'B') => void;
  onShareMatch: () => void;
  isReadOnly: boolean;
  isSharedViewer: boolean;
  saveState: 'saved' | 'saving' | 'error';
  statsSyncState?: TournamentStatsSyncState | null;
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
  onUpdateActivePlayers,
  onAddManualPlayer,
  onDeleteRoundsFrom,
  onDeleteMatch,
  needsRegenerateFromRound,
  onOpenStandings,
  onSwapPlayer,
  onUpdateMatchPlayScore,
  onShareMatch,
  isReadOnly,
  isSharedViewer,
  saveState,
  statsSyncState
}: MatchActiveScreenProps) => {
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [swappingPlayer, setSwappingPlayer] = useState<ActiveMatchSwapRequest | null>(null);
  const [isRoundEditorOpen, setIsRoundEditorOpen] = useState(false);
  const [isCourtEditorOpen, setIsCourtEditorOpen] = useState(false);
  const [roundEditValue, setRoundEditValue] = useState('');
  const [courtEditValue, setCourtEditValue] = useState('');
  const [roundEditError, setRoundEditError] = useState('');
  const [courtEditError, setCourtEditError] = useState('');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isActivePlayersEditorOpen, setIsActivePlayersEditorOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isRoundResetSelectorOpen, setIsRoundResetSelectorOpen] = useState(false);
  const [draftActivePlayerIds, setDraftActivePlayerIds] = useState<Set<string>>(new Set());
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const nowMs = useNowMs();
  const modalBottomOffset = useModalBottomOffset();
  const currentUserUid = String(currentUser?.uid || '').trim();
  const currentUserPhotoURL = typeof currentUser?.photoURL === 'string' ? currentUser.photoURL : '';
  void saveState;

  const scoringMatch = useMemo(() => {
    if (!scoringMatchId) return null;
    for (const round of tournament.rounds) {
      const match = round.matches.find((candidate) => candidate.id === scoringMatchId);
      if (match) return match;
    }
    return null;
  }, [scoringMatchId, tournament.rounds]);

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

  const currentRoundIndex = tournament.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
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
  const tournamentPlayerById = useMemo(() => {
    const registry = new Map<string, Player>();
    tournament.players.forEach((player) => {
      registry.set(player.id, player);
    });
    return registry;
  }, [tournament.players]);

  const getPlayerDisplay = (player: Player) => {
    const registeredPlayer = tournamentPlayerById.get(player.id);
    const isCurrentUserPlayer = Boolean(currentUserUid) && player.id === currentUserUid;
    const resolvedAvatar = isCurrentUserPlayer
      ? (currentUserPhotoURL || player.avatar || registeredPlayer?.avatar)
      : (player.avatar || registeredPlayer?.avatar);
    return {
      ...registeredPlayer,
      ...player,
      avatar: resolvedAvatar,
      initials: player.initials || registeredPlayer?.initials || getDisplayInitials(player.name || registeredPlayer?.name)
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
  const activeRoundEnteredScoreCount = useMemo(() => (
    getEnteredScoreCountForRound({
      round: activeRound,
      format: tournament.format
    })
  ), [activeRound, tournament.format]);
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
  const nextRoundCtaLabel = isLastRound ? 'Finish Matches' : 'Next Round';
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
  const shouldShowNextRoundCta = !isReadOnly && !isTournamentEnded && tournament.format !== 'Americano';
  const statsSyncBadge = getStatsSyncBadge({
    isTournamentEnded,
    isSharedViewer,
    statsSyncState
  });
  const stickyCtaBottomOffsetPx = 10;
  const stickyCtaHeightPx = 84;
  const stickyCtaGapPx = 14;
  const stickyCtaBottomStyle = `calc(var(--app-safe-bottom, 0px) + ${stickyCtaBottomOffsetPx}px)`;
  const stickyCtaPaddingBottomStyle = shouldShowNextRoundCta
    ? `calc(var(--app-safe-bottom, 0px) + ${stickyCtaBottomOffsetPx + stickyCtaHeightPx + stickyCtaGapPx}px)`
    : '24px';
  const roundIdsForReset = useMemo(
    () => tournament.rounds.map((round) => round.id).filter((roundId) => roundId > 1).sort((a, b) => b - a),
    [tournament.rounds]
  );
  const hasDraftActivePlayersChanges = useMemo(() => {
    const nextActiveIds = tournament.players
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));
    return (
      nextActiveIds.length !== currentActivePlayerIds.length ||
      nextActiveIds.some((playerId, idx) => playerId !== currentActivePlayerIds[idx])
    );
  }, [tournament.players, draftActivePlayerIds, currentActivePlayerIds]);
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

  useEffect(() => {
    if (!hasActiveTournament || activeRoundId === null) return;
    const collapsed = new Set<number>();
    tournament.rounds.forEach((round) => {
      if (round.id !== activeRoundId) collapsed.add(round.id);
    });
    setCollapsedRounds(collapsed);
  }, [activeRoundId, hasActiveTournament, tournament.rounds]);

  const toggleRound = (roundId: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  };

  const handleMatchPlayScoreUpdate = (team: 'A' | 'B') => {
    if (!scoringMatchId) return;
    onUpdateMatchPlayScore(scoringMatchId, team);
  };

  const setScorePair = (scoreA: number, scoreB: number) => {
    if (!scoringMatch) return;
    onUpdateScore(scoringMatch.id, 'A', Math.max(0, scoreA));
    onUpdateScore(scoringMatch.id, 'B', Math.max(0, scoreB));
    setScoringMatchId((prev) => prev ?? null);
  };

  const handleScoreUpdate = (team: 'A' | 'B', delta: number) => {
    if (!scoringMatch) return;
    const currentScore = team === 'A' ? scoringMatch.teamA.score : scoringMatch.teamB.score;
    const newScore = Math.max(0, Math.min(tournament.totalPoints, currentScore + delta));
    const otherTeamScore = Math.max(0, tournament.totalPoints - newScore);
    if (team === 'A') {
      setScorePair(newScore, otherTeamScore);
      return;
    }
    setScorePair(otherTeamScore, newScore);
  };

  const setExactScore = (team: 'A' | 'B', score: number) => {
    if (!scoringMatch) return;
    const safeScore = Math.max(0, Math.min(tournament.totalPoints, score));
    const otherTeamScore = Math.max(0, tournament.totalPoints - safeScore);
    if (team === 'A') {
      setScorePair(safeScore, otherTeamScore);
      return;
    }
    setScorePair(otherTeamScore, safeScore);
  };

  const handleOpenRoundEditor = () => {
    setIsActionMenuOpen(false);
    setRoundEditValue(String(tournament.numRounds || 1));
    setRoundEditError('');
    setIsRoundEditorOpen(true);
  };

  const handleOpenCourtEditor = () => {
    setIsActionMenuOpen(false);
    setCourtEditValue(String(tournament.courts || 1));
    setCourtEditError('');
    setIsCourtEditorOpen(true);
  };

  const handleSubmitRoundEdit = () => {
    const parsed = Number.parseInt(roundEditValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setRoundEditError('Enter at least 1 round.');
      return;
    }
    const ok = onUpdateRounds(parsed);
    if (!ok) {
      setRoundEditError('Round count is invalid for the current match setup.');
      return;
    }
    setIsRoundEditorOpen(false);
  };

  const handleSubmitCourtEdit = () => {
    const parsed = Number.parseInt(courtEditValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCourtEditError('Enter at least 1 court.');
      return;
    }
    const ok = onUpdateCourts(parsed);
    if (!ok) {
      setCourtEditError('Court count is invalid for the current match setup.');
      return;
    }
    setIsCourtEditorOpen(false);
  };

  const handleOpenActivePlayersEditor = () => {
    setIsActionMenuOpen(false);
    setDraftActivePlayerIds(new Set(currentActivePlayerIds));
    setIsActivePlayersEditorOpen(true);
  };

  const handleOpenRoundResetSelector = () => {
    setIsActionMenuOpen(false);
    if (roundIdsForReset.length === 0) {
      window.alert('No rounds available to regenerate.');
      return;
    }
    setIsRoundResetSelectorOpen(true);
  };

  const handleDeleteRoundsFromSelector = (roundId: number) => {
    const shouldDelete = window.confirm(`Delete round ${roundId} and all subsequent rounds?`);
    if (!shouldDelete) return;
    onDeleteRoundsFrom(roundId);
    setIsRoundResetSelectorOpen(false);
  };

  const handleDeleteMatch = () => {
    const confirmationMessage = tournament.endedAt
      ? 'Delete this match?\n\nAll recorded match data will be removed, including match history and any player stats that were already saved.'
      : 'Delete this match?\n\nAll recorded data for this active match will be removed.';
    const shouldDelete = window.confirm(confirmationMessage);
    if (!shouldDelete) return;
    setIsActionMenuOpen(false);
    void onDeleteMatch();
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
    const nextActiveIds = tournament.players
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));

    if (!hasDraftActivePlayersChanges) {
      setIsActivePlayersEditorOpen(false);
      return;
    }

    const shouldSave = window.confirm('Changes will apply starting from the next round. Save?');
    if (!shouldSave) return;

    onUpdateActivePlayers(nextActiveIds);
    setIsActivePlayersEditorOpen(false);
  };

  const handleAddPlayerFromActive = (newPlayer: Player) => {
    onAddManualPlayer(newPlayer);
    setDraftActivePlayerIds((prev) => {
      const next = new Set(prev);
      next.add(newPlayer.id);
      return next;
    });
    setIsAddPlayerModalOpen(false);
  };

  const handleProceedToNextRound = () => {
    void onNextRound();
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
    <div className="relative min-h-screen pb-40 overflow-hidden bg-transparent z-0">
      <ActiveMatchBackdrop
        heroPhoto={activeHeroPhoto}
        pageBgTheme={pageBgTheme}
      />

      <ActiveMatchHeader
        isTournamentEnded={isTournamentEnded}
        isSharedViewer={isSharedViewer}
        accentTheme={accentTheme}
        onShareMatch={onShareMatch}
      />

      <main
        className="relative z-10 px-5 space-y-6 max-w-lg mx-auto"
        style={{
          paddingTop: '16px',
          paddingBottom: stickyCtaPaddingBottomStyle
        }}
      >
        <ActiveMatchSummaryPanel
          isSharedViewer={isSharedViewer}
          statsSyncBadge={statsSyncBadge}
          infoShadowClass={infoTheme.shadow}
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
          isTournamentEnded={isTournamentEnded}
          needsRegenerateFromRound={needsRegenerateFromRound}
          onOpenFomPlay={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
          onOpenSettings={() => setIsActionMenuOpen(true)}
          onOpenStandings={onOpenStandings}
        />

        {tournament.rounds.map((round) => {
          const isActive = activeRoundId !== null && round.id === activeRoundId;
          const isCollapsed = collapsedRounds.has(round.id);
          const roundDuration = getRoundDurationLabel(round, nowMs);

          return (
            <Fragment key={round.id}>
              <ActiveMatchRoundCard
                round={round}
                format={tournament.format}
                isActive={isActive}
                isCollapsed={isCollapsed}
                isReadOnly={isReadOnly}
                roundDuration={roundDuration}
                totalPoints={tournament.totalPoints}
                accentTheme={accentTheme}
                scoreToneClass={accentTheme.text}
                renderPlayerAvatar={renderPlayerAvatar}
                onToggleRound={toggleRound}
                onOpenScoreEditor={setScoringMatchId}
                onStartRound={onStartAmericanoRound}
                onCompleteRound={onCompleteAmericanoRound}
                onOpenSwapPlayer={setSwappingPlayer}
              />
            </Fragment>
          );
        })}
      </main>

      <ActiveMatchNextRoundCta
        isVisible={shouldShowNextRoundCta}
        bottomStyle={stickyCtaBottomStyle}
        activeRoundId={activeRoundId}
        enteredScoreCount={activeRoundEnteredScoreCount}
        matchCount={activeRoundMatchCount}
        format={tournament.format}
        isScoreFullyFilled={isActiveRoundScoreFullyFilled}
        label={nextRoundCtaLabel}
        accentTheme={accentTheme}
        onNext={handleProceedToNextRound}
      />

      <ActiveMatchActionMenu
        isOpen={isActionMenuOpen && !isReadOnly}
        modalBottomOffset={modalBottomOffset}
        canResetRounds={roundIdsForReset.length > 0}
        onClose={() => setIsActionMenuOpen(false)}
        onOpenRoundEditor={handleOpenRoundEditor}
        onOpenCourtEditor={handleOpenCourtEditor}
        onOpenActivePlayersEditor={handleOpenActivePlayersEditor}
        onOpenRoundResetSelector={handleOpenRoundResetSelector}
        onDeleteMatch={handleDeleteMatch}
      />

      <RoundResetSelectorModal
        isOpen={isRoundResetSelectorOpen && !isReadOnly}
        modalBottomOffset={modalBottomOffset}
        roundIds={roundIdsForReset}
        recommendedRoundId={needsRegenerateFromRound}
        onClose={() => setIsRoundResetSelectorOpen(false)}
        onSelectRound={handleDeleteRoundsFromSelector}
      />

      <ActivePlayersEditorModal
        isOpen={isActivePlayersEditorOpen}
        modalBottomOffset={modalBottomOffset}
        players={tournament.players}
        draftActivePlayerIds={draftActivePlayerIds}
        hasChanges={hasDraftActivePlayersChanges}
        renderPlayerAvatar={renderPlayerAvatar}
        isManualPlayer={(player) => !isFomRegisteredPlayer(player)}
        onClose={() => setIsActivePlayersEditorOpen(false)}
        onOpenAddPlayer={() => setIsAddPlayerModalOpen(true)}
        onSelectAll={() => setDraftActivePlayerIds(new Set(tournament.players.map((player) => player.id)))}
        onClearAll={() => setDraftActivePlayerIds(new Set())}
        onTogglePlayer={toggleDraftActivePlayer}
        onSave={handleSaveActivePlayers}
      />

      <AnimatePresence>
        {isAddPlayerModalOpen && !isReadOnly && (
          <AddPlayerModal
            isOpen={isAddPlayerModalOpen}
            onClose={() => setIsAddPlayerModalOpen(false)}
            onAdd={handleAddPlayerFromActive}
          />
        )}
      </AnimatePresence>

      <ActiveMatchNumberEditorModal
        isOpen={isCourtEditorOpen}
        modalBottomOffset={modalBottomOffset}
        title="Edit Court Count"
        currentValueLabel={`Current courts: ${tournament.courts}`}
        label="New Court Count"
        value={courtEditValue}
        placeholder="Example: 2"
        helperText="Changes apply starting from the next round."
        error={courtEditError}
        zIndexClass="z-[121]"
        onClose={() => setIsCourtEditorOpen(false)}
        onValueChange={(value) => {
          setCourtEditValue(value);
          if (courtEditError) setCourtEditError('');
        }}
        onSubmit={handleSubmitCourtEdit}
      />

      <ActiveMatchNumberEditorModal
        isOpen={isRoundEditorOpen}
        modalBottomOffset={modalBottomOffset}
        title="Edit Round Count"
        currentValueLabel={`Current match rounds: ${tournament.numRounds}`}
        label="New Round Count"
        value={roundEditValue}
        placeholder="Contoh: 5"
        error={roundEditError}
        zIndexClass="z-[120]"
        onClose={() => setIsRoundEditorOpen(false)}
        onValueChange={(value) => {
          setRoundEditValue(value);
          if (roundEditError) setRoundEditError('');
        }}
        onSubmit={handleSubmitRoundEdit}
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

      <ScoreEditorModal
        match={scoringMatch}
        format={tournament.format}
        totalPoints={tournament.totalPoints}
        modalBottomOffset={modalBottomOffset}
        accentTheme={accentTheme}
        scoreToneClass={accentTheme.text}
        onClose={() => setScoringMatchId(null)}
        onScoreDelta={handleScoreUpdate}
        onExactScore={setExactScore}
        onMatchPlayPoint={handleMatchPlayScoreUpdate}
        onReset={() => setScorePair(0, 0)}
        onSave={() => setScoringMatchId(null)}
      />
    </div>
  );
};
