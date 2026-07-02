import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, SlidersHorizontal, X } from 'lucide-react';
import { AppPageHeader } from '../../components/app/AppPageHeader';
import { cn } from '../../lib/utils';
import type { Room } from './types';
import { getRoomPublicPricing } from './roomFinance';

type RoomFilterMode = 'all' | 'hosted';

const padDatePart = (value: number) => String(value).padStart(2, '0');

const getStartOfDay = (value: number) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const addDays = (value: number, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

const getDateKey = (value: number) => {
  const date = new Date(value);
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
};

const formatDateLabel = (timestamp: number) => (
  new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' })
);

const formatTimeLabel = (timestamp: number) => (
  new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
);

const formatRoomSchedule = (scheduledFor: number) => {
  try {
    return new Date(scheduledFor).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatRoomSectionDate = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).toUpperCase();
  } catch {
    return '-';
  }
};

const getJoinedParticipantsCount = (room: Room) => (
  (room.participants || []).filter((participant) => participant.status === 'joined').length
);

const getRoomVenueLabel = (room: Room) => (
  [room.settings.venueName, room.settings.location].filter(Boolean).join(' · ') || 'Venue TBA'
);

const formatCountLabel = (value: number, singular: string, plural: string) => (
  `${value} ${value === 1 ? singular : plural}`
);

const formatDurationLabel = (minutes?: number) => {
  const safeMinutes = Math.floor(Number(minutes || 0));
  if (!safeMinutes || safeMinutes <= 0) return null;
  if (safeMinutes < 60) return `${safeMinutes} min`;
  const hours = safeMinutes / 60;
  return `${Number.isInteger(hours) ? hours : Number(hours.toFixed(1))} hr`;
};

const getRoomGameMeta = (room: Room) => {
  const formatLabel = room.settings.format || 'Room';
  const courtCount = Math.max(0, Math.floor(Number(room.settings.courts || 0)));
  const totalPoints = Math.max(0, Math.floor(Number(room.settings.totalPoints || 0)));
  const durationLabel = formatDurationLabel(room.settings.durationMinutes);
  return [
    formatLabel,
    courtCount > 0 ? formatCountLabel(courtCount, 'court', 'courts') : null,
    totalPoints > 0 ? `${totalPoints} pts` : null,
    durationLabel,
  ].filter(Boolean) as string[];
};

const formatCurrency = (amount: number) => {
  if (!amount || amount <= 0) return 'No fee';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const isVisibleUpcomingRoom = (room: Room, now: number) => {
  const scheduledFor = Number(room.scheduledFor || 0);
  if (!Number.isFinite(scheduledFor) || scheduledFor < now) return false;
  return room.status !== 'completed' && room.status !== 'cancelled' && room.status !== 'in_progress';
};

const sortRoomsBySchedule = (rooms: Room[]) => (
  [...rooms].sort((a, b) => Number(a.scheduledFor || 0) - Number(b.scheduledFor || 0))
);

const dedupeRoomsById = (rooms: Room[]) => {
  const seen = new Map<string, Room>();
  rooms.forEach((room) => {
    if (!room?.id) return;
    seen.set(room.id, room);
  });
  return Array.from(seen.values());
};

const getTimeGroupKey = (room: Room) => {
  const date = new Date(room.scheduledFor);
  return [
    getDateKey(room.scheduledFor),
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
  ].join('-');
};

const RoomListItem = ({
  room,
  roomNumber,
  isHosted,
  onOpen,
}: {
  room: Room;
  roomNumber: number;
  isHosted: boolean;
  onOpen: () => void;
}) => {
  const joinedCount = getJoinedParticipantsCount(room);
  const maxPlayers = Number(room.maxPlayers || 0);
  const pricing = getRoomPublicPricing(room);
  const priceLabel = pricing.enabled && pricing.publicPrice > 0 ? formatCurrency(pricing.publicPrice) : 'No fee';
  const hostName = isHosted ? 'Hosted by you' : (room.hostDisplayName ? `Host ${room.hostDisplayName}` : 'FOM room');
  const gameMeta = getRoomGameMeta(room);
  const venueAndPriceLabel = [getRoomVenueLabel(room), priceLabel].filter(Boolean).join(' · ');
  const detailLineLabel = isHosted ? venueAndPriceLabel : [hostName, venueAndPriceLabel].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap-target group relative w-full bg-white py-4 pl-4 pr-4 text-left transition-colors active:bg-ios-gray/[0.035]"
    >
      {isHosted && <span className="absolute bottom-0 left-0 top-0 w-[3px] bg-primary/90" />}
      <div className="grid grid-cols-[22px_minmax(0,1fr)_34px] gap-2">
        <span className="pt-0.5 text-[11px] font-medium leading-none text-ios-gray/68 tabular-nums">
          {padDatePart(roomNumber)}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className={cn(
              'min-w-0 truncate text-[16px] font-bold leading-tight tracking-[-0.016em] min-[380px]:text-[17px]',
              maxPlayers && joinedCount >= maxPlayers ? 'text-on-surface/52' : 'text-on-surface'
            )}>
              {room.title}
            </h3>
            {isHosted && (
              <span className="shrink-0 rounded-full bg-primary/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-[0.04em] text-primary/90">
                Hosted by you
              </span>
            )}
          </div>

          <p className="mt-1.5 truncate text-[12px] font-medium leading-none text-on-surface/56">
            {gameMeta.join(' · ')}
          </p>

          <p className="mt-2.5 min-w-0 truncate text-[11px] font-semibold leading-snug text-on-surface/68">
            {detailLineLabel}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-end pt-0.5">
          <span className={cn(
            'text-[13.5px] font-bold leading-none tabular-nums',
            maxPlayers && joinedCount >= maxPlayers
              ? 'text-primary/70'
              : 'text-on-surface'
          )}>
            {maxPlayers ? `${joinedCount}/${maxPlayers}` : joinedCount}
          </span>
        </div>
      </div>
    </button>
  );
};

