import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { ARCHIVE_INITIAL_PAGE_SIZE, ARCHIVE_LOAD_MORE_SIZE } from '../config/archiveUi';
import { clearRssEpisodesCache, useRssEpisodes } from '../hooks/useRssEpisodes';
import { useYoutubeChannelData } from '../hooks/useYoutubeChannelData';
import { useYoutubeOverlaysProgressive } from '../hooks/useYoutubeOverlaysProgressive';
import { buildYoutubeOverlaysForEpisodes } from '../lib/computeEpisodeYoutubeOverlay';
import { clearYoutubeChannelCache } from '../lib/youtubeChannelCache';
import { episodePathFromSlug } from '../episodePaths';
import { resolvePodcastRssUrl, stripHtmlTags } from '../lib/rss';
import { mergeEpisodeForDisplay } from '../types/youtubeOverlay';

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
   * RSS rows stay stable (`useRssEpisodes`). YouTube thumbnails / “featured” / topic tags
   * arrive in overlay maps so the grid is not replaced wholesale when the API returns.
   */
  const { data: episodes, loading, error, retry: retryRss } = useRssEpisodes();
  const { data: channelData, retry: retryChannel } = useYoutubeChannelData();
  const { overlays: progressiveOverlays } = useYoutubeOverlaysProgressive(
    episodes.length ? episodes : null,
    channelData,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Episodes');
  const [sortBy, setSortBy] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_INITIAL_PAGE_SIZE);

  /** Reset paging when the user changes search / topic / sort (new result set). */
  useEffect(() => {
    setVisibleCount(ARCHIVE_INITIAL_PAGE_SIZE);
  }, [searchQuery, selectedTopic, sortBy]);

  const retryAll = () => {
    clearYoutubeChannelCache();
    clearRssEpisodesCache();
    retryRss();
    retryChannel();
  };

  // Topic pills: “All Episodes” plus whatever topics appear once YouTube overlays fill in
  const topicFilters = useMemo(() => {
    const unique = new Set<string>();
    for (const ep of episodes) {
      unique.add(ep.topic ?? FALLBACK_TOPIC);
      const merged = mergeEpisodeForDisplay(ep, progressiveOverlays[ep.slug] ?? null);
      for (const c of merged.collections ?? []) unique.add(c);
    }
    return ['All Episodes', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [episodes, progressiveOverlays]);

  // Sort RSS rows (featured order uses progressive overlays when present)
  const sortedEpisodes = useMemo(() => {
    const list = [...episodes];
    if (sortBy === 'oldest') {
      list.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
    } else if (sortBy === 'featured') {
      list.sort((a, b) => {
        const fa = !!mergeEpisodeForDisplay(a, progressiveOverlays[a.slug] ?? null).featured;
        const fb = !!mergeEpisodeForDisplay(b, progressiveOverlays[b.slug] ?? null).featured;
        return Number(fb) - Number(fa) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      });
    } else {
      list.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    }
    return list;
  }, [episodes, sortBy, progressiveOverlays]);

  const filteredEpisodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedEpisodes.filter((episode) => {
      const topic = episode.topic ?? FALLBACK_TOPIC;
      const haystack = [
        episode.title,
        episode.guest ?? '',
        episode.summary ?? '',
        episode.descriptionHtml ? stripHtmlTags(episode.descriptionHtml) : '',
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const merged = mergeEpisodeForDisplay(episode, progressiveOverlays[episode.slug] ?? null);
      const matchesTopic =
        selectedTopic === 'All Episodes' ||
        topic === selectedTopic ||
        (merged.collections?.includes(selectedTopic) ?? false);
      return matchesSearch && matchesTopic;
    });
  }, [sortedEpisodes, searchQuery, selectedTopic, progressiveOverlays]);

  const displayedEpisodes = useMemo(
    () => filteredEpisodes.slice(0, visibleCount),
    [filteredEpisodes, visibleCount],
  );

  /** Prefer a direct overlay pass for the visible slice so thumbnails update quickly */
  const visibleOverlays = useMemo(() => {
    if (!channelData || displayedEpisodes.length === 0) return {};
    return buildYoutubeOverlaysForEpisodes(displayedEpisodes, channelData);
  }, [channelData, displayedEpisodes]);

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
              {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'episode' : 'episodes'}
            </span>
          </div>
        </div>
      </section>

      {/* Topic Filters — options come from loaded data so filters stay honest */}
      <section className="py-8 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto">
            {topicFilters.map((topic) => (
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
              const displayEp = mergeEpisodeForDisplay(
                episode,
                visibleOverlays[episode.slug] ?? progressiveOverlays[episode.slug] ?? null,
              );
              const topic = displayEp.topic ?? FALLBACK_TOPIC;
              const featured = displayEp.featured ?? false;
              const cardSummary = displayEp.summary?.trim() || 'Show notes are available on the episode page.';
              const dateLabel = format(new Date(displayEp.publishedAt), 'MMMM d, yyyy');
              const durationLabel = formatDurationLabel(displayEp.duration);
              const numberLabel =
                displayEp.episodeNumber !== undefined ? String(displayEp.episodeNumber) : displayEp.id.slice(0, 8);
              const imageUrl = displayEp.youtubeThumbnail ?? displayEp.image;

              return (
                <Link key={displayEp.id} to={episodePathFromSlug(displayEp.slug)} className="group block">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" aria-hidden />
                      )}
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

          {filteredEpisodes.length > 0 && visibleCount < filteredEpisodes.length && (
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
                Showing {displayedEpisodes.length} of {filteredEpisodes.length} matching episodes
              </p>
            </motion.div>
          )}

          {filteredEpisodes.length === 0 && (
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
