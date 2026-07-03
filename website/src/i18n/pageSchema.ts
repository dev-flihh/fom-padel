import { getPages } from './index';

const SITE = 'https://fomplay.asia';

const faqPage = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: i.q,
    acceptedAnswer: { '@type': 'Answer', text: i.a },
  })),
});

/** FAQPage schema untuk halaman /faq (semua grup digabung). */
export const faqPageSchema = (locale: string | undefined) => {
  const groups = getPages(locale).faq.groups;
  return faqPage(groups.flatMap((g) => g.items));
};

/** FAQPage schema untuk mini-FAQ di halaman /ranking. */
export const rankingFaqSchema = (locale: string | undefined) => faqPage(getPages(locale).ranking.faq);

/** BreadcrumbList untuk halaman format. */
export const breadcrumbSchema = (crumbs: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: SITE + c.path,
  })),
});
