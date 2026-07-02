import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ROOMS_COLLECTION } from '../../services/firestoreCollections';
import type { CreateRoomInput, Room, RoomParticipant, UpdateRoomInput } from './types';

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

export const getRoomRef = (roomId: string) => (
  doc(db, ROOMS_COLLECTION, roomId)
);

const mapRoomDocs = (snapshot: { docs: Array<{ id: string; data: () => object }> }) => (
  snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Room))
);

const listRoomsFallback = async () => {
  const snapshot = await getDocs(collection(db, ROOMS_COLLECTION));
  return mapRoomDocs(snapshot);
};

export const listRoomsByHostUid = async (hostUid: string) => {
  try {
    const snapshot = await getDocs(query(
      collection(db, ROOMS_COLLECTION),
      where('hostUid', '==', hostUid),
      orderBy('scheduledFor', 'asc'),
      limit(50)
    ));
    return mapRoomDocs(snapshot);
  } catch (err) {
    console.warn('Falling back to client-filtered hosted rooms query:', err);
    const rooms = await listRoomsFallback();
    return rooms
      .filter((room) => room.hostUid === hostUid)
      .sort((a, b) => Number(a.scheduledFor || 0) - Number(b.scheduledFor || 0))
      .slice(0, 50);
  }
};

export const listPublicUpcomingRooms = async () => {
  const now = Date.now();
  try {
    const snapshot = await getDocs(query(
      collection(db, ROOMS_COLLECTION),
      where('visibility', '==', 'public'),
      where('scheduledFor', '>=', now),
      orderBy('scheduledFor', 'asc'),
      limit(50)
    ));
    return mapRoomDocs(snapshot);
  } catch (err) {
    console.warn('Falling back to client-filtered public rooms query:', err);
    const rooms = await listRoomsFallback();
    return rooms
      .filter((room) => room.visibility === 'public' && Number(room.scheduledFor || 0) >= now)
      .sort((a, b) => Number(a.scheduledFor || 0) - Number(b.scheduledFor || 0))
      .slice(0, 50);
  }
};

export const getRoomById = async (roomId: string) => {
  const snapshot = await getDoc(getRoomRef(roomId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Room;
};

export const createRoom = async (input: CreateRoomInput) => {
  const sanitizedInput = stripUndefinedDeep(input) as CreateRoomInput;
  const payload = {
    ...sanitizedInput,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  if (sanitizedInput.id) {
    await setDoc(getRoomRef(sanitizedInput.id), payload);
    return sanitizedInput.id;
  }

  const docRef = await addDoc(collection(db, ROOMS_COLLECTION), payload);
  return docRef.id;
};

export const updateRoom = async (roomId: string, input: UpdateRoomInput) => {
  const sanitizedInput = stripUndefinedDeep(input) as UpdateRoomInput;
  await updateDoc(getRoomRef(roomId), {
    ...sanitizedInput,
    updatedAt: sanitizedInput.updatedAt || serverTimestamp(),
  });
};

export const saveRoom = async (roomId: string, room: Partial<Room>) => {
  const sanitizedRoom = stripUndefinedDeep(room) as Partial<Room>;
  await setDoc(
    getRoomRef(roomId),
    {
      ...sanitizedRoom,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const deleteRoom = async (roomId: string) => {
  await deleteDoc(getRoomRef(roomId));
};

export const replaceRoomParticipants = async (
  roomId: string,
  participants: RoomParticipant[]
) => {
  await updateDoc(getRoomRef(roomId), {
    participants,
    updatedAt: serverTimestamp(),
  });
};

export const upsertRoomParticipant = async (
  roomId: string,
  participant: RoomParticipant
) => {
  const room = await getRoomById(roomId);
  if (!room) throw new Error(`Room not found: ${roomId}`);

  const nextParticipants = [
    ...room.participants.filter((item) => item.id !== participant.id),
    participant,
  ];

  await replaceRoomParticipants(roomId, nextParticipants);
};

export const removeRoomParticipant = async (
  roomId: string,
  participantId: string
) => {
  const room = await getRoomById(roomId);
  if (!room) throw new Error(`Room not found: ${roomId}`);

  const nextParticipants = room.participants.filter((item) => item.id !== participantId);
  await replaceRoomParticipants(roomId, nextParticipants);
};
