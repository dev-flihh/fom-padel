import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
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
    sortedSelectedPlayers,
    availablePlayers,
    togglePlayer,
    addPlayer
  } = useMatchSettingsPlayers({
    tournamentPlayers: tournament.players || [],
    allPlayers,
    setAllPlayers,
    setTournament
  });
  useMatchSettingsRosterSync({
    currentUser,
    currentUserUid: settingsUserUid,
    friends,
    setAllPlayers
  });
  const {
    format,
    criteria,
    scoringType,
    courts,
    points,
    numRounds,
    gameName,
    venueName,
    selectedThemeColor,
    venueDisplayLabel,
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
  } = useMatchSettingsDraft({
    tournament,
    setTournament,
    selectedPlayers,
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

  const {
    isReady,
    missingPlayersCount,
    structureSummaryLabel,
    reviewStructureLabel
  } = getMatchSettingsSummary({
    format,
    courts,
    numRounds,
    points,
    selectedPlayerCount: selectedPlayers.length
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
    selectedPlayerCount: selectedPlayers.length,
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
          onPointsChange={setPoints}
        />
      )}

      {settingsStep === 2 && (
        <PlayersStep
          sectionRef={playersSectionRef}
          selectedPlayers={sortedSelectedPlayers}
          availablePlayers={availablePlayers}
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
          onTogglePlayer={togglePlayer}
        />
      )}

      {settingsStep === 3 && (
        <AppearanceStep
          format={format}
          themeColors={MATCH_THEME_COLORS}
          selectedThemeColor={selectedThemeColor}
          backgroundOptions={backgroundOptions}
          selectedBackgroundId={effectiveSelectedBackgroundId}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardSoftPanelClass={wizardSoftPanelClass}
          onSelectThemeColor={selectThemeColor}
          onSelectBackground={onSelectBackground}
        />
      )}

      {settingsStep === 4 && (
        <ReviewStep
          venueDisplayLabel={venueDisplayLabel}
          format={format}
          formatIcon={FORMAT_IMPACT_COPY[format].icon}
          criteria={criteria}
          structureLabel={reviewStructureLabel}
          playerCount={selectedPlayers.length}
          selectedThemeColor={selectedThemeColor}
          selectedBackgroundId={effectiveSelectedBackgroundId}
          isReady={isReady}
          wizardStatusLabel={wizardStatusLabel}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardSoftPanelClass={wizardSoftPanelClass}
          onGoToStep={goToWizardStep}
        />
      )}
    </MatchSettingsWizardShell>
  );
};
