import { type ElementType } from 'react';
import { Check, CircleHelp, Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type MatchFormat, type RankingCriteria, type ScoringType } from '../../types';

type FormatImpactCopy = Record<MatchFormat, {
  tagline: string;
  body: string;
  impact: string;
  icon: ElementType;
}>;

const clampNumericInput = (value: string, min: number, max: number) => {
  const parsed = Number(value.replace(/[^\d]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
};

export const FormatStep = ({
  format,
  criteria,
  scoringType,
  courts,
  numRounds,
  durationMinutes,
  points,
  structureSummaryLabel,
  formatImpactCopy,
  criteriaImpactCopy,
  scoringImpactCopy,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  onFormatChange,
  onCriteriaChange,
  onScoringTypeChange,
  onCourtsChange,
  onNumRoundsChange,
  onDurationMinutesChange,
  onPointsChange
}: {
  format: MatchFormat;
  criteria: RankingCriteria;
  scoringType: ScoringType;
  courts: number;
  numRounds: number;
  durationMinutes: number;
  points: number;
  structureSummaryLabel: string;
  formatImpactCopy: FormatImpactCopy;
  criteriaImpactCopy: Record<RankingCriteria, string>;
  scoringImpactCopy: Record<ScoringType, string>;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  onFormatChange: (value: MatchFormat) => void;
  onCriteriaChange: (value: RankingCriteria) => void;
  onScoringTypeChange: (value: ScoringType) => void;
  onCourtsChange: (value: number) => void;
  onNumRoundsChange: (value: number) => void;
  onDurationMinutesChange: (value: number) => void;
  onPointsChange: (value: number) => void;
}) => (
  <section className="space-y-6">
    <div className={wizardHeadingClass}>
      <h2 className={wizardTitleClass}>Choose a format</h2>
      <p className={wizardSubtitleClass}>Select how you’d like to play this match</p>
    </div>

    <div className="space-y-3">
      {(Object.keys(formatImpactCopy) as MatchFormat[]).map((value) => {
        const info = formatImpactCopy[value];
        const Icon = info.icon;
        const active = format === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onFormatChange(value)}
            className={cn(
              "tap-target w-full rounded-[24px] px-4 py-3.5 text-left transition-all active:scale-[0.99]",
              active ? "bg-[#fff5ef] ring-1 ring-primary/12" : "bg-ios-gray/[0.03]"
            )}
          >
            <div className="flex gap-3">
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px]",
                active ? "bg-primary text-white" : "bg-white text-on-surface/88"
              )}>
                <Icon size={19} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold tracking-[-0.025em] text-on-surface">{value}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-primary">{info.tagline}</p>
                  </div>
                  {active && (
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <Check size={12} strokeWidth={2.8} />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[12px] font-medium leading-[1.5] text-ios-gray">
                  {info.body} {info.impact}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>

    <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
      <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Winner ranking</p>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] bg-white/70 p-1">
        {(['Matches Won', 'Points Won'] as RankingCriteria[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onCriteriaChange(value)}
            className={cn(
              "h-11 rounded-[16px] text-[13px] font-semibold transition-all",
              criteria === value ? "bg-primary text-white" : "text-on-surface"
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="mt-3 flex gap-2 rounded-[18px] bg-[#fff8f2] px-3 py-2.5 text-[12px] font-medium leading-[1.55] text-[#8a3b12]">
        <CircleHelp size={14} className="mt-0.5 shrink-0" />
        {criteriaImpactCopy[criteria]}
      </p>
    </div>

    {format === 'Match Play' && (
      <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Deuce method</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] bg-white/70 p-1">
          {(['Golden Point', 'Advantage'] as ScoringType[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onScoringTypeChange(value)}
              className={cn(
                "h-11 rounded-[16px] text-[13px] font-semibold transition-all",
                scoringType === value ? "bg-primary text-white" : "text-on-surface"
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] font-medium leading-[1.55] text-ios-gray">{scoringImpactCopy[scoringType]}</p>
      </div>
    )}

    <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Match structure</p>
          <p className="mt-0.5 text-[12px] font-medium text-ios-gray">Set courts, rounds, and points.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">{structureSummaryLabel}</span>
      </div>

      <div className="mt-4 space-y-3">
        {[
          {
            key: 'courts',
            label: 'Courts',
            value: courts,
            min: 1,
            max: 12,
            help: 'How many matches can run at the same time.',
            dec: () => onCourtsChange(Math.max(1, courts - 1)),
            inc: () => onCourtsChange(Math.min(12, courts + 1)),
            set: onCourtsChange
          },
          {
            key: 'rounds',
            label: 'Rounds',
            value: numRounds,
            min: 1,
            max: 30,
            help: 'How many times players rotate and play.',
            dec: () => onNumRoundsChange(Math.max(1, numRounds - 1)),
            inc: () => onNumRoundsChange(Math.min(30, numRounds + 1)),
            set: onNumRoundsChange
          },
          {
            key: 'duration',
            label: 'Duration',
            value: durationMinutes,
            suffix: 'min',
            min: 30,
            max: 360,
            help: 'Estimated total playing time for this session.',
            dec: () => onDurationMinutesChange(Math.max(30, durationMinutes - 15)),
            inc: () => onDurationMinutesChange(Math.min(360, durationMinutes + 15)),
            set: onDurationMinutesChange
          },
          {
            key: 'points',
            label: 'Points',
            value: format === 'Match Play' ? 'N/A' : points,
            min: 1,
            max: 99,
            help: format === 'Match Play'
              ? 'Not used in Match Play. This format uses tennis-style game scoring instead of a point target.'
              : 'Target total points for each game.',
            dec: () => onPointsChange(Math.max(1, points - 1)),
            inc: () => onPointsChange(Math.min(99, points + 1)),
            set: onPointsChange,
            disabled: format === 'Match Play'
          }
        ].map((item) => {
          const numericValue = typeof item.value === 'number' ? item.value : null;
          return (
            <div
              key={item.key}
              className={cn(
                "rounded-[20px] bg-white px-4 py-3.5",
                item.disabled && "bg-[#fbfbfd]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", item.disabled ? "text-ios-gray/82" : "text-on-surface")}>{item.label}</p>
                    {item.disabled && (
                      <span className="rounded-full bg-ios-gray/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-ios-gray">
                        Match Play
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] font-medium leading-[1.45] text-ios-gray">{item.help}</p>
                </div>
                <div className="flex shrink-0 items-center justify-center gap-2">
                  <button type="button" disabled={item.disabled} onClick={item.dec} className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-[#fbfbfd] text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)] disabled:opacity-35">
                    <Minus size={14} />
                  </button>
                  {numericValue === null ? (
                    <span className="min-w-10 text-center text-[20px] font-bold tracking-[-0.03em] text-ios-gray/70">{item.value}</span>
                  ) : (
                    <div className="flex items-baseline rounded-[12px] border border-transparent transition-all focus-within:border-primary/20 focus-within:bg-primary/[0.06] focus-within:ring-2 focus-within:ring-primary/10">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={item.min}
                        max={item.max}
                        value={numericValue}
                        disabled={item.disabled}
                        aria-label={`${item.label} value`}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => {
                          if (event.target.value.trim() === '') return;
                          const nextValue = clampNumericInput(event.target.value, item.min, item.max);
                          if (nextValue !== null) item.set(nextValue);
                        }}
                        className="h-9 w-12 bg-transparent text-center text-[20px] font-bold tracking-[-0.03em] text-on-surface outline-none disabled:text-ios-gray/70"
                      />
                      {'suffix' in item && item.suffix && (
                        <span className="-ml-1 pr-2 text-[11px] font-bold text-ios-gray">{item.suffix}</span>
                      )}
                    </div>
                  )}
                  <button type="button" disabled={item.disabled} onClick={item.inc} className="tap-target flex h-8 w-8 items-center justify-center rounded-full bg-[#fbfbfd] text-on-surface shadow-[0_1px_3px_rgba(17,24,39,0.08)] disabled:opacity-35">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
