import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw, Search, User, Users } from 'lucide-react';
import { AppPageHeader } from '../../components/app/AppPageHeader';
import { cn } from '../../lib/utils';
import { auth } from '../../firebase';
import { type AppNotification, type Friend, type FriendRequest, type FriendRequestStatus, type UserProfile } from '../../types';
import { readCachedFriendsScreenData, writeCachedFriendsScreenData } from './friendsScreenCache';
import { sortFriendsByName } from './friendUtils';
import { fetchFriendsScreenData, resolveFriendRequest, searchFriendUsers, sendFriendRequestToUser } from '../../services/friendsRepository';
import { formatDisplayMmr } from '../ranking/rankUtils';

type FriendsScreenProps = {
  currentUser: any;
  onBack: () => void;
  addNotification: (title: string, message: string, type: AppNotification['type']) => void;
  notificationsEnabled: boolean;
  isFirestoreSaverModeEnabled: () => boolean;
  recordDbMetric: (record: any) => void;
  recordDbError: (record: any) => void;
  pickerMode?: boolean;
  selectedPlayerIds?: string[];
  onTogglePickForMatch?: (friend: MatchPickerCandidate) => void;
  onDonePick?: () => void;
};

export type MatchPickerCandidate = Friend & {
  relation?: 'friend' | 'search';
};

const buildMatchPickerCandidate = (
  userProfile: UserProfile,
  relation: MatchPickerCandidate['relation']
): MatchPickerCandidate => {
  const mmr = Number(userProfile?.mmr);
  return {
    uid: userProfile.uid,
    displayName: userProfile.displayName || userProfile.username || 'Player',
    photoURL: userProfile.photoURL || '',
    username: userProfile.username || '',
    mmr: Number.isFinite(mmr) ? mmr : 0,
    relation,
  };
};

