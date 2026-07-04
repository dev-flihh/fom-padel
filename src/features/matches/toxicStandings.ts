import type { Round, Tournament, TournamentHistory, ToxicIntensity } from '../../types';
import { DEFAULT_TOXIC_COPY_CONFIG, resolveToxicCopyConfig, type ToxicCopyConfig } from './toxicCopyConfig';
import { hasMatchScoreProgress, type StandingsPlayer } from './standingsUtils';
import { normalizeToxicIntensity } from './toxicSettings';
import { isFixedPartnerTournament } from './partnerMode';
export type { StandingsPlayer } from './standingsUtils';

export type ToxicAwardId =
  | 'king-of-cupu'
  | 'runner-up-cupu'
  | 'duo-petaka'
  | 'glow-down'
  | 'sultan-of-bye'
  | 'tukang-nyumbang-poin'
  | 'spesialis-kalah-tipis'
  | 'bulldozer-korban'
  | 'sweaty-tryhard'
  | 'mr-konsisten';

export type ToxicBucket =
  | 'champion'
  | 'last-place'
  | 'near-bottom'
  | 'big-minus'
  | 'bye-collector'
  | 'losing-streak'
  | 'heartbreaker'
  | 'mid-table'
  | 'no-data';

export type ToxicAward = {
  id: ToxicAwardId;
  label: string;
  emoji?: string;
  note: string;
  isGold?: boolean;
};

export type ToxicStandingRow = StandingsPlayer & {
  toxicRank: number;
  normalRank: number;
  bucket: ToxicBucket;
  roast: string;
  award?: ToxicAward;
  isChampion: boolean;
};

export type ToxicHeroPlayer = Pick<
  StandingsPlayer,
  'id' | 'name' | 'avatar' | 'initials' | 'isTeamRow' | 'partnerId' | 'partnerName' | 'partnerAvatar' | 'partnerInitials'
>;

export type ToxicHeroStat = {
  label: string;
  value: string;
  tone: 'default' | 'danger';
};

export type ToxicAwardCard = ToxicAward & {
  player: ToxicHeroPlayer;
  secondaryPlayer?: ToxicHeroPlayer;
};

export type ToxicStandingsData = {
  isEmpty: boolean;
  isPeacefulTie: boolean;
  rows: ToxicStandingRow[];
  heroPlayers: ToxicHeroPlayer[];
  heroTitle: string;
  heroStats: ToxicHeroStat[];
  heroRoast: string;
  awardCards: ToxicAwardCard[];
  tickerMessage: string;
  sortLabel: string;
};

const BIG_MINUS_THRESHOLD = -8;
const MIN_BYE_AWARD = 2;
const MIN_CLOSE_LOSS_AWARD = 2;
const MIN_LOSING_STREAK = 3;
const MIN_DUO_PETAKA_MATCHES = 2;

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

