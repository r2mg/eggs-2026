import { motion } from 'motion/react';

interface EpisodeDetailProps {
  episodeId: number;
  onEpisodeClick?: (episodeId: number) => void;
  onBackToEpisodes?: () => void;
}

const EPISODE_DATA: Record<number, any> = {
  42: {
    id: 42,
    title: 'Building Creative Businesses in the Age of AI',
    guest: 'Sarah Chen',
    date: 'March 28, 2026',
    duration: '58 min',
    topic: 'Technology',
    img: 'https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600',
    summary: 'A conversation about the intersection of creativity, technology, and entrepreneurship.',
    overview: 'In this episode, we sit down with Sarah Chen, founder of Creative Labs, to explore how creative professionals are navigating the AI revolution. We discuss the tension between automation and craft, how to build sustainable creative businesses in a rapidly changing landscape, and what it means to stay human in an age of artificial intelligence. Sarah shares insights from her journey building a design agency that embraces new technology while maintaining the creative soul that makes great work possible.',
    guestBio: 'Sarah Chen is the founder and CEO of Creative Labs, a design and innovation studio working with Fortune 500 companies and ambitious startups. With a background in both computer science and design, Sarah has spent the last decade helping organizations navigate technological change while maintaining their creative edge.',
    guestCompany: 'Creative Labs',
    guestLinks: {
      twitter: '@sarahchen',
      linkedin: 'linkedin.com/in/sarahchen',
      website: 'creativelabs.co'
    },
    keyTakeaways: [
      'AI should augment human creativity, not replace it',
      'The most successful creative businesses combine technical capability with deep craft knowledge',
      'Building a sustainable creative practice requires systems and discipline',
      'The future belongs to those who can bridge technology and humanity'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '3:45', title: 'Sarah\'s Background in Design and Technology' },
      { time: '12:30', title: 'Starting Creative Labs' },
      { time: '22:15', title: 'The AI Revolution in Creative Work' },
      { time: '34:20', title: 'Balancing Automation and Craft' },
      { time: '43:10', title: 'Building Sustainable Creative Businesses' },
      { time: '52:30', title: 'Advice for Creative Entrepreneurs' }
    ],
    transcript: 'Ryan: Welcome to EGGS! Today we have Sarah Chen, founder of Creative Labs. Sarah, thanks for joining us.\n\nSarah: Thanks for having me, Ryan. Excited to be here.\n\nRyan: Let\'s start with your background. You studied computer science before getting into design. How did that journey happen?\n\nSarah: It was actually pretty organic. I was coding in college but found myself more interested in what we were building than how we were building it...',
    relatedEpisodes: [41, 39, 40]
  },
  41: {
    id: 41,
    title: 'The Future of Brand Identity',
    guest: 'Marcus Rodriguez',
    date: 'March 21, 2026',
    duration: '52 min',
    topic: 'Branding',
    img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'Exploring how brand identity is evolving in a world where AI can generate logos and visual systems in seconds.',
    overview: 'Marcus Rodriguez, brand strategist and founder of Identity Studio, joins us to discuss the evolving nature of brand identity in the age of generative AI. We explore what makes a brand timeless, how technology is changing the design landscape, and why human insight remains irreplaceable.',
    guestBio: 'Marcus Rodriguez is a brand strategist and designer who has worked with companies like Apple, Nike, and Airbnb. He founded Identity Studio to help ambitious companies build brands that last.',
    guestCompany: 'Identity Studio',
    guestLinks: {
      twitter: '@marcusrodriguez',
      linkedin: 'linkedin.com/in/marcusrodriguez',
      website: 'identitystudio.com'
    },
    keyTakeaways: [
      'Great brands are built on strategy, not just aesthetics',
      'AI tools democratize design but don\'t replace strategic thinking',
      'Brand identity is about consistency and meaning over time',
      'The best brand work comes from deep understanding of the audience'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '4:20', title: 'What Makes a Great Brand?' },
      { time: '15:45', title: 'AI and Design Tools' },
      { time: '28:30', title: 'Building Identity Studio' },
      { time: '39:10', title: 'The Future of Branding' },
      { time: '48:00', title: 'Advice for Designers' }
    ],
    transcript: 'Ryan: Marcus, great to have you on EGGS!\n\nMarcus: Happy to be here, Ryan.\n\nRyan: You\'ve worked on some iconic brand identities. What separates good branding from great branding?...',
    relatedEpisodes: [42, 36, 40]
  },
  40: {
    id: 40,
    title: 'Creativity as a Business Model',
    guest: 'Jane Park',
    date: 'March 14, 2026',
    duration: '61 min',
    topic: 'Entrepreneurship',
    img: 'https://images.unsplash.com/photo-1769636929131-56dd60238266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'How do you turn creative work into a sustainable business?',
    overview: 'Jane Park shares her journey from freelance designer to agency owner, discussing the challenges and opportunities of building a creative business. We explore pricing strategies, client relationships, team building, and the mindset shifts required to treat creativity as a legitimate business model.',
    guestBio: 'Jane Park is the founder of Park Creative, a design agency working with purpose-driven brands. She has built a team of 15 creatives and helps others navigate the business side of creative work.',
    guestCompany: 'Park Creative',
    guestLinks: {
      twitter: '@janepark',
      linkedin: 'linkedin.com/in/janepark',
      website: 'parkcreative.com'
    },
    keyTakeaways: [
      'Creative work deserves to be priced appropriately',
      'Building systems allows you to scale creativity',
      'Agency culture is just as important as client work',
      'Sustainable creative businesses balance art and commerce'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '5:10', title: 'From Freelancer to Agency Owner' },
      { time: '18:25', title: 'Pricing Creative Work' },
      { time: '32:40', title: 'Building a Creative Team' },
      { time: '45:15', title: 'Balancing Art and Business' },
      { time: '56:30', title: 'Advice for Creative Entrepreneurs' }
    ],
    transcript: 'Ryan: Jane, thanks for being here.\n\nJane: Thanks for having me, Ryan!\n\nRyan: Let\'s talk about your journey from freelancer to running an agency. When did you know it was time to scale?...',
    relatedEpisodes: [42, 41, 39]
  },
  39: {
    id: 39,
    title: 'Building Tools for Creators',
    guest: 'Dev Patel',
    date: 'March 7, 2026',
    duration: '55 min',
    topic: 'Technology',
    img: 'https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'The technical and philosophical challenges of building products for creative professionals.',
    overview: 'Dev Patel, founder of CreatorOS, discusses what it takes to build tools that empower rather than constrain creative work. We explore product philosophy, understanding user needs, balancing power with simplicity, and the future of creative software.',
    guestBio: 'Dev Patel is the founder and CEO of CreatorOS, a platform helping creators manage their business and craft. Previously a designer at Figma, Dev combines deep technical knowledge with an understanding of creative workflows.',
    guestCompany: 'CreatorOS',
    guestLinks: {
      twitter: '@devpatel',
      linkedin: 'linkedin.com/in/devpatel',
      website: 'creatorOS.com'
    },
    keyTakeaways: [
      'Great tools get out of the way and let creators create',
      'Understanding user workflows is more important than features',
      'The best products solve real pain points, not imagined ones',
      'Creative tools should empower, not dictate'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '4:30', title: 'Dev\'s Background at Figma' },
      { time: '16:20', title: 'Starting CreatorOS' },
      { time: '28:45', title: 'Philosophy of Creative Tools' },
      { time: '40:10', title: 'Understanding Creators\' Needs' },
      { time: '51:00', title: 'The Future of Creative Software' }
    ],
    transcript: 'Ryan: Dev, welcome to EGGS!\n\nDev: Great to be here, Ryan.\n\nRyan: You worked at Figma before starting CreatorOS. What did you learn there about building tools for creatives?...',
    relatedEpisodes: [42, 41, 40]
  },
  38: {
    id: 38,
    title: 'The Art of Storytelling',
    guest: 'Emma Wilson',
    date: 'February 28, 2026',
    duration: '49 min',
    topic: 'Culture',
    img: 'https://images.unsplash.com/photo-1769636929132-e4e7b50cfac0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'Stories are the foundation of culture and business.',
    overview: 'Emma Wilson, award-winning storyteller and creative director, breaks down what makes stories resonate and stick. We explore narrative structure, emotional resonance, authenticity, and how businesses can use storytelling to connect with audiences.',
    guestBio: 'Emma Wilson is a storyteller, author, and creative director known for her work on campaigns for Nike, Patagonia, and Airbnb. She teaches storytelling workshops and believes every brand has a story worth telling.',
    guestCompany: 'Story Lab',
    guestLinks: {
      twitter: '@emmawilson',
      linkedin: 'linkedin.com/in/emmawilson',
      website: 'storylab.co'
    },
    keyTakeaways: [
      'Good stories are about people, not products',
      'Authenticity beats polish every time',
      'Structure matters: setup, conflict, resolution',
      'The best brand stories make the customer the hero'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '3:50', title: 'What Makes Stories Stick' },
      { time: '14:20', title: 'Story Structure Fundamentals' },
      { time: '26:35', title: 'Authenticity in Brand Storytelling' },
      { time: '38:45', title: 'Examples from Great Campaigns' },
      { time: '46:10', title: 'Advice for Storytellers' }
    ],
    transcript: 'Ryan: Emma, thanks for joining us on EGGS!\n\nEmma: Happy to be here!\n\nRyan: You\'ve worked on some incredible campaigns. What\'s the secret to a story that sticks?...',
    relatedEpisodes: [41, 40, 37]
  },
  37: {
    id: 37,
    title: 'From Side Project to Startup',
    guest: 'Alex Kim',
    date: 'February 21, 2026',
    duration: '57 min',
    topic: 'Entrepreneurship',
    img: 'https://images.unsplash.com/photo-1758876019290-be620a8971f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'Taking a weekend project to a funded startup with millions of users.',
    overview: 'Alex Kim shares the journey of Quicknote, from a simple side project built over a weekend to a productivity app with millions of users and venture funding. We discuss knowing when to go full-time, fundraising, scaling, and maintaining product vision through growth.',
    guestBio: 'Alex Kim is the founder and CEO of Quicknote, a note-taking app used by over 3 million people. Alex started building Quicknote while working as a product designer and has since raised $15M to grow the company.',
    guestCompany: 'Quicknote',
    guestLinks: {
      twitter: '@alexkim',
      linkedin: 'linkedin.com/in/alexkim',
      website: 'quicknote.app'
    },
    keyTakeaways: [
      'Start with a problem you personally experience',
      'Ship early and iterate based on real feedback',
      'Know when it\'s time to go full-time on your side project',
      'Fundraising is a tool, not a goal'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '5:15', title: 'Building the First Version' },
      { time: '17:40', title: 'Going Viral on Product Hunt' },
      { time: '29:20', title: 'Deciding to Go Full-Time' },
      { time: '40:05', title: 'Raising Funding' },
      { time: '51:30', title: 'Scaling While Staying Focused' }
    ],
    transcript: 'Ryan: Alex, welcome to the show!\n\nAlex: Thanks for having me, Ryan.\n\nRyan: Quicknote started as a weekend project. Tell us about that first version...',
    relatedEpisodes: [40, 42, 39]
  },
  36: {
    id: 36,
    title: 'Design Leadership in 2026',
    guest: 'Olivia Martinez',
    date: 'February 14, 2026',
    duration: '53 min',
    topic: 'Leadership',
    img: 'https://images.unsplash.com/photo-1733159038814-0c9915bf5142?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
    summary: 'What it means to lead design teams in an era of rapid technological change.',
    overview: 'Olivia Martinez, VP of Design at a leading tech company, discusses the evolving role of design leadership. We explore hiring and developing talent, fostering creativity at scale, navigating AI tools, and building design culture in hybrid/remote environments.',
    guestBio: 'Olivia Martinez is VP of Design at Stripe, where she leads a team of 80+ designers. Previously at Google and IDEO, Olivia is known for building high-performing design organizations and advocating for design\'s strategic role in business.',
    guestCompany: 'Stripe',
    guestLinks: {
      twitter: '@oliviamartinez',
      linkedin: 'linkedin.com/in/oliviamartinez',
      website: 'oliviamartinez.com'
    },
    keyTakeaways: [
      'Great design leaders hire people better than themselves',
      'Culture and process enable creativity at scale',
      'Leaders must balance craft excellence with business impact',
      'The future of design leadership is more strategic, less tactical'
    ],
    chapters: [
      { time: '0:00', title: 'Introduction' },
      { time: '4:45', title: 'Olivia\'s Path to Design Leadership' },
      { time: '16:30', title: 'Building Design Teams' },
      { time: '28:50', title: 'Design Culture at Scale' },
      { time: '41:15', title: 'Navigating AI in Design' },
      { time: '49:20', title: 'Advice for Aspiring Leaders' }
    ],
    transcript: 'Ryan: Olivia, great to have you here.\n\nOlivia: Thanks, Ryan. Excited to talk about design leadership.\n\nRyan: You lead a large design team at Stripe. What does design leadership mean to you?...',
    relatedEpisodes: [41, 42, 40]
  }
};

