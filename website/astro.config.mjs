import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fomplay.asia',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // Redirect 301 dari URL lama (konten Indonesia) ke struktur /id/ baru.
  // Catatan: /ranking, /faq, /blog TIDAK diredirect — kini jadi halaman English
  // baru; konten Indonesia-nya pindah ke /id/ranking, /id/faq, /id/blog.
  redirects: {
    '/fitur': '/id/fitur',
    '/format/americano': '/id/format/americano',
    '/format/mexicano': '/id/format/mexicano',
    '/format/match-play': '/id/format/match-play',
    '/edukasi/perbedaan-americano-vs-mexicano': '/id/blog/americano-vs-mexicano',
    '/blog/articles/americano-vs-mexicano': '/id/blog/americano-vs-mexicano',
    '/blog/articles/cara-mulai-turnamen-padel': '/id/blog/cara-mulai-turnamen-padel',
    '/blog/articles/kenapa-live-scoring-padel-penting': '/id/blog/kenapa-live-scoring-padel-penting',
    '/blog/articles/ranking-mmr-fom-play': '/id/blog/ranking-mmr-fom-play',
    '/blog/articles/klasemen-otomatis-padel': '/id/blog/klasemen-otomatis-padel',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/app'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', id: 'id' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
