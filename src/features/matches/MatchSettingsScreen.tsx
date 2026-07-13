import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { auth } from '../../firebase';
import { type AppNotification, type Player, type Tournament, type TournamentHistory } from '../../types';
import {
  buildDraftFromHistory,
  buildDraftFromTemplate,
  buildTemplateFromSettings,
  describeQuickStartContext,
  findRepeatableHistory,
  summarizeQuickStartSource,
  type MatchTemplate
} from '../tournaments/quickStart';
import { deleteMatchTemplate, listMatchTemplates, saveMatchTemplate } from '../../services/matchTemplatesRepository';
import { FormatStep } from './FormatStep';
import { MatchInfoStep, type MatchInfoQuickStart } from './MatchInfoStep';
import { MatchSettingsWizardShell } from './MatchSettingsWizardShell';
import { PlayersStep } from './PlayersStep';
import { ReviewStep } from './ReviewStep';
import { useCourtSearch } from './useCourtSearch';
import { useMatchSettingsDraft } from './useMatchSettingsDraft';
import { useMatchSettingsFriends } from './useMatchSettingsFriends';
import { useMatchSettingsPlayers } from './useMatchSettingsPlayers';
import { useMatchSettingsRosterSync } from './useMatchSettingsRosterSync';
import { useMatchSettingsWizard } from './useMatchSettingsWizard';
import { dedupePlayersById, sortPlayersByName } from './matchSetupUtils';
import { CRITERIA_IMPACT_COPY, FORMAT_IMPACT_COPY, MATCH_SETTINGS_WIZARD_STEPS, PARTNER_MODE_IMPACT_COPY, PARTNER_MODE_LABELS, SCORING_IMPACT_COPY } from './matchSettingsCopy';
import { getMatchSettingsSummary } from './matchSettingsSummary';
import { describeMatchPlayMode, getMatchPlayConfig } from './tennisScoring';
import { MATCH_SETTINGS_WIZARD_CLASSNAMES } from './matchSettingsStyles';

