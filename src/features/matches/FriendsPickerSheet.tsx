import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Search, X } from 'lucide-react';
import { type Friend, type Player } from '../../types';
import { mapFriendToPlayer } from './usePlayerSearch';

// R2.1: bottom sheet untuk mem-browse seluruh daftar teman FOM dan menambah
// beberapa sekaligus ke match — mengikuti idiom sheet AddPlayerModal.
export const FriendsPickerSheet = ({
  isOpen,
  friends,
  selectedIds,
  onClose,
  onAddFriends,
}: {
  isOpen: boolean;
  friends: Friend[];
  selectedIds: Set<string>;
  onClose: () => void;
  onAddFriends: (players: Player[]) => void;
}) => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Reset pilihan setiap kali sheet dibuka.
  useEffect(() => {
    if (isOpen) {
      setPicked(new Set());
      setQuery('');
    }
  }, [isOpen]);

  const sortedFriends = useMemo(
    () => [...friends].sort((a, b) =>
      (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '', undefined, { sensitivity: 'base' })
    ),
    [friends]
  );

  const trimmedQuery = query.trim().toLowerCase();
  const matches = (friend: Friend) => {
    if (!trimmedQuery) return true;
    const name = (friend.displayName || '').toLowerCase();
    const username = (friend.username || '').toLowerCase();
    return name.includes(trimmedQuery) || username.includes(trimmedQuery);
  };

  const selectable = sortedFriends.filter((friend) => !selectedIds.has(friend.uid) && matches(friend));
  const alreadyInMatch = sortedFriends.filter((friend) => selectedIds.has(friend.uid) && matches(friend));

  const togglePick = (uid: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleConfirm = () => {
    if (picked.size === 0) return;
    const players = sortedFriends
      .filter((friend) => picked.has(friend.uid))
      .map(mapFriendToPlayer);
    onAddFriends(players);
    onClose();
  };

  if (!isOpen) return null;

  const describeFriend = (friend: Friend) => {
    const parts: string[] = [];
    if (friend.username) parts.push(`@${friend.username}`);
    const mmr = Number(friend.mmr);
    if (Number.isFinite(mmr) && mmr > 0) parts.push(`MMR ${Math.round(mmr)}`);
    return parts.join(' · ');
  };

  const renderAvatar = (friend: Friend) => (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-black text-primary">
      {friend.photoURL ? (
        <img src={friend.photoURL} alt={friend.displayName} className="h-full w-full object-cover" />
      ) : (
        (friend.displayName || friend.username || 'P')
          .split(' ')
          .filter(Boolean)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'P'
      )}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/38 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 310 }}
        className="relative flex max-h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-18px_52px_rgba(15,23,42,0.22)]"
      >
        <div className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-ios-gray/20" />

        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-1 pt-4">
          <div>
            <h3 className="text-[20px] font-display font-bold leading-none tracking-[-0.02em] text-on-surface">Your friends</h3>
            <p className="mt-1.5 text-[12px] font-medium leading-none text-ios-gray">
              {friends.length} friend{friends.length !== 1 ? 's' : ''} · sorted A–Z
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ios-gray/10 text-ios-gray"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shrink-0 px-5 pb-3 pt-3">
          <div className="flex h-11 items-center gap-2.5 rounded-full border border-black/[0.14] bg-white px-4 focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/12">
            <Search size={16} strokeWidth={2.1} className="shrink-0 text-on-surface/38" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name or username"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface/40"
              aria-label="Filter friends"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => setQuery('')}
                className="tap-target flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.08] text-ios-gray"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {selectable.length === 0 && alreadyInMatch.length === 0 ? (
            <p className="rounded-[18px] bg-ios-gray/[0.04] p-4 text-center text-[13px] font-medium text-ios-gray">
              {trimmedQuery ? `No friends match "${query.trim()}".` : 'No friends to add.'}
            </p>
          ) : (
            <>
              {selectable.map((friend) => {
                const isPicked = picked.has(friend.uid);
                return (
                  <button
                    key={friend.uid}
                    type="button"
                    onClick={() => togglePick(friend.uid)}
                    aria-pressed={isPicked}
                    className={`tap-target mb-1.5 flex w-full items-center gap-3 rounded-[17px] px-3 py-2.5 text-left transition-colors ${
                      isPicked ? 'bg-[#fff5ef] ring-1 ring-primary/14' : 'active:bg-ios-gray/[0.04]'
                    }`}
                  >
                    {renderAvatar(friend)}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">
                        {friend.displayName || friend.username || 'Player'}
                      </span>
                      {describeFriend(friend) && (
                        <span className="block truncate text-[11.5px] font-medium text-ios-gray">{describeFriend(friend)}</span>
                      )}
                    </span>
                    <span
                      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${
                        isPicked ? 'bg-primary text-white' : 'text-transparent ring-[1.5px] ring-inset ring-ios-gray/35'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}

              {alreadyInMatch.length > 0 && (
                <>
                  <p className="px-1 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ios-gray">Already in this match</p>
                  {alreadyInMatch.map((friend) => (
                    <div key={friend.uid} className="mb-1.5 flex w-full items-center gap-3 rounded-[17px] px-3 py-2.5 opacity-55">
                      {renderAvatar(friend)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-on-surface">
                          {friend.displayName || friend.username || 'Player'}
                        </span>
                        {describeFriend(friend) && (
                          <span className="block truncate text-[11.5px] font-medium text-ios-gray">{describeFriend(friend)}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-ios-gray/[0.10] px-2.5 py-0.5 text-[10px] font-bold text-ios-gray">In match</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-black/5 bg-white/95 px-5 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={picked.size === 0}
            className="tap-target flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-[15px] font-black text-white shadow-[0_10px_22px_rgba(230,94,20,0.22)] disabled:opacity-40 disabled:shadow-none"
          >
            {picked.size === 0 ? 'Select friends to add' : `Add ${picked.size} to match`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
