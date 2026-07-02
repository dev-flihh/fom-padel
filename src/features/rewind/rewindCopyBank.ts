import type { ToxicIntensity } from '../../types';

// FOM Rewind copy bank — config-driven dynamic copywriting.
// Structure follows COPY_BANK_FOM_REWIND.md: every line lives as
// {id, slide, slot, conditions, intensity, template, requiredSlots, priority}.
// Selection: filter pool by (slide, slot, conditions ⊆ matchConditions,
// intensity ≤ setting) → highest priority → seeded pick → anti-duplicate.

export type RewindSlideType =
  | 'cover'
  | 'numbers'
  | 'podium'
  | 'champion'
  | 'dream-team'
  | 'match-of-the-night'
  | 'photos'
  | 'podium-cupu'
  | 'cupu'
  | 'awards'
  | 'standings'
  | 'standings-toxic'
  | 'outro';

export type RewindCopyLine = {
  id: string;
  slide: RewindSlideType;
  slot: string;
  conditions: string[];
  intensity: ToxicIntensity | null;
  template: string;
  requiredSlots?: string[];
  priority: number;
};

export type RewindCopySlots = Record<string, string | number | undefined>;

const INTENSITY_ORDER: Record<ToxicIntensity, number> = { mild: 0, medium: 1, savage: 2 };

const hashStringToInt = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const line = (
  id: string,
  slide: RewindSlideType,
  slot: string,
  conditions: string[],
  template: string,
  priority = 1,
  intensity: ToxicIntensity | null = null,
): RewindCopyLine => ({
  id,
  slide,
  slot,
  conditions,
  intensity,
  template,
  requiredSlots: Array.from(template.matchAll(/\{(\w+)\}/g)).map((match) => match[1]),
  priority,
});

// ---------------------------------------------------------------------------
// Default bank (COPY_BANK_FOM_REWIND.md Sections 3–14)
// ---------------------------------------------------------------------------

