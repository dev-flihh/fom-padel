// Ambil daftar tutorial dari blog FOM (blog-index.json) yang di-generate website.
// Di-cache di localStorage dengan TTL supaya cepat & tahan offline.

export type Tutorial = {
  slug: string;
  lang: 'en' | 'id';
  title: string;
  description: string;
  category: string;
  appFeature: string | null;
  embeddable: boolean;
  url: string;
  embedUrl: string | null;
};

// Sumber index. Bisa dioverride via env untuk dev/staging.
export const TUTORIALS_INDEX_URL =
  (import.meta.env.VITE_TUTORIALS_URL as string | undefined) || 'https://fomplay.asia/blog-index.json';

const CACHE_KEY = 'fom_tutorials_index_v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 jam

type CacheShape = { fetchedAt: number; articles: Tutorial[] };

const readCache = (): CacheShape | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || !Array.isArray(parsed.articles)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (value: CacheShape) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // storage penuh / private mode — abaikan
  }
};

/** Artikel dari cache (untuk render awal instan sebelum fetch selesai). */
export const getCachedTutorials = (): Tutorial[] => readCache()?.articles ?? [];

/** Ambil index: pakai cache bila masih segar, kalau tidak fetch & refresh cache. */
export const loadTutorials = async (): Promise<Tutorial[]> => {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.articles;
  try {
    const res = await fetch(TUTORIALS_INDEX_URL, { credentials: 'omit' });
    if (!res.ok) throw new Error(`tutorials index ${res.status}`);
    const json = (await res.json()) as { articles?: Tutorial[] };
    const articles = Array.isArray(json.articles) ? json.articles : [];
    writeCache({ fetchedAt: Date.now(), articles });
    return articles;
  } catch {
    // Gagal jaringan — pakai cache lama kalau ada, kalau tidak kosong.
    return cached?.articles ?? [];
  }
};

/** Bahasa tutorial: Indonesia-first, English hanya bila perangkat jelas berbahasa Inggris. */
export const detectTutorialLocale = (): 'en' | 'id' => {
  if (typeof navigator === 'undefined') return 'id';
  return (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'id';
};
