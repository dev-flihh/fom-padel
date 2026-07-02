import type { Match, Round, Team, Tournament } from '../../types';
import { buildOfficialStandings, hasMatchScoreProgress, type StandingsPlayer } from './standingsUtils';

type TickerReason =
  | 'empty'
  | 'schooling'
  | 'zone-shift'
  | 'duo-petaka'
  | 'live-gap'
  | 'steady';

type TickerTone = 'calm' | 'amber' | 'danger' | 'gold';

export type LiveShameTickerEvent = {
  id: string;
  reason: TickerReason;
  tone: TickerTone;
  eyebrow: string;
  headline: string;
  detail: string;
  chips: string[];
};

export type LiveShameTicker = {
  message: string;
  reason: TickerReason;
  events: LiveShameTickerEvent[];
};

type PairTickerStats = {
  playerIds: [string, string];
  names: [string, string];
  together: number;
  losses: number;
  diff: number;
};

const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const getShortName = (name = '') => {
  const cleanName = name.trim();
  if (!cleanName) return 'Seseorang';
  return cleanName.split(/\s+/)[0] || cleanName;
};

const getTeamShortNames = (team: Team | undefined) => {
  const names = (team?.players || []).map((player) => getShortName(player.name)).filter(Boolean);
  return names.length > 0 ? names.join(' & ') : 'Seseorang';
};

const getPairKey = (playerAId: string, playerBId: string) => (
  [playerAId, playerBId].sort().join('::')
);

const getRoundsThrough = (rounds: Round[], roundId: number | null) => {
  const sortedRounds = [...rounds].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  if (roundId === null) return sortedRounds;
  return sortedRounds.filter((round) => Number(round.id || 0) <= roundId);
};

const getRoundsBefore = (rounds: Round[], roundId: number | null) => {
  const sortedRounds = [...rounds].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  if (roundId === null) return [];
  return sortedRounds.filter((round) => Number(round.id || 0) < roundId);
};

const sameStandingValue = (a: StandingsPlayer, b: StandingsPlayer) => (
  a.w === b.w &&
  a.pointsDiff === b.pointsDiff &&
  a.totalPoints === b.totalPoints
);

const getBottomStanding = (tournament: Tournament, rounds: Round[]) => {
  const standings = buildOfficialStandings({
    tournament: {
      ...tournament,
      rounds,
    },
  });
  if (!standings.hasCountableScore || standings.players.length === 0) return null;
  const bottom = standings.players[standings.players.length - 1];
  return {
    players: standings.players.filter((player) => sameStandingValue(player, bottom)),
    lead: bottom,
  };
};

const hasSameBottomPlayers = (previous: StandingsPlayer[], current: StandingsPlayer[]) => {
  if (previous.length !== current.length) return false;
  const previousIds = new Set(previous.map((player) => player.id));
  return current.every((player) => previousIds.has(player.id));
};

const getLosingTeamEvidence = (match: Match) => {
  const scoreA = Number(match.teamA?.score || 0);
  const scoreB = Number(match.teamB?.score || 0);
  if (scoreA === scoreB) return null;
  const team = scoreA > scoreB ? match.teamB : match.teamA;
  const losingScore = Math.min(scoreA, scoreB);
  const winningScore = Math.max(scoreA, scoreB);
  return {
    match,
    team,
    teamName: getTeamShortNames(team),
    losingScore,
    winningScore,
    margin: winningScore - losingScore,
  };
};

type LosingTeamEvidence = NonNullable<ReturnType<typeof getLosingTeamEvidence>>;

const findLargestLiveGap = (matches: Match[]) => (
  matches.reduce<ReturnType<typeof getLosingTeamEvidence> | null>((best, match) => {
    if (!hasMatchScoreProgress(match)) return best;
    const evidence = getLosingTeamEvidence(match);
    if (!evidence) return best;
    if (!best || evidence.margin > best.margin) return evidence;
    return best;
  }, null)
);

const buildPairStats = (rounds: Round[]) => {
  const pairStats = new Map<string, PairTickerStats>();

  const registerTeamPairs = (team: Team | undefined, teamDiff: number) => {
    const players = (team?.players || []).filter((player) => player.id);
    for (let outerIndex = 0; outerIndex < players.length; outerIndex += 1) {
      for (let innerIndex = outerIndex + 1; innerIndex < players.length; innerIndex += 1) {
        const playerA = players[outerIndex];
        const playerB = players[innerIndex];
        const key = getPairKey(playerA.id, playerB.id);
        const sortedPlayers = [playerA, playerB].sort((a, b) => a.id.localeCompare(b.id));
        const existing = pairStats.get(key) || {
          playerIds: [sortedPlayers[0].id, sortedPlayers[1].id] as [string, string],
          names: [getShortName(sortedPlayers[0].name), getShortName(sortedPlayers[1].name)] as [string, string],
          together: 0,
          losses: 0,
          diff: 0,
        };
        existing.together += 1;
        existing.diff += teamDiff;
        if (teamDiff < 0) existing.losses += 1;
        pairStats.set(key, existing);
      }
    }
  };

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      if (!hasMatchScoreProgress(match)) return;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      registerTeamPairs(match.teamA, scoreA - scoreB);
      registerTeamPairs(match.teamB, scoreB - scoreA);
    });
  });

  return pairStats;
};

const getDuoPetakaTickerCandidate = (rounds: Round[]) => (
  Array.from(buildPairStats(rounds).values())
    .filter((pair) => pair.together >= 2 && (pair.losses >= 2 || pair.diff <= -4))
    .sort((a, b) => (
      a.diff - b.diff ||
      b.losses - a.losses ||
      b.together - a.together ||
      a.names.join(' & ').localeCompare(b.names.join(' & '), 'id-ID')
    ))[0] || null
);

