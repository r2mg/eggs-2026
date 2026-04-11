import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const playlistId = env.VITE_YOUTUBE_PLAYLIST_ID?.trim() ?? '';

  const proxy: Record<string, { target: string; changeOrigin: boolean; rewrite: () => string }> = {
    '/podcast-rss.xml': {
      target: 'https://anchor.fm',
      changeOrigin: true,
      rewrite: () => '/s/fc17887c/podcast/rss',
    },
  };

  if (playlistId) {
    proxy['/youtube-playlist-feed.xml'] = {
      target: 'https://www.youtube.com',
      changeOrigin: true,
      rewrite: () => `/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
    };
  }

  return {
    // SPA: unknown paths fall back to index.html in dev/preview; static hosts need the same rule.
    appType: 'spa',
    server: {
      // Dev proxies: podcast RSS (always) + optional YouTube playlist Atom when `VITE_YOUTUBE_PLAYLIST_ID` is set.
      proxy,
    },
    plugins: [figmaAssetResolver(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
