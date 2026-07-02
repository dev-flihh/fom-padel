import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  ROOM_FINANCE_COLLECTION,
  ROOM_PARTICIPANT_FINANCE_COLLECTION,
  ROOM_PRIVATE_FINANCE_DOC_ID,
  ROOMS_COLLECTION,
  USER_FINANCE_MATCH_SNAPSHOTS_COLLECTION,
  USERS_COLLECTION,
} from '../../services/firestoreCollections';
import type {
  HostFinanceMatchSnapshot,
  Room,
  RoomFinancePrivate,
  RoomParticipantFinance,
} from './types';

const stripUndefinedDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .map(([key, nestedValue]) => [key, stripUndefinedDeep(nestedValue)])
  );
};

const omitVolatileFields = (value: Record<string, unknown>) => {
  const {
    createdAt,
    updatedAt,
    lastCalculatedAt,
    paidAt,
    markedPaidBy,
    ...stableValue
  } = value;
  return stableValue;
};

const isSameParticipantFinance = (
  previous?: RoomParticipantFinance,
  next?: RoomParticipantFinance
) => {
  if (!previous || !next) return false;
  return JSON.stringify(omitVolatileFields(previous as unknown as Record<string, unknown>)) ===
    JSON.stringify(omitVolatileFields(next as unknown as Record<string, unknown>)) &&
    previous.paymentStatus === next.paymentStatus &&
    previous.paidAt === next.paidAt &&
    previous.markedPaidBy === next.markedPaidBy;
};

export const getRoomFinancePrivateRef = (roomId: string) => (
  doc(db, ROOMS_COLLECTION, roomId, ROOM_FINANCE_COLLECTION, ROOM_PRIVATE_FINANCE_DOC_ID)
);

export const getRoomParticipantFinanceCollectionRef = (roomId: string) => (
  collection(db, ROOMS_COLLECTION, roomId, ROOM_PARTICIPANT_FINANCE_COLLECTION)
);

export const getRoomParticipantFinanceRef = (roomId: string, participantId: string) => (
  doc(db, ROOMS_COLLECTION, roomId, ROOM_PARTICIPANT_FINANCE_COLLECTION, participantId)
);

export const getHostFinanceMatchSnapshotRef = (hostUid: string, snapshotId: string) => (
  doc(db, USERS_COLLECTION, hostUid, USER_FINANCE_MATCH_SNAPSHOTS_COLLECTION, snapshotId)
);

