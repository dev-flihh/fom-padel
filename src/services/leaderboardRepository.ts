import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db, leaderboardDb } from '../firebase';
import {
  LEADERBOARD_SNAPSHOTS_COLLECTION,
  PLAYER_STATS_COLLECTION
} from './firestoreCollections';
import { getLedgerEntryDate } from '../features/ranking/mmrHistoryUtils';
import {
  ALL_PROVINCES_FILTER,
  isRegisteredFomUser,
  normalizeLeaderboardUser,
  sortUsersByMmrDesc,
  toLeaderboardSnapshotDocId
} from '../features/ranking/leaderboardUtils';

const LEADERBOARD_SNAPSHOT_STALE_AFTER_MS = 30 * 60 * 1000;

type DbMetricRecorder = (record: any) => void;

export const fetchLeaderboardUsersFromFirestore = async (
  provinceFilter = ALL_PROVINCES_FILTER,
  {
    recordDbMetric,
    recordDbError
  }: {
    recordDbMetric: DbMetricRecorder;
    recordDbError: DbMetricRecorder;
  }
) => {
  const snapshotDocId = toLeaderboardSnapshotDocId(provinceFilter);
  try {
    const snapshotDoc = await getDoc(doc(leaderboardDb, LEADERBOARD_SNAPSHOTS_COLLECTION, snapshotDocId));
    recordDbMetric({
      flow: 'leaderboard',
      operation: 'read',
      count: 1,
      docs: snapshotDoc.exists() ? 1 : 0,
      label: `snapshot:${snapshotDocId}`,
      dbRole: 'ephemeral',
      collection: LEADERBOARD_SNAPSHOTS_COLLECTION
    });
    if (snapshotDoc.exists()) {
      const data = snapshotDoc.data() || {};
      const updatedAt = getLedgerEntryDate(data?.updatedAt);
      const snapshotAgeMs = updatedAt ? (Date.now() - updatedAt.getTime()) : Number.POSITIVE_INFINITY;
      const users = Array.isArray(data?.users) ? data.users : [];
      const normalizedUsers = users
        .map((entry: any) => normalizeLeaderboardUser(entry, typeof entry?.uid === 'string' ? entry.uid : ''))
        .filter((entry: any) => isRegisteredFomUser(entry));

      // Treat legacy snapshots as a fast path only while they are reasonably fresh.
      if (normalizedUsers.length > 0 && snapshotAgeMs <= LEADERBOARD_SNAPSHOT_STALE_AFTER_MS) {
        return sortUsersByMmrDesc(normalizedUsers);
      }
      if (normalizedUsers.length > 0) {
        recordDbMetric({
          flow: 'leaderboard',
          operation: 'skip',
          count: 1,
          label: `stale_snapshot:${snapshotDocId}`,
          dbRole: 'ephemeral',
          collection: LEADERBOARD_SNAPSHOTS_COLLECTION
        });
      }
    }
  } catch (snapshotErr) {
    recordDbError({
      flow: 'leaderboard',
      label: `snapshot:${snapshotDocId}`,
      err: snapshotErr,
      dbRole: 'ephemeral',
      collection: LEADERBOARD_SNAPSHOTS_COLLECTION
    });
    console.error('Error fetching leaderboard snapshot, falling back to direct query:', snapshotErr);
  }

  try {
    const statsQuery = provinceFilter === ALL_PROVINCES_FILTER
      ? query(
        collection(db, PLAYER_STATS_COLLECTION),
        orderBy('mmr', 'desc'),
        orderBy('totalMatches', 'desc'),
        orderBy('displayName', 'asc'),
        limit(100)
      )
      : query(
        collection(db, PLAYER_STATS_COLLECTION),
        where('province', '==', provinceFilter),
        orderBy('mmr', 'desc'),
        orderBy('totalMatches', 'desc'),
        orderBy('displayName', 'asc'),
        limit(100)
      );
    const statsSnapshot = await getDocs(statsQuery);
    recordDbMetric({
      flow: 'leaderboard',
      operation: 'read',
      count: 1,
      docs: statsSnapshot.docs.length,
      label: `fallback:${provinceFilter}`,
      dbRole: 'primary',
      collection: PLAYER_STATS_COLLECTION
    });

    if (!statsSnapshot.empty) {
      const statsBasedUsers: any[] = [];
      statsSnapshot.forEach((statsDoc) => {
        const rawStats = statsDoc.data() || {};
        const uid = typeof rawStats?.uid === 'string' && rawStats.uid.trim()
          ? rawStats.uid.trim()
          : statsDoc.id;
        if (!uid) return;
        const normalizedStatsUser = normalizeLeaderboardUser(rawStats, uid);
        if (!isRegisteredFomUser(normalizedStatsUser)) return;
        statsBasedUsers.push(normalizedStatsUser);
      });

      return sortUsersByMmrDesc(statsBasedUsers);
    }
  } catch (statsErr) {
    recordDbError({
      flow: 'leaderboard',
      label: `fallback:${provinceFilter}`,
      err: statsErr,
      dbRole: 'primary',
      collection: PLAYER_STATS_COLLECTION
    });
    console.error('Error fetching player_stats leaderboard source, falling back to legacy users:', statsErr);
  }
  return [];
};
