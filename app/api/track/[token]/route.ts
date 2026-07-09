// GET /api/track/[token] — 公開追蹤資訊（Phase 11A，v7.0 A4，免登入）
// 僅揭露位置相關資訊，不含任何個資（v7.0 A6 隱私原則）。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length > 32 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return NextResponse.json({ active: false, reason: 'invalid' }, { status: 404 });
  }

  const supabase = createServiceClient();
  const { data: link } = await supabase
    .from('trip_share_links')
    .select('id, trip_id, is_active, expires_at, view_count')
    .eq('share_token', token)
    .maybeSingle();

  if (
    !link ||
    !link.is_active ||
    (link.expires_at && new Date(link.expires_at).getTime() < Date.now())
  ) {
    return NextResponse.json({ active: false, reason: 'expired' }, { status: 410 });
  }

  // 查看統計（非同步性質，失敗不影響回應）
  void supabase
    .from('trip_share_links')
    .update({
      view_count: (link.view_count ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', link.id)
    .then(() => undefined);

  const { data: trip } = await supabase
    .from('trips')
    .select('started_at, status')
    .eq('id', link.trip_id)
    .maybeSingle();

  // 今日軌跡（畫線 + 距離）
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { data: pts } = await supabase
    .from('trip_points')
    .select('lat, lng, recorded_at')
    .eq('trip_id', link.trip_id)
    .gte('recorded_at', dayStart.toISOString())
    .order('recorded_at', { ascending: true })
    .limit(3000);

  const points = (pts ?? []).map((p) => [Number(p.lng), Number(p.lat)] as [number, number]);
  let todayKm = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) todayKm += haversineKm(a[1], a[0], b[1], b[0]);
  }
  const lastRaw = pts?.[pts.length - 1];

  return NextResponse.json({
    active: true,
    tripId: link.trip_id, // 供前端 Realtime 訂閱（RLS 僅開放有有效分享連結的行程）
    tripStatus: trip?.status ?? 'unknown',
    startedAt: trip?.started_at ?? null,
    todayKm: Math.round(todayKm * 100) / 100,
    todayPoints: points,
    lastPoint: lastRaw
      ? { lat: Number(lastRaw.lat), lng: Number(lastRaw.lng), recordedAt: lastRaw.recorded_at }
      : null,
  });
}
