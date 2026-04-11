import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <h1 className="text-8xl mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              About EGGS!
            </h1>
            <p className="text-3xl text-muted-foreground leading-relaxed">
              A podcast exploring creativity, entrepreneurship, branding, and the people behind interesting work.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What is EGGS */}
      <section className="py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-24 items-start">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-5xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                What is EGGS!?
              </h2>
              <div className="w-24 h-1 bg-accent mb-8" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-6"
            >
              <p className="text-xl text-muted-foreground leading-relaxed">
                EGGS! is a podcast that sits down with creative professionals, entrepreneurs, designers, and builders to unpack the stories, strategies, and insights behind their work.
              </p>
              <p className="text-xl text-muted-foreground leading-relaxed">
                We're interested in the intersection of craft and commerce, creativity and systems, intuition and strategy. Each episode digs into how people build sustainable creative practices, navigate industry changes, and maintain their vision while growing their impact.
              </p>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Whether you're starting your first project or scaling your tenth company, EGGS! brings you conversations that challenge assumptions and offer practical wisdom from people who've done the work.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.h2
            className="text-5xl mb-16 text-center"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            What Makes EGGS! Different
          </motion.h2>

          <div className="grid grid-cols-3 gap-12">
            {[
              {
                title: 'Depth Over Surface',
                description: 'We go beyond the highlight reel. Our conversations explore the messy middle, the strategic decisions, and the real challenges behind successful creative work.'
              },
              {
                title: 'Practitioners, Not Pundits',
                description: 'Every guest is actively building, creating, or leading. We feature people doing the work, not just talking about it.'
              },
              {
                title: 'Strategy Meets Craft',
                description: 'We bridge the gap between business and creativity. The best work happens when strategic thinking meets exceptional craft—we explore both.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="p-10 bg-background border-2 border-border hover:border-accent transition-colors"
              >
                <h3 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics We Cover */}
      <section className="py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-24">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <h2 className="text-5xl mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Conversations We Have
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                EGGS! explores the themes that matter most to people building creative careers and businesses in a rapidly changing landscape.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              {[
                'Entrepreneurship',
                'Branding & Identity',
                'Creative Practice',
                'Business Strategy',
                'Design & Technology',
                'Culture & Storytelling',
                'Leadership',
                'Craft & Expertise'
              ].map((topic, index) => (
                <motion.div
                  key={topic}
                  className="p-6 border-2 border-border hover:border-accent hover:bg-accent/5 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <span className="text-base font-medium">{topic}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Host Section */}
      <section className="py-24 bg-accent text-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-5 gap-16 items-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="col-span-2">
              <div className="aspect-square bg-white/10 rounded-sm overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                  alt="Host"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="col-span-3">
              <p className="text-sm tracking-widest mb-4 text-white/70 uppercase">Host</p>
              <h2 className="text-5xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Ryan Reynolds
              </h2>
              <p className="text-xl text-white/90 mb-6 leading-relaxed">
                Ryan is the founder of Taelor Style and host of EGGS! With a background in design, branding, and entrepreneurship, Ryan brings curiosity and insight to every conversation.
              </p>
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                Over the past decade, Ryan has worked with Fortune 500 companies and ambitious startups, helping them build brands and products that resonate. EGGS! is an extension of that work—a space to learn from the people shaping creative industries.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-white/80 hover:text-white transition-colors text-sm">
                  @ryanreynolds
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors text-sm">
                  taelorstyle.com
                </a>
                <a href="#" className="text-white/80 hover:text-white transition-colors text-sm">
                  LinkedIn
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Co-Host Section */}
      <section className="py-24 bg-accent/10">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-5 gap-16 items-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="col-span-3">
              <p className="text-sm tracking-widest mb-4 text-muted-foreground uppercase">Co-Host</p>
              <h2 className="text-5xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Michael Smith
              </h2>
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                Michael is a creative director and entrepreneur who brings deep expertise in brand strategy and storytelling to EGGS! His unique perspective helps unpack the creative process behind successful businesses.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                With a background spanning advertising, product design, and venture building, Michael asks the questions that reveal how great ideas become sustainable ventures. His contributions bring energy and insight to every episode.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">
                  @michaelsmith
                </a>
                <a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">
                  michaelsmith.com
                </a>
                <a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="col-span-2">
              <div className="aspect-square bg-accent/20 rounded-sm overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1769636929131-56dd60238266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                  alt="Co-Host"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why EGGS Exists */}
      <section className="py-24 bg-background">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-5xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Why EGGS! Exists
            </h2>
            <p className="text-2xl text-muted-foreground leading-relaxed mb-8">
              We started EGGS! because we believe the best insights come from conversations with people actively doing the work.
            </p>
            <p className="text-xl text-muted-foreground leading-relaxed">
              In an age of surface-level content and quick takes, we wanted to create a space for deeper exploration—where guests can share not just what they've built, but how and why. A place where strategy meets storytelling, and where listeners walk away with ideas they can actually use.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Platform Links */}
      <section className="py-24 bg-foreground text-background">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-5xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Listen Everywhere
            </h2>
            <p className="text-xl opacity-80 mb-12 leading-relaxed">
              EGGS! is available on all major podcast platforms. Choose your favorite way to listen.
            </p>

            <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              {[
                { name: 'Spotify', icon: '♫' },
                { name: 'Apple Podcasts', icon: '🎧' },
                { name: 'YouTube', icon: '▶' },
                { name: 'RSS Feed', icon: '📡' }
              ].map((platform, index) => (
                <motion.button
                  key={platform.name}
                  className="p-8 bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                >
                  <div className="text-4xl mb-4">{platform.icon}</div>
                  <div className="text-base font-medium">{platform.name}</div>
                </motion.button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-8">
              <a href="#" className="text-background/70 hover:text-background transition-colors">
                Twitter
              </a>
              <a href="#" className="text-background/70 hover:text-background transition-colors">
                Instagram
              </a>
              <a href="#" className="text-background/70 hover:text-background transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-background/70 hover:text-background transition-colors">
                YouTube
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#FFF5EE]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-8">
            <motion.div
              className="p-16 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -8 }}
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute top-8 right-8 text-8xl text-accent/10 group-hover:text-accent/20 transition-all group-hover:rotate-12" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                !
              </div>
              <h3 className="text-5xl mb-6 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Be a Guest
              </h3>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed relative z-10">
                Have a story worth sharing? We'd love to hear from you.
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
            >
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute top-8 right-8 text-8xl text-white/10 group-hover:text-white/20 transition-all group-hover:-rotate-12" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                $
              </div>
              <h3 className="text-5xl mb-6 relative z-10" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Sponsor EGGS!
              </h3>
              <p className="text-lg text-white/90 mb-10 leading-relaxed relative z-10">
                Reach our audience of creative professionals and entrepreneurs.
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
    </div>
  );
}
