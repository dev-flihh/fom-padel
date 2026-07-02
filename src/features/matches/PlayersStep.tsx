import { type Ref } from 'react';
import { Plus, RefreshCw, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type FixedTeam, type PartnerMode, type Player } from '../../types';
import { FixedTeamsPanel } from './FixedTeamsPanel';

export const PlayersStep = ({
  sectionRef,
  selectedPlayers,
  availablePlayers,
  loadingFriends,
  isReady,
  missingPlayersCount,
  wizardStatusLabel,
  currentUserId,
  partnerMode,
  fixedTeams,
  fixedTeamPlayers,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  onOpenFriends,
  onOpenAddPlayer,
  onTogglePlayer,
  onSwapFixedTeamPlayers
}: {
  sectionRef: Ref<HTMLElement>;
  selectedPlayers: Player[];
  availablePlayers: Player[];
  loadingFriends: boolean;
  isReady: boolean;
  missingPlayersCount: number;
  wizardStatusLabel: string;
  currentUserId?: string | null;
  partnerMode: PartnerMode;
  fixedTeams: FixedTeam[];
  fixedTeamPlayers: Player[];
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  onOpenFriends: () => void;
  onOpenAddPlayer: () => void;
  onTogglePlayer: (player: Player) => void;
  onSwapFixedTeamPlayers: (playerIdA: string, playerIdB: string) => void;
}) => (
  <section ref={sectionRef} className="space-y-6">
    <div className={wizardHeadingClass}>
      <h2 className={wizardTitleClass}>Add players.</h2>
      <p className={wizardSubtitleClass}>
        {partnerMode === 'fixed' ? 'Each court needs 4 players, and every player needs a partner.' : 'Each court needs 4 players.'}
      </p>
    </div>

    <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="text-[40px] font-black leading-none tracking-[-0.04em] text-on-surface">{selectedPlayers.length}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-on-surface">Players selected</p>
          <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-ios-gray">{wizardStatusLabel}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1.5 text-[11px] font-bold", isReady ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}>
          {isReady ? 'Ready' : `${missingPlayersCount} left`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onOpenFriends} className="tap-target rounded-[20px] bg-white px-4 py-3.5 text-left active:scale-[0.99]">
          <Users size={18} className="text-primary" />
          <p className="mt-2.5 text-[14px] font-bold tracking-[-0.02em] text-on-surface">Choose Friends</p>
        </button>
        <button type="button" onClick={onOpenAddPlayer} className="tap-target rounded-[20px] bg-white px-4 py-3.5 text-left active:scale-[0.99]">
          <Plus size={18} className="text-primary" />
          <p className="mt-2.5 text-[14px] font-bold tracking-[-0.02em] text-on-surface">Add New Player</p>
        </button>
      </div>
    </div>

    {partnerMode === 'fixed' && (
      <FixedTeamsPanel
        fixedTeams={fixedTeams}
        players={fixedTeamPlayers}
        onSwapPlayers={onSwapFixedTeamPlayers}
      />
    )}

    {selectedPlayers.length > 0 && (
      <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Selected players</p>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-on-surface">{selectedPlayers.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {selectedPlayers.map((player) => {
            const isSelf = player.id === currentUserId;
            return (
              <div key={player.id} className="flex items-center gap-3 rounded-[20px] bg-white px-3.5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-black text-primary">
                  {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : player.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{player.name}</p>
                    {isSelf && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">You</span>}
                  </div>
                </div>
                <button type="button" aria-label={`Remove ${player.name}`} onClick={() => onTogglePlayer(player)} className="tap-target flex h-7 w-7 items-center justify-center rounded-full bg-[#fbfbfd] text-ios-gray">
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    )}

    <div className="rounded-[26px] bg-ios-gray/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-on-surface">Quick add</p>
        <span className="rounded-full bg-ios-gray/[0.06] px-2.5 py-1 text-[11px] font-bold text-ios-gray">{availablePlayers.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {loadingFriends && availablePlayers.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[20px] bg-white p-4 text-[13px] font-medium text-ios-gray">
            <RefreshCw size={14} className="animate-spin" />
            Loading players...
          </div>
        ) : availablePlayers.length === 0 ? (
          <p className="rounded-[20px] bg-white p-4 text-[13px] font-medium text-ios-gray">No more saved players to add.</p>
        ) : (
          availablePlayers.slice(0, 8).map((player) => (
            <button key={player.id} type="button" onClick={() => onTogglePlayer(player)} className="tap-target flex w-full items-center gap-3 rounded-[20px] bg-white px-3.5 py-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbfbfd] text-[11px] font-black text-ios-gray">
                {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : player.initials}
              </div>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{player.name}</span>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plus size={14} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  </section>
);