export const buildLiveShameTicker = ({
  tournament,
  activeRound,
}: {
  tournament: Tournament;
  activeRound: Round | null;
}): LiveShameTicker => {
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : [];
  const currentRound = activeRound || rounds.find((round) => (
    round.matches.some((match) => match.status === 'active')
  )) || null;
  const activeMatches = currentRound?.matches || [];
  const activeProgressMatches = activeMatches.filter(hasMatchScoreProgress);
  const currentRoundId = typeof currentRound?.id === 'number' ? currentRound.id : null;
  const currentRounds = getRoundsThrough(rounds, currentRoundId);
  const events: LiveShameTickerEvent[] = [];

  const schooling = activeProgressMatches
    .map(getLosingTeamEvidence)
    .filter((evidence): evidence is LosingTeamEvidence => Boolean(evidence))
    .filter((evidence) => evidence.losingScore === 0 && evidence.winningScore >= 5)
    .sort((a, b) => b.winningScore - a.winningScore || b.margin - a.margin)[0];

  if (schooling) {
    events.push({
      id: `schooling:${schooling.match.id}:${schooling.losingScore}-${schooling.winningScore}`,
      reason: 'schooling',
      tone: 'danger',
      eyebrow: 'Breaking Shame',
      headline: `${schooling.teamName} disekolahkan ${schooling.losingScore}-${schooling.winningScore}.`,
      detail: `Court ${schooling.match.court}. Scoreboard sudah cukup jadi saksi.`,
      chips: [`Court ${schooling.match.court}`, `${schooling.losingScore}-${schooling.winningScore}`, `Gap ${schooling.margin}`],
    });
  }

  if (activeProgressMatches.length > 0) {
    const previousBottom = getBottomStanding(tournament, getRoundsBefore(rounds, currentRoundId));
    const currentBottom = getBottomStanding(tournament, currentRounds);
    if (
      previousBottom &&
      currentBottom &&
      !hasSameBottomPlayers(previousBottom.players, currentBottom.players)
    ) {
      const names = currentBottom.players.map((player) => getShortName(player.name)).join(' & ');
      events.push({
        id: `zone-shift:${currentRound?.id || 0}:${currentBottom.players.map((player) => player.id).join('-')}`,
        reason: 'zone-shift',
        tone: 'amber',
        eyebrow: 'Zona Update',
        headline: `Zona cupu bergeser ke ${names}.`,
        detail: `DIFF ${formatDiff(currentBottom.lead.pointsDiff)} setelah Round ${currentRound?.id || '-'}.`,
        chips: [`Round ${currentRound?.id || '-'}`, `DIFF ${formatDiff(currentBottom.lead.pointsDiff)}`, `${currentBottom.lead.totalPoints} pts`],
      });
    }
  }

  const duoPetaka = getDuoPetakaTickerCandidate(currentRounds);
  if (duoPetaka) {
    events.push({
      id: `duo-petaka:${duoPetaka.playerIds.join('-')}:${duoPetaka.together}:${duoPetaka.diff}`,
      reason: 'duo-petaka',
      tone: 'gold',
      eyebrow: 'Duo Watch',
      headline: `Duo Petaka mulai terbentuk.`,
      detail: `${duoPetaka.names.join(' & ')} ${duoPetaka.together}x bareng, DIFF ${formatDiff(duoPetaka.diff)}.`,
      chips: [`${duoPetaka.together}x bareng`, `${duoPetaka.losses}x kalah`, `DIFF ${formatDiff(duoPetaka.diff)}`],
    });
  }

  const largestLiveGap = findLargestLiveGap(activeMatches);
  if (largestLiveGap && largestLiveGap.margin >= 3 && !schooling) {
    events.push({
      id: `live-gap:${largestLiveGap.match.id}:${largestLiveGap.losingScore}-${largestLiveGap.winningScore}`,
      reason: 'live-gap',
      tone: 'amber',
      eyebrow: 'Damage Report',
      headline: `${largestLiveGap.teamName} tertinggal ${largestLiveGap.losingScore}-${largestLiveGap.winningScore}.`,
      detail: 'Alarm zona cupu mulai nyala.',
      chips: [`Court ${largestLiveGap.match.court}`, `${largestLiveGap.losingScore}-${largestLiveGap.winningScore}`, `Gap ${largestLiveGap.margin}`],
    });
  }

  if (events.length === 0 && activeProgressMatches.length > 0) {
    events.push({
      id: `steady:${currentRound?.id || 0}:${activeProgressMatches.length}`,
      reason: 'steady',
      tone: 'calm',
      eyebrow: 'Live Read',
      headline: 'Skor masih rapat.',
      detail: 'Zona cupu lagi nunggu bukti yang lebih tega.',
      chips: [`Round ${currentRound?.id || '-'}`, `${activeProgressMatches.length} court live`],
    });
  }

  if (events.length === 0) {
    events.push({
      id: `empty:${currentRound?.id || 0}`,
      reason: 'empty',
      tone: 'calm',
      eyebrow: 'Live Read',
      headline: 'Zona cupu belum punya korban.',
      detail: 'Ronde ini masih bersih. Untuk sekarang.',
      chips: [`Round ${currentRound?.id || '-'}`],
    });
  }

  return {
    reason: events[0].reason,
    message: `${events[0].headline} ${events[0].detail}`.trim(),
    events,
  };
};
