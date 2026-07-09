import { Bookmark, Check, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat, type RankingCriteria, type ToxicIntensity } from '../../types';
import { TOXIC_INTENSITY_OPTIONS, getToxicIntensityLabel } from './toxicSettings';

// Review compact (feedback v2.1): 4 baris ringkasan tanpa icon box + satu
// panel opsi — meminimalkan scroll di langkah terakhir.
export const ReviewStep = ({
  venueDisplayLabel,
  format,
  partnerModeLabel,
  fixedTeamCount,
  criteria,
  toxicModeEnabled,
  toxicIntensity,
  structureLabel,
  playerCount,
  isReady,
  wizardStatusLabel,
  saveAsTemplate,
  templateName,
  templateNamePlaceholder,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  wizardSoftPanelClass,
  onToxicModeChange,
  onToxicIntensityChange,
  onSaveAsTemplateChange,
  onTemplateNameChange,
  onGoToStep
}: {
  venueDisplayLabel: string;
  format: MatchFormat;
  partnerModeLabel: string;
  fixedTeamCount: number | null;
  criteria: RankingCriteria;
  toxicModeEnabled: boolean;
  toxicIntensity: ToxicIntensity;
  structureLabel: string;
  playerCount: number;
  isReady: boolean;
  wizardStatusLabel: string;
  saveAsTemplate: boolean;
  templateName: string;
  templateNamePlaceholder: string;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  wizardSoftPanelClass: string;
  onToxicModeChange: (enabled: boolean) => void;
  onToxicIntensityChange: (value: ToxicIntensity) => void;
  onSaveAsTemplateChange: (enabled: boolean) => void;
  onTemplateNameChange: (value: string) => void;
  onGoToStep: (step: number) => void;
}) => {
  const summaryItems = [
    { label: 'Venue', value: venueDisplayLabel, step: 0 },
    {
      label: 'Format',
      value: [
        format,
        fixedTeamCount !== null ? `${partnerModeLabel} · ${fixedTeamCount} teams` : partnerModeLabel,
        criteria
      ].join(' · '),
      step: 1
    },
    { label: 'Structure', value: structureLabel, step: 1 },
    {
      label: 'Players',
      value: `${playerCount} player${playerCount !== 1 ? 's' : ''}`,
      step: 2
    }
  ];

  return (
    <section className="space-y-4">
      <div className={wizardHeadingClass}>
        <h2 className={wizardTitleClass}>Review setup.</h2>
        <p className={wizardSubtitleClass}>Everything is set. You can generate the match now.</p>
      </div>

      <div className={cn(wizardSoftPanelClass, "space-y-0 px-4 py-1.5")}>
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3 border-b border-black/5 py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ios-gray">{item.label}</p>
              <p className="text-[14px] font-medium leading-[1.35] tracking-[-0.015em] text-on-surface">{item.value}</p>
            </div>
            <button
              type="button"
              onClick={() => onGoToStep(item.step)}
              className="tap-target shrink-0 px-1 text-[13px] font-bold text-primary"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <div className={cn(wizardSoftPanelClass, "space-y-2 p-2.5")}>
        <div className={cn(
          "rounded-[18px] border transition-all",
          toxicModeEnabled ? "border-orange-200 bg-[#fff4e8]" : "border-black/5 bg-white"
        )}>
          <button
            type="button"
            onClick={() => onToxicModeChange(!toxicModeEnabled)}
            className="tap-target flex w-full items-center gap-3 p-3 text-left active:scale-[0.99]"
            aria-pressed={toxicModeEnabled}
          >
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]",
              toxicModeEnabled ? "bg-primary text-white" : "bg-ios-gray/10 text-on-surface/72"
            )}>
              <Flame size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black tracking-[-0.015em] text-on-surface">Hall of Shame</span>
              <span className="block text-[12px] font-medium text-ios-gray">
                {toxicModeEnabled ? `Roast tab on · ${getToxicIntensityLabel(toxicIntensity)}` : 'Optional roast tab in standings'}
              </span>
            </span>
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              toxicModeEnabled ? "border-primary bg-primary text-white" : "border-ios-gray/20 bg-white text-transparent"
            )}>
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
          {toxicModeEnabled && (
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
              {TOXIC_INTENSITY_OPTIONS.map((option) => {
                const isSelected = toxicIntensity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToxicIntensityChange(option.value)}
                    className={cn(
                      "tap-target h-9 rounded-full border text-[11.5px] font-black transition-all active:scale-[0.98]",
                      isSelected ? "border-primary bg-primary text-white" : "border-black/5 bg-white text-on-surface"
                    )}
                    aria-pressed={isSelected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={cn(
          "rounded-[18px] border transition-all",
          saveAsTemplate ? "border-primary/30 bg-primary/[0.05]" : "border-black/5 bg-white"
        )}>
          <button
            type="button"
            onClick={() => onSaveAsTemplateChange(!saveAsTemplate)}
            className="tap-target flex w-full items-center gap-3 p-3 text-left active:scale-[0.99]"
            aria-pressed={saveAsTemplate}
          >
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]",
              saveAsTemplate ? "bg-primary text-white" : "bg-ios-gray/10 text-on-surface/72"
            )}>
              <Bookmark size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black tracking-[-0.015em] text-on-surface">Save as template</span>
              <span className="block text-[12px] font-medium text-ios-gray">Reusable from Quick start next time.</span>
            </span>
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              saveAsTemplate ? "border-primary bg-primary text-white" : "border-ios-gray/20 bg-white text-transparent"
            )}>
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
          {saveAsTemplate && (
            <div className="px-3 pb-3">
              <input
                type="text"
                value={templateName}
                onChange={(event) => onTemplateNameChange(event.target.value)}
                placeholder={templateNamePlaceholder}
                aria-label="Template name"
                className="h-11 w-full rounded-[12px] border border-ios-gray/16 bg-white px-3.5 text-[14px] font-semibold text-on-surface outline-none transition-colors focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {!isReady && (
        <div className="rounded-[20px] border border-primary/20 bg-primary/10 p-3.5">
          <p className="text-[13px] font-black text-on-surface">Not enough players</p>
          <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-ios-gray">{wizardStatusLabel}</p>
          <button type="button" onClick={() => onGoToStep(2)} className="mt-2.5 h-10 rounded-2xl bg-primary px-4 text-[13px] font-black text-white">Add players</button>
        </div>
      )}
    </section>
  );
};
