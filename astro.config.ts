import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Canonical production origin — drives sitemap URLs, canonical tags, and Open Graph URLs.
 * Override per environment with `PUBLIC_SITE_URL` (Netlify env var). No trailing slash.
 */
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://eggscast.com').replace(/\/+$/, '');

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // Static site generation: every route is prerendered to HTML at build time (best for SEO/LLMs).
  output: 'static',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
