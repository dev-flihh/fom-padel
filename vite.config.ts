import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const serveBlogLandingInDev = () => ({
  name: 'serve-blog-landing-in-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname !== '/' && url.pathname !== '/blog' && url.pathname !== '/blog/') {
        next();
        return;
      }

      try {
        const landingPath = path.resolve(process.cwd(), 'public/blog/index.html');
        const html = await readFile(landingPath, 'utf8');
        const transformedHtml = await server.transformIndexHtml('/', html);
        res.setHeader('Content-Type', 'text/html');
        res.end(transformedHtml);
      } catch (error) {
        next(error);
      }
    });
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      serveBlogLandingInDev(),
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        workbox: {
          // Keep Firebase Auth reserved handler routes and the app shell out of
          // SW navigation fallback. Firebase Hosting rewrites /app to archive.html;
          // if Workbox handles it, users can get the static landing index instead.
          navigateFallbackDenylist: [/^\/__\//, /^\/app(?:\/|$)/]
        },
        manifest: {
          name: 'FOM Play',
          short_name: 'FOM Play',
          description: 'Padel Tournament & MMR System',
          theme_color: '#F86600',
          background_color: '#F86600',
          start_url: '/app',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase/auth')) return 'firebase-auth';
            if (id.includes('firebase/firestore')) return 'firebase-firestore';
            if (id.includes('firebase/storage')) return 'firebase-storage';
            if (id.includes('firebase/analytics')) return 'firebase-analytics';
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
            if (id.includes('motion')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@google/genai')) return 'genai';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
