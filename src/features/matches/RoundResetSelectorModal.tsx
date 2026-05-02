import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const RoundResetSelectorModal = ({
  isOpen,
  modalBottomOffset,
  roundIds,
  recommendedRoundId,
  onClose,
  onSelectRound
}: {
  isOpen: boolean;
  modalBottomOffset: number;
  roundIds: number[];
  recommendedRoundId: number | null;
  onClose: () => void;
  onSelectRound: (roundId: number) => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className="fixed inset-0 z-[135] flex items-end justify-center px-4 pt-4 sm:items-center"
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
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Regenerate Round</h3>
              <p className="text-[12px] text-ios-gray font-medium">Select a round to delete along with all subsequent rounds.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-ios-gray/10 rounded-full tap-target"
              aria-label="Close round reset dialog"
            >
              <X size={18} className="text-on-surface" />
            </button>
          </div>

          <div className="p-5 pt-4 space-y-2 overflow-y-auto">
            {recommendedRoundId !== null && roundIds.includes(recommendedRoundId) && (
              <div className="mb-1 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800">
                Recommended: start from round {recommendedRoundId}+.
              </div>
            )}
            {roundIds.map((roundId) => (
              <button
                key={roundId}
                type="button"
                onClick={() => onSelectRound(roundId)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left tap-target",
                  recommendedRoundId === roundId
                    ? "border-amber-300 bg-amber-50"
                    : "border-ios-gray/15 bg-white hover:bg-ios-gray/5"
                )}
              >
                <p className="text-[14px] font-semibold text-on-surface">Start from round {roundId}</p>
                <p className="text-[11px] text-ios-gray">Round {roundId} through the last round will be deleted.</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
