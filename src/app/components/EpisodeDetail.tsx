import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import type { Episode } from '../types/episode';
import { clearRssEpisodesCache, useRssEpisodes } from '../hooks/useRssEpisodes';
import { useYoutubeOverlaysForSlugs } from '../hooks/useYoutubeOverlaysForSlugs';
import { clearYoutubeChannelCache } from '../lib/youtubeChannelCache';
import { mergeEpisodeForDisplay } from '../types/youtubeOverlay';
import { episodePathFromSlug } from '../episodePaths';
import {
  extractApplePodcastsUrl,
  extractTakeawaysFromDescriptionHtml,
  resolvePodcastRssUrl,
  stripHtmlTags,
} from '../lib/rss';

const FALLBACK_TOPIC = 'Episodes';

/** Router already decodes params once; this safely handles odd edge cases */
function safeDecodeURIComponent(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

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

/** Plain-text from the RSS `<description>` / show notes only (never merged YouTube fields). */
function longDescriptionPlain(ep: Episode): string {
  if (!ep.descriptionHtml) return '';
  const plain = stripHtmlTags(ep.descriptionHtml).replace(/\s+/g, ' ').trim();
  return plain.length > 800 ? `${plain.slice(0, 800)}…` : plain;
}

/**
 * The RSS parser often sets `summary` from the first part of the same HTML description.
 * Without this step, “Episode Summary” would show the short summary and then repeat it
 * at the start of the longer body. We keep the RSS `summary` and only show **new** text below.
 */
function continuedDescriptionAfterRssSummary(ep: Episode): string {
  const summary = ep.summary?.trim() ?? '';
  const plain = longDescriptionPlain(ep);
  if (!summary || !plain) return plain;
  try {
    const escaped = summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const stripped = plain.replace(new RegExp(`^\\s*${escaped}\\s*`, 'i'), '').trim();
    return stripped;
  } catch {
    return plain;
  }
}

/**
 * Episode detail page (`EpisodeDetail.tsx`)
 * =========================================
 *
 * **Data source:** Stable RSS list from `useRssEpisodes()`; YouTube thumbnails / embed URL
 * are merged only for this page’s slug via `useYoutubeOverlaysForSlugs` (no whole-feed swap).
 *
 * **How lookup works (after the feed has loaded):**
 * 1. Read the `:slug` route param from the URL (React Router fills this from `/episodes/:slug`).
 * 2. Decode it safely (`safeDecodeURIComponent`) so it matches `Episode.slug` from the parser.
 * 3. Find a row where `episode.slug ===` that string **or**, for old links, where the segment
 *    is only digits and matches `episode.episodeNumber` (e.g. `/episodes/461`).
 * 4. If nothing matches → “Episode not found” (feed is OK, URL does not match any row).
 *
 * **Where slugs are generated:** `buildEpisodeSlug()` in `src/app/lib/rss.ts` when each RSS
 * `<item>` is turned into an `Episode`.
 */
export default function EpisodeDetail() {
  const { slug: slugParam } = useParams<{ slug: string }>();

  const { data: rssCatalog, loading, error, retry: retryRss } = useRssEpisodes();

  /**
   * Resolve this URL to one `Episode` row from the RSS list.
   * Runs only when `loading` is false and `error` is null so we do not flash “not found”
   * while the shared RSS request is still in flight.
   */
  const episode = useMemo(() => {
    if (loading || error) return null;
    const raw = slugParam ? safeDecodeURIComponent(slugParam) : '';
    const bySlug = rssCatalog.find((e) => e.slug === raw);
    const byNumber =
      /^\d+$/.test(raw) === true
        ? rssCatalog.find((e) => e.episodeNumber === Number.parseInt(raw, 10))
        : undefined;
    return bySlug ?? byNumber ?? null;
  }, [rssCatalog, loading, error, slugParam]);

  const takeaways = useMemo(
    () => extractTakeawaysFromDescriptionHtml(episode?.descriptionHtml ?? '') ?? [],
    [episode?.descriptionHtml],
  );

  // Prefer the next three older episodes in publish order; if we’re at the end of the list, show any other recent ones
  const related = useMemo(() => {
    if (!episode || rssCatalog.length === 0) return [];
    const sorted = [...rssCatalog].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    const idx = sorted.findIndex((e) => e.id === episode.id);
    const older = idx >= 0 ? sorted.slice(idx + 1, idx + 4) : [];
    if (older.length > 0) return older;
    return sorted.filter((e) => e.id !== episode.id).slice(0, 3);
  }, [rssCatalog, episode]);

  const overlaySlugs = useMemo(() => {
    const u = new Set<string>();
    if (episode) u.add(episode.slug);
    related.forEach((r) => u.add(r.slug));
    return [...u];
  }, [episode, related]);

  const { overlays, retryChannel } = useYoutubeOverlaysForSlugs(
    rssCatalog.length ? rssCatalog : null,
    overlaySlugs,
  );

  const retryAll = () => {
    clearYoutubeChannelCache();
    clearRssEpisodesCache();
    retryRss();
    retryChannel();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <section className="py-16 bg-gradient-to-b from-accent/5 to-background border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="h-4 w-40 bg-muted animate-pulse rounded-sm mb-8" aria-hidden />
            <div className="h-16 max-w-4xl bg-muted/80 animate-pulse rounded-sm mb-6" aria-hidden />
            <div className="h-4 w-64 bg-muted/60 animate-pulse rounded-sm mb-4" aria-hidden />
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Loading the episode list from the podcast feed, then matching this page&apos;s URL to an episode…
            </p>
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
              Stuck here? Open the <strong className="font-medium text-foreground">Console</strong> and search for{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">[EGGS RSS]</code>.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    const feedUrl = resolvePodcastRssUrl();
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-[1400px] mx-auto px-6 py-16">
          <h1 className="text-4xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Couldn&apos;t load episode data
          </h1>
          <p className="text-lg text-muted-foreground mb-4 max-w-3xl leading-relaxed">{error}</p>
          <p className="text-sm text-muted-foreground mb-8 max-w-3xl leading-relaxed">
            Feed URL in use: <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{feedUrl}</code>. See the
            Console for <code className="text-xs bg-muted px-1 py-0.5 rounded">[EGGS RSS]</code> messages.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => retryAll()}
              className="border-2 border-foreground px-6 py-3 text-sm font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="border-2 border-border px-6 py-3 text-sm font-medium hover:border-foreground transition-colors"
            >
              Reload page
            </button>
            <Link
              to="/episodes"
              className="inline-flex items-center border-2 border-border px-6 py-3 text-sm font-medium hover:border-foreground transition-colors"
            >
              Back to Episodes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!episode) {
    const attempted = slugParam ? safeDecodeURIComponent(slugParam) : '(no slug in URL)';
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="max-w-[1400px] mx-auto px-6 py-16">
          <h1 className="text-4xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Episode not found
          </h1>
          <p className="text-lg text-muted-foreground mb-4 max-w-3xl leading-relaxed">
            The feed loaded, but no episode matched this address. The slug may have changed after a title update, or the
            link may be wrong.
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Looked for slug or episode number:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{attempted}</code>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Tip: open the <Link to="/episodes">archive</Link> and click an episode to get a fresh URL.
          </p>
          <Link
            to="/episodes"
            className="inline-flex items-center bg-accent text-accent-foreground px-8 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Back to Episodes
          </Link>
        </div>
      </div>
    );
  }

  /** RSS fields + optional YouTube overlay for this slug only (no whole-catalog swap). */
  const ep = mergeEpisodeForDisplay(episode, overlays[episode.slug] ?? null);

  const topicLabel = ep.topic ?? FALLBACK_TOPIC;
  const displayNum = ep.episodeNumber ?? '—';
  const dateStr = format(new Date(ep.publishedAt), 'MMMM d, yyyy');
  const durationStr = formatDurationLabel(ep.duration);
  /** Short blurb always comes from the RSS row — not from any YouTube merge (there is no YouTube summary field, but this makes the rule obvious for readers of the code). */
  const summaryText =
    episode.summary?.trim() || 'No short summary was extracted for this episode.';
  /** Longer copy is still from RSS show notes, with the short summary stripped when it would duplicate. */
  const overviewText = continuedDescriptionAfterRssSummary(episode);
  const chapters = ep.chapters ?? [];
  const guestName = ep.guest?.trim();
  const heroImageUrl = ep.youtubeThumbnail ?? ep.image;
  /** Prefer the Data API embed URL; fall back to building from `youtubeVideoId` when needed */
  const youtubeEmbedSrc =
    ep.youtubeEmbedUrl?.trim() || (ep.youtubeVideoId ? `https://www.youtube.com/embed/${ep.youtubeVideoId}` : '');
  const hasYoutubePlayer = youtubeEmbedSrc.length > 0;
  /** Watch link on YouTube (new tab) — same tab as “open in YouTube app” behavior */
  const youtubeWatchHref = ep.youtubeUrl?.trim();

  // Extra listen links parsed from show notes when the feed doesn’t expose them as separate fields
  const appleUrl = extractApplePodcastsUrl(ep.descriptionHtml);

  return (
    <div className="min-h-screen bg-background pt-16">
      <section className="py-16 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground mb-8">
              <Link to="/episodes" className="hover:text-foreground transition-colors">
                ← Back to Episodes
              </Link>
              <span>/</span>
              <span>Episode {displayNum}</span>
            </div>

            <div className="mb-8">
              <p className="text-sm text-accent font-medium mb-4 tracking-wider">
                EPISODE {displayNum} • {topicLabel.toUpperCase()}
              </p>
              <h1 className="text-7xl mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {ep.title}
              </h1>
              <div className="flex items-center gap-6 text-base text-muted-foreground">
                <span>{dateStr}</span>
                <span>•</span>
                <span>{durationStr}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="max-w-[1200px] mx-auto px-6">
          {/*
            Primary media: YouTube embed when we have a video id / embed URL.
            We do **not** use the big play button for the RSS MP3 anymore — that looked like a video
            but opened a raw audio file. Podcast audio lives in the native player below when there is no YouTube match.
          */}
          {hasYoutubePlayer ? (
            <motion.div
              className="aspect-video w-full rounded-sm overflow-hidden border border-border bg-black"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <iframe
                src={youtubeEmbedSrc}
                title="Episode video on YouTube"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </motion.div>
          ) : youtubeWatchHref ? (
            <motion.a
              href={youtubeWatchHref}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 rounded-sm overflow-hidden relative group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Watch this episode on YouTube"
            >
              {heroImageUrl ? (
                <img src={heroImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-muted" aria-hidden />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-24 h-24 bg-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </div>
              <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-white/90 font-medium drop-shadow-md">
                Opens on YouTube — watch in the browser or the YouTube app
              </p>
            </motion.a>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 rounded-sm overflow-hidden relative"
            >
              {heroImageUrl ? (
                <img src={heroImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" aria-hidden />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          )}

          {!hasYoutubePlayer && ep.audioUrl ? (
            <motion.div
              className="mt-6 p-4 rounded-sm border border-border bg-muted/20"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
            >
              <p className="text-sm text-muted-foreground mb-3">Podcast audio (RSS feed)</p>
              <audio controls className="w-full" preload="metadata">
                <source src={ep.audioUrl} />
                Your browser does not support embedded audio. You can still use Spotify or the direct file link from your host.
              </audio>
            </motion.div>
          ) : null}

          <motion.div
            className="flex flex-col items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-4 flex-wrap">
            {ep.spotifyUrl ? (
              <a
                href={ep.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent text-accent-foreground px-8 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Listen on Spotify
              </a>
            ) : (
              <button
                type="button"
                className="bg-accent text-accent-foreground px-8 py-4 text-sm font-medium opacity-50 cursor-not-allowed"
                disabled
              >
                Listen on Spotify
              </button>
            )}
            {appleUrl ? (
              <a
                href={appleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-border px-8 py-4 text-sm font-medium hover:border-foreground transition-colors"
              >
                Apple Podcasts
              </a>
            ) : (
              <button
                type="button"
                className="border-2 border-border px-8 py-4 text-sm font-medium opacity-50 cursor-not-allowed"
                disabled
              >
                Apple Podcasts
              </button>
            )}
            {ep.youtubeUrl ? (
              <a
                href={ep.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-border px-8 py-4 text-sm font-medium hover:border-foreground transition-colors"
              >
                Watch on YouTube
              </a>
            ) : (
              <button
                type="button"
                className="border-2 border-border px-8 py-4 text-sm font-medium opacity-50 cursor-not-allowed"
                disabled
              >
                Watch on YouTube
              </button>
            )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-16">
            <div className="col-span-2">
              <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
              >
                <h2 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Episode Summary
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">{summaryText}</p>
                {overviewText ? (
                  <p className="text-lg text-muted-foreground leading-relaxed">{overviewText}</p>
                ) : null}
              </motion.div>

              {takeaways.length > 0 ? (
                <motion.div
                  className="mb-16 p-10 bg-accent/5 border-l-4 border-accent"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true, margin: '-100px' }}
                >
                  <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    Key Takeaways
                  </h2>
                  <ul className="space-y-4">
                    {takeaways.map((takeaway, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-lg leading-relaxed">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}

              {chapters.length > 0 ? (
                <motion.div
                  className="mb-16"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true, margin: '-100px' }}
                >
                  <h2 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    Chapters
                  </h2>
                  <div className="space-y-3">
                    {chapters.map((chapter, index) => (
                      <button
                        key={`${chapter.time}-${index}`}
                        type="button"
                        className="w-full flex items-center gap-6 p-5 bg-muted hover:bg-accent/5 transition-colors text-left group"
                      >
                        <span className="text-sm font-medium text-accent min-w-[4rem]">{chapter.time}</span>
                        <span className="text-base group-hover:text-accent transition-colors">{chapter.title}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {ep.transcript ? (
                <motion.div
                  className="mb-16"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true, margin: '-100px' }}
                >
                  <h2 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    Transcript
                  </h2>
                  <div className="p-8 bg-muted/50 border border-border">
                    <p className="text-base text-muted-foreground leading-loose whitespace-pre-line font-mono">
                      {ep.transcript}
                    </p>
                    <button type="button" className="mt-6 text-accent font-medium hover:underline">
                      Read Full Transcript →
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </div>

            <div className="col-span-1">
              <motion.div
                className="mb-12 p-8 bg-muted/30 border border-border"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
              >
                <h3 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {guestName ? `About ${guestName}` : 'About this episode'}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{summaryText}</p>
                {ep.spotifyUrl ? (
                  <a
                    href={ep.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    Episode on Spotify
                  </a>
                ) : null}
              </motion.div>

              <motion.div
                className="mb-12 p-8 bg-foreground text-background"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: '-100px' }}
              >
                <h3 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Never Miss an Episode
                </h3>
                <p className="text-sm opacity-80 mb-6 leading-relaxed">
                  Get new episodes delivered to your inbox every week.
                </p>
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full px-4 py-3 bg-background text-foreground mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  className="w-full bg-accent text-accent-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Subscribe
                </button>
              </motion.div>

              <motion.div
                className="mb-12"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: '-100px' }}
              >
                <h3 className="text-lg mb-4 font-medium">Share This Episode</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium"
                  >
                    Twitter
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium"
                  >
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="py-20 bg-muted/30">
          <div className="max-w-[1400px] mx-auto px-6">
            <motion.h2
              className="text-5xl mb-12"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: '-100px' }}
            >
              Related Episodes
            </motion.h2>

            <div className="grid grid-cols-3 gap-8">
              {related.map((rel, index) => {
                const relDisplay = mergeEpisodeForDisplay(rel, overlays[rel.slug] ?? null);
                const relTopic = relDisplay.topic ?? FALLBACK_TOPIC;
                const relNum =
                  relDisplay.episodeNumber !== undefined
                    ? String(relDisplay.episodeNumber)
                    : relDisplay.id.slice(0, 8);
                const relImg = relDisplay.youtubeThumbnail ?? relDisplay.image;
                return (
                  <Link key={relDisplay.id} to={episodePathFromSlug(relDisplay.slug)} className="group block">
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true, margin: '-100px' }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-4 relative overflow-hidden">
                        {relImg ? (
                          <img
                            src={relImg}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" aria-hidden />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                        <div className="absolute bottom-4 right-4">
                          <span
                            className="text-4xl text-white/20 group-hover:text-white/30 transition-all"
                            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                          >
                            {relNum}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-accent font-medium mb-2 tracking-wider">{relTopic.toUpperCase()}</p>
                      <h3
                        className="text-lg mb-2 leading-snug group-hover:text-accent transition-colors"
                        style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                      >
                        {relDisplay.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{relDisplay.guest?.trim() ?? ''}</p>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-20 bg-background">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-8">
            <Link to="/be-a-guest" className="block">
              <motion.div
                className="p-12 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <h3 className="text-4xl mb-4 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Be a Guest
                </h3>
                <p className="text-base text-muted-foreground mb-8 leading-relaxed relative z-10">
                  Share your story with our audience.
                </p>
                <span className="text-accent font-medium inline-flex items-center gap-2 relative z-10">
                  Apply Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </motion.div>
            </Link>

            <Link to="/sponsor" className="block">
              <motion.div
                className="p-12 bg-accent text-white relative overflow-hidden group cursor-pointer h-full"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: '-100px' }}
                whileHover={{ y: -8 }}
              >
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <h3 className="text-4xl mb-4 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Sponsor the Show
                </h3>
                <p className="text-base text-white/90 mb-8 leading-relaxed relative z-10">
                  Reach our engaged audience.
                </p>
                <span className="text-white font-medium inline-flex items-center gap-2 relative z-10">
                  Learn More
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </motion.div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
