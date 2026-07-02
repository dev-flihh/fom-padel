import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type FixedTeam, type Player } from '../../types';

// Panel pembentukan pasangan tetap: tap satu pemain untuk memilih, tap pemain
// lain untuk menukar posisinya (antar tim maupun dengan pemain tanpa tim).
export const FixedTeamsPanel = ({
  fixedTeams,
  players,
  onSwapPlayers,
}: {
  fixedTeams: FixedTeam[];
  players: Player[];
  onSwapPlayers: (playerIdA: string, playerIdB: string) => void;
}) => {
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const unpairedPlayers = useMemo(() => {
    const claimedIds = new Set(fixedTeams.flatMap((team) => team.playerIds));
    return players.filter((player) => !claimedIds.has(player.id));
  }, [fixedTeams, players]);

  const handleTapPlayer = (playerId: string) => {
    if (!pendingSwapId) {
      setPendingSwapId(playerId);
      return;
    }
    if (pendingSwapId === playerId) {
      setPendingSwapId(null);
      return;
    }
    onSwapPlayers(pendingSwapId, playerId);
    setPendingSwapId(null);
  };

  const renderPlayerChip = (playerId: string) => {
    const player = playerById.get(playerId);
    if (!player) return null;
    const isPending = pendingSwapId === playerId;
    return (
      <button
        key={playerId}
        type="button"
        aria-label={`Swap ${player.name}`}
        aria-pressed={isPending}
        onClick={() => handleTapPlayer(playerId)}
        className={cn(
          "tap-target flex min-w-0 flex-1 items-center gap-2 rounded-[16px] px-2.5 py-2 text-left transition-all active:scale-[0.98]",
          isPending ? "bg-primary text-white ring-2 ring-primary/30" : "bg-white"
        )}
      >
        <span className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-black",
          isPending ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
        )}>
          {player.avatar
            ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
            : player.initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tracking-[-0.015em]">
          {player.name}
        </span>
      </button>
    );
  };

  if (fixedTeams.length === 0 && unpairedPlayers.length === 0) return null;

  return (
    <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Fixed teams</p>
          <p className="mt-0.5 text-[12px] font-medium text-ios-gray">
            {pendingSwapId ? 'Tap another player to swap positions.' : 'Tap two players to swap their teams.'}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-on-surface">
          {fixedTeams.length} team{fixedTeams.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {fixedTeams.map((team, index) => (
          <div key={team.id} className="flex items-center gap-2 rounded-[20px] bg-white/70 p-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">
              {index + 1}
            </span>
            {renderPlayerChip(team.playerIds[0])}
            <ArrowLeftRight size={13} className="shrink-0 text-ios-gray/60" />
            {renderPlayerChip(team.playerIds[1])}
          </div>
        ))}
      </div>

      {unpairedPlayers.length > 0 && (
        <div className="mt-3 rounded-[18px] bg-[#fff8f2] px-3 py-2.5">
          <p className="text-[12px] font-bold text-[#8a3b12]">
            {unpairedPlayers.length} player{unpairedPlayers.length > 1 ? 's' : ''} without a team
          </p>
          <p className="mt-0.5 text-[11.5px] font-medium leading-[1.5] text-[#8a3b12]/80">
            Fix Partner needs an even player count. Add or remove a player, or swap someone in.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unpairedPlayers.map((player) => renderPlayerChip(player.id))}
          </div>
        </div>
      )}
    </div>
  );
};
