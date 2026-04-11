import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface HomeProps {
  onEpisodeClick: (episodeId: number) => void;
  onNavigate?: (page: string) => void;
}

export default function Home({ onEpisodeClick, onNavigate }: HomeProps) {
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <>
      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-accent">
        {/* Background Image with Parallax */}
        <motion.div
          className="absolute inset-0"
          style={{ y: backgroundY }}
        >
          <div className="absolute inset-0 bg-accent/90 z-10" />
          <img
            src="https://images.unsplash.com/photo-1632800237110-f9c87acc2222?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </motion.div>

        {/* Animated pattern overlay */}
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
              <p className="text-sm tracking-widest text-white/70 mb-4 uppercase">
                Presented by Taelor Style
              </p>
              <h1 className="text-[10rem] leading-[0.85] mb-8 text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                EGGS!
              </h1>
              <p className="text-2xl text-white/90 mb-10 max-w-lg leading-relaxed">
                Conversations around creativity, entrepreneurship, branding, and the people behind interesting work.
              </p>
              <div className="flex items-center gap-4">
                <button className="bg-foreground text-background px-8 py-4 text-base font-medium hover:bg-foreground/90 transition-all">
                  Listen Now
                </button>
                <button className="border-2 border-white text-white px-8 py-4 text-base font-medium hover:bg-white hover:text-accent transition-all">
                  Watch on YouTube
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
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

      {/* Latest Episode */}
      <section className="py-24 bg-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="flex items-end justify-between mb-12">
              <h2 className="text-6xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Latest Episode
              </h2>
              <span className="text-7xl text-accent/10" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                42
              </span>
            </div>

            <div className="grid grid-cols-2 gap-12 items-start">
              <motion.div
                className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 rounded-sm overflow-hidden relative group cursor-pointer"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
                onClick={() => onEpisodeClick(42)}
              >
                <img
                  src="https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600"
                  alt="Sarah Chen"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </motion.div>

              <div>
                <p className="text-sm text-accent font-medium mb-4 tracking-wider">EPISODE 42 • LATEST</p>
                <h3 className="text-4xl mb-5 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Building Creative Businesses in the Age of AI
                </h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  A conversation with Sarah Chen about the intersection of creativity, technology, and entrepreneurship. We explore how founders are building businesses that balance automation with human craft.
                </p>
                <div className="flex items-center gap-6 mb-8 text-sm text-muted-foreground">
                  <span>March 28, 2026</span>
                  <span>•</span>
                  <span>58 min</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEpisodeClick(42)}
                    className="bg-accent text-accent-foreground px-8 py-4 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Listen Now
                  </button>
                  <button className="border-2 border-foreground px-8 py-4 text-sm font-medium hover:bg-foreground hover:text-background transition-all">
                    Watch on YouTube
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Episodes */}
      <section className="py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.h2
            className="text-6xl mb-20"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Featured Conversations
          </motion.h2>

          <div className="grid grid-cols-3 gap-8">
            {[
              { number: 41, title: 'The Future of Brand Identity', guest: 'Marcus Rodriguez', topic: 'Branding', img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
              { number: 40, title: 'Creativity as a Business Model', guest: 'Jane Park', topic: 'Entrepreneurship', img: 'https://images.unsplash.com/photo-1769636929131-56dd60238266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
              { number: 39, title: 'Building Tools for Creators', guest: 'Dev Patel', topic: 'Technology', img: 'https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
              { number: 38, title: 'The Art of Storytelling', guest: 'Emma Wilson', topic: 'Culture', img: 'https://images.unsplash.com/photo-1769636929132-e4e7b50cfac0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
              { number: 37, title: 'From Side Project to Startup', guest: 'Alex Kim', topic: 'Business', img: 'https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
              { number: 36, title: 'Design Leadership in 2026', guest: 'Olivia Martinez', topic: 'Leadership', img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800' },
            ].map((episode, index) => (
              <motion.div
                key={episode.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="group cursor-pointer"
                onClick={() => onEpisodeClick(episode.number)}
              >
                <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-5 relative overflow-hidden">
                  <img
                    src={episode.img}
                    alt={episode.guest}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                    <div className="w-12 h-12 bg-accent/0 group-hover:bg-accent rounded-full flex items-center justify-center transition-all duration-300">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <span className="text-5xl text-white/20 group-hover:text-white/30 transition-all" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {episode.number}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-accent font-medium mb-2 tracking-wider">{episode.topic.toUpperCase()}</p>
                <h3 className="text-xl mb-2 leading-snug group-hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {episode.title}
                </h3>
                <p className="text-sm text-muted-foreground">{episode.guest}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <a href="#episodes">
              <button className="border border-foreground px-8 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-colors">
                Browse All Episodes
              </button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-32 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
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
              viewport={{ once: true, margin: "-100px" }}
            >
              {[
                { name: 'Entrepreneurship', count: 24 },
                { name: 'Branding', count: 18 },
                { name: 'Creativity', count: 32 },
                { name: 'Business Growth', count: 21 },
                { name: 'Technology', count: 15 },
                { name: 'Culture', count: 19 },
                { name: 'Leadership', count: 17 },
                { name: 'Expertise', count: 28 },
              ].map((topic, index) => (
                <motion.button
                  key={topic.name}
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
                      {topic.count} episodes
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 text-4xl text-accent/5 group-hover:text-accent/10 transition-all" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {topic.count}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-32 bg-foreground text-background">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
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
              <button className="bg-accent text-accent-foreground px-8 py-4 font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Guest & Sponsor CTAs */}
      <section className="py-32 bg-[#FFF5EE]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-8">
            <motion.div
              className="p-16 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -8 }}
              onClick={() => onNavigate?.('be-a-guest')}
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute top-8 right-8 text-8xl text-accent/10 group-hover:text-accent/20 transition-all group-hover:rotate-12" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
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

            <motion.div
              className="p-16 bg-accent text-white relative overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -8 }}
              onClick={() => onNavigate?.('sponsor')}
            >
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute top-8 right-8 text-8xl text-white/10 group-hover:text-white/20 transition-all group-hover:-rotate-12" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
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
          </div>
        </div>
      </section>
    </>
  );
}
