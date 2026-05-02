import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, functions as firebaseFunctions } from '../firebase';
import {
  USERS_COLLECTION,
  USER_FRIENDS_COLLECTION,
  USER_FRIEND_REQUESTS_COLLECTION,
  USER_NOTIFICATIONS_COLLECTION,
  USER_SENT_FRIEND_REQUESTS_COLLECTION
} from './firestoreCollections';
import { type Friend, type FriendRequest, type FriendRequestStatus, type UserProfile } from '../types';

type CurrentFriendUser = {
  uid: string;
  displayName?: string;
  photoURL?: string;
  username?: string;
  mmr?: number;
};

export const fetchFriendsScreenData = async (uid: string) => {
  const [friendsSnapshot, incomingSnapshot, outgoingSnapshot] = await Promise.all([
    getDocs(query(collection(db, USERS_COLLECTION, uid, USER_FRIENDS_COLLECTION), orderBy('displayName', 'asc'))),
    getDocs(query(collection(db, USERS_COLLECTION, uid, USER_FRIEND_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, USERS_COLLECTION, uid, USER_SENT_FRIEND_REQUESTS_COLLECTION))),
  ]);

  const fetchedFriends: Friend[] = [];
  friendsSnapshot.forEach((docSnap) => {
    fetchedFriends.push(docSnap.data() as Friend);
  });

  const fetchedIncoming: FriendRequest[] = [];
  incomingSnapshot.forEach((docSnap) => {
    const data = docSnap.data() as FriendRequest;
    if (data.status === 'pending') fetchedIncoming.push(data);
  });

  const statusMap: Record<string, FriendRequestStatus> = {};
  outgoingSnapshot.forEach((docSnap) => {
    const data = docSnap.data() as FriendRequest;
    const targetUid = data.targetUid || docSnap.id;
    statusMap[targetUid] = (data.status || 'pending') as FriendRequestStatus;
  });

  return {
    mergedFriends: fetchedFriends,
    mergedIncoming: fetchedIncoming,
    statusMap,
    docsCount: friendsSnapshot.docs.length + incomingSnapshot.docs.length + outgoingSnapshot.docs.length,
  };
};

export const fetchUserFriends = async (uid: string) => {
  const snapshot = await getDocs(query(collection(db, USERS_COLLECTION, uid, USER_FRIENDS_COLLECTION)));
  const fetched: Friend[] = [];
  snapshot.forEach((docSnap) => fetched.push(docSnap.data() as Friend));
  return fetched;
};

export const searchFriendUsers = async (searchQuery: string) => {
  const searchUsers = httpsCallable<
    { query: string },
    { results?: UserProfile[]; meta?: { queryCount?: number; readDocs?: number } }
  >(firebaseFunctions, 'searchUsers');
  const response = await searchUsers({ query: searchQuery.trim() });
  const results = Array.isArray(response.data?.results) ? response.data.results : [];

  return {
    results: results.map((result) => {
      const numericMmr = Number(result?.mmr);
      return {
        ...result,
        mmr: Number.isFinite(numericMmr) ? Math.max(0, numericMmr) : 0
      };
    }),
    queryCount: Number(response.data?.meta?.queryCount || 1),
    readDocs: Number(response.data?.meta?.readDocs || results.length),
  };
};

