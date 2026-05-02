import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { INITIAL_TOURNAMENT } from '../../constants';
import { type MatchFormat, type Player, type RankingCriteria, type ScoringType, type Tournament } from '../../types';
import { getDefaultMatchThemeColorId, getMatchThemeColor } from '../tournaments/matchTheme';

export const useMatchSettingsDraft = ({
  tournament,
  setTournament,
  selectedPlayers,
  location,
  selectedBackgroundId,
  onGenerate
}: {
  tournament: Tournament;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  selectedPlayers: Player[];
  location: string;
  selectedBackgroundId?: string | null;
  onGenerate: (tournament: Tournament) => void;
}) => {
  const [format, setFormat] = useState<MatchFormat>(tournament.format);
  const [selectedThemeColorId, setSelectedThemeColorId] = useState(() => tournament.themeColorId || getDefaultMatchThemeColorId(tournament.format));
  const hasCustomizedThemeColorRef = useRef(Boolean(tournament.themeColorId));
  const [criteria, setCriteria] = useState<RankingCriteria>(tournament.criteria);
  const [scoringType, setScoringType] = useState<ScoringType>(tournament.scoringType || 'Golden Point');
  const [courts, setCourts] = useState(tournament.courts);
  const [points, setPoints] = useState(tournament.totalPoints);
  const [numRounds, setNumRounds] = useState(tournament.numRounds || 5);
  const [gameName, setGameName] = useState(() => ((tournament.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (tournament.name || '')));
  const [venueName, setVenueName] = useState(() => tournament.venueName || '');

  useEffect(() => {
    const normalizedName = gameName;
    const normalizedVenue = venueName;
    const normalizedLocation = location.trim();

    setTournament((prev) => {
      const prevName = (prev.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (prev.name || '');
      const prevVenue = prev.venueName || '';
      const prevLocation = prev.location || '';
      const prevScoringType = prev.scoringType || 'Golden Point';

      if (
        prevName === normalizedName &&
        prev.format === format &&
        prev.themeColorId === selectedThemeColorId &&
        prev.criteria === criteria &&
        prevScoringType === scoringType &&
        prev.courts === courts &&
        prev.totalPoints === points &&
        prev.numRounds === numRounds &&
        prevVenue === normalizedVenue &&
        prevLocation === normalizedLocation
      ) {
        return prev;
      }

      return {
        ...prev,
        name: normalizedName,
        format,
        themeColorId: selectedThemeColorId,
        criteria,
        scoringType,
        courts,
        totalPoints: points,
        numRounds,
        venueName: normalizedVenue,
        location: normalizedLocation
      };
    });
  }, [gameName, venueName, location, format, selectedThemeColorId, criteria, scoringType, courts, points, numRounds, setTournament]);

  const applyFormatChoice = (value: MatchFormat) => {
    setFormat(value);
    if (!hasCustomizedThemeColorRef.current) {
      setSelectedThemeColorId(getDefaultMatchThemeColorId(value));
    }
    if (value === 'Americano') {
      setCriteria('Points Won');
      if (numRounds < 5) setNumRounds(5);
      if (points < 16) setPoints(21);
    } else if (value === 'Mexicano') {
      setCriteria('Matches Won');
      if (numRounds !== 8) setNumRounds(8);
      if (points !== 21) setPoints(21);
    } else {
      setCriteria('Matches Won');
      if (numRounds < 3) setNumRounds(3);
    }
  };

  const selectThemeColor = (themeColorId: string) => {
    hasCustomizedThemeColorRef.current = true;
    setSelectedThemeColorId(themeColorId);
  };

  const handleGenerate = () => {
    const updatedTournament: Tournament = {
      ...tournament,
      name: gameName.trim() || 'Padel Match',
      format,
      themeColorId: selectedThemeColorId,
      criteria,
      scoringType,
      courts,
      totalPoints: points,
      players: selectedPlayers,
      inactivePlayerIds: [],
      numRounds,
      venueName: venueName.trim(),
      location: location.trim(),
      backgroundId: selectedBackgroundId || tournament.backgroundId,
      rounds: []
    };
    onGenerate(updatedTournament);
  };

  return {
    format,
    criteria,
    scoringType,
    courts,
    points,
    numRounds,
    gameName,
    venueName,
    selectedThemeColor: getMatchThemeColor(format, selectedThemeColorId),
    venueDisplayLabel: [venueName.trim(), location.trim()].filter(Boolean).join(', ') || 'Venue not set',
    setCriteria,
    setScoringType,
    setCourts,
    setPoints,
    setNumRounds,
    setGameName,
    setVenueName,
    applyFormatChoice,
    selectThemeColor,
    handleGenerate
  };
};
