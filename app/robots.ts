// app/robots.ts — robots 規則（Phase 14 先行：後台一律 Disallow，v5.0 E3）
// sitemap 於 Phase 16（SEO）加入。
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/admin'],
      },
    ],
  };
}
