import { useEffect, useState } from 'react';
import { searchCourtSuggestions, type CourtSuggestion } from './courtSearch';

export const useCourtSearch = ({
  initialLocation,
  googleMapsApiKey
}: {
  initialLocation?: string;
  googleMapsApiKey?: string;
}) => {
  const [location, setLocation] = useState(() => initialLocation || '');
  const [courtQuery, setCourtQuery] = useState(() => initialLocation || '');
  const [courtSuggestions, setCourtSuggestions] = useState<CourtSuggestion[]>([]);
  const [isSearchingCourts, setIsSearchingCourts] = useState(false);
  const [courtSearchError, setCourtSearchError] = useState('');
  const [showCourtSuggestions, setShowCourtSuggestions] = useState(false);
  const [googlePlacesBlocked, setGooglePlacesBlocked] = useState(false);

  useEffect(() => {
    const query = courtQuery.trim();
    setLocation(query);

    if (query.length < 3) {
      setCourtSuggestions([]);
      setCourtSearchError('');
      setIsSearchingCourts(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCourts(true);
      setCourtSearchError('');

      try {
        const { suggestions, googlePlacesBlocked: nextGooglePlacesBlocked } = await searchCourtSuggestions({
          query,
          googleMapsApiKey,
          googlePlacesBlocked
        });
        setCourtSuggestions(suggestions);
        if (nextGooglePlacesBlocked) setGooglePlacesBlocked(true);
      } catch (err) {
        console.error('Court autocomplete error:', err);
        setCourtSuggestions([]);
        setCourtSearchError('Court search is currently unavailable. Please try again shortly.');
      } finally {
        setIsSearchingCourts(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [courtQuery, googleMapsApiKey, googlePlacesBlocked]);

  const handleCourtQueryChange = (value: string) => {
    setCourtQuery(value);
    setShowCourtSuggestions(true);
  };

  const handleSelectCourtSuggestion = (suggestion: CourtSuggestion) => {
    setCourtQuery(suggestion.name);
    setLocation(suggestion.name);
    setShowCourtSuggestions(false);
    setCourtSuggestions([]);
  };

  return {
    location,
    courtQuery,
    courtSuggestions,
    isSearchingCourts,
    courtSearchError,
    showCourtSuggestions,
    setShowCourtSuggestions,
    handleCourtQueryChange,
    handleSelectCourtSuggestion
  };
};
