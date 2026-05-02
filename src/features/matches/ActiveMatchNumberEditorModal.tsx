import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export const ActiveMatchNumberEditorModal = ({
  isOpen,
  modalBottomOffset,
  title,
  currentValueLabel,
  label,
  value,
  placeholder,
  helperText,
  error,
  zIndexClass,
  onClose,
  onValueChange,
  onSubmit
}: {
  isOpen: boolean;
  modalBottomOffset: number;
  title: string;
  currentValueLabel: string;
  label: string;
  value: string;
  placeholder: string;
  helperText?: string;
  error: string;
  zIndexClass: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className={`${zIndexClass} fixed inset-0 flex items-end justify-center px-4 pt-4 sm:items-center`}
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
          className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-on-surface">{title}</h3>
              <p className="text-[12px] text-ios-gray font-medium">{currentValueLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-ios-gray/10 rounded-full tap-target"
            >
              <X size={18} className="text-on-surface" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ios-gray">
              {label}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-ios-gray/20 px-4 text-[17px] font-semibold text-on-surface outline-none focus:border-primary"
              placeholder={placeholder}
            />
            {helperText && (
              <p className="text-[11px] font-medium text-ios-gray">
                {helperText}
              </p>
            )}
            {error && (
              <p className="text-[12px] font-semibold text-red-500">{error}</p>
            )}
          </div>
          <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
            <button
              onClick={onClose}
              className="h-11 rounded-xl border border-ios-gray/20 text-[14px] font-semibold text-ios-gray tap-target"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="h-11 rounded-xl bg-primary text-white text-[14px] font-bold shadow-[0_8px_18px_rgba(230,94,20,0.24)] tap-target"
            >
              Save
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
