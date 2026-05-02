import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type WizardStep = {
  label: string;
  context: string;
};

export const MatchSettingsWizardShell = ({
  settingsStep,
  wizardSteps,
  currentStepContext,
  ctaLabel,
  ctaDisabled,
  statusLabel,
  showStatusLabel,
  children,
  modalSlot,
  onBack,
  onGoToStep,
  onNext
}: {
  settingsStep: number;
  wizardSteps: WizardStep[];
  currentStepContext: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  statusLabel: string;
  showStatusLabel: boolean;
  children: ReactNode;
  modalSlot?: ReactNode;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  onNext: () => void;
}) => (
  <div className="min-h-screen bg-white pb-36">
    <nav
      className="sticky top-0 z-50 border-b border-black/5 bg-white"
      style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={settingsStep > 0 ? () => onGoToStep(settingsStep - 1) : onBack}
            className="tap-target -ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface"
            aria-label={settingsStep > 0 ? 'Back to previous step' : 'Back'}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-baseline gap-2.5 truncate text-[13px] leading-[1.2]">
              <span className="shrink-0 font-bold uppercase tracking-[0.12em] text-primary">
                {`Step ${settingsStep + 1} of ${wizardSteps.length}`}
              </span>
              <span className="truncate font-semibold text-on-surface">
                {currentStepContext}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Match setup progress">
          {wizardSteps.map((step, index) => (
            <button
              key={step.label}
              type="button"
              onClick={() => onGoToStep(index)}
              className={cn(
                "tap-target h-1.5 rounded-full transition-colors",
                index <= settingsStep ? "bg-primary" : "bg-ios-gray/[0.12]"
              )}
              aria-label={`Go to ${step.context}`}
            />
          ))}
        </div>
      </div>
    </nav>

    <main className="mx-auto w-full max-w-md px-7 py-5">
      {children}
    </main>

    <div
      className="fixed inset-x-0 z-50 border-t border-black/5 bg-white/95 backdrop-blur-xl"
      style={{ bottom: 'calc(var(--app-safe-bottom, 0px))' }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={ctaDisabled}
            className="tap-target flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(255,85,1,0.18)] disabled:opacity-40 disabled:shadow-none"
          >
            {ctaLabel}
            {settingsStep < wizardSteps.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>
        {showStatusLabel && (
          <p className="mt-2 text-center text-[12px] font-semibold text-primary">{statusLabel}</p>
        )}
      </div>
    </div>

    {modalSlot}
  </div>
);