export const FriendsScreen = ({
  currentUser,
  onBack,
  addNotification,
  notificationsEnabled,
  isFirestoreSaverModeEnabled,
  recordDbMetric,
  recordDbError,
  pickerMode = false,
  selectedPlayerIds = [],
  onTogglePickForMatch,
  onDonePick
}: FriendsScreenProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequestStatuses, setOutgoingRequestStatuses] = useState<Record<string, FriendRequestStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [sendingRequestUid, setSendingRequestUid] = useState<string | null>(null);

  useEffect(() => {
    // Prevent inherited scroll position from previous screen so search is visible on first open.
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequestStatuses({});
      setLoading(false);
      return;
    }

    const cachedData = readCachedFriendsScreenData(uid);
    if (cachedData) {
      setFriends(cachedData.friends);
      setIncomingRequests(cachedData.incomingRequests);
      setOutgoingRequestStatuses(cachedData.outgoingRequestStatuses);
      setLoading(false);
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequestStatuses({});
      setLoading(true);
    }

    if (isFirestoreSaverModeEnabled()) {
      recordDbMetric({ flow: 'friends', operation: 'skip', count: 1, label: cachedData ? 'saver_mode_cache_only' : 'saver_mode_no_cache' });
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const loadFriendsScreen = async () => {
      try {
        const { mergedFriends, mergedIncoming, statusMap, docsCount } = await fetchFriendsScreenData(uid);
        recordDbMetric({
          flow: 'friends',
          operation: 'read',
          count: 3,
          docs: docsCount,
          label: 'friends_screen'
        });
        if (isCancelled) return;
        setFriends(mergedFriends);
        setIncomingRequests(mergedIncoming);
        setOutgoingRequestStatuses(statusMap);
        writeCachedFriendsScreenData(uid, {
          friends: mergedFriends,
          incomingRequests: mergedIncoming,
          outgoingRequestStatuses: statusMap,
        });
      } catch (error) {
        recordDbError({ flow: 'friends', label: 'friends_screen', err: error });
        console.error('Friends screen fetch error:', error);
        if (isCancelled) return;
        if (!cachedData) {
          setFriends([]);
          setIncomingRequests([]);
          setOutgoingRequestStatuses({});
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    void loadFriendsScreen();
    return () => {
      isCancelled = true;
    };
  }, [currentUser?.uid, auth.currentUser?.uid]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;
    writeCachedFriendsScreenData(uid, {
      friends,
      incomingRequests,
      outgoingRequestStatuses,
    });
  }, [currentUser?.uid, auth.currentUser?.uid, friends, incomingRequests, outgoingRequestStatuses]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const { results, queryCount, readDocs } = await searchFriendUsers(searchQuery);
      recordDbMetric({
        flow: 'friends_search',
        operation: 'read',
        count: queryCount,
        docs: readDocs,
        label: 'callable_search_users'
      });

      setSearchResults(results);
      if (results.length === 0) {
        addNotification('Search', 'User not found.', 'system');
      }
    } catch (err) {
      recordDbError({ flow: 'friends_search', label: 'callable_search_users', err });
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (targetUser: UserProfile) => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;
    if (uid === targetUser.uid) {
      addNotification('Cannot send request', 'You cannot add yourself as a friend.', 'system');
      return;
    }
    if (friends.some((f) => f.uid === targetUser.uid)) {
      addNotification('Already friends', `${targetUser.displayName} is already in your friends list.`, 'system');
      return;
    }
    if (outgoingRequestStatuses[targetUser.uid] === 'pending') {
      addNotification('Request pending', `Friend request to ${targetUser.displayName} is still pending.`, 'system');
      return;
    }

    setSendingRequestUid(targetUser.uid);
    try {
      await sendFriendRequestToUser({
        requester: {
          uid,
          displayName: currentUser.displayName || auth.currentUser?.displayName || 'Player',
          photoURL: currentUser.photoURL || auth.currentUser?.photoURL || '',
          username: currentUser.username || '',
          mmr: currentUser?.mmr
        },
        targetUser,
        notificationsEnabled: notificationsEnabled
      });
      setOutgoingRequestStatuses((prev) => ({ ...prev, [targetUser.uid]: 'pending' }));
      addNotification('Request sent', `Friend request sent to ${targetUser.displayName}.`, 'system');
    } catch (err) {
      console.error('Send friend request error:', err);
      addNotification('Request failed', 'There was a problem sending the friend request.', 'system');
    } finally {
      setSendingRequestUid(null);
    }
  };

  const handleFriendRequestDecision = async (request: FriendRequest, decision: 'accepted' | 'declined') => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;
    setProcessingRequestId(request.requesterUid);

    try {
      const requesterFriendData = await resolveFriendRequest({
        currentUser: {
          uid,
          displayName: currentUser.displayName || auth.currentUser?.displayName || 'Player',
          photoURL: currentUser.photoURL || auth.currentUser?.photoURL || '',
          username: currentUser.username || '',
          mmr: currentUser?.mmr
        },
        request,
        decision,
        notificationsEnabled: notificationsEnabled
      });

      if (decision === 'accepted') {
        setFriends((prev) => sortFriendsByName([
          ...prev.filter((item) => item.uid !== request.requesterUid),
          {
            ...(requesterFriendData as Friend),
            addedAt: new Date(),
          }
        ]));
        addNotification('New friend added', `${request.requesterDisplayName} is now in your friends list.`, 'achievement');
      } else {
        addNotification('Request declined', `Request from ${request.requesterDisplayName} has been declined.`, 'system');
      }

      setIncomingRequests((prev) => prev.filter((item) => item.requesterUid !== request.requesterUid));
    } catch (err) {
      console.error('Handle friend request decision error:', err);
      addNotification('Request processing failed', 'Please try again in a moment.', 'system');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const selectedCount = selectedPlayerIds.length;
  const sortedFriends = useMemo(() => sortFriendsByName(friends), [friends]);
  const selectedFriends = useMemo(
    () => sortFriendsByName(friends.filter((friend) => selectedPlayerIds.includes(friend.uid))),
    [friends, selectedPlayerIds]
  );
  const searchSectionTitle = pickerMode ? 'Find FOM Players' : 'Find Friends';
  const searchSectionCopy = pickerMode
    ? 'Search FOM players by username, email, or phone.'
    : 'Search by username, email, or phone.';
  const friendsSectionTitle = pickerMode ? 'Your Friends' : 'Your Friends';
  const friendsSectionCopy = pickerMode
    ? 'Tap to add players into this match.'
    : 'Your player network.';
  const headerMetaItems = [
    { label: friends.length === 1 ? 'friend' : 'friends', value: friends.length.toLocaleString('en-US') },
    { label: incomingRequests.length === 1 ? 'request' : 'requests', value: incomingRequests.length.toLocaleString('en-US') },
  ];

  const searchPanel = (
    <section className="rounded-[24px] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.04]">
      <div className="mb-3">
        <h2 className="text-[16px] font-semibold tracking-tight text-on-surface">{searchSectionTitle}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
          {searchSectionCopy}
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-2.5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search username, email, or phone number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[18px] border border-black/[0.04] bg-ios-gray/[0.035] py-3.5 pl-11 pr-4 text-[14px] font-medium text-on-surface transition-all focus:outline-none focus:ring-2 focus:ring-[#ff5500]/15"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ios-gray" size={18} />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="inline-flex h-10 items-center rounded-full bg-[#ff5500] px-4 text-[12px] font-semibold tracking-tight text-white tap-target disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ios-gray/72">Search Results</p>
          {searchResults.map(res => (
            <div key={res.uid} className="flex items-center justify-between gap-3 rounded-[18px] bg-ios-gray/[0.025] px-3 py-3 ring-1 ring-black/[0.03]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/[0.08] ring-1 ring-black/[0.03]">
                  {res.photoURL ? <img src={res.photoURL} className="h-full w-full object-cover" /> : <User size={20} className="text-ios-gray/30" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-on-surface">{res.displayName}</p>
                  <p className="truncate text-[11px] font-medium tracking-tight text-ios-gray">@{res.username || 'user'}</p>
                </div>
              </div>
              {(() => {
                const isAlreadyFriend = friends.some(f => f.uid === res.uid);
                const requestStatus = outgoingRequestStatuses[res.uid];
                const isPending = requestStatus === 'pending';
                const isAccepted = requestStatus === 'accepted';
                const isSending = sendingRequestUid === res.uid;
                const isSelectedForMatch = selectedPlayerIds.includes(res.uid);
                const disabled = pickerMode
                  ? false
                  : isAlreadyFriend || isPending || isAccepted || isSending;

                const label = pickerMode
                  ? isSelectedForMatch
                    ? 'Selected'
                    : 'Add to Match'
                  : isAlreadyFriend
                  ? 'Friends'
                  : isSending
                    ? 'Sending...'
                  : isPending
                    ? 'Pending'
                    : isAccepted
                      ? 'Accepted'
                      : 'Add';

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (pickerMode && onTogglePickForMatch) {
                        onTogglePickForMatch(buildMatchPickerCandidate(res, isAlreadyFriend ? 'friend' : 'search'));
                        return;
                      }
                      sendFriendRequest(res);
                    }}
                    disabled={disabled}
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold tracking-tight tap-target',
                      pickerMode && isSelectedForMatch
                        ? 'border border-[#ff5500]/15 bg-[#ff5500]/[0.06] text-[#ff5500]'
                        : disabled
                        ? 'border border-black/5 bg-white text-ios-gray'
                        : 'bg-[#ff5500] text-white'
                    )}
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const friendsPanel = (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.04]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="px-3.5 pt-3.5">
          <h2 className="text-[16px] font-semibold tracking-tight text-on-surface">{friendsSectionTitle}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
            {friendsSectionCopy}
          </p>
        </div>
        <span className="mr-3.5 mt-3.5 shrink-0 rounded-full bg-ios-gray/[0.06] px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
          {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="animate-spin text-ios-gray/25" size={30} />
        </div>
      ) : friends.length === 0 ? (
        <div className="mx-3.5 mb-3.5 rounded-[20px] border border-dashed border-black/8 bg-ios-gray/[0.025] px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <Users size={40} className="text-ios-gray/20" />
          </div>
          <h3 className="text-[18px] font-semibold tracking-tight text-on-surface">
            {pickerMode ? 'No friends yet' : 'No friends yet'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ios-gray">
            {pickerMode
              ? 'Search for FOM players below, then bring them into this match.'
              : 'Search for players using username, email, or phone number to start building your network.'}
          </p>
        </div>
      ) : (
        <div className="border-t border-black/[0.045]">
          {sortedFriends.map(friend => (
            <div
              key={friend.uid}
              className={cn(
                'flex items-center justify-between gap-3 border-b border-black/[0.045] px-3.5 py-3',
                pickerMode && selectedPlayerIds.includes(friend.uid)
                  ? 'bg-[#ff5500]/[0.035]'
                  : 'bg-white'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/[0.08] ring-1 ring-black/[0.03]">
                  {friend.photoURL ? <img src={friend.photoURL} className="h-full w-full object-cover" /> : <User size={24} className="text-ios-gray/30" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-on-surface">{friend.displayName}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                    <span className="shrink-0">{formatDisplayMmr(friend.mmr)} MMR</span>
                    <span className="shrink-0 text-ios-gray/45">·</span>
                    <span className="truncate">@{friend.username || 'user'}</span>
                  </div>
                </div>
              </div>
              {pickerMode && onTogglePickForMatch ? (
                <button
                  onClick={() => onTogglePickForMatch(friend)}
                  className={cn(
                    'h-9 shrink-0 rounded-full px-3.5 text-[11px] font-semibold tracking-tight tap-target',
                    selectedPlayerIds.includes(friend.uid)
                      ? 'border border-[#ff5500]/15 bg-[#ff5500]/[0.06] text-[#ff5500]'
                      : 'bg-[#ff5500] text-white'
                  )}
                >
                  {selectedPlayerIds.includes(friend.uid) ? 'Selected' : 'Add'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className={cn('min-h-screen pb-32', pickerMode ? 'bg-surface' : 'bg-white')}>
      {pickerMode && (
        <header className="ios-blur sticky top-0 z-50 flex min-h-16 w-full items-center border-b border-ios-gray/10 px-4 py-2">
          <button onClick={onBack} className="tap-target p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div className="ml-2 min-w-0 flex-1">
            <h1 className="text-[17px] font-bold tracking-tight text-on-surface">
              Add Players
            </h1>
            <p className="mt-0.5 truncate text-[12px] font-medium tracking-tight text-ios-gray">
              {selectedCount} player{selectedCount === 1 ? '' : 's'} selected
            </p>
          </div>
          <button
            onClick={onDonePick || onBack}
            className="ml-3 inline-flex h-9 shrink-0 items-center rounded-full border border-[#ff5500]/15 bg-[#ff5500]/[0.08] px-3.5 text-[12px] font-semibold tracking-tight text-[#ff5500] tap-target"
          >
            Done
          </button>
        </header>
      )}

      <main className={cn(
        'mx-auto max-w-2xl space-y-4 px-4',
        pickerMode ? 'py-4' : 'pb-4 pt-[calc(env(safe-area-inset-top,0px)+34px)]'
      )}>
        {!pickerMode && (
          <AppPageHeader
            eyebrow="Friends"
            title="Player network"
            subtitle="Search, invite, and manage FOM players."
            metaItems={headerMetaItems}
            className="px-0"
          />
        )}

        {pickerMode && (
          <section className="rounded-[24px] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ios-gray/72">Selected Players</p>
                <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-on-surface tabular-nums">
                  {selectedCount}
                </p>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ios-gray">
                  Choose friends to bring into this match.
                </p>
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-tight",
                selectedCount > 0 ? "bg-[#ff5500]/[0.08] text-[#ff5500]" : "bg-ios-gray/[0.08] text-ios-gray"
              )}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'No players'}
              </span>
            </div>
            {selectedFriends.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="inline-flex items-center gap-2 rounded-full bg-ios-gray/[0.05] px-2.5 py-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-semibold text-[#ff5500]">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} className="h-full w-full object-cover" />
                      ) : (
                        (friend.displayName || 'F').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="max-w-[112px] truncate text-[12px] font-medium text-on-surface">
                      {friend.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!pickerMode && incomingRequests.length > 0 && (
          <section className="rounded-[24px] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-1 ring-[#ff5500]/10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold tracking-tight text-on-surface">Friend Requests</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
                  Review incoming player requests before they join your network.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#ff5500]/[0.08] px-3 py-1.5 text-[11px] font-semibold tracking-tight text-[#ff5500]">
                {incomingRequests.length} new
              </span>
            </div>
            <div className="space-y-3">
              {incomingRequests.map((request) => {
                const isProcessing = processingRequestId === request.requesterUid;
                const requesterMmr = Number.isFinite(Number(request.requesterMmr))
                  ? Number(request.requesterMmr)
                  : 0;
                return (
                  <div key={request.requesterUid} className="rounded-[20px] bg-ios-gray/[0.025] px-3.5 py-3.5 ring-1 ring-black/[0.03]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ios-gray/[0.08] ring-1 ring-black/[0.03]">
                          {request.requesterPhotoURL ? (
                            <img src={request.requesterPhotoURL} className="h-full w-full object-cover" />
                          ) : (
                            <User size={22} className="text-ios-gray/35" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-on-surface">{request.requesterDisplayName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ios-gray ring-1 ring-black/[0.03]">{formatDisplayMmr(requesterMmr)} MMR</span>
                            <span className="truncate text-[11px] font-medium tracking-tight text-ios-gray">
                              @{request.requesterUsername || 'user'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleFriendRequestDecision(request, 'declined')}
                          disabled={isProcessing}
                          className="h-8 rounded-full border border-black/5 bg-white px-3 text-[11px] font-semibold tracking-tight text-ios-gray tap-target disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleFriendRequestDecision(request, 'accepted')}
                          disabled={isProcessing}
                          className="h-8 rounded-full bg-[#ff5500] px-3 text-[11px] font-semibold tracking-tight text-white tap-target disabled:opacity-50"
                        >
                          {isProcessing ? '...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pickerMode ? (
          <>
            {friendsPanel}
            {searchPanel}
          </>
        ) : (
          <>
            {searchPanel}
            {friendsPanel}
          </>
        )}
      </main>
    </div>
  );
};
