// GET /api/routes/[id]/pois?buffer=3&types=a,b — 沿線 POI（get_pois_along_route，Phase 5）
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid route id' }, { status: 400 });
  }
  const buffer = Number(req.nextUrl.searchParams.get('buffer') ?? '3');
  if (!Number.isFinite(buffer) || buffer <= 0 || buffer > 10) {
    return NextResponse.json({ error: 'Invalid buffer (0–10 km)' }, { status: 400 });
  }
  const typesParam = req.nextUrl.searchParams.get('types');
  const types = typesParam ? typesParam.split(',').filter(Boolean) : null;

  const supabase = createAnonServerClient();
  // 超長路線（>150km）緩衝查詢會逾時且結果數千筆，直接回空集合＋標記（Phase 15A）
  const { data: routeRow } = await supabase
    .from('routes')
    .select('distance_km')
    .eq('id', id)
    .maybeSingle();
  if (routeRow && Number(routeRow.distance_km) > 150) {
    return NextResponse.json(
      { pois: [], too_long: true },
      { headers: { 'Cache-Control': 'public, max-age=600' } }
    );
  }
  const { data, error } = await supabase.rpc('get_pois_along_route', {
    p_route_id: id,
    p_buffer_km: buffer,
    p_types: types,
    p_free_tier_only: false, // Phase 9 依會員等級調整
  });
  if (error) {
    console.error('[api/routes/pois] RPC error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  return NextResponse.json(
    { pois: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } }
  );
}
