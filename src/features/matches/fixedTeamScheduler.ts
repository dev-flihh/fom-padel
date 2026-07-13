import type { FixedTeam, Match, Player, RankingCriteria, Round, Tournament } from '../../types';
import { getActivePlayersFromTournament } from './americanoScheduler';
import { sanitizeFixedTeams } from './partnerMode';

export type ActiveFixedTeam = {
  team: FixedTeam;
  players: [Player, Player];
};

// Tim ikut main hanya jika KEDUA anggotanya aktif — kalau salah satu
// dinonaktifkan, timnya bye sampai anggota itu aktif lagi.
export const getActiveFixedTeams = (tournament: Tournament): ActiveFixedTeam[] => {
  const activePlayers = getActivePlayersFromTournament(tournament);
  const playerById = new Map(activePlayers.map((player) => [player.id, player]));
  return sanitizeFixedTeams(activePlayers, tournament.fixedTeams)
    .map((team) => {
      const first = playerById.get(team.playerIds[0]);
      const second = playerById.get(team.playerIds[1]);
      if (!first || !second) return null;
      return { team, players: [first, second] as [Player, Player] };
    })
    .filter((entry): entry is ActiveFixedTeam => Boolean(entry));
};

const pairKey = (teamIdA: string, teamIdB: string) => (
  teamIdA < teamIdB ? `${teamIdA}|${teamIdB}` : `${teamIdB}|${teamIdA}`
);

type SchedulerState = {
  teamMatchCounts: Record<string, number>;
  pairCounts: Record<string, number>;
  lastOpponent: Record<string, string | null>;
};

const createSchedulerState = (teams: ActiveFixedTeam[]): SchedulerState => {
  const state: SchedulerState = { teamMatchCounts: {}, pairCounts: {}, lastOpponent: {} };
  teams.forEach(({ team }) => {
    state.teamMatchCounts[team.id] = 0;
    state.lastOpponent[team.id] = null;
  });
  return state;
};

const recordMatchInState = (state: SchedulerState, teamIdA: string, teamIdB: string) => {
  state.teamMatchCounts[teamIdA] = (state.teamMatchCounts[teamIdA] || 0) + 1;
  state.teamMatchCounts[teamIdB] = (state.teamMatchCounts[teamIdB] || 0) + 1;
  const key = pairKey(teamIdA, teamIdB);
  state.pairCounts[key] = (state.pairCounts[key] || 0) + 1;
  state.lastOpponent[teamIdA] = teamIdB;
  state.lastOpponent[teamIdB] = teamIdA;
};

// Identifikasi tim tetap dari sebuah pasangan pemain di match yang sudah
// dimainkan; null kalau komposisinya bukan tim tetap saat ini (mis. data lama).
const findTeamIdForMatchSide = (
  sidePlayers: Player[],
  teamIdByPlayerId: Map<string, string>
): string | null => {
  const [p1, p2] = sidePlayers;
  if (!p1 || !p2) return null;
  const teamId1 = teamIdByPlayerId.get(p1.id);
  const teamId2 = teamIdByPlayerId.get(p2.id);
  return teamId1 && teamId1 === teamId2 ? teamId1 : null;
};

const seedStateFromRounds = (
  state: SchedulerState,
  rounds: Round[],
  teams: ActiveFixedTeam[]
) => {
  const teamIdByPlayerId = new Map<string, string>();
  teams.forEach(({ team }) => {
    team.playerIds.forEach((playerId) => teamIdByPlayerId.set(playerId, team.id));
  });
  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      const teamIdA = findTeamIdForMatchSide(match.teamA.players, teamIdByPlayerId);
      const teamIdB = findTeamIdForMatchSide(match.teamB.players, teamIdByPlayerId);
      if (!teamIdA || !teamIdB || teamIdA === teamIdB) return;
      recordMatchInState(state, teamIdA, teamIdB);
    });
  });
};

const createMatch = ({
  roundId,
  matchIndex,
  home,
  away,
  format,
  status,
  startedAt,
}: {
  roundId: number;
  matchIndex: number;
  home: ActiveFixedTeam;
  away: ActiveFixedTeam;
  format: Tournament['format'];
  status: Match['status'];
  startedAt?: number;
}): Match => ({
  id: `r${roundId}-m${matchIndex + 1}`,
  court: matchIndex + 1,
  roundId,
  status,
  ...(startedAt ? { startedAt } : {}),
  teamA: { players: [...home.players], score: 0, ...(format === 'Match Play' ? { sets: [0] } : {}) },
  teamB: { players: [...away.players], score: 0, ...(format === 'Match Play' ? { sets: [0] } : {}) },
  ...(format === 'Match Play' ? { currentSet: 0, pointsA: '0', pointsB: '0' } : {}),
});

