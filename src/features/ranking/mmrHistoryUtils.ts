import { type PlayerMatchLedgerEntry } from '../../types';

export type MMRSessionHistoryGroup = {
  key: string;
  name: string;
  date: string;
  net: number;
  wins: number;
  losses: number;
  draws: number;
  items: PlayerMatchLedgerEntry[];
};

export const getLedgerEntryDate = (value?: any) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getLedgerEntryTimestamp = (entry: Pick<PlayerMatchLedgerEntry, 'playedAt' | 'createdAt'>) => (
  getLedgerEntryDate(entry.playedAt) || getLedgerEntryDate(entry.createdAt)
);

export const formatMmrDelta = (value?: number) => {
  const safeValue = Number(value || 0);
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toLocaleString()}`;
};

export const formatLedgerEntryDate = (date: Date | null) => {
  if (!date) return 'Unknown time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const getLedgerGroupLabel = (date: Date | null) => {
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
