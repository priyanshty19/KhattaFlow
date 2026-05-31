import type { MetadataRoute } from 'next'

const BASE_URL = 'https://myfingrid.com'

// Publicly accessible, indexable pages (see middleware.ts public route matcher).
// Authenticated app routes, OAuth/invite flows, and API endpoints are intentionally
// excluded — they require a session or carry no SEO value.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: `${BASE_URL}/landing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
