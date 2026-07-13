import type { Match, MatchPlayMode, ScoringType, Tournament } from '../../types';

// Mesin skor tenis untuk format Match Play. Murni (tanpa side effect) supaya
// gampang dites dan dipakai ulang: UI/mutasi hanya memanggil fungsi di sini.
//
// Model data pada Match (types.ts):
// - pointsA/pointsB : poin game berjalan ('0' | '15' | '30' | '40' | 'Ad')
// - teamX.sets[i]   : game yang dimenangkan tim X di set ke-i
// - currentSet      : indeks set yang sedang dimainkan
// - teamX.score     : TOTAL game semua set (dipakai klasemen & history)

export type TennisPointLabel = '0' | '15' | '30' | '40' | 'Ad';

export type MatchPlayConfig = {
  mode: MatchPlayMode;
  gamesTarget: number; // mode race: game yang harus direbut untuk menang
  bestOfSets: number;  // mode bestOf: 1 | 3 | 5
  scoringType: ScoringType;
};

export const MATCH_PLAY_DEFAULT_GAMES_TARGET = 6;
export const MATCH_PLAY_DEFAULT_BEST_OF_SETS = 3;
export const MATCH_PLAY_GAMES_TARGET_MIN = 1;
export const MATCH_PLAY_GAMES_TARGET_MAX = 12;
export const MATCH_PLAY_BEST_OF_OPTIONS = [1, 3, 5] as const;

const POINT_LADDER: TennisPointLabel[] = ['0', '15', '30', '40'];

const normalizePointLabel = (value: string | undefined): TennisPointLabel => {
  if (value === '15' || value === '30' || value === '40' || value === 'Ad') return value;
  return '0';
};

export const normalizeMatchPlayGamesTarget = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return MATCH_PLAY_DEFAULT_GAMES_TARGET;
  return Math.min(MATCH_PLAY_GAMES_TARGET_MAX, Math.max(MATCH_PLAY_GAMES_TARGET_MIN, parsed));
};