// Susun satu ronde secara greedy: prioritaskan tim yang paling sedikit main
// (fairness bye), lalu pasangan tim yang paling jarang bertemu (mendekati
// round-robin), lalu hindari rematch beruntun. Deterministik.
const pickRoundPairings = (
  teams: ActiveFixedTeam[],
  courtLimit: number,
  state: SchedulerState
): Array<[ActiveFixedTeam, ActiveFixedTeam]> => {
  const pairings: Array<[ActiveFixedTeam, ActiveFixedTeam]> = [];
  const usedTeamIds = new Set<string>();
  const indexByTeamId = new Map(teams.map(({ team }, index) => [team.id, index]));

  while (pairings.length < courtLimit) {
    let best: { home: ActiveFixedTeam; away: ActiveFixedTeam; score: [number, number, number, number] } | null = null;
    for (let i = 0; i < teams.length; i++) {
      const home = teams[i];
      if (usedTeamIds.has(home.team.id)) continue;
      for (let j = i + 1; j < teams.length; j++) {
        const away = teams[j];
        if (usedTeamIds.has(away.team.id)) continue;
        const matchLoad = (state.teamMatchCounts[home.team.id] || 0) + (state.teamMatchCounts[away.team.id] || 0);
        const meetings = state.pairCounts[pairKey(home.team.id, away.team.id)] || 0;
        const rematchPenalty = (
          state.lastOpponent[home.team.id] === away.team.id ||
          state.lastOpponent[away.team.id] === home.team.id
        ) ? 1 : 0;
        const stableOrder = (indexByTeamId.get(home.team.id) || 0) * teams.length + (indexByTeamId.get(away.team.id) || 0);
        const score: [number, number, number, number] = [matchLoad, meetings, rematchPenalty, stableOrder];
        const isBetter = !best || (
          score[0] - best.score[0] ||
          score[1] - best.score[1] ||
          score[2] - best.score[2] ||
          score[3] - best.score[3]
        ) < 0;
        if (isBetter) best = { home, away, score };
      }
    }
    if (!best) break;
    usedTeamIds.add(best.home.team.id);
    usedTeamIds.add(best.away.team.id);
    pairings.push([best.home, best.away]);
  }

  return pairings;
};

const buildByePlayers = (
  tournament: Tournament,
  teams: ActiveFixedTeam[],
  playingTeamIds: Set<string>
): Player[] => {
  const activePlayers = getActivePlayersFromTournament(tournament);
  const playingPlayerIds = new Set<string>();
  teams.forEach(({ team, players }) => {
    if (!playingTeamIds.has(team.id)) return;
    players.forEach((player) => playingPlayerIds.add(player.id));
  });
  // Anggota tim yang bye + pemain aktif yang belum punya tim.
  return activePlayers.filter((player) => !playingPlayerIds.has(player.id));
};

const getCourtLimit = (tournament: Tournament, teamCount: number) => (
  Math.min(Math.max(1, tournament.courts || 1), Math.floor(teamCount / 2))
);

const buildRound = (
  tournament: Tournament,
  teams: ActiveFixedTeam[],
  roundId: number,
  state: SchedulerState,
  status: Match['status'],
  startedAt?: number
): Round => {
  const courtLimit = getCourtLimit(tournament, teams.length);
  const pairings = teams.length >= 2 ? pickRoundPairings(teams, courtLimit, state) : [];
  const playingTeamIds = new Set<string>();
  const matches = pairings.map(([home, away], index) => {
    recordMatchInState(state, home.team.id, away.team.id);
    playingTeamIds.add(home.team.id);
    playingTeamIds.add(away.team.id);
    return createMatch({
      roundId,
      matchIndex: index,
      home,
      away,
      format: tournament.format,
      status,
      startedAt,
    });
  });

  return {
    id: roundId,
    matches,
    playersBye: buildByePlayers(tournament, teams, playingTeamIds),
  };
};

// Pre-generate seluruh ronde saat match dibuat (Americano/Match Play fixed).
export const buildFixedTeamRounds = (
  tournament: Tournament,
  numRounds: number,
  now = Date.now()
): Round[] => {
  const teams = getActiveFixedTeams(tournament);
  const state = createSchedulerState(teams);
  const rounds: Round[] = [];
  const safeTarget = Math.max(1, Math.floor(numRounds || 1));
  for (let roundId = 1; roundId <= safeTarget; roundId++) {
    rounds.push(buildRound(
      tournament,
      teams,
      roundId,
      state,
      roundId === 1 ? 'active' : 'pending',
      roundId === 1 ? now : undefined
    ));
  }
  return rounds;
};

// Padanan rebuildAmericanoFutureRounds: kunci ronde yang sudah berjalan,
// regenerasi sisanya dengan state yang di-seed dari ronde terkunci.
export const rebuildFixedTeamFutureRounds = (
  tournament: Tournament,
  targetNumRounds: number
): Round[] => {
  const safeTarget = Math.max(1, Math.floor(targetNumRounds || 1));
  const currentRoundIndex = tournament.rounds.findIndex((round) => (
    (round.matches || []).some((match) => match.status === 'active')
  ));
  // Di jeda antar-ronde (tidak ada match aktif) kunci hanya sampai ronde
  // terakhir yang sudah tersentuh — ronde pending sesudahnya tetap boleh
  // di-regenerate, mis. roster berubah sebelum ronde berikutnya di-start.
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

  const teams = getActiveFixedTeams(tournament);
  const state = createSchedulerState(teams);
  seedStateFromRounds(state, nextRounds, teams);

  while (nextRounds.length < safeTarget) {
    const roundId = nextRounds.length + 1;
    nextRounds.push(buildRound(tournament, teams, roundId, state, 'pending'));
  }

  return nextRounds;
};

