import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { ARCHIVE_INITIAL_PAGE_SIZE, ARCHIVE_LOAD_MORE_SIZE } from '../config/archiveUi';
import { clearRssEpisodesCache, useRssEpisodes } from '../hooks/useRssEpisodes';
import { useYoutubeArchiveBatchOverlays } from '../hooks/useYoutubeArchiveBatchOverlays';
import { useYoutubeLiteChannelData } from '../hooks/useYoutubeLiteChannelData';
import { useYoutubeChannelData } from '../hooks/useYoutubeChannelData';
import { clearYoutubeChannelCache, mergeYoutubeCatalogForMatching } from '../lib/youtubeChannelCache';
import { episodePathFromSlug } from '../episodePaths';
import { resolvePodcastRssUrl, stripHtmlTags } from '../lib/rss';
import { mergeEpisodeForDisplay } from '../types/youtubeOverlay';
import PreferredYoutubeImageSlot from './PreferredYoutubeImageSlot';

/** RSS items do not include iTunes-style topics yet — used for filters and labels */
const FALLBACK_TOPIC = 'Episodes';

/** Turn `<itunes:duration>` like `01:04:14` into a short human-readable label. */
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

export default function Episodes() {
  /**
   * RSS rows stay stable (`useRssEpisodes`). YouTube is merged **per slug** only for batches
   * of rows you actually see (see `useYoutubeArchiveBatchOverlays`) — no whole-archive overlay pass.
   */
  const { data: episodes, loading, error, retry: retryRss } = useRssEpisodes();
  /** Full channel (slow) — used as the catalog for matching once it exists; until then we use lite. */
  const { data: fullChannelData, retry: retryFullChannel } = useYoutubeChannelData();
  /** Lite snapshot (fast) — lets the first visible batch match YouTube before the full merge finishes. */
  const { data: liteChannelData, hasApiKey, retry: retryLiteChannel } = useYoutubeLiteChannelData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Episodes');
  const [sortBy, setSortBy] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_INITIAL_PAGE_SIZE);
  /**
   * Bumping this clears the in-memory YouTube map (used after “Try again” together with
   * clearing the network cache).
   */
  const [youtubeOverlayResetToken, setYoutubeOverlayResetToken] = useState(0);

  /** Reset paging when the user changes search / topic / sort (new result set). */
  useEffect(() => {
    setVisibleCount(ARCHIVE_INITIAL_PAGE_SIZE);
  }, [searchQuery, selectedTopic, sortBy]);

  const retryAll = () => {
    clearYoutubeChannelCache();
    clearRssEpisodesCache();
    setYoutubeOverlayResetToken((t) => t + 1);
    retryRss();
    retryLiteChannel();
    retryFullChannel();
  };

  /** Same merge rule as the homepage — one source of truth for matching rules. */
  const youtubeCatalog = mergeYoutubeCatalogForMatching(fullChannelData, liteChannelData);

  /**
   * Step 1 — sort without waiting on YouTube (featured starts as “newest” order, then we re-order below
   * once batch overlays exist so we never create a dependency cycle with the hook).
   */
  const sortedRssOnly = useMemo(() => {
    const list = [...episodes];
    if (sortBy === 'oldest') {
      list.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
    } else {
      list.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    }
    return list;
  }, [episodes, sortBy]);

  /** Step 2 — text search only (topic uses overlays in the next step so it stays honest with batched data). */
  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRssOnly;
    return sortedRssOnly.filter((episode) => {
      const haystack = [
        episode.title,
        episode.guest ?? '',
        episode.summary ?? '',
        episode.descriptionHtml ? stripHtmlTags(episode.descriptionHtml) : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedRssOnly, searchQuery]);

  /**
   * Step 3 — YouTube match **only** for the first `visibleCount` rows of **search order**
   * (not the re-ordered “featured” view). That keeps work predictable and avoids a dependency cycle:
   * we enrich in search-result order first, then re-sort for display.
   */
  const { overlayBySlug } = useYoutubeArchiveBatchOverlays({
    filteredEpisodes: searchFiltered,
    visibleCount,
    catalog: youtubeCatalog,
    resetToken: youtubeOverlayResetToken,
  });

  /** Step 4 — “Featured” re-orders the search list using batch overlays (runs after step 3). */
  const sortedDisplay = useMemo(() => {
    if (sortBy !== 'featured') return searchFiltered;
    const list = [...searchFiltered];
    list.sort((a, b) => {
      const fa = !!mergeEpisodeForDisplay(a, overlayBySlug[a.slug] ?? null).featured;
      const fb = !!mergeEpisodeForDisplay(b, overlayBySlug[b.slug] ?? null).featured;
      return Number(fb) - Number(fa) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
    return list;
  }, [searchFiltered, sortBy, overlayBySlug]);

  /** Step 5 — topic pill filter (YouTube collections only count after that slug has been batch-enriched). */
  const topicFiltered = useMemo(() => {
    if (selectedTopic === 'All Episodes') return sortedDisplay;
    return sortedDisplay.filter((episode) => {
      const rssTopic = episode.topic ?? FALLBACK_TOPIC;
      if (rssTopic === selectedTopic) return true;
      if (!Object.prototype.hasOwnProperty.call(overlayBySlug, episode.slug)) return false;
      const merged = mergeEpisodeForDisplay(episode, overlayBySlug[episode.slug] ?? null);
      return merged.collections?.includes(selectedTopic) ?? false;
    });
  }, [sortedDisplay, selectedTopic, overlayBySlug]);

  const displayedEpisodes = useMemo(
    () => topicFiltered.slice(0, visibleCount),
    [topicFiltered, visibleCount],
  );

  /** Pills = RSS topics + any playlist names we have seen on enriched overlays (grows as you scroll / load more). */
  const topicFiltersWithYoutube = useMemo(() => {
    const unique = new Set<string>(['All Episodes']);
    for (const ep of episodes) {
      unique.add(ep.topic ?? FALLBACK_TOPIC);
    }
    for (const o of Object.values(overlayBySlug)) {
      if (!o?.collections) continue;
      for (const c of o.collections) unique.add(c);
    }
    return Array.from(unique).sort((a, b) => {
      if (a === 'All Episodes') return -1;
      if (b === 'All Episodes') return 1;
      return a.localeCompare(b);
    });
  }, [episodes, overlayBySlug]);

  /**
   * Shimmer until we have a catalog **and** this slug has been through batch matching
   * (`null` = tried, no YouTube — show RSS art).
   */
  function cardAwaitingYoutube(episodeSlug: string): boolean {
    if (!hasApiKey) return false;
    if (!youtubeCatalog) return true;
    return !Object.prototype.hasOwnProperty.call(overlayBySlug, episodeSlug);
  }

  // --- Loading / error: same shell as the archive (header band + grid width), clearer feedback ---
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <section className="pt-32 pb-12 bg-gradient-to-b from-accent/5 to-background border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="h-24 max-w-2xl bg-muted/80 rounded-sm mb-6 animate-pulse" aria-hidden />
            <div className="h-6 max-w-xl bg-muted/60 rounded-sm mb-4 animate-pulse" aria-hidden />
            <p className="text-lg text-muted-foreground">
              Downloading the podcast RSS feed and building the episode list…
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              If this hangs, open the browser devtools <strong className="font-medium text-foreground">Console</strong> and look
              for messages starting with <code className="text-xs bg-muted px-1 py-0.5 rounded">[EGGS RSS]</code>.
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="grid grid-cols-2 gap-12">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-video bg-muted animate-pulse rounded-sm" aria-hidden />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded-sm" aria-hidden />
                  <div className="h-8 w-full bg-muted/80 animate-pulse rounded-sm" aria-hidden />
                  <div className="h-4 w-[88%] bg-muted/60 animate-pulse rounded-sm" aria-hidden />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    const feedUrl = resolvePodcastRssUrl();
    return (
      <div className="min-h-screen bg-background">
        <section className="pt-32 pb-20 bg-gradient-to-b from-accent/5 to-background border-b border-border">
          <div className="max-w-[1400px] mx-auto px-6">
            <h1 className="text-4xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Couldn&apos;t load episodes
            </h1>
            <p className="text-lg text-muted-foreground mb-4 max-w-3xl leading-relaxed">{error}</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl leading-relaxed">
              The app loads this feed URL:{' '}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{feedUrl}</code>
              . In local development it is usually <code className="text-xs bg-muted px-1 py-0.5 rounded">/podcast-rss.xml</code>{' '}
              (proxied by Vite). Check the <strong className="font-medium text-foreground">Console</strong> for{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">[EGGS RSS]</code> lines for the exact failure.
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
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-8xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              All Episodes
            </h1>
            <p className="text-2xl text-muted-foreground max-w-3xl leading-relaxed">
              Browse our complete archive of conversations with creative professionals, entrepreneurs, and industry leaders.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-6">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-6">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search episodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="featured">Featured</option>
            </select>

            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {topicFiltered.length} {topicFiltered.length === 1 ? 'episode' : 'episodes'}
            </span>
          </div>
        </div>
      </section>

      {/* Topic Filters — options come from loaded data so filters stay honest */}
      <section className="py-8 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto">
            {topicFiltersWithYoutube.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-6 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                  selectedTopic === topic
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-foreground hover:bg-accent/10'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Episodes Grid */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-12">
            {displayedEpisodes.map((episode, index) => {
              const displayEp = mergeEpisodeForDisplay(episode, overlayBySlug[episode.slug] ?? null);
              const topic = displayEp.topic ?? FALLBACK_TOPIC;
              const featured = displayEp.featured ?? false;
              const cardSummary = displayEp.summary?.trim() || 'Show notes are available on the episode page.';
              const dateLabel = format(new Date(displayEp.publishedAt), 'MMMM d, yyyy');
              const durationLabel = formatDurationLabel(displayEp.duration);
              const numberLabel =
                displayEp.episodeNumber !== undefined ? String(displayEp.episodeNumber) : displayEp.id.slice(0, 8);

              return (
                <Link key={displayEp.id} to={episodePathFromSlug(displayEp.slug)} className="group block">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                      {/*
                        Card image: shimmer while YouTube data is in flight, then YouTube (fade-in)
                        or RSS if there is no match — see `PreferredYoutubeImageSlot`.
                      */}
                      <PreferredYoutubeImageSlot
                        key={displayEp.slug}
                        resetKey={displayEp.slug}
                        rssImage={episode.image}
                        youtubeVideoId={displayEp.youtubeVideoId}
                        youtubeThumbnailPreferred={displayEp.youtubeThumbnail}
                        awaitYoutubeOverlay={cardAwaitingYoutube(episode.slug)}
                        imageClassName="group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      <div className="absolute bottom-4 right-4">
                        <span
                          className="text-5xl text-white/20 group-hover:text-white/30 transition-all"
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                        >
                          {numberLabel}
                        </span>
                      </div>

                      {featured && (
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-accent text-white text-xs font-medium tracking-wider">
                            FEATURED
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-accent font-medium mb-3 tracking-wider">{topic.toUpperCase()}</p>
                      <h3
                        className="text-2xl mb-3 leading-snug group-hover:text-accent transition-colors"
                        style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                      >
                        {displayEp.title}
                      </h3>
                      <p className="text-base text-muted-foreground mb-4 leading-relaxed line-clamp-4">{cardSummary}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{dateLabel}</span>
                        <span>•</span>
                        <span>{durationLabel}</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {topicFiltered.length > 0 && visibleCount < topicFiltered.length && (
            <motion.div
              className="text-center mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + ARCHIVE_LOAD_MORE_SIZE)}
                className="border-2 border-foreground px-10 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-colors"
              >
                Load more episodes
              </button>
              <p className="text-sm text-muted-foreground mt-3">
                Showing {displayedEpisodes.length} of {topicFiltered.length} matching episodes
              </p>
            </motion.div>
          )}

          {topicFiltered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl text-muted-foreground mb-4">No episodes found</p>
              <p className="text-lg text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
