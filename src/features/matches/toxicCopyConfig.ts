import type { ToxicIntensity } from '../../types';
import type { ToxicAwardId, ToxicBucket } from './toxicStandings';

type ToxicCopyInput = {
  version?: number;
  sortLabel?: string;
  awards?: Partial<Record<ToxicAwardId, {
    label?: string;
    emoji?: string;
    isGold?: boolean;
  }>>;
  rowRoasts?: Partial<Record<ToxicIntensity, Partial<Record<ToxicBucket, string[]>>>>;
  heroRoasts?: Partial<Record<ToxicIntensity, string[]>>;
  glowDownRoasts?: Partial<Record<ToxicIntensity, string[]>>;
  coKingRoasts?: Partial<Record<ToxicIntensity, string>>;
  emptyRoasts?: Partial<Record<ToxicIntensity, string>>;
  peacefulRoasts?: Partial<Record<ToxicIntensity, string>>;
};

export type ToxicCopyConfig = {
  version: number;
  sortLabel: string;
  awards: Record<ToxicAwardId, {
    label: string;
    emoji?: string;
    isGold?: boolean;
  }>;
  rowRoasts: Record<ToxicIntensity, Record<ToxicBucket, string[]>>;
  heroRoasts: Record<ToxicIntensity, string[]>;
  glowDownRoasts: Record<ToxicIntensity, string[]>;
  coKingRoasts: Record<ToxicIntensity, string>;
  emptyRoasts: Record<ToxicIntensity, string>;
  peacefulRoasts: Record<ToxicIntensity, string>;
};

const TOXIC_INTENSITIES: ToxicIntensity[] = ['mild', 'medium', 'savage'];
const TOXIC_BUCKETS: ToxicBucket[] = [
  'champion',
  'last-place',
  'near-bottom',
  'big-minus',
  'bye-collector',
  'losing-streak',
  'heartbreaker',
  'mid-table',
  'no-data',
];
const TOXIC_AWARD_IDS: ToxicAwardId[] = [
  'king-of-cupu',
  'runner-up-cupu',
  'duo-petaka',
  'glow-down',
  'sultan-of-bye',
  'tukang-nyumbang-poin',
  'spesialis-kalah-tipis',
  'bulldozer-korban',
  'sweaty-tryhard',
  'mr-konsisten',
];

const cleanString = (value: unknown) => (
  typeof value === 'string' ? value.trim() : ''
);

const cleanStringList = (value: unknown) => (
  Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : []
);

