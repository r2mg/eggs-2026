import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';

export default function Sponsor() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center overflow-x-hidden px-4">
        <motion.div
          className="max-w-2xl mx-auto px-4 sm:px-6 text-center py-16 sm:py-24 min-w-0"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Thanks for Your Interest!
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 leading-relaxed">
            We've received your inquiry and will be in touch within 2 business days with sponsorship options and next steps.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="border-2 border-foreground px-8 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-all"
          >
            Submit Another Inquiry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 overflow-x-hidden">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <h1
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 sm:mb-8 leading-tight break-words"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              Sponsor EGGS!
            </h1>
            <p className="text-lg sm:text-2xl md:text-3xl text-muted-foreground leading-relaxed">
              Reach an engaged audience of creative professionals, entrepreneurs, and decision-makers building the future.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Audience Overview */}
      <section className="py-12 sm:py-16 md:py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Our Audience
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl leading-relaxed">
              EGGS! reaches creative professionals and business builders who value quality tools, thoughtful services, and strategic insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-16">
            {[
              { stat: '50K+', label: 'Monthly Listeners' },
              { stat: '85%', label: 'Decision Makers' },
              { stat: '72%', label: 'Age 25-45' },
              { stat: '60%', label: 'Premium Subscribers' }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center p-5 sm:p-8 bg-muted/30 border-2 border-border min-w-0"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="text-3xl sm:text-5xl mb-2 sm:mb-3 text-accent" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {item.stat}
                </div>
                <div className="text-sm sm:text-base text-muted-foreground leading-snug">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: 'Founders & Entrepreneurs',
                description: 'Building products, companies, and creative businesses. Actively seeking tools and services to help them scale.'
              },
              {
                title: 'Creative Professionals',
                description: 'Designers, developers, writers, and makers investing in their craft and career development.'
              },
              {
                title: 'Business Leaders',
                description: 'Directors, VPs, and executives making purchasing decisions for their teams and organizations.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="p-6 sm:p-8 border-2 border-border hover:border-accent transition-colors"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h3 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsorship Opportunities */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Sponsorship Opportunities
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl leading-relaxed">
              We offer flexible sponsorship packages designed to align with your marketing goals and budget.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: 'Episode Sponsorship',
                description: 'Feature your brand in a single episode with host-read ad spots and show notes placement.',
                includes: [
                  '60-second pre-roll ad read',
                  '30-second mid-roll ad read',
                  'Logo in show notes',
                  'Mention in social promotion',
                  'Analytics report'
                ],
                highlight: false
              },
              {
                name: 'Monthly Partnership',
                description: 'Become the featured sponsor across all episodes for a month with premium placement.',
                includes: [
                  'All Episode Sponsorship benefits',
                  '4 episodes per month',
                  'Dedicated social posts',
                  'Newsletter feature',
                  'Website homepage placement',
                  'Custom landing page'
                ],
                highlight: true
              },
              {
                name: 'Custom Integration',
                description: 'Build a deeper partnership with custom content, branded segments, or event sponsorship.',
                includes: [
                  'Tailored sponsorship strategy',
                  'Branded content opportunities',
                  'Event or series sponsorship',
                  'Multi-channel activation',
                  'Dedicated account support'
                ],
                highlight: false
              }
            ].map((tier, index) => (
              <motion.div
                key={index}
                className={`p-6 sm:p-8 md:p-10 ${
                  tier.highlight
                    ? 'bg-accent text-white border-4 border-accent'
                    : 'bg-background border-2 border-border'
                } relative`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {tier.name}
                </h3>
                <p className={`text-base mb-8 leading-relaxed ${tier.highlight ? 'text-white/90' : 'text-muted-foreground'}`}>
                  {tier.description}
                </p>
                <div className="space-y-3 mb-8">
                  {tier.includes.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier.highlight ? 'bg-white/20' : 'bg-accent/20'
                      }`}>
                        <svg className={`w-3 h-3 ${tier.highlight ? 'text-white' : 'text-accent'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-sm leading-relaxed ${tier.highlight ? 'text-white/90' : ''}`}>{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`w-full min-h-12 py-4 text-base font-medium transition-all ${
                    tier.highlight
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'border-2 border-foreground hover:bg-foreground hover:text-background'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sponsor EGGS */}
      <section className="py-12 sm:py-16 md:py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Why Sponsor EGGS!?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 md:gap-12">
            {[
              {
                title: 'Engaged, High-Intent Audience',
                description: 'Our listeners are actively building businesses and careers. They\'re researching tools, seeking services, and making purchasing decisions.'
              },
              {
                title: 'Authentic Integration',
                description: 'Host-read ads feel natural and credible. We only partner with brands that genuinely serve our audience, ensuring your message resonates.'
              },
              {
                title: 'Long Shelf Life',
                description: 'Episodes remain discoverable for years. Your sponsorship continues reaching new listeners long after the initial publish date.'
              },
              {
                title: 'Measurable Results',
                description: 'Track performance with custom promo codes, dedicated landing pages, and detailed analytics reports showing impressions, engagement, and conversions.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="p-6 sm:p-8 bg-muted/30 border-l-4 border-accent"
                initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
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

      {/* Past Sponsors / Trust Section */}
      <section className="py-12 sm:py-16 md:py-24 bg-foreground text-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-6 sm:mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Trusted by Leading Brands
            </h2>
            <p className="text-base sm:text-xl text-white/90 mb-10 sm:mb-16 leading-relaxed max-w-3xl">
              We've partnered with innovative companies who understand the value of reaching our creative, entrepreneurial audience.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-16">
              {['Figma', 'Webflow', 'Notion', 'Stripe', 'Linear', 'Framer', 'Vercel', 'Raycast'].map((brand, index) => (
                <motion.div
                  key={index}
                  className="p-5 sm:p-8 min-h-[4.5rem] bg-background/10 border border-background/20 flex items-center justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <span className="text-xl opacity-70" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    {brand}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="py-12 sm:py-16 md:py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Let's Work Together
              </h2>
              <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                Tell us about your brand and goals. We'll get back to you within 2 business days with options and pricing.
              </p>
            </div>

            <div className="max-w-3xl min-w-0">

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 md:p-12 bg-background border-2 border-border space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">First Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Work Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Company Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Company Website</label>
                <input
                  type="url"
                  className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                  placeholder="https://"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Your Role / Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                  placeholder="e.g., Marketing Director"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Interested In *</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="episode">Single Episode Sponsorship</option>
                  <option value="monthly">Monthly Partnership</option>
                  <option value="custom">Custom Integration</option>
                  <option value="exploring">Just Exploring Options</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Estimated Monthly Budget (optional)</label>
                <select className="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-accent transition-colors">
                  <option value="">Prefer not to say</option>
                  <option value="under-5k">Under $5,000</option>
                  <option value="5k-10k">$5,000 - $10,000</option>
                  <option value="10k-25k">$10,000 - $25,000</option>
                  <option value="25k-plus">$25,000+</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Tell us about your goals *</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="What are you hoping to achieve with podcast sponsorship? Who are you trying to reach?"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Additional Information (optional)</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                  placeholder="Anything else we should know?"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-accent text-accent-foreground px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
              >
                Submit Inquiry
              </button>
            </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Media Kit CTA */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Need More Information?
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-3xl mx-auto px-1">
              Download our media kit for detailed audience demographics, sponsorship packages, and pricing.
            </p>
            <button
              type="button"
              className="min-h-12 border-2 border-foreground px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-medium hover:bg-foreground hover:text-background transition-all inline-flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Media Kit
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
