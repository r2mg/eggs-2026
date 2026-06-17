import type { APIRoute } from 'astro';

/** Generated robots.txt that points crawlers at the auto-generated sitemap index. */
export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://eggscast.com');
  const sitemapUrl = new URL('sitemap-index.xml', origin).href;
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
