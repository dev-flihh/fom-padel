import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Player, type Round } from '../../types';

type SwapPlayerRequest = {
  matchId: string;
  team: 'A' | 'B';
  playerIndex: number;
  currentPlayer: Player;
};

export const SwapPlayerModal = ({
  swapRequest,
  modalBottomOffset,
  players,
  rounds,
  playerMatchCounts,
  accentTheme,
  renderPlayerAvatar,
  isRegisteredPlayer,
  onClose,
  onSelectPlayer
}: {
  swapRequest: SwapPlayerRequest | null;
  modalBottomOffset: number;
  players: Player[];
  rounds: Round[];
  playerMatchCounts: Record<string, number>;
  accentTheme: {
    text: string;
    bgSoft: string;
  };
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  isRegisteredPlayer: (player: Player) => boolean;
  onClose: () => void;
  onSelectPlayer: (request: SwapPlayerRequest, player: Player) => void;
}) => {
  const replacementPlayers = swapRequest
    ? players.filter((player) => {
        const match = rounds
          .find((round) => round.matches.some((candidate) => candidate.id === swapRequest.matchId))
          ?.matches.find((candidate) => candidate.id === swapRequest.matchId);
        if (!match) return true;
        const playersInMatch = [...match.teamA.players, ...match.teamB.players];
        return !playersInMatch.some((matchPlayer) => matchPlayer.id === player.id);
      })
    : [];

  return (
    <AnimatePresence>
      {swapRequest && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center px-4 pt-4 sm:items-center"
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
            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
          >
            <div className="p-6 border-b border-ios-gray/10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Swap Player</h3>
                  <p className="text-xs text-ios-gray font-medium">Replace {swapRequest.currentPlayer.name}</p>
                </div>
                <button onClick={onClose} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                  <X size={20} className="text-on-surface" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h4 className="text-[11px] font-bold text-ios-gray uppercase tracking-widest px-2 mb-2">Select Replacement Player</h4>
              {replacementPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSelectPlayer(swapRequest, player)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-ios-gray/5 active:bg-ios-gray/10 transition-colors tap-target"
                >
                  {renderPlayerAvatar(
                    player,
                    cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs", accentTheme.bgSoft, accentTheme.text),
                    accentTheme.text
                  )}
                  <div className="text-left">
                    <div className="font-bold text-sm">{player.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ios-gray font-medium">
                        {isRegisteredPlayer(player) ? `MMR: ${player.rating}` : 'Manual player · No MMR'}
                      </span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", accentTheme.text, accentTheme.bgSoft)}>
                        {playerMatchCounts[player.id] || 0} Match
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <ChevronRight size={16} className="text-ios-gray/30" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
