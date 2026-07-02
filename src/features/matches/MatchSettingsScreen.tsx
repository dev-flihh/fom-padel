import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { auth } from '../../firebase';
import { type AppNotification, type Player, type Tournament } from '../../types';
import { MATCH_THEME_COLORS } from '../tournaments/matchTheme';
import { AddPlayerModal } from './AddPlayerModal';
import { AppearanceStep } from './AppearanceStep';
import { FormatStep } from './FormatStep';
import { MatchInfoStep } from './MatchInfoStep';
import { MatchSettingsWizardShell } from './MatchSettingsWizardShell';
import { PlayersStep } from './PlayersStep';
import { ReviewStep } from './ReviewStep';
import { useCourtSearch } from './useCourtSearch';
import { useMatchBackgroundSelection } from './useMatchBackgroundSelection';
import { useMatchSettingsDraft } from './useMatchSettingsDraft';
import { useMatchSettingsFriends } from './useMatchSettingsFriends';
import { useMatchSettingsPlayers } from './useMatchSettingsPlayers';
import { useMatchSettingsRosterSync } from './useMatchSettingsRosterSync';
import { useMatchSettingsWizard } from './useMatchSettingsWizard';
import { dedupePlayersById, sortPlayersByName } from './matchSetupUtils';
import { CRITERIA_IMPACT_COPY, FORMAT_IMPACT_COPY, MATCH_SETTINGS_WIZARD_STEPS, SCORING_IMPACT_COPY } from './matchSettingsCopy';
import { getMatchSettingsSummary } from './matchSettingsSummary';
import { MATCH_SETTINGS_WIZARD_CLASSNAMES } from './matchSettingsStyles';

