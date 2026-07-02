import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  PlusCircle,
  Trophy,
} from 'lucide-react';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { InstallAppButton } from '../../components/app/InstallAppButton';
import { cn } from '../../lib/utils';
import { PLAYER_MATCH_LEDGER_COLLECTION } from '../../services/firestoreCollections';
import { Tournament, TournamentHistory } from '../../types';
import { getCompletedMatchesCount, sortTournamentsByNewest } from '../history/historyUtils';
import { formatDisplayMmr, getRankInfo, toRawMmr } from '../ranking/rankUtils';
import type { Room, RoomParticipant } from '../rooms/types';

const MMR_DELTA_7D_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const UPCOMING_ROOM_LIMIT = 3;
const QUOTE_ROTATION_MS = 5000;
const QUOTE_SWAP_MS = 320;
const ROOM_AVATAR_SIZE_PX = 25;
const ROOM_AVATAR_OVERLAP_PX = 8;
const ROOM_AVATAR_STEP_PX = ROOM_AVATAR_SIZE_PX - ROOM_AVATAR_OVERLAP_PX;

const motivationalLines = [
  { lead: "Today's a good day to", accent: 'win.' },
  { lead: 'Consistency beats', accent: 'raw talent.' },
  { lead: 'Every rally', accent: 'counts.' },
  { lead: 'Play together,', accent: 'win together.' },
  { lead: 'Go', accent: 'climb the ranks.' },
];

const learnArticles = [
  {
    number: '01',
    category: 'Formats',
    title: 'How Americano & Mexicano work',
    read: '5 min read',
    href: '/blog/articles/americano-vs-mexicano/',
  },
  {
    number: '02',
    category: 'Setup',
    title: 'Create a room & invite players',
    read: '3 min read',
    href: '/blog/articles/cara-mulai-turnamen-padel/',
  },
  {
    number: '03',
    category: 'Scoring',
    title: 'Live scoring, step by step',
    read: '4 min read',
    href: '/blog/articles/kenapa-live-scoring-padel-penting/',
  },
  {
    number: '04',
    category: 'Ranking',
    title: 'How MMR & tiers are calculated',
    read: '3 min read',
    href: '/blog/articles/ranking-mmr-fom-play/',
  },
];

const avatarColors = ['#E65E14', '#2a6fdb', '#0e8a6f', '#8E8E93'];

