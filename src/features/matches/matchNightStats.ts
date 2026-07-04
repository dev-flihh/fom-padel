import type { Round, Tournament, TournamentHistory, ToxicIntensity } from '../../types';
import { hasMatchScoreProgress, type StandingsPlayer } from './standingsUtils';
import type { ToxicAwardCard } from './toxicStandings';
import { resolveToxicCopyConfig, type ToxicCopyConfig } from './toxicCopyConfig';
import { normalizeToxicIntensity } from './toxicSettings';

// Derived "match night" statistics used by FOM Rewind slides and share cards.
// Everything here is recomputed on render from tournament rounds — nothing is persisted.

export type BiggestWin = {
  score: string;
  margin: number;
  winners: string;
  roundId: number;
};

export type LongestWinStreak = {
  playerId: string;
  playerName: string;
  streak: number;
};

export type MatchNightAggregate = {
  totalPoints: number;
  roundCount: number;
  completedRoundCount: number;
  matchCount: number;
  completedMatchCount: number;
  biggestWin?: BiggestWin;
  longestWinStreak?: LongestWinStreak;
  durationMinutes: number;
};

export type RankTimelineEntry = {
  roundId: number;
  rank: number;
};

export type PlayerRankTimeline = {
  playerId: string;
  entries: RankTimelineEntry[];
  firstRank?: number;
  finalRank: number;
  // Positive delta means the player dropped positions (worse) from first to final.
  delta: number;
};

export type GlowDownAward = {
  playerId: string;
  playerName: string;
  firstRank: number;
  finalRank: number;
  drop: number;
};

export type MyNightSummary = {
  playerId: string;
  name: string;
  avatar?: string;
  initials: string;
  finalRank: number;
  totalPlayers: number;
  w: number;
  l: number;
  d: number;
  matches: number;
  record: string;
  pointsDiff: number;
  totalPoints: number;
  firstRank?: number;
};

// Minimum drop (in positions) required for a Glow Down award, unless the player
// started at #1 in which case any drop qualifies.
const MIN_GLOW_DOWN_DROP = 3;

const hashStringToInt = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickSeeded = (items: string[], seed: string) => (
  items.length === 0 ? '' : items[hashStringToInt(seed) % items.length]
);

const getShortName = (name = '') => name.trim().split(/\s+/)[0] || name;

const formatShortNames = (players: Array<{ name: string }>) => (
  players.map((player) => getShortName(player.name)).join(' & ')
);

const getSortedRounds = (tournament: Tournament | TournamentHistory): Round[] => {
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : [];
  return [...rounds].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
};

type CumulativeStat = {
  w: number;
  l: number;
  d: number;
  pointsDiff: number;
  totalPoints: number;
};

// Deterministic ranking that mirrors buildOfficialStandings' sort order:
// wins desc, point diff desc, total points desc, name asc (id-ID).
const rankPlayerIds = (
  statsById: Map<string, CumulativeStat>,
  nameById: Map<string, string>,
): string[] => (
  [...statsById.keys()].sort((a, b) => {
    const statA = statsById.get(a)!;
    const statB = statsById.get(b)!;
    if (statB.w !== statA.w) return statB.w - statA.w;
    if (statB.pointsDiff !== statA.pointsDiff) return statB.pointsDiff - statA.pointsDiff;
    if (statB.totalPoints !== statA.totalPoints) return statB.totalPoints - statA.totalPoints;
    return (nameById.get(a) || '').localeCompare(nameById.get(b) || '', 'id-ID');
  })
);

/**
 * Rank timeline per player: position in official standings after each round that
 * had score progress. Used for "R1 POS → FINAL" stats and the Glow Down award.
 * Only players present in `sortedPlayers` are tracked, so identity/name stay stable.
 */
