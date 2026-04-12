/**
 * Home page — RSS list from `useRssEpisodes()` (stable). YouTube enrichment uses the **same**
 * matching rules as the archive (`buildYoutubeOverlaysForEpisodes` + merged catalog), but
 * loads the **lite** snapshot first, then layers in the **full** channel when available
 * (shared global cache — often free if you already visited the archive this session).
 *
 * **Top of page (what you’ll edit most):**
 * 1. Orange “latest episode” hero — one viewport (`100dvh`), then black strip below the fold; presenter eyebrow, title, summary, meta, CTAs, art.
 * 2. Black brand strip — one-line positioning statement (replaces the old full-screen hero tagline).
 * 3. Everything else — Featured, Topics, Newsletter, Guest/Sponsor (unchanged in role).
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { expectedTopicPlaylistTitles } from '../lib/youtube';
import { titleMatchesPlaylist } from '../config/youtubeChannel';
import { useRssEpisodes } from '../hooks/useRssEpisodes';
import { useYoutubeChannelData } from '../hooks/useYoutubeChannelData';
import { useYoutubeLiteChannelData } from '../hooks/useYoutubeLiteChannelData';
import { buildYoutubeOverlaysForEpisodes } from '../lib/computeEpisodeYoutubeOverlay';
import { mergeYoutubeCatalogForMatching } from '../lib/youtubeChannelCache';
import { getFeaturedEpisodesInPlaylistOrder } from '../lib/youtubeFeaturedOrder';
import { mergeEpisodeForDisplay } from '../types/youtubeOverlay';
import { episodePathFromSlug } from '../episodePaths';
import PreferredYoutubeImageSlot from './PreferredYoutubeImageSlot';

/** Same idea as the archive page — turns `01:04:14` into a short label */
function formatDurationLabel(raw: string | undefined): string {
  if (!raw?.trim()) return '—';
  const parts = raw.trim().split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return raw.trim();
  if (parts.length === 3) {
    const [h, m] = parts;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  }
  if (parts.length === 2) return `${parts[0]} min`;
  return raw.trim();
}

/** Stable string key so `useMemo` does not re-run on every new `slugs` array instance. */
function orderedSlugKey(slugs: string[]): string {
  if (slugs.length === 0) return '';
  return [...slugs].filter(Boolean).sort().join('|');
}

