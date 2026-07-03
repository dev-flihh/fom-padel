import type { APIRoute } from 'astro';
import { getArticles, entrySlug, entryLang } from '../lib/blog';

const SITE = 'https://fomplay.asia';

// Index tutorial untuk aplikasi FOM: app bisa fetch daftar artikel per fitur
// dan menampilkan versi embed (?embed=1) di dalam webview.
export const GET: APIRoute = async () => {
  const [en, id] = await Promise.all([getArticles('en'), getArticles('id')]);
  const build = (entry: Awaited<ReturnType<typeof getArticles>>[number]) => {
    const lang = entryLang(entry);
    const slug = entrySlug(entry);
    const path = lang === 'id' ? `/id/blog/${slug}` : `/blog/${slug}`;
    return {
      slug,
      lang,
      title: entry.data.title,
      description: entry.data.description,
      category: entry.data.category,
      appFeature: entry.data.appFeature ?? null,
      embeddable: entry.data.embeddable,
      url: SITE + path,
      embedUrl: entry.data.embeddable ? `${SITE}${path}?embed=1` : null,
    };
  };

  const articles = [...en, ...id].map(build);
  return new Response(JSON.stringify({ generatedFrom: SITE, count: articles.length, articles }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Di-fetch lintas origin oleh aplikasi FOM (app & website beda origin).
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};