export const buildRankTimelines = (
  tournament: Tournament | TournamentHistory,
  sortedPlayers: StandingsPlayer[],
): Map<string, PlayerRankTimeline> => {
  const timelines = new Map<string, PlayerRankTimeline>();
  if (sortedPlayers.length === 0) return timelines;

  const nameById = new Map(sortedPlayers.map((player) => [player.id, player.name]));
  const trackedIds = new Set(sortedPlayers.map((player) => player.id));
  const cumulative = new Map<string, CumulativeStat>();
  sortedPlayers.forEach((player) => {
    cumulative.set(player.id, { w: 0, l: 0, d: 0, pointsDiff: 0, totalPoints: 0 });
    timelines.set(player.id, {
      playerId: player.id,
      entries: [],
      firstRank: undefined,
      finalRank: 0,
      delta: 0,
    });
  });

  // Mode fixed: baris = tim. Petakan id anggota (termasuk partner, dan tahan
  // terhadap anchor yang pernah di-swap) ke id barisnya, lalu dedupe per sisi
  // match supaya skor tim dihitung sekali — bukan dobel per anggota.
  const rowIdByMemberId = new Map<string, string>();
  sortedPlayers.forEach((player) => {
    rowIdByMemberId.set(player.id, player.id);
    if (player.isTeamRow && player.partnerId) rowIdByMemberId.set(player.partnerId, player.id);
  });
  const resolveSideRowIds = (players: Array<{ id: string }> | undefined) => {
    const rowIds = new Set<string>();
    (players || []).forEach((player) => {
      const rowId = rowIdByMemberId.get(player.id);
      if (rowId) rowIds.add(rowId);
    });
    return [...rowIds];
  };

  const sortedRounds = getSortedRounds(tournament);
  sortedRounds.forEach((round) => {
    let roundHadProgress = false;
    (round.matches || []).forEach((match) => {
      if (!hasMatchScoreProgress(match)) return;
      roundHadProgress = true;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const hasLiveScore = scoreA > 0 || scoreB > 0;
      const shouldCountScore = match.status === 'completed' || hasLiveScore;

      ([
        [resolveSideRowIds(match.teamA?.players), scoreA, scoreB],
        [resolveSideRowIds(match.teamB?.players), scoreB, scoreA],
      ] as const).forEach(([rowIds, scoreFor, scoreAgainst]) => {
        rowIds.forEach((rowId) => {
          const stat = cumulative.get(rowId);
          if (!stat) return;
          if (shouldCountScore) {
            stat.totalPoints += scoreFor;
            stat.pointsDiff += scoreFor - scoreAgainst;
          }
          if (match.status === 'completed') {
            if (scoreFor > scoreAgainst) stat.w += 1;
            else if (scoreFor < scoreAgainst) stat.l += 1;
            else stat.d += 1;
          }
        });
      });
    });

    if (!roundHadProgress) return;

    // Snapshot ranking after this round. Only players who have appeared in a
    // countable match so far get a timeline entry for this round.
    const appeared = [...cumulative.entries()].filter(([, stat]) => (
      stat.w + stat.l + stat.d > 0 || stat.totalPoints > 0 || stat.pointsDiff !== 0
    ));
    if (appeared.length === 0) return;
    const rankableIds = new Map(appeared);
    const orderedIds = rankPlayerIds(rankableIds, nameById);
    orderedIds.forEach((playerId, index) => {
      if (!trackedIds.has(playerId)) return;
      const timeline = timelines.get(playerId);
      if (!timeline) return;
      const rank = index + 1;
      timeline.entries.push({ roundId: round.id, rank });
      if (timeline.firstRank === undefined) timeline.firstRank = rank;
    });
  });

  // Finalize: final rank comes from the official (full-tournament) ordering.
  sortedPlayers.forEach((player, index) => {
    const timeline = timelines.get(player.id);
    if (!timeline) return;
    timeline.finalRank = index + 1;
    if (timeline.firstRank !== undefined) {
      timeline.delta = timeline.finalRank - timeline.firstRank;
    }
  });

  return timelines;
};

/**
 * Glow Down: the player who dropped the most positions from their first ranked
 * round to the final standings. Requires a drop of at least MIN_GLOW_DOWN_DROP,
 * unless they started at #1 (any drop qualifies).
 */
export const findGlowDownAward = (
  timelines: Map<string, PlayerRankTimeline>,
  sortedPlayers: StandingsPlayer[],
): GlowDownAward | undefined => {
  const nameById = new Map(sortedPlayers.map((player) => [player.id, player.name]));
  let best: GlowDownAward | undefined;
  timelines.forEach((timeline) => {
    if (timeline.firstRank === undefined) return;
    const drop = timeline.finalRank - timeline.firstRank;
    if (drop <= 0) return;
    const qualifies = drop >= MIN_GLOW_DOWN_DROP || timeline.firstRank === 1;
    if (!qualifies) return;
    const candidate: GlowDownAward = {
      playerId: timeline.playerId,
      playerName: nameById.get(timeline.playerId) || '',
      firstRank: timeline.firstRank,
      finalRank: timeline.finalRank,
      drop,
    };
    if (
      !best ||
      candidate.drop > best.drop ||
      (candidate.drop === best.drop && candidate.firstRank < best.firstRank) ||
      (candidate.drop === best.drop && candidate.firstRank === best.firstRank &&
        candidate.playerName.localeCompare(best.playerName, 'id-ID') < 0)
    ) {
      best = candidate;
    }
  });
  return best;
};

/**
 * Match-night aggregate numbers for the Rewind "The Numbers" slide.
 */
