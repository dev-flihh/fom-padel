import { useMemo, useState, type Ref } from 'react';
import { Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type FixedTeam, type Friend, type PartnerMode, type Player } from '../../types';
import { MANUAL_PLAYER_ID_PREFIX } from '../players/playerUtils';
import { sortPlayersByName } from './matchSetupUtils';
import { FixedTeamRoster } from './FixedTeamRoster';
import { FriendsPickerSheet } from './FriendsPickerSheet';
import { buildInitialsFromName, mapFriendToPlayer, mapProfileToPlayer, usePlayerSearch } from './usePlayerSearch';

const RECENT_PLAYERS_PREVIEW_COUNT = 12;
const FRIENDS_PREVIEW_COUNT = 4;

// Satu permukaan tambah pemain (R2.1): search menyatukan teman, FOM player
// global (tanpa harus berteman), dan guest — menggantikan layar Choose
// Friends, modal Add New Player, dan Quick add.
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
  friends,
  wizardHeadingClass,
  wizardTitleClass,
  wizardSubtitleClass,
  onTogglePlayer,
  onAddPlayer,
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
  friends: Friend[];
  wizardHeadingClass: string;
  wizardTitleClass: string;
  wizardSubtitleClass: string;
  onTogglePlayer: (player: Player) => void;
  onAddPlayer: (player: Player) => void;
  onSwapFixedTeamPlayers: (playerIdA: string, playerIdB: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [friendsSheetOpen, setFriendsSheetOpen] = useState(false);
  const trimmedQuery = query.trim();
  const {
    globalResults,
    isSearchingGlobal,
    globalSearchFailed,
    canSearchGlobal,
    globalSearchMinChars
  } = usePlayerSearch(trimmedQuery);

  const friendUids = useMemo(() => new Set(friends.map((friend) => String(friend.uid || '').trim())), [friends]);
  const selectedIds = useMemo(() => new Set(selectedPlayers.map((player) => player.id)), [selectedPlayers]);
  const availableIds = useMemo(() => new Set(availablePlayers.map((player) => player.id)), [availablePlayers]);

  // Teman FOM yang belum masuk match — bisa di-browse langsung tanpa mengetik.
  const friendPlayers = useMemo(
    () => sortPlayersByName(
      friends
        .map(mapFriendToPlayer)
        .filter((player) => player.id && !selectedIds.has(player.id))
    ),
    [friends, selectedIds]
  );

  // Kandidat pencarian lokal = daftar teman penuh + pemain tersimpan, dedupe
  // by uid (teman menang karena datanya live). Inilah yang membuat teman
  // ketemu dari potongan nama/username walau belum pernah main bareng.
  const localSearchCandidates = useMemo(() => {
    const byId = new Map<string, Player & { username?: string }>();
    friends.forEach((friend) => {
      const player = mapFriendToPlayer(friend);
      if (player.id) byId.set(player.id, player);
    });
    availablePlayers.forEach((player) => {
      if (player.id && !byId.has(player.id)) byId.set(player.id, player);
    });
    return Array.from(byId.values());
  }, [friends, availablePlayers]);

  const matchingLocalPlayers = useMemo(() => {
    if (!trimmedQuery) return [];
    const normalized = trimmedQuery.toLowerCase();
    return localSearchCandidates.filter((player) => {
      if (selectedIds.has(player.id)) return false;
      const name = (player.name || '').toLowerCase();
      const username = (player.username || '').toLowerCase();
      return name.includes(normalized) || username.includes(normalized);
    });
  }, [localSearchCandidates, trimmedQuery, selectedIds]);

  // Teman tampil di panel "Your friends"; sisihkan dari "Recent players" agar
  // tidak dobel.
  const recentNonFriendPlayers = useMemo(
    () => availablePlayers.filter((player) => !friendUids.has(player.id)),
    [availablePlayers, friendUids]
  );

  // FOM player global: buang diri sendiri, yang sudah dipilih, dan yang sudah
  // ada di daftar teman/tersimpan supaya tidak dobel dengan grup pertama.
  const matchingGlobalPlayers = useMemo(() => (
    globalResults.filter((profile) => {
      const uid = String(profile.uid || '').trim();
      if (!uid) return false;
      if (uid === String(currentUserId || '').trim()) return false;
      if (selectedIds.has(uid) || availableIds.has(uid) || friendUids.has(uid)) return false;
      return true;
    })
  ), [globalResults, currentUserId, selectedIds, availableIds, friendUids]);

  const handleAddSaved = (player: Player) => {
    onTogglePlayer(player);
    setQuery('');
  };

  const handleAddGlobal = (profileUid: string) => {
    const profile = matchingGlobalPlayers.find((item) => item.uid === profileUid);
    if (!profile) return;
    onAddPlayer(mapProfileToPlayer(profile));
    setQuery('');
  };

  const handleAddGuest = () => {
    if (!trimmedQuery) return;
    onAddPlayer({
      id: `${MANUAL_PLAYER_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`,
      name: trimmedQuery,
      rating: 0,
      source: 'manual',
      initials: buildInitialsFromName(trimmedQuery),
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    });
    setQuery('');
  };

  const describeSavedPlayer = (player: Player & { username?: string }) => {
    if (friendUids.has(player.id)) {
      const parts = ['Friend'];
      if (player.username) parts.push(`@${player.username}`);
      const mmr = Number(player.rating);
      if (Number.isFinite(mmr) && mmr > 0) parts.push(`MMR ${Math.round(mmr)}`);
      return parts.join(' · ');
    }
    if (player.source === 'manual' || player.id.startsWith(MANUAL_PLAYER_ID_PREFIX)) return 'Guest · saved from a past match';
    return 'Saved player';
  };

  const visibleFriendPlayers = friendPlayers.slice(0, FRIENDS_PREVIEW_COUNT);
  const showSeeAllFriends = friends.length > FRIENDS_PREVIEW_COUNT;

  const visibleRecentPlayers = showAllRecent ? recentNonFriendPlayers : recentNonFriendPlayers.slice(0, RECENT_PLAYERS_PREVIEW_COUNT);
  const hiddenRecentCount = Math.max(0, recentNonFriendPlayers.length - RECENT_PLAYERS_PREVIEW_COUNT);

  const renderResultRow = ({
    key,
    avatar,
    initials,
    title,
    description,
    onAdd
  }: {
    key: string;
    avatar?: string;
    initials: string;
    title: string;
    description: string;
    onAdd: () => void;
  }) => (
    <button
      key={key}
      type="button"
      onClick={onAdd}
      className="tap-target flex w-full items-center gap-3 px-4 py-3 text-left active:bg-ios-gray/[0.04]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-black text-primary">
        {avatar ? <img src={avatar} alt={title} className="h-full w-full object-cover" /> : initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{title}</span>
        <span className="block truncate text-[12px] font-medium text-ios-gray">{description}</span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Plus size={15} />
      </span>
    </button>
  );

  return (
    <section ref={sectionRef} className="space-y-6">
      <div className={wizardHeadingClass}>
        <h2 className={wizardTitleClass}>Add players.</h2>
        <p className={wizardSubtitleClass}>
          {partnerMode === 'fixed'
            ? 'Fix Partner is on — every player needs a partner.'
            : 'Search anyone on FOM, or add a guest without an account.'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex h-[54px] w-full items-center gap-3 rounded-full border border-black/16 bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/12">
          <Search size={18} strokeWidth={2.1} className="shrink-0 text-on-surface/38" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or add a guest"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-[-0.015em] text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface/40"
            aria-label="Search players"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="tap-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.08] text-ios-gray"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {trimmedQuery && (
          <div className="overflow-hidden rounded-[22px] border border-ios-gray/[0.14] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.08)]">
            {matchingLocalPlayers.length > 0 && (
              <>
                <p className="px-4 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ios-gray">Friends &amp; saved</p>
                {matchingLocalPlayers.map((player) => renderResultRow({
                  key: player.id,
                  avatar: player.avatar,
                  initials: player.initials,
                  title: player.name,
                  description: describeSavedPlayer(player),
                  onAdd: () => handleAddSaved(player)
                }))}
              </>
            )}

            {(matchingGlobalPlayers.length > 0 || isSearchingGlobal || globalSearchFailed || !canSearchGlobal) && (
              <p className="px-4 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ios-gray">FOM players</p>
            )}
            {!canSearchGlobal && (
              <p className="px-4 pb-3 text-[12px] font-medium text-ios-gray">Type at least {globalSearchMinChars} letters to search everyone on FOM.</p>
            )}
            {isSearchingGlobal && (
              <p className="flex items-center gap-2 px-4 pb-3 text-[12px] font-medium text-ios-gray">
                <RefreshCw size={13} className="animate-spin" />
                Searching FOM players...
              </p>
            )}
            {globalSearchFailed && !isSearchingGlobal && (
              <p className="px-4 pb-3 text-[12px] font-medium text-ios-gray">FOM search is unavailable right now — friends and guests still work.</p>
            )}
            {matchingGlobalPlayers.map((profile) => renderResultRow({
              key: profile.uid,
              avatar: profile.photoURL,
              initials: buildInitialsFromName(profile.displayName || profile.username || 'P'),
              title: profile.displayName || profile.username || 'Player',
              description: [profile.username ? `@${profile.username}` : '', `MMR ${Math.round(Number(profile.mmr) || 0)}`].filter(Boolean).join(' · '),
              onAdd: () => handleAddGlobal(profile.uid)
            }))}
            {matchingGlobalPlayers.length > 0 && !isSearchingGlobal && (
              // R2.2: eksplisitkan bahwa menambahkan ≠ berteman.
              <p className="px-4 pb-3 pt-1 text-[11px] font-medium leading-[1.5] text-ios-gray">
                Added to this match only — no friend request sent.
              </p>
            )}

            <button
              type="button"
              onClick={handleAddGuest}
              className="tap-target flex w-full items-center gap-3 border-t border-dashed border-ios-gray/30 px-4 py-3.5 text-left active:bg-ios-gray/[0.04]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-primary/55 text-primary">
                <Plus size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">Add "{trimmedQuery}" as guest</span>
                <span className="block text-[12px] font-medium text-ios-gray">Guests don't need a FOM account</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {!trimmedQuery && (loadingFriends || friendPlayers.length > 0) && (
        <div className="rounded-[26px] bg-ios-gray/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">Your friends</p>
            {showSeeAllFriends && (
              <button
                type="button"
                onClick={() => setFriendsSheetOpen(true)}
                className="tap-target text-[13px] font-bold text-primary"
              >
                See all ({friends.length})
              </button>
            )}
          </div>
          <div className="mt-3">
            {loadingFriends && friendPlayers.length === 0 ? (
              <div className="flex items-center gap-2 rounded-[18px] bg-white p-3.5 text-[13px] font-medium text-ios-gray">
                <RefreshCw size={14} className="animate-spin" />
                Loading friends...
              </div>
            ) : (
              <div className="space-y-2">
                {visibleFriendPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => onTogglePlayer(player)}
                    className="tap-target flex w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 text-left active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-black text-primary">
                      {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : player.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{player.name}</span>
                      <span className="block truncate text-[12px] font-medium text-ios-gray">{describeSavedPlayer(player)}</span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Plus size={15} />
                    </span>
                  </button>
                ))}
                {!showSeeAllFriends && friends.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFriendsSheetOpen(true)}
                    className="tap-target flex w-full items-center justify-center gap-1.5 rounded-[18px] bg-white py-2.5 text-[13px] font-bold text-primary active:scale-[0.99]"
                  >
                    <Users size={14} />
                    Browse all friends
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!trimmedQuery && recentNonFriendPlayers.length > 0 && (
        <div className="rounded-[26px] bg-ios-gray/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">Recent players</p>
            {hiddenRecentCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllRecent((prev) => !prev)}
                className="tap-target text-[13px] font-bold text-primary"
              >
                {showAllRecent ? 'Show less' : `Show all (${recentNonFriendPlayers.length})`}
              </button>
            )}
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {visibleRecentPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onTogglePlayer(player)}
                  className="tap-target flex items-center gap-2 rounded-full border border-ios-gray/[0.16] bg-white py-1.5 pl-1.5 pr-3 active:scale-[0.98]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[9px] font-black text-primary">
                    {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : player.initials}
                  </span>
                  <span className="max-w-[128px] truncate text-[13px] font-semibold text-on-surface">{player.name}</span>
                  <Plus size={13} className="shrink-0 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[26px] bg-ios-gray/[0.035] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/82">
            In this match · {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''}
          </p>
          <span className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold",
            isReady ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"
          )}>
            {isReady
              ? (partnerMode === 'fixed' ? `${fixedTeams.length} teams · Ready` : 'Ready')
              : `${missingPlayersCount} left`}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-ios-gray">{wizardStatusLabel}</p>

        <div className="mt-3">
          {partnerMode === 'fixed' ? (
            <FixedTeamRoster
              fixedTeams={fixedTeams}
              players={fixedTeamPlayers}
              currentUserId={currentUserId}
              onSwapPlayers={onSwapFixedTeamPlayers}
              onRemovePlayer={onTogglePlayer}
            />
          ) : selectedPlayers.length === 0 ? (
            <p className="rounded-[18px] bg-white p-3.5 text-[13px] font-medium text-ios-gray">No players yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedPlayers.map((player) => {
                const isSelf = player.id === currentUserId;
                const isGuest = player.source === 'manual' || player.id.startsWith(MANUAL_PLAYER_ID_PREFIX);
                return (
                  <div key={player.id} className="flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-black text-primary">
                      {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : player.initials}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">{player.name}</p>
                      {isSelf && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">You</span>}
                      {isGuest && <span className="shrink-0 rounded-full bg-ios-gray/[0.08] px-2 py-0.5 text-[10px] font-bold text-ios-gray">guest</span>}
                    </div>
                    {!isSelf && (
                      <button
                        type="button"
                        aria-label={`Remove ${player.name}`}
                        onClick={() => onTogglePlayer(player)}
                        className="tap-target flex h-7 w-7 items-center justify-center rounded-full bg-[#fbfbfd] text-ios-gray"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FriendsPickerSheet
        isOpen={friendsSheetOpen}
        friends={friends}
        selectedIds={selectedIds}
        onClose={() => setFriendsSheetOpen(false)}
        onAddFriends={(players) => players.forEach(onAddPlayer)}
      />
    </section>
  );
};