const pickUniqueSeeded = (items: string[], seed: string, used: Set<string>) => {
  if (items.length === 0) return '';
  const startIndex = hashStringToInt(seed) % items.length;
  for (let offset = 0; offset < items.length; offset += 1) {
    const candidate = items[(startIndex + offset) % items.length];
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  return pickSeeded(items, seed);
};

const getTournamentSeed = (tournament: Tournament | TournamentHistory) => (
  String(tournament.id || tournament.startedAt || ('date' in tournament ? new Date(tournament.date).getTime() : '') || tournament.name || 'fom-match')
);

const sameStandingValue = (a: StandingsPlayer, b: StandingsPlayer) => (
  a.w === b.w &&
  a.pointsDiff === b.pointsDiff &&
  a.totalPoints === b.totalPoints
);

const formatDiff = (value: number) => (value > 0 ? `+${value}` : String(value));

const formatRecord = (player: StandingsPlayer) => `${player.w}W - ${player.l}L`;

const compareAwardTie = (a: StandingsPlayer, b: StandingsPlayer) => (
  a.totalPoints - b.totalPoints ||
  a.name.localeCompare(b.name, 'id-ID')
);

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const createAward = (copyConfig: ToxicCopyConfig, id: ToxicAwardId, note: string): ToxicAward => ({
  id,
  ...copyConfig.awards[id],
  note,
});

type PairStats = {
  playerIds: [string, string];
  together: number;
  losses: number;
  diff: number;
};

type LossEvidence = {
  roundId: number;
  score: string;
  margin: number;
  opponents: string;
};

type PairEvidence = {
  partnerName: string;
  together: number;
  losses: number;
  diff: number;
};

const getPairKey = (playerAId: string, playerBId: string) => (
  [playerAId, playerBId].sort().join('::')
);

const toHeroPlayer = (player: StandingsPlayer): ToxicHeroPlayer => ({
  id: player.id,
  name: player.name,
  avatar: player.avatar,
  initials: player.initials,
  // Bawa data partner supaya hero Cupu D'Or bisa tampil dua wajah di mode fixed.
  isTeamRow: player.isTeamRow,
  partnerId: player.partnerId,
  partnerName: player.partnerName,
  partnerAvatar: player.partnerAvatar,
  partnerInitials: player.partnerInitials,
});

const getShortPlayerName = (name = '') => (
  name.trim().split(/\s+/)[0] || name
);

const formatShortPlayerNames = (players: Array<{ name: string }>) => (
  players.map((player) => getShortPlayerName(player.name)).join(' & ')
);

const sameStringList = (a: string[], b: string[]) => (
  a.length === b.length && a.every((item, index) => item === b[index])
);

const hasCustomRowRoasts = (
  copyConfig: ToxicCopyConfig,
  intensity: ToxicIntensity,
  bucket: ToxicBucket
) => !sameStringList(
  copyConfig.rowRoasts[intensity][bucket],
  DEFAULT_TOXIC_COPY_CONFIG.rowRoasts[intensity][bucket]
);

const hasCustomHeroRoasts = (
  copyConfig: ToxicCopyConfig,
  intensity: ToxicIntensity
) => !sameStringList(
  copyConfig.heroRoasts[intensity],
  DEFAULT_TOXIC_COPY_CONFIG.heroRoasts[intensity]
);

const buildEvidenceRoast = ({
  player,
  bucket,
  byes,
  closeLosses,
  biggestLoss,
  lossStreak,
  pairEvidence,
}: {
  player: StandingsPlayer;
  bucket: ToxicBucket;
  byes: number;
  closeLosses: number;
  biggestLoss?: LossEvidence;
  lossStreak: number;
  pairEvidence?: PairEvidence;
}) => {
  if (bucket === 'no-data') return '';

  if (bucket === 'champion') {
    if (player.matches > 0 && player.w === player.matches) {
      return `${player.matches}x main, ${player.w}x menang. Sweaty detected.`;
    }
    return `Rank normal #1 dengan DIFF ${formatDiff(player.pointsDiff)}. Serius amat bro.`;
  }

  if (bucket === 'last-place') {
    if (biggestLoss && biggestLoss.margin >= 4) {
      return `Kalah terbesar ${biggestLoss.score} vs ${biggestLoss.opponents}. Tahta bawahnya ada bukti.`;
    }
    if (player.l > 0) {
      return `${player.l}x kalah dari ${player.matches} match. Ini bukan feeling, ini statistik.`;
    }
    return `DIFF ${formatDiff(player.pointsDiff)}. Sedekah poinnya paling niat.`;
  }

  if (bucket === 'near-bottom') {
    if (pairEvidence && pairEvidence.diff < 0) {
      return `${pairEvidence.together}x bareng ${pairEvidence.partnerName}, DIFF ${formatDiff(pairEvidence.diff)}. Chemistry-nya perlu disidang.`;
    }
    if (lossStreak >= 2) {
      return `${lossStreak}x kalah beruntun. Zona cupu bukan mampir lagi.`;
    }
    if (closeLosses > 0) {
      return `${closeLosses}x kalah tipis. Hampir menang, hampir bahagia.`;
    }
    return `PTS ${player.totalPoints}, DIFF ${formatDiff(player.pointsDiff)}. Masih dekat zona cupu.`;
  }

  if (bucket === 'big-minus') {
    if (biggestLoss) {
      return `Pernah kena ${biggestLoss.score} vs ${biggestLoss.opponents}. DIFF ${formatDiff(player.pointsDiff)} jadi saksi.`;
    }
    return `DIFF ${formatDiff(player.pointsDiff)}. Kalkulator ikut capek.`;
  }

  if (bucket === 'bye-collector') {
    return `${byes}x sitting. Stamina aman, kontribusi misterius.`;
  }

  if (bucket === 'losing-streak') {
    return `${lossStreak}x kalah beruntun. Ini bukan streak panas, ini alarm.`;
  }

  if (bucket === 'heartbreaker') {
    return `${closeLosses}x kalah tipis. Drama satu poin, ending-nya tetap sakit.`;
  }

  if (pairEvidence && pairEvidence.diff < 0) {
    return `${pairEvidence.together}x bareng ${pairEvidence.partnerName}, DIFF ${formatDiff(pairEvidence.diff)}. Efek duetnya terasa.`;
  }

  if (player.matches > 0 && player.w === player.l) {
    return `Record ${player.w}W-${player.l}L. Netral sampai mencurigakan.`;
  }

  if (player.pointsDiff > 0) {
    return pickSeeded([
      `DIFF ${formatDiff(player.pointsDiff)} tapi tetap bukan headline. Aman dari malu, jauh dari legenda.`,
      `DIFF ${formatDiff(player.pointsDiff)}. Cukup rapi, kurang drama.`,
      `DIFF ${formatDiff(player.pointsDiff)}. Statistik oke, panggung tetap milik yang berantakan.`,
      `DIFF ${formatDiff(player.pointsDiff)} dan posisi aman. Toxic spotlight-nya lepas tipis.`,
    ], `${player.id}:positive-mid:${player.pointsDiff}`);
  }

  return pickSeeded([
    `Record ${player.w}W-${player.l}L, DIFF ${formatDiff(player.pointsDiff)}. Cukup buat dibahas sebentar.`,
    `Record ${player.w}W-${player.l}L. Tidak kacau, tidak viral.`,
    `DIFF ${formatDiff(player.pointsDiff)}. Masih aman dari seremoni utama.`,
  ], `${player.id}:fallback:${player.w}:${player.l}:${player.pointsDiff}`);
};

const buildHeroEvidenceRoast = ({
  player,
  biggestLoss,
  lossStreak,
}: {
  player?: StandingsPlayer;
  biggestLoss?: LossEvidence;
  lossStreak: number;
}) => {
  if (!player) return '';
  if (biggestLoss && biggestLoss.margin >= 4) {
    return `Kalah terbesar ${biggestLoss.score} vs ${biggestLoss.opponents}. Cupu D'Or tidak datang tanpa bukti.`;
  }
  if (lossStreak >= 2) {
    return `${lossStreak} kekalahan beruntun. Bukan rumor, scoreboard yang bicara.`;
  }
  if (player.l > 0) {
    return `${player.l} kalah dari ${player.matches} match. Takhta bawahnya valid.`;
  }
  return `DIFF ${formatDiff(player.pointsDiff)}. Statistiknya sudah cukup untuk seremoni.`;
};

export const buildToxicStandings = ({
  tournament,
  sortedPlayers,
  hasCountableScore,
  isEnded,
  toxicCopyConfig,
}: {
  tournament: Tournament | TournamentHistory;
  sortedPlayers: StandingsPlayer[];
  hasCountableScore: boolean;
  isEnded: boolean;
  toxicCopyConfig?: ToxicCopyConfig | null;
}): ToxicStandingsData => {
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : [];
  const seed = getTournamentSeed(tournament);
  const toxicIntensity = normalizeToxicIntensity(tournament.toxicIntensity);
  const copyConfig = resolveToxicCopyConfig(toxicCopyConfig);
  const emptyData: ToxicStandingsData = {
    isEmpty: true,
    isPeacefulTie: false,
    rows: [],
    heroPlayers: [],
    heroTitle: 'Belum ada korban',
    heroStats: [],
    heroRoast: copyConfig.emptyRoasts[toxicIntensity],
    awardCards: [],
    tickerMessage: '',
    sortLabel: copyConfig.sortLabel,
  };

  if (!hasCountableScore || sortedPlayers.length === 0) return emptyData;

  const byId = new Map(sortedPlayers.map((player) => [player.id, player]));
  // Mode fixed: baris = tim. Kejadian di lapangan bisa tercatat atas nama
  // anggota mana pun (termasuk anchor lama sebelum swap), jadi setiap id
  // anggota dipetakan ke id baris timnya dan di-dedupe per sisi match agar
  // satu tim tidak dihitung dua kali.
  const rowIdByMemberId = new Map<string, string>();
  sortedPlayers.forEach((player) => {
    rowIdByMemberId.set(player.id, player.id);
    if (player.isTeamRow && player.partnerId) {
      rowIdByMemberId.set(player.partnerId, player.id);
    }
  });
  const resolveRowId = (playerId: string) => rowIdByMemberId.get(playerId);
  const resolveUniqueRowIds = (players: Array<{ id: string }>) => {
    const rowIds = new Set<string>();
    players.forEach((player) => {
      const rowId = resolveRowId(player.id);
      if (rowId) rowIds.add(rowId);
    });
    return [...rowIds];
  };
  const byesByPlayer = new Map<string, number>();
  const closeLossesByPlayer = new Map<string, number>();
  const biggestLossByPlayer = new Map<string, number>();
  const biggestLossEvidenceByPlayer = new Map<string, LossEvidence>();
  const countableAppearancesByPlayer = new Map<string, number>();
  const currentLossStreakByPlayer = new Map<string, number>();
  const maxLossStreakByPlayer = new Map<string, number>();
  const pairStatsByKey = new Map<string, PairStats>();

  sortedPlayers.forEach((player) => {
    byesByPlayer.set(player.id, 0);
    closeLossesByPlayer.set(player.id, 0);
    biggestLossByPlayer.set(player.id, 0);
    countableAppearancesByPlayer.set(player.id, 0);
    currentLossStreakByPlayer.set(player.id, 0);
    maxLossStreakByPlayer.set(player.id, 0);
  });

  const sortedRounds = [...rounds].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  let latestProgressRound: Round | null = null;
  sortedRounds.forEach((round) => {
    resolveUniqueRowIds(round.playersBye || []).forEach((rowId) => {
      byesByPlayer.set(rowId, (byesByPlayer.get(rowId) || 0) + 1);
    });

    const hasRoundProgress = (round.matches || []).some(hasMatchScoreProgress);
    if (hasRoundProgress) latestProgressRound = round;

    (round.matches || []).forEach((match) => {
      if (!hasMatchScoreProgress(match)) return;
      const scoreA = Number(match.teamA?.score || 0);
      const scoreB = Number(match.teamB?.score || 0);
      const diff = scoreA - scoreB;
      const teamAPlayers = match.teamA?.players || [];
      const teamBPlayers = match.teamB?.players || [];
      const teamARowIds = resolveUniqueRowIds(teamAPlayers);
      const teamBRowIds = resolveUniqueRowIds(teamBPlayers);
      const registerTeamPairs = (rowIds: string[], teamDiff: number) => {
        for (let outerIndex = 0; outerIndex < rowIds.length; outerIndex += 1) {
          for (let innerIndex = outerIndex + 1; innerIndex < rowIds.length; innerIndex += 1) {
            const rowIdA = rowIds[outerIndex];
            const rowIdB = rowIds[innerIndex];
            const key = getPairKey(rowIdA, rowIdB);
            const sortedIds = [rowIdA, rowIdB].sort() as [string, string];
            const existing = pairStatsByKey.get(key) || {
              playerIds: sortedIds,
              together: 0,
              losses: 0,
              diff: 0,
            };
            existing.together += 1;
            if (match.status === 'completed') {
              existing.diff += teamDiff;
              if (teamDiff < 0) existing.losses += 1;
            }
            pairStatsByKey.set(key, existing);
          }
        }
      };

      registerTeamPairs(teamARowIds, diff);
      registerTeamPairs(teamBRowIds, -diff);

      [...teamARowIds, ...teamBRowIds].forEach((rowId) => {
        countableAppearancesByPlayer.set(rowId, (countableAppearancesByPlayer.get(rowId) || 0) + 1);
      });

      if (diff === 0) {
        if (match.status === 'completed') {
          [...teamARowIds, ...teamBRowIds].forEach((rowId) => {
            currentLossStreakByPlayer.set(rowId, 0);
          });
        }
        return;
      }

      const losingRowIds = diff > 0 ? teamBRowIds : teamARowIds;
      const winningRowIds = diff > 0 ? teamARowIds : teamBRowIds;
      const winningPlayers = diff > 0 ? teamAPlayers : teamBPlayers;
      const margin = Math.abs(diff);
      losingRowIds.forEach((rowId) => {
        if (margin <= 2) {
          closeLossesByPlayer.set(rowId, (closeLossesByPlayer.get(rowId) || 0) + 1);
        }
        biggestLossByPlayer.set(rowId, Math.max(biggestLossByPlayer.get(rowId) || 0, margin));
        const existingLossEvidence = biggestLossEvidenceByPlayer.get(rowId);
        if (!existingLossEvidence || margin > existingLossEvidence.margin) {
          const scoreFor = diff > 0 ? scoreB : scoreA;
          const scoreAgainst = diff > 0 ? scoreA : scoreB;
          biggestLossEvidenceByPlayer.set(rowId, {
            roundId: round.id,
            score: `${scoreFor}-${scoreAgainst}`,
            margin,
            opponents: formatShortPlayerNames(winningPlayers),
          });
        }
        if (match.status === 'completed') {
          const nextStreak = (currentLossStreakByPlayer.get(rowId) || 0) + 1;
          currentLossStreakByPlayer.set(rowId, nextStreak);
          maxLossStreakByPlayer.set(rowId, Math.max(maxLossStreakByPlayer.get(rowId) || 0, nextStreak));
        }
      });
      if (match.status === 'completed') {
        winningRowIds.forEach((rowId) => {
          currentLossStreakByPlayer.set(rowId, 0);
        });
      }
    });
  });

  const firstPlayer = sortedPlayers[0];
  const lastPlayer = sortedPlayers[sortedPlayers.length - 1];
  const bottomPlayers = lastPlayer
    ? sortedPlayers.filter((player) => sameStandingValue(player, lastPlayer))
    : [];
  const bottomIds = new Set(bottomPlayers.map((player) => player.id));
  const isPeacefulTie = sortedPlayers.length > 1 && sortedPlayers.every((player) => (
    firstPlayer && sameStandingValue(player, firstPlayer)
  ));
  const reversedPlayers = [...sortedPlayers].reverse();
  const normalRankById = new Map(sortedPlayers.map((player, index) => [player.id, index + 1]));
  const nonBottomReversedPlayers = reversedPlayers.filter((player) => !bottomIds.has(player.id));
  const nearBottomIds = new Set(nonBottomReversedPlayers.slice(0, 2).map((player) => player.id));
  const championId = firstPlayer?.id || '';

  const awardsByPlayerId = new Map<string, ToxicAward>();
  let duoPetakaAwardCard: ToxicAwardCard | null = null;
  const assignAward = (player: StandingsPlayer | undefined, award: ToxicAward) => {
    if (!player || awardsByPlayerId.has(player.id)) return;
    awardsByPlayerId.set(player.id, award);
  };
  const pickCandidate = (players: StandingsPlayer[]) => (
    [...players].sort(compareAwardTie)[0]
  );

  if (!isPeacefulTie) {
    bottomPlayers.forEach((player) => {
      assignAward(player, createAward(copyConfig, 'king-of-cupu', `${formatRecord(player)}. Tahta terbawah resmi.`));
    });
    assignAward(nonBottomReversedPlayers[0], createAward(copyConfig, 'runner-up-cupu', 'Hampir jadi raja, kurang turun sedikit.'));

    const byeValues = sortedPlayers.map((player) => byesByPlayer.get(player.id) || 0);
    const medianBye = median(byeValues);
    const maxBye = Math.max(0, ...byeValues);
    if (maxBye >= MIN_BYE_AWARD && maxBye > medianBye) {
      const candidates = sortedPlayers.filter((player) => (byesByPlayer.get(player.id) || 0) === maxBye);
      assignAward(pickCandidate(candidates), createAward(copyConfig, 'sultan-of-bye', `${maxBye}x duduk manis di pinggir lapangan.`));
    }

    const minDiff = Math.min(...sortedPlayers.map((player) => player.pointsDiff));
    if (minDiff < 0) {
      const candidates = sortedPlayers.filter((player) => player.pointsDiff === minDiff);
      assignAward(pickCandidate(candidates), createAward(copyConfig, 'tukang-nyumbang-poin', `DIFF ${formatDiff(minDiff)}. Paling ikhlas sedekah poin.`));
    }

    const maxCloseLoss = Math.max(0, ...sortedPlayers.map((player) => closeLossesByPlayer.get(player.id) || 0));
    if (maxCloseLoss >= MIN_CLOSE_LOSS_AWARD) {
      const candidates = sortedPlayers.filter((player) => (closeLossesByPlayer.get(player.id) || 0) === maxCloseLoss);
      assignAward(pickCandidate(candidates), createAward(copyConfig, 'spesialis-kalah-tipis', `${maxCloseLoss}x kalah selisih 1-2 poin.`));
    }

    // Mode fix partner: duo-petaka di-skip — pasangan terburuk = tim terbawah,
    // yang kedua anggotanya sudah dapat king-of-cupu (stats mereka identik).
    const duoPetakaCandidate = isFixedPartnerTournament(tournament) ? undefined : Array.from(pairStatsByKey.values())
      .filter((pair) => pair.together >= MIN_DUO_PETAKA_MATCHES && (pair.losses > 0 || pair.diff < 0))
      .sort((a, b) => (
        b.losses - a.losses ||
        a.diff - b.diff ||
        b.together - a.together ||
        a.playerIds.join('::').localeCompare(b.playerIds.join('::'), 'id-ID')
      ))[0];
    if (duoPetakaCandidate) {
      const pairPlayers = duoPetakaCandidate.playerIds
        .map((playerId) => byId.get(playerId))
        .filter((player): player is StandingsPlayer => Boolean(player))
        .sort((a, b) => (
          (normalRankById.get(b.id) || 0) - (normalRankById.get(a.id) || 0) ||
          a.name.localeCompare(b.name, 'id-ID')
        ));
      const [primaryPlayer, secondaryPlayer] = pairPlayers;
      if (primaryPlayer && secondaryPlayer) {
        const lossLabel = duoPetakaCandidate.losses > 0 ? `${duoPetakaCandidate.losses}x kalah` : 'belum menang besar';
        duoPetakaAwardCard = {
          ...createAward(copyConfig, 'duo-petaka', `${duoPetakaCandidate.together}x main bareng, ${lossLabel}, DIFF ${formatDiff(duoPetakaCandidate.diff)}.`),
          player: toHeroPlayer(primaryPlayer),
          secondaryPlayer: toHeroPlayer(secondaryPlayer),
        };
      }
    }

    const maxBigLoss = Math.max(0, ...sortedPlayers.map((player) => biggestLossByPlayer.get(player.id) || 0));
    if (maxBigLoss > 0) {
      const candidates = sortedPlayers.filter((player) => (biggestLossByPlayer.get(player.id) || 0) === maxBigLoss);
      assignAward(pickCandidate(candidates), createAward(copyConfig, 'bulldozer-korban', `Pernah kena margin ${maxBigLoss}. Sekali, tapi membekas.`));
    }

    assignAward(firstPlayer, createAward(copyConfig, 'sweaty-tryhard', 'Serius amat bro, ini fun match.'));

    const availableForMid = sortedPlayers.filter((player) => (
      !awardsByPlayerId.has(player.id) &&
      (player.matches > 0 || (countableAppearancesByPlayer.get(player.id) || 0) > 0)
    ));
    const balancedPlayers = availableForMid.filter((player) => player.w === player.l);
    const middleIndex = (sortedPlayers.length - 1) / 2;
    const midCandidate = (
      balancedPlayers.length > 0
        ? pickCandidate(balancedPlayers)
        : [...availableForMid].sort((a, b) => (
            Math.abs((normalRankById.get(a.id) || 1) - middleIndex) -
            Math.abs((normalRankById.get(b.id) || 1) - middleIndex) ||
            compareAwardTie(a, b)
          ))[0]
    );
    assignAward(midCandidate, createAward(copyConfig, 'mr-konsisten', 'Mid-table dari awal sampai akhir.'));
  }

  const getBucket = (player: StandingsPlayer): ToxicBucket => {
    const hasPlayerData = player.matches > 0 || (countableAppearancesByPlayer.get(player.id) || 0) > 0;
    if (!hasPlayerData) return 'no-data';
    if (player.id === championId) return 'champion';
    if (bottomIds.has(player.id)) return 'last-place';
    if (nearBottomIds.has(player.id)) return 'near-bottom';
    if (player.pointsDiff <= BIG_MINUS_THRESHOLD) return 'big-minus';
    if ((byesByPlayer.get(player.id) || 0) >= MIN_BYE_AWARD) return 'bye-collector';
    if ((maxLossStreakByPlayer.get(player.id) || 0) >= MIN_LOSING_STREAK) return 'losing-streak';
    if ((closeLossesByPlayer.get(player.id) || 0) >= MIN_CLOSE_LOSS_AWARD) return 'heartbreaker';
    return 'mid-table';
  };

  const pairEvidenceByPlayer = new Map<string, PairEvidence>();
  Array.from(pairStatsByKey.values())
    .filter((pair) => pair.together >= MIN_DUO_PETAKA_MATCHES && (pair.losses > 0 || pair.diff < 0))
    .forEach((pair) => {
      pair.playerIds.forEach((playerId) => {
        const partnerId = pair.playerIds.find((candidateId) => candidateId !== playerId) || '';
        const partner = byId.get(partnerId);
        if (!partner) return;
        const nextEvidence: PairEvidence = {
          partnerName: getShortPlayerName(partner.name),
          together: pair.together,
          losses: pair.losses,
          diff: pair.diff,
        };
        const existing = pairEvidenceByPlayer.get(playerId);
        if (
          !existing ||
          nextEvidence.losses > existing.losses ||
          (nextEvidence.losses === existing.losses && nextEvidence.diff < existing.diff) ||
          (nextEvidence.losses === existing.losses && nextEvidence.diff === existing.diff && nextEvidence.together > existing.together)
        ) {
          pairEvidenceByPlayer.set(playerId, nextEvidence);
        }
      });
    });

  const rowsRoastRegistry = new Set<string>();
  const rows: ToxicStandingRow[] = reversedPlayers.map((player, index) => {
    const bucket = getBucket(player);
    const fallbackRoast = pickUniqueSeeded(copyConfig.rowRoasts[toxicIntensity][bucket], `${seed}:${player.id}:${bucket}:${toxicIntensity}`, rowsRoastRegistry);
    const evidenceRoast = hasCustomRowRoasts(copyConfig, toxicIntensity, bucket)
      ? ''
      : buildEvidenceRoast({
          player,
          bucket,
          byes: byesByPlayer.get(player.id) || 0,
          closeLosses: closeLossesByPlayer.get(player.id) || 0,
          biggestLoss: biggestLossEvidenceByPlayer.get(player.id),
          lossStreak: maxLossStreakByPlayer.get(player.id) || 0,
          pairEvidence: pairEvidenceByPlayer.get(player.id),
        });
    return {
      ...player,
      toxicRank: index + 1,
      normalRank: normalRankById.get(player.id) || index + 1,
      bucket,
      roast: evidenceRoast || fallbackRoast,
      award: awardsByPlayerId.get(player.id),
      isChampion: player.id === championId,
    };
  });

  const heroPlayers = bottomPlayers.slice(0, 2).map(toHeroPlayer);
  const heroDiffValue = bottomPlayers.length > 1
    ? bottomPlayers.map((player) => formatDiff(player.pointsDiff)).join(' / ')
    : formatDiff(lastPlayer?.pointsDiff || 0);
  const heroStats: ToxicHeroStat[] = bottomPlayers.length > 1
    ? [
        { label: 'Record', value: lastPlayer ? formatRecord(lastPlayer) : '-', tone: 'default' },
        { label: 'Diff', value: heroDiffValue, tone: 'danger' },
        { label: 'Verdict', value: 'Seri cupu', tone: 'default' },
      ]
    : [
        { label: 'Record', value: lastPlayer ? formatRecord(lastPlayer) : '-', tone: 'default' },
        { label: 'Diff', value: heroDiffValue, tone: 'danger' },
        { label: 'Pts', value: String(lastPlayer?.totalPoints || 0), tone: 'default' },
      ];
  const awardCards: ToxicAwardCard[] = [];
  Array.from(awardsByPlayerId.entries())
    .filter(([, award]) => award.id !== 'king-of-cupu')
    .forEach(([playerId, award]) => {
      const player = byId.get(playerId);
      if (!player) return;
      // toHeroPlayer membawa data partner → kartu award & slide Rewind bisa
      // menampilkan dua wajah untuk baris tim (mode fixed).
      awardCards.push({
        ...award,
        player: toHeroPlayer(player),
      });
    });
  if (duoPetakaAwardCard) awardCards.unshift(duoPetakaAwardCard);

  const latestRoundMatches = latestProgressRound?.matches || [];
  const latestBigLoss = latestRoundMatches.reduce<{
    loserName: string;
    score: string;
    margin: number;
  } | null>((best, match) => {
    if (!hasMatchScoreProgress(match)) return best;
    const scoreA = Number(match.teamA?.score || 0);
    const scoreB = Number(match.teamB?.score || 0);
    const margin = Math.abs(scoreA - scoreB);
    if (margin < 4 || (best && best.margin >= margin)) return best;
    const losingPlayers = scoreA > scoreB ? match.teamB.players : match.teamA.players;
    const loserName = losingPlayers[0]?.name || 'Seseorang';
    return { loserName, score: `${scoreA}-${scoreB}`, margin };
  }, null);
  const tickerMessage = isEnded
    ? ''
    : latestBigLoss
      ? `${latestBigLoss.loserName} kena ${latestBigLoss.score}. Semangat ya bro.`
      : (bottomPlayers[0] ? `${bottomPlayers[0].name} resmi masuk zona cupu.` : '');

  if (isPeacefulTie) {
    return {
      isEmpty: false,
      isPeacefulTie,
      rows,
      heroPlayers: [],
      heroTitle: 'Match paling damai sedunia',
      heroStats: [],
      heroRoast: copyConfig.peacefulRoasts[toxicIntensity],
      awardCards: [],
      tickerMessage,
      sortLabel: copyConfig.sortLabel,
    };
  }

  return {
    isEmpty: false,
    isPeacefulTie,
    rows,
    heroPlayers,
    heroTitle: bottomPlayers.length > 1 ? 'Co-King of Cupu' : 'King of Cupu',
    heroStats,
    heroRoast: bottomPlayers.length > 1
      ? copyConfig.coKingRoasts[toxicIntensity]
      : (
          hasCustomHeroRoasts(copyConfig, toxicIntensity)
            ? pickSeeded(copyConfig.heroRoasts[toxicIntensity], `${seed}:${lastPlayer?.id || 'hero'}:hero:${toxicIntensity}`)
            : buildHeroEvidenceRoast({
                player: lastPlayer,
                biggestLoss: lastPlayer ? biggestLossEvidenceByPlayer.get(lastPlayer.id) : undefined,
                lossStreak: lastPlayer ? maxLossStreakByPlayer.get(lastPlayer.id) || 0 : 0,
              }) || pickSeeded(copyConfig.heroRoasts[toxicIntensity], `${seed}:${lastPlayer?.id || 'hero'}:hero:${toxicIntensity}`)
        ),
    awardCards,
    tickerMessage,
    sortLabel: copyConfig.sortLabel,
  };
};
