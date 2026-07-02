import { useState } from 'react';

export type MatchSettingsWizardStep = {
  label: string;
  title: string;
  context: string;
};

export const useMatchSettingsWizard = ({
  controlledStep,
  onStepChange,
  wizardSteps,
  isReady,
  missingPlayersCount,
  courts,
  selectedPlayerCount,
  requireEvenPlayers = false,
  onComplete
}: {
  controlledStep?: number;
  onStepChange?: (step: number) => void;
  wizardSteps: MatchSettingsWizardStep[];
  isReady: boolean;
  missingPlayersCount: number;
  courts: number;
  selectedPlayerCount: number;
  requireEvenPlayers?: boolean;
  onComplete: () => void;
}) => {
  const [localStep, setLocalStep] = useState(0);
  const settingsStep = controlledStep ?? localStep;
  const currentWizardStep = wizardSteps[settingsStep] || wizardSteps[0];
  const lastStepIndex = Math.max(0, wizardSteps.length - 1);

  const updateSettingsStep = (step: number) => {
    setLocalStep(step);
    onStepChange?.(step);
  };

  const goToWizardStep = (stepIndex: number) => {
    updateSettingsStep(Math.max(0, Math.min(lastStepIndex, stepIndex)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextWizardStep = () => {
    if (settingsStep >= lastStepIndex) {
      onComplete();
      return;
    }
    goToWizardStep(settingsStep + 1);
  };

  const wizardCtaLabel = settingsStep === lastStepIndex ? 'Generate Match' : 'Continue';
  const wizardCtaDisabled = settingsStep >= 2 && !isReady;
  const blockedByOddPlayers = requireEvenPlayers
    && selectedPlayerCount % 2 !== 0
    && selectedPlayerCount >= courts * 4;
  const wizardStatusLabel = !isReady
    ? (blockedByOddPlayers
        ? 'Fix Partner needs an even number of players so everyone has a partner.'
        : `Add ${missingPlayersCount} more player${missingPlayersCount > 1 ? 's' : ''} for ${courts} court${courts > 1 ? 's' : ''}.`)
    : `${selectedPlayerCount} players ready.`;

  return {
    settingsStep,
    currentWizardStep,
    wizardCtaLabel,
    wizardCtaDisabled,
    wizardStatusLabel,
    goToWizardStep,
    goToNextWizardStep
  };
};
