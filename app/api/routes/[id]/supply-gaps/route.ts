// GET /api/routes/[id]/supply-gaps — 補給空窗分析（Phase 19C）
// 沿線便利商店/超市投影到路線里程，回報超過 30km 的無補給區段。
// 不用 get_pois_along_route RPC（80km 路線即逾時）：改抓路線外框內的商店
// （純欄位過濾，DB 極快），投影與距離計算在 Node 端完成。
// 超長路線（>150km，如環島主線）外框≈全台，計算量過大 → 回 too_long。
import { NextRequest, NextResponse } from 'next/server';
import { createAnonServerClient } from '@/lib/supabase-server';
import { getRoute } from '@/lib/route-queries';

const GAP_KM = 30;
const MAX_ROUTE_KM = 150;
const BUFFER_KM = 2;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const route = await getRoute(id);
  if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (route.distance_km > MAX_ROUTE_KM) {
    return NextResponse.json(
      { too_long: true, distance_km: route.distance_km },
      { headers: { 'Cache-Control': 'public, max-age=21600' } }
    );
  }

  // 路線頂點的累積里程 + 外框（等距圓柱近似，2km 緩衝尺度誤差可忽略）
  const coords = route.geometry.coordinates;
  const cum: number[] = [0];
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (!c) {
      if (i > 0) cum.push(cum[i - 1] ?? 0);
      continue;
    }
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLng) minLng = c[0];
    if (c[0] > maxLng) maxLng = c[0];
    if (i > 0) {
      const a = coords[i - 1];
      if (!a) {
        cum.push(cum[i - 1] ?? 0);
        continue;
      }
      const mPerDegLng = 111.32 * Math.cos((a[1] * Math.PI) / 180);
      const dKm = Math.hypot((c[0] - a[0]) * mPerDegLng, (c[1] - a[1]) * 111.32);
      cum.push((cum[i - 1] ?? 0) + dKm);
    }
  }
  const totalKm = cum[cum.length - 1] ?? route.distance_km;
  const dLat = BUFFER_KM / 111.32;
  const dLng = BUFFER_KM / (111.32 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));

  const supabase = createAnonServerClient();
  const { data: stores, error } = await supabase
    .from('pois')
    .select('lat, lng')
    .in('type', ['convenience_store', 'supermarket'])
    .eq('is_active', true)
    .gte('lat', minLat - dLat)
    .lte('lat', maxLat + dLat)
    .gte('lng', minLng - dLng)
    .lte('lng', maxLng + dLng)
    .limit(5000);
  if (error) {
    console.error('[api/supply-gaps] query error:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // 每家店 → 最近頂點：距離 ≤2km 才算「沿線」，其累積里程即補給點位置
  const chainages: number[] = [];
  for (const s of (stores ?? []) as Array<{ lat: number; lng: number }>) {
    const sLat = Number(s.lat);
    const sLng = Number(s.lng);
    const mPerDegLng = 111.32 * Math.cos((sLat * Math.PI) / 180);
    let best = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      if (!c) continue;
      const d = Math.hypot((c[0] - sLng) * mPerDegLng, (c[1] - sLat) * 111.32);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    if (best <= BUFFER_KM) chainages.push(cum[bestIdx] ?? 0);
  }
  chainages.sort((a, b) => a - b);

  // 找空窗：起點→第一家、店與店之間、最後一家→終點
  const gaps: Array<{ from_km: number; to_km: number; length_km: number }> = [];
  const points = [0, ...chainages, totalKm];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1] ?? 0;
    const to = points[i] ?? 0;
    if (to - from > GAP_KM) {
      gaps.push({
        from_km: Math.round(from * 10) / 10,
        to_km: Math.round(to * 10) / 10,
        length_km: Math.round((to - from) * 10) / 10,
      });
    }
  }

  return NextResponse.json(
    { gaps, store_count: chainages.length, distance_km: route.distance_km },
    { headers: { 'Cache-Control': 'public, max-age=21600' } } // 6h：店家異動頻率低
  );
}
