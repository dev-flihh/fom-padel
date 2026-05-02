import { collection, deleteDoc, doc, getDocs, query, setDoc, where, type DocumentData, type SetOptions } from 'firebase/firestore';
import { sharedDb } from '../firebase';
import { SHARED_MATCHES_COLLECTION } from './firestoreCollections';

export const getSharedMatchRef = (shareId: string) => (
  doc(sharedDb, SHARED_MATCHES_COLLECTION, shareId)
);

export const discoverSharedMatchIdsForActiveTournament = async (hostUid: string, activeStartedAt: number) => {
  const sharesQuery = query(
    collection(sharedDb, SHARED_MATCHES_COLLECTION),
    where('hostUid', '==', hostUid),
    where('activeStartedAt', '==', activeStartedAt)
  );
  const snapshot = await getDocs(sharesQuery);
  return {
    ids: snapshot.docs.map((docSnap) => docSnap.id),
    docsCount: snapshot.docs.length
  };
};

export const saveSharedMatch = async (
  shareId: string,
  payload: DocumentData,
  options?: SetOptions
) => {
  await setDoc(getSharedMatchRef(shareId), payload, options || {});
};

export const saveSharedMatches = async (
  shareIds: string[],
  getPayload: (shareId: string) => DocumentData,
  options?: SetOptions
) => {
  await Promise.all(
    shareIds.map((shareId) => saveSharedMatch(shareId, getPayload(shareId), options))
  );
};

export const deleteSharedMatch = async (shareId: string) => {
  await deleteDoc(getSharedMatchRef(shareId));
};
