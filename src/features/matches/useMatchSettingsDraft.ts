import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { INITIAL_TOURNAMENT } from '../../constants';
import { type FixedTeam, type MatchFormat, type PartnerMode, type Player, type RankingCriteria, type ScoringType, type ToxicIntensity, type Tournament } from '../../types';
import { getDefaultMatchThemeColorId, getMatchThemeColor } from '../tournaments/matchTheme';
import { normalizeToxicIntensity } from './toxicSettings';
import { areFixedTeamsEqual, reconcileFixedTeams, sanitizeFixedTeams, swapFixedTeamMembers } from './partnerMode';

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
  const [partnerMode, setPartnerMode] = useState<PartnerMode>(tournament.partnerMode === 'fixed' ? 'fixed' : 'rotating');
  const [fixedTeams, setFixedTeams] = useState<FixedTeam[]>(tournament.fixedTeams || []);
  const [selectedThemeColorId, setSelectedThemeColorId] = useState(() => tournament.themeColorId || getDefaultMatchThemeColorId(tournament.format));
  const hasCustomizedThemeColorRef = useRef(Boolean(tournament.themeColorId));
  const [toxicModeEnabled, setToxicModeEnabled] = useState(Boolean(tournament.toxicModeEnabled));
  const [toxicIntensity, setToxicIntensity] = useState<ToxicIntensity>(() => normalizeToxicIntensity(tournament.toxicIntensity));
  const [criteria, setCriteria] = useState<RankingCriteria>(tournament.criteria);
  const [scoringType, setScoringType] = useState<ScoringType>(tournament.scoringType || 'Golden Point');
  const [courts, setCourts] = useState(tournament.courts);
  const [points, setPoints] = useState(tournament.totalPoints);
  const [numRounds, setNumRounds] = useState(tournament.numRounds || 5);
  const [durationMinutes, setDurationMinutes] = useState(tournament.durationMinutes || 120);
  const [gameName, setGameName] = useState(() => ((tournament.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (tournament.name || '')));
  const [venueName, setVenueName] = useState(() => tournament.venueName || '');

  useEffect(() => {
    const normalizedName = gameName;
    const normalizedVenue = venueName;
    const normalizedLocation = location.trim();
    const normalizedToxicIntensity = normalizeToxicIntensity(toxicIntensity);

    setTournament((prev) => {
      const prevName = (prev.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (prev.name || '');
      const prevVenue = prev.venueName || '';
      const prevLocation = prev.location || '';
      const prevScoringType = prev.scoringType || 'Golden Point';

      const prevPartnerMode: PartnerMode = prev.partnerMode === 'fixed' ? 'fixed' : 'rotating';
      if (
        prevName === normalizedName &&
        prev.format === format &&
        prevPartnerMode === partnerMode &&
        areFixedTeamsEqual(prev.fixedTeams || [], fixedTeams) &&
        prev.themeColorId === selectedThemeColorId &&
        Boolean(prev.toxicModeEnabled) === toxicModeEnabled &&
        normalizeToxicIntensity(prev.toxicIntensity) === normalizedToxicIntensity &&
        prev.criteria === criteria &&
        prevScoringType === scoringType &&
        prev.courts === courts &&
        prev.totalPoints === points &&
        prev.numRounds === numRounds &&
        prev.durationMinutes === durationMinutes &&
        prevVenue === normalizedVenue &&
        prevLocation === normalizedLocation
      ) {
        return prev;
      }

      return {
        ...prev,
        name: normalizedName,
        format,
        partnerMode,
        fixedTeams,
        themeColorId: selectedThemeColorId,
        toxicModeEnabled,
        toxicIntensity: normalizedToxicIntensity,
        criteria,
        scoringType,
        courts,
        totalPoints: points,
        numRounds,
        durationMinutes,
        venueName: normalizedVenue,
        location: normalizedLocation
      };
    });
  }, [gameName, venueName, location, format, partnerMode, fixedTeams, selectedThemeColorId, toxicModeEnabled, toxicIntensity, criteria, scoringType, courts, points, numRounds, durationMinutes, setTournament]);

  // Mode fixed: jaga fixedTeams tetap sinkron dengan daftar pemain terpilih —
  // tim yang sudah dibentuk dipertahankan, pemain baru di-auto-pair.
  useEffect(() => {
    if (partnerMode !== 'fixed') return;
    setFixedTeams((prev) => {
      const next = reconcileFixedTeams(selectedPlayers, prev);
      return areFixedTeamsEqual(prev, next) ? prev : next;
    });
  }, [partnerMode, selectedPlayers]);

  const applyPartnerModeChoice = (value: PartnerMode) => {
    setPartnerMode(value);
  };

  const swapFixedTeamPlayers = (playerIdA: string, playerIdB: string) => {
    setFixedTeams((prev) => swapFixedTeamMembers(prev, playerIdA, playerIdB));
  };

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
      partnerMode,
      fixedTeams: partnerMode === 'fixed' ? sanitizeFixedTeams(selectedPlayers, fixedTeams) : [],
      themeColorId: selectedThemeColorId,
      toxicModeEnabled,
      toxicIntensity: normalizeToxicIntensity(toxicIntensity),
      criteria,
      scoringType,
      courts,
      totalPoints: points,
      players: selectedPlayers,
      inactivePlayerIds: [],
      numRounds,
      durationMinutes,
      venueName: venueName.trim(),
      location: location.trim(),
      backgroundId: selectedBackgroundId || tournament.backgroundId,
      rounds: []
    };
    onGenerate(updatedTournament);
  };

  return {
    format,
    partnerMode,
    fixedTeams,
    toxicModeEnabled,
    toxicIntensity,
    criteria,
    scoringType,
    courts,
    points,
    numRounds,
    durationMinutes,
    gameName,
    venueName,
    selectedThemeColor: getMatchThemeColor(format, selectedThemeColorId),
    venueDisplayLabel: [venueName.trim(), location.trim()].filter(Boolean).join(', ') || 'Venue not set',
    setCriteria,
    setToxicModeEnabled,
    setToxicIntensity,
    setScoringType,
    setCourts,
    setPoints,
    setNumRounds,
    setDurationMinutes,
    setGameName,
    setVenueName,
    applyFormatChoice,
    applyPartnerModeChoice,
    swapFixedTeamPlayers,
    selectThemeColor,
    handleGenerate
  };
};
