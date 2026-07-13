import { useRef, type Dispatch, type SetStateAction } from 'react';
import { formatDurationFromMs } from './matchTimeUtils';
import { sanitizeInactivePlayerIds } from '../tournaments/tournamentDraft';
import type { Match, Player, ToxicIntensity, Tournament } from '../../types';
import { getToxicIntensityLabel, normalizeToxicIntensity } from './toxicSettings';
import { getPartnerMode, swapFixedTeamMembers } from './partnerMode';
import { rebuildFixedTeamFutureRounds } from './fixedTeamScheduler';
import { getRoundTotalPoints } from './roundPoints';
import {
  applyTennisPointUndo,
  applyTennisPointWon,
  applyTennisStateToMatch,
  getMatchPlayConfig,
  getMatchPlayWinner,
  readTennisState,
} from './tennisScoring';

type AddNotification = (
  title: string,
  message: string,
  type: 'match' | 'tournament' | 'system' | 'achievement',
  tone?: 'info' | 'success' | 'error' | 'achievement'
) => void;

type Params = {
  tournament: Tournament;
  needsRegenerateFromRound: number | null;
  setTournament: Dispatch<SetStateAction<Tournament>>;
  setNeedsRegenerateFromRound: Dispatch<SetStateAction<number | null>>;
  persistActiveTournamentSnapshot: (nextTournament: Tournament) => Promise<void>;
  syncSharedMatchesSnapshot: (nextTournament: Tournament) => Promise<void>;
  addNotification: AddNotification;
  rebuildAmericanoFutureRounds: (baseTournament: Tournament, totalRounds: number) => Tournament['rounds'];
};

type ManualPlayerReplacement = {
  manualPlayerId: string;
  newPlayer: Player;
};

type ToxicSettingsUpdate = {
  toxicModeEnabled: boolean;
  toxicIntensity?: ToxicIntensity;
};

