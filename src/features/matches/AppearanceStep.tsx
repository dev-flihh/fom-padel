import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat } from '../../types';

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
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  wizardSoftPanelClass,
  onSelectThemeColor,
  onSelectBackground
}: {
  format: MatchFormat;
  themeColors: readonly MatchThemeColorOption[];
  selectedThemeColor: MatchThemeColorOption;
  backgroundOptions: readonly string[];
  selectedBackgroundId: string | null;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  wizardSoftPanelClass: string;
  onSelectThemeColor: (themeColorId: string) => void;
  onSelectBackground?: (backgroundId: string) => void;
}) => (
  <section className="space-y-5">
    <div className={wizardHeadingClass}>
      <h2 className={wizardTitleClass}>Choose appearance.</h2>
      <p className={wizardSubtitleClass}>Set the color and background for the live match screen.</p>
    </div>

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
