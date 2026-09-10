import type { AstroIntegration } from 'astro';

/**
 * Pull the YouTube catalog once before Astro prerenders pages.
 * Page modules must not call the Data API — parallel isolates would repeat the download.
 */
export function youtubeCatalogIntegration(): AstroIntegration {
  return {
    name: 'eggs-youtube-catalog',
    hooks: {
      'astro:build:start': async () => {
        const { warmupYouTubeCatalogForBuild } = await import('../app/lib/youtubeChannelSync');
        await warmupYouTubeCatalogForBuild();
      },
    },
  };
}
