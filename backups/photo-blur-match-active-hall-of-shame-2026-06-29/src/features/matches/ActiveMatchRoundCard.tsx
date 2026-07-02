import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, Play, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Match, type MatchFormat, type Player, type Round } from '../../types';

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
  roundDuration,
  totalPoints,
  accentTheme,
  scoreToneClass,
  renderPlayerAvatar,
  onToggleRound,
  onOpenScoreEditor,
  onStartRound,
  onCompleteRound,
  onOpenSwapPlayer
}: {
  round: Round;
  format: MatchFormat;
  isActive: boolean;
  isCollapsed: boolean;
  isReadOnly: boolean;
  roundDuration: string;
  totalPoints: number;
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
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  onToggleRound: (roundId: number) => void;
  onOpenScoreEditor: (matchId: string) => void;
  onStartRound: (roundId: number) => void;
  onCompleteRound: (roundId: number) => void;
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
  const roundActionLabel = isRoundCompleted
    ? 'Round Completed'
    : hasActiveMatch || hasRoundScoreProgress
      ? `Complete Round ${round.id}`
      : `Start Round ${round.id}`;
  const roundActionIcon = isRoundCompleted ? Check : hasActiveMatch || hasRoundScoreProgress ? Zap : Play;
  const RoundActionIcon = roundActionIcon;

  return (
    <div className="mb-4">
      <section className="bg-white/78 backdrop-blur-sm p-4 rounded-[20px] shadow-sm border border-white/45">
        <div className="flex items-center gap-2 mb-1.5">
          <button
            type="button"
            onClick={() => onToggleRound(round.id)}
            className="flex-1 flex items-center justify-between gap-3 tap-target text-left"
            aria-label={isCollapsed ? `Open round ${round.id}` : `Close round ${round.id}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn("text-[14px] leading-none font-black uppercase tracking-[0.08em]", accentTheme.headingStrong)}>
                Round {round.id}
              </span>
              <span className="w-1 h-1 rounded-full bg-ios-gray/40" />
              <span className="text-[11px] leading-none font-semibold uppercase tracking-[0.06em] tabular-nums text-ios-gray/60">
                {roundDuration}
              </span>
            </div>
            <span className="p-1 text-ios-gray/65">
              <ChevronRight size={22} className={cn("transition-transform", !isCollapsed && "rotate-90")} />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="h-px bg-ios-gray/10 mb-2.5" />
              <div className="space-y-3.5">
                {round.matches.map((match, index) => (
                  <div key={match.id}>
                    <RoundMatchRow
                      match={match}
                      format={format}
                      isActiveRound={isActive}
                      isReadOnly={isReadOnly}
                      accentTheme={accentTheme}
                      scoreToneClass={scoreToneClass}
                      renderPlayerAvatar={renderPlayerAvatar}
                      onOpenScoreEditor={onOpenScoreEditor}
                      onOpenSwapPlayer={onOpenSwapPlayer}
                    />

                    {index < round.matches.length - 1 && <div className="my-3.5 h-px bg-ios-gray/10" />}
                  </div>
                ))}
              </div>

              {round.playersBye.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ios-gray/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[9px] font-bold text-ios-gray/65 uppercase tracking-[0.18em]">Player Bye</h3>
                    <span className="text-[10px] font-medium text-ios-gray/45">{round.playersBye.length} Player</span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-ios-gray/72 font-medium">
                    {round.playersBye.map((player) => player.name).join(', ')}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isAmericano && !isReadOnly && (
          <div className={cn("pt-3", isCollapsed ? "mt-2 border-t border-ios-gray/10" : "mt-4 border-t border-ios-gray/10")}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ios-gray/60">
                {readyScoreCount}/{round.matches.length} scores ready
              </span>
              {!isRoundCompleted && hasRoundScoreProgress && readyScoreCount < round.matches.length && (
                <span className="text-[10px] font-bold text-amber-700">Incomplete scores</span>
              )}
            </div>
            <button
              type="button"
              disabled={isRoundCompleted}
              onClick={() => {
                if (isRoundCompleted) return;
                if (hasActiveMatch || hasRoundScoreProgress) {
                  onCompleteRound(round.id);
                  return;
                }
                onStartRound(round.id);
              }}
              className={cn(
                "h-11 w-full rounded-xl text-[14px] font-bold tap-target inline-flex items-center justify-center gap-2 transition-all",
                isRoundCompleted
                  ? "bg-emerald-50 text-emerald-700 cursor-default"
                  : cn("text-white shadow-xl active:scale-[0.98]", accentTheme.solid, accentTheme.solidShadow)
              )}
            >
              <span>{roundActionLabel}</span>
              <RoundActionIcon size={16} />
            </button>
          </div>
        )}
      </section>
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

const RoundMatchRow = ({
  match,
  format,
  isActiveRound,
  isReadOnly,
  accentTheme,
  scoreToneClass,
  renderPlayerAvatar,
  onOpenScoreEditor,
  onOpenSwapPlayer
}: {
  match: Match;
  format: MatchFormat;
  isActiveRound: boolean;
  isReadOnly: boolean;
  accentTheme: {
    bgSoftHover: string;
  };
  scoreToneClass: string;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  onOpenScoreEditor: (matchId: string) => void;
  onOpenSwapPlayer: (request: ActiveMatchSwapRequest) => void;
}) => {
  const canEditCompletedScore = !isReadOnly && match.status === 'completed' && format !== 'Match Play';
  const canEditAnyAmericanoScore = !isReadOnly && format === 'Americano';
  const canEditScore = !isReadOnly && (canEditAnyAmericanoScore || isActiveRound || canEditCompletedScore);
  const statusLabel = match.status === 'completed'
    ? 'Completed'
    : match.status === 'active'
      ? 'Active'
      : 'Not Started';

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ios-gray/65 leading-none">
          Court {match.court}
        </span>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.09em] leading-none",
          match.status === 'completed'
            ? "bg-emerald-50 text-emerald-700"
            : match.status === 'active'
              ? "bg-sky-50 text-sky-700"
              : "bg-ios-gray/8 text-ios-gray/60"
        )}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamColumn
          team="A"
          match={match}
          isActiveRound={isActiveRound}
          isReadOnly={isReadOnly}
          renderPlayerAvatar={renderPlayerAvatar}
          onOpenSwapPlayer={onOpenSwapPlayer}
        />

        <button
          type="button"
          onClick={() => canEditScore && onOpenScoreEditor(match.id)}
          disabled={!canEditScore}
          className={cn(
            "flex flex-col items-center min-w-[86px] rounded-xl px-2 py-1 transition-colors",
            canEditScore
              ? cn("cursor-pointer tap-target", accentTheme.bgSoftHover)
              : "cursor-default"
          )}
        >
          <div className="text-[31px] leading-none font-display font-black tracking-tight tabular-nums">
            <span className={scoreToneClass}>{match.teamA.score}</span>
            <span className="text-ios-gray/30 mx-1">-</span>
            <span className={scoreToneClass}>{match.teamB.score}</span>
          </div>
          <span className="text-[9px] font-bold text-ios-gray/80 tracking-[0.11em]">
            SKOR
            {format === 'Match Play' && (
              <span className="ml-1 normal-case tracking-normal text-[10px]">
                ({match.pointsA || '0'}-{match.pointsB || '0'})
              </span>
            )}
          </span>
        </button>

        <TeamColumn
          team="B"
          match={match}
          isActiveRound={isActiveRound}
          isReadOnly={isReadOnly}
          renderPlayerAvatar={renderPlayerAvatar}
          onOpenSwapPlayer={onOpenSwapPlayer}
        />
      </div>
    </>
  );
};

const TeamColumn = ({
  team,
  match,
  isActiveRound,
  isReadOnly,
  renderPlayerAvatar,
  onOpenSwapPlayer
}: {
  team: 'A' | 'B';
  match: Match;
  isActiveRound: boolean;
  isReadOnly: boolean;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  onOpenSwapPlayer: (request: ActiveMatchSwapRequest) => void;
}) => {
  const teamData = team === 'A' ? match.teamA : match.teamB;
  const canSwap = isActiveRound && !isReadOnly;

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="flex -space-x-3">
        {teamData.players.map((player, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => canSwap && onOpenSwapPlayer({ matchId: match.id, team, playerIndex: idx, currentPlayer: player })}
            className={cn(
              "w-9 h-9 rounded-full border-2 border-white/95 bg-ios-gray/15 flex items-center justify-center text-[10px] font-bold",
              canSwap ? "cursor-pointer tap-target" : "cursor-default"
            )}
            disabled={!canSwap}
            aria-label={`Ganti ${player.name}`}
          >
            {renderPlayerAvatar(player, 'h-full w-full rounded-full flex items-center justify-center bg-ios-gray/15', 'text-ios-gray')}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => canSwap && onOpenSwapPlayer({ matchId: match.id, team, playerIndex: 0, currentPlayer: teamData.players[0] })}
        className={cn(
          "bg-transparent border-0 p-0 text-[12px] font-semibold text-on-surface/62 text-center truncate w-full leading-none tracking-[0.005em]",
          canSwap ? "cursor-pointer tap-target" : "cursor-default"
        )}
        disabled={!canSwap || !teamData.players[0]}
      >
        {teamData.players.map((player) => player.name.split(' ')[0]).join(' & ')}
      </button>
    </div>
  );
};
