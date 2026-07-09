// GET /api/elevation?routeId=<uuid> — 路線海拔剖面（Phase 6）
// 快取優先：elevation_profiles 有資料直接回傳；否則即時計算、寫入快取、
// 並回寫 routes 的爬升/海拔統計欄位（供詳情頁與卡片顯示）。
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient, createServiceClient } from '@/lib/supabase-server';
import { computeElevationProfile } from '@/lib/elevation';
import type { LineStringGeoJSON } from '@/types/route';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const routeId = req.nextUrl.searchParams.get('routeId') ?? '';
  if (!UUID_RE.test(routeId)) {
    return NextResponse.json({ error: 'Invalid routeId' }, { status: 400 });
  }

  const anon = createAnonServerClient();

  // 1. 快取查詢
  const { data: cached } = await anon
    .from('elevation_profiles')
    .select('profile_data, max_elevation, min_elevation, total_ascent, total_descent')
    .eq('route_id', routeId)
    .maybeSingle();

  if (cached) {
    return NextResponse.json(
      {
        points: cached.profile_data,
        maxElevation: cached.max_elevation,
        minElevation: cached.min_elevation,
        totalAscent: cached.total_ascent,
        totalDescent: cached.total_descent,
        cached: true,
      },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  }

  // 2. 取得路線幾何
  const { data: route } = await anon
    .from('routes')
    .select('geometry')
    .eq('id', routeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }

  // 3. 計算 + 寫入快取（寫入需 service 權限）
  try {
    const geometry = route.geometry as LineStringGeoJSON;
    const profile = await computeElevationProfile(geometry.coordinates);

    const service = createServiceClient();
    await service.from('elevation_profiles').upsert(
      {
        route_id: routeId,
        profile_data: profile.points,
        max_elevation: profile.maxElevation,
        min_elevation: profile.minElevation,
        total_ascent: profile.totalAscent,
        total_descent: profile.totalDescent,
      },
      { onConflict: 'route_id' }
    );
    // 回寫 routes 統計（詳情頁「計算中」→ 實際數字）
    await service
      .from('routes')
      .update({
        total_ascent_m: profile.totalAscent,
        total_descent_m: profile.totalDescent,
        max_elevation_m: profile.maxElevation,
        min_elevation_m: profile.minElevation,
      })
      .eq('id', routeId);

    return NextResponse.json(
      { ...profile, cached: false },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (err) {
    console.error('[api/elevation] compute failed:', (err as Error).message);
    return NextResponse.json({ error: 'Elevation compute failed' }, { status: 502 });
  }
}