export const getRoomFinancePrivate = async (roomId: string) => {
  const snapshot = await getDoc(getRoomFinancePrivateRef(roomId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as RoomFinancePrivate;
};

export const saveRoomFinancePrivate = async (
  roomId: string,
  finance: RoomFinancePrivate
) => {
  const payload = stripUndefinedDeep({
    ...finance,
    updatedAt: serverTimestamp(),
    createdAt: finance.createdAt || serverTimestamp(),
  }) as RoomFinancePrivate;

  await setDoc(getRoomFinancePrivateRef(roomId), payload, { merge: true });
};

export const listRoomParticipantFinances = async (roomId: string) => {
  const snapshot = await getDocs(getRoomParticipantFinanceCollectionRef(roomId));
  return snapshot.docs.map((docSnap) => docSnap.data() as RoomParticipantFinance);
};

export const getRoomParticipantFinance = async (
  roomId: string,
  participantId: string
) => {
  const snapshot = await getDoc(getRoomParticipantFinanceRef(roomId, participantId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as RoomParticipantFinance;
};

export const saveRoomParticipantFinance = async (
  roomId: string,
  finance: RoomParticipantFinance
) => {
  const payload = stripUndefinedDeep({
    ...finance,
    updatedAt: serverTimestamp(),
    createdAt: finance.createdAt || serverTimestamp(),
  }) as RoomParticipantFinance;

  await setDoc(getRoomParticipantFinanceRef(roomId, finance.participantId), payload, { merge: true });
};

export const saveRoomParticipantFinances = async (
  roomId: string,
  finances: RoomParticipantFinance[]
) => {
  const batch = writeBatch(db);
  finances.forEach((finance) => {
    const payload = stripUndefinedDeep({
      ...finance,
      updatedAt: serverTimestamp(),
      createdAt: finance.createdAt || serverTimestamp(),
    }) as RoomParticipantFinance;
    batch.set(getRoomParticipantFinanceRef(roomId, finance.participantId), payload, { merge: true });
  });
  await batch.commit();
};

export const saveHostFinanceMatchSnapshot = async (
  hostUid: string,
  snapshot: HostFinanceMatchSnapshot
) => {
  const payload = stripUndefinedDeep({
    ...snapshot,
    updatedAt: serverTimestamp(),
    createdAt: snapshot.createdAt || serverTimestamp(),
  }) as HostFinanceMatchSnapshot;

  await setDoc(getHostFinanceMatchSnapshotRef(hostUid, snapshot.id), payload, { merge: true });
};

export const saveRoomFinanceState = async ({
  roomId,
  privateFinance,
  participantFinances,
  hostSnapshot,
}: {
  roomId: string;
  privateFinance: RoomFinancePrivate;
  participantFinances: RoomParticipantFinance[];
  hostSnapshot?: HostFinanceMatchSnapshot;
}) => {
  const batch = writeBatch(db);

  batch.set(
    getRoomFinancePrivateRef(roomId),
    stripUndefinedDeep({
      ...privateFinance,
      updatedAt: serverTimestamp(),
      createdAt: privateFinance.createdAt || serverTimestamp(),
    }) as RoomFinancePrivate,
    { merge: true }
  );

  participantFinances.forEach((finance) => {
    batch.set(
      getRoomParticipantFinanceRef(roomId, finance.participantId),
      stripUndefinedDeep({
        ...finance,
        updatedAt: serverTimestamp(),
        createdAt: finance.createdAt || serverTimestamp(),
      }) as RoomParticipantFinance,
      { merge: true }
    );
  });

  if (hostSnapshot) {
    batch.set(
      getHostFinanceMatchSnapshotRef(hostSnapshot.hostUid, hostSnapshot.id),
      stripUndefinedDeep({
        ...hostSnapshot,
        updatedAt: serverTimestamp(),
        createdAt: hostSnapshot.createdAt || serverTimestamp(),
      }) as HostFinanceMatchSnapshot,
      { merge: true }
    );
  }

  await batch.commit();
};

export const saveRoomFinanceStateDelta = async ({
  roomId,
  roomPatch,
  privateFinance,
  participantFinances,
  previousParticipantFinances = [],
  hostSnapshot,
}: {
  roomId: string;
  roomPatch?: Partial<Room>;
  privateFinance: RoomFinancePrivate;
  participantFinances: RoomParticipantFinance[];
  previousParticipantFinances?: RoomParticipantFinance[];
  hostSnapshot?: HostFinanceMatchSnapshot;
}) => {
  const batch = writeBatch(db);
  const previousByParticipantId = new Map(
    previousParticipantFinances.map((finance) => [finance.participantId, finance])
  );
  const nextParticipantIds = new Set(participantFinances.map((finance) => finance.participantId));

  if (roomPatch) {
    batch.set(
      doc(db, ROOMS_COLLECTION, roomId),
      stripUndefinedDeep({
        ...roomPatch,
        updatedAt: serverTimestamp(),
      }) as Partial<Room>,
      { merge: true }
    );
  }

  batch.set(
    getRoomFinancePrivateRef(roomId),
    stripUndefinedDeep({
      ...privateFinance,
      updatedAt: serverTimestamp(),
      createdAt: privateFinance.createdAt || serverTimestamp(),
    }) as RoomFinancePrivate,
    { merge: true }
  );

  participantFinances.forEach((finance) => {
    const previous = previousByParticipantId.get(finance.participantId);
    if (isSameParticipantFinance(previous, finance)) return;

    batch.set(
      getRoomParticipantFinanceRef(roomId, finance.participantId),
      stripUndefinedDeep({
        ...finance,
        updatedAt: serverTimestamp(),
        createdAt: finance.createdAt || previous?.createdAt || serverTimestamp(),
      }) as RoomParticipantFinance,
      { merge: true }
    );
  });

  previousParticipantFinances.forEach((finance) => {
    if (nextParticipantIds.has(finance.participantId)) return;
    batch.delete(getRoomParticipantFinanceRef(roomId, finance.participantId));
  });

  if (hostSnapshot) {
    batch.set(
      getHostFinanceMatchSnapshotRef(hostSnapshot.hostUid, hostSnapshot.id),
      stripUndefinedDeep({
        ...hostSnapshot,
        updatedAt: serverTimestamp(),
        createdAt: hostSnapshot.createdAt || serverTimestamp(),
      }) as HostFinanceMatchSnapshot,
      { merge: true }
    );
  }

  await batch.commit();
};