export default function Home() {
  const { data: rssData, loading, error } = useRssEpisodes();
  /**
   * Two loads, one merged view for **matching** (same idea as the archive’s `full ?? lite`):
   * - **Lite** — small, fast (always started here and on `/episodes`).
   * - **Full** — large merge; shares `getYoutubeChannelDataCached()` with the archive so it
   *   may already be in memory, or finishes in the background without blocking lite-first art.
   */
  const { data: fullChannelData, loading: fullChannelLoading } = useYoutubeChannelData();
  const { data: liteChannelData, loading: liteChannelLoading, hasApiKey } = useYoutubeLiteChannelData();
  const channelData = mergeYoutubeCatalogForMatching(fullChannelData, liteChannelData);
  /** Shimmer only until we have *some* catalog to run `buildYoutubeOverlaysForEpisodes` against */
  const youtubeLoading = hasApiKey && !channelData && (liteChannelLoading || fullChannelLoading);
  const awaitYoutubeOverlay = youtubeLoading;

  const latestBase = useMemo(() => {
    if (loading || error || rssData.length === 0) return null;
    return rssData[0];
  }, [rssData, loading, error]);

  /**
   * Featured row order comes from the **EGGS Featured** YouTube playlist when the API
   * snapshot exists; otherwise we fall back to the next six RSS episodes after the latest.
   */
  const featuredBase = useMemo(() => {
    if (loading || error || rssData.length === 0) return [];
    if (channelData) {
      const ordered = getFeaturedEpisodesInPlaylistOrder(rssData, channelData);
      if (ordered.length > 0) return ordered.slice(0, 6);
    }
    return rssData.slice(1, 7);
  }, [rssData, loading, error, channelData]);

  /** Only compute YouTube overlays for the top hero + featured cards (not the whole archive). */
  const heroOverlaySlugs = useMemo(() => {
    const s = new Set<string>();
    if (latestBase) s.add(latestBase.slug);
    featuredBase.forEach((e) => s.add(e.slug));
    return Array.from(s);
  }, [latestBase, featuredBase]);

  const heroOverlays = useMemo(() => {
    if (!channelData || heroOverlaySlugs.length === 0) return {};
    const want = new Set(heroOverlaySlugs);
    const subset = rssData.filter((e) => want.has(e.slug));
    return buildYoutubeOverlaysForEpisodes(subset, channelData);
  }, [channelData, rssData, orderedSlugKey(heroOverlaySlugs)]);

  const latest = useMemo(
    () => (latestBase ? mergeEpisodeForDisplay(latestBase, heroOverlays[latestBase.slug] ?? null) : null),
    [latestBase, heroOverlays],
  );

  const featuredList = useMemo(
    () => featuredBase.map((e) => mergeEpisodeForDisplay(e, heroOverlays[e.slug] ?? null)),
    [featuredBase, heroOverlays],
  );

  /**
   * Topic row numbers come straight from each playlist’s `itemCount` on YouTube (no RSS
   * walk, no per-episode overlay work on the homepage).
   */
  const topicRows = useMemo(() => {
    const lists = channelData?.playlists ?? [];
    return expectedTopicPlaylistTitles().map((title) => {
      const p = lists.find((pl) => titleMatchesPlaylist(title, pl.title));
      return {
        name: title.replace(/^EGGS\s+/i, '').trim(),
        count: p?.itemCount ?? 0,
      };
    });
  }, [channelData?.playlists]);

  /** One-line brand voice for the black strip (same idea as the old hero subtitle, tightened). */
  const BRAND_POSITIONING_LINE =
    'Conversations on creativity, entrepreneurship, branding, and the people behind interesting work.';

  return (
    <>
      {/*
        ---------------------------------------------------------------------------
        Orange hero — exactly **one viewport tall** (`100dvh`) from the top of the page so the
        black brand strip sits **just below the fold**. `pt-16` matches the fixed header (`min-h-16`).
        Content is vertically centered in the space under the nav; `overflow-y-auto` avoids clipping
        on very small screens if the episode title + CTAs are unusually tall.
        ---------------------------------------------------------------------------
      */}
      <section
        id="home-hero"
        className="relative flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-auto bg-accent text-white pt-16 scroll-mt-16 xl:scroll-mt-24"
      >
        {/* Very light highlight so the orange field doesn’t read as flat paint */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 0%, rgb(255 255 255 / 0.35), transparent 55%), radial-gradient(circle at 90% 80%, rgb(0 0 0 / 0.06), transparent 45%)',
          }}
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center max-w-[1400px] w-full mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/*
              Eyebrow treatment (like episode / archive labels), reversed: small caps, wide tracking,
              sans — white on orange instead of accent on a light background.
            */}
            <p className="text-[0.65rem] sm:text-xs md:text-sm font-medium font-sans text-white tracking-wide sm:tracking-wider uppercase mb-6 sm:mb-8">
              Presented by{' '}
              <a
                href="https://taelor.style"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Taelor Style
              </a>
            </p>

            {loading && (
              <p className="text-base sm:text-lg text-white/90 mb-6">Loading the latest episode from the feed…</p>
            )}
            {error && (
              <p className="text-base sm:text-lg text-white/90 mb-6">
                Couldn&apos;t load episodes.{' '}
                <Link to="/episodes" className="text-black underline underline-offset-4 decoration-white/80 hover:decoration-white">
                  Browse the archive
                </Link>
              </p>
            )}
            {!loading && !error && !latest && (
              <p className="text-base sm:text-lg text-white/90 mb-6">
                No episodes in the feed yet.{' '}
                <Link to="/episodes" className="text-black underline underline-offset-4 decoration-white/80 hover:decoration-white">
                  Open the archive
                </Link>
              </p>
            )}

            {latest && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 lg:items-center">
                {/*
                  First column on mobile = reading order: title → summary → episode meta → CTAs.
                  Second column = large art. On large screens: text left, art right (same DOM order).
                */}
                <div className="min-w-0">
                  <h2
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight text-white mb-4 sm:mb-5 break-words"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    {latest.title}
                  </h2>

                  <p className="text-base sm:text-lg text-white/90 leading-relaxed mb-5 sm:mb-6 max-w-xl">
                    {latest.summary?.trim() || 'Open the episode for full show notes.'}
                  </p>

                  {/*
                    Eyebrow-style meta (same idea as `EpisodeDetail` + archive cards): small caps line,
                    wide tracking, sans for contrast with the display title — black on orange for readability.
                  */}
                  <p className="text-[0.65rem] sm:text-xs md:text-sm font-medium font-sans text-black tracking-wide sm:tracking-wider break-words leading-snug mb-8">
                    {`Episode ${latest.episodeNumber ?? '—'} • ${format(new Date(latest.publishedAt), 'MMMM d, yyyy')} • ${formatDurationLabel(latest.duration)}`.toUpperCase()}
                  </p>

                  {/*
                    CTAs reuse the same rules as before: internal “Show Details”, outbound YouTube when we
                    have a match, Spotify when the RSS row includes `spotifyUrl` (Anchor link field).
                  */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                    <Link
                      to={episodePathFromSlug(latest.slug)}
                      className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto border-2 border-transparent bg-black text-white px-6 sm:px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity text-center"
                    >
                      Show Details
                    </Link>
                    {latest.youtubeUrl && latest.youtubeVideoId ? (
                      <a
                        href={latest.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto border-2 border-white text-white px-6 sm:px-8 py-3.5 text-sm font-medium hover:bg-white hover:text-accent transition-all text-center"
                      >
                        Watch on YouTube
                      </a>
                    ) : (
                      <span
                        className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto border-2 border-white/35 text-white/50 px-6 sm:px-8 py-3.5 text-sm font-medium cursor-default text-center"
                        title="No matching YouTube video found for this episode"
                      >
                        Watch on YouTube
                      </span>
                    )}
                    {latest.spotifyUrl ? (
                      <a
                        href={latest.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto bg-white text-black px-6 sm:px-8 py-3.5 text-sm font-medium hover:bg-white/90 transition-colors text-center"
                      >
                        Listen on Spotify
                      </a>
                    ) : (
                      <span
                        className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto bg-white/25 text-white/60 px-6 sm:px-8 py-3.5 text-sm font-medium cursor-default text-center"
                        title="No Spotify link on this RSS item"
                      >
                        Listen on Spotify
                      </span>
                    )}
                  </div>
                </div>

                {/* Large 16:9 art — same PreferredYoutubeImageSlot + await contract as the old “Latest” block */}
                <div className="min-w-0">
                  <Link to={episodePathFromSlug(latest.slug)} className="block group">
                    <div className="aspect-video rounded-sm overflow-hidden relative bg-black/20 ring-1 ring-black/10 shadow-lg">
                      <PreferredYoutubeImageSlot
                        key={latest.slug}
                        resetKey={latest.slug}
                        rssImage={latest.image}
                        youtubeVideoId={latest.youtubeVideoId}
                        youtubeThumbnailPreferred={latest.youtubeThumbnail}
                        awaitYoutubeOverlay={awaitYoutubeOverlay}
                        imageClassName="transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70 sm:opacity-50 group-hover:opacity-80 transition-opacity" />
                      <div className="absolute inset-0 z-[15] flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center pointer-events-auto shadow-md">
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-accent ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/*
          Scroll affordance (same visual language as the old full-screen hero): subtle “mouse” outline
          with a bobbing dot; button scrolls the black brand strip into view.
        */}
        <motion.div
          className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 sm:bottom-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
        >
          <button
            type="button"
            className="flex flex-col items-center rounded-full p-1 text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
            aria-label="Scroll down to continue"
            onClick={() => document.getElementById('home-brand')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            >
              <div className="w-6 h-10 border-2 border-current rounded-full flex items-start justify-center p-2">
                <div className="w-1 h-2 bg-current rounded-full" aria-hidden />
              </div>
            </motion.div>
          </button>
        </motion.div>
      </section>

      {/*
        ---------------------------------------------------------------------------
        Black brand strip — one sentence; carries the positioning the old hero body copy did.
        ---------------------------------------------------------------------------
      */}
      <section
        id="home-brand"
        className="bg-black text-white py-10 sm:py-14 md:py-16 scroll-mt-16 xl:scroll-mt-24"
        aria-label="About the show"
      >
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center min-w-0">
          <p
            className="text-lg sm:text-xl md:text-2xl leading-snug sm:leading-relaxed text-white/95 tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {BRAND_POSITIONING_LINE}
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-24 md:py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <motion.h2
            className="text-3xl sm:text-5xl md:text-6xl mb-8 sm:mb-16 md:mb-20"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            Featured Conversations
          </motion.h2>

          {featuredList.length === 0 && !loading && !error && (
            <p className="text-muted-foreground mb-8">More episodes will appear here once the feed loads.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {featuredList.map((ep, index) => {
              const num = ep.episodeNumber !== undefined ? String(ep.episodeNumber) : ep.id.slice(0, 8);
              const dateLabel = format(new Date(ep.publishedAt), 'MMMM d, yyyy');
              const durationLabel = formatDurationLabel(ep.duration);
              const episodeNumForEyebrow = ep.episodeNumber !== undefined ? String(ep.episodeNumber) : '—';
              const cardEyebrow = `EPISODE ${episodeNumForEyebrow} • ${dateLabel} • ${durationLabel}`.toUpperCase();
              return (
                <Link key={ep.id} to={episodePathFromSlug(ep.slug)} className="group block">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true, margin: '-100px' }}
                  >
                    <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                    <PreferredYoutubeImageSlot
                      key={ep.slug}
                      resetKey={ep.slug}
                      rssImage={ep.image}
                      youtubeVideoId={ep.youtubeVideoId}
                      youtubeThumbnailPreferred={ep.youtubeThumbnail}
                      awaitYoutubeOverlay={awaitYoutubeOverlay}
                      imageClassName="group-hover:scale-105 transition-transform duration-500"
                    />
                      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 z-[6] p-4 sm:p-6 flex items-end justify-between pointer-events-none">
                        <div className="w-12 h-12 bg-accent/0 group-hover:bg-accent rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto">
                          <svg
                            className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <span
                          className="text-3xl sm:text-5xl text-white/20 group-hover:text-white/30 transition-all tabular-nums"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {num}
                        </span>
                      </div>
                    </div>
                    <p className="text-[0.65rem] sm:text-xs text-accent font-medium mb-3 tracking-wide sm:tracking-wider break-words leading-snug">
                      {cardEyebrow}
                    </p>
                    <h3
                      className="text-lg sm:text-xl mb-3 leading-snug group-hover:text-accent transition-colors line-clamp-3 md:line-clamp-none"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                    >
                      {ep.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{ep.guest?.trim() ?? ''}</p>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Link
              to="/episodes"
              className="inline-flex justify-center items-center min-h-12 w-full sm:w-auto border border-foreground px-8 py-3.5 sm:py-4 text-sm sm:text-base font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              Browse All Episodes
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[min(100vw,600px)] h-[min(100vw,600px)] max-w-full bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2
                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl mb-5 sm:mb-8 leading-tight"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Explore by Topic
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-12 leading-relaxed">
                Dive into conversations organized around the themes that matter most to creative professionals and entrepreneurs.
              </p>
              <div className="w-24 h-1 bg-accent" />
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: '-100px' }}
            >
              {topicRows.map((topic, index) => (
                <motion.button
                  key={topic.name}
                  type="button"
                  className="text-left min-h-[3.5rem] sm:min-h-[4.5rem] p-4 sm:p-8 border-2 border-border hover:border-accent hover:bg-accent/5 transition-all duration-300 group relative overflow-hidden"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-lg font-medium group-hover:text-accent transition-colors relative z-10">
                      {topic.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {topic.count} {topic.count === 1 ? 'episode' : 'episodes'} in playlist
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-24 md:py-32 bg-foreground text-background">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-6"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Never Miss an Episode
            </h2>
            <p className="text-base sm:text-lg md:text-xl opacity-70 mb-8 sm:mb-12 leading-relaxed max-w-xl mx-auto">
              Get episode updates, key insights, and exclusive content delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 min-h-12 px-4 sm:px-6 py-3 sm:py-4 bg-background text-foreground border border-background/20 focus:outline-none focus:border-accent text-base w-full"
              />
              <button
                type="button"
                className="min-h-12 bg-accent text-accent-foreground px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 w-full sm:w-auto"
              >
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-24 md:py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
            <Link to="/be-a-guest" className="block">
              <motion.div
                className="p-6 sm:p-12 md:p-16 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div
                  className="absolute top-6 right-4 sm:top-8 sm:right-8 text-6xl sm:text-7xl md:text-8xl text-accent/10 group-hover:text-accent/20 transition-all group-hover:rotate-12"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                >
                  !
                </div>
                <h3
                  className="text-2xl sm:text-4xl md:text-5xl mb-3 sm:mb-6 relative z-10 pr-14 sm:pr-16"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  Be a Guest
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 leading-relaxed relative z-10">
                  Share your story and expertise with our community of creative professionals.
                </p>
                <span className="text-accent font-medium inline-flex items-center gap-2 text-lg relative z-10 group-hover:gap-4 transition-all">
                  Apply Now
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </motion.div>
            </Link>

            <Link to="/sponsor" className="block">
              <motion.div
                className="p-6 sm:p-12 md:p-16 bg-accent text-white relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div
                  className="absolute top-6 right-4 sm:top-8 sm:right-8 text-6xl sm:text-7xl md:text-8xl text-white/10 group-hover:text-white/20 transition-all group-hover:-rotate-12"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                >
                  $
                </div>
                <h3
                  className="text-2xl sm:text-4xl md:text-5xl mb-3 sm:mb-6 relative z-10 pr-14 sm:pr-16"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  Sponsor the Show
                </h3>
                <p className="text-base sm:text-lg text-white/90 mb-8 sm:mb-10 leading-relaxed relative z-10">
                  Reach an engaged audience of entrepreneurs, creatives, and decision-makers.
                </p>
                <span className="text-white font-medium inline-flex items-center gap-2 text-lg relative z-10 group-hover:gap-4 transition-all">
                  Learn More
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </motion.div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
