/** Canonical production origin when `Astro.site` / `PUBLIC_SITE_URL` is unset. */
export const DEFAULT_SITE_ORIGIN = 'https://eggsthepodcast.com';

export function resolveSiteOrigin(site?: URL | string | null): URL {
  if (site instanceof URL) return site;
  if (typeof site === 'string' && site.trim()) {
    return new URL(site.replace(/\/+$/, ''));
  }
  const env = import.meta.env.PUBLIC_SITE_URL?.trim();
  if (env) return new URL(env.replace(/\/+$/, ''));
  return new URL(DEFAULT_SITE_ORIGIN);
}
