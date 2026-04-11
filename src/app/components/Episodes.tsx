import { useState } from 'react';
import { motion } from 'motion/react';

const TOPICS = ['All Episodes', 'Entrepreneurship', 'Branding', 'Creativity', 'Business Growth', 'Technology', 'Culture', 'Leadership', 'Expertise'];

const EPISODES = [
  {
    id: 42,
    title: 'Building Creative Businesses in the Age of AI',
    guest: 'Sarah Chen',
    date: 'March 28, 2026',
    duration: '58 min',
    summary: 'A conversation about the intersection of creativity, technology, and entrepreneurship. We explore how founders are building businesses that balance automation with human craft.',
    topic: 'Technology',
    featured: true,
    img: 'https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 41,
    title: 'The Future of Brand Identity',
    guest: 'Marcus Rodriguez',
    date: 'March 21, 2026',
    duration: '52 min',
    summary: 'Exploring how brand identity is evolving in a world where AI can generate logos and visual systems in seconds.',
    topic: 'Branding',
    featured: true,
    img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 40,
    title: 'Creativity as a Business Model',
    guest: 'Jane Park',
    date: 'March 14, 2026',
    duration: '61 min',
    summary: 'How do you turn creative work into a sustainable business? Jane shares her journey from freelancer to agency owner.',
    topic: 'Entrepreneurship',
    featured: false,
    img: 'https://images.unsplash.com/photo-1769636929131-56dd60238266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 39,
    title: 'Building Tools for Creators',
    guest: 'Dev Patel',
    date: 'March 7, 2026',
    duration: '55 min',
    summary: 'Dev discusses the technical and philosophical challenges of building products that empower creative professionals.',
    topic: 'Technology',
    featured: false,
    img: 'https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 38,
    title: 'The Art of Storytelling',
    guest: 'Emma Wilson',
    date: 'February 28, 2026',
    duration: '49 min',
    summary: 'Stories are the foundation of culture and business. Emma breaks down what makes a story stick.',
    topic: 'Culture',
    featured: false,
    img: 'https://images.unsplash.com/photo-1769636929132-e4e7b50cfac0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 37,
    title: 'From Side Project to Startup',
    guest: 'Alex Kim',
    date: 'February 21, 2026',
    duration: '57 min',
    summary: 'Alex shares the journey of taking a weekend project to a funded startup with millions of users.',
    topic: 'Entrepreneurship',
    featured: false,
    img: 'https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 36,
    title: 'Design Leadership in 2026',
    guest: 'Olivia Martinez',
    date: 'February 14, 2026',
    duration: '53 min',
    summary: 'What does it mean to lead design teams in an era of rapid technological change?',
    topic: 'Leadership',
    featured: true,
    img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
  {
    id: 35,
    title: 'Building a Creative Practice',
    guest: 'Jordan Lee',
    date: 'February 7, 2026',
    duration: '46 min',
    summary: 'Jordan discusses the discipline and systems required to maintain a creative practice over decades.',
    topic: 'Creativity',
    featured: false,
    img: 'https://images.unsplash.com/photo-1769636929131-56dd60238266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800'
  },
];

interface EpisodesProps {
  onEpisodeClick: (episodeId: number) => void;
}

export default function Episodes({ onEpisodeClick }: EpisodesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Episodes');
  const [sortBy, setSortBy] = useState('newest');

  const filteredEpisodes = EPISODES.filter(episode => {
    const matchesSearch = episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         episode.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         episode.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'All Episodes' || episode.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

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
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search episodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="featured">Featured</option>
            </select>

            {/* Results count */}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'episode' : 'episodes'}
            </span>
          </div>
        </div>
      </section>

      {/* Topic Filters */}
      <section className="py-8 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center gap-3 overflow-x-auto">
            {TOPICS.map((topic) => (
              <button
                key={topic}
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
            {filteredEpisodes.map((episode, index) => (
              <motion.div
                key={episode.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => onEpisodeClick(episode.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                  <img
                    src={episode.img}
                    alt={episode.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Episode number */}
                  <div className="absolute bottom-4 right-4">
                    <span className="text-5xl text-white/20 group-hover:text-white/30 transition-all" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {episode.id}
                    </span>
                  </div>

                  {/* Featured badge */}
                  {episode.featured && (
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-accent text-white text-xs font-medium tracking-wider">
                        FEATURED
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs text-accent font-medium mb-3 tracking-wider">{episode.topic.toUpperCase()}</p>
                  <h3 className="text-2xl mb-3 leading-snug group-hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {episode.title}
                  </h3>
                  <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                    {episode.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{episode.date}</span>
                    <span>•</span>
                    <span>{episode.duration}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {filteredEpisodes.length > 0 && (
            <motion.div
              className="text-center mt-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <button className="border-2 border-foreground px-10 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-all">
                Load More Episodes
              </button>
            </motion.div>
          )}

          {/* No Results */}
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
