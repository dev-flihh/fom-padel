import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Trophy,
  Users,
  User,
  Bell,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Camera,
  Check,
  X,
  Search,
  Lock,
  Eye,
  EyeOff,
  Share2,
  Zap,
  BarChart2,
  Circle,
  Settings,
  LogOut,
  SlidersHorizontal,
  MapPin,
  Award,
  TrendingUp,
  Calendar,
  Star,
  Instagram,
  RefreshCw,
  Mail,
  Inbox,
  Download,
  Building2,
  AlertTriangle,
  CircleHelp,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './lib/utils';
import { Screen, Player, Tournament, Match, Round, MatchFormat, RankingCriteria, AppNotification, ScoringType, TournamentHistory, RankTier, UserProfile, Friend, FriendRequest, FriendRequestStatus, CourtChange, PlayerMatchLedgerEntry } from './types';
import { INITIAL_PLAYERS, INITIAL_TOURNAMENT } from './constants';
import { auth, db, storage, googleProvider, appleProvider } from './firebase';
import { getScreenRoute, resolveTrackableButton, syncAnalyticsUser, trackButtonClick, trackPageView } from './analytics';
import { ARCHIVE_BASE_PATH, TOP_LEVEL_PATHS, getTopLevelPath, type TopLevelRoute, type PublicTopLevelRoute, PUBLIC_PAGE_META, PUBLIC_SOCIAL_IMAGE_PATH, resolveTopLevelRoute, getCanonicalUrlForRoute, getPublicStructuredData, PublicMarketingRouter } from './marketing';
import { RegionSelector } from './components/RegionSelector';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  updateProfile,
  type AuthProvider
} from 'firebase/auth';
import { addDoc, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, orderBy, onSnapshot, documentId } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const Logo = ({ className }: { className?: string }) => (
  <img
    src="https://res.cloudinary.com/dfyov6lu7/image/upload/v1775573986/FOM_Logomark_-_Color_opxjpk.png"
    alt="Gas Padel Logo"
    className={cn("object-contain", className)}
  />
);

const AppLoadingScreen = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const hadHtmlClass = html.classList.contains('app-loading');
    const hadBodyClass = body.classList.contains('app-loading');
    const hadRootClass = root?.classList.contains('app-loading') ?? false;
    html.style.backgroundColor = '#ff5501';
    body.style.backgroundColor = '#ff5501';
    html.classList.add('app-loading');
    body.classList.add('app-loading');
    root?.classList.add('app-loading');

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      if (!hadHtmlClass) html.classList.remove('app-loading');
      if (!hadBodyClass) body.classList.remove('app-loading');
      if (root && !hadRootClass) root.classList.remove('app-loading');
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[220] overflow-hidden"
      style={{
        backgroundColor: '#ff5501'
      }}
    >
      <img
        src="/loading-screen.png"
        alt="FOM Play loading"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 bg-[#ff5501]"
        style={{
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px) - 140px)',
          height: 'calc(env(safe-area-inset-bottom, 0px) + 180px)'
        }}
      />
    </div>
  );
};

// --- Constants & Helpers ---

const RANK_TIERS: { name: RankTier, min: number, max: number, color: string, icon: any }[] = [
  { name: 'Rookie', min: 0, max: 799, color: 'bg-ios-gray/10 text-ios-gray', icon: Circle },
  { name: 'Amateur', min: 800, max: 1699, color: 'bg-orange-400/10 text-orange-600', icon: Zap },
  { name: 'Challenger', min: 1700, max: 2899, color: 'bg-purple-500/10 text-purple-600', icon: TrendingUp },
  { name: 'Elite', min: 2900, max: 4499, color: 'bg-blue-500/10 text-blue-600', icon: Award },
  { name: 'Master', min: 4500, max: 6699, color: 'bg-emerald-500/10 text-emerald-600', icon: Star },
  { name: 'Grandmaster', min: 6700, max: 9699, color: 'bg-red-500/10 text-red-600', icon: Zap },
  { name: 'Legend', min: 9700, max: 13699, color: 'bg-yellow-400/10 text-yellow-600', icon: Trophy },
  { name: 'Hall of Fame', min: 13700, max: Infinity, color: 'bg-primary/10 text-primary', icon: Award },
];

const getRankInfo = (mmr: number) => {
  const rank = RANK_TIERS.find(r => mmr >= r.min && mmr <= r.max) || RANK_TIERS[0];
  const nextRank = RANK_TIERS[RANK_TIERS.indexOf(rank) + 1];
  const progress = nextRank ? ((mmr - rank.min) / (nextRank.min - rank.min)) * 100 : 100;
  return { ...rank, progress, nextRank };
};

const getLedgerEntryDate = (value?: any) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLedgerEntryTimestamp = (entry: Pick<PlayerMatchLedgerEntry, 'playedAt' | 'createdAt'>) => (
  getLedgerEntryDate(entry.playedAt) || getLedgerEntryDate(entry.createdAt)
);

const formatMmrDelta = (value?: number) => {
  const safeValue = Number(value || 0);
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toLocaleString()}`;
};

const formatLedgerEntryDate = (date: Date | null) => {
  if (!date) return 'Unknown time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const getLedgerGroupLabel = (date: Date | null) => {
  if (!date) return 'Unknown date';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const getPasswordResetActionSettings = () => {
  if (typeof window === 'undefined') return undefined;
  return {
    url: `${window.location.origin}/app`,
    handleCodeInApp: false
  };
};

const getProviderLabel = (providerId?: string) => {
  if (providerId === 'google.com') return 'Google';
  if (providerId === 'apple.com') return 'Apple';
  if (providerId === 'password') return 'email and password';
  return 'another sign-in method';
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const canUseSessionStorage = () => {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__fom_auth_storage_check__';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const getSocialAuthBrowserWarning = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  if (!canUseSessionStorage()) {
    return 'Google or Apple login cannot continue because this browser blocks temporary login storage. Please open FOM Play in Chrome or Safari, or use email login.';
  }

  const ua = navigator.userAgent.toLowerCase();
  const isAndroidWebView = /\bwv\b/.test(ua) || /; wv\)/.test(ua);
  const isInAppBrowser = /fbav|fban|fb_iab|instagram|line\/|micromessenger|tiktok|twitter|linkedinapp|whatsapp|telegram/.test(ua);

  if (isAndroidWebView || isInAppBrowser) {
    return 'Google or Apple login may fail in this in-app browser. Please open FOM Play in Chrome or Safari, or use email login.';
  }

  return null;
};

const ADMIN_EMAILS = ['falih.hrmn@gmail.com'];

const isAdminEmail = (email?: string | null) => (
  ADMIN_EMAILS.includes((email || '').trim().toLowerCase())
);

const resolveNotificationTone = (
  notification: Pick<AppNotification, 'type' | 'tone'>
): NonNullable<AppNotification['tone']> => {
  if (notification.tone) return notification.tone;
  if (notification.type === 'achievement') return 'achievement';
  if (notification.type === 'match' || notification.type === 'tournament') return 'success';
  return 'info';
};

const getNotificationVisuals = (notification: Pick<AppNotification, 'type' | 'tone'>) => {
  const tone = resolveNotificationTone(notification);
  if (tone === 'error') {
    return {
      tone,
      cardClass: 'bg-[#fff6f5]/96 border-[#ef4444]/12',
      iconWrapClass: 'bg-[#ef4444]/10 text-[#ef4444]',
      titleClass: 'text-[#b42318]',
      messageClass: 'text-[#b42318]/82',
      dismissClass: 'text-[#b42318]/55',
      unreadRowClass: 'bg-[#fff6f5]',
      readRowClass: 'bg-white',
      icon: AlertTriangle,
    };
  }
  if (tone === 'success') {
    return {
      tone,
      cardClass: 'bg-[#f4fbf6]/96 border-[#16a34a]/12',
      iconWrapClass: 'bg-[#16a34a]/10 text-[#16a34a]',
      titleClass: 'text-[#166534]',
      messageClass: 'text-[#166534]/82',
      dismissClass: 'text-[#166534]/55',
      unreadRowClass: 'bg-[#f4fbf6]',
      readRowClass: 'bg-white',
      icon: Check,
    };
  }
  if (tone === 'achievement') {
    return {
      tone,
      cardClass: 'bg-[#fffaf0]/96 border-[#f59e0b]/14',
      iconWrapClass: 'bg-[#f59e0b]/12 text-[#d97706]',
      titleClass: 'text-[#92400e]',
      messageClass: 'text-[#92400e]/82',
      dismissClass: 'text-[#92400e]/55',
      unreadRowClass: 'bg-[#fffaf0]',
      readRowClass: 'bg-white',
      icon: Award,
    };
  }
  if (notification.type === 'match') {
    return {
      tone,
      cardClass: 'bg-white/96 border-black/6',
      iconWrapClass: 'bg-blue-500/10 text-blue-500',
      titleClass: 'text-on-surface',
      messageClass: 'text-on-surface/72',
      dismissClass: 'text-ios-gray/55',
      unreadRowClass: 'bg-blue-500/5',
      readRowClass: 'bg-white',
      icon: Trophy,
    };
  }
  if (notification.type === 'tournament') {
    return {
      tone,
      cardClass: 'bg-white/96 border-black/6',
      iconWrapClass: 'bg-primary/10 text-primary',
      titleClass: 'text-on-surface',
      messageClass: 'text-on-surface/72',
      dismissClass: 'text-ios-gray/55',
      unreadRowClass: 'bg-primary/5',
      readRowClass: 'bg-white',
      icon: Zap,
    };
  }
  return {
    tone,
    cardClass: 'bg-white/96 border-black/6',
    iconWrapClass: 'bg-ios-gray/10 text-ios-gray',
    titleClass: 'text-on-surface',
    messageClass: 'text-on-surface/72',
    dismissClass: 'text-ios-gray/55',
    unreadRowClass: 'bg-ios-gray/5',
    readRowClass: 'bg-white',
    icon: Bell,
  };
};

const MANUAL_PLAYER_ID_PREFIX = 'manual_';
const PLAYER_STATS_COLLECTION = 'player_stats';
const PLAYER_MATCH_LEDGER_COLLECTION = 'player_match_ledger';

const isLikelyFirebaseUid = (value?: string | null) => /^[A-Za-z0-9_-]{20,}$/.test((value || '').trim());

const normalizePlayerSource = (player: Player, currentUid?: string | null): Player => {
  const id = (player?.id || '').trim();
  if (!id) return player;
  if (player.source === 'fom' || player.source === 'manual') return player;

  const inferredSource: Player['source'] =
    id.startsWith(MANUAL_PLAYER_ID_PREFIX)
      ? 'manual'
      : (currentUid && id === currentUid) || isLikelyFirebaseUid(id)
        ? 'fom'
        : 'manual';

  return { ...player, source: inferredSource };
};

const isFomRegisteredPlayer = (player?: Player | null) => {
  if (!player) return false;
  if (player.source === 'fom') return true;
  if (player.source === 'manual') return false;
  if ((player.id || '').startsWith(MANUAL_PLAYER_ID_PREFIX)) return false;
  return isLikelyFirebaseUid(player.id);
};

const normalizeLeaderboardUser = (rawUser: any, fallbackUid: string) => {
  const normalizedUid = typeof rawUser?.uid === 'string' && rawUser.uid.trim()
    ? rawUser.uid.trim()
    : fallbackUid;
  const normalizedMmr = Number.isFinite(Number(rawUser?.mmr)) ? Number(rawUser.mmr) : 0;
  const normalizedTotalMatches = Number.isFinite(Number(rawUser?.totalMatches))
    ? Math.max(0, Number(rawUser.totalMatches))
    : 0;
  const locationActivity = rawUser?.locationActivity;
  const totalLocationActivity = locationActivity && typeof locationActivity === 'object'
    ? Object.values(locationActivity).reduce<number>((total, count) => {
      const normalizedCount = Number(count);
      if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return total;
      return total + normalizedCount;
    }, 0)
    : 0;
  const isLegacyInitialMmrWithoutActivity =
    normalizedMmr === 500 &&
    normalizedTotalMatches === 0 &&
    totalLocationActivity === 0;

  return {
    ...rawUser,
    uid: normalizedUid,
    mmr: isLegacyInitialMmrWithoutActivity ? 0 : normalizedMmr,
    totalMatches: normalizedTotalMatches
  };
};

const isRegisteredFomUser = (rawUser: any) => {
  const uid = typeof rawUser?.uid === 'string' ? rawUser.uid.trim() : '';
  const displayName = typeof rawUser?.displayName === 'string' ? rawUser.displayName.trim() : '';
  const normalizedDisplayName = displayName.toLowerCase().replace(/\s+/g, ' ').trim();
  const blockedPlaceholderNames = new Set(['player padel', 'pemain padel']);
  const isPlaceholderName = blockedPlaceholderNames.has(normalizedDisplayName);
  if (!uid || !displayName) return false;
  if (uid.startsWith(MANUAL_PLAYER_ID_PREFIX)) return false;
  if (isPlaceholderName) return false;
  return true;
};

const sortUsersByMmrDesc = (users: any[]) => (
  [...users].sort((a, b) => {
    const mmrDiff = (Number(b?.mmr) || 0) - (Number(a?.mmr) || 0);
    if (mmrDiff !== 0) return mmrDiff;

    const matchDiff = (Number(b?.totalMatches) || 0) - (Number(a?.totalMatches) || 0);
    if (matchDiff !== 0) return matchDiff;

    return String(a?.displayName || '').localeCompare(String(b?.displayName || ''), 'id');
  })
);

const chunkArray = <T,>(list: T[], size: number): T[][] => {
  if (size <= 0) return [list];
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
};

const fetchPlayerStatsMapByUids = async (uids: string[]) => {
  const uniqueUids = Array.from(new Set((uids || []).map((uid) => String(uid || '').trim()).filter(Boolean)));
  const statsMap = new Map<string, any>();
  if (uniqueUids.length === 0) return statsMap;

  const batches = chunkArray(uniqueUids, 10);
  await Promise.all(
    batches.map(async (batch) => {
      const statsQuery = query(
        collection(db, PLAYER_STATS_COLLECTION),
        where(documentId(), 'in', batch)
      );
      const snapshot = await getDocs(statsQuery);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const uid = typeof data?.uid === 'string' && data.uid.trim() ? data.uid.trim() : docSnap.id;
        if (!uid) return;
        statsMap.set(uid, data);
      });
    })
  );

  return statsMap;
};

const mergeFriendsWithLatestStats = async (friends: Friend[]) => {
  if (!Array.isArray(friends) || friends.length === 0) return [];
  const statsByUid = await fetchPlayerStatsMapByUids(friends.map((friend) => friend.uid));
  return friends.map((friend) => {
    const stats = statsByUid.get(friend.uid);
    if (!stats) return friend;
    const numericMmr = Number(stats?.mmr);
    return {
      ...friend,
      mmr: Number.isFinite(numericMmr) ? Math.max(0, numericMmr) : (friend.mmr || 0)
    };
  });
};

const fetchLeaderboardUsersFromFirestore = async () => {
  try {
    const [statsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(query(collection(db, PLAYER_STATS_COLLECTION), orderBy('mmr', 'desc'))),
      getDocs(query(collection(db, 'users'), orderBy('mmr', 'desc')))
    ]);

    if (!statsSnapshot.empty) {
      const userByUid = new Map<string, any>();
      usersSnapshot.forEach((docSnap) => {
        const normalized = normalizeLeaderboardUser(docSnap.data(), docSnap.id);
        if (!isRegisteredFomUser(normalized)) return;
        userByUid.set(normalized.uid, normalized);
      });

      const statsBasedUsers: any[] = [];
      const seenUids = new Set<string>();
      statsSnapshot.forEach((statsDoc) => {
        const rawStats = statsDoc.data() || {};
        const uid = typeof rawStats?.uid === 'string' && rawStats.uid.trim()
          ? rawStats.uid.trim()
          : statsDoc.id;
        if (!uid) return;
        const baseUser = userByUid.get(uid) || {};
        const mergedUser = normalizeLeaderboardUser(
          {
            ...baseUser,
            ...rawStats,
            uid,
            mmr: Number.isFinite(Number(rawStats?.mmr)) ? Number(rawStats.mmr) : Number(baseUser?.mmr || 0),
            totalMatches: Number.isFinite(Number(rawStats?.totalMatches))
              ? Number(rawStats.totalMatches)
              : Number(baseUser?.totalMatches || 0)
          },
          uid
        );
        if (!isRegisteredFomUser(mergedUser)) return;
        statsBasedUsers.push(mergedUser);
        seenUids.add(uid);
      });

      userByUid.forEach((baseUser, uid) => {
        if (seenUids.has(uid)) return;
        statsBasedUsers.push(baseUser);
      });

      return sortUsersByMmrDesc(statsBasedUsers);
    }
  } catch (statsErr) {
    console.error('Error fetching player_stats leaderboard source, falling back to legacy users:', statsErr);
  }

  const deriveMatchCountsByPlayerFromTournaments = async (targetUserIds: string[]) => {
    const targetSet = new Set(targetUserIds);
    const counts = new Map<string, number>();
    targetUserIds.forEach((uid) => counts.set(uid, 0));

    try {
      const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
      tournamentsSnapshot.forEach((tournamentDoc) => {
        const tournamentData = tournamentDoc.data();
        const rounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];

        rounds.forEach((round: any) => {
          if (!Array.isArray(round?.matches)) return;
          round.matches.forEach((match: any) => {
            if (!match || match.status === 'pending') return;
            const participantIds = new Set<string>();
            const teamAPlayers = Array.isArray(match?.teamA?.players) ? match.teamA.players : [];
            const teamBPlayers = Array.isArray(match?.teamB?.players) ? match.teamB.players : [];

            [...teamAPlayers, ...teamBPlayers].forEach((player: any) => {
              const playerId = typeof player?.id === 'string' ? player.id.trim() : '';
              if (!playerId || !targetSet.has(playerId)) return;
              participantIds.add(playerId);
            });

            participantIds.forEach((participantId) => {
              counts.set(participantId, (counts.get(participantId) || 0) + 1);
            });
          });
        });
      });

      return counts;
    } catch (err) {
      console.error('Error deriving participant-based match counts:', err);
    }

    // Fallback for stricter rulesets: count tournaments owned by each target user.
    await Promise.all(
      targetUserIds.map(async (uid) => {
        try {
          const tournamentsQuery = query(collection(db, 'tournaments'), where('userId', '==', uid));
          const tournamentsSnapshot = await getDocs(tournamentsQuery);
          let totalMatches = 0;

          tournamentsSnapshot.forEach((tournamentDoc) => {
            const tournamentData = tournamentDoc.data();
            const rounds = Array.isArray(tournamentData?.rounds) ? tournamentData.rounds : [];
            rounds.forEach((round: any) => {
              if (!Array.isArray(round?.matches)) return;
              round.matches.forEach((match: any) => {
                if (!match || match.status === 'pending') return;
                totalMatches += 1;
              });
            });
          });

          counts.set(uid, totalMatches);
        } catch (matchErr) {
          console.error(`Error deriving owner-based match count for user ${uid}:`, matchErr);
        }
      })
    );

    return counts;
  };

  const usersQuery = query(collection(db, 'users'), orderBy('mmr', 'desc'));
  const usersSnapshot = await getDocs(usersQuery);
  const fetchedUsers: any[] = [];
  const usersNeedingMatchRecompute: any[] = [];

  usersSnapshot.forEach((docSnap) => {
    const rawUser = docSnap.data();
    const normalizedUser = normalizeLeaderboardUser(rawUser, docSnap.id);
    if (!isRegisteredFomUser(normalizedUser)) return;
    fetchedUsers.push(normalizedUser);

    const hasStoredTotalMatches = Number.isFinite(Number(rawUser?.totalMatches));
    const numericStoredTotalMatches = hasStoredTotalMatches ? Number(rawUser.totalMatches) : 0;
    const shouldRecomputeMatches = (
      !hasStoredTotalMatches ||
      numericStoredTotalMatches < 0 ||
      numericStoredTotalMatches === 0
    );

    if (shouldRecomputeMatches) {
      usersNeedingMatchRecompute.push(normalizedUser);
    }
  });

  if (usersNeedingMatchRecompute.length > 0) {
    const targetUids = usersNeedingMatchRecompute
      .map((leaderboardUser) => leaderboardUser.uid)
      .filter((uid): uid is string => typeof uid === 'string' && uid.trim().length > 0);
    const derivedMatchMap = await deriveMatchCountsByPlayerFromTournaments(targetUids);
    return sortUsersByMmrDesc(
      fetchedUsers.map((leaderboardUser) => ({
        ...leaderboardUser,
        totalMatches: derivedMatchMap.get(leaderboardUser.uid) ?? leaderboardUser.totalMatches ?? 0
      }))
    );
  }

  return sortUsersByMmrDesc(fetchedUsers);
};

const fetchTournamentHistoryForUser = async (uid: string): Promise<TournamentHistory[]> => {
  const normalizeHistoryDate = (rawDate: any, fallbackMs?: number) => {
    if (rawDate?.toDate) return rawDate.toDate();
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'number') return new Date(rawDate);
    if (typeof rawDate === 'string') {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(fallbackMs || Date.now());
  };

  try {
    const ledgerSnapshot = await getDocs(
      query(collection(db, PLAYER_MATCH_LEDGER_COLLECTION), where('uid', '==', uid))
    );
    const latestPlayedAtByTournament = new Map<string, number>();

    ledgerSnapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const tournamentId = typeof data?.tournamentId === 'string' ? data.tournamentId.trim() : '';
      if (!tournamentId) return;
      const playedAtDate = data?.playedAt?.toDate ? data.playedAt.toDate() : null;
      const playedAtMs = playedAtDate instanceof Date && !Number.isNaN(playedAtDate.getTime())
        ? playedAtDate.getTime()
        : 0;
      const prev = latestPlayedAtByTournament.get(tournamentId) || 0;
      if (playedAtMs >= prev) latestPlayedAtByTournament.set(tournamentId, playedAtMs);
    });

    if (latestPlayedAtByTournament.size > 0) {
      const tournamentIds = Array.from(latestPlayedAtByTournament.keys());
      const tournamentDocs = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          try {
            const tournamentRef = doc(db, 'tournaments', tournamentId);
            const tournamentSnap = await getDoc(tournamentRef);
            if (!tournamentSnap.exists()) return null;
            const data = tournamentSnap.data();
            const fallbackMs = latestPlayedAtByTournament.get(tournamentId) || Date.now();
            return normalizeHistoryTournament({
              ...(data as TournamentHistory),
              id: tournamentSnap.id,
              date: normalizeHistoryDate((data as any)?.date, fallbackMs)
            } as TournamentHistory);
          } catch (err) {
            console.error(`Error fetching tournament history ${tournamentId}:`, err);
            return null;
          }
        })
      );

      const histories = tournamentDocs
        .filter((item): item is TournamentHistory => Boolean(item))
        .sort((a, b) => {
          const aRefMs = latestPlayedAtByTournament.get(a.id) || getTournamentDateMs(a);
          const bRefMs = latestPlayedAtByTournament.get(b.id) || getTournamentDateMs(b);
          if (bRefMs !== aRefMs) return bRefMs - aRefMs;
          return getTournamentDateMs(b) - getTournamentDateMs(a);
        });

      if (histories.length > 0) return histories;
    }
  } catch (ledgerErr) {
    console.error('Error fetching tournament history from player_match_ledger, fallback to owner-based tournaments:', ledgerErr);
  }

  const ownerBasedQuery = query(
    collection(db, 'tournaments'),
    where('userId', '==', uid),
    orderBy('date', 'desc')
  );
  const ownerBasedSnapshot = await getDocs(ownerBasedQuery);
  const ownerBasedTournaments: TournamentHistory[] = [];
  ownerBasedSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    ownerBasedTournaments.push(normalizeHistoryTournament({
      ...data,
      id: docSnap.id,
      date: normalizeHistoryDate((data as any)?.date)
    } as TournamentHistory));
  });
  return ownerBasedTournaments;
};

const calculateMMRChange = (isWin: boolean, scoreDiff: number, isUnderdog: boolean, isFavorite: boolean) => {
  let change = 0;
  if (isWin) {
    change = scoreDiff >= 10 ? 40 : 25;
    if (isUnderdog) change += 15;
  } else {
    change = scoreDiff >= 10 ? -35 : -20;
    if (isFavorite) change -= 15;
  }
  return change;
};

const formatDurationFromMs = (elapsedMs: number) => {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const parseDurationToMs = (duration?: string) => {
  if (!duration) return null;
  const parts = duration.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part) || part < 0)) return null;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return null;
};

const getTournamentElapsedMs = (
  rounds: Round[] | undefined,
  nowMs: number,
  endedAt?: number
) => {
  if (!rounds || rounds.length === 0) return 0;

  return rounds.reduce((totalMs, round) => (
    totalMs + (round.matches || []).reduce((roundMs, match) => {
      if (match.status === 'pending') return roundMs;

      if (match.status === 'active' && typeof match.startedAt === 'number') {
        return roundMs + Math.max(0, nowMs - match.startedAt);
      }

      const parsedDuration = parseDurationToMs(match.duration);
      if (parsedDuration !== null) {
        return roundMs + parsedDuration;
      }

      if (typeof match.startedAt === 'number' && typeof endedAt === 'number') {
        return roundMs + Math.max(0, endedAt - match.startedAt);
      }

      return roundMs;
    }, 0)
  ), 0);
};

const sanitizeInactivePlayerIds = (players: Player[], rawInactiveIds?: string[]) => {
  if (!Array.isArray(rawInactiveIds) || rawInactiveIds.length === 0) return [];
  const knownIds = new Set(players.map((player) => player.id));
  const unique = new Set<string>();
  const sanitized: string[] = [];
  rawInactiveIds.forEach((id) => {
    if (!id || !knownIds.has(id) || unique.has(id)) return;
    unique.add(id);
    sanitized.push(id);
  });
  return sanitized;
};

const normalizeCourtChanges = (rawCourtChanges?: CourtChange[]) => {
  if (!Array.isArray(rawCourtChanges) || rawCourtChanges.length === 0) return [];
  return rawCourtChanges
    .map((change) => ({
      effectiveFromRoundId: Math.max(1, Math.floor(Number(change?.effectiveFromRoundId) || 1)),
      fromCourts: Math.max(1, Math.floor(Number(change?.fromCourts) || 1)),
      toCourts: Math.max(1, Math.floor(Number(change?.toCourts) || 1)),
      changedAt: Number.isFinite(Number(change?.changedAt))
        ? Number(change.changedAt)
        : Date.now()
    }))
    .sort((a, b) => a.changedAt - b.changedAt);
};

const getActivePlayersFromTournament = (tournament: Tournament) => {
  const inactiveIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
  const inactiveSet = new Set(inactiveIds);
  return (tournament.players || []).filter((player) => !inactiveSet.has(player.id));
};

const rebuildAmericanoFutureRounds = (
  tournament: Tournament,
  targetNumRounds: number
): Round[] => {
  const safeTarget = Math.max(1, Math.floor(targetNumRounds || 1));
  const currentRoundIndex = tournament.rounds.findIndex((round) => (
    (round.matches || []).some((match) => match.status === 'active')
  ));
  const lockedRoundCount = currentRoundIndex === -1
    ? Math.min(tournament.rounds.length, safeTarget)
    : Math.min(currentRoundIndex + 1, safeTarget);

  const nextRounds: Round[] = tournament.rounds.slice(0, lockedRoundCount).map((round) => ({
    ...round,
    playersBye: [...(round.playersBye || [])],
    matches: round.matches.map((match) => ({
      ...match,
      teamA: { ...match.teamA, players: [...match.teamA.players] },
      teamB: { ...match.teamB, players: [...match.teamB.players] }
    }))
  }));

  const activePlayers = getActivePlayersFromTournament(tournament);
  const playerMatchCounts: Record<string, number> = {};
  const partnerCounts: Record<string, Record<string, number>> = {};
  const opponentCounts: Record<string, Record<string, number>> = {};
  const lastPartnerByPlayer: Record<string, string | null> = {};

  activePlayers.forEach((player) => {
    playerMatchCounts[player.id] = 0;
    partnerCounts[player.id] = {};
    opponentCounts[player.id] = {};
    lastPartnerByPlayer[player.id] = null;
  });

  const getPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
    if (map[a.id] === undefined || map[b.id] === undefined) return 0;
    return map[a.id]?.[b.id] || 0;
  };

  const incrementPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
    if (map[a.id] === undefined || map[b.id] === undefined) return;
    map[a.id][b.id] = (map[a.id][b.id] || 0) + 1;
    map[b.id][a.id] = (map[b.id][a.id] || 0) + 1;
  };

  nextRounds.forEach((round) => {
    round.matches.forEach((match) => {
      const [p1, p2] = match.teamA.players;
      const [p3, p4] = match.teamB.players;
      if (!p1 || !p2 || !p3 || !p4) return;

      [p1, p2, p3, p4].forEach((player) => {
        if (playerMatchCounts[player.id] === undefined) return;
        playerMatchCounts[player.id] = (playerMatchCounts[player.id] || 0) + 1;
      });

      incrementPairCount(partnerCounts, p1, p2);
      incrementPairCount(partnerCounts, p3, p4);
      incrementPairCount(opponentCounts, p1, p3);
      incrementPairCount(opponentCounts, p1, p4);
      incrementPairCount(opponentCounts, p2, p3);
      incrementPairCount(opponentCounts, p2, p4);

      if (playerMatchCounts[p1.id] !== undefined && playerMatchCounts[p2.id] !== undefined) {
        lastPartnerByPlayer[p1.id] = p2.id;
        lastPartnerByPlayer[p2.id] = p1.id;
      }
      if (playerMatchCounts[p3.id] !== undefined && playerMatchCounts[p4.id] !== undefined) {
        lastPartnerByPlayer[p3.id] = p4.id;
        lastPartnerByPlayer[p4.id] = p3.id;
      }
    });
  });

  const listCombinationsOf3 = (arr: Player[]) => {
    const combos: Player[][] = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        for (let k = j + 1; k < arr.length; k++) {
          combos.push([arr[i], arr[j], arr[k]]);
        }
      }
    }
    return combos;
  };

  const evaluateSplitPenalty = (group: Player[]) => {
    const splits: [number, number, number, number][] = [
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [0, 3, 1, 2]
    ];
    let best = {
      penalty: Number.POSITIVE_INFINITY,
      teamA: [group[0], group[1]] as [Player, Player],
      teamB: [group[2], group[3]] as [Player, Player]
    };

    for (const [a1, a2, b1, b2] of splits) {
      const teamA: [Player, Player] = [group[a1], group[a2]];
      const teamB: [Player, Player] = [group[b1], group[b2]];

      const partnerPenaltyA =
        getPairCount(partnerCounts, teamA[0], teamA[1]) * 100 +
        (lastPartnerByPlayer[teamA[0].id] === teamA[1].id ? 180 : 0);
      const partnerPenaltyB =
        getPairCount(partnerCounts, teamB[0], teamB[1]) * 100 +
        (lastPartnerByPlayer[teamB[0].id] === teamB[1].id ? 180 : 0);

      const opponentPenalty =
        getPairCount(opponentCounts, teamA[0], teamB[0]) * 12 +
        getPairCount(opponentCounts, teamA[0], teamB[1]) * 12 +
        getPairCount(opponentCounts, teamA[1], teamB[0]) * 12 +
        getPairCount(opponentCounts, teamA[1], teamB[1]) * 12;

      const penalty = partnerPenaltyA + partnerPenaltyB + opponentPenalty;
      if (penalty < best.penalty) {
        best = { penalty, teamA, teamB };
      }
    }

    return best;
  };

  const playersPerRound = Math.min(Math.floor(activePlayers.length / 4) * 4, tournament.courts * 4);
  while (nextRounds.length < safeTarget) {
    const roundId = nextRounds.length + 1;
    const sortedPlayers = [...activePlayers].sort((a, b) => {
      const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
      return diff !== 0 ? diff : (Math.random() - 0.5);
    });
    const playersInRound = sortedPlayers.slice(0, playersPerRound);
    const playersBye = sortedPlayers.slice(playersPerRound);
    const roundMatches: Match[] = [];

    if (playersPerRound > 0) {
      const remaining = [...playersInRound];
      for (let m = 0; m < playersPerRound / 4; m++) {
        if (remaining.length < 4) break;
        remaining.sort((a, b) => {
          const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
          return diff !== 0 ? diff : (Math.random() - 0.5);
        });

        const seed = remaining[0];
        const candidates = remaining.slice(1);
        const trios = listCombinationsOf3(candidates);
        let bestGroup: Player[] = [seed, ...candidates.slice(0, 3)];
        let bestPenalty = Number.POSITIVE_INFINITY;

        trios.forEach((trio) => {
          const group = [seed, ...trio];
          const pairwisePenalty = group.reduce((sum, playerA, i) => {
            for (let j = i + 1; j < group.length; j++) {
              const playerB = group[j];
              const interactions =
                getPairCount(partnerCounts, playerA, playerB) * 16 +
                getPairCount(opponentCounts, playerA, playerB) * 6;
              sum += interactions;
              if (
                lastPartnerByPlayer[playerA.id] === playerB.id ||
                lastPartnerByPlayer[playerB.id] === playerA.id
              ) {
                sum += 30;
              }
            }
            return sum;
          }, 0);

          if (pairwisePenalty < bestPenalty) {
            bestPenalty = pairwisePenalty;
            bestGroup = group;
          }
        });

        const { teamA, teamB } = evaluateSplitPenalty(bestGroup);
        const [p1, p2] = teamA;
        const [p3, p4] = teamB;
        roundMatches.push({
          id: `r${roundId}-m${m + 1}`,
          court: m + 1,
          roundId,
          status: 'pending',
          teamA: { players: [p1, p2], score: 0 },
          teamB: { players: [p3, p4], score: 0 }
        });

        [p1, p2, p3, p4].forEach((player) => {
          playerMatchCounts[player.id] = (playerMatchCounts[player.id] || 0) + 1;
        });
        incrementPairCount(partnerCounts, p1, p2);
        incrementPairCount(partnerCounts, p3, p4);
        incrementPairCount(opponentCounts, p1, p3);
        incrementPairCount(opponentCounts, p1, p4);
        incrementPairCount(opponentCounts, p2, p3);
        incrementPairCount(opponentCounts, p2, p4);
        lastPartnerByPlayer[p1.id] = p2.id;
        lastPartnerByPlayer[p2.id] = p1.id;
        lastPartnerByPlayer[p3.id] = p4.id;
        lastPartnerByPlayer[p4.id] = p3.id;

        const groupIds = new Set(bestGroup.map((player) => player.id));
        const nextRemaining = remaining.filter((player) => !groupIds.has(player.id));
        remaining.splice(0, remaining.length, ...nextRemaining);
      }
    }

    nextRounds.push({
      id: roundId,
      matches: roundMatches,
      playersBye
    });
  }

  return nextRounds;
};

const hashStringToInt = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const getTournamentVisualSeed = (tournament: Tournament | TournamentHistory) => {
  const explicitId =
    'id' in tournament && typeof tournament.id === 'string' && tournament.id.trim().length > 0
      ? tournament.id.trim()
      : '';
  const startedAtOrDate =
    'startedAt' in tournament && typeof tournament.startedAt === 'number'
      ? tournament.startedAt
      : ('date' in tournament && tournament.date ? new Date(tournament.date).getTime() : 0);
  const stableKey = explicitId || [
    tournament.name || '',
    tournament.format || '',
    tournament.venueName || '',
    tournament.location || '',
    String(startedAtOrDate || 0)
  ].join('|');
  return Math.abs(hashStringToInt(stableKey));
};

const normalizeHistoryTournament = (rawItem: TournamentHistory): TournamentHistory => {
  const normalizedDate = rawItem.date ? new Date(rawItem.date) : new Date();
  const rounds = Array.isArray(rawItem.rounds) ? rawItem.rounds : [];
  if (rounds.length === 0) {
    return { ...rawItem, date: normalizedDate };
  }

  const fallbackEndedAt = typeof rawItem.endedAt === 'number'
    ? rawItem.endedAt
    : normalizedDate.getTime();

  let hasStatusRepair = false;
  const normalizedRounds = rounds.map((round) => ({
    ...round,
    playersBye: Array.isArray(round.playersBye) ? round.playersBye : [],
    matches: (round.matches || []).map((match) => {
      if (match.status === 'completed') return match;
      hasStatusRepair = true;
      const repairedDuration = match.duration || (
        typeof match.startedAt === 'number'
          ? formatDurationFromMs(Math.max(0, fallbackEndedAt - match.startedAt))
          : '00:00'
      );
      return {
        ...match,
        status: 'completed' as const,
        duration: repairedDuration
      };
    })
  }));

  return {
    ...rawItem,
    date: normalizedDate,
    endedAt: rawItem.endedAt ?? (hasStatusRepair ? fallbackEndedAt : rawItem.endedAt),
    courtChanges: normalizeCourtChanges(rawItem.courtChanges),
    rounds: normalizedRounds
  };
};

type CompletedMatchHistoryItem = {
  id: string;
  tournament: TournamentHistory;
  roundId: number;
  match: Match;
};

type CompletedMatchHistoryCardProps = {
  key?: React.Key;
  item: CompletedMatchHistoryItem;
  onClick?: () => void;
  showTournamentMeta?: boolean;
};

type TournamentHistoryCardProps = {
  key?: React.Key;
  tournament: TournamentHistory;
  onClick: () => void;
};

const getTournamentDateMs = (tournament: TournamentHistory) => {
  const rawDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
  return Number.isNaN(rawDate.getTime()) ? 0 : rawDate.getTime();
};

const sortTournamentsByNewest = (tournaments: TournamentHistory[]) => (
  [...tournaments].sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a))
);

const buildCompletedMatchHistoryItems = (
  tournaments: TournamentHistory[],
  limit: number = Number.MAX_SAFE_INTEGER
): CompletedMatchHistoryItem[] => {
  const sortedTournaments = [...tournaments].sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a));
  const items: CompletedMatchHistoryItem[] = [];

  for (const tournament of sortedTournaments) {
    const rounds = [...(tournament.rounds || [])].sort((a, b) => b.id - a.id);
    for (const round of rounds) {
      const matches = (round.matches || []).filter((match) => match.status !== 'pending');
      for (const match of matches) {
        items.push({
          id: `${tournament.id}-${round.id}-${match.id}`,
          tournament,
          roundId: round.id,
          match
        });
        if (items.length >= limit) return items;
      }
    }
  }

  return items;
};

const getHistoryFormatTheme = (format: TournamentHistory['format']) => (
  format === 'Americano'
    ? {
      badge: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700',
      chip: 'border-emerald-500/10 bg-emerald-500/[0.06] text-emerald-700',
      accent: 'text-emerald-700',
      accentSoft: 'text-emerald-700/72',
      surface: 'bg-[linear-gradient(135deg,rgba(16,185,129,0.11)_0%,rgba(255,255,255,0.98)_72%)]'
    }
    : format === 'Mexicano'
      ? {
        badge: 'border-primary/15 bg-primary/10 text-primary',
        chip: 'border-primary/10 bg-primary/[0.06] text-primary',
        accent: 'text-primary',
        accentSoft: 'text-primary/72',
        surface: 'bg-[linear-gradient(135deg,rgba(255,85,1,0.10)_0%,rgba(255,255,255,0.98)_72%)]'
      }
      : {
        badge: 'border-blue-500/15 bg-blue-500/10 text-blue-700',
        chip: 'border-blue-500/10 bg-blue-500/[0.06] text-blue-700',
        accent: 'text-blue-700',
        accentSoft: 'text-blue-700/72',
        surface: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.10)_0%,rgba(255,255,255,0.98)_72%)]'
      }
);

const CompletedMatchHistoryCard = ({
  item,
  onClick,
  showTournamentMeta = true
}: CompletedMatchHistoryCardProps) => {
  const formatTheme = getHistoryFormatTheme(item.tournament.format);
  const teamAScore = Number(item.match.teamA.score || 0);
  const teamBScore = Number(item.match.teamB.score || 0);
  const teamAWin = teamAScore > teamBScore;
  const teamBWin = teamBScore > teamAScore;
  const metaLabel = `Round ${item.roundId} • Court ${item.match.court}`;
  const dateLabel = item.tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const sharedButtonClass = 'w-full rounded-[24px] p-4 text-left border border-black/5 shadow-sm transition-all';

  const renderPlayerStack = (players: Player[]) => (
    <div className="flex -space-x-2">
      {players.map((player, index) => (
        <div
          key={`${player.id}-${index}`}
          className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-ios-gray/10 flex items-center justify-center text-[10px] font-bold text-ios-gray shadow-sm"
        >
          {player.avatar ? (
            <img className="h-full w-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
          ) : (
            <span>{player.initials || player.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      ))}
    </div>
  );

  const renderTeamBlock = (
    label: string,
    players: Player[],
    alignment: 'left' | 'right',
    isWinner: boolean
  ) => (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3',
        isWinner ? cn('bg-white shadow-sm', formatTheme.badge) : 'border-black/5 bg-white/75'
      )}
    >
      <div className={cn('flex items-center gap-2.5', alignment === 'right' && 'sm:justify-end')}>
        {alignment === 'left' && renderPlayerStack(players)}
        <div className={cn('min-w-0 flex-1', alignment === 'right' && 'sm:text-right')}>
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.12em]', isWinner ? 'opacity-80' : 'text-ios-gray/72')}>
            {label}
          </p>
          <p className={cn('mt-1 text-[13px] font-semibold leading-snug text-on-surface', alignment === 'right' && 'sm:truncate')}>
            {players.map((player) => player.name.split(' ')[0]).join(' / ')}
          </p>
        </div>
        {alignment === 'right' && renderPlayerStack(players)}
      </div>
    </div>
  );

  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray">{dateLabel}</span>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.badge)}>
              {item.tournament.format}
            </span>
          </div>
          <h4 className="mt-2 text-[16px] font-bold leading-tight tracking-tight text-on-surface truncate">
            {showTournamentMeta ? item.tournament.name : metaLabel}
          </h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {showTournamentMeta && (
              <span className="inline-flex rounded-full border border-black/5 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-ios-gray">
                {metaLabel}
              </span>
            )}
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]', formatTheme.chip)}>
              Final score
            </span>
          </div>
        </div>
        {onClick && (
          <div className="shrink-0 rounded-full border border-black/5 bg-white/85 p-2">
            <ChevronRight size={17} className={cn(formatTheme.accent)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="rounded-[18px] border border-black/5 bg-white px-3 py-3 text-center shadow-sm sm:order-none">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ios-gray/68">Score</p>
          <div className="mt-1 text-[24px] leading-none font-display font-black tracking-tight tabular-nums whitespace-nowrap">
            <span className={cn(teamAWin ? formatTheme.accent : 'text-on-surface')}>{teamAScore}</span>
            <span className="mx-1 text-ios-gray/28">-</span>
            <span className={cn(teamBWin ? formatTheme.accent : 'text-on-surface')}>{teamBScore}</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-ios-gray/72">
            {teamAWin ? 'Team A won' : teamBWin ? 'Team B won' : 'Draw'}
          </p>
        </div>

        {renderTeamBlock('Team A', item.match.teamA.players, 'left', teamAWin)}
        {renderTeamBlock('Team B', item.match.teamB.players, 'right', teamBWin)}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className={cn(sharedButtonClass, 'p-3.5 sm:p-4', formatTheme.surface)}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(sharedButtonClass, 'p-3.5 sm:p-4 tap-target active:scale-[0.99]', formatTheme.surface)}
    >
      {content}
    </button>
  );
};

const TournamentHistoryCard = ({
  tournament,
  onClick
}: TournamentHistoryCardProps) => {
  const formatTheme = getHistoryFormatTheme(tournament.format);
  const completedMatches = buildCompletedMatchHistoryItems([tournament]).length;
  const placeLabel = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-[24px] sm:rounded-[28px] border border-black/5 p-3.5 sm:p-4 text-left tap-target transition-all active:scale-[0.99]',
        formatTheme.surface
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold tracking-tight text-ios-gray">
              {tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.badge)}>
              {tournament.format}
            </span>
          </div>
          <h4 className="mt-1.5 truncate text-[17px] sm:text-[19px] font-bold tracking-tight text-on-surface">{tournament.name}</h4>
          <p className="mt-1 text-[12px] sm:text-[13px] leading-relaxed text-ios-gray">
            {tournament.numPlayers} players • {tournament.numRounds} rounds • {completedMatches} completed matches
          </p>
          {placeLabel && (
            <div className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-tight text-ios-gray">
              <MapPin size={12} className={cn('shrink-0', formatTheme.accentSoft)} />
              <span className="truncate">{placeLabel}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 rounded-full border border-black/5 bg-white/80 p-2">
          <ChevronRight size={16} className={cn(formatTheme.accent)} />
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-[16px] sm:rounded-[18px] border border-black/5 bg-white/82 px-2.5 sm:px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/72">Players</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight text-on-surface tabular-nums">{tournament.numPlayers}</p>
        </div>
        <div className="rounded-[16px] sm:rounded-[18px] border border-black/5 bg-white/82 px-2.5 sm:px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/72">Rounds</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight text-on-surface tabular-nums">{tournament.numRounds}</p>
        </div>
        <div className={cn('rounded-[16px] sm:rounded-[18px] border px-2.5 sm:px-3 py-2', formatTheme.chip)}>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">Matches</p>
          <p className="mt-1 text-[14px] sm:text-[15px] font-bold tracking-tight tabular-nums">{completedMatches}</p>
        </div>
      </div>
    </button>
  );
};

const RankBadge = ({ mmr, size = 'md', showLabel = true }: { mmr: number, size?: 'sm' | 'md' | 'lg', showLabel?: boolean }) => {
  const rank = getRankInfo(mmr);
  const Icon = rank.icon;

  const sizes = {
    sm: { container: 'px-1.5 py-0.5 gap-1', icon: 12, text: 'text-[9px]' },
    md: { container: 'px-2.5 py-1 gap-1.5', icon: 16, text: 'text-[11px]' },
    lg: { container: 'px-4 py-2 gap-2', icon: 24, text: 'text-[14px]' },
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full font-bold uppercase tracking-wider",
      rank.color,
      sizes[size].container
    )}>
      <Icon size={sizes[size].icon} />
      {showLabel && <span className={sizes[size].text}>{rank.name}</span>}
    </div>
  );
};

const getPlayersStorageKey = (uid: string) => `gas_padel_players_${uid}`;
const getTournamentStorageKey = (uid: string) => `fom_play_active_tournament_${uid}`;
const getTournamentHistoryStorageKey = (uid: string) => `fom_play_tournament_history_${uid}`;
const getTournamentShareStorageKey = (uid: string, startedAt?: number) => `fom_play_share_id_${uid}_${startedAt || 'none'}`;
const createFreshTournamentDraft = (): Tournament => ({
  ...INITIAL_TOURNAMENT,
  id: undefined,
  name: '',
  backgroundId: undefined,
  startedAt: undefined,
  endedAt: undefined,
  players: [],
  inactivePlayerIds: [],
  courtChanges: [],
  rounds: [],
  venueName: '',
  location: ''
});
const hasSetupDraftChanges = (tournament: Tournament) => {
  const trimmedName = (tournament.name || '').trim();
  const trimmedVenue = (tournament.venueName || '').trim();
  const trimmedLocation = (tournament.location || '').trim();
  const normalizedScoringType = tournament.scoringType || 'Golden Point';

  return (
    !tournament.startedAt &&
    (
      trimmedName.length > 0 ||
      trimmedVenue.length > 0 ||
      trimmedLocation.length > 0 ||
      (tournament.players || []).length > 0 ||
      tournament.format !== INITIAL_TOURNAMENT.format ||
      tournament.criteria !== INITIAL_TOURNAMENT.criteria ||
      normalizedScoringType !== 'Golden Point' ||
      tournament.courts !== INITIAL_TOURNAMENT.courts ||
      tournament.totalPoints !== INITIAL_TOURNAMENT.totalPoints ||
      tournament.numRounds !== INITIAL_TOURNAMENT.numRounds
    )
  );
};
const DEFAULT_PLAYER_SEED_NAMES = new Set(INITIAL_PLAYERS.map((p) => p.name.toLowerCase()));
const FALLBACK_MATCH_BACKGROUND = '/mockups/active-v2/images/match-01.jpg';
const MATCH_BACKGROUND_POOLS: Record<MatchFormat, string[]> = {
  Americano: [
    '/mockups/active-v2/images/Americano-01.jpg',
    '/mockups/active-v2/images/Americano-02.jpg',
    '/mockups/active-v2/images/Americano-03.jpg',
    '/mockups/active-v2/images/Americano-04.jpg',
    '/mockups/active-v2/images/americano-06.jpg'
  ],
  Mexicano: [
    '/mockups/active-v2/images/Mexicano-01.jpg',
    '/mockups/active-v2/images/Mexicano-02.jpg',
    '/mockups/active-v2/images/Mexicano-03.jpg',
    '/mockups/active-v2/images/mexicano-04.jpg',
    '/mockups/active-v2/images/mexicano-05.jpg',
    '/mockups/active-v2/images/mexicano-06.jpg',
    '/mockups/active-v2/images/mexicano-07.jpg'
  ],
  'Match Play': [
    '/mockups/active-v2/images/match-01.jpg',
    '/mockups/active-v2/images/Match-02.jpg',
    '/mockups/active-v2/images/Match-03.jpg',
    '/mockups/active-v2/images/match-04.jpg',
    '/mockups/active-v2/images/match-05.jpg',
    '/mockups/active-v2/images/match-06.jpg',
    '/mockups/active-v2/images/Match-07.jpg',
    '/mockups/active-v2/images/match-08.jpg'
  ]
};

const getMatchBackgroundPool = (format: MatchFormat) => {
  const pool = MATCH_BACKGROUND_POOLS[format] || [];
  return pool.length > 0 ? pool : [FALLBACK_MATCH_BACKGROUND];
};

const getRandomMatchBackground = (format: MatchFormat) => {
  const pool = getMatchBackgroundPool(format);
  return pool[Math.floor(Math.random() * pool.length)];
};

const resolveMatchBackground = (format: MatchFormat, selectedBackgroundId?: string | null) => {
  const pool = getMatchBackgroundPool(format);
  if (selectedBackgroundId && pool.includes(selectedBackgroundId)) {
    return selectedBackgroundId;
  }
  return pool[0] || FALLBACK_MATCH_BACKGROUND;
};

const isLegacySeedPlayers = (players: Player[] | null | undefined) => {
  if (!players || players.length === 0) return false;
  if (players.length !== INITIAL_PLAYERS.length) return false;
  return players.every((p) => DEFAULT_PLAYER_SEED_NAMES.has((p?.name || '').toLowerCase()));
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isAppShellQuery = (params: URLSearchParams) => {
  const sharedId = params.get('shared');
  const e2e = params.get('e2e');
  return Boolean(
    sharedId ||
    e2e === 'finished-flow' ||
    e2e === 'background-flow' ||
    e2e === 'profile-flow'
  );
};

const getInitialSharedContext = () => {
  const params = new URLSearchParams(window.location.search);
  const sharedId = params.get('shared');
  const targetView = params.get('view') === 'klasemen' ? 'klasemen' : 'active';
  return {
    sharedId,
    targetView,
    isShared: Boolean(sharedId)
  };
};

const getInitialE2EScenario = () => {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('e2e');
  if (scenario === 'finished-flow' || scenario === 'background-flow' || scenario === 'profile-flow') return scenario;
  return null;
};

const detectIOSDevice = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  const isiPhoneOrIPad = /iphone|ipad|ipod/.test(ua);
  const isiPadOSDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isiPhoneOrIPad || isiPadOSDesktop;
};

const InstallAppButton = ({
  className,
  compact = false,
  variant = 'pill'
}: {
  className?: string;
  compact?: boolean;
  variant?: 'pill' | 'minimum';
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const isIos = useMemo(() => detectIOSDevice(), []);

  useEffect(() => {
    const checkStandalone = () => {
      const byDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches;
      const byNavigator = Boolean((window.navigator as any).standalone);
      setIsStandalone(Boolean(byDisplayMode || byNavigator));
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    checkStandalone();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      window.alert('For iPhone/iPad: open the Share menu in Safari, then choose "Add to Home Screen".');
      return;
    }

    window.alert('Open your browser menu (⋮), then choose "Install app" or "Add to Home screen".');
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstall}
      className={cn(
        "tap-target inline-flex items-center justify-center gap-1.5 font-semibold",
        variant === 'pill'
          ? cn(
            "h-9 rounded-full border",
            compact ? "px-2.5 text-[11px]" : "px-3 text-[12px]"
          )
          : cn(
            "h-8 rounded-none border-0 bg-transparent",
            compact ? "px-0 text-[12px]" : "px-0 text-[13px]"
          ),
        className
      )}
      aria-label="Install app"
    >
      <Download size={15} />
      <span>{compact ? 'Install' : 'Install App'}</span>
    </button>
  );
};

// --- Components ---

const BottomNav = ({
  currentScreen,
  setScreen,
  unreadCount
}: {
  currentScreen: Screen,
  setScreen: (s: Screen) => void,
  unreadCount: number
}) => {
  const tabs: { id: Screen, label: string, icon: any }[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'leaderboard', label: 'Ranking', icon: BarChart2 },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="fixed inset-x-0 z-50 px-4"
      style={{ bottom: 'calc(var(--app-safe-bottom, 0px) + var(--app-bottom-nav-gap, 14px))' }}
    >
      <div className="mx-auto w-full max-w-md rounded-full border border-white/70 bg-white/68 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 px-2 py-2 shadow-[0_8px_22px_rgba(17,24,39,0.08)]">
        <div className="flex items-center justify-between gap-1">
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id)}
                className={cn(
                  "relative h-10 transition-all duration-200 select-none",
                  isActive
                    ? "flex items-center gap-2 rounded-full border border-primary/12 bg-primary/[0.07] px-3.5 text-primary"
                    : "w-10 rounded-full flex items-center justify-center bg-ios-gray/[0.06] text-ios-gray"
                )}
                aria-label={tab.label}
              >
                <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2.2} />
                {isActive && <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">{tab.label}</span>}
                {tab.id === 'profile' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

// --- Screens ---

const LoginScreen = () => {
  const [mode, setMode] = useState<'masuk' | 'daftar' | 'forgot'>('masuk');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const changeMode = (nextMode: 'masuk' | 'daftar' | 'forgot') => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleAuthError = (err: any) => {
    console.error(err);
    if (err.code === 'auth/user-not-found') setError('This email is not registered.');
    else if (err.code === 'auth/wrong-password') setError('Incorrect password.');
    else if (err.code === 'auth/email-already-in-use') setError('This email is already in use.');
    else if (err.code === 'auth/invalid-email') setError('Please enter a valid email address.');
    else if (err.code === 'auth/weak-password') setError('Password is too weak.');
    else if (err.code === 'auth/operation-not-allowed') setError('This login method is not enabled in Firebase Console.');
    else if (err.code === 'auth/network-request-failed') setError('Network issue detected. Please try again.');
    else if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please wait and try again.');
    else if (err.code === 'auth/popup-blocked') setError('Login popup was blocked. Please allow popups and try again.');
    else if (err.code === 'auth/popup-closed-by-user') setError('Login was canceled before completion.');
    else if (err.code === 'auth/missing-initial-state') setError('Social login could not be completed because this browser lost the temporary login state. Please open FOM Play in Chrome or Safari, or use email login.');
    else if (err.code === 'auth/unauthorized-domain') setError('This domain is not authorized in Firebase Authentication.');
    else if (err.code === 'auth/account-exists-with-different-credential') setError('This email is linked to another sign-in method.');
    else if (err.message?.includes('timed out')) setError('Authentication is taking too long. Please check your connection and try again.');
    else setError('Something went wrong. Please try again.');
  };

  const handleLogin = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await withTimeout(
        signInWithEmailAndPassword(auth, sanitizedEmail, password),
        15000,
        'Email login'
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();

    if (!sanitizedName) {
      setError('Full name is required.');
      return;
    }
    if (!sanitizedEmail) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, sanitizedEmail, password),
        15000,
        'Email registration'
      );
      await updateProfile(userCredential.user, { displayName: sanitizedName });

      // Best effort profile sync: auth account already exists even if Firestore write fails.
      try {
        await withTimeout(setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email || sanitizedEmail,
          displayName: sanitizedName,
          mmr: 0,
          totalMatches: 0,
          region: 'Jakarta Selatan, DKI Jakarta',
          homeBase: 'Jakarta Selatan, DKI Jakarta',
          locationActivity: { 'Jakarta Selatan, DKI Jakarta': 0 },
          createdAt: serverTimestamp(),
        }, { merge: true }), 8000, 'Register profile sync');
      } catch (profileErr) {
        console.error('Register profile sync error:', profileErr);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: AuthProvider, providerName: 'Google' | 'Apple') => {
    setError('');
    setLoading(true);
    try {
      const browserWarning = getSocialAuthBrowserWarning();
      if (browserWarning) {
        setError(browserWarning);
        return;
      }

      // Prefer popup on all platforms to avoid redirect state-loss issues
      // in storage-partitioned browsers.
      await withTimeout(
        signInWithPopup(auth, provider),
        15000,
        `${providerName} login`
      );
    } catch (err) {
      const authCode = (err as { code?: string })?.code;
      if (
        authCode === 'auth/popup-blocked' ||
        authCode === 'auth/cancelled-popup-request' ||
        authCode === 'auth/operation-not-supported-in-this-environment'
      ) {
        setError(`${providerName} login could not open in this browser. Please open FOM Play in Chrome or Safari, or use email login.`);
        return;
      }

      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => handleSocialAuth(googleProvider, 'Google');
  const handleAppleLogin = async () => handleSocialAuth(appleProvider, 'Apple');

  const handleForgotPassword = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      setError('Please enter your email first.');
      return;
    }
    setNotice('');
    setError('');
    setLoading(true);
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, sanitizedEmail).catch(() => []);
      if (signInMethods.length > 0 && !signInMethods.includes('password')) {
        setError(`This account uses ${getProviderLabel(signInMethods[0])}. Please sign in with that method instead.`);
        return;
      }

      await withTimeout(
        sendPasswordResetEmail(auth, sanitizedEmail, getPasswordResetActionSettings()),
        15000,
        'Password reset'
      );
      setMode('masuk');
      setNotice(`We sent a reset link to ${sanitizedEmail}. Please check your inbox, spam, or promotions.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const showAppleLogin = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    const vendor = (navigator.vendor || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || ['iphone', 'ipad', 'ipod'].includes(platform);
    if (isIOS) return false;
    return /macintosh|mac os x/.test(ua) || platform.includes('mac') || vendor.includes('apple');
  }, []);

  const socialCta = mode === 'daftar' ? 'Sign up with' : 'Continue with';
  const isLoginMode = mode === 'masuk';
  const authHeading = mode === 'daftar' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Welcome to FOM Play';
  const authSubtitle = mode === 'daftar'
    ? 'Create your account and start scoring in seconds.'
    : mode === 'forgot'
      ? 'Use your account email. If you signed in with Google or Apple, continue with that method instead.'
      : 'Enter your account email to receive a reset link.';
  const showModeSubtitle = !isLoginMode;
  const inputBaseClass = "w-full h-14 rounded-full border border-black/16 bg-white/78 px-5 text-[15px] font-medium text-on-surface placeholder:text-on-surface/40 outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/12 transition-all";
  const passwordFieldClass = `${inputBaseClass} pr-12`;

  return (
    <div
      className="relative min-h-screen overflow-hidden px-6 bg-white"
      style={{
        paddingTop: 'calc(var(--app-safe-top, 0px) + 16px)',
        paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 16px)'
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white" />

      <div className="relative mx-auto w-full max-w-sm min-h-[calc(100dvh-var(--app-safe-top,0px)-var(--app-safe-bottom,0px)-32px)] flex flex-col justify-between">
        <main className="pt-20">
          <header className={cn("space-y-2.5 text-center", isLoginMode && "space-y-2")}>
            <img
              src="/fom-logotype-color.png"
              alt="FOM Play"
              className={cn(
                "h-9 w-auto object-contain mx-auto",
                isLoginMode && "-mt-6 mb-4"
              )}
            />
            <h1 className={cn(
              "text-[34px] leading-[1.02] font-extrabold tracking-tight text-on-surface",
              isLoginMode && "whitespace-nowrap"
            )}>
              {authHeading}
            </h1>
            {showModeSubtitle && (
              <p className="text-[13px] text-on-surface/58 font-medium">
                {authSubtitle}
              </p>
            )}
            {mode === 'masuk' && (
              <p className="text-[14px] text-on-surface/56 font-medium pt-1">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => changeMode('daftar')}
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === 'daftar' && (
              <p className="text-[14px] text-on-surface/56 font-medium">
                Already have an account?{' '}
                <button
                  onClick={() => changeMode('masuk')}
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  Sign in
                </button>
              </p>
            )}
          </header>

          <section className={cn("space-y-4", isLoginMode ? "mt-8" : "mt-7")}>
            {notice && (
              <div className="p-3 bg-primary/8 border border-primary/14 rounded-2xl text-primary text-[12px] font-semibold text-center">
                {notice}
              </div>
            )}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-2xl text-error text-[12px] font-semibold text-center">
                {error}
              </div>
            )}

            <div className="space-y-3.5">
              {mode === 'daftar' && (
                <div>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                      if (notice) setNotice('');
                    }}
                    className={inputBaseClass}
                    placeholder="Full name"
                    type="text"
                  />
                </div>
              )}

              <div>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                    if (notice) setNotice('');
                  }}
                  className={inputBaseClass}
                  placeholder="Email"
                  type="email"
                />
              </div>

              {(mode === 'masuk' || mode === 'daftar') && (
                <div>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                        if (notice) setNotice('');
                      }}
                      className={passwordFieldClass}
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/38 hover:text-on-surface transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  onClick={mode === 'masuk' ? handleLogin : mode === 'daftar' ? handleRegister : handleForgotPassword}
                  disabled={loading}
                  className="w-full h-14 rounded-full bg-[#ff5501] text-white font-bold text-[16px] shadow-[0_14px_28px_rgba(255,85,1,0.28)] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 transition-all"
                >
                  {loading ? 'Please wait...' : mode === 'masuk' ? 'Login' : mode === 'daftar' ? 'Sign up' : 'Send reset link'}
                </button>
              </div>

              {mode === 'masuk' && (
                <div className="pt-1.5 flex justify-center">
                  <button
                    onClick={() => changeMode('forgot')}
                    className="text-[13px] font-semibold text-primary/90 hover:text-primary transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {(mode === 'masuk' || mode === 'daftar') && (
                <div className="pt-5 space-y-3">
                  <p className="text-center text-[11px] font-semibold text-on-surface/42 uppercase tracking-[0.12em]">
                    {socialCta}
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      aria-label={`${socialCta} Google`}
                      className="w-11 h-11 rounded-full border border-black/12 bg-white/92 flex items-center justify-center shadow-sm active:scale-[0.98] disabled:opacity-60 transition-all"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    </button>
                    {showAppleLogin && (
                      <button
                        onClick={handleAppleLogin}
                        disabled={loading}
                        aria-label={`${socialCta} Apple`}
                        className="w-11 h-11 rounded-full border border-black/12 bg-white/92 flex items-center justify-center shadow-sm active:scale-[0.98] disabled:opacity-60 transition-all"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#111827]" aria-hidden="true" fill="currentColor">
                          <path d="M16.365 12.03c.017 1.86 1.63 2.48 1.647 2.488-.014.044-.257.87-.848 1.723-.512.739-1.044 1.476-1.88 1.491-.823.016-1.087-.49-2.03-.49-.943 0-1.237.474-2.015.506-.809.03-1.427-.81-1.943-1.546-1.054-1.522-1.86-4.294-.777-6.176.538-.933 1.5-1.524 2.544-1.539.794-.015 1.544.538 2.03.538.486 0 1.398-.665 2.356-.567.401.017 1.527.161 2.248 1.216-.058.036-1.34.782-1.332 2.356Zm-1.958-4.27c.43-.52.72-1.244.64-1.968-.619.026-1.366.413-1.81.932-.398.457-.747 1.189-.652 1.89.69.054 1.392-.35 1.822-.854Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        <div className="pb-1 space-y-3">
          <div className="text-center px-1">
            {mode === 'forgot' && (
              <p className="text-[12px] text-on-surface/60 font-medium">
                Remember your password?{' '}
                <button
                  onClick={() => changeMode('masuk')}
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>

          <footer className="text-center px-2">
            <p className="text-[11px] text-on-surface/50 leading-relaxed font-medium">
              By continuing, you agree to FOM Play&apos;s <button className="underline underline-offset-2">Terms of Service</button> and <button className="underline underline-offset-2">Privacy Policy</button>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

const DashboardScreen = ({
  onStartMatch,
  onOpenRankingForMe,
  tournament,
  onContinueMatch,
  onNotifications,
  onOpenHistoryList,
  onOpenHistoryMatch,
  unreadCount,
  tournaments,
  user
}: {
  onStartMatch: () => void,
  onOpenRankingForMe: () => void,
  tournament: Tournament,
  onContinueMatch: () => void,
  onNotifications: () => void,
  onOpenHistoryList: () => void,
  onOpenHistoryMatch: (t: TournamentHistory) => void,
  unreadCount: number,
  tournaments: TournamentHistory[],
  user: any
}) => {
  const activeRound = tournament.rounds?.find(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
  const activeMatches = activeRound ? activeRound.matches.filter(m => m && m.status === 'active') : [];
  const featuredActiveMatch = activeMatches[0] || null;
  const recentTournaments = useMemo(() => sortTournamentsByNewest(tournaments).slice(0, 3), [tournaments]);
  const currentMmr = Number.isFinite(Number(user?.mmr)) ? Number(user.mmr) : 0;
  const currentRank = getRankInfo(currentMmr);
  const [mmrDelta7d, setMmrDelta7d] = useState(0);
  const [isMmrDeltaLoading, setIsMmrDeltaLoading] = useState(false);
  const mmrDeltaLabel = `${mmrDelta7d >= 0 ? '+' : ''}${mmrDelta7d.toLocaleString()} (7d)`;

  useEffect(() => {
    const uid = String(user?.uid || '').trim();
    if (!uid) {
      setMmrDelta7d(0);
      setIsMmrDeltaLoading(false);
      return;
    }

    let isCancelled = false;
    const loadMmrDelta7d = async () => {
      setIsMmrDeltaLoading(true);
      try {
        const snapshot = await getDocs(
          query(collection(db, PLAYER_MATCH_LEDGER_COLLECTION), where('uid', '==', uid))
        );
        const cutoffMs = Date.now() - (7 * 24 * 60 * 60 * 1000);
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
        if (!isCancelled) setMmrDelta7d(delta);
      } catch (err) {
        console.error('Error fetching 7-day MMR delta:', err);
        if (!isCancelled) setMmrDelta7d(0);
      } finally {
        if (!isCancelled) setIsMmrDeltaLoading(false);
      }
    };

    loadMmrDelta7d();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  return (
    <div className="pb-32">
      <main className="max-w-2xl mx-auto px-4 pt-5 sm:pt-6 space-y-5">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Logo className="h-8 w-auto" />
            <div className="flex items-center gap-1.5">
              <InstallAppButton
                compact
                className="bg-white text-primary border-primary/20"
              />
              <button
                onClick={onNotifications}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-black/5 bg-ios-gray/5 tap-target transition-all active:scale-[0.98]"
                aria-label="Open notifications"
              >
                <Bell size={19} className="text-on-surface" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 min-w-[16px] h-4 px-1 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold tracking-tight text-ios-gray/85">
              Welcome back, {user?.displayName || 'Padel Player'}
            </p>
            <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.05] font-display font-black tracking-tight text-on-surface">
              Ready for your next match?
            </h1>
          </div>
        </section>

        <section className="space-y-3">
          <div
            onClick={onStartMatch}
            className="w-full rounded-[24px] border border-primary/15 bg-primary px-5 py-4 text-white tap-target cursor-pointer shadow-[0_8px_18px_rgba(255,85,1,0.12)] transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="block text-[22px] leading-tight font-display font-black tracking-tight">Start Match</span>
                <span className="mt-1 block text-[12px] font-semibold text-white/78">Set players and start scoring.</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
                <PlusCircle size={24} />
              </div>
            </div>
          </div>

          <button
            onClick={onOpenRankingForMe}
            className="w-full rounded-[16px] border border-black/5 bg-ios-gray/[0.04] px-3.5 py-2.5 text-left tap-target transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Current Rating</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[24px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                    {currentMmr.toLocaleString()}
                  </span>
                  <span className="pb-0.5 text-[12px] font-semibold tracking-tight text-ios-gray">MMR</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ios-gray">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/90 px-2.5 py-1 font-semibold tracking-tight text-on-surface/88">
                    <currentRank.icon size={12} className="text-on-surface" />
                    {currentRank.name}
                  </span>
                  <span className="font-semibold tracking-tight tabular-nums text-ios-gray/90">
                    {isMmrDeltaLoading ? 'Loading trend...' : mmrDeltaLabel}
                  </span>
                </div>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tracking-tight text-on-surface/60">
                Ranking
                <ChevronRight size={14} className="text-ios-gray/55" />
              </div>
            </div>
          </button>
        </section>

        {featuredActiveMatch && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-on-surface">Continue Match</h2>
              </div>
              {activeMatches.length > 1 && (
                <span className="shrink-0 rounded-full border border-black/5 bg-ios-gray/[0.04] px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
                  {activeMatches.length} active
                </span>
              )}
            </div>
            <button
              onClick={onContinueMatch}
              className="w-full rounded-[22px] border border-black/5 bg-ios-gray/[0.045] px-4 py-4 text-left tap-target transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {tournament.name}
                  </span>
                  <h3 className="mt-2 text-[18px] leading-tight font-bold tracking-tight text-on-surface">
                    Round {featuredActiveMatch.roundId} · Court {featuredActiveMatch.court}
                  </h3>
                  <p className="mt-1 text-[13px] text-ios-gray">
                    {featuredActiveMatch.teamA.players?.map((p) => p?.name?.split(' ')[0]).join(' & ')} vs {featuredActiveMatch.teamB.players?.map((p) => p?.name?.split(' ')[0]).join(' & ')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Live score</p>
                  <p className="mt-1 text-[28px] leading-none font-display font-black tracking-tight tabular-nums text-on-surface">
                    <span className="text-primary">{featuredActiveMatch.teamA.score}</span>
                    <span className="mx-1 text-ios-gray/35">-</span>
                    <span>{featuredActiveMatch.teamB.score}</span>
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-ios-gray">{featuredActiveMatch.duration || '00:00'}</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-[12px] font-semibold text-on-surface/88">
                Continue scoring
                <ChevronRight size={14} />
              </div>
            </button>
          </section>
        )}

        <section className="pb-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-on-surface">Recent History</h2>
            </div>
            <button
              onClick={onOpenHistoryList}
              className="shrink-0 rounded-full border border-black/5 bg-ios-gray/5 px-3 py-2 text-[12px] font-semibold text-on-surface tap-target transition-all active:scale-[0.98]"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {recentTournaments.length === 0 ? (
              <div className="rounded-[28px] border border-ios-gray/10 bg-ios-gray/[0.03] p-8 text-center">
                <Trophy size={36} className="text-ios-gray/20 mx-auto mb-3" />
                <p className="text-ios-gray font-medium">No finished matches yet.</p>
              </div>
            ) : (
              recentTournaments.map((item) => (
                <TournamentHistoryCard
                  key={item.id}
                  tournament={item}
                  onClick={() => onOpenHistoryMatch(item)}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const AddPlayerModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (p: Player) => void }) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [modalBottomOffset, setModalBottomOffset] = useState(24);

  useEffect(() => {
    if (!isOpen) return;

    const updateModalOffset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(24);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(24, keyboardHeight + 18));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, [isOpen]);

  const handleTakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newPlayer: Player = {
      id: `${MANUAL_PLAYER_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`,
      name,
      rating: 0,
      source: 'manual',
      initials,
      avatar: photo || undefined,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    // Close first so UX feels instant on mobile, even if parent state updates right after.
    onClose();
    onAdd(newPlayer);
    setName('');
    setPhoto(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        style={{ marginBottom: modalBottomOffset }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold tracking-tight">Add Player Baru</h3>
            <button onClick={onClose} className="p-2 bg-ios-gray/10 rounded-full tap-target">
              <X size={20} className="text-on-surface" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-ios-gray/10 border-2 border-dashed border-ios-gray/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {photo ? (
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-ios-gray mb-1" />
                    <span className="text-[10px] font-bold text-ios-gray uppercase">Ambil Foto</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleTakePhoto}
                accept="image/*"
                capture="user"
                className="hidden"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ios-gray px-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Falih Hermon"
                  className="w-full h-14 bg-ios-gray/5 border border-ios-gray/10 rounded-2xl px-4 font-semibold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 tap-target mt-4"
            >
              Save Player
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const MatchSettingsScreen = ({ onBack, onGenerate, onOpenFriends, tournament, setTournament, allPlayers, setAllPlayers, onAddNotification, currentUser, focusSection, onFocusHandled }: {
  onBack: () => void,
  onGenerate: (t: Tournament) => void,
  onOpenFriends: () => void,
  tournament: Tournament,
  setTournament: React.Dispatch<React.SetStateAction<Tournament>>,
  allPlayers: Player[],
  setAllPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
  onAddNotification: (title: string, message: string, type: AppNotification['type']) => void,
  currentUser: any,
  focusSection?: 'players' | null,
  onFocusHandled?: () => void
}) => {
  type CourtSuggestion = {
    id: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    type?: string;
  };

  const dedupePlayersById = (players: Player[]) => {
    const deduped = new Map<string, Player>();
    players.forEach((player) => {
      if (!player?.id) return;
      if (!deduped.has(player.id)) deduped.set(player.id, player);
    });
    return Array.from(deduped.values());
  };
  const sortPlayersByName = (players: Player[]) =>
    [...players].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' }));

  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(() => dedupePlayersById(tournament.players || []));
  const [format, setFormat] = useState<MatchFormat>(tournament.format);
  const [criteria, setCriteria] = useState<RankingCriteria>(tournament.criteria);
  const [scoringType, setScoringType] = useState<ScoringType>(tournament.scoringType || 'Golden Point');
  const [courts, setCourts] = useState(tournament.courts);
  const [points, setPoints] = useState(tournament.totalPoints);
  const [numRounds, setNumRounds] = useState(tournament.numRounds || 5);
  const [gameName, setGameName] = useState(() => ((tournament.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (tournament.name || '')));
  const [venueName, setVenueName] = useState(() => tournament.venueName || '');
  const [customModalType, setCustomModalType] = useState<'courts' | 'rounds' | 'points' | null>(null);
  const [customModalValue, setCustomModalValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState(() => tournament.location || '');
  const [courtQuery, setCourtQuery] = useState(() => tournament.location || '');
  const [courtSuggestions, setCourtSuggestions] = useState<CourtSuggestion[]>([]);
  const [isSearchingCourts, setIsSearchingCourts] = useState(false);
  const [courtSearchError, setCourtSearchError] = useState('');
  const [showCourtSuggestions, setShowCourtSuggestions] = useState(false);
  const [courtSearchProvider, setCourtSearchProvider] = useState<'google' | 'osm' | 'none'>('none');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [liveMmrByUid, setLiveMmrByUid] = useState<Record<string, number>>({});
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [googlePlacesBlocked, setGooglePlacesBlocked] = useState(false);
  const [playerDataNotice, setPlayerDataNotice] = useState<{
    missingFromList: number;
    duplicateInSelected: number;
    duplicateInList: number;
  } | null>(null);
  const [dismissPlayerDataNotice, setDismissPlayerDataNotice] = useState(false);
  const lastPlayerDataIssueSignatureRef = useRef('');
  const playersSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    setFriends([]);
    setLoadingFriends(true);

    if (!uid) {
      setLoadingFriends(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'friends'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Friend[] = [];
      snapshot.forEach((docSnap) => fetched.push(docSnap.data() as Friend));
      mergeFriendsWithLatestStats(fetched)
        .then((merged) => setFriends(merged))
        .catch((err) => {
          console.error('Error enriching friends stats for settings:', err);
          setFriends(fetched);
        })
        .finally(() => setLoadingFriends(false));
    }, (err) => {
      console.error('Error fetching friends for settings:', err);
      setFriends([]);
      setLoadingFriends(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, auth.currentUser?.uid]);

  const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    return 0;
  };

  const resolveLiveMmr = (uid: string, fallback = 0) => {
    const fromMap = liveMmrByUid[uid];
    if (Number.isFinite(fromMap)) return Math.max(0, Number(fromMap));
    const normalizedFallback = Number(fallback);
    return Number.isFinite(normalizedFallback) ? Math.max(0, normalizedFallback) : 0;
  };
  const normalizedAllPlayers = useMemo(() => dedupePlayersById(allPlayers || []), [allPlayers]);
  const playerDataIntegrity = useMemo(() => {
    const normalizedSelected = dedupePlayersById(selectedPlayers || []);
    const normalizedAll = dedupePlayersById(allPlayers || []);
    const allIds = new Set(normalizedAll.map((p) => p.id));
    const missingFromList = normalizedSelected.filter((p) => !allIds.has(p.id)).length;
    const duplicateInSelected = Math.max(0, (selectedPlayers || []).filter(Boolean).length - normalizedSelected.length);
    const duplicateInList = Math.max(0, (allPlayers || []).filter(Boolean).length - normalizedAll.length);
    return { missingFromList, duplicateInSelected, duplicateInList };
  }, [selectedPlayers, allPlayers]);

  useEffect(() => {
    const hasIssue =
      playerDataIntegrity.missingFromList > 0 ||
      playerDataIntegrity.duplicateInSelected > 0 ||
      playerDataIntegrity.duplicateInList > 0;
    if (!hasIssue) return;

    setPlayerDataNotice((prev) => {
      if (
        prev &&
        prev.missingFromList === playerDataIntegrity.missingFromList &&
        prev.duplicateInSelected === playerDataIntegrity.duplicateInSelected &&
        prev.duplicateInList === playerDataIntegrity.duplicateInList
      ) {
        return prev;
      }
      return playerDataIntegrity;
    });
    setDismissPlayerDataNotice(false);

    const issueSignature = [
      playerDataIntegrity.missingFromList,
      playerDataIntegrity.duplicateInSelected,
      playerDataIntegrity.duplicateInList,
      selectedPlayers.length,
      allPlayers.length
    ].join(':');

    if (lastPlayerDataIssueSignatureRef.current !== issueSignature) {
      lastPlayerDataIssueSignatureRef.current = issueSignature;
      console.info('[MatchSettings] Player data mismatch recovered', {
        ...playerDataIntegrity,
        selectedCount: selectedPlayers.length,
        allPlayersCount: allPlayers.length,
        tournamentPlayersCount: (tournament.players || []).length
      });
    }
  }, [playerDataIntegrity]);

  useEffect(() => {
    const normalizedFromTournament = dedupePlayersById(tournament.players || []);
    const currentIds = selectedPlayers.map((p) => p.id).join('|');
    const nextIds = normalizedFromTournament.map((p) => p.id).join('|');
    if (currentIds !== nextIds) setSelectedPlayers(normalizedFromTournament);
  }, [tournament.players]);

  useEffect(() => {
    if (selectedPlayers.length === 0) return;
    setAllPlayers((prev) => {
      const normalizedPrev = dedupePlayersById(prev || []);
      const knownIds = new Set(normalizedPrev.map((p) => p.id));
      let changed = normalizedPrev.length !== prev.length;
      const merged = [...normalizedPrev];

      selectedPlayers.forEach((player) => {
        if (!player?.id || knownIds.has(player.id)) return;
        merged.push(player);
        knownIds.add(player.id);
        changed = true;
      });

      return changed ? merged : prev;
    });
  }, [selectedPlayers, setAllPlayers]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    const targetUids = [
      ...(uid ? [uid] : []),
      ...friends.map((friend) => String(friend?.uid || '').trim()).filter(Boolean)
    ];
    const uniqueUids = Array.from(new Set(targetUids));
    if (uniqueUids.length === 0) {
      setLiveMmrByUid({});
      return;
    }

    fetchPlayerStatsMapByUids(uniqueUids)
      .then((statsByUid) => {
        const next: Record<string, number> = {};
        uniqueUids.forEach((targetUid) => {
          const stats = statsByUid.get(targetUid);
          const statsMmr = Number(stats?.mmr);
          if (Number.isFinite(statsMmr)) next[targetUid] = Math.max(0, statsMmr);
        });
        setLiveMmrByUid(next);
      })
      .catch((err) => {
        console.error('Error syncing live mmr for match settings:', err);
      });
  }, [currentUser?.uid, auth.currentUser?.uid, friends]);

  useEffect(() => {
    if (!liveMmrByUid || Object.keys(liveMmrByUid).length === 0) return;
    setAllPlayers((prev) => {
      let changed = false;
      const next = prev.map((player) => {
        const playerId = String(player?.id || '').trim();
        if (!playerId || player?.source !== 'fom') return player;
        const liveMmr = liveMmrByUid[playerId];
        if (!Number.isFinite(liveMmr)) return player;
        const normalizedLive = Math.max(0, Number(liveMmr));
        if (Number(player?.rating || 0) === normalizedLive) return player;
        changed = true;
        return { ...player, rating: normalizedLive };
      });
      return changed ? next : prev;
    });
  }, [liveMmrByUid, setAllPlayers]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;

    const displayName = (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Saya').trim();
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME';

    const liveRating = resolveLiveMmr(uid, currentUser?.mmr || 0);
    setAllPlayers(prev => {
      const existingIndex = prev.findIndex((p) => p.id === uid);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const shouldUpdate =
          existing.name !== displayName ||
          Number(existing.rating || 0) !== liveRating ||
          (existing.avatar || '') !== (currentUser?.photoURL || '');
        if (!shouldUpdate) return prev;
        const next = [...prev];
        next[existingIndex] = {
          ...existing,
          name: displayName,
          rating: liveRating,
          avatar: currentUser?.photoURL || existing.avatar || '',
          source: 'fom'
        };
        return next;
      }
      return [
        {
          id: uid,
          name: displayName,
          rating: liveRating,
          source: 'fom',
          avatar: currentUser?.photoURL || '',
          initials,
          stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
        },
        ...prev
      ];
    });
  }, [currentUser?.uid, currentUser?.displayName, currentUser?.email, currentUser?.photoURL, currentUser?.mmr, setAllPlayers, liveMmrByUid]);

  useEffect(() => {
    setTournament((prev) => {
      const prevIds = prev.players.map((p) => p.id).join('|');
      const nextIds = selectedPlayers.map((p) => p.id).join('|');
      if (prevIds === nextIds) return prev;
      return { ...prev, players: selectedPlayers };
    });
  }, [selectedPlayers, setTournament]);

  useEffect(() => {
    const normalizedName = gameName;
    const normalizedVenue = venueName;
    const normalizedLocation = location.trim();

    setTournament((prev) => {
      const prevName = (prev.name || '').trim() === INITIAL_TOURNAMENT.name ? '' : (prev.name || '');
      const prevVenue = prev.venueName || '';
      const prevLocation = prev.location || '';
      const prevScoringType = prev.scoringType || 'Golden Point';

      if (
        prevName === normalizedName &&
        prev.format === format &&
        prev.criteria === criteria &&
        prevScoringType === scoringType &&
        prev.courts === courts &&
        prev.totalPoints === points &&
        prev.numRounds === numRounds &&
        prevVenue === normalizedVenue &&
        prevLocation === normalizedLocation
      ) {
        return prev;
      }

      return {
        ...prev,
        name: normalizedName,
        format,
        criteria,
        scoringType,
        courts,
        totalPoints: points,
        numRounds,
        venueName: normalizedVenue,
        location: normalizedLocation
      };
    });
  }, [gameName, venueName, location, format, criteria, scoringType, courts, points, numRounds, setTournament]);

  useEffect(() => {
    if (focusSection !== 'players') return;

    const scrollId = window.setTimeout(() => {
      playersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onFocusHandled?.();
    }, 80);

    return () => window.clearTimeout(scrollId);
  }, [focusSection, onFocusHandled]);

  const minPlayersNeeded = courts * 4;
  const isReady = selectedPlayers.length >= minPlayersNeeded;
  const sortedSelectedPlayers = useMemo(() => sortPlayersByName(selectedPlayers), [selectedPlayers]);
  const availablePlayers = useMemo(
    () => sortPlayersByName(
      normalizedAllPlayers.filter((player) => !selectedPlayers.some((selected) => selected?.id === player.id))
    ),
    [normalizedAllPlayers, selectedPlayers]
  );

  const mapToCourtSuggestions = (items: any[], queryLower: string): CourtSuggestion[] => {
    const cityLikeTypes = new Set([
      'city',
      'town',
      'village',
      'municipality',
      'administrative',
      'county',
      'state',
      'province',
      'district',
      'suburb'
    ]);

    const scoreSuggestion = (item: CourtSuggestion) => {
      const name = item.name.toLowerCase();
      const address = item.address.toLowerCase();
      const type = (item.type || '').toLowerCase();
      let score = 0;

      if (cityLikeTypes.has(type)) score += 100;
      if (name.startsWith(queryLower)) score += 40;
      if (name.includes(queryLower)) score += 25;
      if (address.includes(queryLower)) score += 10;
      if (name.includes('padel') || name.includes('court') || name.includes('arena')) score += 8;

      return score;
    };

    return items
      .map((item: any) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        const name = item.name || item.display_name || '';
        const address = item.address || '';
        const id = item.id || `${name}:${lat}:${lon}`;
        return { id, name, address, lat, lon, type: item.type || '' };
      })
      .filter((item: CourtSuggestion) => item.name && !Number.isNaN(item.lat) && !Number.isNaN(item.lon))
      .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
      .slice(0, 6);
  };

  useEffect(() => {
    const query = courtQuery.trim();
    setLocation(query);

    if (query.length < 3) {
      setCourtSuggestions([]);
      setCourtSearchError('');
      setIsSearchingCourts(false);
      setCourtSearchProvider('none');
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCourts(true);
      setCourtSearchError('');

      try {
        const queryWithPadel = query;
        const queryLower = query.toLowerCase();
        let suggestions: CourtSuggestion[] = [];

        if (googleMapsApiKey && !googlePlacesBlocked) {
          try {
            const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
                'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
              },
              body: JSON.stringify({
                input: queryWithPadel,
                languageCode: 'id',
                regionCode: 'ID'
              })
            });

            if (!googleResponse.ok) {
              if (googleResponse.status === 403) {
                setGooglePlacesBlocked(true);
              }
              throw new Error(`Google Places failed: ${googleResponse.status}`);
            }

            const googleData = await googleResponse.json();
            const googleSuggestions: CourtSuggestion[] = (googleData?.suggestions || [])
              .map((item: any) => {
                const prediction = item?.placePrediction;
                const mainText = prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || '';
                const secondaryText = prediction?.structuredFormat?.secondaryText?.text || '';
                const placeId = prediction?.placeId || '';
                return {
                  id: `google:${placeId}`,
                  name: mainText,
                  address: secondaryText,
                  lat: 0,
                  lon: 0,
                  type: ''
                };
              })
              .filter((item: CourtSuggestion) => item.name && item.id !== 'google:');

            suggestions = googleSuggestions.slice(0, 6);
            if (suggestions.length > 0) {
              setCourtSearchProvider('google');
            }
          } catch (googleErr) {
            console.warn('Google Places unavailable, fallback to OSM:', googleErr);
          }
        }

        try {
          if (suggestions.length > 0) {
            setCourtSuggestions(suggestions);
            return;
          }

          const photonResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(queryWithPadel)}&lang=en&limit=8`);
          if (!photonResponse.ok) {
            throw new Error(`Photon failed: ${photonResponse.status}`);
          }
          const photonData = await photonResponse.json();
          const photonItems = (photonData?.features || []).map((feature: any) => {
            const props = feature?.properties || {};
            const coordinates = feature?.geometry?.coordinates || [];
            const addressParts = [props.city, props.state, props.country].filter(Boolean);
            return {
              id: `${props.osm_type || ''}:${props.osm_id || ''}:${coordinates[1]}:${coordinates[0]}`,
              name: props.name || props.street || '',
              address: addressParts.join(', '),
              lat: coordinates[1],
              lon: coordinates[0],
              type: props.type || ''
            };
          });
          suggestions = mapToCourtSuggestions(photonItems, queryLower);
          if (suggestions.length > 0) {
            setCourtSearchProvider('osm');
          }
        } catch (photonErr) {
          console.warn('Photon unavailable, fallback to Nominatim:', photonErr);
        }

        if (suggestions.length === 0) {
          const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=id&countrycodes=id&q=${encodeURIComponent(queryWithPadel)}`);
          if (!nominatimResponse.ok) {
            throw new Error(`Nominatim failed: ${nominatimResponse.status}`);
          }
          const nominatimData = await nominatimResponse.json();
          const nominatimItems = (nominatimData || []).map((item: any) => ({
            id: `nominatim:${item.place_id || ''}:${item.lat}:${item.lon}`,
            name: item.name || (item.display_name ? String(item.display_name).split(',')[0] : ''),
            address: item.display_name || '',
            lat: item.lat,
            lon: item.lon,
            type: item.type || item.addresstype || ''
          }));
          suggestions = mapToCourtSuggestions(nominatimItems, queryLower);
          if (suggestions.length > 0) {
            setCourtSearchProvider('osm');
          }
        }

        setCourtSuggestions(suggestions);
      } catch (err) {
        console.error('Court autocomplete error:', err);
        setCourtSuggestions([]);
        setCourtSearchError('Court search is currently unavailable. Please try again shortly.');
        setCourtSearchProvider('none');
      } finally {
        setIsSearchingCourts(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [courtQuery]);

  const togglePlayer = (player: Player) => {
    if (!player?.id) return;
    setSelectedPlayers((prev) => {
      const alreadySelected = prev.some((p) => p?.id === player.id);
      const next = alreadySelected
        ? prev.filter((p) => p?.id !== player.id)
        : [...prev, player];
      return dedupePlayersById(next);
    });
  };

  const friendToPlayer = (friend: Friend): Player => ({
    id: friend.uid,
    name: friend.displayName,
    rating: resolveLiveMmr(friend.uid, friend.mmr || 0),
    source: 'fom',
    avatar: friend.photoURL || '',
    initials: friend.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
  });

  const handleAddPlayer = (newPlayer: Player) => {
    setAllPlayers(prev => dedupePlayersById([newPlayer, ...prev]));
    setSelectedPlayers(prev => dedupePlayersById([newPlayer, ...prev]));
    setIsAddModalOpen(false);
    onAddNotification('New Player!', `${newPlayer.name} has been added to the player list.`, 'system');
  };

  const handleRemovePlayer = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    const selfUid = auth.currentUser?.uid || currentUser?.uid;
    if (selfUid && playerId === selfUid) {
      onAddNotification('Primary Player', 'Your own account cannot be removed from the player list.', 'system');
      return;
    }
    setAllPlayers(prev => prev.filter(p => p.id !== playerId));
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleGenerate = () => {
    const updatedTournament: Tournament = {
      ...tournament,
      name: gameName.trim() || 'Padel Match',
      format,
      criteria,
      scoringType,
      courts,
      totalPoints: points,
      players: selectedPlayers,
      inactivePlayerIds: [],
      numRounds,
      venueName: venueName.trim(),
      location: location.trim(),
      rounds: [] // Will be generated in the next step
    };
    onGenerate(updatedTournament);
  };

  const openCustomModal = (type: 'courts' | 'rounds' | 'points') => {
    setCustomModalType(type);
    if (type === 'courts') setCustomModalValue(String(courts));
    if (type === 'rounds') setCustomModalValue(String(numRounds));
    if (type === 'points') setCustomModalValue(String(points));
  };

  useEffect(() => {
    if (!customModalType) return;
    const t = setTimeout(() => {
      customInputRef.current?.focus();
      customInputRef.current?.select();
    }, 50);
    return () => clearTimeout(t);
  }, [customModalType]);

  const applyCustomModalValue = () => {
    if (!customModalType) return;
    const parsed = Number.parseInt(customModalValue, 10);
    if (Number.isNaN(parsed)) return;

    if (customModalType === 'courts') {
      setCourts(Math.max(1, Math.min(12, parsed)));
    } else if (customModalType === 'rounds') {
      setNumRounds(Math.max(1, Math.min(30, parsed)));
    } else {
      setPoints(Math.max(1, Math.min(99, parsed)));
    }
    setCustomModalType(null);
  };

  const handleSelectCourtSuggestion = async (suggestion: CourtSuggestion) => {
    setSelectedCourtId(suggestion.id);
    setCourtQuery(suggestion.name);
    setLocation(suggestion.name);
    setShowCourtSuggestions(false);
    setCourtSuggestions([]);
  };

  const formatChips: { value: MatchFormat, label: string, icon: React.ElementType }[] = [
    { value: 'Match Play', label: 'Match Play', icon: Trophy },
    { value: 'Americano', label: 'Americano', icon: Users },
    { value: 'Mexicano', label: 'Mexicano', icon: RefreshCw }
  ];

  const circleChipClass = (active: boolean) => cn(
    "w-[58px] h-[58px] rounded-full border flex items-center justify-center text-center shrink-0 transition-all leading-tight",
    active
      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
      : "bg-white text-on-surface border-ios-gray/15"
  );
  const optionPillClass = (active: boolean) => cn(
    "flex h-12 w-full min-w-0 items-center justify-center rounded-full border px-4 text-center text-[13px] font-semibold tracking-tight whitespace-nowrap transition-all tap-target",
    active
      ? "border-primary/15 bg-primary/10 text-primary"
      : "border-black/5 bg-white text-on-surface/75"
  );

  const missingPlayersCount = Math.max(0, minPlayersNeeded - selectedPlayers.length);
  const selectedPlayersHelper = isReady
    ? `Ready for ${courts} court${courts > 1 ? 's' : ''} with ${selectedPlayers.length} players.`
    : `Add ${missingPlayersCount} more player${missingPlayersCount > 1 ? 's' : ''} for ${courts} court${courts > 1 ? 's' : ''}.`;
  const setupSummaryLabel = isReady
    ? `Ready for ${courts} court${courts > 1 ? 's' : ''} with ${selectedPlayers.length} players.`
    : `Add ${missingPlayersCount} more player${missingPlayersCount > 1 ? 's' : ''} to generate this match.`;
  const structureSummaryLabel = format === 'Match Play'
    ? `${courts}C • ${numRounds}R`
    : `${courts}C • ${numRounds}R • ${points}P`;
  const blockClass = "rounded-[28px] border border-black/5 bg-white px-4 py-4";
  const blockEyebrowClass = "text-[11px] font-semibold tracking-tight text-ios-gray/72";
  const blockTitleClass = "mt-1 text-[18px] leading-tight font-bold tracking-tight text-on-surface";
  const fieldShellClass = "rounded-2xl border border-black/5 bg-ios-gray/[0.045] px-4 py-3.5";

  return (
    <div className="bg-white min-h-screen pb-44">
      <nav
        className="ios-blur sticky top-0 z-50 w-full"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-center px-4 h-15 min-h-[60px] border-b border-black/5">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="tap-target p-2 -ml-2">
              <ChevronLeft size={24} className="text-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Set Up Match</h1>
              <p className="text-[12px] font-medium tracking-tight text-ios-gray">Match Info · Rules · Players</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <section className={blockClass}>
          <p className={blockEyebrowClass}>Match Info</p>
          <h2 className={blockTitleClass}>Name it and set the location.</h2>

          <div className="mt-4 space-y-3">
            <div className={fieldShellClass}>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Match Name</p>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Friday Padel Match"
                className="mt-1 w-full bg-transparent text-[15px] font-semibold text-on-surface outline-none"
              />
            </div>

            <div className={fieldShellClass}>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Venue</p>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Star Padel Karawaci"
                className="mt-1 w-full bg-transparent text-[15px] font-semibold text-on-surface outline-none"
              />
            </div>

            <div className="relative">
              <div className={fieldShellClass}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Area / City</p>
                    <input
                      type="text"
                      value={courtQuery}
                      onChange={(e) => {
                        setCourtQuery(e.target.value);
                        setSelectedCourtId(null);
                        setShowCourtSuggestions(true);
                      }}
                      onFocus={() => setShowCourtSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCourtSuggestions(false), 150);
                      }}
                    placeholder="Tangerang"
                    className="mt-1 w-full bg-transparent text-[15px] font-semibold text-on-surface outline-none"
                  />
                    {courtSearchProvider !== 'none' && (
                      <p className="mt-1 text-[10px] font-medium text-primary/80">
                        Source: {courtSearchProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {showCourtSuggestions && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-ios-gray/10 bg-white shadow-lg">
                  {!isSearchingCourts && !courtSearchError && courtQuery.trim().length < 3 && (
                    <div className="flex items-center gap-2 px-4 py-3 text-[12px] font-medium text-ios-gray">
                      <Search size={14} className="text-ios-gray/70" />
                      Start typing an area or city...
                    </div>
                  )}
                  {isSearchingCourts && (
                    <div className="flex items-center gap-2 px-4 py-3 text-[12px] font-medium text-ios-gray">
                      <RefreshCw size={14} className="animate-spin text-ios-gray/70" />
                      Searching areas...
                    </div>
                  )}
                  {courtSearchError && (
                    <div className="px-4 py-3 text-[12px] font-medium text-error">{courtSearchError}</div>
                  )}
                  {!isSearchingCourts && !courtSearchError && courtSuggestions.length === 0 && courtQuery.trim().length >= 3 && (
                    <div className="px-4 py-3 text-[12px] font-medium text-ios-gray">No matching places found.</div>
                  )}
                  {!isSearchingCourts && !courtSearchError && courtSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectCourtSuggestion(suggestion)}
                      className={cn(
                        "w-full border-b border-ios-gray/10 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface",
                        selectedCourtId === suggestion.id && "bg-primary/5"
                      )}
                    >
                      <p className="truncate text-[13px] font-semibold text-on-surface">{suggestion.name}</p>
                      {suggestion.address && (
                        <p className="truncate text-[11px] text-ios-gray">{suggestion.address}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={blockClass}>
          <p className={blockEyebrowClass}>Rules</p>
          <h2 className={blockTitleClass}>Set the format and scoring.</h2>

          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {formatChips.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFormat(value)}
                    className={cn(
                      "tap-target flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all",
                      format === value
                        ? "border-primary/15 bg-primary/[0.06]"
                        : "border-black/5 bg-white text-on-surface/78"
                    )}
                  >
                    <Icon size={22} className={format === value ? "text-primary" : "text-on-surface"} />
                    <span className={cn("text-[12px] font-semibold leading-tight", format === value && "text-primary")}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {format === 'Match Play' && (
              <div className="space-y-3 rounded-2xl border border-ios-gray/10 bg-ios-gray/5 p-4">
                <p className="text-[12px] font-semibold text-on-surface">Deuce Method</p>
                <div className="flex h-11 items-center rounded-xl border border-black/5 bg-white p-1">
                  {(['Golden Point', 'Advantage'] as ScoringType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setScoringType(t)}
                      className={cn(
                        "h-full flex-1 rounded-[10px] text-sm font-medium transition-all",
                        scoringType === t ? "bg-primary text-white font-bold" : "text-on-surface/60"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-ios-gray/10 bg-ios-gray/5 p-4">
              <p className="text-[12px] font-semibold text-on-surface">Ranking Criteria</p>
              <div className="flex h-11 items-center rounded-xl border border-black/5 bg-white p-1">
                {(['Matches Won', 'Points Won'] as RankingCriteria[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCriteria(c)}
                    className={cn(
                      "h-full flex-1 rounded-[10px] text-sm font-medium transition-all",
                      criteria === c ? "bg-primary text-white font-bold" : "text-on-surface/60"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-ios-gray/10 bg-ios-gray/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold tracking-tight text-on-surface">Match Structure</p>
                </div>
                <span className="rounded-full border border-black/5 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
                  {structureSummaryLabel}
                </span>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-[12px] font-semibold tracking-tight text-ios-gray">Courts</p>
                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCourts(n)}
                        className={optionPillClass(courts === n)}
                      >
                        {n} {n === 1 ? 'Court' : 'Courts'}
                      </button>
                    ))}
                    <button
                      onClick={() => openCustomModal('courts')}
                      className={optionPillClass(![1, 2, 3, 4, 5].includes(courts))}
                    >
                      Custom
                    </button>
                  </div>
                  {![1, 2, 3, 4, 5].includes(courts) && (
                    <p className="mt-2 text-[11px] font-medium tracking-tight text-ios-gray">Selected: {courts} courts</p>
                  )}
                </div>

                <div className="border-t border-black/5 pt-5">
                  <p className="text-[12px] font-semibold tracking-tight text-ios-gray">Rounds</p>
                  <div className="mt-3 grid grid-cols-6 gap-2.5">
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumRounds(n)}
                        className={cn(optionPillClass(numRounds === n), "px-0")}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => openCustomModal('rounds')}
                      className={cn(
                        optionPillClass(![3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(numRounds)),
                        "col-span-2"
                      )}
                    >
                      Custom
                    </button>
                  </div>
                  {![3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(numRounds) && (
                    <p className="mt-2 text-[11px] font-medium tracking-tight text-ios-gray">Selected: {numRounds} rounds</p>
                  )}
                </div>

                {format !== 'Match Play' && (
                  <div className="border-t border-black/5 pt-5">
                    <p className="text-[12px] font-semibold tracking-tight text-ios-gray">Total Points</p>
                    <div className="mt-3 grid grid-cols-3 gap-2.5">
                      {[4, 5, 16, 21].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPoints(p)}
                          className={optionPillClass(points === p)}
                        >
                          {p} pts
                        </button>
                      ))}
                      <button
                        onClick={() => openCustomModal('points')}
                        className={cn(
                          optionPillClass(![4, 5, 16, 21].includes(points)),
                          "col-span-2"
                        )}
                      >
                        Custom
                      </button>
                    </div>
                    {![4, 5, 16, 21].includes(points) && (
                      <p className="mt-2 text-[11px] font-medium tracking-tight text-ios-gray">Selected: {points} points</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {customModalType && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/35"
                onClick={() => setCustomModalType(null)}
              />
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
              >
                <h3 className="text-[18px] font-bold tracking-tight mb-3">
                  {customModalType === 'courts' ? 'Custom Court Count' : customModalType === 'rounds' ? 'Custom Round Count' : 'Custom Set Points'}
                </h3>
                <input
                  ref={customInputRef}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={customModalType === 'courts' ? 1 : 1}
                  max={customModalType === 'courts' ? 12 : customModalType === 'rounds' ? 30 : 99}
                  value={customModalValue}
                  onChange={(e) => setCustomModalValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 rounded-xl border border-ios-gray/20 px-4 text-[16px] font-semibold outline-none focus:border-primary"
                  placeholder={customModalType === 'courts' ? '1 - 12' : customModalType === 'rounds' ? '1 - 30' : '1 - 99'}
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setCustomModalType(null)}
                    className="flex-1 h-11 rounded-xl border border-ios-gray/15 text-on-surface font-semibold tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyCustomModalValue}
                    className="flex-1 h-11 rounded-xl bg-primary text-white font-bold tap-target"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <section ref={playersSectionRef} className={cn(blockClass, "pb-5")}>
          <p className={blockEyebrowClass}>Players</p>
          <h2 className={blockTitleClass}>Choose the players.</h2>

          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-on-surface">Selected Players</p>
                <p className="mt-2 text-[22px] font-bold tracking-tight text-on-surface">
                  {selectedPlayers.length} selected
                </p>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">
                  {selectedPlayersHelper}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-tight",
                  isReady ? "bg-primary/[0.08] text-primary" : "bg-error/[0.07] text-error"
                )}>
                  {isReady ? 'Ready' : `${missingPlayersCount} left`}
                </span>
              </div>
            </div>

            {selectedPlayers.length === 0 ? (
              <p className="mt-3 text-[12px] font-medium text-ios-gray">
                No players selected yet.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {sortedSelectedPlayers.map((player) => {
                  const isSelf = player.id === (auth.currentUser?.uid || currentUser?.uid);
                  return (
                    <div
                      key={player.id}
                      className="inline-flex min-h-9 min-w-0 items-center gap-2 rounded-full bg-ios-gray/[0.045] pl-2.5 pr-1.5 py-1.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
                        ) : (
                          player.initials
                        )}
                      </div>
                      <span className="max-w-[120px] truncate text-[12px] font-semibold text-on-surface">
                        {player.name}
                      </span>
                      {isSelf && (
                        <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-tight text-primary">
                          You
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePlayer(player)}
                        className="tap-target inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/5 bg-white text-ios-gray/60 transition-colors hover:text-on-surface"
                        aria-label={`Remove ${player.name} from selected players`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="px-1 text-[11px] font-semibold tracking-tight text-ios-gray">Add Players</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenFriends}
              className="tap-target w-full rounded-2xl border border-black/5 bg-white px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-full flex-col items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-gray/[0.08] text-on-surface">
                  <Users size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-tight text-on-surface">Choose Friends</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="tap-target w-full rounded-2xl border border-black/5 bg-white px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            >
              <div className="flex h-full flex-col items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-gray/[0.08] text-on-surface">
                  <Plus size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-tight text-on-surface">Add New Player</p>
                </div>
              </div>
            </button>
            </div>
          </div>

          {playerDataNotice && !dismissPlayerDataNotice && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 px-3.5 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100/90 shrink-0">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-amber-900">Player list was synced.</p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-amber-800">
                  {[
                    playerDataNotice.missingFromList > 0 ? `${playerDataNotice.missingFromList} players restored` : null,
                    playerDataNotice.duplicateInSelected > 0 ? `${playerDataNotice.duplicateInSelected} selected duplicates removed` : null,
                    playerDataNotice.duplicateInList > 0 ? `${playerDataNotice.duplicateInList} list duplicates removed` : null
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDismissPlayerDataNotice(true)}
                className="tap-target rounded-lg p-1.5 text-amber-700/80 hover:text-amber-900"
                aria-label="Close player data sync notice"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-on-surface">Available Players</p>
                <p className="mt-1 text-[11px] font-medium text-ios-gray">Add players who are not in the match yet.</p>
              </div>
              {availablePlayers.length > 0 && (
                <span className="shrink-0 rounded-full bg-ios-gray/[0.05] px-2.5 py-1 text-[11px] font-medium tracking-tight text-ios-gray">
                  {availablePlayers.length}
                </span>
              )}
            </div>

            {loadingFriends && availablePlayers.length === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-ios-gray/10 bg-ios-gray/5 p-4 text-sm text-ios-gray">
                <RefreshCw size={14} className="animate-spin" />
                <span className="font-medium">Loading players...</span>
              </div>
            ) : availablePlayers.length === 0 ? (
              <div className="rounded-2xl border border-ios-gray/10 bg-ios-gray/5 p-4">
                <p className="text-[14px] font-bold text-on-surface">No more players to add</p>
                <p className="mt-1 text-[12px] font-medium text-ios-gray">Add a new player or remove someone from the selected list.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
              {availablePlayers.map((player) => {
                const isSelf = player.id === (auth.currentUser?.uid || currentUser?.uid);
                return (
                  <div key={player.id} className="relative group">
                    <div
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all",
                        "border-ios-gray/10 bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full font-bold shrink-0",
                          "bg-ios-gray/10 text-ios-gray"
                        )}>
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            player.initials
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="block truncate text-[14px] font-semibold text-on-surface">{player.name}</span>
                          {isSelf && (
                            <span className="mt-1 inline-flex rounded-full border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-tight text-primary">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={(e) => handleRemovePlayer(e, player.id)}
                            className="tap-target inline-flex h-8 items-center rounded-full border border-black/5 bg-ios-gray/[0.04] px-3 text-[12px] font-semibold tracking-tight text-ios-gray/70 transition-colors hover:border-error/15 hover:bg-error/[0.05] hover:text-error"
                          >
                            <Trash2 size={14} className="mr-1.5" />
                            Remove
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => togglePlayer(player)}
                          className="tap-target inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-[12px] font-semibold tracking-tight text-white shadow-[0_8px_18px_rgba(255,85,1,0.14)] transition-transform active:scale-[0.98]"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </section>
      </main>

      <div
        className="fixed inset-x-0 z-40 border-t border-ios-gray/10 bg-white/95 backdrop-blur"
        style={{ bottom: 'calc(var(--app-safe-bottom, 0px))' }}
      >
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <div className="flex items-center gap-3 rounded-[24px] border border-black/5 bg-white px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className={cn(
                "truncate text-[13px] font-semibold leading-tight",
                isReady ? "text-on-surface" : "text-error"
              )}>
                {setupSummaryLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-ios-gray">
                {format === 'Match Play'
                  ? `${format} · ${numRounds} rounds`
                  : `${format} · ${numRounds} rounds · ${points} points`}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!isReady}
              className="h-12 shrink-0 rounded-2xl bg-primary px-5 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(255,85,1,0.16)] tap-target transition-all disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
            >
              Generate Match
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddPlayerModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MatchBackgroundPickerScreen = ({
  tournament,
  selectedBackgroundId,
  onSelectBackground,
  onBack,
  onSkip,
  onContinue
}: {
  tournament: Tournament,
  selectedBackgroundId: string | null,
  onSelectBackground: (backgroundId: string) => void,
  onBack: () => void,
  onSkip: () => void,
  onContinue: () => void
}) => {
  const backgroundOptions = useMemo(() => getMatchBackgroundPool(tournament.format), [tournament.format]);

  return (
    <div className="bg-white min-h-screen pb-36">
      <nav
        className="ios-blur sticky top-0 z-50 w-full"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="flex justify-between items-center w-full px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="tap-target p-2 -ml-2">
              <ChevronLeft size={24} className="text-primary" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Select Background</h1>
          </div>
          <button
            onClick={onSkip}
            className="font-bold tap-target px-2 text-primary transition-colors"
          >
            Skip
          </button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <section className="space-y-1">
          <p className="text-[15px] font-semibold text-on-surface">Choose from the app collection</p>
          <p className="text-[12px] text-ios-gray">This background will be shown in Active Match.</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {backgroundOptions.map((backgroundId, index) => {
            const isSelected = backgroundId === selectedBackgroundId;
            return (
              <button
                key={backgroundId}
                onClick={() => onSelectBackground(backgroundId)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border tap-target transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/15"
                    : "border-ios-gray/15"
                )}
              >
                <img
                  src={backgroundId}
                  alt={`Background ${index + 1}`}
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                {isSelected && (
                  <div className="absolute right-2 top-2 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30">
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </section>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-ios-gray/10">
        <div
          className="max-w-md mx-auto px-4 py-3 space-y-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <button
            onClick={onContinue}
            disabled={!selectedBackgroundId}
            className="w-full h-12 bg-primary text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 tap-target transition-all"
          >
            Continue to Match
          </button>
          <button
            onClick={onSkip}
            className="w-full h-11 rounded-2xl border border-ios-gray/15 text-ios-gray font-semibold text-[14px] tap-target"
          >
            Skip (Random)
          </button>
        </div>
      </div>
    </div>
  );
};

const MatchActiveScreen = ({
  onBack,
  onStartNewMatch,
  tournament,
  onUpdateScore,
  onNextRound,
  onUpdateRounds,
  onUpdateCourts,
  onUpdateActivePlayers,
  onAddManualPlayer,
  onDeleteRoundsFrom,
  needsRegenerateFromRound,
  onOpenStandings,
  onSwapPlayer,
  onUpdateMatchPlayScore,
  onShareMatch,
  isReadOnly,
  isSharedViewer,
  saveState
}: {
  onBack: () => void,
  onStartNewMatch: () => void,
  tournament: Tournament,
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void,
  onNextRound: () => void | Promise<void>,
  onUpdateRounds: (numRounds: number) => boolean,
  onUpdateCourts: (numCourts: number) => boolean,
  onUpdateActivePlayers: (activePlayerIds: string[]) => void,
  onAddManualPlayer: (player: Player) => void,
  onDeleteRoundsFrom: (roundId: number) => void,
  needsRegenerateFromRound: number | null,
  onOpenStandings: () => void,
  onSwapPlayer: (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => void,
  onUpdateMatchPlayScore: (matchId: string, team: 'A' | 'B') => void,
  onShareMatch: () => void,
  isReadOnly: boolean,
  isSharedViewer: boolean,
  saveState: 'saved' | 'saving' | 'error'
}) => {
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [swappingPlayer, setSwappingPlayer] = useState<{ matchId: string, team: 'A' | 'B', playerIndex: number, currentPlayer: Player } | null>(null);
  const [isRoundEditorOpen, setIsRoundEditorOpen] = useState(false);
  const [isCourtEditorOpen, setIsCourtEditorOpen] = useState(false);
  const [roundEditValue, setRoundEditValue] = useState('');
  const [courtEditValue, setCourtEditValue] = useState('');
  const [roundEditError, setRoundEditError] = useState('');
  const [courtEditError, setCourtEditError] = useState('');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isActivePlayersEditorOpen, setIsActivePlayersEditorOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isRoundResetSelectorOpen, setIsRoundResetSelectorOpen] = useState(false);
  const [draftActivePlayerIds, setDraftActivePlayerIds] = useState<Set<string>>(new Set());
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [nowMs, setNowMs] = useState(Date.now());
  const [modalBottomOffset, setModalBottomOffset] = useState(24);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateModalOffset = () => {
      const baseNavOffset = 24; // keep modal above sticky CTA / safe area
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(baseNavOffset);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(baseNavOffset, keyboardHeight + 20));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, []);

  const getMatchDuration = (match: Match) => {
    if (match.status === 'active' && match.startedAt) {
      return formatDurationFromMs(nowMs - match.startedAt);
    }
    return match.duration || '00:00';
  };

  // Get the actual match data from the tournament state
  const scoringMatch = useMemo(() => {
    if (!scoringMatchId) return null;
    for (const round of tournament.rounds) {
      const match = round.matches.find(m => m.id === scoringMatchId);
      if (match) return match;
    }
    return null;
  }, [scoringMatchId, tournament.rounds]);

  // Calculate match counts for all players in the tournament
  const playerMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tournament.players.forEach(p => counts[p.id] = 0);
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        [...match.teamA.players, ...match.teamB.players].forEach(p => {
          if (counts[p.id] !== undefined) counts[p.id]++;
        });
      });
    });
    return counts;
  }, [tournament]);

  const currentRoundIndex = tournament.rounds.findIndex(r => r.matches.some(m => m.status === 'active'));
  const hasActiveTournament = currentRoundIndex !== -1;
  const hasTournamentData = tournament.rounds.length > 0;
  const shouldShowActiveMatchScreen = hasTournamentData;
  const inactivePlayerIds = useMemo(
    () => sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds),
    [tournament.players, tournament.inactivePlayerIds]
  );
  const inactivePlayerIdSet = useMemo(() => new Set(inactivePlayerIds), [inactivePlayerIds]);
  const currentActivePlayerIds = useMemo(
    () => tournament.players
      .map((player) => player.id)
      .filter((playerId) => !inactivePlayerIdSet.has(playerId)),
    [tournament.players, inactivePlayerIdSet]
  );
  const activePlayerCount = useMemo(
    () => tournament.players.filter((player) => !inactivePlayerIdSet.has(player.id)).length,
    [tournament.players, inactivePlayerIdSet]
  );
  const activeRound = currentRoundIndex !== -1 ? (tournament.rounds[currentRoundIndex] ?? null) : null;
  const activeRoundId = activeRound?.id ?? null;
  const isLastRound = currentRoundIndex !== -1 && currentRoundIndex >= (tournament.numRounds - 1);
  const activeRoundMatchCount = activeRound?.matches.length || 0;
  const activeRoundEnteredScoreCount = useMemo(() => {
    if (!activeRound) return 0;
    if (tournament.format === 'Match Play') {
      return activeRound.matches.filter((match) => {
        const hasPointsProgress = (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
        const hasGamesProgress = (match.teamA.score || 0) > 0 || (match.teamB.score || 0) > 0;
        return match.status === 'completed' || hasPointsProgress || hasGamesProgress;
      }).length;
    }
    return activeRound.matches.filter((match) => {
      const scoreA = match.teamA.score || 0;
      const scoreB = match.teamB.score || 0;
      return match.status === 'completed' || scoreA > 0 || scoreB > 0;
    }).length;
  }, [activeRound, tournament.format, tournament.totalPoints]);
  const activeRoundReadyScoreCount = useMemo(() => {
    if (!activeRound) return 0;
    if (tournament.format === 'Match Play') {
      return activeRound.matches.filter((match) => match.status === 'completed').length;
    }
    const hasPointTarget = (tournament.totalPoints || 0) > 0;
    return activeRound.matches.filter((match) => {
      const scoreA = match.teamA.score || 0;
      const scoreB = match.teamB.score || 0;
      if (match.status === 'completed') return true;
      if (hasPointTarget) {
        return (scoreA + scoreB === tournament.totalPoints) && (scoreA > 0 || scoreB > 0);
      }
      return scoreA > 0 || scoreB > 0;
    }).length;
  }, [activeRound, tournament.format, tournament.totalPoints]);
  const isActiveRoundScoreFullyFilled = (
    activeRoundMatchCount > 0 &&
    activeRoundReadyScoreCount === activeRoundMatchCount
  );
  const nextRoundCtaLabel = isLastRound ? 'Finish Matches' : 'Next Round';
  const totalElapsed = formatDurationFromMs(
    getTournamentElapsedMs(
      tournament.rounds,
      nowMs,
      (tournament as TournamentHistory).endedAt
    )
  );
  const activeHeroPhoto = useMemo(() => {
    return resolveMatchBackground(tournament.format, tournament.backgroundId);
  }, [tournament.backgroundId, tournament.format]);
  const fomPlayUrl = useMemo(() => {
    const configuredBase = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
    const runtimeBase = `${window.location.protocol}//${window.location.host}`;
    return (configuredBase || runtimeBase).replace(/\/+$/, '');
  }, []);
  const pageBgTheme =
    tournament.format === 'Americano'
      ? {
        base: 'bg-[linear-gradient(175deg,#e9faf6_0%,#d8f3eb_42%,#f5fffb_100%)]',
        photoBlend: 'bg-[linear-gradient(180deg,rgba(10,28,24,0.22)_0%,rgba(11,46,37,0.12)_16%,rgba(28,96,80,0.06)_32%,rgba(233,250,246,0.04)_44%,rgba(233,250,246,0.18)_58%,rgba(233,250,246,0.42)_72%,rgba(233,250,246,0.62)_86%,rgba(245,255,251,1)_100%)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          base: 'bg-[linear-gradient(175deg,#fff3e7_0%,#ffe8d8_40%,#fff5ec_100%)]',
          photoBlend: 'bg-[linear-gradient(180deg,rgba(33,19,12,0.22)_0%,rgba(78,35,14,0.12)_16%,rgba(156,74,28,0.06)_32%,rgba(255,243,231,0.04)_44%,rgba(255,243,231,0.18)_58%,rgba(255,243,231,0.42)_72%,rgba(255,243,231,0.62)_86%,rgba(255,245,236,1)_100%)]'
        }
        : {
          base: 'bg-[linear-gradient(175deg,#edf3ff_0%,#dce9ff_42%,#f6f9ff_100%)]',
          photoBlend: 'bg-[linear-gradient(180deg,rgba(8,24,45,0.24)_0%,rgba(14,44,82,0.14)_16%,rgba(37,92,171,0.06)_32%,rgba(237,243,255,0.04)_44%,rgba(237,243,255,0.18)_58%,rgba(237,243,255,0.42)_72%,rgba(237,243,255,0.62)_86%,rgba(246,249,255,1)_100%)]'
        };
  const gameDateLabel = tournament.startedAt
    ? new Date(tournament.startedAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    : '';
  const venueLabel = (tournament.venueName || '').trim();
  const cityLabel = (tournament.location || '').trim();
  const placeLabel = [venueLabel, cityLabel].filter(Boolean).join(' | ');
  const locationDateLabel = placeLabel ? `${placeLabel} | ${gameDateLabel}` : gameDateLabel;
  const completedRounds = tournament.rounds.filter((round) => round.matches.every((match) => match.status === 'completed')).length;
  const totalRounds = Math.max(tournament.numRounds || 0, tournament.rounds.length);
  const isTournamentEnded = totalRounds > 0 && completedRounds >= totalRounds;
  const shouldShowNextRoundCta = !isReadOnly && !isTournamentEnded;
  const stickyCtaBottomOffsetPx = 10;
  const stickyCtaHeightPx = 84;
  const stickyCtaGapPx = 14;
  const stickyCtaBottomStyle = `calc(var(--app-safe-bottom, 0px) + ${stickyCtaBottomOffsetPx}px)`;
  const stickyCtaPaddingBottomStyle = shouldShowNextRoundCta
    ? `calc(var(--app-safe-bottom, 0px) + ${stickyCtaBottomOffsetPx + stickyCtaHeightPx + stickyCtaGapPx}px)`
    : '24px';
  const roundIdsForReset = useMemo(
    () => tournament.rounds.map((round) => round.id).filter((roundId) => roundId > 1).sort((a, b) => b - a),
    [tournament.rounds]
  );
  const hasDraftActivePlayersChanges = useMemo(() => {
    const nextActiveIds = tournament.players
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));
    return (
      nextActiveIds.length !== currentActivePlayerIds.length ||
      nextActiveIds.some((playerId, idx) => playerId !== currentActivePlayerIds[idx])
    );
  }, [tournament.players, draftActivePlayerIds, currentActivePlayerIds]);
  const infoTheme =
    tournament.format === 'Americano'
      ? {
        bg: 'bg-[linear-gradient(165deg,rgba(18,128,106,0.44),rgba(24,164,134,0.34)_45%,rgba(79,195,161,0.28))]',
        shadow: 'shadow-[0_14px_30px_rgba(18,128,106,0.32)]',
        ring: 'bg-[#0F2A2A]/18'
      }
      : tournament.format === 'Mexicano'
        ? {
          bg: 'bg-[linear-gradient(165deg,rgba(230,94,20,0.44),rgba(242,106,42,0.34)_45%,rgba(255,138,76,0.28))]',
          shadow: 'shadow-[0_14px_30px_rgba(230,94,20,0.35)]',
          ring: 'bg-[#1F2937]/18'
        }
        : {
          bg: 'bg-[linear-gradient(165deg,rgba(34,72,181,0.44),rgba(47,111,228,0.34)_45%,rgba(86,163,247,0.28))]',
          shadow: 'shadow-[0_14px_30px_rgba(34,72,181,0.32)]',
          ring: 'bg-[#0F1E3A]/18'
        };
  const accentTheme =
    tournament.format === 'Americano'
      ? {
        text: 'text-[#12806A]',
        textSoft: 'text-[#12806A]/65',
        bgSoft: 'bg-[#18A486]/12',
        bgSoftHover: 'hover:bg-[#18A486]/10',
        borderSoft: 'border-[#18A486]/25',
        solid: 'bg-[#18A486]',
        solidShadow: 'shadow-[0_10px_22px_rgba(24,164,134,0.26)]',
        headingStrong: 'text-[#0E6A57]',
        headingSoft: 'text-[#107763]/80',
        headingIdle: 'text-[#4B5563]',
        headingSurface: 'bg-white/58',
        headingSurfaceBorder: 'border-white/60'
      }
      : tournament.format === 'Mexicano'
        ? {
          text: 'text-primary',
          textSoft: 'text-primary/65',
          bgSoft: 'bg-primary/12',
          bgSoftHover: 'hover:bg-primary/10',
          borderSoft: 'border-primary/25',
          solid: 'bg-primary',
          solidShadow: 'shadow-[0_10px_22px_rgba(230,94,20,0.24)]',
          headingStrong: 'text-[#A14513]',
          headingSoft: 'text-[#B24B14]/80',
          headingIdle: 'text-[#4B5563]',
          headingSurface: 'bg-white/58',
          headingSurfaceBorder: 'border-white/60'
        }
        : {
          text: 'text-[#2F6FE4]',
          textSoft: 'text-[#2F6FE4]/65',
          bgSoft: 'bg-[#2F6FE4]/12',
          bgSoftHover: 'hover:bg-[#2F6FE4]/10',
          borderSoft: 'border-[#2F6FE4]/25',
          solid: 'bg-[#2F6FE4]',
          solidShadow: 'shadow-[0_10px_22px_rgba(47,111,228,0.26)]',
          headingStrong: 'text-[#214FA7]',
          headingSoft: 'text-[#2A62CD]/80',
          headingIdle: 'text-[#4B5563]',
          headingSurface: 'bg-white/58',
          headingSurfaceBorder: 'border-white/60'
        };
  // Initialize collapsed rounds: collapse all except the active one
  useEffect(() => {
    if (!hasActiveTournament || activeRoundId === null) return;
    const collapsed = new Set<number>();
    tournament.rounds.forEach(r => {
      if (r.id !== activeRoundId) {
        collapsed.add(r.id);
      }
    });
    setCollapsedRounds(collapsed);
  }, [activeRoundId, hasActiveTournament, tournament.rounds]);

  const toggleRound = (roundId: number) => {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const handleMatchPlayScoreUpdate = (team: 'A' | 'B') => {
    if (!scoringMatchId) return;
    onUpdateMatchPlayScore(scoringMatchId, team);
  };

  const setScorePair = (scoreA: number, scoreB: number) => {
    if (!scoringMatch) return;
    onUpdateScore(scoringMatch.id, 'A', Math.max(0, scoreA));
    onUpdateScore(scoringMatch.id, 'B', Math.max(0, scoreB));
    setScoringMatchId(prev => prev ?? null);
  };

  const handleScoreUpdate = (team: 'A' | 'B', delta: number) => {
    if (!scoringMatch) return;
    const currentScore = team === 'A' ? scoringMatch.teamA.score : scoringMatch.teamB.score;
    const newScore = Math.max(0, Math.min(tournament.totalPoints, currentScore + delta));
    const otherTeamScore = Math.max(0, tournament.totalPoints - newScore);
    if (team === 'A') {
      setScorePair(newScore, otherTeamScore);
      return;
    }
    setScorePair(otherTeamScore, newScore);
  };

  const setExactScore = (team: 'A' | 'B', score: number) => {
    if (!scoringMatch) return;
    const safeScore = Math.max(0, Math.min(tournament.totalPoints, score));
    const otherTeamScore = Math.max(0, tournament.totalPoints - safeScore);
    if (team === 'A') {
      setScorePair(safeScore, otherTeamScore);
      return;
    }
    setScorePair(otherTeamScore, safeScore);
  };

  const handleOpenRoundEditor = () => {
    setIsActionMenuOpen(false);
    setRoundEditValue(String(tournament.numRounds || 1));
    setRoundEditError('');
    setIsRoundEditorOpen(true);
  };

  const handleOpenCourtEditor = () => {
    setIsActionMenuOpen(false);
    setCourtEditValue(String(tournament.courts || 1));
    setCourtEditError('');
    setIsCourtEditorOpen(true);
  };

  const handleSubmitRoundEdit = () => {
    const parsed = Number.parseInt(roundEditValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setRoundEditError('Enter at least 1 round.');
      return;
    }
    const ok = onUpdateRounds(parsed);
    if (!ok) {
      setRoundEditError('Round count is invalid for the current match setup.');
      return;
    }
    setIsRoundEditorOpen(false);
  };

  const handleSubmitCourtEdit = () => {
    const parsed = Number.parseInt(courtEditValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCourtEditError('Enter at least 1 court.');
      return;
    }
    const ok = onUpdateCourts(parsed);
    if (!ok) {
      setCourtEditError('Court count is invalid for the current match setup.');
      return;
    }
    setIsCourtEditorOpen(false);
  };

  const handleOpenActivePlayersEditor = () => {
    setIsActionMenuOpen(false);
    setDraftActivePlayerIds(new Set(currentActivePlayerIds));
    setIsActivePlayersEditorOpen(true);
  };

  const handleOpenRoundResetSelector = () => {
    setIsActionMenuOpen(false);
    if (roundIdsForReset.length === 0) {
      window.alert('No rounds available to regenerate.');
      return;
    }
    setIsRoundResetSelectorOpen(true);
  };

  const handleDeleteRoundsFromSelector = (roundId: number) => {
    const shouldDelete = window.confirm(`Delete round ${roundId} and all subsequent rounds?`);
    if (!shouldDelete) return;
    onDeleteRoundsFrom(roundId);
    setIsRoundResetSelectorOpen(false);
  };

  const toggleDraftActivePlayer = (playerId: string) => {
    setDraftActivePlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleSaveActivePlayers = () => {
    const nextActiveIds = tournament.players
      .map((player) => player.id)
      .filter((playerId) => draftActivePlayerIds.has(playerId));

    if (!hasDraftActivePlayersChanges) {
      setIsActivePlayersEditorOpen(false);
      return;
    }

    const shouldSave = window.confirm('Changes will apply starting from the next round. Save?');
    if (!shouldSave) return;

    onUpdateActivePlayers(nextActiveIds);
    setIsActivePlayersEditorOpen(false);
  };

  const handleAddPlayerFromActive = (newPlayer: Player) => {
    onAddManualPlayer(newPlayer);
    setDraftActivePlayerIds((prev) => {
      const next = new Set(prev);
      next.add(newPlayer.id);
      return next;
    });
    setIsAddPlayerModalOpen(false);
  };
  const handleProceedToNextRound = () => {
    onNextRound();
  };

  const getRoundDuration = (round: Round) => {
    const activeStarted = round.matches
      .filter((m) => m.status === 'active' && typeof m.startedAt === 'number')
      .map((m) => m.startedAt as number);
    if (activeStarted.length > 0) {
      const earliestStartedAt = Math.min(...activeStarted);
      return formatDurationFromMs(nowMs - earliestStartedAt);
    }
    const firstCompletedWithDuration = round.matches.find((m) => !!m.duration);
    return firstCompletedWithDuration?.duration || '00:00';
  };

  if (!shouldShowActiveMatchScreen) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-24">
        <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="tap-target p-2 -ml-2">
              <ChevronLeft size={24} className="text-on-surface" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Match</h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Trophy size={48} className="text-primary/40" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">No Active Match</h2>
          <p className="text-ios-gray text-sm mb-8 leading-relaxed">
            There are no active matches right now. Start a new match to track scores and standings.
          </p>

          <div className="w-full bg-primary/5 rounded-2xl p-4 mb-10 border border-primary/10 flex items-start gap-3 text-left">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-primary uppercase tracking-wide mb-1">Quick Tip</h4>
              <p className="text-[12px] text-ios-gray leading-snug font-medium">
                Invite at least 4 players to start Americano matches. You can set the number of courts based on availability.
              </p>
            </div>
          </div>

          <button
            onClick={onStartNewMatch}
            className="w-full h-[56px] bg-primary text-white rounded-[16px] font-bold text-[17px] shadow-lg shadow-primary/20 tap-target flex items-center justify-center gap-2"
          >
            <PlusCircle size={20} />
            <span>Start New Match</span>
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-40 overflow-hidden bg-transparent z-0">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn('absolute inset-0', pageBgTheme.base)} />
        <div className="absolute inset-x-0 top-0 h-screen min-h-screen max-h-none overflow-hidden">
          {activeHeroPhoto && (
            <img
              src={activeHeroPhoto}
              alt="Active background"
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12]"
            />
          )}
          <div className={cn('absolute inset-0', pageBgTheme.photoBlend)} />
        </div>
      </div>

      <header
        className="relative z-20 bg-transparent border-b border-transparent"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto h-11 px-5 relative flex items-center justify-between">
          <div className="shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full", accentTheme.solid, accentTheme.solidShadow)}>
              {!isTournamentEnded && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/55 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
              )}
              <span className={cn(!isTournamentEnded && "animate-pulse")}>
                {isTournamentEnded ? 'Ended' : 'Live'}
              </span>
            </span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
            <img
              src="/fom-long-logotype-white.png"
              alt="Friends of Motion"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <InstallAppButton
              compact
              variant="minimum"
              className="text-white"
            />
            {isSharedViewer ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">View Only</span>
            ) : (
              <button
                onClick={onShareMatch}
                className="tap-target h-8 px-0 inline-flex items-center gap-1.5 border-0 bg-transparent text-white"
                aria-label="Share match"
              >
                <Share2 size={16} />
                <span className="text-[12px] font-semibold">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        className="relative z-10 px-5 space-y-6 max-w-lg mx-auto"
        style={{
          paddingTop: '16px',
          paddingBottom: stickyCtaPaddingBottomStyle
        }}
      >
        {isSharedViewer && (
          <p className="-mt-1 -mb-3 px-1 text-[10px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            Viewer mode is active. This page is read-only.
          </p>
        )}

        <section className={cn(
          "relative overflow-hidden rounded-2xl p-4 border border-white/40 bg-white/8 backdrop-blur-md",
          infoTheme.shadow
        )}>
          <div className="relative flex items-baseline justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-white truncate">{tournament.name || '-'}</h2>
              <p className="mt-1 text-[11px] text-white/85 truncate">{locationDateLabel}</p>
            </div>
            <span className="shrink-0 text-[16px] leading-none font-display font-bold tabular-nums text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]">
              {totalElapsed}
            </span>
          </div>

          <div className="relative grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Mode</p>
              <p className="text-[12px] font-semibold text-white truncate">{tournament.format}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Player</p>
              <p className="text-[12px] font-semibold text-white">{activePlayerCount}/{tournament.players.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Court</p>
              <p className="text-[12px] font-semibold text-white">{tournament.courts}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Round</p>
              <p className="text-[12px] font-semibold text-white">{completedRounds}/{totalRounds || 0}</p>
            </div>
          </div>

          <div className="relative mt-3.5 pt-2.5 min-h-[30px] flex items-center justify-between gap-2">
            <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
            <p className="relative z-10 text-[11px] text-white/88 whitespace-nowrap">
              Hosted with{' '}
              <button
                type="button"
                onClick={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
                className="inline p-0 bg-transparent border-0 font-bold text-white underline-offset-2 hover:underline cursor-pointer"
              >
                FOM Play
              </button>
            </p>
            {!isReadOnly && (
              <div className="relative z-10 shrink-0 h-8 inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setIsActionMenuOpen(true)}
                  className="h-8 w-8 rounded-full bg-white/12 border border-white/35 text-white inline-flex items-center justify-center tap-target"
                  aria-label="Match settings"
                >
                  <Settings size={15} />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="-mt-1">
          <button
            onClick={onOpenStandings}
            className={cn(
              "tap-target w-full h-12 rounded-2xl px-4 flex items-center justify-between border border-white/40 bg-white/8 backdrop-blur-md text-white",
              infoTheme.shadow
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/35 bg-white/20">
                <Trophy size={15} />
              </span>
              <span className="text-[13px] font-bold truncate">
                {isTournamentEnded ? 'View Final Standings' : 'View Live Standings'}
              </span>
            </div>
            <ChevronRight size={16} className="opacity-80 shrink-0" />
          </button>
        </section>

        {!isReadOnly && needsRegenerateFromRound !== null && (
          <section className="-mt-2">
            <div className="w-full rounded-2xl px-4 py-3 border border-amber-200 bg-amber-50/95 backdrop-blur-md flex items-center gap-3">
              <div className="min-w-0 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[12px] leading-snug text-amber-900 font-medium">
                  Older round scores changed. Open the action menu and regenerate from round {needsRegenerateFromRound}+.
                </p>
              </div>
            </div>
          </section>
        )}

        {tournament.rounds.map((round) => {
          const isActive = activeRoundId !== null && round.id === activeRoundId;
          const isCollapsed = collapsedRounds.has(round.id);
          const roundDuration = getRoundDuration(round);

          return (
            <div key={round.id} className="mb-4">
              <section className="bg-white/78 backdrop-blur-sm p-4 rounded-[20px] shadow-sm border border-white/45">
                <div className="flex items-center gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() => toggleRound(round.id)}
                    className="flex-1 flex items-center justify-between gap-3 tap-target text-left"
                    aria-label={isCollapsed ? `Buka round ${round.id}` : `Tutup round ${round.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn("text-[14px] leading-none font-black uppercase tracking-[0.08em]", accentTheme.headingStrong)}>
                        Round {round.id}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-ios-gray/40" />
                      <span className="text-[11px] leading-none font-semibold uppercase tracking-[0.06em] tabular-nums text-ios-gray/60">
                        {roundDuration}
                      </span>
                    </div>
                    <span className="p-1 text-ios-gray/65">
                      <ChevronRight size={22} className={cn("transition-transform", !isCollapsed && "rotate-90")} />
                    </span>
                  </button>
                </div>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="h-px bg-ios-gray/10 mb-2.5" />
                      <div className="space-y-3.5">
                        {round.matches.map((match, i) => (
                          <div key={match.id}>
                            {(() => {
                              const canEditCompletedScore =
                                !isReadOnly &&
                                match.status === 'completed' &&
                                tournament.format !== 'Match Play';
                              const canEditScore = !isReadOnly && (isActive || canEditCompletedScore);
                              return (
                                <>
                                  <div className="flex justify-start mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ios-gray/65 leading-none">
                                      Court {match.court}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    <div className="flex flex-col items-center gap-1 min-w-0">
                                      <div className="flex -space-x-3">
                                        {match.teamA.players.map((p, idx) => (
                                          <div
                                            key={idx}
                                            onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'A', playerIndex: idx, currentPlayer: p })}
                                            className={cn(
                                              "w-9 h-9 rounded-full border-2 border-white/95 bg-ios-gray/15 flex items-center justify-center text-[10px] font-bold",
                                              isActive && "cursor-pointer tap-target"
                                            )}
                                          >
                                            {p.initials}
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'A', playerIndex: 0, currentPlayer: match.teamA.players[0] })}
                                        className={cn(
                                          "bg-transparent border-0 p-0 text-[12px] font-semibold text-on-surface/62 text-center truncate w-full leading-none tracking-[0.005em]",
                                          isActive && !isReadOnly ? "cursor-pointer tap-target" : "cursor-default"
                                        )}
                                        disabled={!isActive || isReadOnly || !match.teamA.players[0]}
                                      >
                                        {match.teamA.players.map(p => p.name.split(' ')[0]).join(' & ')}
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => canEditScore && setScoringMatchId(match.id)}
                                      disabled={!canEditScore}
                                      className={cn(
                                        "flex flex-col items-center min-w-[86px] rounded-xl px-2 py-1 transition-colors",
                                        canEditScore
                                          ? cn("cursor-pointer tap-target", accentTheme.bgSoftHover)
                                          : "cursor-default"
                                      )}
                                    >
                                      <div className="text-[31px] leading-none font-display font-black tracking-tight tabular-nums">
                                        <span className={accentTheme.text}>{match.teamA.score}</span>
                                        <span className="text-ios-gray/30 mx-1">-</span>
                                        <span className="text-on-surface">{match.teamB.score}</span>
                                      </div>
                                      <span className="text-[9px] font-bold text-ios-gray/80 tracking-[0.11em]">
                                        SKOR
                                        {tournament.format === 'Match Play' && (
                                          <span className="ml-1 normal-case tracking-normal text-[10px]">
                                            ({match.pointsA || '0'}-{match.pointsB || '0'})
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                    <div className="flex flex-col items-center gap-1 min-w-0">
                                      <div className="flex -space-x-3">
                                        {match.teamB.players.map((p, idx) => (
                                          <div
                                            key={idx}
                                            onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'B', playerIndex: idx, currentPlayer: p })}
                                            className={cn(
                                              "w-9 h-9 rounded-full border-2 border-white/95 bg-ios-gray/15 flex items-center justify-center text-[10px] font-bold",
                                              isActive && "cursor-pointer tap-target"
                                            )}
                                          >
                                            {p.initials}
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'B', playerIndex: 0, currentPlayer: match.teamB.players[0] })}
                                        className={cn(
                                          "bg-transparent border-0 p-0 text-[12px] font-semibold text-on-surface/62 text-center truncate w-full leading-none tracking-[0.005em]",
                                          isActive && !isReadOnly ? "cursor-pointer tap-target" : "cursor-default"
                                        )}
                                        disabled={!isActive || isReadOnly || !match.teamB.players[0]}
                                      >
                                        {match.teamB.players.map(p => p.name.split(' ')[0]).join(' & ')}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}

                            {i < round.matches.length - 1 && <div className="my-3.5 h-px bg-ios-gray/10" />}
                          </div>
                        ))}
                      </div>

                      {round.playersBye.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-ios-gray/10">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-[9px] font-bold text-ios-gray/65 uppercase tracking-[0.18em]">Player Bye</h3>
                            <span className="text-[10px] font-medium text-ios-gray/45">{round.playersBye.length} Player</span>
                          </div>
                          <p className="text-[12px] leading-relaxed text-ios-gray/72 font-medium">
                            {round.playersBye.map(p => p.name).join(', ')}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          );
        })}

      </main>

      {shouldShowNextRoundCta && (
        <div
          className="fixed inset-x-0 z-[92] px-5 pointer-events-none"
          style={{ bottom: stickyCtaBottomStyle }}
        >
          <div className="max-w-lg mx-auto pointer-events-auto">
            <div className="relative overflow-hidden rounded-2xl border border-white/45 bg-white/16 backdrop-blur-md shadow-[0_12px_28px_rgba(15,23,42,0.20)] px-2.5 py-2.5">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] pointer-events-none" />
              <div className="relative flex items-center justify-between gap-2 px-1 pb-2">
                <div className="min-w-0 text-[11px] font-bold tracking-tight text-ios-gray truncate">
                  {activeRoundId
                    ? `Round ${activeRoundId} • ${activeRoundEnteredScoreCount}/${activeRoundMatchCount} match`
                    : 'Matches are ready to continue'}
                </div>
                {tournament.format !== 'Match Play' && isActiveRoundScoreFullyFilled && (
                  <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold shrink-0 border", accentTheme.bgSoft, accentTheme.text, accentTheme.borderSoft)}>
                    Ready
                  </span>
                )}
              </div>
              <button
                onClick={handleProceedToNextRound}
                className={cn(
                  "relative w-full h-11 px-4 rounded-xl text-white font-bold text-[14px] tracking-tight whitespace-nowrap tap-target inline-flex items-center justify-center gap-2 border border-white/18",
                  accentTheme.solid,
                  accentTheme.solidShadow,
                  "after:absolute after:inset-0 after:rounded-xl after:bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_55%)] after:pointer-events-none"
                )}
              >
                <span>{nextRoundCtaLabel}</span>
                <Zap size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isActionMenuOpen && !isReadOnly && (
          <div
            className="fixed inset-0 z-[140] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActionMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Edit Match</h3>
                <button
                  onClick={() => setIsActionMenuOpen(false)}
                  className="p-2 bg-ios-gray/10 rounded-full tap-target"
                  aria-label="Close action menu"
                >
                  <X size={18} className="text-on-surface" />
                </button>
              </div>

              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={handleOpenRoundEditor}
                  className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
                >
                  <Edit3 size={16} className="text-primary" />
                  Edit round
                </button>
                <button
                  type="button"
                  onClick={handleOpenCourtEditor}
                  className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
                >
                  <Building2 size={16} className="text-primary" />
                  Edit courts
                </button>
                <button
                  type="button"
                  onClick={handleOpenActivePlayersEditor}
                  className="w-full h-12 px-4 rounded-xl border border-ios-gray/15 text-on-surface text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target"
                >
                  <Users size={16} className="text-primary" />
                  Active Players
                </button>
                <button
                  type="button"
                  onClick={handleOpenRoundResetSelector}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl border text-[14px] font-semibold text-left inline-flex items-center gap-3 tap-target",
                    roundIdsForReset.length > 0
                      ? "border-red-200 text-red-600 bg-red-50/60"
                      : "border-ios-gray/15 text-ios-gray bg-ios-gray/5"
                  )}
                  disabled={roundIdsForReset.length === 0}
                >
                  <RefreshCw size={16} />
                  Delete / Regenerate Rounds
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRoundResetSelectorOpen && !isReadOnly && (
          <div
            className="fixed inset-0 z-[135] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoundResetSelectorOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
            >
              <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Regenerate Round</h3>
                  <p className="text-[12px] text-ios-gray font-medium">Select a round to delete along with all subsequent rounds.</p>
                </div>
                <button
                  onClick={() => setIsRoundResetSelectorOpen(false)}
                  className="p-2 bg-ios-gray/10 rounded-full tap-target"
                  aria-label="Close round reset dialog"
                >
                  <X size={18} className="text-on-surface" />
                </button>
              </div>

              <div className="p-5 pt-4 space-y-2 overflow-y-auto">
                {needsRegenerateFromRound !== null && roundIdsForReset.includes(needsRegenerateFromRound) && (
                  <div className="mb-1 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800">
                    Recommended: start from round {needsRegenerateFromRound}+.
                  </div>
                )}
                {roundIdsForReset.map((roundId) => (
                  <button
                    key={roundId}
                    type="button"
                    onClick={() => handleDeleteRoundsFromSelector(roundId)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left tap-target",
                      needsRegenerateFromRound === roundId
                        ? "border-amber-300 bg-amber-50"
                        : "border-ios-gray/15 bg-white hover:bg-ios-gray/5"
                    )}
                  >
                    <p className="text-[14px] font-semibold text-on-surface">Start from round {roundId}</p>
                    <p className="text-[11px] text-ios-gray">Round {roundId} through the last round will be deleted.</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isActivePlayersEditorOpen && (
          <div
            className="fixed inset-0 z-[130] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActivePlayersEditorOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
            >
              <div className="px-5 pt-5 pb-4 border-b border-ios-gray/10 bg-white">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Active Players</h3>
                    <button
                      onClick={() => setIsActivePlayersEditorOpen(false)}
                      className="p-2 bg-ios-gray/10 rounded-full tap-target"
                      aria-label="Close active players dialog"
                    >
                      <X size={18} className="text-on-surface" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/15">
                      {draftActivePlayerIds.size}/{tournament.players.length} active
                    </span>
                    <span className="text-[11px] font-medium text-ios-gray">Applies on next round</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-b border-ios-gray/10 bg-ios-gray/5">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="w-full h-10 px-3.5 rounded-xl border border-primary/20 bg-primary/8 text-[12px] font-bold text-primary tap-target inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  Add New Player
                </button>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftActivePlayerIds(new Set(tournament.players.map((player) => player.id)))}
                    className="h-9 px-3 rounded-lg border border-primary/20 bg-white text-[11px] font-bold text-primary tap-target"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftActivePlayerIds(new Set())}
                    className="h-9 px-3 rounded-lg border border-ios-gray/20 bg-white text-[11px] font-bold text-ios-gray tap-target"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-2">
                {tournament.players.length === 0 ? (
                  <div className="h-28 rounded-2xl border border-ios-gray/10 bg-ios-gray/5 flex items-center justify-center text-[12px] font-medium text-ios-gray">
                    No players in this match yet.
                  </div>
                ) : tournament.players.map((player) => {
                  const isChecked = draftActivePlayerIds.has(player.id);
                  const isManual = !isFomRegisteredPlayer(player);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleDraftActivePlayer(player.id)}
                      className={cn(
                        "w-full h-14 flex items-center justify-between gap-3 px-3.5 rounded-xl border text-left tap-target transition-colors",
                        isChecked
                          ? "border-primary/25 bg-primary/6"
                          : "border-ios-gray/12 bg-white hover:bg-ios-gray/5"
                      )}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          isChecked ? "bg-primary text-white" : "bg-ios-gray/12 text-ios-gray"
                        )}>
                          {player.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-on-surface truncate">{player.name}</p>
                          <p className="text-[10px] font-medium text-ios-gray">
                            {isManual ? 'Manual Player' : 'FOM Player'}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                        isChecked ? "bg-primary border-primary text-white" : "bg-white border-ios-gray/35 text-transparent"
                      )}>
                        <Check size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-ios-gray/10 bg-white">
                <p className="mb-2.5 text-[11px] font-medium text-ios-gray">Changes will apply starting from the next round.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setIsActivePlayersEditorOpen(false)}
                    className="h-11 rounded-xl border border-ios-gray/20 text-[14px] font-semibold text-ios-gray tap-target"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveActivePlayers}
                    disabled={!hasDraftActivePlayersChanges}
                    className="h-11 rounded-xl bg-primary text-white text-[14px] font-bold shadow-[0_8px_18px_rgba(230,94,20,0.24)] tap-target disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddPlayerModalOpen && !isReadOnly && (
          <AddPlayerModal
            isOpen={isAddPlayerModalOpen}
            onClose={() => setIsAddPlayerModalOpen(false)}
            onAdd={handleAddPlayerFromActive}
          />
        )}
      </AnimatePresence>

      {/* Modal Popup */}
      <AnimatePresence>
        {isCourtEditorOpen && (
          <div
            className="fixed inset-0 z-[121] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCourtEditorOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Edit Court Count</h3>
                  <p className="text-[12px] text-ios-gray font-medium">Current courts: {tournament.courts}</p>
                </div>
                <button
                  onClick={() => setIsCourtEditorOpen(false)}
                  className="p-2 bg-ios-gray/10 rounded-full tap-target"
                >
                  <X size={18} className="text-on-surface" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <label className="block text-[12px] font-bold uppercase tracking-wide text-ios-gray">
                  New Court Count
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={courtEditValue}
                  onChange={(e) => {
                    setCourtEditValue(e.target.value);
                    if (courtEditError) setCourtEditError('');
                  }}
                  className="w-full h-12 rounded-xl border border-ios-gray/20 px-4 text-[17px] font-semibold text-on-surface outline-none focus:border-primary"
                  placeholder="Example: 2"
                />
                <p className="text-[11px] font-medium text-ios-gray">
                  Changes apply starting from the next round.
                </p>
                {courtEditError && (
                  <p className="text-[12px] font-semibold text-red-500">{courtEditError}</p>
                )}
              </div>
              <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsCourtEditorOpen(false)}
                  className="h-11 rounded-xl border border-ios-gray/20 text-[14px] font-semibold text-ios-gray tap-target"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCourtEdit}
                  className="h-11 rounded-xl bg-primary text-white text-[14px] font-bold shadow-[0_8px_18px_rgba(230,94,20,0.24)] tap-target"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isRoundEditorOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoundEditorOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-ios-gray/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Edit Round Count</h3>
                  <p className="text-[12px] text-ios-gray font-medium">Current match rounds: {tournament.numRounds}</p>
                </div>
                <button
                  onClick={() => setIsRoundEditorOpen(false)}
                  className="p-2 bg-ios-gray/10 rounded-full tap-target"
                >
                  <X size={18} className="text-on-surface" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <label className="block text-[12px] font-bold uppercase tracking-wide text-ios-gray">
                  New Round Count
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={roundEditValue}
                  onChange={(e) => {
                    setRoundEditValue(e.target.value);
                    if (roundEditError) setRoundEditError('');
                  }}
                  className="w-full h-12 rounded-xl border border-ios-gray/20 px-4 text-[17px] font-semibold text-on-surface outline-none focus:border-primary"
                  placeholder="Contoh: 5"
                />
                {roundEditError && (
                  <p className="text-[12px] font-semibold text-red-500">{roundEditError}</p>
                )}
              </div>
              <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIsRoundEditorOpen(false)}
                  className="h-11 rounded-xl border border-ios-gray/20 text-[14px] font-semibold text-ios-gray tap-target"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRoundEdit}
                  className="h-11 rounded-xl bg-primary text-white text-[14px] font-bold shadow-[0_8px_18px_rgba(230,94,20,0.24)] tap-target"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {swappingPlayer && (
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwappingPlayer(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
            >
              <div className="p-6 border-b border-ios-gray/10">
                <div className="flex justify-between items-center">
                  <div>
                  <h3 className="text-lg font-bold tracking-tight">Swap Player</h3>
                  <p className="text-xs text-ios-gray font-medium">Replace {swappingPlayer.currentPlayer.name}</p>
                  </div>
                  <button onClick={() => setSwappingPlayer(null)} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                    <X size={20} className="text-on-surface" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <h4 className="text-[11px] font-bold text-ios-gray uppercase tracking-widest px-2 mb-2">Select Replacement Player</h4>
                {tournament.players
                  .filter(p => {
                    // Don't show players already in this match
                    const match = tournament.rounds.find(r => r.matches.some(m => m.id === swappingPlayer.matchId))?.matches.find(m => m.id === swappingPlayer.matchId);
                    if (!match) return true;
                    const playersInMatch = [...match.teamA.players, ...match.teamB.players];
                    return !playersInMatch.some(pm => pm.id === p.id);
                  })
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        onSwapPlayer(swappingPlayer.matchId, swappingPlayer.team, swappingPlayer.playerIndex, player);
                        setSwappingPlayer(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-ios-gray/5 active:bg-ios-gray/10 transition-colors tap-target"
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs", accentTheme.bgSoft, accentTheme.text)}>
                        {player.initials}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">{player.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ios-gray font-medium">
                            {isFomRegisteredPlayer(player) ? `MMR: ${player.rating}` : 'Manual player · No MMR'}
                          </span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", accentTheme.text, accentTheme.bgSoft)}>
                            {playerMatchCounts[player.id] || 0} Match
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto">
                        <ChevronRight size={16} className="text-ios-gray/30" />
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </div>
        )}

        {scoringMatch && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + var(--app-safe-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScoringMatchId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-white rounded-[24px] shadow-2xl overflow-hidden"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)`, overflowY: 'auto' }}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[17px] font-bold tracking-tight">Update Score Court {scoringMatch.court}</h3>
                  <button onClick={() => setScoringMatchId(null)} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                    <X size={18} className="text-on-surface" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Team A Scoring */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className={cn("text-xs font-bold uppercase tracking-widest", accentTheme.text)}>Team A</span>
                      <span className="text-xs font-medium text-ios-gray truncate max-w-[200px]">
                        {scoringMatch.teamA.players.map(p => p.name.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex-1 flex items-center justify-between rounded-xl p-2 border", accentTheme.bgSoft, accentTheme.borderSoft)}>
                        {tournament.format !== 'Match Play' ? (
                          <>
                            <button onClick={() => handleScoreUpdate('A', -1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm tap-target active:scale-90 transition-transform">
                              <Minus size={18} className={accentTheme.text} />
                            </button>
                            <span className={cn("text-3xl font-display font-black", accentTheme.text)}>{scoringMatch.teamA.score}</span>
                            <button onClick={() => handleScoreUpdate('A', 1)} className={cn("w-10 h-10 flex items-center justify-center rounded-lg shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}>
                              <Plus size={18} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between px-2">
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Games</span>
                              <span className={cn("text-2xl font-display font-black", accentTheme.text)}>{scoringMatch.teamA.score}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Points</span>
                              <span className={cn("text-2xl font-black", accentTheme.text)}>{scoringMatch.pointsA || '0'}</span>
                            </div>
                            <button
                              onClick={() => handleMatchPlayScoreUpdate('A')}
                              className={cn("w-10 h-10 flex items-center justify-center rounded-lg shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}
                            >
                              <Plus size={18} className="text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      {tournament.format !== 'Match Play' && (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleScoreUpdate('A', 5)} className={cn("px-3 py-2 text-xs font-black rounded-lg tap-target", accentTheme.bgSoft, accentTheme.text)}>+5</button>
                          <button onClick={() => setExactScore('A', tournament.totalPoints)} className={cn("px-3 py-2 text-xs font-black rounded-lg tap-target", accentTheme.bgSoft, accentTheme.text)}>MAX</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ios-gray/10"></div></div>
                    <span className="relative px-3 bg-white text-[9px] font-black text-ios-gray/30 tracking-[0.2em] uppercase">Versus</span>
                  </div>

                  {/* Team B Scoring */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-ios-gray uppercase tracking-widest">Team B</span>
                      <span className="text-xs font-medium text-ios-gray truncate max-w-[200px]">
                        {scoringMatch.teamB.players.map(p => p.name.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 flex items-center justify-between bg-ios-gray/5 rounded-xl p-2 border border-ios-gray/10">
                        {tournament.format !== 'Match Play' ? (
                          <>
                            <button onClick={() => handleScoreUpdate('B', -1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm tap-target active:scale-90 transition-transform">
                              <Minus size={18} className="text-on-surface" />
                            </button>
                            <span className="text-3xl font-display font-black text-on-surface">{scoringMatch.teamB.score}</span>
                            <button onClick={() => handleScoreUpdate('B', 1)} className="w-10 h-10 flex items-center justify-center bg-on-surface rounded-lg shadow-lg shadow-on-surface/10 tap-target active:scale-90 transition-transform">
                              <Plus size={18} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between px-2">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-ios-gray/40 uppercase">Games</span>
                              <span className="text-2xl font-display font-black text-on-surface">{scoringMatch.teamB.score}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-ios-gray/40 uppercase">Points</span>
                              <span className="text-2xl font-black text-on-surface">{scoringMatch.pointsB || '0'}</span>
                            </div>
                            <button
                              onClick={() => handleMatchPlayScoreUpdate('B')}
                              className="w-10 h-10 flex items-center justify-center bg-on-surface rounded-lg shadow-lg shadow-on-surface/10 tap-target active:scale-90 transition-transform"
                            >
                              <Plus size={18} className="text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      {tournament.format !== 'Match Play' && (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleScoreUpdate('B', 5)} className="px-3 py-2 bg-ios-gray/10 text-ios-gray text-xs font-black rounded-lg tap-target">+5</button>
                          <button onClick={() => setExactScore('B', tournament.totalPoints)} className="px-3 py-2 bg-ios-gray/10 text-ios-gray text-xs font-black rounded-lg tap-target">MAX</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setScorePair(0, 0);
                    }}
                    className="py-3 bg-ios-gray/5 text-ios-gray font-bold text-sm rounded-xl tap-target active:bg-ios-gray/10 transition-colors"
                  >
                    Reset Score
                  </button>
                  <button
                    onClick={() => setScoringMatchId(null)}
                    className={cn("py-3 text-white font-bold text-sm rounded-xl shadow-xl tap-target active:scale-[0.98] transition-all", accentTheme.solid, accentTheme.solidShadow)}
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KlasemenScreen = ({
  tournament,
  onBack,
  onShare,
  onOpenActive,
  isSharedViewer
}: {
  tournament: Tournament | TournamentHistory,
  onBack: () => void,
  onShare: (t: Tournament | TournamentHistory) => void,
  onOpenActive: () => void,
  isSharedViewer?: boolean
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const fomPlayUrl = useMemo(() => {
    const configuredBase = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
    const runtimeBase = `${window.location.protocol}//${window.location.host}`;
    return (configuredBase || runtimeBase).replace(/\/+$/, '');
  }, []);
  const tournamentPlayers = tournament.players || [];
  const tournamentRounds = tournament.rounds || [];
  const configuredCourts = 'courts' in tournament ? tournament.courts : undefined;
  const detectedCourts = Math.max(1, ...tournamentRounds.flatMap(r => r.matches.map(m => m.court || 1)));
  const courtsCount = configuredCourts || detectedCourts;
  const completedRounds = tournamentRounds.filter(r => r.matches.every(m => m.status === 'completed')).length;
  const totalRounds = Math.max(tournament.numRounds || 0, tournamentRounds.length);
  const totalMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.filter(m => m.status === 'completed').length, 0);
  const isTournamentEnded = totalRounds > 0 ? completedRounds >= totalRounds : true;
  const completionPercent = totalMatches > 0 ? Math.min(100, Math.round((completedMatches / totalMatches) * 100)) : 0;
  const dateLabel = 'date' in tournament && tournament.date
    ? tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : ('startedAt' in tournament && tournament.startedAt
      ? new Date(tournament.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '');
  const venueLabel = (tournament.venueName || '').trim();
  const locationLabel = (tournament.location || '').trim();
  const placeLabel = [venueLabel, locationLabel].filter(Boolean).join(' | ');
  const locationDateLabel = placeLabel ? `${placeLabel} | ${dateLabel}` : dateLabel;
  const totalElapsed = formatDurationFromMs(
    getTournamentElapsedMs(
      tournamentRounds,
      nowMs,
      'endedAt' in tournament ? tournament.endedAt : undefined
    )
  );

  const infoTheme =
    tournament.format === 'Americano'
      ? {
        bg: 'from-[#12806A] via-[#18A486] to-[#4FC3A1]',
        shadow: 'shadow-[0_14px_30px_rgba(18,128,106,0.32)]',
        ring: 'bg-[#0F2A2A]/18',
        topBg: 'bg-[#12806A]/92 supports-[backdrop-filter]:bg-[#12806A]/82',
        topBorder: 'border-[#0d5f4e]/35',
        accent: 'text-[#12806A]',
        accentSoft: 'text-[#12806A]/65',
        accentBg: 'bg-[#18A486]/12',
        accentBorder: 'border-[#18A486]/25',
        accentSolid: 'bg-[#18A486]',
        accentSolidShadow: 'shadow-[0_10px_22px_rgba(24,164,134,0.26)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          bg: 'from-[#E65E14] via-[#F26A2A] to-[#FF8A4C]',
          shadow: 'shadow-[0_14px_30px_rgba(230,94,20,0.35)]',
          ring: 'bg-[#1F2937]/18',
          topBg: 'bg-primary/92 supports-[backdrop-filter]:bg-primary/82',
          topBorder: 'border-[#b8480f]/35',
          accent: 'text-primary',
          accentSoft: 'text-primary/65',
          accentBg: 'bg-primary/12',
          accentBorder: 'border-primary/25',
          accentSolid: 'bg-primary',
          accentSolidShadow: 'shadow-[0_10px_22px_rgba(230,94,20,0.24)]'
        }
        : {
          bg: 'from-[#2248B5] via-[#2F6FE4] to-[#56A3F7]',
          shadow: 'shadow-[0_14px_30px_rgba(34,72,181,0.32)]',
          ring: 'bg-[#0F1E3A]/18',
          topBg: 'bg-[#2F6FE4]/92 supports-[backdrop-filter]:bg-[#2F6FE4]/82',
          topBorder: 'border-[#1f4ca8]/35',
          accent: 'text-[#2F6FE4]',
          accentSoft: 'text-[#2F6FE4]/65',
          accentBg: 'bg-[#2F6FE4]/12',
          accentBorder: 'border-[#2F6FE4]/25',
          accentSolid: 'bg-[#2F6FE4]',
          accentSolidShadow: 'shadow-[0_10px_22px_rgba(47,111,228,0.26)]'
        };
  const klasemenHeroPhoto = useMemo(() => {
    return resolveMatchBackground(tournament.format, tournament.backgroundId);
  }, [tournament.backgroundId, tournament.format]);
  const klasemenPageBgTheme =
    tournament.format === 'Americano'
      ? {
        base: 'bg-[linear-gradient(175deg,#e9faf6_0%,#d8f3eb_42%,#f5fffb_100%)]',
        photoBlend: 'bg-[linear-gradient(180deg,rgba(10,28,24,0.22)_0%,rgba(11,46,37,0.12)_16%,rgba(28,96,80,0.06)_32%,rgba(233,250,246,0.04)_44%,rgba(233,250,246,0.18)_58%,rgba(233,250,246,0.42)_72%,rgba(233,250,246,0.62)_86%,rgba(245,255,251,1)_100%)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          base: 'bg-[linear-gradient(175deg,#fff3e7_0%,#ffe8d8_40%,#fff5ec_100%)]',
          photoBlend: 'bg-[linear-gradient(180deg,rgba(33,19,12,0.22)_0%,rgba(78,35,14,0.12)_16%,rgba(156,74,28,0.06)_32%,rgba(255,243,231,0.04)_44%,rgba(255,243,231,0.18)_58%,rgba(255,243,231,0.42)_72%,rgba(255,243,231,0.62)_86%,rgba(255,245,236,1)_100%)]'
        }
        : {
          base: 'bg-[linear-gradient(175deg,#edf3ff_0%,#dce9ff_42%,#f6f9ff_100%)]',
          photoBlend: 'bg-[linear-gradient(180deg,rgba(8,24,45,0.24)_0%,rgba(14,44,82,0.14)_16%,rgba(37,92,171,0.06)_32%,rgba(237,243,255,0.04)_44%,rgba(237,243,255,0.18)_58%,rgba(237,243,255,0.42)_72%,rgba(237,243,255,0.62)_86%,rgba(246,249,255,1)_100%)]'
        };

  const sortedPlayers = useMemo(() => {
    const playerRegistry = new Map<string, Player>();
    const registerPlayer = (player: Player | undefined) => {
      if (!player) return;
      const existing = playerRegistry.get(player.id);
      if (!existing) {
        playerRegistry.set(player.id, player);
        return;
      }
      const merged = {
        ...existing,
        ...player,
        avatar: player.avatar || existing.avatar,
        initials: player.initials || existing.initials
      };
      playerRegistry.set(player.id, merged);
    };

    tournamentPlayers.forEach(registerPlayer);
    tournamentRounds.forEach(round => {
      round.matches.forEach(match => {
        match.teamA.players.forEach(registerPlayer);
        match.teamB.players.forEach(registerPlayer);
      });
      (round.playersBye || []).forEach(registerPlayer);
    });

    const playerStatsMap: Record<string, {
      id: string,
      name: string,
      avatar?: string,
      initials: string,
      matches: number,
      w: number,
      l: number,
      d: number,
      pointsDiff: number,
      totalPoints: number
    }> = {};

    playerRegistry.forEach(player => {
      playerStatsMap[player.id] = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        initials: player.initials || player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        matches: 0,
        w: 0,
        l: 0,
        d: 0,
        pointsDiff: 0,
        totalPoints: 0
      };
    });

    tournamentRounds.forEach(round => {
      round.matches.forEach(match => {
        const scoreA = match.teamA.score || 0;
        const scoreB = match.teamB.score || 0;
        const hasLiveScore = scoreA > 0 || scoreB > 0;
        const shouldCountStandingScore = match.status === 'completed' || hasLiveScore;
        if (!shouldCountStandingScore && match.status !== 'completed') return;

        match.teamA.players.forEach(player => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreA;
            stats.pointsDiff += (scoreA - scoreB);
          }
          if (match.status === 'completed') {
            if (scoreA > scoreB) stats.w += 1;
            else if (scoreA < scoreB) stats.l += 1;
            else stats.d += 1;
          }
        });
        match.teamB.players.forEach(player => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreB;
            stats.pointsDiff += (scoreB - scoreA);
          }
          if (match.status === 'completed') {
            if (scoreB > scoreA) stats.w += 1;
            else if (scoreB < scoreA) stats.l += 1;
            else stats.d += 1;
          }
        });
      });
    });

    Object.values(playerStatsMap).forEach((stats) => {
      // Keep "M" fully consistent with finished outcomes shown as W/L/D.
      stats.matches = stats.w + stats.l + stats.d;
    });

    return Object.values(playerStatsMap).sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [tournamentPlayers, tournamentRounds]);

  return (
    <div className="relative min-h-screen pb-12 overflow-hidden bg-transparent z-0">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={cn('absolute inset-0', klasemenPageBgTheme.base)} />
        <div className="absolute inset-x-0 top-0 h-screen min-h-screen max-h-none overflow-hidden">
          {klasemenHeroPhoto && (
            <img
              src={klasemenHeroPhoto}
              alt="Standings background"
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.12]"
            />
          )}
          <div className={cn('absolute inset-0', klasemenPageBgTheme.photoBlend)} />
        </div>
      </div>

      <header
        className="relative z-20 bg-transparent border-b border-transparent"
        style={{ paddingTop: 'var(--app-safe-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto h-11 px-5 relative flex items-center justify-between">
          <div className="shrink-0">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full", infoTheme.accentSolid, infoTheme.accentSolidShadow)}>
              {!isTournamentEnded && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/55 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
              )}
              <span className={cn(!isTournamentEnded && "animate-pulse")}>
                {isTournamentEnded ? 'Ended' : 'Live'}
              </span>
            </span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
            <img src="/fom-long-logotype-white.png" alt="Friends of Motion" className="h-8 w-auto object-contain" />
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <InstallAppButton compact variant="minimum" className="text-white" />
            {isSharedViewer ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">View Only</span>
            ) : (
              <button onClick={() => onShare(tournament)} className="tap-target h-8 px-0 inline-flex items-center gap-1.5 border-0 bg-transparent text-white">
                <Share2 size={16} />
                <span className="text-[12px] font-semibold">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        className="relative z-10 px-5 space-y-6 max-w-lg mx-auto"
        style={{
          paddingTop: '16px',
          paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 16px)'
        }}
      >
        {isSharedViewer && (
          <p className="px-1 text-[10px] font-medium leading-tight text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            Standings viewer mode is active. This page is read-only.
          </p>
        )}

        <section className={cn('relative overflow-hidden rounded-2xl p-4 border border-white/40 bg-white/8 backdrop-blur-md', infoTheme.shadow)}>

          <div className="relative flex items-baseline justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-white truncate">{tournament.name || '-'}</h2>
              <p className="mt-1 text-[11px] text-white/85 truncate">{locationDateLabel}</p>
            </div>
            <span className="shrink-0 text-[16px] leading-none font-display font-bold tabular-nums text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]">
              {totalElapsed}
            </span>
          </div>

          <div className="relative grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Mode</p>
              <p className="text-[12px] font-semibold text-white truncate">{tournament.format}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Player</p>
              <p className="text-[12px] font-semibold text-white">{sortedPlayers.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Court</p>
              <p className="text-[12px] font-semibold text-white">{courtsCount}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Round</p>
              <p className="text-[12px] font-semibold text-white">{completedRounds}/{totalRounds || 0}</p>
            </div>
          </div>

          <div className="relative mt-2.5 pt-2 flex items-center justify-between text-[10px] font-semibold text-white/78 tabular-nums">
            <span>Match {completedMatches}/{totalMatches}</span>
            <span>Progress {completionPercent}%</span>
          </div>
          <div className="relative mt-1.5">
            <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white/90 transition-all duration-300" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          <div className="relative mt-3.5 pt-2.5 min-h-[30px] flex items-center justify-start gap-2">
            <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
            <p className="relative z-10 text-[11px] text-white/88 whitespace-nowrap">
              Hosted with{' '}
              <button
                type="button"
                onClick={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
                className="inline p-0 bg-transparent border-0 font-bold text-white underline-offset-2 hover:underline cursor-pointer"
              >
                FOM Play
              </button>
            </p>
          </div>
        </section>

        <section className="-mt-1">
          <button
            onClick={onOpenActive}
            className={cn(
              "tap-target w-full h-12 rounded-2xl px-4 flex items-center justify-between border border-white/40 bg-white/8 backdrop-blur-md text-white",
              infoTheme.shadow
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full flex items-center justify-center border border-white/35 bg-white/20">
                <Zap size={15} />
              </span>
              <span className="text-[13px] font-bold truncate">
                {isTournamentEnded ? 'View Round Details' : 'View Active Match'}
              </span>
            </div>
            <ChevronRight size={16} className="opacity-80 shrink-0" />
          </button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Ranking Player</h3>
          </div>
          <p className="px-1 text-[10px] font-semibold text-white/92 drop-shadow-[0_1px_2px_rgba(0,0,0,0.32)]">Order: Wins (W) - Diff - Points.</p>

          <div className="rounded-2xl bg-white/78 backdrop-blur-sm border border-white/45 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-[1fr_48px_44px] gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface/55">
              <span>Player</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Points</span>
            </div>
            <div className="space-y-1.5">
              {sortedPlayers.map((player, i) => (
                <div key={player.id} className="bg-white/88 p-3 rounded-[14px] border border-white/45 grid grid-cols-[1fr_48px_44px] gap-2 items-center">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0', i < 3 ? cn(infoTheme.accentBg, infoTheme.accent) : 'bg-ios-gray/10 text-ios-gray')}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-ios-gray/10 border border-ios-gray/10 overflow-hidden flex items-center justify-center shrink-0">
                      {player.avatar ? (
                        <img className="w-full h-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[11px] font-bold text-ios-gray">{player.initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13px] text-on-surface truncate">{player.name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-ios-gray/85 truncate">
                        W {player.w} · L {player.l} · D {player.d} · M {player.matches}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-[14px] font-display font-black leading-none tabular-nums', player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                      {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold leading-none text-on-surface tabular-nums">{player.totalPoints}</p>
                  </div>
                </div>
              ))}
              {sortedPlayers.length === 0 && (
                <div className="bg-white/95 p-4 rounded-[14px] border border-ios-gray/10 text-center text-[12px] font-semibold text-ios-gray">
                  Player data is not available yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pt-1 pb-8">
          <button onClick={() => onShare(tournament)} className={cn('w-full h-[52px] rounded-[14px] text-white font-bold text-[15px] tracking-[0.01em] tap-target inline-flex items-center justify-center gap-2 border border-white/12', infoTheme.accentSolid, infoTheme.accentSolidShadow)}>
            <Share2 size={16} />
            Share Standings
          </button>
        </section>
      </main>
    </div>
  );
};


const NotificationsScreen = ({ notifications, onMarkAsRead, onClearAll, onBack }: {
  notifications: AppNotification[],
  onMarkAsRead: (id: string) => void,
  onClearAll: () => void,
  onBack: () => void
}) => {
  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [notifications]
  );
  const unreadCount = sortedNotifications.filter((notif) => !notif.read).length;
  const formatRelativeNotificationTime = (timestamp: Date) => {
    const diffMs = timestamp.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    const absMinutes = Math.abs(diffMinutes);
    const rtf = new Intl.RelativeTimeFormat('id', { style: 'short' });

    if (absMinutes < 60) {
      return rtf.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    const absHours = Math.abs(diffHours);
    if (absHours < 24) {
      return rtf.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    }

    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 z-50 flex items-center w-full px-4 h-14 border-b border-ios-gray/10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack} className="tap-target p-2 -ml-2">
            <ChevronLeft size={24} className="text-on-surface" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface truncate">Notifications</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {sortedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-ios-gray/5 rounded-full flex items-center justify-center mb-4">
              <Bell size={40} className="text-ios-gray/30" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">No notifications yet</h3>
            <p className="text-sm text-on-surface/40 font-medium">
              We will notify you when there are new matches or match updates.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-[24px] border border-black/5 bg-surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Inbox</p>
                  <p className="mt-1 text-[14px] font-semibold tracking-tight text-on-surface">
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>
                <button
                  onClick={onClearAll}
                  className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-2 text-[12px] font-semibold tracking-tight text-ios-gray tap-target transition-all active:scale-[0.98]"
                >
                  Clear all
                </button>
              </div>
            </section>

            <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
            {sortedNotifications.map((notif, index) => {
              const visuals = getNotificationVisuals(notif);
              const Icon = visuals.icon;
              const timeLabel = formatRelativeNotificationTime(notif.timestamp);

              return (
                <button
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={cn(
                    'w-full px-4 py-3.5 flex gap-3.5 text-left transition-colors',
                    index !== sortedNotifications.length - 1 && 'border-b border-ios-gray/5',
                    !notif.read ? visuals.unreadRowClass : visuals.readRowClass
                  )}
                >
                  <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', visuals.iconWrapClass)}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className={cn(
                        'text-[15px] leading-tight truncate pr-2',
                        !notif.read ? `font-bold ${visuals.titleClass}` : 'font-semibold text-on-surface/70'
                      )}>
                        {notif.title}
                      </h4>
                      <span className="mt-0.5 whitespace-nowrap text-[11px] font-medium tracking-tight text-ios-gray/65">
                        {timeLabel}
                      </span>
                    </div>
                    <p className={cn(
                      'mt-1 text-[13px] leading-snug line-clamp-2',
                      !notif.read ? `font-medium ${visuals.messageClass}` : 'text-on-surface/40'
                    )}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2.5 shrink-0',
                      visuals.tone === 'error'
                        ? 'bg-[#ef4444]'
                        : visuals.tone === 'success'
                          ? 'bg-[#16a34a]'
                          : visuals.tone === 'achievement'
                            ? 'bg-[#f59e0b]'
                            : notif.type === 'match'
                              ? 'bg-blue-500'
                              : notif.type === 'tournament'
                                ? 'bg-primary'
                                : 'bg-ios-gray'
                    )} />
                  )}
                </button>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const HistoryScreen = ({
  tournaments,
  onBack,
  onOpenTournament
}: {
  tournaments: TournamentHistory[];
  onBack: () => void;
  onOpenTournament: (tournament: TournamentHistory) => void;
}) => {
  const sortedTournaments = useMemo(() => sortTournamentsByNewest(tournaments), [tournaments]);
  const totalCompletedMatches = useMemo(
    () => sortedTournaments.reduce((sum, tournament) => sum + buildCompletedMatchHistoryItems([tournament]).length, 0),
    [sortedTournaments]
  );
  const totalPlayers = useMemo(
    () => sortedTournaments.reduce((sum, tournament) => sum + Number(tournament.numPlayers || 0), 0),
    [sortedTournaments]
  );
  const latestEventLabel = sortedTournaments[0]?.date
    ? sortedTournaments[0].date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bg-white min-h-screen pb-32">
      <main className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-[28px] sm:rounded-[32px] border border-black/5 bg-white p-4 sm:p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-primary/80">History</p>
              <h1 className="mt-1 text-[clamp(24px,7vw,36px)] leading-[1.02] font-display font-black tracking-tight text-on-surface">
                Match archive.
              </h1>
              <p className="mt-1.5 max-w-md text-[13px] sm:text-[14px] leading-relaxed text-ios-gray">
                Semua event yang sudah selesai terkumpul di sini, jadi lebih gampang buat cek recap, standings, dan detail per ronde.
              </p>
            </div>
            <div className="shrink-0 rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-2 text-right">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Events</p>
              <p className="mt-1 text-[20px] sm:text-[24px] leading-none font-display font-black tracking-tight tabular-nums text-on-surface">
                {sortedTournaments.length}
              </p>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Matches</p>
              <p className="mt-1 text-[16px] sm:text-[18px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                {totalCompletedMatches}
              </p>
            </div>
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Players</p>
              <p className="mt-1 text-[16px] sm:text-[18px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                {totalPlayers}
              </p>
            </div>
            <div className="rounded-[16px] sm:rounded-[20px] border border-black/5 bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ios-gray/70">Latest</p>
              <p className="mt-1 text-[12px] sm:text-[13px] leading-tight font-semibold tracking-tight text-on-surface">
                {latestEventLabel || 'Belum ada'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Archive List</p>
              <h2 className="mt-1 text-[17px] sm:text-[18px] font-bold tracking-tight text-on-surface">Completed events</h2>
            </div>
            {sortedTournaments.length > 0 && (
              <span className="shrink-0 rounded-full border border-black/5 bg-surface px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-tight text-ios-gray">
                newest first
              </span>
            )}
          </div>

          {sortedTournaments.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/8 bg-surface p-10 text-center">
              <Trophy size={40} className="mx-auto mb-3 text-ios-gray/20" />
              <h3 className="text-[18px] font-bold tracking-tight text-on-surface">No history yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ios-gray">
                Completed events will show up here once your matches are finalized.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTournaments.map((item) => (
                <TournamentHistoryCard
                  key={item.id}
                  tournament={item}
                  onClick={() => onOpenTournament(item)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const HistoryDetailScreen = ({
  tournament,
  onBack,
  onViewFinalStandings,
  onViewMatchDetails
}: {
  tournament: TournamentHistory,
  onBack: () => void,
  onViewFinalStandings: () => void,
  onViewMatchDetails: () => void
}) => {
  const completedMatches = useMemo(
    () => buildCompletedMatchHistoryItems([tournament]),
    [tournament]
  );
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, CompletedMatchHistoryItem[]>();
    completedMatches.forEach((item) => {
      const roundItems = grouped.get(item.roundId) || [];
      roundItems.push(item);
      grouped.set(item.roundId, roundItems);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([roundId, items]) => ({ roundId, items }));
  }, [completedMatches]);
  const formatTheme = getHistoryFormatTheme(tournament.format);
  const eventMeta = [tournament.venueName, tournament.location].filter(Boolean).join(' · ');
  const [focusedRoundId, setFocusedRoundId] = useState<number | null>(null);
  const roundSectionRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    setFocusedRoundId(matchesByRound[0]?.roundId ?? null);
  }, [matchesByRound]);

  const handleFocusRound = (roundId: number) => {
    setFocusedRoundId(roundId);
    roundSectionRefs.current[roundId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center justify-between px-4 h-14 border-b border-ios-gray/10">
        <button onClick={onBack} className="text-primary flex items-center -ml-2 tap-target p-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[17px] tracking-tight">History Detail</h1>
        <div className="w-10" />
      </header>

      <main className="pt-4 px-4 space-y-4 max-w-2xl mx-auto">
        <div className="overflow-hidden rounded-[28px] sm:rounded-[30px] border border-black/5 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Event Summary</p>
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', formatTheme.chip)}>
              {tournament.format}
            </span>
          </div>
          <h2 className="mt-2 text-[28px] leading-tight font-display font-black tracking-tight text-on-surface">
            {tournament.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] font-medium text-ios-gray">
            <Calendar size={14} />
            <span>{tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {eventMeta && (
              <>
                <span className="h-1 w-1 rounded-full bg-ios-gray/45" />
                <span className="truncate">{eventMeta}</span>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Format</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.format}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Players</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.numPlayers}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Rounds</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{tournament.numRounds}</span>
            </div>
            <div className="rounded-[18px] sm:rounded-[20px] border border-black/5 bg-surface px-3 py-3">
              <span className="block text-[11px] font-semibold tracking-tight text-ios-gray">Matches</span>
              <span className="mt-1 block text-[14px] font-semibold tracking-tight text-on-surface">{completedMatches.length}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={onViewFinalStandings}
              className={cn(
                'w-full h-12 rounded-[18px] border text-[13px] font-semibold tracking-tight inline-flex items-center justify-center gap-2 tap-target shadow-sm',
                formatTheme.chip
              )}
            >
              <Trophy size={16} />
              View Final Standings
            </button>
            <button
              onClick={onViewMatchDetails}
              className="w-full h-12 rounded-[18px] border border-black/5 bg-surface text-[13px] font-semibold tracking-tight text-on-surface/88 inline-flex items-center justify-center gap-2 tap-target shadow-sm"
            >
              <Zap size={16} />
              Round Details
            </button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Completed Matches</p>
              <h3 className="mt-1 text-[18px] font-bold tracking-tight text-on-surface">
                Match history
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
                Skor final tiap court dan ronde, supaya recap pertandingan lebih cepat dipindai.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
              {completedMatches.length} {completedMatches.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {matchesByRound.length > 0 && (
            <div className="-mx-1 overflow-x-auto px-1 pb-1 no-scrollbar">
              <div className="flex w-max gap-2">
              {matchesByRound.map((group) => (
                <button
                  key={group.roundId}
                  type="button"
                  onClick={() => handleFocusRound(group.roundId)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold tracking-tight shadow-sm tap-target transition-all active:scale-[0.98]',
                    focusedRoundId === group.roundId ? formatTheme.badge : formatTheme.chip
                  )}
                >
                  <span>Round {group.roundId}</span>
                  <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                  <span>{group.items.length} match{group.items.length === 1 ? '' : 'es'}</span>
                </button>
              ))}
              </div>
            </div>
          )}

          {completedMatches.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-black/8 bg-surface p-8 text-center">
              <p className="text-[14px] font-medium text-ios-gray">No completed matches in this history yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchesByRound.map((group) => (
                <section
                  key={group.roundId}
                  ref={(node) => {
                    roundSectionRefs.current[group.roundId] = node;
                  }}
                  className="rounded-[26px] border border-black/5 bg-[linear-gradient(180deg,rgba(249,250,251,0.98)_0%,rgba(255,255,255,0.98)_100%)] p-3.5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Round Group</p>
                      <h4 className="mt-0.5 text-[16px] font-bold tracking-tight text-on-surface">
                        Round {group.roundId}
                      </h4>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-tight', formatTheme.badge)}>
                      {group.items.length} match{group.items.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <CompletedMatchHistoryCard
                        key={item.id}
                        item={item}
                        showTournamentMeta={false}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-black/5 bg-surface p-3.5">
          <div>
            <p className="text-[11px] font-semibold tracking-tight text-ios-gray">More Details</p>
            <p className="mt-1 text-[13px] font-semibold tracking-tight text-on-surface">
              Open standings or round-by-round details if you need the full breakdown.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              onClick={onViewFinalStandings}
              className="w-full h-11 rounded-full border border-primary/12 bg-white text-[13px] font-semibold tracking-tight text-primary inline-flex items-center justify-center gap-2 tap-target"
            >
              <Trophy size={16} />
              View Final Standings
            </button>
            <button
              onClick={onViewMatchDetails}
              className="w-full h-11 rounded-full border border-black/5 bg-white text-[13px] font-semibold tracking-tight text-on-surface/88 inline-flex items-center justify-center gap-2 tap-target"
            >
              <Zap size={16} />
              Round Details
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

const ProfileScreen = ({ onLogout, user, tournaments, setUser, addNotification, onOpenMmrHistory, onOpenNotifications, onOpenFriends, unreadCount }: {
  onLogout: () => void,
  user: any,
  tournaments: TournamentHistory[],
  setUser: React.Dispatch<React.SetStateAction<any>>,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void,
  onOpenMmrHistory: () => void,
  onOpenNotifications: () => void,
  onOpenFriends: () => void,
  unreadCount: number
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isFeedbackInboxOpen, setIsFeedbackInboxOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature_request' | 'ui_ux' | 'other'>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [feedbackInboxItems, setFeedbackInboxItems] = useState<any[]>([]);
  const [isFeedbackInboxLoading, setIsFeedbackInboxLoading] = useState(false);
  const [feedbackInboxStatusFilter, setFeedbackInboxStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all');
  const [feedbackInboxCategoryFilter, setFeedbackInboxCategoryFilter] = useState<'all' | 'bug' | 'feature_request' | 'ui_ux' | 'other'>('all');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [editData, setEditData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
    homeBase: user?.homeBase || user?.region || 'Jakarta Selatan, DKI Jakarta'
  });
  const feedbackCategories = [
    { value: 'bug' as const, label: 'Bug' },
    { value: 'feature_request' as const, label: 'Feature' },
    { value: 'ui_ux' as const, label: 'UI/UX' },
    { value: 'other' as const, label: 'Other' }
  ];
  const trimmedFeedbackMessage = feedbackMessage.trim();
  const canSubmitFeedback = trimmedFeedbackMessage.length > 0 && !isSubmittingFeedback;
  const accountEmail = (user?.email || '').trim().toLowerCase();
  const canSendPasswordReset = Boolean(accountEmail) && !isSubmittingPasswordReset;
  const isAdminUser = user?.role === 'admin' || isAdminEmail(accountEmail);
  const getFeedbackClientContext = () => {
    if (typeof window === 'undefined') {
      return {
        route: '/profile',
        displayMode: 'unknown',
        viewport: null,
        userAgent: '',
      };
    }

    return {
      route: window.location.pathname || '/profile',
      displayMode: window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: window.navigator.userAgent,
    };
  };

  const handleSaveProfile = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), editData, { merge: true });
      setUser(prev => ({ ...prev, ...editData }));
      setIsEditingProfile(false);
      addNotification('Profile Updated', 'Your profile information has been saved successfully.', 'system');
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };

  const resizeProfilePhoto = (file: File): Promise<{ blob: Blob; dataUrl: string }> => (
    new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();
      const cleanup = () => {
        URL.revokeObjectURL(image.src);
      };

      reader.onerror = () => reject(reader.error || new Error('Unable to read selected image.'));
      reader.onload = () => {
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          try {
            const maxSide = 640;
            const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Unable to prepare image canvas.');
            ctx.drawImage(image, 0, 0, width, height);

            const makeBlob = (quality: number): Promise<Blob> => (
              new Promise((blobResolve, blobReject) => {
                canvas.toBlob((blob) => {
                  if (blob) blobResolve(blob);
                  else blobReject(new Error('Unable to compress selected image.'));
                }, 'image/jpeg', quality);
              })
            );

            (async () => {
              let blob = await makeBlob(0.82);
              let quality = 0.72;
              while (blob.size > 850000 && quality >= 0.42) {
                blob = await makeBlob(quality);
                quality -= 0.1;
              }
              const dataUrl = canvas.toDataURL('image/jpeg', Math.max(quality + 0.1, 0.42));
              cleanup();
              resolve({ blob, dataUrl });
            })().catch((err) => {
              cleanup();
              reject(err);
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        image.onerror = () => {
          cleanup();
          reject(new Error('Selected file is not a readable image.'));
        };
        image.src = objectUrl;
      };
      reader.readAsArrayBuffer(file);
    })
  );

  const handleUploadProfilePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingPhoto) return;
    if (!user?.uid) {
      addNotification('Upload Photo', 'Please sign in again before updating your photo.', 'system');
      return;
    }
    if (!file.type.startsWith('image/')) {
      addNotification('Upload Photo', 'Please choose an image file.', 'system');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      addNotification('Upload Photo', 'Image is too large. Please choose a photo under 8 MB.', 'system');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const { blob, dataUrl } = await resizeProfilePhoto(file);
      let photoURL = dataUrl;

      try {
        const photoRef = storageRef(storage, `profile-photos/${user.uid}/avatar.jpg`);
        await uploadBytes(photoRef, blob, {
          contentType: 'image/jpeg',
          customMetadata: { ownerUid: user.uid }
        });
        photoURL = await getDownloadURL(photoRef);
      } catch (storageErr) {
        console.warn('Profile photo Storage upload failed, using Firestore data URL fallback:', storageErr);
        if (dataUrl.length > 880000) {
          throw new Error('Compressed image is too large for profile fallback storage.');
        }
      }

      const profilePayload = {
        photoURL,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', user.uid), profilePayload, { merge: true });
      if (auth.currentUser && auth.currentUser.uid === user.uid) {
        await updateProfile(auth.currentUser, { photoURL }).catch((authErr) => {
          console.warn('Auth profile photo sync failed:', authErr);
        });
      }
      setUser(prev => ({ ...prev, photoURL }));
      addNotification('Upload Photo', 'Your profile photo has been updated.', 'system');
    } catch (err) {
      console.error('Upload profile photo error:', err);
      addNotification('Upload Photo', 'Unable to update photo right now. Please try another image.', 'system');
    } finally {
      setIsUploadingPhoto(false);
    }
  };
  const [ssotStats, setSsotStats] = useState<{
    totalMatches?: number;
    wins?: number;
    losses?: number;
  } | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setSsotStats(null);
      return;
    }

    const statsRef = doc(db, PLAYER_STATS_COLLECTION, uid);
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSsotStats(null);
        return;
      }
      const data = snapshot.data() || {};
      setSsotStats({
        totalMatches: Number(data?.totalMatches),
        wins: Number(data?.wins),
        losses: Number(data?.losses)
      });
    }, (err) => {
      console.error('Profile stats sync error:', err);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!isAdminUser || !isFeedbackInboxOpen) {
      setFeedbackInboxItems([]);
      setIsFeedbackInboxLoading(false);
      return;
    }

    setIsFeedbackInboxLoading(true);
    const feedbackQuery = query(
      collection(db, 'feedback_submissions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      setFeedbackInboxItems(snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })));
      setIsFeedbackInboxLoading(false);
    }, (err) => {
      console.error('Feedback inbox sync error:', err);
      setIsFeedbackInboxLoading(false);
      addNotification('Feedback Inbox', 'Unable to load feedback right now.', 'system');
    });

    return () => unsubscribe();
  }, [addNotification, isAdminUser, isFeedbackInboxOpen]);

  const stats = useMemo(() => {
    const uid = user?.uid;
    const displayName = (user?.displayName || '').trim().toLowerCase();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    let matches = 0;
    let won = 0;
    let lost = 0;
    let draw = 0;
    let points = 0;
    let currentMonthWins = 0;
    let previousMonthWins = 0;

    const isCurrentUser = (player?: Player) => {
      if (!player) return false;
      if (uid && player.id === uid) return true;
      if (displayName && player.name?.trim().toLowerCase() === displayName) return true;
      return false;
    };

    tournaments.forEach((tournament) => {
      const tDateRaw = (tournament as any)?.date;
      const tDate = tDateRaw instanceof Date
        ? tDateRaw
        : (tDateRaw?.toDate ? tDateRaw.toDate() : new Date(tDateRaw));
      const hasValidDate = tDate instanceof Date && !Number.isNaN(tDate.getTime());
      const rounds = tournament.rounds || [];

      rounds.forEach((round) => {
        (round.matches || []).forEach((match) => {
          if (!match) return;
          const userInA = (match.teamA?.players || []).some((p) => isCurrentUser(p));
          const userInB = (match.teamB?.players || []).some((p) => isCurrentUser(p));
          if (!userInA && !userInB) return;

          const scoreA = Number(match.teamA?.score || 0);
          const scoreB = Number(match.teamB?.score || 0);
          const userScore = userInA ? scoreA : scoreB;
          const oppScore = userInA ? scoreB : scoreA;

          matches += 1;
          points += userScore;

          if (userScore > oppScore) {
            won += 1;
            if (hasValidDate) {
              const m = tDate.getMonth();
              const y = tDate.getFullYear();
              if (m === currentMonth && y === currentYear) currentMonthWins += 1;
              if (m === prevMonth && y === prevYear) previousMonthWins += 1;
            }
          } else if (userScore < oppScore) {
            lost += 1;
          } else {
            draw += 1;
          }
        });
      });
    });

    const ssotTotalMatches = Number(ssotStats?.totalMatches);
    const ssotWins = Number(ssotStats?.wins);
    const ssotLosses = Number(ssotStats?.losses);
    const resolvedMatches = Number.isFinite(ssotTotalMatches) && ssotTotalMatches >= 0
      ? ssotTotalMatches
      : matches;
    const resolvedWon = Number.isFinite(ssotWins) && ssotWins >= 0
      ? ssotWins
      : won;
    const resolvedLosses = Number.isFinite(ssotLosses) && ssotLosses >= 0
      ? ssotLosses
      : lost;
    const resolvedDraw = Math.max(0, resolvedMatches - resolvedWon - resolvedLosses);
    const winRate = resolvedMatches > 0 ? Math.round((resolvedWon / resolvedMatches) * 100) : 0;
    const winChangePercent = previousMonthWins > 0
      ? Math.round(((currentMonthWins - previousMonthWins) / previousMonthWins) * 100)
      : (currentMonthWins > 0 ? 100 : 0);

    return {
      matches: resolvedMatches,
      winRate,
      points,
      won: resolvedWon,
      lost: resolvedLosses,
      draw: resolvedDraw,
      currentMonthWins,
      previousMonthWins,
      winChangePercent
    };
  }, [tournaments, user?.uid, user?.displayName, ssotStats?.totalMatches, ssotStats?.wins, ssotStats?.losses]);

  const currentMmr = Number.isFinite(Number(user?.mmr)) ? Number(user.mmr) : 0;
  const rankInfo = getRankInfo(currentMmr);
  const rankProgress = Math.max(0, Math.min(100, Number.isFinite(rankInfo.progress) ? rankInfo.progress : 100));
  const nextRankDelta = rankInfo.nextRank ? Math.max(0, rankInfo.nextRank.min - currentMmr) : 0;
  const displayUsername = String(user?.username || 'user').trim() || 'user';
  const displayEmail = String(user?.email || '').trim();
  const getShortLocation = (value?: string) => (
    String(value || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)[0] || ''
  );
  const homeBaseLabel = getShortLocation(user?.homeBase || user?.region) || 'Jakarta';
  const activeZoneLabel = getShortLocation(user?.region);
  const profileMetaCards: { label: string; value: string; icon: LucideIcon; tone: 'warm' | 'neutral' }[] = [
    { label: 'Home Base', value: homeBaseLabel, icon: MapPin, tone: 'warm' },
  ];
  if (activeZoneLabel && activeZoneLabel !== homeBaseLabel) {
    profileMetaCards.push({ label: 'Active Zone', value: activeZoneLabel, icon: Building2, tone: 'neutral' });
  }
  const hasSingleProfileMeta = profileMetaCards.length === 1;
  const monthTrendValue = stats.currentMonthWins > 0 ? `${stats.currentMonthWins}` : '0';
  const monthTrendHelper = stats.previousMonthWins > 0
    ? `${stats.winChangePercent >= 0 ? '+' : ''}${stats.winChangePercent}% vs last month`
    : stats.currentMonthWins > 0
      ? 'First wins this month'
      : 'No wins recorded';
  const monthTrendTone = stats.winChangePercent > 0
    ? 'text-emerald-600'
    : stats.winChangePercent < 0
      ? 'text-error'
      : 'text-on-surface';

  const handleChangePassword = async () => {
    const email = (user?.email || '').trim().toLowerCase();
    if (!email) {
      addNotification('Change Password', 'Change password is coming soon.', 'system');
      return;
    }

    const providerIds = (user?.providerData || []).map((provider: { providerId?: string }) => provider?.providerId).filter(Boolean);
    if (providerIds.length > 0 && !providerIds.includes('password')) {
      addNotification('Change Password', `This account uses ${getProviderLabel(providerIds[0])}. There is no password to reset here.`, 'system');
      return;
    }

    setIsSubmittingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, email, getPasswordResetActionSettings());
      closeChangePasswordModal();
      addNotification('Change Password', 'Password reset link has been sent. Please check inbox, spam, or promotions.', 'system');
    } catch (err) {
      console.error('Change password request error:', err);
      addNotification('Change Password', 'Unable to send reset link right now. Please try again.', 'system');
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  };

  const handleComingSoon = (label: string) => {
    addNotification(label, `${label} is coming soon.`, 'system');
  };

  const resetFeedbackForm = () => {
    setFeedbackCategory('bug');
    setFeedbackMessage('');
  };

  const closeFeedbackModal = () => {
    if (isSubmittingFeedback) return;
    setIsFeedbackOpen(false);
    resetFeedbackForm();
  };

  const closeChangePasswordModal = () => {
    if (isSubmittingPasswordReset) return;
    setIsChangePasswordOpen(false);
  };

  const closeFeedbackInboxModal = () => {
    setIsFeedbackInboxOpen(false);
  };

  const formatFeedbackDate = (value: any) => {
    const date = value?.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFeedbackCategoryLabel = (value: string) => {
    if (value === 'feature_request') return 'Feature';
    if (value === 'ui_ux') return 'UI/UX';
    if (value === 'bug') return 'Bug';
    return 'Other';
  };

  const getFeedbackStatusLabel = (value: string) => {
    if (value === 'reviewed') return 'Reviewed';
    if (value === 'resolved') return 'Resolved';
    return 'New';
  };

  const getFeedbackStatusTone = (value: string) => {
    if (value === 'resolved') return 'bg-primary/10 text-primary';
    if (value === 'reviewed') return 'bg-ios-gray/12 text-on-surface/70';
    return 'bg-[#fff3ec] text-primary';
  };

  const filteredFeedbackInboxItems = useMemo(() => (
    feedbackInboxItems.filter((item) => {
      const statusMatch = feedbackInboxStatusFilter === 'all' || item.status === feedbackInboxStatusFilter;
      const categoryMatch = feedbackInboxCategoryFilter === 'all' || item.category === feedbackInboxCategoryFilter;
      return statusMatch && categoryMatch;
    })
  ), [feedbackInboxCategoryFilter, feedbackInboxItems, feedbackInboxStatusFilter]);

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: 'reviewed' | 'resolved') => {
    if (!isAdminUser) return;
    setUpdatingFeedbackId(feedbackId);
    try {
      await setDoc(doc(db, 'feedback_submissions', feedbackId), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      }, { merge: true });
      addNotification('Feedback Inbox', `Feedback marked as ${status}.`, 'system');
    } catch (err) {
      console.error('Feedback status update error:', err);
      addNotification('Feedback Inbox', 'Unable to update feedback status right now.', 'system');
    } finally {
      setUpdatingFeedbackId(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!trimmedFeedbackMessage) {
      addNotification('Give Feedback', 'Please write a short message before sending.', 'system');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const providerIds = (user?.providerData || [])
        .map((provider: { providerId?: string }) => provider?.providerId)
        .filter(Boolean);
      const clientContext = getFeedbackClientContext();
      await addDoc(collection(db, 'feedback_submissions'), {
        uid: user?.uid || null,
        displayName: user?.displayName || '',
        username: user?.username || '',
        email: user?.email || '',
        category: feedbackCategory,
        message: trimmedFeedbackMessage,
        screen: 'profile',
        source: 'profile_settings',
        status: 'new',
        appVersion: '1.2.0-beta',
        providerIds,
        clientTimestamp: new Date().toISOString(),
        route: clientContext.route,
        displayMode: clientContext.displayMode,
        viewport: clientContext.viewport,
        userAgent: clientContext.userAgent,
        context: {
          mmr: currentMmr,
          totalMatches: stats.matches,
          winRate: stats.winRate,
        },
        createdAt: serverTimestamp()
      });
      closeFeedbackModal();
      addNotification('Give Feedback', 'Thanks, feedback kamu sudah terkirim.', 'system');
    } catch (err) {
      console.error('Feedback submit error:', err);
      addNotification('Give Feedback', 'Unable to send feedback right now. Please try again.', 'system');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const accountItems = [
    { label: 'Change Password', icon: Lock, onClick: () => setIsChangePasswordOpen(true), tone: 'default' as const },
    { label: 'Privacy Policy', icon: Globe, onClick: () => handleComingSoon('Privacy Policy'), tone: 'default' as const },
    { label: 'FAQ', icon: CircleHelp, onClick: () => handleComingSoon('FAQ'), tone: 'default' as const },
  ];
  const supportItems = [
    { label: 'Give Feedback', icon: Mail, onClick: () => { resetFeedbackForm(); setIsFeedbackOpen(true); }, tone: 'default' as const }
  ];
  const adminItems = isAdminUser
    ? [{ label: 'Feedback Inbox', icon: Inbox, onClick: () => setIsFeedbackInboxOpen(true), tone: 'default' as const }]
    : [];
  const settingsSections = [
    {
      label: 'Account',
      description: '',
      items: [
        { label: 'Edit Profile', icon: Edit3, onClick: () => setIsEditingProfile(true), tone: 'default' as const },
        { label: 'Friends', icon: Users, onClick: onOpenFriends, tone: 'default' as const },
        ...accountItems
      ],
    },
    {
      label: 'Support',
      description: '',
      items: supportItems,
    },
    ...(adminItems.length > 0
      ? [{
        label: 'Admin',
        description: '',
        items: adminItems,
      }]
      : []),
  ];
  const renderActionRow = (
    { label, icon: Icon, onClick, tone }: { label: string; icon: LucideIcon; onClick: () => void; tone: 'default' | 'danger' }
  ) => (
    <button
      key={label}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 bg-transparent px-4 py-2.5 text-left tap-target transition-colors active:bg-surface"
    >
      <span className="inline-flex items-center gap-3 min-w-0">
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          tone === 'danger'
            ? 'border-error/12 bg-error/[0.04] text-error/85'
            : 'border-black/5 bg-surface text-on-surface/58'
        )}>
          <Icon size={15} />
        </span>
        <span
          className={cn(
            'text-[13px] font-semibold tracking-[-0.014em] truncate',
            tone === 'danger' ? 'text-error' : 'text-on-surface'
          )}
        >
          {label}
        </span>
      </span>
      <ChevronRight
        size={15}
        className={cn(
          'shrink-0',
          tone === 'danger' ? 'text-error/35' : 'text-ios-gray/40'
        )}
      />
    </button>
  );

  return (
    <div className="ios-page pb-[calc(var(--app-safe-bottom,0px)+124px)]">
      <main className="mx-auto max-w-2xl space-y-4.5 px-4 pt-5 sm:space-y-5 sm:pt-8">
        <section className="relative overflow-hidden rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_10px_26px_rgba(17,24,39,0.045)] sm:rounded-[30px] sm:p-5">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent sm:h-28" />
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/[0.05] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex rounded-full border border-primary/10 bg-primary/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary/88">
                    Player Profile
                  </span>
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    aria-label="Open notifications"
                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-white text-on-surface/68 tap-target active:bg-surface"
                  >
                    <Bell size={14} className="text-on-surface/64" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border border-white bg-error" />
                    )}
                  </button>
                </div>
                <h2 className="mt-3 text-[30px] leading-[0.98] font-display font-black tracking-[-0.045em] text-on-surface sm:text-[38px]">
                  {user?.displayName || 'Padel Player'}
                </h2>
                <p className="mt-1.5 text-[14px] font-semibold tracking-tight text-on-surface/66 sm:mt-2">
                  @{displayUsername}
                </p>
                <div className="mt-3">
                  {displayEmail && (
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-medium text-ios-gray sm:py-2 sm:text-[12px]">
                      <Mail size={13} className="shrink-0 text-primary/62" />
                      <span className="truncate">{displayEmail}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative shrink-0">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleUploadProfilePhoto}
                />
                <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[24px] border border-black/5 bg-surface sm:h-[88px] sm:w-[88px] sm:rounded-[26px]">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={38} className="text-ios-gray/32 sm:hidden" />
                  )}
                  {!user?.photoURL && (
                    <User size={42} className="hidden text-ios-gray/32 sm:block" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  aria-label="Upload profile photo"
                  className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-[0_8px_16px_rgba(230,94,20,0.16)] tap-target disabled:cursor-wait disabled:opacity-70 sm:-bottom-2 sm:-right-2 sm:h-9 sm:w-9"
                >
                  {isUploadingPhoto ? (
                    <RefreshCw size={12} className="animate-spin sm:hidden" />
                  ) : (
                    <Camera size={12} className="sm:hidden" />
                  )}
                  {isUploadingPhoto ? (
                    <RefreshCw size={13} className="hidden animate-spin sm:block" />
                  ) : (
                    <Camera size={13} className="hidden sm:block" />
                  )}
                </button>
              </div>
            </div>

            <div className={cn(
              'mt-5 grid gap-3 sm:mt-5.5',
              hasSingleProfileMeta ? 'grid-cols-1' : 'grid-cols-2'
            )}>
              {profileMetaCards.map(({ label, value, icon: Icon, tone }) => (
                <div
                  key={label}
                  className={cn(
                    'min-w-0 rounded-[20px] border px-3.5 py-3 sm:px-4 sm:py-3.5',
                    tone === 'warm'
                      ? 'border-primary/10 bg-primary/[0.03]'
                      : 'border-black/5 bg-surface'
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-tight text-ios-gray">
                    <Icon size={13} className={tone === 'warm' ? 'text-primary/75' : 'text-ios-gray/70'} />
                    <span>{label}</span>
                  </div>
                  <p className="mt-1 truncate text-[13px] font-semibold tracking-tight text-on-surface sm:mt-1.5 sm:text-[14px]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_10px_26px_rgba(17,24,39,0.04)] sm:rounded-[30px] sm:p-5">
          <div>
            <div>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">
                Match Performance
              </h3>
            </div>
          </div>

          <div className="mt-4.5 rounded-[24px] border border-primary/10 bg-primary/[0.03] p-4 sm:mt-5 sm:p-4.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">Current MMR</p>
                <p className="mt-2 text-[38px] leading-none font-display font-black tracking-[-0.05em] text-on-surface tabular-nums sm:text-[40px]">
                  {currentMmr.toLocaleString()}
                </p>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-on-surface/68">
                  {rankInfo.nextRank
                    ? `${nextRankDelta.toLocaleString()} MMR to reach ${rankInfo.nextRank.name}.`
                    : 'You are already at the highest published tier.'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenMmrHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-tight text-primary tap-target active:text-primary/80"
                >
                  History
                  <ChevronRight size={12} />
                </button>
                <div className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/5">
                  <RankBadge mmr={currentMmr} size="sm" />
                </div>
              </div>
            </div>

            <div className="mt-4.5">
              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-tight text-ios-gray sm:text-[11px]">
                <span>{rankInfo.name}</span>
                <span>{rankInfo.nextRank ? rankInfo.nextRank.name : 'Maxed Out'}</span>
              </div>
              <div className="h-2 rounded-full bg-primary/[0.10]">
                <div
                  className="h-full rounded-full bg-primary/95 transition-[width]"
                  style={{ width: `${rankProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <div className="min-h-[88px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Matches</p>
              <p className="mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] text-on-surface tabular-nums">
                {stats.matches}
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                {stats.won}W • {stats.lost}L • {stats.draw}D
              </p>
            </div>
            <div className="min-h-[88px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Win Rate</p>
              <p className="mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] text-emerald-600 tabular-nums">
                {stats.winRate}%
              </p>
              <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                {stats.points} total points
              </p>
            </div>
            <div className="col-span-2 min-h-[84px] rounded-[22px] border border-black/5 bg-surface px-3.5 py-3 sm:px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">This Month</p>
                  <p className={cn('mt-1 text-[24px] leading-none font-display font-black tracking-[-0.04em] tabular-nums', monthTrendTone)}>
                    {monthTrendValue}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium tracking-tight text-ios-gray">
                    {monthTrendHelper}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white">
                  <TrendingUp size={17} className={monthTrendTone} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/5 bg-white p-2.5 shadow-[0_10px_26px_rgba(17,24,39,0.04)] sm:rounded-[30px] sm:p-3.5">
          <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white">
            {settingsSections.map((section, index) => (
              <div key={section.label} className={cn(index > 0 && 'border-t border-black/5')}>
                <div className={cn('px-4 pt-3', section.description ? 'pb-1.5' : 'pb-2')}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">{section.label}</p>
                  {section.description && (
                    <p className="mt-1 text-[12px] leading-[1.5] text-ios-gray">{section.description}</p>
                  )}
                </div>
                <div className="overflow-hidden bg-white">
                  <div className="divide-y divide-black/5">
                    {section.items.map(renderActionRow)}
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-black/5">
              <div className="px-4 pb-2 pt-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ios-gray">Session</p>
              </div>
              <div className="bg-white">
                {renderActionRow({ label: 'Sign Out', icon: LogOut, onClick: onLogout, tone: 'danger' })}
              </div>
            </div>
          </div>
        </section>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isChangePasswordOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeChangePasswordModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Change Password</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Kami akan kirim reset link ke email akun kamu.</p>
                  </div>
                  <button
                    onClick={closeChangePasswordModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="rounded-3xl bg-ios-gray/5 border border-ios-gray/10 px-4 py-3 mb-5">
                  <p className="text-[10px] font-black text-ios-gray uppercase tracking-[0.16em] mb-1">Email</p>
                  <p className="text-[14px] font-semibold text-on-surface break-all">
                    {user?.email || 'No email connected'}
                  </p>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={!canSendPasswordReset}
                  className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 tap-target disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
                >
                  {isSubmittingPasswordReset ? 'Sending...' : 'Send Reset Link'}
                </button>
              </motion.div>
            </div>
          )}
          {isFeedbackOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeFeedbackModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Give Feedback</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Punya bug, ide, atau masukan? Tulis singkat aja.</p>
                  </div>
                  <button
                    onClick={closeFeedbackModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {feedbackCategories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setFeedbackCategory(category.value)}
                      className={cn(
                        'px-3 py-2 rounded-full text-[12px] font-bold tap-target transition-all',
                        feedbackCategory === category.value
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <div className="mb-5">
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    rows={4}
                    placeholder="Contoh: tombol save kadang tidak responsif"
                    className="w-full resize-none bg-ios-gray/5 border border-ios-gray/10 rounded-3xl px-4 py-3 text-[14px] text-on-surface font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  disabled={!canSubmitFeedback}
                  className="w-full h-12 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 tap-target disabled:opacity-60 disabled:shadow-none disabled:active:scale-100"
                >
                  {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
                </button>
              </motion.div>
            </div>
          )}
          {isFeedbackInboxOpen && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeFeedbackInboxModal}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-lg bg-white rounded-[32px] p-6 shadow-2xl max-h-[82vh] flex flex-col"
              >
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div>
                    <h3 className="text-[22px] font-bold tracking-tight text-on-surface">Feedback Inbox</h3>
                    <p className="text-[13px] text-ios-gray mt-1">Masukan terbaru dari user FOM Play.</p>
                  </div>
                  <button
                    onClick={closeFeedbackInboxModal}
                    className="p-2 bg-ios-gray/5 rounded-full tap-target"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'new', 'reviewed', 'resolved'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setFeedbackInboxStatusFilter(status)}
                          className={cn(
                            'px-3 py-2 rounded-full text-[11px] font-bold tap-target transition-all',
                            feedbackInboxStatusFilter === status
                              ? 'bg-primary text-white shadow-lg shadow-primary/20'
                              : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                          )}
                        >
                          {status === 'all' ? 'All Status' : getFeedbackStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([{ value: 'all', label: 'All Type' }, ...feedbackCategories.map((category) => ({ value: category.value, label: category.label }))] as const).map((category) => (
                        <button
                          key={category.value}
                          onClick={() => setFeedbackInboxCategoryFilter(category.value)}
                          className={cn(
                            'px-3 py-2 rounded-full text-[11px] font-bold tap-target transition-all',
                            feedbackInboxCategoryFilter === category.value
                              ? 'bg-on-surface text-white'
                              : 'bg-ios-gray/5 text-on-surface border border-ios-gray/10'
                          )}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isFeedbackInboxLoading ? (
                    <div className="rounded-3xl bg-ios-gray/5 px-4 py-8 text-center">
                      <p className="text-[13px] font-semibold text-ios-gray">Loading feedback...</p>
                    </div>
                  ) : filteredFeedbackInboxItems.length === 0 ? (
                    <div className="rounded-3xl bg-ios-gray/5 px-4 py-8 text-center">
                      <Inbox size={24} className="mx-auto text-ios-gray/35 mb-2" />
                      <p className="text-[13px] font-semibold text-on-surface">Belum ada feedback yang cocok dengan filter ini.</p>
                    </div>
                  ) : (
                    filteredFeedbackInboxItems.map((item) => (
                      <article key={item.id} className="rounded-[24px] bg-ios-gray/5 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-on-surface truncate">
                              {item.displayName || item.username || item.email || 'Unknown user'}
                            </p>
                            <p className="text-[12px] text-ios-gray truncate">
                              {item.email || '@' + (item.username || 'unknown')}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                            {getFeedbackCategoryLabel(item.category)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]', getFeedbackStatusTone(item.status || 'new'))}>
                            {getFeedbackStatusLabel(item.status || 'new')}
                          </span>
                        </div>
                        <p className="mt-3 text-[14px] leading-relaxed text-on-surface">
                          {item.message || '-'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdateFeedbackStatus(item.id, 'reviewed')}
                            disabled={updatingFeedbackId === item.id || item.status === 'reviewed' || item.status === 'resolved'}
                            className="h-8 px-3 rounded-full bg-white text-[11px] font-bold text-on-surface border border-ios-gray/10 tap-target disabled:opacity-50"
                          >
                            {updatingFeedbackId === item.id ? 'Updating...' : 'Mark Reviewed'}
                          </button>
                          <button
                            onClick={() => handleUpdateFeedbackStatus(item.id, 'resolved')}
                            disabled={updatingFeedbackId === item.id || item.status === 'resolved'}
                            className="h-8 px-3 rounded-full bg-primary text-[11px] font-bold text-white tap-target disabled:opacity-50"
                          >
                            {updatingFeedbackId === item.id ? 'Updating...' : 'Mark Resolved'}
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ios-gray">
                          <span className="truncate">
                            {item.source === 'profile_settings' ? 'Profile Settings' : item.source || 'Unknown source'}
                          </span>
                          <span className="shrink-0">
                            {formatFeedbackDate(item.createdAt || item.clientTimestamp)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
          {isEditingProfile && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditingProfile(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Edit Profile</h3>
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-ios-gray/5 rounded-full tap-target">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={editData.displayName}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Username</label>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Home Base</label>
                    <button
                      onClick={() => setIsRegionSelectorOpen(true)}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-left text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between"
                    >
                      <span className={editData.homeBase ? "text-on-surface" : "text-ios-gray"}>
                        {editData.homeBase || 'Select Region'}
                      </span>
                      <MapPin size={18} className="text-ios-gray" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 tap-target"
                >
                  Save Changes
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <RegionSelector
          isOpen={isRegionSelectorOpen}
          onClose={() => setIsRegionSelectorOpen(false)}
          onSelect={(region) => setEditData({ ...editData, homeBase: region })}
          currentValue={editData.homeBase}
        />
        <section className="pb-0 pt-2">
          <p className="text-center text-[10px] text-ios-gray/35 font-medium tracking-[0.02em]">FOM Play VERSION 1.2.0 (BETA)</p>
        </section>
      </main>
    </div>
  );
};

const RankDiscoveryScreen = ({ currentUser, onBack, onOpenMmrHistory }: { currentUser: any; onBack: () => void; onOpenMmrHistory: () => void }) => {
  const mmrScenarios: { label: string; detail: string; value: string; valueClass: string; rowClass?: string }[] = [
    { label: 'Draw', detail: 'Match ends level', value: '0', valueClass: 'text-ios-gray' },
    { label: 'Standard win', detail: 'Point gap of 1-9', value: '+25', valueClass: 'text-emerald-600' },
    { label: 'Dominant win', detail: 'Point gap of 10+', value: '+40', valueClass: 'text-emerald-700' },
    { label: 'Standard loss', detail: 'Point gap of 1-9', value: '-20', valueClass: 'text-error' },
    { label: 'Heavy loss', detail: 'Point gap of 10+', value: '-35', valueClass: 'text-red-700' },
    { label: 'Underdog bonus', detail: 'Win with a lower pre-match team average MMR', value: '+15', valueClass: 'text-primary', rowClass: 'bg-primary/[0.045]' },
    { label: 'Favorite penalty', detail: 'Lose with a higher pre-match team average MMR', value: '-15', valueClass: 'text-error', rowClass: 'bg-error/[0.045]' },
  ];
  const currentMmr = Number.isFinite(Number(currentUser?.mmr)) ? Number(currentUser.mmr) : 0;
  const currentMatches = Number.isFinite(Number(currentUser?.totalMatches)) ? Number(currentUser.totalMatches) : 0;
  const currentRank = getRankInfo(currentMmr);
  const hasNextTier = Boolean(currentRank.nextRank);
  const pointsToNext = hasNextTier ? Math.max(0, currentRank.nextRank!.min - currentMmr) : 0;
  const nextTierLabel = currentRank.nextRank?.name || 'Max Reached';

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="ios-blur sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-ios-gray/10 px-4">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="ml-2 flex-1 text-[17px] font-bold tracking-tight text-on-surface">Ranking System</h1>
      </header>

      <main className="mx-auto max-w-2xl p-3.5">
        <section className="mb-3 rounded-[24px] border border-black/5 bg-white px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-[21px] leading-tight font-display font-black tracking-tight text-on-surface">
              How MMR Works
            </h2>
            <p className="mt-2 max-w-md text-[13px] font-medium leading-relaxed text-ios-gray">
              Your rating changes after each finalized match based on result, score margin, and pre-match team strength.
            </p>
          </div>

          <div className="mt-4 rounded-[22px] border border-black/5 bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Current Rating</p>
                <p className="mt-1 text-[28px] leading-none font-display font-black italic tracking-tight text-on-surface">
                  {currentMmr.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <RankBadge mmr={currentMmr} size="sm" />
                  <span className="text-[11px] font-semibold tracking-tight text-ios-gray">MMR</span>
                </div>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-ios-gray">
                  {currentRank.nextRank
                    ? `${pointsToNext.toLocaleString()} more MMR to reach ${currentRank.nextRank.name}.`
                    : 'You are already at the highest published tier.'}
                </p>
              </div>
              <div className="shrink-0 rounded-[18px] border border-black/5 bg-white px-3 py-2 text-right">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Next Tier</p>
                <p className="mt-1 text-[18px] leading-none font-display font-black tracking-tight text-on-surface">
                  {nextTierLabel}
                </p>
                <p className="mt-1 text-[11px] font-medium text-ios-gray">
                  {hasNextTier ? `${pointsToNext.toLocaleString()} to go` : 'Highest published tier'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[18px] border border-black/5 bg-white px-3 py-3">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Matches</p>
                <p className="mt-1 text-[19px] leading-none font-display font-black tracking-tight text-on-surface">
                  {currentMatches}
                </p>
              </div>
              <div className="rounded-[18px] border border-black/5 bg-white px-3 py-3">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Rules</p>
                <p className="mt-1 text-[13px] font-semibold text-on-surface">Per player • Auto finalize</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col items-start gap-2.5 rounded-[18px] border border-black/5 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-[12px] font-medium leading-relaxed text-ios-gray">
                Team matchup strength uses the average MMR of both teams before the match starts.
              </p>
              <button
                type="button"
                onClick={onOpenMmrHistory}
                className="shrink-0 rounded-full border border-black/5 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray transition-colors active:bg-surface"
              >
                MMR History
              </button>
            </div>
          </div>
        </section>

        <section className="mb-3">
          <div className="mb-2.5">
            <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Core Outcomes</p>
            <h2 className="mt-0.5 text-[18px] font-bold tracking-tight text-on-surface">What Changes Your Score</h2>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-ios-gray">
              These are the core match outcomes that move your personal MMR after a session is finalized.
            </p>
          </div>

          <div className="space-y-2">
            {mmrScenarios.map((scenario) => (
              <div
                key={scenario.label}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3',
                  scenario.rowClass
                )}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-tight text-on-surface">{scenario.label}</p>
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-ios-gray">{scenario.detail}</p>
                </div>
                <div className={cn('shrink-0 text-[22px] leading-none font-display font-black italic tracking-tight', scenario.valueClass)}>
                  {scenario.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/[0.045] px-4 py-3">
            <p className="text-[11px] font-semibold tracking-tight text-primary">Important</p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-on-surface/76">
              Upset bonus and favorite penalty are decided from the average MMR of both teams before the match starts, not from the live leaderboard position after the match ends.
            </p>
          </div>
        </section>

        <section className="mb-3">
          <div className="mb-2.5">
            <div>
              <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Tier Ladder</p>
              <p className="mt-0.5 text-[13px] font-semibold text-ios-gray">Each tier unlocks as your MMR climbs.</p>
            </div>
          </div>

          <div className="space-y-2">
            {RANK_TIERS.map((rank, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border border-black/5", rank.color)}>
                    <rank.icon size={24} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-on-surface">{rank.name}</h4>
                    <p className="text-[13px] font-medium text-ios-gray">
                      {rank.min} - {rank.max === Infinity ? '∞' : rank.max} MMR
                    </p>
                  </div>
                </div>
                {rank.name === 'Hall of Fame' && (
                  <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    Top 100 Only
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const MMRHistoryScreen = ({ currentUser, onBack, onOpenRankDetails }: { currentUser: any; onBack: () => void; onOpenRankDetails: () => void }) => {
  const uid = String(currentUser?.uid || '').trim();
  const currentMmr = Number.isFinite(Number(currentUser?.mmr)) ? Number(currentUser.mmr) : 0;
  const currentRank = getRankInfo(currentMmr);
  const [entries, setEntries] = useState<PlayerMatchLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [rangeFilter, setRangeFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setIsLoading(false);
      setLoadError('');
      return;
    }

    setIsLoading(true);
    setLoadError('');
    const unsubscribe = onSnapshot(
      query(collection(db, PLAYER_MATCH_LEDGER_COLLECTION), where('uid', '==', uid)),
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as PlayerMatchLedgerEntry))
          .sort((a, b) => {
            const aMillis = getLedgerEntryTimestamp(a)?.getTime() || 0;
            const bMillis = getLedgerEntryTimestamp(b)?.getTime() || 0;
            return bMillis - aMillis;
          });

        setEntries(nextEntries);
        setIsLoading(false);
      },
      (error) => {
        console.error('MMR history sync error:', error);
        setEntries([]);
        setLoadError('Unable to load your MMR history right now.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const rangeOptions: { value: '7d' | '30d' | 'all'; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: 'all', label: 'All' },
  ];
  const resultOptions: { value: 'all' | 'win' | 'loss' | 'draw'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'win', label: 'Wins' },
    { value: 'loss', label: 'Losses' },
    { value: 'draw', label: 'Draws' },
  ];

  const summary = useMemo(() => {
    const nowMs = Date.now();
    const cutoff7d = nowMs - (7 * 24 * 60 * 60 * 1000);
    const cutoff30d = nowMs - (30 * 24 * 60 * 60 * 1000);
    let delta7d = 0;
    let delta30d = 0;

    entries.forEach((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry)?.getTime() || 0;
      const delta = Number(entry.deltaMmr || 0);
      if (timestamp >= cutoff7d) delta7d += delta;
      if (timestamp >= cutoff30d) delta30d += delta;
    });

    return {
      delta7d,
      delta30d,
      totalMatches: entries.length,
      lastEntry: entries[0] || null
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const nowMs = Date.now();
    const cutoffMs = rangeFilter === '7d'
      ? nowMs - (7 * 24 * 60 * 60 * 1000)
      : rangeFilter === '30d'
        ? nowMs - (30 * 24 * 60 * 60 * 1000)
        : 0;

    return entries.filter((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry)?.getTime() || 0;
      const matchesRange = rangeFilter === 'all' || timestamp >= cutoffMs;
      const matchesResult = resultFilter === 'all' || entry.result === resultFilter;
      return matchesRange && matchesResult;
    });
  }, [entries, rangeFilter, resultFilter]);

  const groupedEntries = useMemo(() => {
    const groups: { label: string; key: string; items: PlayerMatchLedgerEntry[] }[] = [];
    filteredEntries.forEach((entry) => {
      const timestamp = getLedgerEntryTimestamp(entry);
      const key = timestamp
        ? `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`
        : 'unknown';
      const existingGroup = groups.find((group) => group.key === key);
      if (existingGroup) {
        existingGroup.items.push(entry);
        return;
      }
      groups.push({
        key,
        label: getLedgerGroupLabel(timestamp),
        items: [entry]
      });
    });
    return groups;
  }, [filteredEntries]);
  const visibleEntryCount = filteredEntries.length;
  const activeFilterCount = (rangeFilter !== '30d' ? 1 : 0) + (resultFilter !== 'all' ? 1 : 0);
  const selectedRangeLabel = rangeOptions.find((option) => option.value === rangeFilter)?.label || '30D';
  const selectedResultLabel = resultOptions.find((option) => option.value === resultFilter)?.label || 'All';
  const resetFilters = () => {
    setRangeFilter('30d');
    setResultFilter('all');
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="ios-blur sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-ios-gray/10 px-4">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="ml-2 flex-1 text-[17px] font-bold tracking-tight text-on-surface">MMR History</h1>
        <div className="w-8" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-2xl p-3.5 space-y-3">
        <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[20px] leading-tight font-display font-black italic tracking-tight text-on-surface">
                Your MMR
              </h2>
              <p className="mt-1 text-[13px] font-medium leading-relaxed text-ios-gray">
                Current rating and recent trend.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenRankDetails}
              className="shrink-0 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-medium tracking-tight text-ios-gray transition-colors active:bg-white"
            >
              Ranking Guide
            </button>
          </div>

          <div className="mt-3 rounded-[22px] border border-black/[0.045] bg-[#f7f7f9] px-3.5 py-3">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Current Rating</p>
                <p className="mt-1 text-[31px] leading-none font-display font-black italic tracking-tight tabular-nums text-on-surface">
                  {currentMmr.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <RankBadge mmr={currentMmr} size="sm" />
                  <span className="text-[11px] font-semibold tracking-tight text-ios-gray">MMR</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Latest Change</p>
                <p className={cn(
                  'mt-1 text-[24px] leading-none font-display font-black italic tracking-tight tabular-nums',
                  Number(summary.lastEntry?.deltaMmr || 0) > 0
                    ? 'text-emerald-600'
                    : Number(summary.lastEntry?.deltaMmr || 0) < 0
                      ? 'text-error'
                      : 'text-on-surface'
                )}>
                  {summary.lastEntry ? formatMmrDelta(summary.lastEntry.deltaMmr) : '0'}
                </p>
                <p className="mt-1 text-[11px] font-medium text-ios-gray">
                  {summary.lastEntry ? formatLedgerEntryDate(getLedgerEntryTimestamp(summary.lastEntry)) : 'No matches yet'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-[18px] border border-black/[0.045] bg-white px-3 py-3">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">7D</p>
                <p className={cn(
                  'mt-1 text-[19px] leading-none font-display font-black italic tracking-tight tabular-nums',
                  summary.delta7d > 0 ? 'text-emerald-600' : summary.delta7d < 0 ? 'text-error' : 'text-on-surface'
                )}>
                  {formatMmrDelta(summary.delta7d)}
                </p>
              </div>
              <div className="rounded-[18px] border border-black/[0.045] bg-white px-3 py-3">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">30D</p>
                <p className={cn(
                  'mt-1 text-[19px] leading-none font-display font-black italic tracking-tight tabular-nums',
                  summary.delta30d > 0 ? 'text-emerald-600' : summary.delta30d < 0 ? 'text-error' : 'text-on-surface'
                )}>
                  {formatMmrDelta(summary.delta30d)}
                </p>
              </div>
              <div className="rounded-[18px] border border-black/[0.045] bg-white px-3 py-3">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Matches</p>
                <p className="mt-1 text-[19px] leading-none font-display font-black italic tracking-tight tabular-nums text-on-surface">
                  {summary.totalMatches}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center gap-3 px-1 pt-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <p className="shrink-0 text-[11px] font-semibold tracking-tight text-ios-gray/78">History</p>
            {activeFilterCount > 0 && (
              <p className="truncate text-[11px] font-medium text-ios-gray">
                {selectedRangeLabel} • {selectedResultLabel}
              </p>
            )}
            <div className="h-px flex-1 bg-black/5" />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 text-[11px] font-semibold tracking-tight text-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors active:bg-surface"
          >
            <SlidersHorizontal size={15} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </section>

        {isLoading && (
          <section className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-[22px] border border-black/5 bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-[82px] rounded-[18px] bg-ios-gray/10" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-28 rounded-full bg-ios-gray/10" />
                    <div className="mt-2 h-4 w-full rounded-full bg-ios-gray/10" />
                    <div className="mt-2 h-4 w-3/4 rounded-full bg-ios-gray/10" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!isLoading && loadError && (
          <section className="rounded-2xl border border-error/10 bg-white px-4 py-5">
            <p className="text-[13px] font-semibold text-error">{loadError}</p>
          </section>
        )}

        {!isLoading && !loadError && groupedEntries.length === 0 && (
          <section className="rounded-2xl border border-black/5 bg-white px-4 py-5">
            <p className="text-[14px] font-semibold text-on-surface">No MMR entries yet</p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-ios-gray">
              Your match-by-match rating timeline will appear after completed sessions finish syncing.
            </p>
          </section>
        )}

        {!isLoading && !loadError && groupedEntries.length > 0 && (
          <section className="space-y-2.5">
            {groupedEntries.map((group) => (
              <div key={group.key}>
                <div className="mb-1.5 px-1">
                  <p className="text-[11px] font-semibold tracking-tight text-ios-gray">{group.label}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((entry) => {
                    const delta = Number(entry.deltaMmr || 0);
                    const scoreLabel = Number.isFinite(Number(entry.scoreFor)) && Number.isFinite(Number(entry.scoreAgainst))
                      ? `${Number(entry.scoreFor)}-${Number(entry.scoreAgainst)}`
                      : 'No score';
                    const mmrBefore = Number(entry.mmrBefore);
                    const mmrAfter = Number(entry.mmrAfter);
                    const hasMmrSnapshot = Number.isFinite(mmrBefore) && Number.isFinite(mmrAfter);
                    const resultLabel = entry.result === 'win'
                      ? 'Win'
                      : entry.result === 'loss'
                        ? 'Loss'
                        : 'Draw';
                    const detailLabels = [entry.reasonLabel, entry.modifierLabel].filter(Boolean) as string[];

                    return (
                      <div key={entry.id} className="rounded-[22px] border border-black/5 bg-white px-3 py-3">
                        <div className="flex gap-2.5">
                          <div className={cn(
                            'flex w-[78px] shrink-0 flex-col items-center justify-center rounded-[17px] border px-2 py-2.5 text-center',
                            delta > 0
                              ? 'border-emerald-500/10 bg-emerald-500/[0.055]'
                              : delta < 0
                                ? 'border-error/10 bg-error/[0.045]'
                                : 'border-black/5 bg-surface'
                          )}>
                            <p className={cn(
                              'text-[25px] leading-none font-display font-black italic tracking-tight tabular-nums',
                              delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-error' : 'text-on-surface'
                            )}>
                              {formatMmrDelta(delta)}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold tracking-tight text-ios-gray">MMR</p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-bold leading-tight text-on-surface">
                                  {entry.tournamentName || 'Finalized Match'}
                                </p>
                                <p className="mt-0.5 text-[12px] font-medium text-ios-gray">
                                  {formatLedgerEntryDate(getLedgerEntryTimestamp(entry))}
                                </p>
                              </div>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={cn(
                                'rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-tight',
                                entry.result === 'win'
                                  ? 'bg-emerald-500/10 text-emerald-700'
                                  : entry.result === 'loss'
                                    ? 'bg-error/10 text-error'
                                    : 'bg-ios-gray/10 text-ios-gray'
                              )}>
                                {resultLabel}
                              </span>
                              <span className="rounded-full border border-black/5 bg-surface px-2.5 py-1 text-[10px] font-semibold tracking-tight tabular-nums text-on-surface">
                                {scoreLabel}
                              </span>
                            </div>

                            {detailLabels.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] font-semibold">
                                {entry.reasonLabel && (
                                  <span className="text-ios-gray">{entry.reasonLabel}</span>
                                )}
                                {entry.reasonLabel && entry.modifierLabel && (
                                  <span className="text-ios-gray/38">•</span>
                                )}
                                {entry.modifierLabel && (
                                  <span className={cn(
                                    entry.modifierDeltaMmr && entry.modifierDeltaMmr > 0
                                      ? 'text-primary'
                                      : 'text-error'
                                  )}>
                                    {entry.modifierLabel}
                                  </span>
                                )}
                              </div>
                            )}

                            {(entry.teamSummary || entry.opponentSummary) && (
                              <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-ios-gray">
                                {entry.teamSummary || 'Your team'} vs {entry.opponentSummary || 'Opponent'}
                              </p>
                            )}

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {hasMmrSnapshot && (
                                <span className="rounded-full border border-black/5 bg-surface px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-on-surface">
                                  {mmrBefore.toLocaleString()} to {mmrAfter.toLocaleString()} MMR
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="relative w-full max-w-lg rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl sm:max-w-md sm:rounded-[32px] sm:px-6"
            >
              <div className="mx-auto h-1.5 w-14 rounded-full bg-ios-gray/20" />

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-bold tracking-tight text-on-surface">Filter</h3>
                  <p className="mt-1 text-[13px] font-medium text-ios-gray">Choose the timeline view you want to see.</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[12px] font-bold text-primary tap-target"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-surface tap-target"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <section>
                  <h4 className="text-[13px] font-bold tracking-tight text-on-surface">Range</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rangeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRangeFilter(option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                          rangeFilter === option.value
                            ? 'border-primary/15 bg-primary/10 text-primary'
                            : 'border-[#cad3e4] bg-white text-[#667085]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[13px] font-bold tracking-tight text-on-surface">Result</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setResultFilter(option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                          resultFilter === option.value
                            ? 'border-primary/15 bg-primary/10 text-primary'
                            : 'border-[#cad3e4] bg-white text-[#667085]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FriendsScreen = ({ currentUser, onBack, addNotification, pickerMode = false, selectedPlayerIds = [], onTogglePickForMatch, onDonePick }: {
  currentUser: any,
  onBack: () => void,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void,
  pickerMode?: boolean,
  selectedPlayerIds?: string[],
  onTogglePickForMatch?: (friend: Friend) => void,
  onDonePick?: () => void
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequestStatuses, setOutgoingRequestStatuses] = useState<Record<string, FriendRequestStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const sortFriendsByName = (items: Friend[]) =>
    [...items].sort((a, b) => (a?.displayName || '').localeCompare(b?.displayName || '', undefined, { sensitivity: 'base' }));

  useEffect(() => {
    // Prevent inherited scroll position from previous screen so search is visible on first open.
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    setFriends([]);
    setLoading(true);

    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'friends'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFriends: Friend[] = [];
      snapshot.forEach((doc) => {
        fetchedFriends.push(doc.data() as Friend);
      });
      mergeFriendsWithLatestStats(fetchedFriends)
        .then((merged) => setFriends(merged))
        .catch((err) => {
          console.error('Error enriching friends stats:', err);
          setFriends(fetchedFriends);
        })
        .finally(() => setLoading(false));
    }, (error) => {
      console.error('Friends snapshot error:', error);
      setFriends([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, auth.currentUser?.uid]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    setIncomingRequests([]);
    if (!uid) return;

    const q = query(collection(db, 'users', uid, 'friendRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: FriendRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FriendRequest;
        if (data.status === 'pending') fetched.push(data);
      });
      if (fetched.length === 0) {
        setIncomingRequests([]);
        return;
      }

      fetchPlayerStatsMapByUids(fetched.map((item) => item.requesterUid))
        .then((statsByUid) => {
          setIncomingRequests(
            fetched.map((item) => {
              const stats = statsByUid.get(item.requesterUid);
              const statsMmr = Number(stats?.mmr);
              return {
                ...item,
                requesterMmr: Number.isFinite(statsMmr)
                  ? Math.max(0, statsMmr)
                  : Number(item?.requesterMmr || 0)
              };
            })
          );
        })
        .catch((err) => {
          console.error('Incoming friend requests stats enrichment error:', err);
          setIncomingRequests(fetched);
        });
    }, (error) => {
      console.error('Incoming friend requests snapshot error:', error);
      setIncomingRequests([]);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, auth.currentUser?.uid]);

  useEffect(() => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    setOutgoingRequestStatuses({});
    if (!uid) return;

    const q = query(collection(db, 'users', uid, 'sentFriendRequests'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const statusMap: Record<string, FriendRequestStatus> = {};
      const acceptedToSync: Array<{ targetUid: string; payload: Friend }> = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FriendRequest & { senderSyncedAt?: any };
        const targetUid = data.targetUid || docSnap.id;
        const status = (data.status || 'pending') as FriendRequestStatus;
        statusMap[targetUid] = status;

        if (status === 'accepted' && !data.senderSyncedAt) {
          acceptedToSync.push({
            targetUid,
            payload: {
              uid: targetUid,
              displayName: data.targetDisplayName || 'Friends',
              photoURL: data.targetPhotoURL || '',
              username: data.targetUsername || '',
              mmr: 0,
              addedAt: serverTimestamp(),
              lastPlayedAt: null
            }
          });
        }
      });

      setOutgoingRequestStatuses(statusMap);

      if (acceptedToSync.length === 0) return;

      try {
        const statsByUid = await fetchPlayerStatsMapByUids(acceptedToSync.map((item) => item.targetUid));
        await Promise.all(acceptedToSync.map(async ({ targetUid, payload }) => {
          const latestStats = statsByUid.get(targetUid);
          const latestMmr = Number(latestStats?.mmr);
          await setDoc(doc(db, 'users', uid, 'friends', targetUid), {
            ...payload,
            mmr: Number.isFinite(latestMmr) ? Math.max(0, latestMmr) : payload.mmr
          }, { merge: true });
          await setDoc(doc(db, 'users', uid, 'sentFriendRequests', targetUid), {
            senderSyncedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }));
      } catch (err) {
        console.error('Sync accepted outgoing friend requests error:', err);
      }
    }, (error) => {
      console.error('Outgoing friend requests snapshot error:', error);
      setOutgoingRequestStatuses({});
    });
    return () => unsubscribe();
  }, [currentUser?.uid, auth.currentUser?.uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const searchVal = searchQuery.trim();
      const queries = [
        query(collection(db, 'users'), where('username', '==', searchVal)),
        query(collection(db, 'users'), where('email', '==', searchVal)),
        query(collection(db, 'users'), where('phoneNumber', '==', searchVal))
      ];

      const results: UserProfile[] = [];
      const seenUids = new Set();

      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== currentUser.uid && !seenUids.has(data.uid)) {
            results.push(data);
            seenUids.add(data.uid);
          }
        });
      }
      const statsByUid = await fetchPlayerStatsMapByUids(results.map((result) => result.uid || ''));
      const mergedResults = results.map((result) => {
        const stats = statsByUid.get(result.uid || '');
        if (!stats) return result;
        const numericMmr = Number(stats?.mmr);
        return {
          ...result,
          mmr: Number.isFinite(numericMmr) ? Math.max(0, numericMmr) : Number(result?.mmr || 0)
        };
      });

      setSearchResults(mergedResults);
      if (mergedResults.length === 0) {
        addNotification('Search', 'User not found.', 'system');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (targetUser: UserProfile) => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;
    if (uid === targetUser.uid) {
      addNotification('Cannot send request', 'You cannot add yourself as a friend.', 'system');
      return;
    }
    if (friends.some((f) => f.uid === targetUser.uid)) {
      addNotification('Already friends', `${targetUser.displayName} is already in your friends list.`, 'system');
      return;
    }
    if (outgoingRequestStatuses[targetUser.uid] === 'pending') {
      addNotification('Request pending', `Friend request to ${targetUser.displayName} is still pending.`, 'system');
      return;
    }

    try {
      const payload: FriendRequest = {
        requesterUid: uid,
        targetUid: targetUser.uid,
        status: 'pending',
        requesterDisplayName: currentUser.displayName || auth.currentUser?.displayName || 'Player',
        requesterPhotoURL: currentUser.photoURL || auth.currentUser?.photoURL || '',
        requesterUsername: currentUser.username || '',
        targetDisplayName: targetUser.displayName || '',
        targetPhotoURL: targetUser.photoURL || '',
        targetUsername: targetUser.username || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await Promise.all([
        setDoc(doc(db, 'users', targetUser.uid, 'friendRequests', uid), payload, { merge: true }),
        setDoc(doc(db, 'users', uid, 'sentFriendRequests', targetUser.uid), payload, { merge: true })
      ]);

      const notifId = Math.random().toString(36).slice(2, 11);
      await setDoc(doc(db, 'users', targetUser.uid, 'notifications', notifId), {
        id: notifId,
        title: 'Friend Request',
        message: `${currentUser.displayName || 'Someone'} wants to connect with you.`,
        timestamp: serverTimestamp(),
        type: 'system',
        read: false
      });

      setOutgoingRequestStatuses((prev) => ({ ...prev, [targetUser.uid]: 'pending' }));
      addNotification('Request sent', `Friend request sent to ${targetUser.displayName}.`, 'system');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Send friend request error:', err);
      addNotification('Request failed', 'There was a problem sending the friend request.', 'system');
    }
  };

  const handleFriendRequestDecision = async (request: FriendRequest, decision: 'accepted' | 'declined') => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) return;
    setProcessingRequestId(request.requesterUid);

    try {
      const nowPayload = {
        status: decision,
        updatedAt: serverTimestamp(),
        resolvedAt: serverTimestamp()
      };

      if (decision === 'accepted') {
        const [requesterStatsDoc, currentStatsDoc] = await Promise.all([
          getDoc(doc(db, PLAYER_STATS_COLLECTION, request.requesterUid)),
          getDoc(doc(db, PLAYER_STATS_COLLECTION, uid))
        ]);
        const requesterStatsMmr = Number(requesterStatsDoc.exists() ? requesterStatsDoc.data()?.mmr : NaN);
        const currentStatsMmr = Number(currentStatsDoc.exists() ? currentStatsDoc.data()?.mmr : NaN);

        const requesterFriendData: Friend = {
          uid: request.requesterUid,
          displayName: request.requesterDisplayName || 'Friends',
          photoURL: request.requesterPhotoURL || '',
          username: request.requesterUsername || '',
          mmr: Number.isFinite(requesterStatsMmr)
            ? Math.max(0, requesterStatsMmr)
            : (request.requesterMmr || 0),
          addedAt: serverTimestamp(),
          lastPlayedAt: null
        };

        const currentUserFriendData: Friend = {
          uid,
          displayName: currentUser.displayName || auth.currentUser?.displayName || 'Player',
          photoURL: currentUser.photoURL || auth.currentUser?.photoURL || '',
          username: currentUser.username || '',
          mmr: Number.isFinite(currentStatsMmr)
            ? Math.max(0, currentStatsMmr)
            : (currentUser.mmr || 0),
          addedAt: serverTimestamp(),
          lastPlayedAt: null
        };

        const acceptedNotifId = Math.random().toString(36).slice(2, 11);
        await Promise.all([
          setDoc(doc(db, 'users', uid, 'friends', request.requesterUid), requesterFriendData, { merge: true }),
          setDoc(doc(db, 'users', request.requesterUid, 'friends', uid), currentUserFriendData, { merge: true }),
          setDoc(doc(db, 'users', uid, 'friendRequests', request.requesterUid), nowPayload, { merge: true }),
          setDoc(doc(db, 'users', request.requesterUid, 'sentFriendRequests', uid), nowPayload, { merge: true }),
          setDoc(doc(db, 'users', request.requesterUid, 'notifications', acceptedNotifId), {
            id: acceptedNotifId,
            title: 'Request accepted',
            message: `${currentUser.displayName || 'Your friend'} accepted your friend request.`,
            timestamp: serverTimestamp(),
            type: 'achievement',
            read: false
          })
        ]);

        addNotification('New friend added', `${request.requesterDisplayName} is now in your friends list.`, 'achievement');
      } else {
        await Promise.all([
          setDoc(doc(db, 'users', uid, 'friendRequests', request.requesterUid), nowPayload, { merge: true }),
          setDoc(doc(db, 'users', request.requesterUid, 'sentFriendRequests', uid), nowPayload, { merge: true })
        ]);
        addNotification('Request declined', `Request from ${request.requesterDisplayName} has been declined.`, 'system');
      }
    } catch (err) {
      console.error('Handle friend request decision error:', err);
      addNotification('Request processing failed', 'Please try again in a moment.', 'system');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const selectedCount = selectedPlayerIds.length;
  const sortedFriends = useMemo(() => sortFriendsByName(friends), [friends]);
  const selectedFriends = useMemo(
    () => sortFriendsByName(friends.filter((friend) => selectedPlayerIds.includes(friend.uid))),
    [friends, selectedPlayerIds]
  );
  const searchSectionTitle = pickerMode ? 'Find More Friends' : 'Find Friends';
  const searchSectionCopy = pickerMode
    ? 'Search if someone is not in your friends list yet.'
    : 'Search by username, email, or phone number to connect with other FOM players.';
  const friendsSectionTitle = pickerMode ? 'Your Friends' : 'Your Friends';
  const friendsSectionCopy = pickerMode
    ? 'Tap Add or Selected to update this match.'
    : 'Your player network for future matches, requests, and quick invites.';

  const searchPanel = (
    <section className="rounded-[24px] border border-black/5 bg-white p-3.5">
      <div className="mb-3">
        <h2 className="text-[16px] font-bold tracking-tight text-on-surface">{searchSectionTitle}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
          {searchSectionCopy}
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-2.5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search username, email, or phone number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[20px] border border-black/5 bg-ios-gray/5 py-3.5 pl-11 pr-4 text-[14px] font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ios-gray" size={18} />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-[12px] font-semibold tracking-tight text-white tap-target disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="px-1 text-[11px] font-semibold tracking-tight text-ios-gray">Search Results</p>
          {searchResults.map(res => (
            <div key={res.uid} className="flex items-center justify-between gap-3 rounded-[20px] border border-black/5 bg-surface px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-ios-gray/10">
                  {res.photoURL ? <img src={res.photoURL} className="h-full w-full object-cover" /> : <User size={20} className="text-ios-gray/30" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-on-surface">{res.displayName}</p>
                  <p className="truncate text-[11px] font-medium tracking-tight text-ios-gray">@{res.username || 'user'}</p>
                </div>
              </div>
              {(() => {
                const isAlreadyFriend = friends.some(f => f.uid === res.uid);
                const requestStatus = outgoingRequestStatuses[res.uid];
                const isPending = requestStatus === 'pending';
                const isAccepted = requestStatus === 'accepted';
                const disabled = isAlreadyFriend || isPending || isAccepted;

                const label = isAlreadyFriend
                  ? 'Friends'
                  : isPending
                    ? 'Pending'
                    : isAccepted
                      ? 'Accepted'
                      : 'Add';

                return (
                  <button
                    onClick={() => sendFriendRequest(res)}
                    disabled={disabled}
                    className={cn(
                      'h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold tracking-tight tap-target',
                      disabled
                        ? 'border border-black/5 bg-white text-ios-gray'
                        : 'bg-primary text-white'
                    )}
                  >
                    {label}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const friendsPanel = (
    <section className="rounded-[24px] border border-black/5 bg-white p-3.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-on-surface">{friendsSectionTitle}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
            {friendsSectionCopy}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-black/5 bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-tight text-ios-gray">
          {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="animate-spin text-primary/20" size={32} />
        </div>
      ) : friends.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-black/8 bg-surface px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <Users size={40} className="text-ios-gray/20" />
          </div>
          <h3 className="text-[18px] font-bold tracking-tight text-on-surface">
            {pickerMode ? 'No friends yet' : 'No friends yet'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium leading-relaxed text-ios-gray">
            {pickerMode
              ? 'Search for friends first, then bring them into this match.'
              : 'Search for players using username, email, or phone number to start building your network.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedFriends.map(friend => (
            <div
              key={friend.uid}
              className={cn(
                'flex items-center justify-between gap-3 rounded-[22px] border px-3.5 py-3.5',
                pickerMode && selectedPlayerIds.includes(friend.uid)
                  ? 'border-primary/20 bg-primary/[0.04]'
                  : 'border-black/5 bg-surface'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-ios-gray/10">
                  {friend.photoURL ? <img src={friend.photoURL} className="h-full w-full object-cover" /> : <User size={24} className="text-ios-gray/30" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-on-surface">{friend.displayName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <RankBadge mmr={friend.mmr} size="sm" />
                    <span className="truncate text-[11px] font-medium tracking-tight text-ios-gray">@{friend.username || 'user'}</span>
                  </div>
                </div>
              </div>
              {pickerMode && onTogglePickForMatch ? (
                <button
                  onClick={() => onTogglePickForMatch(friend)}
                  className={cn(
                    'h-9 shrink-0 rounded-full px-3.5 text-[11px] font-semibold tracking-tight tap-target',
                    selectedPlayerIds.includes(friend.uid)
                      ? 'border border-primary/15 bg-primary/[0.06] text-primary'
                      : 'bg-primary text-white'
                  )}
                >
                  {selectedPlayerIds.includes(friend.uid) ? 'Selected' : 'Add'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="ios-blur sticky top-0 z-50 flex min-h-16 w-full items-center border-b border-ios-gray/10 px-4 py-2">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-2 min-w-0 flex-1">
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface">
            {pickerMode ? 'Add Players' : 'Friends'}
          </h1>
          <p className="mt-0.5 truncate text-[12px] font-medium tracking-tight text-ios-gray">
            {pickerMode
              ? `${selectedCount} player${selectedCount === 1 ? '' : 's'} selected`
              : `${friends.length} friend${friends.length === 1 ? '' : 's'} in your network`}
          </p>
        </div>
        {pickerMode ? (
          <button
            onClick={onDonePick || onBack}
            className="ml-3 inline-flex h-9 shrink-0 items-center rounded-full border border-primary/15 bg-primary/10 px-3.5 text-[12px] font-semibold tracking-tight text-primary tap-target"
          >
            Done
          </button>
        ) : null}
      </header>

      <main className="mx-auto max-w-2xl p-4 space-y-4">
        {pickerMode && (
          <section className="rounded-[24px] border border-black/5 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Selected Players</p>
                <p className="mt-1 text-[24px] leading-none font-display font-black tracking-tight text-on-surface tabular-nums">
                  {selectedCount}
                </p>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ios-gray">
                  Choose friends to bring into this match.
                </p>
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-tight",
                selectedCount > 0 ? "bg-primary/[0.08] text-primary" : "bg-ios-gray/[0.08] text-ios-gray"
              )}>
                {selectedCount > 0 ? `${selectedCount} selected` : 'No players'}
              </span>
            </div>
            {selectedFriends.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="inline-flex items-center gap-2 rounded-full bg-ios-gray/[0.05] px-2.5 py-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-[11px] font-bold text-primary">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} className="h-full w-full object-cover" />
                      ) : (
                        (friend.displayName || 'F').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="max-w-[112px] truncate text-[12px] font-semibold text-on-surface">
                      {friend.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!pickerMode && incomingRequests.length > 0 && (
          <section className="rounded-[24px] border border-primary/10 bg-primary/[0.035] p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold tracking-tight text-on-surface">Friend Requests</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ios-gray">
                  Review incoming player requests before they join your network.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/10 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-tight text-primary">
                {incomingRequests.length} new
              </span>
            </div>
            <div className="space-y-3">
              {incomingRequests.map((request) => {
                const isProcessing = processingRequestId === request.requesterUid;
                const requesterMmr = Number.isFinite(Number(request.requesterMmr))
                  ? Math.max(0, Number(request.requesterMmr))
                  : 0;
                return (
                  <div key={request.requesterUid} className="rounded-[22px] border border-black/5 bg-white px-3.5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-ios-gray/10">
                          {request.requesterPhotoURL ? (
                            <img src={request.requesterPhotoURL} className="h-full w-full object-cover" />
                          ) : (
                            <User size={22} className="text-ios-gray/35" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-on-surface">{request.requesterDisplayName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <RankBadge mmr={requesterMmr} size="sm" />
                            <span className="truncate text-[11px] font-medium tracking-tight text-ios-gray">
                              @{request.requesterUsername || 'user'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleFriendRequestDecision(request, 'declined')}
                          disabled={isProcessing}
                          className="h-8 rounded-full border border-black/5 bg-white px-3 text-[11px] font-semibold tracking-tight text-ios-gray tap-target disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleFriendRequestDecision(request, 'accepted')}
                          disabled={isProcessing}
                          className="h-8 rounded-full bg-primary px-3 text-[11px] font-semibold tracking-tight text-white tap-target disabled:opacity-50"
                        >
                          {isProcessing ? '...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pickerMode ? (
          <>
            {friendsPanel}
            {searchPanel}
          </>
        ) : (
          <>
            {searchPanel}
            {friendsPanel}
          </>
        )}
      </main>
    </div>
  );
};

const getLeaderboardPlacementStyles = (rank: number) => {
  if (rank === 1) return 'bg-amber-50 text-amber-700 border-amber-200/80';
  if (rank === 2) return 'bg-slate-100 text-slate-700 border-slate-200';
  if (rank === 3) return 'bg-orange-50 text-orange-700 border-orange-200/80';
  return 'bg-surface text-ios-gray border-black/5';
};

const ALL_PROVINCES_FILTER = 'All Provinces';

const toProvinceName = (location: string | null | undefined): string => {
  if (!location || typeof location !== 'string') return '';
  const segments = location
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return '';
  return segments[segments.length - 1];
};

const getDisplayInitials = (name: string | null | undefined): string => {
  const safeName = String(name || '').trim();
  if (!safeName) return 'PL';
  const letters = safeName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || 'PL';
};

const LeaderboardSummaryCards = ({
  rankedUsers,
  currentUser
}: {
  rankedUsers: any[];
  currentUser: any;
}) => {
  const currentRankIndex = rankedUsers.findIndex((u) => u?.uid === currentUser?.uid);
  const currentRank = currentRankIndex >= 0 ? currentRankIndex + 1 : null;
  const currentMmr = Number.isFinite(Number(currentUser?.mmr)) ? Number(currentUser.mmr) : 0;
  const currentMatches = Number.isFinite(Number(currentUser?.totalMatches)) ? Number(currentUser.totalMatches) : 0;

  return (
    <div className="mb-3 rounded-[24px] border border-black/5 bg-white p-2">
      <div className="grid grid-cols-[0.92fr_1.16fr_0.92fr] gap-2">
        <div className="rounded-[18px] border border-black/[0.045] bg-white px-3 py-3">
          <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Rank</p>
          <p className="mt-1 text-[18px] leading-tight font-display font-black tracking-tight tabular-nums text-on-surface">
            {currentRank ? `#${currentRank}` : '-'}
          </p>
        </div>
        <div className="rounded-[18px] border border-primary/[0.08] bg-primary/[0.045] px-3 py-3.5">
          <p className="text-[11px] font-semibold tracking-tight text-ios-gray">MMR</p>
          <p className="mt-1 text-[24px] leading-tight font-display font-black tracking-tight tabular-nums text-on-surface">
            {currentMmr.toLocaleString()}
          </p>
        </div>
        <div className="rounded-[18px] border border-black/[0.045] bg-white px-3 py-3">
          <p className="text-[11px] font-semibold tracking-tight text-ios-gray">Matches</p>
          <p className="mt-1 text-[18px] leading-tight font-display font-black tracking-tight tabular-nums text-on-surface">
            {currentMatches}
          </p>
        </div>
      </div>
    </div>
  );
};

const LeaderboardUserRow = ({
  user,
  index,
  isCurrentUser,
  isHighlighted = false
}: {
  user: any;
  index: number;
  isCurrentUser: boolean;
  isHighlighted?: boolean;
}) => {
  const rank = index + 1;
  const mmr = Number.isFinite(Number(user?.mmr)) ? Number(user.mmr) : 0;
  const totalMatches = Number.isFinite(Number(user?.totalMatches)) ? Number(user.totalMatches) : 0;
  const matchesLabel = totalMatches === 1 ? '1 Match' : `${totalMatches} Matches`;
  const areaLabel = toProvinceName(user?.region || user?.homeBase) || 'Unknown';
  const displayName = String(user?.displayName || 'Player');
  const initials = getDisplayInitials(displayName);
  const rankText = `#${rank}`;
  const rankInfo = getRankInfo(mmr);
  const rowId = user?.uid ? `leaderboard-user-${user.uid}` : undefined;

  return (
    <div
      id={rowId}
      className={cn(
        'rounded-2xl border border-black/5 bg-white px-3.5 py-3.5',
        isCurrentUser && 'border-primary/20 bg-primary/[0.035]',
        isHighlighted && 'border-primary/15 bg-primary/[0.045]'
      )}
    >
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black tracking-tight',
          getLeaderboardPlacementStyles(rank)
        )}>
          {rankText}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-ios-gray/5">
          {user.photoURL ? (
            <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[11px] font-bold text-ios-gray tracking-tight">{initials}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-[14px] leading-tight text-on-surface truncate">{displayName}</h4>
            {isCurrentUser && (
              <span className="rounded-full border border-primary/15 bg-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                You
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] font-semibold text-ios-gray truncate">
            {areaLabel} • {matchesLabel}
          </p>
        </div>

        <div className="min-w-[5.35rem] shrink-0 pl-1 text-right">
          <p className="text-[17px] leading-tight font-display font-black tracking-tight tabular-nums text-on-surface">
            {mmr.toLocaleString()} <span className="text-[10px] font-semibold tracking-tight text-ios-gray">MMR</span>
          </p>
          <div className="mt-0.5 inline-flex items-center justify-end gap-1 text-[10px] font-semibold tracking-tight text-ios-gray">
            <rankInfo.icon size={11} />
            <span>{rankInfo.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeaderboardHeaderSummary = ({
  provinceFilter,
  showingLabel,
  onOpenRankDetails,
  onOpenMmrHistory
}: {
  provinceFilter: string;
  showingLabel: string;
  onOpenRankDetails: () => void;
  onOpenMmrHistory: () => void;
}) => {
  const boardLabel = provinceFilter === ALL_PROVINCES_FILTER ? 'Global Ranking' : 'Province Ranking';
  const boardDetail = provinceFilter === ALL_PROVINCES_FILTER ? showingLabel : `${provinceFilter} • ${showingLabel}`;

  return (
    <div className="mb-3 space-y-1.5">
      <div className="px-0.5">
        <p className="text-[15px] font-bold tracking-tight text-on-surface">{boardLabel}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-ios-gray">{boardDetail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-0.5">
        <button
          onClick={onOpenMmrHistory}
          className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-black/5 bg-surface px-3 text-[11px] font-medium tracking-tight text-ios-gray tap-target transition-colors active:bg-white"
        >
          <BarChart2 size={14} />
          <span className="truncate">MMR History</span>
        </button>
        <button
          onClick={onOpenRankDetails}
          className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-black/5 bg-surface px-3 text-[11px] font-medium tracking-tight text-ios-gray tap-target transition-colors active:bg-white"
        >
          <SlidersHorizontal size={14} />
          <span className="truncate">Ranking Guide</span>
        </button>
      </div>
    </div>
  );
};

const LeaderboardScreen = ({
  currentUser,
  onOpenRankDetails,
  onOpenMmrHistory,
  focusRequestId
}: {
  currentUser: any,
  onOpenRankDetails: () => void,
  onOpenMmrHistory: () => void,
  focusRequestId: number
}) => {
  const [provinceFilter, setProvinceFilter] = useState(ALL_PROVINCES_FILTER);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedUid, setHighlightedUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers = await fetchLeaderboardUsersFromFirestore();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!focusRequestId || loading) return;
    const uid = String(currentUser?.uid || '').trim();
    if (!uid) return;
    const rowId = `leaderboard-user-${uid}`;
    const scrollTimer = window.setTimeout(() => {
      const row = document.getElementById(rowId);
      if (!row) return;
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedUid(uid);
    }, 120);
    const highlightTimer = window.setTimeout(() => {
      setHighlightedUid((prev) => (prev === uid ? null : prev));
    }, 1700);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [focusRequestId, loading, users.length, currentUser?.uid]);

  const filteredUsers = provinceFilter === ALL_PROVINCES_FILTER
    ? users
    : users.filter((u) => toProvinceName(u?.region || u?.homeBase) === provinceFilter);
  const rankedUsers = useMemo(() => sortUsersByMmrDesc(filteredUsers), [filteredUsers]);
  const showingLabel = `${rankedUsers.length} ${rankedUsers.length === 1 ? 'Player' : 'Players'}`;

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 px-4 h-14 border-b border-ios-gray/10 flex items-center justify-between">
        <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Ranking</h1>
        <div className="flex items-center gap-1.5 rounded-full border border-black/5 bg-white p-1">
          <button
            onClick={() => setProvinceFilter(ALL_PROVINCES_FILTER)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold tracking-tight tap-target transition-colors",
              provinceFilter === ALL_PROVINCES_FILTER
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-ios-gray"
            )}
          >
            <Globe size={13} />
            Global
          </button>
          <button
            onClick={() => setIsRegionSelectorOpen(true)}
            className={cn(
              "flex h-8 max-w-[11.5rem] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold tracking-tight tap-target transition-colors",
              provinceFilter === ALL_PROVINCES_FILTER
                ? "bg-transparent text-ios-gray"
                : "bg-primary/10 text-primary"
            )}
          >
            <MapPin size={13} />
            <span className="truncate">{provinceFilter === ALL_PROVINCES_FILTER ? 'Province' : provinceFilter}</span>
          </button>
        </div>
      </header>

      <RegionSelector
        isOpen={isRegionSelectorOpen}
        onClose={() => setIsRegionSelectorOpen(false)}
        onSelect={(value) => setProvinceFilter(value)}
        currentValue={provinceFilter === ALL_PROVINCES_FILTER ? '' : provinceFilter}
        selectionMode="province"
      />

      <main className="max-w-2xl mx-auto p-3.5">
        <LeaderboardSummaryCards rankedUsers={rankedUsers} currentUser={currentUser} />
        <LeaderboardHeaderSummary
          provinceFilter={provinceFilter}
          showingLabel={showingLabel}
          onOpenRankDetails={onOpenRankDetails}
          onOpenMmrHistory={onOpenMmrHistory}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <p className="text-ios-gray font-bold text-sm">Loading ranking...</p>
          </div>
        ) : rankedUsers.length === 0 ? (
          <div className="bg-white border border-ios-gray/10 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-ios-gray/5 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Users size={28} className="text-ios-gray/25" />
            </div>
            <p className="text-sm font-bold text-on-surface">No organic FOM players in this ranking yet.</p>
            <p className="text-[12px] font-medium text-ios-gray mt-1">Only registered FOM accounts are shown.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankedUsers.map((user, index) => {
              if (!user) return null;
              return (
                <div key={user.uid}>
                  <LeaderboardUserRow
                    user={user}
                    index={index}
                    isCurrentUser={user.uid === currentUser?.uid}
                    isHighlighted={user.uid === highlightedUid}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

// --- Play App ---

export default function App() {
  const initialSharedContext = getInitialSharedContext();
  const initialE2EScenario = getInitialE2EScenario();
  const initialForceAppShell = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return isAppShellQuery(params);
  }, []);
  const marketingBasePath = useMemo(() => {
    const normalizedPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
    return normalizedPath === ARCHIVE_BASE_PATH || normalizedPath.startsWith(`${ARCHIVE_BASE_PATH}/`)
      ? ARCHIVE_BASE_PATH
      : '';
  }, []);
  const [topLevelRoute, setTopLevelRoute] = useState<TopLevelRoute>(() => (
    resolveTopLevelRoute(window.location.pathname, initialForceAppShell, marketingBasePath)
  ));
  const isIOSDevice = useMemo(() => detectIOSDevice(), []);
  const isMockupV3 = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mockup') === 'v3';
    } catch {
      return false;
    }
  }, []);
  const e2eFinishedHistory = useMemo<TournamentHistory | null>(() => {
    if (initialE2EScenario !== 'finished-flow') return null;
    const playerPool: Player[] = Array.from({ length: 16 }).map((_, idx) => ({
      id: `e2e-p${idx + 1}`,
      name: `Player ${idx + 1}`,
      rating: 3 + ((idx % 5) * 0.2),
      initials: `P${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
    const startedAt = Date.now() - 78 * 60 * 1000;
    const roundDurationMs = 22 * 60 * 1000;
    const rounds: Round[] = [];
    for (let roundId = 1; roundId <= 3; roundId++) {
      const roundStartedAt = startedAt + ((roundId - 1) * roundDurationMs);
      const matches: Match[] = [];
      for (let court = 1; court <= 4; court++) {
        const baseIndex = ((roundId - 1) * 4 + (court - 1)) % playerPool.length;
        const picked = Array.from({ length: 4 }).map((__, pickIdx) => playerPool[(baseIndex + pickIdx) % playerPool.length]);
        const scoreA = 6 + ((roundId + court) % 3);
        const scoreB = 4 + ((roundId + court + 1) % 3);
        matches.push({
          id: `e2e-r${roundId}-m${court}`,
          court,
          roundId,
          status: 'completed',
          startedAt: roundStartedAt,
          duration: '22:00',
          teamA: { players: [picked[0], picked[1]], score: scoreA, sets: [scoreA] },
          teamB: { players: [picked[2], picked[3]], score: scoreB, sets: [scoreB] }
        });
      }
      rounds.push({ id: roundId, matches, playersBye: [] });
    }
    const endedAt = startedAt + (3 * roundDurationMs);
    return {
      id: 'e2e-finished-flow',
      userId: 'e2e-user',
      name: 'E2E Finished Matches',
      format: 'Match Play',
      criteria: 'Matches Won',
      scoringType: 'Advantage',
      date: new Date(endedAt),
      startedAt,
      endedAt,
      courts: 4,
      totalPoints: 0,
      numRounds: 3,
      numPlayers: playerPool.length,
      rounds,
      players: playerPool,
      venueName: 'FOM Test Court',
      location: 'Jakarta Selatan, DKI Jakarta'
    };
  }, [initialE2EScenario]);
  const e2eBackgroundPlayers = useMemo<Player[]>(() => {
    if (initialE2EScenario !== 'background-flow') return [];
    return Array.from({ length: 4 }).map((_, idx) => ({
      id: `e2e-bg-p${idx + 1}`,
      name: `BG Player ${idx + 1}`,
      rating: 3.5 + (idx * 0.1),
      initials: `B${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
  }, [initialE2EScenario]);
  const e2eBackgroundTournament = useMemo<Tournament | null>(() => {
    if (initialE2EScenario !== 'background-flow') return null;
    return {
      id: 'e2e-background-flow',
      name: 'E2E Background Flow',
      format: 'Match Play',
      criteria: 'Matches Won',
      scoringType: 'Advantage',
      courts: 1,
      totalPoints: 0,
      players: e2eBackgroundPlayers,
      inactivePlayerIds: [],
      rounds: [],
      numRounds: 1,
      venueName: 'E2E Court',
      location: 'Jakarta Selatan'
    };
  }, [e2eBackgroundPlayers, initialE2EScenario]);
  const e2eProfileHistory = useMemo<TournamentHistory[]>(() => {
    if (initialE2EScenario !== 'profile-flow') return [];
    const currentUid = 'e2e-user';
    const currentPlayer = {
      id: currentUid,
      name: 'Falih Harman',
      rating: 4.3,
      initials: 'FH',
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };
    const teammate = {
      id: 'e2e-teammate',
      name: 'Ari Putra',
      rating: 4.1,
      initials: 'AP',
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };
    const opponents = [
      {
        id: 'e2e-op-1',
        name: 'Nanda Wijaya',
        rating: 4.0,
        initials: 'NW',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-2',
        name: 'Reza Mahendra',
        rating: 4.2,
        initials: 'RM',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-3',
        name: 'Dino Arya',
        rating: 3.9,
        initials: 'DA',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-4',
        name: 'Bimo Satya',
        rating: 4.0,
        initials: 'BS',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-5',
        name: 'Kevin Prasetyo',
        rating: 4.4,
        initials: 'KP',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      },
      {
        id: 'e2e-op-6',
        name: 'Rifqi Aditya',
        rating: 4.1,
        initials: 'RA',
        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
      }
    ];
    const now = Date.now();

    return [
      {
        id: 'e2e-profile-h1',
        userId: currentUid,
        name: 'Senayan Night Session',
        format: 'Match Play',
        criteria: 'Matches Won',
        scoringType: 'Advantage',
        date: new Date(now - (6 * 24 * 60 * 60 * 1000)),
        startedAt: now - (6 * 24 * 60 * 60 * 1000) - (70 * 60 * 1000),
        endedAt: now - (6 * 24 * 60 * 60 * 1000),
        courts: 1,
        totalPoints: 0,
        numRounds: 2,
        numPlayers: 6,
        rounds: [
          {
            id: 1,
            matches: [
              {
                id: 'e2e-profile-h1-r1',
                court: 1,
                roundId: 1,
                status: 'completed',
                teamA: { players: [currentPlayer, teammate], score: 6, sets: [6] },
                teamB: { players: [opponents[0], opponents[1]], score: 3, sets: [3] }
              }
            ],
            playersBye: []
          },
          {
            id: 2,
            matches: [
              {
                id: 'e2e-profile-h1-r2',
                court: 1,
                roundId: 2,
                status: 'completed',
                teamA: { players: [currentPlayer, opponents[2]], score: 5, sets: [5] },
                teamB: { players: [teammate, opponents[3]], score: 6, sets: [6] }
              }
            ],
            playersBye: []
          }
        ],
        players: [currentPlayer, teammate, ...opponents.slice(0, 4)],
        venueName: 'Racquet Padel Club',
        location: 'Jakarta Selatan, DKI Jakarta'
      },
      {
        id: 'e2e-profile-h2',
        userId: currentUid,
        name: 'Thursday Competitive Mix',
        format: 'Americano',
        criteria: 'Points',
        scoringType: 'Golden Point',
        date: new Date(now - (25 * 24 * 60 * 60 * 1000)),
        startedAt: now - (25 * 24 * 60 * 60 * 1000) - (80 * 60 * 1000),
        endedAt: now - (25 * 24 * 60 * 60 * 1000),
        courts: 1,
        totalPoints: 0,
        numRounds: 2,
        numPlayers: 6,
        rounds: [
          {
            id: 1,
            matches: [
              {
                id: 'e2e-profile-h2-r1',
                court: 1,
                roundId: 1,
                status: 'completed',
                teamA: { players: [currentPlayer, opponents[4]], score: 6, sets: [6] },
                teamB: { players: [opponents[1], opponents[5]], score: 4, sets: [4] }
              }
            ],
            playersBye: []
          },
          {
            id: 2,
            matches: [
              {
                id: 'e2e-profile-h2-r2',
                court: 1,
                roundId: 2,
                status: 'completed',
                teamA: { players: [currentPlayer, teammate], score: 6, sets: [6] },
                teamB: { players: [opponents[0], opponents[2]], score: 2, sets: [2] }
              }
            ],
            playersBye: []
          }
        ],
        players: [currentPlayer, teammate, ...opponents],
        venueName: 'Orange Garden Padel',
        location: 'Jakarta Barat, DKI Jakarta'
      }
    ];
  }, [initialE2EScenario]);
  const [screen, setScreen] = useState<Screen>(initialSharedContext.isShared ? initialSharedContext.targetView : 'login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sharedMatchId, setSharedMatchId] = useState<string | null>(initialSharedContext.sharedId);
  const [isSharedViewer, setIsSharedViewer] = useState(initialSharedContext.isShared);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [sharedTargetScreen, setSharedTargetScreen] = useState<'active' | 'klasemen'>(initialSharedContext.targetView);
  const [isSharedDataReady, setIsSharedDataReady] = useState(!initialSharedContext.isShared);
  const [tournament, setTournament] = useState<Tournament>(createFreshTournamentDraft());
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationToasts, setNotificationToasts] = useState<AppNotification[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<TournamentHistory | null>(null);
  const [selectedKlasemenTournament, setSelectedKlasemenTournament] = useState<Tournament | TournamentHistory | null>(null);
  const [klasemenBackScreen, setKlasemenBackScreen] = useState<'dashboard' | 'active' | 'history-detail'>('dashboard');
  const [activeScreenTournament, setActiveScreenTournament] = useState<Tournament | null>(null);
  const [activeBackScreen, setActiveBackScreen] = useState<'dashboard' | 'history-detail' | 'klasemen' | 'history' | 'profile'>('dashboard');
  const [historyBackScreen, setHistoryBackScreen] = useState<'dashboard' | 'profile'>('dashboard');
  const [notificationBackScreen, setNotificationBackScreen] = useState<'dashboard' | 'profile'>('dashboard');
  const [mmrHistoryBackScreen, setMmrHistoryBackScreen] = useState<'profile' | 'rank-discovery' | 'leaderboard'>('profile');
  const [friendsEntrySource, setFriendsEntrySource] = useState<'profile' | 'settings'>('profile');
  const [settingsFocusSection, setSettingsFocusSection] = useState<'players' | null>(null);
  const [rankingFocusRequestId, setRankingFocusRequestId] = useState(0);
  const [draftMatchBackgroundId, setDraftMatchBackgroundId] = useState<string | null>(null);
  const [activeSaveState, setActiveSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [needsRegenerateFromRound, setNeedsRegenerateFromRound] = useState<number | null>(null);
  const activeSaveTimeoutRef = useRef<number | null>(null);
  const notificationToastTimeoutsRef = useRef<Record<string, number>>({});
  const isAuthResolvedRef = useRef(false);
  const isHandlingPopStateRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const lastFriendPickerSummaryRef = useRef('');
  const hasForcedAppShellQuery = isAppShellQuery(new URLSearchParams(window.location.search));
  const isAppShellRoute = hasForcedAppShellQuery || topLevelRoute === 'app';
  const publicRoute = (topLevelRoute === 'app' || topLevelRoute === 'blog' ? 'home' : topLevelRoute) as PublicTopLevelRoute;
  const isArchivedMarketingRoute = !isAppShellRoute && marketingBasePath === ARCHIVE_BASE_PATH;

  const navigateTopLevel = (nextRoute: TopLevelRoute) => {
    const nextPath = getTopLevelPath(nextRoute, nextRoute === 'app' || nextRoute === 'blog' ? '' : marketingBasePath);
    if (nextRoute === 'blog') {
      window.location.assign(nextPath);
      return;
    }
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ __fomRoute: nextRoute }, '', nextPath);
    }
    setTopLevelRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    const root = document.documentElement;
    const isStandalonePwa =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    root.classList.toggle('platform-ios', isIOSDevice);
    root.style.setProperty('--app-safe-top', isIOSDevice ? 'env(safe-area-inset-top, 0px)' : '0px');
    root.style.setProperty('--app-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--app-bottom-nav-gap', isIOSDevice ? (isStandalonePwa ? '4px' : '14px') : '10px');
  }, [isIOSDevice]);

  useEffect(() => {
    if (!isAppShellRoute) return;
    trackPageView(screen, getScreenRoute(screen));
  }, [isAppShellRoute, screen]);

  useEffect(() => {
    if (isAppShellRoute) return;
    trackPageView(publicRoute, getTopLevelPath(publicRoute, marketingBasePath));
  }, [isAppShellRoute, marketingBasePath, publicRoute]);

  useEffect(() => {
    void syncAnalyticsUser(user?.uid || null);
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    const statsRef = doc(db, PLAYER_STATS_COLLECTION, uid);
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const stats = snapshot.data() || {};
      const mmr = Number(stats?.mmr);
      const totalMatches = Number(stats?.totalMatches);
      const wins = Number(stats?.wins);
      const losses = Number(stats?.losses);

      setUser((prev: any) => {
        if (!prev || prev.uid !== uid) return prev;
        return {
          ...prev,
          ...(Number.isFinite(mmr) ? { mmr: Math.max(0, mmr) } : {}),
          ...(Number.isFinite(totalMatches) && totalMatches >= 0 ? { totalMatches } : {}),
          ...(Number.isFinite(wins) && wins >= 0 ? { wins } : {}),
          ...(Number.isFinite(losses) && losses >= 0 ? { losses } : {})
        };
      });
    }, (err) => {
      console.error('player_stats live sync error:', err);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!isAppShellRoute) return;
    const handleDocumentClick = (event: MouseEvent) => {
      const tracked = resolveTrackableButton(event.target);
      if (!tracked) return;
      trackButtonClick({
        screen,
        route: getScreenRoute(screen),
        buttonName: tracked.buttonName,
        buttonText: tracked.buttonText
      });
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [isAppShellRoute, screen]);

  useEffect(() => {
    if (!isAppShellRoute) return;
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const rafId = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [isAppShellRoute, screen, selectedHistory?.id, selectedKlasemenTournament?.id, activeScreenTournament?.id]);

  useEffect(() => {
    if (isAppShellRoute) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [isAppShellRoute, topLevelRoute]);

  useEffect(() => {
    if (!isAppShellRoute) {
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.setAttribute('content', '#fffaf5');
      document.documentElement.style.backgroundColor = '#fffaf5';
      document.body.style.backgroundColor = '#fffaf5';
      return;
    }

    const getSystemBarColor = () => {
      if (screen === 'active' || screen === 'klasemen') {
        const visualTournament = (screen === 'active'
          ? (activeScreenTournament || tournament)
          : (selectedKlasemenTournament || tournament)) as Tournament | TournamentHistory;
        if (visualTournament?.format === 'Americano') return '#0f2a2a';
        if (visualTournament?.format === 'Mexicano') return '#2b160d';
        return '#0f1e3a';
      }
      return '#ffffff';
    };

    const systemBarColor = getSystemBarColor();
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', systemBarColor);
    document.documentElement.style.backgroundColor = systemBarColor;
    document.body.style.backgroundColor = systemBarColor;
  }, [activeScreenTournament, isAppShellRoute, screen, selectedKlasemenTournament, tournament]);

  useEffect(() => {
    const title = isAppShellRoute
      ? 'FOM Play App'
      : PUBLIC_PAGE_META[publicRoute].title;
    document.title = title;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute(
      'content',
      isAppShellRoute
        ? 'Buka FOM Play untuk mengelola game padel, live score, klasemen, dan ranking pemain.'
        : PUBLIC_PAGE_META[publicRoute].description
    );
  }, [isAppShellRoute, publicRoute]);

  useEffect(() => {
    const canonicalHref = isAppShellRoute
      ? `${window.location.origin}${window.location.pathname}`
      : getCanonicalUrlForRoute(publicRoute, marketingBasePath);
    const pageTitle = isAppShellRoute ? 'FOM Play App' : PUBLIC_PAGE_META[publicRoute].title;
    const pageDescription = isAppShellRoute
      ? 'Buka FOM Play untuk mengelola game padel, live score, klasemen, dan ranking pemain.'
      : PUBLIC_PAGE_META[publicRoute].description;
    const socialImage = `${window.location.origin}${PUBLIC_SOCIAL_IMAGE_PATH}`;
    const ogType = isAppShellRoute ? 'website' : publicRoute === 'home' ? 'website' : 'article';

    const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string, content: string) => {
      let metaTag = document.querySelector(selector) as HTMLMetaElement | null;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, value);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    };

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalHref;

    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      isAppShellRoute || isArchivedMarketingRoute ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large'
    );
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalHref);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'FOM Play');
    upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'id_ID');
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', socialImage);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'FOM Play padel app preview');
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', socialImage);

    let schemaScript = document.getElementById('fom-structured-data') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'fom-structured-data';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = isAppShellRoute ? '' : JSON.stringify(getPublicStructuredData(publicRoute, marketingBasePath));

    return () => {
      if (schemaScript) schemaScript.textContent = '';
    };
  }, [isAppShellRoute, isArchivedMarketingRoute, marketingBasePath, publicRoute]);

  useEffect(() => {
    return () => {
      if (activeSaveTimeoutRef.current) {
        window.clearTimeout(activeSaveTimeoutRef.current);
      }
      (Object.values(notificationToastTimeoutsRef.current) as number[]).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      notificationToastTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (initialE2EScenario === 'finished-flow' && e2eFinishedHistory) {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({ uid: 'e2e-user', displayName: 'E2E User', mmr: 1500 });
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments([e2eFinishedHistory]);
      setSelectedHistory(e2eFinishedHistory);
      setTournament(buildReadOnlyTournamentFromHistory(e2eFinishedHistory));
      setScreen('history-detail');
      return;
    }

    if (initialE2EScenario === 'background-flow' && e2eBackgroundTournament) {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({ uid: 'e2e-user', displayName: 'E2E User', mmr: 1500 });
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments([]);
      setSelectedHistory(null);
      setAllPlayers(e2eBackgroundPlayers);
      setTournament(e2eBackgroundTournament);
      setDraftMatchBackgroundId(null);
      setScreen('settings');
      return;
    }

    if (initialE2EScenario === 'profile-flow') {
      setIsSharedViewer(false);
      setSharedMatchId(null);
      setIsSharedDataReady(true);
      setUser({
        uid: 'e2e-user',
        displayName: 'Falih Harman',
        username: 'falihh',
        email: 'falih.harman@example.com',
        mmr: 2840,
        role: 'admin',
        homeBase: 'Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
        region: 'Jakarta Selatan, DKI Jakarta',
        totalMatches: 4,
        wins: 3,
        losses: 1
      });
      setNotifications([
        {
          id: 'e2e-notif-1',
          title: 'Weekly recap ready',
          message: 'Your April performance summary is available.',
          timestamp: new Date(),
          type: 'system',
          read: false
        }
      ]);
      setIsLoggedIn(true);
      setIsAuthChecked(true);
      setTournaments(e2eProfileHistory);
      setSelectedHistory(null);
      setAllPlayers([]);
      setTournament(createFreshTournamentDraft());
      setScreen('profile');
      return;
    }

    if (initialE2EScenario === 'finished-flow' || initialE2EScenario === 'background-flow' || initialE2EScenario === 'profile-flow') {
      setIsAuthChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const shouldForceAdminRole = isAdminEmail(firebaseUser.email);
          const savedPlayers = localStorage.getItem(getPlayersStorageKey(firebaseUser.uid));
          const parsedPlayers: Player[] = savedPlayers ? JSON.parse(savedPlayers) : [];
          const normalizedPlayers = parsedPlayers.map((player) => normalizePlayerSource(player, firebaseUser.uid));
          setAllPlayers(isLegacySeedPlayers(normalizedPlayers) ? [] : normalizedPlayers);
          const savedTournament = localStorage.getItem(getTournamentStorageKey(firebaseUser.uid));
          const hasLocalTournament = Boolean(savedTournament);

          if (!isSharedViewer) {
            const restoredTournament = savedTournament
              ? (() => {
                const parsedTournament = JSON.parse(savedTournament) as Tournament;
                const hasStartedMatch = Boolean(parsedTournament?.startedAt);
                const hasRounds = Array.isArray(parsedTournament?.rounds) && parsedTournament.rounds.length > 0;
                return hasSetupDraftChanges(parsedTournament) || hasStartedMatch || hasRounds
                  ? parsedTournament
                  : createFreshTournamentDraft();
              })()
              : createFreshTournamentDraft();
            setTournament(restoredTournament);
          }

          setUser(firebaseUser);
          setIsLoggedIn(true);
          if (!isSharedViewer) setScreen('dashboard');

          // Restore cached history instantly so user won't lose data if cloud sync is delayed.
          try {
            const rawHistory = localStorage.getItem(getTournamentHistoryStorageKey(firebaseUser.uid));
            if (rawHistory) {
              const parsedHistory = JSON.parse(rawHistory) as TournamentHistory[];
              const normalized = parsedHistory.map((item) => normalizeHistoryTournament(item));
              setTournaments(normalized);
            } else {
              setTournaments([]);
            }
          } catch (historyErr) {
            console.error('Read local history cache error:', historyErr);
            setTournaments([]);
          }

          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userStatsRef = doc(db, PLAYER_STATS_COLLECTION, firebaseUser.uid);
          const [userDoc, userStatsDoc] = await withTimeout(Promise.all([
            getDoc(userDocRef),
            getDoc(userStatsRef)
          ]), 8000, 'Auth profile bootstrap');
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userStatsData = userStatsDoc.exists() ? (userStatsDoc.data() || {}) : {};
            const existingMmr = Number(userData?.mmr);
            const existingTotalMatches = Number(userData?.totalMatches);
            const statsMmr = Number(userStatsData?.mmr);
            const statsTotalMatches = Number(userStatsData?.totalMatches);
            const statsWins = Number(userStatsData?.wins);
            const statsLosses = Number(userStatsData?.losses);
            const locationActivity = userData?.locationActivity;
            const totalLocationActivity = locationActivity && typeof locationActivity === 'object'
              ? Object.values(locationActivity).reduce<number>((total, count) => {
                const normalizedCount = Number(count);
                if (!Number.isFinite(normalizedCount) || normalizedCount <= 0) return total;
                return total + normalizedCount;
              }, 0)
              : 0;
            const shouldNormalizeLegacyInitialMmr =
              existingMmr === 500 &&
              (!Number.isFinite(existingTotalMatches) || existingTotalMatches <= 0) &&
              totalLocationActivity === 0;

            const normalizedUserData: Record<string, any> = {
              ...userData,
              ...(shouldForceAdminRole ? { role: 'admin' } : {}),
              mmr: Number.isFinite(statsMmr)
                ? Math.max(0, statsMmr)
                : (shouldNormalizeLegacyInitialMmr
                  ? 0
                  : (Number.isFinite(existingMmr) ? existingMmr : 0)),
              totalMatches: Number.isFinite(statsTotalMatches) && statsTotalMatches >= 0
                ? statsTotalMatches
                : (Number.isFinite(existingTotalMatches) && existingTotalMatches >= 0
                  ? existingTotalMatches
                  : 0),
              wins: Number.isFinite(statsWins) && statsWins >= 0 ? statsWins : Number(userData?.wins || 0),
              losses: Number.isFinite(statsLosses) && statsLosses >= 0 ? statsLosses : Number(userData?.losses || 0)
            };

            const needsBackfill =
              !Number.isFinite(existingMmr) ||
              !Number.isFinite(existingTotalMatches) ||
              existingTotalMatches < 0 ||
              shouldNormalizeLegacyInitialMmr;

            if (needsBackfill) {
              setDoc(userDocRef, {
                mmr: normalizedUserData.mmr,
                totalMatches: normalizedUserData.totalMatches
              }, { merge: true }).catch((err) => console.error('User profile backfill error:', err));
            }

            if (shouldForceAdminRole && userData?.role !== 'admin') {
              setDoc(userDocRef, {
                role: 'admin'
              }, { merge: true }).catch((err) => console.error('Admin role backfill error:', err));
            }

            setUser({ ...firebaseUser, ...normalizedUserData });
            if (
              !isSharedViewer &&
              !hasLocalTournament &&
              normalizedUserData?.activeTournament &&
              Array.isArray(normalizedUserData.activeTournament.rounds) &&
              normalizedUserData.activeTournament.rounds.length > 0
            ) {
              setTournament(normalizedUserData.activeTournament as Tournament);
            }
          } else {
            // Initialize user if not exists
            const initialData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Padel Player',
              username: firebaseUser.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user' + Math.floor(Math.random() * 1000),
              photoURL: firebaseUser.photoURL,
              phoneNumber: '',
              mmr: 0, // Starting MMR
              totalMatches: 0,
              region: 'Jakarta Selatan, DKI Jakarta',
              homeBase: 'Jakarta Selatan, DKI Jakarta',
              locationActivity: { 'Jakarta Selatan, DKI Jakarta': 0 },
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, initialData);
            if (shouldForceAdminRole) {
              await setDoc(userDocRef, { role: 'admin' }, { merge: true }).catch((err) => {
                console.error('Initial admin role backfill error:', err);
              });
            }
            setUser({ ...firebaseUser, ...initialData, ...(shouldForceAdminRole ? { role: 'admin' } : {}) });
          }

          // Fetch tournaments history for this user (SSOT from player_match_ledger, fallback owner-based query).
          try {
            const fetchedTournaments = await fetchTournamentHistoryForUser(firebaseUser.uid);
            setTournaments(prev => {
              const merged = new Map<string, TournamentHistory>();
              [...prev, ...fetchedTournaments].forEach((item) => {
                const existing = merged.get(item.id);
                if (!existing) {
                  merged.set(item.id, item);
                  return;
                }
                const existingTs = new Date(existing.date).getTime();
                const itemTs = new Date(item.date).getTime();
                if (itemTs >= existingTs) merged.set(item.id, item);
              });
              return Array.from(merged.values()).sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            });
          } catch (err) {
            console.error('Error fetching tournaments:', err);
          }
        } else {
          setUser(null);
          setIsLoggedIn(false);
          setDraftMatchBackgroundId(null);
          setAllPlayers([]);
          if (!isSharedViewer) {
            setTournament(createFreshTournamentDraft());
          }
          if (!isSharedViewer) setScreen('login');
          else setScreen(sharedTargetScreen);
          setTournaments([]);
        }
      } catch (err) {
        console.error('Auth bootstrap error:', err);
      } finally {
        setIsAuthChecked(true);
        isAuthResolvedRef.current = true;
      }
    });

    return () => unsubscribe();
  }, [
    e2eBackgroundPlayers,
    e2eBackgroundTournament,
    e2eFinishedHistory,
    initialE2EScenario,
    isSharedViewer,
    sharedTargetScreen
  ]);

  useEffect(() => {
    if (!isAppShellRoute) return;
    if (!isAuthResolvedRef.current) return;
    if (isHandlingPopStateRef.current) {
      isHandlingPopStateRef.current = false;
      return;
    }

    const currentState = window.history.state;
    const nextState = { __fomPlay: true, screen };

    if (currentState?.__fomPlay && currentState.screen === screen) return;

    if (!currentState?.__fomPlay) {
      window.history.replaceState(nextState, '');
      return;
    }

    window.history.pushState(nextState, '');
  }, [isAppShellRoute, screen]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const forceAppShell = isAppShellQuery(params);
      const nextRoute = resolveTopLevelRoute(window.location.pathname, forceAppShell, marketingBasePath);
      setTopLevelRoute(nextRoute);

      if (nextRoute !== 'app' && !forceAppShell) {
        return;
      }

      const targetScreen = event.state?.__fomPlay?.screen || event.state?.screen;
      if (targetScreen) {
        isHandlingPopStateRef.current = true;
        setScreen(targetScreen as Screen);
        return;
      }

      if (isLoggedIn) {
        isHandlingPopStateRef.current = true;
        setScreen('dashboard');
        window.history.replaceState({ __fomPlay: true, screen: 'dashboard' }, '');
      } else {
        isHandlingPopStateRef.current = true;
        const fallbackScreen = params.get('shared') ? sharedTargetScreen : 'login';
        setScreen(fallbackScreen);
        window.history.replaceState({ __fomPlay: true, screen: fallbackScreen }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, marketingBasePath, sharedTargetScreen]);

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (!event.touches?.length) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, ts: Date.now() };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current || !event.changedTouches?.length) return;
      const start = touchStartRef.current;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      const dt = Date.now() - start.ts;
      touchStartRef.current = null;

      // iOS-like edge swipe from left to go back.
      const isEdgeSwipeBack = start.x <= 28 && dx > 90 && dy < 70 && dt < 900;
      if (isEdgeSwipeBack) {
        window.history.back();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (!sharedMatchId || !isSharedViewer) return;
    const sharedRef = doc(db, 'sharedMatches', sharedMatchId);
    const unsub = onSnapshot(sharedRef, (snap) => {
      if (!snap.exists()) {
        setIsSharedDataReady(true);
        return;
      }
      const data = snap.data();
      if (data?.tournament) {
        setTournament(data.tournament as Tournament);
        setScreen(sharedTargetScreen);
      }
      setIsSharedDataReady(true);
    }, (err) => {
      console.error('Shared match subscribe error:', err);
      setIsSharedDataReady(true);
    });
    return () => unsub();
  }, [sharedMatchId, isSharedViewer, sharedTargetScreen]);

  useEffect(() => {
    if (!sharedMatchId || isSharedViewer) return;
    if (!user?.uid) return;
    const isEmptyTournament = (!tournament.rounds || tournament.rounds.length === 0) && (!tournament.players || tournament.players.length === 0);
    if (isEmptyTournament) return;
    const sharedRef = doc(db, 'sharedMatches', sharedMatchId);
    setDoc(sharedRef, {
      tournament: toFirestoreSafe(tournament),
      hostUid: user.uid,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch((err) => {
      console.error('Shared match sync error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null,
        sharedMatchId
      });
    });
  }, [tournament, sharedMatchId, isSharedViewer, user?.uid]);

  useEffect(() => {
    if (isSharedViewer) return;
    if (!user?.uid) return;
    if (sharedMatchId) return;
    if (!tournament?.startedAt) return;

    const storedShareId = localStorage.getItem(getTournamentShareStorageKey(user.uid, tournament.startedAt));
    if (storedShareId) {
      setSharedMatchId(storedShareId);
    }
  }, [isSharedViewer, user?.uid, sharedMatchId, tournament?.startedAt]);

  useEffect(() => {
    if (!user?.uid || isSharedViewer) return;
    localStorage.setItem(getPlayersStorageKey(user.uid), JSON.stringify(allPlayers));
  }, [allPlayers, user?.uid, isSharedViewer]);

  useEffect(() => {
    if (!user?.uid || isSharedViewer) return;
    localStorage.setItem(getTournamentStorageKey(user.uid), JSON.stringify(tournament));
  }, [tournament, user?.uid, isSharedViewer]);

  useEffect(() => {
    if (isSharedViewer) return;
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    const hasActivity =
      (tournament.rounds && tournament.rounds.length > 0) ||
      (tournament.players && tournament.players.length > 0);
    if (!hasActivity) {
      setActiveSaveState('saved');
      return;
    }

    setActiveSaveState('saving');
    if (activeSaveTimeoutRef.current) {
      window.clearTimeout(activeSaveTimeoutRef.current);
    }

    activeSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', uid), {
          activeTournament: toFirestoreSafe(tournament),
          activeTournamentUpdatedAt: serverTimestamp()
        }, { merge: true });
        setActiveSaveState('saved');
      } catch (err) {
        console.error('Active tournament autosave error:', err);
        setActiveSaveState('error');
      }
    }, 450);

    return () => {
      if (activeSaveTimeoutRef.current) {
        window.clearTimeout(activeSaveTimeoutRef.current);
      }
    };
  }, [tournament, user?.uid, isSharedViewer]);

  useEffect(() => {
    if (!user?.uid || isSharedViewer) return;
    try {
      localStorage.setItem(getTournamentHistoryStorageKey(user.uid), JSON.stringify(tournaments));
    } catch (err) {
      console.error('Write local history cache error:', err);
    }
  }, [tournaments, user?.uid, isSharedViewer]);

  const removeNotificationToast = (id: string) => {
    setNotificationToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = notificationToastTimeoutsRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete notificationToastTimeoutsRef.current[id];
    }
  };

  const inferNotificationTone = (
    title: string,
    message: string,
    type: AppNotification['type'],
    explicitTone?: AppNotification['tone']
  ): AppNotification['tone'] => {
    if (explicitTone) return explicitTone;
    if (type === 'achievement') return 'achievement';
    if (type === 'match' || type === 'tournament') return 'success';

    const signal = `${title} ${message}`.toLowerCase();
    if (
      signal.includes('failed') ||
      signal.includes('unable') ||
      signal.includes('denied') ||
      signal.includes('problem') ||
      signal.includes('cannot') ||
      signal.includes('required') ||
      signal.includes('not found') ||
      signal.includes('declined')
    ) {
      return 'error';
    }
    if (
      signal.includes('success') ||
      signal.includes('sent') ||
      signal.includes('ready') ||
      signal.includes('updated') ||
      signal.includes('active') ||
      signal.includes('copied') ||
      signal.includes('completed') ||
      signal.includes('new friend') ||
      signal.includes('thanks') ||
      signal.includes('marked')
    ) {
      return 'success';
    }
    return 'info';
  };

  const addNotification = (
    title: string,
    message: string,
    type: AppNotification['type'],
    tone?: AppNotification['tone']
  ) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: new Date(),
      type,
      tone: inferNotificationTone(title, message, type, tone),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    setNotificationToasts((prev) => [newNotif, ...prev].slice(0, 3));
    notificationToastTimeoutsRef.current[newNotif.id] = window.setTimeout(() => {
      setNotificationToasts((prev) => prev.filter((toast) => toast.id !== newNotif.id));
      delete notificationToastTimeoutsRef.current[newNotif.id];
    }, 3200);

    // Browser Notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addNotification('Notifications Active!', 'You will receive match updates here.', 'system');
      }
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setScreen('dashboard');
  };

  const showShareCopiedToast = (state: 'copied' | 'ready' | 'failed') => {
    if (state === 'copied') {
      addNotification('Share Link Ready', 'Link copied successfully.', 'system', 'success');
      return;
    }
    if (state === 'ready') {
      addNotification('Share Link Ready', 'Link is ready to share.', 'system', 'info');
      return;
    }
    addNotification('Share Failed', 'Unable to copy or share link right now.', 'system', 'error');
  };

  type ShareDeliveryResult = 'copied' | 'shared' | 'manual' | 'failed';

  const tryCopyToClipboard = async (text: string): Promise<ShareDeliveryResult> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return 'copied';
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const copied = document.execCommand('copy');
      document.body.removeChild(ta);
      if (copied) return 'copied';
      // Some mobile browsers can still copy successfully even when execCommand returns false.
      return 'copied';
    } catch {
      // fallback below
    }

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ url: text });
        return 'shared';
      }
    } catch {
      // fallback below
    }

    try {
      window.prompt('Copy this link:', text);
      return 'manual';
    } catch {
      // ignore
    }
    return 'failed';
  };

  const toFirestoreSafe = <T,>(value: T): T => {
    return JSON.parse(JSON.stringify(value)) as T;
  };

  const getShareBaseUrl = () => {
    const envPublicUrl = ((import.meta as any).env?.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
    if (envPublicUrl) {
      return envPublicUrl.startsWith('http://') || envPublicUrl.startsWith('https://')
        ? envPublicUrl
        : `https://${envPublicUrl}`;
    }
    return `${window.location.origin}${window.location.pathname}`;
  };

  const buildShareUrl = (shareId: string, view: 'active' | 'klasemen') => {
    try {
      const shareUrl = new URL(getShareBaseUrl());
      shareUrl.searchParams.set('shared', shareId);
      if (view === 'klasemen') shareUrl.searchParams.set('view', 'klasemen');
      else shareUrl.searchParams.delete('view');

      const isLocalHost = ['localhost', '127.0.0.1'].includes(shareUrl.hostname);
      const envNetworkHost = ((import.meta as any).env?.VITE_SHARE_NETWORK_HOST as string | undefined)?.trim() || '';
      let savedNetworkHost = '';
      try {
        savedNetworkHost = localStorage.getItem('fom_share_network_host') || '';
      } catch {
        savedNetworkHost = '';
      }
      const networkHost = (envNetworkHost || savedNetworkHost).trim();

      if (isLocalHost && networkHost) {
        shareUrl.hostname = networkHost;
        shareUrl.protocol = 'http:';
      }

      return shareUrl.toString();
    } catch {
      // Last-resort fallback to avoid runtime crash on malformed URL environments.
      const fallback = `${window.location.origin}/?shared=${encodeURIComponent(shareId)}${view === 'klasemen' ? '&view=klasemen' : ''}`;
      return fallback;
    }
  };

  const handleOpenLiveStandings = () => {
    setSelectedKlasemenTournament(activeScreenTournament || tournament);
    setKlasemenBackScreen('active');
    setScreen('klasemen');
  };

  const buildReadOnlyTournamentFromHistory = (history: TournamentHistory): Tournament => {
    const rounds = (history.rounds || []).map((round) => ({
      ...round,
      playersBye: Array.isArray(round.playersBye) ? round.playersBye : []
    }));
    const fallbackStartedAt = typeof history.startedAt === 'number'
      ? history.startedAt
      : (history.date ? new Date(history.date).getTime() : undefined);
    const fallbackEndedAt = typeof history.endedAt === 'number'
      ? history.endedAt
      : fallbackStartedAt;
    const detectedCourts = Math.max(1, ...rounds.flatMap((round) => round.matches.map((match) => match.court || 1)));
    const maxKnownMatchPoints = rounds.reduce((maxPoints, round) => (
      round.matches.reduce((roundMax, match) => (
        Math.max(roundMax, (match.teamA.score || 0) + (match.teamB.score || 0))
      ), maxPoints)
    ), 0);

    return {
      id: history.id,
      name: history.name,
      format: history.format,
      backgroundId: history.backgroundId,
      criteria: history.criteria || 'Points Won',
      scoringType: history.scoringType,
      startedAt: fallbackStartedAt,
      endedAt: fallbackEndedAt,
      courts: history.courts || detectedCourts,
      totalPoints: history.totalPoints ?? (history.format === 'Match Play' ? 0 : Math.max(21, maxKnownMatchPoints || 21)),
      players: history.players || [],
      courtChanges: normalizeCourtChanges(history.courtChanges),
      rounds,
      numRounds: history.numRounds || rounds.length || 1,
      venueName: history.venueName,
      location: history.location
    };
  };

  const handleOpenHistoryFinalStandings = () => {
    if (!selectedHistory) return;
    setSelectedKlasemenTournament(selectedHistory);
    setKlasemenBackScreen('history-detail');
    setScreen('klasemen');
  };

  const handleOpenHistoryMatchDetails = () => {
    if (!selectedHistory) return;
    setActiveScreenTournament(buildReadOnlyTournamentFromHistory(selectedHistory));
    setActiveBackScreen('history-detail');
    setScreen('active');
  };

  const handleOpenHistoryTournament = (
    history: TournamentHistory,
    backScreen: 'dashboard' | 'history' | 'profile'
  ) => {
    setHistoryBackScreen(backScreen);
    setSelectedHistory(history);
    setScreen('history-detail');
  };

  const handleOpenActiveFromStandings = () => {
    const standingsTournament = selectedKlasemenTournament || tournament;
    if (isSharedViewer) {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if (klasemenBackScreen === 'active') {
      setActiveScreenTournament(null);
      setActiveBackScreen('klasemen');
      setScreen('active');
      return;
    }

    if ('numPlayers' in standingsTournament) {
      setActiveScreenTournament(buildReadOnlyTournamentFromHistory(standingsTournament as TournamentHistory));
    } else {
      // Returning from live standings should keep the editable active match context.
      setActiveScreenTournament(null);
    }
    setActiveBackScreen('klasemen');
    setScreen('active');
  };

  const handleShareCurrentMatch = async () => {
    try {
      const currentUid = auth.currentUser?.uid || user?.uid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share matches.', 'system');
        return;
      }

      let shareId = sharedMatchId || Math.random().toString(36).slice(2, 10);
      const safeTournament = toFirestoreSafe(tournament);
      const writePayload = {
        tournament: safeTournament,
        hostUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        // Update existing share link if available.
        await setDoc(doc(db, 'sharedMatches', shareId), writePayload, { merge: true });
      } catch (firstErr) {
        // Fallback: if existing doc is not writable, mint a fresh share link.
        shareId = Math.random().toString(36).slice(2, 10);
        await setDoc(doc(db, 'sharedMatches', shareId), writePayload, { merge: false });
      }

      setSharedMatchId(shareId);
      if (tournament?.startedAt) {
        localStorage.setItem(getTournamentShareStorageKey(currentUid, tournament.startedAt), shareId);
      }
      const finalUrl = buildShareUrl(shareId, 'active');

      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        addNotification('Copy Failed', 'Clipboard permission was denied by the browser. Please try again.', 'system', 'error');
      }
    } catch (err) {
      console.error('Share current match error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null
      });
      showShareCopiedToast('failed');
    }
  };

  const handleShareStandings = async (targetTournament: Tournament | TournamentHistory) => {
    try {
      if (isSharedViewer && sharedMatchId) {
        const currentSharedUrl = buildShareUrl(sharedMatchId, 'klasemen');
        const shareResult = await tryCopyToClipboard(currentSharedUrl);
        if (shareResult === 'copied') showShareCopiedToast('copied');
        else if (shareResult === 'shared' || shareResult === 'manual') showShareCopiedToast('ready');
        else addNotification('Copy Failed', 'Clipboard permission was denied by the browser. Please try again.', 'system', 'error');
        return;
      }

      const currentUid = auth.currentUser?.uid || user?.uid;
      if (!currentUid) {
        addNotification('Login Required', 'Please log in first to share standings.', 'system');
        return;
      }

      const shareId = Math.random().toString(36).slice(2, 10);
      const safeTournament = toFirestoreSafe(targetTournament);
      await setDoc(doc(db, 'sharedMatches', shareId), {
        tournament: safeTournament,
        hostUid: currentUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: false });
      const finalUrl = buildShareUrl(shareId, 'klasemen');
      const shareResult = await tryCopyToClipboard(finalUrl);
      if (shareResult === 'copied') {
        showShareCopiedToast('copied');
      } else if (shareResult === 'shared' || shareResult === 'manual') {
        showShareCopiedToast('ready');
      } else {
        addNotification('Copy Failed', 'Clipboard permission was denied by the browser. Please try again.', 'system', 'error');
      }
    } catch (err) {
      console.error('Share standings error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null
      });
      showShareCopiedToast('failed');
    }
  };


  const handleGenerateTournament = (settings: Tournament) => {
    const now = Date.now();
    const players = [...settings.players].filter(p => !!p);
    const sanitizedInactivePlayerIds = sanitizeInactivePlayerIds(players, settings.inactivePlayerIds);
    const inactivePlayerIdSet = new Set(sanitizedInactivePlayerIds);
    const activePlayers = players.filter((player) => !inactivePlayerIdSet.has(player.id));
    const rounds: Round[] = [];
    const numRounds = settings.numRounds;
    const playersPerMatch = 4;
    const maxMatchesPerRound = settings.courts;

    if (settings.format === 'Americano') {
      // Pre-generate all rounds for Americano with partner/opponent diversity balancing
      const playerMatchCounts: Record<string, number> = {};
      const partnerCounts: Record<string, Record<string, number>> = {};
      const opponentCounts: Record<string, Record<string, number>> = {};
      const lastPartnerByPlayer: Record<string, string | null> = {};
      activePlayers.forEach(p => {
        if (p && p.id) {
          playerMatchCounts[p.id] = 0;
          partnerCounts[p.id] = {};
          opponentCounts[p.id] = {};
          lastPartnerByPlayer[p.id] = null;
        }
      });

      const getPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
        return map[a.id]?.[b.id] || 0;
      };

      const incrementPairCount = (map: Record<string, Record<string, number>>, a: Player, b: Player) => {
        map[a.id] ??= {};
        map[b.id] ??= {};
        map[a.id][b.id] = (map[a.id][b.id] || 0) + 1;
        map[b.id][a.id] = (map[b.id][a.id] || 0) + 1;
      };

      const listCombinationsOf3 = (arr: Player[]) => {
        const combos: Player[][] = [];
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            for (let k = j + 1; k < arr.length; k++) {
              combos.push([arr[i], arr[j], arr[k]]);
            }
          }
        }
        return combos;
      };

      const evaluateSplitPenalty = (group: Player[]) => {
        const splits: [number, number, number, number][] = [
          [0, 1, 2, 3], // (0,1) vs (2,3)
          [0, 2, 1, 3], // (0,2) vs (1,3)
          [0, 3, 1, 2], // (0,3) vs (1,2)
        ];
        let best = {
          penalty: Number.POSITIVE_INFINITY,
          teamA: [group[0], group[1]] as [Player, Player],
          teamB: [group[2], group[3]] as [Player, Player],
        };

        for (const [a1, a2, b1, b2] of splits) {
          const teamA: [Player, Player] = [group[a1], group[a2]];
          const teamB: [Player, Player] = [group[b1], group[b2]];

          const partnerPenaltyA =
            getPairCount(partnerCounts, teamA[0], teamA[1]) * 100 +
            (lastPartnerByPlayer[teamA[0].id] === teamA[1].id ? 180 : 0);
          const partnerPenaltyB =
            getPairCount(partnerCounts, teamB[0], teamB[1]) * 100 +
            (lastPartnerByPlayer[teamB[0].id] === teamB[1].id ? 180 : 0);

          const opponentPairs: [Player, Player][] = [
            [teamA[0], teamB[0]],
            [teamA[0], teamB[1]],
            [teamA[1], teamB[0]],
            [teamA[1], teamB[1]],
          ];
          const opponentPenalty = opponentPairs.reduce((sum, [x, y]) => sum + getPairCount(opponentCounts, x, y) * 12, 0);

          const penalty = partnerPenaltyA + partnerPenaltyB + opponentPenalty;
          if (penalty < best.penalty) {
            best = { penalty, teamA, teamB };
          }
        }
        return best;
      };

      for (let r = 1; r <= numRounds; r++) {
        // Prioritize players with fewer matches, randomize tie-break
        const sortedPlayers = [...activePlayers].sort((a, b) => {
          if (!a || !b) return 0;
          const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
          return diff !== 0 ? diff : (Math.random() - 0.5);
        });
        const roundMatches: Match[] = [];
        const playersNeeded = Math.min(Math.floor(activePlayers.length / 4) * 4, maxMatchesPerRound * 4);
        const playersInRound = sortedPlayers.slice(0, playersNeeded);
        const playersBye = sortedPlayers.slice(playersNeeded);

        const remaining = [...playersInRound];
        for (let m = 0; m < playersNeeded / 4; m++) {
          // Build one group of 4 with minimum repeated interactions
          remaining.sort((a, b) => {
            const diff = (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
            return diff !== 0 ? diff : (Math.random() - 0.5);
          });

          const seed = remaining[0];
          const candidates = remaining.slice(1);
          const candidateTrios = listCombinationsOf3(candidates);

          let bestGroup: Player[] = [seed, ...candidates.slice(0, 3)];
          let bestPenalty = Number.POSITIVE_INFINITY;
          for (const trio of candidateTrios) {
            const group = [seed, ...trio];
            const pairwisePenalty = group.reduce((sum, a, i) => {
              for (let j = i + 1; j < group.length; j++) {
                const b = group[j];
                const interactions = getPairCount(partnerCounts, a, b) * 16 + getPairCount(opponentCounts, a, b) * 6;
                sum += interactions;
                if (lastPartnerByPlayer[a.id] === b.id || lastPartnerByPlayer[b.id] === a.id) sum += 30;
              }
              return sum;
            }, 0);
            if (pairwisePenalty < bestPenalty) {
              bestPenalty = pairwisePenalty;
              bestGroup = group;
            }
          }

          const { teamA, teamB } = evaluateSplitPenalty(bestGroup);
          const groupIds = new Set(bestGroup.map(p => p.id));
          const nextRemaining = remaining.filter(p => !groupIds.has(p.id));
          remaining.splice(0, remaining.length, ...nextRemaining);

          roundMatches.push({
            id: `r${r}-m${m + 1}`,
            court: m + 1,
            roundId: r,
            status: r === 1 ? 'active' : 'pending',
            startedAt: r === 1 ? now : undefined,
            teamA: { players: teamA, score: 0 },
            teamB: { players: teamB, score: 0 }
          });

          const [p1, p2] = teamA;
          const [p3, p4] = teamB;
          [p1, p2, p3, p4].forEach(p => {
            playerMatchCounts[p.id] = (playerMatchCounts[p.id] || 0) + 1;
          });
          incrementPairCount(partnerCounts, p1, p2);
          incrementPairCount(partnerCounts, p3, p4);
          incrementPairCount(opponentCounts, p1, p3);
          incrementPairCount(opponentCounts, p1, p4);
          incrementPairCount(opponentCounts, p2, p3);
          incrementPairCount(opponentCounts, p2, p4);
          lastPartnerByPlayer[p1.id] = p2.id;
          lastPartnerByPlayer[p2.id] = p1.id;
          lastPartnerByPlayer[p3.id] = p4.id;
          lastPartnerByPlayer[p4.id] = p3.id;
        }

        rounds.push({
          id: r,
          matches: roundMatches,
          playersBye
        });
      }
    } else if (settings.format === 'Mexicano') {
      // Only generate the first round for Mexicano
      const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(activePlayers.length / 4) * 4, maxMatchesPerRound * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r1-m${m + 1}`,
          court: m + 1,
          roundId: 1,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0 },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0 }
        });
      }

      rounds.push({
        id: 1,
        matches: roundMatches,
        playersBye
      });
    } else if (settings.format === 'Match Play') {
      // Match Play (Traditional Sets/Games)
      const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(activePlayers.length / 4) * 4, maxMatchesPerRound * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r1-m${m + 1}`,
          court: m + 1,
          roundId: 1,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0, sets: [0] },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      rounds.push({
        id: 1,
        matches: roundMatches,
        playersBye
      });
    }

    setSharedMatchId(null);
    const tournamentId = settings.id || `tm_${Math.random().toString(36).slice(2, 10)}`;
    setTournament({
      ...settings,
      id: tournamentId,
      backgroundId: undefined,
      inactivePlayerIds: sanitizedInactivePlayerIds,
      courtChanges: [],
      rounds,
      startedAt: now,
      endedAt: undefined
    });
    setDraftMatchBackgroundId(null);
    setNeedsRegenerateFromRound(null);
    // Navigate to background picker before starting the match.
    setScreen('background-picker');
    addNotification('Matches Started!', `${settings.name} has been created with ${settings.players.length} players.`, 'tournament');

    // Send notifications to friends/players
    if (user) {
      settings.players.forEach(async (player) => {
        if (player.id !== user.uid) {
          try {
            const notifId = Math.random().toString(36).substr(2, 9);
            await setDoc(doc(db, 'users', player.id, 'notifications', notifId), {
              id: notifId,
              title: 'Match Invitation',
              message: `${user.displayName} invited you to the match "${settings.name}".`,
              timestamp: serverTimestamp(),
              type: 'tournament',
              read: false
            });
          } catch (err) {
            // Probably not a real user ID or permission denied
            console.log('Skipping notification for non-user player:', player.name);
          }
        }
      });
    }
  };

  const handleSkipMatchBackground = () => {
    const randomBackgroundId = getRandomMatchBackground(tournament.format);
    setDraftMatchBackgroundId(randomBackgroundId);
    setTournament((prev) => ({
      ...prev,
      backgroundId: randomBackgroundId
    }));
    setActiveScreenTournament(null);
    setActiveBackScreen('dashboard');
    setScreen('active');
  };

  const upsertPlayerFromFriend = (friend: Friend) => {
    const initials = friend.displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
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
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    setAllPlayers((prev) => {
      const existsInList = prev.some((p) => p.id === playerObj.id);
      const next = existsInList ? prev : [playerObj, ...prev];
      if (!existsInList) {
        console.info('[FriendsPicker] Added friend to allPlayers catalog', {
          friendUid: friend.uid,
          friendName: friend.displayName,
          allPlayersBefore: prev.length,
          allPlayersAfter: next.length
        });
      }
      return next;
    });
    setTournament((prev) => {
      const alreadySelected = prev.players.some((p) => p.id === playerObj.id);
      const nextPlayers = alreadySelected
        ? prev.players.filter((p) => p.id !== playerObj.id)
        : [...prev.players, playerObj];
      console.info('[FriendsPicker] Toggle friend selection for match', {
        friendUid: friend.uid,
        friendName: friend.displayName,
        action: alreadySelected ? 'removed' : 'added',
        selectedBefore: prev.players.length,
        selectedAfter: nextPlayers.length
      });
      return {
        ...prev,
        players: nextPlayers
      };
    });

    const uid = auth.currentUser?.uid || user?.uid;
    if (uid) {
      setDoc(doc(db, 'users', uid, 'friends', friend.uid), { lastPlayedAt: serverTimestamp() }, { merge: true })
        .catch((err) => console.error('Update friend lastPlayedAt error:', err));
    }
  };

  const handleAddPlayerDuringActiveMatch = (newPlayer: Player) => {
    setAllPlayers((prev) => {
      const exists = prev.some((player) => player.id === newPlayer.id);
      return exists ? prev : [newPlayer, ...prev];
    });

    setTournament((prev) => {
      const existsInTournament = (prev.players || []).some((player) => player.id === newPlayer.id);
      if (existsInTournament) return prev;

      const nextPlayers = [...(prev.players || []), newPlayer];
      const sanitizedInactive = sanitizeInactivePlayerIds(nextPlayers, prev.inactivePlayerIds);
      const nextTournament: Tournament = {
        ...prev,
        players: nextPlayers,
        inactivePlayerIds: sanitizedInactive
      };

      if (prev.format === 'Americano' && prev.rounds.length > 0) {
        return {
          ...nextTournament,
          rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
        };
      }

      return nextTournament;
    });

    addNotification(
      'New Player Added',
      `${newPlayer.name} akan ikut mulai ronde berikutnya.`,
      'system'
    );
  };

  const handleDeleteRoundsFrom = (roundId: number) => {
    const safeRoundId = Math.max(2, Math.floor(roundId || 0));
    const now = Date.now();
    const hasAnyDeletion = (tournament.rounds || []).some((round) => round.id >= safeRoundId);
    if (!hasAnyDeletion) return;

    setTournament((prev) => {
      if (!prev.rounds || prev.rounds.length === 0) return prev;

      const keptRounds = prev.rounds
        .filter((round) => round.id < safeRoundId)
        .map((round) => ({
          ...round,
          playersBye: [...(round.playersBye || [])],
          matches: round.matches.map((match) => ({
            ...match,
            teamA: { ...match.teamA, players: [...match.teamA.players] },
            teamB: { ...match.teamB, players: [...match.teamB.players] }
          }))
        }));

      if (keptRounds.length === prev.rounds.length) return prev;

      let normalizedRounds = keptRounds;
      const activeIdx = normalizedRounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
      if (activeIdx === -1 && normalizedRounds.length > 0) {
        const lastIdx = normalizedRounds.length - 1;
        normalizedRounds = normalizedRounds.map((round, idx) => ({
          ...round,
          matches: round.matches.map((match) => {
            if (idx === lastIdx) {
              return {
                ...match,
                status: 'active' as const,
                startedAt: match.startedAt || now
              };
            }
            return {
              ...match,
              status: 'completed' as const,
              duration: match.duration || (match.startedAt ? formatDurationFromMs(now - match.startedAt) : '00:00')
            };
          })
        }));
      }

      const nextTournament: Tournament = {
        ...prev,
        rounds: normalizedRounds,
        endedAt: undefined
      };

      if (nextTournament.format === 'Americano') {
        return {
          ...nextTournament,
          rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
        };
      }

      return nextTournament;
    });

    setNeedsRegenerateFromRound(null);
    addNotification(
      'Round Dihapus',
      `Round ${safeRoundId} onward has been deleted. Please regenerate from the latest scores.`,
      'system'
    );
  };

  const handleUpdateScore = (matchId: string, team: 'A' | 'B', score: number) => {
    let shouldInvalidateFutureRounds = false;
    let invalidateFromRoundId: number | null = null;
    setTournament(prev => {
      const editedRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.id === matchId));
      const activeRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
      const canInvalidateFutureRounds = (
        editedRoundIndex !== -1 &&
        activeRoundIndex !== -1 &&
        editedRoundIndex < activeRoundIndex &&
        prev.format !== 'Match Play'
      );
      let updatedMatchIsValidForStanding = false;

      const newRounds = prev.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => {
          if (match.id === matchId) {
            const nextScoreA = team === 'A' ? score : match.teamA.score;
            const nextScoreB = team === 'B' ? score : match.teamB.score;
            updatedMatchIsValidForStanding = (
              nextScoreA + nextScoreB === prev.totalPoints &&
              (nextScoreA > 0 || nextScoreB > 0)
            );
            return {
              ...match,
              teamA: { ...match.teamA, score: nextScoreA },
              teamB: { ...match.teamB, score: nextScoreB }
            };
          }
          return match;
        })
      }));

      if (canInvalidateFutureRounds && updatedMatchIsValidForStanding) {
        shouldInvalidateFutureRounds = true;
        invalidateFromRoundId = editedRoundIndex + 2;
      }

      return { ...prev, rounds: newRounds };
    });

    if (shouldInvalidateFutureRounds && invalidateFromRoundId !== null) {
      const nextFlag = needsRegenerateFromRound === null
        ? invalidateFromRoundId
        : Math.min(needsRegenerateFromRound, invalidateFromRoundId);

      if (nextFlag !== needsRegenerateFromRound) {
        setNeedsRegenerateFromRound(nextFlag);
        addNotification(
          'Schedule Needs Regeneration',
          `Older round scores were updated. Delete round ${nextFlag}+ and regenerate.`,
          'system'
        );
      }
    }
  };

  const handleUpdateActivePlayers = (activePlayerIds: string[]) => {
    const knownIds = new Set((tournament.players || []).map((player) => player.id));
    const requestedActiveIds = Array.from(new Set(activePlayerIds.filter((id) => knownIds.has(id))));
    const requestedActiveSet = new Set(requestedActiveIds);
    const nextInactivePlayerIds = (tournament.players || [])
      .map((player) => player.id)
      .filter((playerId) => !requestedActiveSet.has(playerId));
    const currentInactivePlayerIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
    const hasChanges = (
      nextInactivePlayerIds.length !== currentInactivePlayerIds.length ||
      nextInactivePlayerIds.some((playerId, idx) => playerId !== currentInactivePlayerIds[idx])
    );

    if (!hasChanges) return;

    setTournament((prev) => {
      const sanitizedInactive = sanitizeInactivePlayerIds(prev.players || [], nextInactivePlayerIds);
      const nextTournament = {
        ...prev,
        inactivePlayerIds: sanitizedInactive
      };

      if (prev.format === 'Americano' && prev.rounds.length > 0) {
        return {
          ...nextTournament,
          rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
        };
      }

      return nextTournament;
    });

    addNotification(
      'Active Players Updated',
      'Changes are saved and will apply starting from the next round.',
      'system'
    );
  };

  const handleNextRound = async () => {
    const now = Date.now();
    if (!tournament.rounds) return;
    if (needsRegenerateFromRound !== null) {
      addNotification(
        'Regeneration Required',
        `Delete round ${needsRegenerateFromRound}+ before continuing to the next round.`,
        'system'
      );
      return;
    }
    const activePlayers = getActivePlayersFromTournament(tournament);
    const activeRoundIndex = tournament.rounds.findIndex(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const currentRoundIndex = activeRoundIndex !== -1 ? activeRoundIndex : latestLockedRoundIndex;
    if (currentRoundIndex === -1) return;
    const activeRound = tournament.rounds[currentRoundIndex];
    if (tournament.format !== 'Match Play' && activeRound) {
      const incompleteMatches = activeRound.matches.filter((match) => (
        (match.teamA.score || 0) + (match.teamB.score || 0) !== tournament.totalPoints
      ));
      if (incompleteMatches.length > 0) {
        const proceed = window.confirm(
          `${incompleteMatches.length} matches in the active round have incomplete scores. Continue to the next round now?\n\nYou can still edit this round's scores, then delete the new round and regenerate.`
        );
        if (!proceed) return;
        addNotification(
          'Continue With Incomplete Scores',
          `Round continued with ${incompleteMatches.length} incomplete matches.`,
          'system'
        );
      }
    }
    const nextRoundId = currentRoundIndex + 2;
    const isConfiguredLastRound = currentRoundIndex >= (tournament.numRounds - 1);
    if (!isConfiguredLastRound && activePlayers.length < 4) {
      addNotification(
        'Not Enough Active Players',
        'At least 4 active players are required to continue to the next round.',
        'system'
      );
      return;
    }
    const hasPreGeneratedNextRound = Boolean(tournament.rounds[currentRoundIndex + 1]);
    const shouldFinishBecauseNoPreparedRound = tournament.format === 'Americano' && !hasPreGeneratedNextRound;
    const finalizedRounds = tournament.rounds.map((round, idx) => {
      if (idx !== currentRoundIndex) return round;
      return {
        ...round,
        matches: round.matches.map((m) => m ? ({
          ...m,
          status: 'completed' as const,
          duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
        }) : m)
      };
    });

    if (isConfiguredLastRound || shouldFinishBecauseNoPreparedRound) {
      // Tournament finished - mark last round as completed
      setTournament(prev => ({ ...prev, rounds: finalizedRounds, endedAt: now }));
      addNotification('Matches Completed!', `Congratulations to the winners of ${tournament.name}!`, 'achievement');

      // Save tournament to history. Aggregate stats are handled by Cloud Functions.
      if (user) {
        const historyItem: TournamentHistory = {
          id: tournament.id || Math.random().toString(36).substr(2, 9),
          userId: user.uid,
          name: tournament.name,
          format: tournament.format,
          backgroundId: tournament.backgroundId,
          criteria: tournament.criteria,
          scoringType: tournament.scoringType,
          date: new Date(),
          startedAt: tournament.startedAt,
          endedAt: now,
          courts: tournament.courts,
          totalPoints: tournament.totalPoints,
          numRounds: tournament.numRounds,
          numPlayers: tournament.players.length,
          rounds: finalizedRounds,
          players: tournament.players,
          courtChanges: normalizeCourtChanges(tournament.courtChanges),
          venueName: tournament.venueName,
          location: tournament.location
        };
        setTournaments(prev => [historyItem, ...prev]);
        setDoc(doc(db, 'tournaments', historyItem.id), {
          ...historyItem,
          date: serverTimestamp()
        }).catch((err) => console.error('Error saving tournament:', err));
      }

      setSelectedKlasemenTournament({
        ...tournament,
        rounds: finalizedRounds,
        endedAt: now
      });
      return;
    }

    if (tournament.format === 'Mexicano') {
      // Generate next round for Mexicano:
      // 1) Balance total match count first (fair play opportunity)
      // 2) Then apply Mexicano ranking rules (W / Points + Diff)
      const playerStatsMap: Record<string, { id: string, w: number, pointsDiff: number, totalPoints: number, matchCount: number }> = {};
      activePlayers.forEach(p => {
        playerStatsMap[p.id] = { id: p.id, w: 0, pointsDiff: 0, totalPoints: 0, matchCount: 0 };
      });

      tournament.rounds.forEach(round => {
        round.matches.forEach(match => {
          // Include the current round which is about to be marked as completed
          const isCurrentRound = match.roundId === currentRoundIndex + 1;
          if (match.status === 'completed' || isCurrentRound) {
            const scoreA = match.teamA.score;
            const scoreB = match.teamB.score;
            match.teamA.players.forEach(p => {
              const s = playerStatsMap[p.id];
              if (!s) return;
              s.totalPoints += scoreA;
              s.pointsDiff += (scoreA - scoreB);
              if (scoreA > scoreB) s.w++;
              s.matchCount++;
            });
            match.teamB.players.forEach(p => {
              const s = playerStatsMap[p.id];
              if (!s) return;
              s.totalPoints += scoreB;
              s.pointsDiff += (scoreB - scoreA);
              if (scoreB > scoreA) s.w++;
              s.matchCount++;
            });
          }
        });
      });

      const compareByStanding = (a: Player, b: Player) => {
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (tournament.criteria === 'Matches Won') {
          if (statsB.w !== statsA.w) return statsB.w - statsA.w;
        } else {
          if (statsB.totalPoints !== statsA.totalPoints) return statsB.totalPoints - statsA.totalPoints;
        }
        if (statsB.pointsDiff !== statsA.pointsDiff) return statsB.pointsDiff - statsA.pointsDiff;
        return 0;
      };

      const sortedByFairnessThenStanding = [...activePlayers].sort((a, b) => {
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (!statsA || !statsB) return 0;

        // Priority #1: players with fewer matches must be selected first
        if (statsA.matchCount !== statsB.matchCount) return statsA.matchCount - statsB.matchCount;

        // Priority #2: within same match count bucket, follow Mexicano standing
        const standingDiff = compareByStanding(a, b);
        if (standingDiff !== 0) return standingDiff;

        // Final tie-break to avoid deterministic lock-ins
        return Math.random() - 0.5;
      });

      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(activePlayers.length / 4) * 4, tournament.courts * 4);
      const selectedPlayers = sortedByFairnessThenStanding.slice(0, playersNeeded);
      const playersBye = sortedByFairnessThenStanding.slice(playersNeeded);

      // Apply Mexicano ranking structure inside selected players
      const playersInRound = [...selectedPlayers].sort((a, b) => {
        const standingDiff = compareByStanding(a, b);
        if (standingDiff !== 0) return standingDiff;
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (!statsA || !statsB) return 0;
        if (statsA.matchCount !== statsB.matchCount) return statsA.matchCount - statsB.matchCount;
        return Math.random() - 0.5;
      });

      for (let m = 0; m < playersNeeded / 4; m++) {
        // Mexicano pairing: 1&4 vs 2&3 within each group of 4
        const p1 = playersInRound[m * 4];
        const p2 = playersInRound[m * 4 + 1];
        const p3 = playersInRound[m * 4 + 2];
        const p4 = playersInRound[m * 4 + 3];

        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [p1, p4], score: 0, sets: [0] },
          teamB: { players: [p2, p3], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...prev, rounds: newRounds, endedAt: undefined };
      });
    } else if (tournament.format === 'Match Play') {
      // Generate next round for Match Play (randomized like Americano but with tennis scoring)
      const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(shuffled.length / 4) * 4, tournament.courts * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0, sets: [0] },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...prev, rounds: newRounds, endedAt: undefined };
      });
    } else {
      // Americano uses pending rounds (kept in sync with current active roster)
      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          if (idx === currentRoundIndex + 1) {
            return { ...round, matches: round.matches.map(m => ({ ...m, status: 'active' as const, startedAt: m.startedAt || now })) };
          }
          return round;
        });
        return { ...prev, rounds: newRounds, endedAt: undefined };
      });
    }
    addNotification('New Round!', `Round ${nextRoundId} has started. Check your match schedule.`, 'match');
  };

  const handleUpdateRounds = (requestedRounds: number) => {
    const safeRequested = Number.isFinite(requestedRounds) ? Math.floor(requestedRounds) : NaN;
    if (!Number.isFinite(safeRequested) || safeRequested < 1) return false;

    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const minAllowedRounds = Math.max(1, latestLockedRoundIndex + 1);
    const nextNumRounds = Math.max(minAllowedRounds, Math.min(50, safeRequested));

    setTournament(prev => {
      let nextRounds = [...prev.rounds];

      if (nextNumRounds < nextRounds.length) {
        // Only trim future rounds; active/completed rounds are protected by minAllowedRounds.
        nextRounds = nextRounds.slice(0, nextNumRounds);
      }

      if (prev.format === 'Americano') {
        const nextTournament = {
          ...prev,
          inactivePlayerIds: sanitizeInactivePlayerIds(prev.players || [], prev.inactivePlayerIds)
        };
        nextRounds = rebuildAmericanoFutureRounds(nextTournament, nextNumRounds);
      }

      const completedRoundCount = nextRounds.filter((round) => (
        (round.matches || []).length > 0 &&
        round.matches.every((match) => match.status === 'completed')
      )).length;
      const effectiveTotalRounds = Math.max(nextNumRounds, nextRounds.length);
      const shouldRemainEnded = effectiveTotalRounds > 0 && completedRoundCount >= effectiveTotalRounds;

      return {
        ...prev,
        numRounds: nextNumRounds,
        rounds: nextRounds,
        endedAt: shouldRemainEnded ? prev.endedAt : undefined
      };
    });

    if (nextNumRounds === safeRequested) {
      addNotification('Round Updated', `Total rounds updated to ${nextNumRounds}.`, 'system');
    } else {
      addNotification('Round Adjusted', `Total rounds were adjusted to ${nextNumRounds} to keep the setup valid.`, 'system');
    }
    return true;
  };

  const handleUpdateCourts = (requestedCourts: number) => {
    const safeRequested = Number.isFinite(requestedCourts) ? Math.floor(requestedCourts) : NaN;
    if (!Number.isFinite(safeRequested) || safeRequested < 1) return false;
    const nextCourts = Math.max(1, Math.min(12, safeRequested));

    if (nextCourts === tournament.courts) return true;

    setTournament((prev) => {
      const activeRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
      const latestLockedRoundIndex = prev.rounds.reduce((latestIdx, round, idx) => {
        const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
        return hasPlayedMatch ? idx : latestIdx;
      }, -1);
      const currentRoundIndex = activeRoundIndex !== -1 ? activeRoundIndex : latestLockedRoundIndex;
      const effectiveFromRoundId = currentRoundIndex === -1 ? 1 : currentRoundIndex + 2;
      const nextCourtChanges = [
        ...(prev.courtChanges || []),
        {
          effectiveFromRoundId,
          fromCourts: prev.courts,
          toCourts: nextCourts,
          changedAt: Date.now()
        }
      ];
      const nextTournament = {
        ...prev,
        courts: nextCourts,
        courtChanges: nextCourtChanges
      };

      if (prev.format === 'Americano' && prev.rounds.length > 0) {
        return {
          ...nextTournament,
          rounds: rebuildAmericanoFutureRounds(nextTournament, nextTournament.numRounds)
        };
      }

      return nextTournament;
    });

    addNotification(
      'Court Updated',
      `Court count updated to ${nextCourts}. Changes apply starting from the next round.`,
      'system'
    );
    return true;
  };

  const handleUpdateMatchPlayScore = (matchId: string, team: 'A' | 'B') => {
    let setWinMessage: string | null = null;

    setTournament(prev => {
      const newRounds = prev.rounds.map(round => {
        const isMatchInRound = round.matches.some(m => m.id === matchId);
        if (!isMatchInRound) return round;

        const newMatches = round.matches.map(match => {
          if (match.id === matchId) {
            const scoringType = prev.scoringType || 'Golden Point';
            let pA = match.pointsA || '0';
            let pB = match.pointsB || '0';
            let gamesA = [...(match.teamA.sets || [0])];
            let gamesB = [...(match.teamB.sets || [0])];
            const currentSet = Number.isFinite(match.currentSet) ? (match.currentSet as number) : 0;
            if (gamesA[currentSet] === undefined || Number.isNaN(gamesA[currentSet])) gamesA[currentSet] = 0;
            if (gamesB[currentSet] === undefined || Number.isNaN(gamesB[currentSet])) gamesB[currentSet] = 0;

            // Once a set is already decided, keep it immutable to avoid corrupted states.
            const isSetAlreadyFinished =
              (gamesA[currentSet] >= 6 || gamesB[currentSet] >= 6) &&
              Math.abs(gamesA[currentSet] - gamesB[currentSet]) >= 2;
            if (isSetAlreadyFinished) {
              return {
                ...match,
                teamA: { ...match.teamA, sets: gamesA, score: gamesA.reduce((a, b) => a + b, 0) },
                teamB: { ...match.teamB, sets: gamesB, score: gamesB.reduce((a, b) => a + b, 0) }
              };
            }

            if (team === 'A') {
              if (pA === '0') pA = '15';
              else if (pA === '15') pA = '30';
              else if (pA === '30') pA = '40';
              else if (pA === '40') {
                if (pB === '40') {
                  if (scoringType === 'Golden Point') {
                    pA = 'Game';
                  } else {
                    pA = 'Ad';
                  }
                } else if (pB === 'Ad') {
                  pB = '40';
                } else {
                  pA = 'Game';
                }
              } else if (pA === 'Ad') {
                pA = 'Game';
              }
            } else {
              if (pB === '0') pB = '15';
              else if (pB === '15') pB = '30';
              else if (pB === '30') pB = '40';
              else if (pB === '40') {
                if (pA === '40') {
                  if (scoringType === 'Golden Point') {
                    pB = 'Game';
                  } else {
                    pB = 'Ad';
                  }
                } else if (pA === 'Ad') {
                  pA = '40';
                } else {
                  pB = 'Game';
                }
              } else if (pB === 'Ad') {
                pB = 'Game';
              }
            }

            // Check if game won
            if (pA === 'Game') {
              gamesA[currentSet]++;
              pA = '0';
              pB = '0';
            } else if (pB === 'Game') {
              gamesB[currentSet]++;
              pA = '0';
              pB = '0';
            }

            // Check if set won (simplified: first to 6 games)
            if (gamesA[currentSet] >= 6 && gamesA[currentSet] - gamesB[currentSet] >= 2) {
              setWinMessage = `Team A memenangkan set ${currentSet + 1} with score ${gamesA[currentSet]} - ${gamesB[currentSet]}`;
            } else if (gamesB[currentSet] >= 6 && gamesB[currentSet] - gamesA[currentSet] >= 2) {
              setWinMessage = `Team B memenangkan set ${currentSet + 1} with score ${gamesB[currentSet]} - ${gamesA[currentSet]}`;
            } else if (gamesA[currentSet] === 6 && gamesB[currentSet] === 6) {
              // Tie-break logic could go here, but let's keep it simple for now
            }

            return {
              ...match,
              pointsA: pA,
              pointsB: pB,
              teamA: { ...match.teamA, sets: gamesA, score: gamesA.reduce((a, b) => a + b, 0) },
              teamB: { ...match.teamB, sets: gamesB, score: gamesB.reduce((a, b) => a + b, 0) }
            };
          }
          return match;
        });
        return { ...round, matches: newMatches };
      });
      return { ...prev, rounds: newRounds };
    });

    if (setWinMessage) {
      addNotification('Set Done!', setWinMessage, 'achievement');
    }
  };

  const handleSwapPlayer = (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => {
    setTournament(prev => {
      const newRounds = prev.rounds.map(round => {
        const isMatchInRound = round.matches.some(m => m.id === matchId);
        if (!isMatchInRound) return round;

        let oldPlayer: Player | null = null;
        const newMatches = round.matches.map(match => {
          if (match.id === matchId) {
            const players = team === 'A' ? [...match.teamA.players] : [...match.teamB.players];
            oldPlayer = players[playerIndex];
            players[playerIndex] = newPlayer;
            return {
              ...match,
              teamA: team === 'A' ? { ...match.teamA, players } : match.teamA,
              teamB: team === 'B' ? { ...match.teamB, players } : match.teamB
            };
          }
          return match;
        });

        // If the new player was in the bye list, swap them with the old player
        const newPlayersBye = round.playersBye.map(p => p.id === newPlayer.id ? oldPlayer! : p);

        return { ...round, matches: newMatches, playersBye: newPlayersBye };
      });
      return { ...prev, rounds: newRounds };
    });
    addNotification('Player Replaced', 'The player has been replaced on the active court.', 'system');
  };

  const mockupV3Tournament = useMemo<Tournament>(() => {
    const basePlayers = [...INITIAL_PLAYERS].slice(0, 10).map((p, idx) => ({
      ...p,
      id: `mock-${idx + 1}`,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    }));
    const matchOneTeamA = [basePlayers[0], basePlayers[1]].filter(Boolean) as Player[];
    const matchOneTeamB = [basePlayers[2], basePlayers[3]].filter(Boolean) as Player[];
    const matchTwoTeamA = [basePlayers[4], basePlayers[5]].filter(Boolean) as Player[];
    const matchTwoTeamB = [basePlayers[6], basePlayers[7]].filter(Boolean) as Player[];
    const playersBye = [basePlayers[8], basePlayers[9]].filter(Boolean) as Player[];

    return {
      ...INITIAL_TOURNAMENT,
      name: 'Padel Matches',
      format: 'Americano',
      players: basePlayers,
      courts: 2,
      numRounds: 5,
      rounds: [
        {
          id: 1,
          playersBye,
          matches: [
            {
              id: 'mock-r1-m1',
              court: 1,
              roundId: 1,
              status: 'active',
              startedAt: Date.now() - 11 * 60 * 1000,
              duration: '00:11',
              teamA: { players: matchOneTeamA, score: 0 },
              teamB: { players: matchOneTeamB, score: 0 }
            },
            {
              id: 'mock-r1-m2',
              court: 2,
              roundId: 1,
              status: 'active',
              startedAt: Date.now() - 7 * 60 * 1000,
              duration: '00:07',
              teamA: { players: matchTwoTeamA, score: 0 },
              teamB: { players: matchTwoTeamB, score: 0 }
            }
          ]
        }
      ],
      startedAt: Date.now() - 11 * 60 * 1000
    };
  }, []);

  if (isMockupV3) {
    return (
      <MatchActiveScreen
        onBack={() => { }}
        onStartNewMatch={() => { }}
        tournament={mockupV3Tournament}
        onUpdateScore={() => { }}
        onNextRound={() => { }}
        onUpdateRounds={() => false}
        onUpdateCourts={() => false}
        onUpdateActivePlayers={() => { }}
        onAddManualPlayer={() => { }}
        onDeleteRoundsFrom={() => { }}
        needsRegenerateFromRound={null}
        onOpenStandings={() => { }}
        onSwapPlayer={() => { }}
        onUpdateMatchPlayScore={() => { }}
        onShareMatch={() => { }}
        isReadOnly={false}
        isSharedViewer={false}
        saveState="saved"
      />
    );
  }

  if (!isAppShellRoute) {
    return (
      <PublicMarketingRouter
        route={publicRoute}
        isLoggedIn={isLoggedIn}
        onOpenApp={() => navigateTopLevel('app')}
        onNavigate={navigateTopLevel}
      />
    );
  }

  if (!isAuthChecked) {
    return <AppLoadingScreen />;
  }

  if (isSharedViewer && !isSharedDataReady) {
    return <AppLoadingScreen />;
  }

  const showBottomNav =
    isLoggedIn &&
    !isSharedViewer &&
    ['dashboard', 'leaderboard', 'history', 'profile'].includes(screen);
  const notificationToastOffset = showBottomNav
    ? 'calc(var(--app-safe-bottom, 0px) + 92px)'
    : 'calc(var(--app-safe-bottom, 0px) + 16px)';

  return (
    <div className="min-h-screen bg-white">
      <div>
        {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
        {screen === 'dashboard' && (
          <DashboardScreen
            onStartMatch={() => {
              if (!hasSetupDraftChanges(tournament)) {
                setTournament(createFreshTournamentDraft());
              }
              setDraftMatchBackgroundId(null);
              setScreen('settings');
            }}
            onOpenRankingForMe={() => {
              setRankingFocusRequestId((prev) => prev + 1);
              setScreen('leaderboard');
            }}
            tournament={tournament}
            onContinueMatch={() => {
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen('active');
            }}
            onNotifications={() => {
              setNotificationBackScreen('dashboard');
              setScreen('notifications');
            }}
            onOpenHistoryList={() => {
              setHistoryBackScreen('dashboard');
              setScreen('history');
            }}
            onOpenHistoryMatch={(t) => handleOpenHistoryTournament(t, 'dashboard')}
            unreadCount={notifications.filter(n => !n.read).length}
            tournaments={tournaments}
            user={user}
          />
        )}
        {screen === 'leaderboard' && (
          <LeaderboardScreen
            currentUser={user}
            onOpenRankDetails={() => setScreen('rank-discovery')}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('leaderboard');
              setScreen('mmr-history');
            }}
            focusRequestId={rankingFocusRequestId}
          />
        )}
        {screen === 'rank-discovery' && (
          <RankDiscoveryScreen
            currentUser={user}
            onBack={() => setScreen('leaderboard')}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('rank-discovery');
              setScreen('mmr-history');
            }}
          />
        )}
        {screen === 'mmr-history' && (
          <MMRHistoryScreen
            currentUser={user}
            onBack={() => setScreen(mmrHistoryBackScreen)}
            onOpenRankDetails={() => setScreen('rank-discovery')}
          />
        )}
        {screen === 'history-detail' && selectedHistory && (
          <HistoryDetailScreen
            tournament={selectedHistory}
            onBack={() => {
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen(historyBackScreen);
            }}
            onViewFinalStandings={handleOpenHistoryFinalStandings}
            onViewMatchDetails={handleOpenHistoryMatchDetails}
          />
        )}
        {screen === 'history' && (
          <HistoryScreen
            tournaments={tournaments}
            onBack={() => setScreen(historyBackScreen)}
            onOpenTournament={(t) => handleOpenHistoryTournament(t, 'history')}
          />
        )}
        {screen === 'settings' && (
          <MatchSettingsScreen
            onBack={() => setScreen('dashboard')}
            onGenerate={handleGenerateTournament}
            onOpenFriends={() => {
              const selectedIds = new Set((tournament.players || []).filter(Boolean).map((p) => p.id));
              const allIds = new Set((allPlayers || []).filter(Boolean).map((p) => p.id));
              const missingFromList = Array.from(selectedIds).filter((id) => !allIds.has(id)).length;
              console.info('[FriendsPicker] Open from match settings', {
                selectedCount: selectedIds.size,
                allPlayersCount: allIds.size,
                missingFromList
              });
              setFriendsEntrySource('settings');
              setScreen('friends');
            }}
            tournament={tournament}
            setTournament={setTournament}
            allPlayers={allPlayers}
            setAllPlayers={setAllPlayers}
            onAddNotification={addNotification}
            currentUser={user}
            focusSection={settingsFocusSection}
            onFocusHandled={() => setSettingsFocusSection(null)}
          />
        )}
        {screen === 'background-picker' && (
          <MatchBackgroundPickerScreen
            tournament={tournament}
            selectedBackgroundId={draftMatchBackgroundId}
            onSelectBackground={setDraftMatchBackgroundId}
            onBack={() => setScreen('settings')}
            onSkip={handleSkipMatchBackground}
            onContinue={() => {
              if (!draftMatchBackgroundId) return;
              setTournament((prev) => ({
                ...prev,
                backgroundId: draftMatchBackgroundId
              }));
              setActiveScreenTournament(null);
              setActiveBackScreen('dashboard');
              setScreen('active');
            }}
          />
        )}
        {screen === 'active' && (
          <MatchActiveScreen
            onBack={() => {
              if (activeBackScreen === 'history-detail') {
                setScreen('history-detail');
                return;
              }
              if (activeBackScreen === 'history') {
                setScreen('history');
                return;
              }
              if (activeBackScreen === 'profile') {
                setScreen('profile');
                return;
              }
              if (activeBackScreen === 'klasemen') {
                setScreen('klasemen');
                return;
              }
              setScreen('dashboard');
            }}
            onStartNewMatch={() => {
              setDraftMatchBackgroundId(null);
              setScreen('settings');
            }}
            tournament={activeScreenTournament || tournament}
            onUpdateScore={handleUpdateScore}
            onNextRound={handleNextRound}
            onUpdateRounds={handleUpdateRounds}
            onUpdateCourts={handleUpdateCourts}
            onUpdateActivePlayers={handleUpdateActivePlayers}
            onAddManualPlayer={handleAddPlayerDuringActiveMatch}
            onDeleteRoundsFrom={handleDeleteRoundsFrom}
            needsRegenerateFromRound={needsRegenerateFromRound}
            onOpenStandings={handleOpenLiveStandings}
            onSwapPlayer={handleSwapPlayer}
            onUpdateMatchPlayScore={handleUpdateMatchPlayScore}
            onShareMatch={handleShareCurrentMatch}
            isReadOnly={isSharedViewer || Boolean(activeScreenTournament)}
            isSharedViewer={isSharedViewer}
            saveState={activeSaveState}
          />
        )}
        {screen === 'klasemen' && (
          <KlasemenScreen
            tournament={selectedKlasemenTournament || tournament}
            onBack={() => setScreen(isSharedViewer ? 'active' : klasemenBackScreen)}
            onShare={handleShareStandings}
            onOpenActive={handleOpenActiveFromStandings}
            isSharedViewer={isSharedViewer}
          />
        )}
        {screen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClearAll={handleClearAll}
            onBack={() => setScreen(notificationBackScreen)}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            onLogout={async () => {
              try {
                await signOut(auth);
              } catch (err) {
                console.error('Logout error:', err);
              }
            }}
            user={user}
            tournaments={tournaments}
            setUser={setUser}
            addNotification={addNotification}
            onOpenMmrHistory={() => {
              setMmrHistoryBackScreen('profile');
              setScreen('mmr-history');
            }}
            onOpenNotifications={() => {
              setNotificationBackScreen('profile');
              setScreen('notifications');
            }}
            onOpenFriends={() => {
              setFriendsEntrySource('profile');
              setScreen('friends');
            }}
            unreadCount={notifications.filter(n => !n.read).length}
          />
        )}
        {screen === 'friends' && (
          <FriendsScreen
            currentUser={user}
            onBack={() => setScreen(friendsEntrySource === 'settings' ? 'settings' : 'profile')}
            addNotification={addNotification}
            pickerMode={friendsEntrySource === 'settings'}
            selectedPlayerIds={tournament.players.map((p) => p.id)}
            onTogglePickForMatch={upsertPlayerFromFriend}
            onDonePick={() => {
              const selectedIds = new Set((tournament.players || []).filter(Boolean).map((p) => p.id));
              const allIds = new Set((allPlayers || []).filter(Boolean).map((p) => p.id));
              const missingFromList = Array.from(selectedIds).filter((id) => !allIds.has(id)).length;
              const summarySignature = `${selectedIds.size}:${allIds.size}:${missingFromList}`;
              if (lastFriendPickerSummaryRef.current !== summarySignature) {
                lastFriendPickerSummaryRef.current = summarySignature;
                console.info('[FriendsPicker] Done selecting players', {
                  selectedCount: selectedIds.size,
                  allPlayersCount: allIds.size,
                  missingFromList
                });
              }
              setSettingsFocusSection('players');
              setScreen('settings');
            }}
          />
        )}
      </div>

      {showBottomNav && (
        <BottomNav
          currentScreen={screen}
          setScreen={setScreen}
          unreadCount={notifications.filter(n => !n.read).length}
        />
      )}

      <AnimatePresence>
        {notificationToasts.length > 0 && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[145] w-[min(92vw,420px)] space-y-2"
            style={{ bottom: notificationToastOffset }}
          >
            <AnimatePresence initial={false}>
              {notificationToasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className={cn(
                    'w-full rounded-[20px] border shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur px-4 py-3 text-left',
                    getNotificationVisuals(toast).cardClass
                  )}
                >
                  {(() => {
                    const visuals = getNotificationVisuals(toast);
                    const Icon = visuals.icon;
                    return (
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center shrink-0', visuals.iconWrapClass)}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13px] font-bold truncate', visuals.titleClass)}>
                        {toast.title}
                      </p>
                      <p className={cn('mt-0.5 text-[12px] leading-snug', visuals.messageClass)}>
                        {toast.message}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotificationToast(toast.id)}
                      className={cn('shrink-0 p-1 -mr-1 tap-target', visuals.dismissClass)}
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                    );
                  })()}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
