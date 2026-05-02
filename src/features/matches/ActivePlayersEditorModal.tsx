import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Player } from '../../types';

export const ActivePlayersEditorModal = ({
  isOpen,
  modalBottomOffset,
  players,
  draftActivePlayerIds,
  hasChanges,
  renderPlayerAvatar,
  isManualPlayer,
  onClose,
  onOpenAddPlayer,
  onSelectAll,
  onClearAll,
  onTogglePlayer,
  onSave
}: {
  isOpen: boolean;
  modalBottomOffset: number;
  players: Player[];
  draftActivePlayerIds: Set<string>;
  hasChanges: boolean;
  renderPlayerAvatar: (player: Player, className: string, fallbackClassName?: string) => ReactNode;
  isManualPlayer: (player: Player) => boolean;
  onClose: () => void;
  onOpenAddPlayer: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onTogglePlayer: (playerId: string) => void;
  onSave: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className="fixed inset-0 z-[130] flex items-end justify-center px-4 pt-4 sm:items-center"
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
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
        >
          <div className="px-5 pt-5 pb-4 border-b border-ios-gray/10 bg-white">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Active Players</h3>
                <button
                  onClick={onClose}
                  className="p-2 bg-ios-gray/10 rounded-full tap-target"
                  aria-label="Close active players dialog"
                >
                  <X size={18} className="text-on-surface" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/15">
                  {draftActivePlayerIds.size}/{players.length} active
                </span>
                <span className="text-[11px] font-medium text-ios-gray">Applies on next round</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 border-b border-ios-gray/10 bg-ios-gray/5">
            <button
              type="button"
              onClick={onOpenAddPlayer}
              className="w-full h-10 px-3.5 rounded-xl border border-primary/20 bg-primary/8 text-[12px] font-bold text-primary tap-target inline-flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Add New Player
            </button>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="h-9 px-3 rounded-lg border border-primary/20 bg-white text-[11px] font-bold text-primary tap-target"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="h-9 px-3 rounded-lg border border-ios-gray/20 bg-white text-[11px] font-bold text-ios-gray tap-target"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-2">
            {players.length === 0 ? (
              <div className="h-28 rounded-2xl border border-ios-gray/10 bg-ios-gray/5 flex items-center justify-center text-[12px] font-medium text-ios-gray">
                No players in this match yet.
              </div>
            ) : players.map((player) => {
              const isChecked = draftActivePlayerIds.has(player.id);
              const isManual = isManualPlayer(player);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onTogglePlayer(player.id)}
                  className={cn(
                    "w-full h-14 flex items-center justify-between gap-3 px-3.5 rounded-xl border text-left tap-target transition-colors",
                    isChecked
                      ? "border-primary/25 bg-primary/6"
                      : "border-ios-gray/12 bg-white hover:bg-ios-gray/5"
                  )}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    {renderPlayerAvatar(
                      player,
                      cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        isChecked ? "bg-primary text-white" : "bg-ios-gray/12 text-ios-gray"
                      ),
                      isChecked ? "text-white" : "text-ios-gray"
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface truncate">{player.name}</p>
                      <p className="text-[10px] font-medium text-ios-gray">
                        {isManual ? 'Manual Player' : 'FOM Player'}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                    isChecked ? "bg-primary border-primary text-white" : "bg-white border-ios-gray/35 text-transparent"
                  )}>
                    <Check size={13} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-5 pb-5 pt-3 border-t border-ios-gray/10 bg-white">
            <p className="mb-2.5 text-[11px] font-medium text-ios-gray">Changes will apply starting from the next round.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onClose}
                className="h-11 rounded-xl border border-ios-gray/20 text-[14px] font-semibold text-ios-gray tap-target"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!hasChanges}
                className="h-11 rounded-xl bg-primary text-white text-[14px] font-bold shadow-[0_8px_18px_rgba(230,94,20,0.24)] tap-target disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
