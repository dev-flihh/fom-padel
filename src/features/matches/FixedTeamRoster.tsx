import { useMemo, useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type FixedTeam, type Player } from '../../types';

// Mode Fix Partner: roster dirender sebagai kartu tim bernomor (R3.2) —
// bukan panel terpisah. Interaksi tetap tap-dua-untuk-tukar (R3.3): tap satu
// pemain untuk memilih, tap pemain lain untuk menukar posisinya.
export const FixedTeamRoster = ({
  fixedTeams,
  players,
  currentUserId,
  onSwapPlayers,
  onRemovePlayer,
}: {
  fixedTeams: FixedTeam[];
  players: Player[];
  currentUserId?: string | null;
  onSwapPlayers: (playerIdA: string, playerIdB: string) => void;
  onRemovePlayer: (player: Player) => void;
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

  const renderPlayerRow = (playerId: string) => {
    const player = playerById.get(playerId);
    if (!player) return null;
    const isSelf = player.id === currentUserId;
    const isGuest = player.source === 'manual';
    const isPending = pendingSwapId === playerId;
    return (
      <div
        key={playerId}
        className={cn(
          "flex items-center gap-3 rounded-[16px] px-2.5 py-2 transition-all",
          isPending && "bg-primary/[0.08] ring-2 ring-primary"
        )}
      >
        <button
          type="button"
          aria-label={`Swap ${player.name}`}
          aria-pressed={isPending}
          onClick={() => handleTapPlayer(playerId)}
          className="tap-target flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]"
        >
          <span className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-black",
            isPending ? "bg-primary text-white" : "bg-primary/10 text-primary"
          )}>
            {player.avatar
              ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
              : player.initials}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{player.name}</span>
            {isSelf && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">You</span>}
            {isGuest && <span className="shrink-0 rounded-full bg-ios-gray/[0.08] px-2 py-0.5 text-[10px] font-bold text-ios-gray">guest</span>}
            {isPending && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Swapping…</span>}
          </span>
        </button>
        {!isSelf && (
          <button
            type="button"
            aria-label={`Remove ${player.name}`}
            onClick={() => {
              if (pendingSwapId === playerId) setPendingSwapId(null);
              onRemovePlayer(player);
            }}
            className="tap-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fbfbfd] text-ios-gray"
          >
            <X size={13} />
          </button>
        )}
      </div>
    );
  };

  if (players.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-[14px] bg-ios-gray/[0.07] px-3 py-2.5">
        <ArrowLeftRight size={14} className="shrink-0 text-ios-gray" />
        <p className="text-[12px] font-semibold text-ios-gray">
          {pendingSwapId ? 'Now tap another player to swap.' : 'Tap two players to swap partners.'}
        </p>
      </div>

      {fixedTeams.map((team, index) => (
        <div key={team.id} className="rounded-[18px] bg-white px-1.5 py-1.5">
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ios-gray">
            Team {index + 1}
          </p>
          {renderPlayerRow(team.playerIds[0])}
          {renderPlayerRow(team.playerIds[1])}
        </div>
      ))}

      {unpairedPlayers.length > 0 && (
        <div className="rounded-[18px] bg-white px-1.5 py-1.5">
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ios-gray">
            Team {fixedTeams.length + 1}
          </p>
          {unpairedPlayers.map((player) => renderPlayerRow(player.id))}
          <div className="flex items-center gap-3 px-2.5 py-2">
            <span className="h-9 w-9 shrink-0 rounded-full border-[1.5px] border-dashed border-primary/55" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#8a3b12]">Needs a partner</p>
              <p className="text-[11.5px] font-medium text-ios-gray">Add 1 more player, or remove someone.</p>
            </div>
          </div>
        </div>
      )}

      {unpairedPlayers.length > 0 && (
        // R3.4: aturan jumlah genap tampil tepat di tempat pelanggarannya.
        <div className="rounded-[16px] bg-[#fff8f2] px-3 py-2.5">
          <p className="text-[12px] font-semibold leading-[1.5] text-[#8a3b12]">
            Fix Partner needs an even player count. Add 1 more player — or switch to Rotating in the Format step.
          </p>
        </div>
      )}
    </div>
  );
};
