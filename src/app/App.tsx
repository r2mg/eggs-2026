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
 */
import { Link, NavLink, Outlet, Routes, Route } from 'react-router-dom';
import logoSrc from '../imports/eggs_logo_full.png';
import footerLogoSrc from '../imports/eggs-transparent-org@4x.png';
import { EGGS_LISTEN_LINKS } from './lib/rss';
import Home from './components/Home';
import Episodes from './components/Episodes';
import EpisodeDetail from './components/EpisodeDetail';
import About from './components/About';
import BeAGuest from './components/BeAGuest';
import Sponsor from './components/Sponsor';

/**
 * Shared chrome: top navigation and footer wrap every page.
 * The <Outlet /> is where the active route’s page component appears.
 */
function SiteLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation — real links update the browser URL */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="overflow-hidden w-[152px] hover:w-[520px] transition-all duration-500 ease-out relative"
          >
            <img
              src={logoSrc}
              alt="EGGS! The Podcast"
              className="h-12 whitespace-nowrap block mt-1"
              style={{ minWidth: '520px' }}
            />
          </Link>
          <div className="flex items-center gap-8">
            <NavLink
              to="/episodes"
              className={({ isActive }) =>
                `text-sm hover:text-accent transition-colors ${isActive ? 'text-accent' : ''}`
              }
            >
              Episodes
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `text-sm hover:text-accent transition-colors ${isActive ? 'text-accent' : ''}`
              }
            >
              About
            </NavLink>
            <NavLink
              to="/be-a-guest"
              className={({ isActive }) =>
                `text-sm hover:text-accent transition-colors ${isActive ? 'text-accent' : ''}`
              }
            >
              Be a Guest
            </NavLink>
            <NavLink
              to="/sponsor"
              className={({ isActive }) =>
                `text-sm hover:text-accent transition-colors ${isActive ? 'text-accent' : ''}`
              }
            >
              Sponsor
            </NavLink>
            {/* Show email from the public RSS feed — opens the visitor’s mail app */}
            <a
              href="mailto:eggsthepodcast@gmail.com?subject=EGGS%20Podcast"
              className="bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Subscribe
            </a>
          </div>
        </div>
      </nav>

      {/* Matched route page */}
      <Outlet />

      {/* Footer (shared across all pages) */}
      <footer className="border-t border-border py-16 bg-background">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-2 gap-24 mb-12">
            <div>
              <img src={footerLogoSrc} alt="EGGS! The Podcast" className="h-32" />
            </div>

            <div className="grid grid-cols-3 gap-12">
              <div>
                <h4 className="font-medium mb-4">Episodes</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/" className="hover:text-foreground transition-colors">
                      Latest
                    </Link>
                  </li>
                  <li>
                    <Link to="/episodes" className="hover:text-foreground transition-colors">
                      Archive
                    </Link>
                  </li>
                  <li>
                    <span
                      className="text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                      title="Placeholder — no topics page yet"
                    >
                      Topics
                    </span>
                  </li>
                  <li>
                    <span
                      className="text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                      title="Placeholder — no guests index yet"
                    >
                      Guests
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-4">About</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/about" className="hover:text-foreground transition-colors">
                      About the Show
                    </Link>
                  </li>
                  <li>
                    <Link to="/be-a-guest" className="hover:text-foreground transition-colors">
                      Be a Guest
                    </Link>
                  </li>
                  <li>
                    <Link to="/sponsor" className="hover:text-foreground transition-colors">
                      Sponsor
                    </Link>
                  </li>
                  <li>
                    <span
                      className="text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                      title="Placeholder — add a contact page later"
                    >
                      Contact
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-4">Listen</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a
                      href={EGGS_LISTEN_LINKS.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Spotify
                    </a>
                  </li>
                  <li>
                    <a
                      href={EGGS_LISTEN_LINKS.apple}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Apple Podcasts
                    </a>
                  </li>
                  <li>
                    <span
                      className="text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
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
                      className="hover:text-foreground transition-colors"
                    >
                      RSS Feed
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              © 2026 EGGS! The Podcast. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span
                className="text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                title="Placeholder — social links not wired yet"
              >
                Twitter
              </span>
              <span
                className="text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
                title="Placeholder — social links not wired yet"
              >
                Instagram
              </span>
              <span
                className="text-sm text-muted-foreground/70 cursor-default border-b border-dotted border-muted-foreground/40"
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
