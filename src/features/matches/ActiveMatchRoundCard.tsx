import { AnimatePresence, motion } from 'motion/react';
import { Check, Flag, Minus, Play, Plus, Zap } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { type Match, type MatchFormat, type Player, type Round } from '../../types';
import {
  getMatchPlayScoreline,
  getSetsWon,
  readTennisState,
  sumGames,
  type MatchPlayConfig,
} from './tennisScoring';

export type ActiveMatchSwapRequest = {
  matchId: string;
  team: 'A' | 'B';
  playerIndex: number;
  currentPlayer: Player;
};

export const ActiveMatchRoundCard = ({
  round,
  format,
  isActive,
  isCollapsed,
  isReadOnly,
  totalPoints,
  matchPlayConfig,
  accentTheme,
  scoreToneClass,
  onStartRound,
  onCompleteRound,
  onAdjustScore,
  onSetScore,
  onTennisPoint,
  onCompleteMatchPlay,
  onReopenMatchPlay,
  onOpenSwapPlayer
}: {
  round: Round;
  format: MatchFormat;
  isActive: boolean;
  isCollapsed: boolean;
  isReadOnly: boolean;
  totalPoints: number;
  matchPlayConfig?: MatchPlayConfig | null;
  accentTheme: {
    headingStrong: string;
    text: string;
    bgSoft: string;
    borderSoft: string;
    solid: string;
    solidShadow: string;
    bgSoftHover: string;
  };
  scoreToneClass: string;
  onStartRound: (roundId: number) => void;
  onCompleteRound: (roundId: number) => void;
  onAdjustScore: (match: Match, team: 'A' | 'B', delta: number) => void;
  onSetScore: (match: Match, team: 'A' | 'B', score: number) => void;
  onTennisPoint?: (match: Match, team: 'A' | 'B', direction: 1 | -1) => void;
  onCompleteMatchPlay?: (match: Match) => void;
  onReopenMatchPlay?: (match: Match) => void;
  onOpenSwapPlayer: (request: ActiveMatchSwapRequest) => void;
}) => {
  const isAmericano = format === 'Americano';
  const hasActiveMatch = round.matches.some((match) => match.status === 'active');
  const isRoundCompleted = round.matches.length > 0 && round.matches.every((match) => match.status === 'completed');
  const hasRoundScoreProgress = round.matches.some((match) => {
    const scoreA = match.teamA.score || 0;
    const scoreB = match.teamB.score || 0;
    return match.status === 'completed' || scoreA > 0 || scoreB > 0;
  });
  const readyScoreCount = getReadyScoreCount(round, totalPoints);
  const roundPointProgress = getRoundPointProgress(round, format, totalPoints);
  const roundActionLabel = isRoundCompleted
    ? 'Round Completed'
    : hasActiveMatch || hasRoundScoreProgress
      ? `Complete Round ${round.id}`
      : `Start Round ${round.id}`;
  const roundActionIcon = isRoundCompleted ? Check : hasActiveMatch || hasRoundScoreProgress ? Zap : Play;
  const RoundActionIcon = roundActionIcon;
  const roundProgressText = roundPointProgress.entered > 0 && readyScoreCount < round.matches.length
    ? `${roundPointProgress.entered}/${roundPointProgress.target} points entered`
    : `${readyScoreCount}/${round.matches.length} scores ready`;
  const roundProgressStatus = roundPointProgress.entered > 0 && roundPointProgress.remaining > 0
    ? `${roundPointProgress.remaining} pt${roundPointProgress.remaining === 1 ? '' : 's'} left`
    : 'Incomplete scores';
  const roundProgressPercent = roundPointProgress.target > 0
    ? Math.min(100, Math.max(0, (roundPointProgress.entered / roundPointProgress.target) * 100))
    : Math.min(100, Math.max(0, (readyScoreCount / Math.max(1, round.matches.length)) * 100));
  const sittingPlayers = getSittingPlayersSummary(round.playersBye);

  if (isCollapsed) return null;

  return (
    <div className="mb-0">
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="space-y-2.5">
            {round.matches.map((match) => (
              <div key={match.id}>
                <RoundMatchRow
                  match={match}
                  format={format}
                  isActiveRound={isActive}
                  isReadOnly={isReadOnly}
                  totalPoints={totalPoints}
                  matchPlayConfig={matchPlayConfig}
                  scoreToneClass={scoreToneClass}
                  onAdjustScore={onAdjustScore}
                  onSetScore={onSetScore}
                  onTennisPoint={onTennisPoint}
                  onCompleteMatchPlay={onCompleteMatchPlay}
                  onReopenMatchPlay={onReopenMatchPlay}
                  onOpenSwapPlayer={onOpenSwapPlayer}
                />
              </div>
            ))}
          </div>

          {round.playersBye.length > 0 && (
            <div
              className="mt-2.5 rounded-[14px] border border-black/[0.055] bg-black/[0.012] px-3.5 py-2.5"
              aria-label={`Sitting this round: ${sittingPlayers.fullLabel}`}
              title={sittingPlayers.fullLabel}
            >
              <p className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold leading-none text-on-surface/62">
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-ios-gray/72">
                  Sitting
                </span>
                <span className="min-w-0 truncate">{sittingPlayers.displayLabel}</span>
              </p>
            </div>
          )}

          {isAmericano && !isReadOnly && (
            <div className="mt-4 border-t border-black/[0.09] pt-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/72">
                  {roundProgressText}
                </span>
                {!isRoundCompleted && hasRoundScoreProgress && readyScoreCount < round.matches.length && (
                  <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.12em] text-amber-700">{roundProgressStatus}</span>
                )}
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/[0.055]" aria-hidden="true">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-300',
                    isRoundCompleted ? 'bg-emerald-500' : 'bg-primary'
                  )}
                  style={{ width: `${roundProgressPercent}%` }}
                />
              </div>
              <button
                type="button"
                disabled={isRoundCompleted}
                data-americano-round-action={round.id}
                onClick={() => {
                  if (isRoundCompleted) return;
                  if (hasActiveMatch || hasRoundScoreProgress) {
                    onCompleteRound(round.id);
                    return;
                  }
                  onStartRound(round.id);
                }}
                className={cn(
                  "h-[44px] w-full rounded-[18px] text-[15px] font-display font-bold tracking-[-0.012em] tap-target inline-flex items-center justify-center gap-2 transition-all",
                  isRoundCompleted
                    ? "bg-emerald-50 text-emerald-700 cursor-default"
                    : cn("text-white shadow-[0_10px_20px_rgba(230,94,20,0.16)] active:scale-[0.985]", accentTheme.solid, accentTheme.solidShadow)
                )}
              >
                <span>{roundActionLabel}</span>
                <RoundActionIcon size={16} />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const getReadyScoreCount = (round: Round, totalPoints: number) => {
  const hasPointTarget = (totalPoints || 0) > 0;
  return round.matches.filter((match) => {
    if (match.status === 'completed') return true;
    const scoreA = match.teamA.score || 0;
    const scoreB = match.teamB.score || 0;
    if (hasPointTarget) {
      return scoreA + scoreB === totalPoints && (scoreA > 0 || scoreB > 0);
    }
    return scoreA > 0 || scoreB > 0;
  }).length;
};

const getRoundPointProgress = (round: Round, format: MatchFormat, totalPoints: number) => {
  if (format === 'Match Play' || totalPoints <= 0) {
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

const RoundMatchRow = ({
  match,
  format,
  isActiveRound,
  isReadOnly,
  totalPoints,
  matchPlayConfig,
  scoreToneClass,
  onAdjustScore,
  onSetScore,
  onTennisPoint,
  onCompleteMatchPlay,
  onReopenMatchPlay,
  onOpenSwapPlayer
}: {
  match: Match;
  format: MatchFormat;
  isActiveRound: boolean;
  isReadOnly: boolean;
  totalPoints: number;
  matchPlayConfig?: MatchPlayConfig | null;
  scoreToneClass: string;
  onAdjustScore: (match: Match, team: 'A' | 'B', delta: number) => void;
  onSetScore: (match: Match, team: 'A' | 'B', score: number) => void;
  onTennisPoint?: (match: Match, team: 'A' | 'B', direction: 1 | -1) => void;
  onCompleteMatchPlay?: (match: Match) => void;
  onReopenMatchPlay?: (match: Match) => void;
  onOpenSwapPlayer: (request: ActiveMatchSwapRequest) => void;
}) => {
  const isMatchPlay = format === 'Match Play';
  const canEditCompletedScore = !isReadOnly && match.status === 'completed' && !isMatchPlay;
  const canEditAnyAmericanoScore = !isReadOnly && format === 'Americano';
  const canEditScore = !isReadOnly && (canEditAnyAmericanoScore || isActiveRound || canEditCompletedScore);
  const statusLabel = match.status === 'completed'
    ? 'Completed'
    : match.status === 'active'
      ? 'In Progress'
      : 'Not Started';
  const isReviewMode = match.status === 'completed';

  const canDecrementA = canEditScore && match.teamA.score > 0;
  const canDecrementB = canEditScore && match.teamB.score > 0;
  const isScoreReady = isMatchScoreReady(match, format, totalPoints);
  const isEditableActive = canEditScore && !isReviewMode;
  const isNeedsScore = isEditableActive && !isScoreReady;
  const activePointProgress = getMatchPointProgress(match, format, totalPoints);
  const activeStatusLabel = match.status === 'active'
    ? isScoreReady
      ? 'Score Ready'
      : activePointProgress.entered > 0 && activePointProgress.remaining > 0
        ? `Needs ${activePointProgress.remaining} pt${activePointProgress.remaining === 1 ? '' : 's'}`
        : statusLabel
    : statusLabel;

  return (
    <div className={cn(
      'rounded-[18px] border px-4.5 py-4 transition-colors',
      isReviewMode
        ? 'border-black/[0.055] bg-white/96 shadow-[0_4px_12px_rgba(17,24,39,0.022)]'
        : isNeedsScore
          ? 'border-primary/24 bg-white shadow-[0_8px_22px_rgba(230,94,20,0.055)]'
          : isActiveRound
            ? 'border-emerald-500/18 bg-white shadow-[0_8px_20px_rgba(30,142,62,0.045)]'
            : 'border-black/10 bg-white shadow-[0_6px_18px_rgba(17,24,39,0.03)]'
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/72">
          Court {match.court}
        </span>
        <span className={cn(
          "shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] leading-none",
          match.status === 'completed'
            ? "bg-[#E7F4EA] text-[#1E7A38]"
            : match.status === 'active'
              ? isScoreReady
                ? "bg-[#E7F4EA] text-[#1E7A38]"
                : "bg-[#FDEFE6] text-[#C44D0B]"
              : "bg-[#F2F2F4] text-[#9A9AA0]"
        )}>
          {activeStatusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_30px_minmax(0,1fr)] items-center gap-3">
        <TeamName
          team="A"
          match={match}
          isActiveRound={isActiveRound}
          isReadOnly={isReadOnly}
          onOpenSwapPlayer={onOpenSwapPlayer}
        />
        <div className="text-center text-[12px] font-extrabold uppercase tracking-[0.08em] text-ios-gray/24">
          VS
        </div>
        <TeamName
          team="B"
          match={match}
          isActiveRound={isActiveRound}
          isReadOnly={isReadOnly}
          onOpenSwapPlayer={onOpenSwapPlayer}
        />
      </div>

      {isMatchPlay ? (
        <TennisScorePanel
          match={match}
          config={matchPlayConfig || null}
          canScore={canEditScore && !isReviewMode}
          canReopen={!isReadOnly && isActiveRound}
          scoreToneClass={scoreToneClass}
          onTennisPoint={onTennisPoint}
          onCompleteMatchPlay={onCompleteMatchPlay}
          onReopenMatchPlay={onReopenMatchPlay}
        />
      ) : (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
          <ScoreControls
            score={match.teamA.score}
            scoreLabel={`${getTeamScoreLabel(match.teamA.players)} on court ${match.court}`}
            canEditScore={canEditScore}
            canDecrement={canDecrementA}
            isReviewMode={isReviewMode}
            scoreToneClass={scoreToneClass}
            onAdjust={(delta) => onAdjustScore(match, 'A', delta)}
            onSetScore={(score) => onSetScore(match, 'A', score)}
          />
          <div className="text-center text-[23px] font-semibold leading-none text-ios-gray/24">-</div>
          <ScoreControls
            score={match.teamB.score}
            scoreLabel={`${getTeamScoreLabel(match.teamB.players)} on court ${match.court}`}
            canEditScore={canEditScore}
            canDecrement={canDecrementB}
            isReviewMode={isReviewMode}
            scoreToneClass={scoreToneClass}
            onAdjust={(delta) => onAdjustScore(match, 'B', delta)}
            onSetScore={(score) => onSetScore(match, 'B', score)}
          />
        </div>
      )}
    </div>
  );
};

// Panel skor tenis Match Play: game per tim (set berjalan), poin game
// 0/15/30/40/Ad dengan tap +1 poin per sisi, ringkasan set (mode best-of),
// dan tombol tutup match lebih awal.
const TennisScorePanel = ({
  match,
  config,
  canScore,
  canReopen,
  scoreToneClass,
  onTennisPoint,
  onCompleteMatchPlay,
  onReopenMatchPlay
}: {
  match: Match;
  config: MatchPlayConfig | null;
  canScore: boolean;
  canReopen: boolean;
  scoreToneClass: string;
  onTennisPoint?: (match: Match, team: 'A' | 'B', direction: 1 | -1) => void;
  onCompleteMatchPlay?: (match: Match) => void;
  onReopenMatchPlay?: (match: Match) => void;
}) => {
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const state = readTennisState(match);
  const isBestOf = config?.mode === 'bestOf';
  const isCompleted = match.status === 'completed';
  const gamesA = isBestOf ? (state.gamesA[state.currentSet] || 0) : sumGames(state.gamesA);
  const gamesB = isBestOf ? (state.gamesB[state.currentSet] || 0) : sumGames(state.gamesB);
  const totalGamesA = sumGames(state.gamesA);
  const totalGamesB = sumGames(state.gamesB);
  const setsWon = getSetsWon(state);
  const canScorePoints = canScore && Boolean(onTennisPoint);
  // Pemenang mengikuti satuan mode: bestOf = set (2-1 set menang walau total
  // game kalah), race = game.
  const winnerSide = !isCompleted
    ? null
    : isBestOf
      ? (setsWon.A > setsWon.B ? 'A' : setsWon.B > setsWon.A ? 'B' : null)
      : (totalGamesA > totalGamesB ? 'A' : totalGamesB > totalGamesA ? 'B' : null);

  useEffect(() => {
    if (!canScore) setIsConfirmingFinish(false);
  }, [canScore]);

  const scoreline = config ? getMatchPlayScoreline(state, config) : `${totalGamesA}-${totalGamesB}`;

  if (isCompleted) {
    return (
      <div className="mt-3 rounded-[16px] bg-ios-gray/[0.035] px-4 py-3.5 text-center">
        <p className="text-[9px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/58">
          {isBestOf ? `Final · Sets ${setsWon.A}-${setsWon.B}` : 'Final · Games'}
        </p>
        <p className={cn('mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums', scoreToneClass)}>
          {scoreline}
        </p>
        {winnerSide && (
          <p className="mt-2 text-[11.5px] font-bold leading-tight text-on-surface/72">
            Winner: {(winnerSide === 'A' ? match.teamA : match.teamB).players.map((player) => player.name.split(' ')[0]).join(' & ')}
          </p>
        )}
        {canReopen && onReopenMatchPlay && (
          <button
            type="button"
            onClick={() => onReopenMatchPlay(match)}
            className="tap-target mx-auto mt-2.5 inline-flex h-8 items-center justify-center rounded-full border border-black/[0.07] bg-white px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ios-gray/78"
          >
            Reopen scoring
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {isBestOf && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
          {state.gamesA.map((setGamesA, index) => (
            <span
              key={index}
              className={cn(
                'rounded-full border px-2 py-[3px] text-[9.5px] font-black leading-none tabular-nums tracking-[0.04em]',
                index === state.currentSet
                  ? 'border-primary/24 bg-primary/[0.06] text-primary'
                  : 'border-black/[0.06] bg-white text-ios-gray/72'
              )}
            >
              Set {index + 1} · {setGamesA}-{state.gamesB[index] || 0}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
        {(['A', 'B'] as const).map((team, index) => (
          <Fragment key={team}>
            {index === 1 && (
              <div className="text-center text-[23px] font-semibold leading-none text-ios-gray/24">-</div>
            )}
            <div className="flex flex-col items-center gap-1">
              <p
                className={cn('font-display text-[44px] font-bold leading-none tracking-[-0.035em] tabular-nums', scoreToneClass)}
                aria-label={`Games for ${getTeamScoreLabel((team === 'A' ? match.teamA : match.teamB).players)} on court ${match.court}`}
              >
                {team === 'A' ? gamesA : gamesB}
              </p>
              <p className="text-[8.5px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/52">
                {isBestOf ? `Games · Set ${state.currentSet + 1}` : `Games${config ? ` / ${config.gamesTarget}` : ''}`}
              </p>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="mt-3 rounded-[16px] border border-black/[0.055] bg-[#FAFAFB] px-3 py-3">
        <p className="text-center text-[8.5px] font-black uppercase leading-none tracking-[0.16em] text-ios-gray/52">
          Current game point
        </p>
        <div
          className="mt-2 grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-1.5"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Game points: ${state.pointsA} to ${state.pointsB}, games ${gamesA} to ${gamesB}`}
        >
          {(['A', 'B'] as const).map((team, index) => {
            const pointLabel = team === 'A' ? state.pointsA : state.pointsB;
            const teamLabel = getTeamScoreLabel((team === 'A' ? match.teamA : match.teamB).players);
            return (
              <Fragment key={team}>
                {index === 1 && (
                  <div className="text-center text-[15px] font-bold leading-none text-ios-gray/30">:</div>
                )}
                <div className="flex items-center justify-center gap-1.5">
                  {canScorePoints && (
                    <button
                      type="button"
                      onClick={() => onTennisPoint?.(match, team, -1)}
                      disabled={pointLabel === '0'}
                      className={cn(
                        'tap-target flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-[0.97]',
                        pointLabel === '0'
                          ? 'pointer-events-none border-transparent text-ios-gray/0 opacity-0'
                          : 'border-black/[0.08] bg-white text-ios-gray/58'
                      )}
                      aria-label={`Undo point for ${teamLabel}`}
                    >
                      <Minus size={14} strokeWidth={2.4} />
                    </button>
                  )}
                  <span
                    className="min-w-[40px] text-center font-display text-[24px] font-bold leading-none tracking-[-0.02em] text-on-surface tabular-nums"
                    aria-label={`Game points for ${teamLabel}`}
                  >
                    {pointLabel}
                  </span>
                  {canScorePoints && (
                    <button
                      type="button"
                      onClick={() => onTennisPoint?.(match, team, 1)}
                      className="tap-target flex h-9 w-9 items-center justify-center rounded-full border border-primary/16 bg-primary/[0.07] text-primary transition-all hover:bg-primary/[0.1] active:scale-[0.97]"
                      aria-label={`Add point for ${teamLabel}`}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {canScore && onCompleteMatchPlay && (
        <div className="mt-2.5 flex items-center justify-center gap-2">
          {isConfirmingFinish ? (
            <>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setIsConfirmingFinish(false);
                  onCompleteMatchPlay(match);
                }}
                className="tap-target inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[#E65E14] px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white"
              >
                <Flag size={12} strokeWidth={2.6} />
                Confirm finish
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingFinish(false)}
                className="tap-target inline-flex h-8 items-center justify-center rounded-full bg-ios-gray/[0.07] px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ios-gray"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingFinish(true)}
              className="tap-target inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ios-gray/78"
            >
              <Flag size={12} strokeWidth={2.4} />
              End match now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const TeamName = ({
  team,
  match,
  isActiveRound,
  isReadOnly,
  onOpenSwapPlayer
}: {
  team: 'A' | 'B';
  match: Match;
  isActiveRound: boolean;
  isReadOnly: boolean;
  onOpenSwapPlayer: (request: ActiveMatchSwapRequest) => void;
}) => {
  const teamData = team === 'A' ? match.teamA : match.teamB;
  const canSwap = isActiveRound && !isReadOnly;

  // Tiap nama adalah tombol swap masing-masing — dulu satu tombol gabungan
  // yang selalu membuka swap untuk playerIndex 0, jadi pemain kedua di tim
  // tidak pernah bisa diganti.
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', team === 'A' ? 'items-start text-left' : 'items-end text-right')}>
      <p className={cn(
        'line-clamp-2 max-w-full font-display text-[15px] font-bold leading-[1.16] tracking-[-0.018em] text-on-surface',
        team === 'B' && 'text-right'
      )}>
        {teamData.players.map((player, playerIndex) => (
          <Fragment key={`${match.id}-${team}-${player.id}-${playerIndex}`}>
            {playerIndex > 0 && <span aria-hidden="true"> & </span>}
            <button
              type="button"
              onClick={() => canSwap && onOpenSwapPlayer({ matchId: match.id, team, playerIndex, currentPlayer: player })}
              disabled={!canSwap}
              className={cn(
                'inline border-0 bg-transparent p-0 align-baseline font-display text-[15px] font-bold leading-[1.16] tracking-[-0.018em] text-on-surface',
                canSwap ? 'cursor-pointer tap-target underline decoration-dotted decoration-ios-gray/35 underline-offset-[3px]' : 'cursor-default'
              )}
              aria-label={`Swap ${player.name} on court ${match.court}`}
            >
              {player.name.split(' ')[0]}
            </button>
          </Fragment>
        ))}
      </p>
    </div>
  );
};

const ScoreControls = ({
  score,
  scoreLabel,
  canEditScore,
  canDecrement,
  isReviewMode,
  scoreToneClass,
  onAdjust,
  onSetScore
}: {
  score: number;
  scoreLabel: string;
  canEditScore: boolean;
  canDecrement: boolean;
  isReviewMode: boolean;
  scoreToneClass: string;
  onAdjust: (delta: number) => void;
  onSetScore: (score: number) => void;
}) => {
  const [draftScore, setDraftScore] = useState(String(score));
  const [isEditing, setIsEditing] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const previousScoreRef = useRef(score);
  const hasScore = score > 0;

  useEffect(() => {
    if (!isEditing) setDraftScore(String(score));
  }, [isEditing, score]);

  useEffect(() => {
    if (previousScoreRef.current !== score) {
      previousScoreRef.current = score;
      setIsPulseActive(false);
      const frameId = window.requestAnimationFrame(() => setIsPulseActive(true));
      const timeoutId = window.setTimeout(() => setIsPulseActive(false), 220);
      return () => {
        window.cancelAnimationFrame(frameId);
        window.clearTimeout(timeoutId);
      };
    }
  }, [score]);

  const commitScore = (value: string) => {
    const trimmedValue = value.trim();
    const nextScore = trimmedValue === '' ? 0 : Number.parseInt(trimmedValue, 10);
    if (!Number.isFinite(nextScore)) {
      setDraftScore(String(score));
      return;
    }
    onSetScore(Math.max(0, nextScore));
  };

  return (
    <div className="grid grid-cols-[32px_54px_32px] items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={!canDecrement}
        onClick={() => onAdjust(-1)}
        className={cn(
          'tap-target flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-[0.97]',
          canDecrement
            ? 'border-black/[0.08] bg-white text-ios-gray/58'
            : 'pointer-events-none border-transparent bg-transparent text-ios-gray/0 opacity-0 active:scale-100',
          isReviewMode && canDecrement && 'border-black/[0.08] bg-black/[0.02] text-ios-gray/62'
        )}
        aria-label={`Decrease score for ${scoreLabel}`}
      >
        <Minus size={15} strokeWidth={2.4} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={!canEditScore}
        value={isEditing ? draftScore : String(score)}
        onFocus={(event) => {
          setIsEditing(true);
          setDraftScore(String(score));
          window.requestAnimationFrame(() => event.currentTarget.select());
        }}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/\D/g, '').slice(0, 2);
          setDraftScore(nextValue);
          if (nextValue !== '') commitScore(nextValue);
        }}
        onBlur={() => {
          commitScore(draftScore);
          setIsEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          'tap-target h-14 min-w-0 appearance-none border-0 bg-transparent p-0 text-center font-display text-[44px] font-bold leading-none tracking-[-0.035em] tabular-nums outline-none transition-colors focus:text-primary focus:drop-shadow-[0_5px_12px_rgba(230,94,20,0.14)] disabled:opacity-100',
          isPulseActive && 'active-score-pop',
          canEditScore || isReviewMode ? scoreToneClass : 'text-[#101010]'
        )}
        aria-label={`Score for ${scoreLabel}`}
      />
      <button
        type="button"
        disabled={!canEditScore}
        onClick={() => onAdjust(1)}
        className={cn(
          'tap-target flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100',
          isReviewMode
            ? 'border-primary/12 bg-primary/[0.035] text-primary'
            : hasScore
              ? 'border-black/[0.08] bg-white text-primary hover:border-primary/18 hover:bg-primary/[0.04]'
              : 'border-primary/14 bg-primary/[0.055] text-primary hover:bg-primary/[0.08]'
        )}
        aria-label={`Increase score for ${scoreLabel}`}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const getTeamScoreLabel = (players: Player[]) => {
  const names = players.map((player) => player.name).filter(Boolean);
  if (names.length === 0) return 'team';
  if (names.length === 1) return names[0];
  return names.join(' and ');
};

const getSittingPlayersSummary = (players: Player[]) => {
  const names = players.map((player) => player.name).filter(Boolean);
  const fullLabel = names.join(', ');
  if (names.length <= 3) {
    return {
      displayLabel: fullLabel,
      fullLabel,
    };
  }

  return {
    displayLabel: `${names.slice(0, 3).join(', ')} +${names.length - 3} more`,
    fullLabel,
  };
};

const isMatchScoreReady = (match: Match, format: MatchFormat, totalPoints: number) => {
  if (match.status === 'completed') return true;
  // Match Play: siap = match benar-benar selesai (target race/best-of tercapai
  // atau ditutup host), bukan sekadar sudah ada game masuk.
  if (format === 'Match Play') return false;
  const scoreA = match.teamA.score || 0;
  const scoreB = match.teamB.score || 0;
  if (totalPoints > 0) {
    return scoreA + scoreB === totalPoints && (scoreA > 0 || scoreB > 0);
  }
  return scoreA > 0 || scoreB > 0;
};

const getMatchPointProgress = (match: Match, format: MatchFormat, totalPoints: number) => {
  if (format === 'Match Play' || totalPoints <= 0) {
    return { entered: 0, remaining: 0 };
  }

  const scoreA = Math.max(0, Number(match.teamA.score || 0));
  const scoreB = Math.max(0, Number(match.teamB.score || 0));
  const entered = Math.min(totalPoints, scoreA + scoreB);
  return {
    entered,
    remaining: Math.max(0, totalPoints - entered),
  };
};
