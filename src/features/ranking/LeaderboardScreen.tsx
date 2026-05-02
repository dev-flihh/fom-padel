import React, { useEffect, useMemo, useState } from 'react';
import { BarChart2, BookOpen, Globe, MapPin, RefreshCw, Users } from 'lucide-react';
import { RegionSelector } from '../../components/RegionSelector';
import { cn } from '../../lib/utils';
import { type RankTier } from '../../types';
import { getRankInfo } from './rankUtils';
import {
  ALL_PROVINCES_FILTER,
  getDisplayInitials,
  getWinRateLabel,
  normalizeLeaderboardUser,
  sortUsersByMmrDesc,
  toProvinceName
} from './leaderboardUtils';
import { readCachedLeaderboardUsers, writeCachedLeaderboardUsers } from './leaderboardCache';
import { fetchLeaderboardUsersFromFirestore } from '../../services/leaderboardRepository';

const getLeaderboardPlacementStyles = (rank: number) => {
  if (rank === 1) return 'text-[#b8860b]';
  if (rank === 2) return 'text-[#7a8a99]';
  if (rank === 3) return 'text-[#9a5e3a]';
  return 'text-ios-gray';
};

const getLeaderboardMedal = (rank: number) => {
  if (rank <= 3) return String(rank);
  return `#${rank}`;
};

const getLeaderboardMedalChipStyles = (rank: number) => {
  if (rank === 1) return 'bg-[#f5c518] text-white shadow-[0_1px_5px_rgba(245,197,24,0.35)]';
  if (rank === 2) return 'bg-[#a0aec0] text-white shadow-[0_1px_5px_rgba(160,174,192,0.3)]';
  if (rank === 3) return 'bg-[#c47a45] text-white shadow-[0_1px_5px_rgba(196,122,69,0.3)]';
  return '';
};

const getLeaderboardPodiumRowStyles = (rank: number) => {
  if (rank === 1) return 'mx-[-14px] rounded-2xl border-l-[3px] border-l-[#f5c518] bg-gradient-to-r from-[#fffbeb] to-[#fff8e1] px-[14px]';
  if (rank === 2) return 'mx-[-14px] rounded-2xl border-l-[3px] border-l-[#a0aec0] bg-gradient-to-r from-[#f5f7fa] to-[#eef1f5] px-[14px]';
  if (rank === 3) return 'mx-[-14px] rounded-2xl border-l-[3px] border-l-[#c47a45] bg-gradient-to-r from-[#fdf6f0] to-[#faeee4] px-[14px]';
  return 'border-b border-black/[0.05]';
};

const getLeaderboardAvatarStyle = (name: string, rank: number, isCurrentUser: boolean) => {
  if (isCurrentUser) return { backgroundColor: '#fff6ef', color: '#e65e14' };
  const palette = [
    { backgroundColor: '#14b8a6', color: '#ffffff' },
    { backgroundColor: '#818cf8', color: '#ffffff' },
    { backgroundColor: '#fbbf24', color: '#ffffff' },
    { backgroundColor: '#f1f5f9', color: '#64748b' },
    { backgroundColor: '#e65e14', color: '#ffffff' }
  ];
  const seed = String(name || '').split('').reduce((total, char) => total + char.charCodeAt(0), rank);
  return palette[Math.abs(seed) % palette.length];
};