const readCachedMmrDelta7d = (uid: string): number | null => {
  try {
    const raw = localStorage.getItem(`fom_play_mmr_delta_7d_${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; delta?: number };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MMR_DELTA_7D_CACHE_MAX_AGE_MS) return null;
    const delta = Number(parsed.delta);
    return Number.isFinite(delta) ? delta : null;
  } catch {
    return null;
  }
};

const writeCachedMmrDelta7d = (uid: string, delta: number) => {
  try {
    localStorage.setItem(`fom_play_mmr_delta_7d_${uid}`, JSON.stringify({
      savedAt: Date.now(),
      delta
    }));
  } catch {
    // Cache writes are best effort only.
  }
};

const dedupeRoomsById = (rooms: Room[]) => {
  const seen = new Map<string, Room>();
  rooms.forEach((room) => {
    if (!room?.id) return;
    seen.set(room.id, room);
  });
  return Array.from(seen.values());
};

const isUpcomingRoom = (room: Room, now: number) => {
  const scheduledFor = Number(room.scheduledFor || 0);
  if (!Number.isFinite(scheduledFor) || scheduledFor < now) return false;
  return room.status !== 'completed' && room.status !== 'cancelled' && room.status !== 'in_progress';
};

const hasUserJoinedRoom = (room: Room, uid: string) => (
  Boolean(uid) &&
  (room.participants || []).some((participant) => (
    participant.uid === uid && participant.status === 'joined'
  ))
);

const getJoinedParticipants = (room: Room) => (
  (room.participants || []).filter((participant) => participant.status === 'joined')
);

const getInitials = (value?: string) => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue) return '?';
  const parts = cleanValue.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getParticipantPhoto = (
  participant: RoomParticipant,
  currentUid: string,
  currentUserPhotoURL?: string
) => (
  participant.avatar ||
  ((participant.uid === currentUid || participant.id === currentUid) ? currentUserPhotoURL : '') ||
  ''
);

const getVisibleAvatarLimit = ({
  isSingleCard,
  playerCountLabel,
  joinedCount,
}: {
  isSingleCard: boolean;
  playerCountLabel: string;
  joinedCount: number;
}) => {
  if (joinedCount <= 0) return 0;

  const innerWidth = isSingleCard ? 306 : 216;
  const playerCountWidth = Math.max(72, Math.min(100, Math.ceil(playerCountLabel.length * 6.2)));
  const availableWidth = innerWidth - playerCountWidth - 12;
  const avatarSlots = Math.max(
    1,
    Math.floor((availableWidth - ROOM_AVATAR_SIZE_PX) / ROOM_AVATAR_STEP_PX) + 1
  );

  if (joinedCount <= avatarSlots) return joinedCount;
  return Math.max(1, avatarSlots - 1);
};

const getTeamLabel = (players?: Array<{ name?: string }>) => {
  const names = (players || [])
    .map((player) => String(player?.name || '').trim())
    .filter(Boolean)
    .map((name) => name.split(/\s+/)[0]);
  return names.length ? names.join(' / ') : 'Team';
};

const formatRoomCountdown = (scheduledFor: number, now: number) => {
  const deltaMs = Number(scheduledFor || 0) - now;
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 'Now';
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;
  const days = Math.floor(deltaMs / dayMs);
  if (days >= 1) return `In ${days} ${days === 1 ? 'day' : 'days'}`;
  const hours = Math.floor(deltaMs / hourMs);
  if (hours >= 1) return `In ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  const minutes = Math.max(1, Math.ceil(deltaMs / minuteMs));
  return `In ${minutes} min`;
};

const formatRoomDateTime = (scheduledFor: number) => {
  try {
    const date = new Date(scheduledFor);
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const dayMonth = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}, ${dayMonth} · ${time}`;
  } catch {
    return 'Date TBA';
  }
};

const formatHistoryDateParts = (date: Date) => {
  try {
    return {
      day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  } catch {
    return { day: '--', month: '---' };
  }
};

const getRoomVenueLabel = (room: Room) => (
  [room.settings.venueName, room.settings.location].filter(Boolean).join(' · ') || 'Venue TBA'
);

const getTournamentVenueLabel = (tournament: TournamentHistory) => (
  [tournament.venueName, tournament.location].filter(Boolean).join(' · ') || 'Venue TBA'
);

const formatMatchModeLabel = (format?: string) => {
  const cleanFormat = String(format || '').trim();
  if (!cleanFormat) return 'Match';
  return cleanFormat
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : '')
    .join(' ');
};

const SectionHeading = ({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="mb-3.5 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold leading-none tracking-[0.02em] text-on-surface/40">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-[22px] font-display font-bold leading-[1.08] tracking-[-0.02em] text-on-surface">
        {title}
      </h2>
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex shrink-0 items-center gap-0.5 py-1 pl-2 text-[12.5px] font-semibold leading-none text-ios-gray tap-target active:text-primary"
      >
        {actionLabel}
        <ChevronRight size={15} strokeWidth={2.4} className="text-ios-gray/70" />
      </button>
    )}
  </div>
);

export const DashboardScreen = ({
  onStartMatch,
  tournament,
  onContinueMatch,
  onNotifications,
  onOpenHistoryList,
  onOpenRooms,
  onOpenRoom,
  onOpenHistoryMatch,
  notificationsEnabled,
  unreadCount,
  tournaments,
  hostedRooms,
  publicRooms,
  user,
  isHistoryLoading,
  isRoomsLoading,
  renderLogo,
}: {
  onStartMatch: () => void,
  tournament: Tournament,
  onContinueMatch: () => void,
  onNotifications: () => void,
  onOpenHistoryList: () => void,
  onOpenRooms: () => void,
  onOpenRoom: (room: Room) => void,
  onOpenHistoryMatch: (t: TournamentHistory) => void,
  notificationsEnabled: boolean,
  unreadCount: number,
  tournaments: TournamentHistory[],
  hostedRooms: Room[],
  publicRooms: Room[],
  user: any,
  isHistoryLoading: boolean,
  isRoomsLoading: boolean,
  renderLogo: (className: string) => React.ReactNode,
}) => {
  const activeRound = tournament.rounds?.find(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
  const activeMatches = activeRound ? activeRound.matches.filter(m => m && m.status === 'active') : [];
  const featuredActiveMatch = activeMatches[0] || null;
  const recentTournaments = useMemo(() => sortTournamentsByNewest(tournaments).slice(0, 3), [tournaments]);
  const currentUid = String(user?.uid || '').trim();
  const currentMmr = toRawMmr(user?.mmr);
  const currentRank = getRankInfo(currentMmr);
  const RankIcon = currentRank.icon;
  const [mmrDelta7d, setMmrDelta7d] = useState(0);
  const [isMmrDeltaLoading, setIsMmrDeltaLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isQuoteSwapping, setIsQuoteSwapping] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const quoteSwapTimeoutRef = useRef<number | null>(null);
  const mmrDeltaLabel = `${mmrDelta7d >= 0 ? '+' : ''}${mmrDelta7d.toLocaleString()} this week`;
  const quote = motivationalLines[quoteIndex] || motivationalLines[0];

  const upcomingRooms = useMemo(() => (
    dedupeRoomsById([
      ...hostedRooms,
      ...publicRooms.filter((room) => room.hostUid === currentUid || hasUserJoinedRoom(room, currentUid)),
    ])
      .filter((room) => isUpcomingRoom(room, now))
      .sort((a, b) => Number(a.scheduledFor || 0) - Number(b.scheduledFor || 0))
      .slice(0, UPCOMING_ROOM_LIMIT)
  ), [currentUid, hostedRooms, now, publicRooms]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsQuoteSwapping(true);
      if (quoteSwapTimeoutRef.current) {
        window.clearTimeout(quoteSwapTimeoutRef.current);
      }
      quoteSwapTimeoutRef.current = window.setTimeout(() => {
        setQuoteIndex((index) => (index + 1) % motivationalLines.length);
        window.requestAnimationFrame(() => setIsQuoteSwapping(false));
        quoteSwapTimeoutRef.current = null;
      }, QUOTE_SWAP_MS);
    }, QUOTE_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
      if (quoteSwapTimeoutRef.current) {
        window.clearTimeout(quoteSwapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const uid = String(user?.uid || '').trim();
    if (!uid) {
      setMmrDelta7d(0);
      setIsMmrDeltaLoading(false);
      return;
    }

    const cachedDelta = readCachedMmrDelta7d(uid);
    if (cachedDelta !== null) {
      setMmrDelta7d(cachedDelta);
      setIsMmrDeltaLoading(false);
      return;
    }

    let isCancelled = false;
    const loadMmrDelta7d = async () => {
      setIsMmrDeltaLoading(true);
      try {
        const cutoffMs = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const snapshot = await getDocs(
          query(
            collection(db, PLAYER_MATCH_LEDGER_COLLECTION),
            where('uid', '==', uid),
            where('playedAt', '>=', Timestamp.fromMillis(cutoffMs)),
            orderBy('playedAt', 'desc')
          )
        );
        let delta = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const playedAtMs = data?.playedAt?.toDate ? data.playedAt.toDate().getTime() : 0;
          const createdAtMs = data?.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0;
          const referenceMs = playedAtMs || createdAtMs || 0;
          if (referenceMs < cutoffMs) return;
          const rowDelta = Number(data?.deltaMmr);
          if (!Number.isFinite(rowDelta)) return;
          delta += rowDelta;
        });
        if (!isCancelled) {
          setMmrDelta7d(delta);
          writeCachedMmrDelta7d(uid, delta);
        }
      } catch (err) {
        console.error('Error fetching 7-day MMR delta:', err);
        if (!isCancelled) setMmrDelta7d(0);
      } finally {
        if (!isCancelled) setIsMmrDeltaLoading(false);
      }
    };

    void loadMmrDelta7d();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  const renderActiveMatch = () => {
    if (!featuredActiveMatch) return null;

    const teamAScore = Number(featuredActiveMatch.teamA.score || 0);
    const teamBScore = Number(featuredActiveMatch.teamB.score || 0);
    const teamALeads = teamAScore >= teamBScore;
    const teamBLeads = teamBScore > teamAScore;

    return (
      <section className="px-6 pt-6">
        <SectionHeading eyebrow="Still in play" title="Pick up where you left off" />
        <div className="rounded-[20px] border border-black/10 bg-white px-4.5 py-4 shadow-[0_6px_18px_rgba(17,19,23,0.035)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-display font-bold leading-tight tracking-[-0.02em] text-on-surface">
                {tournament.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] font-semibold leading-none text-ios-gray">
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                  Live
                </span>
                <span className="h-2.5 w-px bg-black/10" />
                <span>Round {featuredActiveMatch.roundId} · Court {featuredActiveMatch.court}</span>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ios-gray/[0.08] px-2.5 py-1.5 text-[12px] font-bold leading-none text-on-surface/70">
              <Clock3 size={13} strokeWidth={2.2} />
              <span className="tabular-nums">{featuredActiveMatch.duration || '00:00'}</span>
            </span>
          </div>

          <div className="mt-3">
            {[
              {
                label: getTeamLabel(featuredActiveMatch.teamA.players),
                score: teamAScore,
                leads: teamALeads,
              },
              {
                label: getTeamLabel(featuredActiveMatch.teamB.players),
                score: teamBScore,
                leads: teamBLeads,
              },
            ].map((row, index) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center justify-between gap-3 py-2',
                  index > 0 && 'border-t border-black/[0.07]'
                )}
              >
                <span className={cn(
                  'flex min-w-0 items-center gap-2 text-[15px] leading-tight',
                  row.leads ? 'font-bold text-on-surface' : 'font-semibold text-ios-gray'
                )}>
                  <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', row.leads ? 'bg-primary' : 'bg-transparent')} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className={cn(
                  'font-display text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums',
                  row.leads ? 'text-on-surface' : 'text-ios-gray/55'
                )}>
                  {row.score}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onContinueMatch}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-primary/10 text-[14px] font-bold text-primary tap-target active:scale-[0.99]"
          >
            Resume scoring
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
        </div>
      </section>
    );
  };

  const renderUpcomingRooms = () => {
    const isSingleUpcomingRoom = upcomingRooms.length === 1;

    return (
      <section className="px-6 pt-7">
        <SectionHeading
          eyebrow="On your calendar"
          title="Upcoming events"
          actionLabel="See all"
          onAction={onOpenRooms}
        />
        {isRoomsLoading && upcomingRooms.length === 0 ? (
          <div className="rounded-[18px] border border-black/10 bg-white p-5 text-[13px] font-semibold text-ios-gray">
            Loading your rooms...
          </div>
        ) : upcomingRooms.length === 0 ? (
          <button
            type="button"
            onClick={onOpenRooms}
            className="w-full rounded-[18px] border border-black/10 bg-white p-5 text-left tap-target active:scale-[0.99]"
          >
            <p className="text-[15px] font-bold tracking-tight text-on-surface">No joined rooms yet</p>
            <p className="mt-1 text-[12.5px] font-medium leading-snug text-ios-gray">
              Open Rooms to join a lobby or create your next session.
            </p>
          </button>
        ) : (
          <div className={cn(
            isSingleUpcomingRoom
              ? 'w-full'
              : '-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          )}>
            {upcomingRooms.map((room) => {
              const joinedParticipants = getJoinedParticipants(room);
              const joinedCount = joinedParticipants.length;
              const maxPlayers = Number(room.maxPlayers || 0);
              const playerCountLabel = maxPlayers ? `${joinedCount}/${maxPlayers} players` : `${joinedCount} players`;
              const visibleAvatarLimit = getVisibleAvatarLimit({
                isSingleCard: isSingleUpcomingRoom,
                playerCountLabel,
                joinedCount,
              });
              const previewParticipants = joinedParticipants.slice(0, visibleAvatarLimit);
              const remainingCount = Math.max(0, joinedCount - visibleAvatarLimit);

              return (
                <button
                  type="button"
                  key={room.id}
                  onClick={() => onOpenRoom(room)}
                  className={cn(
                    'flex flex-col rounded-[18px] border border-black/10 bg-white px-4.5 py-[18px] text-left tap-target active:scale-[0.99]',
                    isSingleUpcomingRoom
                      ? 'min-h-[176px] w-full'
                      : 'min-h-[188px] w-[252px] shrink-0 snap-start'
                  )}
                >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold leading-none tracking-[0.04em] text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {formatRoomCountdown(room.scheduledFor, now)}
                  </span>
                  <span className="truncate text-[10px] font-semibold leading-none tracking-[0.04em] text-ios-gray">
                    {room.settings.format}
                  </span>
                </div>

                <h3 className="mt-3.5 line-clamp-2 text-[20px] font-display font-bold leading-[1.12] tracking-[-0.02em] text-on-surface">
                  {room.title}
                </h3>

                <div className="mt-4 space-y-2">
                  <p className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold leading-none text-on-surface">
                    <CalendarDays size={14} strokeWidth={1.9} className="shrink-0 text-ios-gray/70" />
                    <span className="truncate">{formatRoomDateTime(room.scheduledFor)}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium leading-none text-ios-gray">
                    <MapPin size={13} strokeWidth={1.9} className="shrink-0 text-ios-gray/70" />
                    <span className="truncate">{getRoomVenueLabel(room)}</span>
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <div className="flex min-w-0 items-center">
                    {previewParticipants.map((participant, index) => {
                      const participantPhoto = getParticipantPhoto(participant, currentUid, user?.photoURL);

                      return (
                        <span
                          key={participant.id || `${room.id}-${index}`}
                          className="flex h-[25px] w-[25px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-bold text-white first:ml-0 -ml-2"
                          style={{ background: participantPhoto ? '#f3f4f6' : avatarColors[index % avatarColors.length] }}
                        >
                          {participantPhoto ? (
                            <img
                              src={participantPhoto}
                              alt={participant.displayName || 'Player'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            participant.initials || getInitials(participant.displayName)
                          )}
                        </span>
                      );
                    })}
                    {remainingCount > 0 && (
                      <span className="flex h-[25px] min-w-[25px] -ml-2 items-center justify-center rounded-full border-2 border-white bg-ios-gray px-1 text-[9px] font-bold text-white">
                        +{remainingCount}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold leading-none text-on-surface/62">
                    {playerCountLabel}
                  </span>
                </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderLearnSection = () => (
    <section className="pt-7">
      <div className="overflow-hidden bg-[#151515] px-6 pb-9 pt-6 text-white shadow-[0_18px_42px_rgba(17,24,39,0.18)]">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-white/48">
              New to FOM Play
            </p>
            <h2 className="mt-2 text-[30px] font-display font-bold leading-none tracking-[-0.035em] text-white">
              Learn the game
            </h2>
          </div>
          <button
            type="button"
            onClick={() => window.location.assign('/blog')}
            className="inline-flex shrink-0 items-center gap-1 pb-0.5 text-[13px] font-bold leading-none text-white/66 tap-target active:text-primary"
          >
            See all
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-5 h-px bg-white/22" />

        <a
          href="/blog/articles/cara-mulai-turnamen-padel/"
          className="group relative mt-7 block min-h-[236px] overflow-hidden rounded-[26px] bg-on-surface text-left tap-target active:scale-[0.99]"
        >
          <img
            src="/assets/match-hero.jpg"
            alt="Padel court"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.02]"
          />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,12,18,0.02)_0%,rgba(9,12,18,0.24)_38%,rgba(9,12,18,0.92)_100%)]" />
          <span className="relative flex min-h-[236px] flex-col justify-end p-5 text-white">
            <span className="absolute left-5 top-5 inline-flex rounded-full bg-primary px-3.5 py-2 text-[13px] font-bold leading-none">
              Start here
            </span>
            <span className="text-[12px] font-extrabold uppercase leading-none tracking-[0.16em] text-primary">
              Getting started
            </span>
            <span className="mt-3 max-w-[16rem] text-[30px] font-display font-bold leading-[1.04] tracking-[-0.035em] text-white">
              Run your first match in 5 minutes
            </span>
            <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold leading-none text-white/78">
              <Clock3 size={15} strokeWidth={2.1} />
              3 min read
            </span>
          </span>
        </a>

        <div className="mt-5">
          {learnArticles.map((article) => (
            <a
              key={article.number}
              href={article.href}
              className="flex min-h-[88px] w-full items-center gap-4 border-t border-white/12 py-4 text-left tap-target first:border-t-0 active:opacity-70"
            >
              <span className="w-[2.4rem] shrink-0 font-display text-[28px] font-bold leading-none tracking-[-0.04em] text-white/24 tabular-nums">
                {article.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold uppercase leading-none tracking-[0.16em] text-primary">
                  {article.category}
                </span>
                <span className="mt-2 block text-[19px] font-display font-bold leading-[1.12] tracking-[-0.025em] text-white">
                  {article.title}
                </span>
                <span className="mt-2 block text-[13px] font-semibold leading-none text-white/48">
                  {article.read}
                </span>
              </span>
              <ChevronRight size={21} strokeWidth={2.2} className="shrink-0 text-white/38" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );

  const renderRecentHistory = () => (
    <section className="px-6 pt-7 pb-28">
      <SectionHeading
        eyebrow="Your games"
        title="Recent matches"
        actionLabel="See all"
        onAction={onOpenHistoryList}
      />
      <div className="border-y border-black/[0.14]">
        {isHistoryLoading ? (
          <div className="py-12 text-center">
            <Trophy size={34} className="mx-auto mb-3 text-ios-gray/25" />
            <p className="text-[13px] font-semibold text-ios-gray">Loading history...</p>
          </div>
        ) : recentTournaments.length === 0 ? (
          <div className="py-12 text-center">
            <Trophy size={34} className="mx-auto mb-3 text-ios-gray/25" />
            <p className="text-[13px] font-semibold text-ios-gray">No finished matches yet.</p>
          </div>
        ) : (
          recentTournaments.map((item, index) => {
            const dateParts = formatHistoryDateParts(item.date);
            const completedMatches = getCompletedMatchesCount(item);

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onOpenHistoryMatch(item)}
                className={cn(
                  'grid w-full grid-cols-[3.9rem_minmax(0,1fr)_1rem] items-center gap-3 py-5.5 text-left tap-target active:opacity-70',
                  index > 0 && 'border-t border-black/[0.14]'
                )}
              >
                <span className="shrink-0 text-left">
                  <span className="block font-display text-[31px] font-bold leading-none tracking-[-0.04em] text-on-surface/95 tabular-nums">
                    {dateParts.day}
                  </span>
                  <span className="mt-2.5 block text-[12.5px] font-extrabold uppercase leading-none tracking-[0.09em] text-ios-gray">
                    {dateParts.month}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase leading-none tracking-[0.15em] text-primary/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {formatMatchModeLabel(item.format)}
                  </span>
                  <span className="mt-2.5 block text-[22px] font-display font-bold leading-[1.08] tracking-[-0.03em] text-on-surface">
                    {item.name}
                  </span>
                  <span className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[14.5px] font-semibold leading-tight text-ios-gray">
                    <MapPin size={16} strokeWidth={2} className="shrink-0 text-ios-gray/78" />
                    <span className="truncate">{getTournamentVenueLabel(item)}</span>
                  </span>
                  <span className="mt-3 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] font-semibold leading-tight text-ios-gray">
                    <span className="whitespace-nowrap"><b className="font-bold text-on-surface tabular-nums">{Number(item.numPlayers || 0).toLocaleString('en-US')}</b> players</span>
                    <span className="whitespace-nowrap"><span className="text-ios-gray/45">·</span> <b className="font-bold text-on-surface tabular-nums">{Number(item.numRounds || 0).toLocaleString('en-US')}</b> rounds</span>
                    <span className="whitespace-nowrap"><span className="text-ios-gray/45">·</span> <b className="font-bold text-on-surface tabular-nums">{completedMatches.toLocaleString('en-US')}</b> matches</span>
                  </span>
                </span>
                <ChevronRight size={22} strokeWidth={2.3} className="shrink-0 justify-self-end text-ios-gray/38" />
              </button>
            );
          })
        )}
      </div>
    </section>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-md bg-white">
        <section className="px-6 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-1.5" aria-label="FOM Play">
              {renderLogo('h-[26px] w-[34px] shrink-0')}
              <span className="font-display text-[21px] font-extrabold leading-none tracking-normal text-on-surface">
                FOM<span className="text-primary">Play</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <InstallAppButton
                compact
                className="h-9 rounded-full border-black/10 bg-white px-3.5 text-[12.5px] font-semibold text-primary shadow-none"
              />
              {notificationsEnabled && (
                <button
                  type="button"
                  onClick={onNotifications}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-on-surface tap-target active:scale-[0.97]"
                  aria-label="Open notifications"
                >
                  <Bell size={19} strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10px] font-extrabold leading-none text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="pt-7">
            <p className="text-[13.5px] font-semibold leading-tight text-on-surface/58">
              Welcome back, <b className="font-bold text-on-surface">{user?.displayName || 'Padel Player'}</b> <span aria-hidden="true">👋</span>
            </p>
            <h1 className="mt-2.5 flex min-h-[3.7rem] max-w-[18.5rem] items-center text-[27px] font-display font-bold leading-[1.08] tracking-[-0.035em] text-on-surface">
              <span
                className={cn(
                  'inline-block transition-all duration-300 ease-out motion-reduce:transition-none',
                  isQuoteSwapping ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
                )}
              >
                <span>{quote.lead} </span>
                <em className="not-italic text-primary">{quote.accent}</em>
              </span>
            </h1>
          </div>

          <div className="mt-5 grid min-h-[76px] grid-cols-[0.82fr_1.18fr_1.28fr] items-center border-y border-black/[0.09]">
            <span className="flex min-w-0 flex-col justify-center py-3.5 pr-3">
              <span className="block text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/72">
                MMR
              </span>
              <span className="mt-2 block text-[20px] font-bold leading-none tracking-[-0.02em] tabular-nums text-on-surface">
                {formatDisplayMmr(currentMmr)}
              </span>
            </span>
            <span className="flex min-w-0 flex-col justify-center border-x border-black/[0.08] px-3 py-3.5">
              <span className="block text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/72">
                Rank
              </span>
              <span className="mt-2 flex min-w-0 items-center gap-1.5 text-[clamp(12px,3.2vw,13.5px)] font-bold leading-none text-on-surface/72">
                <RankIcon size={14} strokeWidth={2.2} className="shrink-0 text-on-surface/54" />
                <span className="min-w-0 whitespace-nowrap leading-none">{currentRank.name}</span>
              </span>
            </span>
            <span className="flex min-w-0 flex-col justify-center py-3.5 pl-3">
              <span className="block text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-ios-gray/72">
                7 days
              </span>
              <span className="mt-2 block truncate text-[clamp(12px,3.2vw,13.5px)] font-bold leading-none text-emerald-700 tabular-nums">
                {isMmrDeltaLoading ? 'Loading...' : mmrDeltaLabel}
              </span>
            </span>
          </div>
        </section>

        <section className="px-6 pt-5">
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onStartMatch}
              className="flex w-full items-center gap-3.5 rounded-[18px] border-0 bg-[linear-gradient(100deg,#ef6a1f_0%,#e65e14_100%)] px-4.5 py-4 text-left text-white tap-target active:scale-[0.985]"
            >
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-white/20">
                <PlusCircle size={22} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-display font-bold leading-tight tracking-[-0.018em]">
                  Start Match
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-white/88">
                  Pick players, jump straight to scoring.
                </span>
              </span>
              <ChevronRight size={18} strokeWidth={2.4} className="shrink-0" />
            </button>

            <button
              type="button"
              onClick={onOpenRooms}
              className="flex w-full items-center gap-3.5 rounded-[18px] border border-black/10 bg-white px-4.5 py-4 text-left text-on-surface tap-target active:scale-[0.985]"
            >
              <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                <CalendarDays size={21} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-display font-bold leading-tight tracking-[-0.018em]">
                  Rooms
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-on-surface/60">
                  Plan ahead and prep your squad.
                </span>
              </span>
              <ChevronRight size={18} strokeWidth={2.4} className="shrink-0 text-ios-gray" />
            </button>
          </div>
        </section>

        {renderActiveMatch()}
        {renderUpcomingRooms()}
        {renderLearnSection()}
        {renderRecentHistory()}
      </main>
    </div>
  );
};