export const DEFAULT_REWIND_COPY_BANK: RewindCopyLine[] = [
  // 3. Cover — subline
  line('cover_default_01', 'cover', 'subline', [], 'Malam yang bakal disangkal {playerCount} orang besok pagi.'),
  line('cover_default_02', 'cover', 'subline', [], 'Satu court, {playerCount} ego.'),
  line('cover_default_03', 'cover', 'subline', [], 'Semua kejadian di sini terdokumentasi. Maaf.'),
  line('cover_long_01', 'cover', 'subline', ['duration_gt_3h'], '{duration} nonstop. Kaki boleh protes.', 2),
  line('cover_long_02', 'cover', 'subline', ['duration_gt_3h'], '{duration}. Ada yang lupa pulang.', 2),
  line('cover_late_01', 'cover', 'subline', ['ended_after_22'], 'Selesai jam {endTime}. Besok pada izin sakit, kan?', 2),
  line('cover_late_02', 'cover', 'subline', ['ended_after_22'], 'Padel malam: keputusan yang dipertanyakan jam 6 pagi.', 2),
  line('cover_weekend_01', 'cover', 'subline', ['weekend_morning'], 'Weekend orang lain: rebahan. Kita: perang.', 2),
  line('cover_crowd_01', 'cover', 'subline', ['player_count_gte_12'], '{playerCount} orang, satu tujuan: nggak jadi yang paling bawah.', 2),

  // 4. The Numbers — headline + kickers
  line('numbers_head_01', 'numbers', 'headline', [], 'Angka nggak bohong. Sayangnya.'),
  line('numbers_head_02', 'numbers', 'headline', [], 'Malam ini dalam angka.'),
  line('numbers_head_03', 'numbers', 'headline', [], 'Data. Biar nggak ada yang ngeles.'),
  line('numbers_head_points_01', 'numbers', 'headline', ['total_points_gt_250'], 'Produktif banget malam ini.', 2),
  line('numbers_head_rounds_01', 'numbers', 'headline', ['rounds_gte_12'], '{totalRounds} round. Niat banget.', 2),
  line('numbers_kick_points_01', 'numbers', 'kicker_points', [], 'nol di antaranya minta maaf'),
  line('numbers_kick_points_02', 'numbers', 'kicker_points', [], 'dikumpulin pakai keringat'),
  line('numbers_kick_bigwin_01', 'numbers', 'kicker_bigwin', ['shutout_win'], '{biggestWinPair}, tanpa ampun', 2),
  line('numbers_kick_bigwin_02', 'numbers', 'kicker_bigwin', ['shutout_win'], '{biggestWinPair}, nggak ngasih kesempatan hidup', 2),
  line('numbers_kick_bigwin_03', 'numbers', 'kicker_bigwin', [], '{biggestWinPair}'),
  line('numbers_kick_bigwin_close', 'numbers', 'kicker_bigwin', ['all_matches_close'], 'malam ini semua match sengit — respect', 2),
  line('numbers_kick_streak_01', 'numbers', 'kicker_streak', ['streak_gte_4'], '{streakName}, nggak ngasih napas', 2),
  line('numbers_kick_streak_02', 'numbers', 'kicker_streak', ['streak_gte_4'], '{streakName}, panas dari round pertama', 2),
  line('numbers_kick_streak_03', 'numbers', 'kicker_streak', [], '{streakName}'),
  line('numbers_kick_streak_low', 'numbers', 'kicker_streak', ['streak_lte_2'], 'streak terpanjang cuma {streak}. Kompetitif atau pada capek?', 2),

  // 5. Podium Official — headline + subline
  line('podium_head_01', 'podium', 'headline', [], 'Boleh sombong sampai mabar berikutnya.'),
  line('podium_head_02', 'podium', 'headline', [], 'Tiga nama yang malam ini boleh jalan pelan-pelan keluar court.'),
  line('podium_head_close_01', 'podium', 'headline', ['gap_1_2_lte_2'], 'Beda tipis. Drama sampai poin terakhir.', 2),
  line('podium_sub_close_01', 'podium', 'subline', ['gap_1_2_lte_2'], 'Selisih 01 dan 02 cuma {gap} poin.', 2),
  line('podium_head_far_01', 'podium', 'headline', ['gap_1_2_gte_8'], '01-nya beda liga.', 2),
  line('podium_sub_far_01', 'podium', 'subline', ['gap_1_2_gte_8'], '{championName} unggul {gap} poin. Sisanya berebut sisa.', 2),

  // 6. Champion — quote
  line('champ_default_01', 'champion', 'quote', [], 'Yang lain main padel. Dia main takdir.'),
  line('champ_default_02', 'champion', 'quote', [], 'Bukan hoki. Ini pola.'),
  line('champ_default_03', 'champion', 'quote', [], 'Selamat. Grup ini resmi punya bos baru.'),
  line('champ_winrate_01', 'champion', 'quote', ['win_rate_gte_80'], '{winRate}% win rate. Ini bukan mabar, ini panen.', 2),
  line('champ_winrate_02', 'champion', 'quote', ['win_rate_gte_80'], 'Menang {W} dari {M}. Sisanya formalitas.', 2),
  line('champ_diff_01', 'champion', 'quote', ['won_by_diff'], 'Menang di hitungan selisih. Detail is king.', 2),
  line('champ_co_01', 'champion', 'quote', ['co_champion'], 'Dua raja, satu takhta. Awkward tapi sah.', 3),
  line('champ_dream_01', 'champion', 'quote', ['champion_also_dream_team'], 'Menang individual, menang duo. Serakah.', 2),

  // 7. Dream Team — headline + quote
  line('dream_head_01', 'dream-team', 'headline', [], 'Kalau mereka satu tim, sisanya figuran.'),
  line('dream_quote_01', 'dream-team', 'quote', [], '{pairPlayed}x sekapal, {pairWins}x menang. Ilmu apa itu?'),
  line('dream_quote_carry_mild', 'dream-team', 'quote', ['pair_rank_gap'], 'Kombinasi tak terduga yang ternyata jalan.', 2, 'mild'),
  line('dream_quote_carry_01', 'dream-team', 'quote', ['pair_rank_gap'], 'Yang satu carry, yang satu... ikut foto.', 2, 'medium'),
  line('dream_quote_smash_01', 'dream-team', 'quote', ['pair_dominant'], 'Bukan cuma menang. Menghancurkan.', 2),

  // 8. Match of the Night — headline + kicker
  line('motn_head_margin1_01', 'match-of-the-night', 'headline', ['motn_margin_1'], 'Satu poin. Sejuta drama.', 2),
  line('motn_head_margin1_02', 'match-of-the-night', 'headline', ['motn_margin_1'], 'Nyaris serangan jantung.', 2),
  line('motn_head_default_01', 'match-of-the-night', 'headline', [], 'Match paling rame poinnya.'),
  line('motn_kick_margin1_01', 'match-of-the-night', 'kicker', ['motn_margin_1'], 'ROUND {round} · MARGIN 1 POIN', 2),
  line('motn_kick_default_01', 'match-of-the-night', 'kicker', [], 'ROUND {round} · TOTAL {totalMatchPoints} POIN'),

  // 9. Photo Dump — headline + stickers
  line('photos_head_01', 'photos', 'headline', [], 'Keringatnya asli. Gayanya juga.'),
  line('photos_head_02', 'photos', 'headline', [], 'Bukti kita pernah semuda ini.'),
  line('photos_head_03', 'photos', 'headline', [], 'POV: sebelum pada pegal.'),
  line('photos_head_many_01', 'photos', 'headline', ['photo_count_gte_8'], 'Fotografernya MVP juga sih.', 2),
  line('photos_sticker_01', 'photos', 'sticker', [], 'SEBELUM KALAH'),
  line('photos_sticker_02', 'photos', 'sticker', [], 'MASIH SEMANGAT'),
  line('photos_sticker_03', 'photos', 'sticker', [], 'GAYA DULU, SKOR URUSAN NANTI'),
  line('photos_sticker_04', 'photos', 'sticker', [], 'CANDID (BOONG)'),

  // 10. Podium Cupu — headline + subline (per intensity)
  line('pcupu_head_mild', 'podium-cupu', 'headline', [], 'Podium apresiasi kehadiran.', 1, 'mild'),
  line('pcupu_sub_mild', 'podium-cupu', 'subline', [], 'Yang penting datang, main, dan bahagia.', 1, 'mild'),
  line('pcupu_head_medium', 'podium-cupu', 'headline', [], 'Podium yang nggak ada yang mau naik.', 1, 'medium'),
  line('pcupu_sub_medium', 'podium-cupu', 'subline', [], 'Tiga nama, satu nasib. Latihan itu ada, lho.', 1, 'medium'),
  line('pcupu_head_savage_01', 'podium-cupu', 'headline', [], 'Zona degradasi resmi.', 1, 'savage'),
  line('pcupu_head_savage_02', 'podium-cupu', 'headline', [], 'Podium tapi arah bawah.', 1, 'savage'),
  line('pcupu_sub_savage_01', 'podium-cupu', 'subline', [], 'Bertiga kalian bikin lawan percaya diri lagi. Jasa besar.', 1, 'savage'),
  line('pcupu_sub_savage_02', 'podium-cupu', 'subline', [], 'Tiga nama, satu grup WA yang bakal rame.', 1, 'savage'),

  // 11. Cupu D'Or — quote (per intensity, data-aware)
  line('cupu_default_mild', 'cupu', 'quote', [], 'Ada malam yang bukan milik kita. Ini salah satunya.', 1, 'mild'),
  line('cupu_default_medium', 'cupu', 'quote', [], 'Datang paling ganteng, pulang paling bawah.', 1, 'medium'),
  line('cupu_default_savage', 'cupu', 'quote', [], 'Konsisten dari round 1: konsisten kalah.', 1, 'savage'),
  line('cupu_telak_mild', 'cupu', 'quote', ['cupu_kalah_telak'], 'Skor {score} itu pengalaman, bukan aib.', 2, 'mild'),
  line('cupu_telak_medium', 'cupu', 'quote', ['cupu_kalah_telak'], 'Kalah {score} dari {opponentPair}. Lawannya manusia, kok.', 2, 'medium'),
  line('cupu_telak_savage', 'cupu', 'quote', ['cupu_kalah_telak'], '{score}. Lawannya sampai nggak enak hati.', 2, 'savage'),
  line('cupu_bye_mild', 'cupu', 'quote', ['cupu_bye_gte_3'], 'Banyak istirahat, biar fresh terus.', 2, 'mild'),
  line('cupu_bye_medium', 'cupu', 'quote', ['cupu_bye_gte_3'], '{byeCount}x duduk manis. Bangkunya sampai hafal.', 2, 'medium'),
  line('cupu_bye_savage', 'cupu', 'quote', ['cupu_bye_gte_3'], 'Datang buat main atau nemenin bangku?', 2, 'savage'),
  line('cupu_streak_mild', 'cupu', 'quote', ['cupu_losing_streak_gte_3'], 'Kalah {streak}x beruntun. Besok pasti beda.', 2, 'mild'),
  line('cupu_streak_medium', 'cupu', 'quote', ['cupu_losing_streak_gte_3'], '{streak} kekalahan beruntun. Konsisten, sih.', 2, 'medium'),
  line('cupu_streak_savage', 'cupu', 'quote', ['cupu_losing_streak_gte_3'], '{streak}x beruntun. Algoritmanya udah ketebak.', 2, 'savage'),
  line('cupu_winless_mild', 'cupu', 'quote', ['cupu_winless'], 'Belum menang malam ini. Kata kuncinya: belum.', 2, 'mild'),
  line('cupu_winless_medium', 'cupu', 'quote', ['cupu_winless'], '0 kemenangan. Tapi hadir penuh, itu sesuatu.', 2, 'medium'),
  line('cupu_winless_savage', 'cupu', 'quote', ['cupu_winless'], 'Nol menang. Setidaknya parkirnya jago.', 2, 'savage'),
  line('cupu_coking_mild', 'cupu', 'quote', ['co_king'], 'Berdua lebih ringan menanggungnya.', 3, 'mild'),
  line('cupu_coking_medium', 'cupu', 'quote', ['co_king'], 'Dua raja cupu. Sah, tanpa sidang ulang.', 3, 'medium'),
  line('cupu_coking_savage', 'cupu', 'quote', ['co_king'], 'Saking cupunya harus patungan gelar.', 3, 'savage'),

  // 13. Final Standings (full official list) — headline
  line('standings_head_data_01', 'standings', 'headline', [], '{rounds} round. {totalPoints} poin. Nol alasan.', 2),
  line('standings_head_01', 'standings', 'headline', [], 'Screenshot. Kirim ke grup. Tunggu ribut.'),
  line('standings_head_02', 'standings', 'headline', [], 'Hitam di atas putih. Nggak bisa ngeles.'),
  line('standings_head_gap_01', 'standings', 'headline', ['gap_top_bottom_gte_30'], 'Jarak 01 ke {lastRank}: {gap} poin. Jauh banget perjalanannya.', 3),
  line('standings_head_tie_01', 'standings', 'headline', ['tie_exists'], 'Ada yang seri. Silakan ribut soal DIFF.', 3),

  // Full toxic standings (reverse-sorted) — headline
  line('standings_toxic_head_mild', 'standings-toxic', 'headline', [], 'Diurutkan dari yang paling butuh semangat.', 1, 'mild'),
  line('standings_toxic_head_medium', 'standings-toxic', 'headline', [], 'Diurutkan dari yang paling butuh pelukan.', 1, 'medium'),
  line('standings_toxic_head_savage_01', 'standings-toxic', 'headline', [], 'Diurutkan dari yang paling butuh pelukan.', 1, 'savage'),
  line('standings_toxic_head_savage_02', 'standings-toxic', 'headline', [], 'Dari takhta cupu sampai... yaudah lah.', 1, 'savage'),

  // 14. Outro — headline
  line('outro_head_01', 'outro', 'headline', [], 'Yang menang jangan songong. Yang kalah, revans dibuka.'),
  line('outro_head_02', 'outro', 'headline', [], 'Sampai ketemu di court berikutnya.'),
  line('outro_head_toxic_01', 'outro', 'headline', ['toxic_on'], 'Gelar cupu bisa pindah tangan. Buktikan minggu depan.', 2),
  line('outro_head_late_01', 'outro', 'headline', ['ended_after_22'], 'Pulang. Besok orang kerja.', 2),
];

