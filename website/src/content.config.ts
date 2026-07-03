import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Artikel blog. Struktur: src/content/blog/{en,id}/{slug}.md
// id koleksi = "en/slug" atau "id/slug" → lang & slug diturunkan dari path.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    date: z.string(),
    isoDate: z.string(),
    readTime: z.string(),
    icon: z.string(),
    /** Fitur app terkait — dipakai app untuk menampilkan tutorial per fitur. */
    appFeature: z.string().optional(),
    /** Boleh di-embed sebagai tutorial di app. */
    embeddable: z.boolean().default(true),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
