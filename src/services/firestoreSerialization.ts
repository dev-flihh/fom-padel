export const toFirestoreSafe = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

// Field tanggal bisa datang dalam banyak wujud tergantung asalnya: Date asli,
// Firestore Timestamp (punya toDate), map {seconds, nanoseconds} hasil
// persistence, ISO string hasil JSON round-trip, epoch millis, atau bahkan
// {} kosong dari dokumen share lama yang korup. Kembalikan Date valid atau null.
export const coerceToDate = (raw: unknown): Date | null => {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (raw && typeof (raw as { toDate?: unknown }).toDate === 'function') {
    try {
      const converted = (raw as { toDate: () => Date }).toDate();
      return Number.isNaN(converted.getTime()) ? null : converted;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(raw);
  }
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (raw && typeof raw === 'object' && 'seconds' in (raw as Record<string, unknown>)) {
    const seconds = Number((raw as Record<string, unknown>).seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  return null;
};

const MAX_INLINE_IMAGE_FIRESTORE_BYTES = 2000;

export const stripLargeInlineImages = <T,>(value: T): T => {
  const visit = (input: unknown): unknown => {
    if (typeof input === 'string') {
      return input.startsWith('data:image/') && input.length > MAX_INLINE_IMAGE_FIRESTORE_BYTES
        ? ''
        : input;
    }
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== 'object') return input;

    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, nestedValue]) => [key, visit(nestedValue)])
    );
  };

  return visit(value) as T;
};

export const stripTournamentPlayerAvatars = <T,>(value: T): T => {
  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== 'object') return input;

    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>)
        .filter(([key]) => key !== 'avatar')
        .map(([key, nestedValue]) => [key, visit(nestedValue)])
    );
  };

  return visit(value) as T;
};
