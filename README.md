# EGGS! The Podcast (site)

**Astro** (static site generation) + **React islands** + **TypeScript**, styled with **Tailwind CSS v4**.

Every page — the homepage, all ~470 episodes, every guest, and every topic — is **prerendered to real HTML at build time**. Episode data comes from the Anchor **RSS feed**; **YouTube** adds thumbnails, the featured order, and topic groupings when an API key is present. All of that fetching + matching happens **once during the build**, so the published pages are fully populated for search engines, social link previews, and LLM crawlers (no client-side data fetching, no flaky image loading).

## Architecture at a glance

| Piece | Where | What it does |
|------|-------|--------------|
| Build-time data layer | `src/data/content.ts` | Fetches RSS + YouTube once, runs matching/enrichment, derives episodes, guests, topics. |
| Pages (static) | `src/pages/**` | `index`, `episodes/`, `episodes/[slug]`, `guests/`, `guests/[slug]`, `topics/`, `topics/[slug]`, `about`, `be-a-guest`, `sponsor`, `404`, `robots.txt`. |
| SEO `<head>` | `src/components/Seo.astro` | Title, meta, canonical, Open Graph, Twitter, JSON-LD structured data. |
| Layout / chrome | `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`, `SiteFooter.astro` | Shared shell, nav (with mobile menu), footer. |
| Interactive islands | `src/components/EpisodesArchive.tsx`, plus `src/app/components/BeAGuest.tsx` & `Sponsor.tsx` | Hydrated React for archive search/filter/sort and the forms. |
| Reused logic | `src/app/lib/**`, `src/app/config/**`, `src/app/types/**` | The original RSS parser + YouTube matcher, now run at build time. |

Structured data emitted: `PodcastSeries` (home), `PodcastEpisode` + `Person` (guest) + `BreadcrumbList` (episode pages), `Person` (guest pages), `CollectionPage` (archive/guests/topics). A `sitemap-index.xml` and `robots.txt` are generated automatically.

## Run locally

```bash
npm install
npm run setup:env   # optional — only needed for YouTube enrichment
npm run dev
```

Open the URL Astro prints (usually `http://localhost:4321`). Without a YouTube key the site builds and runs on **RSS only** (no thumbnails/topics/featured order).

## YouTube API key (optional, build-time)

The key is now used **server-side at build time**, so it is never shipped to the browser. Preferred variable name: **`YOUTUBE_API_KEY`** (the legacy `VITE_YOUTUBE_API_KEY` still works as a fallback).

1. [Google Cloud Console](https://console.cloud.google.com/) → create/pick a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **Credentials → Create credentials → API key**.
4. Because the key is used from the build server (not a browser), set **Application restrictions → None** (or IP), and **API restrictions → restrict to YouTube Data API v3**.
5. Put it in `.env` as `YOUTUBE_API_KEY=...`.

## Deploy on Netlify

`netlify.toml` is already configured: `npm run build` → publish `dist/`, Node 22, long-cache headers for hashed assets, and `PUBLIC_SITE_URL` (the canonical origin for sitemap/canonical/OG — change it to your real domain in the Netlify UI if needed).

Add the YouTube secret in the Netlify UI (must not live in git):

1. Site → **Site configuration → Environment variables → Add a variable**.
2. Key: `YOUTUBE_API_KEY` — Value: your key.
3. **Deploys → Trigger deploy → Clear cache and deploy site**.

## Keeping the site up to date

The site is static, so **new episodes appear after a rebuild**. To automate:

1. Netlify → **Site configuration → Build & deploy → Build hooks → Add build hook**. Copy the URL.
2. Trigger it on a schedule or when a new episode publishes:
   - **Simple:** a Zapier/Make/cron job that `POST`s to the hook URL (e.g. daily, or when the RSS feed changes).
   - **Netlify-native:** a Scheduled Function that `POST`s the hook on a cron.

A `POST` to the build hook rebuilds and republishes with the latest RSS + YouTube data.

## npm scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Local dev server (Astro) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the built `dist/` locally |
| `npm run check` | Astro/TypeScript diagnostics |
| `npm run setup:env` | Create `.env` from `.env.example` |
| `npm run netlify:*` | Netlify CLI helpers (login/link/status/env/deploy) |