// ---------------------------------------------------------------------------
// Selection engine (COPY_BANK Section 15)
// ---------------------------------------------------------------------------

export type RewindCopyPicker = {
  pick: (slide: RewindSlideType, slot: string, slots?: RewindCopySlots) => string;
};

const renderTemplate = (template: string, slots: RewindCopySlots): string | null => {
  let missing = false;
  const rendered = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = slots[key];
    if (value === undefined || value === null || value === '') {
      missing = true;
      return '';
    }
    return String(value);
  });
  return missing ? null : rendered;
};

/**
 * Create a copy picker bound to one Rewind generation: same seed + conditions
 * always produce the same lines (regenerate ≠ ganti copy), and a line is never
 * used twice within one Rewind.
 */
export const createRewindCopyPicker = ({
  seed,
  conditions,
  intensity,
  bank = DEFAULT_REWIND_COPY_BANK,
}: {
  seed: string;
  conditions: string[];
  intensity: ToxicIntensity;
  bank?: RewindCopyLine[];
}): RewindCopyPicker => {
  const conditionSet = new Set(conditions);
  const usedLineIds = new Set<string>();
  const usedTexts = new Set<string>();

  const pick = (slide: RewindSlideType, slot: string, slots: RewindCopySlots = {}): string => {
    const eligible = bank.filter((candidate) => (
      candidate.slide === slide &&
      candidate.slot === slot &&
      candidate.conditions.every((condition) => conditionSet.has(condition)) &&
      (candidate.intensity === null || INTENSITY_ORDER[candidate.intensity] <= INTENSITY_ORDER[intensity])
    ));
    // Toxic slots carry per-intensity variants: use the active intensity's
    // lines (savage stays savage). Lower intensities are only a fallback when
    // the active tier has no candidate for these conditions.
    const exact = eligible.filter((candidate) => candidate.intensity === null || candidate.intensity === intensity);
    const pool = exact.length > 0 ? exact : eligible;
    if (pool.length === 0) return '';

    const maxPriority = Math.max(...pool.map((candidate) => candidate.priority));
    // Try highest priority tier first, then fall back tier by tier.
    for (let priority = maxPriority; priority >= 0; priority -= 1) {
      const tier = pool.filter((candidate) => candidate.priority === priority && !usedLineIds.has(candidate.id));
      if (tier.length === 0) continue;
      const startIndex = hashStringToInt(`${seed}:${slide}:${slot}`) % tier.length;
      for (let offset = 0; offset < tier.length; offset += 1) {
        const candidate = tier[(startIndex + offset) % tier.length];
        const rendered = renderTemplate(candidate.template, slots);
        if (rendered === null || usedTexts.has(rendered)) continue;
        usedLineIds.add(candidate.id);
        usedTexts.add(rendered);
        return rendered;
      }
    }
    return '';
  };

  return { pick };
};

