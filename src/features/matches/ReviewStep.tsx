import { type ElementType } from 'react';
import { Camera, Check, Circle, Flame, MapPin, Trophy, Users, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat, type RankingCriteria, type ToxicIntensity } from '../../types';
import { TOXIC_INTENSITY_OPTIONS, getToxicIntensityLabel } from './toxicSettings';

type ReviewThemeColor = {
  label: string;
  swatch: string;
};

export const ReviewStep = ({
  venueDisplayLabel,
  format,
  formatIcon,
  partnerModeLabel,
  fixedTeamCount,
  criteria,
  toxicModeEnabled,
  toxicIntensity,
  structureLabel,
  playerCount,
  selectedThemeColor,
  selectedBackgroundId,
  isReady,
  wizardStatusLabel,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  wizardSoftPanelClass,
  onToxicModeChange,
  onToxicIntensityChange,
  onGoToStep
}: {
  venueDisplayLabel: string;
  format: MatchFormat;
  formatIcon: ElementType;
  partnerModeLabel: string;
  fixedTeamCount: number | null;
  criteria: RankingCriteria;
  toxicModeEnabled: boolean;
  toxicIntensity: ToxicIntensity;
  structureLabel: string;
  playerCount: number;
  selectedThemeColor: ReviewThemeColor;
  selectedBackgroundId: string | null;
  isReady: boolean;
  wizardStatusLabel: string;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  wizardSoftPanelClass: string;
  onToxicModeChange: (enabled: boolean) => void;
  onToxicIntensityChange: (value: ToxicIntensity) => void;
  onGoToStep: (step: number) => void;
}) => {
  const summaryItems = [
    { icon: MapPin, label: 'Venue', value: venueDisplayLabel, step: 0 },
    { icon: formatIcon, label: 'Format', value: format, step: 1 },
    {
      icon: Users,
      label: 'Partner',
      value: fixedTeamCount !== null ? `${partnerModeLabel} · ${fixedTeamCount} teams` : partnerModeLabel,
      step: 1
    },
    { icon: Trophy, label: 'Ranking', value: criteria, step: 1 },
    { icon: Zap, label: 'Structure', value: structureLabel, step: 1 },
    { icon: Users, label: 'Players', value: `${playerCount} players`, step: 2 },
    { icon: Circle, label: 'Color', value: selectedThemeColor.label, step: 3, swatch: selectedThemeColor.swatch },
    { icon: Camera, label: 'Background', value: selectedBackgroundId ? 'Selected' : 'Not selected', step: 3 }
  ];

  return (
    <section className="space-y-5">
      <div className={wizardHeadingClass}>
        <h2 className={wizardTitleClass}>Review setup.</h2>
        <p className={wizardSubtitleClass}>Everything is set. You can generate the match now.</p>
      </div>

      <div className={cn(wizardSoftPanelClass, "space-y-0 p-4")}>
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 border-b border-black/5 py-3.5 first:pt-0 last:border-b-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-white text-primary">
                {'swatch' in item ? (
                  <span className={cn("h-5 w-5 rounded-full", item.swatch)} />
                ) : (
                  <Icon size={17} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ios-gray">{item.label}</p>
                <p className="text-[15px] font-medium leading-[1.25] tracking-[-0.015em] text-on-surface">{item.value}</p>
              </div>
              <button
                type="button"
                onClick={() => onGoToStep(item.step)}
                className="tap-target shrink-0 px-1 text-[13px] font-bold text-primary"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>

      <div className={cn(wizardSoftPanelClass, "p-4")}>
        <button
          type="button"
          onClick={() => onToxicModeChange(!toxicModeEnabled)}
          className={cn(
            "tap-target flex w-full items-start gap-3 rounded-[22px] border p-3.5 text-left transition-all active:scale-[0.99]",
            toxicModeEnabled
              ? "border-orange-200 bg-[#fff4e8] shadow-[0_12px_24px_rgba(230,94,20,0.08)]"
              : "border-black/5 bg-white"
          )}
          aria-pressed={toxicModeEnabled}
        >
          <span className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px]",
            toxicModeEnabled ? "bg-primary text-white" : "bg-ios-gray/10 text-on-surface/72"
          )}>
            <Flame size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[14px] font-black tracking-[-0.015em] text-on-surface">Hall of Shame</span>
                <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                  {toxicModeEnabled ? `Enabled | ${getToxicIntensityLabel(toxicIntensity)}` : 'Off by default'}
                </span>
              </span>
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                toxicModeEnabled ? "border-primary bg-primary text-white" : "border-ios-gray/20 bg-white text-transparent"
              )}>
                <Check size={14} strokeWidth={3} />
              </span>
            </span>
            <span className="mt-2 block text-[12px] font-medium leading-[1.55] text-ios-gray">
              Adds a match-only roast tab in Klasemen. All banter stays about scores, losses, byes, and diff.
            </span>
          </span>
        </button>

        {toxicModeEnabled && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TOXIC_INTENSITY_OPTIONS.map((option) => {
              const isSelected = toxicIntensity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToxicIntensityChange(option.value)}
                  className={cn(
                    "tap-target min-h-[50px] rounded-[16px] border px-2 py-2 text-center transition-all active:scale-[0.98]",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-black/5 bg-white text-on-surface"
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="block text-[11.5px] font-black leading-tight">{option.label}</span>
                  <span className={cn("mt-0.5 block text-[9px] font-semibold leading-tight", isSelected ? "text-white/80" : "text-ios-gray")}>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedBackgroundId && (
        <div className={cn(wizardSoftPanelClass, "p-3.5")}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[18px] bg-white">
              <img
                src={selectedBackgroundId}
                alt="Background preview"
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-on-surface">Selected background</p>
              <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-ios-gray">Saved with this match for share assets and future visual options.</p>
            </div>
          </div>
        </div>
      )}

      {!isReady && (
        <div className="rounded-[24px] border border-primary/20 bg-primary/10 p-4">
          <p className="text-[13px] font-black text-on-surface">Not enough players</p>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-ios-gray">{wizardStatusLabel}</p>
          <button type="button" onClick={() => onGoToStep(2)} className="mt-3 h-11 rounded-2xl bg-primary px-4 text-[13px] font-black text-white">Add players</button>
        </div>
      )}
    </section>
  );
};
