// POST /api/trips/sync-points — 軌跡點批次同步（Phase 11，v2.0 裝置本位）
// 行程不存在則自動建立（支援離線開始的行程）；device_id 核對防止寫入他人行程。
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SyncPoint {
  lat: number;
  lng: number;
  elevation: number | null;
  speedKmh: number | null;
  accuracyM: number | null;
  isRest: boolean;
  recordedAt: string;
}

export async function POST(req: NextRequest) {
  let body: {
    deviceId?: string;
    tripId?: string;
    startedAt?: string;
    points?: SyncPoint[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId, startedAt, points } = body;
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  if (!Array.isArray(points) || points.length === 0 || points.length > 500) {
    return NextResponse.json({ error: 'points must be 1-500' }, { status: 400 });
  }
  const valid = points.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      p.lat >= 20.5 &&
      p.lat <= 26.5 &&
      Number.isFinite(p.lng) &&
      p.lng >= 117 &&
      p.lng <= 124.5 &&
      typeof p.recordedAt === 'string' &&
      !Number.isNaN(Date.parse(p.recordedAt))
  );
  if (valid.length === 0) {
    return NextResponse.json({ error: 'No valid points' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 行程 upsert + 裝置核對
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id')
    .eq('id', tripId)
    .maybeSingle();
  if (trip) {
    if (trip.device_id !== deviceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const { error: insErr } = await supabase.from('trips').insert({
      id: tripId,
      device_id: deviceId,
      started_at: startedAt ?? valid[0]?.recordedAt ?? new Date().toISOString(),
      status: 'active',
    });
    if (insErr) {
      console.error('[sync-points] trip insert:', insErr.code);
      return NextResponse.json({ error: 'Trip create failed' }, { status: 500 });
    }
  }

  const rows = valid.map((p) => ({
    trip_id: tripId,
    recorded_at: p.recordedAt,
    location: `SRID=4326;POINT(${p.lng} ${p.lat})`,
    lat: p.lat,
    lng: p.lng,
    elevation_m: p.elevation,
    speed_kmh: p.speedKmh,
    accuracy_m: p.accuracyM,
    is_rest: !!p.isRest,
  }));
  const { error } = await supabase.from('trip_points').insert(rows);
  if (error) {
    console.error('[sync-points] insert:', error.code);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
  return NextResponse.json({ synced: rows.length });
}
