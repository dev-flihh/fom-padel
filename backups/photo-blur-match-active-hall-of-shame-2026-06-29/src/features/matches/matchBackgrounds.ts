import { type MatchFormat } from '../../types';

export const FALLBACK_MATCH_BACKGROUND = '/mockups/active-v2/images/match-01.jpg';

export const MATCH_BACKGROUND_POOLS: Record<MatchFormat, string[]> = {
  Americano: [
    '/mockups/active-v2/images/Americano-01.jpg',
    '/mockups/active-v2/images/Americano-02.jpg',
    '/mockups/active-v2/images/Americano-03.jpg',
    '/mockups/active-v2/images/Americano-04.jpg',
    '/mockups/active-v2/images/americano-06.jpg'
  ],
  Mexicano: [
    '/mockups/active-v2/images/Mexicano-01.jpg',
    '/mockups/active-v2/images/Mexicano-02.jpg',
    '/mockups/active-v2/images/Mexicano-03.jpg',
    '/mockups/active-v2/images/mexicano-04.jpg',
    '/mockups/active-v2/images/mexicano-05.jpg',
    '/mockups/active-v2/images/mexicano-06.jpg',
    '/mockups/active-v2/images/mexicano-07.jpg'
  ],
  'Match Play': [
    '/mockups/active-v2/images/match-01.jpg',
    '/mockups/active-v2/images/Match-02.jpg',
    '/mockups/active-v2/images/Match-03.jpg',
    '/mockups/active-v2/images/match-04.jpg',
    '/mockups/active-v2/images/match-05.jpg',
    '/mockups/active-v2/images/match-06.jpg',
    '/mockups/active-v2/images/Match-07.jpg',
    '/mockups/active-v2/images/match-08.jpg'
  ]
};

export const ALL_MATCH_BACKGROUNDS = Array.from(
  new Set(Object.values(MATCH_BACKGROUND_POOLS).flat())
);

export const getMatchBackgroundPool = (_format: MatchFormat) => {
  const pool = ALL_MATCH_BACKGROUNDS;
  return pool.length > 0 ? pool : [FALLBACK_MATCH_BACKGROUND];
};

export const getRandomMatchBackground = (format: MatchFormat) => {
  const pool = getMatchBackgroundPool(format);
  return pool[Math.floor(Math.random() * pool.length)];
};

export const resolveMatchBackground = (format: MatchFormat, selectedBackgroundId?: string | null) => {
  const pool = getMatchBackgroundPool(format);
  if (selectedBackgroundId && pool.includes(selectedBackgroundId)) {
    return selectedBackgroundId;
  }
  return pool[0] || FALLBACK_MATCH_BACKGROUND;
};
