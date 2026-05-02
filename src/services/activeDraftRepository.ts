import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { activeDraftDb } from '../firebase';
import { ACTIVE_TOURNAMENT_DRAFTS_COLLECTION } from './firestoreCollections';

export const readActiveTournamentDraft = async (uid: string) => {
  const draftDoc = await getDoc(doc(activeDraftDb, ACTIVE_TOURNAMENT_DRAFTS_COLLECTION, uid));
  return {
    exists: draftDoc.exists(),
    tournament: draftDoc.exists() ? draftDoc.data()?.tournament : null
  };
};

export const saveActiveTournamentDraft = async (uid: string, tournamentSnapshot: unknown) => {
  await setDoc(doc(activeDraftDb, ACTIVE_TOURNAMENT_DRAFTS_COLLECTION, uid), {
    uid,
    tournament: tournamentSnapshot,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const deleteActiveTournamentDraft = async (uid: string) => {
  await deleteDoc(doc(activeDraftDb, ACTIVE_TOURNAMENT_DRAFTS_COLLECTION, uid));
};
