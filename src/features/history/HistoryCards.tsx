import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type TournamentHistory } from '../../types';
import { type CompletedMatchHistoryItem, getCompletedMatchesCount, getHistoryFormatTheme } from './historyUtils';

type CompletedMatchHistoryCardProps = {
  key?: React.Key;
  item: CompletedMatchHistoryItem;
  onClick?: () => void;
  showTournamentMeta?: boolean;
};

type TournamentHistoryCardProps = {
  key?: React.Key;
  tournament: TournamentHistory;
  onClick: () => void;
  isLatest?: boolean;
};

export const CompletedMatchHistoryCard = ({
  item,
  onClick,
  showTournamentMeta = true
}: CompletedMatchHistoryCardProps) => {
  const teamAScore = Number(item.match.teamA.score || 0);
  const teamBScore = Number(item.match.teamB.score || 0);
  const teamAWin = teamAScore > teamBScore;
  const teamBWin = teamBScore > teamAScore;
  const metaLabel = `Round ${item.roundId} • Court ${item.match.court}`;
  const dateLabel = item.tournament.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const sharedClassName = showTournamentMeta
    ? 'w-full bg-white py-4 text-left transition-colors'
    : 'w-full bg-white py-3.5 text-left transition-colors';
  const teamAPlayers = item.match.teamA.players.map((player) => player.name.split(' ')[0]).join(' / ');
  const teamBPlayers = item.match.teamB.players.map((player) => player.name.split(' ')[0]).join(' / ');
  const winnerLabel = teamAWin ? 'Team A won' : teamBWin ? 'Team B won' : 'Draw';

  const renderTeamLine = (label: string, players: string, isWinner: boolean) => (
    <div className="grid min-w-0 grid-cols-[10px_16px_minmax(0,1fr)] items-center gap-1.5">
      <span className="flex h-4 w-[10px] items-center justify-center">
        <span className={cn(
          'h-1.5 w-1.5 rounded-full',
          isWinner ? 'bg-primary/72' : 'bg-ios-gray/28'
        )} />
      </span>
      <span className="text-center text-[11px] font-medium leading-[1.2] tracking-tight text-ios-gray">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-semibold leading-[1.35] tracking-tight text-on-surface">{players}</span>
    </div>
  );

  const content = (
    <div className="grid grid-cols-[minmax(0,1fr)_74px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11.5px] font-medium leading-[1.25] tracking-tight text-ios-gray">
          <span>{showTournamentMeta ? dateLabel : `Court ${item.match.court}`}</span>
          {showTournamentMeta && (
            <>
              <span className="h-1 w-1 rounded-full bg-ios-gray/28" />
              <span>{item.tournament.format}</span>
            </>
          )}
        </div>
        {showTournamentMeta && (
          <h4 className="mt-1.5 truncate text-[15.5px] font-bold leading-tight tracking-[-0.015em] text-on-surface">
            {item.tournament.name}
          </h4>
        )}
        <div className={cn('space-y-1', showTournamentMeta ? 'mt-2.5' : 'mt-2')}>
          {renderTeamLine('A', teamAPlayers, teamAWin)}
          {renderTeamLine('B', teamBPlayers, teamBWin)}
        </div>
        {showTournamentMeta && (
          <div className="mt-2 text-[11.5px] font-medium leading-[1.25] tracking-tight text-ios-gray">
            {metaLabel}
          </div>
        )}
      </div>
      <div className="flex w-[74px] shrink-0 flex-col items-end justify-center text-right">
        <p className="grid w-[54px] grid-cols-[1fr_auto_1fr] items-baseline gap-1 font-display text-[22px] font-bold leading-none tracking-[-0.035em] text-on-surface tabular-nums">
          <span className="text-right">{teamAScore}</span>
          <span className="text-center text-ios-gray/26">-</span>
          <span className="text-left">{teamBScore}</span>
        </p>
        <p className="mt-1.5 whitespace-nowrap text-[10.5px] font-medium leading-[1.2] tracking-tight text-ios-gray">
          {winnerLabel}
        </p>
        {onClick && (
          <ChevronRight size={15} strokeWidth={2.1} className="ml-auto mt-2 text-on-surface/34" />
        )}
      </div>
    </div>
  );

  if (!onClick) {
    return (
      <div className={sharedClassName}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(sharedClassName, 'tap-target active:bg-ios-gray/[0.035]')}
    >
      {content}
    </button>
  );
};

export const TournamentHistoryCard = ({
  tournament,
  onClick,
  isLatest = false
}: TournamentHistoryCardProps) => {
  const completedMatches = getCompletedMatchesCount(tournament);
  const placeLabel = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');
  const dateDayLabel = tournament.date.toLocaleDateString('en-US', { day: '2-digit' });
  const dateMonthLabel = tournament.date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const formatTheme = getHistoryFormatTheme(tournament.format);

  const metrics = [
    { label: 'players', value: Number(tournament.numPlayers || 0).toLocaleString('en-US') },
    { label: 'rounds', value: Number(tournament.numRounds || 0).toLocaleString('en-US') },
    { label: 'matches', value: completedMatches.toLocaleString('en-US') }
  ];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full bg-transparent py-4 text-left tap-target transition-colors active:bg-black/[0.025]'
      )}
    >
      <div className="grid grid-cols-[50px_minmax(0,1fr)_28px] gap-3">
        <div className="pt-0.5">
          <p className="font-display text-[28px] font-black leading-none tracking-[-0.04em] text-on-surface tabular-nums">
            {dateDayLabel}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-ios-gray">
            {dateMonthLabel}
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-[3px_minmax(0,1fr)] gap-3">
          <span
            className="mt-0.5 min-h-[84px] w-[3px] rounded-full"
            style={{ backgroundColor: formatTheme.color }}
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10.5px] font-black uppercase leading-[1.2] tracking-[0.12em]">
              <span className="truncate" style={{ color: formatTheme.color }}>{formatTheme.label}</span>
              {isLatest && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-black leading-none tracking-[0.12em] text-primary">
                  Latest
                </span>
              )}
            </div>

            <h4 className="mt-1.5 truncate text-[17px] font-bold leading-tight tracking-[-0.018em] text-on-surface">
              {tournament.name}
            </h4>

            {placeLabel && (
              <div className="mt-2 flex max-w-full items-center gap-1.5 text-[12px] font-medium leading-[1.25] text-ios-gray">
                <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-ios-gray/75" />
                <span className="truncate">{placeLabel}</span>
              </div>
            )}

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium leading-[1.25] text-ios-gray">
              {metrics.map(({ label, value }, index) => (
                <React.Fragment key={label}>
                  {index > 0 && <span className="h-1 w-1 shrink-0 rounded-full bg-ios-gray/22" />}
                  <span className="inline-flex min-w-0 items-baseline gap-1">
                    <span className="font-semibold text-on-surface tabular-nums">{value}</span>
                    <span>{label}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-[84px] w-7 shrink-0 items-center justify-end text-on-surface/28 transition-transform group-active:translate-x-0.5">
          <ChevronRight size={17} strokeWidth={2.1} />
        </div>
      </div>
    </button>
  );
};
