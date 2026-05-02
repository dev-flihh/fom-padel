import { type TournamentHistory } from '../../types';
import {
  fetchOwnerTournamentRows,
  fetchPlayerLedgerTournamentRefs,
  fetchTournamentRowsByIds,
  fetchUserHistorySummaryRows,
  fetchUserHistorySummaryRowsViaRest
} from '../../services/tournamentHistoryRepository';
import {
  HISTORY_LEDGER_FALLBACK_LIMIT,
  HISTORY_QUERY_TIMEOUT_MS,
  HISTORY_RECENT_FETCH_LIMIT,
  normalizeHistoryTournament
} from './historyPersistence';
import { getTournamentDateMs } from './historyUtils';

type RecordDbMetric = (record: {
  flow: string;
  operation: 'read' | 'write' | 'delete' | 'listen' | 'skip';
  count?: number;
  docs?: number;
  label?: string;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

type RecordDbError = (record: {
  flow: string;
  label?: string;
  err: any;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

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

export const fetchTournamentHistoryForUser = async ({
  uid,
  limitCount,
  getIdToken,
  recordDbMetric,
  recordDbError
}: {
  uid: string;
  limitCount?: number | null;
  getIdToken: () => Promise<string | undefined>;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
}): Promise<TournamentHistory[]> => {
  const normalizedLimitCount = Number.isFinite(Number(limitCount)) && Number(limitCount) > 0
    ? Math.max(1, Math.floor(Number(limitCount)))
    : null;

  const fetchHistorySummaryViaRest = async () => {
    const token = await getIdToken();
    if (!token) return [];
    const restResult = await fetchUserHistorySummaryRowsViaRest(uid, token, {
      limitCount: normalizedLimitCount || undefined,
      timeoutMs: HISTORY_QUERY_TIMEOUT_MS
    });
    recordDbMetric({ flow: 'history', operation: 'read', count: 1, docs: restResult.docsCount, label: 'summary_rest' });
    return restResult.rows.map((row) => {
      const data = row.data;
      const playedAtMs = typeof data?.playedAt === 'string' ? new Date(data.playedAt).getTime() : Date.now();
      return normalizeHistoryTournament({
        ...(data as TournamentHistory),
        id: row.id || String(data?.id || ''),
        date: normalizeHistoryDate((data as any)?.date, Number.isFinite(playedAtMs) ? playedAtMs : Date.now())
      } as TournamentHistory);
    }).sort((a: TournamentHistory, b: TournamentHistory) => getTournamentDateMs(b) - getTournamentDateMs(a));
  };

  try {
    const summaryResult = await fetchUserHistorySummaryRows(uid, {
      limitCount: normalizedLimitCount || undefined,
      timeoutMs: HISTORY_QUERY_TIMEOUT_MS
    });
    recordDbMetric({ flow: 'history', operation: 'read', count: 1, docs: summaryResult.docsCount, label: 'summary' });
    const histories = summaryResult.rows.map((row) => {
      const data = row.data;
      const playedAtMs = data?.playedAt?.toDate ? data.playedAt.toDate().getTime() : Date.now();
      return normalizeHistoryTournament({
        ...(data as TournamentHistory),
        id: row.id,
        date: normalizeHistoryDate((data as any)?.date, playedAtMs)
      } as TournamentHistory);
    }).sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a));

    if (histories.length > 0) return histories;
  } catch (summaryErr) {
    recordDbError({ flow: 'history', label: 'summary', err: summaryErr });
    console.error('Error fetching history summary, falling back to ledger/tournaments:', summaryErr);
    try {
      const restHistories = await fetchHistorySummaryViaRest();
      if (restHistories.length > 0) return restHistories;
    } catch (restErr) {
      recordDbError({ flow: 'history', label: 'summary_rest', err: restErr });
      console.error('Error fetching history summary via REST fallback:', restErr);
    }
  }

  try {
    const fallbackLedgerLimit = normalizedLimitCount
      ? Math.max(HISTORY_RECENT_FETCH_LIMIT, Math.min(HISTORY_LEDGER_FALLBACK_LIMIT, normalizedLimitCount * 8))
      : HISTORY_LEDGER_FALLBACK_LIMIT;
    const ledgerResult = await fetchPlayerLedgerTournamentRefs(uid, {
      limitCount: fallbackLedgerLimit,
      timeoutMs: HISTORY_QUERY_TIMEOUT_MS
    });
    recordDbMetric({ flow: 'history', operation: 'read', count: 1, docs: ledgerResult.docsCount, label: 'ledger_fallback' });
    const latestPlayedAtByTournament = new Map<string, number>();

    ledgerResult.rows.forEach((row) => {
      const data = row.data || {};
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
      const tournamentIds = Array.from(latestPlayedAtByTournament.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, normalizedLimitCount || Number.MAX_SAFE_INTEGER)
        .map(([tournamentId]) => tournamentId);
      const tournamentRows = await fetchTournamentRowsByIds(tournamentIds, {
        timeoutMs: HISTORY_QUERY_TIMEOUT_MS
      });
      recordDbMetric({
        flow: 'history',
        operation: 'read',
        count: tournamentRows.length,
        docs: tournamentRows.filter((row) => row.exists).length,
        label: 'legacy_tournament_detail'
      });

      const histories = tournamentRows
        .filter((row) => row.exists && row.data)
        .map((row) => {
          const data = row.data || {};
          const fallbackMs = latestPlayedAtByTournament.get(row.id) || Date.now();
          return normalizeHistoryTournament({
            ...(data as TournamentHistory),
            id: row.id,
            date: normalizeHistoryDate((data as any)?.date, fallbackMs)
          } as TournamentHistory);
        })
        .sort((a, b) => {
          const aRefMs = latestPlayedAtByTournament.get(a.id) || getTournamentDateMs(a);
          const bRefMs = latestPlayedAtByTournament.get(b.id) || getTournamentDateMs(b);
          if (bRefMs !== aRefMs) return bRefMs - aRefMs;
          return getTournamentDateMs(b) - getTournamentDateMs(a);
        });

      if (histories.length > 0) return histories;
    }
  } catch (ledgerErr) {
    recordDbError({ flow: 'history', label: 'ledger_fallback', err: ledgerErr });
    console.error('Error fetching tournament history from player_match_ledger, fallback to owner-based tournaments:', ledgerErr);
  }

  try {
    const ownerResult = await fetchOwnerTournamentRows(uid, {
      timeoutMs: HISTORY_QUERY_TIMEOUT_MS
    });
    recordDbMetric({ flow: 'history', operation: 'read', count: 1, docs: ownerResult.docsCount, label: 'owner_tournaments_fallback' });

    const histories = ownerResult.rows
      .map((row) => {
        const data = row.data || {};
        const endedAt = data?.endedAt;
        const endedAtMs = endedAt?.toDate
          ? endedAt.toDate().getTime()
          : typeof endedAt === 'number'
            ? endedAt
            : 0;
        if (!endedAtMs) return null;

        return normalizeHistoryTournament({
          ...(data as TournamentHistory),
          id: row.id,
          date: normalizeHistoryDate((data as any)?.date || endedAt, endedAtMs)
        } as TournamentHistory);
      })
      .filter((item): item is TournamentHistory => Boolean(item))
      .sort((a, b) => getTournamentDateMs(b) - getTournamentDateMs(a));

    if (histories.length > 0) {
      return normalizedLimitCount ? histories.slice(0, normalizedLimitCount) : histories;
    }
  } catch (ownerErr) {
    recordDbError({ flow: 'history', label: 'owner_tournaments_fallback', err: ownerErr });
    console.error('Error fetching owner-based tournament history fallback:', ownerErr);
  }

  return [];
};