const getRankBadgeClass = (rankName: RankTier) => {
  if (rankName === 'Rookie') return 'bg-slate-100 text-slate-500';
  if (rankName === 'Amateur') return 'bg-[#fdf0e6] text-[#9a5e3a]';
  if (rankName === 'Challenger') return 'bg-[#fdf2ff] text-[#9333ea]';
  if (rankName === 'Elite') return 'bg-[#eef2ff] text-[#4f46e5]';
  if (rankName === 'Master') return 'bg-[#e8f5f2] text-[#0e7a62]';
  if (rankName === 'Grandmaster') return 'bg-red-50 text-red-600';
  if (rankName === 'Legend') return 'bg-[#fffbeb] text-[#b8860b]';
  return 'bg-primary/10 text-primary';
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
  const leaderboardUser = currentRankIndex >= 0 ? rankedUsers[currentRankIndex] : currentUser;
  const currentMmr = Number.isFinite(Number(leaderboardUser?.mmr)) ? Number(leaderboardUser.mmr) : 0;
  const currentMatches = Number.isFinite(Number(leaderboardUser?.totalMatches)) ? Number(leaderboardUser.totalMatches) : 0;
  const rankInfo = getRankInfo(currentMmr);
  const RankIcon = rankInfo.icon;

  return (
    <div className="relative mt-5 overflow-hidden rounded-[24px] bg-primary p-[22px] shadow-[0_6px_24px_rgba(230,94,20,0.28)] before:pointer-events-none before:absolute before:inset-y-0 before:left-[-58%] before:w-[44%] before:skew-x-[-20deg] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[cta-shimmer_3s_ease-in-out_infinite]">
      <div className="relative">
        <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white/65">Your Standing</p>
        <div className="mb-3 flex items-end gap-5">
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white/75">Rank</p>
            <p className="font-display text-[32px] font-black leading-none tracking-tight text-white tabular-nums">
              {currentRank ? `#${currentRank}` : '-'}
            </p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white/75">MMR</p>
            <p className="font-display text-[32px] font-black leading-none tracking-tight text-white tabular-nums">
              {currentMmr.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-px bg-white/30" />
          <div>
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white/75">Matches</p>
            <p className="font-display text-[32px] font-black leading-none tracking-tight text-white tabular-nums">
              {currentMatches}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[12px] font-bold text-white">
          <RankIcon size={13} />
          <span>{rankInfo.name}</span>
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
  const matchesLabel = `${totalMatches}M`;
  const areaLabel = toProvinceName(user?.region || user?.homeBase) || 'Unknown';
  const displayName = String(user?.displayName || 'Player');
  const initials = getDisplayInitials(displayName);
  const rankInfo = getRankInfo(mmr);
  const RankIcon = rankInfo.icon;
  const rowId = user?.uid ? `leaderboard-user-${user.uid}` : undefined;
  const winRate = getWinRateLabel(user);
  const avatarStyle = getLeaderboardAvatarStyle(displayName, rank, isCurrentUser);

  return (
    <div
      id={rowId}
      className={cn(
        'flex cursor-pointer items-center gap-3 py-[13px] transition-opacity active:opacity-60',
        getLeaderboardPodiumRowStyles(rank),
        isCurrentUser && rank > 3 && 'mx-[-14px] rounded-2xl border-b-0 bg-primary/[0.06] px-[14px]',
        isHighlighted && 'ring-2 ring-primary/20'
      )}
    >
      <div className={cn('flex w-7 shrink-0 justify-center text-center text-[13px] font-extrabold tracking-tight', getLeaderboardPlacementStyles(rank))}>
        <span className={cn(rank <= 3 && 'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black', getLeaderboardMedalChipStyles(rank))}>
          {getLeaderboardMedal(rank)}
        </span>
      </div>

      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-[14px] font-extrabold" style={avatarStyle}>
        {user.photoURL ? (
          <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span>{initials.slice(0, 1)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <h4 className="truncate text-[15px] font-bold leading-tight tracking-tight text-on-surface">{displayName}</h4>
          {isCurrentUser && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-white">
              You
            </span>
          )}
        </div>
        <p className="truncate text-[12px] font-medium text-ios-gray">
          {areaLabel} · {matchesLabel}
          {winRate && (
            <>
              {' · '}
              <span className={cn('font-bold', winRate.tone)}>{winRate.label}</span>
            </>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-display text-[17px] font-black leading-tight tracking-tight text-on-surface tabular-nums">
          {mmr.toLocaleString()} <span className="text-[11px] font-semibold tracking-tight text-ios-gray">MMR</span>
        </p>
        <div className="mt-1 flex justify-end">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-[0.03em]', getRankBadgeClass(rankInfo.name))}>
            <RankIcon size={11} />
            {rankInfo.name}
          </span>
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
    <div className="flex items-center justify-between gap-3 px-0 pb-2 pt-6">
      <div className="min-w-0">
        <p className="text-[16px] font-extrabold tracking-tight text-on-surface">{boardLabel}</p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-ios-gray">{boardDetail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onOpenMmrHistory}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-semibold tracking-tight text-on-surface/80 tap-target"
        >
          <BarChart2 size={12} />
          <span>History</span>
        </button>
        <button
          onClick={onOpenRankDetails}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-surface px-3 text-[12px] font-semibold tracking-tight text-on-surface/80 tap-target"
        >
          <BookOpen size={12} />
          <span>Guide</span>
        </button>
      </div>
    </div>
  );
};

export const LeaderboardScreen = ({
  currentUser,
  onOpenRankDetails,
  onOpenMmrHistory,
  focusRequestId,
  refreshToken,
  isFirestoreSaverModeEnabled,
  recordDbMetric,
  recordDbError
}: {
  currentUser: any,
  onOpenRankDetails: () => void,
  onOpenMmrHistory: () => void,
  focusRequestId: number,
  refreshToken?: number,
  isFirestoreSaverModeEnabled: () => boolean,
  recordDbMetric: (record: any) => void,
  recordDbError: (record: any) => void
}) => {
  const [provinceFilter, setProvinceFilter] = useState(ALL_PROVINCES_FILTER);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedUid, setHighlightedUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const saverMode = isFirestoreSaverModeEnabled();
      const cachedUsers = readCachedLeaderboardUsers(provinceFilter);
      if (cachedUsers) {
        setUsers(cachedUsers);
        setLoading(false);
        return;
      }

      if (saverMode) {
        recordDbMetric({ flow: 'leaderboard', operation: 'skip', count: 1, label: `saver_mode:${provinceFilter}` });
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const fetchedUsers = await fetchLeaderboardUsersFromFirestore(provinceFilter, { recordDbMetric, recordDbError });
        setUsers(fetchedUsers);
        writeCachedLeaderboardUsers(fetchedUsers, provinceFilter);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser?.uid, provinceFilter, refreshToken]);

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

  const leaderboardUsers = useMemo(() => {
    const currentUid = String(currentUser?.uid || '').trim();
    const currentPhotoURL = String(currentUser?.photoURL || '').trim();
    return users.map((entry) => {
      const normalizedEntry = normalizeLeaderboardUser(entry, typeof entry?.uid === 'string' ? entry.uid : '');
      if (!currentUid || normalizedEntry.uid !== currentUid) return normalizedEntry;
      if (!currentPhotoURL || normalizedEntry.photoURL === currentPhotoURL) return normalizedEntry;
      return {
        ...normalizedEntry,
        photoURL: currentPhotoURL
      };
    });
  }, [currentUser?.photoURL, currentUser?.uid, users]);
  const rankedUsers = useMemo(() => sortUsersByMmrDesc(leaderboardUsers), [leaderboardUsers]);
  const showingLabel = rankedUsers.length >= 100
    ? `Top ${rankedUsers.length} Players`
    : `${rankedUsers.length} ${rankedUsers.length === 1 ? 'Player' : 'Players'}`;

  return (
    <div className="min-h-screen bg-white pb-32">
      <RegionSelector
        isOpen={isRegionSelectorOpen}
        onClose={() => setIsRegionSelectorOpen(false)}
        onSelect={(value) => setProvinceFilter(value)}
        currentValue={provinceFilter === ALL_PROVINCES_FILTER ? '' : provinceFilter}
        selectionMode="province"
      />

      <main className="mx-auto w-full max-w-[430px] px-6 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[28px] font-black leading-tight tracking-tight text-on-surface">Ranking</h1>
          <div className="flex items-center gap-0.5 rounded-full bg-surface p-[3px]">
            <button
              onClick={() => setProvinceFilter(ALL_PROVINCES_FILTER)}
              className={cn(
                "flex h-[30px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold tracking-tight tap-target transition-colors",
                provinceFilter === ALL_PROVINCES_FILTER
                  ? "bg-on-surface text-white"
                  : "bg-transparent text-ios-gray"
              )}
            >
              <Globe size={12} strokeWidth={2.2} />
              Global
            </button>
            <button
              onClick={() => setIsRegionSelectorOpen(true)}
              className={cn(
                "flex h-[30px] max-w-[8.75rem] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold tracking-tight tap-target transition-colors",
                provinceFilter === ALL_PROVINCES_FILTER
                  ? "bg-transparent text-ios-gray"
                  : "bg-on-surface text-white"
              )}
            >
              <MapPin size={12} strokeWidth={2.2} />
              <span className="truncate">{provinceFilter === ALL_PROVINCES_FILTER ? 'Province' : provinceFilter}</span>
            </button>
          </div>
        </div>

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
          <div className="rounded-2xl border border-ios-gray/10 bg-white p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-ios-gray/5 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Users size={28} className="text-ios-gray/25" />
            </div>
            <p className="text-sm font-bold text-on-surface">No organic FOM players in this ranking yet.</p>
            <p className="text-[12px] font-medium text-ios-gray mt-1">Only registered FOM accounts are shown.</p>
          </div>
        ) : (
          <div>
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
