import { type ElementType } from 'react';
import { Camera, Circle, MapPin, Trophy, Users, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat, type RankingCriteria } from '../../types';

type ReviewThemeColor = {
  label: string;
  swatch: string;
};

export const ReviewStep = ({
  venueDisplayLabel,
  format,
  formatIcon,
  criteria,
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
  onGoToStep
}: {
  venueDisplayLabel: string;
  format: MatchFormat;
  formatIcon: ElementType;
  criteria: RankingCriteria;
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
  onGoToStep: (step: number) => void;
}) => {
  const summaryItems = [
    { icon: MapPin, label: 'Venue', value: venueDisplayLabel, step: 0 },
    { icon: formatIcon, label: 'Format', value: format, step: 1 },
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
              <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-ios-gray">This image will appear behind your live match layout.</p>
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
