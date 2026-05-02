import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Player, type TournamentHistory } from '../../types';
import { getHistoryFormatTheme } from '../tournaments/matchTheme';
import { type CompletedMatchHistoryItem, getCompletedMatchesCount } from './historyUtils';

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
};

export const CompletedMatchHistoryCard = ({
  item,
  onClick,
  showTournamentMeta = true
}: CompletedMatchHistoryCardProps) => {
  const formatTheme = getHistoryFormatTheme(item.tournament.format, item.tournament.themeColorId);
  const teamAScore = Number(item.match.teamA.score || 0);
  const teamBScore = Number(item.match.teamB.score || 0);
  const teamAWin = teamAScore > teamBScore;
  const teamBWin = teamBScore > teamAScore;
  const metaLabel = `Round ${item.roundId} • Court ${item.match.court}`;
  const dateLabel = item.tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const sharedButtonClass = 'w-full rounded-[24px] p-4 text-left border border-black/5 shadow-sm transition-all';

  const renderPlayerStack = (players: Player[]) => (
    <div className="flex -space-x-2">
      {players.map((player, index) => (
        <div
          key={`${player.id}-${index}`}
          className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-ios-gray/10 flex items-center justify-center text-[10px] font-bold text-ios-gray shadow-sm"
        >
          {player.avatar ? (
            <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
          ) : (
            <span>{player.initials || player.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}
    </div>
  );

  const renderTeamBlock = (
    label: string,
    players: Player[],
    alignment: 'left' | 'right',
    isWinner: boolean
  ) => (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3',
        isWinner ? cn('bg-white shadow-sm', formatTheme.badge) : 'border-black/5 bg-white/75'
      )}
    >
      <div className={cn('flex items-center gap-2.5', alignment === 'right' && 'sm:justify-end')}>
        {alignment === 'left' && renderPlayerStack(players)}
        <div className={cn('min-w-0 flex-1', alignment === 'right' && 'sm:text-right')}>
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.12em]', isWinner ? 'opacity-80' : 'text-ios-gray/72')}>
            {label}
          </p>
          <p className={cn('mt-1 text-[13px] font-semibold leading-snug text-on-surface', alignment === 'right' && 'sm:truncate')}>
            {players.map((player) => player.name.split(' ')[0]).join(' / ')}
          </p>
        </div>
        {alignment === 'right' && renderPlayerStack(players)}
      </div>
    </div>
  );

  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray">{dateLabel}</span>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.badge)}>
              {item.tournament.format}
            </span>
          </div>
          <h4 className="mt-2 text-[16px] font-bold leading-tight tracking-tight text-on-surface truncate">
            {showTournamentMeta ? item.tournament.name : metaLabel}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {showTournamentMeta && (
              <span className="inline-flex rounded-full border border-black/5 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-ios-gray">
                {metaLabel}
              </span>
            )}
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]', formatTheme.chip)}>
              Final score
            </span>
          </div>
        </div>
        {onClick && (
          <div className="shrink-0 rounded-full border border-black/5 bg-white/85 p-2">
            <ChevronRight size={17} className={cn(formatTheme.accent)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="rounded-[18px] border border-black/5 bg-white px-3 py-3 text-center shadow-sm sm:order-none">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ios-gray/68">Score</p>
          <div className="mt-1 text-[24px] leading-none font-display font-black tracking-tight tabular-nums whitespace-nowrap">
            <span className={cn(teamAWin ? formatTheme.accent : 'text-on-surface')}>{teamAScore}</span>
            <span className="mx-1 text-ios-gray/28">-</span>
            <span className={cn(teamBWin ? formatTheme.accent : 'text-on-surface')}>{teamBScore}</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-ios-gray/72">
            {teamAWin ? 'Team A won' : teamBWin ? 'Team B won' : 'Draw'}
          </p>
        </div>

        {renderTeamBlock('Team A', item.match.teamA.players, 'left', teamAWin)}
        {renderTeamBlock('Team B', item.match.teamB.players, 'right', teamBWin)}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className={cn(sharedButtonClass, 'p-3.5 sm:p-4', formatTheme.surface)}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(sharedButtonClass, 'p-3.5 sm:p-4 tap-target active:scale-[0.99]', formatTheme.surface)}
    >
      {content}
    </button>
  );
};

export const TournamentHistoryCard = ({
  tournament,
  onClick
}: TournamentHistoryCardProps) => {
  const formatTheme = getHistoryFormatTheme(tournament.format, tournament.themeColorId);
  const completedMatches = getCompletedMatchesCount(tournament);
  const placeLabel = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-[24px] sm:rounded-[28px] border border-black/5 p-3.5 sm:p-4 text-left tap-target transition-all active:scale-[0.99]',
        formatTheme.surface
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold tracking-tight text-ios-gray">
              {tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.badge)}>
              {tournament.format}
            </span>
          </div>
          <h4 className="mt-1.5 truncate text-[17px] sm:text-[19px] font-bold tracking-tight text-on-surface">{tournament.name}</h4>
          <p className="mt-1 text-[12px] sm:text-[13px] leading-relaxed text-ios-gray">
            {tournament.numPlayers} players • {tournament.numRounds} rounds • {completedMatches} completed matches
          </p>
          {placeLabel && (
            <div className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-tight text-ios-gray">
              <MapPin size={12} className={cn('shrink-0', formatTheme.accentSoft)} />
              <span className="truncate">{placeLabel}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-full border border-black/5 bg-white/80 p-2">
          <ChevronRight size={16} className={cn(formatTheme.accent)} />
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-[16px] sm:rounded-[18px] border border-black/5 bg-white/82 px-2.5 sm:px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/72">Players</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight text-on-surface tabular-nums">{tournament.numPlayers}</p>
        </div>
        <div className="rounded-[16px] sm:rounded-[18px] border border-black/5 bg-white/82 px-2.5 sm:px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/72">Rounds</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight text-on-surface tabular-nums">{tournament.numRounds}</p>
        </div>
        <div className={cn('rounded-[16px] sm:rounded-[18px] border px-2.5 sm:px-3 py-2', formatTheme.chip)}>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">Matches</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight tabular-nums">{completedMatches}</p>
        </div>
      </div>
    </button>
  );
};