// ---------------------------------------------------------------------------
// Remote-config parsing (COPY_BANK Section 15 point 6: bank ships as JSON so
// content team can add variants without an engine deploy). Invalid entries are
// dropped; an invalid document fails closed to the default bank.
// ---------------------------------------------------------------------------

const REWIND_SLIDE_TYPES: RewindSlideType[] = [
  'cover', 'numbers', 'podium', 'champion', 'dream-team', 'match-of-the-night',
  'photos', 'podium-cupu', 'cupu', 'awards', 'standings', 'standings-toxic', 'outro',
];
const INTENSITIES: ToxicIntensity[] = ['mild', 'medium', 'savage'];

const sanitizeLine = (raw: unknown): RewindCopyLine | null => {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const slide = input.slide as RewindSlideType;
  const slot = typeof input.slot === 'string' ? input.slot.trim() : '';
  const template = typeof input.template === 'string' ? input.template.trim() : '';
  if (!id || !slot || !template || !REWIND_SLIDE_TYPES.includes(slide)) return null;
  const intensity = INTENSITIES.includes(input.intensity as ToxicIntensity)
    ? (input.intensity as ToxicIntensity)
    : null;
  const conditions = Array.isArray(input.conditions)
    ? input.conditions.filter((condition): condition is string => typeof condition === 'string' && condition.trim().length > 0)
    : [];
  const priority = Number.isFinite(Number(input.priority)) ? Number(input.priority) : 1;
  return line(id, slide, slot, conditions, template, priority, intensity);
};

