import type { MetadataRoute } from 'next'

const BASE_URL = 'https://myfingrid.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep crawlers off API endpoints and OAuth/invite flows (no SEO value).
      disallow: ['/api/', '/split/invite/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
