import { Match, Player, Round, Tournament } from '../../types';
import { sanitizeInactivePlayerIds } from './tournamentDraft';
import { getPartnerMode, sanitizeFixedTeams } from '../matches/partnerMode';
import { buildFixedTeamRounds } from '../matches/fixedTeamScheduler';

export const generateTournamentFromSettings = (settings: Tournament, now = Date.now()): Tournament => {
  const players = [...settings.players].filter(p => !!p);
  const sanitizedInactivePlayerIds = sanitizeInactivePlayerIds(players, settings.inactivePlayerIds);
  const inactivePlayerIdSet = new Set(sanitizedInactivePlayerIds);
  const activePlayers = players.filter((player) => !inactivePlayerIdSet.has(player.id));
  const rounds: Round[] = [];
  const numRounds = settings.numRounds;
  const maxMatchesPerRound = settings.courts;
  const partnerMode = getPartnerMode(settings);
  const sanitizedFixedTeams = partnerMode === 'fixed'
    ? sanitizeFixedTeams(players, settings.fixedTeams)
    : [];

  if (partnerMode === 'fixed') {
    const fixedSettings: Tournament = {
      ...settings,
      players,
      inactivePlayerIds: sanitizedInactivePlayerIds,
      fixedTeams: sanitizedFixedTeams,
    };
    // Hanya Americano fixed yang pre-generate semua ronde (mengikuti UX stepper
    // Americano). Mexicano/Match Play fixed generate per-ronde seperti aslinya.
    const fixedRounds = buildFixedTeamRounds(
      fixedSettings,
      settings.format === 'Americano' ? numRounds : 1,
      now
    );
    rounds.push(...fixedRounds);
  } else if (settings.format === 'Americano') {
    // Pre-generate all rounds for Americano with partner/opponent diversity balancing.
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

  const tournamentId = settings.id || `tm_${Math.random().toString(36).slice(2, 10)}`;
  return {
    ...settings,
    id: tournamentId,
    backgroundId: settings.backgroundId,
    partnerMode,
    fixedTeams: sanitizedFixedTeams,
    inactivePlayerIds: sanitizedInactivePlayerIds,
    courtChanges: [],
    rounds,
    startedAt: now,
    endedAt: undefined
  };
};