export const RoomListScreen = ({
  hostedRooms,
  publicRooms,
  currentUserUid,
  isLoading,
  onCreateRoom,
  onOpenRoom,
}: {
  hostedRooms: Room[];
  publicRooms: Room[];
  currentUserUid?: string | null;
  isLoading: boolean;
  onCreateRoom: () => void;
  onOpenRoom: (room: Room) => void;
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<RoomFilterMode>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const currentUid = String(currentUserUid || '').trim();

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const upcomingRooms = useMemo(() => (
    sortRoomsBySchedule(
      dedupeRoomsById([...hostedRooms, ...publicRooms])
        .filter((room) => isVisibleUpcomingRoom(room, now))
    )
  ), [hostedRooms, now, publicRooms]);

  const isHostedRoom = (room: Room) => (
    Boolean(currentUid && room.hostUid === currentUid) || hostedRooms.some((hostedRoom) => hostedRoom.id === room.id)
  );

  const hostedUpcomingRooms = useMemo(() => (
    upcomingRooms.filter((room) => isHostedRoom(room))
  ), [hostedRooms, upcomingRooms, currentUid]);

  const dateSourceRooms = filterMode === 'hosted' ? hostedUpcomingRooms : upcomingRooms;
  const roomCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    dateSourceRooms.forEach((room) => {
      const key = getDateKey(room.scheduledFor);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [dateSourceRooms]);

  const dateOptions = useMemo(() => {
    const startTimestamp = getStartOfDay(now);
    return Array.from({ length: 30 }, (_, index) => {
      const timestamp = addDays(startTimestamp, index);
      const key = getDateKey(timestamp);
      const count = roomCountByDate.get(key) || 0;
      return {
        key,
        timestamp,
        count,
        hasRooms: count > 0,
      };
    });
  }, [now, roomCountByDate]);

  useEffect(() => {
    setSelectedDateKey((currentKey) => (
      currentKey && dateOptions.some((option) => option.key === currentKey)
        ? currentKey
        : (dateOptions.find((option) => option.hasRooms) || dateOptions[0]).key
    ));
  }, [dateOptions]);

  const filteredRooms = useMemo(() => (
    dateSourceRooms.filter((room) => !selectedDateKey || getDateKey(room.scheduledFor) === selectedDateKey)
  ), [dateSourceRooms, selectedDateKey]);

  const groupedRooms = useMemo(() => {
    const groups = new Map<string, { key: string; timestamp: number; label: string; rooms: Room[] }>();
    filteredRooms.forEach((room) => {
      const key = getTimeGroupKey(room);
      const existing = groups.get(key);
      if (existing) {
        existing.rooms.push(room);
        return;
      }
      groups.set(key, {
        key,
        timestamp: room.scheduledFor,
        label: formatTimeLabel(room.scheduledFor),
        rooms: [room],
      });
    });
    return Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredRooms]);

  const roomIndexById = useMemo(() => {
    const indexes = new Map<string, number>();
    filteredRooms.forEach((room, index) => indexes.set(room.id, index + 1));
    return indexes;
  }, [filteredRooms]);

  const showInitialLoading = isLoading && upcomingRooms.length === 0;
  const hasAnyUpcomingRooms = upcomingRooms.length > 0;
  const activeDateTimestamp = dateOptions.find((option) => option.key === selectedDateKey)?.timestamp || null;
  const activeScopeLabel = filterMode === 'hosted' ? 'Hosted by me' : 'All rooms';
  const selectedHostedCount = filteredRooms.filter((room) => isHostedRoom(room)).length;
  const activeSectionTitle = filterMode === 'hosted' ? 'Hosted rooms' : 'Upcoming rooms';
  const activeSectionSummary = filterMode === 'hosted'
    ? `${filteredRooms.length.toLocaleString('en-US')} hosted by me`
    : `${filteredRooms.length.toLocaleString('en-US')} upcoming · ${selectedHostedCount.toLocaleString('en-US')} hosted by me`;
  const headerMetaItems = [
    { label: 'upcoming', value: upcomingRooms.length.toLocaleString('en-US') },
    { label: 'hosted', value: hostedUpcomingRooms.length.toLocaleString('en-US') },
  ];

  return (
    <div className="min-h-screen bg-white pb-24">
      <main className="mx-auto w-full max-w-2xl pb-20 pt-[calc(env(safe-area-inset-top,0px)+34px)]">
        <AppPageHeader
          eyebrow="Lobby"
          title="Plan a room"
          subtitle="Set time, court, and players."
        />

        <section className="px-4">
          <button
            type="button"
            onClick={onCreateRoom}
            className="tap-target mt-4 flex h-12 w-full items-center justify-between border border-on-surface/70 bg-white px-5 text-left text-[14px] font-bold tracking-[-0.01em] text-on-surface transition-colors active:bg-ios-gray/[0.035]"
          >
            <span>Create a room</span>
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium leading-snug text-ios-gray">
            {headerMetaItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <span className="h-1 w-1 rounded-full bg-ios-gray/28" />}
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-semibold text-on-surface tabular-nums">{item.value}</span>
                  <span>{item.label}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="mt-3 px-4 pb-3">
          <div className="no-scrollbar -mr-4 flex items-center gap-2 overflow-x-auto pr-4">
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(true)}
                className={cn(
                  'tap-target relative flex h-[60px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border text-center leading-none transition-all active:scale-[0.98]',
                  filterMode === 'hosted'
                    ? 'border-primary/18 bg-primary/[0.055] text-primary'
                    : 'border-black/[0.08] bg-white text-on-surface/62'
                )}
                aria-label="Room filters"
              >
                <SlidersHorizontal size={15} strokeWidth={2.25} />
                {filterMode === 'hosted' && (
                  <span className="absolute bottom-2 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
              {dateOptions.map((option) => {
                const isSelected = option.key === selectedDateKey;
                const date = new Date(option.timestamp);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedDateKey(option.key)}
                    className={cn(
                      'tap-target relative flex h-[60px] w-[42px] shrink-0 flex-col items-center justify-center rounded-[10px] text-center leading-none transition-all active:scale-[0.98]',
                      isSelected && 'bg-primary/95 text-white',
                      !isSelected && option.hasRooms && 'bg-white text-on-surface',
                      !isSelected && !option.hasRooms && 'bg-white text-ios-gray'
                    )}
                    aria-label={`${formatRoomSchedule(option.timestamp)}, ${option.count} ${option.count === 1 ? 'room' : 'rooms'}`}
                  >
                    <span className={cn(
                      'text-[9.5px] font-bold uppercase tracking-[0.07em]',
                      isSelected ? 'text-white/86' : 'text-ios-gray/80'
                    )}>
                      {formatDateLabel(option.timestamp)}
                    </span>
                    <span className="mt-2 text-[17px] font-bold tabular-nums tracking-[-0.01em]">
                      {date.getDate()}
                    </span>
                    {option.hasRooms && (
                      <span className={cn(
                        'absolute bottom-1.5 h-1 w-1 rounded-full',
                        isSelected ? 'bg-white' : 'bg-primary'
                      )} />
                    )}
                  </button>
                );
              })}
          </div>
        </section>

        <section>
          {activeDateTimestamp && (
            <div className="border-t border-black/[0.06] px-4 pb-3 pt-4">
              <div className="flex min-w-0 items-baseline gap-2">
                <h2 className="text-[17px] font-bold leading-tight tracking-[-0.018em] text-on-surface">
                  {activeSectionTitle}
                </h2>
                <p className="min-w-0 truncate text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-ios-gray/70">
                  {formatRoomSectionDate(activeDateTimestamp)}
                </p>
              </div>
              <p className="mt-2 text-[11.5px] font-medium leading-none text-ios-gray">
                {activeSectionSummary}
                <span className="mx-1.5 text-ios-gray/40">·</span>
                {activeScopeLabel}
              </p>
            </div>
          )}

          {showInitialLoading ? (
            <div className="space-y-0">
              {[0, 1].map((group) => (
                <div key={group}>
                  <div className="flex items-center justify-between border-b border-black/[0.08] px-4 py-3.5">
                    <div className="h-4 w-20 rounded-full bg-ios-gray/10" />
                    <div className="h-3 w-16 rounded-full bg-ios-gray/10" />
                  </div>
                  <div className="divide-y divide-black/[0.08] bg-white">
                    {[0, 1].map((item) => (
                      <div key={item} className="grid grid-cols-[26px_minmax(0,1fr)_48px] gap-2.5 px-4 py-4">
                        <div className="h-3 w-5 rounded-full bg-ios-gray/10" />
                        <div className="min-w-0">
                          <div className="h-5 w-40 rounded-full bg-ios-gray/10" />
                          <div className="mt-2 h-3 w-full max-w-52 rounded-full bg-ios-gray/10" />
                          <div className="mt-3 h-3 w-full max-w-64 rounded-full bg-ios-gray/10" />
                        </div>
                        <div className="h-4 rounded-full bg-ios-gray/10" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !hasAnyUpcomingRooms ? (
            <div className="border-b border-black/[0.08] bg-white px-4 py-8">
              <p className="text-[16px] font-black tracking-[-0.02em] text-on-surface">No room available</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Rooms will appear here when hosts schedule future matches.
              </p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="border-b border-black/[0.08] bg-white px-4 py-8">
              <p className="text-[16px] font-black tracking-[-0.02em] text-on-surface">No room available</p>
              <p className="mt-1.5 max-w-xs text-[13px] font-medium leading-relaxed text-ios-gray">
                Try another date or switch back to all rooms.
              </p>
            </div>
          ) : (
            <div>
              {groupedRooms.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center justify-between gap-3 border-y border-black/[0.06] bg-ios-gray/[0.012] px-4 py-3.5">
                    <h3 className="text-[13px] font-bold uppercase leading-none tracking-[0.08em] text-ios-gray">
                      {group.label}
                    </h3>
                    <p className="text-[11.5px] font-medium leading-none text-ios-gray">
                      {group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'}
                    </p>
                  </div>
                  <div className="divide-y divide-black/[0.08] bg-white">
                    {group.rooms.map((room) => (
                      <div key={room.id}>
                        <RoomListItem
                          room={room}
                          roomNumber={roomIndexById.get(room.id) || 1}
                          isHosted={isHostedRoom(room)}
                          onOpen={() => onOpenRoom(room)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/22 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-4 backdrop-blur-[2px]">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close room filters"
            onClick={() => setIsFilterSheetOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-t-[30px] border border-white/60 bg-white px-5 pb-5 pt-3 shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:rounded-[30px]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ios-gray/20" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase leading-none tracking-[0.14em] text-ios-gray/78">
                  Filter
                </p>
                <h3 className="mt-1.5 text-[18px] font-bold leading-tight tracking-[-0.025em] text-on-surface">
                  Room scope
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="tap-target flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-surface text-on-surface"
                aria-label="Close filter sheet"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="space-y-2">
              {([
                {
                  key: 'all' as const,
                  label: 'All rooms',
                  detail: 'Show every upcoming public room.',
                  count: upcomingRooms.length,
                  disabled: !hasAnyUpcomingRooms,
                },
                {
                  key: 'hosted' as const,
                  label: 'Hosted by me',
                  detail: 'Only rooms you created.',
                  count: hostedUpcomingRooms.length,
                  disabled: hostedUpcomingRooms.length === 0,
                },
              ]).map((item) => {
                const isSelected = filterMode === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      setFilterMode(item.key);
                      setSelectedDateKey(null);
                      setIsFilterSheetOpen(false);
                    }}
                    className={cn(
                      'tap-target flex w-full items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-colors active:scale-[0.99]',
                      isSelected
                        ? 'border-primary/15 bg-primary/[0.08] text-primary'
                        : 'border-black/[0.05] bg-white text-on-surface',
                      item.disabled && 'cursor-not-allowed opacity-45'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-black leading-tight">{item.label}</p>
                      <p className={cn(
                        'mt-1 text-[12px] font-semibold leading-snug',
                        isSelected ? 'text-primary/70' : 'text-ios-gray'
                      )}>
                        {item.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn(
                        'rounded-full px-2 py-1 text-[11px] font-black tabular-nums',
                        isSelected ? 'bg-primary/10 text-primary' : 'bg-surface text-ios-gray ring-1 ring-black/[0.04]'
                      )}>
                        {item.count}
                      </span>
                      {isSelected && <Check size={17} strokeWidth={2.5} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