export default function EpisodeDetail({ episodeId, onEpisodeClick, onBackToEpisodes }: EpisodeDetailProps) {
  const episode = EPISODE_DATA[episodeId] || EPISODE_DATA[42];

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <button
                onClick={onBackToEpisodes}
                className="hover:text-foreground cursor-pointer transition-colors"
              >
                Episodes
              </button>
              <span>/</span>
              <span>Episode {episode.id}</span>
            </div>

            {/* Episode Info */}
            <div className="mb-8">
              <p className="text-sm text-accent font-medium mb-4 tracking-wider">
                EPISODE {episode.id} • {episode.topic.toUpperCase()}
              </p>
              <h1 className="text-7xl mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {episode.title}
              </h1>
              <div className="flex items-center gap-6 text-base text-muted-foreground">
                <span>{episode.date}</span>
                <span>•</span>
                <span>{episode.duration}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Player / Featured Image */}
      <section className="py-12 bg-background">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 rounded-sm overflow-hidden relative group"
          >
            <img
              src={episode.img}
              alt={episode.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-24 h-24 bg-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Platform Links */}
          <motion.div
            className="flex items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button className="bg-accent text-accent-foreground px-8 py-4 text-sm font-medium hover:opacity-90 transition-opacity">
              Watch on YouTube
            </button>
            <button className="border-2 border-border px-8 py-4 text-sm font-medium hover:border-foreground transition-colors">
              Listen on Spotify
            </button>
            <button className="border-2 border-border px-8 py-4 text-sm font-medium hover:border-foreground transition-colors">
              Apple Podcasts
            </button>
          </motion.div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-16">
            {/* Main Content */}
            <div className="col-span-2">
              {/* Summary */}
              <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Episode Summary
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  {episode.summary}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {episode.overview}
                </p>
              </motion.div>

              {/* Key Takeaways */}
              <motion.div
                className="mb-16 p-10 bg-accent/5 border-l-4 border-accent"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Key Takeaways
                </h2>
                <ul className="space-y-4">
                  {episode.keyTakeaways.map((takeaway: string, index: number) => (
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

              {/* Chapters */}
              <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-3xl mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Chapters
                </h2>
                <div className="space-y-3">
                  {episode.chapters.map((chapter: any, index: number) => (
                    <button
                      key={index}
                      className="w-full flex items-center gap-6 p-5 bg-muted hover:bg-accent/5 transition-colors text-left group"
                    >
                      <span className="text-sm font-medium text-accent min-w-[4rem]">{chapter.time}</span>
                      <span className="text-base group-hover:text-accent transition-colors">{chapter.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Transcript Preview */}
              <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h2 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Transcript
                </h2>
                <div className="p-8 bg-muted/50 border border-border">
                  <p className="text-base text-muted-foreground leading-loose whitespace-pre-line font-mono">
                    {episode.transcript}
                  </p>
                  <button className="mt-6 text-accent font-medium hover:underline">
                    Read Full Transcript →
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="col-span-1">
              {/* Guest Info */}
              <motion.div
                className="mb-12 p-8 bg-muted/30 border border-border"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h3 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  About {episode.guest}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {episode.guestBio}
                </p>
                <div className="mb-6">
                  <span className="text-sm font-medium text-accent">{episode.guestCompany}</span>
                </div>
                <div className="space-y-2">
                  <a href="#" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                    {episode.guestLinks.twitter}
                  </a>
                  <a href="#" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                    {episode.guestLinks.website}
                  </a>
                  <a href="#" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                    {episode.guestLinks.linkedin}
                  </a>
                </div>
              </motion.div>

              {/* Subscribe CTA */}
              <motion.div
                className="mb-12 p-8 bg-foreground text-background"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
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
                <button className="w-full bg-accent text-accent-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
                  Subscribe
                </button>
              </motion.div>

              {/* Share */}
              <motion.div
                className="mb-12"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h3 className="text-lg mb-4 font-medium">Share This Episode</h3>
                <div className="flex items-center gap-3">
                  <button className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium">
                    Twitter
                  </button>
                  <button className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium">
                    LinkedIn
                  </button>
                  <button className="flex-1 px-4 py-3 bg-muted hover:bg-muted-foreground/10 transition-colors text-sm font-medium">
                    Copy
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Episodes */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.h2
            className="text-5xl mb-12"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Related Episodes
          </motion.h2>

          <div className="grid grid-cols-3 gap-8">
            {episode.relatedEpisodes.map((relatedId: number, index: number) => {
              const relatedEpisode = EPISODE_DATA[relatedId];
              if (!relatedEpisode) return null;

              return (
                <motion.div
                  key={relatedId}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="group cursor-pointer"
                  onClick={() => onEpisodeClick?.(relatedId)}
                >
                  <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent/5 mb-4 relative overflow-hidden">
                    <img
                      src={relatedEpisode.img}
                      alt={relatedEpisode.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                    <div className="absolute bottom-4 right-4">
                      <span className="text-4xl text-white/20 group-hover:text-white/30 transition-all" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {relatedEpisode.id}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-accent font-medium mb-2 tracking-wider">{relatedEpisode.topic.toUpperCase()}</p>
                  <h3 className="text-lg mb-2 leading-snug group-hover:text-accent transition-colors" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {relatedEpisode.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{relatedEpisode.guest}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-8">
            <motion.div
              className="p-12 bg-white border-2 border-accent relative overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
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

            <motion.div
              className="p-12 bg-accent text-white relative overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true, margin: "-100px" }}
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
          </div>
        </div>
      </section>
    </div>
  );
}