// Ronde berikutnya untuk Match Play fixed (per-ronde, seperti Match Play
// rotating) — state di-seed dari semua ronde yang ada supaya fixture merata.
export const buildNextFixedTeamRound = (
  tournament: Tournament,
  nextRoundId: number,
  now = Date.now()
): Round => {
  const teams = getActiveFixedTeams(tournament);
  const state = createSchedulerState(teams);
  seedStateFromRounds(state, tournament.rounds, teams);
  return buildRound(tournament, teams, nextRoundId, state, 'active', now);
};

type TeamStanding = {
  entry: ActiveFixedTeam;
  wins: number;
  totalPoints: number;
  pointsDiff: number;
  matchCount: number;
};

// Klasemen tim untuk matchmaking Mexicano fixed — pola sama dengan
// playerStatsMap di useRoundProgressionActions, tapi level tim.
const buildTeamStandingsForPairing = (
  tournament: Tournament,
  teams: ActiveFixedTeam[],
  currentRoundId: number
): TeamStanding[] => {
  const standings = new Map<string, TeamStanding>(
    teams.map((entry) => [entry.team.id, { entry, wins: 0, totalPoints: 0, pointsDiff: 0, matchCount: 0 }])
  );
  const teamIdByPlayerId = new Map<string, string>();
  teams.forEach(({ team }) => {
    team.playerIds.forEach((playerId) => teamIdByPlayerId.set(playerId, team.id));
  });

  tournament.rounds.forEach((round) => {
    round.matches.forEach((match) => {
      const isCurrentRound = match.roundId === currentRoundId;
      if (match.status !== 'completed' && !isCurrentRound) return;
      const teamIdA = findTeamIdForMatchSide(match.teamA.players, teamIdByPlayerId);
      const teamIdB = findTeamIdForMatchSide(match.teamB.players, teamIdByPlayerId);
      const scoreA = match.teamA.score || 0;
      const scoreB = match.teamB.score || 0;
      const standingA = teamIdA ? standings.get(teamIdA) : undefined;
      const standingB = teamIdB ? standings.get(teamIdB) : undefined;
      if (standingA) {
        standingA.totalPoints += scoreA;
        standingA.pointsDiff += scoreA - scoreB;
        if (scoreA > scoreB) standingA.wins++;
        standingA.matchCount++;
      }
      if (standingB) {
        standingB.totalPoints += scoreB;
        standingB.pointsDiff += scoreB - scoreA;
        if (scoreB > scoreA) standingB.wins++;
        standingB.matchCount++;
      }
    });
  });

  return Array.from(standings.values());
};

const compareTeamStanding = (criteria: RankingCriteria) => (a: TeamStanding, b: TeamStanding) => {
  if (criteria === 'Matches Won') {
    if (b.wins !== a.wins) return b.wins - a.wins;
  } else if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
  return a.entry.team.id.localeCompare(b.entry.team.id);
};

// Ronde berikutnya Mexicano fixed: tim diurutkan by klasemen, lalu 1v2, 3v4,
// dst. Tim yang lebih jarang main diprioritaskan masuk (fairness bye).
export const buildNextFixedMexicanoRound = (
  tournament: Tournament,
  nextRoundId: number,
  now = Date.now()
): Round => {
  const teams = getActiveFixedTeams(tournament);
  const courtLimit = getCourtLimit(tournament, teams.length);
  const standings = buildTeamStandingsForPairing(tournament, teams, nextRoundId - 1);
  const byStanding = compareTeamStanding(tournament.criteria);

  const selectionOrder = [...standings].sort((a, b) => {
    if (a.matchCount !== b.matchCount) return a.matchCount - b.matchCount;
    return byStanding(a, b);
  });
  const selected = selectionOrder.slice(0, courtLimit * 2);
  const seeded = [...selected].sort(byStanding);

  const playingTeamIds = new Set<string>();
  const matches: Match[] = [];
  for (let m = 0; m + 1 < seeded.length; m += 2) {
    const home = seeded[m].entry;
    const away = seeded[m + 1].entry;
    playingTeamIds.add(home.team.id);
    playingTeamIds.add(away.team.id);
    matches.push(createMatch({
      roundId: nextRoundId,
      matchIndex: m / 2,
      home,
      away,
      format: tournament.format,
      status: 'active',
      startedAt: now,
    }));
  }

  return {
    id: nextRoundId,
    matches,
    playersBye: buildByePlayers(tournament, teams, playingTeamIds),
  };
};
