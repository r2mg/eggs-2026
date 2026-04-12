/**
 * App shell and routes (`src/app/App.tsx`)
 * ========================================
 *
 * **Where routing is defined:** The `<Routes>` / `<Route>` tree at the bottom of this
 * file maps URLs like `/episodes` and `/episodes/:slug` to page components (`Episodes`,
 * `EpisodeDetail`, etc.). Shared chrome (nav + footer) wraps an `<Outlet />` where the
 * active page renders.
 *
 * **RSS:** This file does not fetch the feed. Pages use `useRssEpisodes()` in
 * `src/app/hooks/useRssEpisodes.ts` (RSS only) plus small YouTube overlay hooks where needed.
 *
 * **Responsive chrome:** Below the `xl` breakpoint (~1280px), phones and tablets get a compact
 * wordmark logo, hamburger menu + full-height panel, and a dimmed backdrop tap-to-close. From
 * `xl` and up, the horizontal nav returns and the full logo can expand on hover (desktop Figma behavior).
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import logoSrc from '../imports/eggs_logo_full.png';
import logoCompactSrc from '../imports/eggs-text-logo.png';
import footerLogoSrc from '../imports/eggs-transparent-org@4x.png';
import { EGGS_LISTEN_LINKS } from './lib/rss';
import Home from './components/Home';
import Episodes from './components/Episodes';
import EpisodeDetail from './components/EpisodeDetail';
import About from './components/About';
import BeAGuest from './components/BeAGuest';
import Sponsor from './components/Sponsor';

/** Shared desktop nav link styles (active route = accent). */
function desktopNavClass(isActive: boolean): string {
  return `text-sm hover:text-accent transition-colors whitespace-nowrap ${isActive ? 'text-accent' : ''}`;
}

/**
 * Shared chrome: top navigation and footer wrap every page.
 * The <Outlet /> is where the active route’s page component appears.
 *
 * **Mobile / tablet (below `xl`):** compact wordmark, no hover-expand logo; hamburger opens the menu;
 *   Subscribe stays visible in the bar (large tap target).
 * **Desktop (`xl:` and up):** horizontal links + full logo with hover-expand.
 */
function SiteLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  /** Subscribe CTA: slightly tighter on very narrow phones so it fits beside the menu button. */
  const subscribeBtnClass =
    'inline-flex items-center justify-center min-h-11 min-w-[4.5rem] px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 transition-opacity whitespace-nowrap';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation — real links update the browser URL */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/*
            Logo treatment:
            - Below `xl`: compact “EGGS” wordmark only — readable, no clipped wide lockup, no hover-expand.
            - `xl` and up: full horizontal lockup with the original hover-expand width animation.
          */}
          <Link
            to="/"
            aria-label="EGGS! The Podcast — home"
            className="shrink-0 block h-9 sm:h-10 w-auto max-w-[min(42vw,11rem)] xl:h-12 xl:w-[152px] xl:max-w-none xl:hover:w-[520px] overflow-hidden xl:transition-[width] xl:duration-500 xl:ease-out relative"
            onClick={() => setMobileNavOpen(false)}
          >
            <img
              src={logoCompactSrc}
              alt=""
              className="h-full w-auto object-left object-contain block xl:hidden max-h-10"
            />
            <img
              src={logoSrc}
              alt=""
              className="h-full w-auto max-w-[520px] object-left object-contain hidden xl:block xl:min-w-[520px]"
            />
          </Link>

          {/* Desktop nav — wide screens only; tablets use the same mobile pattern as phones */}
          <div className="hidden xl:flex items-center gap-6 2xl:gap-8">
            <NavLink to="/episodes" className={({ isActive }) => desktopNavClass(isActive)}>
              Episodes
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => desktopNavClass(isActive)}>
              About
            </NavLink>
            <NavLink to="/be-a-guest" className={({ isActive }) => desktopNavClass(isActive)}>
              Be a Guest
            </NavLink>
            <NavLink to="/sponsor" className={({ isActive }) => desktopNavClass(isActive)}>
              Sponsor
            </NavLink>
            <a
              href="mailto:eggsthepodcast@gmail.com?subject=EGGS%20Podcast"
              className={subscribeBtnClass}
            >
              Subscribe
            </a>
          </div>

          {/* Mobile / tablet: keep Subscribe visible next to menu (large tap target) */}
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            <a href="mailto:eggsthepodcast@gmail.com?subject=EGGS%20Podcast" className={subscribeBtnClass}>
              Subscribe
            </a>
            <button
              type="button"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md border border-border text-foreground hover:bg-muted transition-colors"
              aria-expanded={mobileNavOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile / tablet menu: dimmed backdrop (tap outside = close) + scrollable link stack */}
      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-[55] bg-black/50 xl:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="site-mobile-nav"
            className="fixed inset-x-0 bottom-0 top-16 z-[60] xl:hidden bg-background border-t border-border flex flex-col px-4 sm:px-6 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <nav className="flex flex-col gap-0" aria-label="Primary">
              <NavLink
                to="/episodes"
                className={({ isActive }) =>
                  `min-h-[3.25rem] flex items-center py-3 text-lg border-b border-border ${isActive ? 'text-accent font-medium' : 'text-foreground'}`
                }
                onClick={() => setMobileNavOpen(false)}
              >
                Episodes
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `min-h-[3.25rem] flex items-center py-3 text-lg border-b border-border ${isActive ? 'text-accent font-medium' : 'text-foreground'}`
                }
                onClick={() => setMobileNavOpen(false)}
              >
                About
              </NavLink>
              <NavLink
                to="/be-a-guest"
                className={({ isActive }) =>
                  `min-h-[3.25rem] flex items-center py-3 text-lg border-b border-border ${isActive ? 'text-accent font-medium' : 'text-foreground'}`
                }
                onClick={() => setMobileNavOpen(false)}
              >
                Be a Guest
              </NavLink>
              <NavLink
                to="/sponsor"
                className={({ isActive }) =>
                  `min-h-[3.25rem] flex items-center py-3 text-lg border-b border-border ${isActive ? 'text-accent font-medium' : 'text-foreground'}`
                }
                onClick={() => setMobileNavOpen(false)}
              >
                Sponsor
              </NavLink>
              <Link
                to="/"
                className="min-h-[3.25rem] flex items-center py-3 text-lg border-b border-border text-foreground"
                onClick={() => setMobileNavOpen(false)}
              >
                Home
              </Link>
            </nav>
            <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
              Tip: use the <span className="font-medium text-foreground">Subscribe</span> button in the header to join
              the mailing list via email.
            </p>
          </div>
        </>
      ) : null}

      {/* Matched route page */}
      <Outlet />

      {/* Footer (shared across all pages) */}
      <footer className="border-t border-border py-10 sm:py-14 md:py-16 bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Top block: logo then link columns — always single column on phones for breathing room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 lg:gap-24 mb-10 md:mb-12">
            <div className="flex justify-center md:justify-start">
              <img
                src={footerLogoSrc}
                alt="EGGS! The Podcast"
                className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto max-w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-1 gap-10 text-center md:text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 md:gap-10">
                <div>
                  <h4 className="font-medium mb-3 sm:mb-4 text-base">Episodes</h4>
                  <ul className="space-y-1 sm:space-y-2 text-sm sm:text-sm text-muted-foreground">
                    <li>
                      <Link
                        to="/"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Latest
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/episodes"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Archive
                      </Link>
                    </li>
                    <li>
                      <span
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                        title="Placeholder — no topics page yet"
                      >
                        Topics
                      </span>
                    </li>
                    <li>
                      <span
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                        title="Placeholder — no guests index yet"
                      >
                        Guests
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 sm:mb-4 text-base">About</h4>
                  <ul className="space-y-1 sm:space-y-2 text-sm text-muted-foreground">
                    <li>
                      <Link
                        to="/about"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        About the Show
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/be-a-guest"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Be a Guest
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/sponsor"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Sponsor
                      </Link>
                    </li>
                    <li>
                      <span
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                        title="Placeholder — add a contact page later"
                      >
                        Contact
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 sm:mb-4 text-base">Listen</h4>
                  <ul className="space-y-1 sm:space-y-2 text-sm text-muted-foreground">
                    <li>
                      <a
                        href={EGGS_LISTEN_LINKS.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Spotify
                      </a>
                    </li>
                    <li>
                      <a
                        href={EGGS_LISTEN_LINKS.apple}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        Apple Podcasts
                      </a>
                    </li>
                    <li>
                      <span
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                        title="Placeholder — no single YouTube channel link in the feed yet"
                      >
                        YouTube
                      </span>
                    </li>
                    <li>
                      <a
                        href={EGGS_LISTEN_LINKS.rss}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center justify-center md:justify-start w-full md:w-auto py-1 hover:text-foreground transition-colors"
                      >
                        RSS Feed
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
              © 2026 EGGS! The Podcast. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 sm:gap-x-6 gap-y-2 order-1 sm:order-2">
              <span
                className="inline-flex min-h-10 items-center text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40 px-1"
                title="Placeholder — social links not wired yet"
              >
                Twitter
              </span>
              <span
                className="inline-flex min-h-10 items-center text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40 px-1"
                title="Placeholder — social links not wired yet"
              >
                Instagram
              </span>
              <span
                className="inline-flex min-h-10 items-center text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40 px-1"
                title="Placeholder — social links not wired yet"
              >
                LinkedIn
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Top-level route table. Each path shows a different page inside SiteLayout.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/episodes" element={<Episodes />} />
        <Route path="/episodes/:slug" element={<EpisodeDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/be-a-guest" element={<BeAGuest />} />
        <Route path="/sponsor" element={<Sponsor />} />
      </Route>
    </Routes>
  );
}