export const MatchSettingsScreen = ({
  onBack,
  onGenerate,
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
  historyTournaments,
  onApplyQuickStart
}: {
  onBack: () => void;
  onGenerate: (t: Tournament) => void;
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
  historyTournaments?: TournamentHistory[];
  onApplyQuickStart?: (draft: Tournament) => void;
}) => {
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

  // Quick start (PRD v2 §5.1, pola A4): repeat match terakhir + template.
  const [templates, setTemplates] = useState<MatchTemplate[]>([]);
  useEffect(() => {
    setTemplates(listMatchTemplates(settingsUserUid));
  }, [settingsUserUid]);
  const repeatableHistory = useMemo(
    () => findRepeatableHistory(historyTournaments || []),
    [historyTournaments]
  );
  const quickStart = useMemo<MatchInfoQuickStart>(() => {
    if (!onApplyQuickStart) return null;
    if (!repeatableHistory && templates.length === 0) return null;
    return {
      repeatLabel: repeatableHistory ? summarizeQuickStartSource(repeatableHistory) : '',
      repeatContext: repeatableHistory
        ? describeQuickStartContext({
            venueName: repeatableHistory.venueName,
            location: repeatableHistory.location,
            date: repeatableHistory.date
          })
        : '',
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        label: summarizeQuickStartSource(template)
      })),
      onUseRepeat: () => {
        if (!repeatableHistory) return;
        onApplyQuickStart(buildDraftFromHistory(repeatableHistory));
        onAddNotification('Setup applied', 'Every step is pre-filled from your last match. Review and adjust as needed.', 'system');
      },
      onUseTemplate: (templateId: string) => {
        const template = templates.find((item) => item.id === templateId);
        if (!template) return;
        onApplyQuickStart(buildDraftFromTemplate(template));
        onAddNotification('Setup applied', `Every step is pre-filled from "${template.name}". Review and adjust as needed.`, 'system');
      },
      onDeleteTemplate: (templateId: string) => {
        setTemplates(deleteMatchTemplate(settingsUserUid, templateId));
      }
    };
  }, [onApplyQuickStart, onAddNotification, repeatableHistory, templates, settingsUserUid]);

  // R5.3: simpan template dulu (fire-and-forget), lalu lanjut generate.
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const handleGenerateWithExtras = (settings: Tournament) => {
    if (saveAsTemplate) {
      try {
        saveMatchTemplate(settingsUserUid, buildTemplateFromSettings(settings, templateName.trim() || settings.name));
      } catch (err) {
        console.error('Save match template error:', err);
      }
    }
    onGenerate(settings);
  };

  const {
    format,
    partnerMode,
    fixedTeams,
    toxicModeEnabled,
    toxicIntensity,
    criteria,
    scoringType,
    matchPlayMode,
    matchPlayGamesTarget,
    matchPlayBestOfSets,
    courts,
    points,
    numRounds,
    durationMinutes,
    gameName,
    venueName,
    venueDisplayLabel,
    setCriteria,
    setToxicModeEnabled,
    setToxicIntensity,
    setScoringType,
    setMatchPlayMode,
    setMatchPlayGamesTarget,
    setMatchPlayBestOfSets,
    setCourts,
    setPoints,
    setNumRounds,
    setDurationMinutes,
    setGameName,
    setVenueName,
    applyFormatChoice,
    applyPartnerModeChoice,
    swapFixedTeamPlayers,
    handleGenerate
  } = useMatchSettingsDraft({
    tournament,
    setTournament,
    selectedPlayers: effectiveSelectedPlayers,
    location,
    onGenerate: handleGenerateWithExtras
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
    partnerMode,
    courts,
    numRounds,
    durationMinutes,
    points,
    selectedPlayerCount: effectiveSelectedPlayers.length,
    matchPlayModeLabel: format === 'Match Play'
      ? `${describeMatchPlayMode(getMatchPlayConfig({ matchPlayMode, matchPlayGamesTarget, matchPlayBestOfSets, scoringType }))} · ${scoringType}`
      : undefined
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
    requireEvenPlayers: partnerMode === 'fixed',
    onComplete: handleGenerate
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
          quickStart={quickStart}
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
          partnerMode={partnerMode}
          partnerModeImpactCopy={PARTNER_MODE_IMPACT_COPY}
          partnerModeLabels={PARTNER_MODE_LABELS}
          criteria={criteria}
          scoringType={scoringType}
          matchPlayMode={matchPlayMode}
          matchPlayGamesTarget={matchPlayGamesTarget}
          matchPlayBestOfSets={matchPlayBestOfSets}
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
          onPartnerModeChange={applyPartnerModeChoice}
          onCriteriaChange={setCriteria}
          onScoringTypeChange={setScoringType}
          onMatchPlayModeChange={setMatchPlayMode}
          onMatchPlayGamesTargetChange={setMatchPlayGamesTarget}
          onMatchPlayBestOfSetsChange={setMatchPlayBestOfSets}
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
          partnerMode={partnerMode}
          fixedTeams={fixedTeams}
          fixedTeamPlayers={effectiveSelectedPlayers}
          friends={friends}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          onTogglePlayer={handleTogglePlayer}
          onAddPlayer={handleAddPlayer}
          onSwapFixedTeamPlayers={swapFixedTeamPlayers}
        />
      )}

      {settingsStep === 3 && (
        <ReviewStep
          venueDisplayLabel={venueDisplayLabel}
          format={format}
          partnerModeLabel={PARTNER_MODE_LABELS[partnerMode]}
          fixedTeamCount={partnerMode === 'fixed' ? fixedTeams.length : null}
          criteria={criteria}
          toxicModeEnabled={toxicModeEnabled}
          toxicIntensity={toxicIntensity}
          structureLabel={reviewStructureLabel}
          playerCount={effectiveSelectedPlayers.length}
          isReady={isReady}
          wizardStatusLabel={wizardStatusLabel}
          saveAsTemplate={saveAsTemplate}
          templateName={templateName}
          templateNamePlaceholder={gameName.trim() || `${format} template`}
          wizardHeadingClass={wizardHeadingClass}
          wizardTitleClass={wizardTitleClass}
          wizardSubtitleClass={wizardSubtitleClass}
          wizardSoftPanelClass={wizardSoftPanelClass}
          onToxicModeChange={setToxicModeEnabled}
          onToxicIntensityChange={setToxicIntensity}
          onSaveAsTemplateChange={setSaveAsTemplate}
          onTemplateNameChange={setTemplateName}
          onGoToStep={goToWizardStep}
        />
      )}
    </MatchSettingsWizardShell>
  );
};
