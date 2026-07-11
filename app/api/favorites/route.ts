// /api/favorites — 收藏（Phase 19A）
// GET  ?device_id=            → 收藏清單（join POI/路線摘要）
// POST { deviceId, poiId? | routeId? } → 切換收藏（有則刪、無則加），回傳 { favorited }
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FAVORITES = 200; // 防灌爆（正常使用遠低於此）

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('device_id') ?? '';
  if (!UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid device id' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('plan_favorites')
    .select(
      `id, poi_id, route_id,
       pois ( name_zh, name_en, type ),
       routes ( name_zh, name_en, distance_km )`
    )
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[api/favorites] list error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  const favorites = (data ?? []).map((f) => ({
    id: f.id,
    poi_id: f.poi_id,
    route_id: f.route_id,
    poi: f.pois ?? null,
    route: f.routes ?? null,
  }));
  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; poiId?: string; routeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const deviceId = body.deviceId ?? '';
  const poiId = body.poiId ?? null;
  const routeId = body.routeId ?? null;
  if (
    !UUID_RE.test(deviceId) ||
    (!poiId && !routeId) ||
    (poiId && !UUID_RE.test(poiId)) ||
    (routeId && !UUID_RE.test(routeId))
  ) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const col = poiId ? 'poi_id' : 'route_id';
  const val = (poiId ?? routeId) as string;

  const { data: existing } = await supabase
    .from('plan_favorites')
    .select('id')
    .eq('device_id', deviceId)
    .eq(col, val)
    .maybeSingle();

  if (existing) {
    await supabase.from('plan_favorites').delete().eq('id', existing.id);
    return NextResponse.json({ favorited: false });
  }

  const { count } = await supabase
    .from('plan_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId);
  if ((count ?? 0) >= MAX_FAVORITES) {
    return NextResponse.json({ error: 'Favorite limit reached' }, { status: 409 });
  }

  const { error } = await supabase
    .from('plan_favorites')
    .insert({ device_id: deviceId, poi_id: poiId, route_id: routeId });
  if (error) {
    console.error('[api/favorites] insert error:', error.message);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
  return NextResponse.json({ favorited: true });
}
