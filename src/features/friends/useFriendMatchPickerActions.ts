import { auth, db } from '../../firebase';
import type { Dispatch, SetStateAction } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import type { Friend, Player, Tournament } from '../../types';

type Params = {
  userUid?: string | null;
  setAllPlayers: Dispatch<SetStateAction<Player[]>>;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  serverTimestamp: () => unknown;
  usersCollection: string;
  userFriendsCollection: string;
};

export const useFriendMatchPickerActions = ({
  userUid,
  setAllPlayers,
  setTournament,
  serverTimestamp,
  usersCollection,
  userFriendsCollection,
}: Params) => {
  const upsertPlayerFromFriend = (friend: Friend) => {
    const initials = friend.displayName
      .split(' ')
      .filter(Boolean)
      .map((namePart) => namePart[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'FR';
    const playerObj: Player = {
      id: friend.uid,
      name: friend.displayName,
      rating: friend.mmr || 0,
      source: 'fom',
      avatar: friend.photoURL || '',
      initials,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 },
    };

    setAllPlayers((prev) => {
      const existsInList = prev.some((player) => player.id === playerObj.id);
      const next = existsInList ? prev : [playerObj, ...prev];
      if (!existsInList) {
        console.info('[FriendsPicker] Added friend to allPlayers catalog', {
          friendUid: friend.uid,
          friendName: friend.displayName,
          allPlayersBefore: prev.length,
          allPlayersAfter: next.length,
        });
      }
      return next;
    });

    setTournament((prev) => {
      const alreadySelected = prev.players.some((player) => player.id === playerObj.id);
      const nextPlayers = alreadySelected
        ? prev.players.filter((player) => player.id !== playerObj.id)
        : [...prev.players, playerObj];
      console.info('[FriendsPicker] Toggle friend selection for match', {
        friendUid: friend.uid,
        friendName: friend.displayName,
        action: alreadySelected ? 'removed' : 'added',
        selectedBefore: prev.players.length,
        selectedAfter: nextPlayers.length,
      });
      return {
        ...prev,
        players: nextPlayers,
      };
    });

    const uid = auth.currentUser?.uid || userUid;
    if (uid) {
      setDoc(
        doc(db, usersCollection, uid, userFriendsCollection, friend.uid),
        { lastPlayedAt: serverTimestamp() },
        { merge: true }
      ).catch((err) => console.error('Update friend lastPlayedAt error:', err));
    }
  };

  return { upsertPlayerFromFriend };
};
