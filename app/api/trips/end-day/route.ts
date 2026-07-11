// POST /api/trips/end-day — 結束今天：寫入日摘要並累計行程統計（Phase 11，v2.0 C9）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: {
    deviceId?: string;
    tripId?: string;
    distanceKm?: number;
    ridingMinutes?: number;
    restMinutes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { deviceId, tripId } = body;
  if (!deviceId || !UUID_RE.test(deviceId) || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });
  }
  const distanceKm = Number(body.distanceKm ?? 0);
  const ridingMinutes = Number(body.ridingMinutes ?? 0);
  const restMinutes = Number(body.restMinutes ?? 0);
  if (
    [distanceKm, ridingMinutes, restMinutes].some(
      (n) => !Number.isFinite(n) || n < 0 || n > 100000
    )
  ) {
    return NextResponse.json({ error: 'Invalid stats' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: trip } = await supabase
    .from('trips')
    .select('id, device_id, total_distance_km, total_time_minutes')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (trip.device_id !== deviceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 當日軌跡點統計（起終點、最高海拔）
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { data: pts } = await supabase
    .from('trip_points')
    .select('lat, lng, elevation_m, recorded_at')
    .eq('trip_id', tripId)
    .gte('recorded_at', dayStart.toISOString())
    .order('recorded_at', { ascending: true });
  const first = pts?.[0];
  const last = pts?.[pts.length - 1];
  const maxElev = (pts ?? []).reduce<number | null>(
    (m, p) =>
      p.elevation_m != null && (m == null || p.elevation_m > m) ? p.elevation_m : m,
    null
  );

  // 日序號 = 既有摘要數 + 1
  const { count } = await supabase
    .from('trip_day_summaries')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  const dayNumber = (count ?? 0) + 1;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(
    new Date()
  );

  const { error: sumErr } = await supabase.from('trip_day_summaries').insert({
    trip_id: tripId,
    day_number: dayNumber,
    date: today,
    distance_km: distanceKm,
    riding_minutes: ridingMinutes,
    rest_minutes: restMinutes,
    max_elevation: maxElev,
    start_point: first ? `SRID=4326;POINT(${first.lng} ${first.lat})` : null,
    end_point: last ? `SRID=4326;POINT(${last.lng} ${last.lat})` : null,
  });
  if (sumErr) {
    console.error('[end-day] summary insert:', sumErr.code);
    return NextResponse.json({ error: 'Summary failed' }, { status: 500 });
  }

  await supabase
    .from('trips')
    .update({
      total_distance_km: Number(trip.total_distance_km ?? 0) + distanceKm,
      total_time_minutes: Number(trip.total_time_minutes ?? 0) + ridingMinutes,
      status: 'paused', // 多日旅程：隔天可續；「結束旅程」於 Phase 11C
    })
    .eq('id', tripId);

  return NextResponse.json({ dayNumber, date: today });
}
