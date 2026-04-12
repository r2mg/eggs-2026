/**
 * Home page — RSS list from `useRssEpisodes()` (stable). YouTube enrichment uses the **same**
 * matching rules as the archive (`buildYoutubeOverlaysForEpisodes` + merged catalog), but
 * loads the **lite** snapshot first, then layers in the **full** channel when available
 * (shared global cache — often free if you already visited the archive this session).
 */
import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, useScroll, useTransform } from 'motion/react';
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

const FALLBACK_TOPIC = 'Episodes';

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
  const heroRef = useRef<HTMLDivElement>(null);
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

  /** Only compute YouTube overlays for the hero + featured cards (not the whole archive). */
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

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const listenHref = latestBase ? episodePathFromSlug(latestBase.slug) : '/episodes';

  return (
    <>
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-accent">
        <motion.div className="absolute inset-0" style={{ y: backgroundY }}>
          <div className="absolute inset-0 bg-accent/90 z-10" />
          <img
            src="https://images.unsplash.com/photo-1632800237110-f9c87acc2222?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </motion.div>

        <div className="absolute inset-0 z-10 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-40 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-20 h-full max-w-[1400px] mx-auto px-6 flex items-center">
          <motion.div style={{ y: textY, opacity }} className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-sm tracking-widest text-white/70 mb-4 uppercase">Presented by Taelor Style</p>
              <h1
                className="text-[10rem] leading-[0.85] mb-8 text-white"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              >
                EGGS!
              </h1>
              <p className="text-2xl text-white/90 mb-10 max-w-lg leading-relaxed">
                Conversations around creativity, entrepreneurship, branding, and the people behind interesting work.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  to={listenHref}
                  className="inline-block bg-foreground text-background px-8 py-4 text-base font-medium hover:bg-foreground/90 transition-all"
                >
                  Listen Now
                </Link>
                {latest?.youtubeUrl && latest.youtubeVideoId ? (
                  <a
                    href={latest.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-white text-white px-8 py-4 text-base font-medium hover:bg-white hover:text-accent transition-all"
                  >
                    Watch on YouTube
                  </a>
                ) : (
                  <span
                    className="inline-block border-2 border-white/40 text-white/60 px-8 py-4 text-base font-medium cursor-default"
                    title="No matching YouTube video found (show notes or playlist)"
                  >
                    Watch on YouTube
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
          style={{ opacity }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white rounded-full" />
          </div>
        </motion.div>
      </section>

      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="flex items-end justify-between mb-12">
              <h2 className="text-6xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Latest Episode
              </h2>
              <span className="text-7xl text-accent/10" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {latest?.episodeNumber ?? (loading ? '…' : '—')}
              </span>
            </div>

            {loading && (
              <p className="text-lg text-muted-foreground mb-8">Loading the latest episode from the feed…</p>
            )}
            {error && (
              <p className="text-lg text-muted-foreground mb-8">
                Couldn&apos;t load episodes.{' '}
                <Link to="/episodes" className="text-accent underline">
                  Browse the archive
                </Link>
              </p>
            )}
            {!loading && !error && !latest && (
              <p className="text-lg text-muted-foreground mb-8">
                No episodes in the feed yet.{' '}
                <Link to="/episodes" className="text-accent underline">
                  Open the archive
                </Link>
              </p>
            )}

            {latest && (
              <div className="grid grid-cols-2 gap-12 items-start">
                <Link to={episodePathFromSlug(latest.slug)} className="block">
                  <motion.div
                    className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 rounded-sm overflow-hidden relative group cursor-pointer"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PreferredYoutubeImageSlot
                      key={latest.slug}
                      resetKey={latest.slug}
                      rssImage={latest.image}
                      youtubeVideoId={latest.youtubeVideoId}
                      youtubeThumbnailPreferred={latest.youtubeThumbnail}
                      awaitYoutubeOverlay={awaitYoutubeOverlay}
                      imageClassName=""
                    />
                    <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 z-[15] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center pointer-events-auto">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <div>
                  <p className="text-sm text-accent font-medium mb-4 tracking-wider">
                    EPISODE {latest.episodeNumber ?? '—'} • LATEST
                  </p>
                  <h3 className="text-4xl mb-5 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {latest.title}
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {latest.summary?.trim() || 'Open the episode for full show notes.'}
                  </p>
                  <div className="flex items-center gap-6 mb-8 text-sm text-muted-foreground">
                    <span>{format(new Date(latest.publishedAt), 'MMMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{formatDurationLabel(latest.duration)}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Link
                      to={episodePathFromSlug(latest.slug)}
                      className="inline-block bg-accent text-accent-foreground px-8 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Listen Now
                    </Link>
                    {latest.youtubeUrl && latest.youtubeVideoId ? (
                      <a
                        href={latest.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border-2 border-foreground px-8 py-4 text-sm font-medium hover:bg-foreground hover:text-background transition-all"
                      >
                        Watch on YouTube
                      </a>
                    ) : (
                      <span
                        className="inline-block border-2 border-border px-8 py-4 text-sm font-medium text-muted-foreground cursor-default"
                        title="No matching YouTube video found for this episode"
                      >
                        Watch on YouTube
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.h2
            className="text-6xl mb-20"
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

          <div className="grid grid-cols-3 gap-8">
            {featuredList.map((ep, index) => {
              const topic = ep.topic ?? FALLBACK_TOPIC;
              const num = ep.episodeNumber !== undefined ? String(ep.episodeNumber) : ep.id.slice(0, 8);
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
                      <div className="absolute bottom-0 left-0 right-0 z-[6] p-6 flex items-end justify-between pointer-events-none">
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
                          className="text-5xl text-white/20 group-hover:text-white/30 transition-all"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {num}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-accent font-medium mb-2 tracking-wider">{topic.toUpperCase()}</p>
                    <h3
                      className="text-xl mb-2 leading-snug group-hover:text-accent transition-colors"
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
              className="inline-block border border-foreground px-8 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              Browse All Episodes
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-32 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: '-100px' }}
            >
              <h2 className="text-7xl mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Explore by Topic
              </h2>
              <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
                Dive into conversations organized around the themes that matter most to creative professionals and entrepreneurs.
              </p>
              <div className="w-24 h-1 bg-accent" />
            </motion.div>

            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: '-100px' }}
            >
              {topicRows.map((topic, index) => (
                <motion.button
                  key={topic.name}
                  type="button"
                  className="text-left p-8 border-2 border-border hover:border-accent hover:bg-accent/5 transition-all duration-300 group relative overflow-hidden"
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

      <section className="py-32 bg-foreground text-background">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-6xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Never Miss an Episode
            </h2>
            <p className="text-xl opacity-70 mb-12 leading-relaxed">
              Get episode updates, key insights, and exclusive content delivered to your inbox.
            </p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 bg-background text-foreground border border-background/20 focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                className="bg-accent text-accent-foreground px-8 py-4 font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-8">
            <Link to="/be-a-guest" className="block">
              <motion.div
                className="p-16 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div
                  className="absolute top-8 right-8 text-8xl text-accent/10 group-hover:text-accent/20 transition-all group-hover:rotate-12"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                >
                  !
                </div>
                <h3 className="text-5xl mb-6 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Be a Guest
                </h3>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed relative z-10">
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
                className="p-16 bg-accent text-white relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div
                  className="absolute top-8 right-8 text-8xl text-white/10 group-hover:text-white/20 transition-all group-hover:-rotate-12"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                >
                  $
                </div>
                <h3 className="text-5xl mb-6 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Sponsor the Show
                </h3>
                <p className="text-lg text-white/90 mb-10 leading-relaxed relative z-10">
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
