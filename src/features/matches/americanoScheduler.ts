import type { Match, Player, Round, Tournament } from '../../types';
import { sanitizeInactivePlayerIds } from '../tournaments/tournamentDraft';

export const getActivePlayersFromTournament = (tournament: Tournament) => {
  const inactiveIds = sanitizeInactivePlayerIds(tournament.players || [], tournament.inactivePlayerIds);
  const inactiveSet = new Set(inactiveIds);
  return (tournament.players || []).filter((player) => !inactiveSet.has(player.id));
};

export const rebuildAmericanoFutureRounds = (
  tournament: Tournament,
  targetNumRounds: number
): Round[] => {
  const safeTarget = Math.max(1, Math.floor(targetNumRounds || 1));
  const currentRoundIndex = tournament.rounds.findIndex((round) => (
    (round.matches || []).some((match) => match.status === 'active')
  ));
  // Di jeda antar-ronde (tidak ada match aktif) kunci hanya sampai ronde
  // terakhir yang sudah tersentuh — ronde pending sesudahnya tetap boleh
  // di-regenerate, mis. pemain baru masuk sebelum ronde berikutnya di-start.
  const lastTouchedRoundIndex = tournament.rounds.reduce((latest, round, idx) => (
    (round.matches || []).some((match) => match.status !== 'pending') ? idx : latest
  ), -1);
  const lockedRoundCount = currentRoundIndex !== -1
    ? Math.min(currentRoundIndex + 1, safeTarget)
    : Math.min(lastTouchedRoundIndex + 1, safeTarget);

  const nextRounds: Round[] = tournament.rounds.slice(0, lockedRoundCount).map((round) => ({
    ...round,
    playersBye: [...(round.playersBye || [])],
    matches: round.matches.map((match) => ({
      ...match,
      teamA: { ...match.teamA, players: [...match.teamA.players] },
      teamB: { ...match.teamB, players: [...match.teamB.players] },
    })),
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
      [0, 3, 1, 2],
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
          teamB: { players: [p3, p4], score: 0 },
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
      playersBye,
    });
  }

  return nextRounds;
};