export const MatchSettingsScreen = ({
  onBack,
  onGenerate,
  onOpenFriends,
  tournament,
  setTournament,
  allPlayers,
  setAllPlayers,
  onAddNotification,
  currentUser,
  focusSection,
  onFocusHandled,
  wizardStep,
  onWizardStepChange,
  selectedBackgroundId,
  onSelectBackground
}: {
  onBack: () => void;
  onGenerate: (t: Tournament) => void;
  onOpenFriends: () => void;
  tournament: Tournament;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  allPlayers: Player[];
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  onAddNotification: (title: string, message: string, type: AppNotification['type']) => void;
  currentUser: any;
  focusSection?: 'players' | null;
  onFocusHandled?: () => void;
  wizardStep?: number;
  onWizardStepChange?: (step: number) => void;
  selectedBackgroundId?: string | null;
  onSelectBackground?: (backgroundId: string) => void;
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const settingsUserUid = auth.currentUser?.uid || currentUser?.uid;
  const currentUserPlayer = useMemo<Player | null>(() => {
    const uid = String(settingsUserUid || '').trim();
    if (!uid) return null;
    const displayName = (
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split('@')[0] ||
      'You'
    ).trim();
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map((namePart: string) => namePart[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME';

    return {
      id: uid,
      name: displayName,
      rating: Number(currentUser?.mmr || 0),
      source: 'fom',
      avatar: currentUser?.photoURL || auth.currentUser?.photoURL || '',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
    };
  }, [
    currentUser?.displayName,
    currentUser?.email,
    currentUser?.mmr,
    currentUser?.photoURL,
    settingsUserUid,
  ]);
  const { friends, loadingFriends } = useMatchSettingsFriends(settingsUserUid);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const {
    location,
    courtQuery,
    courtSuggestions,
    isSearchingCourts,
    courtSearchError,
    showCourtSuggestions,
    setShowCourtSuggestions,
    handleCourtQueryChange,
    handleSelectCourtSuggestion
  } = useCourtSearch({
    initialLocation: tournament.location,
    googleMapsApiKey
  });
  const playersSectionRef = useRef<HTMLElement | null>(null);
  const {
    selectedPlayers,
    availablePlayers,
    togglePlayer,
    addPlayer
  } = useMatchSettingsPlayers({
    tournamentPlayers: tournament.players || [],
    allPlayers,
    setAllPlayers,
    setTournament
  });
  const effectiveSelectedPlayers = useMemo(
    () => dedupePlayersById(currentUserPlayer ? [currentUserPlayer, ...selectedPlayers] : selectedPlayers),
    [currentUserPlayer, selectedPlayers]
  );
  const effectiveSortedSelectedPlayers = useMemo(
    () => sortPlayersByName(effectiveSelectedPlayers),
    [effectiveSelectedPlayers]
  );
  const effectiveAvailablePlayers = useMemo(() => {
    const selectedIds = new Set(effectiveSelectedPlayers.map((player) => player.id));
    return availablePlayers.filter((player) => !selectedIds.has(player.id));
  }, [availablePlayers, effectiveSelectedPlayers]);
  useMatchSettingsRosterSync({
    currentUser,
    currentUserUid: settingsUserUid,
    friends,
    setAllPlayers,
    setTournament
  });
  const {
    format,
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
    selectedThemeColor,
    venueDisplayLabel,
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
    selectThemeColor,
    handleGenerate
  } = useMatchSettingsDraft({
    tournament,
    setTournament,
    selectedPlayers: effectiveSelectedPlayers,
    location,
    selectedBackgroundId,
    onGenerate
  });

  useEffect(() => {
    if (focusSection !== 'players') return;

    const scrollId = window.setTimeout(() => {
      playersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onFocusHandled?.();
    }, 80);

    return () => window.clearTimeout(scrollId);
  }, [focusSection, onFocusHandled]);

  const handleAddPlayer = (newPlayer: Player) => {
    addPlayer(newPlayer);
    setIsAddModalOpen(false);
    onAddNotification('New Player!', `${newPlayer.name} has been added to the player list.`, 'system');
  };
  const handleTogglePlayer = (player: Player) => {
    if (player.id === settingsUserUid) return;
    togglePlayer(player);
  };

  const {
    isReady,
    missingPlayersCount,
    structureSummaryLabel,
    reviewStructureLabel
  } = getMatchSettingsSummary({
    format,
    courts,
    numRounds,
    durationMinutes,
    points,
    selectedPlayerCount: effectiveSelectedPlayers.length
  });
  const wizardSteps = MATCH_SETTINGS_WIZARD_STEPS;
  const {
    heading: wizardHeadingClass,
    title: wizardTitleClass,
    subtitle: wizardSubtitleClass,
    label: wizardLabelClass,
    field: wizardFieldClass,
    softPanel: wizardSoftPanelClass
  } = MATCH_SETTINGS_WIZARD_CLASSNAMES;
  const {
    settingsStep,
    currentWizardStep,
    wizardCtaLabel,
    wizardCtaDisabled,
    wizardStatusLabel,
    goToWizardStep,
    goToNextWizardStep
  } = useMatchSettingsWizard({
    controlledStep: wizardStep,
    onStepChange: onWizardStepChange,
    wizardSteps,
    isReady,
    missingPlayersCount,
    courts,
    selectedPlayerCount: effectiveSelectedPlayers.length,
    onComplete: handleGenerate
  });
  const { backgroundOptions, effectiveSelectedBackgroundId } = useMatchBackgroundSelection({
    selectedBackgroundId,
    onSelectBackground,
    enabled: true
  });

  return (
    <MatchSettingsWizardShell
      settingsStep={settingsStep}
      wizardSteps={wizardSteps}
      currentStepContext={currentWizardStep.context}
      ctaLabel={wizardCtaLabel}
      ctaDisabled={wizardCtaDisabled}
      statusLabel={wizardStatusLabel}
      showStatusLabel={settingsStep >= 2 && !isReady}
      onBack={onBack}
      onGoToStep={goToWizardStep}
      onNext={goToNextWizardStep}
      modalSlot={(
        <AnimatePresence>
          {isAddModalOpen && (
            <AddPlayerModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
              onAdd={handleAddPlayer}
            />
          )}
        </AnimatePresence>
      )}
    >
      {settingsStep === 0 && (
        <MatchInfoStep
          gameName={gameName}
          venueName={venueName}
          courtQuery={courtQuery}
          courtSuggestions={courtSuggestions}
          isSearchingCourts={isSearchingCourts}
          courtSearchError={courtSearchError}
          showCourtSuggestions={showCourtSuggestions}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardLabelClass={wizardLabelClass}
          wizardFieldClass={wizardFieldClass}
          onGameNameChange={setGameName}
          onVenueNameChange={setVenueName}
          onCourtQueryChange={handleCourtQueryChange}
          onCourtFocus={() => setShowCourtSuggestions(true)}
          onCourtBlur={() => {
            setTimeout(() => setShowCourtSuggestions(false), 150);
          }}
          onSelectCourtSuggestion={handleSelectCourtSuggestion}
        />
      )}

      {settingsStep === 1 && (
        <FormatStep
          format={format}
          criteria={criteria}
          scoringType={scoringType}
          courts={courts}
          numRounds={numRounds}
          durationMinutes={durationMinutes}
          points={points}
          structureSummaryLabel={structureSummaryLabel}
          formatImpactCopy={FORMAT_IMPACT_COPY}
          criteriaImpactCopy={CRITERIA_IMPACT_COPY}
          scoringImpactCopy={SCORING_IMPACT_COPY}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          onFormatChange={applyFormatChoice}
          onCriteriaChange={setCriteria}
          onScoringTypeChange={setScoringType}
          onCourtsChange={setCourts}
          onNumRoundsChange={setNumRounds}
          onDurationMinutesChange={setDurationMinutes}
          onPointsChange={setPoints}
        />
      )}

      {settingsStep === 2 && (
        <PlayersStep
          sectionRef={playersSectionRef}
          selectedPlayers={effectiveSortedSelectedPlayers}
          availablePlayers={effectiveAvailablePlayers}
          loadingFriends={loadingFriends}
          isReady={isReady}
          missingPlayersCount={missingPlayersCount}
          wizardStatusLabel={wizardStatusLabel}
          currentUserId={auth.currentUser?.uid || currentUser?.uid}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          onOpenFriends={onOpenFriends}
          onOpenAddPlayer={() => setIsAddModalOpen(true)}
          onTogglePlayer={handleTogglePlayer}
        />
      )}

      {settingsStep === 3 && (
        <AppearanceStep
          format={format}
          themeColors={MATCH_THEME_COLORS}
          selectedThemeColor={selectedThemeColor}
          backgroundOptions={backgroundOptions}
          selectedBackgroundId={effectiveSelectedBackgroundId}
          toxicModeEnabled={toxicModeEnabled}
          toxicIntensity={toxicIntensity}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardSoftPanelClass={wizardSoftPanelClass}
          onSelectThemeColor={selectThemeColor}
          onSelectBackground={onSelectBackground}
          onToxicModeChange={setToxicModeEnabled}
          onToxicIntensityChange={setToxicIntensity}
        />
      )}

      {settingsStep === 4 && (
        <ReviewStep
          venueDisplayLabel={venueDisplayLabel}
          format={format}
          formatIcon={FORMAT_IMPACT_COPY[format].icon}
          criteria={criteria}
          toxicModeEnabled={toxicModeEnabled}
          toxicIntensity={toxicIntensity}
          structureLabel={reviewStructureLabel}
          playerCount={effectiveSelectedPlayers.length}
          selectedThemeColor={selectedThemeColor}
          selectedBackgroundId={effectiveSelectedBackgroundId}
          isReady={isReady}
          wizardStatusLabel={wizardStatusLabel}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardSoftPanelClass={wizardSoftPanelClass}
          onToxicModeChange={setToxicModeEnabled}
          onToxicIntensityChange={setToxicIntensity}
          onGoToStep={goToWizardStep}
        />
      )}
    </MatchSettingsWizardShell>
  );
};