export const buildMatchNightAggregate = (
  tournament: Tournament | TournamentHistory,
): MatchNightAggregate => {
  const sortedRounds = getSortedRounds(tournament);

  let totalPoints = 0;
  let matchCount = 0;
  let completedMatchCount = 0;
  let completedRoundCount = 0;
  let roundCount = 0;
  let biggestWin: BiggestWin | undefined;

  const winStreak = new Map<string, number>();
  const maxWinStreak = new Map<string, { streak: number; name: string }>();

  sortedRounds.forEach((round) => {
    const matches = round.matches || [];
    const countableMatches = matches.filter(hasMatchScoreProgress);
    if (countableMatches.length > 0) roundCount += 1;
    const allCompleted = matches.length > 0 && matches.every((match) => match.status === 'completed');
    if (allCompleted) completedRoundCount += 1;

    countableMatches.forEach((match) => {
      matchCount += 1;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      totalPoints += scoreA + scoreB;
      if (match.status !== 'completed') return;
      completedMatchCount += 1;

      const margin = Math.abs(scoreA - scoreB);
      const teamAPlayers = match.teamA?.players || [];
      const teamBPlayers = match.teamB?.players || [];

      if (scoreA === scoreB) {
        [...teamAPlayers, ...teamBPlayers].forEach((player) => winStreak.set(player.id, 0));
        return;
      }

      const winners = scoreA > scoreB ? teamAPlayers : teamBPlayers;
      const losers = scoreA > scoreB ? teamBPlayers : teamAPlayers;
      const winScore = scoreA > scoreB ? scoreA : scoreB;
      const loseScore = scoreA > scoreB ? scoreB : scoreA;

      if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) {
        biggestWin = {
          score: `${winScore}-${loseScore}`,
          margin,
          winners: formatShortNames(winners),
          roundId: round.id,
        };
      }

      winners.forEach((player) => {
        const next = (winStreak.get(player.id) || 0) + 1;
        winStreak.set(player.id, next);
        const currentMax = maxWinStreak.get(player.id);
        if (!currentMax || next > currentMax.streak) {
          maxWinStreak.set(player.id, { streak: next, name: player.name });
        }
      });
      losers.forEach((player) => winStreak.set(player.id, 0));
    });
  });

  let longestWinStreak: LongestWinStreak | undefined;
  maxWinStreak.forEach((value, playerId) => {
    if (value.streak < 2) return;
    if (
      !longestWinStreak ||
      value.streak > longestWinStreak.streak ||
      (value.streak === longestWinStreak.streak &&
        value.name.localeCompare(longestWinStreak.playerName, 'id-ID') < 0)
    ) {
      longestWinStreak = {
        playerId,
        playerName: value.name,
        streak: value.streak,
      };
    }
  });

  const startedAt = Number(tournament.startedAt || 0);
  const endedAt = Number(tournament.endedAt || 0);
  const derivedDuration = startedAt > 0 && endedAt > startedAt
    ? Math.round((endedAt - startedAt) / 60000)
    : 0;
  const durationMinutes = Number(tournament.durationMinutes || 0) || derivedDuration;

  return {
    totalPoints,
    roundCount,
    completedRoundCount,
    matchCount,
    completedMatchCount,
    biggestWin,
    longestWinStreak,
    durationMinutes,
  };
};

/**
 * Per-player "My Night" summary for the personal Rewind slide and My Match Card.
 */
export const buildMyNightSummary = (
  player: StandingsPlayer,
  finalRank: number,
  totalPlayers: number,
  timeline?: PlayerRankTimeline,
): MyNightSummary => ({
  playerId: player.id,
  name: player.name,
  avatar: player.avatar,
  initials: player.initials,
  finalRank,
  totalPlayers,
  w: player.w,
  l: player.l,
  d: player.d,
  matches: player.matches,
  record: `${player.w}W-${player.l}L`,
  pointsDiff: player.pointsDiff,
  totalPoints: player.totalPoints,
  firstRank: timeline?.firstRank,
});

/**
 * The seeded Glow Down roast tagline for a player (e.g. "Start juara, finish berduka."),
 * or empty string if the player does not qualify for a Glow Down.
 */
export const getGlowDownRoast = (
  glow: GlowDownAward | undefined,
  playerId: string,
  tournament: Tournament | TournamentHistory,
  toxicCopyConfig?: ToxicCopyConfig | null,
): string => {
  if (!glow || glow.playerId !== playerId) return '';
  const copyConfig = resolveToxicCopyConfig(toxicCopyConfig);
  const intensity: ToxicIntensity = normalizeToxicIntensity(tournament.toxicIntensity);
  const seed = String(tournament.id || tournament.startedAt || tournament.name || 'fom-match');
  return pickSeeded(copyConfig.glowDownRoasts[intensity], `${seed}:${playerId}:glow-down`);
};

/**
 * Build a ToxicAwardCard for the Glow Down award, for the Rewind awards slide.
 * Returns undefined when no player qualifies.
 */
export const buildGlowDownAwardCard = (
  glow: GlowDownAward | undefined,
  sortedPlayers: StandingsPlayer[],
  tournament: Tournament | TournamentHistory,
  toxicCopyConfig?: ToxicCopyConfig | null,
): ToxicAwardCard | undefined => {
  if (!glow) return undefined;
  const player = sortedPlayers.find((candidate) => candidate.id === glow.playerId);
  if (!player) return undefined;
  const copyConfig = resolveToxicCopyConfig(toxicCopyConfig);
  const roast = getGlowDownRoast(glow, glow.playerId, tournament, toxicCopyConfig);
  return {
    id: 'glow-down',
    ...copyConfig.awards['glow-down'],
    note: roast || `Turun ${glow.drop} posisi: #${glow.firstRank} → #${glow.finalRank}.`,
    player: {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      initials: player.initials,
    },
  };
};