export const normalizeMatchPlayBestOfSets = (value: unknown): number => {
  const parsed = Math.floor(Number(value));
  return (MATCH_PLAY_BEST_OF_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : MATCH_PLAY_DEFAULT_BEST_OF_SETS;
};

export const getMatchPlayConfig = (
  tournament: Pick<Tournament, 'matchPlayMode' | 'matchPlayGamesTarget' | 'matchPlayBestOfSets' | 'scoringType'>
): MatchPlayConfig => ({
  mode: tournament.matchPlayMode === 'bestOf' ? 'bestOf' : 'race',
  gamesTarget: normalizeMatchPlayGamesTarget(tournament.matchPlayGamesTarget ?? MATCH_PLAY_DEFAULT_GAMES_TARGET),
  bestOfSets: normalizeMatchPlayBestOfSets(tournament.matchPlayBestOfSets ?? MATCH_PLAY_DEFAULT_BEST_OF_SETS),
  scoringType: tournament.scoringType === 'Advantage' ? 'Advantage' : 'Golden Point',
});

// Label ringkas untuk chip/summary, mis. "Race to 6 games" / "Best of 3 sets".
export const describeMatchPlayMode = (config: MatchPlayConfig): string => (
  config.mode === 'bestOf'
    ? `Best of ${config.bestOfSets} set${config.bestOfSets > 1 ? 's' : ''}`
    : `Race to ${config.gamesTarget} game${config.gamesTarget > 1 ? 's' : ''}`
);

export type TennisScoreState = {
  pointsA: TennisPointLabel;
  pointsB: TennisPointLabel;
  gamesA: number[]; // game per set
  gamesB: number[];
  currentSet: number;
};

const sanitizeGames = (games: unknown, length: number): number[] => {
  const list = Array.isArray(games) ? games : [];
  const result: number[] = [];
  for (let i = 0; i < length; i += 1) {
    const value = Math.floor(Number(list[i]));
    result.push(Number.isFinite(value) && value > 0 ? value : 0);
  }
  return result;
};

// Baca state tenis dari Match, toleran terhadap data lama (sets/currentSet
// absen atau tidak konsisten panjangnya).
export const readTennisState = (match: Match): TennisScoreState => {
  const rawCurrentSet = Math.floor(Number(match.currentSet));
  const setCountHint = Math.max(
    Array.isArray(match.teamA.sets) ? match.teamA.sets.length : 0,
    Array.isArray(match.teamB.sets) ? match.teamB.sets.length : 0,
    Number.isFinite(rawCurrentSet) && rawCurrentSet >= 0 ? rawCurrentSet + 1 : 0,
    1
  );
  const gamesA = sanitizeGames(match.teamA.sets, setCountHint);
  const gamesB = sanitizeGames(match.teamB.sets, setCountHint);

  // Data lama (sebelum engine ini): score pernah diisi manual sebagai "game"
  // lewat stepper angka tanpa pernah menulis sets[]. Selamatkan ke set pertama
  // supaya progres lama tidak hilang.
  const scoreA = Math.max(0, Math.floor(Number(match.teamA.score) || 0));
  const scoreB = Math.max(0, Math.floor(Number(match.teamB.score) || 0));
  const sumA = gamesA.reduce((sum, value) => sum + value, 0);
  const sumB = gamesB.reduce((sum, value) => sum + value, 0);
  if (sumA === 0 && sumB === 0 && (scoreA > 0 || scoreB > 0)) {
    gamesA[0] = scoreA;
    gamesB[0] = scoreB;
  }

  return {
    pointsA: normalizePointLabel(match.pointsA),
    pointsB: normalizePointLabel(match.pointsB),
    gamesA,
    gamesB,
    currentSet: Math.min(setCountHint - 1, Math.max(0, Number.isFinite(rawCurrentSet) ? rawCurrentSet : 0)),
  };
};

export const sumGames = (games: number[]): number => games.reduce((sum, value) => sum + value, 0);

// Aturan set (mode bestOf): menang di 6 game dengan selisih >= 2; 5-5 lanjut
// sampai 7-5; 6-6 dimainkan satu game penentu (7-6). Klausa >=7 tetap wajib
// unggul — data liar (rescue skor lama / korup) seperti 15-21 tidak boleh
// memberi set ke tim yang justru tertinggal.
export const getSetWinner = (gamesFor: number, gamesAgainst: number): 'for' | 'against' | null => {
  if ((gamesFor >= 6 && gamesFor - gamesAgainst >= 2) || (gamesFor >= 7 && gamesFor > gamesAgainst)) return 'for';
  if ((gamesAgainst >= 6 && gamesAgainst - gamesFor >= 2) || (gamesAgainst >= 7 && gamesAgainst > gamesFor)) return 'against';
  return null;
};

export const getSetsWon = (state: TennisScoreState): { A: number; B: number } => {
  let wonA = 0;
  let wonB = 0;
  state.gamesA.forEach((gamesA, index) => {
    const winner = getSetWinner(gamesA, state.gamesB[index] || 0);
    if (winner === 'for') wonA += 1;
    else if (winner === 'against') wonB += 1;
  });
  return { A: wonA, B: wonB };
};

export const getMatchPlayWinner = (
  state: TennisScoreState,
  config: MatchPlayConfig
): 'A' | 'B' | null => {
  if (config.mode === 'race') {
    const totalA = sumGames(state.gamesA);
    const totalB = sumGames(state.gamesB);
    if (totalA >= config.gamesTarget) return 'A';
    if (totalB >= config.gamesTarget) return 'B';
    return null;
  }
  const setsNeeded = Math.floor(config.bestOfSets / 2) + 1;
  const { A, B } = getSetsWon(state);
  if (A >= setsNeeded) return 'A';
  if (B >= setsNeeded) return 'B';
  return null;
};

export type TennisPointOutcome = {
  state: TennisScoreState;
  gameWon: 'A' | 'B' | null;
  setWon: 'A' | 'B' | null;
  matchWon: 'A' | 'B' | null;
};

// Satu poin dimenangkan `team`. Menangani deuce sesuai scoringType, lalu
// kemenangan game -> set (bestOf) -> match (race target / mayoritas set).
export const applyTennisPointWon = (
  state: TennisScoreState,
  team: 'A' | 'B',
  config: MatchPlayConfig
): TennisPointOutcome => {
  if (getMatchPlayWinner(state, config)) {
    return { state, gameWon: null, setWon: null, matchWon: getMatchPlayWinner(state, config) };
  }

  const winnerPoints = team === 'A' ? state.pointsA : state.pointsB;
  const loserPoints = team === 'A' ? state.pointsB : state.pointsA;

  let nextWinnerPoints: TennisPointLabel = winnerPoints;
  let nextLoserPoints: TennisPointLabel = loserPoints;
  let gameWon = false;

  if (winnerPoints === 'Ad') {
    gameWon = true;
  } else if (loserPoints === 'Ad') {
    // Lawan kehilangan advantage: kembali ke deuce.
    nextLoserPoints = '40';
  } else if (winnerPoints === '40') {
    if (loserPoints === '40') {
      // Deuce: Golden Point langsung game, Advantage naik ke Ad dulu.
      if (config.scoringType === 'Golden Point') gameWon = true;
      else nextWinnerPoints = 'Ad';
    } else {
      gameWon = true;
    }
  } else {
    nextWinnerPoints = POINT_LADDER[POINT_LADDER.indexOf(winnerPoints) + 1];
  }

  let next: TennisScoreState = {
    ...state,
    gamesA: [...state.gamesA],
    gamesB: [...state.gamesB],
    pointsA: team === 'A' ? nextWinnerPoints : nextLoserPoints,
    pointsB: team === 'B' ? nextWinnerPoints : nextLoserPoints,
  };

  if (!gameWon) {
    return { state: next, gameWon: null, setWon: null, matchWon: null };
  }

  const winnerGames = team === 'A' ? next.gamesA : next.gamesB;
  winnerGames[next.currentSet] = (winnerGames[next.currentSet] || 0) + 1;
  next.pointsA = '0';
  next.pointsB = '0';

  let setWon: 'A' | 'B' | null = null;
  if (config.mode === 'bestOf') {
    const setWinner = getSetWinner(
      next.gamesA[next.currentSet] || 0,
      next.gamesB[next.currentSet] || 0
    );
    if (setWinner) setWon = setWinner === 'for' ? 'A' : 'B';
  }

  const matchWon = getMatchPlayWinner(next, config);

  // Set selesai tapi match belum: buka set baru 0-0.
  if (setWon && !matchWon) {
    next = {
      ...next,
      gamesA: [...next.gamesA, 0],
      gamesB: [...next.gamesB, 0],
      currentSet: next.currentSet + 1,
    };
  }

  return { state: next, gameWon: team, setWon, matchWon };
};

// Koreksi salah ketuk: mundurkan satu tingkat poin `team` di game berjalan.
// Tidak melintasi batas game/set (itu butuh riwayat penuh).
export const applyTennisPointUndo = (
  state: TennisScoreState,
  team: 'A' | 'B'
): TennisScoreState => {
  const points = team === 'A' ? state.pointsA : state.pointsB;
  let nextPoints: TennisPointLabel = points;
  if (points === 'Ad') nextPoints = '40';
  else if (points !== '0') nextPoints = POINT_LADDER[POINT_LADDER.indexOf(points) - 1];
  if (nextPoints === points) return state;
  return {
    ...state,
    pointsA: team === 'A' ? nextPoints : state.pointsA,
    pointsB: team === 'B' ? nextPoints : state.pointsB,
  };
};

// Terapkan state tenis kembali ke Match. score adalah angka yang dibaca SEMUA
// konsumen hasil (klasemen, history, rewind, Cloud Function MMR) lewat
// perbandingan langsung — jadi harus mengikuti satuan kemenangan mode ini:
// race = total game, bestOf = jumlah set yang dimenangkan (pemenang set 2-1
// dengan total game lebih sedikit tetap tercatat menang). Detail game per set
// tetap utuh di sets[].
export const applyTennisStateToMatch = (match: Match, state: TennisScoreState, config: MatchPlayConfig): Match => {
  const setsWon = config.mode === 'bestOf' ? getSetsWon(state) : null;
  return {
    ...match,
    pointsA: state.pointsA,
    pointsB: state.pointsB,
    currentSet: state.currentSet,
    teamA: { ...match.teamA, sets: [...state.gamesA], score: setsWon ? setsWon.A : sumGames(state.gamesA) },
    teamB: { ...match.teamB, sets: [...state.gamesB], score: setsWon ? setsWon.B : sumGames(state.gamesB) },
  };
};

// Ada progres skor apa pun pada match Match Play? Melihat game di sets[]
// (score bisa 0 di mode bestOf selama set pertama belum selesai), skor
// tersimpan, dan poin game berjalan.
export const hasTennisProgress = (match: Match): boolean => {
  const gamesRecorded = [...(match.teamA.sets || []), ...(match.teamB.sets || [])]
    .some((games) => Number(games) > 0);
  return (
    gamesRecorded ||
    Number(match.teamA.score || 0) > 0 ||
    Number(match.teamB.score || 0) > 0 ||
    (match.pointsA || '0') !== '0' ||
    (match.pointsB || '0') !== '0'
  );
};

// Scoreline per set utk tampilan, mis. "6-4, 3-2". Mode race cuma satu angka
// gabungan ("5-3").
export const getMatchPlayScoreline = (state: TennisScoreState, config: MatchPlayConfig): string => {
  if (config.mode === 'race') {
    return `${sumGames(state.gamesA)}-${sumGames(state.gamesB)}`;
  }
  return state.gamesA
    .map((gamesA, index) => `${gamesA}-${state.gamesB[index] || 0}`)
    .join(', ');
};