export const sendFriendRequestToUser = async ({
  requester,
  targetUser,
  notificationsEnabled
}: {
  requester: CurrentFriendUser;
  targetUser: UserProfile;
  notificationsEnabled: boolean;
}) => {
  const payload: FriendRequest = {
    requesterUid: requester.uid,
    targetUid: targetUser.uid,
    status: 'pending',
    requesterDisplayName: requester.displayName || 'Player',
    requesterPhotoURL: requester.photoURL || '',
    requesterUsername: requester.username || '',
    requesterMmr: Number.isFinite(Number(requester?.mmr)) ? Number(requester.mmr) : 0,
    targetDisplayName: targetUser.displayName || '',
    targetPhotoURL: targetUser.photoURL || '',
    targetUsername: targetUser.username || '',
    targetMmr: Number.isFinite(Number(targetUser?.mmr)) ? Number(targetUser.mmr) : 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await Promise.all([
    setDoc(doc(db, USERS_COLLECTION, targetUser.uid, USER_FRIEND_REQUESTS_COLLECTION, requester.uid), payload, { merge: true }),
    setDoc(doc(db, USERS_COLLECTION, requester.uid, USER_SENT_FRIEND_REQUESTS_COLLECTION, targetUser.uid), payload, { merge: true })
  ]);

  if (!notificationsEnabled) return;

  const notifId = Math.random().toString(36).slice(2, 11);
  try {
    await setDoc(doc(db, USERS_COLLECTION, targetUser.uid, USER_NOTIFICATIONS_COLLECTION, notifId), {
      id: notifId,
      title: 'Friend Request',
      message: `${requester.displayName || 'Someone'} wants to connect with you.`,
      timestamp: serverTimestamp(),
      type: 'system',
      read: false
    });
  } catch (notifErr) {
    console.error('Send friend request notification error:', notifErr);
  }
};

export const resolveFriendRequest = async ({
  currentUser,
  request,
  decision,
  notificationsEnabled
}: {
  currentUser: CurrentFriendUser;
  request: FriendRequest;
  decision: 'accepted' | 'declined';
  notificationsEnabled: boolean;
}) => {
  const nowPayload = {
    status: decision,
    updatedAt: serverTimestamp(),
    resolvedAt: serverTimestamp()
  };

  if (decision === 'declined') {
    await Promise.all([
      setDoc(doc(db, USERS_COLLECTION, currentUser.uid, USER_FRIEND_REQUESTS_COLLECTION, request.requesterUid), nowPayload, { merge: true }),
      setDoc(doc(db, USERS_COLLECTION, request.requesterUid, USER_SENT_FRIEND_REQUESTS_COLLECTION, currentUser.uid), nowPayload, { merge: true })
    ]);
    return null;
  }

  const requesterFriendData: Friend = {
    uid: request.requesterUid,
    displayName: request.requesterDisplayName || 'Friends',
    photoURL: request.requesterPhotoURL || '',
    username: request.requesterUsername || '',
    mmr: Number.isFinite(Number(request.requesterMmr))
      ? Number(request.requesterMmr)
      : 0,
    addedAt: serverTimestamp(),
    lastPlayedAt: null
  };

  const currentUserFriendData: Friend = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || 'Player',
    photoURL: currentUser.photoURL || '',
    username: currentUser.username || '',
    mmr: Number.isFinite(Number(currentUser?.mmr))
      ? Number(currentUser.mmr)
      : 0,
    addedAt: serverTimestamp(),
    lastPlayedAt: null
  };

  const writes = [
    setDoc(doc(db, USERS_COLLECTION, currentUser.uid, USER_FRIENDS_COLLECTION, request.requesterUid), requesterFriendData, { merge: true }),
    setDoc(doc(db, USERS_COLLECTION, request.requesterUid, USER_FRIENDS_COLLECTION, currentUser.uid), currentUserFriendData, { merge: true }),
    setDoc(doc(db, USERS_COLLECTION, currentUser.uid, USER_FRIEND_REQUESTS_COLLECTION, request.requesterUid), nowPayload, { merge: true }),
    setDoc(doc(db, USERS_COLLECTION, request.requesterUid, USER_SENT_FRIEND_REQUESTS_COLLECTION, currentUser.uid), nowPayload, { merge: true })
  ];

  if (notificationsEnabled) {
    const acceptedNotifId = Math.random().toString(36).slice(2, 11);
    writes.push(
      setDoc(doc(db, USERS_COLLECTION, request.requesterUid, USER_NOTIFICATIONS_COLLECTION, acceptedNotifId), {
        id: acceptedNotifId,
        title: 'Request accepted',
        message: `${currentUser.displayName || 'Your friend'} accepted your friend request.`,
        timestamp: serverTimestamp(),
        type: 'achievement',
        read: false
      })
    );
  }

  await Promise.all(writes);
  return requesterFriendData;
};
