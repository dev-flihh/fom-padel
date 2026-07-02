import type { Match, Round, Tournament, TournamentHistory } from '../../types';

export type StandingsPlayer = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  matches: number;
  w: number;
  l: number;
  d: number;
  pointsDiff: number;
  totalPoints: number;
};

export type ToxicAwardId =
  | 'king-of-cupu'
  | 'runner-up-cupu'
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

export type ToxicHeroPlayer = Pick<StandingsPlayer, 'id' | 'name' | 'avatar' | 'initials'>;

export type ToxicHeroStat = {
  label: string;
  value: string;
  tone: 'default' | 'danger';
};

export type ToxicAwardCard = ToxicAward & {
  player: ToxicHeroPlayer;
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

const TOXIC_SORT_LABEL = 'L > -DIFF > PTS';
const BIG_MINUS_THRESHOLD = -8;
const MIN_BYE_AWARD = 2;
const MIN_CLOSE_LOSS_AWARD = 2;
const MIN_LOSING_STREAK = 3;

const AWARD_COPY: Record<ToxicAwardId, Omit<ToxicAward, 'note'>> = {
  'king-of-cupu': { id: 'king-of-cupu', label: 'King of Cupu', emoji: '👑', isGold: true },
  'runner-up-cupu': { id: 'runner-up-cupu', label: 'Si Cupu Kedua' },
  'sultan-of-bye': { id: 'sultan-of-bye', label: 'Sultan of Bye' },
  'tukang-nyumbang-poin': { id: 'tukang-nyumbang-poin', label: 'Tukang Nyumbang Poin' },
  'spesialis-kalah-tipis': { id: 'spesialis-kalah-tipis', label: 'Spesialis Kalah Tipis' },
  'bulldozer-korban': { id: 'bulldozer-korban', label: 'Bulldozer Korban' },
  'sweaty-tryhard': { id: 'sweaty-tryhard', label: 'Sweaty Tryhard', emoji: '🏆' },
  'mr-konsisten': { id: 'mr-konsisten', label: 'Mr. Konsisten' },
};

const ROW_ROASTS: Record<ToxicBucket, string[]> = {
  champion: [
    'Menang di fun match. Bangga ya?',
    'Sweaty banget, ini bukan final bro.',
    'Juara, tapi grup bahas yang bawah.',
    'Selamat. Trofinya screenshot.',
  ],
  'last-place': [
    'Datang paling rajin, pulang paling bawah.',
    'Konsisten kalah juga konsisten.',
    'Kasih semangat ke semua lawan.',
    'MVP: Minus Value Player.',
  ],
  'near-bottom': [
    'Sedikit lagi jadi raja cupu.',
    'Aman, masih ada yang lebih bawah.',
    'Zona degradasi Amorim.',
    'Top 3, dari bawah.',
  ],
  'big-minus': [
    'Donatur poin paling dermawan.',
    'DIFF-nya butuh recovery.',
    'Kalkulator capek ngitung minus.',
    'Sedekah poin buat match depan.',
  ],
  'bye-collector': [
    'Jago banget jaga bangku.',
    'Paling bugar pulangnya.',
    'Hadir fisik, bye secara jadwal.',
    'Member VIP area tunggu.',
  ],
  'losing-streak': [
    'Momentum masih dicari.',
    'Streak juga, arahnya kebalik.',
    'Comeback is real. Bukan hari ini.',
    'Sabar, plot twist belum datang.',
  ],
  heartbreaker: [
    'Selalu hampir menang. Hampir.',
    'Kalah tipis, berkali-kali.',
    'Drama satu poin spesialis.',
    'Nyaris menang, nyaris bahagia.',
  ],
  'mid-table': [
    'Standar. Sangat standar.',
    'Aman dari roast, aman dari prestasi.',
    'Filler episode match ini.',
    'Tidak buruk, tidak ikonik.',
  ],
  'no-data': [
    'Masih misteri. Belum ada bukti.',
    'Belum bisa dihina. Sabar.',
    'Data belum cukup buat roasting.',
    'Nunggu bukti di lapangan.',
  ],
};

const HERO_ROASTS = [
  'Ditonton semua orang, dikalahkan semua orang juga.',
  'Bukan kalah, cuma terlalu dermawan ke lawan.',
  'Konsisten itu penting. Konsisten di bawah juga.',
  'MVP: Minus Value Player.',
  'Datang paling rajin, pulang paling bawah.',
];

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

const getTournamentSeed = (tournament: Tournament | TournamentHistory) => (
  String(tournament.id || tournament.startedAt || ('date' in tournament ? new Date(tournament.date).getTime() : '') || tournament.name || 'fom-match')
);

const hasMatchScoreProgress = (match: Match) => {
  const scoreA = Number(match.teamA?.score || 0);
  const scoreB = Number(match.teamB?.score || 0);
  const hasPointScore = (match.pointsA || '0') !== '0' || (match.pointsB || '0') !== '0';
  return match.status === 'completed' || scoreA > 0 || scoreB > 0 || hasPointScore;
};

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

const createAward = (id: ToxicAwardId, note: string): ToxicAward => ({
  ...AWARD_COPY[id],
  note,
});

export const buildToxicStandings = ({
  tournament,
  sortedPlayers,
  hasCountableScore,
  isEnded,
}: {
  tournament: Tournament | TournamentHistory;
  sortedPlayers: StandingsPlayer[];
  hasCountableScore: boolean;
  isEnded: boolean;
}): ToxicStandingsData => {
  const rounds = Array.isArray(tournament.rounds) ? tournament.rounds : [];
  const seed = getTournamentSeed(tournament);
  const emptyData: ToxicStandingsData = {
    isEmpty: true,
    isPeacefulTie: false,
    rows: [],
    heroPlayers: [],
    heroTitle: 'Belum ada korban',
    heroStats: [],
    heroRoast: 'Main dulu, baru kita hina.',
    awardCards: [],
    tickerMessage: '',
    sortLabel: TOXIC_SORT_LABEL,
  };

  if (!hasCountableScore || sortedPlayers.length === 0) return emptyData;

  const byId = new Map(sortedPlayers.map((player) => [player.id, player]));
  const byesByPlayer = new Map<string, number>();
  const closeLossesByPlayer = new Map<string, number>();
  const biggestLossByPlayer = new Map<string, number>();
  const countableAppearancesByPlayer = new Map<string, number>();
  const currentLossStreakByPlayer = new Map<string, number>();
  const maxLossStreakByPlayer = new Map<string, number>();

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
    (round.playersBye || []).forEach((player) => {
      if (!byId.has(player.id)) return;
      byesByPlayer.set(player.id, (byesByPlayer.get(player.id) || 0) + 1);
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

      [...teamAPlayers, ...teamBPlayers].forEach((player) => {
        if (!byId.has(player.id)) return;
        countableAppearancesByPlayer.set(player.id, (countableAppearancesByPlayer.get(player.id) || 0) + 1);
      });

      if (diff === 0) {
        [...teamAPlayers, ...teamBPlayers].forEach((player) => {
          if (!byId.has(player.id) || match.status !== 'completed') return;
          currentLossStreakByPlayer.set(player.id, 0);
        });
        return;
      }

      const losingPlayers = diff > 0 ? teamBPlayers : teamAPlayers;
      const winningPlayers = diff > 0 ? teamAPlayers : teamBPlayers;
      const margin = Math.abs(diff);
      losingPlayers.forEach((player) => {
        if (!byId.has(player.id)) return;
        if (margin <= 2) {
          closeLossesByPlayer.set(player.id, (closeLossesByPlayer.get(player.id) || 0) + 1);
        }
        biggestLossByPlayer.set(player.id, Math.max(biggestLossByPlayer.get(player.id) || 0, margin));
        if (match.status === 'completed') {
          const nextStreak = (currentLossStreakByPlayer.get(player.id) || 0) + 1;
          currentLossStreakByPlayer.set(player.id, nextStreak);
          maxLossStreakByPlayer.set(player.id, Math.max(maxLossStreakByPlayer.get(player.id) || 0, nextStreak));
        }
      });
      winningPlayers.forEach((player) => {
        if (!byId.has(player.id) || match.status !== 'completed') return;
        currentLossStreakByPlayer.set(player.id, 0);
      });
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
  const assignAward = (player: StandingsPlayer | undefined, award: ToxicAward) => {
    if (!player || awardsByPlayerId.has(player.id)) return;
    awardsByPlayerId.set(player.id, award);
  };
  const pickCandidate = (players: StandingsPlayer[]) => (
    [...players].sort(compareAwardTie)[0]
  );

  if (!isPeacefulTie) {
    bottomPlayers.forEach((player) => {
      assignAward(player, createAward('king-of-cupu', `${formatRecord(player)}. Tahta terbawah resmi.`));
    });
    assignAward(nonBottomReversedPlayers[0], createAward('runner-up-cupu', 'Hampir jadi raja, kurang turun sedikit.'));

    const byeValues = sortedPlayers.map((player) => byesByPlayer.get(player.id) || 0);
    const medianBye = median(byeValues);
    const maxBye = Math.max(0, ...byeValues);
    if (maxBye >= MIN_BYE_AWARD && maxBye > medianBye) {
      const candidates = sortedPlayers.filter((player) => (byesByPlayer.get(player.id) || 0) === maxBye);
      assignAward(pickCandidate(candidates), createAward('sultan-of-bye', `${maxBye}x duduk manis di pinggir lapangan.`));
    }

    const minDiff = Math.min(...sortedPlayers.map((player) => player.pointsDiff));
    if (minDiff < 0) {
      const candidates = sortedPlayers.filter((player) => player.pointsDiff === minDiff);
      assignAward(pickCandidate(candidates), createAward('tukang-nyumbang-poin', `DIFF ${formatDiff(minDiff)}. Paling ikhlas sedekah poin.`));
    }

    const maxCloseLoss = Math.max(0, ...sortedPlayers.map((player) => closeLossesByPlayer.get(player.id) || 0));
    if (maxCloseLoss >= MIN_CLOSE_LOSS_AWARD) {
      const candidates = sortedPlayers.filter((player) => (closeLossesByPlayer.get(player.id) || 0) === maxCloseLoss);
      assignAward(pickCandidate(candidates), createAward('spesialis-kalah-tipis', `${maxCloseLoss}x kalah selisih 1-2 poin.`));
    }

    const maxBigLoss = Math.max(0, ...sortedPlayers.map((player) => biggestLossByPlayer.get(player.id) || 0));
    if (maxBigLoss > 0) {
      const candidates = sortedPlayers.filter((player) => (biggestLossByPlayer.get(player.id) || 0) === maxBigLoss);
      assignAward(pickCandidate(candidates), createAward('bulldozer-korban', `Pernah kena margin ${maxBigLoss}. Sekali, tapi membekas.`));
    }

    assignAward(firstPlayer, createAward('sweaty-tryhard', 'Serius amat bro, ini fun match.'));

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
    assignAward(midCandidate, createAward('mr-konsisten', 'Mid-table dari awal sampai akhir.'));
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

  const rows: ToxicStandingRow[] = reversedPlayers.map((player, index) => {
    const bucket = getBucket(player);
    return {
      ...player,
      toxicRank: index + 1,
      normalRank: normalRankById.get(player.id) || index + 1,
      bucket,
      roast: pickSeeded(ROW_ROASTS[bucket], `${seed}:${player.id}:${bucket}`),
      award: awardsByPlayerId.get(player.id),
      isChampion: player.id === championId,
    };
  });

  const heroPlayers = bottomPlayers.slice(0, 2).map((player) => ({
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    initials: player.initials,
  }));
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
      awardCards.push({
        ...award,
        player: {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          initials: player.initials,
        },
      });
    });

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
      heroRoast: 'Gak ada yang bisa dihina. Untuk sekarang.',
      awardCards: [],
      tickerMessage,
      sortLabel: TOXIC_SORT_LABEL,
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
      ? 'Dua orang, satu takhta. Sama-sama layak.'
      : pickSeeded(HERO_ROASTS, `${seed}:${lastPlayer?.id || 'hero'}:hero`),
    awardCards,
    tickerMessage,
    sortLabel: TOXIC_SORT_LABEL,
  };
};
