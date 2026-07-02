export const toFirestoreSafe = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
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
