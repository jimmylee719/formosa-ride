// app/sitemap.ts — Sitemap 自動生成（Phase 16，v1.0 §15.5）
// 收錄：實際存在的公開靜態頁 + 全部路線詳情頁。
// 不收錄：/admin（robots Disallow）、/track（私人分享連結）、/journey（個人行程）。
// spec 的 /poi/[id] 頁面不存在（POI 只在地圖上呈現），不產生幽靈網址。
import type { MetadataRoute } from 'next';
import { createAnonServerClient } from '@/lib/supabase-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://formosaride.com';

export const revalidate = 86400; // 每日重建

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    '/',
    '/routes',
    '/plan',
    '/weather',
    '/emergency',
    '/feedback',
    '/privacy',
    '/resources',
    '/guide',
    '/contact',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));

  const supabase = createAnonServerClient();
  const { data: routes } = await supabase
    .from('routes')
    .select('id, updated_at')
    .eq('is_active', true)
    .limit(2000);

  const routePages: MetadataRoute.Sitemap = (routes ?? []).map((r) => ({
    url: `${SITE_URL}/route/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  return [...staticPages, ...routePages];
}
