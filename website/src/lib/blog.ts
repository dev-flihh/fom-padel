import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export const entryLang = (entry: BlogEntry) => entry.id.split('/')[0] as 'en' | 'id';
export const entrySlug = (entry: BlogEntry) => entry.id.split('/').slice(1).join('/');

/** Artikel untuk satu bahasa, non-draft, terurut naik berdasarkan `order`. */
export const getArticles = async (lang: 'en' | 'id') => {
  const all = await getCollection('blog', (e) => !e.data.draft);
  return all
    .filter((e) => entryLang(e) === lang)
    .sort((a, b) => a.data.order - b.data.order);
};