export const useMatchMutationActions = ({
  tournament,
  needsRegenerateFromRound,
  setTournament,
  setNeedsRegenerateFromRound,
  persistActiveTournamentSnapshot,
  syncSharedMatchesSnapshot,
  addNotification,
  rebuildAmericanoFutureRounds,
}: Params) => {
  // Untuk persist ter-debounce: timer callback berjalan setelah beberapa
  // render, jadi baca tournament terbaru lewat ref, bukan closure lama.
  const latestTournamentRef = useRef(tournament);
  latestTournamentRef.current = tournament;
  const completedScoreEditPersistTimerRef = useRef<number | null>(null);

  // Ronde mendatang hanya perlu di-rebuild untuk format yang pre-generate
  // (Americano rotating & Americano fixed). Mexicano/Match Play membuat ronde
  // baru saat progression, jadi tidak ada yang perlu di-rebuild.
  const rebuildFutureRoundsForTournament = (
    baseTournament: Tournament,
    targetNumRounds: number
  ): Tournament['rounds'] => (
    getPartnerMode(baseTournament) === 'fixed'
      ? rebuildFixedTeamFutureRounds(baseTournament, targetNumRounds)
      : rebuildAmericanoFutureRounds(baseTournament, targetNumRounds)
  );

  const applyManualPlayerReplacement = (
    baseTournament: Tournament,
    replacement: ManualPlayerReplacement
  ): Tournament => {
    const safeManualPlayerId = String(replacement.manualPlayerId || '').trim();
    if (!safeManualPlayerId) return baseTournament;

    const manualPlayer = (baseTournament.players || []).find((player) => player.id === safeManualPlayerId);
    if (!manualPlayer) return baseTournament;
    if (manualPlayer.id === replacement.newPlayer.id) return baseTournament;

    const hasExistingRegisteredPlayer = (baseTournament.players || []).some((player) => (
      player.id === replacement.newPlayer.id && player.id !== safeManualPlayerId
    ));
    if (hasExistingRegisteredPlayer) return baseTournament;

    const replacePlayerRef = (player: Player) => (
      player.id === safeManualPlayerId
        ? { ...replacement.newPlayer }
        : player
    );

    const nextPlayers = baseTournament.players.map(replacePlayerRef);
    return {
      ...baseTournament,
      players: nextPlayers,
      fixedTeams: (baseTournament.fixedTeams || []).map((team) => ({
        ...team,
        playerIds: team.playerIds.map((playerId) => (
          playerId === safeManualPlayerId ? replacement.newPlayer.id : playerId
        )) as [string, string],
      })),
      inactivePlayerIds: sanitizeInactivePlayerIds(
        nextPlayers,
        (baseTournament.inactivePlayerIds || []).map((playerId) => (
          playerId === safeManualPlayerId ? replacement.newPlayer.id : playerId
        ))
      ),
      rounds: baseTournament.rounds.map((round) => ({
        ...round,
        playersBye: (round.playersBye || []).map(replacePlayerRef),
        matches: round.matches.map((match) => ({
          ...match,
          teamA: {
            ...match.teamA,
            players: match.teamA.players.map(replacePlayerRef),
          },
          teamB: {
            ...match.teamB,
            players: match.teamB.players.map(replacePlayerRef),
          },
        })),
      })),
    };
  };

  const handleDeleteRoundsFrom = (roundId: number) => {
    const safeRoundId = Math.max(2, Math.floor(roundId || 0));
    const now = Date.now();
    const hasAnyDeletion = (tournament.rounds || []).some((round) => round.id >= safeRoundId);
    if (!hasAnyDeletion) return;

    if (!tournament.rounds || tournament.rounds.length === 0) return;

    const keptRounds = tournament.rounds
      .filter((round) => round.id < safeRoundId)
      .map((round) => ({
        ...round,
        playersBye: [...(round.playersBye || [])],
        matches: round.matches.map((match) => ({
          ...match,
          teamA: { ...match.teamA, players: [...match.teamA.players] },
          teamB: { ...match.teamB, players: [...match.teamB.players] },
        })),
      }));

    if (keptRounds.length === tournament.rounds.length) return;

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
              startedAt: match.startedAt || now,
            };
          }
          return {
            ...match,
            status: 'completed' as const,
            duration: match.duration || (match.startedAt ? formatDurationFromMs(now - match.startedAt) : '00:00'),
          };
        }),
      }));
    }

    const nextTournament: Tournament = {
      ...tournament,
      rounds: normalizedRounds,
      endedAt: undefined,
    };

    const persistedTournament = (
      nextTournament.format === 'Americano'
        ? {
            ...nextTournament,
            rounds: rebuildFutureRoundsForTournament(nextTournament, nextTournament.numRounds),
          }
        : nextTournament
    );

    setTournament(persistedTournament);
    void persistActiveTournamentSnapshot(persistedTournament);

    setNeedsRegenerateFromRound(null);
    addNotification(
      'Round Dihapus',
      `Round ${safeRoundId} onward has been deleted. Please regenerate from the latest scores.`,
      'system'
    );
  };

  const handleUpdateToxicSettings = ({
    toxicModeEnabled,
    toxicIntensity,
  }: ToxicSettingsUpdate) => {
    const nextIntensity = normalizeToxicIntensity(toxicIntensity || tournament.toxicIntensity);
    if (
      Boolean(tournament.toxicModeEnabled) === toxicModeEnabled &&
      normalizeToxicIntensity(tournament.toxicIntensity) === nextIntensity
    ) {
      return;
    }

    const nextTournament: Tournament = {
      ...tournament,
      toxicModeEnabled,
      toxicIntensity: nextIntensity,
    };

    setTournament(nextTournament);
    void persistActiveTournamentSnapshot(nextTournament);
    void syncSharedMatchesSnapshot(nextTournament);
    addNotification(
      'Hall of Shame Updated',
      toxicModeEnabled
        ? `Hall of Shame is on with ${getToxicIntensityLabel(nextIntensity)} intensity.`
        : 'Hall of Shame is hidden for this active match.',
      'system'
    );
  };

  const handleUpdateScore = (matchId: string, team: 'A' | 'B', score: number) => {
    let shouldInvalidateFutureRounds = false;
    let invalidateFromRoundId: number | null = null;
    let editedCompletedMatch = false;
    setTournament((prev) => {
      const editedRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.id === matchId));
      const activeRoundIndex = prev.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
      const canInvalidateFutureRounds = (
        editedRoundIndex !== -1 &&
        activeRoundIndex !== -1 &&
        editedRoundIndex < activeRoundIndex &&
        // Hanya Mexicano yang pairing ronde berikutnya bergantung skor;
        // jadwal Americano murni rotasi, jadi edit skor ronde lampau tidak
        // menginvalidasi ronde depan dan match bisa terus jalan.
        prev.format === 'Mexicano'
      );
      let updatedMatchIsValidForStanding = false;
      const editedRoundTotalPoints = getRoundTotalPoints(prev.rounds[editedRoundIndex], prev);

      const newRounds = prev.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (match.id === matchId) {
            editedCompletedMatch = editedCompletedMatch || match.status === 'completed';
            const nextScoreA = team === 'A' ? score : match.teamA.score;
            const nextScoreB = team === 'B' ? score : match.teamB.score;
            updatedMatchIsValidForStanding = (
              nextScoreA + nextScoreB === editedRoundTotalPoints &&
              (nextScoreA > 0 || nextScoreB > 0)
            );
            return {
              ...match,
              teamA: { ...match.teamA, score: nextScoreA },
              teamB: { ...match.teamB, score: nextScoreB },
            };
          }
          return match;
        }),
      }));

      if (canInvalidateFutureRounds && updatedMatchIsValidForStanding) {
        shouldInvalidateFutureRounds = true;
        invalidateFromRoundId = editedRoundIndex + 2;
      }

      return { ...prev, rounds: newRounds };
    });

    if (editedCompletedMatch) {
      // Edit skor ronde completed bukan milestone (start/complete ronde) —
      // tanpa persist di sini koreksi hilang saat refresh dan tidak sampai ke
      // share link. Debounce supaya rentetan ketukan +/- cukup satu write.
      if (completedScoreEditPersistTimerRef.current !== null) {
        window.clearTimeout(completedScoreEditPersistTimerRef.current);
      }
      completedScoreEditPersistTimerRef.current = window.setTimeout(() => {
        completedScoreEditPersistTimerRef.current = null;
        const latestTournament = latestTournamentRef.current;
        void persistActiveTournamentSnapshot(latestTournament);
        void syncSharedMatchesSnapshot(latestTournament);
      }, 1500);
    }

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

  // Persist skor tenis ter-debounce: rentetan game selesai cukup satu write +
  // satu sync share, memakai state tournament terbaru via ref.
  const tennisScorePersistTimerRef = useRef<number | null>(null);
  const cancelTennisScorePersist = () => {
    if (tennisScorePersistTimerRef.current !== null) {
      window.clearTimeout(tennisScorePersistTimerRef.current);
      tennisScorePersistTimerRef.current = null;
    }
  };
  const scheduleTennisScorePersist = () => {
    cancelTennisScorePersist();
    tennisScorePersistTimerRef.current = window.setTimeout(() => {
      tennisScorePersistTimerRef.current = null;
      const latestTournament = latestTournamentRef.current;
      // Match sudah difinalisasi sementara timer masih jalan: flush basi ini
      // bisa menghidupkan lagi draft aktif yang baru dihapus. Lewati.
      if (latestTournament.endedAt) return;
      void persistActiveTournamentSnapshot(latestTournament);
      void syncSharedMatchesSnapshot(latestTournament);
    }, 1500);
  };

  // Match Play: satu poin tenis untuk `team` (direction 1) atau koreksi mundur
  // satu tingkat poin di game berjalan (direction -1). Game/set/match selesai
  // dihitung engine; match yang mencapai target langsung berstatus completed
  // sehingga tombol Next Round bisa aktif.
  const handleTennisPoint = (matchId: string, team: 'A' | 'B', direction: 1 | -1) => {
    // Basis dari ref, bukan closure: dua tap dalam satu batch render React
    // harus ter-chain (tap kedua membaca hasil tap pertama), kalau tidak poin
    // bisa hilang saat host mengetuk cepat.
    const baseTournament = latestTournamentRef.current;
    if (baseTournament.format !== 'Match Play') return;

    let matchJustCompleted = false;
    let scoreChanged = false;
    let gameBoundaryCrossed = false;
    const config = getMatchPlayConfig(baseTournament);
    const now = Date.now();

    const completeMatch = (match: Match): Match => ({
      ...match,
      status: 'completed' as const,
      duration: match.startedAt
        ? formatDurationFromMs(now - match.startedAt)
        : (match.duration || '00:00'),
    });

    const nextTournament: Tournament = {
      ...baseTournament,
      rounds: baseTournament.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (match.id !== matchId) return match;
          if (match.status === 'completed') return match;

          const state = readTennisState(match);

          // Data lama bisa sudah melewati target (skor manual pra-engine).
          // Tanpa ini setiap tap jadi no-op sunyi dan match tak pernah
          // selesai — sembuhkan: tap pertama langsung menutup match.
          if (getMatchPlayWinner(state, config)) {
            scoreChanged = true;
            matchJustCompleted = true;
            return completeMatch(applyTennisStateToMatch(match, { ...state, pointsA: '0', pointsB: '0' }, config));
          }

          if (direction === -1) {
            const reverted = applyTennisPointUndo(state, team);
            if (reverted === state) return match;
            scoreChanged = true;
            return applyTennisStateToMatch(match, reverted, config);
          }

          const outcome = applyTennisPointWon(state, team, config);
          if (outcome.state === state) return match;
          scoreChanged = true;
          gameBoundaryCrossed = Boolean(outcome.gameWon || outcome.setWon);
          const nextMatch = applyTennisStateToMatch(match, outcome.state, config);
          if (outcome.matchWon) {
            matchJustCompleted = true;
            return completeMatch(nextMatch);
          }
          return nextMatch;
        }),
      })),
    };

    if (!scoreChanged) return;
    latestTournamentRef.current = nextTournament;
    setTournament(nextTournament);

    if (matchJustCompleted) {
      // Milestone: match selesai harus langsung awet (refresh-safe) dan
      // kelihatan di share link tanpa menunggu debounce.
      cancelTennisScorePersist();
      void persistActiveTournamentSnapshot(nextTournament);
      void syncSharedMatchesSnapshot(nextTournament);
      return;
    }
    // Persist di batas game/set saja — poin di dalam game berjalan tidak
    // di-write (refresh paling banyak kehilangan poin satu game, dan malam
    // 3 lapangan tidak menghasilkan ratusan write per jam).
    if (gameBoundaryCrossed) scheduleTennisScorePersist();
  };

  // Match Play: host menutup match sebelum target tercapai (mis. waktu court
  // habis). Skor game yang sudah masuk dipakai apa adanya untuk klasemen;
  // mode bestOf hanya menghitung set yang benar-benar selesai.
  const handleCompleteMatchPlayMatch = (matchId: string) => {
    const baseTournament = latestTournamentRef.current;
    if (baseTournament.format !== 'Match Play') return;
    const config = getMatchPlayConfig(baseTournament);
    const now = Date.now();
    let changed = false;

    const nextTournament: Tournament = {
      ...baseTournament,
      rounds: baseTournament.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (match.id !== matchId || match.status === 'completed') return match;
          changed = true;
          // Buang poin game yang menggantung supaya hasil akhir bersih.
          const state = readTennisState(match);
          const settled = applyTennisStateToMatch(match, { ...state, pointsA: '0', pointsB: '0' }, config);
          return {
            ...settled,
            status: 'completed' as const,
            duration: settled.startedAt
              ? formatDurationFromMs(now - settled.startedAt)
              : (settled.duration || '00:00'),
          };
        }),
      })),
    };

    if (!changed) return;
    cancelTennisScorePersist();
    latestTournamentRef.current = nextTournament;
    setTournament(nextTournament);
    void persistActiveTournamentSnapshot(nextTournament);
    void syncSharedMatchesSnapshot(nextTournament);
    addNotification('Match Finished', 'The match was closed with its current score.', 'match');
  };

  // Match Play: koreksi salah ketuk di match point — buka lagi match yang
  // sudah completed selama ronde-nya masih ronde berjalan dan match belum
  // difinalisasi. Kalau match selesai karena mencapai target (bukan ditutup
  // manual), game penentu ikut dibatalkan supaya skor kembali ke posisi
  // sebelum ketukan terakhir.
  const handleReopenMatchPlayMatch = (matchId: string) => {
    const baseTournament = latestTournamentRef.current;
    if (baseTournament.format !== 'Match Play') return;
    if (baseTournament.endedAt) return;
    const config = getMatchPlayConfig(baseTournament);
    let changed = false;

    const nextTournament: Tournament = {
      ...baseTournament,
      rounds: baseTournament.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (match.id !== matchId || match.status !== 'completed') return match;
          changed = true;

          const state = readTennisState(match);
          const winner = getMatchPlayWinner(state, config);
          let reopenedState = state;
          if (winner) {
            const winnerGames = winner === 'A' ? [...state.gamesA] : [...state.gamesB];
            const lastSetIndex = Math.min(state.currentSet, winnerGames.length - 1);
            if (winnerGames[lastSetIndex] > 0) {
              winnerGames[lastSetIndex] -= 1;
              reopenedState = {
                ...state,
                gamesA: winner === 'A' ? winnerGames : [...state.gamesA],
                gamesB: winner === 'B' ? winnerGames : [...state.gamesB],
              };
            }
          }

          return {
            ...applyTennisStateToMatch(match, reopenedState, config),
            status: 'active' as const,
          };
        }),
      })),
    };

    if (!changed) return;
    cancelTennisScorePersist();
    latestTournamentRef.current = nextTournament;
    setTournament(nextTournament);
    void persistActiveTournamentSnapshot(nextTournament);
    void syncSharedMatchesSnapshot(nextTournament);
    addNotification('Match Reopened', 'Scoring is live again — the deciding game was rolled back.', 'match');
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

    const sanitizedInactive = sanitizeInactivePlayerIds(tournament.players || [], nextInactivePlayerIds);
    const nextTournament: Tournament = {
      ...tournament,
      inactivePlayerIds: sanitizedInactive,
    };
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildFutureRoundsForTournament(nextTournament, nextTournament.numRounds),
          }
        : nextTournament
    );

    setTournament(persistedTournament);

    addNotification(
      'Active Players Updated',
      'Changes are saved and will apply starting from the next round.',
      'system'
    );
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

    let nextRounds = [...tournament.rounds];

    if (nextNumRounds < nextRounds.length) {
      nextRounds = nextRounds.slice(0, nextNumRounds);
    }

    if (tournament.format === 'Americano') {
      const nextTournamentBase = {
        ...tournament,
        inactivePlayerIds: sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds),
      };
      nextRounds = rebuildFutureRoundsForTournament(nextTournamentBase, nextNumRounds);
    }

    const completedRoundCount = nextRounds.filter((round) => (
      (round.matches || []).length > 0 &&
      round.matches.every((match) => match.status === 'completed')
    )).length;
    const effectiveTotalRounds = Math.max(nextNumRounds, nextRounds.length);
    const shouldRemainEnded = effectiveTotalRounds > 0 && completedRoundCount >= effectiveTotalRounds;
    const nextTournament: Tournament = {
      ...tournament,
      numRounds: nextNumRounds,
      rounds: nextRounds,
      endedAt: shouldRemainEnded ? tournament.endedAt : undefined,
    };

    setTournament(nextTournament);

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

    const activeRoundIndex = tournament.rounds.findIndex((round) => round.matches.some((match) => match.status === 'active'));
    const latestLockedRoundIndex = tournament.rounds.reduce((latestIdx, round, idx) => {
      const hasPlayedMatch = (round.matches || []).some((match) => match.status !== 'pending');
      return hasPlayedMatch ? idx : latestIdx;
    }, -1);
    const currentRoundIndex = activeRoundIndex !== -1 ? activeRoundIndex : latestLockedRoundIndex;
    const effectiveFromRoundId = currentRoundIndex === -1 ? 1 : currentRoundIndex + 2;
    const nextCourtChanges = [
      ...(tournament.courtChanges || []),
      {
        effectiveFromRoundId,
        fromCourts: tournament.courts,
        toCourts: nextCourts,
        changedAt: Date.now(),
      },
    ];
    const nextTournament: Tournament = {
      ...tournament,
      courts: nextCourts,
      courtChanges: nextCourtChanges,
    };
    const persistedTournament = (
      tournament.format === 'Americano' && tournament.rounds.length > 0
        ? {
            ...nextTournament,
            rounds: rebuildFutureRoundsForTournament(nextTournament, nextTournament.numRounds),
          }
        : nextTournament
    );

    setTournament(persistedTournament);
    void persistActiveTournamentSnapshot(persistedTournament);

    addNotification(
      'Court Updated',
      `Court count updated to ${nextCourts}. Changes apply starting from the next round.`,
      'system'
    );
    return true;
  };

  const handleUpdateTotalPoints = (requestedPoints: number) => {
    const safeRequested = Number.isFinite(requestedPoints) ? Math.floor(requestedPoints) : NaN;
    if (!Number.isFinite(safeRequested) || safeRequested < 1) return false;
    const nextPoints = Math.max(1, Math.min(99, safeRequested));
    const previousPoints = tournament.totalPoints;

    // Ronde yang belum dimulai (semua match pending) memakai target baru;
    // ronde yang sedang berjalan atau selesai di-stamp dengan target lamanya
    // supaya skor yang sudah masuk tetap valid meski default berubah.
    const nextRounds = tournament.rounds.map((round) => {
      const matches = round.matches || [];
      const isUnstarted = matches.length > 0 && matches.every((match) => match.status === 'pending');
      if (isUnstarted) {
        return round.totalPoints === nextPoints ? round : { ...round, totalPoints: nextPoints };
      }
      return round.totalPoints === undefined ? { ...round, totalPoints: previousPoints } : round;
    });

    const roundsChanged = nextRounds.some((round, idx) => round !== tournament.rounds[idx]);
    if (nextPoints === previousPoints && !roundsChanged) return true;

    const hasUpcomingRound = nextRounds.some((round) => (
      (round.matches || []).some((match) => match.status === 'pending')
    ));

    const nextTournament: Tournament = {
      ...tournament,
      totalPoints: nextPoints,
      rounds: nextRounds,
    };

    setTournament(nextTournament);
    void persistActiveTournamentSnapshot(nextTournament);
    void syncSharedMatchesSnapshot(nextTournament);

    addNotification(
      'Points Updated',
      hasUpcomingRound
        ? `Race target set to ${nextPoints}. It applies to rounds that haven't started yet.`
        : `Race target set to ${nextPoints} for new rounds. Rounds already in play keep their target.`,
      'system'
    );
    return true;
  };

  const handleSwapPlayer = (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => {
    let swappedOutPlayer: Player | null = null;
    const newRounds = tournament.rounds.map((round) => {
      const isMatchInRound = round.matches.some((match) => match.id === matchId);
      if (!isMatchInRound) return round;

      let oldPlayer: Player | null = null;
      const newMatches = round.matches.map((match) => {
        if (match.id === matchId) {
          const players = team === 'A' ? [...match.teamA.players] : [...match.teamB.players];
          oldPlayer = players[playerIndex];
          swappedOutPlayer = oldPlayer;
          players[playerIndex] = newPlayer;
          return {
            ...match,
            teamA: team === 'A' ? { ...match.teamA, players } : match.teamA,
            teamB: team === 'B' ? { ...match.teamB, players } : match.teamB,
          };
        }
        return match;
      });

      const newPlayersBye = round.playersBye.map((player) => player.id === newPlayer.id ? oldPlayer! : player);
      return { ...round, matches: newMatches, playersBye: newPlayersBye };
    });
    let nextTournament: Tournament = { ...tournament, rounds: newRounds };

    // Mode fix partner: penggantian di court berlaku permanen ke tim tetap —
    // pemain baru mewarisi slot tim pemain lama (atau bertukar tim jika
    // dua-duanya sudah bertim), lalu ronde pre-generated disusun ulang.
    if (getPartnerMode(tournament) === 'fixed' && swappedOutPlayer) {
      nextTournament = {
        ...nextTournament,
        fixedTeams: swapFixedTeamMembers(
          tournament.fixedTeams || [],
          (swappedOutPlayer as Player).id,
          newPlayer.id
        ),
      };
      if (tournament.format === 'Americano' && nextTournament.rounds.length > 0) {
        nextTournament = {
          ...nextTournament,
          rounds: rebuildFixedTeamFutureRounds(nextTournament, nextTournament.numRounds),
        };
      }
    }

    setTournament(nextTournament);
    addNotification('Player Replaced', 'The player has been replaced on the active court.', 'system');
  };

  // Mode fix partner: tukar satu pasangan sekaligus. Pasangan yang sedang bye
  // masuk menggantikan (pasangan lama duduk); pasangan dari court lain pada
  // ronde yang sama bertukar court. Komposisi tim tetap tidak berubah — ronde
  // mendatang Americano tetap di-rebuild agar fairness bye terjaga.
  const handleSwapTeam = (matchId: string, side: 'A' | 'B', incomingPlayerIds: [string, string]) => {
    const playerById = new Map(tournament.players.map((player) => [player.id, player]));
    const incomingPlayers = incomingPlayerIds
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player));
    if (incomingPlayers.length !== 2) return;

    const roundIndex = tournament.rounds.findIndex((round) => round.matches.some((match) => match.id === matchId));
    if (roundIndex === -1) return;
    const round = tournament.rounds[roundIndex];
    const targetMatch = round.matches.find((match) => match.id === matchId);
    if (!targetMatch) return;
    const outgoingPlayers = side === 'A' ? [...targetMatch.teamA.players] : [...targetMatch.teamB.players];

    const incomingIdSet = new Set<string>(incomingPlayerIds);
    const sideHoldsIncomingPair = (sidePlayers: Player[]) => (
      sidePlayers.length === 2 && sidePlayers.every((player) => incomingIdSet.has(player.id))
    );
    const sourceMatch = round.matches.find((match) => (
      match.id !== matchId && (sideHoldsIncomingPair(match.teamA.players) || sideHoldsIncomingPair(match.teamB.players))
    )) || null;

    const newMatches = round.matches.map((match) => {
      if (match.id === matchId) {
        return {
          ...match,
          teamA: side === 'A' ? { ...match.teamA, players: [...incomingPlayers] } : match.teamA,
          teamB: side === 'B' ? { ...match.teamB, players: [...incomingPlayers] } : match.teamB,
        };
      }
      if (sourceMatch && match.id === sourceMatch.id) {
        const replaceSide = sideHoldsIncomingPair(match.teamA.players) ? 'A' : 'B';
        return {
          ...match,
          teamA: replaceSide === 'A' ? { ...match.teamA, players: [...outgoingPlayers] } : match.teamA,
          teamB: replaceSide === 'B' ? { ...match.teamB, players: [...outgoingPlayers] } : match.teamB,
        };
      }
      return match;
    });

    const newPlayersBye = sourceMatch
      ? round.playersBye
      : [
          ...round.playersBye.filter((player) => !incomingIdSet.has(player.id)),
          ...outgoingPlayers,
        ];

    const newRounds = tournament.rounds.map((existingRound, index) => (
      index === roundIndex ? { ...existingRound, matches: newMatches, playersBye: newPlayersBye } : existingRound
    ));

    let nextTournament: Tournament = { ...tournament, rounds: newRounds };
    if (getPartnerMode(tournament) === 'fixed' && tournament.format === 'Americano' && nextTournament.rounds.length > 0) {
      nextTournament = {
        ...nextTournament,
        rounds: rebuildFixedTeamFutureRounds(nextTournament, nextTournament.numRounds),
      };
    }

    setTournament(nextTournament);
    const incomingLabel = incomingPlayers.map((player) => player.name.split(' ')[0]).join(' & ');
    const outgoingLabel = outgoingPlayers.map((player) => player.name.split(' ')[0]).join(' & ');
    addNotification(
      'Pair Swapped',
      sourceMatch
        ? `${incomingLabel} and ${outgoingLabel} exchanged courts.`
        : `${incomingLabel} replaced ${outgoingLabel} on court ${targetMatch.court}.`,
      'system'
    );
  };

  const handleReplaceManualPlayer = (manualPlayerId: string, newPlayer: Player) => {
    const manualPlayer = (tournament.players || []).find((player) => player.id === String(manualPlayerId || '').trim());
    if (!manualPlayer) return;
    const nextTournament = applyManualPlayerReplacement(tournament, { manualPlayerId, newPlayer });
    if (nextTournament === tournament) {
      addNotification(
        'Player Sudah Ada',
        `${newPlayer.name} is already part of this match.`,
        'system'
      );
      return;
    }

    setTournament(nextTournament);
    void persistActiveTournamentSnapshot(nextTournament);
    addNotification(
      'Manual Player Replaced',
      `${manualPlayer.name} is now linked to ${newPlayer.name} for this active match.`,
      'system'
    );
  };

  const handleSaveRosterChanges = (
    activePlayerIds: string[],
    replacements: ManualPlayerReplacement[]
  ) => {
    const normalizedReplacements = Array.isArray(replacements)
      ? replacements.filter((replacement) => (
          replacement &&
          typeof replacement.manualPlayerId === 'string' &&
          replacement.manualPlayerId.trim() &&
          replacement.newPlayer &&
          typeof replacement.newPlayer.id === 'string' &&
          replacement.newPlayer.id.trim()
        ))
      : [];

    let nextTournament = tournament;
    normalizedReplacements.forEach((replacement) => {
      nextTournament = applyManualPlayerReplacement(nextTournament, replacement);
    });

    const knownIds = new Set((nextTournament.players || []).map((player) => player.id));
    const requestedActiveIds = Array.from(new Set(activePlayerIds.filter((id) => knownIds.has(id))));
    const requestedActiveSet = new Set(requestedActiveIds);
    const nextInactivePlayerIds = (nextTournament.players || [])
      .map((player) => player.id)
      .filter((playerId) => !requestedActiveSet.has(playerId));
    const sanitizedInactive = sanitizeInactivePlayerIds(nextTournament.players || [], nextInactivePlayerIds);

    const persistedTournament: Tournament = (
      nextTournament.format === 'Americano' && nextTournament.rounds.length > 0
        ? {
            ...nextTournament,
            inactivePlayerIds: sanitizedInactive,
            rounds: rebuildFutureRoundsForTournament(
              { ...nextTournament, inactivePlayerIds: sanitizedInactive },
              nextTournament.numRounds
            ),
          }
        : {
            ...nextTournament,
            inactivePlayerIds: sanitizedInactive,
          }
    );

    const currentInactivePlayerIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
    const hasReplacementChanges = normalizedReplacements.length > 0;
    const hasActivePlayerChanges = (
      sanitizedInactive.length !== currentInactivePlayerIds.length ||
      sanitizedInactive.some((playerId, idx) => playerId !== currentInactivePlayerIds[idx])
    );

    if (!hasReplacementChanges && !hasActivePlayerChanges) return;

    setTournament(persistedTournament);
    void persistActiveTournamentSnapshot(persistedTournament);
    addNotification(
      'Roster Updated',
      hasReplacementChanges
        ? 'Manual player replacements and active player changes have been saved.'
        : 'Changes are saved and will apply starting from the next round.',
      'system'
    );
  };

  return {
    handleDeleteRoundsFrom,
    handleUpdateToxicSettings,
    handleUpdateScore,
    handleTennisPoint,
    handleCompleteMatchPlayMatch,
    handleReopenMatchPlayMatch,
    handleUpdateActivePlayers,
    handleUpdateRounds,
    handleUpdateCourts,
    handleUpdateTotalPoints,
    handleSwapPlayer,
    handleSwapTeam,
    handleReplaceManualPlayer,
    handleSaveRosterChanges,
  };
};
