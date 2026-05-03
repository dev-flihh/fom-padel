import type { TournamentHistory } from '../../types';
import { hasTournamentDetailPayload } from './historyDetailUtils';

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
  err: unknown;
  dbRole?: 'primary' | 'ephemeral';
  collection?: string;
}) => void;

export const hydrateTournamentHistoryDetail = async ({
  history,
  isFirestoreSaverModeEnabled,
  readTournamentDetailRow,
  readLegacyTournamentRow,
  normalizeHistoryTournament,
  recordDbMetric,
  recordDbError,
}: {
  history: TournamentHistory;
  isFirestoreSaverModeEnabled: () => boolean;
  readTournamentDetailRow: (id: string) => Promise<{ exists: boolean; data?: Record<string, unknown> | null }>;
  readLegacyTournamentRow: (id: string) => Promise<{ exists: boolean; data?: Record<string, unknown> | null }>;
  normalizeHistoryTournament: (history: TournamentHistory) => TournamentHistory;
  recordDbMetric: RecordDbMetric;
  recordDbError: RecordDbError;
}): Promise<TournamentHistory> => {
  if (hasTournamentDetailPayload(history)) return history;
  if (isFirestoreSaverModeEnabled()) {
    recordDbMetric({ flow: 'history_detail', operation: 'skip', count: 1, label: 'saver_mode_detail_hydration' });
    return history;
  }

  const normalizeDetailDate = (rawDate: unknown, fallbackDate: Date) => {
    if ((rawDate as { toDate?: () => Date } | null | undefined)?.toDate) {
      return (rawDate as { toDate: () => Date }).toDate();
    }
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'number') return new Date(rawDate);
    if (typeof rawDate === 'string') {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return fallbackDate;
  };

  try {
    const detailResult = await readTournamentDetailRow(history.id);
    recordDbMetric({ flow: 'history_detail', operation: 'read', count: 1, docs: detailResult.exists ? 1 : 0, label: 'tournament_details' });
    if (detailResult.exists) {
      const detailData = detailResult.data || {};
      return normalizeHistoryTournament({
        ...history,
        ...(detailData as unknown as TournamentHistory),
        id: history.id,
        date: normalizeDetailDate((detailData as { date?: unknown })?.date, history.date),
      });
    }
  } catch (detailErr) {
    recordDbError({ flow: 'history_detail', label: 'tournament_details', err: detailErr });
    console.error('Tournament detail fetch error:', detailErr);
  }

  try {
    const fallbackResult = await readLegacyTournamentRow(history.id);
    recordDbMetric({ flow: 'history_detail', operation: 'read', count: 1, docs: fallbackResult.exists ? 1 : 0, label: 'legacy_tournaments' });
    if (fallbackResult.exists) {
      const fallbackData = fallbackResult.data || {};
      return normalizeHistoryTournament({
        ...history,
        ...(fallbackData as unknown as TournamentHistory),
        id: history.id,
        date: normalizeDetailDate((fallbackData as { date?: unknown })?.date, history.date),
      });
    }
  } catch (fallbackErr) {
    recordDbError({ flow: 'history_detail', label: 'legacy_tournaments', err: fallbackErr });
    console.error('Tournament legacy detail fetch error:', fallbackErr);
  }

  return history;
};
