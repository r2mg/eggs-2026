import { useMemo, useState, useEffect } from 'react';
import { episodePath, episodeEyebrow } from '../lib/display';

/** Slim episode projection passed from the Astro page (keeps the hydration payload small). */
export interface ArchiveEpisode {
  id: string;
  slug: string;
  title: string;
  guest?: string;
  summary?: string;
  publishedAt: string;
  duration?: string;
  episodeNumber?: number;
  image?: string;
  youtubeThumbnail?: string;
  featured?: boolean;
  collections?: string[];
}

interface Props {
  episodes: ArchiveEpisode[];
  /** Topic labels (without the "EGGS " prefix) for filter pills. */
  topics: string[];
  initialPageSize?: number;
  loadMoreSize?: number;
}

const ALL = 'All Episodes';
const FEATURED = 'Featured';

function CardImage({ ep }: { ep: ArchiveEpisode }) {
  const primary = ep.youtubeThumbnail?.trim() || ep.image?.trim() || '';
  const fallback = ep.youtubeThumbnail && ep.image ? ep.image : '';
  if (!primary) {
    return <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-accent/5" aria-hidden />;
  }
  return (
    <img
      src={primary}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
      onError={(e) => {
        const img = e.currentTarget;
        if (fallback && img.src !== fallback) img.src = fallback;
      }}
    />
  );
}

export default function EpisodesArchive({ episodes, topics, initialPageSize = 16, loadMoreSize = 16 }: Props) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState(ALL);
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [visible, setVisible] = useState(initialPageSize);

  useEffect(() => {
    setVisible(initialPageSize);
  }, [query, topic, sort, initialPageSize]);

  const topicOptions = useMemo(() => [ALL, FEATURED, ...topics], [topics]);

  const filtered = useMemo(() => {
    let list = [...episodes];

    if (sort === 'oldest') list.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
    else list.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.title, e.guest ?? '', e.summary ?? ''].join(' ').toLowerCase().includes(q),
      );
    }

    if (topic === FEATURED) list = list.filter((e) => e.featured);
    else if (topic !== ALL) list = list.filter((e) => e.collections?.includes(`EGGS ${topic}`) || e.collections?.includes(topic));

    return list;
  }, [episodes, query, topic, sort]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      {/* Search + sort */}
      <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-3 sm:py-6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-6">
            <div className="w-full min-w-0 lg:flex-1 lg:max-w-md">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search episodes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full min-h-12 pl-11 sm:pl-12 pr-4 sm:pr-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors text-base max-w-full"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full min-w-0 lg:w-auto lg:shrink-0 lg:ml-auto">
              <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0">
                <label htmlFor="episode-topic" className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  Topic:
                </label>
                <select
                  id="episode-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1 sm:flex-none sm:min-w-[11rem] min-h-12 px-4 sm:px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors text-base max-w-full"
                >
                  {topicOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0">
                <label htmlFor="episode-sort" className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  Sort by:
                </label>
                <select
                  id="episode-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="flex-1 sm:flex-none sm:min-w-[11rem] min-h-12 px-4 sm:px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors text-base max-w-full"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-8 sm:py-14 md:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 md:gap-10 lg:gap-12">
            {shown.map((ep) => {
              const numberLabel = ep.episodeNumber !== undefined ? String(ep.episodeNumber) : ep.id.slice(0, 8);
              return (
                <a key={ep.id} href={episodePath(ep.slug)} className="group block">
                  <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                    <CardImage ep={ep} />
                    <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[6] pointer-events-none">
                      <span className="text-3xl sm:text-5xl text-white/20 group-hover:text-white/30 transition-all tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {numberLabel}
                      </span>
                    </div>
                    {ep.featured && (
                      <div className="absolute top-4 left-4 z-[8]">
                        <span className="px-3 py-1 bg-accent text-white text-xs font-medium tracking-wider">FEATURED</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.65rem] sm:text-xs text-accent font-medium mb-3 tracking-wide sm:tracking-wider break-words leading-snug">
                      {episodeEyebrow(ep.episodeNumber, ep.publishedAt, ep.duration)}
                    </p>
                    <h3 className="text-lg sm:text-2xl mb-3 leading-snug group-hover:text-accent transition-colors break-words" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                      {ep.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed line-clamp-4">
                      {ep.summary?.trim() || 'Show notes are available on the episode page.'}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>

          {filtered.length > visible && (
            <div className="text-center mt-16">
              <button
                type="button"
                onClick={() => setVisible((n) => n + loadMoreSize)}
                className="min-h-12 w-full sm:w-auto border-2 border-foreground px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-medium hover:bg-foreground hover:text-background transition-colors"
              >
                Load more episodes
              </button>
              <p className="text-sm text-muted-foreground mt-3">
                Showing {shown.length} of {filtered.length} matching episodes
              </p>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl text-muted-foreground mb-4">No episodes found</p>
              <p className="text-lg text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
