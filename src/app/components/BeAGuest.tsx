import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';

type FormType = 'apply' | 'nominate' | 'publicist';

export default function BeAGuest() {
  const [activeForm, setActiveForm] = useState<FormType>('apply');
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
            Thanks for Reaching Out!
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 leading-relaxed">
            We've received your submission and will review it carefully. If there's a good fit, we'll be in touch within 2-3 weeks.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="border-2 border-foreground px-8 py-4 text-base font-medium hover:bg-foreground hover:text-background transition-all"
          >
            Submit Another
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
              Be a Guest on EGGS!
            </h1>
            <p className="text-lg sm:text-2xl md:text-3xl text-muted-foreground leading-relaxed">
              We're always looking for creative professionals, entrepreneurs, and builders with stories worth sharing.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Who We're Looking For */}
      <section className="py-12 sm:py-16 md:py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-6 sm:mb-8" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Who We're Looking For
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
              EGGS! features practitioners actively building, creating, and leading. We're interested in people with insights gained from real experience—not theory.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            {[
              {
                title: 'Founders & Entrepreneurs',
                description: 'Building products, companies, or creative businesses. You\'ve navigated the challenges of starting and scaling.'
              },
              {
                title: 'Creative Professionals',
                description: 'Designers, writers, artists, and makers who have built sustainable creative practices and can share what you\'ve learned.'
              },
              {
                title: 'Industry Leaders',
                description: 'Leading teams, shaping industries, or pioneering new approaches. You have strategic insights from doing the work at scale.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="p-6 sm:p-8 border-2 border-border hover:border-accent transition-colors"
              >
                <h3 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* What Makes a Great Guest */}
          <motion.div
            className="p-6 sm:p-10 md:p-12 bg-accent/5 border-l-4 border-accent"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h3 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              What Makes a Great Guest
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                'You\'re actively doing the work, not just advising',
                'You have specific insights from real challenges',
                'You can articulate your process and decision-making',
                'You\'re willing to discuss both successes and failures',
                'Your story has practical value for our audience',
                'You bring a unique perspective or approach'
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-base leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Form Type Selection */}
      <section className="py-12 sm:py-16 md:py-24 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl mb-8 sm:mb-12" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              How Would You Like to Connect?
            </h2>

            {/* Tab Selection — stack on narrow screens so labels stay readable */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
              <button
                type="button"
                onClick={() => setActiveForm('apply')}
                className={`min-h-12 w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all text-center ${
                  activeForm === 'apply'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background border-2 border-border hover:border-accent'
                }`}
              >
                Apply to Be a Guest
              </button>
              <button
                type="button"
                onClick={() => setActiveForm('nominate')}
                className={`min-h-12 w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all text-center ${
                  activeForm === 'nominate'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background border-2 border-border hover:border-accent'
                }`}
              >
                Nominate Someone
              </button>
              <button
                type="button"
                onClick={() => setActiveForm('publicist')}
                className={`min-h-12 w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all text-center ${
                  activeForm === 'publicist'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background border-2 border-border hover:border-accent'
                }`}
              >
                Publicist / Representative
              </button>
            </div>

            {/* Forms */}
            <div className="max-w-3xl mx-auto">
              {activeForm === 'apply' && (
                <motion.form
                  key="apply"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  onSubmit={handleSubmit}
                  className="p-6 sm:p-10 md:p-12 bg-background border-2 border-border space-y-6"
                >
                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="First and last name"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Role / Title *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="e.g., Founder & CEO, Design Director, etc."
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Company / Organization</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="Where do you work?"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Website / Portfolio</label>
                    <input
                      type="url"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="https://"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">What would you like to discuss on EGGS!? *</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Tell us about your work, your story, and the insights you'd like to share with our audience."
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Why are you a good fit for EGGS!? *</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="What makes your perspective unique or valuable for our audience?"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Social Links (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors mb-3"
                      placeholder="Twitter / X"
                    />
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="LinkedIn"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
                  >
                    Submit Application
                  </button>
                </motion.form>
              )}

              {activeForm === 'nominate' && (
                <motion.form
                  key="nominate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  onSubmit={handleSubmit}
                  className="p-6 sm:p-10 md:p-12 bg-background border-2 border-border space-y-6"
                >
                  <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                    Know someone who'd be a great guest? We'd love to hear about them.
                  </p>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="First and last name"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="border-t-2 border-border pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Guest Nominee</h3>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Nominee Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="First and last name"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Nominee Email (if known)</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="nominee@email.com"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Nominee Role / Company *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="What do they do and where?"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Website / Social Links</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="https://"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Why would they be a great guest? *</label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Tell us about their work, perspective, and what they could share with our audience."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
                  >
                    Submit Nomination
                  </button>
                </motion.form>
              )}

              {activeForm === 'publicist' && (
                <motion.form
                  key="publicist"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  onSubmit={handleSubmit}
                  className="p-6 sm:p-10 md:p-12 bg-background border-2 border-border space-y-6"
                >
                  <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                    Representing a potential guest? Please share their information and we'll be in touch.
                  </p>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="First and last name"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Email *</label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Your Company / Agency *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="Agency or company name"
                    />
                  </div>

                  <div className="border-t-2 border-border pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Client / Talent Information</h3>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Client Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="Who are you pitching?"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Client Role / Title *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="Their role and company"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Relevant Links</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors mb-3"
                      placeholder="Website"
                    />
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors"
                      placeholder="Press kit or media page"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Pitch / Bio *</label>
                    <textarea
                      required
                      rows={6}
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Tell us about your client, their work, and what topics they could discuss on EGGS!"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Timing / Context (optional)</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 bg-muted border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Is there a book launch, product release, or other relevant timing?"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-accent text-accent-foreground px-8 py-4 text-base font-medium hover:opacity-90 transition-opacity"
                  >
                    Submit Inquiry
                  </button>
                </motion.form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 md:py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-w-0">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl mb-10 sm:mb-16"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Common Questions
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {[
              {
                question: 'How long does the interview take?',
                answer: 'Episodes typically run 45-60 minutes. We record for about 75 minutes to allow for natural conversation and editing.'
              },
              {
                question: 'Is it recorded remotely?',
                answer: 'Yes, we record remotely via Zoom or Riverside. You just need a quiet space, good internet, and ideally headphones with a decent microphone.'
              },
              {
                question: 'Do I need to prepare anything?',
                answer: 'We\'ll send a brief prep guide and some conversation topics ahead of time. The goal is a natural conversation, not a scripted interview.'
              },
              {
                question: 'When will my episode air?',
                answer: 'Episodes are typically published 4-8 weeks after recording, depending on our production schedule. We\'ll confirm timing closer to your recording date.'
              },
              {
                question: 'Can I share the episode?',
                answer: 'Absolutely. We encourage guests to share episodes with their audience. We\'ll provide graphics and assets to make sharing easy.'
              },
              {
                question: 'What if I\'m not selected?',
                answer: 'We review every submission carefully. If we don\'t reach out, it likely means the timing or topic fit wasn\'t quite right—not a reflection on you or your work.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                className="p-6 sm:p-8 border-2 border-border hover:border-accent transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <h3 className="text-xl mb-3 font-medium">
                  {faq.question}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
