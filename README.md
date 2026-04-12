# EGGS! The Podcast (site)

Vite + React + TypeScript. Episode data comes from RSS; YouTube adds thumbnails, featured order, and topic counts when an API key is present.

## Run locally

```bash
npm install
npm run setup:env
```

Open the new **`.env`** file in the project root (same folder as `package.json`). Put your YouTube key on the line that says `VITE_YOUTUBE_API_KEY=` (no spaces around `=`). Save the file.

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Where the YouTube key comes from

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or pick a project → **APIs & Services** → **Library** → enable **YouTube Data API v3**.
3. **Credentials** → **Create credentials** → **API key**.
4. Click the new key → under **Application restrictions**, choose **HTTP referrers (web sites)**.
5. Add:
   - `http://localhost:5173/*`
   - `https://YOUR-SITE.netlify.app/*` (use your real Netlify URL after you deploy)
6. Save, copy the key into `.env` as `VITE_YOUTUBE_API_KEY=...`.

Without the key, the site still runs on RSS only (YouTube extras are off).

## Deploy on Netlify

This repo already includes **`netlify.toml`**: build command, publish folder, SPA fallback, **RSS proxy** (`/podcast-rss.xml` → Anchor), and **`VITE_PODCAST_RSS_URL=/podcast-rss.xml`** for Netlify builds so feeds work without you setting that variable.

You still add the **YouTube** secret in the Netlify UI (it must not live in git):

1. In Netlify, open your site → **Site configuration** → **Environment variables** → **Add a variable**.
2. Key: `VITE_YOUTUBE_API_KEY` — Value: paste the same key you use locally.
3. **Save**, then go to **Deploy** → **Trigger deploy** → **Clear cache and deploy site** so a new build picks up the variable.

After deploy, add your production Netlify URL to the key’s **HTTP referrers** in Google Cloud (step 5 above).

## Netlify CLI (optional)

Install the CLI once (`npm i -g netlify-cli` or [their installer](https://docs.netlify.com/cli/get-started/)). From this project folder:

1. **`npm run netlify:login`** — sign in (opens browser). *Run as `netlify login` if you prefer.*
2. **`npm run netlify:link`** — connect this folder to your Netlify site (pick the site from the list). Creates `.netlify/` (safe to commit or ignore; many teams gitignore it).
3. **`npm run netlify:status`** — confirm the link.

Useful commands (after the site is linked):

| Command | Purpose |
|--------|---------|
| `npm run netlify:env:list` | List environment variables stored on Netlify for this site. |
| `npm run netlify:env:pull` | Download them into a local file (CLI default is often `.env` or `.env.local` — **can overwrite**; back up `.env` first if you use it). |
| `npm run netlify:dev` | Run the dev server with Netlify’s context (redirects, some env behavior). |
| `npm run netlify:deploy` | `npm run build` then a **draft** deploy (share the preview URL). |
| `npm run netlify:deploy:prod` | Build and deploy to **production** (same as pushing to your production branch if that’s how the site is wired). |

You can still use the Netlify **dashboard** for everything; the CLI is for convenience and scripting.

## Other npm scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build → `dist/` |
| `npm run setup:env` | Create `.env` from `.env.example` if you don’t have one yet |
