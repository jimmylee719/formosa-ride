// GET /api/danger-zones?bbox=min_lng,min_lat,max_lng,max_lat&night_mode=false&points=1
// 串 get_danger_zones_in_bbox（v3.0 A2–A3）
// points=1 才回傳事故熱點（Point）：地圖只畫線段，熱點僅供旅途模式鄰近警示使用
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const bboxRaw = req.nextUrl.searchParams.get('bbox');
  const nightMode = req.nextUrl.searchParams.get('night_mode') === 'true';
  const includePoints = req.nextUrl.searchParams.get('points') === '1';
  const bbox = bboxRaw?.split(',').map(Number) ?? [];
  const [minLng, minLat, maxLng, maxLat] = bbox;
  if (
    bbox.length !== 4 ||
    bbox.some((n) => !Number.isFinite(n)) ||
    (minLng as number) >= (maxLng as number) ||
    (minLat as number) >= (maxLat as number)
  ) {
    return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });
  }

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc('get_danger_zones_in_bbox', {
    min_lng: minLng,
    min_lat: minLat,
    max_lng: maxLng,
    max_lat: maxLat,
    include_night_only: nightMode,
  });
  if (error) {
    console.error('[api/danger-zones] RPC error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  // RPC 回傳 geometry 為 GeoJSON 字串，解析為物件供前端直接使用
  type Row = { geometry: string } & Record<string, unknown>;
  const features = ((data ?? []) as Row[])
    .map((r) => ({
      ...r,
      geometry: JSON.parse(r.geometry) as { type: string },
    }))
    .filter((f) => includePoints || f.geometry.type !== 'Point');
  return NextResponse.json(
    { features },
    { headers: { 'Cache-Control': 'public, max-age=600' } }
  );
}
