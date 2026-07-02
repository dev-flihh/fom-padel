import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { type MatchFormat, type RankingCriteria, type ScoringType } from '../../types';
import { FormatStep } from '../matches/FormatStep';
import { CRITERIA_IMPACT_COPY, FORMAT_IMPACT_COPY, SCORING_IMPACT_COPY } from '../matches/matchSettingsCopy';
import { MATCH_SETTINGS_WIZARD_CLASSNAMES } from '../matches/matchSettingsStyles';
import type { Room, RoomSettingsSnapshot } from './types';

const getStructureSummaryLabel = ({
  courts,
  numRounds,
  durationMinutes,
  points,
  format,
}: {
  courts: number;
  numRounds: number;
  durationMinutes: number;
  points: number;
  format: MatchFormat;
}) => {
  const durationLabel = `${durationMinutes} min`;
  if (format === 'Match Play') return `${courts} court${courts > 1 ? 's' : ''} · ${numRounds} rounds · ${durationLabel}`;
  return `${courts} court${courts > 1 ? 's' : ''} · ${numRounds} rounds · ${durationLabel} · ${points} pts`;
};

export const RoomMatchSetupScreen = ({
  room,
  isSaving,
  onBack,
  onSave,
}: {
  room: Room;
  isSaving: boolean;
  onBack: () => void;
  onSave: (settings: RoomSettingsSnapshot) => Promise<void>;
}) => {
  const [format, setFormat] = useState<MatchFormat>(room.settings.format || 'Mexicano');
  const [criteria, setCriteria] = useState<RankingCriteria>(room.settings.criteria || 'Matches Won');
  const [scoringType, setScoringType] = useState<ScoringType>(room.settings.scoringType || 'Golden Point');
  const [courts, setCourts] = useState(Math.max(1, Number(room.settings.courts || 1)));
  const [points, setPoints] = useState(Math.max(1, Number(room.settings.totalPoints || 21)));
  const [numRounds, setNumRounds] = useState(Math.max(1, Number(room.settings.numRounds || 8)));
  const [durationMinutes, setDurationMinutes] = useState(Math.max(30, Number(room.settings.durationMinutes || 120)));

  const applyFormatChoice = (value: MatchFormat) => {
    setFormat(value);
    if (value === 'Americano') {
      setCriteria('Points Won');
      if (numRounds < 5) setNumRounds(5);
      if (points < 16) setPoints(21);
      return;
    }
    if (value === 'Mexicano') {
      setCriteria('Matches Won');
      if (numRounds !== 8) setNumRounds(8);
      if (points !== 21) setPoints(21);
      return;
    }
    setCriteria('Matches Won');
    if (numRounds < 3) setNumRounds(3);
  };

  const handleSave = async () => {
    if (isSaving) return;
    await onSave({
      ...room.settings,
      name: room.title,
      format,
      criteria,
      scoringType: format === 'Match Play' ? scoringType : undefined,
      courts,
      totalPoints: format === 'Match Play' ? 0 : points,
      numRounds,
      durationMinutes,
    });
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <nav
        className="sticky top-0 z-50 border-b border-black/5 bg-white"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="tap-target -ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface"
            aria-label="Back to room detail"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-primary">Room Setup</p>
            <p className="truncate text-[13px] font-semibold text-on-surface">{room.title}</p>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-md px-7 py-5">
        <FormatStep
          format={format}
          criteria={criteria}
          scoringType={scoringType}
          courts={courts}
          numRounds={numRounds}
          durationMinutes={durationMinutes}
          points={points}
          structureSummaryLabel={getStructureSummaryLabel({ courts, numRounds, durationMinutes, points, format })}
          formatImpactCopy={FORMAT_IMPACT_COPY}
          criteriaImpactCopy={CRITERIA_IMPACT_COPY}
          scoringImpactCopy={SCORING_IMPACT_COPY}
          wizardHeadingClass={MATCH_SETTINGS_WIZARD_CLASSNAMES.heading}
          wizardTitleClass={MATCH_SETTINGS_WIZARD_CLASSNAMES.title}
          wizardSubtitleClass={MATCH_SETTINGS_WIZARD_CLASSNAMES.subtitle}
          onFormatChange={applyFormatChoice}
          onCriteriaChange={setCriteria}
          onScoringTypeChange={setScoringType}
          onCourtsChange={setCourts}
          onNumRoundsChange={setNumRounds}
          onDurationMinutesChange={setDurationMinutes}
          onPointsChange={setPoints}
        />
      </main>

      <div
        className="fixed inset-x-0 z-50 border-t border-black/5 bg-white/95 backdrop-blur-xl"
        style={{ bottom: 'calc(var(--app-safe-bottom, 0px))' }}
      >
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="tap-target flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(255,85,1,0.18)] disabled:opacity-50 disabled:shadow-none"
          >
            {isSaving ? 'Saving setup...' : 'Save Setup'}
          </button>
        </div>
      </div>
    </div>
  );
};
