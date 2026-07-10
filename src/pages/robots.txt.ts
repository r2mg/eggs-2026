import type { APIRoute } from 'astro';
import { resolveSiteOrigin } from '../lib/siteOrigin';

/** Generated robots.txt that points crawlers at the auto-generated sitemap index. */
export const GET: APIRoute = ({ site }) => {
  const origin = resolveSiteOrigin(site);
  const sitemapUrl = new URL('sitemap-index.xml', origin).href;
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