export const DEFAULT_TOXIC_COPY_CONFIG: ToxicCopyConfig = {
  version: 1,
  sortLabel: 'OFFICIAL UPSIDE DOWN',
  awards: {
    'king-of-cupu': { label: 'King of Cupu', emoji: '👑', isGold: true },
    'runner-up-cupu': { label: 'Si Cupu Kedua' },
    'duo-petaka': { label: 'Duo Petaka' },
    'glow-down': { label: 'Glow Down', isGold: true },
    'sultan-of-bye': { label: 'Sultan of Bye' },
    'tukang-nyumbang-poin': { label: 'Tukang Nyumbang Poin' },
    'spesialis-kalah-tipis': { label: 'Spesialis Kalah Tipis' },
    'bulldozer-korban': { label: 'Bulldozer Korban' },
    'sweaty-tryhard': { label: 'Sweaty Tryhard', emoji: '🏆' },
    'mr-konsisten': { label: 'Mr. Konsisten' },
  },
  rowRoasts: {
    savage: {
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
    },
    medium: {
      champion: [
        'Juara, tapi jangan terlalu serius.',
        'Menang hari ini, siap jadi target minggu depan.',
        'Masih paling atas, masih paling gampang disorot.',
        'Rapi mainnya. Agak menyebalkan juga.',
      ],
      'last-place': [
        'Hari ini posisinya paling bawah.',
        'Belum panas, match keburu jalan.',
        'Butuh reset kecil sebelum sesi berikutnya.',
        'Poinnya ramah ke semua lawan.',
      ],
      'near-bottom': [
        'Dekat zona cupu, belum resmi.',
        'Masih ada ruang naik. Banyak.',
        'Aman tipis dari headline utama.',
        'Hampir masuk podium bawah.',
      ],
      'big-minus': [
        'Diff lagi berat, perlu recovery.',
        'Margin match ini cukup pedas.',
        'Hari ini angka minusnya berisik.',
        'Poin keluar lebih lancar dari poin masuk.',
      ],
      'bye-collector': [
        'Istirahatnya paling konsisten.',
        'Jadwal sayang banget sama stamina.',
        'Banyak waktu analisis dari pinggir.',
        'Fresh legs, fresh alasan.',
      ],
      'losing-streak': [
        'Streak belum berpihak.',
        'Momentum masih muter cari alamat.',
        'Satu menang bisa ubah mood.',
        'Belum ketemu tombol comeback.',
      ],
      heartbreaker: [
        'Kalah tipis tetap kalah.',
        'Nyaris menang terlalu sering.',
        'Satu poin lagi jadi cerita beda.',
        'Drama kecil, luka statistik.',
      ],
      'mid-table': [
        'Netral banget posisinya.',
        'Aman dari sorotan besar.',
        'Tidak buruk, belum ikonik.',
        'Stabil, tapi belum bikin poster.',
      ],
      'no-data': [
        'Belum cukup data buat dinilai.',
        'Masih menunggu bukti lapangan.',
        'Statistik belum buka suara.',
        'Belum ada bahan cerita.',
      ],
    },
    mild: {
      champion: [
        'Mainnya paling rapi hari ini.',
        'Puncak klasemen, tetap humble ya.',
        'Lagi jadi patokan grup.',
        'Menang dengan cukup meyakinkan.',
      ],
      'last-place': [
        'Hari ini belum rezekinya.',
        'Masih pemanasan di papan bawah.',
        'Sesi berikutnya bisa lebih enak.',
        'Butuh satu match bagus buat naik.',
      ],
      'near-bottom': [
        'Masih bisa dikejar naik.',
        'Dekat bawah, tapi belum panik.',
        'Perlu sedikit dorongan lagi.',
        'Ada PR kecil di sesi ini.',
      ],
      'big-minus': [
        'Diff lagi kurang bersahabat.',
        'Perlu match pemulihan.',
        'Angkanya minta dibenahi pelan-pelan.',
        'Masih ada waktu buat nutup margin.',
      ],
      'bye-collector': [
        'Istirahatnya lumayan banyak.',
        'Paling sempat tarik napas.',
        'Jadwal memberi jeda ekstra.',
        'Energi masih aman.',
      ],
      'losing-streak': [
        'Belum ketemu ritme menang.',
        'Butuh satu momentum kecil.',
        'Streak bisa putus kapan saja.',
        'Masih cari feel terbaik.',
      ],
      heartbreaker: [
        'Beberapa kali tinggal sedikit.',
        'Kalah tipis, progress tetap ada.',
        'Sudah dekat, tinggal rapiin akhir.',
        'Nyarisnya kebanyakan.',
      ],
      'mid-table': [
        'Cukup stabil di tengah.',
        'Main aman, posisi aman.',
        'Belum naik podium, belum jatuh juga.',
        'Hari ini steady.',
      ],
      'no-data': [
        'Belum ada cukup skor.',
        'Masih menunggu match berjalan.',
        'Data belum lengkap.',
        'Nanti kelihatan setelah main.',
      ],
    },
  },
  heroRoasts: {
    savage: [
      'Ditonton semua orang, dikalahkan semua orang juga.',
      'Bukan kalah, cuma terlalu dermawan ke lawan.',
      'Konsisten itu penting. Konsisten di bawah juga.',
      'MVP: Minus Value Player.',
      'Datang paling rajin, pulang paling bawah.',
    ],
    medium: [
      'Hari ini jadi headline papan bawah.',
      'Bukan akhir dunia, tapi jelas bukan highlight reel.',
      'Statistiknya minta sesi balas dendam.',
      'Ada banyak ruang naik dari sini.',
      'Match ini keras, papan bawah lebih keras.',
    ],
    mild: [
      'Hari ini belum berpihak, sesi berikutnya bisa beda.',
      'Papan bawah sementara, semangat masih jalan.',
      'Butuh satu match bagus buat mengubah cerita.',
      'Skor hari ini jadi bahan evaluasi ringan.',
      'Masih ada ruang comeback di match berikutnya.',
    ],
  },
  glowDownRoasts: {
    mild: [
      'Awal bagus, akhirnya menurun sedikit.',
      'Sempat di atas, finish agak melandai.',
      'Puncaknya di awal, sisanya evaluasi.',
      'Mulai kencang, closing-nya santai.',
    ],
    medium: [
      'Start di atas, finish jauh dari situ.',
      'Awalnya memimpin, akhirnya turun banyak.',
      'Puncak di ronde awal, sisanya menurun.',
      'Pembukaan juara, penutupan biasa saja.',
    ],
    savage: [
      'Start juara, finish berduka.',
      'Naik cepat, jatuhnya lebih cepat.',
      'Puncak di ronde satu, sisanya terjun bebas.',
      'Awal jadi sorotan, akhir jadi pelajaran.',
    ],
  },
  coKingRoasts: {
    mild: 'Dua pemain berbagi posisi terbawah. Masih bisa ditebus.',
    medium: 'Dua orang, satu posisi bawah. Sama-sama perlu sesi balas dendam.',
    savage: 'Dua orang, satu takhta. Sama-sama layak.',
  },
  emptyRoasts: {
    mild: 'Main dulu, nanti statistiknya muncul.',
    medium: 'Main dulu, baru Hall of Shame buka suara.',
    savage: 'Main dulu, baru kita hina.',
  },
  peacefulRoasts: {
    mild: 'Belum ada yang tertinggal. Match masih adem.',
    medium: 'Belum ada bahan roast. Untuk sekarang.',
    savage: 'Gak ada yang bisa dihina. Untuk sekarang.',
  },
};

