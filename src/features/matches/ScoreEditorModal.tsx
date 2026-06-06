import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Match, type MatchFormat } from '../../types';

type ScoreTeam = 'A' | 'B';

export const ScoreEditorModal = ({
  match,
  format,
  totalPoints,
  modalBottomOffset,
  accentTheme,
  scoreToneClass,
  onClose,
  onScoreDelta,
  onExactScore,
  onMatchPlayPoint,
  onReset,
  onSave
}: {
  match: Match | null;
  format: MatchFormat;
  totalPoints: number;
  modalBottomOffset: number;
  accentTheme: {
    text: string;
    textSoft: string;
    bgSoft: string;
    borderSoft: string;
    solid: string;
    solidShadow: string;
  };
  scoreToneClass: string;
  onClose: () => void;
  onScoreDelta: (team: ScoreTeam, delta: number) => void;
  onExactScore: (team: ScoreTeam, score: number) => void;
  onMatchPlayPoint: (team: ScoreTeam) => void;
  onReset: () => void;
  onSave: () => void;
}) => (
  <AnimatePresence>
    {match && (
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center px-4 pt-4 sm:items-center"
        style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="relative w-full max-w-sm bg-white rounded-[24px] shadow-2xl overflow-hidden"
          style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)`, overflowY: 'auto' }}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[17px] font-bold tracking-tight">Update Score R{match.roundId} Court {match.court}</h3>
              <button onClick={onClose} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                <X size={18} className="text-on-surface" />
              </button>
            </div>

            <div className="space-y-5">
              <ScoreTeamEditor
                team="A"
                labelClass={accentTheme.text}
                playerNames={match.teamA.players.map((player) => player.name.split(' ')[0]).join(' & ')}
                games={match.teamA.score}
                points={match.pointsA || '0'}
                format={format}
                totalPoints={totalPoints}
                accentTheme={accentTheme}
                scoreToneClass={scoreToneClass}
                onScoreDelta={onScoreDelta}
                onExactScore={onExactScore}
                onMatchPlayPoint={onMatchPlayPoint}
              />

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ios-gray/10"></div></div>
                <span className="relative px-3 bg-white text-[9px] font-black text-ios-gray/30 tracking-[0.2em] uppercase">Versus</span>
              </div>

              <ScoreTeamEditor
                team="B"
                labelClass="text-ios-gray"
                playerNames={match.teamB.players.map((player) => player.name.split(' ')[0]).join(' & ')}
                games={match.teamB.score}
                points={match.pointsB || '0'}
                format={format}
                totalPoints={totalPoints}
                accentTheme={accentTheme}
                scoreToneClass={scoreToneClass}
                onScoreDelta={onScoreDelta}
                onExactScore={onExactScore}
                onMatchPlayPoint={onMatchPlayPoint}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={onReset}
                className="py-3 bg-ios-gray/5 text-ios-gray font-bold text-sm rounded-xl tap-target active:bg-ios-gray/10 transition-colors"
              >
                Reset Score
              </button>
              <button
                onClick={onSave}
                className={cn("py-3 text-white font-bold text-sm rounded-xl shadow-xl tap-target active:scale-[0.98] transition-all", accentTheme.solid, accentTheme.solidShadow)}
              >
                Save & Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const ScoreTeamEditor = ({
  team,
  labelClass,
  playerNames,
  games,
  points,
  format,
  totalPoints,
  accentTheme,
  scoreToneClass,
  onScoreDelta,
  onExactScore,
  onMatchPlayPoint
}: {
  team: ScoreTeam;
  labelClass: string;
  playerNames: string;
  games: number;
  points: string;
  format: MatchFormat;
  totalPoints: number;
  accentTheme: {
    text: string;
    textSoft: string;
    bgSoft: string;
    borderSoft: string;
    solid: string;
    solidShadow: string;
  };
  scoreToneClass: string;
  onScoreDelta: (team: ScoreTeam, delta: number) => void;
  onExactScore: (team: ScoreTeam, score: number) => void;
  onMatchPlayPoint: (team: ScoreTeam) => void;
}) => (
  <div className="space-y-2.5">
    <div className="flex justify-between items-center">
      <span className={cn("text-xs font-bold uppercase tracking-widest", labelClass)}>Team {team}</span>
      <span className="text-xs font-medium text-ios-gray truncate max-w-[200px]">
        {playerNames}
      </span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className={cn("flex-1 flex items-center justify-between rounded-xl p-2 border", accentTheme.bgSoft, accentTheme.borderSoft)}>
        {format !== 'Match Play' ? (
          <>
            <button onClick={() => onScoreDelta(team, -1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm tap-target active:scale-90 transition-transform">
              <Minus size={18} className={accentTheme.text} />
            </button>
            <span className={cn("text-3xl font-display font-black", scoreToneClass)}>{games}</span>
            <button onClick={() => onScoreDelta(team, 1)} className={cn("w-10 h-10 flex items-center justify-center rounded-lg shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}>
              <Plus size={18} className="text-white" />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between px-2">
            <div className="flex flex-col items-center">
              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Games</span>
              <span className={cn("text-2xl font-display font-black", scoreToneClass)}>{games}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Points</span>
              <span className={cn("text-2xl font-black", accentTheme.text)}>{points}</span>
            </div>
            <button
              onClick={() => onMatchPlayPoint(team)}
              className={cn("w-10 h-10 flex items-center justify-center rounded-lg shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>
        )}
      </div>
      {format !== 'Match Play' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onScoreDelta(team, 5)}
            className={cn(
              "px-3 py-2 text-xs font-black rounded-lg tap-target",
              team === 'A' ? [accentTheme.bgSoft, accentTheme.text] : ["bg-ios-gray/10", "text-ios-gray"]
            )}
          >
            +5
          </button>
          <button
            onClick={() => onExactScore(team, totalPoints)}
            className={cn(
              "px-3 py-2 text-xs font-black rounded-lg tap-target",
              team === 'A' ? [accentTheme.bgSoft, accentTheme.text] : ["bg-ios-gray/10", "text-ios-gray"]
            )}
          >
            MAX
          </button>
        </div>
      )}
    </div>
  </div>
);
