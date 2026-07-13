import type { Round, Tournament } from '../../types';

// Target poin (Race to X) efektif untuk sebuah ronde. Ronde bisa punya target
// sendiri (host mengubah poin mulai ronde tertentu); fallback ke
// tournament.totalPoints untuk data lama / ronde yang belum di-stamp.
export const getRoundTotalPoints = (
  round: Pick<Round, 'totalPoints'> | null | undefined,
  tournament: Pick<Tournament, 'totalPoints'>
): number => {
  const perRound = round?.totalPoints;
  return typeof perRound === 'number' && perRound > 0 ? perRound : tournament.totalPoints;
};
