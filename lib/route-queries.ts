// lib/route-queries.ts — 路線資料查詢（Server 專用，供頁面與 API route 共用）
import 'server-only';
import { createAnonServerClient } from '@/lib/supabase-server';
import type { RouteDetail, RouteListItem } from '@/types/route';

const LIST_COLUMNS =
  'id, slug, name_zh, name_en, type, distance_km, difficulty, suggested_days, counties, official_route_code, is_free_tier';

const DETAIL_COLUMNS = `${LIST_COLUMNS}, geometry, total_ascent_m, total_descent_m, max_elevation_m, min_elevation_m, start_name_zh, end_name_zh, description_zh, description_en, tips_zh, tips_en, data_source, managing_authority, source_last_updated, is_loop`;

export async function listRoutes(): Promise<RouteListItem[]> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from('routes')
    .select(LIST_COLUMNS)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('distance_km', { ascending: false });
  if (error) {
    console.error('[route-queries] list error:', error.message);
    return [];
  }
  return (data ?? []) as unknown as RouteListItem[];
}

export async function getRoute(id: string): Promise<RouteDetail | null> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from('routes')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error('[route-queries] detail error:', error.message);
    return null;
  }
  // PostGIS geometry 欄位由 PostgREST 自動序列化為 GeoJSON
  return (data as unknown as RouteDetail) ?? null;
}
