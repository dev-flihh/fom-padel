import { type Round } from '../../types';

export const formatDurationFromMs = (elapsedMs: number) => {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const parseDurationToMs = (duration?: string) => {
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

export const getTournamentElapsedMs = (
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
