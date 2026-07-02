import { Check, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat, type ToxicIntensity } from '../../types';
import { TOXIC_INTENSITY_OPTIONS } from './toxicSettings';

type MatchThemeColorOption = {
  id: string;
  label: string;
  swatch: string;
  accentSolid: string;
};

export const AppearanceStep = ({
  format,
  themeColors,
  selectedThemeColor,
  backgroundOptions,
  selectedBackgroundId,
  toxicModeEnabled,
  toxicIntensity,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  wizardSoftPanelClass,
  onSelectThemeColor,
  onSelectBackground,
  onToxicModeChange,
  onToxicIntensityChange
}: {
  format: MatchFormat;
  themeColors: readonly MatchThemeColorOption[];
  selectedThemeColor: MatchThemeColorOption;
  backgroundOptions: readonly string[];
  selectedBackgroundId: string | null;
  toxicModeEnabled: boolean;
  toxicIntensity: ToxicIntensity;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  wizardSoftPanelClass: string;
  onSelectThemeColor: (themeColorId: string) => void;
  onSelectBackground?: (backgroundId: string) => void;
  onToxicModeChange: (enabled: boolean) => void;
  onToxicIntensityChange: (value: ToxicIntensity) => void;
}) => (
  <section className="space-y-5">
    <div className={wizardHeadingClass}>
      <h2 className={wizardTitleClass}>Choose appearance.</h2>
      <p className={wizardSubtitleClass}>Set the color and background for the live match screen.</p>
    </div>

    <button
      type="button"
      onClick={() => onToxicModeChange(!toxicModeEnabled)}
      aria-pressed={toxicModeEnabled}
      className={cn(
        wizardSoftPanelClass,
        "tap-target flex w-full items-center justify-between gap-3 p-3.5 text-left transition-all active:scale-[0.99]",
        toxicModeEnabled ? "ring-1 ring-primary/25 bg-primary/[0.06]" : ""
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]",
          toxicModeEnabled ? "bg-primary text-white" : "bg-ios-gray/10 text-on-surface/72"
        )}>
          <Flame size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-black tracking-[-0.01em] text-on-surface">Hall of Shame</span>
          <span className="mt-0.5 block text-[11.5px] font-medium leading-snug text-ios-gray">
            {toxicModeEnabled ? 'Toxic mode enabled for this match.' : 'Optional toxic leaderboard after scoring.'}
          </span>
        </span>
      </span>
      <span className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
        toxicModeEnabled ? "border-primary bg-primary" : "border-ios-gray/20 bg-ios-gray/10"
      )}>
        <span className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform",
          toxicModeEnabled ? "translate-x-[22px]" : "translate-x-1"
        )} />
      </span>
    </button>

    {toxicModeEnabled && (
      <div className={cn(wizardSoftPanelClass, "space-y-3 p-3.5")}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">Toxic Intensity</p>
          <p className="mt-1 text-[12px] font-medium leading-snug text-ios-gray">
            Savage is the default for Hall of Shame.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TOXIC_INTENSITY_OPTIONS.map((option) => {
            const isSelected = toxicIntensity === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToxicIntensityChange(option.value)}
                className={cn(
                  "tap-target min-h-[58px] rounded-[18px] border px-2 py-2 text-center transition-all active:scale-[0.98]",
                  isSelected
                    ? "border-primary bg-primary text-white shadow-[0_10px_22px_rgba(230,94,20,0.18)]"
                    : "border-ios-gray/15 bg-white text-on-surface"
                )}
                aria-pressed={isSelected}
              >
                <span className="block text-[12px] font-black leading-tight">{option.label}</span>
                <span className={cn("mt-1 block text-[9.5px] font-semibold leading-tight", isSelected ? "text-white/82" : "text-ios-gray")}>
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}

    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">Color Theme</p>
      <div className="grid grid-cols-5 gap-2">
        {themeColors.map((themeColor) => {
          const isSelected = selectedThemeColor.id === themeColor.id;
          return (
            <button
              key={themeColor.id}
              type="button"
              onClick={() => onSelectThemeColor(themeColor.id)}
              className={cn(
                "tap-target flex h-[66px] flex-col items-center justify-center gap-1.5 rounded-[22px] bg-ios-gray/[0.035] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.98]",
                isSelected ? "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)] ring-1 ring-black/8" : "hover:bg-ios-gray/[0.055]"
              )}
              aria-label={`Select ${themeColor.label} color theme`}
            >
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-white", themeColor.swatch)}>
                {isSelected && <Check size={14} strokeWidth={2.6} />}
              </span>
              <span className="text-[10px] font-semibold leading-none text-on-surface">{themeColor.label}</span>
            </button>
          );
        })}
      </div>
    </div>

    <div className="pt-1">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">Background</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {backgroundOptions.map((backgroundId, index) => {
        const isSelected = selectedBackgroundId === backgroundId;
        return (
          <button
            key={backgroundId}
            type="button"
            onClick={() => onSelectBackground?.(backgroundId)}
            className={cn(
              "tap-target relative overflow-hidden rounded-[28px] transition-all active:scale-[0.99]",
              isSelected ? "ring-2 ring-black/10" : ""
            )}
          >
            <img
              src={backgroundId}
              alt={`${format} background ${index + 1}`}
              className="aspect-[4/5] w-full object-cover"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute left-2.5 top-2.5 rounded-full bg-white/94 px-2.5 py-1 text-[10px] font-bold text-on-surface shadow-sm">
              {index + 1}
            </div>
            {isSelected && (
              <div className={cn("absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm", selectedThemeColor.accentSolid)}>
                <Check size={14} />
              </div>
            )}
          </button>
        );
      })}
    </div>

    {selectedBackgroundId && (
      <div className={cn(wizardSoftPanelClass, "p-3.5")}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[18px] bg-white">
            <img
              src={selectedBackgroundId}
              alt="Selected background preview"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <div>
            <p className="text-[13px] font-bold text-on-surface">Background selected</p>
            <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-ios-gray">You can still change it before you generate the match.</p>
          </div>
        </div>
      </div>
    )}

  </section>
);