/**
 * Parse a remote copy-bank JSON document. Shape:
 * `{ "version": 1, "lines": [{id, slide, slot, template, conditions?, intensity?, priority?}] }`
 * Lines with an existing id REPLACE the default line; new ids are appended.
 * Returns null (→ default bank) when the document is invalid or empty.
 */
export const parseRewindCopyBankJson = (value: unknown): RewindCopyLine[] | null => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { lines?: unknown[] };
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.lines)) return null;
    const overrides = parsed.lines
      .map(sanitizeLine)
      .filter((candidate): candidate is RewindCopyLine => Boolean(candidate));
    if (overrides.length === 0) return null;
    const overrideById = new Map(overrides.map((candidate) => [candidate.id, candidate]));
    const merged = DEFAULT_REWIND_COPY_BANK.map((existing) => {
      const override = overrideById.get(existing.id);
      if (override) overrideById.delete(existing.id);
      return override || existing;
    });
    return [...merged, ...overrideById.values()];
  } catch {
    return null;
  }
};

// COPY_BANK Section 12 — Toxic Award notes per intensity, keyed by award id.
// Falls back to the award's existing data-aware note when no template applies.
export const REWIND_AWARD_NOTES: Record<string, Partial<Record<ToxicIntensity, string>>> = {
  'sultan-of-bye': {
    mild: 'Paling banyak istirahat: {byeCount}x.',
    medium: '{byeCount}x nganggur. Bayar court buat nonton.',
    savage: 'Datang jauh-jauh buat jadi penonton VIP.',
  },
  'duo-petaka': {
    mild: 'Kombinasi yang masih perlu jam terbang.',
    medium: 'Berdua 0 menang. Kompaknya di situ doang.',
    savage: 'Kombinasi yang harusnya kena banned.',
  },
  'glow-down': {
    mild: 'Start kencang, finish santai.',
    medium: 'Rank {from} ke rank {to}. Terjun payung tanpa payung.',
    savage: 'Grafiknya kayak saham rugi.',
  },
};

export const renderRewindAwardNote = (
  awardId: string,
  intensity: ToxicIntensity,
  slots: RewindCopySlots,
  fallback: string,
): string => {
  const template = REWIND_AWARD_NOTES[awardId]?.[intensity];
  if (!template) return fallback;
  const rendered = renderTemplate(template, slots);
  return rendered ?? fallback;
};