const mergeToxicCopyConfig = (input: ToxicCopyInput | null | undefined): ToxicCopyConfig => {
  const merged: ToxicCopyConfig = {
    version: Number(input?.version || DEFAULT_TOXIC_COPY_CONFIG.version),
    sortLabel: cleanString(input?.sortLabel) || DEFAULT_TOXIC_COPY_CONFIG.sortLabel,
    awards: { ...DEFAULT_TOXIC_COPY_CONFIG.awards },
    rowRoasts: {
      mild: { ...DEFAULT_TOXIC_COPY_CONFIG.rowRoasts.mild },
      medium: { ...DEFAULT_TOXIC_COPY_CONFIG.rowRoasts.medium },
      savage: { ...DEFAULT_TOXIC_COPY_CONFIG.rowRoasts.savage },
    },
    heroRoasts: {
      mild: [...DEFAULT_TOXIC_COPY_CONFIG.heroRoasts.mild],
      medium: [...DEFAULT_TOXIC_COPY_CONFIG.heroRoasts.medium],
      savage: [...DEFAULT_TOXIC_COPY_CONFIG.heroRoasts.savage],
    },
    glowDownRoasts: {
      mild: [...DEFAULT_TOXIC_COPY_CONFIG.glowDownRoasts.mild],
      medium: [...DEFAULT_TOXIC_COPY_CONFIG.glowDownRoasts.medium],
      savage: [...DEFAULT_TOXIC_COPY_CONFIG.glowDownRoasts.savage],
    },
    coKingRoasts: { ...DEFAULT_TOXIC_COPY_CONFIG.coKingRoasts },
    emptyRoasts: { ...DEFAULT_TOXIC_COPY_CONFIG.emptyRoasts },
    peacefulRoasts: { ...DEFAULT_TOXIC_COPY_CONFIG.peacefulRoasts },
  };

  TOXIC_AWARD_IDS.forEach((awardId) => {
    const award = input?.awards?.[awardId];
    if (!award || typeof award !== 'object') return;
    merged.awards[awardId] = {
      ...merged.awards[awardId],
      ...(cleanString(award.label) ? { label: cleanString(award.label) } : {}),
      ...(cleanString(award.emoji) ? { emoji: cleanString(award.emoji) } : {}),
      ...(typeof award.isGold === 'boolean' ? { isGold: award.isGold } : {}),
    };
  });

  TOXIC_INTENSITIES.forEach((intensity) => {
    const heroRoasts = cleanStringList(input?.heroRoasts?.[intensity]);
    if (heroRoasts.length > 0) merged.heroRoasts[intensity] = heroRoasts;

    const glowDownRoasts = cleanStringList(input?.glowDownRoasts?.[intensity]);
    if (glowDownRoasts.length > 0) merged.glowDownRoasts[intensity] = glowDownRoasts;

    const coKingRoast = cleanString(input?.coKingRoasts?.[intensity]);
    if (coKingRoast) merged.coKingRoasts[intensity] = coKingRoast;

    const emptyRoast = cleanString(input?.emptyRoasts?.[intensity]);
    if (emptyRoast) merged.emptyRoasts[intensity] = emptyRoast;

    const peacefulRoast = cleanString(input?.peacefulRoasts?.[intensity]);
    if (peacefulRoast) merged.peacefulRoasts[intensity] = peacefulRoast;

    TOXIC_BUCKETS.forEach((bucket) => {
      const roasts = cleanStringList(input?.rowRoasts?.[intensity]?.[bucket]);
      if (roasts.length > 0) merged.rowRoasts[intensity][bucket] = roasts;
    });
  });

  return merged;
};

export const resolveToxicCopyConfig = (config?: ToxicCopyInput | null): ToxicCopyConfig => (
  mergeToxicCopyConfig(config)
);

export const parseToxicCopyConfigJson = (value: unknown): ToxicCopyConfig | null => {
  const raw = cleanString(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ToxicCopyInput;
    if (!parsed || typeof parsed !== 'object') return null;
    return mergeToxicCopyConfig(parsed);
  } catch {
    return null;
  }
};
