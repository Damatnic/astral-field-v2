import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://astral-field-v1.vercel.app/sitemap.xml

# Block access to sensitive areas
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /private/

# Allow access to public assets
Allow: /images/
Allow: /icons/
Allow: /favicon.ico

# Crawl delay
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}