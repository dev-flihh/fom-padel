import type { Tournament, TournamentHistory, ToxicIntensity } from '../../types';
import { hasMatchScoreProgress, type StandingsPlayer } from '../matches/standingsUtils';
import type { ToxicStandingsData } from '../matches/toxicStandings';
import { getToxicIntensityLabel, normalizeToxicIntensity } from '../matches/toxicSettings';
import {
  buildMatchNightAggregate,
  buildRankTimelines,
  findGlowDownAward,
  type MatchNightAggregate,
} from '../matches/matchNightStats';
import {
  createRewindCopyPicker,
  renderRewindAwardNote,
  type RewindCopyLine,
  type RewindSlideType,
} from './rewindCopyBank';

// FOM Rewind data layer (PRD FR-6.2): compute ALL slide payloads from the final
// tournament state in ONE snapshot. Numbers come from the same standings /
// toxic-standings / match-night data as the UI — zero recomputation drift
// (PRD FR-6.7). The small scans here (pair wins, per-player evidence) mirror
// toxicStandings' countable-match rules over the same rounds.

export type RewindPhoto = {
  dataUrl: string;
  isCover?: boolean;
};

export type RewindPlayerRef = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  // Mode fixed: satu ref = satu tim; wajah partner ditampilkan sebagai badge
  // menempel di avatar utama (lihat komponen Avatar di RewindSlideTemplates).
  partnerAvatar?: string;
  partnerInitials?: string;
};

export type RewindMetaCell = { label: string; value: string };

// Row for the full standings slides (official & toxic). No avatars — matches
// the mockup's dense rank/name/W-L-D/PTS list.
export type FullStandingRow = {
  id: string;
  name: string;
  rank: number;
  w: number;
  l: number;
  d: number;
  pts: number;
  isChampion: boolean;
  subLabel?: string;
  highlight?: boolean;
  muted?: boolean;
};

export type RewindSlide =
  | { type: 'cover'; matchName: string; dateLabel: string; venue: string; city: string; format: string; playerCount: number; durationLabel: string; subline: string; photoUrl?: string }
  | { type: 'numbers'; headline: string; stats: Array<{ key: string; label: string; value: string; kicker?: string; accent?: boolean; wide?: boolean }> }
  | { type: 'podium'; headline: string; subline: string; players: Array<RewindPlayerRef & { rank: number; pts: number; diff: number }> }
  | { type: 'champion'; headline: string; players: RewindPlayerRef[]; rankLabel: string; record: string; diff: number; pts: number; quote: string }
  | { type: 'dream-team'; headline: string; players: RewindPlayerRef[]; pairName: string; played: number; wins: number; diff: number; quote: string }
  | { type: 'match-of-the-night'; headline: string; kicker: string; teamAName: string; teamBName: string; teamAPlayers: RewindPlayerRef[]; teamBPlayers: RewindPlayerRef[]; scoreA: number; scoreB: number }
  | { type: 'photos'; headline: string; photoUrls: string[]; sticker: string }
  | { type: 'podium-cupu'; headline: string; subline: string; players: Array<RewindPlayerRef & { rank: number; pts: number; diff: number }> }
  | { type: 'cupu'; players: RewindPlayerRef[]; title: string; rankLabel: string; record: string; diff: number; pts: number; quote: string }
  | { type: 'awards'; headline: string; awards: Array<{ id: string; label: string; emoji?: string; playerNames: string; players: RewindPlayerRef[]; note: string }> }
  | { type: 'certificate'; title: string; emoji?: string; recipientName: string; bodyCopy: string; note?: string; witnessCount: number }
  | { type: 'standings'; headline: string; meta: RewindMetaCell[]; rows: FullStandingRow[] }
  | { type: 'standings-toxic'; headline: string; meta: RewindMetaCell[]; rows: FullStandingRow[] }
  | { type: 'my-card'; player: RewindPlayerRef; matchName: string; dateLabel: string; officialRank: number; playerCount: number; record: string; diff: number; pts: number; toxicRank?: number; roast?: string; intensityLabel?: string; photoUrl?: string }
  | { type: 'outro'; headline: string; photoUrl?: string; shareUrl: string };

export type RewindData = {
  slides: RewindSlide[];
  conditions: string[];
  intensity: ToxicIntensity;
  shortLink: string;
};

