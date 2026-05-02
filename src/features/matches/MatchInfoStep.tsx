import { ChevronRight, MapPin, RefreshCw, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type CourtSuggestion } from './courtSearch';

export const MatchInfoStep = ({
  gameName,
  venueName,
  courtQuery,
  courtSuggestions,
  isSearchingCourts,
  courtSearchError,
  showCourtSuggestions,
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
}) => (
  <section className="space-y-7">
    <div className={wizardHeadingClass}>
      <h2 className={wizardTitleClass}>Name your match.</h2>
      <p className={wizardSubtitleClass}>Where is this happening?</p>
    </div>

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
