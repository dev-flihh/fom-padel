import { useEffect, useMemo, useState } from 'react';
import { listPublicUpcomingRooms, listRoomsByHostUid } from './roomRepository';
import type { Room } from './types';

const dedupeRoomsById = (rooms: Room[]) => {
  const seen = new Map<string, Room>();
  rooms.forEach((room) => {
    if (!room?.id) return;
    seen.set(room.id, room);
  });
  return Array.from(seen.values());
};

const sortRoomsBySchedule = (rooms: Room[]) => (
  [...rooms].sort((a, b) => Number(a.scheduledFor || 0) - Number(b.scheduledFor || 0))
);

const isUpcomingLobbyRoom = (room: Room, now: number) => {
  const scheduledFor = Number(room.scheduledFor || 0);
  if (!Number.isFinite(scheduledFor) || scheduledFor < now) return false;
  return room.status !== 'completed' && room.status !== 'cancelled' && room.status !== 'in_progress';
};

export const useRooms = ({
  userUid,
  enabled = true,
}: {
  userUid?: string | null;
  enabled?: boolean;
}) => {
  const [hostedRooms, setHostedRooms] = useState<Room[]>([]);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!enabled) return;
    setLoading(true);
    const now = Date.now();
    try {
      const [hostedResult, publicResult] = await Promise.allSettled([
        userUid ? listRoomsByHostUid(userUid) : Promise.resolve([]),
        listPublicUpcomingRooms(),
      ]);

      if (hostedResult.status === 'fulfilled') {
        setHostedRooms(sortRoomsBySchedule(dedupeRoomsById(hostedResult.value).filter((room) => isUpcomingLobbyRoom(room, now))));
      } else {
        console.error('Hosted room list fetch error:', hostedResult.reason);
      }

      if (publicResult.status === 'fulfilled') {
        setPublicRooms(sortRoomsBySchedule(dedupeRoomsById(publicResult.value).filter((room) => isUpcomingLobbyRoom(room, now))));
      } else {
        console.error('Public room list fetch error:', publicResult.reason);
      }
    } catch (err) {
      console.error('Room list fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [enabled, userUid]);

  const joinedPublicRooms = useMemo(() => {
    if (!userUid) return publicRooms;
    return publicRooms.filter((room) => room.hostUid !== userUid);
  }, [publicRooms, userUid]);

  return {
    hostedRooms,
    publicRooms: joinedPublicRooms,
    loading,
    refresh,
  };
};