export const REWIND_SLIDE_LABELS: Record<RewindSlideType, string> = {
  cover: 'Cover',
  numbers: 'The Numbers',
  podium: 'The Podium',
  champion: 'Champion',
  'dream-team': 'Dream Team',
  'match-of-the-night': 'Match of the Night',
  photos: 'Photo Dump',
  'podium-cupu': 'Podium Cupu',
  cupu: "Cupu D'Or",
  awards: 'Toxic Awards',
  certificate: 'Sertifikat Cupu',
  standings: 'Final Standings',
  'standings-toxic': 'Hall of Shame',
  'my-card': 'My Card',
  outro: 'Outro',
};

// Mode fixed: satu baris peringkat = satu tim. Untuk slide "hero" (champion,
// cupu) pecah kembali jadi dua wajah pemain agar keduanya tampil. Nama anchor
// dipulihkan dari nama gabungan "anchor & partner".
type TeamExpandable = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  isTeamRow?: boolean;
  partnerId?: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerInitials?: string;
};
const expandTeamMemberRefs = (row: TeamExpandable): RewindPlayerRef[] => {
  if (!row.isTeamRow || !row.partnerId) {
    return [{ id: row.id, name: row.name, avatar: row.avatar, initials: row.initials }];
  }
  const partnerSuffix = ` & ${row.partnerName || ''}`;
  const anchorName = row.name.endsWith(partnerSuffix)
    ? row.name.slice(0, row.name.length - partnerSuffix.length)
    : (row.name.split(' & ')[0] || row.name);
  return [
    { id: row.id, name: anchorName, avatar: row.avatar, initials: row.initials },
    { id: row.partnerId, name: row.partnerName || '', avatar: row.partnerAvatar, initials: row.partnerInitials || '' },
  ];
};

const toPlayerRef = (player: TeamExpandable): RewindPlayerRef => ({
  id: player.id,
  name: player.name,
  avatar: player.avatar,
  initials: player.initials,
  // Baris tim (mode fixed) tetap satu ref, tapi bawa wajah partner supaya
  // slide podium/my-card bisa menampilkan kedua pemain.
  ...(player.isTeamRow && player.partnerId
    ? {
        partnerAvatar: player.partnerAvatar,
        partnerInitials: (player.partnerInitials || player.partnerName || '?').slice(0, 1),
      }
    : {}),
});

const getShortName = (name = '') => name.trim().split(/\s+/)[0] || name;
const joinShortNames = (players: Array<{ name: string }>) => players.map((p) => getShortName(p.name)).join(' & ');

