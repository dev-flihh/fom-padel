import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where, limit as firestoreLimit, type DocumentData } from 'firebase/firestore';
import { db, firebaseProjectId, firestoreDatabaseId } from '../firebase';
import {
  PLAYER_MATCH_LEDGER_COLLECTION,
  TOURNAMENT_DETAILS_COLLECTION,
  TOURNAMENTS_COLLECTION,
  USERS_COLLECTION,
  USER_HISTORY_SUMMARY_COLLECTION
} from './firestoreCollections';

const withRepositoryTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const decodeFirestoreRestValue = (value: any): any => {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map((item: any) => decodeFirestoreRestValue(item));
  }
  if ('mapValue' in value) {
    return decodeFirestoreRestFields(value.mapValue?.fields || {});
  }
  return value;
};

const decodeFirestoreRestFields = (fields: Record<string, any>) => Object.fromEntries(
  Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreRestValue(value)])
);

export const fetchUserHistorySummaryRows = async (
  uid: string,
  options: { limitCount?: number; timeoutMs: number }
) => {
  const summarySnapshot = await withRepositoryTimeout(
    getDocs(
      query(
        collection(db, USERS_COLLECTION, uid, USER_HISTORY_SUMMARY_COLLECTION),
        orderBy('playedAt', 'desc'),
        ...(options.limitCount ? [firestoreLimit(options.limitCount)] : [])
      )
    ),
    options.timeoutMs,
    'History summary fetch'
  );

  return {
    docsCount: summarySnapshot.docs.length,
    rows: summarySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data()
    }))
  };
};

export const fetchUserHistorySummaryRowsViaRest = async (
  uid: string,
  token: string,
  options: { limitCount?: number; timeoutMs: number }
) => {
  if (!token || !firebaseProjectId || !firestoreDatabaseId) {
    return { docsCount: 0, rows: [] as { id: string; data: DocumentData }[] };
  }

  const params = new URLSearchParams({
    orderBy: 'playedAt desc'
  });
  if (options.limitCount) params.set('pageSize', String(options.limitCount));

  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/${USERS_COLLECTION}/${encodeURIComponent(uid)}/${USER_HISTORY_SUMMARY_COLLECTION}?${params.toString()}`;
  const response = await withRepositoryTimeout(
    fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }),
    options.timeoutMs,
    'History summary REST fetch'
  );
  if (!response.ok) {
    throw new Error(`History summary REST fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const docs = Array.isArray(payload?.documents) ? payload.documents : [];
  return {
    docsCount: docs.length,
    rows: docs.map((restDoc: any) => {
      const docId = typeof restDoc?.name === 'string' ? restDoc.name.split('/').pop() : '';
      return {
        id: docId || '',
        data: decodeFirestoreRestFields(restDoc?.fields || {})
      };
    })
  };
};

export const fetchPlayerLedgerTournamentRefs = async (
  uid: string,
  options: { limitCount: number; timeoutMs: number }
) => {
  const ledgerSnapshot = await withRepositoryTimeout(
    getDocs(
      query(
        collection(db, PLAYER_MATCH_LEDGER_COLLECTION),
        where('uid', '==', uid),
        orderBy('playedAt', 'desc'),
        firestoreLimit(options.limitCount)
      )
    ),
    options.timeoutMs,
    'History ledger fetch'
  );

  return {
    docsCount: ledgerSnapshot.docs.length,
    rows: ledgerSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data()
    }))
  };
};

export const fetchTournamentRowsByIds = async (
  tournamentIds: string[],
  options: { timeoutMs: number }
) => (
  Promise.all(
    tournamentIds.map(async (tournamentId) => {
      const tournamentSnap = await withRepositoryTimeout(
        getDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId)),
        options.timeoutMs,
        `History tournament detail fetch:${tournamentId}`
      );
      return {
        id: tournamentId,
        exists: tournamentSnap.exists(),
        data: tournamentSnap.exists() ? tournamentSnap.data() : null
      };
    })
  )
);

export const fetchOwnerTournamentRows = async (
  uid: string,
  options: { timeoutMs: number }
) => {
  const ownerSnapshot = await withRepositoryTimeout(
    getDocs(
      query(
        collection(db, TOURNAMENTS_COLLECTION),
        where('userId', '==', uid)
      )
    ),
    options.timeoutMs,
    'Owner tournament history fetch'
  );

  return {
    docsCount: ownerSnapshot.docs.length,
    rows: ownerSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data()
    }))
  };
};

export const readTournamentDetailRow = async (tournamentId: string) => {
  const detailSnap = await getDoc(doc(db, TOURNAMENT_DETAILS_COLLECTION, tournamentId));
  return {
    exists: detailSnap.exists(),
    data: detailSnap.exists() ? detailSnap.data() : null
  };
};

export const readLegacyTournamentRow = async (tournamentId: string) => {
  const fallbackSnap = await getDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId));
  return {
    exists: fallbackSnap.exists(),
    data: fallbackSnap.exists() ? fallbackSnap.data() : null
  };
};

export const saveTournamentDetailAndSummary = async (
  tournamentId: string,
  detailPayload: DocumentData,
  summaryPayload: DocumentData
) => {
  await setDoc(doc(db, TOURNAMENT_DETAILS_COLLECTION, tournamentId), {
    ...detailPayload,
    date: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await setDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId), summaryPayload);
};
