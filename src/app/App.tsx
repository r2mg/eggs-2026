import { useState } from 'react';
import logoSrc from '../imports/eggs_logo_full.png';
import footerLogoSrc from '../imports/eggs-transparent-org@4x.png';
import Home from './components/Home';
import Episodes from './components/Episodes';
import EpisodeDetail from './components/EpisodeDetail';
import About from './components/About';
import BeAGuest from './components/BeAGuest';
import Sponsor from './components/Sponsor';

type Page = 'home' | 'episodes' | 'episode-detail' | 'about' | 'be-a-guest' | 'sponsor';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEpisodeClick = (episodeId: number) => {
    setSelectedEpisodeId(episodeId);
    setCurrentPage('episode-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => handlePageChange('home')}
            className="overflow-hidden w-[152px] hover:w-[520px] transition-all duration-500 ease-out relative"
          >
            <img
              src={logoSrc}
              alt="EGGS! The Podcast"
              className="h-12 whitespace-nowrap block mt-1"
              style={{ minWidth: '520px' }}
            />
          </button>
          <div className="flex items-center gap-8">
            <button
              onClick={() => handlePageChange('episodes')}
              className="text-sm hover:text-accent transition-colors"
            >
              Episodes
            </button>
            <button
              onClick={() => handlePageChange('about')}
              className="text-sm hover:text-accent transition-colors"
            >
              About
            </button>
            <button
              onClick={() => handlePageChange('be-a-guest')}
              className="text-sm hover:text-accent transition-colors"
            >
              Be a Guest
            </button>
            <button
              onClick={() => handlePageChange('sponsor')}
              className="text-sm hover:text-accent transition-colors"
            >
              Sponsor
            </button>
            <button className="bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {currentPage === 'home' && <Home onEpisodeClick={handleEpisodeClick} onNavigate={handlePageChange} />}
      {currentPage === 'episodes' && <Episodes onEpisodeClick={handleEpisodeClick} />}
      {currentPage === 'about' && <About />}
      {currentPage === 'be-a-guest' && <BeAGuest />}
      {currentPage === 'sponsor' && <Sponsor />}
      {currentPage === 'episode-detail' && selectedEpisodeId && (
        <EpisodeDetail
          episodeId={selectedEpisodeId}
          onEpisodeClick={handleEpisodeClick}
          onBackToEpisodes={() => handlePageChange('episodes')}
        />
      )}

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
                  <li><a href="#" className="hover:text-foreground transition-colors">Latest</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Archive</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Topics</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Guests</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-4">About</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">About the Show</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Be a Guest</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Sponsor</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-4">Listen</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">Spotify</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Apple Podcasts</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">YouTube</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">RSS Feed</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              © 2026 EGGS! The Podcast. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Instagram</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
