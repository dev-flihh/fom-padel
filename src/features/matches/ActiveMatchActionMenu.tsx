import { AnimatePresence, motion } from 'motion/react';
import { Building2, Edit3, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ActiveMatchActionMenu = ({
  isOpen,
  modalBottomOffset,
  canResetRounds,
  onClose,
  onOpenRoundEditor,
  onOpenCourtEditor,
  onOpenActivePlayersEditor,
  onOpenRoundResetSelector,
  onDeleteMatch
}: {
  isOpen: boolean;
  modalBottomOffset: number;
  canResetRounds: boolean;
  onClose: () => void;
  onOpenRoundEditor: () => void;
  onOpenCourtEditor: () => void;
  onOpenActivePlayersEditor: () => void;
  onOpenRoundResetSelector: () => void;
  onDeleteMatch: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className="fixed inset-0 z-[140] flex items-end justify-center px-4 pt-4 sm:items-center"
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
          <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
            <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Edit Match</h3>
            <button
              onClick={onClose}
              className="p-2 bg-ios-gray/10 rounded-full tap-target"
              aria-label="Close action menu"
            >
              <X size={18} className="text-on-surface" />
            </button>
          </div>

          <div className="p-4 space-y-2 overflow-y-auto">
            <button
              type="button"
              onClick={onOpenRoundEditor}
              className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
            >
              <Edit3 size={16} className="text-primary" />
              Edit round
            </button>
            <button
              type="button"
              onClick={onOpenCourtEditor}
              className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
            >
              <Building2 size={16} className="text-primary" />
              Edit courts
            </button>
            <button
              type="button"
              onClick={onOpenActivePlayersEditor}
              className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
            >
              <Users size={16} className="text-primary" />
              Active Players
            </button>
            <button
              type="button"
              onClick={onOpenRoundResetSelector}
              className={cn(
                "w-full h-12 px-4 rounded-xl border text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target",
                canResetRounds
                  ? "border-red-200 text-red-600 bg-red-50/60"
                  : "border-ios-gray/15 text-ios-gray bg-ios-gray/5"
              )}
              disabled={!canResetRounds}
            >
              <RefreshCw size={16} />
              Delete / Regenerate Rounds
            </button>
            <button
              type="button"
              onClick={onDeleteMatch}
              className="w-full h-12 px-4 rounded-xl border border-red-200 bg-red-50/70 text-red-600 text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
            >
              <Trash2 size={16} />
              Delete Match
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