const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const formatDurationLabel = (minutes: number) => {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}j ${rest}m` : `${rest}m`;
};

const sameStanding = (a: StandingsPlayer, b: StandingsPlayer) => (
  a.w === b.w && a.pointsDiff === b.pointsDiff && a.totalPoints === b.totalPoints
);

type PairRecord = {
  players: [StandingsPlayer, StandingsPlayer];
  together: number;
  wins: number;
  diff: number;
  totalMargin: number;
};

type PlayerEvidence = {
  byes: number;
  maxLossStreak: number;
  worstLoss?: { score: string; margin: number; opponents: string };
};

type CompletedMatchInfo = {
  roundId: number;
  court: number;
  teamA: StandingsPlayer[];
  teamB: StandingsPlayer[];
  scoreA: number;
  scoreB: number;
  margin: number;
  total: number;
};

const scanRounds = (
  tournament: Tournament | TournamentHistory,
  playersById: Map<string, StandingsPlayer>,
) => {
  const rounds = [...(tournament.rounds || [])].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
  const pairs = new Map<string, PairRecord>();
  const evidence = new Map<string, PlayerEvidence>();
  const completedMatches: CompletedMatchInfo[] = [];
  const lossStreak = new Map<string, number>();

  const getEvidence = (id: string) => {
    let entry = evidence.get(id);
    if (!entry) {
      entry = { byes: 0, maxLossStreak: 0 };
      evidence.set(id, entry);
    }
    return entry;
  };

  rounds.forEach((round) => {
    (round.playersBye || []).forEach((player) => {
      if (!playersById.has(player.id)) return;
      getEvidence(player.id).byes += 1;
    });

    (round.matches || []).forEach((match) => {
      if (!hasMatchScoreProgress(match) || match.status !== 'completed') return;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const teamA = (match.teamA?.players || []).map((p) => playersById.get(p.id)).filter((p): p is StandingsPlayer => Boolean(p));
      const teamB = (match.teamB?.players || []).map((p) => playersById.get(p.id)).filter((p): p is StandingsPlayer => Boolean(p));
      const margin = Math.abs(scoreA - scoreB);
      completedMatches.push({
        roundId: round.id,
        court: Number(match.court || 1),
        teamA,
        teamB,
        scoreA,
        scoreB,
        margin,
        total: scoreA + scoreB,
      });

      const registerPair = (team: StandingsPlayer[], teamDiff: number, won: boolean) => {
        if (team.length !== 2) return;
        const key = [team[0].id, team[1].id].sort().join('::');
        const entry = pairs.get(key) || {
          players: [team[0], team[1]] as [StandingsPlayer, StandingsPlayer],
          together: 0,
          wins: 0,
          diff: 0,
          totalMargin: 0,
        };
        entry.together += 1;
        entry.diff += teamDiff;
        if (won) {
          entry.wins += 1;
          entry.totalMargin += Math.abs(teamDiff);
        }
        pairs.set(key, entry);
      };
      registerPair(teamA, scoreA - scoreB, scoreA > scoreB);
      registerPair(teamB, scoreB - scoreA, scoreB > scoreA);

      if (scoreA === scoreB) {
        [...teamA, ...teamB].forEach((player) => lossStreak.set(player.id, 0));
        return;
      }
      const losers = scoreA > scoreB ? teamB : teamA;
      const winners = scoreA > scoreB ? teamA : teamB;
      const loserScore = Math.min(scoreA, scoreB);
      const winnerScore = Math.max(scoreA, scoreB);
      losers.forEach((player) => {
        const next = (lossStreak.get(player.id) || 0) + 1;
        lossStreak.set(player.id, next);
        const entry = getEvidence(player.id);
        entry.maxLossStreak = Math.max(entry.maxLossStreak, next);
        if (!entry.worstLoss || margin > entry.worstLoss.margin) {
          entry.worstLoss = {
            score: `${loserScore}-${winnerScore}`,
            margin,
            opponents: joinShortNames(winners),
          };
        }
      });
      winners.forEach((player) => lossStreak.set(player.id, 0));
    });
  });

  return { pairs, evidence, completedMatches };
};

export const buildRewindData = ({
  tournament,
  sortedPlayers,
  toxicStandings,
  photos,
  shareId,
  copyBank,
  currentUserPlayerId,
  currentUserStanding,
}: {
  tournament: Tournament | TournamentHistory;
  sortedPlayers: StandingsPlayer[];
  toxicStandings: ToxicStandingsData;
  photos: RewindPhoto[];
  shareId?: string;
  copyBank?: RewindCopyLine[] | null;
  currentUserPlayerId?: string;
  currentUserStanding?: StandingsPlayer;
}): RewindData => {
  const seed = String(tournament.id || tournament.startedAt || tournament.name || 'fom-rewind');
  const intensity = normalizeToxicIntensity(tournament.toxicIntensity);
  const toxicOn = Boolean(tournament.toxicModeEnabled) && !toxicStandings.isEmpty && !toxicStandings.isPeacefulTie;
  const aggregate: MatchNightAggregate = buildMatchNightAggregate(tournament);
  const playersById = new Map(sortedPlayers.map((player) => [player.id, player]));

  // Mode fixed: satu baris peringkat = satu tim (2 pemain). Jumlah pemain
  // sebenarnya harus memekar baris tim jadi anchor + partner — kalau tidak,
  // "Players" di cover ikut jadi jumlah tim (5 tim → keliru tampil 5 pemain,
  // seharusnya 10). Mode americano: baris = pemain, jadi hasilnya tetap sama.
  const distinctPlayerIds = new Set<string>();
  sortedPlayers.forEach((row) => {
    distinctPlayerIds.add(row.id);
    if (row.isTeamRow && row.partnerId) distinctPlayerIds.add(row.partnerId);
  });
  const totalPlayerCount = distinctPlayerIds.size;
  const { pairs, evidence, completedMatches } = scanRounds(tournament, playersById);
  const rankTimelines = buildRankTimelines(tournament, sortedPlayers);
  const glowDown = findGlowDownAward(rankTimelines, sortedPlayers);

  const startedAt = Number(tournament.startedAt || 0);
  const endedAt = Number(tournament.endedAt || 0);
  const matchDate = startedAt > 0 ? new Date(startedAt) : new Date(0);
  const dateLabel = startedAt > 0
    ? matchDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const durationLabel = formatDurationLabel(aggregate.durationMinutes);
  const endTimeLabel = endedAt > 0
    ? new Date(endedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  const champion = sortedPlayers[0];
  const runnerUp = sortedPlayers[1];
  const coChampions = champion
    ? sortedPlayers.filter((player) => sameStanding(player, champion))
    : [];
  const isCoChampion = coChampions.length > 1;
  const gap12 = champion && runnerUp ? champion.totalPoints - runnerUp.totalPoints : 0;
  const lastPlayer = sortedPlayers[sortedPlayers.length - 1];
  const gapTopBottom = champion && lastPlayer ? champion.totalPoints - lastPlayer.totalPoints : 0;
  const tieExists = sortedPlayers.some((player, index) => (
    index > 0 && player.totalPoints === sortedPlayers[index - 1].totalPoints
  ));

  // Dream Team: 100% win rate together, minimal 2 matches (mockup R5).
  const dreamTeam = [...pairs.values()]
    .filter((pair) => pair.together >= 2 && pair.wins === pair.together)
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff)[0];

  // Match of the Night: smallest margin (drama); fallback highest total points.
  const decidedMatches = completedMatches.filter((match) => match.margin >= 1 && match.teamA.length > 0 && match.teamB.length > 0);
  const closestMatch = [...decidedMatches].sort((a, b) => a.margin - b.margin || b.total - a.total)[0];
  const highestScoringMatch = [...completedMatches].sort((a, b) => b.total - a.total)[0];
  const matchOfTheNight = closestMatch && closestMatch.margin <= 2 ? closestMatch : highestScoringMatch;

  const kingRow = toxicStandings.rows.length > 0 ? toxicStandings.rows[0] : undefined;
  const kingEvidence = kingRow ? evidence.get(kingRow.id) : undefined;
  const isCoKing = toxicStandings.heroPlayers.length > 1;

  const rankById = new Map(sortedPlayers.map((player, index) => [player.id, index + 1]));
  const championRank = champion ? rankById.get(champion.id) || 1 : 1;

  // -------------------------------------------------------------------------
  // Match conditions for the copy bank
  // -------------------------------------------------------------------------
  const conditions: string[] = [];
  const push = (condition: string, active: boolean) => { if (active) conditions.push(condition); };
  push('toxic_on', toxicOn);
  push('duration_gt_3h', aggregate.durationMinutes > 180);
  push('ended_after_22', endedAt > 0 && new Date(endedAt).getHours() >= 22);
  push('weekend_morning', startedAt > 0 && [0, 6].includes(matchDate.getDay()) && matchDate.getHours() < 12);
  push('player_count_gte_12', totalPlayerCount >= 12);
  push('total_points_gt_250', aggregate.totalPoints > 250);
  push('rounds_gte_12', aggregate.roundCount >= 12);
  push('shutout_win', Boolean(aggregate.biggestWin && aggregate.biggestWin.score.endsWith('-0')));
  push('all_matches_close', decidedMatches.length > 0 && decidedMatches.every((match) => match.margin <= 2));
  push('streak_gte_4', (aggregate.longestWinStreak?.streak || 0) >= 4);
  push('streak_lte_2', (aggregate.longestWinStreak?.streak || 0) > 0 && (aggregate.longestWinStreak?.streak || 0) <= 2);
  push('gap_1_2_lte_2', Boolean(runnerUp) && gap12 <= 2 && !isCoChampion);
  push('gap_1_2_gte_8', gap12 >= 8);
  push('win_rate_gte_80', Boolean(champion && champion.matches > 0 && (champion.w / champion.matches) >= 0.8));
  push('won_by_diff', Boolean(champion && runnerUp && champion.w === runnerUp.w && champion.totalPoints === runnerUp.totalPoints && champion.pointsDiff !== runnerUp.pointsDiff));
  push('co_champion', isCoChampion);
  push('champion_also_dream_team', Boolean(champion && dreamTeam && dreamTeam.players.some((player) => player.id === champion.id)));
  push('pair_rank_gap', Boolean(dreamTeam && (() => {
    const ranks = dreamTeam.players.map((player) => rankById.get(player.id) || 0);
    return Math.min(...ranks) <= 3 && Math.max(...ranks) >= Math.max(4, sortedPlayers.length - 2);
  })()));
  push('pair_dominant', Boolean(dreamTeam && dreamTeam.wins > 0 && dreamTeam.totalMargin / dreamTeam.wins >= 3));
  push('motn_margin_1', Boolean(matchOfTheNight && matchOfTheNight.margin === 1));
  push('photo_count_gte_8', photos.length >= 8);
  push('cupu_kalah_telak', Boolean(kingEvidence?.worstLoss && kingEvidence.worstLoss.margin >= 4));
  push('cupu_bye_gte_3', (kingEvidence?.byes || 0) >= 3);
  push('cupu_losing_streak_gte_3', (kingEvidence?.maxLossStreak || 0) >= 3);
  push('cupu_winless', Boolean(kingRow && kingRow.matches > 0 && kingRow.w === 0));
  push('co_king', isCoKing);
  push('gap_top_bottom_gte_30', gapTopBottom >= 30);
  push('tie_exists', tieExists);

  const copy = createRewindCopyPicker({
    seed,
    conditions,
    intensity,
    ...(copyBank ? { bank: copyBank } : {}),
  });

  // -------------------------------------------------------------------------
  // Slides (mockup v2 order). Conditional slides skipped without gaps.
  // -------------------------------------------------------------------------
  const coverPhoto = photos.find((photo) => photo.isCover) || photos[0];
  const nonCoverPhotos = photos.filter((photo) => photo !== coverPhoto);
  const shortId = String(shareId || tournament.id || '').slice(0, 8) || 'match';
  const shortLink = `fomplay.asia/m/${shortId}`;
  const shareUrl = shareId
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://fomplay.asia'}/m/${shareId}`
    : 'https://fomplay.asia/app';

  const slides: RewindSlide[] = [];

  // 1 — Cover
  slides.push({
    type: 'cover',
    matchName: tournament.name || 'FOM Play Match',
    dateLabel,
    venue: tournament.venueName || '',
    city: tournament.location || '',
    format: tournament.format || '',
    playerCount: totalPlayerCount,
    durationLabel,
    subline: copy.pick('cover', 'subline', {
      playerCount: totalPlayerCount,
      duration: durationLabel,
      endTime: endTimeLabel,
    }),
    photoUrl: coverPhoto?.dataUrl,
  });

  // 2 — The Numbers (min 3 stats; missing ones dropped — PRD Slide 2)
  const numberStats: Array<{ key: string; label: string; value: string; kicker?: string; accent?: boolean; wide?: boolean }> = [];
  numberStats.push({
    key: 'points',
    label: 'TOTAL POINTS',
    value: String(aggregate.totalPoints),
    kicker: copy.pick('numbers', 'kicker_points'),
    wide: true,
  });
  numberStats.push({ key: 'rounds', label: 'ROUNDS', value: String(aggregate.roundCount) });
  numberStats.push({ key: 'matches', label: 'MATCHES', value: String(aggregate.completedMatchCount || aggregate.matchCount) });
  if (aggregate.biggestWin) {
    numberStats.push({
      key: 'bigwin',
      label: 'BIGGEST WIN',
      value: aggregate.biggestWin.score,
      kicker: copy.pick('numbers', 'kicker_bigwin', { biggestWinPair: aggregate.biggestWin.winners }),
      accent: true,
      wide: true,
    });
  }
  if (aggregate.longestWinStreak) {
    numberStats.push({
      key: 'streak',
      label: 'LONGEST STREAK',
      value: `${aggregate.longestWinStreak.streak} wins`,
      kicker: copy.pick('numbers', 'kicker_streak', {
        streakName: getShortName(aggregate.longestWinStreak.playerName),
        streak: aggregate.longestWinStreak.streak,
      }),
      wide: true,
    });
  }
  slides.push({
    type: 'numbers',
    headline: copy.pick('numbers', 'headline', { totalRounds: aggregate.roundCount }),
    stats: numberStats,
  });

  // 3 — Podium Official (needs ≥3 players)
  if (sortedPlayers.length >= 3) {
    slides.push({
      type: 'podium',
      headline: copy.pick('podium', 'headline'),
      subline: copy.pick('podium', 'subline', {
        gap: gap12,
        championName: champion ? getShortName(champion.name) : '',
      }),
      players: sortedPlayers.slice(0, 3).map((player, index) => ({
        ...toPlayerRef(player),
        rank: index + 1,
        pts: player.totalPoints,
        diff: player.pointsDiff,
      })),
    });
  }

  // 4 — Champion (tie total → varian tanpa penobatan ditangani template)
  if (champion) {
    // Fixed: champion adalah satu tim → tampilkan kedua anggotanya.
    const championPlayers = champion.isTeamRow
      ? expandTeamMemberRefs(champion)
      : coChampions.slice(0, 2).map(toPlayerRef);
    slides.push({
      type: 'champion',
      headline: isCoChampion || champion.isTeamRow ? 'CO-CHAMPION' : 'CHAMPION',
      players: championPlayers.slice(0, 2),
      rankLabel: `#1 OF ${sortedPlayers.length}`,
      record: `${champion.w}W-${champion.l}L`,
      diff: champion.pointsDiff,
      pts: champion.totalPoints,
      quote: copy.pick('champion', 'quote', {
        winRate: champion.matches > 0 ? Math.round((champion.w / champion.matches) * 100) : 0,
        W: champion.w,
        M: champion.matches,
      }),
    });
  }

  // 5 — Dream Team (usulan v2; 100% winrate, ≥2 main bareng)
  if (dreamTeam) {
    slides.push({
      type: 'dream-team',
      headline: copy.pick('dream-team', 'headline'),
      players: dreamTeam.players.map(toPlayerRef),
      pairName: joinShortNames(dreamTeam.players),
      played: dreamTeam.together,
      wins: dreamTeam.wins,
      diff: dreamTeam.diff,
      quote: copy.pick('dream-team', 'quote', {
        pairPlayed: dreamTeam.together,
        pairWins: dreamTeam.wins,
      }),
    });
  }

  // 6 — Match of the Night (usulan v2)
  if (matchOfTheNight) {
    slides.push({
      type: 'match-of-the-night',
      headline: copy.pick('match-of-the-night', 'headline'),
      kicker: copy.pick('match-of-the-night', 'kicker', {
        round: matchOfTheNight.roundId,
        totalMatchPoints: matchOfTheNight.total,
      }),
      teamAName: joinShortNames(matchOfTheNight.scoreA >= matchOfTheNight.scoreB ? matchOfTheNight.teamA : matchOfTheNight.teamB),
      teamBName: joinShortNames(matchOfTheNight.scoreA >= matchOfTheNight.scoreB ? matchOfTheNight.teamB : matchOfTheNight.teamA),
      teamAPlayers: (matchOfTheNight.scoreA >= matchOfTheNight.scoreB ? matchOfTheNight.teamA : matchOfTheNight.teamB).map(toPlayerRef),
      teamBPlayers: (matchOfTheNight.scoreA >= matchOfTheNight.scoreB ? matchOfTheNight.teamB : matchOfTheNight.teamA).map(toPlayerRef),
      scoreA: Math.max(matchOfTheNight.scoreA, matchOfTheNight.scoreB),
      scoreB: Math.min(matchOfTheNight.scoreA, matchOfTheNight.scoreB),
    });
  }

  // 7 — Photo Dump (≥3 foto non-cover — PRD Slide 6)
  if (nonCoverPhotos.length >= 3) {
    slides.push({
      type: 'photos',
      headline: copy.pick('photos', 'headline'),
      photoUrls: nonCoverPhotos.slice(0, 3).map((photo) => photo.dataUrl),
      sticker: copy.pick('photos', 'sticker'),
    });
  }

  // 8 — Podium Cupu (toxic on, ≥3 pemain)
  if (toxicOn && sortedPlayers.length >= 3) {
    const bottomThree = sortedPlayers.slice(-3).reverse(); // worst first for center placement
    slides.push({
      type: 'podium-cupu',
      headline: copy.pick('podium-cupu', 'headline'),
      subline: copy.pick('podium-cupu', 'subline'),
      players: bottomThree.map((player) => ({
        ...toPlayerRef(player),
        rank: rankById.get(player.id) || 0,
        pts: player.totalPoints,
        diff: player.pointsDiff,
      })),
    });
  }

  // 9 — Cupu D'Or (toxic on, King valid)
  if (toxicOn && kingRow && toxicStandings.heroPlayers.length > 0) {
    // Fixed: king adalah satu tim → tampilkan kedua wajahnya.
    const cupuPlayers = toxicStandings.heroPlayers[0]?.isTeamRow
      ? expandTeamMemberRefs(toxicStandings.heroPlayers[0]).slice(0, 2)
      : toxicStandings.heroPlayers.slice(0, 2).map(toPlayerRef);
    slides.push({
      type: 'cupu',
      players: cupuPlayers,
      title: isCoKing ? 'CO-KING OF CUPU · TERPILIH SECARA SAH' : 'KING OF CUPU · TERPILIH SECARA SAH',
      rankLabel: `#${rankById.get(kingRow.id) || sortedPlayers.length} OF ${sortedPlayers.length}`,
      record: `${kingRow.w}W-${kingRow.l}L`,
      diff: kingRow.pointsDiff,
      pts: kingRow.totalPoints,
      quote: copy.pick('cupu', 'quote', {
        score: kingEvidence?.worstLoss?.score,
        opponentPair: kingEvidence?.worstLoss?.opponents,
        byeCount: kingEvidence?.byes,
        streak: kingEvidence?.maxLossStreak,
      }),
    });
  }

  // 10 — Toxic Awards (toxic on, ≥2 awards)
  if (toxicOn) {
    const awardEntries = toxicStandings.awardCards.map((award) => {
      const awardPlayers = [award.player, award.secondaryPlayer].filter((p): p is NonNullable<typeof p> => Boolean(p));
      return {
        id: award.id,
        label: award.label,
        emoji: award.emoji,
        playerNames: awardPlayers.map((p) => p.name).join(' & '),
        // Mode fixed: entri award bisa berupa tim → pecah jadi dua wajah
        // supaya slide awards menampilkan kedua pemain.
        players: awardPlayers.flatMap((p) => (p.isTeamRow ? expandTeamMemberRefs(p) : [toPlayerRef(p)])),
        note: renderRewindAwardNote(award.id, intensity, {
          byeCount: award.id === 'sultan-of-bye' ? evidence.get(award.player.id)?.byes : undefined,
          from: glowDown?.firstRank,
          to: glowDown?.finalRank,
        }, award.note),
      };
    });
    if (glowDown && !awardEntries.some((entry) => entry.id === 'glow-down')) {
      const glowPlayer = playersById.get(glowDown.playerId);
      if (glowPlayer) {
        awardEntries.push({
          id: 'glow-down',
          label: 'Glow Down',
          emoji: '📉',
          playerNames: glowPlayer.name,
          players: [toPlayerRef(glowPlayer)],
          note: renderRewindAwardNote('glow-down', intensity, {
            from: glowDown.firstRank,
            to: glowDown.finalRank,
          }, `Rank ${glowDown.firstRank} ke rank ${glowDown.finalRank}.`),
        });
      }
    }
    if (awardEntries.length >= 2) {
      slides.push({
        type: 'awards',
        headline: 'Penghargaan yang nggak ada yang mau menang.',
        awards: awardEntries.slice(0, 4),
      });
    }
  }

  // 10b — Sertifikat Cupu (toxic on; max 3 supaya deck nggak kepanjangan —
  // sisanya tetap tampil sebagai award card di Klasemen)
  if (toxicOn) {
    toxicStandings.awardCards.slice(0, 3).forEach((award) => {
      const recipients = [award.player, award.secondaryPlayer]
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      const primaryRow = toxicStandings.rows.find((row) => row.id === award.player.id);
      const recordLabel = primaryRow ? `${primaryRow.w}W-${primaryRow.l}L` : '';
      slides.push({
        type: 'certificate',
        title: award.label,
        emoji: award.emoji,
        recipientName: recipients.map((p) => p.name).join(' & ') || 'Pemain Cupu',
        bodyCopy: `adalah penerima ${award.label} pada mabar ${tournament.name || 'FOM Play'}${dateLabel ? `, ${dateLabel}` : ''}${primaryRow ? `, dengan rekor ${recordLabel} dan DIFF ${formatDiff(primaryRow.pointsDiff)}` : ''}.`,
        note: award.note,
        witnessCount: Math.max(1, totalPlayerCount - recipients.length),
      });
    });
  }

  // 11 — Full Official Standings (semua pemain — mockup T1)
  const shortDateLabel = startedAt > 0
    ? matchDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : dateLabel;
  slides.push({
    type: 'standings',
    headline: copy.pick('standings', 'headline', {
      rounds: aggregate.roundCount,
      totalPoints: aggregate.totalPoints,
      lastRank: sortedPlayers.length,
      gap: gapTopBottom,
    }),
    meta: [
      { label: 'Venue', value: tournament.venueName || '—' },
      { label: 'Date', value: shortDateLabel || '—' },
      { label: 'Format', value: tournament.format || '—' },
      { label: 'Time', value: durationLabel || '—' },
    ],
    rows: sortedPlayers.map((player, index) => ({
      id: player.id,
      name: player.name,
      rank: index + 1,
      w: player.w,
      l: player.l,
      d: player.d,
      pts: player.totalPoints,
      isChampion: index === 0,
      highlight: index === 0,
    })),
  });

  // 12 — Full Toxic Standings (reverse-sorted, toxic on saja — mockup T2)
  if (toxicOn && toxicStandings.rows.length > 0) {
    slides.push({
      type: 'standings-toxic',
      headline: copy.pick('standings-toxic', 'headline'),
      meta: [
        { label: 'Venue', value: tournament.venueName || '—' },
        { label: 'Date', value: shortDateLabel || '—' },
        { label: 'Sorting', value: 'L > −DIFF' },
        { label: 'Korban', value: String(sortedPlayers.length) },
      ],
      rows: toxicStandings.rows.map((row, index) => {
        const isKing = index === 0;
        return {
          id: row.id,
          name: row.name,
          rank: index + 1,
          w: row.w,
          l: row.l,
          d: row.d,
          pts: row.totalPoints,
          isChampion: row.isChampion,
          highlight: isKing,
          muted: row.isChampion && !isKing,
          subLabel: isKing
            ? (isCoKing ? 'CO-KING OF CUPU' : 'KING OF CUPU · TANPA BANDING')
            : row.isChampion
              ? 'SWEATY TRYHARD 🏆 · DIABAIKAN'
              : undefined,
        };
      }),
    });
  }

  // 12b — My Card (personal, hanya kalau user login ikut main). Tidak ikut
  // dipersist ke Firestore (lihat RewindFlow) — kartu ini milik yang generate.
  // Mode fixed: sortedPlayers berisi baris tim, jadi identitas + rekor pribadi
  // diambil dari currentUserStanding (individual); peringkat & roast diambil
  // dari baris tim yang memuat user (via id anchor maupun partnerId).
  const myPlayer = currentUserStanding
    || (currentUserPlayerId ? playersById.get(currentUserPlayerId) : undefined);
  if (myPlayer) {
    const myRankedRow = sortedPlayers.find((row) => row.id === myPlayer.id || row.partnerId === myPlayer.id);
    const myOfficialRank = myRankedRow ? (rankById.get(myRankedRow.id) || 0) : (rankById.get(myPlayer.id) || 0);
    const myToxicRow = toxicOn
      ? toxicStandings.rows.find((row) => row.id === myPlayer.id || row.partnerId === myPlayer.id)
      : undefined;
    slides.push({
      type: 'my-card',
      player: toPlayerRef(myPlayer),
      matchName: tournament.name || 'FOM Play Match',
      dateLabel: shortDateLabel || dateLabel,
      officialRank: myOfficialRank,
      playerCount: sortedPlayers.length,
      record: `${myPlayer.w}W-${myPlayer.l}L${myPlayer.d > 0 ? `-${myPlayer.d}D` : ''}`,
      diff: myPlayer.pointsDiff,
      pts: myPlayer.totalPoints,
      toxicRank: myToxicRow?.toxicRank,
      roast: myToxicRow?.roast,
      intensityLabel: myToxicRow ? getToxicIntensityLabel(tournament.toxicIntensity) : undefined,
      photoUrl: coverPhoto?.dataUrl,
    });
  }

  // 13 — Outro
  slides.push({
    type: 'outro',
    headline: copy.pick('outro', 'headline'),
    photoUrl: nonCoverPhotos[0]?.dataUrl || coverPhoto?.dataUrl,
    shareUrl,
  });

  return { slides, conditions, intensity, shortLink };
};
