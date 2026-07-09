// GET /api/trips/[tripId]/export-gpx?device=... — 行程匯出 GPX（Phase 11D，v9.0 A3）
// 一般用戶與管理員皆可用，無額外權限判斷（v9.0 A5）；device 核對防止匯出他人行程。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { exportTripToGPX, type GpxPoint } from '@/lib/export-gpx';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const deviceId = req.nextUrl.searchParams.get('device') ?? '';
  if (!UUID_RE.test(tripId) || !UUID_RE.test(deviceId)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, title, started_at')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: points } = await supabase
    .from('trip_points')
    .select('lat, lng, elevation_m, recorded_at')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true })
    .limit(50000);

  if (!points || points.length === 0) {
    return NextResponse.json(
      { error: '此行程沒有記錄到任何座標點 · No track points' },
      { status: 404 }
    );
  }

  const name =
    trip.title ||
    `FormoSA Ride 旅程 ${String(trip.started_at ?? '').slice(0, 10)}`;
  const gpx = exportTripToGPX(points as GpxPoint[], name);

  return new NextResponse(gpx, {
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="trip-${tripId.slice(0, 8)}.gpx"`,
    },
  });
}
