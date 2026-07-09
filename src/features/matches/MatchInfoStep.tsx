import { useState } from 'react';
import { Bookmark, ChevronRight, MapPin, RefreshCw, Repeat2, Search, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type CourtSuggestion } from './courtSearch';

// Quick start pola A4 (PRD Match Creation v2 §5.1): satu banner "Repeat last
// match" + link template di atas form. Form tetap jalur default — banner satu
// baris satu aksi, bukan section yang bersaing dengan form (R1.5).
export type MatchInfoQuickStart = {
  repeatLabel: string;
  repeatContext: string;
  templates: { id: string; name: string; label: string }[];
  onUseRepeat: () => void;
  onUseTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
} | null;

export const MatchInfoStep = ({
  gameName,
  venueName,
  courtQuery,
  courtSuggestions,
  isSearchingCourts,
  courtSearchError,
  showCourtSuggestions,
  quickStart,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  wizardLabelClass,
  wizardFieldClass,
  onGameNameChange,
  onVenueNameChange,
  onCourtQueryChange,
  onCourtFocus,
  onCourtBlur,
  onSelectCourtSuggestion
}: {
  gameName: string;
  venueName: string;
  courtQuery: string;
  courtSuggestions: CourtSuggestion[];
  isSearchingCourts: boolean;
  courtSearchError: string;
  showCourtSuggestions: boolean;
  quickStart?: MatchInfoQuickStart;
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  wizardLabelClass: string;
  wizardFieldClass: string;
  onGameNameChange: (value: string) => void;
  onVenueNameChange: (value: string) => void;
  onCourtQueryChange: (value: string) => void;
  onCourtFocus: () => void;
  onCourtBlur: () => void;
  onSelectCourtSuggestion: (suggestion: CourtSuggestion) => void;
}) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const hasRepeat = Boolean(quickStart?.repeatLabel);
  const templates = quickStart?.templates || [];

  return (
    <section className="space-y-7">
      <div className={wizardHeadingClass}>
        <h2 className={wizardTitleClass}>Name your match.</h2>
        <p className={wizardSubtitleClass}>Where is this happening?</p>
      </div>

      {quickStart && (hasRepeat || templates.length > 0) && (
        <div className="space-y-2">
          {hasRepeat && (
            <div className="flex items-center gap-3 rounded-[18px] border border-primary/[0.18] bg-primary/[0.06] px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                <Repeat2 size={16} strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold tracking-[-0.015em] text-on-surface">Repeat last match?</span>
                <span className="block text-[12px] font-medium leading-[1.45] text-ios-gray">{quickStart.repeatLabel}</span>
                {quickStart.repeatContext && (
                  <span className="block text-[12px] font-medium leading-[1.45] text-ios-gray/80">{quickStart.repeatContext}</span>
                )}
              </span>
              <button
                type="button"
                onClick={quickStart.onUseRepeat}
                className="tap-target shrink-0 rounded-full bg-primary px-4 py-2 text-[13px] font-extrabold text-white active:scale-[0.97]"
              >
                Use
              </button>
            </div>
          )}

          {templates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTemplates((prev) => !prev)}
              className="tap-target flex items-center gap-1 px-1 text-[12px] font-bold text-primary"
              aria-expanded={showTemplates}
            >
              {hasRepeat ? 'Start from a template instead' : 'Start from a template'}
              <ChevronRight size={13} strokeWidth={2.6} className={cn("transition-transform", showTemplates && "rotate-90")} />
            </button>
          )}

          {showTemplates && templates.length > 0 && (
            <div className="overflow-hidden rounded-[18px] border border-ios-gray/[0.14] bg-white">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-3 border-b border-ios-gray/10 px-3.5 py-3 last:border-b-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-ios-gray/[0.08] text-on-surface">
                    <Bookmark size={15} strokeWidth={2.1} />
                  </span>
                  <button
                    type="button"
                    onClick={() => quickStart.onUseTemplate(template.id)}
                    className="tap-target min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[14px] font-bold tracking-[-0.015em] text-on-surface">{template.name}</span>
                    <span className="block truncate text-[12px] font-medium text-ios-gray">{template.label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete template ${template.name}`}
                    onClick={() => quickStart.onDeleteTemplate(template.id)}
                    className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ios-gray/70"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <label className="block">
          <span className={wizardLabelClass}>Match Name</span>
          <input
            type="text"
            value={gameName}
            onChange={(e) => onGameNameChange(e.target.value)}
            placeholder="Friday Padel Match"
            className={cn(wizardFieldClass, 'outline-none placeholder:font-normal placeholder:text-on-surface/40')}
          />
        </label>

        <label className="block">
          <span className={wizardLabelClass}>Venue</span>
          <div className={cn(wizardFieldClass, 'gap-3.5')}>
            <MapPin size={20} strokeWidth={2.1} className="shrink-0 text-on-surface/38" />
            <input
              type="text"
              value={venueName}
              onChange={(e) => onVenueNameChange(e.target.value)}
              placeholder="Star Padel Karawaci"
              className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-on-surface/40"
            />
          </div>
        </label>

        <div className="relative block">
          <span className={wizardLabelClass}>City / Area</span>
          <label className={cn(wizardFieldClass, 'pr-4')}>
            <input
              type="text"
              value={courtQuery}
              onChange={(e) => onCourtQueryChange(e.target.value)}
              onFocus={onCourtFocus}
              onBlur={onCourtBlur}
              placeholder="Tangerang"
              className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-on-surface/40"
            />
            <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 rotate-90 text-on-surface/38" />
          </label>

          {showCourtSuggestions && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[22px] bg-white shadow-xl ring-1 ring-black/5">
              {!isSearchingCourts && !courtSearchError && courtQuery.trim().length < 3 && (
                <div className="flex items-center gap-2 px-4 py-3 text-[12px] font-medium text-ios-gray">
                  <Search size={14} />
                  Type at least 3 letters.
                </div>
              )}
              {isSearchingCourts && (
                <div className="flex items-center gap-2 px-4 py-3 text-[12px] font-medium text-ios-gray">
                  <RefreshCw size={14} className="animate-spin" />
                  Searching places...
                </div>
              )}
              {courtSearchError && (
                <div className="px-4 py-3 text-[12px] font-medium text-error">{courtSearchError}</div>
              )}
              {!isSearchingCourts && !courtSearchError && courtSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onSelectCourtSuggestion(suggestion)}
                  className="w-full border-b border-ios-gray/10 px-4 py-3 text-left last:border-b-0"
                >
                  <p className="truncate text-[13px] font-bold text-on-surface">{suggestion.name}</p>
                  {suggestion.address && <p className="truncate text-[11px] text-ios-gray">{suggestion.address}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
