import { getDict } from './index';

const SITE = 'https://fomplay.asia';

/** JSON-LD SoftwareApplication + FAQPage untuk homepage, per locale. */
export const getHomeSchema = (locale: string | undefined) => {
  const t = getDict(locale);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'FOM Play',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
      description: t.meta.description,
      url: SITE,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];
};
